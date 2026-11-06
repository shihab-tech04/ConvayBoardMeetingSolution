-- Rollback-only MT-22 acceptance fixture. Uses existing Auth principals only;
-- no Auth users or persistent meeting/session rows are created.
begin;

do $test$
declare
  v_leader uuid;
  v_leader_name text;
  v_other_leader uuid;
  v_candidate uuid;
  v_permission_denied_user uuid;
  v_permission_denial_tested boolean := false;
  v_meeting_id text := 'MT22-START-' || gen_random_uuid()::text;
  v_session_id text;
  v_early_id text := 'MT22-EARLY-' || gen_random_uuid()::text;
  v_late_id text := 'MT22-LATE-' || gen_random_uuid()::text;
  v_denied_leader_id text := 'MT22-DENIED-LEADER-' || gen_random_uuid()::text;
  v_denied_permission_id text := 'MT22-DENIED-PERMISSION-' || gen_random_uuid()::text;
  v_incomplete_id text := 'MT22-INCOMPLETE-' || gen_random_uuid()::text;
  v_duplicate_session_id text := 'MT22-DUPLICATE-SESSION-' || gen_random_uuid()::text;
  v_schedule timestamptz;
  v_payload jsonb;
  v_session jsonb;
  v_original_started_at text;
  v_original_started_by text;
  v_expected_error boolean;
begin
  select user_id, display_name into v_leader, v_leader_name
  from public.user_profiles
  where account_role = 'super_admin' and account_status = 'active'
  limit 1;
  if v_leader is null then
    raise exception 'An active Super Admin acceptance principal is required';
  end if;
  perform set_config('request.jwt.claim.sub', v_leader::text, true);
  if not convay_private.has_permission('mtg_start') then
    raise exception 'The active Super Admin does not have mtg_start permission';
  end if;

  select user_id into v_other_leader
  from public.user_profiles
  where account_status = 'active' and user_id <> v_leader
  order by user_id
  limit 1;
  if v_other_leader is null then
    raise exception 'An alternate active principal is required for leadership denial coverage';
  end if;

  -- A real authorized leader starts inside the saved Asia/Dhaka window. Client
  -- supplied start metadata is deliberately false and must be replaced by SQL.
  v_schedule := date_trunc('minute', clock_timestamp() + interval '5 minutes');
  v_session_id := 'SES-' || v_meeting_id;
  insert into public.convay_entity_records(entity_key,record_id,payload,created_by,updated_by)
  values (
    'bms.meetings', v_meeting_id,
    jsonb_build_object(
      'id',v_meeting_id,'meeting_id',v_meeting_id,
      'approval_status','Published','status','Published',
      'meeting_date',to_char(v_schedule at time zone 'Asia/Dhaka','YYYY-MM-DD'),
      'start_time',to_char(v_schedule at time zone 'Asia/Dhaka','HH24:MI'),
      'time_zone','Asia/Dhaka (GMT+6)',
      'chairperson_user_id',v_leader::text,
      'organizer_user_id',v_leader::text
    ),
    v_leader,v_leader
  );

  if public.convay_apply_entity_batch(jsonb_build_array(
    jsonb_build_object('entity_key','bms.meetings','action','update','record_id',v_meeting_id,
      'payload',jsonb_build_object('approval_status','In Progress','started_by','client-spoof','started_at','2000-01-01T00:00:00Z')),
    jsonb_build_object('entity_key','bms.liveSessions','action','create','record_id',v_session_id,
      'payload',jsonb_build_object('id',v_session_id,'meeting_id',v_meeting_id,'session_status','active',
        'started_by','client-spoof','started_at','2000-01-01T00:00:00Z','created_at','2000-01-01T00:00:00Z'))
  )) <> 2 then
    raise exception 'Start batch did not persist exactly the meeting and live-session records';
  end if;

  select payload into v_payload from public.convay_entity_records
  where entity_key='bms.meetings' and record_id=v_meeting_id;
  select payload into v_session from public.convay_entity_records
  where entity_key='bms.liveSessions' and record_id=v_session_id;
  if v_payload->>'approval_status' <> 'In Progress'
     or v_payload->>'started_by' <> v_leader::text
     or nullif(v_payload->>'started_at','') is null
     or v_payload->>'started_at' = '2000-01-01T00:00:00Z'
     or v_session->>'session_status' <> 'active'
     or v_session->>'started_by' <> v_payload->>'started_by'
     or v_session->>'started_at' <> v_payload->>'started_at'
     or v_session->>'created_at' <> v_payload->>'started_at' then
    raise exception 'Start did not persist the canonical server-stamped meeting and live session';
  end if;
  if not exists (
    select 1 from convay_private.entity_changes
    where entity_key='bms.meetings' and record_id=v_meeting_id
      and operation='UPDATE' and actor_id=v_leader
      and previous_payload->>'approval_status'='Published'
      and new_payload->>'approval_status'='In Progress'
      and new_payload->>'started_by'=v_leader::text
  ) then
    raise exception 'Meeting start audit event is missing or incomplete';
  end if;
  execute 'SET CONSTRAINTS convay_meeting_start_requires_session IMMEDIATE';
  execute 'SET CONSTRAINTS convay_meeting_start_requires_session DEFERRED';

  -- A duplicate active session cannot be added for the same meeting.
  v_expected_error := false;
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(
      jsonb_build_object('entity_key','bms.liveSessions','action','create','record_id',v_duplicate_session_id,
        'payload',jsonb_build_object('id',v_duplicate_session_id,'meeting_id',v_meeting_id,
          'session_status','active','started_by',v_leader::text,'started_at',v_payload->>'started_at'))
    ));
  exception when unique_violation then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A duplicate active live session was accepted';
  end if;

  -- Pausing and resuming remains supported; it preserves the original start evidence.
  v_original_started_at := v_payload->>'started_at';
  v_original_started_by := v_payload->>'started_by';
  perform public.convay_apply_entity_batch(jsonb_build_array(
    jsonb_build_object('entity_key','bms.meetings','action','update','record_id',v_meeting_id,
      'payload',jsonb_build_object('approval_status','Paused')),
    jsonb_build_object('entity_key','bms.liveSessions','action','update','record_id',v_session_id,
      'payload',jsonb_build_object('session_status','paused'))
  ));
  perform public.convay_apply_entity_batch(jsonb_build_array(
    jsonb_build_object('entity_key','bms.meetings','action','update','record_id',v_meeting_id,
      'payload',jsonb_build_object('approval_status','In Progress')),
    jsonb_build_object('entity_key','bms.liveSessions','action','update','record_id',v_session_id,
      'payload',jsonb_build_object('session_status','active'))
  ));
  select payload into v_payload from public.convay_entity_records
  where entity_key='bms.meetings' and record_id=v_meeting_id;
  select payload into v_session from public.convay_entity_records
  where entity_key='bms.liveSessions' and record_id=v_session_id;
  if v_payload->>'started_at' <> v_original_started_at
     or v_payload->>'started_by' <> v_original_started_by
     or v_session->>'started_at' <> v_original_started_at
     or v_session->>'started_by' <> v_original_started_by
     or v_session->>'session_status' <> 'active' then
    raise exception 'Resume changed the original start actor/time or failed to reactivate the saved session';
  end if;

  -- Start outside the existing inclusive 15-minute-early / 120-minute-late window.
  v_schedule := clock_timestamp() + interval '1 hour';
  insert into public.convay_entity_records(entity_key,record_id,payload,created_by,updated_by)
  values ('bms.meetings',v_early_id,
    jsonb_build_object('id',v_early_id,'meeting_id',v_early_id,'approval_status','Published',
      'meeting_date',to_char(v_schedule at time zone 'UTC','YYYY-MM-DD'),
      'start_time',to_char(v_schedule at time zone 'UTC','HH24:MI'),'time_zone','UTC',
      'chairperson_user_id',v_leader::text,'organizer_user_id',v_leader::text),v_leader,v_leader);
  v_expected_error := false;
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(
      jsonb_build_object('entity_key','bms.meetings','action','update','record_id',v_early_id,
        'payload',jsonb_build_object('approval_status','In Progress'))
    ));
  exception when check_violation then
    v_expected_error := true;
  end;
  if not v_expected_error then raise exception 'A meeting scheduled too far in the future was started'; end if;
  select payload into v_payload from public.convay_entity_records where entity_key='bms.meetings' and record_id=v_early_id;
  if v_payload->>'approval_status' <> 'Published' or v_payload ? 'started_at' then
    raise exception 'Rejected early start changed persisted meeting state';
  end if;

  v_schedule := clock_timestamp() - interval '3 hours';
  insert into public.convay_entity_records(entity_key,record_id,payload,created_by,updated_by)
  values ('bms.meetings',v_late_id,
    jsonb_build_object('id',v_late_id,'meeting_id',v_late_id,'approval_status','Published',
      'meeting_date',to_char(v_schedule at time zone 'UTC','YYYY-MM-DD'),
      'start_time',to_char(v_schedule at time zone 'UTC','HH24:MI'),'time_zone','UTC',
      'chairperson_user_id',v_leader::text,'organizer_user_id',v_leader::text),v_leader,v_leader);
  v_expected_error := false;
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(
      jsonb_build_object('entity_key','bms.meetings','action','update','record_id',v_late_id,
        'payload',jsonb_build_object('approval_status','In Progress'))
    ));
  exception when check_violation then
    v_expected_error := true;
  end;
  if not v_expected_error then raise exception 'A meeting outside the late start window was started'; end if;
  select payload into v_payload from public.convay_entity_records where entity_key='bms.meetings' and record_id=v_late_id;
  if v_payload->>'approval_status' <> 'Published' or v_payload ? 'started_at' then
    raise exception 'Rejected late start changed persisted meeting state';
  end if;

  -- An authorized Super Admin cannot start a meeting assigned to somebody else.
  v_schedule := clock_timestamp() + interval '5 minutes';
  insert into public.convay_entity_records(entity_key,record_id,payload,created_by,updated_by)
  values ('bms.meetings',v_denied_leader_id,
    jsonb_build_object('id',v_denied_leader_id,'meeting_id',v_denied_leader_id,'approval_status','Published',
      'meeting_date',to_char(v_schedule at time zone 'UTC','YYYY-MM-DD'),
      'start_time',to_char(v_schedule at time zone 'UTC','HH24:MI'),'time_zone','UTC',
      'chairperson_user_id',v_other_leader::text,'organizer_user_id',v_other_leader::text),null,null);
  v_expected_error := false;
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(
      jsonb_build_object('entity_key','bms.meetings','action','update','record_id',v_denied_leader_id,
        'payload',jsonb_build_object('approval_status','In Progress'))
    ));
  exception when insufficient_privilege then
    v_expected_error := true;
  end;
  if not v_expected_error then raise exception 'A principal without assigned meeting leadership was allowed to start'; end if;

  -- If an existing active account lacks mtg_start, confirm the permission denial
  -- using that real account. No test Auth users are inserted or impersonated.
  for v_candidate in
    select user_id from public.user_profiles where account_status='active' order by user_id
  loop
    perform set_config('request.jwt.claim.sub',v_candidate::text,true);
    if not convay_private.has_permission('mtg_start') then
      v_permission_denied_user := v_candidate;
      exit;
    end if;
  end loop;
  if v_permission_denied_user is not null then
    v_permission_denial_tested := true;
    perform set_config('request.jwt.claim.sub',v_leader::text,true);
    v_schedule := clock_timestamp() + interval '5 minutes';
    insert into public.convay_entity_records(entity_key,record_id,payload,created_by,updated_by)
    values ('bms.meetings',v_denied_permission_id,
      jsonb_build_object('id',v_denied_permission_id,'meeting_id',v_denied_permission_id,'approval_status','Published',
        'meeting_date',to_char(v_schedule at time zone 'UTC','YYYY-MM-DD'),
        'start_time',to_char(v_schedule at time zone 'UTC','HH24:MI'),'time_zone','UTC',
        'chairperson_user_id',v_permission_denied_user::text,'organizer_user_id',v_permission_denied_user::text),
      v_leader,v_leader);
    perform set_config('request.jwt.claim.sub',v_permission_denied_user::text,true);
    v_expected_error := false;
    begin
      perform public.convay_apply_entity_batch(jsonb_build_array(
        jsonb_build_object('entity_key','bms.meetings','action','update','record_id',v_denied_permission_id,
          'payload',jsonb_build_object('approval_status','In Progress'))
      ));
    exception when insufficient_privilege then
      v_expected_error := true;
    end;
    if not v_expected_error then raise exception 'A real active user without mtg_start permission was allowed to start'; end if;
    perform set_config('request.jwt.claim.sub',v_leader::text,true);
  end if;

  -- The meeting transition and active session must be in one confirmed batch.
  v_schedule := clock_timestamp() + interval '5 minutes';
  insert into public.convay_entity_records(entity_key,record_id,payload,created_by,updated_by)
  values ('bms.meetings',v_incomplete_id,
    jsonb_build_object('id',v_incomplete_id,'meeting_id',v_incomplete_id,'approval_status','Published',
      'meeting_date',to_char(v_schedule at time zone 'UTC','YYYY-MM-DD'),
      'start_time',to_char(v_schedule at time zone 'UTC','HH24:MI'),'time_zone','UTC',
      'chairperson_user_id',v_leader::text,'organizer_user_id',v_leader::text),v_leader,v_leader);
  v_expected_error := false;
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(
      jsonb_build_object('entity_key','bms.meetings','action','update','record_id',v_incomplete_id,
        'payload',jsonb_build_object('approval_status','In Progress'))
    ));
    execute 'SET CONSTRAINTS convay_meeting_start_requires_session IMMEDIATE';
    raise exception 'A start without its live session passed the deferred integrity check';
  exception when check_violation then
    v_expected_error := true;
  end;
  execute 'SET CONSTRAINTS convay_meeting_start_requires_session DEFERRED';
  if not v_expected_error then raise exception 'Start without an atomic live session was not rejected'; end if;
  select payload into v_payload from public.convay_entity_records where entity_key='bms.meetings' and record_id=v_incomplete_id;
  if v_payload->>'approval_status' <> 'Published' or v_payload ? 'started_at' then
    raise exception 'A failed incomplete start was not rolled back';
  end if;

  if not v_permission_denial_tested then
    raise notice 'UNVERIFIED: no active account without mtg_start permission exists for the live SQL permission-denial case';
  end if;
end
$test$;

rollback;
select 'PASS: MT-22 server-stamped start, saved-timezone window, leadership, audit, atomic live session, duplicate prevention, and resume checks; permission denial reflects available active role accounts' as mt22_start_meeting_result;
