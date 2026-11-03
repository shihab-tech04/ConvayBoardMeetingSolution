-- Preserve one SQL transaction for a document plus its related records and content.
-- Storage objects are cleaned after commit using a durable, private queue.
create table convay_private.storage_cleanup_queue(
 storage_path text primary key,
 document_id text not null,
 initiated_by uuid references auth.users(id) on delete set null,
 queued_at timestamptz not null default now(),
 completed_at timestamptz
);
revoke all on convay_private.storage_cleanup_queue from public,anon,authenticated;
alter table convay_private.storage_cleanup_queue enable row level security;

create function convay_private.remove_document_authorized(p_doc text)
returns text[] language plpgsql security definer set search_path='' as $$
declare v_paths text[] :=array[]::text[]; v_deleted integer;
begin
 if auth.uid() is null or length(coalesce(p_doc,''))=0 or
    not convay_private.document_scope_authorized(p_doc,'delete') then
    raise exception 'Document deletion not permitted' using errcode='42501';
 end if;
 select coalesce(array_agg(distinct storage_path),array[]::text[]) into v_paths
 from public.convay_document_content
 where document_id=p_doc and storage_path is not null;
 insert into convay_private.storage_cleanup_queue(storage_path,document_id,initiated_by)
 select x,p_doc,auth.uid() from unnest(v_paths) as x
 on conflict(storage_path) do update set queued_at=now(),
  completed_at=null,initiated_by=excluded.initiated_by;
 delete from public.convay_entity_records
 where entity_key in ('bms.docversions','bms.doc.comments','bms.doc.access','bms.doc.approvals')
  and payload->>'document_id'=p_doc;
 delete from public.convay_document_content where document_id=p_doc;
 delete from public.convay_entity_records
 where entity_key='bms.documents' and record_id=p_doc;
 get diagnostics v_deleted = row_count;
 if v_deleted<>1 then raise exception 'Document not found'; end if;
 return v_paths;
end $$;
revoke all on function convay_private.remove_document_authorized(text) from public,anon;
grant execute on function convay_private.remove_document_authorized(text) to authenticated;
create function public.convay_remove_document(p_document_id text)
returns text[] language sql security invoker set search_path='' as $$
 select convay_private.remove_document_authorized(p_document_id);
$$;
revoke all on function public.convay_remove_document(text) from public,anon;
grant execute on function public.convay_remove_document(text) to authenticated;

create function convay_private.storage_delete_allowed(p_path text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(convay_private.document_scope_authorized(split_part(p_path,'/',1),'delete'),false)
 or exists(
  select 1 from convay_private.storage_cleanup_queue q
  where q.storage_path=p_path and q.completed_at is null
   and (q.initiated_by=auth.uid() or exists(
     select 1 from public.user_profiles p where p.user_id=auth.uid()
       and p.account_status='active' and p.account_role='super_admin'))
 );
$$;
revoke all on function convay_private.storage_delete_allowed(text) from public,anon;
grant execute on function convay_private.storage_delete_allowed(text) to authenticated;
drop policy if exists convay_doc_objects_delete on storage.objects;
create policy convay_doc_objects_delete on storage.objects for delete to authenticated
 using (bucket_id='convay-documents' and convay_private.storage_delete_allowed(name));

create function convay_private.confirm_storage_cleanup(p_paths text[])
returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if auth.uid() is null or cardinality(coalesce(p_paths,array[]::text[]))>100
 then raise exception 'Invalid cleanup request' using errcode='42501'; end if;
 update convay_private.storage_cleanup_queue q set completed_at=now()
 where q.storage_path=any(coalesce(p_paths,array[]::text[]))
  and q.completed_at is null
  and (q.initiated_by=auth.uid() or exists(
    select 1 from public.user_profiles p where p.user_id=auth.uid()
     and p.account_status='active' and p.account_role='super_admin'))
  and not exists (select 1 from storage.objects o
     where o.bucket_id='convay-documents' and o.name=q.storage_path);
 get diagnostics n=row_count;
 return n;
end $$;
revoke all on function convay_private.confirm_storage_cleanup(text[]) from public,anon;
grant execute on function convay_private.confirm_storage_cleanup(text[]) to authenticated;
create function public.convay_confirm_storage_cleanup(p_storage_paths text[])
returns integer language sql security invoker set search_path='' as $$
 select convay_private.confirm_storage_cleanup(p_storage_paths);
$$;
revoke all on function public.convay_confirm_storage_cleanup(text[]) from public,anon;
grant execute on function public.convay_confirm_storage_cleanup(text[]) to authenticated;
