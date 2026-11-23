-- MT-27: controlled Draft-only meeting removal; server receipts + audit preservation.
-- Existing Scheduled/Started/Completed meetings never qualify.
-- TEN staging is unactivated: non-NULL tenant ownership is refused, not reassigned.
create table if not exists convay_private.meeting_draft_deletion_receipts (
  actor_id uuid not null references auth.users(id),
  request_id text not null check (request_id ~ '^[A-Za-z0-9_-]{16,120}$'),
  record_id text not null,
  expected_revision bigint not null check (expected_revision > 0),
  snapshot jsonb not null,
  linked_snapshot jsonb not null,
  deleted_at timestamptz not null default now(),
  primary key(actor_id,request_id)
);
alter table convay_private.meeting_draft_deletion_receipts enable row level security;
revoke all on convay_private.meeting_draft_deletion_receipts from public,anon,authenticated;
comment on table convay_private.meeting_draft_deletion_receipts is
  'MT-27 immutable private restore receipt; never exposed to Data API';

create or replace function convay_private.enforce_meeting_deletion_rpc_only()
returns trigger language plpgsql security invoker set search_path = '' as $fn$
begin
  if old.entity_key = 'bms.meetings'
     and pg_catalog.current_setting('convay.mt27_deleting_actor',true)
       is distinct from coalesce(auth.uid()::text,'') then
    raise exception 'Meeting removal requires the authorized Draft deletion RPC'
      using errcode='42501';
  end if;
  return old;
end $fn$;
revoke all on function convay_private.enforce_meeting_deletion_rpc_only() from public,anon,authenticated;
drop trigger if exists convay_a0_meeting_delete_rpc_only on public.convay_entity_records;
create trigger convay_a0_meeting_delete_rpc_only
before delete on public.convay_entity_records for each row
when (old.entity_key='bms.meetings')
execute function convay_private.enforce_meeting_deletion_rpc_only();

create or replace function public.convay_delete_draft_meeting(
 p_record_id text, p_request_id text, p_expected_revision bigint
) returns jsonb language plpgsql security definer set search_path = '' as $fn$
declare
 v_actor uuid := auth.uid();
 v_meeting public.convay_entity_records%rowtype;
 v_receipt convay_private.meeting_draft_deletion_receipts%rowtype;
 v_mid text;
 v_link_snapshot jsonb;
 v_link_key text;
 v_link_count integer;
 v_updated integer;
 v_safe_keys text[] := array[
  'bms.meetingParticipantLinks','bms.participants','bms.rsvp',
  'bms.meetingAgendaLinks','bms.meetingDocumentLinks'
 ];
begin
 if v_actor is null or not exists (
  select 1 from public.user_profiles u
  where u.user_id=v_actor and u.account_status='active'
 ) then
  raise exception 'Active sign-in required' using errcode='42501';
 end if;
 if p_record_id is null or length(p_record_id) not between 1 and 180
  or p_record_id !~ '^[A-Za-z0-9_-]+$'
  or p_request_id is null
  or p_request_id !~ '^[A-Za-z0-9_-]{16,120}$'
  or p_expected_revision is null or p_expected_revision < 1 then
  raise exception 'Invalid deletion request' using errcode='22023';
 end if;
 if not convay_private.registry_authorized('bms.meetings','delete') then
  raise exception 'Meeting deletion permission required' using errcode='42501';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtext('convay.mt27:'||p_record_id));
 select * into v_receipt from convay_private.meeting_draft_deletion_receipts
 where actor_id=v_actor and request_id=p_request_id;
 if found then
  if v_receipt.record_id <> p_record_id
    or v_receipt.expected_revision <> p_expected_revision then
   raise exception 'Deletion request key reused with conflicting input' using errcode='23505';
  end if;
  return pg_catalog.jsonb_build_object(
   'record_id',p_record_id,'request_id',p_request_id,'outcome','already_deleted');
 end if;
 select * into v_meeting from public.convay_entity_records
 where entity_key='bms.meetings' and record_id=p_record_id for update;
 if not found then raise exception 'Draft no longer exists' using errcode='P0002'; end if;
 if v_meeting.revision <> p_expected_revision then
  raise exception 'Draft was modified; refresh before deleting' using errcode='40001';
 end if;
 if v_meeting.tenant_id is not null then
  raise exception 'Tenant-owned deletion is not activated' using errcode='42501';
 end if;
 if v_meeting.created_by is distinct from v_actor
   and not exists (select 1 from public.user_profiles u
     where u.user_id=v_actor and u.account_status='active'
     and u.account_role='super_admin') then
  raise exception 'Draft owner or Super Admin required' using errcode='42501';
 end if;
 if v_meeting.payload->>'id' is distinct from p_record_id
   or lower(coalesce(v_meeting.payload->>'approval_status','')) <> 'draft'
   or lower(coalesce(v_meeting.payload->>'status','')) not in ('','draft')
   or lower(coalesce(v_meeting.payload->>'workflow_status','')) not in ('','draft') then
  raise exception 'Only an unchanged Draft meeting may be deleted'
   using errcode='23514';
 end if;
 v_mid := coalesce(nullif(v_meeting.payload->>'meeting_id',''),p_record_id);
 -- Preserve immutable evidence rather than silently cascading any unknown record.
 if exists (
  select 1 from public.convay_entity_records child
  where child.entity_key <> 'bms.meetings'
    and (child.payload->>'meeting_id' in (v_mid,p_record_id)
      or child.payload->>'source_meeting_id' in (v_mid,p_record_id))
    and child.entity_key <> all(v_safe_keys)
 ) then
  raise exception 'Draft has retained governance evidence; cannot delete'
    using errcode='23503';
 end if;
 if exists (
  select 1 from public.convay_entity_records child
  where child.entity_key = any(v_safe_keys)
    and child.payload->>'meeting_id' in (v_mid,p_record_id)
    and child.tenant_id is not null
 ) then
  raise exception 'Tenant-owned meeting links cannot be removed'
   using errcode='42501';
 end if;
 for v_link_key in
  select distinct child.entity_key from public.convay_entity_records child
  where child.entity_key=any(v_safe_keys)
   and child.payload->>'meeting_id' in (v_mid,p_record_id)
 loop
  if not convay_private.registry_authorized(v_link_key,'delete') then
   raise exception 'Linked record removal permission required: %',v_link_key
    using errcode='42501';
  end if;
 end loop;
 select coalesce(pg_catalog.jsonb_agg(
  pg_catalog.jsonb_build_object('entity_key',child.entity_key,
   'record_id',child.record_id,'revision',child.revision,'payload',child.payload)), '[]'::jsonb)
 into v_link_snapshot from public.convay_entity_records child
 where child.entity_key=any(v_safe_keys)
   and child.payload->>'meeting_id' in (v_mid,p_record_id);
 -- Each deletion is tracked by the existing immutable entity_changes trigger.
 delete from public.convay_entity_records child
 where child.entity_key=any(v_safe_keys)
   and child.payload->>'meeting_id' in (v_mid,p_record_id);
 perform pg_catalog.set_config('convay.mt27_deleting_actor',v_actor::text,true);
 delete from public.convay_entity_records
 where entity_key='bms.meetings' and record_id=p_record_id
  and revision=p_expected_revision;
 get diagnostics v_updated=row_count;
 if v_updated <> 1 then raise exception 'Draft deletion was not committed' using errcode='40001'; end if;
 insert into convay_private.meeting_draft_deletion_receipts
  (actor_id,request_id,record_id,expected_revision,snapshot,linked_snapshot)
 values (v_actor,p_request_id,p_record_id,p_expected_revision,
  pg_catalog.jsonb_build_object('payload',v_meeting.payload,'created_by',v_meeting.created_by,
    'revision',v_meeting.revision,'tenant_id',v_meeting.tenant_id),v_link_snapshot);
 perform pg_catalog.set_config('convay.mt27_deleting_actor','',true);
 return pg_catalog.jsonb_build_object('record_id',p_record_id,
  'request_id',p_request_id,'outcome','deleted');
end $fn$;
revoke all on function public.convay_delete_draft_meeting(text,text,bigint)
 from public,anon,authenticated;
grant execute on function public.convay_delete_draft_meeting(text,text,bigint)
 to authenticated;
