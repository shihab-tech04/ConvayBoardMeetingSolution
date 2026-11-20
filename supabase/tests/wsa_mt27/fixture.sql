-- Synthetic PostgreSQL fixture only: NOT a trusted JWT or native DB restore.
-- Bootstrap + WS-F foundation precede this file in a disposable database.
create function auth.uid() returns uuid language sql stable set search_path=''
as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
create function auth.jwt() returns jsonb language sql stable set search_path=''
as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$;
grant usage on schema auth,convay_private to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function auth.jwt() to authenticated;
create table auth.sessions(id uuid primary key,user_id uuid not null references auth.users(id),not_after timestamptz);
create table public.user_profiles(user_id uuid primary key references auth.users(id),account_status text not null);
insert into auth.users(id) values('44444444-4444-4444-8444-444444444444');
insert into public.user_profiles values
 ('33333333-3333-4333-8333-333333333333','active'),
 ('44444444-4444-4444-8444-444444444444','active');
insert into auth.sessions values
 ('77777777-7777-4777-8777-777777777777','33333333-3333-4333-8333-333333333333',now()+interval '1 day'),
 ('88888888-8888-4888-8888-888888888888','44444444-4444-4444-8444-444444444444',now()+interval '1 day');
insert into convay_private.tenants(id,display_name,lifecycle_state) values
 ('55555555-5555-4555-8555-555555555555','Fixture A','active'),
 ('66666666-6666-4666-8666-666666666666','Fixture B','active');
insert into convay_private.tenant_memberships(tenant_id,user_id) values
 ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333'),
 ('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444');
create function convay_private.signed_active_tenant() returns uuid
language sql stable security invoker set search_path=''
as $$
 select case when auth.jwt() #>> '{app_metadata,active_tenant_id}'
   ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 then (auth.jwt() #>> '{app_metadata,active_tenant_id}')::uuid else null end
$$;
create function convay_private.tenant_actor_authorized(p_tenant uuid)
returns boolean language sql stable security definer set search_path=''
as $$
 select exists (
  select 1 from convay_private.tenant_memberships m
   join convay_private.tenants t on t.id=m.tenant_id
   join public.user_profiles p on p.user_id=m.user_id
   join auth.sessions s on s.user_id=m.user_id
  where m.tenant_id=p_tenant and m.user_id=auth.uid()
   and p_tenant=convay_private.signed_active_tenant()
   and m.membership_state='active' and m.revoked_at is null
   and m.revision>0 and t.lifecycle_state='active'
   and p.account_status='active'
   and s.id=(auth.jwt()->>'session_id')::uuid
   and (s.not_after is null or s.not_after>now())
 )
$$;
create table convay_private.fixture_grants(actor_id uuid not null, entity_key text not null,action text not null,
 primary key(actor_id,entity_key,action));
insert into convay_private.fixture_grants
select actor,'bms.meetings',action
 from (values('33333333-3333-4333-8333-333333333333'::uuid),
             ('44444444-4444-4444-8444-444444444444'::uuid)) a(actor)
 cross join (values('read'),('delete')) ops(action);
create function convay_private.registry_authorized(p_key text,p_action text)
returns boolean language sql stable security definer set search_path=''
as $$ select exists(select 1 from convay_private.fixture_grants
 where actor_id=auth.uid() and entity_key=p_key and action=p_action) $$;
grant execute on function convay_private.registry_authorized(text,text) to authenticated;
grant execute on function convay_private.signed_active_tenant() to authenticated;
grant execute on function convay_private.tenant_actor_authorized(uuid) to authenticated;
create policy fixture_read on public.convay_entity_records for select to authenticated
 using(convay_private.registry_authorized(entity_key,'read') or entity_key='bms.meetingParticipantLinks');
create policy fixture_delete on public.convay_entity_records for delete to authenticated
 using(convay_private.registry_authorized(entity_key,'delete'));
-- The following restrictive policy represents WS-F tenant gating.
create policy fixture_tenant_read on public.convay_entity_records as restrictive for select to authenticated
 using(convay_private.tenant_actor_authorized(tenant_id));
create policy fixture_tenant_delete on public.convay_entity_records as restrictive for delete to authenticated
 using(convay_private.tenant_actor_authorized(tenant_id));

-- A has several clean/held/scheduled/linked records; B has a distinct draft.
update public.convay_entity_records set tenant_id='55555555-5555-4555-8555-555555555555'
 where record_id='fixture-meeting-1';
insert into public.convay_entity_records(entity_key,record_id,payload,created_by,tenant_id,revision)
values
 ('bms.meetings','scheduled-a','{"id":"scheduled-a","approval_status":"Scheduled"}',
  '33333333-3333-4333-8333-333333333333','55555555-5555-4555-8555-555555555555',1),
 ('bms.meetings','held-a','{"id":"held-a","approval_status":"Draft","legal_hold":"true"}',
  '33333333-3333-4333-8333-333333333333','55555555-5555-4555-8555-555555555555',1),
 ('bms.meetings','linked-a','{"id":"linked-a","approval_status":"Draft"}',
  '33333333-3333-4333-8333-333333333333','55555555-5555-4555-8555-555555555555',1),
 ('bms.meetings','draft-a-child','{"id":"draft-a-child","approval_status":"Draft"}',
  '33333333-3333-4333-8333-333333333333','55555555-5555-4555-8555-555555555555',1),
 ('bms.meetings','draft-b','{"id":"draft-b","approval_status":"Draft"}',
  '44444444-4444-4444-8444-444444444444','66666666-6666-4666-8666-666666666666',1),
 ('bms.attendance','attendance-a','{"id":"attendance-a","meeting_id":"linked-a"}',
  '33333333-3333-4333-8333-333333333333','55555555-5555-4555-8555-555555555555',1),
 ('bms.meetingParticipantLinks','child-a','{"id":"child-a","meeting_id":"draft-a-child"}',
  '33333333-3333-4333-8333-333333333333','55555555-5555-4555-8555-555555555555',1);
-- Generic invoker batch: no special delete guard, so policy must deny it.
create function public.convay_apply_entity_batch(p_ops jsonb) returns integer
language plpgsql security invoker set search_path=''
as $$
declare op jsonb; affected integer; processed integer:=0;
begin
 for op in select value from jsonb_array_elements(p_ops) loop
   if op->>'action' <> 'delete' then raise exception 'fixture supports delete only'; end if;
   delete from public.convay_entity_records
    where entity_key=op->>'entity_key' and record_id=op->>'record_id';
   get diagnostics affected=row_count;
   if affected<>1 then raise exception 'Record unavailable'; end if;
   processed:=processed+1;
 end loop;
 return processed;
end $$;
grant execute on function public.convay_apply_entity_batch(jsonb) to authenticated;
