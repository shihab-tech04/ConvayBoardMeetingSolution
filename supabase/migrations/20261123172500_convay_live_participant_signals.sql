-- Convay LM-09: live-participant Raise Hand and Reactions
-- Retains the existing interaction verification and append-only integrity,
-- adding active-session, SQL-bound participant and signal-payload guards.
CREATE OR REPLACE FUNCTION convay_private.enforce_interaction_integrity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_actor uuid := auth.uid();
  v_name text;
  v_metadata jsonb;
  v_kind text;
  v_mid text;
  v_active_sessions integer;
  v_allowed_actor boolean;
begin
  if coalesce(case when tg_op='DELETE' then old.entity_key else new.entity_key end,'') <> 'bms.meetingInteractions' then
    if tg_op='DELETE' then return old; end if;
    return new;
  end if;
  if tg_op <> 'INSERT' then
    raise exception 'Meeting interaction evidence is append-only' using errcode='42501';
  end if;
  if v_actor is null then
    raise exception 'Authenticated author required' using errcode='42501';
  end if;
  select p.display_name into v_name from public.user_profiles p
  where p.user_id=v_actor and p.account_status='active';
  if v_name is null then
    raise exception 'Active author profile required' using errcode='42501';
  end if;
  if coalesce(new.payload->>'user_id','') <> v_actor::text then
    raise exception 'An interaction must belong to its authenticated author' using errcode='42501';
  end if;
  if coalesce(btrim(new.payload->>'meeting_id'),'')='' then
    raise exception 'An interaction must belong to a meeting' using errcode='23514';
  end if;
  v_kind := coalesce(new.payload->>'interaction_type','');
  if v_kind not in ('join','leave','chat','comment','vote','motion','decision','document_view','document_upload','agenda_change','host_action','quorum_change','hand_raise','reaction') then
    raise exception 'Unknown interaction type' using errcode='23514';
  end if;
  if v_kind in ('chat','comment') and (char_length(btrim(coalesce(new.payload->>'content',''))) not between 1 and 4000) then
    raise exception 'Interaction content must contain 1 to 4000 characters' using errcode='23514';
  end if;
  if coalesce(jsonb_typeof(new.payload->'metadata'),'object') <> 'object' then
    raise exception 'Interaction metadata must be an object' using errcode='23514';
  end if;
  v_metadata := coalesce(new.payload->'metadata','{}'::jsonb);
  if v_kind in ('hand_raise','reaction') then
    v_mid := new.payload->>'meeting_id';
    if v_mid !~ '^[A-Za-z0-9_-]{1,180}  if v_kind='chat' then
    v_metadata := v_metadata || jsonb_build_object('sender',v_name);
  elsif v_kind='comment' then
    v_metadata := v_metadata || jsonb_build_object('author',v_name);
  end if;
  new.payload := jsonb_set(
    jsonb_set(new.payload,'{metadata}',v_metadata,true),
    '{created_at}',to_jsonb(now()),true
  );
  return new;
end
$function$
 then
      raise exception 'Valid meeting identity required for live signals' using errcode='22023';
    end if;
    select count(*) into v_active_sessions from public.convay_entity_records s
      where s.entity_key='bms.liveSessions' and s.payload->>'meeting_id'=v_mid
        and lower(s.payload->>'session_status') in ('active','paused');
    if v_active_sessions <> 1 then
      raise exception 'Live signals require exactly one active meeting session' using errcode='23514';
    end if;
    select (
      exists(select 1 from public.convay_entity_records m
        where m.entity_key='bms.meetings' and
          (m.record_id=v_mid or m.payload->>'meeting_id'=v_mid)
          and lower(m.payload->>'approval_status') in ('in progress','paused','on break'))
      and (
        exists(select 1 from public.user_profiles p
          where p.user_id=v_actor and p.account_role='super_admin' and p.account_status='active')
        or exists(select 1 from public.convay_entity_records l
          where l.entity_key='bms.meetingParticipantLinks'
            and l.payload->>'meeting_id'=v_mid and l.payload->>'user_id'=v_actor::text)
      )
    ) into v_allowed_actor;
    if v_allowed_actor is distinct from true then
      raise exception 'Live signals require an authorized meeting participant' using errcode='42501';
    end if;
    if v_kind='hand_raise' then
      if jsonb_typeof(v_metadata->'raised') <> 'boolean' then
        raise exception 'Raise-hand state must be a boolean' using errcode='22023';
      end if;
      v_metadata := jsonb_build_object('raised',v_metadata->'raised','sender',v_name);
      new.payload := jsonb_set(new.payload,'{content}',to_jsonb(
        case when (v_metadata->>'raised')::boolean then 'Raised hand' else 'Lowered hand' end
      ),true);
    else
      if new.payload->>'content' not in ('👍','👏','❤️','😄','🤔','🙋') then
        raise exception 'Unsupported meeting reaction' using errcode='22023';
      end if;
      v_metadata := jsonb_build_object('sender',v_name);
    end if;
  end if;
  if v_kind='chat' then
    v_metadata := v_metadata || jsonb_build_object('sender',v_name);
  elsif v_kind='comment' then
    v_metadata := v_metadata || jsonb_build_object('author',v_name);
  end if;
  new.payload := jsonb_set(
    jsonb_set(new.payload,'{metadata}',v_metadata,true),
    '{created_at}',to_jsonb(now()),true
  );
  return new;
end
$function$
;