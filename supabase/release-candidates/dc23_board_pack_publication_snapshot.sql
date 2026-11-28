-- DC-23/24 staged server transaction. Apply only after dc21 link integrity and
-- Phase 1 tenant/document scope candidates, with inventory and recovery review.
-- This freezes metadata and Storage object identity, NOT a copy of file bytes.
-- No download endpoint, cover/notice/minutes renderer or hosted activation.
create table if not exists convay_private.board_pack_publication_snapshots (
  manifest_id uuid primary key default gen_random_uuid(),
  pack_record_id text not null,
  pack_version text not null,
  tenant_id uuid,
  frozen_revision bigint not null check (frozen_revision > 0),
  published_by uuid not null,
  published_at timestamptz not null,
  pack_payload jsonb not null,
  meeting_record_id text not null,
  files jsonb not null check (jsonb_typeof(files) = 'array' and jsonb_array_length(files) between 1 and 400),
  unique (pack_record_id, pack_version)
);
alter table convay_private.board_pack_publication_snapshots enable row level security;
revoke all on convay_private.board_pack_publication_snapshots from public, anon, authenticated;

-- This trigger needs the complete membership set, including links hidden by
-- document RLS. It never exposes that set to the caller. Explicit actor,
-- permission, tenant and per-document authorization checks are mandatory;
-- caller's registry RLS remains in force on the parent UPDATE as well.
create or replace function convay_private.freeze_board_pack_publication()
returns trigger language plpgsql security definer set search_path = '' as $freeze$
declare
  actor uuid := auth.uid();
  manifest uuid := gen_random_uuid();
  stamp timestamptz := clock_timestamp();
  pack_state text;
  pack_ref text;
  pack_version text;
  meeting_ref text;
  meeting_record text;
  member record;
  document_row public.convay_entity_records%rowtype;
  version_row public.convay_entity_records%rowtype;
  original public.convay_document_content%rowtype;
  obj record;
  files jsonb := '[]'::jsonb;
  seen text[] := array[]::text[];
  bytes_total bigint := 0;
  storage_prefix text;
begin
  if tg_op = 'DELETE' then
    if old.entity_key = 'bms.boardpacks' and exists (
      select 1 from convay_private.board_pack_publication_snapshots s where s.pack_record_id = old.record_id
    ) then
      raise exception 'Published board-pack snapshots must be retained' using errcode='23514';
    end if;
    return old;
  end if;
  if new.entity_key <> 'bms.boardpacks' then return new; end if;
  pack_state := lower(btrim(coalesce(new.payload->>'approval_status','')));
  if tg_op = 'UPDATE' and exists (
    select 1 from convay_private.board_pack_publication_snapshots s where s.pack_record_id = old.record_id
  ) then
    raise exception 'Published board pack is immutable; use a controlled new version' using errcode='23514';
  end if;
  -- A client cannot manufacture publication evidence or use a lifecycle alias.
  if new.payload ?| array['publication_manifest_id','published_by','published_at','frozen_revision'] then
    raise exception 'Publication evidence is server-owned' using errcode='23514';
  end if;
  if pack_state not in ('published','released') then
    if lower(btrim(coalesce(new.payload->>'status',''))) in ('published','released')
      or lower(btrim(coalesce(new.payload->>'workflow_status',''))) in ('published','released') then
      raise exception 'Invalid board-pack publication state' using errcode='23514';
    end if;
    return new;
  end if;
  if tg_op <> 'UPDATE' then
    raise exception 'Create and approve a board pack before publication' using errcode='23514';
  end if;
  if old.payload->>'approval_status' is distinct from 'Approved' or pack_state <> 'published' then
    raise exception 'Only an approved board pack can be published' using errcode='23514';
  end if;
  if actor is null or not convay_private.has_permission('pack_publish')
      or not convay_private.has_permission('pack_create')
      or not convay_private.has_permission('pack_view')
      or not convay_private.has_permission('mtg_view')
      or not convay_private.has_permission('doc_view')
      or (old.tenant_id is null and not convay_private.legacy_unscoped_authorized())
      or (old.tenant_id is not null and not convay_private.tenant_member_active(old.tenant_id)) then
    raise exception 'Board-pack publication is not authorized' using errcode='42501';
  end if;
  -- Publication cannot also edit the approved metadata or reassign the meeting.
  if (new.payload - 'approval_status') is distinct from (old.payload - 'approval_status') then
    raise exception 'Approved board-pack metadata changed before publication' using errcode='23514';
  end if;
  pack_ref := old.payload->>'pack_id';
  pack_version := old.payload->>'version';
  meeting_ref := coalesce(nullif(old.payload->>'meeting_id',''), old.payload->>'related_meeting');
  if nullif(btrim(pack_ref),'') is null or nullif(btrim(pack_version),'') is null
      or nullif(btrim(meeting_ref),'') is null or nullif(btrim(old.payload->>'pack_title'),'') is null
      or (nullif(old.payload->>'meeting_id','') is not null and nullif(old.payload->>'related_meeting','') is not null
          and old.payload->>'meeting_id' <> old.payload->>'related_meeting') then
    raise exception 'Board-pack identity or meeting metadata is incomplete' using errcode='23514';
  end if;
  if exists (select 1 from public.convay_entity_records p where p.entity_key='bms.boardpacks'
      and p.tenant_id is not distinct from old.tenant_id and p.record_id <> old.record_id
      and (p.record_id = pack_ref or p.payload->>'pack_id' in (old.record_id,pack_ref))) then
    raise exception 'Board-pack identity is ambiguous' using errcode='23514';
  end if;
  begin
    select m.record_id into strict meeting_record from public.convay_entity_records m
      where m.entity_key='bms.meetings' and m.tenant_id is not distinct from old.tenant_id
      and (m.record_id=meeting_ref or m.payload->>'meeting_id'=meeting_ref)
      and lower(coalesce(m.payload->>'approval_status','')) not in ('cancelled','canceled','rejected') for share;
  exception when no_data_found or too_many_rows then
    raise exception 'Board-pack meeting is unavailable or ambiguous' using errcode='23514';
  end;
  -- These additional generated sections are not implemented by this candidate.
  -- Never silently drop a requested section and report a complete publication.
  if lower(coalesce(old.payload->>'include_notice','false')) <> 'false'
    or lower(coalesce(old.payload->>'include_minutes','false')) <> 'false'
    or lower(coalesce(old.payload->>'include_matters','false')) <> 'false' then
    raise exception 'Requested generated board-pack sections are not yet supported' using errcode='23514';
  end if;
  -- The existing DC-21 guard locks this parent before changing membership.
  -- Read every active link from the same tenant, then authorize every document.
  for member in select l.record_id, l.payload from public.convay_entity_records l
    where l.entity_key='bms.doc.pack_links' and l.tenant_id is not distinct from old.tenant_id
      and l.payload->>'board_pack_id' in (old.record_id,pack_ref)
      and l.payload->>'link_status' = 'active'
    order by case when l.payload->>'sort_order' ~ '^[0-9]{1,9}$' then (l.payload->>'sort_order')::integer end nulls last,
             l.created_at, l.record_id
  loop
    begin
      select d.* into strict document_row from public.convay_entity_records d
        where d.entity_key='bms.documents' and d.tenant_id is not distinct from old.tenant_id
          and (d.record_id=member.payload->>'document_id' or d.payload->>'doc_id'=member.payload->>'document_id') for share;
      if not convay_private.document_scope_authorized(document_row.record_id,'view') then
        raise exception 'Board-pack content is not authorized' using errcode='42501';
      end if;
      if document_row.record_id=any(seen) then
        raise exception 'Duplicate board-pack document' using errcode='23514';
      end if;
      seen := array_append(seen,document_row.record_id);
      select v.* into strict version_row from public.convay_entity_records v
        where v.entity_key='bms.docversions' and v.tenant_id is not distinct from old.tenant_id
          and v.payload->>'document_id' in (document_row.record_id,document_row.payload->>'doc_id')
          and v.payload->>'version_id'=member.payload->>'linked_version_id'
          and v.payload->>'version_id' is distinct from v.payload->>'version_number'
          and lower(v.payload->>'version_id') not in ('latest','live') for share;
      -- Match the exact original identity used by the existing historical
      -- download store. Ambiguous or URL-encoded legacy IDs require inventory.
      if document_row.record_id !~ '^[A-Za-z0-9_-]+$' or version_row.payload->>'version_id' !~ '^[A-Za-z0-9_-]+$' then
        raise exception 'Noncanonical original-file identity' using errcode='23514';
      end if;
      select c.* into strict original from public.convay_document_content c
        where c.id='file:'||document_row.record_id||':'||(version_row.payload->>'version_id')
          and c.document_id=document_row.record_id and c.version_id=version_row.payload->>'version_id'
          and c.content_type='original_file' for share;
      storage_prefix := document_row.record_id||'/'||(version_row.payload->>'version_id')||'/original/';
      if original.storage_path is null or left(original.storage_path,length(storage_prefix)) <> storage_prefix
        or substring(original.storage_path from length(storage_prefix)+1) !~* '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'
        or nullif(btrim(original.file_name),'') is null or original.size < 0 or original.size > 104857600 then
        raise exception 'Invalid board-pack original metadata' using errcode='23514';
      end if;
      select o.id, o.updated_at, to_jsonb(o)->>'version' as object_version, o.metadata into strict obj
        from storage.objects o where o.bucket_id='convay-documents' and o.name=original.storage_path for share;
      if coalesce(obj.metadata->>'size','') !~ '^[0-9]{1,12}$'
          or (obj.metadata->>'size')::bigint <> original.size then
        raise exception 'Board-pack original Storage byte count does not match' using errcode='23514';
      end if;
    exception when no_data_found or too_many_rows then
      raise exception 'Board-pack exact original is missing or ambiguous' using errcode='23514';
    end;
    bytes_total := bytes_total + original.size;
    if cardinality(seen) > 400 or bytes_total > 268435456 then
      raise exception 'Board pack exceeds download size limits' using errcode='23514';
    end if;
    files := files || jsonb_build_array(jsonb_build_object(
      'documentId',document_row.record_id,'versionId',version_row.payload->>'version_id',
      'fileName',original.file_name,'sizeBytes',original.size,
      'storagePath',original.storage_path,'objectId',obj.id,'objectVersion',obj.object_version,
      'objectUpdatedAt',obj.updated_at,'documentRevision',document_row.revision,
      'versionRevision',version_row.revision,'linkId',member.record_id));
  end loop;
  if cardinality(seen)=0 then
    raise exception 'Board pack requires at least one exact original' using errcode='23514';
  end if;
  new.payload := new.payload || jsonb_build_object(
    'approval_status','Published','publication_manifest_id',manifest,'frozen_revision',old.revision+1,
    'publication_date',to_char(stamp at time zone 'UTC','YYYY-MM-DD'),
    'published_by',actor,'published_at',stamp,'document_count',cardinality(seen)::text);
  insert into convay_private.board_pack_publication_snapshots
    (manifest_id,pack_record_id,pack_version,tenant_id,frozen_revision,published_by,published_at,pack_payload,meeting_record_id,files)
    values(manifest,old.record_id,pack_version,old.tenant_id,old.revision+1,actor,stamp,new.payload,meeting_record,files);
  return new;
end;
$freeze$;
revoke all on function convay_private.freeze_board_pack_publication() from public,anon,authenticated;
-- Run before existing entity audit so trusted publication fields are recorded.
drop trigger if exists convay_board_pack_publication_snapshot on public.convay_entity_records;
create trigger convay_board_pack_publication_snapshot before insert or update or delete on public.convay_entity_records
for each row execute function convay_private.freeze_board_pack_publication();
