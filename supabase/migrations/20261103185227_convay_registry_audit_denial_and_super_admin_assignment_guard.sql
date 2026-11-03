-- A NULL operation is always denied, including for the Super Admin.
create or replace function convay_private.registry_authorized(p_key text,p_action text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((
   select
     case
       when p_action='read' and t.read_permission is not null
         then convay_private.has_permission(t.read_permission)
       when p_action='create' and t.create_permission is not null
         then convay_private.has_permission(t.create_permission)
       when p_action='update' and t.update_permission is not null
         then convay_private.has_permission(t.update_permission)
       when p_action='delete' and t.delete_permission is not null
         then convay_private.has_permission(t.delete_permission)
       else false end
   from convay_private.registry_types t
   where t.entity_key=p_key
 ),false);
$$;
revoke all on function convay_private.registry_authorized(text,text) from PUBLIC,anon;
grant execute on function convay_private.registry_authorized(text,text) to authenticated;

-- Defend the single Super Admin role assignment even from accidental privileged
-- writes: it must never be granted to a different user or silently removed.
create function convay_private.guard_system_role_assignment()
returns trigger language plpgsql security definer set search_path='' as $$
declare is_system boolean;
begin
 if tg_op in ('UPDATE','DELETE') then
   select r.is_system_role into is_system
   from public.convay_roles r where r.id=old.role_id;
   if is_system then
     if tg_op='DELETE' or new.user_id<>old.user_id or new.role_id<>old.role_id then
       raise exception 'Cannot revoke or transfer the sole Super Admin assignment';
     end if;
   end if;
 end if;
 if tg_op in ('INSERT','UPDATE') then
   select r.is_system_role into is_system
   from public.convay_roles r where r.id=new.role_id;
   if is_system and not exists(
     select 1 from public.user_profiles p
     where p.user_id=new.user_id and p.account_role='super_admin'
   ) then
     raise exception 'Cannot grant protected Super Admin role to another user';
   end if;
 end if;
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function convay_private.guard_system_role_assignment() from PUBLIC,anon,authenticated;
create trigger convay_guard_super_admin_assignment
before insert or update or delete on public.convay_user_roles
for each row execute function convay_private.guard_system_role_assignment();
