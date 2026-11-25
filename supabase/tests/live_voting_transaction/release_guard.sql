-- Staged, default-off voting activation. Not a hosted migration.
create table convay_private.transactional_voting_gate(singleton boolean primary key default true check(singleton),enabled boolean not null default false);
alter table convay_private.transactional_voting_gate enable row level security;
revoke all on convay_private.transactional_voting_gate from public,anon,authenticated,service_role;
insert into convay_private.transactional_voting_gate values(true,false);
-- Keep generic company motion/ballot registry writes out of the new authority.
-- Legacy null-company records retain the existing contract. This guard remains
-- even when the gate is off so suspension cannot re-enable a legacy bypass.
create function convay_private.guard_transactional_voting_registry() returns trigger
language plpgsql security definer set search_path='' as $$
declare e text; tenant uuid; mid text; sid text; state text;begin
 if tg_op='DELETE' then e:=old.entity_key;tenant:=old.tenant_id;else e:=new.entity_key;tenant:=new.tenant_id;end if;
 if tenant is not null and e in ('bms.motions','bms.votes') then raise exception 'Company voting requires transactional command' using errcode='42501';end if;
 if tg_op='UPDATE' and (old.tenant_id is not null and old.entity_key in ('bms.motions','bms.votes')) then raise exception 'Company voting requires transactional command' using errcode='42501';end if;
 if tg_op in ('UPDATE','DELETE') and old.entity_key='bms.liveSessions' and old.tenant_id is not null then
   mid:=old.payload->>'meeting_id';sid:=old.record_id;
   if tg_op='DELETE' then state:='ended';else state:=lower(coalesce(new.payload->>'session_status',''));end if;
   if (state not in ('active','paused') or (tg_op='UPDATE' and (new.tenant_id is distinct from old.tenant_id or new.record_id is distinct from old.record_id or new.payload->>'meeting_id' is distinct from mid))) and exists(select 1 from convay_private.vote_rounds where tenant_id=old.tenant_id and meeting_id=mid and session_id=sid and vote_rounds.state='Open') then raise exception 'Close the active voting round before ending its session' using errcode='23514';end if;
 end if;
 if tg_op='DELETE' then return old;end if;return new;
end$$;
revoke all on function convay_private.guard_transactional_voting_registry() from public,anon,authenticated,service_role;
create trigger convay_a1_guard_transactional_voting before insert or update or delete on public.convay_entity_records for each row execute function convay_private.guard_transactional_voting_registry();
-- Verify logging configuration before any vote payload is forwarded to SQL.
-- Does not guarantee privileged WAL, host telemetry, or future config changes.
create function public.convay_vote_logging_preflight() returns boolean
language sql stable security definer set search_path='' as $$select
 current_setting('log_statement',true) in ('none','ddl')
 and current_setting('log_min_duration_statement',true)='-1'
 and coalesce(current_setting('log_min_duration_sample',true),'-1')='-1'
 and coalesce(current_setting('log_transaction_sample_rate',true),'0')='0'
 and current_setting('log_parameter_max_length_on_error',true)='0'
 and coalesce(current_setting('pgaudit.log_parameter',true),'off')='off'
$$;
revoke all on function public.convay_vote_logging_preflight() from public,anon,authenticated,service_role;
grant execute on function public.convay_vote_logging_preflight() to service_role;
