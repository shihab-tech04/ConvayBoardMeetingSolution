-- TEN-ISO-01: authenticated tenant-membership enforcement at SQL and Storage RLS.
-- Preserve legacy tenant_id IS NULL behavior and all existing feature/RBAC policies.
-- Agenda and Agenda attachment/link records already have their own separately
-- owned tenant policy (AG-366); this migration does not change those records.
-- No workspace activation, ownership backfill, billing, or LiveKit writes.

CREATE OR REPLACE FUNCTION convay_private.tenant_member_active(p_tenant uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO ''
AS $fn$
  SELECT coalesce(EXISTS (
    SELECT 1 FROM convay_private.tenant_memberships m
    JOIN convay_private.tenants t ON t.id=m.tenant_id
    JOIN public.user_profiles p ON p.user_id=m.user_id
    WHERE p_tenant IS NOT NULL AND m.tenant_id=p_tenant
      AND m.user_id=(SELECT auth.uid())
      AND m.membership_state='active' AND m.revoked_at IS NULL
      AND m.revision > 0
      AND t.lifecycle_state='active'
      AND p.account_status='active'
  ),false);
$fn$;
REVOKE ALL ON FUNCTION convay_private.tenant_member_active(uuid)
  FROM PUBLIC,anon,authenticated;
-- Private schema is not exposed through PostgREST. This narrow predicate is
-- referenced by policies for both anonymous and authenticated commands.
GRANT EXECUTE ON FUNCTION convay_private.tenant_member_active(uuid)
  TO anon,authenticated;

-- Restrictive policies ADD a mandatory condition alongside existing permissive
-- feature/RBAC policies. They can never themselves grant table access.
DROP POLICY IF EXISTS convay_tenant_nonagenda_boundary
  ON public.convay_entity_records;
CREATE POLICY convay_tenant_nonagenda_boundary
ON public.convay_entity_records
AS RESTRICTIVE
FOR ALL TO PUBLIC
USING (
  entity_key IN ('bms.agenda','bms.agendaDocumentLinks','bms.meetingAgendaLinks')
  OR tenant_id IS NULL
  OR convay_private.tenant_member_active(tenant_id)
)
WITH CHECK (
  entity_key IN ('bms.agenda','bms.agendaDocumentLinks','bms.meetingAgendaLinks')
  OR tenant_id IS NULL
  OR convay_private.tenant_member_active(tenant_id)
);

-- Storage still needs its existing doc-specific permissions. This additional
-- predicate prevents a global role/share from crossing an active company.
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
  SELECT coalesce((
    SELECT count(*)=1 AND bool_and(
      tenant_id IS NULL OR convay_private.tenant_member_active(tenant_id)
    ) FROM matched
  ),false);
$fn$;
REVOKE ALL ON FUNCTION convay_private.storage_tenant_member_active(text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION convay_private.storage_tenant_member_active(text)
  TO anon,authenticated;

DROP POLICY IF EXISTS convay_storage_tenant_boundary ON storage.objects;
CREATE POLICY convay_storage_tenant_boundary
ON storage.objects
AS RESTRICTIVE
FOR ALL TO PUBLIC
USING (
  bucket_id <> 'convay-documents'
  OR convay_private.storage_tenant_member_active(name)
)
WITH CHECK (
  bucket_id <> 'convay-documents'
  OR convay_private.storage_tenant_member_active(name)
);
