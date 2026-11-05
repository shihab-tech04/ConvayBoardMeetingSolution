-- Return a pending meeting to its organizer with durable revision instructions.
-- The approver grant authorizes only this transition; generic meeting updates
-- continue to require mtg_update.
create or replace function convay_private.request_meeting_revision(
  p_record_id text,
  p_revision_instructions text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  revised_payload jsonb;
  clean_instructions text := nullif(btrim(coalesce(p_revision_instructions, '')), '');
begin
  if auth.uid() is null or not convay_private.has_permission('mtg_approve') then
    raise exception 'Meeting approval permission required'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_record_id, '')), '') is null then
    raise exception 'A meeting ID is required'
      using errcode = '22023';
  end if;

  if clean_instructions is null or length(clean_instructions) < 10 then
    raise exception 'Revision instructions must be at least 10 characters'
      using errcode = '22023';
  end if;

  update public.convay_entity_records as meeting
  set payload = jsonb_set(
    jsonb_set(
      jsonb_set(
        jsonb_set(meeting.payload, '{approval_status}', to_jsonb('Revision Requested'::text), true),
        '{revision_instructions}', to_jsonb(clean_instructions), true
      ),
      '{revision_requested_by}', to_jsonb(auth.uid()::text), true
    ),
    '{revision_requested_at}', to_jsonb(clock_timestamp()), true
  )
  where meeting.entity_key = 'bms.meetings'
    and meeting.record_id = btrim(p_record_id)
    and lower(btrim(coalesce(meeting.payload->>'approval_status', ''))) = 'pending approval'
  returning meeting.payload into revised_payload;

  if revised_payload is null then
    raise exception 'Meeting was not found or is no longer pending approval'
      using errcode = '40001';
  end if;

  return revised_payload;
end
$function$;

revoke all on function convay_private.request_meeting_revision(text, text)
  from public, anon, authenticated;
grant execute on function convay_private.request_meeting_revision(text, text)
  to authenticated;

-- Expose only an invoker entry point. The private operation performs the
-- permission check, exact meeting scope and pending-state compare-and-update.
create or replace function public.convay_request_meeting_revision(
  p_record_id text,
  p_revision_instructions text
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select convay_private.request_meeting_revision(p_record_id, p_revision_instructions);
$function$;

revoke all on function public.convay_request_meeting_revision(text, text)
  from public, anon, authenticated;
grant execute on function public.convay_request_meeting_revision(text, text)
  to authenticated;
