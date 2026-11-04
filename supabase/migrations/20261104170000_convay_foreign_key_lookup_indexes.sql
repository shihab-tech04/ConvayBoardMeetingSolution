-- Non-destructive FK lookup indexes on the 10 columns identified by Supabase advisors.
-- No RLS, grants, triggers, data, or API semantics change.
-- All affected Convay tables are currently tiny; a standard transactional CREATE INDEX
-- avoids the CREATE INDEX CONCURRENTLY restriction in migration transactions.
create index if not exists convay_registry_types_create_permission_fk_idx on convay_private.registry_types (create_permission);
create index if not exists convay_registry_types_delete_permission_fk_idx on convay_private.registry_types (delete_permission);
create index if not exists convay_registry_types_read_permission_fk_idx on convay_private.registry_types (read_permission);
create index if not exists convay_registry_types_update_permission_fk_idx on convay_private.registry_types (update_permission);
create index if not exists convay_storage_cleanup_queue_initiated_by_fk_idx on convay_private.storage_cleanup_queue (initiated_by);
create index if not exists convay_convay_document_content_created_by_fk_idx on public.convay_document_content (created_by);
create index if not exists convay_convay_document_content_updated_by_fk_idx on public.convay_document_content (updated_by);
create index if not exists convay_convay_entity_records_created_by_fk_idx on public.convay_entity_records (created_by);
create index if not exists convay_convay_entity_records_updated_by_fk_idx on public.convay_entity_records (updated_by);
create index if not exists convay_convay_user_roles_assigned_by_fk_idx on public.convay_user_roles (assigned_by);
