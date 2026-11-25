-- Synthetic policy cases only, not approval of actual Convay AD-07 rules.
create or replace function convay_private.has_permission(permission_code text) returns boolean language sql stable as $$select exists(select 1 from public.user_profiles where user_id=auth.uid() and account_status='active') and permission_code in ('mtg_view','mtg_join','mtg_attendance','mtg_start')$$;
begin;
do $matrix$
declare a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 h uuid:='11111111-1111-4111-8111-111111111111'; v uuid:='22222222-2222-4222-8222-222222222222';
 o uuid:='33333333-3333-4333-8333-333333333333'; f uuid:='44444444-4444-4444-8444-444444444444';
 m uuid; r uuid; r2 uuid; m2 uuid; r3 uuid; x jsonb; n int:=0;
begin
 insert into public.user_profiles values(h,'Fixture host','active','user'),(v,'Fixture voter','active','user'),(o,'Fixture observer','active','user'),(f,'Fixture foreign','active','user');
 insert into convay_private.tenants values(a,'active'),(b,'active');
 insert into convay_private.tenant_memberships values(a,h,'active',null),(a,v,'active',null),(a,o,'active',null),(b,f,'active',null);
 insert into public.convay_entity_records(entity_key,record_id,tenant_id,payload,created_by) values
 ('bms.meetings','record-A',a,'{"id":"record-A","meeting_id":"MTG-SHARED","mode":"Virtual","approval_status":"In Progress"}',h),
 ('bms.meetings','record-B',b,'{"id":"record-B","meeting_id":"MTG-SHARED","mode":"Virtual","approval_status":"In Progress"}',f);
 insert into public.convay_entity_records(entity_key,record_id,tenant_id,payload) values
 ('bms.liveSessions','SES-A',a,'{"id":"SES-A","meeting_id":"MTG-SHARED","session_status":"active"}'),
 ('bms.liveSessions','SES-B',b,'{"id":"SES-B","meeting_id":"MTG-SHARED","session_status":"active"}'),
 ('bms.meetingParticipantLinks','link-H',a,jsonb_build_object('meeting_id','MTG-SHARED','user_id',h::text,'participant_type','Chairperson','quorum_eligible',true,'voting_eligible',true)),
 ('bms.meetingParticipantLinks','link-V',a,jsonb_build_object('meeting_id','MTG-SHARED','user_id',v::text,'participant_type','Member','quorum_eligible',true,'voting_eligible',true)),
 ('bms.meetingParticipantLinks','link-O',a,jsonb_build_object('meeting_id','MTG-SHARED','user_id',o::text,'participant_type','Observer','quorum_eligible',false,'voting_eligible',false)),
 ('bms.meetingParticipantLinks','link-F',b,jsonb_build_object('meeting_id','MTG-SHARED','user_id',f::text,'participant_type','Member','quorum_eligible',true,'voting_eligible',true)),
 ('bms.quorumrules','rule-A',a,'{"meeting_id":"MTG-SHARED","status":"Active","minimum_members_count":"1"}'),
 ('bms.quorumrules','rule-B',b,'{"meeting_id":"MTG-SHARED","status":"Active","minimum_members_count":"1"}'),
 ('bms.agenda','agenda-A',a,'{"id":"agenda-A","agenda_id":"AG-1","approval_status":"Approved"}'),
 ('bms.agenda','agenda-B',b,'{"id":"agenda-B","agenda_id":"AG-2","approval_status":"Approved"}'),
 ('bms.meetingAgendaLinks','agenda-link-A',a,'{"meeting_id":"MTG-SHARED","agenda_id":"AG-1"}'),
 ('bms.meetingAgendaLinks','agenda-link-B',b,'{"meeting_id":"MTG-SHARED","agenda_id":"AG-2"}');
 update convay_private.live_attendance_release_gate set enabled=true where singleton=true;
 perform public.convay_commit_live_attendance_scoped(h,'MTG-SHARED',h::text,'Present',0,'fixture_present_host_001',true,'Online',a,'SES-A');
 perform public.convay_commit_live_attendance_scoped(v,'MTG-SHARED',v::text,'Present',0,'fixture_present_voter_01',true,'Online',a,'SES-A');
 perform public.convay_commit_live_attendance_scoped(f,'MTG-SHARED',f::text,'Present',0,'fixture_present_foreign_1',true,'Online',b,'SES-B');
 perform set_config('request.jwt.claim.sub',h::text,true);
 m:=convay_private.vote_create_motion(a,'MTG-SHARED','SES-A','AG-1','Fixture title','Fixture wording',v,'Fixture notes','motion_request_000001');
 if m is distinct from convay_private.vote_create_motion(a,'MTG-SHARED','SES-A','AG-1','Fixture title','Fixture wording',v,'Fixture notes','motion_request_000001') then raise exception 'Motion replay changed ID';end if;n:=n+1;
 begin perform convay_private.vote_create_motion(a,'MTG-SHARED','SES-A','AG-2','Wrong agenda','Fixture wording',v,'','motion_request_000002');raise exception 'Foreign agenda accepted';exception when insufficient_privilege then n:=n+1;end;
 begin perform convay_private.vote_create_motion(a,'MTG-SHARED','SES-A','AG-1','Changed title','Fixture wording',v,'Fixture notes','motion_request_000001');raise exception 'Conflicting motion replay accepted';exception when unique_violation then n:=n+1;end;
 begin perform convay_private.vote_open(a,'MTG-SHARED','SES-A',m,'missing',1,'round_request_000001');raise exception 'Unapproved policy accepted';exception when insufficient_privilege then n:=n+1;end;
 insert into convay_private.vote_policy_versions values(a,'fixture-secret',1,'Secret Ballot',1,1,'cast','gte',1,true,true,true,false,false,'SYNTHETIC-TEST-ONLY'),(a,'fixture-open',1,'Open',1,2,'decisive','gt',1,false,false,true,true,true,'SYNTHETIC-TEST-ONLY');
 begin update convay_private.vote_policy_versions set numerator=2 where tenant_id=a and policy_id='fixture-secret';raise exception 'Policy mutation accepted';exception when insufficient_privilege then n:=n+1;end;
 perform set_config('request.jwt.claim.sub',v::text,true);
 begin perform convay_private.vote_open(a,'MTG-SHARED','SES-A',m,'fixture-secret',1,'round_request_000001');raise exception 'Nonleader opened round';exception when insufficient_privilege then n:=n+1;end;
 perform set_config('request.jwt.claim.sub',h::text,true);
 r:=convay_private.vote_open(a,'MTG-SHARED','SES-A',m,'fixture-secret',1,'round_request_000001');
 if r is distinct from convay_private.vote_open(a,'MTG-SHARED','SES-A',m,'fixture-secret',1,'round_request_000001') then raise exception 'Round replay changed ID';end if;n:=n+1;
 x:=convay_private.vote_cast(a,'MTG-SHARED','SES-A',r,'For','ballot_request_000001');
 if not (x->>'recorded')::boolean or x?'choice' then raise exception 'Secret receipt incorrect';end if;n:=n+1;
 x:=convay_private.vote_cast(a,'MTG-SHARED','SES-A',r,'Against','ballot_request_000001');
 if not (x->>'replayed')::boolean or (select for_count from convay_private.vote_rounds where round_id=r)<>1 or (select against_count from convay_private.vote_rounds where round_id=r)<>0 then raise exception 'Secret replay altered choice';end if;n:=n+1;
 begin perform convay_private.vote_cast(a,'MTG-SHARED','SES-A',r,'For','ballot_request_000099');raise exception 'Duplicate ballot accepted';exception when unique_violation then n:=n+1;end;
 x:=convay_private.vote_read(a,'MTG-SHARED','SES-A',r);if x ?| array['for','against','abstain','ballots','outcome','voters'] then raise exception 'Open secret tally exposed';end if;n:=n+1;
 perform set_config('request.jwt.claim.sub',o::text,true);
 begin perform convay_private.vote_cast(a,'MTG-SHARED','SES-A',r,'For','ballot_request_000003');raise exception 'Observer voted';exception when insufficient_privilege then n:=n+1;end;
 perform set_config('request.jwt.claim.sub',f::text,true);
 begin perform convay_private.vote_read(a,'MTG-SHARED','SES-A',r);raise exception 'Foreign read accepted';exception when insufficient_privilege then n:=n+1;end;
 begin perform convay_private.vote_read(b,'MTG-SHARED','SES-B',r);raise exception 'Foreign round read accepted';exception when insufficient_privilege then n:=n+1;end;
 perform set_config('request.jwt.claim.sub',v::text,true);
 insert into convay_private.vote_recusal_scope values(a,'MTG-SHARED','SES-A','AG-1',v);
 begin perform convay_private.vote_cast(a,'MTG-SHARED','SES-A',r,'For','ballot_request_000002');raise exception 'Recused voter accepted';exception when insufficient_privilege then n:=n+1;end;
 delete from convay_private.vote_recusal_scope where tenant_id=a and voter_id=v;
 update convay_private.live_quorum_snapshots set met=false where tenant_id=a and meeting_id='MTG-SHARED';
 begin perform convay_private.vote_cast(a,'MTG-SHARED','SES-A',r,'For','ballot_request_000002');raise exception 'Quorum-loss vote accepted';exception when insufficient_privilege then n:=n+1;end;
 update convay_private.live_quorum_snapshots set met=true where tenant_id=a and meeting_id='MTG-SHARED';
 perform convay_private.vote_cast(a,'MTG-SHARED','SES-A',r,'For','ballot_request_000002');n:=n+1;
 begin perform convay_private.vote_close(a,'MTG-SHARED','SES-A',r,'close_request_000001');raise exception 'Nonleader closed';exception when insufficient_privilege then n:=n+1;end;
 perform set_config('request.jwt.claim.sub',h::text,true);
 insert into convay_private.vote_recusal_scope values(a,'MTG-SHARED','SES-A','AG-1',v);
 begin perform convay_private.vote_close(a,'MTG-SHARED','SES-A',r,'close_request_000001');raise exception 'Close accepted ineligible recorded voter';exception when insufficient_privilege then n:=n+1;end;
 delete from convay_private.vote_recusal_scope where tenant_id=a and voter_id=v;
 if convay_private.vote_close(a,'MTG-SHARED','SES-A',r,'close_request_000001')<>'Passed' then raise exception 'Unanimity exact threshold failed';end if;n:=n+1;
 if convay_private.vote_close(a,'MTG-SHARED','SES-A',r,'close_request_000001')<>'Passed' then raise exception 'Close retry failed';end if;n:=n+1;
 x:=convay_private.vote_read(a,'MTG-SHARED','SES-A',r);if x->>'for'<>'2' or x?'ballots' or x?'voters' or exists(select 1 from convay_private.vote_named_ballots where round_id=r) then raise exception 'Secret result leaked or inconsistent';end if;n:=n+1;
 begin perform convay_private.vote_open(a,'MTG-SHARED','SES-A',m,'fixture-secret',1,'reopen_request_000001',r,'');raise exception 'Reasonless reopen';exception when insufficient_privilege then n:=n+1;end;
 r2:=convay_private.vote_open(a,'MTG-SHARED','SES-A',m,'fixture-secret',1,'reopen_request_000001',r,'Fixture reconsideration');
 if r2=r or (select round_number from convay_private.vote_rounds where round_id=r2)<>2 or (select for_count from convay_private.vote_rounds where round_id=r2)<>0 or (select outcome from convay_private.vote_rounds where round_id=r)<>'Passed' then raise exception 'Reopen rewrote history';end if;n:=n+1;
 perform convay_private.vote_cast(a,'MTG-SHARED','SES-A',r2,'Abstain','ballot_request_000004');
 if convay_private.vote_close(a,'MTG-SHARED','SES-A',r2,'close_request_000002')<>'Rejected' then raise exception 'Abstain counted as For';end if;n:=n+1;
 m2:=convay_private.vote_create_motion(a,'MTG-SHARED','SES-A','AG-1','Open fixture','Fixture wording',null,'','motion_request_000003');
 r3:=convay_private.vote_open(a,'MTG-SHARED','SES-A',m2,'fixture-open',1,'round_request_000003');
 perform convay_private.vote_cast(a,'MTG-SHARED','SES-A',r3,'For','ballot_request_000005');
 perform set_config('request.jwt.claim.sub',v::text,true);
 perform convay_private.vote_cast(a,'MTG-SHARED','SES-A',r3,'Against','ballot_request_000006');
 x:=convay_private.vote_read(a,'MTG-SHARED','SES-A',r3);if x->>'for'<>'1' or x->>'against'<>'1' or jsonb_array_length(x->'ballots')<>2 then raise exception 'Named tally incorrect';end if;n:=n+1;
 perform set_config('request.jwt.claim.sub',h::text,true);
 if convay_private.vote_close(a,'MTG-SHARED','SES-A',r3,'close_request_000003')<>'Rejected' then raise exception 'Strict majority tie passed';end if;n:=n+1;
 begin perform convay_private.vote_open(a,'MTG-SHARED','SES-A',m2,'fixture-open',1,'reopen_request_000002',r3,'Fixture reason');raise exception 'Prohibited reopen accepted';exception when insufficient_privilege then n:=n+1;end;
 update convay_private.tenant_memberships set membership_state='revoked',revoked_at=now() where tenant_id=a and user_id=v;
 perform set_config('request.jwt.claim.sub',v::text,true);
 begin perform convay_private.vote_read(a,'MTG-SHARED','SES-A',r3);raise exception 'Revoked voter read accepted';exception when insufficient_privilege then n:=n+1;end;
 if has_table_privilege('authenticated','convay_private.vote_named_ballots','select') or has_table_privilege('service_role','convay_private.vote_rounds','select') or has_function_privilege('authenticated','convay_private.vote_cast(uuid,text,text,uuid,text,text)','execute') then raise exception 'Private voting surface exposed';end if;n:=n+1;
 raise notice '% isolated transactional voting checks PASS',n;
end $matrix$;
rollback;
