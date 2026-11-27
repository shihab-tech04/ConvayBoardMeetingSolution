-- Staged only; no hosted SQL change. Preserve owner, ACL and existing permission/share semantics.
-- A read-only VOLATILE helper takes a current command snapshot for PostgREST
-- INSERT ... RETURNING. STABLE sees the pre-insert snapshot and falsely denies
-- the newly inserted document's SELECT policy. All scope checks remain intact.
CREATE OR REPLACE FUNCTION convay_private.document_scope_authorized(p_doc text, p_action text)
 RETURNS boolean
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
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
 v_tenant uuid;
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
 -- Resolve both supported aliases to exactly one authoritative parent.
 -- A record-id/external-id collision must fail closed, not select an arbitrary row.
 begin
  select d.created_by,lower(coalesce(d.payload->>'confidentiality','')),
         d.record_id,coalesce(nullif(d.payload->>'doc_id',''),d.record_id),d.tenant_id
  into strict v_owner,v_confidentiality,v_record_id,v_external_id,v_tenant
  from public.convay_entity_records d
  where d.entity_key='bms.documents'
    and (d.record_id=p_doc or d.payload->>'doc_id'=p_doc);
 exception when no_data_found or too_many_rows then return false;
 end;
 -- The SECURITY DEFINER lookup bypasses table RLS. Apply the same mandatory
 -- tenant/legacy boundary before ANY owner, root or explicit share grant.
 if (v_tenant is null and not coalesce(convay_private.legacy_unscoped_authorized(),false))
 or (v_tenant is not null and not coalesce(convay_private.tenant_member_active(v_tenant),false))
 then return false; end if;
 if exists(select 1 from public.user_profiles p
     where p.user_id=v_actor and p.account_status='active' and p.account_role='super_admin')
 then return true; end if;
 if v_owner=v_actor then return true; end if;
 select exists(select 1 from public.convay_entity_records a where a.entity_key in ('bms.doc.access','bms.doc.access_grants')
  and a.tenant_id is not distinct from v_tenant
    and a.payload->>'document_id' in (p_doc,v_record_id,v_external_id)) into v_has_shares;
 if not v_has_shares and v_confidentiality !~ '(confidential|restricted|private|secret|sensitive)'
 then return true; end if;
 select exists(
  select 1 from public.convay_entity_records a
  where a.entity_key in ('bms.doc.access','bms.doc.access_grants')
    and a.tenant_id is not distinct from v_tenant
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
