-- AG-366: tenant isolation for Agenda and its meeting/document associations.
-- Preserve all existing rows, current Super Admin access, and existing RLS grants.
-- Restrictive policy combines with (never replaces) existing business permissions.
CREATE OR REPLACE FUNCTION convay_private.agenda_tenant_authorized(p_tenant uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO ''
AS $fn$
  SELECT COALESCE((
    SELECT CASE WHEN p.account_role='super_admin' THEN true
      WHEN p_tenant IS NULL THEN false
      ELSE EXISTS (
        SELECT 1
        FROM convay_private.tenant_memberships m
        JOIN convay_private.tenants t ON t.id=m.tenant_id
        WHERE m.user_id=p.user_id
          AND m.tenant_id=p_tenant
          AND m.membership_state='active'
          AND m.revoked_at IS NULL
          AND t.lifecycle_state='active'
      )
    END
    FROM public.user_profiles p
    WHERE p.user_id=(SELECT auth.uid())
      AND p.account_status='active'
  ),false);
$fn$;
REVOKE ALL ON FUNCTION convay_private.agenda_tenant_authorized(uuid)
  FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION convay_private.agenda_tenant_authorized(uuid)
  TO authenticated;

-- RLS applies to both the old and new values on UPDATE, avoiding cross-tenant
-- transfers. Existing unscoped legacy Agenda records are Super Admin-only.
DROP POLICY IF EXISTS convay_agenda_tenant_boundary
  ON public.convay_entity_records;
CREATE POLICY convay_agenda_tenant_boundary
  ON public.convay_entity_records
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    entity_key NOT IN (
      'bms.agenda','bms.agendaDocumentLinks','bms.meetingAgendaLinks'
    )
    OR convay_private.agenda_tenant_authorized(tenant_id)
  )
  WITH CHECK (
    entity_key NOT IN (
      'bms.agenda','bms.agendaDocumentLinks','bms.meetingAgendaLinks'
    )
    OR convay_private.agenda_tenant_authorized(tenant_id)
  );

-- A document link must not attach an agenda or document from another tenant.
-- Do not change global document access rules; this only validates an Agenda link.
CREATE OR REPLACE FUNCTION convay_private.guard_agenda_document_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE
  v_agenda_tenant uuid;
  v_document_tenant uuid;
  v_agenda text;
  v_document text;
BEGIN
  IF NEW.entity_key <> 'bms.agendaDocumentLinks' THEN RETURN NEW; END IF;
  v_agenda := NULLIF(BTRIM(COALESCE(NEW.payload->>'agenda_id','')),'');
  v_document := NULLIF(BTRIM(COALESCE(NEW.payload->>'document_id','')),'');
  IF v_agenda IS NULL OR v_document IS NULL THEN
    RAISE EXCEPTION 'Agenda and document IDs are required' USING ERRCODE='23514';
  END IF;
  SELECT a.tenant_id INTO v_agenda_tenant
    FROM public.convay_entity_records a
    WHERE a.entity_key='bms.agenda'
      AND (a.record_id=v_agenda OR a.payload->>'agenda_id'=v_agenda)
    LIMIT 1;
  IF NOT FOUND OR NEW.tenant_id IS DISTINCT FROM v_agenda_tenant THEN
    RAISE EXCEPTION 'Agenda document link belongs to a different tenant'
      USING ERRCODE='42501';
  END IF;
  SELECT d.tenant_id INTO v_document_tenant
    FROM public.convay_entity_records d
    WHERE d.entity_key='bms.documents'
      AND (d.record_id=v_document OR d.payload->>'document_id'=v_document)
    LIMIT 1;
  IF NOT FOUND OR NEW.tenant_id IS DISTINCT FROM v_document_tenant THEN
    RAISE EXCEPTION 'Document is unavailable in the Agenda tenant'
      USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION convay_private.guard_agenda_document_tenant()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS convay_a1_agenda_document_tenant
  ON public.convay_entity_records;
CREATE TRIGGER convay_a1_agenda_document_tenant
  BEFORE INSERT OR UPDATE OF payload,tenant_id
  ON public.convay_entity_records
  FOR EACH ROW WHEN (NEW.entity_key='bms.agendaDocumentLinks')
  EXECUTE FUNCTION convay_private.guard_agenda_document_tenant();
