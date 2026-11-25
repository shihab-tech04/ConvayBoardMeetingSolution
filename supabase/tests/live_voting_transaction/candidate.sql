-- DISPOSABLE REHEARSAL ONLY. Not a migration or a hosted activation.
-- No policy seed, default method, quorum override, proxy vote or owner approval.
-- This tenant-scoped core depends on the existing #284 scoped attendance resolver.
-- Production AD-07 policy issuance, agenda-recusal writer, registry/archive
-- projection and authenticated Edge/client wiring must be completed before release.
create table convay_private.vote_policy_versions (
  tenant_id uuid not null, policy_id text not null, version integer not null check(version>0),
  method text not null check(method in ('Open','Secret Ballot')),
  numerator integer not null check(numerator between 1 and 10000),
  denominator integer not null check(denominator between 1 and 10000 and numerator<=denominator),
  basis text not null check(basis in ('decisive','cast','electorate')),
  comparison text not null check(comparison in ('gt','gte')),
  min_cast integer not null check(min_cast>0),
  reopen_allowed boolean not null, seconder_required boolean not null,
  visible_live_tally boolean not null, visible_named_ballots boolean not null,
  approval_ref text not null check(length(btrim(approval_ref))>0),
  primary key(tenant_id,policy_id,version),
  check(method<>'Secret Ballot' or (not visible_live_tally and not visible_named_ballots))
);
create table convay_private.vote_recusal_scope (
  tenant_id uuid not null, meeting_id text not null, session_id text not null,
  agenda_id text not null, voter_id uuid not null,
  primary key(tenant_id,meeting_id,session_id,agenda_id,voter_id)
);
create table convay_private.vote_motions (
  tenant_id uuid not null, meeting_id text not null, session_id text not null,
  motion_id uuid not null default gen_random_uuid(), agenda_id text not null,
  title text not null check(length(btrim(title)) between 1 and 500),
  wording text not null check(length(btrim(wording)) between 1 and 20000),
  proposer uuid not null, seconder uuid, notes text not null default '',
  create_request text not null, created_at timestamptz not null default clock_timestamp(),
  primary key(tenant_id,motion_id), unique(tenant_id,meeting_id,session_id,proposer,create_request),
  check(seconder is null or seconder<>proposer)
);
create table convay_private.vote_rounds (
  tenant_id uuid not null, motion_id uuid not null, round_id uuid not null default gen_random_uuid(),
  round_number integer not null check(round_number>0), meeting_id text not null, session_id text not null,
  policy_id text not null, policy_version integer not null,
  state text not null default 'Open' check(state in ('Open','Closed')),
  opened_by uuid not null, open_request text not null, opened_at timestamptz not null default clock_timestamp(),
  reopen_reason text, prior_round uuid, closed_by uuid, close_request text, closed_at timestamptz,
  electorate_count integer not null check(electorate_count>0),
  for_count integer not null default 0 check(for_count>=0),
  against_count integer not null default 0 check(against_count>=0),
  abstain_count integer not null default 0 check(abstain_count>=0),
  outcome text check(outcome in ('Passed','Rejected')),
  primary key(tenant_id,round_id), unique(tenant_id,motion_id,round_number),
  unique(tenant_id,meeting_id,session_id,opened_by,open_request),
  foreign key(tenant_id,motion_id) references convay_private.vote_motions(tenant_id,motion_id),
  foreign key(tenant_id,policy_id,policy_version) references convay_private.vote_policy_versions(tenant_id,policy_id,version),
  check(for_count+against_count+abstain_count<=electorate_count),
  check((state='Open' and outcome is null and closed_at is null) or (state='Closed' and outcome is not null and closed_at is not null))
);
create unique index vote_one_open_round_per_session on convay_private.vote_rounds(tenant_id,meeting_id,session_id) where state='Open';
create table convay_private.vote_electorate (
  tenant_id uuid not null, round_id uuid not null, voter_id uuid not null,
  primary key(tenant_id,round_id,voter_id), foreign key(tenant_id,round_id) references convay_private.vote_rounds(tenant_id,round_id)
);
-- Secret participation marker never contains choice or timestamp. Secret
-- choices increment aggregate counters under the locked round; no named
-- ballot row is written. This is app-level minimization, not cryptographic anonymity.
create table convay_private.vote_participation (
  tenant_id uuid not null, round_id uuid not null, voter_id uuid not null, request_id text not null,
  primary key(tenant_id,round_id,voter_id),
  foreign key(tenant_id,round_id,voter_id) references convay_private.vote_electorate(tenant_id,round_id,voter_id)
);
create table convay_private.vote_named_ballots (
  tenant_id uuid not null, round_id uuid not null, voter_id uuid not null,
  choice text not null check(choice in ('For','Against','Abstain')), cast_at timestamptz not null default clock_timestamp(),
  primary key(tenant_id,round_id,voter_id),
  foreign key(tenant_id,round_id,voter_id) references convay_private.vote_participation(tenant_id,round_id,voter_id)
);
do $$declare t text; begin foreach t in array array['vote_policy_versions','vote_recusal_scope','vote_motions','vote_rounds','vote_electorate','vote_participation','vote_named_ballots'] loop
  execute format('alter table convay_private.%I enable row level security',t);
  execute format('revoke all on convay_private.%I from public,anon,authenticated,service_role',t);
end loop; end$$;

-- All command paths take the same existing meeting lock as attendance before
-- accessing a round. No caller-supplied actor, quorum, tally or role is accepted.
create function convay_private.vote_scope(p_tenant uuid,p_meeting text,p_session text,p_leader boolean,p_quorum boolean) returns text
language plpgsql security definer set search_path='' as $$
declare s record; m public.convay_entity_records%rowtype; actor uuid:=auth.uid();
begin
  if p_tenant is null or p_session is null or actor is null then raise exception 'Explicit authenticated company/session scope required' using errcode='42501';end if;
  perform 1 from convay_private.tenant_memberships where tenant_id=p_tenant and user_id=actor and membership_state='active' and revoked_at is null for share;
  if not found then raise exception 'Active company membership required' using errcode='42501';end if;
  perform 1 from public.user_profiles where user_id=actor and account_status='active' for share;
  if not found then raise exception 'Active account required' using errcode='42501';end if;
  select * into strict s from convay_private.resolve_live_attendance_scope(p_tenant,p_meeting,p_session);
  select * into strict m from public.convay_entity_records where entity_key='bms.meetings' and tenant_id=p_tenant and record_id=s.meeting_record_id;
  if not convay_private.has_permission('mtg_view') or not convay_private.has_permission('mtg_join') then raise exception 'Meeting permission required' using errcode='42501';end if;
  if (select count(*) from public.convay_entity_records where entity_key='bms.meetingParticipantLinks' and tenant_id=p_tenant and payload->>'meeting_id'=s.canonical_meeting_id and payload->>'user_id'=actor::text)<>1 then raise exception 'Meeting participant required' using errcode='42501';end if;
  if p_leader and (not convay_private.has_permission('mtg_start') or not convay_private.is_meeting_leader(actor,m.payload,m.created_by)) then raise exception 'Assigned meeting leader required' using errcode='42501';end if;
  if p_quorum then
    if (select enabled from convay_private.live_attendance_release_gate where singleton=true) is distinct from true or
      not exists(select 1 from convay_private.live_quorum_snapshots where tenant_id=p_tenant and meeting_id=s.canonical_meeting_id and session_id=p_session and met=true) then raise exception 'Authoritative quorum required' using errcode='42501';end if;
    if not exists(select 1 from public.convay_entity_records where entity_key='bms.liveSessions' and tenant_id=p_tenant and record_id=p_session and lower(payload->>'session_status')='active') then raise exception 'Active proceedings required' using errcode='23514';end if;
  end if;
  return s.canonical_meeting_id;
end$$;
create function convay_private.vote_eligible(p_tenant uuid,p_meeting text,p_session text,p_agenda text,p_voter uuid) returns boolean
language sql stable security definer set search_path='' as $$
select exists(select 1 from public.user_profiles u join convay_private.tenant_memberships tm on tm.user_id=u.user_id
  where u.user_id=p_voter and u.account_status='active' and tm.tenant_id=p_tenant and tm.membership_state='active' and tm.revoked_at is null)
 and (select count(*) from public.convay_entity_records l where l.entity_key='bms.meetingParticipantLinks' and l.tenant_id=p_tenant and l.payload->>'meeting_id'=p_meeting and l.payload->>'user_id'=p_voter::text)=1
 and exists(select 1 from public.convay_entity_records l where l.entity_key='bms.meetingParticipantLinks' and l.tenant_id=p_tenant and l.payload->>'meeting_id'=p_meeting and l.payload->>'user_id'=p_voter::text and l.payload->>'voting_eligible'='true' and coalesce(l.payload->>'participant_type','') not in ('Observer','Guest'))
 and exists(select 1 from public.convay_entity_records a where a.entity_key='bms.attendance' and a.tenant_id=p_tenant and a.payload->>'meeting_id'=p_meeting and a.payload->>'live_session_id'=p_session and a.payload->>'participant_id'=p_voter::text and a.payload->>'attendance_status'='Present')
 and not exists(select 1 from convay_private.vote_recusal_scope where tenant_id=p_tenant and meeting_id=p_meeting and session_id=p_session and agenda_id=p_agenda and voter_id=p_voter)
$$;
create function convay_private.vote_request(p_request text) returns void language plpgsql set search_path='' as $$begin
 if p_request is null or p_request !~ '^[A-Za-z0-9_-]{16,128}$' then raise exception 'Invalid request identity' using errcode='22023';end if;
end$$;
create function convay_private.vote_create_motion(p_tenant uuid,p_meeting text,p_session text,p_agenda text,p_title text,p_wording text,p_seconder uuid,p_notes text,p_request text) returns uuid
language plpgsql security definer set search_path='' as $$
declare mid text; m convay_private.vote_motions%rowtype; actor uuid:=auth.uid();begin
  perform convay_private.vote_request(p_request);mid:=convay_private.vote_scope(p_tenant,p_meeting,p_session,false,true);
  if not exists(select 1 from public.convay_entity_records a where a.entity_key='bms.agenda' and a.tenant_id=p_tenant and (a.record_id=p_agenda or a.payload->>'agenda_id'=p_agenda)) or not exists(select 1 from public.convay_entity_records l where l.entity_key='bms.meetingAgendaLinks' and l.tenant_id=p_tenant and l.payload->>'meeting_id'=mid and l.payload->>'agenda_id'=p_agenda) then raise exception 'Agenda not linked to meeting' using errcode='42501';end if;
  if not convay_private.vote_eligible(p_tenant,mid,p_session,p_agenda,actor) or (p_seconder is not null and (p_seconder=actor or not convay_private.vote_eligible(p_tenant,mid,p_session,p_agenda,p_seconder))) then raise exception 'Eligible distinct motion identities required' using errcode='42501';end if;
  select * into m from convay_private.vote_motions where tenant_id=p_tenant and meeting_id=mid and session_id=p_session and proposer=actor and create_request=p_request;
  if found then
    if (m.agenda_id,m.title,m.wording,m.seconder,m.notes) is distinct from (p_agenda,p_title,p_wording,p_seconder,coalesce(p_notes,'')) then raise exception 'Request already used' using errcode='23505';end if;return m.motion_id;
  end if;
  insert into convay_private.vote_motions(tenant_id,meeting_id,session_id,agenda_id,title,wording,proposer,seconder,notes,create_request)
  values(p_tenant,mid,p_session,p_agenda,p_title,p_wording,actor,p_seconder,coalesce(p_notes,''),p_request) returning * into m;return m.motion_id;
end$$;
create function convay_private.vote_open(p_tenant uuid,p_meeting text,p_session text,p_motion uuid,p_policy text,p_version integer,p_request text,p_prior uuid default null,p_reason text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare mid text; m convay_private.vote_motions%rowtype; p convay_private.vote_policy_versions%rowtype; r convay_private.vote_rounds%rowtype; prior convay_private.vote_rounds%rowtype; electorate uuid[]; actor uuid:=auth.uid(); n integer:=1;begin
  perform convay_private.vote_request(p_request);mid:=convay_private.vote_scope(p_tenant,p_meeting,p_session,true,true);
  select * into m from convay_private.vote_motions where tenant_id=p_tenant and meeting_id=mid and session_id=p_session and motion_id=p_motion for update;
  if not found then raise exception 'Motion unavailable' using errcode='42501';end if;
  select * into p from convay_private.vote_policy_versions where tenant_id=p_tenant and policy_id=p_policy and version=p_version for share;
  if not found then raise exception 'Approved versioned policy required' using errcode='42501';end if;
  select * into r from convay_private.vote_rounds where tenant_id=p_tenant and meeting_id=mid and session_id=p_session and opened_by=actor and open_request=p_request;
  if found then if (r.motion_id,r.policy_id,r.policy_version,r.prior_round,r.reopen_reason) is distinct from (p_motion,p_policy,p_version,p_prior,p_reason) then raise exception 'Request already used' using errcode='23505';end if;return r.round_id;end if;
  if p.seconder_required and m.seconder is null then raise exception 'Seconding required by policy' using errcode='23514';end if;
  if p_prior is not null then
    select * into prior from convay_private.vote_rounds where tenant_id=p_tenant and motion_id=p_motion and round_id=p_prior and meeting_id=mid and session_id=p_session for update;
    if not found or prior.state<>'Closed' or not p.reopen_allowed or prior.policy_id<>p_policy or prior.policy_version<>p_version or nullif(btrim(p_reason),'') is null or exists(select 1 from convay_private.vote_rounds where tenant_id=p_tenant and motion_id=p_motion and round_number>prior.round_number) then raise exception 'Reopen not permitted by policy/history' using errcode='42501';end if;
    n:=prior.round_number+1;
  elsif p_reason is not null or exists(select 1 from convay_private.vote_rounds where tenant_id=p_tenant and motion_id=p_motion) then raise exception 'Motion already has vote history' using errcode='23514';end if;
  select array_agg(u.user_id order by u.user_id) into electorate from public.user_profiles u where convay_private.vote_eligible(p_tenant,mid,p_session,m.agenda_id,u.user_id);
  if coalesce(cardinality(electorate),0)<p.min_cast then raise exception 'Insufficient eligible electorate' using errcode='23514';end if;
  insert into convay_private.vote_rounds(tenant_id,motion_id,round_number,meeting_id,session_id,policy_id,policy_version,opened_by,open_request,prior_round,reopen_reason,electorate_count)
  values(p_tenant,p_motion,n,mid,p_session,p_policy,p_version,actor,p_request,p_prior,p_reason,cardinality(electorate)) returning * into r;
  insert into convay_private.vote_electorate(tenant_id,round_id,voter_id) select p_tenant,r.round_id,unnest(electorate);return r.round_id;
end$$;
create function convay_private.vote_cast(p_tenant uuid,p_meeting text,p_session text,p_round uuid,p_choice text,p_request text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare mid text; r convay_private.vote_rounds%rowtype; m convay_private.vote_motions%rowtype; p convay_private.vote_policy_versions%rowtype; old convay_private.vote_participation%rowtype; actor uuid:=auth.uid();begin
  perform convay_private.vote_request(p_request);mid:=convay_private.vote_scope(p_tenant,p_meeting,p_session,false,false);
  if p_choice is null or p_choice not in ('For','Against','Abstain') then raise exception 'Invalid ballot choice' using errcode='22023';end if;
  select * into r from convay_private.vote_rounds where tenant_id=p_tenant and meeting_id=mid and session_id=p_session and round_id=p_round for update;
  if not found then raise exception 'Round unavailable' using errcode='42501';end if;
  select * into m from convay_private.vote_motions where tenant_id=p_tenant and motion_id=r.motion_id;
  select * into p from convay_private.vote_policy_versions where tenant_id=p_tenant and policy_id=r.policy_id and version=r.policy_version;
  if not exists(select 1 from convay_private.vote_electorate where tenant_id=p_tenant and round_id=p_round and voter_id=actor) or not convay_private.vote_eligible(p_tenant,mid,p_session,m.agenda_id,actor) then raise exception 'Current voting eligibility required' using errcode='42501';end if;
  select * into old from convay_private.vote_participation where tenant_id=p_tenant and round_id=p_round and voter_id=actor;
  if found then
    if old.request_id<>p_request then raise exception 'Ballot already recorded' using errcode='23505';end if;
    -- Secret replay never confirms which choice was recorded, including a changed-choice retry.
    if p.method='Open' and not exists(select 1 from convay_private.vote_named_ballots where tenant_id=p_tenant and round_id=p_round and voter_id=actor and choice=p_choice) then raise exception 'Request already used' using errcode='23505';end if;
    return jsonb_build_object('roundId',p_round,'recorded',true,'replayed',true);
  end if;
  perform convay_private.vote_scope(p_tenant,p_meeting,p_session,false,true);
  if r.state<>'Open' then raise exception 'Round closed' using errcode='23514';end if;
  insert into convay_private.vote_participation values(p_tenant,p_round,actor,p_request);
  if p.method='Open' then insert into convay_private.vote_named_ballots(tenant_id,round_id,voter_id,choice) values(p_tenant,p_round,actor,p_choice);end if;
  update convay_private.vote_rounds set for_count=for_count+(p_choice='For')::int,against_count=against_count+(p_choice='Against')::int,abstain_count=abstain_count+(p_choice='Abstain')::int where tenant_id=p_tenant and round_id=p_round;
  return jsonb_build_object('roundId',p_round,'recorded',true,'replayed',false);
end$$;
create function convay_private.vote_close(p_tenant uuid,p_meeting text,p_session text,p_round uuid,p_request text) returns text
language plpgsql security definer set search_path='' as $$
declare mid text; r convay_private.vote_rounds%rowtype; p convay_private.vote_policy_versions%rowtype; total integer; base integer; passed boolean; actor uuid:=auth.uid();begin
  perform convay_private.vote_request(p_request);mid:=convay_private.vote_scope(p_tenant,p_meeting,p_session,true,false);
  select * into r from convay_private.vote_rounds where tenant_id=p_tenant and meeting_id=mid and session_id=p_session and round_id=p_round for update;
  if not found then raise exception 'Round unavailable' using errcode='42501';end if;
  if r.state='Closed' then if r.close_request=p_request and r.closed_by=actor then return r.outcome;end if;raise exception 'Round already closed' using errcode='23514';end if;
  perform convay_private.vote_scope(p_tenant,p_meeting,p_session,true,true);
  select * into p from convay_private.vote_policy_versions where tenant_id=p_tenant and policy_id=r.policy_id and version=r.policy_version;
  total:=r.for_count+r.against_count+r.abstain_count;
  if total<p.min_cast or total<>(select count(*) from convay_private.vote_participation where tenant_id=p_tenant and round_id=p_round) then raise exception 'Ballot count not ready or reconciled' using errcode='23514';end if;
  base:=case p.basis when 'decisive' then r.for_count+r.against_count when 'cast' then total else r.electorate_count end;
  if base=0 then raise exception 'No valid policy denominator' using errcode='23514';end if;
  passed:=case p.comparison when 'gte' then r.for_count::bigint*p.denominator>=base::bigint*p.numerator else r.for_count::bigint*p.denominator>base::bigint*p.numerator end;
  update convay_private.vote_rounds set state='Closed',closed_by=actor,close_request=p_request,closed_at=clock_timestamp(),outcome=case when passed then 'Passed' else 'Rejected' end where tenant_id=p_tenant and round_id=p_round returning * into r;return r.outcome;
end$$;
create function convay_private.vote_read(p_tenant uuid,p_meeting text,p_session text,p_round uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare mid text; r convay_private.vote_rounds%rowtype; p convay_private.vote_policy_versions%rowtype; result jsonb;begin
  mid:=convay_private.vote_scope(p_tenant,p_meeting,p_session,false,false);
  select * into r from convay_private.vote_rounds where tenant_id=p_tenant and meeting_id=mid and session_id=p_session and round_id=p_round;
  if not found then raise exception 'Round unavailable' using errcode='42501';end if;
  select * into p from convay_private.vote_policy_versions where tenant_id=p_tenant and policy_id=r.policy_id and version=r.policy_version;
  result:=jsonb_build_object('roundId',p_round,'motionId',r.motion_id,'round',r.round_number,'state',r.state,'method',p.method,'policyId',p.policy_id,'policyVersion',p.version,'priorRound',r.prior_round,'reopenReason',r.reopen_reason,'myRecorded',exists(select 1 from convay_private.vote_participation where tenant_id=p_tenant and round_id=p_round and voter_id=auth.uid()));
  if r.state='Closed' or (p.method='Open' and p.visible_live_tally) then result:=result||jsonb_build_object('for',r.for_count,'against',r.against_count,'abstain',r.abstain_count,'outcome',r.outcome);end if;
  if p.method='Open' and p.visible_named_ballots and (r.state='Closed' or p.visible_live_tally) then result:=result||jsonb_build_object('ballots',coalesce((select jsonb_agg(jsonb_build_object('voter',voter_id,'choice',choice) order by voter_id) from convay_private.vote_named_ballots where tenant_id=p_tenant and round_id=p_round),'[]'::jsonb));end if;
  return result;
end$$;
-- Do not expose private candidate via any browser, service-role or Data API.
do $$declare f record;begin for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='convay_private' and p.proname in ('vote_scope','vote_eligible','vote_request','vote_create_motion','vote_open','vote_cast','vote_close','vote_read') loop execute format('revoke all on function %s from public,anon,authenticated,service_role',f.sig);end loop;end$$;
-- Immutable policy versions and closed rounds. Administrative issuance is a
-- separate protected contract, not an inferred policy approval.
create function convay_private.vote_immutable_version() returns trigger language plpgsql set search_path='' as $$begin
 raise exception 'Voting policy versions are immutable' using errcode='42501';
end$$;
create trigger vote_policy_immutable before update or delete on convay_private.vote_policy_versions for each row execute function convay_private.vote_immutable_version();
revoke all on function convay_private.vote_immutable_version() from public,anon,authenticated,service_role;
