-- Staged service-only voting RPC. Rehearsal source, NOT a migration.
-- The verified Edge actor and verified JWT session id must be derived from
-- trusted Auth verification. SQL rechecks that Auth session and current scope.
create function public.convay_vote_command_scoped(p_actor_id uuid,p_auth_session_id uuid,p_tenant_id uuid,p_meeting_id text,p_session_id text,p_command jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare action text; allowed text[]; required text[]; result jsonb; rid uuid;begin
 if p_actor_id is null or p_auth_session_id is null then raise exception 'Verified authentication required' using errcode='42501';end if;
 perform 1 from auth.sessions where id=p_auth_session_id and user_id=p_actor_id and (not_after is null or not_after>clock_timestamp()) for share;
 if not found then raise exception 'Authenticated session unavailable' using errcode='42501';end if;
 if jsonb_typeof(p_command) is distinct from 'object' then raise exception 'Invalid command' using errcode='22023';end if;
 action:=p_command->>'action';
 if action not in ('workspace','archive','read') then
  perform 1 from convay_private.transactional_voting_gate where singleton=true and enabled=true for share;
  if not found then raise exception 'Transactional voting not activated' using errcode='42501';end if;
 end if;
 case action
 when 'motion' then allowed:=array['action','agendaId','title','wording','seconderId','notes','requestId'];required:=array['action','agendaId','title','wording','requestId'];
 when 'open' then allowed:=array['action','motionId','policyId','policyVersion','requestId'];required:=allowed;
 when 'cast' then allowed:=array['action','roundId','choice','requestId'];required:=allowed;
 when 'close' then allowed:=array['action','roundId','requestId'];required:=allowed;
 when 'reopen' then allowed:=array['action','motionId','policyId','policyVersion','requestId','priorRoundId','reason'];required:=allowed;
 when 'read' then allowed:=array['action','roundId'];required:=allowed;
 when 'workspace' then allowed:=array['action'];required:=allowed;
 when 'archive' then allowed:=array['action'];required:=allowed;
 else raise exception 'Unsupported command' using errcode='22023';end case;
 if not (p_command ?& required) or exists(select 1 from jsonb_object_keys(p_command) k where not(k=any(allowed))) or exists(select 1 from unnest(required) k where p_command->k='null'::jsonb) then raise exception 'Unexpected or missing command fields' using errcode='22023';end if;
 if exists(select 1 from jsonb_each(p_command) x where (x.key='policyVersion' and jsonb_typeof(x.value)<>'number') or (x.key<>'policyVersion' and jsonb_typeof(x.value)<>'string' and not (x.key='seconderId' and jsonb_typeof(x.value)='null'))) then raise exception 'Invalid command field types' using errcode='22023';end if;
 perform pg_catalog.set_config('request.jwt.claim.sub',p_actor_id::text,true);
 case action
 when 'motion' then rid:=convay_private.vote_create_motion(p_tenant_id,p_meeting_id,p_session_id,p_command->>'agendaId',p_command->>'title',p_command->>'wording',(p_command->>'seconderId')::uuid,p_command->>'notes',p_command->>'requestId');result:=jsonb_build_object('motionId',rid);
 when 'open' then rid:=convay_private.vote_open(p_tenant_id,p_meeting_id,p_session_id,(p_command->>'motionId')::uuid,p_command->>'policyId',(p_command->>'policyVersion')::integer,p_command->>'requestId');result:=jsonb_build_object('roundId',rid);
 when 'reopen' then rid:=convay_private.vote_open(p_tenant_id,p_meeting_id,p_session_id,(p_command->>'motionId')::uuid,p_command->>'policyId',(p_command->>'policyVersion')::integer,p_command->>'requestId',(p_command->>'priorRoundId')::uuid,p_command->>'reason');result:=jsonb_build_object('roundId',rid);
 when 'cast' then result:=convay_private.vote_cast(p_tenant_id,p_meeting_id,p_session_id,(p_command->>'roundId')::uuid,p_command->>'choice',p_command->>'requestId');
 when 'close' then result:=jsonb_build_object('roundId',(p_command->>'roundId')::uuid,'outcome',convay_private.vote_close(p_tenant_id,p_meeting_id,p_session_id,(p_command->>'roundId')::uuid,p_command->>'requestId'));
 when 'read' then result:=convay_private.vote_read(p_tenant_id,p_meeting_id,p_session_id,(p_command->>'roundId')::uuid);
 when 'workspace' then result:=convay_private.vote_workspace(p_tenant_id,p_meeting_id,p_session_id);
 when 'archive' then result:=convay_private.vote_archive(p_tenant_id,p_meeting_id,p_session_id);
 end case;
 return result||jsonb_build_object('tenantId',p_tenant_id,'meetingId',p_meeting_id,'sessionId',p_session_id);
end$$;
revoke all on function public.convay_vote_command_scoped(uuid,uuid,uuid,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function public.convay_vote_command_scoped(uuid,uuid,uuid,text,text,jsonb) to service_role;
