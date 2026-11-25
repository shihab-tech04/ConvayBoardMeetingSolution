-- TEN-360-02: attach an existing, verified Convay user to a provisioning
-- company using the authoritative, audited tenant-control SQL mutation.
-- This is not an invitation sender or a tenant/workspace activation.
create or replace function public.convay_company_member_enroll(
 p_tenant_id uuid,p_email text,p_member_role text,p_request_id uuid
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_is_platform_root boolean:=false;
 v_user_id uuid;
 v_email text:=lower(pg_catalog.btrim(coalesce(p_email,'')));
 v_tenant convay_private.tenants%rowtype;
 v_receipt jsonb;
begin
 select p.account_role='super_admin' into v_is_platform_root
 from public.user_profiles p
 where p.user_id=v_actor and p.account_status='active';
 if v_actor is null or not exists (
  select 1 from public.user_profiles p
  where p.user_id=v_actor and p.account_status='active'
 ) then
  raise exception 'Active authenticated administrator required' using errcode='42501';
 end if;
 if p_tenant_id is null or p_request_id is null or
    v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or
    length(v_email)>254 or
    p_member_role not in ('member','tenant_admin') then
  raise exception 'Valid company, email, role and request ID required' using errcode='22023';
 end if;
 select * into v_tenant from convay_private.tenants t
 where t.id=p_tenant_id;
 if not found then raise exception 'Company not found' using errcode='P0002';end if;
 if v_tenant.lifecycle_state not in ('provisioning','active') then
  raise exception 'Company is not accepting members' using errcode='42501';
 end if;
 if not convay_private.tenant_admin_authorized(p_tenant_id) then
  raise exception 'Company membership administration denied' using errcode='42501';
 end if;
 -- Only the Platform Super Admin may grant Company Super Admin.
 -- No self-reported JWT metadata, client role, or email claim grants access.
 if p_member_role='tenant_admin' and not coalesce(v_is_platform_root,false) then
  raise exception 'Platform Super Admin required to appoint a Company Super Admin'
    using errcode='42501';
 end if;
 select p.user_id into v_user_id
 from public.user_profiles p
 join auth.users a on a.id=p.user_id
 where lower(pg_catalog.btrim(p.email))=v_email
   and lower(pg_catalog.btrim(a.email))=v_email
   and a.email_confirmed_at is not null
   and p.account_status='active'
   and p.account_role='user'
   and exists (
     select 1 from public.convay_user_roles ur
     join public.convay_roles r on r.id=ur.role_id
     where ur.user_id=p.user_id and r.status='Active'
   );
 if v_user_id is null then
  raise exception 'Verified active account with an assigned role not found'
    using errcode='P0002';
 end if;
 -- Reuse the existing idempotent mutation, tenant authorization, audit record,
 -- last-admin guard and transactional receipt. No direct membership write here.
 v_receipt:=public.convay_tenant_admin(
   'add_member',p_request_id,p_tenant_id,null,v_user_id,p_member_role);
 if v_receipt->>'action' <> 'add_member'
    or v_receipt->>'tenant_id' <> p_tenant_id::text
    or v_receipt->>'member_user_id' <> v_user_id::text
    or v_receipt->>'request_id' <> p_request_id::text
    or v_receipt->>'tenant_active' <> 'false' then
   raise exception 'Tenant SQL did not confirm the membership receipt'
     using errcode='P0001';
 end if;
 return pg_catalog.jsonb_build_object(
  'tenant_id',p_tenant_id,
  'member_user_id',v_user_id,'member_role',p_member_role,
  'action','add_member','request_id',p_request_id,
  'audit_event_id',v_receipt->'audit_event_id',
  'tenant_active',false,'meeting_access_activated',false);
end $fn$;
revoke all on function public.convay_company_member_enroll(uuid,text,text,uuid)
 from public,anon,authenticated;
grant execute on function public.convay_company_member_enroll(uuid,text,text,uuid)
 to authenticated;
comment on function public.convay_company_member_enroll(uuid,text,text,uuid) is
'Enroll an existing verified Convay account into one company, via audited tenant RPC; Company Super Admin grants require Platform Super Admin. No activation.';