-- Authenticated session and archive projections for the staged gateway.
-- No secret participation, per-voter choice, or private request ID is exported.
create function convay_private.vote_workspace(p_tenant uuid,p_meeting text,p_session text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare mid text; m public.convay_entity_records%rowtype; actor uuid:=auth.uid(); motions jsonb; rounds jsonb; policies jsonb; quorum boolean; leader boolean; begin
 mid:=convay_private.vote_scope(p_tenant,p_meeting,p_session,false,false);
 select * into strict m from public.convay_entity_records where tenant_id=p_tenant and entity_key='bms.meetings' and coalesce(nullif(payload->>'meeting_id',''),record_id)=mid;
 leader:=convay_private.has_permission('mtg_start') and convay_private.is_meeting_leader(actor,m.payload,m.created_by);
 quorum:=exists(select 1 from convay_private.live_quorum_snapshots where tenant_id=p_tenant and meeting_id=mid and session_id=p_session and met=true)
  and exists(select 1 from convay_private.live_attendance_release_gate where singleton=true and enabled=true)
  and exists(select 1 from convay_private.transactional_voting_gate where singleton=true and enabled=true)
  and exists(select 1 from public.convay_entity_records where tenant_id=p_tenant and entity_key='bms.liveSessions' and record_id=p_session and lower(payload->>'session_status')='active');
 -- Limit is explicit: never silently omit a round that might be open.
 if (select count(*) from convay_private.vote_rounds where tenant_id=p_tenant and meeting_id=mid and session_id=p_session)>500 or (select count(*) from convay_private.vote_motions where tenant_id=p_tenant and meeting_id=mid and session_id=p_session)>500 then raise exception 'Voting workspace requires history pagination' using errcode='54000';end if;
 select coalesce(jsonb_agg(jsonb_build_object('motionId',x.motion_id,'agendaId',x.agenda_id,'title',x.title,'wording',x.wording,'proposerId',x.proposer,'seconderId',x.seconder,'notes',x.notes,'createdAt',x.created_at) order by x.created_at,x.motion_id),'[]'::jsonb) into motions from convay_private.vote_motions x where x.tenant_id=p_tenant and x.meeting_id=mid and x.session_id=p_session;
 select coalesce(jsonb_agg(convay_private.vote_read(p_tenant,mid,p_session,r.round_id)||jsonb_build_object('canCast',quorum and r.state='Open' and exists(select 1 from convay_private.vote_electorate e where e.tenant_id=p_tenant and e.round_id=r.round_id and e.voter_id=actor) and convay_private.vote_eligible(p_tenant,mid,p_session,x.agenda_id,actor),'reopenAllowed',p.reopen_allowed) order by r.opened_at,r.round_id),'[]'::jsonb) into rounds
 from convay_private.vote_rounds r join convay_private.vote_motions x on x.tenant_id=r.tenant_id and x.motion_id=r.motion_id join convay_private.vote_policy_versions p on p.tenant_id=r.tenant_id and p.policy_id=r.policy_id and p.version=r.policy_version where r.tenant_id=p_tenant and r.meeting_id=mid and r.session_id=p_session;
 select coalesce(jsonb_agg(jsonb_build_object('policyId',p.policy_id,'version',p.version,'method',p.method,'numerator',p.numerator,'denominator',p.denominator,'basis',p.basis,'comparison',p.comparison,'seconderRequired',p.seconder_required,'reopenAllowed',p.reopen_allowed) order by p.policy_id,p.version),'[]'::jsonb) into policies from convay_private.vote_policy_versions p where p.tenant_id=p_tenant;
 return jsonb_build_object('motions',motions,'rounds',rounds,'policies',policies,'canManage',leader,'quorumMet',quorum);
end$$;
revoke all on function convay_private.vote_workspace(uuid,text,text) from public,anon,authenticated,service_role;

-- Read-only archive projection is independent of the current active session.
-- A meeting participant with current account/company/meeting-view permission
-- may see closed aggregates and versioned rules, never secret participation.
create function convay_private.vote_archive(p_tenant uuid,p_meeting text,p_session text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare m public.convay_entity_records%rowtype; sess public.convay_entity_records%rowtype; actor uuid:=auth.uid(); mid text; result jsonb; begin
 if actor is null or p_tenant is null or p_session is null or convay_private.tenant_member_active(p_tenant) is distinct from true or convay_private.has_permission('mtg_view') is distinct from true then raise exception 'Archive access denied' using errcode='42501';end if;
 perform 1 from convay_private.tenants where id=p_tenant and lifecycle_state='active' for share;
 if not found then raise exception 'Archive access denied' using errcode='42501';end if;
 perform 1 from convay_private.tenant_memberships where tenant_id=p_tenant and user_id=actor and membership_state='active' and revoked_at is null for share;
 if not found then raise exception 'Archive access denied' using errcode='42501';end if;
 perform 1 from public.user_profiles where user_id=actor and account_status='active' for share;
 if not found then raise exception 'Archive access denied' using errcode='42501';end if;
 begin
 select * into strict m from public.convay_entity_records x where x.tenant_id=p_tenant and x.entity_key='bms.meetings' and (x.record_id=p_meeting or x.payload->>'meeting_id'=p_meeting or x.payload->>'id'=p_meeting) for share;
 mid:=coalesce(nullif(m.payload->>'meeting_id',''),m.record_id);
 select * into strict sess from public.convay_entity_records x where x.tenant_id=p_tenant and x.entity_key='bms.liveSessions' and x.record_id=p_session and x.payload->>'id'=p_session and x.payload->>'meeting_id'=mid and lower(x.payload->>'session_status')='ended' for share;
 exception when no_data_found or too_many_rows then raise exception 'Archive scope unavailable' using errcode='42501';end;
 if (select count(*) from public.convay_entity_records x where x.tenant_id=p_tenant and x.entity_key='bms.meetingParticipantLinks' and x.payload->>'meeting_id'=mid and x.payload->>'user_id'=actor::text)<>1 then raise exception 'Archive access denied' using errcode='42501';end if;
 if exists(select 1 from convay_private.vote_rounds where tenant_id=p_tenant and meeting_id=mid and session_id=p_session and state<>'Closed') then raise exception 'Unresolved voting round' using errcode='23514';end if;
 select coalesce(jsonb_agg(jsonb_build_object('roundId',r.round_id,'motionId',r.motion_id,'agendaId',x.agenda_id,'title',x.title,'wording',x.wording,'round',r.round_number,'state',r.state,'method',p.method,'policyId',p.policy_id,'policyVersion',p.version,'numerator',p.numerator,'denominator',p.denominator,'basis',p.basis,'comparison',p.comparison,'priorRound',r.prior_round,'reopenReason',r.reopen_reason,'for',r.for_count,'against',r.against_count,'abstain',r.abstain_count,'outcome',r.outcome,'closedAt',r.closed_at) || case when p.method='Open' and p.visible_named_ballots then jsonb_build_object('ballots',coalesce((select jsonb_agg(jsonb_build_object('voter',b.voter_id,'choice',b.choice) order by b.voter_id) from convay_private.vote_named_ballots b where b.tenant_id=p_tenant and b.round_id=r.round_id),'[]'::jsonb)) else '{}'::jsonb end order by r.opened_at,r.round_id),'[]'::jsonb) into result
 from convay_private.vote_rounds r join convay_private.vote_motions x on x.tenant_id=r.tenant_id and x.motion_id=r.motion_id join convay_private.vote_policy_versions p on p.tenant_id=r.tenant_id and p.policy_id=r.policy_id and p.version=r.policy_version where r.tenant_id=p_tenant and r.meeting_id=mid and r.session_id=p_session and r.state='Closed';
 return jsonb_build_object('rounds',result);
end$$;
revoke all on function convay_private.vote_archive(uuid,text,text) from public,anon,authenticated,service_role;
