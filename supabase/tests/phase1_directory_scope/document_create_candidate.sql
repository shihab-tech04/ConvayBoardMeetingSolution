-- Staged candidate: atomic document creation and authorized readback.
-- Invoker rights preserve existing table grants, RLS and business-state triggers.
-- No new tenant writes, role grants, privileged lookup or generic registry changes.
CREATE OR REPLACE FUNCTION public.convay_create_document_record(p_record jsonb)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY INVOKER SET search_path TO ''
AS $fn$
DECLARE
 v_id text := p_record->>'id';
 v_revision bigint;
BEGIN
 IF (SELECT auth.uid()) IS NULL THEN
   RAISE EXCEPTION 'Authenticated document creator required' USING ERRCODE='42501';
 END IF;
 IF jsonb_typeof(p_record) IS DISTINCT FROM 'object' OR
    v_id IS NULL OR length(btrim(v_id))=0 OR length(v_id)>180 THEN
   RAISE EXCEPTION 'Valid document record ID required' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.convay_entity_records(entity_key,record_id,payload)
 VALUES ('bms.documents',v_id,p_record);
 -- The separate statement sees the inserted parent; the existing read policy
 -- still applies. A missing or unauthorized receipt rolls back the insert.
 SELECT r.revision INTO v_revision
 FROM public.convay_entity_records r
 WHERE r.entity_key='bms.documents' AND r.record_id=v_id;
 IF NOT FOUND OR v_revision IS NULL THEN
   RAISE EXCEPTION 'Document creation could not be confirmed with existing access' USING ERRCODE='42501';
 END IF;
 RETURN jsonb_build_array(jsonb_build_object('record_id',v_id,'revision',v_revision));
END $fn$;
REVOKE ALL ON FUNCTION public.convay_create_document_record(jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.convay_create_document_record(jsonb) TO authenticated;
