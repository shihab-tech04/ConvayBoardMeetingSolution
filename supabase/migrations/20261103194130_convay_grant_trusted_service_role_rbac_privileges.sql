-- Incident fix: authenticated login succeeded, but Edge Functions returned
-- "Account is not active" because service_role had no table grants.
-- BYPASSRLS does not imply SELECT/INSERT/UPDATE/DELETE privileges.
-- Do not grant privileged mutations to anon or authenticated.
grant select, insert, update, delete on
  public.user_profiles,
  public.user_admin_audit,
  public.convay_roles,
  public.convay_permissions,
  public.convay_role_permissions,
  public.convay_user_roles
to service_role;

grant usage, select on sequence public.user_admin_audit_event_id_seq
to service_role;
