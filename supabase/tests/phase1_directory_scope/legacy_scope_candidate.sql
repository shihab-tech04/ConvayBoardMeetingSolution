-- Candidate only: formal migration and native production recovery still required.
-- Correct the shared predicate, not individual UI screens or policy grants.
-- Membership history is retained by the tenant lifecycle; revocation/offboarding
-- must not convert a company account into an unrelated legacy global account.
-- Root and genuinely never-enrolled active accounts retain existing access.
-- CREATE OR REPLACE preserves the existing owner and ACL.
CREATE OR REPLACE FUNCTION convay_private.legacy_unscoped_authorized()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
  SELECT COALESCE((
    SELECT p.account_role='super_admin'
      OR NOT EXISTS (
        SELECT 1 FROM convay_private.tenant_memberships m
        WHERE m.user_id=p.user_id
      )
    FROM public.user_profiles p
    WHERE p.user_id=(SELECT auth.uid())
      AND p.account_status='active'
  ),false);
$fn$;
