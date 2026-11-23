-- Convay WS-F / TEN-01..08: additive foundation ONLY (candidate; NOT applied).
-- The hosted registry is NOT tenant isolated; this file lives under tests,
-- not supabase/migrations. Do not promote it without WS0 migration review.
-- This stage deliberately DOES NOT change RLS, RPC, Auth, Storage, primary
-- keys or record namespaces. No tenant creation or onboarding is enabled.

create table convay_private.tenants (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (length(btrim(display_name)) between 1 and 160),
  lifecycle_state text not null default 'provisioning'
    check (lifecycle_state in ('provisioning', 'active', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table convay_private.tenants enable row level security;
revoke all on table convay_private.tenants from public, anon, authenticated;
comment on table convay_private.tenants is
  'WS-F staging only: tenant registration is not enabled for customer onboarding.';

create table convay_private.tenant_memberships (
  tenant_id uuid not null references convay_private.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  membership_state text not null default 'active'
    check (membership_state in ('active','suspended','revoked')),
  revision bigint not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  changed_at timestamptz not null default now(),
  revoked_at timestamptz,
  constraint tenant_memberships_revocation_state_chk
    check ((membership_state = 'revoked') = (revoked_at is not null)),
  primary key (tenant_id,user_id)
);
alter table convay_private.tenant_memberships enable row level security;
revoke all on table convay_private.tenant_memberships from public, anon, authenticated;
create index tenant_memberships_user_state_idx
  on convay_private.tenant_memberships(user_id,membership_state,tenant_id);
comment on table convay_private.tenant_memberships is
  'WS-F private canonical actor membership; only a reviewed trusted administration service may mutate it.';

-- NO DEFAULT: an untrusted caller cannot silently claim the legacy tenant.
-- Existing records are preserved; ownership must not be guessed.
alter table public.convay_entity_records add column tenant_id uuid;
alter table public.convay_entity_records
  add constraint convay_entity_records_tenant_fk
  foreign key (tenant_id) references convay_private.tenants(id)
  on delete restrict not valid;
create index convay_entity_records_tenant_modified_idx
  on public.convay_entity_records(tenant_id,entity_key,updated_at desc)
  where tenant_id is not null;
comment on column public.convay_entity_records.tenant_id is
  'WS-F nullable staging column. NOT an enforced tenant authorization boundary until explicit RLS/RPC activation.';

-- Authority, RPC, unique indexes, legacy keys and Storage require an
-- independently reviewed/restore-tested separate WS0 activation.
