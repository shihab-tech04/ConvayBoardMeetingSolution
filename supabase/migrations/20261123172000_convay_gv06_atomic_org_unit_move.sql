
-- GV-06: only one authenticated, audited, atomic hierarchy move RPC.
-- Owner UI: reviewed PR #104; does NOT activate unverified tenant membership.
create table if not exists convay_private.org_unit_move_receipts (
 actor_id uuid not null references auth.users(id),
 request_id text not null check(length(request_id) between 8 and 160),
 unit_id text not null,
 expected_parent_id text,
 new_parent_id text not null,
 effective_date date not null,
 reason text not null,
 receipt jsonb not null,
 created_at timestamptz not null default now(),
 primary key(actor_id,request_id)
);
alter table convay_private.org_unit_move_receipts enable row level security;
revoke all on table convay_private.org_unit_move_receipts from public,anon,authenticated;
create or replace function convay_private.guard_org_hierarchy_rpc_only()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 if old.entity_key='bms.orgunits' and (
    new.payload->'parent_unit_id' is distinct from old.payload->'parent_unit_id'
    or new.payload->'parent_unit' is distinct from old.payload->'parent_unit'
    or new.payload->'path_ids' is distinct from old.payload->'path_ids'
    or new.payload->'path_label' is distinct from old.payload->'path_label'
 ) and (auth.uid() is null or current_setting('convay.gv06_actor',true)
   is distinct from auth.uid()::text or current_user<>'postgres') then
    raise exception 'Organization hierarchy writes require authorized move transaction'
      using errcode='42501';
 end if;
 return new;
end $fn$;
revoke all on function convay_private.guard_org_hierarchy_rpc_only() from public,anon,authenticated;
drop trigger if exists convay_a0_org_hierarchy_rpc_only on public.convay_entity_records;
create trigger convay_a0_org_hierarchy_rpc_only before update on public.convay_entity_records
for each row when (new.entity_key='bms.orgunits')
execute function convay_private.guard_org_hierarchy_rpc_only();

create or replace function public.convay_move_org_unit(
 p_unit_id text,p_expected_parent_id text,p_new_parent_id text,
 p_effective_date date,p_reason text,p_request_id text
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid := auth.uid();
 v_unit public.convay_entity_records%rowtype;
 v_parent public.convay_entity_records%rowtype;
 v_old_parent text;
 v_unit_type text; v_parent_type text;
 v_new_ids text[]; v_new_names text[];
 v_parent_above text;
 v_depth int; v_ancestor_count int;
 v_allowed boolean := false;
 v_updated int; v_revision bigint; v_audit_id bigint;
 v_receipt jsonb; v_prior convay_private.org_unit_move_receipts%rowtype;
begin
 if v_actor is null or not exists (select 1 from public.user_profiles u
   where u.user_id=v_actor and u.account_status='active')
    or not convay_private.has_permission('gov_org_manage') then
  raise exception 'Active authorized governance administrator required' using errcode='42501';
 end if;
 if p_unit_id is null or length(p_unit_id) not between 1 and 180
    or p_new_parent_id is null or length(p_new_parent_id) not between 1 and 180
    or p_unit_id=p_new_parent_id
    or p_request_id is null or length(p_request_id) not between 8 and 160
    or p_reason is null or length(btrim(p_reason)) not between 3 and 1000
    or p_effective_date is null or p_effective_date>current_date then
  raise exception 'Invalid unit move request or future effective date' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('convay-gv06-global'));
 select * into v_prior from convay_private.org_unit_move_receipts
 where actor_id=v_actor and request_id=p_request_id;
 if found then
  if v_prior.unit_id<>p_unit_id
     or v_prior.expected_parent_id is distinct from p_expected_parent_id
     or v_prior.new_parent_id<>p_new_parent_id or v_prior.effective_date<>p_effective_date
     or v_prior.reason<>btrim(p_reason) then
     raise exception 'Request key reused with conflicting move' using errcode='23505';
  end if;
  return v_prior.receipt;
 end if;
 select * into v_unit from public.convay_entity_records
  where entity_key='bms.orgunits' and record_id=p_unit_id for update;
 if not found then raise exception 'Organization unit unavailable' using errcode='P0002'; end if;
 select * into v_parent from public.convay_entity_records
  where entity_key='bms.orgunits' and record_id=p_new_parent_id for update;
 if not found then raise exception 'Proposed parent unavailable' using errcode='P0002'; end if;
 if v_unit.tenant_id is not null or v_parent.tenant_id is not null then
   raise exception 'Tenant-owned unit movement not activated' using errcode='42501';
 end if;
 if v_unit.payload->>'id' is distinct from p_unit_id or
   v_parent.payload->>'id' is distinct from p_new_parent_id then
   raise exception 'Organization record identity mismatch' using errcode='23514';
 end if;
 if lower(coalesce(v_unit.payload->>'status','')) not in ('active','draft')
   or lower(coalesce(v_parent.payload->>'status','')) not in ('active','draft') then
   raise exception 'Inactive units cannot be moved or selected as parents' using errcode='23514';
 end if;
 v_old_parent:=nullif(v_unit.payload->>'parent_unit_id','');
 if v_old_parent is distinct from nullif(p_expected_parent_id,'') then
   raise exception 'Unit parent changed; refresh before moving' using errcode='40001';
 end if;
 if v_old_parent is not distinct from p_new_parent_id then
   raise exception 'New parent is already assigned' using errcode='23514';
 end if;
 v_unit_type:=v_unit.payload->>'unit_type';
 v_parent_type:=v_parent.payload->>'unit_type';
 v_allowed:=case v_unit_type
  when 'Head Office' then v_parent_type='Organization'
  when 'Branch' then v_parent_type in ('Organization','Head Office')
  when 'Division' then v_parent_type in ('Head Office','Branch')
  when 'Department' then v_parent_type='Division'
  when 'Regional Office' then v_parent_type in ('Organization','Head Office')
  when 'Section' then v_parent_type in ('Department','Division')
  when 'Team' then v_parent_type in ('Section','Department')
  else false end;
 if not coalesce(v_allowed,false) then
   raise exception 'Invalid organization parent type' using errcode='23514';
 end if;
 -- Traverse actual SQL parent edges, not client-supplied cached paths.
 with recursive ancestor(id,parent_id,ids,names,seen) as (
  select r.record_id,nullif(r.payload->>'parent_unit_id',''),
    array[r.record_id]::text[],array[r.payload->>'unit_name']::text[],
    array[r.record_id]::text[]
  from public.convay_entity_records r where r.entity_key='bms.orgunits' and r.record_id=p_new_parent_id
  union all
  select r.record_id,nullif(r.payload->>'parent_unit_id',''),
    array[r.record_id]::text[] || a.ids,
    array[r.payload->>'unit_name']::text[] || a.names,
    a.seen || r.record_id
  from ancestor a join public.convay_entity_records r
    on r.entity_key='bms.orgunits' and r.record_id=a.parent_id
  where not r.record_id=any(a.seen) and cardinality(a.seen)<100
 )
 select a.ids,a.names,a.parent_id,cardinality(a.seen)
 into v_new_ids,v_new_names,v_parent_above,v_depth
 from ancestor a order by cardinality(a.seen) desc limit 1;
 if v_new_ids is null or nullif(v_parent_above,'') is not null
  or p_unit_id=any(v_new_ids) or v_depth>=100 then
  raise exception 'Invalid ancestry, missing parent or hierarchy cycle' using errcode='23514';
 end if;
 -- Prevent overwriting an unexpected legacy cyclic subtree.
 with recursive down(id,seen) as (
   select p_unit_id,array[p_unit_id]::text[]
   union all
   select r.record_id,d.seen || r.record_id
   from down d join public.convay_entity_records r
      on r.entity_key='bms.orgunits' and r.payload->>'parent_unit_id'=d.id
   where not r.record_id=any(d.seen) and cardinality(d.seen)<100
 )
 select count(*) into v_ancestor_count from down;
 if v_ancestor_count>=100 then
  raise exception 'Hierarchy depth is beyond supported safe limit' using errcode='23514';
 end if;
 perform pg_catalog.set_config('convay.gv06_actor',v_actor::text,true);
 with recursive paths(id,ids,labels,seen) as (
  select p_unit_id, v_new_ids || p_unit_id,
      v_new_names || coalesce(v_unit.payload->>'unit_name',''),
      array[p_unit_id]::text[]
  union all
  select r.record_id,paths.ids || r.record_id,
    paths.labels || coalesce(r.payload->>'unit_name',''),
    paths.seen || r.record_id
  from paths join public.convay_entity_records r
    on r.entity_key='bms.orgunits' and r.payload->>'parent_unit_id'=paths.id
   and not r.record_id=any(paths.seen)
   and cardinality(paths.seen)<100
 )
 update public.convay_entity_records r set
   payload=r.payload ||
    pg_catalog.jsonb_build_object(
      'path_ids',pg_catalog.to_jsonb(paths.ids),
      'path_label',pg_catalog.array_to_string(paths.labels,' › '),
      'updated_at',pg_catalog.now()::text) ||
    case when r.record_id=p_unit_id then pg_catalog.jsonb_build_object(
       'parent_unit_id',p_new_parent_id,'parent_unit',
       coalesce(v_parent.payload->>'unit_name','')) else '{}'::jsonb end
 from paths where r.entity_key='bms.orgunits' and r.record_id=paths.id;
 get diagnostics v_updated=row_count;
 if v_updated <> v_ancestor_count then
  raise exception 'Could not update all descendants atomically' using errcode='40001';
 end if;
 perform pg_catalog.set_config('convay.gv06_actor','',true);
 select revision into v_revision from public.convay_entity_records
 where entity_key='bms.orgunits' and record_id=p_unit_id;
 select max(change_id) into v_audit_id from convay_private.entity_changes
 where entity_key='bms.orgunits' and record_id=p_unit_id
 and actor_id=v_actor and operation='UPDATE' and revision=v_revision;
 if v_audit_id is null then raise exception 'Immutable audit write missing' using errcode='23514'; end if;
 v_receipt:=pg_catalog.jsonb_build_object(
  'unit_id',p_unit_id,'previous_parent_id',v_old_parent,
  'new_parent_id',p_new_parent_id,'request_id',p_request_id,
  'revision',v_revision,'audit_event_id','entity-change-'||v_audit_id,
  'history_record_id',p_request_id);
 insert into convay_private.org_unit_move_receipts(
  actor_id,request_id,unit_id,expected_parent_id,new_parent_id,effective_date,reason,receipt)
 values(v_actor,p_request_id,p_unit_id,v_old_parent,p_new_parent_id,p_effective_date,btrim(p_reason),v_receipt);
 return v_receipt;
end $fn$;
revoke all on function public.convay_move_org_unit(text,text,text,date,text,text) from public,anon,authenticated;
grant execute on function public.convay_move_org_unit(text,text,text,date,text,text) to authenticated;
