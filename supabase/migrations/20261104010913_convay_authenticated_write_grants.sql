-- Supabase Data API requires both table privileges and restrictive RLS policies.
-- Existing record and document policies enforce per-operation/row authorization.
-- Do not grant to anon and do not disable RLS.
grant insert, update on public.convay_entity_records to authenticated;
grant update on public.convay_document_content to authenticated;
