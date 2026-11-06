-- Rollback-only MT-25 acceptance fixture. Uses existing authenticated identities.
begin;

do $test$
declare
  v_leader uuid;
  v_candidate uuid;
  v_no_permission uuid;
  v_status text;
  v_new_date date := current_date + 14;
  v_meeting_id text;
  v_invalid_id text := 'MT25-SHORT-REASON-' || gen_random_uuid()::text;
  v_draft_id text := 'MT25-DRAFT-DENIED-' || gen_random_uuid()::text;
  v_no_permission_id text := 'MT25-PERMISSION-DENIED-' || gen_random_uuid()::text;
  v_payload jsonb;
  v_expected_error boolean;
  v_unassigned uuid;
begin
  select user_id into v_leader
  from public.user_profiles
  where account_role = 'super_admin'
    and account_status = 'active'
  limit 1;
  if v_leader is null then
    raise exception 'An active Super Admin acceptance principal is required';
  end if;

  perform set_config('request.jwt.claim.sub', v_leader::text, true);
  if not coalesce(convay_private.has_permission('mtg_cancel'), false) then
    raise exception 'The acceptance principal lacks mtg_cancel';
  end if;

  v_no_permission := null;
  for v_candidate in
    select user_id
    from public.user_profiles
    where account_status = 'active'
      and user_id <> v_leader
    order by user_id
  loop
    perform set_config('request.jwt.claim.sub', v_candidate::text, true);
    if not coalesce(convay_private.has_permission('mtg_cancel'), false) then
      v_no_permission := v_candidate;
      exit;
    end if;
  end loop;
  if v_no_permission is null then
    raise exception 'An existing active principal without mtg_cancel is required';
  end if;

  perform set_config('request.jwt.claim.sub', v_leader::text, true);
  foreach v_status in array array['Scheduled', 'Rescheduled', 'Published', 'Ready to Start']
  loop
    v_meeting_id := 'MT25-CANCEL-' || replace(upper(v_status), ' ', '-') || '-' || gen_random_uuid()::text;
    insert into public.convay_entity_records(entity_key, record_id, payload, created_by, updated_by)
    values (
      'bms.meetings',
      v_meeting_id,
      jsonb_build_object(
        'id', v_meeting_id,
        'meeting_id', v_meeting_id,
        'approval_status', 'Scheduled',
        'status', 'Scheduled',
        'meeting_date', (current_date + 7)::text,
        'start_time', '10:00',
        'end_time', '11:00',
        'time_zone', 'Asia/Dhaka (GMT+6)',
        'chairperson_user_id', v_leader::text,
        'organizer_user_id', v_leader::text
      ),
      v_leader,
      v_leader
    );

    if v_status = 'Rescheduled' then
      perform public.convay_reschedule_meeting(
        v_meeting_id,
        v_new_date,
        time '11:30',
        time '12:30',
        'MT-25 fixture schedule change.'
      );
    elsif v_status = 'Published' then
      perform public.convay_publish_meeting(v_meeting_id);
    elsif v_status = 'Ready to Start' then
      update public.convay_entity_records
      set payload = payload || jsonb_build_object(
        'approval_status', 'Ready to Start',
        'status', 'Ready to Start'
      )
      where entity_key = 'bms.meetings'
        and record_id = v_meeting_id;
    end if;

    v_payload := public.convay_cancel_meeting(v_meeting_id, 'Owner requested cancellation.');
    if v_payload->>'id' <> v_meeting_id
       or v_payload->>'approval_status' <> 'Cancelled'
       or v_payload->>'status' <> 'Cancelled'
       or v_payload->>'cancellation_reason' <> 'Owner requested cancellation.'
       or v_payload->>'cancelled_by' <> v_leader::text
       or nullif(v_payload->>'cancelled_at', '') is null then
      raise exception 'The % cancellation was not fully confirmed', v_status;
    end if;

    select payload into v_payload
    from public.convay_entity_records
    where entity_key = 'bms.meetings'
      and record_id = v_meeting_id;
    if v_payload->>'approval_status' <> 'Cancelled'
       or v_payload->>'status' <> 'Cancelled'
       or v_payload->>'cancellation_reason' <> 'Owner requested cancellation.' then
      raise exception 'The % cancellation did not persist to the canonical meeting row', v_status;
    end if;

    if not exists (
      select 1
      from convay_private.entity_changes
      where entity_key = 'bms.meetings'
        and record_id = v_meeting_id
        and operation = 'UPDATE'
        and actor_id = v_leader
        and previous_payload->>'approval_status' = v_status
        and new_payload->>'approval_status' = 'Cancelled'
        and new_payload->>'cancellation_reason' = 'Owner requested cancellation.'
    ) then
      raise exception 'The % cancellation audit event is missing', v_status;
    end if;

    if v_status = 'Scheduled' then
      v_expected_error := false;
      begin
        perform public.convay_cancel_meeting(v_meeting_id, 'A duplicate cancellation');
      exception when sqlstate '40001' then
        v_expected_error := true;
      end;
      if not v_expected_error then
        raise exception 'A duplicate cancellation was accepted';
      end if;
      select payload into v_payload
      from public.convay_entity_records
      where entity_key = 'bms.meetings'
        and record_id = v_meeting_id;
      if v_payload->>'cancellation_reason' <> 'Owner requested cancellation.' then
        raise exception 'A duplicate request changed the persisted cancellation reason';
      end if;
    end if;
  end loop;

  v_invalid_id := 'MT25-SHORT-REASON-' || gen_random_uuid()::text;
  insert into public.convay_entity_records(entity_key, record_id, payload, created_by, updated_by)
  values (
    'bms.meetings',
    v_invalid_id,
    jsonb_build_object(
      'id', v_invalid_id,
      'meeting_id', v_invalid_id,
      'approval_status', 'Scheduled',
      'status', 'Scheduled',
      'chairperson_user_id', v_leader::text,
      'organizer_user_id', v_leader::text
    ),
    v_leader,
    v_leader
  );
  v_expected_error := false;
  begin
    perform public.convay_cancel_meeting(v_invalid_id, 'No');
  exception when sqlstate '22023' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A short cancellation reason was accepted';
  end if;
  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings'
    and record_id = v_invalid_id;
  if v_payload->>'approval_status' <> 'Scheduled'
     or v_payload ? 'cancelled_by'
     or v_payload ? 'cancelled_at' then
    raise exception 'A rejected short reason changed the meeting';
  end if;

  insert into public.convay_entity_records(entity_key, record_id, payload, created_by, updated_by)
  values (
    'bms.meetings',
    v_draft_id,
    jsonb_build_object(
      'id', v_draft_id,
      'meeting_id', v_draft_id,
      'approval_status', 'Draft',
      'status', 'Draft',
      'chairperson_user_id', v_leader::text,
      'organizer_user_id', v_leader::text
    ),
    v_leader,
    v_leader
  );
  v_expected_error := false;
  begin
    perform public.convay_cancel_meeting(v_draft_id, 'Draft meetings cannot be cancelled');
  exception when sqlstate '40001' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A draft meeting was allowed to be cancelled';
  end if;
  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings'
    and record_id = v_draft_id;
  if v_payload->>'approval_status' <> 'Draft' then
    raise exception 'A rejected draft cancellation changed the meeting';
  end if;

  select user_id into v_unassigned
  from public.user_profiles
  where account_status = 'active'
    and user_id <> v_leader
  order by user_id
  limit 1;
  if v_unassigned is null then
    raise exception 'An existing second active principal is required for the leadership predicate check';
  end if;

  -- No active non-Super-Admin account in this production role catalog has
  -- mtg_cancel, so an end-to-end RPC denial cannot use a real authorized actor.
  -- Exercise the same existing meeting-leadership predicate with real identities.
  if convay_private.is_meeting_leader(
    v_leader,
    jsonb_build_object(
      'chairperson_user_id', v_unassigned::text,
      'organizer_user_id', v_unassigned::text
    ),
    v_unassigned
  ) then
    raise exception 'The meeting leadership predicate allowed a different chair/organizer/creator';
  end if;
  if not convay_private.is_meeting_leader(
    v_unassigned,
    jsonb_build_object(
      'chairperson_user_id', v_unassigned::text,
      'organizer_user_id', v_unassigned::text
    ),
    v_unassigned
  ) then
    raise exception 'The assigned meeting leadership predicate rejected its existing principal';
  end if;

  v_no_permission_id := 'MT25-PERMISSION-DENIED-' || gen_random_uuid()::text;
  insert into public.convay_entity_records(entity_key, record_id, payload, created_by, updated_by)
  values (
    'bms.meetings',
    v_no_permission_id,
    jsonb_build_object(
      'id', v_no_permission_id,
      'meeting_id', v_no_permission_id,
      'approval_status', 'Scheduled',
      'status', 'Scheduled',
      'chairperson_user_id', v_leader::text,
      'organizer_user_id', v_leader::text
    ),
    v_leader,
    v_leader
  );
  perform set_config('request.jwt.claim.sub', v_no_permission::text, true);
  v_expected_error := false;
  begin
    perform public.convay_cancel_meeting(v_no_permission_id, 'Permission should be denied');
  exception when sqlstate '42501' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A principal without mtg_cancel was allowed to cancel';
  end if;
  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings'
    and record_id = v_no_permission_id;
  if v_payload->>'approval_status' <> 'Scheduled'
     or v_payload ? 'cancelled_by' then
    raise exception 'A denied permission request changed the meeting';
  end if;
end
$test$;

rollback;
select 'PASS: MT-25 cancellation state matrix, server persistence, audit, duplicate, reason, leadership and permission checks' as mt25_cancel_meeting_result;
