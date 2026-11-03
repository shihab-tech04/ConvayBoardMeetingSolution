-- Persist editor content, converted HTML, spreadsheet workbooks,
-- annotations and version snapshots independently of browser storage.
create table public.convay_document_content(
 id text primary key check(length(id) between 3 and 220),
 document_id text not null check(length(document_id) between 1 and 160),
 version_id text,
 content_type text not null check(content_type in
  ('editor_json','original_file','version_snapshot','converted_html',
   'spreadsheet_workbook','spreadsheet_snapshot','pdf_annotations','pdf_annotation_snapshot')),
 content text,
 storage_path text,
 mime_type text,
 file_name text,
 stored_at timestamptz not null default now(),
 size bigint not null default 0 check(size >= 0),
 created_by uuid references auth.users(id) on delete set null default auth.uid(),
 updated_by uuid references auth.users(id) on delete set null default auth.uid()
);
create index convay_document_content_by_doc on public.convay_document_content(document_id,stored_at desc);
alter table public.convay_document_content enable row level security;
revoke all on public.convay_document_content from public,anon,authenticated;
grant select,insert,update(id,document_id,version_id,content_type,content,storage_path,mime_type,file_name,stored_at,size),delete
 on public.convay_document_content to authenticated;
create policy convay_document_content_select on public.convay_document_content
 for select to authenticated using (convay_private.has_permission('doc_view'));
create policy convay_document_content_create on public.convay_document_content
 for insert to authenticated with check
 (convay_private.has_permission('doc_upload') or convay_private.has_permission('doc_edit'));
create policy convay_document_content_update on public.convay_document_content
 for update to authenticated using (convay_private.has_permission('doc_edit'))
 with check(convay_private.has_permission('doc_edit'));
create policy convay_document_content_delete on public.convay_document_content
 for delete to authenticated using (convay_private.has_permission('doc_archive'));

create function convay_private.track_document_content() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then
   if new.document_id is distinct from old.document_id or
      new.id is distinct from old.id then
     raise exception 'Cannot reparent document content';
   end if;
   new.updated_by:=auth.uid();
 end if;
 if tg_op='INSERT' then
   new.created_by:=auth.uid();
   new.updated_by:=auth.uid();
 end if;
 return new;
end $$;
revoke all on function convay_private.track_document_content() from public,anon,authenticated;
create trigger convay_document_content_tracking before insert or update on public.convay_document_content
 for each row execute function convay_private.track_document_content();

-- Private Storage bucket; signed-in users still need server-validated SQL permission.
insert into storage.buckets(id,name,public,file_size_limit)
values('convay-documents','convay-documents',false,15728640)
on conflict(id) do nothing;
create policy convay_doc_objects_select on storage.objects
 for select to authenticated using
 (bucket_id='convay-documents' and convay_private.has_permission('doc_view'));
create policy convay_doc_objects_insert on storage.objects
 for insert to authenticated with check
 (bucket_id='convay-documents' and convay_private.has_permission('doc_upload'));
create policy convay_doc_objects_update on storage.objects
 for update to authenticated using
 (bucket_id='convay-documents' and convay_private.has_permission('doc_edit'))
 with check(bucket_id='convay-documents' and convay_private.has_permission('doc_edit'));
create policy convay_doc_objects_delete on storage.objects
 for delete to authenticated using
 (bucket_id='convay-documents' and convay_private.has_permission('doc_archive'));
