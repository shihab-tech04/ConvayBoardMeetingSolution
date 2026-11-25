
-- TEN-01/02/06/07/08 controlled admin API. Does NOT activate tenant data isolation.
-- Existing ownerless records stay untouched and inaccessible to new tenant onboarding.
alter table convay_private.tenant_memberships
  add column if not exists membership_role text not null default 'member';
alter table convay_private.tenant_memberships
  drop constraint if exists tenant_memberships_role_check;
alter table convay_private.tenant_memberships
  add constraint tenant_memberships_role_check
  check (membership_role in ('member','tenant_admin'));
alter table convay_private.tenants
  drop constraint if exists tenants_lifecycle_state_check;
alter table convay_private.tenants
  add constraint tenants_lifecycle_state_check
  check (lifecycle_state in ('provisioning','active','suspended','offboarded'));
create unique index if not exists convay_tenant_active_name_unique
 on convay_private.tenants (lower(btrim(display_name)))
 where lifecycle_state<>'offboarded';

create table if not exists convay_private.tenant_control_events (
 id bigint generated always as identity primary key,
 tenant_id uuid not null references convay_private.tenants(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 request_id uuid not null,
 action text not null,
 target_user_id uuid,
 details jsonb not null default '{}'::jsonb,
 occurred_at timestamptz not null default now()
);
alter table convay_private.tenant_control_events enable row level security;
revoke all on convay_private.tenant_control_events from public,anon,authenticated;
create unique index if not exists tenant_events_actor_request
 on convay_private.tenant_control_events(actor_id,request_id);

create table if not exists convay_private.tenant_control_receipts (
 actor_id uuid not null references auth.users(id) on delete restrict,
 request_id uuid not null,
 intent jsonb not null,
 receipt jsonb not null,
 created_at timestamptz not null default now(),
 primary key(actor_id,request_id)
);
alter table convay_private.tenant_control_receipts enable row level security;
revoke all on convay_private.tenant_control_receipts from public,anon,authenticated;

create or replace function convay_private.prevent_tenant_control_audit_mutation()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 raise exception 'Tenant control history is immutable' using errcode='42501';
end $fn$;
revoke all on function convay_private.prevent_tenant_control_audit_mutation()
 from public,anon,authenticated;
drop trigger if exists convay_tenant_control_history_immutable
 on convay_private.tenant_control_events;
create trigger convay_tenant_control_history_immutable
 before update or delete on convay_private.tenant_control_events
 for each row execute function convay_private.prevent_tenant_control_audit_mutation();

create or replace function convay_private.tenant_admin_authorized(p_tenant uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
 select coalesce((
 select case when u.account_role='super_admin' then true
 else exists (
   select 1 from convay_private.tenant_memberships m
   join convay_private.tenants t on t.id=m.tenant_id
   where m.user_id=u.user_id and m.tenant_id=p_tenant
     and m.membership_state='active' and m.revoked_at is null
     and m.membership_role='tenant_admin'
     and t.lifecycle_state in ('provisioning','active','suspended')
 ) end from public.user_profiles u where u.user_id=auth.uid()
  and u.account_status='active'
 ),false);
$fn$;
revoke all on function convay_private.tenant_admin_authorized(uuid)
 from public,anon,authenticated;

create or replace function public.convay_tenant_admin(
 p_action text,p_request_id uuid,p_tenant_id uuid default null,
 p_display_name text default null,p_member_user_id uuid default null,
 p_member_role text default null
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_is_root boolean:=false;
 v_tenant convay_private.tenants%rowtype;
 v_target_id uuid;
 v_receipt jsonb;
 v_intent jsonb;
 v_previous convay_private.tenant_control_receipts%rowtype;
 v_event_id bigint;
 v_tenant_id uuid;
 v_member_role text;
 v_count integer;
 v_owned integer;
 v_stored integer;
begin
 select u.account_role='super_admin' into v_is_root
  from public.user_profiles u
  where u.user_id=v_actor and u.account_status='active';
 if v_actor is null or not coalesce(v_is_root,false) and not exists (
  select 1 from public.user_profiles u
  where u.user_id=v_actor and u.account_status='active'
 ) then
  raise exception 'Active authenticated account required' using errcode='42501';
 end if;
 if p_action not in ('create','add_member','revoke_member','suspend','resume','offboard')
  or p_request_id is null then
  raise exception 'Invalid tenant action or idempotency request' using errcode='22023';
 end if;
 if p_action='create' and (not coalesce(v_is_root,false) or p_tenant_id is not null) then
  raise exception 'Only platform Super Admin can create a tenant' using errcode='42501';
 end if;
 if p_action<>'create' and (p_tenant_id is null
  or not convay_private.tenant_admin_authorized(p_tenant_id)) then
  raise exception 'Tenant administration not authorized' using errcode='42501';
 end if;
 v_member_role:=coalesce(p_member_role,'member');
 if p_action='add_member' and v_member_role not in ('member','tenant_admin') then
  raise exception 'Invalid tenant member role' using errcode='22023';
 end if;
 if p_action='add_member' and v_member_role='tenant_admin' and not coalesce(v_is_root,false) then
  raise exception 'Only platform Super Admin can grant tenant administration' using errcode='42501';
 end if;
 v_intent:=pg_catalog.jsonb_build_object('action',p_action,'tenant',p_tenant_id,
  'name',p_display_name,'user',p_member_user_id,'role',p_member_role);
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtext('convay-tenant-control:'||coalesce(p_tenant_id::text,'root')));
 select * into v_previous from convay_private.tenant_control_receipts
  where actor_id=v_actor and request_id=p_request_id;
 if found then
  if v_previous.intent is distinct from v_intent then
   raise exception 'Tenant request ID reused with other input' using errcode='23505';
  end if;
  return v_previous.receipt;
 end if;
 if p_action='create' then
  if p_display_name is null or length(btrim(p_display_name)) not between 3 and 160 then
   raise exception 'Valid organization name required' using errcode='22023';
  end if;
  insert into convay_private.tenants(display_name,lifecycle_state)
   values(btrim(p_display_name),'provisioning') returning * into v_tenant;
  insert into convay_private.tenant_memberships(tenant_id,user_id,membership_role)
   values(v_tenant.id,v_actor,'tenant_admin');
 else
  select * into v_tenant from convay_private.tenants
   where id=p_tenant_id for update;
  if not found then raise exception 'Tenant not found' using errcode='P0002'; end if;
  if v_tenant.lifecycle_state='offboarded' then
   raise exception 'Offboarded tenant cannot be modified' using errcode='42501';
  end if;
  if p_action in ('add_member','revoke_member') then
   if p_member_user_id is null then raise exception 'Member ID required' using errcode='22023'; end if;
   if p_action='add_member' then
    if not exists(
     select 1 from public.user_profiles u where u.user_id=p_member_user_id
      and u.account_status='active' and (
       u.account_role='super_admin' or exists (
        select 1 from public.convay_user_roles ur join public.convay_roles r
          on r.id=ur.role_id where ur.user_id=u.user_id and r.status='Active'
       )
      )
    ) then
     raise exception 'Target account must be active with a verified role' using errcode='42501';
    end if;
    insert into convay_private.tenant_memberships(
      tenant_id,user_id,membership_role,membership_state,revoked_at)
    values(v_tenant.id,p_member_user_id,v_member_role,'active',null)
    on conflict(tenant_id,user_id) do update set
      membership_state='active',membership_role=excluded.membership_role,
      revoked_at=null,revision=convay_private.tenant_memberships.revision+1,
      changed_at=now();
   else
    if not exists(select 1 from convay_private.tenant_memberships m
      where m.tenant_id=v_tenant.id and m.user_id=p_member_user_id
        and m.membership_state='active') then
     raise exception 'Active tenant membership not found' using errcode='P0002';
    end if;
    if (select m.membership_role from convay_private.tenant_memberships m
        where m.tenant_id=v_tenant.id and m.user_id=p_member_user_id)='tenant_admin'
       and (select count(*) from convay_private.tenant_memberships m
        where m.tenant_id=v_tenant.id and m.membership_state='active'
          and m.membership_role='tenant_admin')<=1 then
      raise exception 'Cannot revoke last tenant administrator' using errcode='23514';
    end if;
    update convay_private.tenant_memberships m set
      membership_state='revoked',revoked_at=now(),changed_at=now(),
      revision=revision+1
    where m.tenant_id=v_tenant.id and m.user_id=p_member_user_id;
   end if;
  elsif p_action='suspend' then
   if not coalesce(v_is_root,false) then
    raise exception 'Platform Super Admin required to suspend organization' using errcode='42501';
   end if;
   update convay_private.tenants set lifecycle_state='suspended',updated_at=now()
    where id=v_tenant.id and lifecycle_state in ('provisioning','active');
   if not found then raise exception 'Tenant cannot be suspended from this state' using errcode='23514';end if;
  elsif p_action='resume' then
   if not coalesce(v_is_root,false) then
    raise exception 'Platform Super Admin required to resume organization' using errcode='42501';
   end if;
   update convay_private.tenants set lifecycle_state='provisioning',updated_at=now()
    where id=v_tenant.id and lifecycle_state='suspended';
   if not found then raise exception 'Tenant is not suspended' using errcode='23514';end if;
  elsif p_action='offboard' then
   if not coalesce(v_is_root,false) then
     raise exception 'Only platform Super Admin can offboard tenants' using errcode='42501';
   end if;
   select count(*) into v_owned from public.convay_entity_records r where r.tenant_id=v_tenant.id;
   select count(*) into v_stored from storage.objects o
    where o.bucket_id='convay-documents' and o.name like v_tenant.id::text||'/%';
   if v_owned>0 or v_stored>0 then
    raise exception 'Export/recovery and tenant-owned records must be reconciled before offboarding' using errcode='23503';
   end if;
   update convay_private.tenant_memberships m set
    membership_state='revoked',revoked_at=now(),changed_at=now(),revision=revision+1
    where m.tenant_id=v_tenant.id and m.membership_state<>'revoked';
   update convay_private.tenants set lifecycle_state='offboarded',updated_at=now()
    where id=v_tenant.id;
  end if;
 end if;
 v_tenant_id:=v_tenant.id;
 insert into convay_private.tenant_control_events(
  tenant_id,actor_id,request_id,action,target_user_id,details)
 values(v_tenant_id,v_actor,p_request_id,p_action,p_member_user_id,
   pg_catalog.jsonb_build_object('name',p_display_name,'member_role',p_member_role))
 returning id into v_event_id;
 select lifecycle_state into v_tenant.lifecycle_state from convay_private.tenants
 where id=v_tenant_id;
 v_receipt:=pg_catalog.jsonb_build_object('tenant_id',v_tenant_id,
    'lifecycle_state',v_tenant.lifecycle_state,'action',p_action,
    'request_id',p_request_id,'audit_event_id',v_event_id,
    'member_user_id',p_member_user_id,'tenant_active',false);
 insert into convay_private.tenant_control_receipts(actor_id,request_id,intent,receipt)
 values(v_actor,p_request_id,v_intent,v_receipt);
 return v_receipt;
end $fn$;
revoke all on function public.convay_tenant_admin(text,uuid,uuid,text,uuid,text)
 from public,anon,authenticated;
grant execute on function public.convay_tenant_admin(text,uuid,uuid,text,uuid,text)
 to authenticated;

create or replace function public.convay_tenant_readiness()
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare v_actor uuid:=auth.uid();v_legacy int;v_tenants int;v_sessions int;
begin
 if not exists(select 1 from public.user_profiles u
   where u.user_id=v_actor and u.account_role='super_admin'
     and u.account_status='active') then
  raise exception 'Platform Super Admin required' using errcode='42501';
 end if;
 select count(*) into v_legacy from public.convay_entity_records where tenant_id is null;
 select count(*) into v_tenants from convay_private.tenants where lifecycle_state<>'offboarded';
 select count(*) into v_sessions from public.convay_entity_records
   where entity_key='bms.liveSessions';
 return pg_catalog.jsonb_build_object('unmapped_legacy_entities',v_legacy,
  'managed_tenant_count',v_tenants,'live_session_count',v_sessions,
  'sql_storage_media_isolation_certified',false,
  'ready_to_activate',false,
  'required_next_step','source-mapped tenant ownership and per-tenant SQL/Storage/LiveKit negative tests');
end $fn$;
revoke all on function public.convay_tenant_readiness()
 from public,anon,authenticated;
grant execute on function public.convay_tenant_readiness()
 to authenticated;

create or replace function public.convay_tenant_audit(
 p_tenant_id uuid,p_limit int default 100
) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare v_data jsonb;
begin
 if p_tenant_id is null or not convay_private.tenant_admin_authorized(p_tenant_id) then
  raise exception 'Tenant audit permission denied' using errcode='42501';
 end if;
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'id',id,'action',action,'actor_id',actor_id,'target_user_id',target_user_id,
   'request_id',request_id,'occurred_at',occurred_at,'details',details)
   order by occurred_at desc), '[]'::jsonb)
 into v_data
 from (select * from convay_private.tenant_control_events
  where tenant_id=p_tenant_id order by occurred_at desc limit least(greatest(coalesce(p_limit,100),1),500)) x;
 return v_data;
end $fn$;
revoke all on function public.convay_tenant_audit(uuid,int)
 from public,anon,authenticated;
grant execute on function public.convay_tenant_audit(uuid,int)
 to authenticated;
