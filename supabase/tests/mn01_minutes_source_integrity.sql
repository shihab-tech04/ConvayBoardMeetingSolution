-- MN-01 rollback-only test. Execute ONLY on an isolated restored test database.
-- This test deliberately creates synthetic registry rows; never run on production.
begin;
-- Test runner only: discover the active Root fixture while still using the
-- trusted isolated restore role. public.user_profiles SELECT RLS requires
-- auth.uid(), so switching to authenticated first hides every profile.
-- Never execute this role/claim impersonation harness on production.
select set_config(
  'request.jwt.claim.sub',
  coalesce((
    select user_id::text from public.user_profiles
    where account_status='active' and account_role='super_admin'
    order by user_id limit 1
  ), ''),
  true
);
-- Preserve an explicitly denied isolated fixture identity before actor-only
-- profile RLS is enabled. Never use actual production identities in this test.
select set_config('mn01.test_denied_user', coalesce((
    select user_id::text from public.user_profiles
    where account_status='active' and account_role <> 'super_admin'
    order by user_id limit 1
  ), ''), true);
set local role authenticated;

do $test$
declare
  v_actor uuid;
  v_denied uuid;
  v_candidate uuid;
  v_mid text := 'MN01-MTG-' || replace(gen_random_uuid()::text,'-','');
  v_mins text := 'MN01-MIN-' || replace(gen_random_uuid()::text,'-','');
  v_other_mid text := 'MN01-OTHER-' || replace(gen_random_uuid()::text,'-','');
  v_wrong_scope_mid text := 'MN01-TENANT-' || replace(gen_random_uuid()::text,'-','');
  v_payload jsonb;
  v_denied_write boolean;
  v_invalid_id text;
  v_status text;
begin
  select user_id into v_actor from public.user_profiles
    where account_status='active' and account_role='super_admin' limit 1;
  if v_actor is null then raise exception 'MN-01 test requires active Root'; end if;
  perform set_config('request.jwt.claim.sub', v_actor::text, true);
  if not convay_private.has_permission('min_create')
     or not convay_private.has_permission('min_approve')
     or not convay_private.has_permission('mtg_create') then
    raise exception 'MN-01 test requires Root minutes/meeting grants';
  end if;

  -- A completed, Root-owned meeting permits one correctly linked Draft.
  perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
    'entity_key','bms.meetings','action','create','payload',jsonb_build_object(
      'id',v_mid,'meeting_id',v_mid,'meeting_title','Synthetic board meeting',
      'meeting_date','2026-11-19','approval_status','Completed',
      'organizer_user_id',v_actor::text,'secretary_user_id',v_actor::text
    )
  )));
  v_payload := jsonb_build_object(
    'id',v_mins,'minutes_id',v_mins,'meeting_id',v_mid,
    'meeting_title','Synthetic board meeting','meeting_date','2026-11-19',
    'minute_taker','Synthetic minute taker','discussion_summary','Recorded first version','notes','Original confidential notes','approval_status','Draft','version','1.0'
  );
  if public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
    'entity_key','bms.minutes','action','create','payload',v_payload
  ))) <> 1 then raise exception 'MN-01 authorized create was not committed'; end if;
  if not exists (select 1 from public.convay_entity_records
     where entity_key='bms.minutes' and record_id=v_mins
       and payload->>'meeting_id'=v_mid and created_by=v_actor) then
    raise exception 'MN-01 canonical minutes readback failed';
  end if;

  -- A minute-backed meeting cannot replace its source title after creation.
  v_denied_write := false;
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
      'entity_key','bms.meetings','record_id',v_mid,'action','update',
      'payload',jsonb_build_object('meeting_title','Changed after minutes')
    )));
  exception when sqlstate '42501' then v_denied_write := true;
  end;
  if not v_denied_write then raise exception 'Linked meeting title was mutated'; end if;
  if not exists (
    select 1 from public.convay_entity_records
    where entity_key='bms.meetings' and record_id=v_mid
      and payload->>'meeting_title'='Synthetic board meeting'
  ) then raise exception 'Denied source update changed the meeting'; end if;

  -- Supplying a forged organization on minutes must fail even when this
  -- single-organization source meeting has no explicit organization field.
  v_denied_write := false;
  v_invalid_id := 'MN01-ORG-'||replace(gen_random_uuid()::text,'-','');
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
      'entity_key','bms.minutes','action','create','payload',
      v_payload || jsonb_build_object('id',v_invalid_id,
        'minutes_id',v_invalid_id,'organization_id','forged-organization')
    )));
  exception when sqlstate '42501' then v_denied_write := true;
  end;
  if not v_denied_write then raise exception 'Forged minutes organization was accepted'; end if;

  -- Both a forged title and a missing meeting must fail when bypassing the UI.
  foreach v_status in array array['forged-title','missing-source','wrong-date'] loop
    v_denied_write := false;
    v_invalid_id := 'MN01-INVALID-'||replace(gen_random_uuid()::text,'-','');
    begin
      perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
        'entity_key','bms.minutes','action','create','payload',
        v_payload || jsonb_build_object(
          'id',v_invalid_id,
          'minutes_id',v_invalid_id,
          'meeting_title',case when v_status='forged-title' then 'Impersonated' else 'Synthetic board meeting' end,
          'meeting_id',case when v_status='missing-source' then v_other_mid else v_mid end,
          'meeting_date',case when v_status='wrong-date' then '2020-01-01' else '2026-11-19' end
        )
      )));
    exception when others then v_denied_write := true;
    end;
    if not v_denied_write then raise exception '% request was accepted',v_status; end if;
  end loop;

  -- Direct patching of the source identity is disallowed even for Root.
  v_denied_write := false;
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
      'entity_key','bms.minutes','record_id',v_mins,'action','update',
      'payload',jsonb_build_object('meeting_id',v_other_mid)
    )));
  exception when others then v_denied_write := true;
  end;
  if not v_denied_write then raise exception 'Source meeting can be swapped'; end if;

  -- A source with an undeclared tenant cannot be used to mint a foreign-tenant minutes record.
  perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
    'entity_key','bms.meetings','action','create','payload',jsonb_build_object(
      'id',v_wrong_scope_mid,'meeting_id',v_wrong_scope_mid,
      'meeting_title','Other organization','meeting_date','2026-11-19',
      'approval_status','Completed','organizer_user_id',v_actor::text,
      'tenant_id','other-organization'
    )
  )));
  v_denied_write := false;
  v_invalid_id := 'MN01-OTHER-'||replace(gen_random_uuid()::text,'-','');
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
      'entity_key','bms.minutes','action','create','payload',
      v_payload || jsonb_build_object('id',v_invalid_id,
        'minutes_id',v_invalid_id,'meeting_id',v_wrong_scope_mid,
        'meeting_title','Other organization')
    )));
  exception when others then v_denied_write := true;
  end;
  if not v_denied_write then raise exception 'Cross-scope minutes were accepted'; end if;

  -- A denied principal cannot create minutes for an unrelated meeting, even with a matching title.
  v_denied := nullif(current_setting('mn01.test_denied_user',true),'')::uuid;
  if v_denied is null then raise exception 'An isolated denied test principal is required'; end if;
  perform set_config('request.jwt.claim.sub',v_denied::text,true);
  if convay_private.has_permission('min_create') then
    raise exception 'The denied test principal unexpectedly has min_create';
  end if;
  v_denied_write := false;
  v_invalid_id := 'MN01-DENIED-'||replace(gen_random_uuid()::text,'-','');
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
      'entity_key','bms.minutes','action','create','payload',v_payload ||
      jsonb_build_object('id',v_invalid_id,
        'minutes_id',v_invalid_id)
    )));
  exception when others then v_denied_write := true;
  end;
  if not v_denied_write then raise exception 'Principal without min_create wrote minutes'; end if;

  -- Complete MN-02: review -> requested revision -> author edit -> v1.1 review.
  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
    'entity_key','bms.minutes','record_id',v_mins,'action','update',
    'payload',jsonb_build_object('approval_status','Under Secretary Review')
  )));
  v_denied_write := false;
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
      'entity_key','bms.minutes','record_id',v_mins,'action','update',
      'payload',jsonb_build_object('approval_status','Revision Requested',
        'revision_instructions','short')
    )));
  exception when others then v_denied_write := true;
  end;
  if not v_denied_write then raise exception 'Short revision instructions were accepted'; end if;

  perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
    'entity_key','bms.minutes','record_id',v_mins,'action','update',
    'payload',jsonb_build_object('approval_status','Revision Requested',
      'revision_instructions','Correct the recorded attendance')
  )));
  if not exists(select 1 from public.convay_entity_records
    where entity_key='bms.minutes' and record_id=v_mins
      and jsonb_array_length(payload->'revision_history')=1
      and payload->'revision_history'->0->>'version'='1.0'
      and payload->'revision_history'->0->'content'->>'discussion_summary'='Recorded first version'
      and payload->'revision_history'->0->'content'->>'notes'='Original confidential notes'
      and payload->'revision_history'->0->>'instructions'='Correct the recorded attendance'
      and payload->'revision_history'->0->>'requested_by'=v_actor::text
  ) then raise exception 'Trusted immutable revision snapshot missing'; end if;

  foreach v_status in array array['forged-history','changed-reason','skipped-version','wrong-stage'] loop
    v_denied_write := false;
    begin
      perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
        'entity_key','bms.minutes','record_id',v_mins,'action','update',
        'payload',case v_status
          when 'forged-history' then jsonb_build_object('revision_history','[]'::jsonb)
          when 'changed-reason' then jsonb_build_object('revision_instructions','Tampered explanation')
          when 'skipped-version' then jsonb_build_object('approval_status','Under Secretary Review','version','1.9')
          else jsonb_build_object('approval_status','Approved') end
      )));
    exception when others then v_denied_write := true;
    end;
    if not v_denied_write then raise exception 'Unauthorized revision mutation accepted: %',v_status; end if;
  end loop;

  -- Author corrections are allowed while returned but historical content stays frozen.
  perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
    'entity_key','bms.minutes','record_id',v_mins,'action','update',
    'payload',jsonb_build_object('discussion_summary','Corrected attendance in new version')
  )));
  perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
    'entity_key','bms.minutes','record_id',v_mins,'action','update',
    'payload',jsonb_build_object('approval_status','Under Secretary Review','version','1.1')
  )));
  if not exists(select 1 from public.convay_entity_records
    where entity_key='bms.minutes' and record_id=v_mins
      and payload->>'version'='1.1'
      and payload->>'approval_status'='Under Secretary Review'
      and jsonb_array_length(payload->'revision_history')=1
      and payload->'revision_history'->0->'content'->>'discussion_summary'='Recorded first version'
      and payload->>'revision_instructions'='Correct the recorded attendance'
  ) then raise exception 'Returned minutes resubmission lost version or history'; end if;
  -- Restore Root and ensure final minutes content and linked source are immutable.
  perform set_config('request.jwt.claim.sub',v_actor::text,true);
  perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
    'entity_key','bms.minutes','record_id',v_mins,'action','update',
    'payload',jsonb_build_object('approval_status','Approved')
  )));
  v_denied_write := false;
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
      'entity_key','bms.minutes','record_id',v_mins,'action','update',
      'payload',jsonb_build_object('discussion_summary','Tampered')
    )));
  exception when others then v_denied_write := true;
  end;
  if not v_denied_write then raise exception 'Approved minutes can be rewritten'; end if;
  v_denied_write := false;
  begin
    perform public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
      'entity_key','bms.meetings','record_id',v_mid,'action','delete'
    )));
  exception when others then v_denied_write := true;
  end;
  if not v_denied_write then raise exception 'Source meeting with minutes can be deleted'; end if;
end;
$test$;
rollback;
