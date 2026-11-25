-- WS-F TEN-03: executable staged authorization contract for a DISPOSABLE
-- PostgreSQL 17 fixture. NOT a production migration; activation is UNSAFE
-- until WS0 completes source-mapped legacy backfill, tenant-scoped PK/unique
-- keys, audit provenance, batch/Storage/Edge/LiveKit and native restore.
--
-- Existing Convay access policies are retained. RESTRICTIVE policies compose
-- with (do not replace) existing per-entity permission/document rules.
-- app_metadata is a *server-controlled signed* Auth JWT claim; never trust
-- user_metadata, request JSON or client-selected tenant IDs.

create or replace function convay_private.signed_active_tenant()
returns uuid
language plpgsql stable security invoker
set search_path = ''
as $$
declare v_claim text;
begin
  v_claim := auth.jwt() #>> '{app_metadata,active_tenant_id}';
  if v_claim is null
    or v_claim !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then return null; end if;
  return v_claim::uuid;
end;
$$;

-- This is deliberately SECURITY DEFINER, with pinned search_path, because
-- tenant_memberships, tenants and auth.sessions must not be client-readable.
-- Explicit authenticated EXECUTE only; private schema is not a Data API
-- exposed schema. Never accept any root/admin privilege bypass here.
create or replace function convay_private.tenant_actor_authorized(p_tenant uuid)
returns boolean
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_actor uuid;
  v_session text;
  v_session_id uuid;
begin
  v_actor := auth.uid();
  if p_tenant is null or v_actor is null or
     p_tenant is distinct from convay_private.signed_active_tenant()
  then return false; end if;

  v_session := auth.jwt()->>'session_id';
  if v_session is null
     or v_session !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then return false; end if;
  v_session_id := v_session::uuid;

  return exists (
    select 1 from convay_private.tenants t
      join convay_private.tenant_memberships m on m.tenant_id=t.id
      join public.user_profiles u on u.user_id=m.user_id
      join auth.sessions s on s.user_id=m.user_id
    where t.id=p_tenant and t.lifecycle_state='active'
      and m.user_id=v_actor and m.membership_state='active'
      and m.revoked_at is null and m.revision>0
      and u.account_status='active'
      and s.id=v_session_id
      and (s.not_after is null or s.not_after > now())
  );
end;
$$;

revoke all on function convay_private.signed_active_tenant() from public, anon;
revoke all on function convay_private.tenant_actor_authorized(uuid) from public, anon;
grant execute on function convay_private.signed_active_tenant() to authenticated;
grant execute on function convay_private.tenant_actor_authorized(uuid) to authenticated;

-- Stamp ownership from server-signed JWT and fresh DB membership; direct
-- PostgREST and generic batch RPC both pass through this trigger.
create or replace function convay_private.stamp_tenant_before_insert()
returns trigger
language plpgsql security invoker
set search_path = ''
as $$
declare v_tenant uuid;
begin
  v_tenant := convay_private.signed_active_tenant();
  if not coalesce(convay_private.tenant_actor_authorized(v_tenant),false) then
    raise exception 'Tenant access denied' using errcode='42501';
  end if;
  if new.tenant_id is not null then
    raise exception 'Tenant ownership is server managed' using errcode='42501';
  end if;
  new.tenant_id := v_tenant;
  return new;
end;
$$;

create or replace function convay_private.protect_tenant_ownership()
returns trigger
language plpgsql security invoker
set search_path = ''
as $$
begin
  if new.tenant_id is distinct from old.tenant_id then
    raise exception 'Tenant ownership is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function convay_private.stamp_tenant_before_insert() from public, anon;
revoke all on function convay_private.protect_tenant_ownership() from public, anon;
grant execute on function convay_private.stamp_tenant_before_insert() to authenticated;
grant execute on function convay_private.protect_tenant_ownership() to authenticated;

create trigger convay_wsf_stamp_tenant
before insert on public.convay_entity_records
for each row execute function convay_private.stamp_tenant_before_insert();

create trigger convay_wsf_immutable_tenant
before update of tenant_id on public.convay_entity_records
for each row execute function convay_private.protect_tenant_ownership();

create policy convay_wsf_tenant_read
  on public.convay_entity_records as restrictive
  for select to authenticated
  using (coalesce(convay_private.tenant_actor_authorized(tenant_id),false));

create policy convay_wsf_tenant_create
  on public.convay_entity_records as restrictive
  for insert to authenticated
  with check (coalesce(convay_private.tenant_actor_authorized(tenant_id),false));

create policy convay_wsf_tenant_update
  on public.convay_entity_records as restrictive
  for update to authenticated
  using (coalesce(convay_private.tenant_actor_authorized(tenant_id),false))
  with check (coalesce(convay_private.tenant_actor_authorized(tenant_id),false));

create policy convay_wsf_tenant_delete
  on public.convay_entity_records as restrictive
  for delete to authenticated
  using (coalesce(convay_private.tenant_actor_authorized(tenant_id),false));

-- Crucial: do not grant tenant_id INSERT/UPDATE to authenticated, even if
-- a future app payload includes it. Existing column-specific grants remain.
-- Tenant row ownership and active membership are enforced independently.
