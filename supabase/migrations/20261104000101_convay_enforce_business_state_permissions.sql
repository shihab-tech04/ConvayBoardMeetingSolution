-- Enforce approval, meeting start/cancel, publication and document lock semantics in SQL,
-- not merely in hidden buttons or frontend route guards.
create function convay_private.enforce_entity_state_transition()
returns trigger language plpgsql security invoker set search_path='' as $$
declare
  approval_perm text;
  required_perm text;
  prev_status text := '';
  next_status text := '';
  previous_approval text := '';
  next_approval text := '';
begin
  if tg_op = 'UPDATE' then
    prev_status:=lower(btrim(coalesce(old.payload->>'status','')));
    previous_approval:=lower(btrim(coalesce(old.payload->>'approval_status','')));
  end if;
  next_status:=lower(btrim(coalesce(new.payload->>'status','')));
  next_approval:=lower(btrim(coalesce(new.payload->>'approval_status','')));

  approval_perm := case new.entity_key
    when 'bms.meetings' then 'mtg_approve'
    when 'bms.agenda' then 'agd_approve'
    when 'bms.decisions' then 'dec_approve'
    when 'bms.resolutions' then 'res_approve'
    when 'bms.actionitems' then 'act_close'
    when 'bms.minutes' then 'min_approve'
    when 'bms.boardpacks' then 'pack_publish'
    when 'bms.packversions' then 'pack_publish'
    when 'bms.documents' then 'doc_approve'
    when 'bms.doc.approvals' then 'doc_approve'
    else null
  end;

  if approval_perm is not null and
    ((next_approval is distinct from previous_approval and
        (next_approval ~ '^(approved|rejected|accepted|published|signed|finalized|adopted)' or
         previous_approval ~ '^(approved|rejected|accepted|published|signed|finalized|adopted)'))
     or (new.entity_key='bms.agenda' and tg_op='UPDATE'
         and new.payload->'approval_history' is distinct from old.payload->'approval_history'))
  then required_perm:=approval_perm; end if;

  if new.entity_key='bms.meetings' and prev_status is distinct from next_status then
     if next_status in ('cancelled','canceled') then required_perm:='mtg_cancel';
     elsif next_status in ('in progress','live','ongoing') then required_perm:='mtg_start';
     elsif next_status in ('postponed','rescheduled') then required_perm:='mtg_postpone';
     end if;
  end if;

  if new.entity_key='bms.documents' then
     if tg_op='UPDATE'
       and (lower(coalesce(new.payload->>'workflow_status','')) in ('published','released')
            and lower(coalesce(old.payload->>'workflow_status','')) not in ('published','released'))
       then required_perm:='doc_publish';
     end if;
     if tg_op='UPDATE' and new.payload->'is_locked' is distinct from old.payload->'is_locked'
       then required_perm:='doc_manage_versions';
     end if;
  end if;

  if new.entity_key='bms.actionitems' then
    if (tg_op='INSERT' or
        new.payload->>'implementation_status' is distinct from old.payload->>'implementation_status' or
        new.payload->>'completion_status' is distinct from old.payload->>'completion_status' or
        new.payload->>'action_status' is distinct from old.payload->>'action_status')
       and (lower(coalesce(new.payload->>'implementation_status','')) in ('completed','closed','done')
        or lower(coalesce(new.payload->>'completion_status','')) in ('completed','closed','done')
        or lower(coalesce(new.payload->>'action_status','')) in ('completed','closed','done'))
       then required_perm:='act_close';
    end if;
  end if;

  if new.entity_key='bms.doc.approvals' and
    (tg_op='INSERT' or new.payload->>'status' is distinct from old.payload->>'status')
    and lower(coalesce(new.payload->>'status','')) in ('approved','rejected')
  then required_perm:='doc_approve'; end if;

  if required_perm is not null and not convay_private.has_permission(required_perm) then
    raise exception 'Additional business permission required for %',new.entity_key
      using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function convay_private.enforce_entity_state_transition() from public,anon,authenticated;
create trigger convay_guard_entity_state
  before insert or update of payload on public.convay_entity_records
  for each row execute function convay_private.enforce_entity_state_transition();
