-- Trusted member directory for meeting assignments and governance selectors.
-- Credentials, app secrets and inactive accounts are never exposed.
create function public.convay_member_directory()
returns table (
 user_id uuid,
 display_name text,
 email text,
 phone text,
 employee_id text,
 user_type text,
 role_ids uuid[],
 role_names text[]
) language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(
   select 1 from public.user_profiles p
   where p.user_id=(select auth.uid()) and p.account_status='active'
 ) then
   raise exception 'Active sign-in required';
 end if;
 if not (
   convay_private.has_permission('mtg_view')
   or convay_private.has_permission('mtg_create')
   or convay_private.has_permission('gov_org_view')
   or convay_private.has_permission('gov_group_view')
   or convay_private.has_permission('admin_users')
 ) then raise exception 'Member directory access denied';
 end if;
 return query
 select p.user_id,p.display_name,p.email,p.phone,p.employee_id,p.user_type,
   coalesce((select array_agg(r.id order by r.name)
    from public.convay_user_roles ur join public.convay_roles r on r.id=ur.role_id
    where ur.user_id=p.user_id and r.status='Active'),array[]::uuid[]) as role_ids,
   coalesce((select array_agg(r.name order by r.name)
    from public.convay_user_roles ur join public.convay_roles r on r.id=ur.role_id
    where ur.user_id=p.user_id and r.status='Active'),array[]::text[]) as role_names
 from public.user_profiles p where p.account_status='active'
 order by p.display_name;
end $$;
revoke all on function public.convay_member_directory() from PUBLIC,anon;
grant execute on function public.convay_member_directory() to authenticated;
