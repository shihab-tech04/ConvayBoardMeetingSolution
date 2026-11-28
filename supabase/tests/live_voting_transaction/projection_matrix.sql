-- Uses synthetic identities/races from the previously verified fixture.
begin;
do $$
declare a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';h uuid:='11111111-1111-4111-8111-111111111111';v uuid:='22222222-2222-4222-8222-222222222222';hs uuid:='51111111-1111-4111-8111-111111111111';vs uuid:='52222222-2222-4222-8222-222222222222';x jsonb; rr jsonb;n int:=0;
begin
 begin perform public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A','{"action":"motion","agendaId":"AG-1","title":"Disabled","wording":"Disabled","requestId":"disabled_motion_00001"}');raise exception 'Default disabled gateway write accepted';exception when insufficient_privilege then n:=n+1;end;
 begin insert into public.convay_entity_records(entity_key,record_id,tenant_id,payload) values('bms.votes','forged',a,'{"meeting_id":"MTG-SHARED"}');raise exception 'Generic company ballot accepted';exception when insufficient_privilege then n:=n+1;end;
 if has_function_privilege('authenticated','public.convay_vote_logging_preflight()','execute') or has_table_privilege('service_role','convay_private.transactional_voting_gate','UPDATE') then raise exception 'Activation/log gate privilege leak';end if;n:=n+1;
 x:=public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A','{"action":"workspace"}');
 if x->>'tenantId'<>a::text or x->>'sessionId'<>'SES-A' or jsonb_array_length(x->'motions')<1 or jsonb_array_length(x->'rounds')<1 or jsonb_array_length(x->'policies')<1 then raise exception 'Incomplete workspace';end if;n:=n+1;
 if exists(select 1 from jsonb_array_elements(x->'rounds') r where r->>'method'='Secret Ballot' and (r?'ballots' or (r->>'state'='Open' and r ?| array['for','against','abstain','outcome']))) then raise exception 'Secret workspace leak';end if;n:=n+1;
 begin perform public.convay_vote_command_scoped(h,hs,b,'MTG-SHARED','SES-B','{"action":"workspace"}');raise exception 'Foreign workspace accepted';exception when insufficient_privilege then n:=n+1;end;
 begin perform public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A','{"action":"archive"}');raise exception 'Active session archive accepted';exception when insufficient_privilege then n:=n+1;end;
 update convay_private.transactional_voting_gate set enabled=true where singleton;
 -- Suspended attendance blocks positive quorum and cast affordances even if a
 -- synthetic stale snapshot claims quorum. No production data is modified.
 update convay_private.live_attendance_company_gate set enabled=false where singleton=true;
 update convay_private.live_quorum_snapshots set met=true where tenant_id=a and meeting_id='MTG-SHARED' and session_id='SES-A';
 x:=public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A','{"action":"workspace"}');
 if x->>'quorumMet' is distinct from 'false' or exists(select 1 from jsonb_array_elements(x->'rounds') r where r->>'canCast'='true') then raise exception 'Suspended attendance projected eligible voting';end if;n:=n+1;
 update convay_private.live_attendance_company_gate set enabled=true where singleton=true;
 x:=public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A','{"action":"motion","agendaId":"AG-1","title":"Closure guard","wording":"Fixture","requestId":"closure_motion_00001"}');
 rr:=public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A',jsonb_build_object('action','open','motionId',x->>'motionId','policyId','fixture-race','policyVersion',1,'requestId','closure_open_000001'));
 begin update public.convay_entity_records set payload=payload||'{"session_status":"ended"}'::jsonb where tenant_id=a and entity_key='bms.liveSessions' and record_id='SES-A';raise exception 'Closure bypass accepted';exception when check_violation then n:=n+1;end;
 perform public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A',jsonb_build_object('action','cast','roundId',rr->>'roundId','choice','For','requestId','closure_cast_000001'));
 perform public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A',jsonb_build_object('action','close','roundId',rr->>'roundId','requestId','closure_close_00001'));
 update public.convay_entity_records set payload=payload||'{"session_status":"ended"}'::jsonb where tenant_id=a and entity_key='bms.liveSessions' and record_id='SES-A';
 x:=public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A','{"action":"archive"}');
 if jsonb_array_length(x->'rounds')<1 then raise exception 'Closed archive missing';end if;n:=n+1;
 if exists(select 1 from jsonb_array_elements(x->'rounds') r where r ?| array['myRecorded','requestId','canCast','voterId'] or (r->>'method'='Secret Ballot' and r?'ballots')) then raise exception 'Archive private data leaked';end if;n:=n+1;
 rr:=public.convay_vote_command_scoped(v,vs,a,'MTG-SHARED','SES-A','{"action":"archive"}');if rr is distinct from x then raise exception 'Archive leaked actor-specific participation';end if;n:=n+1;
 begin perform public.convay_vote_command_scoped(h,hs,b,'MTG-SHARED','SES-B','{"action":"archive"}');raise exception 'Foreign archive accepted';exception when insufficient_privilege then n:=n+1;end;
 update convay_private.tenant_memberships set membership_state='revoked',revoked_at=now() where tenant_id=a and user_id=v;
 begin perform public.convay_vote_command_scoped(v,vs,a,'MTG-SHARED','SES-A','{"action":"archive"}');raise exception 'Revoked archive accepted';exception when insufficient_privilege then n:=n+1;end;
 if has_function_privilege('authenticated','convay_private.vote_archive(uuid,text,text)','execute') or has_function_privilege('service_role','convay_private.vote_workspace(uuid,text,text)','execute') then raise exception 'Private projection bypass';end if;n:=n+1;
 raise notice '% workspace/archive confidentiality checks PASS',n;
end$$;
rollback;
