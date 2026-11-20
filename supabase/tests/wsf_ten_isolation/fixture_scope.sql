-- WS-F TEN-03 synthetic fixture extension, executed INSIDE a rollback-only
-- transaction on disposable postgres:17-alpine. Never used in production.
-- PostgREST populates trusted JWT settings from the signed user token.
-- Here custom settings are test-controlled and DO NOT prove signature safety.
create or replace function auth.uid()
returns uuid language sql stable set search_path=''
as $$
  select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
create or replace function auth.jwt()
returns jsonb language sql stable set search_path=''
as $$
  select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
create table auth.sessions(
  id uuid primary key,
  user_id uuid not null references auth.users(id),
  not_after timestamptz
);
grant usage on schema auth,convay_private to authenticated;
grant execute on function auth.uid() to authenticated;
grant execute on function auth.jwt() to authenticated;

-- Fixture-only authorization catalog mirrors the permission AND gate in
-- real convay_private.registry_authorized without claiming a database clone.
create table convay_private.fixture_grants (
  actor_id uuid not null references auth.users(id),
  entity_key text not null,
  action text not null check(action in ('read','create','update','delete')),
  primary key(actor_id,entity_key,action)
);
create or replace function convay_private.registry_authorized(p_key text,p_action text)
returns boolean language sql stable security definer
set search_path=''
as $$
  select exists (
    select 1 from convay_private.fixture_grants g
    where g.actor_id=auth.uid() and g.entity_key=p_key
      and g.action=p_action
  )
$$;
revoke all on function convay_private.registry_authorized(text,text) from public,anon;
grant execute on function convay_private.registry_authorized(text,text) to authenticated;

create policy fixture_legacy_read on public.convay_entity_records for select to authenticated
  using (convay_private.registry_authorized(entity_key,'read'));
create policy fixture_legacy_create on public.convay_entity_records for insert to authenticated
  with check (convay_private.registry_authorized(entity_key,'create'));
create policy fixture_legacy_update on public.convay_entity_records for update to authenticated
  using (convay_private.registry_authorized(entity_key,'update'))
  with check (convay_private.registry_authorized(entity_key,'update'));
create policy fixture_legacy_delete on public.convay_entity_records for delete to authenticated
  using (convay_private.registry_authorized(entity_key,'delete'));

insert into auth.users(id) values
 ('44444444-4444-4444-8444-444444444444'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee');
create table public.user_profiles (
  user_id uuid primary key references auth.users(id),
  account_role text not null,
  account_status text not null
);
insert into public.user_profiles(user_id,account_role,account_status) values
 ('33333333-3333-4333-8333-333333333333','user','active'),
 ('44444444-4444-4444-8444-444444444444','user','active'),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee','super_admin','active');

insert into auth.sessions(id,user_id,not_after) values
 ('77777777-7777-4777-8777-777777777777',
   '33333333-3333-4333-8333-333333333333',now()+interval '1 day'),
 ('88888888-8888-4888-8888-888888888888',
   '44444444-4444-4444-8444-444444444444',now()+interval '1 day'),
 ('dddddddd-dddd-4ddd-8ddd-dddddddddddd',
   'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',now()+interval '1 day');

insert into convay_private.tenants(id,display_name,lifecycle_state) values
 ('55555555-5555-4555-8555-555555555555','Fixture tenant A','active'),
 ('66666666-6666-4666-8666-666666666666','Fixture tenant B','active');

insert into convay_private.tenant_memberships(tenant_id,user_id) values
 ('55555555-5555-4555-8555-555555555555','33333333-3333-4333-8333-333333333333'),
 ('66666666-6666-4666-8666-666666666666','44444444-4444-4444-8444-444444444444');

-- Identical module permissions for A and B, so every foreign denial in
-- the test must come from active tenant scope, NOT a missing module grant.
insert into convay_private.fixture_grants(actor_id,entity_key,action)
select actor, 'bms.meetings', op
from (values
 ('33333333-3333-4333-8333-333333333333'::uuid),
 ('44444444-4444-4444-8444-444444444444'::uuid),
 ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid)
) actors(actor)
cross join (values('read'),('create'),('update'),('delete')) actions(op);

-- The existing baseline row is bound to the known test tenant A;
-- this does NOT infer a tenant for real production records.
update public.convay_entity_records
set tenant_id='55555555-5555-4555-8555-555555555555'
where record_id='fixture-meeting-1';
insert into public.convay_entity_records(entity_key,record_id,payload,tenant_id)
values('bms.meetings','fixture-b-record',
  '{"id":"fixture-b-record","status":"Draft"}'::jsonb,
  '66666666-6666-4666-8666-666666666666'::uuid);

-- Unscoped invoker batch pattern mirrors the hosted RPC's WHERE clause.
-- RLS must prevent cross-tenant UPDATE/DELETE even though SQL omits tenant.
create or replace function public.convay_apply_entity_batch(p_ops jsonb)
returns integer language plpgsql set search_path='' as $$
declare
  op jsonb;
  action text;
  rid text;
  row_count integer;
  processed integer := 0;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  if jsonb_typeof(p_ops) is distinct from 'array'
    or jsonb_array_length(p_ops) not between 1 and 500
  then raise exception 'Invalid batch size'; end if;
  for op in select value from jsonb_array_elements(p_ops) loop
    action := op->>'action'; rid := op->>'record_id';
    if op->>'entity_key' <> 'bms.meetings' then raise exception 'Wrong fixture entity'; end if;
    if action='update' then
      update public.convay_entity_records
        set payload = payload || (op->'payload' - 'id')
        where entity_key='bms.meetings' and record_id=rid;
      get diagnostics row_count = row_count;
      if row_count<>1 then raise exception 'Record unavailable'; end if;
    elsif action='delete' then
      delete from public.convay_entity_records
        where entity_key='bms.meetings' and record_id=rid;
      get diagnostics row_count = row_count;
      if row_count<>1 then raise exception 'Record unavailable'; end if;
    elsif action='create' then
      insert into public.convay_entity_records(entity_key,record_id,payload)
      values('bms.meetings',rid,op->'payload');
    else raise exception 'Unsupported operation'; end if;
    processed := processed+1;
  end loop;
  return processed;
end;
$$;
grant execute on function public.convay_apply_entity_batch(jsonb) to authenticated;
