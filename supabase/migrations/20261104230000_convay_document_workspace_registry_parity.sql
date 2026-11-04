-- Phase 1 document workspace synchronization: five registered entity types.
-- Preserve existing row-level policy predicates; add document-scoped checks.
-- No mock data imported. No anonymous table access enabled.
insert into convay_private.registry_types
 (entity_key,read_permission,create_permission,update_permission,delete_permission)
values
 ('bms.doc.threads','doc_view','doc_comment','doc_comment','doc_comment'),
 ('bms.doc.access_grants','doc_view','doc_share','doc_share','doc_share'),
 ('bms.doc.approvals_v2','doc_view','doc_approve',null,null),
 ('bms.doc.pack_links','pack_view','pack_create','pack_create','pack_create'),
 ('bms.doc.acknowledgements','doc_view','doc_view',null,null)
on conflict(entity_key) do nothing;

create unique index if not exists convay_documents_external_id_unique
 on public.convay_entity_records ((payload->>'doc_id'))
 where entity_key='bms.documents'
   and nullif(btrim(payload->>'doc_id'),'') is not null;

CREATE OR REPLACE FUNCTION convay_private.document_scope_authorized(p_doc text, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
 v_actor uuid := auth.uid();
 v_perm text;
 v_owner uuid;
 v_confidentiality text;
 v_has_shares boolean;
 v_granted boolean;
 v_record_id text;
 v_external_id text;
begin
 if v_actor is null or p_doc is null or length(p_doc)=0 then return false; end if;
 v_perm := case p_action
  when 'view' then 'doc_view'
  when 'upload' then 'doc_upload'
  when 'edit' then 'doc_edit'
  when 'comment' then 'doc_comment'
  when 'share' then 'doc_share'
  when 'approve' then 'doc_approve'
  when 'delete' then 'doc_archive'
  else null end;
 if v_perm is null or not convay_private.has_permission(v_perm) then return false; end if;
 select d.created_by,lower(coalesce(d.payload->>'confidentiality','')),
        d.record_id,coalesce(nullif(d.payload->>'doc_id',''),d.record_id)
 into v_owner,v_confidentiality,v_record_id,v_external_id
 from public.convay_entity_records d
 where d.entity_key='bms.documents'
   and (d.record_id=p_doc or d.payload->>'doc_id'=p_doc);
 if not found then return false; end if;
 if exists(select 1 from public.user_profiles p
     where p.user_id=v_actor and p.account_status='active' and p.account_role='super_admin')
 then return true; end if;
 if v_owner=v_actor then return true; end if;
 select exists(select 1 from public.convay_entity_records a where a.entity_key in ('bms.doc.access','bms.doc.access_grants')
  and a.payload->>'document_id' in (p_doc,v_record_id,v_external_id)) into v_has_shares;
 if not v_has_shares and v_confidentiality !~ '(confidential|restricted|private|secret|sensitive)'
 then return true; end if;
 select exists(
  select 1 from public.convay_entity_records a
  where a.entity_key in ('bms.doc.access','bms.doc.access_grants')
    and a.payload->>'document_id' in (p_doc,v_record_id,v_external_id)
    and (a.payload->>'expires_at' is null
      or case when (a.payload->>'expires_at') ~ '^\d{4}-\d\d-\d\d'
        then (a.payload->>'expires_at')::timestamptz > now() else false end)
    and ((a.payload->>'subject_type'='user' and a.payload->>'subject_id'=v_actor::text)
      or (a.payload->>'subject_type'='role' and exists(
         select 1 from public.convay_user_roles ur
           join public.convay_roles r on r.id=ur.role_id
         where ur.user_id=v_actor and r.id::text=a.payload->>'subject_id' and r.status='Active'
      )))
    and case p_action
      when 'view' then a.payload->>'permission' in ('view','comment','edit','admin')
      when 'comment' then a.payload->>'permission' in ('comment','edit','admin')
      when 'upload' then a.payload->>'permission' in ('edit','admin')
      when 'edit' then a.payload->>'permission' in ('edit','admin')
      when 'approve' then a.payload->>'permission' in ('edit','admin')
      else a.payload->>'permission'='admin'
    end
 ) into v_granted;
 return v_granted;
end $function$;

drop policy if exists convay_records_create on public.convay_entity_records;
create policy convay_records_create on public.convay_entity_records for insert to authenticated
 with check (((convay_private.registry_authorized(entity_key, 'create'::text) AND
CASE
    WHEN (entity_key = 'bms.doc.access'::text) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'share'::text)
    WHEN (entity_key = 'bms.doc.comments'::text) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'comment'::text)
    WHEN (entity_key = 'bms.docversions'::text) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'edit'::text)
    WHEN (entity_key = 'bms.doc.approvals'::text) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'view'::text)
    ELSE true
END)) and (case entity_key
 when 'bms.doc.threads' then convay_private.document_scope_authorized(payload->>'document_id','comment')
 when 'bms.doc.access_grants' then convay_private.document_scope_authorized(payload->>'document_id','share')
 when 'bms.doc.approvals_v2' then convay_private.document_scope_authorized(payload->>'document_id','approve')
 when 'bms.doc.pack_links' then convay_private.document_scope_authorized(payload->>'document_id','share')
 when 'bms.doc.acknowledgements' then convay_private.document_scope_authorized(payload->>'document_id','view')
 else true end));

drop policy if exists convay_records_delete on public.convay_entity_records;
create policy convay_records_delete on public.convay_entity_records for delete to authenticated
 using (((convay_private.registry_authorized(entity_key, 'delete'::text) AND
CASE
    WHEN (entity_key = 'bms.documents'::text) THEN convay_private.document_scope_authorized(record_id, 'delete'::text)
    WHEN (entity_key = 'bms.doc.access'::text) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'share'::text)
    WHEN (entity_key = 'bms.doc.comments'::text) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'comment'::text)
    WHEN (entity_key = ANY (ARRAY['bms.docversions'::text, 'bms.doc.approvals'::text])) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'edit'::text)
    ELSE true
END)) and (case entity_key
 when 'bms.doc.threads' then convay_private.document_scope_authorized(payload->>'document_id','comment')
 when 'bms.doc.access_grants' then convay_private.document_scope_authorized(payload->>'document_id','share')
 when 'bms.doc.approvals_v2' then convay_private.document_scope_authorized(payload->>'document_id','approve')
 when 'bms.doc.pack_links' then convay_private.document_scope_authorized(payload->>'document_id','share')
 when 'bms.doc.acknowledgements' then convay_private.document_scope_authorized(payload->>'document_id','view')
 else true end));

drop policy if exists convay_records_read on public.convay_entity_records;
create policy convay_records_read on public.convay_entity_records for select to authenticated
 using (((convay_private.registry_authorized(entity_key, 'read'::text) AND
CASE
    WHEN (entity_key = 'bms.documents'::text) THEN convay_private.document_scope_authorized(record_id, 'view'::text)
    WHEN (entity_key = ANY (ARRAY['bms.docversions'::text, 'bms.doc.comments'::text, 'bms.doc.access'::text, 'bms.doc.approvals'::text])) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'view'::text)
    ELSE true
END)) and (case entity_key
 when 'bms.doc.threads' then convay_private.document_scope_authorized(payload->>'document_id','view')
 when 'bms.doc.access_grants' then convay_private.document_scope_authorized(payload->>'document_id','view')
 when 'bms.doc.approvals_v2' then convay_private.document_scope_authorized(payload->>'document_id','view')
 when 'bms.doc.pack_links' then convay_private.document_scope_authorized(payload->>'document_id','view')
 when 'bms.doc.acknowledgements' then convay_private.document_scope_authorized(payload->>'document_id','view')
 else true end));

drop policy if exists convay_records_update on public.convay_entity_records;
create policy convay_records_update on public.convay_entity_records for update to authenticated
 using (((convay_private.registry_authorized(entity_key, 'update'::text) AND
CASE
    WHEN (entity_key = 'bms.documents'::text) THEN convay_private.document_scope_authorized(record_id, 'edit'::text)
    WHEN (entity_key = 'bms.doc.access'::text) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'share'::text)
    WHEN (entity_key = 'bms.doc.comments'::text) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'comment'::text)
    WHEN (entity_key = ANY (ARRAY['bms.docversions'::text, 'bms.doc.approvals'::text])) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'edit'::text)
    ELSE true
END)) and (case entity_key
 when 'bms.doc.threads' then convay_private.document_scope_authorized(payload->>'document_id','comment')
 when 'bms.doc.access_grants' then convay_private.document_scope_authorized(payload->>'document_id','share')
 when 'bms.doc.approvals_v2' then convay_private.document_scope_authorized(payload->>'document_id','approve')
 when 'bms.doc.pack_links' then convay_private.document_scope_authorized(payload->>'document_id','share')
 when 'bms.doc.acknowledgements' then convay_private.document_scope_authorized(payload->>'document_id','view')
 else true end))
 with check (((convay_private.registry_authorized(entity_key, 'update'::text) AND
CASE
    WHEN (entity_key = 'bms.documents'::text) THEN convay_private.document_scope_authorized(record_id, 'edit'::text)
    WHEN (entity_key = 'bms.doc.access'::text) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'share'::text)
    WHEN (entity_key = 'bms.doc.comments'::text) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'comment'::text)
    WHEN (entity_key = ANY (ARRAY['bms.docversions'::text, 'bms.doc.approvals'::text])) THEN convay_private.document_scope_authorized((payload ->> 'document_id'::text), 'edit'::text)
    ELSE true
END)) and (case entity_key
 when 'bms.doc.threads' then convay_private.document_scope_authorized(payload->>'document_id','comment')
 when 'bms.doc.access_grants' then convay_private.document_scope_authorized(payload->>'document_id','share')
 when 'bms.doc.approvals_v2' then convay_private.document_scope_authorized(payload->>'document_id','approve')
 when 'bms.doc.pack_links' then convay_private.document_scope_authorized(payload->>'document_id','share')
 when 'bms.doc.acknowledgements' then convay_private.document_scope_authorized(payload->>'document_id','view')
 else true end));

-- Server-authenticated, append-only acknowledgement and approval evidence.
create or replace function convay_private.enforce_workspace_evidence()
returns trigger language plpgsql security invoker set search_path=''
as $workspace$
declare
 v_actor uuid := auth.uid();
 v_name text;
begin
 if tg_op='DELETE' then
   if old.entity_key in ('bms.doc.acknowledgements','bms.doc.approvals_v2') then
     raise exception 'Document acknowledgements and approvals are append-only'
       using errcode='42501';
   end if;
   return old;
 end if;
 if tg_op='UPDATE' then
   if new.entity_key in ('bms.doc.acknowledgements','bms.doc.approvals_v2')
       or old.entity_key in ('bms.doc.acknowledgements','bms.doc.approvals_v2') then
     raise exception 'Document acknowledgements and approvals are append-only'
       using errcode='42501';
   end if;
   if new.entity_key in ('bms.doc.threads','bms.doc.access_grants','bms.doc.approvals_v2','bms.doc.pack_links','bms.doc.acknowledgements')
       and new.payload->>'document_id' is distinct from old.payload->>'document_id' then
     raise exception 'Document association cannot be reassigned' using errcode='23514';
   end if;
 end if;
 if new.entity_key='bms.doc.acknowledgements' then
   if v_actor is null then raise exception 'Sign-in required' using errcode='42501'; end if;
   select display_name into v_name from public.user_profiles
     where user_id=v_actor and account_status='active';
   if v_name is null then raise exception 'Active user required' using errcode='42501'; end if;
   if lower(btrim(coalesce(new.payload->>'acknowledged_by','')))<>lower(btrim(v_name)) then
      raise exception 'Acknowledgement must identify the signed-in user' using errcode='42501';
   end if;
   new.payload:=jsonb_set(new.payload,'{acknowledged_user_id}',to_jsonb(v_actor::text),true);
   new.payload:=jsonb_set(new.payload,'{acknowledged_at}',to_jsonb(now()),true);
 end if;
 return new;
end
$workspace$;
revoke all on function convay_private.enforce_workspace_evidence() from public,anon,authenticated;
drop trigger if exists convay_workspace_evidence_integrity on public.convay_entity_records;
create trigger convay_workspace_evidence_integrity
 before insert or update or delete on public.convay_entity_records
 for each row execute function convay_private.enforce_workspace_evidence();

create unique index if not exists convay_document_ack_user_unique
 on public.convay_entity_records
 ((payload->>'document_id'),(payload->>'acknowledged_user_id'),coalesce(payload->>'version_id',''))
 where entity_key='bms.doc.acknowledgements';

create index if not exists convay_workspace_document_lookup_idx
 on public.convay_entity_records ((payload->>'document_id'))
 where entity_key in ('bms.doc.threads','bms.doc.access_grants','bms.doc.approvals_v2','bms.doc.pack_links','bms.doc.acknowledgements');

CREATE OR REPLACE FUNCTION convay_private.remove_document_authorized(p_doc text)
 RETURNS text[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_paths text[] :=array[]::text[]; v_deleted integer;
 v_record_id text; v_external_id text;
begin
 if auth.uid() is null or length(coalesce(p_doc,''))=0 or
    not convay_private.document_scope_authorized(p_doc,'delete') then
    raise exception 'Document deletion not permitted' using errcode='42501';
 end if;
 select d.record_id,coalesce(nullif(d.payload->>'doc_id',''),d.record_id)
 into v_record_id,v_external_id from public.convay_entity_records d
 where d.entity_key='bms.documents' and (d.record_id=p_doc or d.payload->>'doc_id'=p_doc);
 if v_record_id is null then raise exception 'Document not found'; end if;
 select coalesce(array_agg(distinct storage_path),array[]::text[]) into v_paths
 from public.convay_document_content
 where document_id in (p_doc,v_record_id,v_external_id) and storage_path is not null;
 insert into convay_private.storage_cleanup_queue(storage_path,document_id,initiated_by)
 select x,p_doc,auth.uid() from unnest(v_paths) as x
 on conflict(storage_path) do update set queued_at=now(),
  completed_at=null,initiated_by=excluded.initiated_by;
 delete from public.convay_entity_records
 where entity_key in ('bms.docversions','bms.doc.comments','bms.doc.access','bms.doc.approvals',
'bms.doc.threads','bms.doc.access_grants','bms.doc.approvals_v2','bms.doc.pack_links','bms.doc.acknowledgements')
  and payload->>'document_id' in (p_doc,v_record_id,v_external_id);
 delete from public.convay_document_content where document_id in (p_doc,v_record_id,v_external_id);
 delete from public.convay_entity_records
 where entity_key='bms.documents' and record_id=v_record_id;
 get diagnostics v_deleted = row_count;
 if v_deleted<>1 then raise exception 'Document not found'; end if;
 return v_paths;
end $function$;
