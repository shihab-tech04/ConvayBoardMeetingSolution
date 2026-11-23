-- LM recovery: A completed live session remains immutable. Reopening creates a
-- separate session and records an independently auditable authorization.
-- Only the active platform Super Admin can call this recovery RPC.
CREATE TABLE IF NOT EXISTS convay_private.meeting_reopen_events (
  event_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meeting_id text NOT NULL,
  previous_session_id text NOT NULL,
  new_session_id text NOT NULL UNIQUE,
  actor_id uuid NOT NULL,
  reason text NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 10 AND 500),
  previous_ended_at text,
  reopened_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE convay_private.meeting_reopen_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON convay_private.meeting_reopen_events FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION convay_private.guard_closed_meeting_reopen()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  prior_state text := lower(btrim(coalesce(old.payload->>'approval_status','')));
  next_state text := lower(btrim(coalesce(new.payload->>'approval_status','')));
  actor uuid := auth.uid();
BEGIN
  IF old.entity_key <> 'bms.meetings' THEN RETURN new; END IF;
  IF prior_state IN ('awaiting minutes','minutes approved','completed','ended','archived',
                     'cancelled','canceled','rejected')
     AND next_state IN ('in progress','paused','on break','adjourned') THEN
    IF actor IS NULL
       OR pg_catalog.current_setting('convay.authorized_meeting_reopen',true)
          IS DISTINCT FROM actor::text
       OR NOT EXISTS (
         SELECT 1 FROM public.user_profiles p
         WHERE p.user_id=actor AND p.account_role='super_admin'
           AND p.account_status='active'
       )
       OR NOT convay_private.has_permission('mtg_start') THEN
      RAISE EXCEPTION 'Closed meetings require an audited Super Admin reopening'
        USING errcode='42501';
    END IF;
  END IF;
  RETURN new;
END $$;
REVOKE ALL ON FUNCTION convay_private.guard_closed_meeting_reopen() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS convay_a0_closed_meeting_reopen ON public.convay_entity_records;
CREATE TRIGGER convay_a0_closed_meeting_reopen
BEFORE UPDATE OF payload ON public.convay_entity_records
FOR EACH ROW WHEN (old.entity_key = 'bms.meetings')
EXECUTE FUNCTION convay_private.guard_closed_meeting_reopen();

CREATE OR REPLACE FUNCTION public.convay_reopen_meeting(
  p_meeting_id text, p_reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  actor uuid := auth.uid();
  saved public.convay_entity_records%rowtype;
  previous_session public.convay_entity_records%rowtype;
  mid text;
  reason_clean text := btrim(coalesce(p_reason,''));
  total_sessions integer;
  ended_sessions integer;
  next_session_id text;
  reopened_at timestamptz := clock_timestamp();
  event_number bigint;
BEGIN
  IF p_meeting_id IS NULL OR p_meeting_id !~ '^[A-Za-z0-9_-]{1,160}$' THEN
    RAISE EXCEPTION 'A valid saved meeting ID is required' USING errcode='22023';
  END IF;
  IF char_length(reason_clean) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'Provide a reopening reason of 10 to 500 characters'
      USING errcode='22023';
  END IF;
  IF actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_profiles p WHERE p.user_id=actor
      AND p.account_role='super_admin' AND p.account_status='active'
  ) OR NOT convay_private.has_permission('mtg_start') THEN
    RAISE EXCEPTION 'Only an active Super Admin may reopen a meeting'
      USING errcode='42501';
  END IF;

  SELECT * INTO saved FROM public.convay_entity_records m
    WHERE m.entity_key='bms.meetings'
      AND (m.record_id=p_meeting_id OR m.payload->>'meeting_id'=p_meeting_id)
    ORDER BY (m.record_id=p_meeting_id) DESC LIMIT 1 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Saved meeting not found' USING errcode='P0002';
  END IF;
  mid := coalesce(nullif(saved.payload->>'meeting_id',''),saved.record_id);

  -- This is a narrowly defined recovery for a meeting ended before minutes
  -- were recorded, NOT an override of cancelled or approved governance records.
  IF lower(btrim(coalesce(saved.payload->>'approval_status',''))) <> 'awaiting minutes'
     OR coalesce(saved.payload->>'mode','') NOT IN ('Virtual','Hybrid')
     OR lower(btrim(coalesce(saved.payload->>'status',''))) IN
       ('cancelled','canceled','rejected','completed','ended','archived')
     OR lower(btrim(coalesce(saved.payload->>'workflow_status',''))) IN
       ('cancelled','canceled','rejected','completed','ended','archived')
     OR EXISTS (
       SELECT 1 FROM public.convay_entity_records x
       WHERE x.entity_key='bms.minutes' AND x.payload->>'meeting_id'=mid
     ) THEN
    RAISE EXCEPTION 'Only an ended online meeting without recorded minutes can be reopened'
      USING errcode='23514';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE lower(s.payload->>'session_status')='ended')
    INTO total_sessions,ended_sessions
    FROM public.convay_entity_records s
    WHERE s.entity_key='bms.liveSessions' AND s.payload->>'meeting_id'=mid;
  IF total_sessions < 1 OR total_sessions <> ended_sessions THEN
    RAISE EXCEPTION 'Reopening requires only closed sessions and no active room'
      USING errcode='23514';
  END IF;

  SELECT * INTO previous_session FROM public.convay_entity_records s
    WHERE s.entity_key='bms.liveSessions' AND s.payload->>'meeting_id'=mid
      AND lower(s.payload->>'session_status')='ended'
    ORDER BY s.payload->>'ended_at' DESC NULLS LAST, s.record_id DESC
    LIMIT 1;
  next_session_id := 'SES-' || mid || '-R' || (total_sessions + 1)::text;
  IF EXISTS (
    SELECT 1 FROM public.convay_entity_records s
    WHERE s.entity_key='bms.liveSessions' AND s.record_id=next_session_id
  ) THEN
    RAISE EXCEPTION 'Meeting recovery session identity collision' USING errcode='23505';
  END IF;

  -- The start-authority and deferred session constraints keep the original
  -- first-start actor/timestamp. This new session separately records actual
  -- recovery start time for future metering and reconciliation.
  PERFORM pg_catalog.set_config('convay.authorized_meeting_reopen', actor::text, true);
  PERFORM pg_catalog.set_config('convay.admin_force_start', 'true', true);
  UPDATE public.convay_entity_records m
    SET payload = pg_catalog.jsonb_set(
      m.payload || pg_catalog.jsonb_build_object(
        'reopened_at',reopened_at,'reopened_by',actor::text),
      '{approval_status}',to_jsonb('In Progress'::text),true)
    WHERE m.entity_key='bms.meetings' AND m.record_id=saved.record_id;

  INSERT INTO public.convay_entity_records(entity_key,record_id,payload)
  VALUES ('bms.liveSessions',next_session_id,
     pg_catalog.jsonb_build_object(
       'id',next_session_id,'meeting_id',mid,'session_status','active',
       'reopen_started_at',reopened_at,'reopen_started_by',actor::text,
       'reopened_from_session_id',previous_session.record_id,
       'recording_status','not_started','transcription_status','not_started',
       'minutes_capture_status','not_started'
     ));

  INSERT INTO convay_private.meeting_reopen_events(
    meeting_id,previous_session_id,new_session_id,actor_id,reason,
    previous_ended_at,reopened_at
  ) VALUES (
    mid,previous_session.record_id,next_session_id,actor,reason_clean,
    previous_session.payload->>'ended_at',reopened_at
  ) RETURNING event_id INTO event_number;

  RETURN pg_catalog.jsonb_build_object(
    'meetingId',mid,'sessionId',next_session_id,'status','In Progress',
    'reopenedAt',reopened_at,'reopenEventId',event_number
  );
END $$;
REVOKE ALL ON FUNCTION public.convay_reopen_meeting(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.convay_reopen_meeting(text,text) TO authenticated;
