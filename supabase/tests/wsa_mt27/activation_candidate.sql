-- WS-A MT-27 SECURITY CANDIDATE. DISPOSABLE DATABASE TEST ONLY.
-- NOT a hosted migration. Requires WS-F deployed tenant boundary, independently
-- restored DB/Auth/Storage, verified legacy backfill and WS0 release review.
-- Do not use this file as an automatic migration or enable PR #82 yet.

do $pre$
begin
  if to_regclass('convay_private.tenants') is null or
     to_regclass('convay_private.tenant_memberships') is null or
     not exists (select 1 from information_schema.columns where table_schema='public'
       and table_name='convay_entity_records' and column_name='tenant_id') or
     to_regprocedure('convay_private.tenant_actor_authorized(uuid)') is null or
     to_regprocedure('convay_private.signed_active_tenant()') is null
  then
    raise exception 'MT-27 requires activated, independently verified TEN-03 and recovery'
      using errcode='55000';
  end if;
end $pre$;

create table convay_private.mt27_delete_receipts (
  tenant_id uuid not null references convay_private.tenants(id),
  actor_id uuid not null references auth.users(id),
  request_id text not null check(length(request_id) between 1 and 180),
  record_id text not null check(length(record_id) between 1 and 180),
  expected_revision bigint not null check(expected_revision>0),
  deleted_child_count integer not null default 0,
  deleted_at timestamptz not null default clock_timestamp(),
  primary key(tenant_id,actor_id,request_id)
);
revoke all on convay_private.mt27_delete_receipts from public, anon, authenticated;
alter table convay_private.mt27_delete_receipts enable row level security;

-- Restrictive policy composes with every existing registry/document permission
-- policy. It closes direct PostgREST DELETE and generic invoker batch DELETE
-- without replacing or weakening other records' permission policies.
create policy convay_mt27_forbid_generic_meeting_delete
 on public.convay_entity_records as restrictive
 for delete to authenticated
 using (entity_key <> 'bms.meetings');

-- SECURITY DEFINER bypasses RLS for the one atomic deletion only.
-- Every sensitive check is explicit and uses fresh tenant membership and actor.
-- This private schema is not Data API-exposed. No tenant or actor from JSON.
create function convay_private.mt27_delete_owned_draft(
  p_record_id text,
  p_request_id text,
  p_expected_revision bigint
) returns jsonb
language plpgsql volatile security definer set search_path=''
as $body$
declare
  v_actor uuid := auth.uid();
  v_tenant uuid := convay_private.signed_active_tenant();
  v_id text := nullif(btrim(coalesce(p_record_id,'')),'');
  v_key text := nullif(btrim(coalesce(p_request_id,'')),'');
  v_prior convay_private.mt27_delete_receipts%rowtype;
  v_meeting public.convay_entity_records%rowtype;
  v_meeting_id text;
  v_bad boolean := false;
  v_children integer := 0;
  v_rows integer;
begin
  if v_actor is null or v_tenant is null
     or not coalesce(convay_private.tenant_actor_authorized(v_tenant),false)
     or not coalesce(convay_private.registry_authorized('bms.meetings','delete'),false)
     or not coalesce(convay_private.registry_authorized('bms.meetings','read'),false)
  then raise exception 'Draft deletion not authorized' using errcode='42501'; end if;
  if v_id is null or length(v_id)>180 or v_key is null or length(v_key)>180
     or p_expected_revision is null or p_expected_revision<1
  then raise exception 'Invalid draft deletion identity or revision' using errcode='22023'; end if;

  -- Serializes concurrent identical retries; collision can only delay, never
  -- grant authorization. Every retry independently rechecks live membership.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_tenant::text||':'||v_actor::text||':'||v_key,0)
  );
  select * into v_prior from convay_private.mt27_delete_receipts
   where tenant_id=v_tenant and actor_id=v_actor and request_id=v_key
   for update;
  if found then
    if v_prior.record_id is distinct from v_id
       or v_prior.expected_revision is distinct from p_expected_revision then
      raise exception 'Idempotency key cannot be reused for another draft/revision'
        using errcode='22023';
    end if;
    return pg_catalog.jsonb_build_object(
      'record_id',v_id,'request_id',v_key,'outcome','already_deleted');
  end if;

  select * into v_meeting from public.convay_entity_records
   where entity_key='bms.meetings' and record_id=v_id and tenant_id=v_tenant
   for update;
  if not found then raise exception 'Draft unavailable for deletion' using errcode='40001'; end if;
  if v_meeting.created_by is distinct from v_actor then
    raise exception 'Draft deletion requires the original creator'
      using errcode='42501';
  end if;
  if v_meeting.revision is distinct from p_expected_revision then
    raise exception 'Draft revision changed; refresh before deleting'
      using errcode='40001';
  end if;
  if lower(btrim(coalesce(v_meeting.payload->>'approval_status','Draft'))) <> 'draft'
     or lower(btrim(coalesce(v_meeting.payload->>'status','Draft'))) <> 'draft'
     or v_meeting.payload->>'legal_hold'='true'
     or v_meeting.payload->>'retention_hold'='true'
     or v_meeting.payload->>'is_locked'='true'
     or coalesce(pg_catalog.jsonb_array_length(
       case when pg_catalog.jsonb_typeof(v_meeting.payload->'approval_history')='array'
            then v_meeting.payload->'approval_history' else '[]'::jsonb end),0)>0
  then raise exception 'Only an unheld, unapproved Draft may be deleted'
    using errcode='40001'; end if;

  v_meeting_id := coalesce(nullif(btrim(v_meeting.payload->>'meeting_id'),''),
                           v_meeting.record_id);
  -- Anything beyond owner-created draft setup links is protected history.
  -- Also deny orphaning foreign/cross-tenant links and unexpected references.
  select exists(
    select 1 from public.convay_entity_records child
     where child.entity_key<>'bms.meetings'
       and (
         child.payload->>'meeting_id' in (v_id,v_meeting_id)
         or child.payload->>'related_meeting' in (v_id,v_meeting_id)
         or child.payload->>'source_meeting_id' in (v_id,v_meeting_id)
       )
       and (
         child.tenant_id is distinct from v_tenant
         or child.created_by is distinct from v_actor
         or child.entity_key not in (
           'bms.meetingParticipantLinks','bms.meetingAgendaLinks',
           'bms.meetingDocumentLinks'
         )
         or child.payload->>'meeting_id' not in (v_id,v_meeting_id)
       )
  ) into v_bad;
  if v_bad then raise exception 'Meeting has protected or foreign linked records'
    using errcode='23503'; end if;

  -- Atomic cleanup of only owner-created draft setup links; PostgreSQL
  -- triggers/audit must remain active. Deletes rollback if any later step fails.
  delete from public.convay_entity_records child
   where child.entity_key in (
       'bms.meetingParticipantLinks','bms.meetingAgendaLinks',
       'bms.meetingDocumentLinks')
     and child.tenant_id=v_tenant
     and child.created_by=v_actor
     and child.payload->>'meeting_id' in (v_id,v_meeting_id);
  get diagnostics v_children=row_count;

  delete from public.convay_entity_records
   where entity_key='bms.meetings' and record_id=v_id and tenant_id=v_tenant
     and revision=p_expected_revision and created_by=v_actor;
  get diagnostics v_rows=row_count;
  if v_rows<>1 then raise exception 'Draft changed during deletion'
    using errcode='40001'; end if;

  insert into convay_private.mt27_delete_receipts(
    tenant_id,actor_id,request_id,record_id,expected_revision,deleted_child_count)
  values(v_tenant,v_actor,v_key,v_id,p_expected_revision,v_children);
  return pg_catalog.jsonb_build_object(
    'record_id',v_id,'request_id',v_key,'outcome','deleted');
end
$body$;
revoke all on function convay_private.mt27_delete_owned_draft(text,text,bigint)
 from public,anon,authenticated;
grant execute on function convay_private.mt27_delete_owned_draft(text,text,bigint)
 to authenticated;

-- Deny reusing a deleted meeting identity. AFTER INSERT observes the tenant
-- set by WS-F BEFORE INSERT stamping and raises to roll back unauthorized reuse.
create function convay_private.mt27_reject_tombstoned_meeting()
returns trigger language plpgsql security definer set search_path=''
as $tomb$
begin
 if new.entity_key='bms.meetings' then
   if new.tenant_id is null then
     raise exception 'Meeting tenant identity required' using errcode='42501';
   end if;
   if exists(select 1 from convay_private.mt27_delete_receipts r
      where r.tenant_id=new.tenant_id and r.record_id=new.record_id) then
     raise exception 'A deleted meeting identifier cannot be reused'
       using errcode='23505';
   end if;
 end if;
 return new;
end $tomb$;
revoke all on function convay_private.mt27_reject_tombstoned_meeting()
 from public,anon,authenticated;
create trigger convay_mt27_no_reused_meeting_identity
 after insert on public.convay_entity_records
 for each row execute function convay_private.mt27_reject_tombstoned_meeting();

-- A thin RLS-invoker public endpoint; the private function still checks all
-- security requirements. PR #82 currently uses TWO args and MUST be updated
-- to pass a fresh expected revision before any feature activation.
create function public.convay_delete_draft_meeting(
  p_record_id text,p_request_id text,p_expected_revision bigint)
returns jsonb language sql volatile security invoker set search_path=''
as $wrapper$
 select convay_private.mt27_delete_owned_draft(
   p_record_id,p_request_id,p_expected_revision);
$wrapper$;
revoke all on function public.convay_delete_draft_meeting(text,text,bigint)
 from public,anon,authenticated;
grant execute on function public.convay_delete_draft_meeting(text,text,bigint)
 to authenticated;
