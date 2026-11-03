-- Let an uploader remove ONLY their recent unreferenced staging blob after SQL
-- metadata persistence fails. Uploaded files referenced by documents remain protected.
create or replace function convay_private.storage_delete_allowed(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(convay_private.document_scope_authorized(split_part(p_path,'/',1),'delete'),false)
 or exists(
  select 1 from convay_private.storage_cleanup_queue q
  where q.storage_path=p_path and q.completed_at is null
   and (q.initiated_by=auth.uid() or exists(
     select 1 from public.user_profiles p where p.user_id=auth.uid()
       and p.account_status='active' and p.account_role='super_admin'))
 )
 or exists(
  select 1 from storage.objects o
  where o.bucket_id='convay-documents' and o.name=p_path
    and o.owner_id=auth.uid()::text and o.created_at > now() - interval '15 minutes'
    and convay_private.document_scope_authorized(split_part(p_path,'/',1),'upload')
    and not exists(
      select 1 from public.convay_document_content c where c.storage_path=p_path)
 );
$$;
