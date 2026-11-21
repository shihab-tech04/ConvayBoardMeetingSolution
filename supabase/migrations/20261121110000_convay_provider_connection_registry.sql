-- NI-15: authoritative integration-connection observations for the admin KPI.
-- Provider IDs stay aligned with the visible Integrations catalogue. Rows are
-- written only by trusted server-side provider probes; browser clients are read-only.
create table public.convay_provider_connections (
  provider_id text primary key check (provider_id in (
    'smtp-email',
    'ms-teams',
    'ms-calendar',
    'google-workspace',
    'zoom',
    'active-directory',
    'document-storage',
    'sms-gateway',
    'audit-siem',
    'erp-connector'
  )),
  status text not null default 'Pending Setup'
    check (status in ('Connected', 'Disconnected', 'Error', 'Pending Setup')),
  verified_at timestamptz,
  constraint convay_provider_connection_verified_state_check
    check ((status = 'Connected') = (verified_at is not null))
);

comment on table public.convay_provider_connections is
  'Server-observed provider states used by the NI-15 administration KPI. Missing provider rows mean Pending Setup.';

alter table public.convay_provider_connections enable row level security;
alter table public.convay_provider_connections force row level security;

revoke all on table public.convay_provider_connections from public, anon, authenticated, service_role;
grant select on table public.convay_provider_connections to authenticated;
grant select, insert, update on table public.convay_provider_connections to service_role;

-- Integrations administration is platform-root-only. A permission grant alone
-- is not sufficient to expose global provider connection state.
create or replace function convay_private.is_active_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select exists (
    select 1
    from public.user_profiles as profile
    where profile.user_id = (select auth.uid())
      and profile.account_role = 'super_admin'
      and profile.account_status = 'active'
  );
$function$;

revoke all on function convay_private.is_active_platform_super_admin() from public, anon;
grant usage on schema convay_private to authenticated;
grant execute on function convay_private.is_active_platform_super_admin() to authenticated;

create policy convay_provider_connections_root_read
on public.convay_provider_connections
for select to authenticated
using ((select convay_private.is_active_platform_super_admin()));
