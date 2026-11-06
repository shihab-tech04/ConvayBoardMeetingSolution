-- MT-24: reschedule a meeting atomically with reason, leadership checks and audit history.
-- Reuse the existing lifecycle guard, permitting the existing publish step after rescheduling.
create or replace function convay_private.enforce_entity_state_transition()
returns trigger language plpgsql security invoker set search_path='' as $guard$
declare
  prior_payload jsonb := '{}'::jsonb;
  field_name text;
  old_value text;
  new_value text;
  candidate text;
  needed text;
  approval_code text;
  required_codes text[] := array[]::text[];
  old_approval text := '';
  new_approval text := '';
begin
  if tg_op = 'UPDATE' then
    prior_payload := old.payload;
  end if;
  approval_code := case new.entity_key
    when 'bms.meetings' then 'mtg_approve'
    when 'bms.agenda' then 'agd_approve'
    when 'bms.decisions' then 'dec_approve'
    when 'bms.resolutions' then 'res_approve'
    when 'bms.minutes' then 'min_approve'
    when 'bms.boardpacks' then 'pack_publish'
    when 'bms.packversions' then 'pack_publish'
    when 'bms.documents' then 'doc_approve'
    when 'bms.doc.approvals' then 'doc_approve'
    when 'bms.actionitems' then 'act_close'
    else null
  end;

  if new.entity_key = 'bms.meetings' then
    old_approval := lower(btrim(coalesce(prior_payload->>'approval_status','')));
    new_approval := lower(btrim(coalesce(new.payload->>'approval_status','')));

    if tg_op = 'INSERT' and new_approval in ('published','released') then
      raise exception 'A meeting must be scheduled before it can be published'
        using errcode='23514';
    end if;
    if tg_op = 'UPDATE' and old_approval is distinct from new_approval then
      if new_approval = 'scheduled' and old_approval not in ('draft','approved') then
        raise exception 'Only a draft or approved meeting can be scheduled'
          using errcode='23514';
      end if;
      if new_approval in ('published','released') and old_approval not in ('scheduled','rescheduled') then
        raise exception 'A meeting must be scheduled before it can be published'
          using errcode='23514';
      end if;
    end if;

    -- Lifecycle aliases must move with the canonical approval_status field.
    foreach field_name in array array['status','workflow_status'] loop
      old_value := lower(btrim(coalesce(prior_payload->>field_name,'')));
      new_value := lower(btrim(coalesce(new.payload->>field_name,'')));
      if old_value is distinct from new_value and new_value in ('scheduled','published','released') then
        if new_approval <> new_value or old_approval is not distinct from new_approval then
          raise exception 'Meeting lifecycle aliases must transition with approval_status'
            using errcode='23514';
        end if;
      end if;
    end loop;

    -- Only the state transition itself can set its actor/time evidence.
    if tg_op = 'UPDATE' and new.payload->'scheduled_by' is distinct from prior_payload->'scheduled_by'
       and not (old_approval is distinct from new_approval and new_approval='scheduled') then
      raise exception 'Schedule actor can only change while scheduling a meeting' using errcode='42501';
    end if;
    if tg_op = 'UPDATE' and new.payload->'scheduled_at' is distinct from prior_payload->'scheduled_at'
       and not (old_approval is distinct from new_approval and new_approval='scheduled') then
      raise exception 'Schedule time can only change while scheduling a meeting' using errcode='42501';
    end if;
    if tg_op = 'UPDATE' and new.payload->'published_by' is distinct from prior_payload->'published_by'
       and not (old_approval is distinct from new_approval and new_approval in ('published','released')) then
      raise exception 'Publisher can only change while publishing a meeting' using errcode='42501';
    end if;
    if tg_op = 'UPDATE' and new.payload->'published_at' is distinct from prior_payload->'published_at'
       and not (old_approval is distinct from new_approval and new_approval in ('published','released')) then
      raise exception 'Publication time can only change while publishing a meeting' using errcode='42501';
    end if;

    -- Stamp trusted identity and time before the audit trigger records NEW.
    if (tg_op = 'INSERT' and new_approval='scheduled')
       or (tg_op = 'UPDATE' and old_approval is distinct from new_approval and new_approval='scheduled') then
      if auth.uid() is null then
        raise exception 'An authenticated meeting scheduler is required' using errcode='42501';
      end if;
      new.payload := jsonb_set(
        jsonb_set(new.payload,'{scheduled_by}',to_jsonb(auth.uid()::text),true),
        '{scheduled_at}',to_jsonb(clock_timestamp()),true
      );
    elsif tg_op = 'UPDATE' and old_approval is distinct from new_approval
       and new_approval in ('published','released') then
      if auth.uid() is null then
        raise exception 'An authenticated meeting publisher is required' using errcode='42501';
      end if;
      new.payload := jsonb_set(
        jsonb_set(new.payload,'{published_by}',to_jsonb(auth.uid()::text),true),
        '{published_at}',to_jsonb(clock_timestamp()),true
      );
    end if;
  end if;

  foreach field_name in array array['status','approval_status','workflow_status'] loop
    old_value := lower(btrim(coalesce(prior_payload->>field_name,'')));
    new_value := lower(btrim(coalesce(new.payload->>field_name,'')));
    if old_value is not distinct from new_value then continue; end if;
    needed := null;
    -- Prefer the destination operation, so a lifecycle officer can start
    -- or cancel a previously approved meeting without approve permission.
    for candidate in select unnest(array[new_value,old_value]) loop
      needed := case
        when new.entity_key = 'bms.meetings' and candidate in ('cancelled','canceled') then 'mtg_cancel'
        when new.entity_key = 'bms.meetings' and candidate in ('postponed','rescheduled') then 'mtg_postpone'
        when new.entity_key = 'bms.meetings' and candidate in ('in progress','live','ongoing','completed') then 'mtg_start'
        when new.entity_key = 'bms.actionitems' and candidate in ('completed','closed','done','cancelled','canceled') then 'act_close'
        when new.entity_key = 'bms.documents' and candidate in ('published','released') then 'doc_publish'
        when new.entity_key in ('bms.boardpacks','bms.packversions') and candidate in ('published','released') then 'pack_publish'
        when new.entity_key = 'bms.meetings' and candidate in ('scheduled','published','released') then 'mtg_update'
        when new.entity_key = 'bms.meetings' and candidate in ('minutes approved','archived') then 'min_approve'
        when new.entity_key = 'bms.minutes' and candidate in ('minutes approved','archived') then 'min_approve'
        when candidate like '%approved%' or candidate like '%signed%' then approval_code
        when candidate in ('approved','accepted','rejected','declined','denied','signed','finalized','finalised','adopted','ratified') then approval_code
        when candidate in ('revision requested','revision_requested','changes requested','rework requested','returned') then
          case new.entity_key
            when 'bms.agenda' then 'agd_review'
            when 'bms.documents' then 'doc_review'
            when 'bms.doc.approvals' then 'doc_review'
            else approval_code
          end
        else null
      end;
      exit when needed is not null;
    end loop;
    if needed is not null then required_codes := array_append(required_codes,needed); end if;
  end loop;
  if tg_op = 'UPDATE' and approval_code is not null and (
    new.payload->'approval_history' is distinct from prior_payload->'approval_history'
    or new.payload->'approved_by' is distinct from prior_payload->'approved_by'
    or new.payload->'approved_at' is distinct from prior_payload->'approved_at'
  ) then
    required_codes := array_append(required_codes,approval_code);
  end if;
  if new.entity_key = 'bms.documents' then
    if new.payload->'is_locked' is distinct from prior_payload->'is_locked'
       and (tg_op = 'UPDATE' or coalesce((new.payload->>'is_locked')::boolean,false)) then
      required_codes := array_append(required_codes,'doc_manage_versions');
    end if;
    if tg_op = 'UPDATE' and new.payload->'publication_date' is distinct from prior_payload->'publication_date' then
      required_codes := array_append(required_codes,'doc_publish');
    end if;
  end if;
  if new.entity_key = 'bms.actionitems' then
    foreach field_name in array array['implementation_status','completion_status','action_status'] loop
      old_value := lower(btrim(coalesce(prior_payload->>field_name,'')));
      new_value := lower(btrim(coalesce(new.payload->>field_name,'')));
      if old_value is distinct from new_value and (
        old_value in ('completed','closed','done')
        or new_value in ('completed','closed','done')
      ) then
        required_codes := array_append(required_codes,'act_close');
      end if;
    end loop;
  end if;
  -- Do not allow another changed field to overwrite an existing requirement.
  for needed in select distinct unnest(required_codes) loop
    if not convay_private.has_permission(needed) then
      raise exception 'Additional business permission required: % on %',needed,new.entity_key
        using errcode='42501';
    end if;
  end loop;
  return new;
end;
$guard$;

-- The public entry point is SECURITY INVOKER; the private operation checks the
-- caller's permission and meeting assignment before updating the canonical row.
create or replace function convay_private.reschedule_meeting_request(
  p_record_id text,
  p_new_meeting_date date,
  p_new_start_time time without time zone,
  p_new_end_time time without time zone,
  p_reschedule_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_reschedule_reason, '')), '');
  v_meeting public.convay_entity_records%rowtype;
  v_status text;
  v_history jsonb;
  v_reschedule_entry jsonb;
  v_payload jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if v_actor is null or not convay_private.has_permission('mtg_postpone') then
    raise exception 'Meeting postponement permission required'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_record_id, '')), '') is null then
    raise exception 'A meeting ID is required'
      using errcode = '22023';
  end if;
  if p_new_meeting_date is null or p_new_start_time is null or p_new_end_time is null then
    raise exception 'A new meeting date, start time and end time are required'
      using errcode = '22023';
  end if;
  if p_new_start_time >= p_new_end_time then
    raise exception 'Meeting end time must be later than start time'
      using errcode = '22023';
  end if;
  if v_reason is null or length(v_reason) < 5 then
    raise exception 'Rescheduling reason must be at least 5 characters'
      using errcode = '22023';
  end if;

  select meeting.*
    into v_meeting
  from public.convay_entity_records as meeting
  where meeting.entity_key = 'bms.meetings'
    and meeting.record_id = btrim(p_record_id)
  for update;

  if not found then
    raise exception 'Meeting was not found or is no longer reschedulable'
      using errcode = '40001';
  end if;

  v_status := lower(btrim(coalesce(
    v_meeting.payload->>'approval_status',
    v_meeting.payload->>'status',
    ''
  )));
  if v_status not in ('scheduled', 'published', 'ready to start', 'rescheduled', 'adjourned', 'postponed') then
    raise exception 'Meeting was not found or is no longer reschedulable'
      using errcode = '40001';
  end if;

  if lower(btrim(coalesce(v_meeting.payload->>'chairperson_user_id', ''))) <> v_actor::text
     and lower(btrim(coalesce(v_meeting.payload->>'organizer_user_id', ''))) <> v_actor::text
     and v_meeting.created_by is distinct from v_actor then
    raise exception 'Only the assigned chairperson or meeting organizer can reschedule this meeting'
      using errcode = '42501';
  end if;

  if p_new_meeting_date::text = btrim(coalesce(v_meeting.payload->>'meeting_date', ''))
     and to_char(p_new_start_time, 'HH24:MI') = btrim(coalesce(v_meeting.payload->>'start_time', ''))
     and to_char(p_new_end_time, 'HH24:MI') = btrim(coalesce(v_meeting.payload->>'end_time', '')) then
    raise exception 'Choose a new date or time before rescheduling'
      using errcode = '40001';
  end if;

  v_history := v_meeting.payload->'reschedule_history';
  if v_history is null then
    v_history := '[]'::jsonb;
  elsif jsonb_typeof(v_history) <> 'array' then
    raise exception 'Meeting reschedule history is invalid; no changes were saved'
      using errcode = '22023';
  end if;

  v_reschedule_entry := jsonb_build_object(
    'previous', jsonb_build_object(
      'meeting_date', v_meeting.payload->>'meeting_date',
      'start_time', v_meeting.payload->>'start_time',
      'end_time', v_meeting.payload->>'end_time',
      'time_zone', v_meeting.payload->>'time_zone'
    ),
    'next', jsonb_build_object(
      'meeting_date', p_new_meeting_date::text,
      'start_time', to_char(p_new_start_time, 'HH24:MI'),
      'end_time', to_char(p_new_end_time, 'HH24:MI'),
      'time_zone', v_meeting.payload->>'time_zone'
    ),
    'reason', v_reason,
    'actor_id', v_actor::text,
    'at', v_now
  );

  v_payload := v_meeting.payload || jsonb_build_object(
    'meeting_date', p_new_meeting_date::text,
    'start_time', to_char(p_new_start_time, 'HH24:MI'),
    'end_time', to_char(p_new_end_time, 'HH24:MI'),
    'status', 'Rescheduled',
    'approval_status', 'Rescheduled',
    'reschedule_reason', v_reason,
    'rescheduled_by', v_actor::text,
    'rescheduled_at', v_now,
    'reschedule_history', v_history || jsonb_build_array(v_reschedule_entry)
  );

  update public.convay_entity_records as meeting
  set payload = v_payload
  where meeting.entity_key = 'bms.meetings'
    and meeting.record_id = btrim(p_record_id)
  returning meeting.payload into v_payload;

  if v_payload is null then
    raise exception 'Meeting was not found or is no longer reschedulable'
      using errcode = '40001';
  end if;

  return v_payload;
end
$function$;

revoke all on function convay_private.reschedule_meeting_request(text, date, time without time zone, time without time zone, text)
  from public, anon, authenticated;
grant execute on function convay_private.reschedule_meeting_request(text, date, time without time zone, time without time zone, text)
  to authenticated;

create or replace function public.convay_reschedule_meeting(
  p_record_id text,
  p_new_meeting_date date,
  p_new_start_time time without time zone,
  p_new_end_time time without time zone,
  p_reschedule_reason text
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $wrapper$
  select convay_private.reschedule_meeting_request(
    p_record_id,
    p_new_meeting_date,
    p_new_start_time,
    p_new_end_time,
    p_reschedule_reason
  );
$wrapper$;

revoke all on function public.convay_reschedule_meeting(text, date, time without time zone, time without time zone, text)
  from public, anon, authenticated;
grant execute on function public.convay_reschedule_meeting(text, date, time without time zone, time without time zone, text)
  to authenticated;

-- Preserve MT-20's publish transition for an otherwise scheduled meeting after
-- its date/time is changed through the dedicated MT-24 reschedule operation.
create or replace function convay_private.publish_meeting_request(p_record_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  published_payload jsonb;
begin
  if auth.uid() is null or not convay_private.has_permission('mtg_update') then
    raise exception 'Meeting update permission required' using errcode = '42501';
  end if;
  if nullif(btrim(coalesce(p_record_id, '')), '') is null then
    raise exception 'A meeting ID is required' using errcode = '22023';
  end if;

  update public.convay_entity_records as meeting
  set payload = jsonb_set(
    jsonb_set(meeting.payload, '{approval_status}', to_jsonb('Published'::text), true),
    '{status}', to_jsonb('Published'::text), true
  )
  where meeting.entity_key = 'bms.meetings'
    and meeting.record_id = btrim(p_record_id)
    and lower(btrim(coalesce(meeting.payload->>'approval_status', ''))) in ('scheduled', 'rescheduled')
  returning meeting.payload into published_payload;

  if published_payload is null then
    raise exception 'Meeting was not found or is no longer scheduled' using errcode = '40001';
  end if;
  return published_payload;
end
$function$;

revoke all on function convay_private.publish_meeting_request(text) from public, anon, authenticated;
grant execute on function convay_private.publish_meeting_request(text) to authenticated;

create or replace function public.convay_publish_meeting(p_record_id text)
returns jsonb
language sql
security invoker
set search_path = ''
as $wrapper$
  select convay_private.publish_meeting_request(p_record_id);
$wrapper$;

revoke all on function public.convay_publish_meeting(text) from public, anon;
grant execute on function public.convay_publish_meeting(text) to authenticated;
