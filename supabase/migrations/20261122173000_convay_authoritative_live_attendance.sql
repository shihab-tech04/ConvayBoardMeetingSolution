-- LM-07/09/10 authoritative attendance transaction. No UI/layout changes.
-- This migration is staged; the client release flag remains disabled until
-- real role/provider tests and independent rollback/recovery are complete.
create table if not exists convay_private.live_attendance_commands (
  request_id text primary key,
  actor_id uuid not null,
  meeting_id text not null,
  participant_id text not null,
  next_status text not null,
  expected_revision bigint not null,
  receipt jsonb not null,
  recorded_at timestamptz not null default now()
);
alter table convay_private.live_attendance_commands enable row level security;
revoke all on convay_private.live_attendance_commands from public, anon, authenticated;

create table if not exists convay_private.live_quorum_snapshots (
  meeting_id text primary key,
  revision bigint not null check (revision > 0),
  required integer not null check (required >= 0),
  present integer not null check (present >= 0),
  met boolean not null,
  updated_at timestamptz not null default now()
);
alter table convay_private.live_quorum_snapshots enable row level security;
revoke all on convay_private.live_quorum_snapshots from public, anon, authenticated;

create or replace function public.convay_commit_live_attendance(
  p_actor_id uuid, p_meeting_id text, p_participant_id text,
  p_next_status text, p_expected_revision bigint, p_request_id text,
  p_provider_confirmed boolean, p_attendance_mode text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_meeting record;
  v_previous record;
  v_existing record;
  v_session_count integer;
  v_link_count integer;
  v_link jsonb;
  v_rule jsonb;
  v_state record;
  v_actor_name text;
  v_account_role text;
  v_participant_name text;
  v_actual_mid text;
  v_mode text;
  v_actor_can_join boolean;
  v_actor_can_attend boolean;
  v_actor_is_leader boolean;
  v_role text;
  v_key text;
  v_att_id text;
  v_att_revision bigint;
  v_payload jsonb;
  v_quorum_revision bigint;
  v_total integer;
  v_present integer;
  v_min integer;
  v_percent numeric;
  v_required integer;
  v_met boolean;
  v_record_at timestamptz := clock_timestamp();
  v_receipt jsonb;
begin
  -- CALLER TRUST: this RPC has EXECUTE only for service_role. Edge verifies the
  -- Supabase Auth JWT, project account state and actual LiveKit participant.
  -- Never grant this RPC to authenticated/anon.
  if p_actor_id is null or p_meeting_id !~ '^[A-Za-z0-9_-]{1,180}$'
    or p_participant_id !~ '^[A-Za-z0-9_-]{1,180}$'
    or p_request_id !~ '^[A-Za-z0-9_-]{16,120}$'
    or p_expected_revision is null or p_expected_revision < 0
    or p_next_status not in ('Present','Temporarily Away','Left','Excused','Recused')
    or p_attendance_mode not in ('Online','In-Person') then
    raise exception 'Invalid attendance command' using errcode='22023';
  end if;

  select p.display_name, p.account_role into v_actor_name, v_account_role
    from public.user_profiles p
    where p.user_id=p_actor_id and p.account_status='active';
  if v_actor_name is null then
    raise exception 'Active verified Convay account required' using errcode='42501';
  end if;
  -- Bind the service-side verified actor to audit and existing RLS helpers.
  perform pg_catalog.set_config('request.jwt.claim.sub',p_actor_id::text,true);
  v_actor_can_join := convay_private.has_permission('mtg_join');
  v_actor_can_attend := convay_private.has_permission('mtg_attendance');
  if not convay_private.has_permission('mtg_view') then
    raise exception 'Meeting read permission required' using errcode='42501';
  end if;

  select m.* into v_meeting from public.convay_entity_records m
   where m.entity_key='bms.meetings'
     and (m.record_id=p_meeting_id or m.payload->>'meeting_id'=p_meeting_id)
   order by (m.record_id=p_meeting_id) desc limit 1 for update;
  if not found then
    raise exception 'Meeting unavailable' using errcode='P0002';
  end if;
  v_actual_mid:=coalesce(nullif(v_meeting.payload->>'meeting_id',''),v_meeting.record_id);
  if lower(coalesce(v_meeting.payload->>'approval_status','')) not in ('in progress','paused','on break')
     or lower(coalesce(v_meeting.payload->>'status','')) in ('cancelled','canceled','rejected','completed','ended','archived','draft')
     or lower(coalesce(v_meeting.payload->>'workflow_status','')) in ('cancelled','canceled','rejected','completed','ended','archived','draft') then
    raise exception 'Meeting is not in an active state' using errcode='23514';
  end if;
  select count(*) into v_session_count from public.convay_entity_records s
    where s.entity_key='bms.liveSessions' and s.payload->>'meeting_id'=v_actual_mid
      and lower(s.payload->>'session_status') in ('active','paused');
  if v_session_count <> 1 then
    raise exception 'Exactly one active or paused session required' using errcode='23514';
  end if;

  v_mode:=coalesce(nullif(v_meeting.payload->>'mode',''),v_meeting.payload->>'meeting_mode');
  if v_mode not in ('Virtual','Hybrid','Physical') then
    raise exception 'A supported meeting mode is required' using errcode='23514';
  end if;
  if (v_mode='Physical' and p_attendance_mode='Online')
    or (v_mode='Virtual' and p_attendance_mode='In-Person') then
    raise exception 'Attendance mode conflicts with meeting mode' using errcode='23514';
  end if;

  select count(*) into v_link_count from public.convay_entity_records l
    where l.entity_key='bms.meetingParticipantLinks'
      and l.payload->>'meeting_id'=v_actual_mid
      and l.payload->>'user_id'=p_participant_id;
  if v_link_count <> 1 then
    raise exception 'Exactly one saved participant relationship required' using errcode='23503';
  end if;
  select l.payload into v_link from public.convay_entity_records l
    where l.entity_key='bms.meetingParticipantLinks'
      and l.payload->>'meeting_id'=v_actual_mid
      and l.payload->>'user_id'=p_participant_id limit 1;
  v_actor_is_leader:=convay_private.is_meeting_leader(p_actor_id,v_meeting.payload,v_meeting.created_by);
  if p_actor_id::text=p_participant_id then
    if p_attendance_mode='Online' and not v_actor_can_join then
      raise exception 'Meeting join permission required' using errcode='42501';
    end if;
    if p_attendance_mode='In-Person' and not (v_actor_can_attend and (v_actor_is_leader or v_account_role='super_admin')) then
      raise exception 'Manual attendance requires authorized meeting leadership' using errcode='42501';
    end if;
    if p_next_status in ('Recused','Excused') and not (v_actor_can_attend and (v_actor_is_leader or v_account_role='super_admin')) then
      raise exception 'Only meeting leadership may set formal absence or recusal' using errcode='42501';
    end if;
  elsif not (v_actor_can_attend and (v_actor_is_leader or v_account_role='super_admin')) then
    raise exception 'Only authorized meeting leadership may edit another participant' using errcode='42501';
  end if;
  if p_attendance_mode='Online' and p_next_status='Present'
    and p_provider_confirmed is distinct from true then
    raise exception 'LiveKit presence confirmation required' using errcode='42501';
  end if;

  -- This per-meeting row lock serializes attendance and quorum updates.
  select * into v_previous from convay_private.live_attendance_commands
    where request_id=p_request_id;
  if found then
    if v_previous.actor_id<>p_actor_id or v_previous.meeting_id<>v_actual_mid
       or v_previous.participant_id<>p_participant_id
       or v_previous.next_status<>p_next_status
       or v_previous.expected_revision<>p_expected_revision then
      raise exception 'An idempotency key was reused for another command' using errcode='23505';
    end if;
    return v_previous.receipt;
  end if;

  select count(*) into v_link_count from public.convay_entity_records a
    where a.entity_key='bms.attendance' and a.payload->>'meeting_id'=v_actual_mid
      and a.payload->>'participant_id'=p_participant_id;
  if v_link_count>1 then
    raise exception 'Duplicate attendance records require reconciliation' using errcode='23505';
  end if;
  select a.* into v_existing from public.convay_entity_records a
    where a.entity_key='bms.attendance' and a.payload->>'meeting_id'=v_actual_mid
      and a.payload->>'participant_id'=p_participant_id limit 1 for update;
  if not found and p_next_status<>'Present' then
    raise exception 'Join must be confirmed before leaving or changing status' using errcode='23514';
  end if;
  if coalesce(v_existing.revision,0)<>p_expected_revision then
    raise exception 'Attendance revision changed; refresh before retrying' using errcode='40001';
  end if;

  select display_name into v_participant_name from public.user_profiles
    where user_id::text=p_participant_id and account_status='active';
  v_participant_name:=coalesce(v_participant_name,p_participant_id);
  v_role:=coalesce(nullif(v_link->>'participant_type',''),'Member');
  perform pg_catalog.set_config('convay.authorized_live_attendance_write','true',true);

  if v_existing.record_id is null then
    v_att_id:='ATT-'||pg_catalog.gen_random_uuid()::text;
    v_payload:=pg_catalog.jsonb_build_object(
      'id',v_att_id,'attendance_id',v_att_id,'meeting_id',v_actual_mid,
      'meeting_title',coalesce(v_meeting.payload->>'meeting_title',''),
      'participant_id',p_participant_id,'participant_name',v_participant_name,
      'designation','','role',v_role,'check_in_time',v_record_at,
      'check_out_time','','attendance_mode',p_attendance_mode,
      'attendance_status',p_next_status,'quorum_eligible',
        case when coalesce(v_link->>'quorum_eligible','false')='true' then 'Yes' else 'No' end,
      'signed','No','notes','','created_at',v_record_at,
      'recorded_by_user_id',p_actor_id::text
    );
    insert into public.convay_entity_records(entity_key,record_id,payload)
       values ('bms.attendance',v_att_id,v_payload)
       returning revision into v_att_revision;
  else
    v_att_id:=v_existing.record_id;
    v_payload:=v_existing.payload || pg_catalog.jsonb_build_object(
      'attendance_status',p_next_status,
      'check_in_time',case when p_next_status in ('Present','Temporarily Away') then v_record_at::text
        else coalesce(v_existing.payload->>'check_in_time','') end,
      'check_out_time',case when p_next_status='Left' then v_record_at::text
        else coalesce(v_existing.payload->>'check_out_time','') end,
      'recorded_by_user_id',p_actor_id::text,
      'quorum_eligible',case when coalesce(v_link->>'quorum_eligible','false')='true'
        and p_next_status<>'Recused' then 'Yes' else 'No' end
    );
    update public.convay_entity_records set payload=v_payload
      where entity_key='bms.attendance' and record_id=v_att_id
      returning revision into v_att_revision;
  end if;

  select count(distinct l.payload->>'user_id') into v_total
  from public.convay_entity_records l
  where l.entity_key='bms.meetingParticipantLinks'
    and l.payload->>'meeting_id'=v_actual_mid
    and l.payload->>'quorum_eligible'='true';
  select count(distinct l.payload->>'user_id') into v_present
  from public.convay_entity_records l
  join public.convay_entity_records a
    on a.entity_key='bms.attendance'
    and a.payload->>'meeting_id'=v_actual_mid
    and a.payload->>'participant_id'=l.payload->>'user_id'
  where l.entity_key='bms.meetingParticipantLinks'
    and l.payload->>'meeting_id'=v_actual_mid
    and l.payload->>'quorum_eligible'='true'
    and coalesce(a.payload->>'attendance_status',
      case when coalesce(a.payload->>'check_out_time','')<>'' then 'Left'
        when coalesce(a.payload->>'check_in_time','')<>'' then 'Present'
        else 'Not Joined' end) in ('Present','Temporarily Away');

  select q.payload into v_rule from public.convay_entity_records q
  where q.entity_key='bms.quorumrules'
    and q.payload->>'body_name'=v_meeting.payload->>'committee'
    and q.payload->>'status'='Active'
  limit 1;
  v_min:=coalesce(nullif(pg_catalog.regexp_replace(coalesce(v_rule->>'minimum_members',''),'[^0-9]','','g'),'')::integer,0);
  v_percent:=coalesce(nullif(pg_catalog.regexp_replace(coalesce(v_rule->>'quorum_percent',''),'[^0-9.]','','g'),'')::numeric,0);
  if v_percent<0 or v_percent>100 then
    raise exception 'Invalid configured quorum percentage' using errcode='23514';
  end if;
  v_required:=greatest(v_min,pg_catalog.ceil(v_total*v_percent/100)::integer);
  v_met:=v_rule is not null and v_total>0 and v_required>0 and v_present>=v_required;

  select * into v_state from convay_private.live_quorum_snapshots
    where meeting_id=v_actual_mid for update;
  if v_state.meeting_id is null then
    insert into convay_private.live_quorum_snapshots(meeting_id,revision,required,present,met)
      values(v_actual_mid,1,v_required,v_present,v_met)
      returning revision into v_quorum_revision;
  else
    update convay_private.live_quorum_snapshots
      set revision=revision+1,required=v_required,present=v_present,met=v_met,updated_at=now()
      where meeting_id=v_actual_mid returning revision into v_quorum_revision;
  end if;

  if (v_state.meeting_id is not null and v_state.met is distinct from v_met)
     or (v_state.meeting_id is null and v_met) then
    v_key:='QRM-'||pg_catalog.gen_random_uuid()::text;
    insert into public.convay_entity_records(entity_key,record_id,payload) values (
      'bms.quorum',v_key,pg_catalog.jsonb_build_object(
        'id',v_key,'event_id',v_key,'meeting_id',v_actual_mid,
        'meeting_title',coalesce(v_meeting.payload->>'meeting_title',''),
        'event_type',case when v_met then 'Quorum Restored' else 'Quorum Lost' end,
        'quorum_required',v_required::text,'quorum_present',v_present::text,
        'quorum_met',case when v_met then 'Yes' else 'No' end,
        'recorded_at',v_record_at,'recorded_by','System',
        'recorded_by_user_id',p_actor_id::text,
        'notes',case when v_met then 'Quorum met' else 'Quorum lost' end,
        'created_at',v_record_at
      )
    );
  end if;
  v_receipt:=pg_catalog.jsonb_build_object(
    'requestId',p_request_id,'meetingId',v_actual_mid,'participantId',p_participant_id,
    'status',p_next_status,'attendanceId',v_att_id,'attendanceRevision',v_att_revision,
    'quorum',pg_catalog.jsonb_build_object('revision',v_quorum_revision,
      'required',v_required,'present',v_present,'met',v_met)
  );
  insert into convay_private.live_attendance_commands(
    request_id,actor_id,meeting_id,participant_id,next_status,expected_revision,receipt
  ) values(p_request_id,p_actor_id,v_actual_mid,p_participant_id,p_next_status,p_expected_revision,v_receipt);
  return v_receipt;
end;
$$;
revoke all on function public.convay_commit_live_attendance(uuid,text,text,text,bigint,text,boolean,text)
  from public,anon,authenticated;
grant execute on function public.convay_commit_live_attendance(uuid,text,text,text,bigint,text,boolean,text)
  to service_role;


-- Readback is service-role-only and always rechecks the verified actor and
-- selected meeting. No authenticated browser is granted private SQL access.
create or replace function public.convay_read_live_attendance(
  p_actor_id uuid, p_meeting_id text, p_participant_id text
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_mid text;
  v_meeting record;
  v_profile record;
  v_row record;
  v_snapshot record;
  v_latest record;
  v_attendees jsonb;
  v_status text;
  v_quorum jsonb;
  v_authorized boolean;
begin
  if p_actor_id is null or p_meeting_id is null or p_participant_id is null
    or p_meeting_id !~ '^[A-Za-z0-9_-]{1,180}$'
    or p_participant_id !~ '^[A-Za-z0-9_-]{1,180}$' then
    raise exception 'Invalid attendance readback' using errcode='22023';
  end if;
  select p.display_name,p.account_role into v_profile from public.user_profiles p
    where p.user_id=p_actor_id and p.account_status='active';
  if not found then
    raise exception 'Active account required' using errcode='42501';
  end if;
  perform pg_catalog.set_config('request.jwt.claim.sub',p_actor_id::text,true);
  if not convay_private.has_permission('mtg_view') then
    raise exception 'Meeting read permission required' using errcode='42501';
  end if;
  select m.* into v_meeting from public.convay_entity_records m
    where m.entity_key='bms.meetings'
      and (m.record_id=p_meeting_id or m.payload->>'meeting_id'=p_meeting_id)
    order by (m.record_id=p_meeting_id) desc limit 1;
  if not found then raise exception 'Meeting unavailable' using errcode='P0002'; end if;
  v_mid:=coalesce(nullif(v_meeting.payload->>'meeting_id',''),v_meeting.record_id);
  if not exists (
    select 1 from public.convay_entity_records link
      where link.entity_key='bms.meetingParticipantLinks'
      and link.payload->>'meeting_id'=v_mid
      and link.payload->>'user_id'=p_participant_id
  ) then
    raise exception 'Participant not registered in this meeting' using errcode='42501';
  end if;
  v_authorized:=p_actor_id::text=p_participant_id
    and convay_private.has_permission('mtg_join');
  if not v_authorized then
    v_authorized:=convay_private.has_permission('mtg_attendance')
      and (v_profile.account_role='super_admin'
        or convay_private.is_meeting_leader(p_actor_id,v_meeting.payload,v_meeting.created_by));
  end if;
  if not v_authorized then
    raise exception 'Attendance readback denied' using errcode='42501';
  end if;

  select a.* into v_row from public.convay_entity_records a
    where a.entity_key='bms.attendance'
      and a.payload->>'meeting_id'=v_mid
      and a.payload->>'participant_id'=p_participant_id
    limit 1;
  select s.* into v_snapshot from convay_private.live_quorum_snapshots s
    where s.meeting_id=v_mid;
  select c.* into v_latest from convay_private.live_attendance_commands c
    where c.meeting_id=v_mid and c.participant_id=p_participant_id
    order by c.recorded_at desc, c.request_id desc limit 1;
  select coalesce(pg_catalog.jsonb_object_agg(a.payload->>'participant_id',
      coalesce(a.payload->>'attendance_status',
        case when coalesce(a.payload->>'check_out_time','')<>'' then 'Left'
          when coalesce(a.payload->>'check_in_time','')<>'' then 'Present'
          else 'Not Joined' end)), '{}'::jsonb)
    into v_attendees
    from public.convay_entity_records a
    where a.entity_key='bms.attendance'
      and a.payload->>'meeting_id'=v_mid
      and nullif(a.payload->>'participant_id','') is not null;
  v_status:=coalesce(v_row.payload->>'attendance_status',
    case when coalesce(v_row.payload->>'check_out_time','')<>'' then 'Left'
      when coalesce(v_row.payload->>'check_in_time','')<>'' then 'Present'
      else 'Not Joined' end);
  v_quorum:=pg_catalog.jsonb_build_object(
    'revision',coalesce(v_snapshot.revision,0),
    'required',coalesce(v_snapshot.required,0),
    'present',coalesce(v_snapshot.present,0),
    'met',coalesce(v_snapshot.met,false)
  );
  return pg_catalog.jsonb_build_object(
    'requestId',coalesce(v_latest.request_id,'initial_1234567890123456'),
    'meetingId',v_mid,'participantId',p_participant_id,
    'status',v_status,'attendanceId',coalesce(v_row.record_id,''),
    'attendanceRevision',coalesce(v_row.revision,0),
    'quorum',v_quorum,'attendanceMap',v_attendees
  );
end;
$$;
revoke all on function public.convay_read_live_attendance(uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.convay_read_live_attendance(uuid,text,text)
  to service_role;
