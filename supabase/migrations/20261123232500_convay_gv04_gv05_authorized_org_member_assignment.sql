-- GV-04/05: transactional legacy/global organization primary assignment.
-- Tenant-owned unit assignments deliberately remain denied until a tenant-
-- scoped user membership projection and its access contract are activated.
CREATE TABLE IF NOT EXISTS convay_private.org_member_assignment_receipts (
  actor_id uuid NOT NULL,
  request_id uuid NOT NULL,
  member_id uuid NOT NULL,
  old_unit_id text,
  new_unit_id text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('assign','transfer')),
  reason text,
  revision bigint NOT NULL,
  effective_date date NOT NULL,
  handover_user_id uuid,
  new_position text,
  receipt jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(actor_id,request_id)
);
ALTER TABLE convay_private.org_member_assignment_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON convay_private.org_member_assignment_receipts FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.convay_org_member_directory()
RETURNS TABLE(user_id uuid,primary_org_unit_id text,branch_id text,division_id text,
  department_id text,assignment_revision bigint, "position" text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $func$
BEGIN
  IF (SELECT auth.uid()) IS NULL OR NOT EXISTS(
      SELECT 1 FROM public.user_profiles p
      WHERE p.user_id=(SELECT auth.uid()) AND p.account_status='active'
    ) OR NOT (convay_private.has_permission('gov_org_view')
        OR convay_private.has_permission('gov_org_manage')
        OR convay_private.has_permission('admin_users')
    OR convay_private.has_permission('mtg_view')
    OR convay_private.has_permission('mtg_create')
    OR convay_private.has_permission('gov_group_view')) THEN
    RAISE EXCEPTION 'Authorized organization directory access required' USING ERRCODE='42501';
  END IF;
  -- Only legacy/global profiles may be projected; never return tenant-scoped
  -- assignments through a cross-tenant global member directory.
  RETURN QUERY
  SELECT p.user_id,p.profile_data->>'primary_org_unit_id',
    p.profile_data->>'branch_id',p.profile_data->>'division_id',
    p.profile_data->>'department_id',
    COALESCE(NULLIF(p.profile_data->>'org_assignment_revision','')::bigint,0),
    p.profile_data->>'position'
  FROM public.user_profiles p
  WHERE p.account_status='active'
    AND NOT EXISTS (
      SELECT 1 FROM convay_private.tenant_memberships m
      WHERE m.user_id=p.user_id AND m.membership_state='active'
    );
END
$func$;
REVOKE ALL ON FUNCTION public.convay_org_member_directory() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convay_org_member_directory() TO authenticated;

CREATE OR REPLACE FUNCTION public.convay_assign_org_member(
  p_member_id uuid,
  p_expected_unit_id text,
  p_new_unit_id text,
  p_operation text,
  p_request_id uuid,
  p_reason text DEFAULT NULL,
  p_position text DEFAULT NULL,
  p_effective_date date DEFAULT CURRENT_DATE,
  p_handover_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $func$
DECLARE
 v_actor uuid := (SELECT auth.uid());
 v_profile public.user_profiles%ROWTYPE;
 v_target public.convay_entity_records%ROWTYPE;
 v_original public.convay_entity_records%ROWTYPE;
 v_prior convay_private.org_member_assignment_receipts%ROWTYPE;
 v_old text;
 v_revision bigint;
 v_branch text; v_division text; v_department text;
 v_receipt jsonb;
BEGIN
 IF v_actor IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.user_profiles p
   WHERE p.user_id=v_actor AND p.account_status='active'
 ) OR NOT convay_private.has_permission('gov_org_manage') THEN
   RAISE EXCEPTION 'Authorized governance administrator required' USING ERRCODE='42501';
 END IF;
 IF p_member_id IS NULL OR p_request_id IS NULL OR p_operation NOT IN ('assign','transfer')
    OR p_new_unit_id IS NULL OR length(p_new_unit_id) NOT BETWEEN 1 AND 180
    OR length(COALESCE(p_expected_unit_id,'')) > 180
    OR length(COALESCE(p_reason,'')) > 1000
    OR length(COALESCE(p_position,'')) > 100
    OR p_effective_date IS NULL OR p_effective_date > CURRENT_DATE THEN
   RAISE EXCEPTION 'Invalid organization assignment request' USING ERRCODE='22023';
 END IF;
 IF p_position IS NOT NULL AND btrim(p_position)<>'' AND
    NOT convay_private.has_permission('admin_users') THEN
   RAISE EXCEPTION 'Only authorized User Management may change designation' USING ERRCODE='42501';
 END IF;
 IF p_operation='transfer' AND length(btrim(COALESCE(p_reason,'')))<3 THEN
   RAISE EXCEPTION 'A transfer reason is required' USING ERRCODE='22023';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('convay-org-member-'||p_member_id::text));
 SELECT * INTO v_prior FROM convay_private.org_member_assignment_receipts
  WHERE actor_id=v_actor AND request_id=p_request_id;
 IF FOUND THEN
   IF v_prior.member_id<>p_member_id OR v_prior.operation<>p_operation
      OR v_prior.old_unit_id IS DISTINCT FROM NULLIF(p_expected_unit_id,'')
      OR v_prior.new_unit_id<>p_new_unit_id
      OR COALESCE(v_prior.reason,'')<>btrim(COALESCE(p_reason,''))
      OR v_prior.effective_date<>p_effective_date
      OR v_prior.handover_user_id IS DISTINCT FROM p_handover_user_id
      OR COALESCE(v_prior.new_position,'')<>btrim(COALESCE(p_position,'')) THEN
     RAISE EXCEPTION 'Request ID reused for a different assignment' USING ERRCODE='23505';
   END IF;
   RETURN v_prior.receipt;
 END IF;
 SELECT * INTO v_profile FROM public.user_profiles
  WHERE user_id=p_member_id AND account_status='active' FOR UPDATE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Active member unavailable' USING ERRCODE='P0002';
 END IF;
 -- A global profile cannot be modified if any tenant membership currently
 -- owns it; tenant-scoped assignments require a separate tenant context.
 IF EXISTS(
   SELECT 1 FROM convay_private.tenant_memberships
   WHERE user_id=p_member_id AND membership_state='active'
 ) THEN
   RAISE EXCEPTION 'Tenant membership requires tenant-scoped assignment flow' USING ERRCODE='42501';
 END IF;
 v_old := NULLIF(v_profile.profile_data->>'primary_org_unit_id','');
 IF v_old IS DISTINCT FROM NULLIF(p_expected_unit_id,'') THEN
   RAISE EXCEPTION 'Member assignment has changed; refresh and retry' USING ERRCODE='40001';
 END IF;
 IF p_operation='assign' AND v_old IS NOT NULL THEN
   RAISE EXCEPTION 'Member already has a primary unit; use Transfer' USING ERRCODE='23514';
 END IF;
 IF p_operation='transfer' AND v_old IS NULL THEN
   RAISE EXCEPTION 'Member has no primary unit to transfer' USING ERRCODE='23514';
 END IF;
 IF v_old IS NOT DISTINCT FROM p_new_unit_id THEN
   RAISE EXCEPTION 'The member is already in this unit' USING ERRCODE='23514';
 END IF;
 SELECT * INTO v_target FROM public.convay_entity_records
 WHERE entity_key='bms.orgunits' AND record_id=p_new_unit_id FOR SHARE;
 IF NOT FOUND OR v_target.tenant_id IS NOT NULL
    OR v_target.payload->>'id' IS DISTINCT FROM p_new_unit_id
    OR lower(COALESCE(v_target.payload->>'status',''))<>'active' THEN
   RAISE EXCEPTION 'An active, authorized global organization unit is required' USING ERRCODE='42501';
 END IF;
 IF p_handover_user_id IS NOT NULL AND (p_handover_user_id=p_member_id OR
    NOT EXISTS(SELECT 1 FROM public.user_profiles p
               WHERE p.user_id=p_handover_user_id AND p.account_status='active'
               AND NOT EXISTS(SELECT 1 FROM convay_private.tenant_memberships m
                   WHERE m.user_id=p_handover_user_id AND m.membership_state='active'))) THEN
   RAISE EXCEPTION 'An active, distinct legacy handover user is required' USING ERRCODE='23514';
 END IF;
 IF v_old IS NOT NULL THEN
   SELECT * INTO v_original FROM public.convay_entity_records
   WHERE entity_key='bms.orgunits' AND record_id=v_old FOR SHARE;
   IF NOT FOUND OR v_original.tenant_id IS NOT NULL THEN
     RAISE EXCEPTION 'Previous unit needs authorized reconciliation' USING ERRCODE='42501';
   END IF;
 END IF;
 -- Derive every branch/division/department projection from SQL ancestor
 -- relationships rather than trusting client-provided path IDs.
 WITH RECURSIVE lineage(id,parent_id,unit_type,seen) AS (
   SELECT r.record_id,NULLIF(r.payload->>'parent_unit_id',''),
     r.payload->>'unit_type',ARRAY[r.record_id]::text[]
   FROM public.convay_entity_records r
   WHERE r.entity_key='bms.orgunits' AND r.record_id=p_new_unit_id AND r.tenant_id IS NULL
   UNION ALL
   SELECT r.record_id,NULLIF(r.payload->>'parent_unit_id',''),
     r.payload->>'unit_type',lineage.seen||r.record_id
   FROM lineage JOIN public.convay_entity_records r
     ON r.entity_key='bms.orgunits' AND r.record_id=lineage.parent_id
   WHERE r.tenant_id IS NULL AND NOT r.record_id=ANY(lineage.seen)
     AND cardinality(lineage.seen)<100
 )
 SELECT max(id) FILTER(WHERE unit_type='Branch'),
        max(id) FILTER(WHERE unit_type='Division'),
        max(id) FILTER(WHERE unit_type='Department')
 INTO v_branch,v_division,v_department FROM lineage;
 IF v_target.payload->>'unit_type'='Branch' THEN v_branch:=p_new_unit_id; END IF;
 IF v_target.payload->>'unit_type'='Division' THEN v_division:=p_new_unit_id; END IF;
 IF v_target.payload->>'unit_type'='Department' THEN v_department:=p_new_unit_id; END IF;
 v_revision:=COALESCE(NULLIF(v_profile.profile_data->>'org_assignment_revision','')::bigint,0)+1;
 UPDATE public.user_profiles SET
   profile_data=(v_profile.profile_data - 'primary_org_unit_id' - 'branch_id'
     - 'division_id' - 'department_id' - 'org_assignment_revision')
     || pg_catalog.jsonb_build_object(
       'primary_org_unit_id',p_new_unit_id,
       'org_assignment_revision',v_revision)
     || CASE WHEN v_branch IS NULL THEN '{}'::jsonb
         ELSE pg_catalog.jsonb_build_object('branch_id',v_branch) END
     || CASE WHEN v_division IS NULL THEN '{}'::jsonb
         ELSE pg_catalog.jsonb_build_object('division_id',v_division) END
     || CASE WHEN v_department IS NULL THEN '{}'::jsonb
         ELSE pg_catalog.jsonb_build_object('department_id',v_department) END
     || CASE WHEN p_position IS NULL OR btrim(p_position)='' THEN '{}'::jsonb
         ELSE pg_catalog.jsonb_build_object('position',btrim(p_position)) END,
   updated_at=pg_catalog.now()
 WHERE user_id=p_member_id;
 v_receipt:=pg_catalog.jsonb_build_object(
    'member_id',p_member_id,'old_unit_id',v_old,'new_unit_id',p_new_unit_id,
    'operation',p_operation,'revision',v_revision,
    'effective_date',p_effective_date,'handover_user_id',p_handover_user_id,
    'audit_event_id','org-member-'||p_request_id::text,'request_id',p_request_id);
 INSERT INTO convay_private.org_member_assignment_receipts(
    actor_id,request_id,member_id,old_unit_id,new_unit_id,operation,reason,revision,
    effective_date,handover_user_id,new_position,receipt
 ) VALUES(
    v_actor,p_request_id,p_member_id,v_old,p_new_unit_id,
    p_operation,btrim(COALESCE(p_reason,'')),v_revision,
    p_effective_date,p_handover_user_id,btrim(COALESCE(p_position,'')),v_receipt);
 RETURN v_receipt;
END
$func$;
REVOKE ALL ON FUNCTION public.convay_assign_org_member(uuid,text,text,text,uuid,text,text,date,uuid)
 FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convay_assign_org_member(uuid,text,text,text,uuid,text,text,date,uuid)
 TO authenticated;

-- GV-03: a client-supplied acknowledgement is never deactivation evidence.
-- This data invariant also applies to direct registry UPDATEs and races.
CREATE OR REPLACE FUNCTION convay_private.guard_org_unit_deactivation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $func$
DECLARE v_unit_id text;
BEGIN
 IF NEW.entity_key<>'bms.orgunits' OR NEW.payload->>'status' IS DISTINCT FROM 'Deactivated'
   OR OLD.payload->>'status'='Deactivated' THEN
   RETURN NEW;
 END IF;
 v_unit_id:=OLD.record_id;
 IF NEW.record_id IS DISTINCT FROM v_unit_id OR
    NEW.payload->>'id' IS DISTINCT FROM v_unit_id THEN
   RAISE EXCEPTION 'Unit identity mismatch' USING ERRCODE='23514';
 END IF;
 IF EXISTS(SELECT 1 FROM public.user_profiles p
           WHERE p.account_status='active'
             AND p.profile_data->>'primary_org_unit_id'=v_unit_id)
    OR EXISTS(SELECT 1 FROM public.convay_entity_records c
              WHERE c.entity_key='bms.orgunits'
                AND c.payload->>'parent_unit_id'=v_unit_id)
    OR EXISTS(SELECT 1 FROM public.convay_entity_records h
              WHERE h.entity_key='bms.unitheads'
                AND h.payload->>'unit_id'=v_unit_id
                AND lower(COALESCE(h.payload->>'status',''))='active')
    OR NULLIF(NEW.payload->>'head_user_id','') IS NOT NULL
    OR NULLIF(NEW.payload->>'deputy_user_id','') IS NOT NULL THEN
   RAISE EXCEPTION 'Resolve real unit members, child units and leadership before deactivation'
     USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END
$func$;
REVOKE ALL ON FUNCTION convay_private.guard_org_unit_deactivation() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS convay_guard_unit_deactivation ON public.convay_entity_records;
CREATE TRIGGER convay_guard_unit_deactivation
BEFORE UPDATE OF payload ON public.convay_entity_records
FOR EACH ROW EXECUTE FUNCTION convay_private.guard_org_unit_deactivation();
