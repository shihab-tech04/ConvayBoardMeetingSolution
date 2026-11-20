-- WS-F TEN-04 — executable PRIVATE STORAGE scope candidate, TEST-ONLY.
-- NOT a production migration. Do not run until cross-owner activation proves
-- content/cleanup tenant FK, path migration, immutable object versions, signed
-- URL capability expiry/revocation and native Auth/SQL/Storage recovery.
-- Existing Storage policies use DOC_ID as first path segment; a safe migration
-- must replace all four together after translating paths to TENANT/DOC_ID/...
-- Authorization NEVER trusts user_metadata or client-supplied tenant context.

CREATE OR REPLACE FUNCTION convay_private.tenant_document_storage_authorized(
 p_bucket text,p_path text,p_action text
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $$
DECLARE
 v_tenant_text text;
 v_tenant uuid;
 v_document text;
 v_actor uuid := auth.uid();
 v_perm text;
 v_doc_owner uuid;
 v_confidentiality text;
 v_doc_record text;
 v_doc_external text;
 v_have_shares boolean;
BEGIN
 IF p_bucket IS DISTINCT FROM 'convay-documents' OR p_path IS NULL
    OR v_actor IS NULL OR p_action NOT IN ('view','upload','edit','delete')
 THEN RETURN false; END IF;
 -- Immutable namespaced path: <tenant UUID>/<document>/<version>/<object>.
 -- Reject empty/traversal segments; the Storage API must supply canonical,
 -- decoded paths and must never treat percent-encoded separators as safe.
 v_tenant_text := split_part(p_path,'/',1);
 v_document := split_part(p_path,'/',2);
 IF v_tenant_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    OR v_document !~ '^[a-zA-Z0-9._-]{1,180}$'
    OR v_document IN ('.','..')
    OR split_part(p_path,'/',3) IN ('','.','..')
    OR split_part(p_path,'/',4) IN ('','.','..')
    OR p_path LIKE '%//%'
    OR p_path LIKE '%/../%'
    OR p_path LIKE '%/./%'
    OR p_path LIKE '%\\%'
    OR p_path LIKE '%%%'
 THEN
   -- Last predicate is overridden below: this fixture deliberately denies
   -- percent escapes until a reviewed canonical URL decoder is integrated.
   RETURN false;
 END IF;
 v_tenant := v_tenant_text::uuid;
 IF NOT coalesce(convay_private.tenant_actor_authorized(v_tenant),false)
 THEN RETURN false; END IF;
 v_perm := CASE p_action
   WHEN 'view' THEN 'doc_view'
   WHEN 'upload' THEN 'doc_upload'
   WHEN 'edit' THEN 'doc_edit'
   WHEN 'delete' THEN 'doc_archive' END;
 IF v_perm IS NULL OR NOT convay_private.has_permission(v_perm)
 THEN RETURN false; END IF;

 -- Root roles never bypass membership; both record and share MUST be scoped.
 SELECT d.created_by,lower(coalesce(d.payload->>'confidentiality','')),
   d.record_id,coalesce(nullif(d.payload->>'doc_id',''),d.record_id)
 INTO v_doc_owner,v_confidentiality,v_doc_record,v_doc_external
 FROM public.convay_entity_records d
 WHERE d.tenant_id=v_tenant AND d.entity_key='bms.documents'
   AND (d.record_id=v_document OR d.payload->>'doc_id'=v_document)
 LIMIT 1;
 IF NOT FOUND THEN RETURN false; END IF;
 IF v_doc_owner=v_actor THEN RETURN true; END IF;

 SELECT EXISTS (
   SELECT 1 FROM public.convay_entity_records a
   WHERE a.tenant_id=v_tenant
     AND a.entity_key IN ('bms.doc.access','bms.doc.access_grants')
     AND a.payload->>'document_id' IN (v_document,v_doc_record,v_doc_external)
 ) INTO v_have_shares;

 IF p_action='view' AND NOT v_have_shares
    AND v_confidentiality !~ '(private|confidential|restricted|secret|sensitive)'
 THEN RETURN true; END IF;

 RETURN EXISTS (
   SELECT 1 FROM public.convay_entity_records a
   WHERE a.tenant_id=v_tenant
     AND a.entity_key IN ('bms.doc.access','bms.doc.access_grants')
     AND a.payload->>'document_id' IN (v_document,v_doc_record,v_doc_external)
     AND (
       a.payload->>'expires_at' IS NULL
       OR (a.payload->>'expires_at') ~ '^\\d{4}-\\d{2}-\\d{2}'
         AND (a.payload->>'expires_at')::timestamptz > now()
     )
     AND (
       (a.payload->>'subject_type'='user'
         AND a.payload->>'subject_id'=v_actor::text)
       OR (a.payload->>'subject_type'='role'
         AND EXISTS (
           SELECT 1 FROM public.convay_user_roles ur
           JOIN public.convay_roles r ON r.id=ur.role_id
           WHERE ur.user_id=v_actor AND r.status='Active'
             AND r.id::text=a.payload->>'subject_id'
         ))
     )
     AND (CASE p_action
       WHEN 'view' THEN a.payload->>'permission' IN ('view','comment','edit','admin')
       WHEN 'upload' THEN a.payload->>'permission' IN ('edit','admin')
       WHEN 'edit' THEN a.payload->>'permission' IN ('edit','admin')
       WHEN 'delete' THEN a.payload->>'permission'='admin'
       ELSE false
     END)
 );
END;
$$;
REVOKE ALL ON FUNCTION convay_private.tenant_document_storage_authorized(text,text,text)
 FROM public,anon;
GRANT EXECUTE ON FUNCTION convay_private.tenant_document_storage_authorized(text,text,text)
 TO authenticated;

-- Existing legacy RLS predicates resolve doc ID from the FIRST path segment.
-- New immutable tenant prefix is incompatible. ALL FOUR must transition as
-- one approved, independently recovered migration (not silently coexist).
DO $pre$
BEGIN
 IF (SELECT count(*) FROM pg_policies
   WHERE schemaname='storage' AND tablename='objects'
     AND policyname IN ('convay_doc_objects_select','convay_doc_objects_insert',
       'convay_doc_objects_update','convay_doc_objects_delete'))<>4
 THEN RAISE EXCEPTION 'TEN-04 baseline Storage policy signatures missing'; END IF;
END $pre$;

DROP POLICY convay_doc_objects_select ON storage.objects;
DROP POLICY convay_doc_objects_insert ON storage.objects;
DROP POLICY convay_doc_objects_update ON storage.objects;
DROP POLICY convay_doc_objects_delete ON storage.objects;

CREATE POLICY convay_doc_objects_select ON storage.objects FOR SELECT TO authenticated
 USING (convay_private.tenant_document_storage_authorized(bucket_id,name,'view'));
CREATE POLICY convay_doc_objects_insert ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (convay_private.tenant_document_storage_authorized(bucket_id,name,'upload'));
CREATE POLICY convay_doc_objects_update ON storage.objects FOR UPDATE TO authenticated
 USING (convay_private.tenant_document_storage_authorized(bucket_id,name,'edit'))
 WITH CHECK (convay_private.tenant_document_storage_authorized(bucket_id,name,'edit'));
CREATE POLICY convay_doc_objects_delete ON storage.objects FOR DELETE TO authenticated
 USING (convay_private.tenant_document_storage_authorized(bucket_id,name,'delete'));

-- Prevent a future permissive Storage policy from bypassing tenant isolation.
CREATE POLICY convay_wsf_storage_tenant_select ON storage.objects AS RESTRICTIVE
 FOR SELECT TO authenticated
 USING (
   bucket_id<>'convay-documents'
   OR convay_private.tenant_document_storage_authorized(bucket_id,name,'view'));
CREATE POLICY convay_wsf_storage_tenant_insert ON storage.objects AS RESTRICTIVE
 FOR INSERT TO authenticated
 WITH CHECK (
   bucket_id<>'convay-documents'
   OR convay_private.tenant_document_storage_authorized(bucket_id,name,'upload'));
CREATE POLICY convay_wsf_storage_tenant_update ON storage.objects AS RESTRICTIVE
 FOR UPDATE TO authenticated
 USING (
   bucket_id<>'convay-documents'
   OR convay_private.tenant_document_storage_authorized(bucket_id,name,'edit'))
 WITH CHECK (
   bucket_id<>'convay-documents'
   OR convay_private.tenant_document_storage_authorized(bucket_id,name,'edit'));
CREATE POLICY convay_wsf_storage_tenant_delete ON storage.objects AS RESTRICTIVE
 FOR DELETE TO authenticated
 USING (
   bucket_id<>'convay-documents'
   OR convay_private.tenant_document_storage_authorized(bucket_id,name,'delete'));
