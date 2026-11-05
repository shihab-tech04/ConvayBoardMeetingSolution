-- Rollback-only coverage for the authenticated meeting lifecycle RPCs.
begin;
do $test$
declare
  v_admin uuid;
  v_denied uuid := '11111111-1111-4111-8111-111111111111'::uuid;
  v_id text := 'MTG-MT20-' || substr(md5(clock_timestamp()::text || random()::text),1,12);
  v_draft_id text := 'MTG-MT20-DRAFT-' || substr(md5(clock_timestamp()::text || random()::text),1,12);
  v_pending_id text := 'MTG-MT20-PENDING-' || substr(md5(clock_timestamp()::text || random()::text),1,12);
  v_approved_id text := 'MTG-MT20-APPROVED-' || substr(md5(clock_timestamp()::text || random()::text),1,12);
  v_alias_id text := 'MTG-MT20-ALIAS-' || substr(md5(clock_timestamp()::text || random()::text),1,12);
  v_payload jsonb;
  v_count integer;
  v_denied_call boolean := false;
  v_no_auth_call boolean := false;
  v_sequence_blocked boolean := false;
begin
  select p.user_id into v_admin
  from public.user_profiles p
  where p.account_role='super_admin' and p.account_status='active'
  order by p.created_at
  limit 1;
  if v_admin is null then raise exception 'No active Super Admin test actor is available'; end if;

  if has_function_privilege('anon','public.convay_schedule_meeting(text)','EXECUTE')
     or has_function_privilege('anon','public.convay_publish_meeting(text)','EXECUTE') then
    raise exception 'Anonymous role can execute a meeting lifecycle RPC';
  end if;
  if not has_function_privilege('authenticated','public.convay_schedule_meeting(text)','EXECUTE')
     or not has_function_privilege('authenticated','public.convay_publish_meeting(text)','EXECUTE') then
    raise exception 'Authenticated role cannot execute a meeting lifecycle RPC';
  end if;
  if (select p.prosecdef from pg_proc p where p.oid='convay_private.schedule_meeting_request(text)'::regprocedure) is not true
     or (select p.prosecdef from pg_proc p where p.oid='convay_private.publish_meeting_request(text)'::regprocedure) is not true
     or (select p.prosecdef from pg_proc p where p.oid='public.convay_schedule_meeting(text)'::regprocedure) is not false
     or (select p.prosecdef from pg_proc p where p.oid='public.convay_publish_meeting(text)'::regprocedure) is not false then
    raise exception 'Lifecycle RPC security mode is incorrect';
  end if;
  if not (select p.proconfig @> array['search_path=""'] from pg_proc p where p.oid='convay_private.schedule_meeting_request(text)'::regprocedure)
     or not (select p.proconfig @> array['search_path=""'] from pg_proc p where p.oid='convay_private.publish_meeting_request(text)'::regprocedure)
     or not (select p.proconfig @> array['search_path=""'] from pg_proc p where p.oid='public.convay_schedule_meeting(text)'::regprocedure)
     or not (select p.proconfig @> array['search_path=""'] from pg_proc p where p.oid='public.convay_publish_meeting(text)'::regprocedure) then
    raise exception 'Lifecycle RPC search_path is not pinned';
  end if;

  perform set_config('request.jwt.claim.sub',v_admin::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_admin::text,'role','authenticated')::text,true);
  insert into public.convay_entity_records(entity_key,record_id,payload)
  values('bms.meetings',v_id,jsonb_build_object('id',v_id,'meeting_id',v_id,'approval_status','Approved'));

  v_payload := public.convay_schedule_meeting(v_id);
  if v_payload->>'approval_status' <> 'Scheduled'
     or v_payload->>'scheduled_by' <> v_admin::text
     or nullif(v_payload->>'scheduled_at','') is null then
    raise exception 'Schedule RPC did not return a persisted actor, time and status';
  end if;
  begin
    perform public.convay_schedule_meeting(v_id);
    raise exception 'Duplicate scheduling unexpectedly succeeded' using errcode='P0001';
  exception when sqlstate '40001' then null;
  end;

  v_payload := public.convay_publish_meeting(v_id);
  if v_payload->>'approval_status' <> 'Published'
     or v_payload->>'published_by' <> v_admin::text
     or nullif(v_payload->>'published_at','') is null then
    raise exception 'Publish RPC did not return a persisted actor, time and status';
  end if;
  begin
    perform public.convay_publish_meeting(v_id);
    raise exception 'Duplicate publication unexpectedly succeeded' using errcode='P0001';
  exception when sqlstate '40001' then null;
  end;

  select count(*) into v_count
  from convay_private.entity_changes c
  where c.entity_key='bms.meetings' and c.record_id=v_id and c.operation='UPDATE'
    and c.actor_id=v_admin
    and ((c.new_payload->>'approval_status'='Scheduled' and c.new_payload->>'scheduled_by'=v_admin::text)
      or (c.new_payload->>'approval_status'='Published' and c.new_payload->>'published_by'=v_admin::text));
  if v_count <> 2 then raise exception 'Expected two actor-attributed schedule/publish audit events, got %',v_count; end if;

  -- Preserve the existing validated wizard path that advances a completed draft to Scheduled.
  insert into public.convay_entity_records(entity_key,record_id,payload)
  values('bms.meetings',v_draft_id,jsonb_build_object('id',v_draft_id,'meeting_id',v_draft_id,'approval_status','Draft'));
  update public.convay_entity_records
  set payload=jsonb_set(payload,'{approval_status}',to_jsonb('Scheduled'::text),true)
  where entity_key='bms.meetings' and record_id=v_draft_id;
  select payload into v_payload from public.convay_entity_records
  where entity_key='bms.meetings' and record_id=v_draft_id;
  if v_payload->>'approval_status' <> 'Scheduled'
     or v_payload->>'scheduled_by' <> v_admin::text
     or nullif(v_payload->>'scheduled_at','') is null then
    raise exception 'The validated draft scheduling path did not preserve server-stamped evidence';
  end if;

  -- A pending request cannot skip approval, and an approved meeting cannot skip scheduling.
  insert into public.convay_entity_records(entity_key,record_id,payload)
  values('bms.meetings',v_pending_id,jsonb_build_object('id',v_pending_id,'meeting_id',v_pending_id,'approval_status','Pending Approval'));
  begin
    update public.convay_entity_records
    set payload=jsonb_set(payload,'{approval_status}',to_jsonb('Scheduled'::text),true)
    where entity_key='bms.meetings' and record_id=v_pending_id;
    raise exception 'Pending to Scheduled transition unexpectedly succeeded' using errcode='P0001';
  exception when sqlstate '23514' then v_sequence_blocked := true;
  end;
  if not v_sequence_blocked then raise exception 'Pending to Scheduled transition was not blocked'; end if;

  insert into public.convay_entity_records(entity_key,record_id,payload)
  values('bms.meetings',v_approved_id,jsonb_build_object('id',v_approved_id,'meeting_id',v_approved_id,'approval_status','Approved'));
  v_sequence_blocked := false;
  begin
    update public.convay_entity_records
    set payload=jsonb_set(payload,'{approval_status}',to_jsonb('Published'::text),true)
    where entity_key='bms.meetings' and record_id=v_approved_id;
    raise exception 'Approved to Published transition unexpectedly succeeded' using errcode='P0001';
  exception when sqlstate '23514' then v_sequence_blocked := true;
  end;
  if not v_sequence_blocked then raise exception 'Approved to Published transition was not blocked'; end if;

  -- Changing a legacy status alias by itself cannot bypass canonical lifecycle state.
  insert into public.convay_entity_records(entity_key,record_id,payload)
  values('bms.meetings',v_alias_id,jsonb_build_object('id',v_alias_id,'meeting_id',v_alias_id,'approval_status','Scheduled'));
  v_sequence_blocked := false;
  begin
    update public.convay_entity_records
    set payload=jsonb_set(payload,'{status}',to_jsonb('Published'::text),true)
    where entity_key='bms.meetings' and record_id=v_alias_id;
    raise exception 'Status alias bypass unexpectedly succeeded' using errcode='P0001';
  exception when sqlstate '23514' then v_sequence_blocked := true;
  end;
  if not v_sequence_blocked then raise exception 'Status alias bypass was not blocked'; end if;

  perform set_config('request.jwt.claim.sub',v_denied::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_denied::text,'role','authenticated')::text,true);
  begin
    perform public.convay_schedule_meeting(v_approved_id);
    raise exception 'Unauthorized schedule unexpectedly succeeded' using errcode='P0001';
  exception when sqlstate '42501' then v_denied_call := true;
  end;
  if not v_denied_call then raise exception 'Unauthorized schedule was not denied'; end if;

  perform set_config('request.jwt.claim.sub','',true);
  perform set_config('request.jwt.claims','{}',true);
  begin
    perform public.convay_publish_meeting(v_alias_id);
    raise exception 'Unauthenticated publish unexpectedly succeeded' using errcode='P0001';
  exception when sqlstate '42501' then v_no_auth_call := true;
  end;
  if not v_no_auth_call then raise exception 'Unauthenticated publish was not denied'; end if;
end;
$test$;
rollback;
