-- Synthetic, disposable PostgreSQL 17 fixture for QM-01 only.
-- Never apply to Supabase production or any existing Auth schema.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (
  id uuid primary key
);

-- Deterministic synthetic owner for rollback-only SQL assertions.
insert into auth.users (id)
values ('11111111-1111-4111-8111-111111111111');
