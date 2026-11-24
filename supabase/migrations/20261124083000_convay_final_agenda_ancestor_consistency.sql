-- AG-368: defend approved ancestor and meeting-link invariants at COMMIT,
-- not only through client-side cascades. No data mutation/backfill.
-- Deferred check deliberately sees the FINAL state of a multi-row Agenda
-- batch so child-first / ancestor-next legal transitions remain atomic.
CREATE OR REPLACE FUNCTION convay_private.guard_final_agenda_ancestors()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
  v_current record;
  v_parent record;
  v_parent_id text;
  v_seen text[];
  v_chain text[];
  v_status text;
BEGIN
  IF NEW.entity_key <> 'bms.agenda' THEN RETURN NULL; END IF;
  SELECT record_id,payload,tenant_id INTO v_current
    FROM public.convay_entity_records
   WHERE entity_key='bms.agenda' AND record_id=NEW.record_id;
  IF NOT FOUND THEN RETURN NULL; END IF; -- removed again by this transaction

  v_status := COALESCE(v_current.payload->>'approval_status','Draft');
  IF v_status IN ('Approved','Archived')
     OR NULLIF(BTRIM(COALESCE(v_current.payload->>'archived_at','')),'') IS NOT NULL
  THEN RETURN NULL; END IF;

  v_chain := ARRAY[v_current.record_id];
  IF NULLIF(BTRIM(COALESCE(v_current.payload->>'agenda_id','')),'') IS NOT NULL THEN
    v_chain := ARRAY_APPEND(v_chain,v_current.payload->>'agenda_id');
  END IF;
  v_seen := ARRAY[v_current.record_id];
  v_parent_id := NULLIF(BTRIM(COALESCE(v_current.payload->>'parent_agenda_id','')),'');

  WHILE v_parent_id IS NOT NULL LOOP
    IF v_parent_id=ANY(v_seen) THEN
      RAISE EXCEPTION 'Agenda ancestry cycle is not permitted'
        USING ERRCODE='23514';
    END IF;
    SELECT record_id,payload,tenant_id INTO v_parent
      FROM public.convay_entity_records
     WHERE entity_key='bms.agenda'
       AND (record_id=v_parent_id OR payload->>'agenda_id'=v_parent_id)
     LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Agenda parent must exist' USING ERRCODE='23503';
    END IF;
    IF v_parent.tenant_id IS DISTINCT FROM v_current.tenant_id THEN
      RAISE EXCEPTION 'Agenda hierarchy must remain in one tenant'
        USING ERRCODE='42501';
    END IF;
    IF v_parent.payload->>'approval_status' = 'Approved'
      AND NULLIF(BTRIM(COALESCE(v_parent.payload->>'archived_at','')),'') IS NULL THEN
      RAISE EXCEPTION 'Approved parent has an unapproved active descendant; review and reapprove parent in the same transaction'
        USING ERRCODE='23514';
    END IF;
    v_seen := ARRAY_APPEND(v_seen,v_parent.record_id);
    v_chain := ARRAY_APPEND(v_chain,v_parent.record_id);
    IF NULLIF(BTRIM(COALESCE(v_parent.payload->>'agenda_id','')),'') IS NOT NULL THEN
      v_chain := ARRAY_APPEND(v_chain,v_parent.payload->>'agenda_id');
    END IF;
    IF CARDINALITY(v_seen)>3 THEN
      RAISE EXCEPTION 'Agenda hierarchy cannot exceed three levels'
        USING ERRCODE='23514';
    END IF;
    v_parent_id := NULLIF(BTRIM(COALESCE(v_parent.payload->>'parent_agenda_id','')),'');
  END LOOP;

  -- Already-bound agendas cannot lose approval underneath a scheduled meeting.
  -- First unlink them through the authorized Meeting wizard; then reopen.
  IF EXISTS (
    SELECT 1 FROM public.convay_entity_records l
     WHERE l.entity_key='bms.meetingAgendaLinks'
       AND l.payload->>'agenda_id'=ANY(v_chain)
  ) THEN
    RAISE EXCEPTION 'Unlink this agenda from its meeting before reopening or requesting revision'
      USING ERRCODE='23514';
  END IF;
  RETURN NULL;
END $fn$;
REVOKE ALL ON FUNCTION convay_private.guard_final_agenda_ancestors()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS convay_c1_final_agenda_ancestors
  ON public.convay_entity_records;
CREATE CONSTRAINT TRIGGER convay_c1_final_agenda_ancestors
  AFTER UPDATE ON public.convay_entity_records
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW WHEN (NEW.entity_key='bms.agenda')
  EXECUTE FUNCTION convay_private.guard_final_agenda_ancestors();
