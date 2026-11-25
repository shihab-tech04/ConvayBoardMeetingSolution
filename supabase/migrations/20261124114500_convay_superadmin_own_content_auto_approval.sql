-- SA-APP-01: platform Super Admin's OWN completed authoring may skip
-- administrative approval queues. This does not sign, publish, vote, schedule,
-- create tenancy, or approve any other user's content.
-- No existing records are changed during installation.

CREATE OR REPLACE FUNCTION public.convay_superadmin_finalize_agenda(p_agenda_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_name text;
  v_root public.convay_entity_records%ROWTYPE;
  v_row public.convay_entity_records%ROWTYPE;
  v_node record;
  v_history jsonb;
  v_now timestamptz := clock_timestamp();
  v_count integer := 0;
  v_submit jsonb;
  v_approve jsonb;
BEGIN
  SELECT p.display_name INTO v_name FROM public.user_profiles p
  WHERE p.user_id=v_actor AND p.account_status='active' AND p.account_role='super_admin';
  IF v_name IS NULL OR NOT convay_private.has_permission('agd_submit')
    OR NOT convay_private.has_permission('agd_approve') THEN
    RAISE EXCEPTION 'Active platform Super Admin approval permission required' USING ERRCODE='42501';
  END IF;
  IF p_agenda_id IS NULL OR length(p_agenda_id) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Invalid agenda identity' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_root FROM public.convay_entity_records r
  WHERE r.entity_key='bms.agenda' AND r.record_id=p_agenda_id FOR UPDATE;
  IF NOT FOUND OR v_root.created_by IS DISTINCT FROM v_actor
     OR NULLIF(BTRIM(COALESCE(v_root.payload->>'parent_agenda_id','')),'') IS NOT NULL THEN
    RAISE EXCEPTION 'Only the Super Admin creator may finalize a parent agenda'
      USING ERRCODE='42501';
  END IF;
  IF v_root.payload->>'approval_status'='Approved' THEN
    RETURN jsonb_build_object('agenda_id',p_agenda_id,'status','Approved',
      'auto_approved',true,'idempotent',true);
  END IF;
  IF COALESCE(v_root.payload->>'approval_status','Draft')<>'Draft' THEN
    RAISE EXCEPTION 'Only a saved Draft agenda may be finalized automatically'
      USING ERRCODE='23514';
  END IF;

  -- Complete descendants deepest-first. The SQL guards independently verify
  -- parent readiness, explicit approver history, tenancy and immutable content.
  FOR v_node IN
    WITH RECURSIVE tree(record_id,depth,path) AS (
      SELECT v_root.record_id,0,ARRAY[v_root.record_id]
      UNION ALL
      SELECT child.record_id,parent.depth+1,parent.path||child.record_id
      FROM public.convay_entity_records child
      JOIN tree parent ON child.payload->>'parent_agenda_id'=parent.record_id
      WHERE child.entity_key='bms.agenda'
        AND NOT child.record_id=ANY(parent.path) AND parent.depth<3
    )
    SELECT record_id,depth FROM tree ORDER BY depth DESC,record_id
  LOOP
    v_count:=v_count+1;
    IF v_count>150 THEN RAISE EXCEPTION 'Agenda tree exceeds the approval limit'
      USING ERRCODE='23514'; END IF;
    SELECT * INTO v_row FROM public.convay_entity_records r
    WHERE r.entity_key='bms.agenda' AND r.record_id=v_node.record_id FOR UPDATE;
    IF NOT FOUND OR v_row.created_by IS DISTINCT FROM v_actor
      OR v_row.tenant_id IS DISTINCT FROM v_root.tenant_id
      OR COALESCE(v_row.payload->>'approval_status','Draft')<>'Draft'
      OR NULLIF(BTRIM(COALESCE(v_row.payload->>'archived_at','')),'') IS NOT NULL THEN
      RAISE EXCEPTION 'All agenda items must be saved, editable and created by this Super Admin'
        USING ERRCODE='42501';
    END IF;
    IF LENGTH(BTRIM(COALESCE(v_row.payload->>'agenda_title','')))<2 THEN
      RAISE EXCEPTION 'An agenda item title is missing' USING ERRCODE='23514';
    END IF;
    IF v_node.depth>0 AND (
      LENGTH(BTRIM(COALESCE(v_row.payload->>'description','')))<1
      OR LENGTH(BTRIM(COALESCE(v_row.payload->>'estimated_duration','')))<1
    ) THEN
      RAISE EXCEPTION 'An agenda child is incomplete' USING ERRCODE='23514';
    END IF;
    v_history:=COALESCE(v_row.payload->'approval_history','[]'::jsonb);
    IF jsonb_typeof(v_history)<>'array' THEN
      RAISE EXCEPTION 'Agenda approval history is invalid' USING ERRCODE='23514'; END IF;
    v_submit:=jsonb_build_object(
      'status','Pending Approval','prev_status','Draft','action','submit',
      'by',v_name,'actor_id',v_actor,'actor_role','super_admin','at',v_now,
      'note','Super Admin authoring finalization','reason','');
    UPDATE public.convay_entity_records r
      SET payload=r.payload||jsonb_build_object(
        'approval_status','Pending Approval','meeting_readiness','In Review',
        'approval_history',v_history||jsonb_build_array(v_submit),
        'updated_at',v_now,'updated_by',v_name)
    WHERE r.entity_key='bms.agenda' AND r.record_id=v_node.record_id;
    v_approve:=jsonb_build_object(
      'status','Approved','prev_status','Pending Approval','action','approve',
      'by',v_name,'actor_id',v_actor,'actor_role','super_admin','at',v_now,
      'note','Automatically approved: authenticated Super Admin created this agenda',
      'reason','');
    UPDATE public.convay_entity_records r
      SET payload=r.payload||jsonb_build_object(
        'approval_status','Approved','meeting_readiness','Meeting Ready',
        'approval_history',v_history||jsonb_build_array(v_submit,v_approve),
        'approved_by',v_actor::text,'approved_at',v_now,
        'updated_at',v_now,'updated_by',v_name)
    WHERE r.entity_key='bms.agenda' AND r.record_id=v_node.record_id
      AND r.payload->>'approval_status'='Pending Approval';
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Agenda status changed during finalization'
        USING ERRCODE='40001'; END IF;
  END LOOP;
  SELECT * INTO v_root FROM public.convay_entity_records r
    WHERE r.entity_key='bms.agenda' AND r.record_id=p_agenda_id;
  IF v_root.payload->>'approval_status'<>'Approved'
     OR v_root.payload->>'meeting_readiness'<>'Meeting Ready' THEN
    RAISE EXCEPTION 'Approved agenda SQL readback failed' USING ERRCODE='23514'; END IF;
  RETURN jsonb_build_object('agenda_id',p_agenda_id,'status','Approved',
    'auto_approved',true,'items_approved',v_count,'actor_id',v_actor);
END $fn$;
REVOKE ALL ON FUNCTION public.convay_superadmin_finalize_agenda(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.convay_superadmin_finalize_agenda(text) TO authenticated;


CREATE OR REPLACE FUNCTION public.convay_superadmin_finalize_document(p_document_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_doc public.convay_entity_records%ROWTYPE;
  v_ver public.convay_entity_records%ROWTYPE;
  v_now timestamptz := clock_timestamp();
  v_content_ok boolean;
  v_history jsonb;
  v_approved jsonb;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.user_profiles p
    WHERE p.user_id=v_actor AND p.account_status='active' AND p.account_role='super_admin')
    OR NOT convay_private.has_permission('doc_approve')
    OR NOT convay_private.has_permission('doc_edit') THEN
    RAISE EXCEPTION 'Active Super Admin document permission required' USING ERRCODE='42501';
  END IF;
  IF p_document_id IS NULL OR LENGTH(p_document_id) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Invalid document identity' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_doc FROM public.convay_entity_records r
    WHERE r.entity_key='bms.documents' AND r.record_id=p_document_id FOR UPDATE;
  IF NOT FOUND OR v_doc.created_by IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Only the Super Admin author can automatically approve a document'
      USING ERRCODE='42501'; END IF;
  IF v_doc.payload->>'approval_status'='Approved' THEN
    RETURN jsonb_build_object('document_id',p_document_id,'status','Approved',
      'auto_approved',true,'idempotent',true);
  END IF;
  IF COALESCE(v_doc.payload->>'approval_status','Draft')<>'Draft' THEN
    RAISE EXCEPTION 'Document must be a fully saved Draft' USING ERRCODE='23514'; END IF;
  SELECT * INTO v_ver FROM public.convay_entity_records v
    WHERE v.entity_key='bms.docversions'
      AND v.payload->>'document_id'=p_document_id
      AND v.payload->>'version_number'=v_doc.payload->>'version'
      AND v.created_by=v_actor
    ORDER BY v.created_at DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND OR COALESCE(v_ver.payload->>'approval_status','Draft')<>'Draft' THEN
    RAISE EXCEPTION 'Complete document version is required before approval'
      USING ERRCODE='23514'; END IF;
  SELECT EXISTS(
    SELECT 1 FROM public.convay_document_content c
    WHERE c.document_id=p_document_id AND (
      (v_doc.payload->>'content_type'='editor'
       AND c.content_type='editor_json' AND c.content IS NOT NULL)
      OR (v_doc.payload->>'content_type'='uploaded'
       AND c.content_type='original_file'
       AND c.storage_path IS NOT NULL
       AND EXISTS(SELECT 1 FROM storage.objects o
         WHERE o.bucket_id='convay-documents' AND o.name=c.storage_path))
    )
  ) INTO v_content_ok;
  IF NOT v_content_ok THEN
    RAISE EXCEPTION 'Document content or original upload is not verified in storage'
      USING ERRCODE='23514'; END IF;
  v_history:=COALESCE(v_doc.payload->'approval_history','[]'::jsonb);
  IF jsonb_typeof(v_history)<>'array' THEN
    RAISE EXCEPTION 'Document approval history is invalid' USING ERRCODE='23514'; END IF;
  v_approved:=jsonb_build_object(
    'status','Approved','action','super_admin_auto_approve',
    'actor_id',v_actor,'actor_role','super_admin','at',v_now,
    'note','Verified complete document from its Super Admin author');
  UPDATE public.convay_entity_records v SET
    payload=v.payload||jsonb_build_object(
      'approval_status','Approved','approved_by',v_actor::text,'approved_at',v_now)
    WHERE v.entity_key='bms.docversions' AND v.record_id=v_ver.record_id
      AND v.payload->>'approval_status'='Draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'Document version status changed'
    USING ERRCODE='40001'; END IF;
  UPDATE public.convay_entity_records d SET
    payload=d.payload||jsonb_build_object(
      'approval_status','Approved','workflow_status','Approved',
      'approval_history',v_history||jsonb_build_array(v_approved),
      'approved_by',v_actor::text,'approved_at',v_now,'last_modified_at',v_now)
    WHERE d.entity_key='bms.documents' AND d.record_id=p_document_id
      AND d.payload->>'approval_status'='Draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'Document status changed'
    USING ERRCODE='40001'; END IF;
  SELECT * INTO v_doc FROM public.convay_entity_records r
    WHERE r.entity_key='bms.documents' AND r.record_id=p_document_id;
  IF v_doc.payload->>'approval_status'<>'Approved' THEN
    RAISE EXCEPTION 'Document SQL approval readback failed' USING ERRCODE='23514'; END IF;
  RETURN jsonb_build_object('document_id',p_document_id,'status','Approved',
    'auto_approved',true,'version_id',v_ver.record_id,'actor_id',v_actor);
END $fn$;
REVOKE ALL ON FUNCTION public.convay_superadmin_finalize_document(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.convay_superadmin_finalize_document(text) TO authenticated;


CREATE OR REPLACE FUNCTION public.convay_superadmin_finalize_minutes(p_minutes_id text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path TO ''
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_min public.convay_entity_records%ROWTYPE;
  v_status text;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.user_profiles p
    WHERE p.user_id=v_actor AND p.account_status='active' AND p.account_role='super_admin')
    OR NOT convay_private.has_permission('min_approve')
    OR NOT convay_private.has_permission('min_create') THEN
    RAISE EXCEPTION 'Active Super Admin minutes permission required'
      USING ERRCODE='42501'; END IF;
  IF p_minutes_id IS NULL OR LENGTH(p_minutes_id) NOT BETWEEN 1 AND 180 THEN
    RAISE EXCEPTION 'Invalid minutes identity' USING ERRCODE='22023'; END IF;
  SELECT * INTO v_min FROM public.convay_entity_records r
    WHERE r.entity_key='bms.minutes' AND r.record_id=p_minutes_id FOR UPDATE;
  IF NOT FOUND OR v_min.created_by IS DISTINCT FROM v_actor THEN
    RAISE EXCEPTION 'Only the Super Admin creator may finalize minutes'
      USING ERRCODE='42501'; END IF;
  IF v_min.payload->>'approval_status'='Approved' THEN
    RETURN jsonb_build_object('minutes_id',p_minutes_id,'status','Approved',
      'auto_approved',true,'idempotent',true);
  END IF;
  IF v_min.payload->>'approval_status'<>'Draft' THEN
    RAISE EXCEPTION 'Only newly authored Draft minutes may auto-complete review'
      USING ERRCODE='23514'; END IF;
  -- Keep every SQL-authenticated stage and server-created lifecycle/approver
  -- history. Signing remains a separate personal act, never automated.
  FOREACH v_status IN ARRAY ARRAY[
    'Under Secretary Review','Under Chairperson Review','Member Review','Approved'
  ] LOOP
    UPDATE public.convay_entity_records r
    SET payload=jsonb_set(r.payload,'{approval_status}',to_jsonb(v_status),true)
    WHERE r.entity_key='bms.minutes' AND r.record_id=p_minutes_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Minutes lifecycle transition not saved'
      USING ERRCODE='40001'; END IF;
  END LOOP;
  SELECT * INTO v_min FROM public.convay_entity_records r
    WHERE r.entity_key='bms.minutes' AND r.record_id=p_minutes_id;
  IF v_min.payload->>'approval_status'<>'Approved'
    OR v_min.payload->>'approved_by' IS DISTINCT FROM v_actor::text
    OR v_min.payload ? 'signed_at' THEN
    RAISE EXCEPTION 'Approved minutes SQL readback failed'
      USING ERRCODE='23514'; END IF;
  RETURN jsonb_build_object('minutes_id',p_minutes_id,'status','Approved',
    'auto_approved',true,'signed',false,'actor_id',v_actor);
END $fn$;
REVOKE ALL ON FUNCTION public.convay_superadmin_finalize_minutes(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.convay_superadmin_finalize_minutes(text) TO authenticated;
