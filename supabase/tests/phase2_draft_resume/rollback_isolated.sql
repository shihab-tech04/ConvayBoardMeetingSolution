-- Compatibility rollback: preserve the additive column, drafts, receipts and audit. No DROP or data deletion.
-- Disable progress capability; reject cached progress writes and protect saved progress rows.
CREATE OR REPLACE FUNCTION public.convay_company_meeting_drafts(
  p_action text, p_tenant_id uuid, p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
  v_actor uuid := auth.uid();
  v_tenant_role text;
  v_catalog convay_private.meeting_template_catalog%ROWTYPE;
  v_definition jsonb;
  v_values jsonb;
  v_field jsonb;
  v_step jsonb;
  v_field_id text;
  v_field_type text;
  v_value jsonb;
  v_option jsonb;
  v_key text;
  v_title text;
  v_revision integer;
  v_request_id uuid;
  v_template_id uuid;
  v_record_id text;
  v_intent jsonb;
  v_receipt jsonb;
  v_existing convay_private.tenant_meeting_draft_receipts%ROWTYPE;
  v_draft convay_private.company_meeting_draft_staging%ROWTYPE;
  v_has_field boolean;
  v_field_count integer := 0;
BEGIN
  IF v_actor IS NULL OR p_tenant_id IS NULL
     OR coalesce(p_action,'') NOT IN ('list','read','create') THEN
    RAISE EXCEPTION 'Verified company administration required' USING ERRCODE='42501';
  END IF;
  -- No implicit platform root bypass: every actor needs their own active,
  -- currently verified administrator membership in the exact company.
  SELECT m.membership_role INTO v_tenant_role
  FROM convay_private.tenant_memberships m
  JOIN convay_private.tenants t ON t.id=m.tenant_id
  JOIN public.user_profiles p ON p.user_id=m.user_id
  WHERE m.tenant_id=p_tenant_id AND m.user_id=v_actor
    AND m.membership_role='tenant_admin'
    AND m.membership_state='active' AND m.revoked_at IS NULL
    AND t.lifecycle_state IN ('provisioning','active')
    AND p.account_status='active'
  FOR SHARE OF m,t,p NOWAIT;
  IF v_tenant_role IS DISTINCT FROM 'tenant_admin' THEN
    RAISE EXCEPTION 'Active company Super Admin membership required'
      USING ERRCODE='42501';
  END IF;
  IF p_action='list' THEN
    RETURN pg_catalog.jsonb_build_object('tenant_id',p_tenant_id,'drafts',COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'draft_id',m.draft_id,
        'title',m.title,
        'template_id',m.template_id,
        'template_revision',m.template_revision,
        'status','Staged Draft',
        'created_at',m.created_at
      ) ORDER BY m.created_at DESC)
      FROM (
        SELECT * FROM convay_private.company_meeting_draft_staging x
        WHERE x.tenant_id=p_tenant_id
        ORDER BY x.created_at DESC LIMIT 100
      ) m
    ),'[]'::jsonb),'meeting_activation_enabled',false);
  END IF;
  IF p_action='read' THEN
    v_record_id:=NULLIF(pg_catalog.btrim(p_payload->>'draft_id'),'');
    SELECT * INTO v_draft FROM convay_private.company_meeting_draft_staging m
    WHERE m.draft_id=v_record_id AND m.tenant_id=p_tenant_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Company meeting staging draft not found' USING ERRCODE='P0002'; END IF;
    RETURN pg_catalog.jsonb_build_object('tenant_id',p_tenant_id,
      'draft',pg_catalog.jsonb_build_object(
        'draft_id',v_draft.draft_id,'title',v_draft.title,
        'template_id',v_draft.template_id,'template_revision',v_draft.template_revision,
        'definition',v_draft.definition,'values',v_draft.values_json,
        'created_at',v_draft.created_at,'status','Staged Draft'),
      'meeting_activation_enabled',false);
  END IF;
  IF p_payload IS NULL OR pg_catalog.jsonb_typeof(p_payload)<>'object' THEN
    RAISE EXCEPTION 'Meeting draft payload must be an object' USING ERRCODE='22023';
  END IF;
  IF p_payload ? 'wizard_step_id' OR p_payload ? 'partial_save' THEN
    RAISE EXCEPTION 'Draft progress temporarily unavailable' USING ERRCODE='55000';
  END IF;
  v_request_id:=(p_payload->>'request_id')::uuid;
  v_template_id:=(p_payload->>'template_id')::uuid;
  v_revision:=(p_payload->>'template_revision')::integer;
  v_title:=pg_catalog.btrim(COALESCE(p_payload->>'meeting_title',''));
  v_values:=p_payload->'values';
  IF v_request_id IS NULL OR v_template_id IS NULL OR v_revision IS NULL
    OR v_revision<1 OR pg_catalog.length(v_title) NOT BETWEEN 3 AND 160
    OR pg_catalog.jsonb_typeof(v_values) IS DISTINCT FROM 'object'
    OR pg_catalog.octet_length(v_values::text)>65536
    OR (SELECT COUNT(*) FROM pg_catalog.jsonb_object_keys(v_values))>600 THEN
    RAISE EXCEPTION 'Invalid company meeting draft request' USING ERRCODE='22023';
  END IF;

  -- Serialized idempotency, not a client-supplied meeting identity.
  v_intent:=pg_catalog.jsonb_build_object(
    'template_id',v_template_id,'revision',v_revision,'title',v_title,'values',v_values);
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('convay-company-meeting-draft:'||v_actor||':'||v_request_id));
  SELECT * INTO v_existing FROM convay_private.tenant_meeting_draft_receipts r
    WHERE r.tenant_id=p_tenant_id AND r.actor_id=v_actor
      AND r.request_id=v_request_id;
  IF FOUND THEN
    IF v_existing.intent IS DISTINCT FROM v_intent THEN
      RAISE EXCEPTION 'Draft request ID reused with changed input' USING ERRCODE='23505';
    END IF;
    RETURN v_existing.receipt;
  END IF;

  SELECT * INTO v_catalog FROM convay_private.meeting_template_catalog c
  WHERE c.id=v_template_id AND c.tenant_id=p_tenant_id
    AND c.published_revision=v_revision;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A published template in the same company is required'
      USING ERRCODE='42501';
  END IF;
  SELECT v.definition INTO v_definition
    FROM convay_private.meeting_template_versions v
    WHERE v.template_id=v_template_id AND v.revision=v_revision
      AND v.state='published';
  IF NOT FOUND OR pg_catalog.jsonb_typeof(v_definition->'steps')<>'array' THEN
    RAISE EXCEPTION 'Published template version is unavailable' USING ERRCODE='P0002';
  END IF;

  -- Validate against the actual immutable SQL definition; never trust the
  -- browser to provide permitted fields, options, types or requiredness.
  FOR v_step IN SELECT value FROM pg_catalog.jsonb_array_elements(v_definition->'steps') LOOP
    FOR v_field IN SELECT value FROM pg_catalog.jsonb_array_elements(v_step->'fields') LOOP
      v_field_count:=v_field_count+1;
      v_field_id:=v_field->>'id';
      v_field_type:=v_field->>'type';
      v_value:=v_values->v_field_id;
      IF COALESCE((v_field->>'required')::boolean,false)
        AND (v_value IS NULL OR v_value='null'::jsonb
          OR v_value='""'::jsonb OR v_value='[]'::jsonb) THEN
        RAISE EXCEPTION 'Required template field not supplied: %',v_field_id
          USING ERRCODE='23514';
      END IF;
      IF v_value IS NULL OR v_value='null'::jsonb THEN CONTINUE; END IF;
      IF v_field_type IN ('text','textarea','date','datetime','meeting_room','resolution') THEN
        IF pg_catalog.jsonb_typeof(v_value)<>'string'
          OR pg_catalog.length(v_value#>>'{}')>5000 THEN
          RAISE EXCEPTION 'Invalid text field: %',v_field_id USING ERRCODE='22023';
        END IF;
      ELSIF v_field_type IN ('number','duration','quorum') THEN
        IF pg_catalog.jsonb_typeof(v_value)<>'number'
          OR pg_catalog.abs((v_value#>>'{}')::numeric)>1000000000000 THEN
          RAISE EXCEPTION 'Invalid numeric field: %',v_field_id USING ERRCODE='22023';
        END IF;
      ELSIF v_field_type='select' THEN
        IF pg_catalog.jsonb_typeof(v_value)<>'string'
          OR NOT COALESCE((v_field->'options') ? (v_value#>>'{}'),false) THEN
          RAISE EXCEPTION 'Invalid selected option: %',v_field_id USING ERRCODE='22023';
        END IF;
      ELSIF v_field_type='multiselect' THEN
        IF pg_catalog.jsonb_typeof(v_value)<>'array'
          OR pg_catalog.jsonb_array_length(v_value)>30 THEN
          RAISE EXCEPTION 'Invalid multi-select field: %',v_field_id USING ERRCODE='22023';
        END IF;
        FOR v_option IN SELECT value FROM pg_catalog.jsonb_array_elements(v_value) LOOP
          IF pg_catalog.jsonb_typeof(v_option)<>'string'
             OR NOT COALESCE((v_field->'options') ? (v_option#>>'{}'),false) THEN
            RAISE EXCEPTION 'Invalid multi-select option: %',v_field_id USING ERRCODE='22023';
          END IF;
        END LOOP;
      ELSIF v_field_type='checkbox' THEN
        IF pg_catalog.jsonb_typeof(v_value)<>'boolean' THEN
          RAISE EXCEPTION 'Invalid checkbox field: %',v_field_id USING ERRCODE='22023';
        END IF;
      ELSE
        -- Linked documents, participants and agendas require their separate
        -- authoritative SQL relationships. Never accept plain text stand-ins.
        RAISE EXCEPTION 'Linked field type requires certified integration: %',v_field_type
          USING ERRCODE='23514';
      END IF;
    END LOOP;
  END LOOP;
  IF v_field_count>600 THEN
    RAISE EXCEPTION 'Template has too many fields' USING ERRCODE='22023';
  END IF;
  FOR v_key IN SELECT key FROM pg_catalog.jsonb_each(v_values) LOOP
    SELECT EXISTS(
      SELECT 1 FROM pg_catalog.jsonb_array_elements(v_definition->'steps') st,
        LATERAL pg_catalog.jsonb_array_elements(st.value->'fields') fld
      WHERE fld.value->>'id'=v_key
    ) INTO v_has_field;
    IF NOT v_has_field THEN
      RAISE EXCEPTION 'Unknown meeting template field: %',v_key USING ERRCODE='22023';
    END IF;
  END LOOP;

  v_record_id:='DRAFT-'||pg_catalog.upper(pg_catalog.left(
    pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-',''),20));
  INSERT INTO convay_private.company_meeting_draft_staging(
    draft_id,tenant_id,template_id,template_revision,title,definition,values_json,created_by)
  VALUES (v_record_id,p_tenant_id,v_template_id,v_revision,v_title,v_definition,v_values,v_actor);
  SELECT * INTO v_draft FROM convay_private.company_meeting_draft_staging m
  WHERE m.draft_id=v_record_id AND m.tenant_id=p_tenant_id;
  IF NOT FOUND OR v_draft.template_id IS DISTINCT FROM v_template_id
    OR v_draft.template_revision IS DISTINCT FROM v_revision
    OR v_draft.definition IS DISTINCT FROM v_definition
    OR v_draft.values_json IS DISTINCT FROM v_values THEN
    RAISE EXCEPTION 'SQL staged meeting draft readback mismatch' USING ERRCODE='P0002';
  END IF;
  v_receipt:=pg_catalog.jsonb_build_object(
    'tenant_id',p_tenant_id,'draft_id',v_record_id,
    'template_id',v_template_id,'template_revision',v_revision,
    'request_id',v_request_id,'status','Staged Draft','meeting_activation_enabled',false);
  INSERT INTO convay_private.tenant_meeting_draft_receipts(
    tenant_id,actor_id,request_id,intent,receipt
  ) VALUES (p_tenant_id,v_actor,v_request_id,v_intent,v_receipt);
  RETURN v_receipt;
END $fn$;
REVOKE ALL ON FUNCTION public.convay_company_meeting_drafts(text,uuid,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.convay_company_meeting_drafts(text,uuid,jsonb)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.convay_company_draft_lifecycle(
 p_action text, p_tenant_id uuid, p_payload jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 v_actor uuid := auth.uid();
 v_draft convay_private.company_meeting_draft_staging%ROWTYPE;
 v_prior convay_private.tenant_meeting_draft_receipts%ROWTYPE;
 v_id text;
 v_expected integer;
 v_request uuid;
 v_title text;
 v_values jsonb;
 v_intent jsonb;
 v_receipt jsonb;
 v_field jsonb;
 v_step jsonb;
 v_value jsonb;
 v_option jsonb;
 v_field_id text;
 v_type text;
 v_key text;
 v_fields integer := 0;
 v_audit_id bigint;
 v_found boolean;
BEGIN
 IF v_actor IS NULL OR p_tenant_id IS NULL OR
    coalesce(p_action,'') NOT IN ('list','read','update','discard') THEN
   RAISE EXCEPTION 'A verified company draft action is required' USING ERRCODE='42501';
 END IF;
 -- Never accept a client-declared company role. A platform root user must
 -- also have explicit current membership in the exact company.
 -- Serialize authority with membership revocation, company suspension and
 -- profile status writers. NOWAIT is a retryable fail-closed boundary.
 PERFORM 1 FROM convay_private.tenant_memberships m
   JOIN convay_private.tenants t ON t.id=m.tenant_id
   JOIN public.user_profiles p ON p.user_id=m.user_id
   WHERE m.user_id=v_actor AND m.tenant_id=p_tenant_id
     AND m.membership_role='tenant_admin'
     AND m.membership_state='active' AND m.revoked_at IS NULL
     AND p.account_status='active'
     AND t.lifecycle_state IN ('provisioning','active')
 FOR SHARE OF m,t,p NOWAIT;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Active company Super Admin membership required' USING ERRCODE='42501';
 END IF;
 IF p_action='list' THEN
   RETURN pg_catalog.jsonb_build_object(
     'tenant_id',p_tenant_id,'meeting_activation_enabled',false,
     'drafts',COALESCE((
       SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
         'draft_id',q.draft_id,'title',q.title,'template_id',q.template_id,
         'template_revision',q.template_revision,'status','Staged Draft',
         'created_at',q.created_at,'updated_at',q.updated_at,
         'edit_revision',q.edit_revision
       ) ORDER BY q.updated_at DESC) FROM (
         SELECT * FROM convay_private.company_meeting_draft_staging d
         WHERE d.tenant_id=p_tenant_id ORDER BY d.updated_at DESC LIMIT 100
       ) q
     ),'[]'::jsonb)
   );
 END IF;
 IF p_payload IS NULL OR pg_catalog.jsonb_typeof(p_payload)<>'object' THEN
   RAISE EXCEPTION 'A valid staged draft request is required' USING ERRCODE='22023';
 END IF;
 v_id:=p_payload->>'draft_id';
 IF v_id IS NULL OR v_id !~ '^DRAFT-[A-F0-9]{20}$' THEN
   RAISE EXCEPTION 'A valid SQL staged draft ID is required' USING ERRCODE='22023';
 END IF;
 IF p_action='read' THEN
   SELECT * INTO v_draft FROM convay_private.company_meeting_draft_staging d
     WHERE d.tenant_id=p_tenant_id AND d.draft_id=v_id;
   IF NOT FOUND THEN RAISE EXCEPTION 'Staged company draft not found' USING ERRCODE='P0002'; END IF;
   RETURN pg_catalog.jsonb_build_object('tenant_id',p_tenant_id,
     'meeting_activation_enabled',false,'draft',pg_catalog.jsonb_build_object(
       'draft_id',v_draft.draft_id,'title',v_draft.title,
       'template_id',v_draft.template_id,'template_revision',v_draft.template_revision,
       'definition',v_draft.definition,'values',v_draft.values_json,
       'created_at',v_draft.created_at,'updated_at',v_draft.updated_at,
       'edit_revision',v_draft.edit_revision,'status','Staged Draft'));
 END IF;
 IF p_payload ? 'wizard_step_id' OR p_payload ? 'partial_save' OR EXISTS (
   SELECT 1 FROM convay_private.company_meeting_draft_staging d
   WHERE d.tenant_id=p_tenant_id AND d.draft_id=v_id AND d.wizard_step_id IS NOT NULL
 ) THEN
   RAISE EXCEPTION 'Draft progress temporarily unavailable; saved data retained' USING ERRCODE='55000';
 END IF;
 v_request:=(p_payload->>'request_id')::uuid;
 v_expected:=(p_payload->>'expected_revision')::integer;
 IF v_request IS NULL OR v_expected IS NULL OR v_expected < 1 THEN
   RAISE EXCEPTION 'Draft request ID and revision are required' USING ERRCODE='22023';
 END IF;
 v_title:=pg_catalog.btrim(COALESCE(p_payload->>'meeting_title',''));
 v_values:=p_payload->'values';
 IF p_action='update' AND (
   pg_catalog.length(v_title) NOT BETWEEN 3 AND 160
   OR pg_catalog.jsonb_typeof(v_values) IS DISTINCT FROM 'object'
   OR pg_catalog.octet_length(v_values::text)>65536
   OR (SELECT count(*) FROM pg_catalog.jsonb_object_keys(v_values))>600
 ) THEN
   RAISE EXCEPTION 'Invalid revised company draft data' USING ERRCODE='22023';
 END IF;
 v_intent:=pg_catalog.jsonb_build_object(
   'action',p_action,'draft_id',v_id,'expected_revision',v_expected,
   'title',CASE WHEN p_action='update' THEN v_title ELSE NULL END,
   'values',CASE WHEN p_action='update' THEN v_values ELSE NULL END
 );
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtext('convay-company-draft-transition:'||v_actor||':'||v_request));
 SELECT * INTO v_prior FROM convay_private.tenant_meeting_draft_receipts r
   WHERE r.tenant_id=p_tenant_id AND r.actor_id=v_actor
      AND r.request_id=v_request FOR UPDATE;
 IF FOUND THEN
   IF v_prior.intent IS DISTINCT FROM v_intent THEN
     RAISE EXCEPTION 'Draft request ID reused with different intent'
       USING ERRCODE='23505';
   END IF;
   RETURN v_prior.receipt;
 END IF;
 SELECT * INTO v_draft FROM convay_private.company_meeting_draft_staging d
   WHERE d.tenant_id=p_tenant_id AND d.draft_id=v_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Staged company draft not found' USING ERRCODE='P0002'; END IF;
 IF v_draft.edit_revision<>v_expected THEN
   RAISE EXCEPTION 'Draft changed since you opened it. Reload the SQL snapshot.'
     USING ERRCODE='40001';
 END IF;
 IF p_action='update' THEN
   -- Validate only against the original immutable SQL-published snapshot.
   -- New template versions never silently change a saved draft.
   IF pg_catalog.jsonb_typeof(v_draft.definition->'steps') IS DISTINCT FROM 'array' THEN
     RAISE EXCEPTION 'Published template snapshot is invalid' USING ERRCODE='23514';
   END IF;
   FOR v_step IN SELECT value FROM pg_catalog.jsonb_array_elements(v_draft.definition->'steps') LOOP
     IF pg_catalog.jsonb_typeof(v_step->'fields') IS DISTINCT FROM 'array' THEN
       RAISE EXCEPTION 'Published template fields are invalid' USING ERRCODE='23514';
     END IF;
     FOR v_field IN SELECT value FROM pg_catalog.jsonb_array_elements(v_step->'fields') LOOP
       v_fields:=v_fields+1;
       IF v_fields>600 THEN RAISE EXCEPTION 'Template has too many fields' USING ERRCODE='22023'; END IF;
       v_field_id:=v_field->>'id';
       v_type:=v_field->>'type';
       v_value:=v_values->v_field_id;
       IF COALESCE((v_field->>'required')::boolean,false)
         AND (v_value IS NULL OR v_value='null'::jsonb
           OR v_value='""'::jsonb OR v_value='[]'::jsonb) THEN
         RAISE EXCEPTION 'Required template field not supplied: %',v_field_id
           USING ERRCODE='23514';
       END IF;
       IF v_value IS NULL OR v_value='null'::jsonb THEN CONTINUE; END IF;
       IF v_type IN ('text','textarea','date','datetime','meeting_room','resolution') THEN
         IF pg_catalog.jsonb_typeof(v_value)<>'string'
           OR pg_catalog.length(v_value#>>'{}')>5000 THEN
           RAISE EXCEPTION 'Invalid text field: %',v_field_id USING ERRCODE='22023';
         END IF;
       ELSIF v_type IN ('number','duration','quorum') THEN
         IF pg_catalog.jsonb_typeof(v_value)<>'number'
           OR pg_catalog.abs((v_value#>>'{}')::numeric)>1000000000000 THEN
           RAISE EXCEPTION 'Invalid numeric field: %',v_field_id USING ERRCODE='22023';
         END IF;
       ELSIF v_type='select' THEN
         IF pg_catalog.jsonb_typeof(v_value)<>'string'
           OR NOT COALESCE((v_field->'options') ? (v_value#>>'{}'),false) THEN
           RAISE EXCEPTION 'Invalid selected option: %',v_field_id USING ERRCODE='22023';
         END IF;
       ELSIF v_type='multiselect' THEN
         IF pg_catalog.jsonb_typeof(v_value)<>'array'
           OR pg_catalog.jsonb_array_length(v_value)>30 THEN
           RAISE EXCEPTION 'Invalid multi-select field: %',v_field_id USING ERRCODE='22023';
         END IF;
         FOR v_option IN SELECT value FROM pg_catalog.jsonb_array_elements(v_value) LOOP
           IF pg_catalog.jsonb_typeof(v_option)<>'string'
             OR NOT COALESCE((v_field->'options') ? (v_option#>>'{}'),false) THEN
             RAISE EXCEPTION 'Invalid multiselect option: %',v_field_id USING ERRCODE='22023';
           END IF;
         END LOOP;
       ELSIF v_type='checkbox' THEN
         IF pg_catalog.jsonb_typeof(v_value)<>'boolean' THEN
           RAISE EXCEPTION 'Invalid checkbox field: %',v_field_id USING ERRCODE='22023';
         END IF;
       ELSE
         RAISE EXCEPTION 'Linked field type requires certified integration: %',v_type
           USING ERRCODE='23514';
       END IF;
     END LOOP;
   END LOOP;
   FOR v_key IN SELECT key FROM pg_catalog.jsonb_each(v_values) LOOP
     SELECT EXISTS(
       SELECT 1 FROM pg_catalog.jsonb_array_elements(v_draft.definition->'steps') st,
         LATERAL pg_catalog.jsonb_array_elements(st.value->'fields') fld
       WHERE fld.value->>'id'=v_key
     ) INTO v_found;
     IF NOT v_found THEN
       RAISE EXCEPTION 'Unknown meeting template field: %',v_key USING ERRCODE='22023';
     END IF;
   END LOOP;
   UPDATE convay_private.company_meeting_draft_staging d
      SET title=v_title,values_json=v_values,edit_revision=d.edit_revision+1,
          updated_at=pg_catalog.clock_timestamp()
     WHERE d.tenant_id=p_tenant_id AND d.draft_id=v_id
     RETURNING * INTO v_draft;
 ELSE
   DELETE FROM convay_private.company_meeting_draft_staging d
     WHERE d.tenant_id=p_tenant_id AND d.draft_id=v_id;
 END IF;
 INSERT INTO convay_private.tenant_control_events(
   tenant_id,actor_id,request_id,action,target_user_id,details
 ) VALUES(p_tenant_id,v_actor,v_request,
   CASE WHEN p_action='update' THEN 'company_meeting_draft_updated'
        ELSE 'company_meeting_draft_discarded' END,NULL,
   pg_catalog.jsonb_build_object('draft_id',v_id,'template_id',v_draft.template_id,
     'template_revision',v_draft.template_revision,'revision',v_expected))
 RETURNING id INTO v_audit_id;
 v_receipt:=pg_catalog.jsonb_build_object('tenant_id',p_tenant_id,
   'draft_id',v_id,'template_id',v_draft.template_id,
   'template_revision',v_draft.template_revision,'request_id',v_request,
   'action',p_action,'audit_event_id',v_audit_id,
   'edit_revision',CASE WHEN p_action='update' THEN v_expected+1 ELSE v_expected END,
   'status',CASE WHEN p_action='update' THEN 'Staged Draft' ELSE 'Discarded' END,
   'meeting_activation_enabled',false);
 INSERT INTO convay_private.tenant_meeting_draft_receipts(
   tenant_id,actor_id,request_id,intent,receipt
 ) VALUES(p_tenant_id,v_actor,v_request,v_intent,v_receipt);
 RETURN v_receipt;
END $fn$;
REVOKE ALL ON FUNCTION public.convay_company_draft_lifecycle(text,uuid,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.convay_company_draft_lifecycle(text,uuid,jsonb)
  TO authenticated;
