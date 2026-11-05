-- Run against the Convay database after the MT-18 migration.
-- All fixture rows and audit entries are rolled back before the script ends.
begin;

do $test$
declare
  v_admin uuid;
  v_actor uuid := gen_random_uuid();
  v_allowed_id text := 'MT18-ALLOWED-' || gen_random_uuid()::text;
  v_payload jsonb;
  v_function_security_definer boolean;
  v_expected_error boolean;
begin
  if not has_function_privilege('authenticated', 'public.convay_request_meeting_revision(text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.convay_request_meeting_revision(text,text)', 'EXECUTE') then
    raise exception 'Revision RPC execute grants are not least-privilege';
  end if;

  if not has_function_privilege('authenticated', 'convay_private.request_meeting_revision(text,text)', 'EXECUTE')
     or has_function_privilege('anon', 'convay_private.request_meeting_revision(text,text)', 'EXECUTE') then
    raise exception 'Private revision operation execute grants are not least-privilege';
  end if;

  select p.prosecdef into v_function_security_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'convay_request_meeting_revision'
    and pg_get_function_identity_arguments(p.oid) = 'p_record_id text, p_revision_instructions text';
  if v_function_security_definer is distinct from false then
    raise exception 'Public revision RPC must remain SECURITY INVOKER';
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
    'bms.meetings', v_allowed_id,
    jsonb_build_object('id', v_allowed_id, 'approval_status', 'Pending Approval'),
    v_admin, v_admin
  );

  v_expected_error := false;
  begin
    perform public.convay_request_meeting_revision(v_allowed_id, 'Too short');
  exception when sqlstate '22023' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'Short revision instructions were accepted';
  end if;

  v_payload := public.convay_request_meeting_revision(
    v_allowed_id,
    'Please correct the submitted meeting agenda.'
  );
  if v_payload->>'approval_status' <> 'Revision Requested'
     or v_payload->>'revision_instructions' <> 'Please correct the submitted meeting agenda.'
     or v_payload->>'revision_requested_by' <> v_admin::text
     or nullif(v_payload->>'revision_requested_at', '') is null then
    raise exception 'Authorized revision response did not contain the required persisted fields';
  end if;

  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings' and record_id = v_allowed_id;
  if v_payload->>'approval_status' <> 'Revision Requested'
     or v_payload->>'revision_instructions' <> 'Please correct the submitted meeting agenda.' then
    raise exception 'Revision payload did not persist';
  end if;

  if not exists (
    select 1 from convay_private.entity_changes
    where entity_key = 'bms.meetings'
      and record_id = v_allowed_id
      and operation = 'UPDATE'
      and actor_id = v_admin
      and previous_payload->>'approval_status' = 'Pending Approval'
      and new_payload->>'revision_instructions' = 'Please correct the submitted meeting agenda.'
  ) then
    raise exception 'Revision transition did not write the expected audit event';
  end if;

  v_expected_error := false;
  begin
    perform public.convay_request_meeting_revision(v_allowed_id, 'A second request should be rejected.');
  exception when sqlstate '40001' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A duplicate or stale revision request was accepted';
  end if;

  perform set_config('request.jwt.claim.sub', v_actor::text, true);
  v_expected_error := false;
  begin
    perform public.convay_request_meeting_revision(v_allowed_id, 'Unauthorized revision request test.');
  exception when sqlstate '42501' then
    v_expected_error := true;
  end;
  if not v_expected_error then
    raise exception 'A principal without mtg_approve was allowed to request revision';
  end if;

  select payload into v_payload
  from public.convay_entity_records
  where entity_key = 'bms.meetings' and record_id = v_allowed_id;
  if v_payload->>'approval_status' <> 'Revision Requested'
     or v_payload->>'revision_instructions' <> 'Please correct the submitted meeting agenda.' then
    raise exception 'Unauthorized revision request changed the meeting';
  end if;
end
$test$;

rollback;
select 'PASS: authorized persistence, validation, audit, stale-request rejection, and permission denial' as mt18_request_revision_result;
