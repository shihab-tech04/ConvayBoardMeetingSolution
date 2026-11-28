-- Staged only. Apply after DC21/DC23, recovery, and legacy inventory.
-- Retain original bytes in their existing private, immutable-key Storage object;
-- no duplicate bucket, service credential in browser, or storage metadata DML.
-- Existing document/tenant RLS is never relaxed. This is not an object backup.
create index if not exists board_pack_snapshot_file_lookup on convay_private.board_pack_publication_snapshots using gin(files jsonb_path_ops);

create or replace function convay_private.guard_frozen_pack_original()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare pinned boolean := false;
begin
  -- Publication takes SHARE locks on each original, document, version and
  -- Storage object before writing the snapshot. A competing mutation takes
  -- the corresponding row lock before this volatile trigger's lookup.
  if tg_table_schema='storage' and tg_table_name='objects' then
    if old.bucket_id='convay-documents' then
      select exists(select 1 from convay_private.board_pack_publication_snapshots s
        where s.files @> jsonb_build_array(jsonb_build_object('storagePath',old.name))) into pinned;
      -- Storage can update access bookkeeping on read; no change to object
      -- identity, bytes, version, metadata or any other column is permitted.
      if pinned and tg_op='UPDATE' then
        if (to_jsonb(new)-'last_accessed_at')=(to_jsonb(old)-'last_accessed_at') then return new; end if;
      end if;
    end if;
  elsif tg_table_name='convay_document_content' then
    if old.content_type='original_file' then
      select exists(select 1 from convay_private.board_pack_publication_snapshots s
        where s.files @> jsonb_build_array(jsonb_build_object('documentId',old.document_id,'versionId',old.version_id))
           or (old.storage_path is not null and s.files @> jsonb_build_array(jsonb_build_object('storagePath',old.storage_path)))) into pinned;
    end if;
  elsif tg_table_name='convay_entity_records' then
    if old.entity_key='bms.documents' then
      select exists(select 1 from convay_private.board_pack_publication_snapshots s
        where s.tenant_id is not distinct from old.tenant_id
          and s.files @> jsonb_build_array(jsonb_build_object('documentId',old.record_id))) into pinned;
      -- Normal document metadata, ACL and current-version updates remain
      -- possible. Preserve the canonical identity/tenant of frozen originals.
      if pinned and tg_op='UPDATE' then
        if new.record_id=old.record_id and new.entity_key=old.entity_key
          and new.tenant_id is not distinct from old.tenant_id
          and new.payload->'doc_id' is not distinct from old.payload->'doc_id' then return new; end if;
      end if;
    elsif old.entity_key='bms.docversions' then
      select exists(select 1 from convay_private.board_pack_publication_snapshots s
        cross join lateral jsonb_array_elements(s.files) f
        join public.convay_entity_records d on d.entity_key='bms.documents'
          and d.record_id=f->>'documentId' and d.tenant_id is not distinct from s.tenant_id
        where s.tenant_id is not distinct from old.tenant_id
          and f->>'versionId'=old.payload->>'version_id'
          and old.payload->>'document_id' in (d.record_id,d.payload->>'doc_id')) into pinned;
    end if;
  end if;
  if pinned then raise exception 'Published board-pack originals and exact versions must be retained' using errcode='23514'; end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end $fn$;
revoke all on function convay_private.guard_frozen_pack_original() from public,anon,authenticated;
drop trigger if exists convay_frozen_pack_original on public.convay_document_content;
create trigger convay_frozen_pack_original before update or delete on public.convay_document_content
for each row execute function convay_private.guard_frozen_pack_original();
drop trigger if exists convay_frozen_pack_original on public.convay_entity_records;
create trigger convay_frozen_pack_original before update or delete on public.convay_entity_records
for each row execute function convay_private.guard_frozen_pack_original();
-- Supabase supports custom triggers and RLS on storage.objects. Storage API
-- operations remain the sole mechanism for writing/deleting actual objects.
drop trigger if exists convay_frozen_pack_original on storage.objects;
create trigger convay_frozen_pack_original before update or delete on storage.objects
for each row execute function convay_private.guard_frozen_pack_original();

-- Restrictive RLS also refuses a destructive Storage API operation before its
-- underlying object write. The row trigger is the concurrent final guard.
create or replace function convay_private.pack_original_is_retained(p_path text)
returns boolean language sql stable security definer set search_path='' as $fn$
 select exists(select 1 from convay_private.board_pack_publication_snapshots s
   where s.files @> jsonb_build_array(jsonb_build_object('storagePath',p_path)));
$fn$;
revoke all on function convay_private.pack_original_is_retained(text) from public,anon,authenticated;
grant execute on function convay_private.pack_original_is_retained(text) to authenticated;
drop policy if exists convay_pack_original_no_update on storage.objects;
create policy convay_pack_original_no_update on storage.objects as restrictive for update to authenticated
 using (bucket_id<>'convay-documents' or not convay_private.pack_original_is_retained(name))
 with check (bucket_id<>'convay-documents' or not convay_private.pack_original_is_retained(name));
drop policy if exists convay_pack_original_no_delete on storage.objects;
create policy convay_pack_original_no_delete on storage.objects as restrictive for delete to authenticated
 using (bucket_id<>'convay-documents' or not convay_private.pack_original_is_retained(name));

-- Private, actor-bound, short-lived download authorizations. An acknowledgement
-- records the authorization to release a ZIP, NOT a proof the browser saved it.
create table if not exists convay_private.board_pack_download_authorizations (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null references convay_private.board_pack_publication_snapshots(manifest_id),
  actor_id uuid not null,
  issued_at timestamptz not null,
  expires_at timestamptz not null check(expires_at>issued_at),
  receipt_id uuid unique,
  confirmed_at timestamptz,
  check((receipt_id is null)=(confirmed_at is null))
);
alter table convay_private.board_pack_download_authorizations enable row level security;
revoke all on convay_private.board_pack_download_authorizations from public,anon,authenticated;

-- The only inputs are canonical record/snapshot IDs. Do not accept caller file
-- paths, version labels, client ACLs or expiry timestamps. Revalidate current
-- tenant, manager/meeting participant entitlement and document ACL on every call.
create or replace function convay_private.authorized_pack_snapshot(p_pack text)
returns convay_private.board_pack_publication_snapshots language plpgsql security definer set search_path='' as $fn$
declare
  actor uuid := auth.uid();
  snap convay_private.board_pack_publication_snapshots%rowtype;
  pack public.convay_entity_records%rowtype;
  meeting public.convay_entity_records%rowtype;
  f jsonb;
begin
  if actor is null or not coalesce(convay_private.has_permission('pack_view'),false)
    or not coalesce(convay_private.has_permission('mtg_view'),false)
    or not coalesce(convay_private.has_permission('doc_download'),false) then
    raise exception 'Board-pack download is not authorized' using errcode='42501';
  end if;
  begin
    select p.* into strict pack from public.convay_entity_records p
      where p.entity_key='bms.boardpacks' and p.record_id=p_pack and p.payload->>'approval_status'='Published' for share;
    select s.* into strict snap from convay_private.board_pack_publication_snapshots s
      where s.pack_record_id=pack.record_id and s.tenant_id is not distinct from pack.tenant_id
        and s.manifest_id::text=pack.payload->>'publication_manifest_id'
        and s.frozen_revision=pack.revision and s.pack_version=pack.payload->>'version';
    if (pack.tenant_id is null and not coalesce(convay_private.legacy_unscoped_authorized(),false))
      or (pack.tenant_id is not null and not coalesce(convay_private.tenant_member_active(pack.tenant_id),false)) then
      raise exception 'Board-pack download is not authorized' using errcode='42501';
    end if;
    select m.* into strict meeting from public.convay_entity_records m
      where m.entity_key='bms.meetings' and m.record_id=snap.meeting_record_id
        and m.tenant_id is not distinct from snap.tenant_id for share;
    if not (coalesce(convay_private.has_permission('pack_publish'),false) and coalesce(convay_private.has_permission('pack_create'),false))
       and not exists(select 1 from public.convay_entity_records l
          where l.entity_key='bms.meetingParticipantLinks' and l.tenant_id is not distinct from snap.tenant_id
            and l.payload->>'meeting_id' in (meeting.record_id,meeting.payload->>'meeting_id')
            and l.payload->>'user_id'=actor::text) then
      raise exception 'Board-pack download is not authorized' using errcode='42501';
    end if;
    for f in select value from jsonb_array_elements(snap.files) loop
      if not coalesce(convay_private.document_scope_authorized(f->>'documentId','view'),false)
        or not exists(select 1 from public.convay_document_content c join storage.objects o
          on o.bucket_id='convay-documents' and o.name=c.storage_path
          where c.id='file:'||(f->>'documentId')||':'||(f->>'versionId')
            and c.document_id=f->>'documentId' and c.version_id=f->>'versionId'
            and c.content_type='original_file' and c.storage_path=f->>'storagePath'
            and c.size=(f->>'sizeBytes')::bigint and c.file_name=f->>'fileName'
            and o.id::text=f->>'objectId' and (to_jsonb(o)->>'version') is not distinct from (f->>'objectVersion')
            and o.updated_at=(f->>'objectUpdatedAt')::timestamptz) then
        raise exception 'Board-pack content is unavailable or unauthorized' using errcode='42501';
      end if;
    end loop;
  exception when no_data_found or too_many_rows then
    raise exception 'Board-pack download is not authorized' using errcode='42501';
  end;
  return snap;
end $fn$;
revoke all on function convay_private.authorized_pack_snapshot(text) from public,anon,authenticated;

create or replace function convay_private.issue_pack_download(p_pack text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare s convay_private.board_pack_publication_snapshots%rowtype;
  ticket uuid; stamp timestamptz := clock_timestamp(); visible_files jsonb;
begin
  s:=convay_private.authorized_pack_snapshot(p_pack);
  insert into convay_private.board_pack_download_authorizations(snapshot_id,actor_id,issued_at,expires_at)
    values(s.manifest_id,auth.uid(),stamp,stamp+interval '5 minutes') returning id into ticket;
  select jsonb_agg(jsonb_build_object('documentId',f->>'documentId','versionId',f->>'versionId',
    'fileName',f->>'fileName','sizeBytes',f->'sizeBytes') order by ord)
    into visible_files from jsonb_array_elements(s.files) with ordinality as a(f,ord);
  return jsonb_build_object('packId',p_pack,'manifestId',ticket,'approvalStatus','Published',
    'frozenRevision',s.frozen_revision,'expiresAt',stamp+interval '5 minutes','files',visible_files);
end $fn$;
revoke all on function convay_private.issue_pack_download(text) from public,anon,authenticated;
grant execute on function convay_private.issue_pack_download(text) to authenticated;
create or replace function public.convay_board_pack_download_manifest(p_pack text)
returns jsonb language sql security invoker set search_path='' as $fn$
 select convay_private.issue_pack_download(p_pack);
$fn$;
revoke all on function public.convay_board_pack_download_manifest(text) from public,anon,authenticated;
grant execute on function public.convay_board_pack_download_manifest(text) to authenticated;

create or replace function convay_private.confirm_pack_download(p_pack text,p_manifest uuid)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare s convay_private.board_pack_publication_snapshots%rowtype;
  ticket convay_private.board_pack_download_authorizations%rowtype;
begin
  s:=convay_private.authorized_pack_snapshot(p_pack);
  select a.* into ticket from convay_private.board_pack_download_authorizations a
    where a.id=p_manifest and a.actor_id=auth.uid() and a.snapshot_id=s.manifest_id for update;
  if not found or ticket.expires_at<=clock_timestamp() then
    raise exception 'Board-pack download authorization expired or denied' using errcode='42501';
  end if;
  if ticket.receipt_id is null then
    update convay_private.board_pack_download_authorizations set receipt_id=gen_random_uuid(),confirmed_at=clock_timestamp()
      where id=ticket.id returning * into ticket;
  end if;
  return jsonb_build_object('receiptId',ticket.receipt_id,'packId',p_pack,'manifestId',ticket.id);
end $fn$;
revoke all on function convay_private.confirm_pack_download(text,uuid) from public,anon,authenticated;
grant execute on function convay_private.confirm_pack_download(text,uuid) to authenticated;
create or replace function public.convay_board_pack_download_receipt(p_pack text,p_manifest uuid)
returns jsonb language sql security invoker set search_path='' as $fn$
 select convay_private.confirm_pack_download(p_pack,p_manifest);
$fn$;
revoke all on function public.convay_board_pack_download_receipt(text,uuid) from public,anon,authenticated;
grant execute on function public.convay_board_pack_download_receipt(text,uuid) to authenticated;
notify pgrst,'reload schema';

-- Dedicated, revision-checked publication command. No generic browser status
-- edit or fallback. The existing registry RLS and atomic snapshot trigger
-- remain the only transition authority. A lost response may be recovered
-- only by the same actor and expected revision.
create or replace function public.convay_publish_board_pack(p_pack text,p_revision bigint)
returns jsonb language plpgsql security invoker set search_path='' as $fn$
declare row_data public.convay_entity_records%rowtype;
  actor uuid := auth.uid();
begin
  if actor is null or p_revision is null or p_revision<1 or p_revision>=9007199254740991
    or not coalesce(convay_private.has_permission('pack_publish'),false)
    or not coalesce(convay_private.has_permission('pack_create'),false)
    or not coalesce(convay_private.has_permission('pack_view'),false) then
    raise exception 'Board-pack publication is not authorized' using errcode='42501';
  end if;
  select r.* into row_data from public.convay_entity_records r
    where r.entity_key='bms.boardpacks' and r.record_id=p_pack for update;
  if not found then raise exception 'Board pack is unavailable' using errcode='42501'; end if;
  if row_data.revision=p_revision and row_data.payload->>'approval_status'='Approved' then
    update public.convay_entity_records set payload=jsonb_set(payload,'{approval_status}','"Published"'::jsonb)
      where entity_key='bms.boardpacks' and record_id=p_pack and revision=p_revision returning * into row_data;
    if not found then raise exception 'Board-pack publication changed or was denied' using errcode='42501'; end if;
  elsif row_data.revision<>p_revision+1 or row_data.payload->>'approval_status' is distinct from 'Published'
    or row_data.payload->>'published_by' is distinct from actor::text then
    raise exception 'Board pack changed or is not approved; refresh before publishing' using errcode='23514';
  end if;
  -- A missing/disabled snapshot trigger cannot result in a published record.
  if row_data.payload->>'approval_status' is distinct from 'Published'
    or row_data.revision<>p_revision+1 or row_data.payload->>'frozen_revision' is distinct from row_data.revision::text
    or row_data.payload->>'published_by' is distinct from actor::text
    or nullif(row_data.payload->>'publication_manifest_id','') is null then
    raise exception 'Atomic board-pack publication was not confirmed' using errcode='23514';
  end if;
  return jsonb_build_object('recordId',row_data.record_id,'revision',row_data.revision,
    'approvalStatus','Published','manifestId',row_data.payload->>'publication_manifest_id','version',row_data.payload->>'version');
end $fn$;
revoke all on function public.convay_publish_board_pack(text,bigint) from public,anon,authenticated;
grant execute on function public.convay_publish_board_pack(text,bigint) to authenticated;
notify pgrst,'reload schema';
