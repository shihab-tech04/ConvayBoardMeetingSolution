-- ISOLATED TEST ONLY. Restores known vulnerable baseline; do not expose in production.
-- Original exact definitions bundled for reproduction.
-- Least-privilege member directory. The public RPC exposes only permitted data.
-- Contact and employee identifiers are private to their owner or to user administrators.
-- No service-role credentials or user metadata are trusted for access decisions.
create or replace function public.convay_member_directory()
returns table (
 user_id uuid,
 display_name text,
 email text,
 phone text,
 employee_id text,
 user_type text,
 role_ids uuid[],
 role_names text[]
)
language plpgsql stable security definer set search_path='' as $directory$
declare
  v_actor uuid := (select auth.uid());
  v_can_admin_users boolean;
begin
  if v_actor is null or not exists (
    select 1 from public.user_profiles p
    where p.user_id=v_actor and p.account_status='active'
  ) then
    raise exception 'Active sign-in required' using errcode='42501';
  end if;
  v_can_admin_users := convay_private.has_permission('admin_users');
  if not (
    v_can_admin_users
    or convay_private.has_permission('mtg_view')
    or convay_private.has_permission('mtg_create')
    or convay_private.has_permission('gov_org_view')
    or convay_private.has_permission('gov_group_view')
  ) then
    raise exception 'Member directory access denied' using errcode='42501';
  end if;

  return query
  select p.user_id,
         p.display_name,
         case when v_can_admin_users or p.user_id=v_actor then coalesce(p.email,'') else '' end,
         case when v_can_admin_users or p.user_id=v_actor then coalesce(p.phone,'') else '' end,
         case when v_can_admin_users or p.user_id=v_actor then coalesce(p.employee_id,'') else '' end,
         p.user_type,
         coalesce((select array_agg(r.id order by r.name)
           from public.convay_user_roles ur
           join public.convay_roles r on r.id=ur.role_id
           where ur.user_id=p.user_id and r.status='Active'),array[]::uuid[]),
         coalesce((select array_agg(r.name order by r.name)
           from public.convay_user_roles ur
           join public.convay_roles r on r.id=ur.role_id
           where ur.user_id=p.user_id and r.status='Active'),array[]::text[])
  from public.user_profiles p
  where p.account_status='active'
  order by p.display_name;
end
$directory$;
revoke all on function public.convay_member_directory() from public,anon;
grant execute on function public.convay_member_directory() to authenticated;

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
 v_receipt jsonb; v_event_id bigint;
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
 PERFORM pg_catalog.set_config('convay.gv04_actor',v_actor::text,true);
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
 PERFORM pg_catalog.set_config('convay.gv04_actor','',true);
 insert into convay_private.org_member_assignment_events(
    actor_id,request_id,member_id,previous_unit_id,new_unit_id,
    operation,reason,effective_date,designation,handover_user_id,revision
 ) values (
    v_actor,p_request_id,p_member_id,v_old,p_new_unit_id,
    p_operation,btrim(COALESCE(p_reason,'')),p_effective_date,
    nullif(btrim(COALESCE(p_position,'')),''),p_handover_user_id,v_revision
 ) returning event_id into v_event_id;
 v_receipt:=pg_catalog.jsonb_build_object(
    'member_id',p_member_id,'old_unit_id',v_old,'new_unit_id',p_new_unit_id,
    'operation',p_operation,'revision',v_revision,
    'effective_date',p_effective_date,'handover_user_id',p_handover_user_id,
    'audit_event_id','org-member-'||v_event_id::text,'request_id',p_request_id);
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

REVOKE ALL ON FUNCTION public.convay_assign_org_member(uuid,text,text,text,uuid,text,text,date,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convay_assign_org_member(uuid,text,text,text,uuid,text,text,date,uuid) TO authenticated;

