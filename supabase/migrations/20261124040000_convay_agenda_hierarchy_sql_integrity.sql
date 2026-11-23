-- AG-365: close the SQL bypass that allowed Draft descendants under Approved agendas.
-- Preserve approved UI and existing data. All new author DELETE access remains
-- resource-owned, draft-only, and protected by trigger / meeting-link integrity.

CREATE OR REPLACE FUNCTION convay_private.guard_agenda_hierarchy_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE
  v_status text;
  v_parent_id text;
  v_parent_payload jsonb;
  v_parent_tenant uuid;
  v_parent_author uuid;
  v_seen text[];
  v_depth integer;
BEGIN
  IF TG_OP='DELETE' THEN
    IF OLD.entity_key <> 'bms.agenda' THEN RETURN OLD; END IF;
    v_status := COALESCE(OLD.payload->>'approval_status','Draft');
    IF v_status NOT IN ('Draft','Incomplete','Reopened','Revision Requested') THEN
      RAISE EXCEPTION 'Reopen or restore this agenda before removing it' USING ERRCODE='42501';
    END IF;
    IF NULLIF(BTRIM(COALESCE(OLD.payload->>'parent_agenda_id','')),'') IS NULL THEN
      RAISE EXCEPTION 'Archive parent agendas instead of deleting them' USING ERRCODE='42501';
    END IF;
    IF NOT (
      convay_private.has_permission('agd_approve') OR (
        convay_private.has_permission('agd_submit') AND OLD.created_by=auth.uid()
      )
    ) THEN
      RAISE EXCEPTION 'Only its author or an approver may remove an editable child agenda'
        USING ERRCODE='42501';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.convay_entity_records c
      WHERE c.entity_key='bms.agenda' AND
        c.payload->>'parent_agenda_id' IN (OLD.record_id, OLD.payload->>'agenda_id')
    ) THEN
      RAISE EXCEPTION 'Remove descendants before deleting their parent agenda'
        USING ERRCODE='23503';
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.entity_key <> 'bms.agenda' THEN RETURN NEW; END IF;
  IF TG_OP='INSERT' AND
     COALESCE(NEW.payload->>'approval_status','Draft') NOT IN ('Draft','Incomplete') THEN
    RAISE EXCEPTION 'An agenda must be created as Draft or Incomplete'
      USING ERRCODE='23514';
  END IF;
  IF TG_OP='UPDATE' AND NEW.payload->>'parent_agenda_id'
    IS NOT DISTINCT FROM OLD.payload->>'parent_agenda_id' THEN
    RETURN NEW;
  END IF;
  IF TG_OP='UPDATE' AND COALESCE(OLD.payload->>'approval_status','Draft')
    NOT IN ('Draft','Incomplete','Reopened','Revision Requested') THEN
    RAISE EXCEPTION 'Reopen an agenda before changing its hierarchy'
      USING ERRCODE='42501';
  END IF;

  v_parent_id := NULLIF(BTRIM(COALESCE(NEW.payload->>'parent_agenda_id','')),'');
  v_seen := ARRAY[NEW.record_id];
  v_depth := 1;
  WHILE v_parent_id IS NOT NULL LOOP
    IF v_parent_id=ANY(v_seen) THEN
      RAISE EXCEPTION 'Agenda hierarchy cannot contain a cycle'
        USING ERRCODE='23514';
    END IF;
    SELECT p.payload,p.tenant_id,p.created_by
      INTO v_parent_payload,v_parent_tenant,v_parent_author
      FROM public.convay_entity_records p
      WHERE p.entity_key='bms.agenda'
        AND (p.record_id=v_parent_id OR p.payload->>'agenda_id'=v_parent_id)
      LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Parent agenda was not found' USING ERRCODE='23503';
    END IF;
    IF COALESCE(v_parent_payload->>'approval_status','Draft')
      NOT IN ('Draft','Incomplete','Reopened','Revision Requested')
      OR NULLIF(BTRIM(COALESCE(v_parent_payload->>'archived_at','')),'') IS NOT NULL THEN
      RAISE EXCEPTION 'Reopen the reviewed or archived parent before adding or moving children'
        USING ERRCODE='42501';
    END IF;
    IF NEW.tenant_id IS DISTINCT FROM v_parent_tenant THEN
      RAISE EXCEPTION 'Agenda parent and child must belong to the same tenant'
        USING ERRCODE='42501';
    END IF;
    IF v_parent_author IS DISTINCT FROM auth.uid()
       AND NOT convay_private.has_permission('agd_approve') THEN
      RAISE EXCEPTION 'Agenda author cannot change another author''s hierarchy'
        USING ERRCODE='42501';
    END IF;
    v_seen := ARRAY_APPEND(v_seen,v_parent_id);
    v_depth := v_depth+1;
    IF v_depth>3 THEN
      RAISE EXCEPTION 'Agenda hierarchy cannot exceed three levels' USING ERRCODE='23514';
    END IF;
    v_parent_id := NULLIF(BTRIM(COALESCE(v_parent_payload->>'parent_agenda_id','')),'');
  END LOOP;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION convay_private.guard_agenda_hierarchy_mutation()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS convay_a1_agenda_hierarchy_insert_update_guard
  ON public.convay_entity_records;
CREATE TRIGGER convay_a1_agenda_hierarchy_insert_update_guard
  BEFORE INSERT OR UPDATE OF payload ON public.convay_entity_records
  FOR EACH ROW EXECUTE FUNCTION convay_private.guard_agenda_hierarchy_mutation();
DROP TRIGGER IF EXISTS convay_a1_agenda_hierarchy_delete_guard
  ON public.convay_entity_records;
CREATE TRIGGER convay_a1_agenda_hierarchy_delete_guard
  BEFORE DELETE ON public.convay_entity_records
  FOR EACH ROW WHEN (OLD.entity_key='bms.agenda')
  EXECUTE FUNCTION convay_private.guard_agenda_hierarchy_mutation();

-- The draft author can remove their own unsent child using the existing
-- SQL-ACK batch. Review-only users are excluded by this policy and by the
-- additional DELETE guard above. Existing permission grants are unchanged.
DROP POLICY IF EXISTS convay_agenda_author_delete_draft_child
  ON public.convay_entity_records;
CREATE POLICY convay_agenda_author_delete_draft_child
ON public.convay_entity_records FOR DELETE TO authenticated
USING (
 entity_key='bms.agenda'
 AND convay_private.has_permission('agd_submit')
 AND created_by=auth.uid()
 AND NULLIF(BTRIM(COALESCE(payload->>'parent_agenda_id','')),'') IS NOT NULL
 AND COALESCE(payload->>'approval_status','Draft')
   IN ('Draft','Incomplete','Reopened','Revision Requested')
);

-- The original meeting link guard checks direct children. The additional
-- recursive guard checks the full three-level tree so an old/legacy parent
-- marked Approved cannot conceal an unapproved grandchild.
CREATE OR REPLACE FUNCTION convay_private.guard_agenda_recursive_meeting_readiness()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO '' AS $fn$
DECLARE
  v_agenda_id text;
  v_root_id text;
  v_root_tenant uuid;
  v_invalid boolean;
BEGIN
  IF NEW.entity_key <> 'bms.meetingAgendaLinks' THEN RETURN NEW; END IF;
  v_agenda_id := NULLIF(BTRIM(COALESCE(NEW.payload->>'agenda_id','')),'');
  SELECT r.record_id,r.tenant_id INTO v_root_id,v_root_tenant
    FROM public.convay_entity_records r WHERE r.entity_key='bms.agenda'
    AND (r.record_id=v_agenda_id OR r.payload->>'agenda_id'=v_agenda_id)
    LIMIT 1;
  IF v_root_id IS NULL THEN
    RAISE EXCEPTION 'Linked agenda does not exist' USING ERRCODE='23503';
  END IF;
  IF NEW.tenant_id IS DISTINCT FROM v_root_tenant THEN
    RAISE EXCEPTION 'Meeting agenda link has mismatched tenant ownership'
      USING ERRCODE='42501';
  END IF;
  WITH RECURSIVE descendants(record_id,payload,path) AS (
    SELECT r.record_id,r.payload,ARRAY[r.record_id]
    FROM public.convay_entity_records r
    WHERE r.entity_key='bms.agenda'
      AND r.payload->>'parent_agenda_id' IN (v_root_id,v_agenda_id)
    UNION ALL
    SELECT c.record_id,c.payload,d.path||c.record_id
    FROM public.convay_entity_records c
    JOIN descendants d ON c.payload->>'parent_agenda_id'
      IN (d.record_id,d.payload->>'agenda_id')
    WHERE c.entity_key='bms.agenda' AND NOT c.record_id=ANY(d.path)
  )
  SELECT EXISTS (
    SELECT 1 FROM descendants d
    WHERE NULLIF(BTRIM(COALESCE(d.payload->>'archived_at','')),'') IS NULL
    AND COALESCE(d.payload->>'approval_status','Draft') <> 'Approved'
  ) INTO v_invalid;
  IF v_invalid THEN
    RAISE EXCEPTION 'Every active child and grandchild must be approved for meeting use'
      USING ERRCODE='23514';
  END IF;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION convay_private.guard_agenda_recursive_meeting_readiness()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS convay_a1_recursive_agenda_meeting_readiness
  ON public.convay_entity_records;
CREATE TRIGGER convay_a1_recursive_agenda_meeting_readiness
  BEFORE INSERT OR UPDATE OF payload ON public.convay_entity_records
  FOR EACH ROW WHEN (NEW.entity_key='bms.meetingAgendaLinks')
  EXECUTE FUNCTION convay_private.guard_agenda_recursive_meeting_readiness();
