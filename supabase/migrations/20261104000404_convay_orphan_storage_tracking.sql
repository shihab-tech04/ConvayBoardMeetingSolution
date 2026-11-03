-- Track displaced/replaced Storage blobs before document metadata changes.
-- Their cleanup remains recoverable even if a browser closes mid-operation.
create function convay_private.enqueue_displaced_document_blob()
returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.storage_path is not null and
   (tg_op='DELETE' or new.storage_path is distinct from old.storage_path) then
   insert into convay_private.storage_cleanup_queue
    (storage_path,document_id,initiated_by)
   values(old.storage_path,old.document_id,auth.uid())
   on conflict(storage_path) do update set queued_at=now(),
      initiated_by=excluded.initiated_by,completed_at=null;
 end if;
 return null;
end $$;
revoke all on function convay_private.enqueue_displaced_document_blob()
 from public,anon,authenticated;
create trigger convay_queue_displaced_document_blobs
 after delete or update of storage_path on public.convay_document_content
 for each row execute function convay_private.enqueue_displaced_document_blob();
create index convay_entity_document_access_idx
 on public.convay_entity_records ((payload->>'document_id'))
 where entity_key in ('bms.doc.access','bms.doc.comments','bms.doc.approvals','bms.docversions');
