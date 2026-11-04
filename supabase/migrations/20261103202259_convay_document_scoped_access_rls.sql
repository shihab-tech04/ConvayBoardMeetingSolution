
-- Document metadata, content, and storage must agree on explicit access.
-- Private SECURITY DEFINER helper reads the access registry without RLS recursion;
-- the caller's JWT identity and effective permission are validated every time.
create function convay_private.document_scope_authorized(p_doc text,p_action text)
returns boolean language plpgsql stable security definer set search_path='' as $$
declare
 v_actor uuid := auth.uid();
 v_perm text;
 v_owner uuid;
 v_confidentiality text;
 v_has_shares boolean;
 v_granted boolean;
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
 select d.created_by,lower(coalesce(d.payload->>'confidentiality',''))
 into v_owner,v_confidentiality from public.convay_entity_records d
 where d.entity_key='bms.documents' and d.record_id=p_doc;
 if not found then return false; end if;
 if exists(select 1 from public.user_profiles p
     where p.user_id=v_actor and p.account_status='active' and p.account_role='super_admin')
 then return true; end if;
 if v_owner=v_actor then return true; end if;
 select exists(select 1 from public.convay_entity_records a where a.entity_key='bms.doc.access'
  and a.payload->>'document_id'=p_doc) into v_has_shares;
 if not v_has_shares and v_confidentiality !~ '(confidential|restricted|private|secret|sensitive)'
 then return true; end if;
 select exists(
  select 1 from public.convay_entity_records a
  where a.entity_key='bms.doc.access'
    and a.payload->>'document_id'=p_doc
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
end $$;
revoke all on function convay_private.document_scope_authorized(text,text) from public,anon;
grant execute on function convay_private.document_scope_authorized(text,text) to authenticated;

-- Apply document restrictions to the authoritative JSONB metadata registry.
drop policy if exists convay_records_read on public.convay_entity_records;
create policy convay_records_read on public.convay_entity_records for select to authenticated
 using (convay_private.registry_authorized(entity_key,'read') and
 case when entity_key='bms.documents'
    then convay_private.document_scope_authorized(record_id,'view')
   when entity_key in ('bms.docversions','bms.doc.comments','bms.doc.access','bms.doc.approvals')
    then convay_private.document_scope_authorized(payload->>'document_id','view')
   else true end);

drop policy if exists convay_records_create on public.convay_entity_records;
create policy convay_records_create on public.convay_entity_records for insert to authenticated
 with check (convay_private.registry_authorized(entity_key,'create') and
 case when entity_key='bms.doc.access'
    then convay_private.document_scope_authorized(payload->>'document_id','share')
   when entity_key='bms.doc.comments'
    then convay_private.document_scope_authorized(payload->>'document_id','comment')
   when entity_key='bms.docversions'
    then convay_private.document_scope_authorized(payload->>'document_id','edit')
   when entity_key='bms.doc.approvals'
    then convay_private.document_scope_authorized(payload->>'document_id','view')
   else true end);

drop policy if exists convay_records_update on public.convay_entity_records;
create policy convay_records_update on public.convay_entity_records for update to authenticated
 using (convay_private.registry_authorized(entity_key,'update') and
 case when entity_key='bms.documents' then convay_private.document_scope_authorized(record_id,'edit')
  when entity_key='bms.doc.access' then convay_private.document_scope_authorized(payload->>'document_id','share')
  when entity_key='bms.doc.comments' then convay_private.document_scope_authorized(payload->>'document_id','comment')
  when entity_key in ('bms.docversions','bms.doc.approvals') then convay_private.document_scope_authorized(payload->>'document_id','edit')
  else true end)
 with check (convay_private.registry_authorized(entity_key,'update') and
 case when entity_key='bms.documents' then convay_private.document_scope_authorized(record_id,'edit')
  when entity_key='bms.doc.access' then convay_private.document_scope_authorized(payload->>'document_id','share')
  when entity_key='bms.doc.comments' then convay_private.document_scope_authorized(payload->>'document_id','comment')
  when entity_key in ('bms.docversions','bms.doc.approvals') then convay_private.document_scope_authorized(payload->>'document_id','edit')
  else true end);

drop policy if exists convay_records_delete on public.convay_entity_records;
create policy convay_records_delete on public.convay_entity_records for delete to authenticated
 using (convay_private.registry_authorized(entity_key,'delete') and
 case when entity_key='bms.documents' then convay_private.document_scope_authorized(record_id,'delete')
  when entity_key='bms.doc.access' then convay_private.document_scope_authorized(payload->>'document_id','share')
  when entity_key='bms.doc.comments' then convay_private.document_scope_authorized(payload->>'document_id','comment')
  when entity_key in ('bms.docversions','bms.doc.approvals') then convay_private.document_scope_authorized(payload->>'document_id','edit')
  else true end);

-- Content cannot be read or edited solely because a user has a broad module grant.
drop policy if exists convay_document_content_select on public.convay_document_content;
create policy convay_document_content_select on public.convay_document_content
 for select to authenticated using (convay_private.document_scope_authorized(document_id,'view'));
drop policy if exists convay_document_content_create on public.convay_document_content;
create policy convay_document_content_create on public.convay_document_content
 for insert to authenticated with check (convay_private.document_scope_authorized(document_id,'upload')
   or convay_private.document_scope_authorized(document_id,'edit'));
drop policy if exists convay_document_content_update on public.convay_document_content;
create policy convay_document_content_update on public.convay_document_content
 for update to authenticated using (convay_private.document_scope_authorized(document_id,'edit'))
 with check (convay_private.document_scope_authorized(document_id,'edit'));
drop policy if exists convay_document_content_delete on public.convay_document_content;
create policy convay_document_content_delete on public.convay_document_content
 for delete to authenticated using (convay_private.document_scope_authorized(document_id,'delete'));

drop policy if exists convay_doc_objects_select on storage.objects;
create policy convay_doc_objects_select on storage.objects for select to authenticated
 using (bucket_id='convay-documents'
   and convay_private.document_scope_authorized(split_part(name,'/',1),'view'));
drop policy if exists convay_doc_objects_insert on storage.objects;
create policy convay_doc_objects_insert on storage.objects for insert to authenticated
 with check (bucket_id='convay-documents'
   and convay_private.document_scope_authorized(split_part(name,'/',1),'upload'));
drop policy if exists convay_doc_objects_update on storage.objects;
create policy convay_doc_objects_update on storage.objects for update to authenticated
 using (bucket_id='convay-documents' and convay_private.document_scope_authorized(split_part(name,'/',1),'edit'))
 with check(bucket_id='convay-documents' and convay_private.document_scope_authorized(split_part(name,'/',1),'edit'));
drop policy if exists convay_doc_objects_delete on storage.objects;
create policy convay_doc_objects_delete on storage.objects for delete to authenticated
 using (bucket_id='convay-documents' and convay_private.document_scope_authorized(split_part(name,'/',1),'delete'));
