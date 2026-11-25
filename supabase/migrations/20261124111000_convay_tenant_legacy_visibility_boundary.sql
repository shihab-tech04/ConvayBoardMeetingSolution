-- TEN-ISO-02: company actors must not inherit the legacy unscoped registry.
-- A legacy user without company membership keeps the previous permitted access.
-- A platform root keeps permitted legacy admin access. Neither rule grants
-- access to another company's records or changes the separate Agenda policy.
-- This is a security boundary only: no activation, billing, backfill or writes.

CREATE OR REPLACE FUNCTION convay_private.legacy_unscoped_authorized()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
  SELECT COALESCE((
    SELECT p.account_role='super_admin'
      OR NOT EXISTS (
        SELECT 1 FROM convay_private.tenant_memberships m
        JOIN convay_private.tenants t ON t.id=m.tenant_id
        WHERE m.user_id=p.user_id
          AND m.membership_state='active'
          AND m.revoked_at IS NULL
          AND t.lifecycle_state<>'offboarded'
      )
    FROM public.user_profiles p
    WHERE p.user_id=(SELECT auth.uid())
      AND p.account_status='active'
  ),false);
$fn$;
REVOKE ALL ON FUNCTION convay_private.legacy_unscoped_authorized()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION convay_private.legacy_unscoped_authorized()
  TO authenticated;

-- Keep every existing feature-level permission in place. A restrictive policy
-- must never become a standalone authorization grant.
DROP POLICY IF EXISTS convay_tenant_nonagenda_boundary
  ON public.convay_entity_records;
CREATE POLICY convay_tenant_nonagenda_boundary
ON public.convay_entity_records
AS RESTRICTIVE FOR ALL TO PUBLIC
USING (
  entity_key IN ('bms.agenda','bms.agendaDocumentLinks','bms.meetingAgendaLinks')
  OR (tenant_id IS NULL AND convay_private.legacy_unscoped_authorized())
  OR convay_private.tenant_member_active(tenant_id)
)
WITH CHECK (
  entity_key IN ('bms.agenda','bms.agendaDocumentLinks','bms.meetingAgendaLinks')
  OR (tenant_id IS NULL AND convay_private.legacy_unscoped_authorized())
  OR convay_private.tenant_member_active(tenant_id)
);

-- Document storage must enforce the same legacy/company split as SQL, even if
-- another existing document-share policy would otherwise permit access.
CREATE OR REPLACE FUNCTION convay_private.storage_tenant_member_active(p_path text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
  WITH matched AS (
    SELECT d.tenant_id FROM public.convay_entity_records d
    WHERE d.entity_key='bms.documents'
      AND (d.record_id=pg_catalog.split_part(p_path,'/',1)
        OR d.payload->>'doc_id'=pg_catalog.split_part(p_path,'/',1))
  )
  SELECT COALESCE((
    SELECT count(*)=1 AND bool_and(
      CASE WHEN tenant_id IS NULL
        THEN convay_private.legacy_unscoped_authorized()
        ELSE convay_private.tenant_member_active(tenant_id)
      END
    ) FROM matched
  ),false);
$fn$;
REVOKE ALL ON FUNCTION convay_private.storage_tenant_member_active(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION convay_private.storage_tenant_member_active(text)
  TO anon,authenticated;
