-- AG-362: atomic, revision-checked Agenda approval/archive batches.
-- Separate from the generic batch RPC to preserve existing callers.
-- Runs as the signed-in invoker: existing entity RLS, permission triggers,
-- trusted actor stamping and revision triggers remain authoritative.
CREATE OR REPLACE FUNCTION public.convay_apply_agenda_batch(p_ops jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO ''
AS $body$
DECLARE
  v_op jsonb;
  v_id text;
  v_expected bigint;
  v_actual bigint;
  v_seen text[] := ARRAY[]::text[];
  v_processed integer;
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'Sign in required for agenda changes' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(p_ops) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_ops) NOT BETWEEN 1 AND 500 THEN
    RAISE EXCEPTION 'Invalid agenda transaction size' USING ERRCODE='22023';
  END IF;

  -- Sort locks to avoid deadlocks across concurrent parent-child updates.
  -- Lock and verify ALL revisions before applying ANY changes.
  FOR v_op IN
    SELECT value FROM jsonb_array_elements(p_ops) AS t(value)
    ORDER BY value->>'record_id'
  LOOP
    v_id := NULLIF(btrim(v_op->>'record_id'), '');
    IF v_op->>'entity_key' IS DISTINCT FROM 'bms.agenda'
       OR v_op->>'action' IS DISTINCT FROM 'update'
       OR v_id IS NULL OR length(v_id) > 180
       OR jsonb_typeof(v_op->'payload') IS DISTINCT FROM 'object'
       OR jsonb_typeof(v_op->'expected_revision') IS DISTINCT FROM 'number'
       OR coalesce(v_op->>'expected_revision','') !~ '^[1-9][0-9]*$'
       OR v_id = ANY(v_seen) THEN
      RAISE EXCEPTION 'Invalid or duplicate Agenda operation' USING ERRCODE='22023';
    END IF;
    v_seen := array_append(v_seen, v_id);
    v_expected := (v_op->>'expected_revision')::bigint;

    SELECT revision INTO v_actual
      FROM public.convay_entity_records
     WHERE entity_key='bms.agenda' AND record_id=v_id
     FOR UPDATE;
    IF NOT FOUND OR v_actual IS DISTINCT FROM v_expected THEN
      RAISE EXCEPTION 'Agenda % changed since it was loaded. Refresh and retry.', v_id
        USING ERRCODE='40001';
    END IF;
  END LOOP;

  -- Same DB transaction; any RLS/trigger rejection rolls back every change.
  SELECT public.convay_apply_entity_batch(p_ops) INTO v_processed;
  IF v_processed IS DISTINCT FROM jsonb_array_length(p_ops) THEN
    RAISE EXCEPTION 'Agenda batch did not commit every record' USING ERRCODE='40001';
  END IF;
  RETURN v_processed;
END
$body$;

REVOKE ALL ON FUNCTION public.convay_apply_agenda_batch(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convay_apply_agenda_batch(jsonb) TO authenticated;
