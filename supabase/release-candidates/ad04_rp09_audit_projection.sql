-- AD-04/RP-09 staged read-only projection; no production activation.
-- Only sources with persisted tenant provenance and immutable history are exposed
-- to tenant administrators. Legacy entity journal has no historical tenant id;
-- only platform root can see its narrowly allowlisted event metadata.
create or replace function public.convay_report_audit_events(p_workflow_only boolean default false)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare
  v_actor uuid := (select auth.uid());
  v_root boolean;
  v_result jsonb;
begin
  select p.account_role='super_admin' into v_root
    from public.user_profiles p where p.user_id=v_actor and p.account_status='active';
  if v_actor is null or v_root is null or p_workflow_only is null
     or not convay_private.has_permission(case when p_workflow_only then 'admin_workflows' else 'admin_audit_log' end)
     or (p_workflow_only and not v_root) then
    raise exception 'Audit access denied' using errcode='42501';
  end if;
  if not v_root and not exists (select 1 from convay_private.tenants t
    where convay_private.tenant_admin_authorized(t.id)) then
    raise exception 'Audit tenant scope unavailable' using errcode='42501';
  end if;
  with events as (
    select 'template:'||e.id::text as event_id, 'Meeting template'::text as source,
      e.template_id::text as target_id, e.actor_id::text as actor_id,
      e.created_at as occurred_at, e.operation as action, e.revision::text as revision,
      e.request_id::text as request_id, c.tenant_id::text as tenant_id
    from convay_private.meeting_template_events e
    join convay_private.meeting_template_catalog c on c.id=e.template_id
    where e.operation in ('create','copy','revise','publish')
      and (v_root or (c.tenant_id is not null and e.details->>'tenant_id'=c.tenant_id::text
        and convay_private.tenant_admin_authorized(c.tenant_id)))
    union all
    select 'draft:'||e.id::text, 'Company meeting draft',
      e.details->>'draft_id', e.actor_id::text, e.occurred_at, e.action,
      e.details->>'revision', e.request_id::text, e.tenant_id::text
    from convay_private.tenant_control_events e
    where e.action in ('company_meeting_draft_updated','company_meeting_draft_discarded')
      and nullif(e.details->>'draft_id','') is not null
      and (v_root or convay_private.tenant_admin_authorized(e.tenant_id))
    union all
    select 'entity:'||e.change_id::text, e.entity_key, e.record_id,
      e.actor_id::text, e.happened_at, e.operation, e.revision::text,
      null::text, null::text
    from convay_private.entity_changes e
    where v_root and e.entity_key in ('bms.meetings','bms.agenda','bms.decisions',
      'bms.resolutions','bms.actionitems','bms.minutes','bms.boardpacks','bms.documents',
      'bms.workflows','bms.approvalrules','bms.quorumrules','bms.votingmethods')
      and e.operation in ('INSERT','UPDATE','DELETE')
      and (not p_workflow_only or e.entity_key in ('bms.workflows','bms.approvalrules','bms.quorumrules','bms.votingmethods')
        or (e.operation='UPDATE' and e.previous_payload->>'approval_status' is distinct from e.new_payload->>'approval_status'))
  ), bounded as (
    select * from events order by occurred_at desc,event_id collate "C" desc limit 501
  )
  select pg_catalog.jsonb_build_object(
    'scope',case when v_root then 'platform' else 'tenant' end,
    'limited',(select count(*)>500 from bounded),
    'events',coalesce((select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(q) order by q.occurred_at desc,q.event_id collate "C" desc)
      from (select * from bounded order by occurred_at desc,event_id collate "C" desc limit 500) q),'[]'::jsonb)
  ) into v_result;
  return v_result;
end $fn$;
revoke all on function public.convay_report_audit_events(boolean) from public,anon,authenticated;
grant execute on function public.convay_report_audit_events(boolean) to authenticated;

-- The underlying registry change table was already private; prevent mutation
-- and truncation even by ordinary privileged maintenance paths. No rows changed.
create or replace function convay_private.prevent_report_entity_audit_mutation()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
  raise exception 'Registry audit history is immutable' using errcode='42501';
end $fn$;
revoke all on function convay_private.prevent_report_entity_audit_mutation() from public,anon,authenticated;
drop trigger if exists convay_report_entity_audit_immutable on convay_private.entity_changes;
create trigger convay_report_entity_audit_immutable before update or delete or truncate
on convay_private.entity_changes for each statement execute function convay_private.prevent_report_entity_audit_mutation();
