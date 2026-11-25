-- Auth table is a deliberately synthetic session fixture, not native restore.
create table auth.sessions(id uuid primary key,user_id uuid not null,not_after timestamptz);
insert into auth.sessions values
 ('51111111-1111-4111-8111-111111111111','11111111-1111-4111-8111-111111111111',null),
 ('52222222-2222-4222-8222-222222222222','22222222-2222-4222-8222-222222222222',null),
 ('53333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111',clock_timestamp()-interval '1 second');
\ir release_guard.sql
\ir projections.sql
\ir gateway.sql
begin;
do $$begin if (select enabled from convay_private.transactional_voting_gate where singleton) then raise exception 'Gate not default-off';end if;end$$;
update convay_private.transactional_voting_gate set enabled=true where singleton;
set local role service_role;
do $gateway$
declare a uuid:='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';b uuid:='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
 h uuid:='11111111-1111-4111-8111-111111111111';v uuid:='22222222-2222-4222-8222-222222222222';
 hs uuid:='51111111-1111-4111-8111-111111111111';vs uuid:='52222222-2222-4222-8222-222222222222';expired uuid:='53333333-3333-4333-8333-333333333333';
 m uuid;r uuid;x jsonb;cmd jsonb;n int:=0;
begin
 cmd:='{"action":"motion","agendaId":"AG-1","title":"Gateway fixture","wording":"Fixture wording","requestId":"gateway_motion_000001"}';
 begin perform public.convay_vote_command_scoped(h,vs,a,'MTG-SHARED','SES-A',cmd);raise exception 'Mismatched auth session accepted';exception when insufficient_privilege then n:=n+1;end;
 begin perform public.convay_vote_command_scoped(h,expired,a,'MTG-SHARED','SES-A',cmd);raise exception 'Expired auth session accepted';exception when insufficient_privilege then n:=n+1;end;
 begin perform public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A',cmd||jsonb_build_object('actorId',v));raise exception 'Injected actor accepted';exception when invalid_parameter_value then n:=n+1;end;
 begin perform public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-B',cmd);raise exception 'Wrong persisted session accepted';exception when serialization_failure then n:=n+1;end;
 begin perform public.convay_vote_command_scoped(h,hs,b,'MTG-SHARED','SES-B',cmd);raise exception 'Wrong company accepted';exception when insufficient_privilege then n:=n+1;end;
 x:=public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A',cmd);m:=(x->>'motionId')::uuid;if x->>'sessionId'<>'SES-A' then raise exception 'Missing scope';end if;n:=n+1;
 x:=public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A',jsonb_build_object('action','open','motionId',m,'policyId','fixture-race','policyVersion',1,'requestId','gateway_open_000001'));r:=(x->>'roundId')::uuid;n:=n+1;
 x:=public.convay_vote_command_scoped(v,vs,a,'MTG-SHARED','SES-A',jsonb_build_object('action','cast','roundId',r,'choice','For','requestId','gateway_ballot_000001'));if not (x->>'recorded')::boolean or x?'choice' then raise exception 'Secret ballot leaked';end if;n:=n+1;
 x:=public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A',jsonb_build_object('action','read','roundId',r));if x ?| array['for','against','abstain','ballots','outcome'] then raise exception 'Sealed vote leaked';end if;n:=n+1;
 x:=public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A',jsonb_build_object('action','close','roundId',r,'requestId','gateway_close_000001'));if x->>'outcome'<>'Passed' then raise exception 'Bad result';end if;n:=n+1;
 x:=public.convay_vote_command_scoped(h,hs,a,'MTG-SHARED','SES-A',jsonb_build_object('action','read','roundId',r));if x->>'for'<>'1' or x?'ballots' then raise exception 'Bad secret result';end if;n:=n+1;
 raise notice '% service-role voting gateway checks PASS',n;
end $gateway$;
rollback;
-- Verify browser roles have no executable RPC, even with forged actor/session.
do $$begin
 if has_function_privilege('anon','public.convay_vote_command_scoped(uuid,uuid,uuid,text,text,jsonb)','execute') or has_function_privilege('authenticated','public.convay_vote_command_scoped(uuid,uuid,uuid,text,text,jsonb)','execute') or not has_function_privilege('service_role','public.convay_vote_command_scoped(uuid,uuid,uuid,text,text,jsonb)','execute') then raise exception 'Voting RPC grant boundary broken';end if;
 raise notice 'Voting RPC execute boundary PASS';
end$$;
