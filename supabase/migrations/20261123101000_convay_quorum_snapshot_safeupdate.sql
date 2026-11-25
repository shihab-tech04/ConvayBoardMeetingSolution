-- AD-06 / MT-04 production repair: the quorum-policy INSERT trigger previously
-- attempted an unrestricted UPDATE of live quorum snapshots. Production's SQL
-- safety guard rejects UPDATE without WHERE (SQLSTATE 21000), rolling back
-- otherwise-authorized quorum rule creation (HTTP 400).
--
-- Keep all prior security/role gates, revision invalidation and fail-closed
-- semantics unchanged. meeting_id is a NOT NULL primary key on this table,
-- so this qualifying predicate covers *every* persisted snapshot, including
-- unverified/false ones; it does not silently skip a meeting.
create or replace function convay_private.invalidate_live_quorum_on_scope_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $body$
declare
  v_entity text := case when tg_op='DELETE' then old.entity_key else new.entity_key end;
  v_mid_old text := case when tg_op in ('UPDATE','DELETE') then old.payload->>'meeting_id' end;
  v_mid_new text := case when tg_op in ('INSERT','UPDATE') then new.payload->>'meeting_id' end;
  v_enabled boolean;
begin
  if v_entity not in ('bms.meetingParticipantLinks','bms.liveSessions',
      'bms.meetings','bms.quorumrules') then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;

  select enabled into v_enabled from convay_private.live_attendance_release_gate
    where singleton=true;
  if v_enabled is not true then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;

  -- A governance-policy version may affect *every* live meeting. Invalidate
  -- all snapshots and increment every revision, but always use a real WHERE
  -- predicate so production's safe-update protection does not abort the
  -- outer authorized quorum-rule INSERT/UPDATE.
  if v_entity='bms.quorumrules' then
    update convay_private.live_quorum_snapshots
      set met=false,revision=revision+1,updated_at=now()
      where meeting_id is not null;
  else
    if v_entity='bms.meetings' then
      v_mid_old:=coalesce(nullif(v_mid_old,''),case when tg_op in ('UPDATE','DELETE') then old.record_id end);
      v_mid_new:=coalesce(nullif(v_mid_new,''),case when tg_op in ('INSERT','UPDATE') then new.record_id end);
    end if;
    update convay_private.live_quorum_snapshots
      set met=false,revision=revision+1,updated_at=now()
      where meeting_id in (v_mid_old,v_mid_new);
  end if;

  if tg_op='DELETE' then return old; end if;
  return new;
end;
$body$;
