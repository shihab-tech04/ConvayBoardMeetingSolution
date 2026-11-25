-- TEN-360-01: truthful company 360 readback for existing platform / company admins.
-- Does not activate company workspaces, create subscriptions, or infer paid status.
-- Never expose private tenant tables directly to browser roles.
create or replace function public.convay_company_directory(
 p_action text, p_tenant_id uuid default null
) returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();
 v_root boolean:=false;
 v_company convay_private.tenants%rowtype;
 v_summary jsonb;
 v_members jsonb;
 v_templates jsonb;
 v_events jsonb;
 v_allowed boolean:=false;
begin
 select (u.account_role='super_admin') into v_root
 from public.user_profiles u
 where u.user_id=v_actor and u.account_status='active';
 if v_actor is null or not exists(
  select 1 from public.user_profiles u
  where u.user_id=v_actor and u.account_status='active'
 ) then
  raise exception 'Active authenticated user required' using errcode='42501';
 end if;
 if p_action not in ('list','read') then
  raise exception 'Unsupported company readback operation' using errcode='22023';
 end if;
 if p_action='list' then
  if p_tenant_id is not null then
   raise exception 'Company list does not accept tenant ID' using errcode='22023';
  end if;
  return pg_catalog.jsonb_build_object('companies',coalesce((
   select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
     'id',t.id,'display_name',t.display_name,'lifecycle_state',t.lifecycle_state,
     'created_at',t.created_at,'updated_at',t.updated_at,
     'active_member_count',(select count(*) from convay_private.tenant_memberships m
       where m.tenant_id=t.id and m.membership_state='active' and m.revoked_at is null),
     'published_template_count',(select count(*) from convay_private.meeting_template_catalog c
       where c.tenant_id=t.id and c.published_revision is not null)
   ) order by t.updated_at desc,t.id)
   from (select * from convay_private.tenants t
    where coalesce(v_root,false) or exists (
      select 1 from convay_private.tenant_memberships m
      where m.tenant_id=t.id and m.user_id=v_actor
       and m.membership_state='active' and m.revoked_at is null
       and m.membership_role='tenant_admin'
       and t.lifecycle_state in ('provisioning','active','suspended')
    )
    order by t.updated_at desc,t.id limit 100) t
   ),'[]'::jsonb),
   'tenant_isolation_certified',false,'workspace_activation_enabled',false);
 end if;
 if p_tenant_id is null then
  raise exception 'Company ID required' using errcode='22023';
 end if;
 select * into v_company from convay_private.tenants t
 where t.id=p_tenant_id;
 if not found then
  raise exception 'Company not found' using errcode='P0002';
 end if;
 v_allowed:=coalesce(v_root,false) or (
  v_company.lifecycle_state in ('provisioning','active','suspended')
  and exists(select 1 from convay_private.tenant_memberships m
     where m.tenant_id=p_tenant_id and m.user_id=v_actor
      and m.membership_role='tenant_admin'
      and m.membership_state='active' and m.revoked_at is null));
 if not v_allowed then
  raise exception 'Company detail access denied' using errcode='42501';
 end if;

 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'user_id',m.user_id,'membership_role',m.membership_role,
   'membership_state',m.membership_state,'revision',m.revision,
   'changed_at',m.changed_at,'revoked_at',m.revoked_at,
   'display_name',u.display_name,'email',u.email,'account_status',u.account_status
  ) order by m.changed_at desc,m.user_id),'[]'::jsonb)
 into v_members
 from convay_private.tenant_memberships m
 join public.user_profiles u on u.user_id=m.user_id
 where m.tenant_id=p_tenant_id;

 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'id',c.id,'title',c.title,'template_key',c.template_key,
   'current_revision',c.current_revision,
   'published_revision',c.published_revision,'updated_at',c.updated_at
  ) order by c.updated_at desc,c.id),'[]'::jsonb)
 into v_templates
 from convay_private.meeting_template_catalog c where c.tenant_id=p_tenant_id;

 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
   'id',e.id,'action',e.action,'actor_id',e.actor_id,
   'target_user_id',e.target_user_id,'occurred_at',e.occurred_at,
   'request_id',e.request_id
  ) order by e.id desc),'[]'::jsonb)
 into v_events
 from (select * from convay_private.tenant_control_events
   where tenant_id=p_tenant_id order by id desc limit 50) e;

 return pg_catalog.jsonb_build_object(
  'company',pg_catalog.jsonb_build_object(
    'id',v_company.id,'display_name',v_company.display_name,
    'lifecycle_state',v_company.lifecycle_state,
    'created_at',v_company.created_at,'updated_at',v_company.updated_at),
  'members',v_members,'templates',v_templates,'events',v_events,
  'tenant_isolation_certified',false,'workspace_activation_enabled',false,
  'subscription_activated',false,
  'subscription_note','No verified company-subscription activation/readback contract exists yet');
end $fn$;
revoke all on function public.convay_company_directory(text,uuid) from public,anon,authenticated;
grant execute on function public.convay_company_directory(text,uuid) to authenticated;
comment on function public.convay_company_directory(text,uuid) is
'Company 360 administrative readback; platform root sees all, verified company admin sees own only; isolation and subscription activation not certified.';