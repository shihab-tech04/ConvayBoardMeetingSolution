-- Disposable concurrent transaction fixture only.
begin;
do $race$
declare a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 h uuid:='11111111-1111-4111-8111-111111111111'; v uuid:='22222222-2222-4222-8222-222222222222';
 o uuid:='33333333-3333-4333-8333-333333333333'; f uuid:='44444444-4444-4444-8444-444444444444';
 m uuid; r uuid;
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
 insert into convay_private.vote_policy_versions values(a,'fixture-race',1,'Secret Ballot',1,1,'cast','gte',1,false,false,true,false,false,'SYNTHETIC-RACE-ONLY');
 m:=convay_private.vote_create_motion(a,'MTG-SHARED','SES-A','AG-1','Race fixture','Fixture wording',null,'','race_motion_000001');
 r:=convay_private.vote_open(a,'MTG-SHARED','SES-A',m,'fixture-race',1,'race_open_000001');
end $race$;
commit;
