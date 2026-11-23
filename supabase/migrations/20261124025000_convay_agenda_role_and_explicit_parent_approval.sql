-- AG-364: dedicated Agenda author/reviewer/approver roles, protected parent approval,
-- and append-only reviewer revision history. Existing user assignments and Agenda rows
-- are unchanged; a Super Admin assigns the new roles through Role Management.
-- Requires existing AG-360/AG-362 migrations.
INSERT INTO public.convay_roles(name,description,level,status,is_system_role)
SELECT v.role_name,v.description,'Custom','Active',false
FROM (VALUES
 ('Agenda Author','Create, edit and submit Agenda drafts; cannot review or approve'),
 ('Agenda Reviewer','Read agendas and request revisions; cannot edit content or approve'),
 ('Agenda Approver','Review, request revisions, approve, reject, reopen and archive')
) AS v(role_name,description)
WHERE NOT EXISTS (SELECT 1 FROM public.convay_roles r WHERE r.name=v.role_name);

WITH rules(role_name,permission_code) AS (VALUES
 ('Agenda Author','agd_view'), ('Agenda Author','agd_submit'),
 ('Agenda Reviewer','agd_view'), ('Agenda Reviewer','agd_review'),
 ('Agenda Approver','agd_view'), ('Agenda Approver','agd_review'),
 ('Agenda Approver','agd_approve')
)
INSERT INTO public.convay_role_permissions(role_id,permission_id)
SELECT r.id,p.id
FROM rules x JOIN public.convay_roles r ON r.name=x.role_name AND r.status='Active'
JOIN public.convay_permissions p ON p.id=x.permission_code AND p.status='Active'
ON CONFLICT DO NOTHING;

-- The generic Agenda UPDATE permission is agd_submit, which prevented actual
-- reviewers/approvers from executing their narrower workflow actions.
-- This additional policy is restricted to Agenda records; the trigger below
-- disallows unrelated content edits by review-only actors.
DROP POLICY IF EXISTS convay_agenda_authorized_review_update ON public.convay_entity_records;
CREATE POLICY convay_agenda_authorized_review_update
ON public.convay_entity_records FOR UPDATE TO authenticated
USING (
 entity_key='bms.agenda'
 AND (convay_private.has_permission('agd_review') OR convay_private.has_permission('agd_approve'))
)
WITH CHECK (
 entity_key='bms.agenda'
 AND (convay_private.has_permission('agd_review') OR convay_private.has_permission('agd_approve'))
);

-- An agd_review user may record exactly one review request, not approval and
-- not an arbitrary history rewrite. Keep all other approvals gated by agd_approve.
DO $migrate$
DECLARE
 v_source text;
 v_old text := E'      and convay_private.has_permission(''agd_submit'')\n    ) then';
 v_new text := $fragment$
      and convay_private.has_permission('agd_submit')
      OR (
        new.entity_key = 'bms.agenda'
        and prior_payload->>'approval_status' in
          ('Pending Approval','Pending Review','Ready for Review','Partially Approved')
        and new.payload->>'approval_status' = 'Revision Requested'
        and new.payload->'approved_by' is not distinct from prior_payload->'approved_by'
        and new.payload->'approved_at' is not distinct from prior_payload->'approved_at'
        and jsonb_typeof(coalesce(prior_payload->'approval_history','[]'::jsonb))='array'
        and jsonb_typeof(coalesce(new.payload->'approval_history','[]'::jsonb))='array'
        and jsonb_array_length(coalesce(new.payload->'approval_history','[]'::jsonb))
          = jsonb_array_length(coalesce(prior_payload->'approval_history','[]'::jsonb))+1
        and (coalesce(new.payload->'approval_history','[]'::jsonb)
          - (jsonb_array_length(coalesce(new.payload->'approval_history','[]'::jsonb))-1))
          = coalesce(prior_payload->'approval_history','[]'::jsonb)
        and new.payload->'approval_history'->-1->>'action'='request_revision'
        and new.payload->'approval_history'->-1->>'status'='Revision Requested'
        and new.payload->'approval_history'->-1->>'prev_status'
          = prior_payload->>'approval_status'
        and convay_private.has_permission('agd_review')
      )
    ) then
$fragment$;
BEGIN
 SELECT pg_get_functiondef('convay_private.enforce_entity_state_transition()'::regprocedure)
 INTO v_source;
 IF strpos(v_source,v_old)=0
   OR strpos(v_source,'and convay_private.has_permission(''agd_review'')'||chr(10)||'      )')>0 THEN
   RAISE EXCEPTION 'Agenda review-history guard has changed; abort migration';
 END IF;
 EXECUTE replace(v_source,v_old,btrim(v_new,chr(10)));
END $migrate$;

CREATE OR REPLACE FUNCTION convay_private.guard_agenda_role_and_parent_approval()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $fn$
DECLARE
 v_previous text := coalesce(OLD.payload->>'approval_status','Draft');
 v_next text := coalesce(NEW.payload->>'approval_status','Draft');
 v_invalid boolean := false;
BEGIN
 IF OLD.entity_key <> 'bms.agenda' THEN RETURN NEW; END IF;
 IF NEW.tenant_id IS DISTINCT FROM OLD.tenant_id THEN
   RAISE EXCEPTION 'Agenda tenant cannot change through ordinary editing' USING ERRCODE='42501';
 END IF;
 -- A review-only account must never archive, reopen, approve or otherwise
 -- change a lifecycle field by bypassing the UI or by calling the generic RPC.
 IF v_next IS DISTINCT FROM v_previous THEN
   IF v_next='Revision Requested'
      AND v_previous IN ('Pending Approval','Pending Review','Ready for Review','Partially Approved') THEN
     IF NOT convay_private.has_permission('agd_review') THEN
       RAISE EXCEPTION 'Agenda review permission required' USING ERRCODE='42501';
     END IF;
   ELSIF v_next='Pending Approval'
      AND v_previous IN ('Draft','Incomplete','Reopened','Revision Requested') THEN
     IF NOT convay_private.has_permission('agd_submit') THEN
       RAISE EXCEPTION 'Agenda submission permission required' USING ERRCODE='42501';
     END IF;
   ELSIF NOT convay_private.has_permission('agd_approve') THEN
     RAISE EXCEPTION 'Agenda approver permission required for this transition'
       USING ERRCODE='42501';
   END IF;
 END IF;
 IF (NEW.payload->'archived_at' IS DISTINCT FROM OLD.payload->'archived_at'
     OR NEW.payload->'archived_by' IS DISTINCT FROM OLD.payload->'archived_by')
    AND NOT convay_private.has_permission('agd_approve') THEN
   RAISE EXCEPTION 'Agenda archiving requires approver permission' USING ERRCODE='42501';
 END IF;
 IF NOT convay_private.has_permission('agd_submit') AND
    (NEW.payload - ARRAY['approval_status','approval_history','meeting_readiness',
       'updated_at','updated_by','archived_at','archived_by']) IS DISTINCT FROM
    (OLD.payload - ARRAY['approval_status','approval_history','meeting_readiness',
       'updated_at','updated_by','archived_at','archived_by']) THEN
   RAISE EXCEPTION 'Agenda reviewer cannot change content' USING ERRCODE='42501';
 END IF;

 IF v_next = 'Approved' AND v_previous <> 'Approved' THEN
   IF v_previous NOT IN ('Pending Approval','Pending Review','Ready for Review','Partially Approved') THEN
     RAISE EXCEPTION 'Submit an agenda for review before approval' USING ERRCODE='23514';
   END IF;
   IF NOT convay_private.has_permission('agd_approve') THEN
     RAISE EXCEPTION 'Agenda approver authorization required' USING ERRCODE='42501';
   END IF;
   IF coalesce(NEW.payload->'approval_history'->-1->>'action','') <> 'approve' THEN
     RAISE EXCEPTION 'Agenda approval requires an explicit approver decision' USING ERRCODE='23514';
   END IF;
   WITH RECURSIVE descendants(record_id,payload,path) AS (
     SELECT r.record_id,r.payload,ARRAY[r.record_id]
       FROM public.convay_entity_records r
       WHERE r.entity_key='bms.agenda'
         AND r.payload->>'parent_agenda_id' IN (OLD.record_id,OLD.payload->>'agenda_id')
     UNION ALL
     SELECT r.record_id,r.payload,d.path||r.record_id
       FROM public.convay_entity_records r
       JOIN descendants d ON r.payload->>'parent_agenda_id'
         IN (d.record_id,d.payload->>'agenda_id')
       WHERE r.entity_key='bms.agenda' AND NOT r.record_id=ANY(d.path)
   )
   SELECT EXISTS (
     SELECT 1 FROM descendants d
     WHERE coalesce(d.payload->>'approval_status','Draft')<>'Archived'
       AND nullif(d.payload->>'archived_at','') IS NULL
       AND d.payload->>'approval_status'<>'Approved'
   ) INTO v_invalid;
   IF v_invalid THEN
     RAISE EXCEPTION 'Approve all active child agendas before approving their parent'
       USING ERRCODE='23514';
   END IF;
 END IF;

 IF NEW.payload->>'meeting_readiness' = 'Meeting Ready' AND v_next <> 'Approved' THEN
   RAISE EXCEPTION 'Only approved agendas may be Meeting Ready' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION convay_private.guard_agenda_role_and_parent_approval()
  FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS convay_a1_guard_agenda_review_roles ON public.convay_entity_records;
CREATE TRIGGER convay_a1_guard_agenda_review_roles
 BEFORE UPDATE OF payload ON public.convay_entity_records
 FOR EACH ROW WHEN (OLD.entity_key='bms.agenda')
 EXECUTE FUNCTION convay_private.guard_agenda_role_and_parent_approval();
