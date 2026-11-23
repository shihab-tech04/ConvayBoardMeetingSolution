-- MT-04 / AD-06: protect the existing single-organization quorum-rule registry.
-- SaaS tenant activation remains separately gated. No tenant assumptions are added.
-- The trusted registry RLS still requires admin_config; this trigger is a
-- second line of defense against unsafe policy edits, stale board references
-- and rule changes during a scheduled or active meeting.
create or replace function convay_private.guard_versioned_quorum_rule()
returns trigger language plpgsql security definer set search_path = '' as $body$
declare
  v_body_id text;
  v_count integer;
  v_version integer;
  v_min integer;
  v_pct numeric;
  v_active_meetings boolean;
begin
  if (case when tg_op = 'DELETE' then old.entity_key else new.entity_key end) <> 'bms.quorumrules' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if auth.uid() is null or not convay_private.has_permission('admin_config') then
    raise exception 'Quorum rule management permission required' using errcode = '42501';
  end if;
  if tg_op = 'DELETE' then
    raise exception 'Quorum policies are versioned and cannot be deleted' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    -- A policy is immutable except for a controlled Active -> Inactive transition.
    if coalesce(old.payload->>'status','') <> 'Active'
       or new.payload->>'status' <> 'Inactive'
       or (new.payload - 'status' - 'updated_at') is distinct from (old.payload - 'status' - 'updated_at') then
      raise exception 'Create a new quorum rule version; do not alter a saved policy' using errcode = '42501';
    end if;
    v_body_id := old.payload->>'governance_body_id';
    select exists (
      select 1 from public.convay_entity_records m
      where m.entity_key = 'bms.meetings'
        and m.payload->>'committee' = v_body_id
        and lower(coalesce(m.payload->>'approval_status','')) in
          ('pending approval','approved','scheduled','rescheduled','published','ready to start','in progress','live','paused','on hold')
    ) into v_active_meetings;
    if v_active_meetings then
      raise exception 'Cannot deactivate a quorum rule while meetings rely on it' using errcode = '42501';
    end if;
    new.payload := jsonb_set(new.payload, '{updated_by}', to_jsonb(auth.uid()::text), true);
    return new;
  end if;

  v_body_id := btrim(coalesce(new.payload->>'governance_body_id',''));
  if v_body_id = '' or btrim(coalesce(new.payload->>'rule_name','')) = ''
     or new.payload->>'status' <> 'Active'
     or new.payload->>'rule_id' is distinct from new.record_id
     or new.payload->>'id' is distinct from new.record_id then
    raise exception 'A real governance body, named active rule and canonical ID are required' using errcode = '23514';
  end if;
  if not exists (
    select 1 from public.convay_entity_records b
    where b.entity_key = 'bms.govbodies' and b.record_id = v_body_id
      and b.payload->>'status' = 'Active'
  ) then
    raise exception 'Select an existing active governance body' using errcode = '23503';
  end if;
  if new.payload->>'rule_type' not in ('fixed_number','percentage') then
    raise exception 'Only verified fixed-number and percentage quorum policies are currently supported' using errcode = '23514';
  end if;
  if coalesce(new.payload->>'minimum_members_count','') !~ '^\d{1,6}$'
     or coalesce(new.payload->>'minimum_percentage','') !~ '^\d{1,3}(\.\d{1,2})?$'
     or coalesce(new.payload->>'policy_version','') !~ '^\d{1,5}$' then
    raise exception 'Quorum thresholds and version must be valid numbers' using errcode = '23514';
  end if;
  v_min := (new.payload->>'minimum_members_count')::integer;
  v_pct := (new.payload->>'minimum_percentage')::numeric;
  v_version := (new.payload->>'policy_version')::integer;
  if (v_min < 0 or v_min > 100000 or v_pct < 0 or v_pct > 100
      or (v_min = 0 and v_pct = 0)
      or (new.payload->>'rule_type' = 'fixed_number' and v_min = 0)
      or (new.payload->>'rule_type' = 'percentage' and v_pct = 0)) then
    raise exception 'Invalid minimum member or percentage threshold' using errcode = '23514';
  end if;

  -- Serialize concurrent first-time rule creation for the same body.
  perform pg_advisory_xact_lock(hashtext('convay-quorum-' || v_body_id));
  if exists (
    select 1 from public.convay_entity_records q
    where q.entity_key = 'bms.quorumrules'
      and q.payload->>'governance_body_id' = v_body_id
      and q.payload->>'status' = 'Active'
  ) then
    raise exception 'An active quorum rule already exists for this body' using errcode = '23505';
  end if;
  select coalesce(max(case
    when q.payload->>'policy_version' ~ '^\d{1,5}$' then (q.payload->>'policy_version')::integer
    else 1 end),0)
    into v_count from public.convay_entity_records q
    where q.entity_key = 'bms.quorumrules'
      and q.payload->>'governance_body_id' = v_body_id;
  if v_version <> v_count + 1 then
    raise exception 'Quorum rule version is stale; refresh and retry' using errcode = '40001';
  end if;
  new.payload := jsonb_set(new.payload, '{policy_created_by}', to_jsonb(auth.uid()::text), true);
  return new;
end;
$body$;
revoke all on function convay_private.guard_versioned_quorum_rule() from public,anon,authenticated,service_role;
drop trigger if exists convay_a0_versioned_quorum_policy on public.convay_entity_records;
create trigger convay_a0_versioned_quorum_policy
  before insert or update or delete on public.convay_entity_records
  for each row execute function convay_private.guard_versioned_quorum_rule();
