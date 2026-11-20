-- WS-F TEN-04: synthetic PostgreSQL Storage/Auth fixture ONLY.
-- Supabase Storage service, signed URL keys, CDN and bytes are NOT cloned.
-- This fixture deliberately starts with legacy document-ID-first policies.
CREATE SCHEMA storage;
CREATE TABLE storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null,
  name text not null,
  bytes bytea not null,
  owner_id text,
  unique(bucket_id,name)
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO authenticated;

-- An ordinary tenant A member without an ACL on the private A document.
INSERT INTO auth.users(id) VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');
INSERT INTO public.user_profiles(user_id,account_role,account_status)
VALUES ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','user','active');
INSERT INTO auth.sessions(id,user_id,not_after)
VALUES ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',now()+interval '1 day');
INSERT INTO convay_private.tenant_memberships(tenant_id,user_id)
VALUES ('55555555-5555-4555-8555-555555555555',
 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa');

INSERT INTO convay_private.fixture_grants(actor_id,entity_key,action)
SELECT actor,'bms.documents',action
FROM (VALUES ('33333333-3333-4333-8333-333333333333'::uuid),
             ('44444444-4444-4444-8444-444444444444'::uuid),
             ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid),
             ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'::uuid)) a(actor)
CROSS JOIN (VALUES ('read'),('create'),('update'),('delete')) b(action);

-- SQL role catalogue fixture. These tables are *not* a production clone.
CREATE TABLE public.convay_roles(id uuid primary key,status text not null);
CREATE TABLE public.convay_user_roles(
 user_id uuid references auth.users(id),role_id uuid references public.convay_roles(id),
 primary key(user_id,role_id)
);
INSERT INTO public.convay_roles VALUES
 ('cccccccc-cccc-4ccc-8ccc-cccccccccccc','Active');
INSERT INTO public.convay_user_roles VALUES
 ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc');

CREATE OR REPLACE FUNCTION convay_private.has_permission(p_permission text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM convay_private.fixture_grants g
  WHERE g.actor_id=auth.uid() AND g.entity_key='bms.documents'
  AND g.action=CASE p_permission
    WHEN 'doc_view' THEN 'read' WHEN 'doc_upload' THEN 'create'
    WHEN 'doc_edit' THEN 'update' WHEN 'doc_archive' THEN 'delete'
    ELSE 'unsupported' END)
$$;
REVOKE ALL ON FUNCTION convay_private.has_permission(text) FROM public,anon;
GRANT EXECUTE ON FUNCTION convay_private.has_permission(text) TO authenticated;

-- Storage ACLs refer to tenant-owned registry document records, never to
-- bare document IDs across all tenants.
INSERT INTO public.convay_entity_records(
 entity_key,record_id,payload,created_by,tenant_id) VALUES
 ('bms.documents','doc-a',
  '{"id":"doc-a","doc_id":"doc-a","confidentiality":"private"}'::jsonb,
  '33333333-3333-4333-8333-333333333333',
  '55555555-5555-4555-8555-555555555555'),
 ('bms.documents','doc-b',
  '{"id":"doc-b","doc_id":"doc-b","confidentiality":"private"}'::jsonb,
  '44444444-4444-4444-8444-444444444444',
  '66666666-6666-4666-8666-666666666666');

-- Document grants are staged later by the test. Same ID in another tenant
-- must never authorize access across tenant-qualified storage paths.

-- Simulate the prior permissive policies' use of the first path component
-- as document ID, then verify all four must change together.
CREATE OR REPLACE FUNCTION convay_private.legacy_document_access(
 p_document text,p_action text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.convay_entity_records r
   WHERE r.entity_key='bms.documents' AND r.record_id=p_document)
$$;
REVOKE ALL ON FUNCTION convay_private.legacy_document_access(text,text)
 FROM public,anon;
GRANT EXECUTE ON FUNCTION convay_private.legacy_document_access(text,text)
 TO authenticated;

CREATE POLICY convay_doc_objects_select ON storage.objects
 FOR SELECT TO authenticated USING (
 bucket_id='convay-documents' AND
 convay_private.legacy_document_access(split_part(name,'/',1),'view'));
CREATE POLICY convay_doc_objects_insert ON storage.objects
 FOR INSERT TO authenticated WITH CHECK (
 bucket_id='convay-documents' AND
 convay_private.legacy_document_access(split_part(name,'/',1),'upload'));
CREATE POLICY convay_doc_objects_update ON storage.objects
 FOR UPDATE TO authenticated USING (
 bucket_id='convay-documents' AND
 convay_private.legacy_document_access(split_part(name,'/',1),'edit'))
 WITH CHECK (
 bucket_id='convay-documents' AND
 convay_private.legacy_document_access(split_part(name,'/',1),'edit'));
CREATE POLICY convay_doc_objects_delete ON storage.objects
 FOR DELETE TO authenticated USING (
 bucket_id='convay-documents' AND
 convay_private.legacy_document_access(split_part(name,'/',1),'delete'));

-- Stored bytes make this a SQL-byte read test, NOT an HTTP Storage download.
INSERT INTO storage.objects(bucket_id,name,bytes,owner_id) VALUES
 ('convay-documents',
  '55555555-5555-4555-8555-555555555555/doc-a/v1/original',
  convert_to('TENANT_A_PRIVATE_BYTES','UTF8'),
  '33333333-3333-4333-8333-333333333333'),
 ('convay-documents',
  '66666666-6666-4666-8666-666666666666/doc-b/v1/original',
  convert_to('TENANT_B_PRIVATE_BYTES','UTF8'),
  '44444444-4444-4444-8444-444444444444');
