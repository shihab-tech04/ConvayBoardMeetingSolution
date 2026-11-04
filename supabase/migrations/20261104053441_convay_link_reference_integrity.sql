-- Ensure linked meeting agendas and participants cannot point at missing parents.
-- Deferred checks allow a parent and its links to be created in a single atomic batch,
-- regardless of ordering. The generic JSONB registry remains the existing API.
-- The function is private and invoked only by the table trigger.
create or replace function convay_private.enforce_meeting_link_integrity()
returns trigger
language plpgsql security definer set search_path = ''
as $guard$
declare
  v_data jsonb;
  v_mid text;
  v_agenda text;
begin
  if tg_op = 'DELETE' then
    if old.entity_key = 'bms.meetings' and exists(
      select 1 from public.convay_entity_records l
      where l.entity_key in ('bms.meetingAgendaLinks','bms.meetingParticipantLinks')
        and l.payload->>'meeting_id' in (old.record_id,old.payload->>'meeting_id')
    ) then
      raise exception 'Remove linked agendas and participants before deleting a meeting'
        using errcode = '23503';
    end if;
    if old.entity_key = 'bms.agenda' and exists(
      select 1 from public.convay_entity_records l
      where l.entity_key = 'bms.meetingAgendaLinks'
        and l.payload->>'agenda_id' in (old.record_id,old.payload->>'agenda_id')
    ) then
      raise exception 'Remove meeting agenda links before deleting an agenda'
        using errcode = '23503';
    end if;
    return old;
  end if;
  if new.entity_key not in ('bms.meetingAgendaLinks','bms.meetingParticipantLinks') then
    return new;
  end if;
  -- The deferred trigger must inspect the current row, not an outdated NEW image
  -- from an intermediate patch within the same transaction.
  select payload into v_data from public.convay_entity_records
    where entity_key = new.entity_key and record_id = new.record_id;
  if not found then return new; end if;

  v_mid := nullif(btrim(v_data->>'meeting_id'),'');
  if v_mid is null or not exists(
    select 1 from public.convay_entity_records m
    where m.entity_key='bms.meetings'
      and (m.record_id=v_mid or m.payload->>'meeting_id'=v_mid)
  ) then
    raise exception 'Meeting relationship requires an existing meeting'
      using errcode = '23503';
  end if;

  if new.entity_key='bms.meetingAgendaLinks' then
    v_agenda := nullif(btrim(v_data->>'agenda_id'),'');
    if v_agenda is null or not exists(
      select 1 from public.convay_entity_records a
      where a.entity_key='bms.agenda'
        and (a.record_id=v_agenda or a.payload->>'agenda_id'=v_agenda)
    ) then
      raise exception 'Meeting agenda link requires an existing agenda'
        using errcode = '23503';
    end if;
  end if;
  return new;
end
$guard$;
revoke all on function convay_private.enforce_meeting_link_integrity() from public,anon,authenticated;
drop trigger if exists convay_meeting_link_integrity on public.convay_entity_records;
create constraint trigger convay_meeting_link_integrity
after insert or update or delete on public.convay_entity_records
deferrable initially deferred
for each row execute function convay_private.enforce_meeting_link_integrity();
