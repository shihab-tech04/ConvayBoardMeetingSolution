-- MT-25: cancel a meeting through an atomic, permission-checked SQL operation.
-- Keep the existing confirmation/reason UI and the shared lifecycle audit trail.

create or replace function convay_private.cancel_meeting_request(
  p_record_id text,
  p_cancellation_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  v_actor uuid := auth.uid();
  v_reason text := nullif(btrim(coalesce(p_cancellation_reason, '')), '');
  v_meeting public.convay_entity_records%rowtype;
  v_status text;
  v_payload jsonb;
  v_now timestamptz := clock_timestamp();
begin
  if v_actor is null or not coalesce(convay_private.has_permission('mtg_cancel'), false) then
    raise exception 'Meeting cancellation permission required'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_record_id, '')), '') is null then
    raise exception 'A meeting ID is required'
      using errcode = '22023';
  end if;
  if v_reason is null or char_length(v_reason) < 5 then
    raise exception 'Please provide a cancellation reason (at least 5 characters)'
      using errcode = '22023';
  end if;

  select meeting.*
  into v_meeting
  from public.convay_entity_records as meeting
  where meeting.entity_key = 'bms.meetings'
    and meeting.record_id = btrim(p_record_id)
  for update;

  if not found then
    raise exception 'Meeting was not found or is no longer cancellable'
      using errcode = '40001';
  end if;

  v_status := lower(btrim(coalesce(
    nullif(btrim(coalesce(v_meeting.payload->>'approval_status', '')), ''),
    nullif(btrim(coalesce(v_meeting.payload->>'status', '')), ''),
    ''
  )));
  if v_status not in ('scheduled', 'rescheduled', 'published', 'ready to start') then
    raise exception 'Meeting was not found or is no longer cancellable'
      using errcode = '40001';
  end if;

  if not convay_private.is_meeting_leader(v_actor, v_meeting.payload, v_meeting.created_by) then
    raise exception 'Only the assigned chairperson, organizer, or meeting creator can cancel this meeting'
      using errcode = '42501';
  end if;

  v_payload := v_meeting.payload || jsonb_build_object(
    'status', 'Cancelled',
    'approval_status', 'Cancelled',
    'cancellation_reason', v_reason,
    'cancelled_by', v_actor::text,
    'cancelled_at', v_now
  );

  update public.convay_entity_records as meeting
  set payload = v_payload
  where meeting.entity_key = 'bms.meetings'
    and meeting.record_id = btrim(p_record_id)
  returning meeting.payload into v_payload;

  if v_payload is null then
    raise exception 'Meeting was not found or is no longer cancellable'
      using errcode = '40001';
  end if;

  return v_payload;
end
$function$;

revoke all on function convay_private.cancel_meeting_request(text, text)
  from public, anon, authenticated;
grant execute on function convay_private.cancel_meeting_request(text, text)
  to authenticated;

create or replace function public.convay_cancel_meeting(
  p_record_id text,
  p_cancellation_reason text
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $wrapper$
  select convay_private.cancel_meeting_request(
    p_record_id,
    p_cancellation_reason
  );
$wrapper$;

revoke all on function public.convay_cancel_meeting(text, text)
  from public, anon, authenticated;
grant execute on function public.convay_cancel_meeting(text, text)
  to authenticated;
