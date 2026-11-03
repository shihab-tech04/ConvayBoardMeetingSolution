-- Bootstrap the application profile for the existing Auth user.
-- Auth identity/password remain managed exclusively by Supabase Auth.
create table public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  username text not null check (length(btrim(username)) between 1 and 80),
  display_name text not null check (length(btrim(display_name)) between 1 and 120),
  account_role text not null default 'user' check (account_role in ('super_admin','user')),
  account_status text not null default 'active' check (account_status in ('active','inactive','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- No two usernames differing only by case; at most one Super Admin.
create unique index user_profiles_username_ci_idx on public.user_profiles ((lower(username)));
create unique index user_profiles_single_super_admin_idx on public.user_profiles (account_role)
  where account_role = 'super_admin';

-- No browser/client inserts, updates or deletes; trusted server provisioning only.
alter table public.user_profiles enable row level security;
revoke all privileges on public.user_profiles from PUBLIC, anon, authenticated;
grant select on public.user_profiles to authenticated;
create policy "authenticated users see own profile"
  on public.user_profiles for select to authenticated
  using (user_id = (select auth.uid()));

-- Bind the verified, already-created Auth account; never recreate its password.
do $bootstrap$
declare
  existing_auth_user uuid;
begin
  select id into existing_auth_user
  from auth.users
  where id = '4d0b19af-c0db-40df-8445-67cd363e9621'::uuid
    and lower(email) = 'shihabshajib01@gmail.com'
    and email_confirmed_at is not null;
  if existing_auth_user is null then
    raise exception 'Verified Supabase Auth identity missing or not confirmed; bootstrap aborted';
  end if;
  insert into public.user_profiles
    (user_id, username, display_name, account_role, account_status)
  values
    (existing_auth_user, 'shihab', 'shihab', 'super_admin', 'active');
end
$bootstrap$;
