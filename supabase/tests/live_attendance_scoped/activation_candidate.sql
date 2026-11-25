-- Staged live attendance company/session SQL candidate.
-- DISPOSABLE TEST ONLY until native PostgreSQL/Auth/Storage recovery and
-- registry tenant activation dependencies are certified. Do not apply to hosted DB.
-- Existing legacy rows retain their NULL tenant. No guessed tenant backfill.
alter table convay_private.live_attendance_commands
  add column tenant_id uuid,
  add column session_id text,
  add column tenant_scope text generated always as (coalesce(tenant_id::text,'legacy')) stored;
alter table convay_private.live_attendance_commands
  drop constraint live_attendance_commands_pkey,
  add primary key(tenant_scope,request_id);
alter table convay_private.live_quorum_snapshots
  add column tenant_id uuid,
  add column session_id text,
  add column tenant_scope text generated always as (coalesce(tenant_id::text,'legacy')) stored;
alter table convay_private.live_quorum_snapshots
  drop constraint live_quorum_snapshots_pkey,
  add primary key(tenant_scope,meeting_id);

create table convay_private.live_attendance_session_history(
  tenant_id uuid,
  tenant_scope text generated always as (coalesce(tenant_id::text,'legacy')) stored,
  meeting_id text not null,
  prior_session_id text,
  attendance_record_id text not null,
  attendance_revision bigint not null,
  original_payload jsonb not null,
  archived_at timestamptz not null default now(),
  primary key(tenant_scope,meeting_id,attendance_record_id,attendance_revision)
);
alter table convay_private.live_attendance_session_history enable row level security;
revoke all on convay_private.live_attendance_session_history from public,anon,authenticated,service_role;

-- Private resolver: exact SQL tenant and current persisted session. The
-- service-only caller establishes auth.uid from the verified actor first.
-- Lock the meeting and active session so authorization and persistence use
-- the same database transaction. No global-root membership bypass.
create function convay_private.resolve_live_attendance_scope(
  p_tenant_id uuid,p_meeting_id text,p_session_id text
) returns table(meeting_record_id text,canonical_meeting_id text,active_session_id text,reopened boolean)
language plpgsql security definer set search_path='' as $scope$
declare m public.convay_entity_records%rowtype; s public.convay_entity_records%rowtype;
begin
  if (p_tenant_id is null and not coalesce(convay_private.legacy_unscoped_authorized(),false))
    or (p_tenant_id is not null and not coalesce(convay_private.tenant_member_active(p_tenant_id),false)) then
    raise exception 'Meeting company authorization denied' using errcode='42501';
  end if;
  if p_meeting_id is null or p_meeting_id !~ '^[A-Za-z0-9_-]{1,180}$' then
    raise exception 'Invalid meeting identity' using errcode='22023';
  end if;
  begin
    select * into strict m from public.convay_entity_records x
      where x.entity_key='bms.meetings' and x.tenant_id is not distinct from p_tenant_id
        and (x.record_id=p_meeting_id or x.payload->>'meeting_id'=p_meeting_id or x.payload->>'id'=p_meeting_id)
      for update;
  exception when no_data_found or too_many_rows then
    raise exception 'Meeting scope is unavailable or ambiguous' using errcode='42501';
  end;
  canonical_meeting_id:=coalesce(nullif(m.payload->>'meeting_id',''),m.record_id);
  if (select count(*) from public.convay_entity_records x
    where x.entity_key='bms.meetings' and x.tenant_id is not distinct from p_tenant_id
      and (x.record_id=canonical_meeting_id or x.payload->>'meeting_id'=canonical_meeting_id or x.payload->>'id'=canonical_meeting_id))<>1 then
    raise exception 'Canonical meeting scope is ambiguous' using errcode='42501';
  end if;
  begin
    select * into strict s from public.convay_entity_records x
      where x.entity_key='bms.liveSessions' and x.tenant_id is not distinct from p_tenant_id
        and x.payload->>'meeting_id'=canonical_meeting_id
        and lower(x.payload->>'session_status') in ('active','paused')
      for share;
  exception when no_data_found or too_many_rows then
    raise exception 'Exactly one active company session required' using errcode='23514';
  end;
  if p_session_id is not null and p_session_id is distinct from s.record_id then
    raise exception 'Live session changed; reconnect before retrying' using errcode='40001';
  end if;
  if s.payload->>'id' is distinct from s.record_id then
    raise exception 'Persisted session identity is invalid' using errcode='23514';
  end if;
  reopened:=nullif(s.payload->>'reopen_started_at','') is not null;
  if reopened and s.record_id !~ '^SES-[A-Za-z0-9_-]+-R[0-9]+$' then
    raise exception 'Persisted recovered session identity is invalid' using errcode='23514';
  end if;
  meeting_record_id:=m.record_id; active_session_id:=s.record_id;
  return next;
end $scope$;
revoke all on function convay_private.resolve_live_attendance_scope(uuid,text,text) from public,anon,authenticated,service_role;

-- Only first-session legacy rows may use an unattributed old attendance row.
-- A reopened or tenant-owned session never inherits earlier presence.
create function convay_private.live_attendance_row_current(p_payload jsonb,p_tenant_id uuid,p_session_id text,p_reopened boolean)
returns boolean language sql immutable set search_path='' as $current$
 select coalesce(p_payload->>'live_session_id'=p_session_id,false)
   or (p_tenant_id is null and not p_reopened and nullif(p_payload->>'live_session_id','') is null)
$current$;
revoke all on function convay_private.live_attendance_row_current(jsonb,uuid,text,boolean) from public,anon,authenticated,service_role;

-- Guard writes and votes at the same tenant/session boundary; the approved
-- physical-meeting workflow is not changed.
create or replace function convay_private.enforce_authoritative_live_meeting_writes()
returns trigger language plpgsql security definer set search_path='' as $guard$
declare
  v_entity text := case when tg_op='DELETE' then old.entity_key else new.entity_key end;
  v_payload jsonb := case when tg_op='DELETE' then old.payload else new.payload end;
  v_tenant uuid := case when tg_op='DELETE' then old.tenant_id else new.tenant_id end;
  v_mid text := v_payload->>'meeting_id';
  v_meeting jsonb; v_mode text; v_session text; v_count integer; v_met boolean;
begin
  if v_entity not in ('bms.attendance','bms.quorum','bms.votes')
     or (select enabled from convay_private.live_attendance_release_gate where singleton=true) is distinct from true
     or v_mid is null then
    if tg_op='DELETE' then return old; end if; return new;
  end if;
  select count(*) into v_count from public.convay_entity_records m
    where m.entity_key='bms.meetings' and m.tenant_id is not distinct from v_tenant
      and (m.record_id=v_mid or m.payload->>'meeting_id'=v_mid);
  if v_count<>1 then
    if v_count>1 or v_tenant is not null then raise exception 'Ambiguous meeting company scope' using errcode='42501'; end if;
    if tg_op='DELETE' then return old; end if; return new;
  end if;
  select m.payload into v_meeting from public.convay_entity_records m
    where m.entity_key='bms.meetings' and m.tenant_id is not distinct from v_tenant
      and (m.record_id=v_mid or m.payload->>'meeting_id'=v_mid);
  v_mode:=coalesce(nullif(v_meeting->>'mode',''),v_meeting->>'meeting_mode');
  if v_mode not in ('Virtual','Hybrid') then
    if tg_op='DELETE' then return old; end if; return new;
  end if;
  select count(*),min(s.record_id) into v_count,v_session from public.convay_entity_records s
    where s.entity_key='bms.liveSessions' and s.tenant_id is not distinct from v_tenant
      and s.payload->>'meeting_id'=v_mid and lower(s.payload->>'session_status') in ('active','paused');
  if v_count>1 then raise exception 'Ambiguous active session' using errcode='42501'; end if;
  if v_count=0 then
    if tg_op='DELETE' then return old; end if; return new;
  end if;
  if v_entity in ('bms.attendance','bms.quorum') then
    if current_setting('convay.authorized_live_attendance_write',true) is distinct from 'true' then
      raise exception 'Online attendance and quorum must use the trusted transaction' using errcode='42501';
    end if;
  else
    select q.met into v_met from convay_private.live_quorum_snapshots q
      where q.tenant_id is not distinct from v_tenant and q.meeting_id=v_mid and q.session_id=v_session;
    if v_met is distinct from true then
      raise exception 'Cannot write online votes without SQL-confirmed quorum' using errcode='42501';
    end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $guard$;

create or replace function convay_private.invalidate_live_quorum_on_scope_change()
returns trigger language plpgsql security definer set search_path='' as $invalidate$
declare v_entity text := case when tg_op='DELETE' then old.entity_key else new.entity_key end;
  v_old_mid text; v_new_mid text; v_old_tenant uuid; v_new_tenant uuid;
begin
  if v_entity not in ('bms.meetingParticipantLinks','bms.liveSessions','bms.meetings','bms.quorumrules')
     or (select enabled from convay_private.live_attendance_release_gate where singleton=true) is distinct from true then
    if tg_op='DELETE' then return old; end if; return new;
  end if;
  if tg_op in ('UPDATE','DELETE') then
    v_old_tenant:=old.tenant_id;
    v_old_mid:=coalesce(nullif(old.payload->>'meeting_id',''),case when v_entity='bms.meetings' then old.record_id end);
    update convay_private.live_quorum_snapshots set met=false,revision=revision+1,updated_at=now()
      where tenant_id is not distinct from v_old_tenant
      and (v_entity='bms.quorumrules' or meeting_id=v_old_mid);
  end if;
  if tg_op in ('UPDATE','INSERT') then
    v_new_tenant:=new.tenant_id;
    v_new_mid:=coalesce(nullif(new.payload->>'meeting_id',''),case when v_entity='bms.meetings' then new.record_id end);
    if tg_op='INSERT' or v_new_tenant is distinct from v_old_tenant or v_new_mid is distinct from v_old_mid then
      update convay_private.live_quorum_snapshots set met=false,revision=revision+1,updated_at=now()
        where tenant_id is not distinct from v_new_tenant
        and (v_entity='bms.quorumrules' or meeting_id=v_new_mid);
    end if;
  end if;
  if tg_op='DELETE' then return old; end if; return new;
end $invalidate$;
create or replace function public.convay_commit_live_attendance_scoped(
  p_actor_id uuid, p_meeting_id text, p_participant_id text,
  p_next_status text, p_expected_revision bigint, p_request_id text,
  p_provider_confirmed boolean, p_attendance_mode text,
  p_tenant_id uuid, p_session_id text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_meeting record;
  v_previous record;
  v_existing record;
  v_scope record;
  v_current_session text;
  v_reopened boolean;
  v_existing_current boolean;
  v_session_count integer;
  v_link_count integer;
  v_link jsonb;
  v_rule jsonb;
  v_state record;
  v_actor_name text;
  v_account_role text;
  v_participant_name text;
  v_actual_mid text;
  v_mode text;
  v_actor_can_join boolean;
  v_actor_can_attend boolean;
  v_actor_is_leader boolean;
  v_role text;
  v_required_roles text[] := array[]::text[];
  v_required_roles_met boolean := true;
  v_key text;
  v_att_id text;
  v_att_revision bigint;
  v_payload jsonb;
  v_quorum_revision bigint;
  v_total integer;
  v_present integer;
  v_min integer;
  v_percent numeric;
  v_required integer;
  v_met boolean;
  v_record_at timestamptz := clock_timestamp();
  v_receipt jsonb;
begin
  -- CALLER TRUST: this RPC has EXECUTE only for service_role. Edge verifies the
  -- Supabase Auth JWT, project account state and actual LiveKit participant.
  -- Never grant this RPC to authenticated/anon.
  if (select enabled from convay_private.live_attendance_release_gate
      where singleton=true) is distinct from true then
    raise exception 'Authoritative live attendance has not been activated'
      using errcode='42501';
  end if;
  if p_actor_id is null or p_meeting_id !~ '^[A-Za-z0-9_-]{1,180}$'
    or p_participant_id !~ '^[A-Za-z0-9_-]{1,180}$'
    or p_request_id !~ '^[A-Za-z0-9_-]{16,120}$'
    or p_expected_revision is null or p_expected_revision < 0
    or p_next_status not in ('Not Joined','Present','Temporarily Away','Left','Excused','Recused')
    or p_attendance_mode not in ('Online','In-Person') then
    raise exception 'Invalid attendance command' using errcode='22023';
  end if;

  select p.display_name, p.account_role into v_actor_name, v_account_role
    from public.user_profiles p
    where p.user_id=p_actor_id and p.account_status='active';
  if v_actor_name is null then
    raise exception 'Active verified Convay account required' using errcode='42501';
  end if;
  -- Bind the service-side verified actor to audit and existing RLS helpers.
  perform pg_catalog.set_config('request.jwt.claim.sub',p_actor_id::text,true);
  v_actor_can_join := convay_private.has_permission('mtg_join');
  v_actor_can_attend := convay_private.has_permission('mtg_attendance');
  if not convay_private.has_permission('mtg_view') then
    raise exception 'Meeting read permission required' using errcode='42501';
  end if;

  select * into strict v_scope from convay_private.resolve_live_attendance_scope(p_tenant_id,p_meeting_id,p_session_id);
  v_current_session:=v_scope.active_session_id;
  v_reopened:=v_scope.reopened;
  select m.* into strict v_meeting from public.convay_entity_records m
    where m.entity_key='bms.meetings' and m.tenant_id is not distinct from p_tenant_id and m.record_id=v_scope.meeting_record_id;
  v_actual_mid:=v_scope.canonical_meeting_id;
  -- Session state establishes live activity; approval may still be
  -- "Approved". Any contradictory forbidden lifecycle alias fails closed.
  if lower(coalesce(v_meeting.payload->>'approval_status','')) in
      ('draft','cancelled','canceled','rejected','completed','ended','archived')
     or lower(coalesce(v_meeting.payload->>'status','')) in
      ('draft','cancelled','canceled','rejected','completed','ended','archived')
     or lower(coalesce(v_meeting.payload->>'workflow_status','')) in
      ('draft','cancelled','canceled','rejected','completed','ended','archived') then
    raise exception 'Meeting is not in an active state' using errcode='23514';
  end if;
  -- The exact active session was already locked and checked by the resolver.

  -- Contradictory persisted mode aliases must not elevate admission.
  if nullif(v_meeting.payload->>'mode','') is not null
     and nullif(v_meeting.payload->>'meeting_mode','') is not null
     and v_meeting.payload->>'mode' <> v_meeting.payload->>'meeting_mode' then
    raise exception 'Conflicting saved meeting mode aliases' using errcode='23514';
  end if;
  v_mode:=coalesce(nullif(v_meeting.payload->>'mode',''),v_meeting.payload->>'meeting_mode');
  if v_mode not in ('Virtual','Hybrid','Physical') then
    raise exception 'A supported meeting mode is required' using errcode='23514';
  end if;
  if (v_mode='Physical' and p_attendance_mode='Online')
    or (v_mode='Virtual' and p_attendance_mode='In-Person') then
    raise exception 'Attendance mode conflicts with meeting mode' using errcode='23514';
  end if;

  select count(*) into v_link_count from public.convay_entity_records l
    where l.tenant_id is not distinct from p_tenant_id and l.entity_key='bms.meetingParticipantLinks'
      and l.payload->>'meeting_id'=v_actual_mid
      and l.payload->>'user_id'=p_participant_id;
  if v_link_count <> 1 then
    raise exception 'Exactly one saved participant relationship required' using errcode='23503';
  end if;
  select l.payload into v_link from public.convay_entity_records l
    where l.tenant_id is not distinct from p_tenant_id and l.entity_key='bms.meetingParticipantLinks'
      and l.payload->>'meeting_id'=v_actual_mid
      and l.payload->>'user_id'=p_participant_id limit 1;
  v_actor_is_leader:=convay_private.is_meeting_leader(p_actor_id,v_meeting.payload,v_meeting.created_by);
  if p_actor_id::text=p_participant_id then
    if p_attendance_mode='Online' and not v_actor_can_join then
      raise exception 'Meeting join permission required' using errcode='42501';
    end if;
    if p_attendance_mode='In-Person' and not (v_actor_can_attend and (v_actor_is_leader or v_account_role='super_admin')) then
      raise exception 'Manual attendance requires authorized meeting leadership' using errcode='42501';
    end if;
    if p_next_status in ('Not Joined','Recused','Excused') and not (v_actor_can_attend and (v_actor_is_leader or v_account_role='super_admin')) then
      raise exception 'Only meeting leadership may set formal absence or recusal' using errcode='42501';
    end if;
  elsif not (v_actor_can_attend and (v_actor_is_leader or v_account_role='super_admin')) then
    raise exception 'Only authorized meeting leadership may edit another participant' using errcode='42501';
  end if;
  if p_attendance_mode='Online' and p_next_status='Present'
    and p_provider_confirmed is distinct from true then
    raise exception 'LiveKit presence confirmation required' using errcode='42501';
  end if;

  -- This per-meeting row lock serializes attendance and quorum updates.
  select * into v_previous from convay_private.live_attendance_commands
    where tenant_id is not distinct from p_tenant_id and request_id=p_request_id;
  if found then
    if v_previous.session_id is distinct from v_current_session or v_previous.actor_id<>p_actor_id or v_previous.meeting_id<>v_actual_mid
       or v_previous.participant_id<>p_participant_id
       or v_previous.next_status<>p_next_status
       or v_previous.expected_revision<>p_expected_revision then
      raise exception 'An idempotency key was reused for another command' using errcode='23505';
    end if;
    return v_previous.receipt;
  end if;

  select count(*) into v_link_count from public.convay_entity_records a
    where a.tenant_id is not distinct from p_tenant_id and a.entity_key='bms.attendance' and a.payload->>'meeting_id'=v_actual_mid
      and a.payload->>'participant_id'=p_participant_id;
  if v_link_count>1 then
    raise exception 'Duplicate attendance records require reconciliation' using errcode='23505';
  end if;
  select a.* into v_existing from public.convay_entity_records a
    where a.tenant_id is not distinct from p_tenant_id and a.entity_key='bms.attendance' and a.payload->>'meeting_id'=v_actual_mid
      and a.payload->>'participant_id'=p_participant_id limit 1 for update;
  v_existing_current:=found and convay_private.live_attendance_row_current(v_existing.payload,p_tenant_id,v_current_session,v_reopened);
  if not v_existing_current and p_next_status<>'Present' then
    raise exception 'Join must be confirmed before leaving or changing status' using errcode='23514';
  end if;
  if coalesce(v_existing.revision,0)<>p_expected_revision then
    raise exception 'Attendance revision changed; refresh before retrying' using errcode='40001';
  end if;

  select display_name into v_participant_name from public.user_profiles
    where user_id::text=p_participant_id and account_status='active';
  v_participant_name:=coalesce(v_participant_name,p_participant_id);
  v_role:=coalesce(nullif(v_link->>'participant_type',''),'Member');
  perform pg_catalog.set_config('convay.authorized_live_attendance_write','true',true);

  if v_existing.record_id is null then
    v_att_id:='ATT-'||pg_catalog.gen_random_uuid()::text;
    v_payload:=pg_catalog.jsonb_build_object(
      'id',v_att_id,'attendance_id',v_att_id,'meeting_id',v_actual_mid,'live_session_id',v_current_session,
      'meeting_title',coalesce(v_meeting.payload->>'meeting_title',''),
      'participant_id',p_participant_id,'participant_name',v_participant_name,
      'designation','','role',v_role,'check_in_time',v_record_at,
      'check_out_time','','attendance_mode',p_attendance_mode,
      'attendance_status',p_next_status,'quorum_eligible',
        case when coalesce(v_link->>'quorum_eligible','false')='true' then 'Yes' else 'No' end,
      'signed','No','notes','','created_at',v_record_at,
      'recorded_by_user_id',p_actor_id::text
    );
    insert into public.convay_entity_records(entity_key,record_id,tenant_id,payload)
       values ('bms.attendance',v_att_id,p_tenant_id,v_payload)
       returning revision into v_att_revision;
  else
    v_att_id:=v_existing.record_id;
    if not v_existing_current then
      insert into convay_private.live_attendance_session_history(tenant_id,meeting_id,prior_session_id,attendance_record_id,attendance_revision,original_payload)
      values(p_tenant_id,v_actual_mid,v_existing.payload->>'live_session_id',v_att_id,v_existing.revision,v_existing.payload);
    end if;
    v_payload:=v_existing.payload || pg_catalog.jsonb_build_object(
      'live_session_id',v_current_session,
      'attendance_status',p_next_status,
      'check_in_time',case when p_next_status in ('Present','Temporarily Away') then v_record_at::text
        else coalesce(v_existing.payload->>'check_in_time','') end,
      'check_out_time',case when not v_existing_current then '' when p_next_status='Left' then v_record_at::text
        else coalesce(v_existing.payload->>'check_out_time','') end,
      'recorded_by_user_id',p_actor_id::text,
      'quorum_eligible',case when coalesce(v_link->>'quorum_eligible','false')='true'
        and p_next_status<>'Recused' then 'Yes' else 'No' end
    );
    update public.convay_entity_records set payload=v_payload
      where tenant_id is not distinct from p_tenant_id and entity_key='bms.attendance' and record_id=v_att_id
      returning revision into v_att_revision;
  end if;

  select count(distinct l.payload->>'user_id') into v_total
  from public.convay_entity_records l
  where l.tenant_id is not distinct from p_tenant_id and l.entity_key='bms.meetingParticipantLinks'
    and l.payload->>'meeting_id'=v_actual_mid
    and l.payload->>'quorum_eligible'='true';
  select count(distinct l.payload->>'user_id') into v_present
  from public.convay_entity_records l
  join public.convay_entity_records a
    on a.tenant_id is not distinct from p_tenant_id and a.entity_key='bms.attendance'
    and a.payload->>'meeting_id'=v_actual_mid
    and a.payload->>'participant_id'=l.payload->>'user_id'
    and convay_private.live_attendance_row_current(a.payload,p_tenant_id,v_current_session,v_reopened)
  where l.tenant_id is not distinct from p_tenant_id and l.entity_key='bms.meetingParticipantLinks'
    and l.payload->>'meeting_id'=v_actual_mid
    and l.payload->>'quorum_eligible'='true'
    and coalesce(a.payload->>'attendance_status',
      case when coalesce(a.payload->>'check_out_time','')<>'' then 'Left'
        when coalesce(a.payload->>'check_in_time','')<>'' then 'Present'
        else 'Not Joined' end) in ('Present','Temporarily Away');

  -- Resolve the same active rule model as the approved governance registry:
  -- meeting-specific > governance body > legacy display-name matching.
  select q.payload into v_rule from public.convay_entity_records q
  where q.tenant_id is not distinct from p_tenant_id and q.entity_key='bms.quorumrules'
    and q.payload->>'status'='Active'
    and (
      q.payload->>'meeting_id'=v_actual_mid
      or (
        nullif(q.payload->>'meeting_id','') is null
        and (
          q.payload->>'governance_body_id'=v_meeting.payload->>'committee'
          or q.payload->>'body_name'=v_meeting.payload->>'committee'
          or exists (
            select 1 from public.convay_entity_records g
            where g.tenant_id is not distinct from p_tenant_id and g.entity_key='bms.governanceBodies'
              and q.payload->>'governance_body_id' in (g.record_id,g.payload->>'body_id')
              and v_meeting.payload->>'committee' in
                (g.record_id,g.payload->>'body_id',g.payload->>'body_name')
          )
        )
      )
    )
  order by (q.payload->>'meeting_id'=v_actual_mid) desc, q.record_id
  limit 1;
  v_min:=coalesce(
    nullif(v_rule->>'minimum_members_count','')::integer,
    nullif(pg_catalog.regexp_replace(coalesce(v_rule->>'minimum_members',''),'[^0-9]','','g'),'')::integer,0);
  v_percent:=coalesce(
    nullif(v_rule->>'minimum_percentage','')::numeric,
    nullif(pg_catalog.regexp_replace(coalesce(v_rule->>'quorum_percent',''),'[^0-9.]','','g'),'')::numeric,0);
  if v_min<0 or v_min>100000 or v_percent<0 or v_percent>100 then
    raise exception 'Invalid configured quorum limits' using errcode='23514';
  end if;
  -- A newer role-based rule must never silently fall back to a weaker legacy
  -- threshold if required role IDs cannot be resolved to persisted link roles.
  if v_rule->>'rule_type'='role_based' then
    -- A normalized role-based rule requires actual role-ID mappings not
    -- supplied by the legacy participant link. Do not infer eligibility.
    v_required_roles_met:=false;
  end if;
  -- Explicit remote-attendance exclusion is enforced from the persisted
  -- attendance mode. Hybrid online participants cannot inflate physical quorum.
  if v_rule->>'count_virtual_attendance'='false' then
    select count(distinct l.payload->>'user_id') into v_present
    from public.convay_entity_records l
    join public.convay_entity_records a
      on a.tenant_id is not distinct from p_tenant_id and a.entity_key='bms.attendance'
      and a.payload->>'meeting_id'=v_actual_mid
      and a.payload->>'participant_id'=l.payload->>'user_id'
    and convay_private.live_attendance_row_current(a.payload,p_tenant_id,v_current_session,v_reopened)
    where l.tenant_id is not distinct from p_tenant_id and l.entity_key='bms.meetingParticipantLinks'
      and l.payload->>'meeting_id'=v_actual_mid
      and l.payload->>'quorum_eligible'='true'
      and a.payload->>'attendance_mode'='In-Person'
      and coalesce(a.payload->>'attendance_status',
        case when coalesce(a.payload->>'check_out_time','')<>'' then 'Left'
          when coalesce(a.payload->>'check_in_time','')<>'' then 'Present'
          else 'Not Joined' end) in ('Present','Temporarily Away');
  end if;
  if v_percent<0 or v_percent>100 then
    raise exception 'Invalid configured quorum percentage' using errcode='23514';
  end if;
  v_required:=greatest(v_min,pg_catalog.ceil(v_total*v_percent/100)::integer);
  -- A configured quorum may require a particular role to be physically or
  -- virtually present. It is not sufficient that the role was invited.
  if pg_catalog.jsonb_typeof(v_rule->'required_roles')='array' then
    select coalesce(pg_catalog.array_agg(value),array[]::text[])
      into v_required_roles
      from pg_catalog.jsonb_array_elements_text(v_rule->'required_roles') as role(value);
  elsif pg_catalog.jsonb_typeof(v_rule->'required_roles')='string' then
    v_required_roles:=pg_catalog.string_to_array(v_rule->>'required_roles',',');
  end if;
  foreach v_role in array v_required_roles loop
    v_role:=pg_catalog.btrim(v_role);
    if v_role<>'' and not exists (
      select 1 from public.convay_entity_records l
      join public.convay_entity_records a
        on a.tenant_id is not distinct from p_tenant_id and a.entity_key='bms.attendance'
        and a.payload->>'meeting_id'=v_actual_mid
        and a.payload->>'participant_id'=l.payload->>'user_id'
    and convay_private.live_attendance_row_current(a.payload,p_tenant_id,v_current_session,v_reopened)
      where l.tenant_id is not distinct from p_tenant_id and l.entity_key='bms.meetingParticipantLinks'
        and l.payload->>'meeting_id'=v_actual_mid
        and l.payload->>'participant_type'=v_role
        and coalesce(a.payload->>'attendance_status',
          case when coalesce(a.payload->>'check_out_time','')<>'' then 'Left'
            when coalesce(a.payload->>'check_in_time','')<>'' then 'Present'
            else 'Not Joined' end) in ('Present','Temporarily Away')
    ) then
      v_required_roles_met:=false;
    end if;
  end loop;
  v_met:=v_rule is not null and v_total>0 and v_required>0
    and v_present>=v_required and v_required_roles_met;

  select * into v_state from convay_private.live_quorum_snapshots
    where tenant_id is not distinct from p_tenant_id and meeting_id=v_actual_mid for update;
  if v_state.meeting_id is null then
    insert into convay_private.live_quorum_snapshots(tenant_id,meeting_id,session_id,revision,required,present,met)
      values(p_tenant_id,v_actual_mid,v_current_session,1,v_required,v_present,v_met)
      returning revision into v_quorum_revision;
  else
    update convay_private.live_quorum_snapshots
      set session_id=v_current_session,revision=revision+1,required=v_required,present=v_present,met=v_met,updated_at=now()
      where tenant_id is not distinct from p_tenant_id and meeting_id=v_actual_mid returning revision into v_quorum_revision;
  end if;

  if (v_state.meeting_id is not null and v_state.session_id is not distinct from v_current_session and v_state.met is distinct from v_met)
     or ((v_state.meeting_id is null or v_state.session_id is distinct from v_current_session) and v_met) then
    v_key:='QRM-'||pg_catalog.gen_random_uuid()::text;
    insert into public.convay_entity_records(entity_key,record_id,tenant_id,payload) values (
      'bms.quorum',v_key,p_tenant_id,pg_catalog.jsonb_build_object(
        'live_session_id',v_current_session,
        'id',v_key,'event_id',v_key,'meeting_id',v_actual_mid,
        'meeting_title',coalesce(v_meeting.payload->>'meeting_title',''),
        'event_type',case when v_met then 'Quorum Restored' else 'Quorum Lost' end,
        'quorum_required',v_required::text,'quorum_present',v_present::text,
        'quorum_met',case when v_met then 'Yes' else 'No' end,
        'recorded_at',v_record_at,'recorded_by','System',
        'recorded_by_user_id',p_actor_id::text,
        'notes',case when v_met then 'Quorum met' else 'Quorum lost' end,
        'created_at',v_record_at
      )
    );
  end if;
  v_receipt:=pg_catalog.jsonb_build_object(
    'requestId',p_request_id,'meetingId',v_actual_mid,'participantId',p_participant_id,'tenantId',p_tenant_id,'sessionId',v_current_session,
    'status',p_next_status,'attendanceId',v_att_id,'attendanceRevision',v_att_revision,
    'quorum',pg_catalog.jsonb_build_object('revision',v_quorum_revision,
      'required',v_required,'present',v_present,'met',v_met)
  );
  insert into convay_private.live_attendance_commands(
    tenant_id,session_id,request_id,actor_id,meeting_id,participant_id,next_status,expected_revision,receipt
  ) values(p_tenant_id,v_current_session,p_request_id,p_actor_id,v_actual_mid,p_participant_id,p_next_status,p_expected_revision,v_receipt);
  return v_receipt;
end;
$$;
revoke all on function public.convay_commit_live_attendance_scoped(uuid,text,text,text,bigint,text,boolean,text,uuid,text)
  from public,anon,authenticated;
grant execute on function public.convay_commit_live_attendance_scoped(uuid,text,text,text,bigint,text,boolean,text,uuid,text)
  to service_role;


create or replace function public.convay_read_live_attendance_scoped(
  p_actor_id uuid, p_meeting_id text, p_participant_id text,
  p_tenant_id uuid,p_session_id text
) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
  v_mid text;
  v_scope record;
  v_current_session text;
  v_reopened boolean;
  v_meeting record;
  v_profile record;
  v_row record;
  v_snapshot record;
  v_latest record;
  v_attendees jsonb;
  v_status text;
  v_quorum jsonb;
  v_authorized boolean;
begin
  if p_actor_id is null or p_meeting_id is null or p_participant_id is null
    or p_meeting_id !~ '^[A-Za-z0-9_-]{1,180}$'
    or p_participant_id !~ '^[A-Za-z0-9_-]{1,180}$' then
    raise exception 'Invalid attendance readback' using errcode='22023';
  end if;
  select p.display_name,p.account_role into v_profile from public.user_profiles p
    where p.user_id=p_actor_id and p.account_status='active';
  if not found then
    raise exception 'Active account required' using errcode='42501';
  end if;
  perform pg_catalog.set_config('request.jwt.claim.sub',p_actor_id::text,true);
  if not convay_private.has_permission('mtg_view') then
    raise exception 'Meeting read permission required' using errcode='42501';
  end if;
  select * into strict v_scope from convay_private.resolve_live_attendance_scope(p_tenant_id,p_meeting_id,p_session_id);
  v_mid:=v_scope.canonical_meeting_id;
  v_current_session:=v_scope.active_session_id;
  v_reopened:=v_scope.reopened;
  select m.* into strict v_meeting from public.convay_entity_records m
    where m.entity_key='bms.meetings' and m.tenant_id is not distinct from p_tenant_id and m.record_id=v_scope.meeting_record_id;
  if not exists (
    select 1 from public.convay_entity_records link
      where link.tenant_id is not distinct from p_tenant_id and link.entity_key='bms.meetingParticipantLinks'
      and link.payload->>'meeting_id'=v_mid
      and link.payload->>'user_id'=p_participant_id
  ) then
    raise exception 'Participant not registered in this meeting' using errcode='42501';
  end if;
  v_authorized:=p_actor_id::text=p_participant_id
    and convay_private.has_permission('mtg_join');
  if not v_authorized then
    v_authorized:=convay_private.has_permission('mtg_attendance')
      and (v_profile.account_role='super_admin'
        or convay_private.is_meeting_leader(p_actor_id,v_meeting.payload,v_meeting.created_by));
  end if;
  if not v_authorized then
    raise exception 'Attendance readback denied' using errcode='42501';
  end if;

  select a.* into v_row from public.convay_entity_records a
    where a.tenant_id is not distinct from p_tenant_id and a.entity_key='bms.attendance'
      and a.payload->>'meeting_id'=v_mid
      and a.payload->>'participant_id'=p_participant_id
    limit 1;
  select s.* into v_snapshot from convay_private.live_quorum_snapshots s
    where s.tenant_id is not distinct from p_tenant_id and s.meeting_id=v_mid and s.session_id=v_current_session;
  select c.* into v_latest from convay_private.live_attendance_commands c
    where c.tenant_id is not distinct from p_tenant_id and c.meeting_id=v_mid and c.session_id=v_current_session and c.participant_id=p_participant_id
    order by c.recorded_at desc, c.request_id desc limit 1;
  select coalesce(pg_catalog.jsonb_object_agg(a.payload->>'participant_id',
      coalesce(a.payload->>'attendance_status',
        case when coalesce(a.payload->>'check_out_time','')<>'' then 'Left'
          when coalesce(a.payload->>'check_in_time','')<>'' then 'Present'
          else 'Not Joined' end)), '{}'::jsonb)
    into v_attendees
    from public.convay_entity_records a
    where a.tenant_id is not distinct from p_tenant_id and a.entity_key='bms.attendance'
      and a.payload->>'meeting_id'=v_mid
      and convay_private.live_attendance_row_current(a.payload,p_tenant_id,v_current_session,v_reopened)
      and nullif(a.payload->>'participant_id','') is not null;
  v_status:=coalesce(v_row.payload->>'attendance_status',
    case when coalesce(v_row.payload->>'check_out_time','')<>'' then 'Left'
      when coalesce(v_row.payload->>'check_in_time','')<>'' then 'Present'
      else 'Not Joined' end);
  if v_row.record_id is null or not convay_private.live_attendance_row_current(v_row.payload,p_tenant_id,v_current_session,v_reopened) then
    v_status:='Not Joined';
  end if;
  v_quorum:=pg_catalog.jsonb_build_object(
    'revision',coalesce(v_snapshot.revision,0),
    'required',coalesce(v_snapshot.required,0),
    'present',coalesce(v_snapshot.present,0),
    'met',coalesce(v_snapshot.met,false)
  );
  return pg_catalog.jsonb_build_object(
    'requestId',coalesce(v_latest.request_id,'initial_1234567890123456'),
    'meetingId',v_mid,'participantId',p_participant_id,'tenantId',p_tenant_id,'sessionId',v_current_session,
    'status',v_status,'attendanceId',coalesce(v_row.record_id,''),
    'attendanceRevision',coalesce(v_row.revision,0),
    'quorum',v_quorum,'attendanceMap',v_attendees
  );
end;
$$;
revoke all on function public.convay_read_live_attendance_scoped(uuid,text,text,uuid,text)
  from public,anon,authenticated;
grant execute on function public.convay_read_live_attendance_scoped(uuid,text,text,uuid,text)
  to service_role;

-- Transitional legacy-only entry points preserve the existing Edge contract.
-- They cannot access a company-owned meeting. The new scoped caller must
-- supply the actual session from its authenticated registry read.
create or replace function public.convay_commit_live_attendance(
  p_actor_id uuid,p_meeting_id text,p_participant_id text,p_next_status text,
  p_expected_revision bigint,p_request_id text,p_provider_confirmed boolean,p_attendance_mode text
) returns jsonb language sql security definer set search_path='' as $legacy$
  select public.convay_commit_live_attendance_scoped(p_actor_id,p_meeting_id,p_participant_id,
    p_next_status,p_expected_revision,p_request_id,p_provider_confirmed,p_attendance_mode,null,null)
$legacy$;
revoke all on function public.convay_commit_live_attendance(uuid,text,text,text,bigint,text,boolean,text) from public,anon,authenticated;
grant execute on function public.convay_commit_live_attendance(uuid,text,text,text,bigint,text,boolean,text) to service_role;
create or replace function public.convay_read_live_attendance(
 p_actor_id uuid,p_meeting_id text,p_participant_id text
) returns jsonb language sql security definer set search_path='' as $legacy$
 select public.convay_read_live_attendance_scoped(p_actor_id,p_meeting_id,p_participant_id,null,null)
$legacy$;
revoke all on function public.convay_read_live_attendance(uuid,text,text) from public,anon,authenticated;
grant execute on function public.convay_read_live_attendance(uuid,text,text) to service_role;
