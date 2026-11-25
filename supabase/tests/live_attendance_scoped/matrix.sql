begin;
do $matrix$
declare
 a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'; b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 ua uuid:='11111111-1111-4111-8111-111111111111'; ub uuid:='22222222-2222-4222-8222-222222222222';
 ul uuid:='33333333-3333-4333-8333-333333333333';
 ra jsonb; rb jsonb; prev_revision bigint; prev_b_revision bigint;
begin
 insert into public.user_profiles values(ua,'A','active','user'),(ub,'B','active','user'),(ul,'Legacy','active','user');
 insert into convay_private.tenants values(a,'active'),(b,'active');
 insert into convay_private.tenant_memberships values(a,ua,'active',null),(b,ub,'active',null);
 insert into public.convay_entity_records(entity_key,record_id,tenant_id,payload,created_by) values
 ('bms.meetings','record-A',a,'{"id":"record-A","meeting_id":"MTG-SHARED","mode":"Virtual","approval_status":"In Progress"}',ua),
 ('bms.meetings','record-B',b,'{"id":"record-B","meeting_id":"MTG-SHARED","mode":"Virtual","approval_status":"In Progress"}',ub),
 ('bms.meetings','MTG-LEGACY',null,'{"id":"MTG-LEGACY","meeting_id":"MTG-LEGACY","mode":"Virtual","approval_status":"In Progress"}',ul);
 insert into public.convay_entity_records(entity_key,record_id,tenant_id,payload) values
 ('bms.liveSessions','SES-A',a,'{"id":"SES-A","meeting_id":"MTG-SHARED","session_status":"active"}'),
 ('bms.liveSessions','SES-B',b,'{"id":"SES-B","meeting_id":"MTG-SHARED","session_status":"active"}'),
 ('bms.liveSessions','SES-L',null,'{"id":"SES-L","meeting_id":"MTG-LEGACY","session_status":"active"}'),
 ('bms.meetingParticipantLinks','link-A',a,jsonb_build_object('meeting_id','MTG-SHARED','user_id',ua::text,'participant_type','Member','quorum_eligible',true)),
 ('bms.meetingParticipantLinks','link-B',b,jsonb_build_object('meeting_id','MTG-SHARED','user_id',ub::text,'participant_type','Member','quorum_eligible',true)),
 ('bms.meetingParticipantLinks','link-L',null,jsonb_build_object('meeting_id','MTG-LEGACY','user_id',ul::text,'participant_type','Member','quorum_eligible',true)),
 ('bms.quorumrules','rule-A',a,'{"meeting_id":"MTG-SHARED","status":"Active","minimum_members_count":"1"}'),
 ('bms.quorumrules','rule-B',b,'{"meeting_id":"MTG-SHARED","status":"Active","minimum_members_count":"1"}'),
 ('bms.quorumrules','rule-L',null,'{"meeting_id":"MTG-LEGACY","status":"Active","minimum_members_count":"1"}');
 update convay_private.live_attendance_release_gate set enabled=false where singleton=true;
 ra:=public.convay_read_live_attendance_scoped(ua,'MTG-SHARED',ua::text,a,'SES-A');
 if (ra->'releaseEnabled') is distinct from 'false'::jsonb then raise exception 'Disabled release proof incorrect';end if;
 update convay_private.live_attendance_release_gate set enabled=true where singleton=true;
 ra:=public.convay_read_live_attendance_scoped(ua,'MTG-SHARED',ua::text,a,'SES-A');
 if (ra->'releaseEnabled') is distinct from 'true'::jsonb then raise exception 'Enabled release proof incorrect';end if;
 ra:=public.convay_commit_live_attendance_scoped(ua,'MTG-SHARED',ua::text,'Present',0,'same_request_00000001',true,'Online',a,'SES-A');
 rb:=public.convay_commit_live_attendance_scoped(ub,'MTG-SHARED',ub::text,'Present',0,'same_request_00000001',true,'Online',b,'SES-B');
 if ra#>>'{quorum,met}'<>'true' or rb#>>'{quorum,met}'<>'true' then raise exception 'Tenant quorum calculation failed';end if;
 if (select count(*) from convay_private.live_quorum_snapshots where meeting_id='MTG-SHARED')<>2 then raise exception 'Tenant snapshot collision';end if;
 if (select count(*) from convay_private.live_attendance_commands where request_id='same_request_00000001')<>2 then raise exception 'Tenant request collision';end if;
 ra:=public.convay_read_live_attendance_scoped(ua,'MTG-SHARED',ua::text,a,'SES-A');
 if not (ra->'attendanceMap' ? ua::text) or ra->'attendanceMap' ? ub::text then raise exception 'Foreign attendance leaked';end if;
 prev_revision:=(ra->>'attendanceRevision')::bigint;
 prev_b_revision:=(rb#>>'{quorum,revision}')::bigint;
 begin
   perform public.convay_read_live_attendance_scoped(ua,'MTG-SHARED',ub::text,b,'SES-B');
   raise exception 'Foreign tenant read accepted';
 exception when insufficient_privilege then null;end;
 begin
   perform public.convay_commit_live_attendance_scoped(ua,'MTG-SHARED',ua::text,'Present',prev_revision,'wrong_session_000001',true,'Online',a,'SES-B');
   raise exception 'Wrong session accepted';
 exception when serialization_failure then null;end;
 begin
   perform public.convay_commit_live_attendance_scoped(ua,'MTG-SHARED',ua::text,'Present',prev_revision,'false_provider_000001',false,'Online',a,'SES-A');
   raise exception 'Unconfirmed provider accepted';
 exception when insufficient_privilege then null;end;
 begin
   perform public.convay_read_live_attendance(ua,'MTG-SHARED',ua::text);
   raise exception 'Legacy RPC crossed tenant boundary';
 exception when insufficient_privilege then null;end;
 ra:=public.convay_commit_live_attendance(ul,'MTG-LEGACY',ul::text,'Present',0,'legacy_request_000001',true,'Online');
 if ra#>>'{quorum,met}'<>'true' then raise exception 'Legacy flow regressed';end if;
 update public.convay_entity_records set payload=payload||'{"session_status":"ended"}'::jsonb where entity_key='bms.liveSessions' and record_id='SES-A';
 insert into public.convay_entity_records(entity_key,record_id,tenant_id,payload) values
 ('bms.liveSessions','SES-A-R2',a,'{"id":"SES-A-R2","meeting_id":"MTG-SHARED","session_status":"active","reopen_started_at":"2026-11-24T00:00:00Z"}');
 ra:=public.convay_read_live_attendance_scoped(ua,'MTG-SHARED',ua::text,a,'SES-A-R2');
 if ra->>'status'<>'Not Joined' or ra#>>'{quorum,met}'<>'false' or ra->'attendanceMap'<>'{}'::jsonb then raise exception 'Reopened session inherited old attendance or quorum';end if;
 ra:=public.convay_commit_live_attendance_scoped(ua,'MTG-SHARED',ua::text,'Present',prev_revision,'reopen_request_000001',true,'Online',a,'SES-A-R2');
 if ra#>>'{quorum,met}'<>'true' then raise exception 'Reopened session quorum failed';end if;
 if (select count(*) from convay_private.live_attendance_session_history where tenant_id=a and prior_session_id='SES-A')<>1 then raise exception 'Previous session evidence lost';end if;
 if (select revision from convay_private.live_quorum_snapshots where tenant_id=b and meeting_id='MTG-SHARED')<>prev_b_revision then raise exception 'Foreign tenant quorum invalidated';end if;
 update convay_private.tenant_memberships set membership_state='revoked',revoked_at=now() where tenant_id=a and user_id=ua;
 begin
   perform public.convay_read_live_attendance_scoped(ua,'MTG-SHARED',ua::text,a,'SES-A-R2');
   raise exception 'Revoked company access accepted';
 exception when insufficient_privilege then null;end;
 if has_function_privilege('anon','public.convay_commit_live_attendance_scoped(uuid,text,text,text,bigint,text,boolean,text,uuid,text)','execute')
    or has_function_privilege('authenticated','public.convay_read_live_attendance_scoped(uuid,text,text,uuid,text)','execute') then raise exception 'Browser direct privileged SQL access';end if;
 raise notice 'Tenant, current session, legacy, cross-tenant, revoked, replay namespace and reopened attendance matrix PASS';
end $matrix$;
rollback;
