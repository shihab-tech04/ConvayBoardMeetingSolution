-- AG-371: delete an editable Agenda child and every linked document atomically,
-- with SQL revisions checked before any removal. Never bypass existing RLS,
-- author/approver permissions, tenant boundaries, FK or audit triggers.
CREATE OR REPLACE FUNCTION public.convay_delete_agenda_child(
  p_child_id text,
  p_expected_revision bigint,
  p_link_revisions jsonb DEFAULT '[]'::jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $fn$
DECLARE
  v_child public.convay_entity_records%ROWTYPE;
  v_parent public.convay_entity_records%ROWTYPE;
  v_link public.convay_entity_records%ROWTYPE;
  v_input jsonb;
  v_link_id text;
  v_expected bigint;
  v_ids text[] := ARRAY[]::text[];
  v_actual text[];
  v_ops jsonb := '[]'::jsonb;
  v_count integer;
  v_parent_ref text;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Sign in to remove an Agenda child' USING ERRCODE='42501';
  END IF;
  IF p_child_id IS NULL OR length(btrim(p_child_id)) NOT BETWEEN 1 AND 180
      OR p_expected_revision IS NULL OR p_expected_revision < 1
      OR jsonb_typeof(p_link_revisions) IS DISTINCT FROM 'array'
      OR jsonb_array_length(p_link_revisions) > 499 THEN
    RAISE EXCEPTION 'Invalid Agenda deletion intent' USING ERRCODE='22023';
  END IF;
  -- The invoker must see the child under RLS. Lock it while checking revision.
  SELECT * INTO v_child FROM public.convay_entity_records
    WHERE entity_key='bms.agenda' AND record_id=p_child_id FOR UPDATE;
  IF NOT FOUND OR v_child.revision IS DISTINCT FROM p_expected_revision THEN
    RAISE EXCEPTION 'Agenda child changed. Refresh before removing.'
      USING ERRCODE='40001';
  END IF;
  v_parent_ref := NULLIF(btrim(coalesce(v_child.payload->>'parent_agenda_id','')),'');
  IF v_parent_ref IS NULL OR
     coalesce(v_child.payload->>'approval_status','Draft') NOT IN
        ('Draft','Incomplete','Reopened','Revision Requested')
     OR NULLIF(btrim(coalesce(v_child.payload->>'archived_at','')),'') IS NOT NULL THEN
    RAISE EXCEPTION 'Only an editable child Agenda may be removed'
      USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_parent FROM public.convay_entity_records
    WHERE entity_key='bms.agenda' AND
      (record_id=v_parent_ref OR payload->>'agenda_id'=v_parent_ref)
    LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR v_parent.tenant_id IS DISTINCT FROM v_child.tenant_id
    OR coalesce(v_parent.payload->>'approval_status','Draft') NOT IN
       ('Draft','Incomplete','Reopened','Revision Requested')
    OR NULLIF(btrim(coalesce(v_parent.payload->>'archived_at','')),'') IS NOT NULL THEN
    RAISE EXCEPTION 'Reopen the parent before removing child Agenda items'
      USING ERRCODE='42501';
  END IF;
  IF EXISTS (SELECT 1 FROM public.convay_entity_records d
    WHERE d.entity_key='bms.agenda'
      AND d.payload->>'parent_agenda_id' IN
        (v_child.record_id,v_child.payload->>'agenda_id')) THEN
    RAISE EXCEPTION 'Remove nested descendants before their parent Agenda child'
      USING ERRCODE='23503';
  END IF;
  IF EXISTS (SELECT 1 FROM public.convay_entity_records m
    WHERE m.entity_key='bms.meetingAgendaLinks'
      AND m.payload->>'agenda_id' IN
        (v_child.record_id,v_child.payload->>'agenda_id')) THEN
    RAISE EXCEPTION 'Unlink this Agenda from its meeting before removing it'
      USING ERRCODE='23514';
  END IF;

  -- Lock and validate every linked document in stable order. The set must
  -- match the fresh authoritative SQL set exactly; stale UI cannot silently
  -- delete a newly linked document or leave an orphan.
  FOR v_input IN SELECT value FROM jsonb_array_elements(p_link_revisions) AS t(value)
    ORDER BY value->>'record_id'
  LOOP
    v_link_id := nullif(btrim(coalesce(v_input->>'record_id','')),'');
    IF v_link_id IS NULL OR length(v_link_id)>180 OR v_link_id=ANY(v_ids)
       OR coalesce(v_input->>'expected_revision','') !~ '^[1-9][0-9]{0,17}$' THEN
      RAISE EXCEPTION 'Invalid or duplicate Agenda document revision'
        USING ERRCODE='22023';
    END IF;
    v_expected := (v_input->>'expected_revision')::bigint;
    SELECT * INTO v_link FROM public.convay_entity_records
      WHERE entity_key='bms.agendaDocumentLinks' AND record_id=v_link_id
      FOR UPDATE;
    IF NOT FOUND OR v_link.revision IS DISTINCT FROM v_expected
       OR v_link.tenant_id IS DISTINCT FROM v_child.tenant_id
       OR v_link.payload->>'agenda_id' NOT IN
          (v_child.record_id,coalesce(v_child.payload->>'agenda_id',v_child.record_id)) THEN
      RAISE EXCEPTION 'Agenda document links changed. Refresh and retry.'
        USING ERRCODE='40001';
    END IF;
    v_ids := array_append(v_ids,v_link_id);
    v_ops := v_ops || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'entity_key','bms.agendaDocumentLinks','action','delete','record_id',v_link_id));
  END LOOP;

  SELECT coalesce(array_agg(record_id ORDER BY record_id),ARRAY[]::text[])
    INTO v_actual
    FROM public.convay_entity_records
   WHERE entity_key='bms.agendaDocumentLinks'
     AND payload->>'agenda_id' IN
       (v_child.record_id,v_child.payload->>'agenda_id');
  IF v_actual IS DISTINCT FROM v_ids THEN
    RAISE EXCEPTION 'Agenda documents changed since the page loaded. Refresh and retry.'
      USING ERRCODE='40001';
  END IF;
  v_ops := v_ops || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'entity_key','bms.agenda','action','delete','record_id',v_child.record_id));
  SELECT public.convay_apply_entity_batch(v_ops) INTO v_count;
  IF v_count IS DISTINCT FROM jsonb_array_length(v_ops) THEN
    RAISE EXCEPTION 'Agenda child removal was not fully confirmed by SQL'
      USING ERRCODE='40001';
  END IF;
  RETURN v_count;
END $fn$;
REVOKE ALL ON FUNCTION public.convay_delete_agenda_child(text,bigint,jsonb)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convay_delete_agenda_child(text,bigint,jsonb)
  TO authenticated;
