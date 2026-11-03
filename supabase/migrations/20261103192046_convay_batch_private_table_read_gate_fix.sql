create or replace function public.convay_apply_entity_batch(p_ops jsonb)
returns integer language plpgsql security invoker set search_path='' as $$
declare
  op jsonb;
  entity text;
  action text;
  rec_id text;
  rec_data jsonb;
  rows_affected integer;
  processed integer := 0;
begin
  if (select auth.uid()) is null then
    raise exception 'Sign in required';
  end if;
  if jsonb_typeof(p_ops) is distinct from 'array'
     or jsonb_array_length(p_ops) not between 1 and 500 then
    raise exception 'Invalid batch size';
  end if;
  for op in select value from jsonb_array_elements(p_ops) loop
    entity := op->>'entity_key';
    action := op->>'action';
    rec_id := coalesce(op->>'record_id',op->>'id',op->'payload'->>'id');
    rec_data := op->'payload';
    if entity is null or rec_id is null or length(rec_id) not between 1 and 180 then
      raise exception 'Invalid entity or record ID';
    end if;
    -- The FK and security-definer RLS policy validate the private entity catalogue.
    if action='create' then
      if jsonb_typeof(rec_data) is distinct from 'object'
        or rec_data->>'id' is distinct from rec_id then
        raise exception 'Invalid created record';
      end if;
      insert into public.convay_entity_records(entity_key,record_id,payload)
      values(entity,rec_id,rec_data);
    elsif action='update' then
      if jsonb_typeof(rec_data) is distinct from 'object' then
        raise exception 'Invalid record patch';
      end if;
      if rec_data ? 'id' and rec_data->>'id' is distinct from rec_id then
        raise exception 'Cannot replace record identity';
      end if;
      update public.convay_entity_records
         set payload=payload || (rec_data - 'id')
       where entity_key=entity and record_id=rec_id;
      get diagnostics rows_affected = row_count;
      if rows_affected <> 1 then raise exception 'Record unavailable for update'; end if;
    elsif action='delete' then
      delete from public.convay_entity_records where entity_key=entity and record_id=rec_id;
      get diagnostics rows_affected = row_count;
      if rows_affected <> 1 then raise exception 'Record unavailable for deletion'; end if;
    else
      raise exception 'Invalid operation';
    end if;
    processed := processed + 1;
  end loop;
  return processed;
end $$;
revoke all on function public.convay_apply_entity_batch(jsonb) from PUBLIC,anon;
grant execute on function public.convay_apply_entity_batch(jsonb) to authenticated;
