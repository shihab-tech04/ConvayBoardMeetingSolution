-- Disposable MN-01 mutation harness. NOT a production migration.
-- This is a deliberately minimal relational replica to exercise the exact
-- new security trigger under PostgreSQL 17; it does not certify production RLS.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create schema convay_private;
create or replace function auth.uid() returns uuid language sql stable
as $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
create table auth.users (id uuid primary key);
insert into auth.users(id) values
 ('00000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002');
create table public.user_profiles(
 user_id uuid primary key references auth.users(id),
 display_name text not null,
 account_role text not null,
 account_status text not null,
 profile_data jsonb not null default '{}'::jsonb
);
insert into public.user_profiles(user_id,display_name,account_role,account_status)
 values
 ('00000000-0000-4000-8000-000000000001','Isolated Root','super_admin','active'),
 ('00000000-0000-4000-8000-000000000002','Isolated Denied','user','active');
alter table public.user_profiles enable row level security;
grant select on public.user_profiles to authenticated;
create policy profile_read on public.user_profiles
 for select to authenticated using (user_id = auth.uid());

create function convay_private.has_permission(permission_code text)
returns boolean language sql stable security definer set search_path=''
as $f$
 select coalesce((select p.account_role='super_admin'
 from public.user_profiles p where p.user_id=auth.uid() and p.account_status='active'),false)
$f$;
create function convay_private.is_meeting_leader(
 p_user_id uuid, p_payload jsonb, p_created_by uuid
) returns boolean language sql stable security definer set search_path=''
as $f$
 select coalesce(
 p_user_id is not null and (
   p_created_by=p_user_id or
   p_payload->>'chairperson_user_id'=p_user_id::text or
   p_payload->>'organizer_user_id'=p_user_id::text
 ),false)
$f$;
grant usage on schema convay_private to authenticated;
grant execute on all functions in schema convay_private to authenticated;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.convay_entity_records(
 entity_key text not null,
 record_id text not null,
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 created_by uuid default auth.uid() references auth.users(id),
 updated_by uuid default auth.uid() references auth.users(id),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 revision bigint not null default 1,
 primary key (entity_key,record_id),
 constraint record_id_matches_json check(payload->>'id'=record_id)
);
alter table public.convay_entity_records enable row level security;
grant select,insert,update,delete on public.convay_entity_records to authenticated;
create policy records_select on public.convay_entity_records
 for select to authenticated using (
  convay_private.has_permission(case entity_key
     when 'bms.meetings' then 'mtg_view' when 'bms.minutes' then 'arc_view' end)
 );
create policy records_insert on public.convay_entity_records
 for insert to authenticated with check(
 convay_private.has_permission(case entity_key
     when 'bms.meetings' then 'mtg_create' when 'bms.minutes' then 'min_create' end)
 );
create policy records_update on public.convay_entity_records
 for update to authenticated using(
 convay_private.has_permission(case entity_key
     when 'bms.meetings' then 'mtg_update' when 'bms.minutes' then 'min_create' end)
 ) with check(
 convay_private.has_permission(case entity_key
     when 'bms.meetings' then 'mtg_update' when 'bms.minutes' then 'min_create' end)
 );
create policy records_delete on public.convay_entity_records
 for delete to authenticated using(
 convay_private.has_permission(case entity_key
     when 'bms.meetings' then 'mtg_cancel' when 'bms.minutes' then 'min_approve' end)
 );
-- Match the current registry's append/update semantics to test direct RPC bypass.
create function public.convay_apply_entity_batch(p_ops jsonb)
returns integer language plpgsql set search_path='' as $f$
declare op jsonb; ent text; act text; recid text; data jsonb;
 n integer; processed integer := 0;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 if jsonb_typeof(p_ops) <> 'array' then raise exception 'Invalid batch'; end if;
 for op in select value from jsonb_array_elements(p_ops) loop
   ent := op->>'entity_key'; act := op->>'action';
   recid := coalesce(op->>'record_id',op->>'id',op->'payload'->>'id');
   data := op->'payload';
   if act='create' then
     if data->>'id' is distinct from recid then raise exception 'Invalid record'; end if;
     insert into public.convay_entity_records(entity_key,record_id,payload)
     values(ent,recid,data);
   elsif act='update' then
     update public.convay_entity_records
      set payload=payload || (data - 'id')
      where entity_key=ent and record_id=recid;
     get diagnostics n = row_count;
     if n <> 1 then raise exception 'Update unavailable'; end if;
   elsif act='delete' then
     delete from public.convay_entity_records where entity_key=ent and record_id=recid;
     get diagnostics n = row_count;
     if n <> 1 then raise exception 'Delete unavailable'; end if;
   else raise exception 'Unsupported action'; end if;
   processed := processed+1;
 end loop;
 return processed;
end $f$;
grant execute on function public.convay_apply_entity_batch(jsonb) to authenticated;
