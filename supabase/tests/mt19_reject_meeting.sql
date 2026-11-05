-- Run against the Convay database after the MT-19 migration.
-- Fixture meeting records and their audit entries are rolled back at the end.
begin;

do $test$
declare
  v_admin uuid;
  v_actor uuid := gen_random_uuid();
  v_meeting_id text := 'MT19-REJECT-' || gen_random_uuid()::text;
  v_payload jsonb;
  v_public_security_definer boolean;
  v_private_security_definer boolean;
  v_public_search_path text[];
  v_private_search_path text[];
  v_expected_error boolean;
begin
  if not has_function_privilege('authenticated', 'public.convay_reject_meeting(text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.convay_reject_meeting(text,text)', 'EXECUTE') then
    raise exception 'Public reject RPC execute grants are not least-privilege';
  end if;

  if not has_function_privilege('authenticated', 'convay_private.reject_meeting_request(text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'convay_private.reject_meeting_request(text,text)', 'EXECUTE') then
    raise exception 'Private reject operation execute grants are not least-privilege';
  end if;

  select p.prosecdef, p.proconfig
    into v_public_security_definer, v_public_search_path
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'convay_reject_meeting'
    and pg_get_function_identity_arguments(p.oid) = 'p_record_id text, p_rejection_reason text';
  if v_public_security_definer is distinct from false
     or coalesce(v_public_search_path[1], '') <> 'search_path=""' then
    raise exception 'Public reject RPC must be SECURITY INVOKER with an empty search_path';
  end if;

  select p.prosecdef, p.proconfig
    into v_private_security_definer, v_private_search_path
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'convay_private'
    and p.proname = 'reject_meeting_request'
    and pg_get_function_identity_arguments(p.oid) = 'p_record_id text, p_rejection_reason text';
  if v_private_security_definer is distinct from true
     or coalesce(v_private_search_path[1], '') <> 'search_path=""' then
    raise exception 'Private reject operation must use SECURITY DEFINER with an empty search_path';
  end if;

  select user_id into v_admin
  from public.user_profiles
  where account_role = 'super_admin' and account_status = 'active'
  limit 1;
  if v_admin is null then
    raise exception 'No active Super Admin test principal is available';
  end if;

  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  insert into public.convay_entity_records(entity_key, record_id, payload, created_by, updated_by)
  values (
    'bms.meetings', v_meeting_id,
    jsonb_build_object('id', v_meeting_id, 'approval_status', 'Pending Approval'),
    v_admin, v_admin
  );

  v_expected_error := false;
  begin
    perform public.convay_reject_meeting(v_meeting_id, 'No');
  exception when sqlstate '22023' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'Short rejection reason was accepted';
  end if;

  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings' and record_id = v_meeting_id;
  if v_payload->>'approval_status' <> 'Pending Approval' then
    raise exception 'Invalid reason changed the meeting status';
  end if;

  v_payload := public.convay_reject_meeting(
    v_meeting_id,
    'The request does not include the required agenda documents.'
  );
  if v_payload->>'approval_status' <> 'Rejected'
     or v_payload->>'rejection_reason' <> 'The request does not include the required agenda documents.'
     or v_payload->>'rejected_by' <> v_admin::text
     or nullif(v_payload->>'rejected_at', '') is null then
    raise exception 'Authorized rejection response did not contain persisted status, reason, actor and time';
  end if;

  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings' and record_id = v_meeting_id;
  if v_payload->>'approval_status' <> 'Rejected'
     or v_payload->>'rejection_reason' <> 'The request does not include the required agenda documents.' then
    raise exception 'Rejection payload did not persist';
  end if;

  if not exists (
    select 1 from convay_private.entity_changes
    where entity_key = 'bms.meetings'
      and record_id = v_meeting_id
      and operation = 'UPDATE'
      and actor_id = v_admin
      and previous_payload->>'approval_status' = 'Pending Approval'
      and new_payload->>'approval_status' = 'Rejected'
      and new_payload->>'rejection_reason' = 'The request does not include the required agenda documents.'
  ) then
    raise exception 'Rejection did not write the expected audit event';
  end if;

  v_expected_error := false;
  begin
    perform public.convay_reject_meeting(v_meeting_id, 'A duplicate rejection must fail.');
  exception when sqlstate '40001' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A duplicate or stale rejection was accepted';
  end if;

  perform set_config('request.jwt.claim.sub', v_actor::text, true);
  v_expected_error := false;
  begin
    perform public.convay_reject_meeting(v_meeting_id, 'Unauthorized rejection attempt.');
  exception when sqlstate '42501' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A principal without mtg_approve was allowed to reject a meeting';
  end if;

  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings' and record_id = v_meeting_id;
  if v_payload->>'approval_status' <> 'Rejected'
     or v_payload->>'rejection_reason' <> 'The request does not include the required agenda documents.' then
    raise exception 'Unauthorized rejection changed the meeting';
  end if;
end
$test$;

rollback;
select 'PASS: authorized rejection persistence, validation, audit, stale-request rejection, and permission denial' as mt19_reject_meeting_result;
