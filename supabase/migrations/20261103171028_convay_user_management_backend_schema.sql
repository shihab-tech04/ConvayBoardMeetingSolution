-- Enrich existing canonical profile; Auth remains the credential store.
alter table public.user_profiles
  add column email text,
  add column phone text,
  add column user_type text not null default 'Internal Employee',
  add column employee_id text,
  add column profile_data jsonb not null default '{}'::jsonb;
update public.user_profiles p set email = u.email from auth.users u where u.id = p.user_id;
alter table public.user_profiles alter column email set not null;
create unique index user_profiles_email_ci_uidx on public.user_profiles (lower(email));
create index user_profiles_created_at_idx on public.user_profiles (created_at desc);

create table public.user_admin_audit (
  event_id bigint generated always as identity primary key,
  actor_id uuid not null references auth.users(id) on delete restrict,
  subject_id uuid,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.user_admin_audit enable row level security;
revoke all on public.user_admin_audit from PUBLIC, anon, authenticated;
-- Auditing is read and written only through the trusted administrative service.
create index user_admin_audit_actor_created_idx on public.user_admin_audit(actor_id,created_at desc);
create index user_admin_audit_subject_idx on public.user_admin_audit(subject_id,created_at desc);
