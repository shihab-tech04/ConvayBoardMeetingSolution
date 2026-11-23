-- LM-01 / HM-05: replace legacy nonfunctional deterministic Convay room URLs.
-- LiveKit rooms and tokens are issued by the authenticated Convay application,
-- not by app.convay.com/m/j/{hash}?pwd=..., and the real room identity is the
-- persisted meeting_id / record_id. This changes only rows with the confirmed
-- synthetic legacy link, retaining meeting status, leadership, attendance,
-- participants, scheduling and all other business data.
--
-- Keep the current production Pages hostname/basename aligned with the app's
-- liveMeetingUrl() helper. New writes derive the link at Save time instead.
update public.convay_entity_records
set payload = jsonb_set(
  jsonb_set(payload, '{virtual_platform}', to_jsonb('LiveKit'::text), true),
  '{virtual_link}', to_jsonb(
    'https://shihab-tech04.github.io/ConvayBoardMeetingSolution/meetings/' ||
    record_id || '/live?entry=join_meeting'
  ), true
)
where entity_key = 'bms.meetings'
  and record_id = payload->>'meeting_id'
  and record_id ~ '^MTG-[A-Za-z0-9_-]+$'
  and payload->>'mode' in ('Virtual','Hybrid')
  and payload->>'virtual_link' like 'https://app.convay.com/m/j/%';
