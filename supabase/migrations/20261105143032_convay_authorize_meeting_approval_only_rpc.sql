-- Let an authenticated meeting approver perform the single approval transition
-- without granting broad meeting-update access. Row locking and the pending
-- status predicate make repeated or stale approval attempts fail closed.
create or replace function convay_private.approve_meeting_request(
  p_record_id text,
  p_approval_remark text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  approved_payload jsonb;
  clean_remark text := nullif(btrim(coalesce(p_approval_remark, '')), '');
begin
  if auth.uid() is null or not convay_private.has_permission('mtg_approve') then
    raise exception 'Meeting approval permission required'
      using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_record_id, '')), '') is null then
    raise exception 'A meeting ID is required'
      using errcode = '22023';
  end if;

  update public.convay_entity_records as meeting
  set payload = case
    when clean_remark is null then
      jsonb_set(meeting.payload, '{approval_status}', to_jsonb('Approved'::text), true)
    else
      jsonb_set(
        jsonb_set(meeting.payload, '{approval_status}', to_jsonb('Approved'::text), true),
        '{approval_remark}', to_jsonb(clean_remark), true
      )
    end
  where meeting.entity_key = 'bms.meetings'
    and meeting.record_id = btrim(p_record_id)
    and lower(btrim(coalesce(meeting.payload->>'approval_status', ''))) = 'pending approval'
  returning meeting.payload into approved_payload;

  if approved_payload is null then
    raise exception 'Meeting was not found or is no longer pending approval'
      using errcode = '40001';
  end if;

  return approved_payload;
end
$function$;

revoke all on function convay_private.approve_meeting_request(text, text)
  from public, anon, authenticated;
grant execute on function convay_private.approve_meeting_request(text, text)
  to authenticated;

-- Keep only an invoker entry point in the exposed Data API schema. The
-- privileged operation stays in convay_private and performs its own grant and
-- state checks before the narrowly scoped update.
create or replace function public.convay_approve_meeting(
  p_record_id text,
  p_approval_remark text default null
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $function$
  select convay_private.approve_meeting_request(p_record_id, p_approval_remark);
$function$;

revoke all on function public.convay_approve_meeting(text, text)
  from public, anon, authenticated;
grant execute on function public.convay_approve_meeting(text, text)
  to authenticated;
