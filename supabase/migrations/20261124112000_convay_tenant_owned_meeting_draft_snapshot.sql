-- TEN-MTG-01: independently secure tenant-owned meeting DRAFT lifecycle.
-- No scheduling, subscription activation, LiveKit access or legacy migration.
-- Each draft is tied to an immutable SQL-published company template version.
CREATE TABLE IF NOT EXISTS convay_private.tenant_meeting_draft_receipts (
  tenant_id uuid NOT NULL REFERENCES convay_private.tenants(id) ON DELETE RESTRICT,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  intent jsonb NOT NULL,
  receipt jsonb NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id,actor_id,request_id)
);
ALTER TABLE convay_private.tenant_meeting_draft_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON convay_private.tenant_meeting_draft_receipts FROM PUBLIC,anon,authenticated;

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
  v_draft public.convay_entity_records%ROWTYPE;
  v_has_field boolean;
  v_field_count integer := 0;
BEGIN
  IF v_actor IS NULL OR p_tenant_id IS NULL
     OR p_action NOT IN ('list','read','create')
     OR NOT convay_private.tenant_member_active(p_tenant_id) THEN
    RAISE EXCEPTION 'Active company membership required'
      USING ERRCODE='42501';
  END IF;
  SELECT m.membership_role INTO v_tenant_role
  FROM convay_private.tenant_memberships m
  WHERE m.tenant_id=p_tenant_id AND m.user_id=v_actor
    AND m.membership_state='active' AND m.revoked_at IS NULL;
  IF v_tenant_role IS NULL
     OR (v_tenant_role<>'tenant_admin'
         AND NOT convay_private.has_permission('mtg_create')) THEN
    RAISE EXCEPTION 'Company meeting draft permission denied'
      USING ERRCODE='42501';
  END IF;
  IF p_action='list' THEN
    RETURN pg_catalog.jsonb_build_object('tenant_id',p_tenant_id,'drafts',COALESCE((
      SELECT pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'meeting_id',m.record_id,
        'title',m.payload->>'meeting_title',
        'template_id',m.payload->>'template_id',
        'template_revision',(m.payload->>'template_revision')::integer,
        'status',m.payload->>'approval_status',
        'created_at',m.payload->>'created_at'
      ) ORDER BY m.created_at DESC)
      FROM (
        SELECT * FROM public.convay_entity_records x
        WHERE x.entity_key='bms.meetings' AND x.tenant_id=p_tenant_id
          AND x.payload->>'draft_origin'='company_template'
          AND x.payload->>'approval_status'='Draft'
        ORDER BY x.created_at DESC LIMIT 100
      ) m
    ),'[]'::jsonb),'meeting_activation_enabled',false);
  END IF;
  IF p_action='read' THEN
    v_record_id:=NULLIF(pg_catalog.btrim(p_payload->>'meeting_id'),'');
    SELECT * INTO v_draft FROM public.convay_entity_records m
    WHERE m.entity_key='bms.meetings'
      AND m.record_id=v_record_id AND m.tenant_id=p_tenant_id
      AND m.payload->>'draft_origin'='company_template'
      AND m.payload->>'approval_status'='Draft';
    IF NOT FOUND THEN RAISE EXCEPTION 'Company meeting draft not found' USING ERRCODE='P0002'; END IF;
    RETURN pg_catalog.jsonb_build_object('tenant_id',p_tenant_id,
      'draft',v_draft.payload,'meeting_activation_enabled',false);
  END IF;
  IF p_payload IS NULL OR pg_catalog.jsonb_typeof(p_payload)<>'object' THEN
    RAISE EXCEPTION 'Meeting draft payload must be an object' USING ERRCODE='22023';
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
          OR NOT (v_field->'options') ? (v_value#>>'{}') THEN
          RAISE EXCEPTION 'Invalid selected option: %',v_field_id USING ERRCODE='22023';
        END IF;
      ELSIF v_field_type='multiselect' THEN
        IF pg_catalog.jsonb_typeof(v_value)<>'array'
          OR pg_catalog.jsonb_array_length(v_value)>30 THEN
          RAISE EXCEPTION 'Invalid multi-select field: %',v_field_id USING ERRCODE='22023';
        END IF;
        FOR v_option IN SELECT value FROM pg_catalog.jsonb_array_elements(v_value) LOOP
          IF pg_catalog.jsonb_typeof(v_option)<>'string'
             OR NOT (v_field->'options') ? (v_option#>>'{}') THEN
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

  v_record_id:='MTG-'||pg_catalog.to_char(pg_catalog.now(),'YYYY')
    ||'-'||pg_catalog.upper(pg_catalog.left(pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-',''),16));
  INSERT INTO public.convay_entity_records(entity_key,record_id,tenant_id,payload)
  VALUES ('bms.meetings',v_record_id,p_tenant_id,
    pg_catalog.jsonb_build_object(
      'id',v_record_id,'meeting_id',v_record_id,'meeting_title',v_title,
      'meeting_type',v_catalog.title,'approval_status','Draft',
      'readiness','In Preparation','draft_origin','company_template',
      'template_id',v_template_id,'template_revision',v_revision,
      'template_snapshot',v_definition,'template_values',v_values,
      'created_by',v_actor,'created_at',pg_catalog.clock_timestamp(),
      'updated_at',pg_catalog.clock_timestamp()
    ));
  SELECT * INTO v_draft FROM public.convay_entity_records m
  WHERE m.entity_key='bms.meetings' AND m.record_id=v_record_id
    AND m.tenant_id=p_tenant_id;
  IF NOT FOUND OR v_draft.payload->>'template_id' IS DISTINCT FROM v_template_id::text
    OR (v_draft.payload->>'template_revision')::integer IS DISTINCT FROM v_revision
    OR v_draft.payload->'template_snapshot' IS DISTINCT FROM v_definition THEN
    RAISE EXCEPTION 'SQL meeting draft readback mismatch' USING ERRCODE='P0002';
  END IF;
  v_receipt:=pg_catalog.jsonb_build_object(
    'tenant_id',p_tenant_id,'meeting_id',v_record_id,
    'template_id',v_template_id,'template_revision',v_revision,
    'request_id',v_request_id,'status','Draft','meeting_activation_enabled',false);
  INSERT INTO convay_private.tenant_meeting_draft_receipts(
    tenant_id,actor_id,request_id,intent,receipt
  ) VALUES (p_tenant_id,v_actor,v_request_id,v_intent,v_receipt);
  RETURN v_receipt;
END $fn$;
REVOKE ALL ON FUNCTION public.convay_company_meeting_drafts(text,uuid,jsonb)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.convay_company_meeting_drafts(text,uuid,jsonb)
  TO authenticated;
