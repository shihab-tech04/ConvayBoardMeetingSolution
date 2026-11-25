
-- GV-08: authoritative head/deputy assignment or termination, no client audit.
-- Tenant boundaries remain staged, never silently claimed by this operation.
create table if not exists convay_private.org_unit_head_receipts (
 actor_id uuid not null references auth.users(id),
 request_id text not null check(length(request_id) between 8 and 160),
 intent jsonb not null,
 assignment_before jsonb,
 unit_before jsonb,
 receipt jsonb not null,
 created_at timestamptz not null default now(),
 primary key(actor_id,request_id)
);
alter table convay_private.org_unit_head_receipts enable row level security;
revoke all on table convay_private.org_unit_head_receipts from public,anon,authenticated;

create or replace function convay_private.guard_unit_head_rpc_only()
returns trigger language plpgsql security invoker set search_path='' as $fn$
declare v_key text := case when tg_op='DELETE' then old.entity_key else new.entity_key end;
begin
 if (v_key='bms.unitheads' or (tg_op='UPDATE' and v_key='bms.orgunits' and (
    new.payload->'head_user_id' is distinct from old.payload->'head_user_id'
    or new.payload->'deputy_user_id' is distinct from old.payload->'deputy_user_id'
    or new.payload->'head' is distinct from old.payload->'head'
  )))
  and (auth.uid() is null or current_setting('convay.gv08_actor',true)
    is distinct from auth.uid()::text or current_user<>'postgres') then
  raise exception 'Unit leadership writes require authorized server transaction'
   using errcode='42501';
 end if;
 return case when tg_op='DELETE' then old else new end;
end $fn$;
revoke all on function convay_private.guard_unit_head_rpc_only() from public,anon,authenticated;
drop trigger if exists convay_a0_unit_head_rpc_only on public.convay_entity_records;
create trigger convay_a0_unit_head_rpc_only
before insert or update or delete on public.convay_entity_records for each row
execute function convay_private.guard_unit_head_rpc_only();

create or replace function public.convay_manage_unit_head(
 p_action text,
 p_unit_id text,
 p_request_id text,
 p_user_id text default null,
 p_assignment_type text default null,
 p_start_date date default null,
 p_end_date date default null,
 p_reason text default null,
 p_record_id text default null
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid := auth.uid();
 v_unit public.convay_entity_records%rowtype;
 v_assignment public.convay_entity_records%rowtype;
 v_target public.user_profiles%rowtype;
 v_id text;
 v_active boolean;
 v_assignment_type text;
 v_user text;
 v_role text;
 v_unit_revision bigint;
 v_assignment_revision bigint;
 v_slot text;
 v_current text;
 v_head text;
 v_deputy text;
 v_status text;
 v_label text;
 v_audit_id bigint;
 v_receipt jsonb;
 v_intent jsonb;
 v_old_assignment jsonb;
 v_request convay_private.org_unit_head_receipts%rowtype;
begin
 if v_actor is null or not exists (
   select 1 from public.user_profiles u where u.user_id=v_actor and u.account_status='active'
 ) or not convay_private.has_permission('gov_org_manage') then
  raise exception 'Authorized governance administrator required' using errcode='42501';
 end if;
 if p_action not in ('assign','end') or p_unit_id is null
 or length(p_unit_id) not between 1 and 180 or p_request_id is null
 or length(p_request_id) not between 8 and 160 then
  raise exception 'Invalid unit-head operation' using errcode='22023';
 end if;
 v_intent:=pg_catalog.jsonb_build_object('operation',p_action,'unit_id',p_unit_id,
  'user_id',p_user_id,'assignment_type',p_assignment_type,'start_date',p_start_date,
  'end_date',p_end_date,'reason',p_reason,'record_id',p_record_id);
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('convay-gv08:'||p_unit_id));
 select * into v_request from convay_private.org_unit_head_receipts
  where actor_id=v_actor and request_id=p_request_id;
 if found then
  if v_request.intent is distinct from v_intent then
   raise exception 'Unit-head idempotency key reused with different request' using errcode='23505';
  end if;
  return v_request.receipt;
 end if;
 select * into v_unit from public.convay_entity_records
 where entity_key='bms.orgunits' and record_id=p_unit_id for update;
 if not found or v_unit.payload->>'id' is distinct from p_unit_id then
   raise exception 'Organization unit not found' using errcode='P0002';
 end if;
 if v_unit.tenant_id is not null then
   raise exception 'Tenant-owned leadership mutation not activated' using errcode='42501';
 end if;
 if lower(coalesce(v_unit.payload->>'status','')) not in ('active','draft') then
   raise exception 'Inactive organization unit cannot be assigned' using errcode='23514';
 end if;
 v_head:=nullif(v_unit.payload->>'head_user_id','');
 v_deputy:=nullif(v_unit.payload->>'deputy_user_id','');
 if p_action='assign' then
  if p_user_id is null or p_user_id !~* '^[0-9a-f-]{36}$'
   or p_assignment_type not in ('Permanent Head','Acting Head','Deputy')
   or p_start_date is null or p_start_date>current_date
   or (p_end_date is not null and p_end_date<p_start_date)
   or p_reason is null or length(btrim(p_reason))<3 then
   raise exception 'Invalid immediate leadership assignment' using errcode='22023';
  end if;
  select * into v_target from public.user_profiles
    where user_id=p_user_id::uuid and account_status='active';
  if not found then raise exception 'Assigned member must be active' using errcode='42501'; end if;
  -- Actual account membership is server-owned, not supplied by the browser.
  if v_target.account_role<>'super_admin' and not exists (
   select 1 from public.convay_user_roles ur
   join public.convay_roles r on r.id=ur.role_id
   where ur.user_id=v_target.user_id and r.status='Active'
  ) then
   raise exception 'Assigned member must hold an active organization role' using errcode='42501';
  end if;
  v_slot:=case when p_assignment_type='Deputy' then 'deputy' else 'head' end;
  if exists (
    select 1 from public.convay_entity_records r
    where r.entity_key='bms.unitheads' and r.payload->>'unit_id'=p_unit_id
      and lower(coalesce(r.payload->>'status',''))='active'
      and (case when r.payload->>'assignment_type'='Deputy' then 'deputy' else 'head' end)=v_slot
  ) then
   raise exception 'A current head or deputy must be ended before replacement' using errcode='23505';
  end if;
  if (v_slot='head' and v_head is not null)
    or (v_slot='deputy' and v_deputy is not null) then
   raise exception 'Unit head projection already occupied; reconcile before reassignment' using errcode='23514';
  end if;
  v_id:='UHA-'||gen_random_uuid()::text;
  v_user:=p_user_id;
  v_assignment_type:=p_assignment_type;
  v_status:='active';
  v_label:=v_target.display_name;
  perform pg_catalog.set_config('convay.gv08_actor',v_actor::text,true);
  insert into public.convay_entity_records(entity_key,record_id,payload)
  values ('bms.unitheads',v_id,
     pg_catalog.jsonb_build_object(
      'id',v_id,'assignment_id',v_id,'unit_id',p_unit_id,'user_id',v_user,
      'assignment_type',v_assignment_type,'start_date',p_start_date,
      'end_date',p_end_date,'reason',btrim(p_reason),'status','active',
      'assigned_by',v_actor::text,'created_at',pg_catalog.now()::text));
  update public.convay_entity_records r set payload=r.payload ||
   case when v_slot='head' then pg_catalog.jsonb_build_object(
     'head_user_id',v_user,'head',v_label)
    else pg_catalog.jsonb_build_object('deputy_user_id',v_user) end
  where r.entity_key='bms.orgunits' and r.record_id=p_unit_id;
 else
  if p_record_id is null or length(p_record_id) not between 1 and 180 then
   raise exception 'Assignment to end is required' using errcode='22023';
  end if;
  select * into v_assignment from public.convay_entity_records
   where entity_key='bms.unitheads' and record_id=p_record_id for update;
  if not found or v_assignment.payload->>'id' is distinct from p_record_id
   or v_assignment.payload->>'unit_id' is distinct from p_unit_id
   or v_assignment.tenant_id is not null
   or lower(coalesce(v_assignment.payload->>'status',''))<>'active' then
     raise exception 'An active matching assignment is required to end' using errcode='23514';
  end if;
  v_id:=p_record_id;
  v_old_assignment:=v_assignment.payload;
  v_user:=v_assignment.payload->>'user_id';
  v_assignment_type:=v_assignment.payload->>'assignment_type';
  v_slot:=case when v_assignment_type='Deputy' then 'deputy' else 'head' end;
  v_current:=case when v_slot='deputy' then v_deputy else v_head end;
  if v_current is distinct from v_user then
   raise exception 'Projected leadership and assignment are inconsistent' using errcode='23514';
  end if;
  perform pg_catalog.set_config('convay.gv08_actor',v_actor::text,true);
  update public.convay_entity_records r set payload=r.payload ||
     pg_catalog.jsonb_build_object('status','ended',
       'end_date',current_date,'ended_at',pg_catalog.now()::text,
       'ended_by',v_actor::text)
  where r.entity_key='bms.unitheads' and r.record_id=v_id;
  update public.convay_entity_records r set payload=r.payload ||
   case when v_slot='head' then pg_catalog.jsonb_build_object(
     'head_user_id',null,'head','')
    else pg_catalog.jsonb_build_object('deputy_user_id',null) end
  where r.entity_key='bms.orgunits' and r.record_id=p_unit_id;
  v_status:='ended';
 end if;
 perform pg_catalog.set_config('convay.gv08_actor','',true);
 select revision into v_assignment_revision from public.convay_entity_records
  where entity_key='bms.unitheads' and record_id=v_id;
 select revision,payload->>'head_user_id',payload->>'deputy_user_id'
 into v_unit_revision,v_head,v_deputy from public.convay_entity_records
  where entity_key='bms.orgunits' and record_id=p_unit_id;
 select max(change_id) into v_audit_id from convay_private.entity_changes
  where entity_key='bms.unitheads' and record_id=v_id
   and actor_id=v_actor and revision=v_assignment_revision;
 if v_audit_id is null then
   raise exception 'Immutable leadership audit record is missing' using errcode='23514';
 end if;
 v_receipt:=pg_catalog.jsonb_build_object(
  'operation',p_action,'unit_id',p_unit_id,'record_id',v_id,
  'assignment_id',v_id,'user_id',v_user,'assignment_type',v_assignment_type,
  'status',v_status,'request_id',p_request_id,
  'revision',v_assignment_revision,'unit_revision',v_unit_revision,
  'audit_event_id','entity-change-'||v_audit_id,
  'history_record_id',p_request_id,
  'membership_verified',true,'head_user_id',v_head,'deputy_user_id',v_deputy);
 insert into convay_private.org_unit_head_receipts(
   actor_id,request_id,intent,assignment_before,unit_before,receipt
 ) values(v_actor,p_request_id,v_intent,v_old_assignment,v_unit.payload,v_receipt);
 return v_receipt;
end $fn$;
revoke all on function public.convay_manage_unit_head(
 text,text,text,text,text,date,date,text,text
) from public,anon,authenticated;
grant execute on function public.convay_manage_unit_head(
 text,text,text,text,text,date,date,text,text
) to authenticated;
