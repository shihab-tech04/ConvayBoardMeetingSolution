-- MN-01: validate minutes/source relationships at the trusted SQL mutation boundary.
-- Fail closed for unknown source, wrong actor, tenant mismatch and forged metadata.
-- Keep the existing registry RLS, lifecycle guards and append-only audit triggers.

create or replace function convay_private.enforce_minutes_source_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  v_actor uuid := auth.uid();
  v_meeting public.convay_entity_records%rowtype;
  v_profile public.user_profiles%rowtype;
  v_meeting_id text;
  v_source_status text;
  v_old_status text;
  v_new_status text;
  v_next_version text;
  v_history jsonb;
  v_source_scope text;
  v_actor_scope text;
  v_is_leader boolean := false;
  v_legacy_secretary boolean := false;
  v_editor boolean := false;
  v_reviewer boolean := false;
  v_safe_workflow_keys text[] := array[
    'approval_status', 'status', 'workflow_status', 'approval_history',
    'approved_by', 'approved_at', 'signed_by', 'signed_at',
    'archived_by', 'archived_at', 'revision_instructions', 'revision_history', 'updated_at'
  ];
begin
  if tg_op = 'DELETE' then
    if old.entity_key = 'bms.meetings' and exists (
      select 1 from public.convay_entity_records r
      where r.entity_key = 'bms.minutes'
        and r.payload->>'meeting_id' in (old.record_id, old.payload->>'meeting_id')
    ) then
      raise exception 'A meeting with linked minutes cannot be deleted'
        using errcode = '23503';
    end if;
    if old.entity_key = 'bms.minutes' then
      if v_actor is null
         or not coalesce(convay_private.has_permission('min_approve'), false)
         or lower(btrim(coalesce(old.payload->>'approval_status',''))) <> 'draft'
      then
        raise exception 'Only authorized draft minutes can be deleted'
          using errcode = '42501';
      end if;
      if old.created_by is distinct from v_actor then
        raise exception 'Draft minutes may be deleted only by their creator'
          using errcode = '42501';
      end if;
    end if;
    return old;
  end if;

  -- Once minutes exist, the source meeting's canonical identity, title,
  -- date and scope cannot be rewritten. The row lock taken by minutes CREATE
  -- serializes with this UPDATE, so concurrent changes cannot bypass it.
  if tg_op = 'UPDATE' and old.entity_key = 'bms.meetings' then
    if new.entity_key is distinct from old.entity_key then
      raise exception 'Meeting entity identity cannot change'
        using errcode='42501';
    end if;
    if (
      new.record_id is distinct from old.record_id
      or new.payload->'meeting_id' is distinct from old.payload->'meeting_id'
      or new.payload->'meeting_title' is distinct from old.payload->'meeting_title'
      or new.payload->'meeting_date' is distinct from old.payload->'meeting_date'
      or new.payload->'tenant_id' is distinct from old.payload->'tenant_id'
      or new.payload->'organization_id' is distinct from old.payload->'organization_id'
    ) and exists (
      select 1 from public.convay_entity_records r
      where r.entity_key = 'bms.minutes'
        and r.payload->>'meeting_id' in (old.record_id, old.payload->>'meeting_id')
    ) then
      raise exception 'Linked minutes protect meeting identity, date and scope'
        using errcode='42501';
    end if;
    return new;
  end if;

  if tg_op = 'UPDATE' and old.entity_key = 'bms.minutes'
     and new.entity_key is distinct from old.entity_key then
    raise exception 'Minutes entity identity cannot change' using errcode='42501';
  end if;
  if new.entity_key <> 'bms.minutes' then return new; end if;

  if v_actor is null then
    raise exception 'Sign in before modifying minutes' using errcode = '42501';
  end if;
  select * into v_profile from public.user_profiles
  where user_id = v_actor and account_status = 'active';
  if not found then
    raise exception 'Active actor profile required for minutes' using errcode='42501';
  end if;
  v_editor := coalesce(convay_private.has_permission('min_create'), false);
  v_reviewer := coalesce(convay_private.has_permission('min_approve'), false);
  if not (v_editor or v_reviewer) then
    raise exception 'Minutes permission required' using errcode='42501';
  end if;

  v_meeting_id := nullif(btrim(coalesce(new.payload->>'meeting_id','')), '');
  if v_meeting_id is null then
    raise exception 'Minutes require an existing source meeting' using errcode='23503';
  end if;
  -- A SHARE lock serializes completion/cancellation or deletion with this write.
  -- Do not use a client-provided title/date or a stale browser state as authority.
  select * into v_meeting from public.convay_entity_records
  where entity_key='bms.meetings'
    and record_id=v_meeting_id
    and payload->>'meeting_id'=v_meeting_id
  for share;
  if not found then
    raise exception 'Minutes require an existing canonical source meeting'
      using errcode='23503';
  end if;

  v_source_scope := coalesce(
    nullif(btrim(v_meeting.payload->>'tenant_id'), ''),
    nullif(btrim(v_meeting.payload->>'organization_id'), '')
  );
  v_actor_scope := coalesce(
    nullif(btrim(v_profile.profile_data->>'tenant_id'), ''),
    nullif(btrim(v_profile.profile_data->>'organization_id'), '')
  );
  -- Existing Convay simulation is a single organization without explicit
  -- tenant IDs. When scope IDs exist, neither may be missing or different.
  if v_source_scope is distinct from v_actor_scope then
    raise exception 'Minutes source is outside the actor organization'
      using errcode='42501';
  end if;
  if nullif(btrim(coalesce(new.payload->>'tenant_id','')), '') is not null
     and new.payload->>'tenant_id' is distinct from v_source_scope then
    raise exception 'Client-supplied minutes tenant does not match the source'
      using errcode='42501';
  end if;

  -- Supplied organization metadata must agree with the source's
  -- organization field, not merely with a coalesced tenant fallback.
  if nullif(btrim(coalesce(new.payload->>'organization_id','')), '') is not null
     and new.payload->>'organization_id' is distinct from
         v_meeting.payload->>'organization_id' then
    raise exception 'Client-supplied minutes organization does not match source'
      using errcode='42501';
  end if;

  v_is_leader := convay_private.is_meeting_leader(
    v_actor, v_meeting.payload, v_meeting.created_by
  );
  if nullif(btrim(coalesce(v_meeting.payload->>'secretary_user_id','')), '') = v_actor::text then
    v_is_leader := true;
  elsif nullif(btrim(coalesce(v_meeting.payload->>'secretary_user_id','')), '') is null
     and lower(btrim(coalesce(v_meeting.payload->>'secretary',''))) =
         lower(btrim(v_profile.display_name)) then
    select count(*) = 1 into v_legacy_secretary from public.user_profiles p
    where p.account_status='active'
      and lower(btrim(p.display_name))=lower(btrim(v_profile.display_name));
    v_is_leader := v_is_leader or v_legacy_secretary;
  end if;
  -- Convay has one trusted platform Root role. Its privileged review access
  -- remains subject to min_approve and the same explicit organization check.
  if v_profile.account_role = 'super_admin' and v_reviewer then
    v_is_leader := true;
  end if;
  if not v_is_leader then
    raise exception 'Only the assigned meeting team may create or modify minutes'
      using errcode='42501';
  end if;

  if nullif(btrim(coalesce(v_meeting.payload->>'meeting_title','')), '') is null
     or btrim(coalesce(new.payload->>'meeting_title','')) <>
        btrim(v_meeting.payload->>'meeting_title')
     or coalesce(new.payload->>'meeting_date','') <>
        coalesce(v_meeting.payload->>'meeting_date','') then
    raise exception 'Minutes must use the authoritative meeting title and date'
      using errcode='23514';
  end if;
  if new.payload->>'id' is distinct from new.record_id
     or new.payload->>'minutes_id' is distinct from new.record_id then
    raise exception 'Minutes identity does not match its record key'
      using errcode='23514';
  end if;

  v_new_status := lower(btrim(coalesce(new.payload->>'approval_status','')));
  if tg_op = 'INSERT' then
    if not v_editor then
      raise exception 'Minutes creation requires min_create' using errcode='42501';
    end if;
    v_source_status := lower(btrim(coalesce(v_meeting.payload->>'approval_status','')));
    if v_source_status not in ('completed','closed','awaiting minutes') then
      raise exception 'Source meeting must be completed or awaiting minutes'
        using errcode='23514';
    end if;
    if v_new_status <> 'draft' then
      raise exception 'New minutes must begin as Draft' using errcode='23514';
    end if;
    if new.payload->>'version' is distinct from '1.0'
       or (new.payload ? 'revision_history'
           and new.payload->'revision_history' is distinct from '[]'::jsonb) then
      raise exception 'New minutes must begin at version 1.0 without forged history'
        using errcode='23514';
    end if;
    if new.created_by is not null and new.created_by <> v_actor then
      raise exception 'Minutes creator identity may not be impersonated'
        using errcode='42501';
    end if;
    new.created_by := v_actor;
    new.updated_by := v_actor;
    if v_source_scope is not null then
      new.payload := jsonb_set(new.payload,'{tenant_id}',to_jsonb(v_source_scope),true);
    end if;
    return new;
  end if;

  if new.record_id is distinct from old.record_id
     or new.created_by is distinct from old.created_by
     or new.payload->>'meeting_id' is distinct from old.payload->>'meeting_id'
     or new.payload->>'minutes_id' is distinct from old.payload->>'minutes_id'
     or new.payload->>'meeting_title' is distinct from old.payload->>'meeting_title'
     or new.payload->>'meeting_date' is distinct from old.payload->>'meeting_date'
     or new.payload->'tenant_id' is distinct from old.payload->'tenant_id' then
    raise exception 'Existing minutes source and identity are immutable'
      using errcode='42501';
  end if;
  v_old_status := lower(btrim(coalesce(old.payload->>'approval_status','')));

  -- Revision snapshots are stamped from OLD persistent content by this trigger.
  -- Direct REST/batch clients cannot forge or delete previously reviewed text.
  if new.payload->'revision_history' is distinct from old.payload->'revision_history' then
    raise exception 'Minutes revision history is server-owned' using errcode='42501';
  end if;
  if new.payload->'revision_instructions' is distinct from old.payload->'revision_instructions'
     and not (v_new_status='revision requested' and
       v_old_status in ('under secretary review','under chairperson review','member review')) then
    raise exception 'Revision instructions may only be recorded by a reviewer'
      using errcode='42501';
  end if;

  if v_new_status='revision requested' and v_old_status<>v_new_status then
    if v_old_status not in ('under secretary review','under chairperson review','member review')
       or not v_reviewer then
      raise exception 'Only a reviewer can return review-stage minutes'
        using errcode='42501';
    end if;
    if length(btrim(coalesce(new.payload->>'revision_instructions',''))) < 10
       or new.payload->'version' is distinct from old.payload->'version' then
      raise exception 'Revision request requires instructions and unchanged version'
        using errcode='23514';
    end if;
    v_history := coalesce(old.payload->'revision_history','[]'::jsonb);
    if jsonb_typeof(v_history)<>'array' then
      raise exception 'Invalid saved minutes revision history' using errcode='23514';
    end if;
    new.payload := jsonb_set(new.payload,'{revision_history}',
      v_history || jsonb_build_array(jsonb_build_object(
        'version',old.payload->>'version',
        'review_status',old.payload->>'approval_status',
        'instructions',new.payload->>'revision_instructions',
        'requested_by',v_actor::text,
        'requested_at',clock_timestamp(),
        'content',jsonb_build_object(
          'minutes_template',old.payload->>'minutes_template',
          'minute_taker',old.payload->>'minute_taker',
          'co_authors',old.payload->>'co_authors',
          'quorum_statement',old.payload->>'quorum_statement',
          'discussion_summary',old.payload->>'discussion_summary',
          'notes',old.payload->>'notes',
          'next_meeting_date',old.payload->>'next_meeting_date',
          'closing_time',old.payload->>'closing_time'
        )
      )),true);
  end if;

  if v_old_status='revision requested' and v_new_status='under secretary review' then
    -- The reviewer-requested snapshot remains immutable; only a sequential
    -- new version is valid on the returned author's next submission.
    if coalesce(old.payload->>'version','') not similar to
      '(0|[1-9][0-9]{0,3})[.](0|[1-9][0-9]{0,3})' then
      raise exception 'Invalid existing minutes version' using errcode='23514';
    end if;
    if split_part(old.payload->>'version','.',2)::integer >= 9999 then
      raise exception 'Minutes revision limit reached' using errcode='23514';
    end if;
    v_next_version := split_part(old.payload->>'version','.',1) || '.' ||
      (split_part(old.payload->>'version','.',2)::integer+1)::text;
    if new.payload->>'version' is distinct from v_next_version then
      raise exception 'Resubmission requires the next sequential revision version'
        using errcode='23514';
    end if;
  elsif v_old_status='revision requested' and v_new_status<>v_old_status then
    raise exception 'Returned minutes must be resubmitted for Secretary Review'
      using errcode='42501';
  elsif new.payload->'version' is distinct from old.payload->'version' then
    raise exception 'Minutes version cannot change without resubmission'
      using errcode='42501';
  end if;

  -- Explicit state graph: no direct Draft -> Approved/Signed/Archived shortcut,
  -- no reversal of final records, and no client-controlled generic Published.
  if v_new_status is distinct from v_old_status and not (
       (v_old_status='draft' and v_new_status='under secretary review')
    or (v_old_status='revision requested' and v_new_status='under secretary review')
    or (v_old_status='under secretary review' and v_new_status in ('under chairperson review','revision requested'))
    or (v_old_status='under chairperson review' and v_new_status in ('member review','revision requested'))
    or (v_old_status='member review' and v_new_status in ('approved','revision requested'))
    or (v_old_status='approved' and v_new_status='signed')
    or (v_old_status='signed' and v_new_status='archived')
  ) then
    raise exception 'Invalid minutes lifecycle transition'
      using errcode='42501';
  end if;
  if v_new_status is distinct from v_old_status
    and v_old_status in ('under secretary review','under chairperson review','member review','approved','signed')
    and not v_reviewer then
    raise exception 'Review, approval, signing or archival requires min_approve'
      using errcode='42501';
  end if;
  if v_old_status='under secretary review' and v_new_status='under chairperson review'
     and not (v_profile.account_role='super_admin'
       or nullif(btrim(coalesce(v_meeting.payload->>'secretary_user_id','')),'')=v_actor::text
       or v_legacy_secretary) then
    raise exception 'Only assigned secretary may forward minutes to chairperson'
      using errcode='42501';
  end if;
  if v_old_status='under chairperson review' and v_new_status='member review'
     and not (v_profile.account_role='super_admin'
       or nullif(btrim(coalesce(v_meeting.payload->>'chairperson_user_id','')),'')=v_actor::text) then
    raise exception 'Only assigned chairperson may forward minutes for member review'
      using errcode='42501';
  end if;

  if v_old_status in ('approved','signed','archived') then
    if not v_reviewer then
      raise exception 'Final minutes transitions require min_approve'
        using errcode='42501';
    end if;
    if not ((v_old_status='approved' and v_new_status in ('signed','archived'))
        or (v_old_status='signed' and v_new_status='archived')) then
      raise exception 'Approved, signed, and archived minutes cannot be edited'
        using errcode='42501';
    end if;
  elsif v_old_status in ('draft','revision requested') then
    if not v_editor then
      raise exception 'Editing draft minutes requires min_create'
        using errcode='42501';
    end if;
    if old.created_by is distinct from v_actor
       and v_profile.account_role <> 'super_admin' then
      raise exception 'Draft minutes may be edited only by their author'
        using errcode='42501';
    end if;
  elsif not v_reviewer then
    raise exception 'Review-stage changes require min_approve' using errcode='42501';
  end if;

  if v_old_status not in ('draft','revision requested')
     and (new.payload - v_safe_workflow_keys) is distinct from
         (old.payload - v_safe_workflow_keys) then
    raise exception 'Reviewed minutes content cannot be changed by a status transition'
      using errcode='42501';
  end if;
  new.updated_by := v_actor;
  return new;
end;
$fn$;

-- Keep this helper inaccessible as a direct API function; the triggers
-- run it internally for both registry RPC calls and direct table writes.
revoke all on function convay_private.enforce_minutes_source_integrity()
  from public, anon, authenticated;

drop trigger if exists convay_a0_minutes_before_insert on public.convay_entity_records;
create trigger convay_a0_minutes_before_insert
before insert on public.convay_entity_records
for each row when (new.entity_key = 'bms.minutes')
execute function convay_private.enforce_minutes_source_integrity();

drop trigger if exists convay_a0_minutes_before_update on public.convay_entity_records;
create trigger convay_a0_minutes_before_update
before update on public.convay_entity_records
for each row when (new.entity_key in ('bms.minutes','bms.meetings') or old.entity_key in ('bms.minutes','bms.meetings'))
execute function convay_private.enforce_minutes_source_integrity();

drop trigger if exists convay_a0_minutes_before_delete on public.convay_entity_records;
create trigger convay_a0_minutes_before_delete
before delete on public.convay_entity_records
for each row when (old.entity_key in ('bms.minutes','bms.meetings'))
execute function convay_private.enforce_minutes_source_integrity();
