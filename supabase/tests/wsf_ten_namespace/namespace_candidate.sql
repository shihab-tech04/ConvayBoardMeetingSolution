-- WS-F TEN-04: test-only namespace migration candidate for disposable PG17.
-- DO NOT APPLY TO HOSTED DB. A safe production migration must first pass
-- native PostgreSQL/Auth/Storage restore and WS0 shared SQL contract review.
-- Cross-tenant FK, document/storage path, audit, RPC and Edge integration
-- remain separate and must all be reviewed before onboarding any tenant.

DO $pre$
DECLARE k text;
BEGIN
  IF to_regclass('convay_private.tenants') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE
       table_schema='public' AND table_name='convay_entity_records'
       AND column_name='tenant_id' AND data_type='uuid')
  THEN RAISE EXCEPTION 'TEN-04 missing prerequisite additive tenant schema'; END IF;

  -- A genuine backfill must be source-mapped; never guess a default tenant.
  IF EXISTS (SELECT 1 FROM public.convay_entity_records WHERE tenant_id IS NULL)
  THEN RAISE EXCEPTION 'TEN-04 unmapped legacy registry records'; END IF;
  IF (SELECT pg_get_constraintdef(oid) FROM pg_constraint
      WHERE conrelid='public.convay_entity_records'::regclass AND contype='p')
      IS DISTINCT FROM 'PRIMARY KEY (entity_key, record_id)'
  THEN RAISE EXCEPTION 'TEN-04 unexpected existing registry PK'; END IF;

  -- Any FK that targets the original global PK needs an owner-coordinated
  -- redesign before it can be replaced. Do not CASCADE or drop dependents.
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE contype='f' AND confrelid='public.convay_entity_records'::regclass
  ) THEN RAISE EXCEPTION 'TEN-04 existing FK targets registry key'; END IF;

  FOREACH k IN ARRAY ARRAY[
    'convay_document_ack_user_unique',
    'convay_documents_external_id_unique',
    'convay_unique_ballot_voter_session',
    'convay_vote_unique_meeting_ballot'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
      WHERE i.indrelid='public.convay_entity_records'::regclass
        AND c.relname=k AND i.indisunique
    ) THEN RAISE EXCEPTION 'TEN-04 existing unique index missing: %',k; END IF;
  END LOOP;
END $pre$;

ALTER TABLE public.convay_entity_records ALTER COLUMN tenant_id SET NOT NULL;

-- Preserve the original key columns/order after adding the tenant prefix.
ALTER TABLE public.convay_entity_records
  DROP CONSTRAINT convay_entity_records_pkey;
ALTER TABLE public.convay_entity_records
  ADD CONSTRAINT convay_entity_records_pkey
    PRIMARY KEY (tenant_id,entity_key,record_id);

DROP INDEX public.convay_document_ack_user_unique;
CREATE UNIQUE INDEX convay_document_ack_user_unique
  ON public.convay_entity_records (
    tenant_id,
    (payload ->> 'document_id'),
    (payload ->> 'acknowledged_user_id'),
    coalesce(payload ->> 'version_id','')
  )
  WHERE entity_key='bms.doc.acknowledgements';

DROP INDEX public.convay_documents_external_id_unique;
CREATE UNIQUE INDEX convay_documents_external_id_unique
  ON public.convay_entity_records (
    tenant_id,(payload ->> 'doc_id')
  )
  WHERE entity_key='bms.documents'
    AND nullif(btrim(payload ->> 'doc_id'),'') IS NOT NULL;

DROP INDEX public.convay_unique_ballot_voter_session;
CREATE UNIQUE INDEX convay_unique_ballot_voter_session
  ON public.convay_entity_records (
    tenant_id,
    (payload ->> 'meeting_id'),
    (payload ->> 'ballot_session_id'),
    (payload ->> 'voter_id')
  )
  WHERE entity_key='bms.votes'
    AND nullif(btrim(payload ->> 'voter_id'),'') IS NOT NULL
    AND nullif(btrim(payload ->> 'ballot_session_id'),'') IS NOT NULL;

DROP INDEX public.convay_vote_unique_meeting_ballot;
CREATE UNIQUE INDEX convay_vote_unique_meeting_ballot
  ON public.convay_entity_records (
    tenant_id,
    (payload ->> 'meeting_id'),
    (payload ->> 'vote_id')
  )
  WHERE entity_key='bms.votes'
    AND nullif(btrim(payload ->> 'meeting_id'),'') IS NOT NULL
    AND nullif(btrim(payload ->> 'vote_id'),'') IS NOT NULL;

-- Never silently change uniqueness for a tenant. Only its namespace is new.
DO $check$
DECLARE i_name text;
BEGIN
  IF (SELECT pg_get_constraintdef(oid) FROM pg_constraint
      WHERE conrelid='public.convay_entity_records'::regclass AND contype='p')
      IS DISTINCT FROM 'PRIMARY KEY (tenant_id, entity_key, record_id)'
  THEN RAISE EXCEPTION 'TEN-04 wrong tenant-qualified PK'; END IF;

  FOREACH i_name IN ARRAY ARRAY[
    'convay_document_ack_user_unique',
    'convay_documents_external_id_unique',
    'convay_unique_ballot_voter_session',
    'convay_vote_unique_meeting_ballot'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes
      WHERE schemaname='public'
        AND tablename='convay_entity_records'
        AND indexname=i_name
        AND indexdef LIKE '%(tenant_id,%'
    ) THEN RAISE EXCEPTION 'TEN-04 unique index lacks tenant prefix: %',i_name; END IF;
  END LOOP;

  IF EXISTS (SELECT 1 FROM public.convay_entity_records WHERE tenant_id IS NULL)
  THEN RAISE EXCEPTION 'TEN-04 null ownership accepted after migration'; END IF;
  RAISE NOTICE 'TEN-04 candidate: tenant key and four unique indexes qualified PASS (synthetic only)';
END $check$;
