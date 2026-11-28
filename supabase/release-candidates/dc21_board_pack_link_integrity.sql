-- DC-21/23/24 staged candidate: exact draft-pack document membership.
-- NOT an automatic migration; no publication activation or hosted execution.
-- Existing RLS and actor checks remain mandatory; this adds relationship checks.
-- Do not activate before inventorying legacy display-label pins and orphan links.
create or replace function convay_private.enforce_board_pack_link_integrity()
returns trigger language plpgsql security invoker set search_path = '' as $guard$
declare
  p jsonb;
  t uuid;
  parent_count bigint;
  parent_record text;
  parent_external text;
  parent_state text;
  document_count bigint;
  canonical_document text;
  external_document text;
  version_count bigint;
begin
  if tg_op = 'DELETE' then
    if old.entity_key <> 'bms.doc.pack_links' then return old; end if;
    p := old.payload; t := old.tenant_id;
  else
    if new.entity_key <> 'bms.doc.pack_links' then return new; end if;
    p := new.payload; t := new.tenant_id;
  end if;
  if auth.uid() is null then
    raise exception 'Board pack link requires an authorized actor' using errcode='42501';
  end if;
  if tg_op='UPDATE' and (new.payload->'board_pack_id' is distinct from old.payload->'board_pack_id'
      or new.payload->'document_id' is distinct from old.payload->'document_id'
      or new.tenant_id is distinct from old.tenant_id) then
    raise exception 'Board pack link association cannot change' using errcode='23514';
  end if;
  if jsonb_typeof(p->'board_pack_id') is distinct from 'string'
     or nullif(btrim(p->>'board_pack_id'),'') is null
     or jsonb_typeof(p->'document_id') is distinct from 'string'
     or nullif(btrim(p->>'document_id'),'') is null then
    raise exception 'Board pack link requires exact identities' using errcode='23514';
  end if;
  -- Serialize against updates to the selected pack. Lock the actual visible row,
  -- never a guessed ID; reject aliases matching multiple rows. An exclusive
  -- row lock serializes competing membership inserts as well as publication.
  select count(*),min(record_id) into parent_count,parent_record
    from public.convay_entity_records
    where entity_key='bms.boardpacks' and tenant_id is not distinct from t
      and (record_id=p->>'board_pack_id' or payload->>'pack_id'=p->>'board_pack_id');
  if parent_count<>1 then
    raise exception 'Board pack is unavailable or ambiguous' using errcode='42501';
  end if;
  select payload->>'approval_status',payload->>'pack_id' into parent_state,parent_external
    from public.convay_entity_records
    where entity_key='bms.boardpacks' and record_id=parent_record
      and tenant_id is not distinct from t for update;
  if parent_state is distinct from 'Draft' then
    raise exception 'Only draft board pack membership can change' using errcode='23514';
  end if;
  -- Allow removing a draft's obsolete legacy label without blessing that label.
  if tg_op='DELETE' then return old; end if;
  if p->>'link_status' is null or p->>'link_status' not in ('active','removed','superseded') then
    raise exception 'Invalid board pack link status' using errcode='23514';
  end if;
  if tg_op='UPDATE' and p->>'link_status'='removed'
     and new.payload->'linked_version_id' is not distinct from old.payload->'linked_version_id' then return new; end if;
  select count(*),min(record_id),min(payload->>'doc_id') into document_count,canonical_document,external_document
    from public.convay_entity_records
    where entity_key='bms.documents' and tenant_id is not distinct from t
      and (record_id=p->>'document_id' or payload->>'doc_id'=p->>'document_id');
  if document_count<>1 then
    raise exception 'Board pack document is unavailable or ambiguous' using errcode='42501';
  end if;
  if jsonb_typeof(p->'linked_version_id') is distinct from 'string'
     or nullif(btrim(p->>'linked_version_id'),'') is null
     or p->>'linked_version_id' is distinct from btrim(p->>'linked_version_id')
     or lower(p->>'linked_version_id') in ('latest','live') then
    raise exception 'Board pack requires an exact document version identity' using errcode='23514';
  end if;
  select count(*) into version_count from public.convay_entity_records
    where entity_key='bms.docversions' and tenant_id is not distinct from t
      and payload->>'document_id' in (canonical_document,external_document)
      and payload->>'version_id'=p->>'linked_version_id'
      and payload->>'version_id' is distinct from payload->>'version_number';
  if version_count<>1 then
    raise exception 'Board pack requires one authorized exact document version' using errcode='23514';
  end if;
  -- The UI permits only one current membership per document and pack. Resolve
  -- both canonical and legacy aliases under the same tenant and parent lock.
  -- Removed history is retained; it does not prevent a fresh membership.
  if p->>'link_status' <> 'removed' and exists (
    select 1 from public.convay_entity_records l
    where l.entity_key='bms.doc.pack_links' and l.tenant_id is not distinct from t
      and l.record_id <> new.record_id
      and l.payload->>'board_pack_id' in (parent_record,parent_external)
      and l.payload->>'document_id' in (canonical_document,external_document)
      and l.payload->>'link_status' is distinct from 'removed'
  ) then
    raise exception 'Document already belongs to this board pack' using errcode='23514';
  end if;
  return new;
end;
$guard$;
revoke all on function convay_private.enforce_board_pack_link_integrity() from public,anon,authenticated;
drop trigger if exists convay_board_pack_link_integrity on public.convay_entity_records;
create trigger convay_board_pack_link_integrity before insert or update or delete on public.convay_entity_records
for each row execute function convay_private.enforce_board_pack_link_integrity();
