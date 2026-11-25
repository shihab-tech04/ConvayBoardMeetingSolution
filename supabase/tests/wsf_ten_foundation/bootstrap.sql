-- WS-F TEN-00: disposable PostgreSQL 17 smoke fixture, NOT a production restore.
-- No real Auth users, customer records, Storage, Edge or secrets are present.
-- The fixture deliberately mimics ONLY original registry columns/grants needed
-- for testing additive DDL and rollback. It is not tenant-isolation acceptance.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA convay_private;
CREATE TABLE auth.users(id uuid primary key);
INSERT INTO auth.users(id) VALUES
  ('33333333-3333-4333-8333-333333333333'::uuid);

CREATE TABLE public.convay_entity_records(
  entity_key text NOT NULL,
  record_id text NOT NULL CHECK(length(record_id) BETWEEN 1 AND 180),
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  revision bigint NOT NULL DEFAULT 1,
  CONSTRAINT convay_entity_records_pkey PRIMARY KEY(entity_key,record_id),
  CONSTRAINT record_id_matches_json CHECK (payload->>'id'=record_id)
);
ALTER TABLE public.convay_entity_records ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.convay_entity_records FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.convay_entity_records TO authenticated;
GRANT INSERT (entity_key,record_id,payload) ON public.convay_entity_records TO authenticated;
GRANT UPDATE (payload) ON public.convay_entity_records TO authenticated;
GRANT DELETE ON public.convay_entity_records TO authenticated;

-- One fixture row proves the rollback has not changed pre-existing records.
INSERT INTO public.convay_entity_records(entity_key,record_id,payload,created_by)
VALUES ('bms.meetings','fixture-meeting-1',
  '{"id":"fixture-meeting-1","status":"Draft"}'::jsonb,
  '33333333-3333-4333-8333-333333333333'::uuid);
