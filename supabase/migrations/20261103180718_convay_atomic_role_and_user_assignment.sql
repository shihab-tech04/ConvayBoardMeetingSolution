-- Service-only atomic updates: validate every code before replacing a role's grants.
create function public.convay_save_role(
 p_id uuid, p_name text, p_description text, p_level text,
 p_status text, p_permissions text[]
) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_codes text[]; v_count int;
begin
 if p_name is null or length(btrim(p_name)) not between 2 and 100 then
  raise exception 'Role name must contain 2-100 characters';
 end if;
 if p_status not in ('Active','Inactive') then raise exception 'Invalid role status'; end if;
 v_codes := array(select distinct x from unnest(coalesce(p_permissions,'{}'::text[])) as x);
 select count(*) into v_count from public.convay_permissions where id=any(v_codes);
 if v_count <> cardinality(v_codes) then raise exception 'Unknown permission identifier'; end if;
 if p_id is null then
  insert into public.convay_roles(name,description,level,status)
  values (btrim(p_name),left(coalesce(p_description,''),2000),left(coalesce(p_level,'Custom'),100),p_status)
  returning id into v_id;
 else
  select id into v_id from public.convay_roles where id=p_id for update;
  if v_id is null then raise exception 'Role not found'; end if;
  if exists(select 1 from public.convay_roles where id=v_id and is_system_role) then
    raise exception 'The Super Admin role cannot be edited';
  end if;
  update public.convay_roles set name=btrim(p_name),
    description=left(coalesce(p_description,''),2000),
    level=left(coalesce(p_level,'Custom'),100),
    status=p_status, updated_at=now()
  where id=v_id;
 end if;
 delete from public.convay_role_permissions rp
 where rp.role_id=v_id and not (rp.permission_id=any(v_codes));
 insert into public.convay_role_permissions(role_id,permission_id)
 select v_id,c from unnest(v_codes) as c
 on conflict do nothing;
 return v_id;
end $$;
revoke all on function public.convay_save_role(uuid,text,text,text,text,text[]) from public,anon,authenticated;
grant execute on function public.convay_save_role(uuid,text,text,text,text,text[]) to service_role;

create function public.convay_assign_roles(p_user uuid,p_roles uuid[])
returns void
language plpgsql security definer set search_path='' as $$
declare v_codes uuid[]; v_count int; v_actor uuid;
begin
 if not exists(select 1 from public.user_profiles where user_id=p_user) then
  raise exception 'User not found';
 end if;
 if exists(select 1 from public.user_profiles where user_id=p_user and account_role='super_admin') then
  raise exception 'Cannot change the protected Super Admin assignment';
 end if;
 v_codes := array(select distinct x from unnest(coalesce(p_roles,'{}'::uuid[])) as x);
 select count(*) into v_count from public.convay_roles where id=any(v_codes) and status='Active' and not is_system_role;
 if v_count <> cardinality(v_codes) then raise exception 'Role missing, inactive or protected'; end if;
 delete from public.convay_user_roles where user_id=p_user;
 insert into public.convay_user_roles(user_id,role_id)
 select p_user,x from unnest(v_codes) as x;
end $$;
revoke all on function public.convay_assign_roles(uuid,uuid[]) from public,anon,authenticated;
grant execute on function public.convay_assign_roles(uuid,uuid[]) to service_role;
