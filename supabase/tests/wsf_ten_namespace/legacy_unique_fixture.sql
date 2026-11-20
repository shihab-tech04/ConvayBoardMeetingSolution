-- Copy of four EXISTING hosted global unique index shapes (read-only
-- observed on Supabase 2026-11-20). Used only to create a fresh fixture
-- *outside* TEN-04 transactional migration, to verify rollback restores
-- the actual old unique signatures and PK. No hosted writes.
CREATE UNIQUE INDEX convay_document_ack_user_unique
ON public.convay_entity_records (
  (payload ->> 'document_id'),
  (payload ->> 'acknowledged_user_id'),
  coalesce(payload ->> 'version_id','')
) WHERE entity_key='bms.doc.acknowledgements';

CREATE UNIQUE INDEX convay_documents_external_id_unique
ON public.convay_entity_records ((payload ->> 'doc_id'))
WHERE entity_key='bms.documents'
  AND nullif(btrim(payload ->> 'doc_id'),'') IS NOT NULL;

CREATE UNIQUE INDEX convay_unique_ballot_voter_session
ON public.convay_entity_records (
  (payload ->> 'meeting_id'),
  (payload ->> 'ballot_session_id'),
  (payload ->> 'voter_id')
) WHERE entity_key='bms.votes'
  AND nullif(btrim(payload ->> 'voter_id'),'') IS NOT NULL
  AND nullif(btrim(payload ->> 'ballot_session_id'),'') IS NOT NULL;

CREATE UNIQUE INDEX convay_vote_unique_meeting_ballot
ON public.convay_entity_records (
  (payload ->> 'meeting_id'),
  (payload ->> 'vote_id')
) WHERE entity_key='bms.votes'
  AND nullif(btrim(payload ->> 'meeting_id'),'') IS NOT NULL
  AND nullif(btrim(payload ->> 'vote_id'),'') IS NOT NULL;
