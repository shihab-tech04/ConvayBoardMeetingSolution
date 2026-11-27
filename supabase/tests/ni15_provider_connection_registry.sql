-- Rollback-only NI-15 API/RLS fixture. Uses existing active principals and
-- never leaves provider state or user data in the database.
begin;

do $preflight$
declare
  v_admin uuid;
  v_member uuid;
begin
  select user_id into v_admin
  from public.user_profiles
  where account_role = 'super_admin' and account_status = 'active'
  order by user_id
  limit 1;

  select user_id into v_member
  from public.user_profiles
  where account_role <> 'super_admin' and account_status = 'active'
  order by user_id
  limit 1;

  if v_admin is null or v_member is null then
    raise exception 'Active Super Admin and ordinary-user principals are required';
  end if;

  perform set_config('convay.test.admin_id', v_admin::text, true);
  perform set_config('convay.test.member_id', v_member::text, true);
end;
$preflight$;

set local role service_role;
insert into public.convay_provider_connections(provider_id, status, verified_at)
values ('smtp-email', 'Connected', statement_timestamp())
on conflict (provider_id) do update
set status = excluded.status,
    verified_at = excluded.verified_at;
do $invalid_provider_writes$
declare
  v_rejected boolean;
begin
  v_rejected := false;
  begin
    insert into public.convay_provider_connections(provider_id, status)
    values ('unknown-provider', 'Pending Setup');
  exception when check_violation then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'Unknown provider IDs were accepted';
  end if;

  v_rejected := false;
  begin
    insert into public.convay_provider_connections(provider_id, status)
    values ('ms-teams', 'Connected');
  exception when check_violation then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'Connected state without server verification was accepted';
  end if;

  v_rejected := false;
  begin
    insert into public.convay_provider_connections(provider_id, status)
    values ('ms-teams', 'Online');
  exception when check_violation then
    v_rejected := true;
  end;
  if not v_rejected then
    raise exception 'Unknown provider status was accepted';
  end if;
end;
$invalid_provider_writes$;
reset role;

select set_config('request.jwt.claim.sub', current_setting('convay.test.admin_id'), true);
set local role authenticated;
do $root_read$
declare
  v_count integer;
  v_status text;
begin
  select count(*), min(status)
  into v_count, v_status
  from public.convay_provider_connections
  where provider_id = 'smtp-email';

  if v_count <> 1 or v_status <> 'Connected' then
    raise exception 'Active Super Admin could not read the server-confirmed provider status';
  end if;
end;
$root_read$;
reset role;

select set_config('request.jwt.claim.sub', current_setting('convay.test.member_id'), true);
set local role authenticated;
do $member_denial$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.convay_provider_connections
  where provider_id = 'smtp-email';

  if v_count <> 0 then
    raise exception 'Ordinary active user read global provider status';
  end if;

  if has_table_privilege(current_user, 'public.convay_provider_connections', 'INSERT')
     or has_table_privilege(current_user, 'public.convay_provider_connections', 'UPDATE')
     or has_table_privilege(current_user, 'public.convay_provider_connections', 'DELETE') then
    raise exception 'Authenticated users received provider-state write privileges';
  end if;
end;
$member_denial$;
reset role;

set local role anon;
do $anonymous_denial$
declare
  v_denied boolean := false;
begin
  begin
    perform 1 from public.convay_provider_connections limit 1;
  exception when insufficient_privilege then
    v_denied := true;
  end;

  if not v_denied then
    raise exception 'Anonymous role read provider connection status';
  end if;
end;
$anonymous_denial$;
reset role;

rollback;
