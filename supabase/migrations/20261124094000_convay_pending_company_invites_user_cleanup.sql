-- TEN-ONB-03: prevent a pending invitation from breaking the existing
-- authorized Auth-user deletion flow. Tenant audit events remain immutable.
-- Only the unclaimed/claimed invitation pointer is removed on user deletion.
ALTER TABLE convay_private.pending_company_invites
  DROP CONSTRAINT IF EXISTS pending_company_invites_user_id_fkey;
ALTER TABLE convay_private.pending_company_invites
  ADD CONSTRAINT pending_company_invites_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE CASCADE;

-- An active or historical company membership is an authoritative record.
-- Fail before mutating the profile: never delete roles/profile first and
-- discover that Auth deletion is blocked by the membership's restrictive FK.
-- Company account offboarding must be explicit, audited, and separate.
CREATE OR REPLACE FUNCTION public.convay_user_deletion_readiness(p_user_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
DECLARE v_total integer;
BEGIN
 IF p_user_id IS NULL THEN
   RAISE EXCEPTION 'Valid user required' USING ERRCODE='22023';
 END IF;
 SELECT count(*) INTO v_total FROM convay_private.tenant_memberships
   WHERE user_id=p_user_id;
 RETURN pg_catalog.jsonb_build_object(
   'user_id',p_user_id,'company_membership_count',v_total,
   'can_delete',v_total=0);
END $fn$;
REVOKE ALL ON FUNCTION public.convay_user_deletion_readiness(uuid)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.convay_user_deletion_readiness(uuid) TO service_role;
