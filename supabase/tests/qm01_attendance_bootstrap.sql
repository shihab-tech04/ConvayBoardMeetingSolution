-- Synthetic, disposable PostgreSQL 17 fixture for QM-01 only.
-- Never apply to Supabase production or any existing Auth schema.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key,
  email_confirmed_at timestamptz not null default now()
);

-- Deterministic synthetic owner for rollback-only SQL assertions.
insert into auth.users (id)
values ('11111111-1111-4111-8111-111111111111');

-- Minimal synthetic authorization prerequisites, not a production clone.
create schema convay_private;
create table public.user_profiles(user_id uuid primary key references auth.users(id), account_status text not null, can_create boolean not null default true);
insert into public.user_profiles(user_id,account_status) select id,'active' from auth.users;
create table convay_private.tenants(id uuid primary key,lifecycle_state text not null);
create table convay_private.tenant_memberships(tenant_id uuid references convay_private.tenants(id),user_id uuid references auth.users(id),membership_state text not null default 'active',revoked_at timestamptz,revision integer not null default 1, primary key(tenant_id,user_id));
create function convay_private.has_permission(permission_code text) returns boolean language sql stable as $$ select coalesce((select can_create and account_status='active' from public.user_profiles where user_id=nullif(current_setting('request.jwt.claim.sub',true),'')::uuid),false) and permission_code='mtg_create' $$;
