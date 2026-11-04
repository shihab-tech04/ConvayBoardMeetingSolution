-- Least-privilege member directory. The public RPC exposes only permitted data.
-- Contact and employee identifiers are private to their owner or to user administrators.
-- No service-role credentials or user metadata are trusted for access decisions.
create or replace function public.convay_member_directory()
returns table (
 user_id uuid,
 display_name text,
 email text,
 phone text,
 employee_id text,
 user_type text,
 role_ids uuid[],
 role_names text[]
)
language plpgsql stable security definer set search_path='' as $directory$
declare
  v_actor uuid := (select auth.uid());
  v_can_admin_users boolean;
begin
  if v_actor is null or not exists (
    select 1 from public.user_profiles p
    where p.user_id=v_actor and p.account_status='active'
  ) then
    raise exception 'Active sign-in required' using errcode='42501';
  end if;
  v_can_admin_users := convay_private.has_permission('admin_users');
  if not (
    v_can_admin_users
    or convay_private.has_permission('mtg_view')
    or convay_private.has_permission('mtg_create')
    or convay_private.has_permission('gov_org_view')
    or convay_private.has_permission('gov_group_view')
  ) then
    raise exception 'Member directory access denied' using errcode='42501';
  end if;

  return query
  select p.user_id,
         p.display_name,
         case when v_can_admin_users or p.user_id=v_actor then coalesce(p.email,'') else '' end,
         case when v_can_admin_users or p.user_id=v_actor then coalesce(p.phone,'') else '' end,
         case when v_can_admin_users or p.user_id=v_actor then coalesce(p.employee_id,'') else '' end,
         p.user_type,
         coalesce((select array_agg(r.id order by r.name)
           from public.convay_user_roles ur
           join public.convay_roles r on r.id=ur.role_id
           where ur.user_id=p.user_id and r.status='Active'),array[]::uuid[]),
         coalesce((select array_agg(r.name order by r.name)
           from public.convay_user_roles ur
           join public.convay_roles r on r.id=ur.role_id
           where ur.user_id=p.user_id and r.status='Active'),array[]::text[])
  from public.user_profiles p
  where p.account_status='active'
  order by p.display_name;
end
$directory$;
revoke all on function public.convay_member_directory() from public,anon;
grant execute on function public.convay_member_directory() to authenticated;