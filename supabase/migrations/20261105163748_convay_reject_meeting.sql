-- Reject one pending meeting with a required reason through an approver-only,
-- compare-and-update operation. The entity trigger records the audit event.
create or replace function convay_private.reject_meeting_request(
  p_record_id text,
  p_rejection_reason text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  rejected_payload jsonb;
  clean_reason text := nullif(btrim(coalesce(p_rejection_reason, '')), '');
begin
  if auth.uid() is null or not convay_private.has_permission('mtg_approve') then
    raise exception 'Meeting approval permission required'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_record_id, '')), '') is null then
    raise exception 'A meeting ID is required'
      using errcode = '22023';
  end if;

  if clean_reason is null or length(clean_reason) < 5 then
    raise exception 'Rejection reason must be at least 5 characters'
      using errcode = '22023';
  end if;

  update public.convay_entity_records as meeting
  set payload = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(meeting.payload, '{approval_status}', to_jsonb('Rejected'::text), true),
        '{rejection_reason}', to_jsonb(clean_reason), true
      ),
      '{rejected_by}', to_jsonb(auth.uid()::text), true
    ),
    '{rejected_at}', to_jsonb(clock_timestamp()), true
  )
  where meeting.entity_key = 'bms.meetings'
    and meeting.record_id = btrim(p_record_id)
    and lower(btrim(coalesce(meeting.payload->>'approval_status', ''))) = 'pending approval'
  returning meeting.payload into rejected_payload;

  if rejected_payload is null then
    raise exception 'Meeting was not found or is no longer pending approval'
      using errcode = '40001';
  end if;

  return rejected_payload;
end
$function$;

revoke all on function convay_private.reject_meeting_request(text, text)
  from public, anon, authenticated;
grant execute on function convay_private.reject_meeting_request(text, text)
  to authenticated;

-- The exposed entry point remains SECURITY INVOKER. The private operation
-- performs the permission, pending-state, and required-reason checks.
create or replace function public.convay_reject_meeting(
  p_record_id text,
  p_rejection_reason text
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select convay_private.reject_meeting_request(p_record_id, p_rejection_reason);
$function$;

revoke all on function public.convay_reject_meeting(text, text)
  from public, anon, authenticated;
grant execute on function public.convay_reject_meeting(text, text)
  to authenticated;
