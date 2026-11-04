-- Ensure vote records belong to an actual meeting and cannot be duplicated
-- by changing the generic JSONB registry record ID. This complements the
-- existing authenticated RLS and atomic convay_apply_entity_batch RPC.
create unique index if not exists convay_vote_unique_meeting_ballot
  on public.convay_entity_records
    ((payload->>'meeting_id'), (payload->>'vote_id'))
  where entity_key='bms.votes'
    and nullif(btrim(payload->>'meeting_id'),'') is not null
    and nullif(btrim(payload->>'vote_id'),'') is not null;

create or replace function convay_private.enforce_vote_reference_integrity()
returns trigger
language plpgsql security definer set search_path=''
as $integrity$
declare
  current_vote jsonb;
  referenced_meeting text;
begin
  if tg_op='DELETE' and old.entity_key='bms.meetings' then
    if exists(
      select 1 from public.convay_entity_records v
      where v.entity_key='bms.votes'
        and v.payload->>'meeting_id' in (old.record_id, old.payload->>'meeting_id')
        and not exists(
          select 1 from public.convay_entity_records m
          where m.entity_key='bms.meetings'
            and (m.record_id=v.payload->>'meeting_id'
              or m.payload->>'meeting_id'=v.payload->>'meeting_id')
        )
    ) then
      raise exception 'Cannot delete a meeting while its votes still exist'
        using errcode='23503';
    end if;
    return old;
  end if;

  if tg_op='DELETE' or new.entity_key <> 'bms.votes' then
    return case when tg_op='DELETE' then old else new end;
  end if;

  -- Deferred checks use the final record image after the entire transaction,
  -- including cases when a vote row was updated or deleted in the same batch.
  select payload into current_vote from public.convay_entity_records
    where entity_key='bms.votes' and record_id=new.record_id;
  if not found then return new; end if;
  referenced_meeting:=nullif(btrim(current_vote->>'meeting_id'),'');
  if referenced_meeting is null
    or nullif(btrim(current_vote->>'vote_id'),'') is null
    or not exists(
      select 1 from public.convay_entity_records m
      where m.entity_key='bms.meetings'
        and (m.record_id=referenced_meeting
          or m.payload->>'meeting_id'=referenced_meeting)
    ) then
    raise exception 'Voting record requires a real meeting and vote identifier'
      using errcode='23503';
  end if;
  return new;
end
$integrity$;

revoke all on function convay_private.enforce_vote_reference_integrity()
  from public, anon, authenticated;
drop trigger if exists convay_vote_reference_integrity
  on public.convay_entity_records;
create constraint trigger convay_vote_reference_integrity
after insert or update or delete on public.convay_entity_records
deferrable initially deferred
for each row execute function convay_private.enforce_vote_reference_integrity();
