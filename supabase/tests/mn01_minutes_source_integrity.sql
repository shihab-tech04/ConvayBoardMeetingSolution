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
    'minute_taker','Synthetic minute taker','approval_status','Draft','version','1.0'
  );
  if public.convay_apply_entity_batch(jsonb_build_array(jsonb_build_object(
    'entity_key','bms.minutes','action','create','payload',v_payload
  ))) <> 1 then raise exception 'MN-01 authorized create was not committed'; end if;
  if not exists (select 1 from public.convay_entity_records
     where entity_key='bms.minutes' and record_id=v_mins
       and payload->>'meeting_id'=v_mid and created_by=v_actor) then
    raise exception 'MN-01 canonical minutes readback failed';
  end if;

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
  for v_candidate in select user_id from public.user_profiles where user_id<>v_actor and account_status='active' loop
    perform set_config('request.jwt.claim.sub',v_candidate::text,true);
    if not convay_private.has_permission('min_create') then v_denied := v_candidate; exit; end if;
  end loop;
  if v_denied is null then raise exception 'A denied test principal is required'; end if;
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
