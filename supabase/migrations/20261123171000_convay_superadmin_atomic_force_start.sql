-- Convay LM-ADMIN-01 | 2026-11-23
-- Normal start permissions, time windows and lifecycle remain unchanged.
-- Super Admin override is explicit, SQL-verified and audit-stamped.
CREATE OR REPLACE FUNCTION convay_private.enforce_meeting_start_authority()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old_status text := '';
  v_new_status text := '';
  v_actor uuid;
  v_timezone text;
  v_scheduled_at timestamptz;
  v_now timestamptz;
  v_is_initial_start boolean := false;
  v_is_resume boolean := false;
  v_is_force boolean := false;
begin
  if new.entity_key <> 'bms.meetings' then return new; end if;

  if tg_op = 'INSERT' then
    if lower(btrim(coalesce(new.payload->>'approval_status', ''))) in
      ('in progress','live','ongoing')
       or lower(btrim(coalesce(new.payload->>'status', ''))) in
      ('in progress','live','ongoing')
       or lower(btrim(coalesce(new.payload->>'workflow_status', ''))) in
      ('in progress','live','ongoing') then
      raise exception 'A meeting must be published before it can start'
        using errcode='23514';
    end if;
    if new.payload ? 'started_by' or new.payload ? 'started_at' then
      raise exception 'Meeting start actor and time are set only by the start transition'
        using errcode='42501';
    end if;
    return new;
  end if;

  v_old_status := lower(btrim(coalesce(
    nullif(old.payload->>'approval_status',''),
    nullif(old.payload->>'status',''),
    nullif(old.payload->>'workflow_status',''),
    ''
  )));
  v_new_status := lower(btrim(coalesce(
    nullif(new.payload->>'approval_status',''),
    nullif(new.payload->>'status',''),
    nullif(new.payload->>'workflow_status',''),
    ''
  )));

  -- An active lifecycle alias must not be used to bypass the canonical
  -- approval_status write that the current start/resume action already uses.
  if (
    (new.payload->'status' is distinct from old.payload->'status'
      and lower(btrim(coalesce(new.payload->>'status',''))) in ('in progress','live','ongoing'))
    or
    (new.payload->'workflow_status' is distinct from old.payload->'workflow_status'
      and lower(btrim(coalesce(new.payload->>'workflow_status',''))) in ('in progress','live','ongoing'))
  ) and v_new_status <> 'in progress' then
    raise exception 'Meeting start must update the canonical approval_status'
      using errcode='23514';
  end if;

  -- The flag is only set inside the dedicated admin RPC; the trigger
  -- independently verifies the JWT-bound active Super Admin identity.
  v_is_force := current_setting('convay.admin_force_start',true) = 'true'
    and v_old_status in ('draft','pending approval','approved','scheduled','rescheduled','published','ready to start')
    and v_new_status = 'in progress'
    and exists (
      select 1 from public.user_profiles p where p.user_id = auth.uid()
        and p.account_status='active' and p.account_role='super_admin'
    );
  v_is_initial_start := (v_old_status in ('published','ready to start') or v_is_force)
    and v_new_status = 'in progress';
  v_is_resume := v_old_status in ('paused','on break','adjourned')
    and v_new_status = 'in progress';

  if v_is_initial_start or v_is_resume then
    v_actor := auth.uid();
    if v_actor is null or not convay_private.has_permission('mtg_start') then
      raise exception 'An authenticated meeting leader with mtg_start permission is required'
        using errcode='42501';
    end if;
    if not v_is_force and not convay_private.is_meeting_leader(v_actor, new.payload, old.created_by) then
      raise exception 'Only the assigned chairperson, organizer, or meeting creator can start or resume this meeting'
        using errcode='42501';
    end if;

    if v_is_initial_start then
      if old.payload->>'started_by' is not null or old.payload->>'started_at' is not null then
        raise exception 'A previously started meeting must be resumed from its saved lifecycle state'
          using errcode='23514';
      end if;
      v_timezone := coalesce(
        nullif(split_part(btrim(coalesce(new.payload->>'time_zone','')), ' ', 1), ''),
        'Asia/Dhaka'
      );
      begin
        v_scheduled_at := (
          (new.payload->>'meeting_date')::date
          + coalesce(nullif(btrim(new.payload->>'start_time'),''), '00:00')::time
        ) at time zone v_timezone;
      exception
        when invalid_datetime_format or datetime_field_overflow or invalid_parameter_value then
          raise exception 'A valid saved meeting date, time, and time zone are required before the meeting can start'
            using errcode='23514';
      end;
      v_now := clock_timestamp();
      if not v_is_force and (v_now < v_scheduled_at - interval '15 minutes'
         or v_now > v_scheduled_at + interval '120 minutes') then
        raise exception 'Meeting can start only from 15 minutes before through 2 hours after its scheduled time'
          using errcode='23514';
      end if;
      new.payload := jsonb_set(
        jsonb_set(new.payload, '{started_by}', to_jsonb(v_actor::text), true),
        '{started_at}', to_jsonb(v_now), true
      );
      if v_is_force then
        new.payload := jsonb_set(jsonb_set(new.payload,
          '{admin_force_started_by}',to_jsonb(v_actor::text),true),
          '{admin_force_started_at}',to_jsonb(v_now),true);
      end if;
    elsif new.payload->'started_by' is distinct from old.payload->'started_by'
       or new.payload->'started_at' is distinct from old.payload->'started_at' then
      raise exception 'Resuming a meeting cannot replace its original start actor or time'
        using errcode='42501';
    end if;
  elsif new.payload->'started_by' is distinct from old.payload->'started_by'
     or new.payload->'started_at' is distinct from old.payload->'started_at' then
    raise exception 'Meeting start actor and time cannot be changed outside its start transition'
      using errcode='42501';
  end if;

  if (new.payload->'admin_force_started_by' is distinct from old.payload->'admin_force_started_by'
     or new.payload->'admin_force_started_at' is distinct from old.payload->'admin_force_started_at')
     and not v_is_force then
    raise exception 'Only the verified Super Admin force-start transaction can stamp override evidence' using errcode='42501';
  end if;
  return new;
end
$function$
;

CREATE OR REPLACE FUNCTION convay_private.enforce_active_live_session_start()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_meeting_ref text;
  v_meeting_payload jsonb;
  v_meeting_creator uuid;
  v_meeting_status text;
  v_actor uuid;
  v_other_active_count integer;
  v_admin_force boolean := false;
  v_entering_active boolean := false;
begin
  if new.entity_key <> 'bms.liveSessions' then return new; end if;
  v_entering_active := lower(btrim(coalesce(new.payload->>'session_status',''))) = 'active'
    and (tg_op = 'INSERT' or lower(btrim(coalesce(old.payload->>'session_status',''))) <> 'active');

  if tg_op = 'UPDATE' and not v_entering_active then
    if new.payload->'started_by' is distinct from old.payload->'started_by'
       or new.payload->'started_at' is distinct from old.payload->'started_at' then
      raise exception 'Live-session start actor and time cannot be changed after creation'
        using errcode='42501';
    end if;
    return new;
  end if;
  if not v_entering_active then return new; end if;
  if tg_op = 'UPDATE' and lower(btrim(coalesce(old.payload->>'session_status',''))) = 'ended' then
    raise exception 'A closed meeting session cannot be restarted'
      using errcode='23514';
  end if;

  v_meeting_ref := coalesce(
    nullif(btrim(new.payload->>'meeting_id'),''),
    nullif(btrim(new.payload->>'id'),''),
    new.record_id
  );
  select m.payload, m.created_by
    into v_meeting_payload, v_meeting_creator
  from public.convay_entity_records m
  where m.entity_key = 'bms.meetings'
    and (m.record_id = v_meeting_ref
      or m.payload->>'meeting_id' = v_meeting_ref
      or m.payload->>'id' = v_meeting_ref)
  order by (m.record_id = v_meeting_ref) desc,
    (m.payload->>'meeting_id' = v_meeting_ref) desc
  limit 1;
  if not found then
    raise exception 'The live session must reference an existing meeting'
      using errcode='23503';
  end if;

  v_meeting_status := lower(btrim(coalesce(
    nullif(v_meeting_payload->>'approval_status',''),
    nullif(v_meeting_payload->>'status',''),
    nullif(v_meeting_payload->>'workflow_status',''),
    ''
  )));
  if v_meeting_status <> 'in progress' then
    raise exception 'An active live session requires a meeting in progress'
      using errcode='23514';
  end if;

  v_actor := auth.uid();
  v_admin_force := current_setting('convay.admin_force_start',true) = 'true'
    and exists (select 1 from public.user_profiles p
      where p.user_id=v_actor and p.account_status='active'
        and p.account_role='super_admin');
  if v_actor is null or not convay_private.has_permission('mtg_start')
     or (not v_admin_force and not convay_private.is_meeting_leader(v_actor, v_meeting_payload, v_meeting_creator)) then
    raise exception 'An authenticated meeting leader with mtg_start permission is required'
      using errcode='42501';
  end if;

  select count(*) into v_other_active_count
  from public.convay_entity_records s
  where s.entity_key = 'bms.liveSessions'
    and lower(btrim(coalesce(s.payload->>'session_status',''))) = 'active'
    and (s.payload->>'meeting_id' = v_meeting_ref
      or s.payload->>'meeting_id' = v_meeting_payload->>'meeting_id'
      or s.payload->>'meeting_id' = v_meeting_payload->>'id'
      or s.payload->>'meeting_id' = (select m.record_id from public.convay_entity_records m
          where m.entity_key='bms.meetings'
            and m.payload->>'meeting_id' = v_meeting_payload->>'meeting_id'
          limit 1));
  if v_other_active_count > 0 then
    raise exception 'A canonical active live session already exists for this meeting'
      using errcode='23505';
  end if;

  if v_meeting_payload->>'started_by' is not null
     and v_meeting_payload->>'started_at' is not null then
    new.payload := jsonb_set(
      jsonb_set(new.payload, '{started_by}', v_meeting_payload->'started_by', true),
      '{started_at}', v_meeting_payload->'started_at', true
    );
    if tg_op = 'INSERT' then
      new.payload := jsonb_set(new.payload, '{created_at}', v_meeting_payload->'started_at', true);
    end if;
  elsif tg_op = 'INSERT' then
    raise exception 'An active live session requires the persisted meeting start actor and time'
      using errcode='23514';
  end if;

  return new;
end
$function$
;

CREATE OR REPLACE FUNCTION convay_private.require_started_meeting_session()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_old_status text;
  v_new_status text;
  v_meeting_ref text;
  v_active_count integer;
  v_trusted_count integer;
begin
  if new.entity_key <> 'bms.meetings' or tg_op <> 'UPDATE' then return null; end if;
  v_old_status := lower(btrim(coalesce(
    nullif(old.payload->>'approval_status',''), nullif(old.payload->>'status',''), ''
  )));
  v_new_status := lower(btrim(coalesce(
    nullif(new.payload->>'approval_status',''), nullif(new.payload->>'status',''), ''
  )));
  -- Verify *every* transition into In Progress, including the admin override.
  if v_old_status = 'in progress' or v_new_status <> 'in progress' then
    return null;
  end if;
  v_meeting_ref := coalesce(
    nullif(btrim(new.payload->>'meeting_id'),''),
    nullif(btrim(new.payload->>'id'),''),
    new.record_id
  );

  select count(*) filter (where lower(btrim(coalesce(s.payload->>'session_status',''))) = 'active'),
         count(*) filter (
           where lower(btrim(coalesce(s.payload->>'session_status',''))) = 'active'
             and s.payload->>'started_by' = new.payload->>'started_by'
             and s.payload->>'started_at' = new.payload->>'started_at'
         )
    into v_active_count, v_trusted_count
  from public.convay_entity_records s
  where s.entity_key='bms.liveSessions'
    and (s.payload->>'meeting_id' = v_meeting_ref
      or s.payload->>'meeting_id' = new.record_id
      or s.payload->>'meeting_id' = new.payload->>'meeting_id'
      or s.payload->>'meeting_id' = new.payload->>'id');

  if v_active_count <> 1 or v_trusted_count <> 1 then
    raise exception 'Starting a meeting requires exactly one SQL-confirmed active live session with the same server-stamped actor and time'
      using errcode='23514';
  end if;
  return null;
end
$function$
;

-- Server-verified, atomic admin-only force start. No room tokens are issued here.
create or replace function public.convay_force_start_meeting(p_meeting_id text)
returns jsonb language plpgsql security definer set search_path to ''
as $force$
declare
  v_actor uuid := auth.uid();
  v_meeting public.convay_entity_records%rowtype;
  v_mid text;
  v_status text;
  v_total int;
  v_active int;
  v_session_id text;
  v_started_at text;
begin
  if p_meeting_id is null or p_meeting_id !~ '^[A-Za-z0-9_-]{1,180}$' then
    raise exception 'Invalid saved meeting ID' using errcode='22023';
  end if;
  if v_actor is null or not exists (
    select 1 from public.user_profiles p where p.user_id=v_actor
      and p.account_role='super_admin' and p.account_status='active'
  ) or not convay_private.has_permission('mtg_start') then
    raise exception 'Only an active Super Admin may force-start a meeting' using errcode='42501';
  end if;
  select * into v_meeting from public.convay_entity_records m
    where m.entity_key='bms.meetings'
      and (m.record_id=p_meeting_id or m.payload->>'meeting_id'=p_meeting_id)
    order by (m.record_id=p_meeting_id) desc limit 1 for update;
  if not found then raise exception 'Saved meeting not found' using errcode='P0002'; end if;
  v_mid := coalesce(nullif(v_meeting.payload->>'meeting_id',''),v_meeting.record_id);
  v_status := lower(btrim(coalesce(v_meeting.payload->>'approval_status','')));
  if v_status in ('cancelled','canceled','rejected','completed','ended','archived','awaiting minutes','minutes approved') then
    raise exception 'Closed or cancelled meetings cannot be force-started' using errcode='23514';
  end if;
  if v_meeting.payload->>'status' is not null
    and lower(v_meeting.payload->>'status') in ('cancelled','canceled','rejected','completed','ended','archived') then
    raise exception 'Conflicting terminal meeting state' using errcode='23514';
  end if;
  if v_status not in ('draft','pending approval','approved','scheduled','rescheduled','published','ready to start','in progress') then
    raise exception 'Meeting is not eligible for Super Admin force start' using errcode='23514';
  end if;
  select count(*),count(*) filter (where s.payload->>'session_status'='active')
    into v_total,v_active from public.convay_entity_records s
    where s.entity_key='bms.liveSessions' and s.payload->>'meeting_id'=v_mid;
  if v_status='in progress' and v_total=1 and v_active=1 then
    select s.record_id into v_session_id from public.convay_entity_records s
      where s.entity_key='bms.liveSessions' and s.payload->>'meeting_id'=v_mid
      and s.payload->>'session_status'='active' limit 1;
    return jsonb_build_object('meetingId',v_mid,'sessionId',v_session_id,
      'status','In Progress','alreadyStarted',true);
  end if;
  if v_total<>0 or v_status='in progress' or v_meeting.payload ? 'started_at'
      or v_meeting.payload ? 'started_by' then
    raise exception 'Meeting start state must be reconciled before override' using errcode='23514';
  end if;
  perform pg_catalog.set_config('convay.admin_force_start','true',true);
  update public.convay_entity_records m
    set payload=pg_catalog.jsonb_set(m.payload,'{approval_status}',to_jsonb('In Progress'::text),true)
    where m.entity_key='bms.meetings' and m.record_id=v_meeting.record_id
    returning m.* into v_meeting;
  v_started_at := v_meeting.payload->>'started_at';
  if v_started_at is null or v_meeting.payload->>'started_by'<>v_actor::text then
    raise exception 'Start timestamp or authorized actor was not verified' using errcode='23514';
  end if;
  v_session_id := 'SES-'||v_mid;
  insert into public.convay_entity_records(entity_key,record_id,payload)
  values ('bms.liveSessions',v_session_id,jsonb_build_object(
    'id',v_session_id,'meeting_id',v_mid,'session_status','active',
    'started_at',v_started_at,'started_by',v_actor::text,
    'recording_status','not_started','transcription_status','not_started',
    'minutes_capture_status','not_started','created_at',v_started_at
  ));
  return jsonb_build_object('meetingId',v_mid,'sessionId',v_session_id,
    'status','In Progress','alreadyStarted',false,'startedAt',v_started_at);
end;
$force$;
revoke all on function public.convay_force_start_meeting(text) from public, anon;
grant execute on function public.convay_force_start_meeting(text) to authenticated;
