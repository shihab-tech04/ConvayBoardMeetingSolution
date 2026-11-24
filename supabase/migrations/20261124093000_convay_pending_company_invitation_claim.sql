-- TEN-ONB-03: platform-admin company assignment for a pending verified-email invitation.
-- Does not activate the tenant, tenant-owned meeting records, paid access or LiveKit.
CREATE TABLE IF NOT EXISTS convay_private.pending_company_invites (
  tenant_id uuid NOT NULL REFERENCES convay_private.tenants(id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  membership_role text NOT NULL CHECK (membership_role IN ('member','tenant_admin')),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','claimed','cancelled')),
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  request_id uuid NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now()+interval '14 days'),
  claimed_at timestamptz,
  PRIMARY KEY (tenant_id,user_id),
  UNIQUE (requested_by,request_id),
  CHECK ((status='claimed')=(claimed_at IS NOT NULL))
);
ALTER TABLE convay_private.pending_company_invites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE convay_private.pending_company_invites FROM PUBLIC,anon,authenticated;
CREATE INDEX IF NOT EXISTS convay_pending_invites_user_status_idx
  ON convay_private.pending_company_invites(user_id,status,expires_at);

-- The pending queue is visible and mutable only through a Platform Super Admin
-- RPC. Existing verified members still use the audited company enrollment RPC.
CREATE OR REPLACE FUNCTION public.convay_company_invitation(
  p_action text,p_tenant_id uuid,p_email text DEFAULT NULL,
  p_member_role text DEFAULT NULL,p_request_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 v_actor uuid:=(SELECT auth.uid());
 v_email text:=lower(pg_catalog.btrim(coalesce(p_email,'')));
 v_user uuid;
 v_existing convay_private.pending_company_invites%ROWTYPE;
 v_record convay_private.pending_company_invites%ROWTYPE;
 v_tenant convay_private.tenants%ROWTYPE;
 v_event bigint;
 v_result jsonb;
BEGIN
 IF v_actor IS NULL OR NOT EXISTS (
   SELECT 1 FROM public.user_profiles p WHERE p.user_id=v_actor
   AND p.account_role='super_admin' AND p.account_status='active'
 ) THEN
   RAISE EXCEPTION 'Platform Super Admin required for company invitations'
     USING ERRCODE='42501';
 END IF;
 IF p_tenant_id IS NULL OR p_action NOT IN ('list','queue','cancel') THEN
   RAISE EXCEPTION 'Valid company and invitation action required'
     USING ERRCODE='22023';
 END IF;
 SELECT * INTO v_tenant FROM convay_private.tenants
  WHERE id=p_tenant_id;
 IF NOT FOUND OR v_tenant.lifecycle_state='offboarded' THEN
   RAISE EXCEPTION 'Company not available' USING ERRCODE='42501';
 END IF;
 IF p_action='list' THEN
   SELECT coalesce(pg_catalog.jsonb_agg(
     pg_catalog.jsonb_build_object(
       'tenant_id',i.tenant_id,'user_id',i.user_id,'email',p.email,
       'membership_role',i.membership_role,'status',i.status,
       'request_id',i.request_id,'requested_at',i.requested_at,
       'expires_at',i.expires_at,'claimed_at',i.claimed_at
     ) ORDER BY i.requested_at DESC), '[]'::jsonb) INTO v_result
   FROM convay_private.pending_company_invites i
   JOIN public.user_profiles p ON p.user_id=i.user_id
   WHERE i.tenant_id=p_tenant_id;
   RETURN pg_catalog.jsonb_build_object('tenant_id',p_tenant_id,'invites',v_result);
 END IF;
 IF p_request_id IS NULL OR
    v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR length(v_email)>254 THEN
   RAISE EXCEPTION 'Verified invitation email and request ID required'
     USING ERRCODE='22023';
 END IF;
 IF p_action='queue' AND
   (v_tenant.lifecycle_state<>'provisioning'
    OR p_member_role NOT IN ('member','tenant_admin')) THEN
   RAISE EXCEPTION 'A provisioning company and approved role are required'
     USING ERRCODE='42501';
 END IF;
 SELECT u.user_id INTO v_user FROM public.user_profiles u
 JOIN auth.users a ON a.id=u.user_id
 WHERE lower(pg_catalog.btrim(u.email))=v_email
   AND lower(pg_catalog.btrim(a.email))=v_email
   AND u.account_status='inactive' AND u.account_role='user'
   AND a.email_confirmed_at IS NULL
   AND a.raw_app_meta_data->>'convay_invitation_status'='pending'
   AND EXISTS(SELECT 1 FROM public.convay_user_roles ur
     JOIN public.convay_roles r ON r.id=ur.role_id
     WHERE ur.user_id=u.user_id AND r.status='Active');
 IF v_user IS NULL THEN
   RAISE EXCEPTION 'An unaccepted, role-assigned Convay invitation is required'
     USING ERRCODE='P0002';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtext('convay-company-invite:'||p_tenant_id::text||':'||v_user::text));
 SELECT * INTO v_existing FROM convay_private.pending_company_invites
   WHERE requested_by=v_actor AND request_id=p_request_id FOR UPDATE;
 IF FOUND THEN
   IF v_existing.tenant_id<>p_tenant_id OR v_existing.user_id<>v_user
      OR (p_action='queue' AND v_existing.membership_role<>p_member_role) THEN
     RAISE EXCEPTION 'Invitation request ID reused with different intent'
       USING ERRCODE='23505';
   END IF;
   IF p_action='queue' THEN
     RETURN pg_catalog.jsonb_build_object('tenant_id',p_tenant_id,
       'user_id',v_user,'email',v_email,'membership_role',v_existing.membership_role,
       'status',v_existing.status,'request_id',p_request_id,
       'tenant_active',false,'meeting_access_activated',false);
   END IF;
 END IF;
 SELECT * INTO v_record FROM convay_private.pending_company_invites
 WHERE tenant_id=p_tenant_id AND user_id=v_user FOR UPDATE;
 IF p_action='queue' THEN
   IF FOUND AND v_record.status<>'cancelled' THEN
     RAISE EXCEPTION 'Invitation already queued or claimed; refresh before retrying'
       USING ERRCODE='23505';
   END IF;
   INSERT INTO convay_private.pending_company_invites(
     tenant_id,user_id,membership_role,status,requested_by,request_id,
     requested_at,expires_at,claimed_at)
   VALUES(p_tenant_id,v_user,p_member_role,'pending',v_actor,p_request_id,
     now(),now()+interval '14 days',NULL)
   ON CONFLICT (tenant_id,user_id) DO UPDATE SET
     membership_role=excluded.membership_role,status='pending',
     requested_by=excluded.requested_by,request_id=excluded.request_id,
     requested_at=excluded.requested_at,expires_at=excluded.expires_at,claimed_at=NULL;
 ELSE
   IF NOT FOUND OR v_record.status<>'pending' THEN
     RAISE EXCEPTION 'No pending company invitation to cancel'
       USING ERRCODE='P0002';
   END IF;
   UPDATE convay_private.pending_company_invites SET status='cancelled'
     WHERE tenant_id=p_tenant_id AND user_id=v_user AND status='pending';
 END IF;
 INSERT INTO convay_private.tenant_control_events(
   tenant_id,actor_id,request_id,action,target_user_id,details)
 VALUES(p_tenant_id,v_actor,p_request_id,
   CASE WHEN p_action='queue' THEN 'company_invite_queued'
        ELSE 'company_invite_cancelled' END,v_user,
   pg_catalog.jsonb_build_object('membership_role',
      CASE WHEN p_action='queue' THEN p_member_role ELSE v_record.membership_role END))
 RETURNING id INTO v_event;
 RETURN pg_catalog.jsonb_build_object('tenant_id',p_tenant_id,
   'user_id',v_user,'email',v_email,
   'membership_role',CASE WHEN p_action='queue' THEN p_member_role
                          ELSE v_record.membership_role END,
   'status',CASE WHEN p_action='queue' THEN 'pending' ELSE 'cancelled' END,
   'request_id',p_request_id,'audit_event_id',v_event,
   'tenant_active',false,'meeting_access_activated',false);
END $fn$;
REVOKE ALL ON FUNCTION public.convay_company_invitation(text,uuid,text,text,uuid)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.convay_company_invitation(text,uuid,text,text,uuid)
  TO authenticated;

-- Called only by the trusted convay-users Edge Function, after the signed-in
-- invitee's verified email/password activation. The caller supplies the UUID
-- obtained from Supabase Auth, never a client-selected identity.
CREATE OR REPLACE FUNCTION public.convay_claim_pending_company_invites(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE
 v_inv convay_private.pending_company_invites%ROWTYPE;
 v_audit bigint;
 v_claims jsonb:='[]'::jsonb;
BEGIN
 IF p_user_id IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.user_profiles p
   JOIN auth.users a ON a.id=p.user_id
   WHERE p.user_id=p_user_id AND p.account_status='active'
     AND p.account_role='user' AND a.email_confirmed_at IS NOT NULL
     AND a.raw_app_meta_data->>'convay_invitation_status'='pending'
     AND lower(pg_catalog.btrim(a.email))=lower(pg_catalog.btrim(p.email))
     AND EXISTS(SELECT 1 FROM public.convay_user_roles ur
       JOIN public.convay_roles r ON r.id=ur.role_id
       WHERE ur.user_id=p_user_id AND r.status='Active')
 ) THEN
   RAISE EXCEPTION 'Verified active invitation required before company membership'
     USING ERRCODE='42501';
 END IF;
 FOR v_inv IN
   SELECT i.* FROM convay_private.pending_company_invites i
   JOIN convay_private.tenants t ON t.id=i.tenant_id
   WHERE i.user_id=p_user_id AND i.status='pending'
     AND t.lifecycle_state='provisioning'
   ORDER BY i.tenant_id FOR UPDATE OF i
 LOOP
   IF v_inv.expires_at < now() THEN
     RAISE EXCEPTION 'Company invitation expired; ask Platform Super Admin to reissue'
       USING ERRCODE='42501';
   END IF;
   IF EXISTS(SELECT 1 FROM convay_private.tenant_memberships m
      WHERE m.tenant_id=v_inv.tenant_id AND m.user_id=p_user_id) THEN
     RAISE EXCEPTION 'Existing membership requires administrator reconciliation'
       USING ERRCODE='23505';
   END IF;
   INSERT INTO convay_private.tenant_memberships(
     tenant_id,user_id,membership_role,membership_state,revoked_at)
   VALUES(v_inv.tenant_id,p_user_id,v_inv.membership_role,'active',NULL);
   INSERT INTO convay_private.tenant_control_events(
     tenant_id,actor_id,request_id,action,target_user_id,details)
   VALUES(v_inv.tenant_id,v_inv.requested_by,gen_random_uuid(),
     'add_member',p_user_id,
     pg_catalog.jsonb_build_object('source','verified_company_invitation',
       'invitation_request_id',v_inv.request_id,
       'membership_role',v_inv.membership_role))
   RETURNING id INTO v_audit;
   UPDATE convay_private.pending_company_invites
     SET status='claimed',claimed_at=now()
     WHERE tenant_id=v_inv.tenant_id AND user_id=p_user_id AND status='pending';
   v_claims:=v_claims||pg_catalog.jsonb_build_array(
     pg_catalog.jsonb_build_object('tenant_id',v_inv.tenant_id,
       'membership_role',v_inv.membership_role,
       'audit_event_id',v_audit));
 END LOOP;
 RETURN pg_catalog.jsonb_build_object('user_id',p_user_id,'claimed',v_claims,
   'tenant_active',false,'meeting_access_activated',false);
END $fn$;
REVOKE ALL ON FUNCTION public.convay_claim_pending_company_invites(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.convay_claim_pending_company_invites(uuid) TO service_role;
