-- Make MT-22 meeting start server-authoritative while preserving the existing
-- atomic meeting + live-session batch and the existing lifecycle UI.

create or replace function convay_private.is_meeting_leader(
  p_user_id uuid,
  p_payload jsonb,
  p_created_by uuid
) returns boolean
language sql stable security definer set search_path='' as $function$
  select coalesce(
    p_user_id is not null and (
      p_created_by = p_user_id
      or p_payload->>'chairperson_user_id' = p_user_id::text
      or p_payload->>'organizer_user_id' = p_user_id::text
      or exists (
        select 1
        from public.user_profiles leader
        where leader.user_id = p_user_id
          and leader.account_status = 'active'
          and (
            (nullif(btrim(p_payload->>'chairperson_user_id'), '') is null
              and lower(btrim(leader.display_name)) = lower(btrim(p_payload->>'chairperson')))
            or
            (nullif(btrim(p_payload->>'organizer_user_id'), '') is null
              and lower(btrim(leader.display_name)) = lower(btrim(p_payload->>'organizer')))
          )
          and (
            select count(*)
            from public.user_profiles same_name
            where same_name.account_status = 'active'
              and lower(btrim(same_name.display_name)) = lower(btrim(leader.display_name))
          ) = 1
      )
    ),
    false
  )
$function$;
revoke all on function convay_private.is_meeting_leader(uuid,jsonb,uuid) from public,anon,authenticated;

create or replace function convay_private.enforce_meeting_start_authority()
returns trigger language plpgsql security definer set search_path='' as $function$
declare
  v_old_status text := '';
  v_new_status text := '';
  v_actor uuid;
  v_timezone text;
  v_scheduled_at timestamptz;
  v_now timestamptz;
  v_is_initial_start boolean := false;
  v_is_resume boolean := false;
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

  v_is_initial_start := v_old_status in ('published','ready to start')
    and v_new_status = 'in progress';
  v_is_resume := v_old_status in ('paused','on break','adjourned')
    and v_new_status = 'in progress';

  if v_is_initial_start or v_is_resume then
    v_actor := auth.uid();
    if v_actor is null or not convay_private.has_permission('mtg_start') then
      raise exception 'An authenticated meeting leader with mtg_start permission is required'
        using errcode='42501';
    end if;
    if not convay_private.is_meeting_leader(v_actor, new.payload, old.created_by) then
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
      if v_now < v_scheduled_at - interval '15 minutes'
         or v_now > v_scheduled_at + interval '120 minutes' then
        raise exception 'Meeting can start only from 15 minutes before through 2 hours after its scheduled time'
          using errcode='23514';
      end if;
      new.payload := jsonb_set(
        jsonb_set(new.payload, '{started_by}', to_jsonb(v_actor::text), true),
        '{started_at}', to_jsonb(v_now), true
      );
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

  return new;
end
$function$;
revoke all on function convay_private.enforce_meeting_start_authority() from public,anon,authenticated;

drop trigger if exists convay_a1_meeting_start_authority on public.convay_entity_records;
create trigger convay_a1_meeting_start_authority
  before insert or update of payload on public.convay_entity_records
  for each row execute function convay_private.enforce_meeting_start_authority();

create or replace function convay_private.enforce_active_live_session_start()
returns trigger language plpgsql security definer set search_path='' as $function$
declare
  v_meeting_ref text;
  v_meeting_payload jsonb;
  v_meeting_creator uuid;
  v_meeting_status text;
  v_actor uuid;
  v_other_active_count integer;
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
  if v_actor is null or not convay_private.has_permission('mtg_start')
     or not convay_private.is_meeting_leader(v_actor, v_meeting_payload, v_meeting_creator) then
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
$function$;
revoke all on function convay_private.enforce_active_live_session_start() from public,anon,authenticated;

drop trigger if exists convay_a1_active_live_session_start on public.convay_entity_records;
create trigger convay_a1_active_live_session_start
  before insert or update of payload on public.convay_entity_records
  for each row execute function convay_private.enforce_active_live_session_start();

create or replace function convay_private.require_started_meeting_session()
returns trigger language plpgsql security definer set search_path='' as $function$
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
  if v_old_status not in ('published','ready to start') or v_new_status <> 'in progress' then
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
$function$;
revoke all on function convay_private.require_started_meeting_session() from public,anon,authenticated;

drop trigger if exists convay_meeting_start_requires_session on public.convay_entity_records;
create constraint trigger convay_meeting_start_requires_session
  after update on public.convay_entity_records
  deferrable initially deferred
  for each row execute function convay_private.require_started_meeting_session();
