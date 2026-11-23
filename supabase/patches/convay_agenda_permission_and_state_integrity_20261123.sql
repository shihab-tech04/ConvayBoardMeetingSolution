-- AG-360 SQL integrity hardening. Safe, non-destructive; no existing rows modified.
-- 1. A real agd_submit grant can append exactly ONE submit-history record
--    without receiving agd_approve (which remains required for actual approval).
-- 2. Old approved content cannot be silently rewritten.
-- 3. New meeting-agenda links require approved, non-archived agenda hierarchies.

DO $migrate$
DECLARE
  v_ddl text;
  v_prior text := $prior$
if tg_op = 'UPDATE' and approval_code is not null and (
    new.payload->'approval_history' is distinct from prior_payload->'approval_history'
    or new.payload->'approved_by' is distinct from prior_payload->'approved_by'
    or new.payload->'approved_at' is distinct from prior_payload->'approved_at'
  ) then
    required_codes := array_append(required_codes,approval_code);
  end if;
$prior$;
  v_revised text := $revised$
if tg_op = 'UPDATE' and approval_code is not null and (
    new.payload->'approval_history' is distinct from prior_payload->'approval_history'
    or new.payload->'approved_by' is distinct from prior_payload->'approved_by'
    or new.payload->'approved_at' is distinct from prior_payload->'approved_at'
  ) then
    -- Submission is not approval. Permit exactly one append-only submission
    -- history entry when the authenticated actor has agd_submit. SQL audit
    -- still records the trusted auth.uid() and each row revision.
    if not (
      new.entity_key = 'bms.agenda'
      and prior_payload->>'approval_status' in ('Draft', 'Incomplete', 'Reopened', 'Revision Requested')
      and new.payload->>'approval_status' = 'Pending Approval'
      and new.payload->'approved_by' is not distinct from prior_payload->'approved_by'
      and new.payload->'approved_at' is not distinct from prior_payload->'approved_at'
      and jsonb_typeof(coalesce(prior_payload->'approval_history','[]'::jsonb))='array'
      and jsonb_typeof(coalesce(new.payload->'approval_history','[]'::jsonb))='array'
      and jsonb_array_length(coalesce(new.payload->'approval_history','[]'::jsonb))
        = jsonb_array_length(coalesce(prior_payload->'approval_history','[]'::jsonb))+1
      and (
        coalesce(new.payload->'approval_history','[]'::jsonb) -
        (jsonb_array_length(coalesce(new.payload->'approval_history','[]'::jsonb))-1)
      ) = coalesce(prior_payload->'approval_history','[]'::jsonb)
      and new.payload->'approval_history'->-1->>'action' = 'submit'
      and new.payload->'approval_history'->-1->>'status' = 'Pending Approval'
      and new.payload->'approval_history'->-1->>'prev_status' = prior_payload->>'approval_status'
      and convay_private.has_permission('agd_submit')
    ) then
      required_codes := array_append(required_codes,approval_code);
    end if;
  end if;
$revised$;
  v_candidate text;
  v_candidate_revised text;
BEGIN
  SELECT pg_get_functiondef('convay_private.enforce_entity_state_transition()'::regprocedure)
    INTO v_ddl;
  IF strpos(v_ddl,v_prior)=0 THEN
    RAISE EXCEPTION 'Agenda approval permission guard unexpectedly changed; migration not applied';
  END IF;
  v_ddl := replace(v_ddl,v_prior,v_revised);
  v_candidate := 'if needed is not null then required_codes := array_append(required_codes,needed); end if;';
  v_candidate_revised := $candidate$
if needed = 'agd_review'
      and new.entity_key = 'bms.agenda'
      and prior_payload->>'approval_status' = 'Revision Requested'
      and new.payload->>'approval_status' = 'Pending Approval'
      and convay_private.has_permission('agd_submit')
    then needed := null;
    end if;
    if needed is not null then required_codes := array_append(required_codes,needed); end if;
$candidate$;
  IF strpos(v_ddl,v_candidate)=0 THEN
    RAISE EXCEPTION 'Agenda resubmission permission guard unexpectedly changed';
  END IF;
  v_ddl := replace(v_ddl,v_candidate,v_candidate_revised);
  EXECUTE v_ddl;
END
$migrate$;

CREATE OR REPLACE FUNCTION convay_private.guard_approved_agenda_content()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $fn$
BEGIN
  IF OLD.entity_key = 'bms.agenda'
     AND OLD.payload->>'approval_status' = 'Approved'
     AND (
       NEW.payload - ARRAY['approval_status','approval_history','meeting_readiness','updated_at','updated_by','archived_at','archived_by']
     ) IS DISTINCT FROM (
       OLD.payload - ARRAY['approval_status','approval_history','meeting_readiness','updated_at','updated_by','archived_at','archived_by']
     ) THEN
    RAISE EXCEPTION 'Reopen an approved agenda before editing its content'
      USING errcode = '42501';
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS convay_a1_protect_approved_agenda_content ON public.convay_entity_records;
CREATE TRIGGER convay_a1_protect_approved_agenda_content
  BEFORE UPDATE OF payload ON public.convay_entity_records
  FOR EACH ROW WHEN (OLD.entity_key = 'bms.agenda')
  EXECUTE FUNCTION convay_private.guard_approved_agenda_content();

CREATE OR REPLACE FUNCTION convay_private.guard_approved_agenda_meeting_link()
RETURNS trigger LANGUAGE plpgsql SET search_path TO '' AS $fn$
DECLARE
  v_id text;
  v_parent jsonb;
BEGIN
  IF NEW.entity_key <> 'bms.meetingAgendaLinks' THEN RETURN NEW; END IF;
  v_id := nullif(btrim(NEW.payload->>'agenda_id'),'');
  SELECT payload INTO v_parent FROM public.convay_entity_records
   WHERE entity_key='bms.agenda' AND (record_id=v_id OR payload->>'agenda_id'=v_id) LIMIT 1;
  IF v_parent IS NULL THEN
    RAISE EXCEPTION 'Linked agenda does not exist' USING errcode='23503';
  END IF;
  IF v_parent->>'approval_status' <> 'Approved'
     OR nullif(v_parent->>'parent_agenda_id','') IS NOT NULL
     OR nullif(v_parent->>'archived_at','') IS NOT NULL
     OR coalesce(nullif(v_parent->>'meeting_readiness',''),'Meeting Ready') <> 'Meeting Ready'
     OR EXISTS (
        SELECT 1 FROM public.convay_entity_records child
         WHERE child.entity_key='bms.agenda'
           AND child.payload->>'parent_agenda_id' IN (v_id, v_parent->>'agenda_id')
           AND nullif(child.payload->>'archived_at','') IS NULL
           AND child.payload->>'approval_status' <> 'Approved'
     )
  THEN
    RAISE EXCEPTION 'Meeting agendas must be approved, active, and ready'
      USING errcode='23514';
  END IF;
  RETURN NEW;
END $fn$;
DROP TRIGGER IF EXISTS convay_a1_link_approved_agenda ON public.convay_entity_records;
CREATE TRIGGER convay_a1_link_approved_agenda
  BEFORE INSERT OR UPDATE OF payload ON public.convay_entity_records
  FOR EACH ROW WHEN (NEW.entity_key = 'bms.meetingAgendaLinks')
  EXECUTE FUNCTION convay_private.guard_approved_agenda_meeting_link();
