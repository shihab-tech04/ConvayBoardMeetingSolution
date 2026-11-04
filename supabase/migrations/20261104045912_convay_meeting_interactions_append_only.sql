-- Append-only, authenticated board-meeting interaction evidence.
-- SQL, not client-supplied metadata, records the author and timestamp.
create or replace function convay_private.enforce_interaction_integrity()
returns trigger language plpgsql security invoker set search_path='' as $guard$
declare
  v_actor uuid := auth.uid();
  v_name text;
  v_metadata jsonb;
  v_kind text;
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
  if v_kind not in ('join','leave','chat','comment','vote','motion','decision','document_view','document_upload','agenda_change','host_action','quorum_change') then
    raise exception 'Unknown interaction type' using errcode='23514';
  end if;
  if v_kind in ('chat','comment') and (char_length(btrim(coalesce(new.payload->>'content',''))) not between 1 and 4000) then
    raise exception 'Interaction content must contain 1 to 4000 characters' using errcode='23514';
  end if;
  if coalesce(jsonb_typeof(new.payload->'metadata'),'object') <> 'object' then
    raise exception 'Interaction metadata must be an object' using errcode='23514';
  end if;
  v_metadata := coalesce(new.payload->'metadata','{}'::jsonb);
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
$guard$;
revoke all on function convay_private.enforce_interaction_integrity() from public,anon,authenticated;
drop trigger if exists convay_a0_interaction_integrity on public.convay_entity_records;
create trigger convay_a0_interaction_integrity
before insert or update or delete on public.convay_entity_records
for each row execute function convay_private.enforce_interaction_integrity();
