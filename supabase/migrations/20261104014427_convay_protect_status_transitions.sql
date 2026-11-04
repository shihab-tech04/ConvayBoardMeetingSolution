-- Close a verified approval bypass in the generic JSONB record API.
-- Convay UI writes lifecycle states through status, approval_status and
-- workflow_status. A user with edit but no approval/cancel privilege
-- must not mutate the same state through a different payload key.
-- Keep SECURITY INVOKER and the existing RLS policies enabled.
create or replace function convay_private.enforce_entity_state_transition()
returns trigger language plpgsql security invoker set search_path='' as $guard$
declare
  prior_payload jsonb := '{}'::jsonb;
  field_name text;
  old_value text;
  new_value text;
  candidate text;
  needed text;
  approval_code text;
  required_codes text[] := array[]::text[];
begin
  if tg_op = 'UPDATE' then
    prior_payload := old.payload;
  end if;
  approval_code := case new.entity_key
    when 'bms.meetings' then 'mtg_approve'
    when 'bms.agenda' then 'agd_approve'
    when 'bms.decisions' then 'dec_approve'
    when 'bms.resolutions' then 'res_approve'
    when 'bms.minutes' then 'min_approve'
    when 'bms.boardpacks' then 'pack_publish'
    when 'bms.packversions' then 'pack_publish'
    when 'bms.documents' then 'doc_approve'
    when 'bms.doc.approvals' then 'doc_approve'
    when 'bms.actionitems' then 'act_close'
    else null
  end;
  foreach field_name in array array['status','approval_status','workflow_status'] loop
    old_value := lower(btrim(coalesce(prior_payload->>field_name,'')));
    new_value := lower(btrim(coalesce(new.payload->>field_name,'')));
    if old_value is not distinct from new_value then continue; end if;
    needed := null;
    -- Prefer the destination operation, so a lifecycle officer can start
    -- or cancel a previously approved meeting without approve permission.
    for candidate in select unnest(array[new_value,old_value]) loop
      needed := case
        when new.entity_key = 'bms.meetings' and candidate in ('cancelled','canceled') then 'mtg_cancel'
        when new.entity_key = 'bms.meetings' and candidate in ('postponed','rescheduled') then 'mtg_postpone'
        when new.entity_key = 'bms.meetings' and candidate in ('in progress','live','ongoing','completed') then 'mtg_start'
        when new.entity_key = 'bms.actionitems' and candidate in ('completed','closed','done','cancelled','canceled') then 'act_close'
        when new.entity_key = 'bms.documents' and candidate in ('published','released') then 'doc_publish'
        when new.entity_key in ('bms.boardpacks','bms.packversions') and candidate in ('published','released') then 'pack_publish'
        when new.entity_key = 'bms.meetings' and candidate in ('published','released') then 'mtg_update'
        when candidate in ('approved','accepted','rejected','declined','denied','signed','finalized','finalised','adopted','ratified') then approval_code
        when candidate in ('revision requested','revision_requested','changes requested','rework requested','returned') then
          case new.entity_key
            when 'bms.agenda' then 'agd_review'
            when 'bms.documents' then 'doc_review'
            when 'bms.doc.approvals' then 'doc_review'
            else approval_code
          end
        else null
      end;
      exit when needed is not null;
    end loop;
    if needed is not null then required_codes := array_append(required_codes,needed); end if;
  end loop;
  if tg_op = 'UPDATE' and approval_code is not null and (
    new.payload->'approval_history' is distinct from prior_payload->'approval_history'
    or new.payload->'approved_by' is distinct from prior_payload->'approved_by'
    or new.payload->'approved_at' is distinct from prior_payload->'approved_at'
  ) then
    required_codes := array_append(required_codes,approval_code);
  end if;
  if new.entity_key = 'bms.documents' then
    if new.payload->'is_locked' is distinct from prior_payload->'is_locked'
       and (tg_op = 'UPDATE' or coalesce((new.payload->>'is_locked')::boolean,false)) then
      required_codes := array_append(required_codes,'doc_manage_versions');
    end if;
    if tg_op = 'UPDATE' and new.payload->'publication_date' is distinct from prior_payload->'publication_date' then
      required_codes := array_append(required_codes,'doc_publish');
    end if;
  end if;
  if new.entity_key = 'bms.actionitems' then
    foreach field_name in array array['implementation_status','completion_status','action_status'] loop
      old_value := lower(btrim(coalesce(prior_payload->>field_name,'')));
      new_value := lower(btrim(coalesce(new.payload->>field_name,'')));
      if old_value is distinct from new_value and (
        old_value in ('completed','closed','done')
        or new_value in ('completed','closed','done')
      ) then
        required_codes := array_append(required_codes,'act_close');
      end if;
    end loop;
  end if;
  -- Do not allow another changed field to overwrite an existing requirement.
  for needed in select distinct unnest(required_codes) loop
    if not convay_private.has_permission(needed) then
      raise exception 'Additional business permission required: % on %',needed,new.entity_key
        using errcode='42501';
    end if;
  end loop;
  return new;
end;
$guard$;
revoke all on function convay_private.enforce_entity_state_transition() from public,anon,authenticated;
