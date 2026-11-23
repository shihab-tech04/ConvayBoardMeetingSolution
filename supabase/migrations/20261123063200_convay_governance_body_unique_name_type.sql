-- GV-10 / MT-04: Enforce authoritative governance-body name/type identity.
-- Client-side duplicate checks cannot protect against simultaneous sessions.
-- The existing platform is single-organization; SaaS tenant scoping remains
-- disabled and must be introduced explicitly alongside verified tenant RLS.
-- Keep legitimate separate body types with the same name possible.
create unique index if not exists convay_governance_body_name_type_unique_ci
  on public.convay_entity_records (
    lower(btrim(payload->>'body_name')),
    lower(btrim(payload->>'body_type'))
  )
  where entity_key = 'bms.govbodies'
    and nullif(btrim(payload->>'body_name'), '') is not null
    and nullif(btrim(payload->>'body_type'), '') is not null;

comment on index public.convay_governance_body_name_type_unique_ci is
  'One canonical governance body per trimmed case-insensitive name/type pair; protects concurrent Create Meeting setup writes.';
