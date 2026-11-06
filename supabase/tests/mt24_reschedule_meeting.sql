-- Rollback-only MT-24 acceptance fixture. Uses the existing Super Admin
-- principal; fixture meetings and audit rows never persist.
begin;

do $test$
declare
  v_leader uuid;
  v_unassigned uuid := gen_random_uuid();
  v_meeting_id text := 'MT24-RESCHEDULE-' || gen_random_uuid()::text;
  v_denied_id text := 'MT24-LEADERSHIP-DENIED-' || gen_random_uuid()::text;
  v_payload jsonb;
  v_expected_error boolean;
  v_new_date date := current_date + 14;
begin
  select user_id into v_leader
  from public.user_profiles
  where account_role = 'super_admin' and account_status = 'active'
  limit 1;
  if v_leader is null then
    raise exception 'An active Super Admin acceptance principal is required';
  end if;

  perform set_config('request.jwt.claim.sub', v_leader::text, true);
  if not convay_private.has_permission('mtg_postpone') then
    raise exception 'The acceptance principal lacks mtg_postpone';
  end if;

  insert into public.convay_entity_records(entity_key, record_id, payload, created_by, updated_by)
  values (
    'bms.meetings', v_meeting_id,
    jsonb_build_object(
      'id', v_meeting_id,
      'meeting_id', v_meeting_id,
      'approval_status', 'Published',
      'status', 'Published',
      'meeting_date', (current_date + 7)::text,
      'start_time', '10:00',
      'end_time', '11:00',
      'time_zone', 'Asia/Dhaka (GMT+6)',
      'chairperson_user_id', v_leader::text,
      'organizer_user_id', v_leader::text
    ),
    v_leader, v_leader
  );

  v_expected_error := false;
  begin
    perform public.convay_reschedule_meeting(
      v_meeting_id, v_new_date, time '11:00', time '12:00', 'No'
    );
  exception when sqlstate '22023' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A short reschedule reason was accepted';
  end if;

  v_expected_error := false;
  begin
    perform public.convay_reschedule_meeting(
      v_meeting_id, v_new_date, time '12:00', time '11:00', 'Schedule changed'
    );
  exception when sqlstate '22023' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'An end time before the start time was accepted';
  end if;

  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings' and record_id = v_meeting_id;
  if v_payload->>'approval_status' <> 'Published'
     or v_payload->>'meeting_date' <> (current_date + 7)::text then
    raise exception 'A rejected request changed the original meeting';
  end if;

  v_payload := public.convay_reschedule_meeting(
    v_meeting_id,
    v_new_date,
    time '14:30',
    time '15:30',
    'Chairperson availability changed.'
  );
  if v_payload->>'id' <> v_meeting_id
     or v_payload->>'approval_status' <> 'Rescheduled'
     or v_payload->>'status' <> 'Rescheduled'
     or v_payload->>'meeting_date' <> v_new_date::text
     or v_payload->>'start_time' <> '14:30'
     or v_payload->>'end_time' <> '15:30'
     or v_payload->>'time_zone' <> 'Asia/Dhaka (GMT+6)'
     or v_payload->>'reschedule_reason' <> 'Chairperson availability changed.'
     or v_payload->>'rescheduled_by' <> v_leader::text
     or nullif(v_payload->>'rescheduled_at', '') is null
     or jsonb_array_length(v_payload->'reschedule_history') <> 1 then
    raise exception 'Reschedule did not return the server-confirmed meeting state';
  end if;

  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings' and record_id = v_meeting_id;
  if v_payload->>'approval_status' <> 'Rescheduled'
     or v_payload->'reschedule_history'->0->'previous'->>'meeting_date' <> (current_date + 7)::text
     or v_payload->'reschedule_history'->0->'next'->>'meeting_date' <> v_new_date::text
     or v_payload->'reschedule_history'->0->>'actor_id' <> v_leader::text then
    raise exception 'Reschedule history did not preserve the prior and new schedule';
  end if;
  if v_payload->>'status' <> 'Rescheduled' then
    raise exception 'The meeting status alias did not match the rescheduled state';
  end if;

  if not exists (
    select 1 from convay_private.entity_changes
    where entity_key = 'bms.meetings'
      and record_id = v_meeting_id
      and operation = 'UPDATE'
      and actor_id = v_leader
      and previous_payload->>'approval_status' = 'Published'
      and new_payload->>'approval_status' = 'Rescheduled'
      and new_payload->>'reschedule_reason' = 'Chairperson availability changed.'
  ) then
    raise exception 'The reschedule audit event is missing';
  end if;

  v_expected_error := false;
  begin
    perform public.convay_reschedule_meeting(
      v_meeting_id,
      v_new_date,
      time '14:30',
      time '15:30',
      'Chairperson availability changed.'
    );
  exception when sqlstate '40001' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A duplicate reschedule was accepted';
  end if;

  insert into public.convay_entity_records(entity_key, record_id, payload, created_by, updated_by)
  values (
    'bms.meetings', v_denied_id,
    jsonb_build_object(
      'id', v_denied_id,
      'meeting_id', v_denied_id,
      'approval_status', 'Scheduled',
      'status', 'Scheduled',
      'meeting_date', (current_date + 7)::text,
      'start_time', '10:00',
      'end_time', '11:00',
      'time_zone', 'Asia/Dhaka (GMT+6)',
      'chairperson_user_id', v_unassigned::text,
      'organizer_user_id', v_unassigned::text
    ),
    v_leader, v_leader
  );

  v_expected_error := false;
  begin
    perform public.convay_reschedule_meeting(
      v_denied_id, v_new_date, time '14:30', time '15:30', 'No assigned leadership'
    );
  exception when sqlstate '42501' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A user without the meeting leadership assignment was allowed to reschedule';
  end if;

  perform set_config('request.jwt.claim.sub', v_unassigned::text, true);
  v_expected_error := false;
  begin
    perform public.convay_reschedule_meeting(
      v_meeting_id, v_new_date + 1, time '14:30', time '15:30', 'Permission denied test'
    );
  exception when sqlstate '42501' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A principal without mtg_postpone was allowed to reschedule';
  end if;

  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings' and record_id = v_meeting_id;
  if v_payload->>'approval_status' <> 'Rescheduled'
     or v_payload->>'meeting_date' <> v_new_date::text then
    raise exception 'A denied request changed the saved meeting';
  end if;

  perform set_config('request.jwt.claim.sub', v_leader::text, true);
  v_payload := public.convay_publish_meeting(v_meeting_id);
  if v_payload->>'approval_status' <> 'Published'
     or v_payload->>'status' <> 'Published'
     or v_payload->>'published_by' <> v_leader::text
     or nullif(v_payload->>'published_at', '') is null then
    raise exception 'The existing publish step could not recover a rescheduled meeting';
  end if;
end
$test$;

rollback;
select 'PASS: MT-24 schedule persistence, reason, history, audit, duplicate rejection and role/permission denial' as mt24_reschedule_meeting_result;
