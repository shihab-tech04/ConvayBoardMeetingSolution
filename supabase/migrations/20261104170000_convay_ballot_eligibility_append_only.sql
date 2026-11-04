-- RFP PT-07, VT-07 and BR-11: linked eligible voter IDs must be verified
-- in the authoritative database, not merely hidden/disabled in the React UI.
-- Existing production has zero vote records; preserve the generic registry API.
create unique index if not exists convay_unique_ballot_voter_session
  on public.convay_entity_records (
    (payload->>'meeting_id'),(payload->>'ballot_session_id'),(payload->>'voter_id')
  )
  where entity_key='bms.votes'
    and nullif(btrim(payload->>'voter_id'),'') is not null
    and nullif(btrim(payload->>'ballot_session_id'),'') is not null;

create or replace function convay_private.enforce_ballot_eligibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $guard$
declare
  v_actor uuid := auth.uid();
  v_meeting text;
  v_voter text;
  v_session text;
  v_record_type text;
begin
  -- Official votes are append-only. Corrections and reopened ballots must
  -- become new events with their own session ID, never rewrite history.
  if tg_op in ('UPDATE','DELETE') then
    if old.entity_key='bms.votes'
       or (tg_op='UPDATE' and new.entity_key='bms.votes') then
      if v_actor is not null then
        raise exception 'Official voting records are immutable'
          using errcode='42501';
      end if;
    end if;
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  if new.entity_key <> 'bms.votes' then return new; end if;

  if v_actor is null then
    raise exception 'Signed-in voting actor required' using errcode='42501';
  end if;
  v_meeting := nullif(btrim(new.payload->>'meeting_id'),'');
  v_record_type := nullif(btrim(new.payload->>'voter_name'),'');
  v_voter := nullif(btrim(new.payload->>'voter_id'),'');
  v_session := nullif(btrim(new.payload->>'ballot_session_id'),'');

  -- An authorized chair/secretary may finalize the aggregate tally, but
  -- aggregation must never disclose the identity or choice of a secret voter.
  if v_record_type in ('Summary','Secret Ballot (anonymised)') then
    if v_voter is not null or not convay_private.has_permission('mtg_start') then
      raise exception 'Meeting leadership permission required for vote summary'
        using errcode='42501';
    end if;
    return new;
  end if;

  if v_voter is null or v_session is null or v_meeting is null then
    raise exception 'Individual ballot requires meeting, session and voter IDs'
      using errcode='42501';
  end if;
  if not convay_private.has_permission('mtg_join') then
    raise exception 'Meeting participation permission required for ballot'
      using errcode='42501';
  end if;
  if not exists(
    select 1 from public.convay_entity_records link
    where link.entity_key='bms.meetingParticipantLinks'
      and link.payload->>'meeting_id'=v_meeting
      and link.payload->>'user_id'=v_voter
      and link.payload->>'voting_eligible'='true'
  ) then
    raise exception 'Voter is not an eligible linked meeting participant'
      using errcode='42501';
  end if;
  if v_voter<>v_actor::text and not convay_private.has_permission('mtg_start') then
    raise exception 'Only authorized leadership may record proxy ballots'
      using errcode='42501';
  end if;
  return new;
end
$guard$;

revoke all on function convay_private.enforce_ballot_eligibility()
  from public, anon, authenticated;
drop trigger if exists convay_a1_ballot_eligibility
  on public.convay_entity_records;
create trigger convay_a1_ballot_eligibility
before insert or update or delete on public.convay_entity_records
for each row execute function convay_private.enforce_ballot_eligibility();
