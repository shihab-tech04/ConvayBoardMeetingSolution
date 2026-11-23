-- TEN/MT-CONFIG-01: versioned meeting-type templates and Convay starter marketplace.
-- This is an admin configuration API, NOT a tenant isolation/meeting activation certificate.
-- No client table grants, financial writes, guest/public access, or implicit meeting migration.
create table if not exists convay_private.meeting_template_catalog (
 id uuid primary key default gen_random_uuid(),
 tenant_id uuid references convay_private.tenants(id) on delete restrict,
 template_key text not null check(template_key ~ '^[a-z][a-z0-9_-]{2,63}$'),
 title text not null check(length(btrim(title)) between 3 and 160),
 description text not null default '',
 created_by uuid references auth.users(id) on delete restrict,
 source_template_id uuid references convay_private.meeting_template_catalog(id) on delete restrict,
 current_revision integer not null default 1 check(current_revision>0),
 published_revision integer check(published_revision>0 and published_revision<=current_revision),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index if not exists convay_template_global_key_unique
 on convay_private.meeting_template_catalog (template_key) where tenant_id is null;
create unique index if not exists convay_template_tenant_key_unique
 on convay_private.meeting_template_catalog (tenant_id,template_key) where tenant_id is not null;
alter table convay_private.meeting_template_catalog enable row level security;
revoke all on convay_private.meeting_template_catalog from public,anon,authenticated;

create table if not exists convay_private.meeting_template_versions (
 template_id uuid not null references convay_private.meeting_template_catalog(id) on delete restrict,
 revision integer not null check(revision>0),
 state text not null default 'draft' check(state in ('draft','published')),
 definition jsonb not null,
 created_by uuid references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 published_at timestamptz,
 primary key(template_id,revision),
 check((state='draft' and published_at is null) or
       (state='published' and published_at is not null))
);
alter table convay_private.meeting_template_versions enable row level security;
revoke all on convay_private.meeting_template_versions from public,anon,authenticated;

create or replace function convay_private.prevent_template_version_mutation()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 if tg_op='DELETE' then
  raise exception 'Template version deletion is forbidden' using errcode='42501';
 end if;
 if old.state<>'draft' or new.state<>'published'
   or new.definition is distinct from old.definition
   or new.template_id is distinct from old.template_id
   or new.revision is distinct from old.revision
   or new.created_by is distinct from old.created_by
   or new.created_at is distinct from old.created_at
   or new.published_at is null then
   raise exception 'A template version can only transition draft to published' using errcode='42501';
 end if;
 return new;
end $fn$;
revoke all on function convay_private.prevent_template_version_mutation() from public,anon,authenticated;
drop trigger if exists convay_template_version_immutable on convay_private.meeting_template_versions;
create trigger convay_template_version_immutable before update or delete
 on convay_private.meeting_template_versions for each row
 execute function convay_private.prevent_template_version_mutation();

create table if not exists convay_private.meeting_template_events (
 id bigint generated always as identity primary key,
 template_id uuid not null references convay_private.meeting_template_catalog(id) on delete restrict,
 actor_id uuid not null references auth.users(id) on delete restrict,
 request_id uuid not null,
 operation text not null,
 revision integer not null,
 details jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now()
);
alter table convay_private.meeting_template_events enable row level security;
revoke all on convay_private.meeting_template_events from public,anon,authenticated;
revoke all on sequence convay_private.meeting_template_events_id_seq from public,anon,authenticated;

create or replace function convay_private.prevent_template_event_mutation()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 raise exception 'Meeting template audit history is immutable' using errcode='42501';
end $fn$;
revoke all on function convay_private.prevent_template_event_mutation() from public,anon,authenticated;
drop trigger if exists convay_template_events_immutable on convay_private.meeting_template_events;
create trigger convay_template_events_immutable before update or delete
 on convay_private.meeting_template_events for each row
 execute function convay_private.prevent_template_event_mutation();

create table if not exists convay_private.meeting_template_receipts (
 actor_id uuid not null references auth.users(id) on delete restrict,
 request_id uuid not null,
 intent jsonb not null,
 response jsonb not null,
 created_at timestamptz not null default now(),
 primary key(actor_id,request_id)
);
alter table convay_private.meeting_template_receipts enable row level security;
revoke all on convay_private.meeting_template_receipts from public,anon,authenticated;

-- Data-only schema: no client scripts, JSX, arbitrary SQL or execution hooks.
-- A definition is an ordered list of steps with typed fields.
create or replace function convay_private.validate_meeting_template_definition(p_definition jsonb)
returns void language plpgsql immutable security invoker set search_path='' as $fn$
declare
 v_steps jsonb;v_step jsonb;v_fields jsonb;v_field jsonb;
 v_step_ids text[]:=array[]::text[];v_field_ids text[];
 v_step_id text;v_field_id text;v_type text;v_title text;
begin
 if pg_catalog.jsonb_typeof(p_definition)<>'object' then
  raise exception 'A template definition object is required' using errcode='22023';
 end if;
 v_steps:=p_definition->'steps';
 if pg_catalog.jsonb_typeof(v_steps) is distinct from 'array'
  or pg_catalog.jsonb_array_length(v_steps) not between 1 and 20 then
  raise exception 'Define 1 to 20 ordered meeting steps' using errcode='22023';
 end if;
 for v_step in select value from pg_catalog.jsonb_array_elements(v_steps) loop
  v_step_id:=v_step->>'id';v_title:=v_step->>'title';
  if pg_catalog.jsonb_typeof(v_step)<>'object'
    or coalesce(v_step_id,'') !~ '^[a-z][a-z0-9_-]{1,63}$'
    or coalesce(length(btrim(v_title)),0) not between 2 and 100
    or v_step_id=any(v_step_ids) then
    raise exception 'Invalid or repeated meeting step ID/title' using errcode='22023';
  end if;
  v_step_ids:=pg_catalog.array_append(v_step_ids,v_step_id);
  v_fields:=v_step->'fields';
  if pg_catalog.jsonb_typeof(v_fields) is distinct from 'array'
   or pg_catalog.jsonb_array_length(v_fields)>30 then
   raise exception 'Each step needs an ordered fields array (up to 30)' using errcode='22023';
  end if;
  v_field_ids:=array[]::text[];
  for v_field in select value from pg_catalog.jsonb_array_elements(v_fields) loop
   v_field_id:=v_field->>'id';v_type:=v_field->>'type';v_title:=v_field->>'label';
   if pg_catalog.jsonb_typeof(v_field)<>'object'
    or coalesce(v_field_id,'') !~ '^[a-z][a-z0-9_-]{1,63}$'
    or v_field_id=any(v_field_ids)
    or coalesce(length(btrim(v_title)),0) not between 2 and 100
    or v_type not in ('text','textarea','date','datetime','number','select',
      'multiselect','checkbox','file','participants','agenda','resolution','quorum',
      'meeting_room','duration') then
     raise exception 'Invalid or repeated meeting field ID/type/label' using errcode='22023';
   end if;
   if v_field ? 'required' and pg_catalog.jsonb_typeof(v_field->'required')<>'boolean' then
    raise exception 'Field required must be boolean' using errcode='22023';
   end if;
   if v_type in ('select','multiselect') and (
      pg_catalog.jsonb_typeof(v_field->'options') is distinct from 'array'
      or pg_catalog.jsonb_array_length(v_field->'options') not between 1 and 30
   ) then
    raise exception 'Selection fields require 1 to 30 options' using errcode='22023';
   end if;
   v_field_ids:=pg_catalog.array_append(v_field_ids,v_field_id);
  end loop;
 end loop;
 if p_definition ? 'approvals' and
    pg_catalog.jsonb_typeof(p_definition->'approvals')<>'object' then
  raise exception 'Approvals metadata must be an object' using errcode='22023';
 end if;
end $fn$;
revoke all on function convay_private.validate_meeting_template_definition(jsonb) from public,anon,authenticated;

-- Deliberately root/tenant-administrator only while tenant isolation is uncertified.
-- End-user meeting wizard must NOT call this config API to create meetings.
create or replace function public.convay_meeting_template_manage(
 p_action text,p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();v_root boolean:=false;v_tenant uuid;
 v_catalog convay_private.meeting_template_catalog%rowtype;
 v_source convay_private.meeting_template_catalog%rowtype;
 v_revision int;v_expected int;v_id uuid;v_source_id uuid;
 v_name text;v_key text;v_description text;v_definition jsonb;
 v_request uuid;v_previous convay_private.meeting_template_receipts%rowtype;
 v_intent jsonb;v_output jsonb;v_read jsonb;v_allowed boolean:=false;
begin
 select u.account_role='super_admin' into v_root from public.user_profiles u
  where u.user_id=v_actor and u.account_status='active';
 if v_actor is null or not exists (
   select 1 from public.user_profiles u
   where u.user_id=v_actor and u.account_status='active'
 ) then raise exception 'Active authenticated account required' using errcode='42501';end if;
 if pg_catalog.jsonb_typeof(p_payload)<>'object' then
  raise exception 'Invalid template request' using errcode='22023';
 end if;
 if p_action not in ('list','read','create','revise','publish','copy') then
  raise exception 'Unsupported meeting template action' using errcode='22023';
 end if;
 if p_action in ('list','create','copy') then
  v_tenant:=nullif(p_payload->>'tenant_id','')::uuid;
 else
  v_id:=(p_payload->>'template_id')::uuid;
  select * into v_catalog from convay_private.meeting_template_catalog
   where id=v_id;
  if not found then
   raise exception 'Template not found' using errcode='P0002';
  end if;
  v_tenant:=v_catalog.tenant_id;
 end if;
 if v_tenant is null then
  -- Global templates are Convay-owned; only an active platform root modifies.
  if p_action='list' then
   v_allowed:=coalesce(v_root,false) or exists(
     select 1 from convay_private.tenant_memberships m
     join convay_private.tenants t on t.id=m.tenant_id
      where m.user_id=v_actor and m.membership_role='tenant_admin'
       and m.membership_state='active' and m.revoked_at is null
       and t.lifecycle_state in ('provisioning','active')
   );
  elsif p_action='read' then
   v_allowed:=coalesce(v_root,false) or (v_catalog.published_revision is not null
     and exists(select 1 from convay_private.tenant_memberships m
      join convay_private.tenants t on t.id=m.tenant_id
      where m.user_id=v_actor and m.membership_role='tenant_admin'
       and m.membership_state='active' and m.revoked_at is null
       and t.lifecycle_state in ('provisioning','active')));
  else v_allowed:=coalesce(v_root,false);
  end if;
 else
  v_allowed:=convay_private.tenant_admin_authorized(v_tenant) and exists(
   select 1 from convay_private.tenants t where t.id=v_tenant
    and t.lifecycle_state in ('provisioning','active')
  );
 end if;
 if not v_allowed then
  raise exception 'Meeting template administration denied' using errcode='42501';
 end if;

 if p_action='list' then
  return pg_catalog.jsonb_build_object('templates',coalesce((
   select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id',c.id,'tenant_id',c.tenant_id,'template_key',c.template_key,
    'title',c.title,'description',c.description,
    'source_template_id',c.source_template_id,'revision',c.current_revision,
    'published_revision',c.published_revision,'updated_at',c.updated_at
   ) order by c.updated_at desc)
   from (select * from convay_private.meeting_template_catalog
      where tenant_id is not distinct from v_tenant
      order by updated_at desc limit 100) c),'[]'::jsonb));
 elsif p_action='read' then
  v_revision:=coalesce((p_payload->>'revision')::integer,v_catalog.published_revision,
    v_catalog.current_revision);
  if not coalesce(v_root,false) and v_catalog.tenant_id is null
     and v_revision is distinct from v_catalog.published_revision then
    raise exception 'Only published Convay starters are visible' using errcode='42501';
  end if;
  select pg_catalog.jsonb_build_object(
   'id',v_catalog.id,'tenant_id',v_catalog.tenant_id,
   'template_key',v_catalog.template_key,'title',v_catalog.title,
   'description',v_catalog.description,'source_template_id',v_catalog.source_template_id,
   'revision',v.revision,'state',v.state,'definition',v.definition,
   'published_at',v.published_at,'current_revision',v_catalog.current_revision,
   'published_revision',v_catalog.published_revision)
   into v_read from convay_private.meeting_template_versions v
   where v.template_id=v_catalog.id and v.revision=v_revision;
  if v_read is null then raise exception 'Template revision not found' using errcode='P0002';end if;
  return pg_catalog.jsonb_build_object('template',v_read);
 end if;

 if coalesce(p_payload->>'request_id','') !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
  raise exception 'An idempotency request ID is required' using errcode='22023';
 end if;
 v_request:=(p_payload->>'request_id')::uuid;
 v_intent:=p_payload-'request_id';
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('convay-template:'||v_actor::text));
 select * into v_previous from convay_private.meeting_template_receipts
  where actor_id=v_actor and request_id=v_request;
 if found then
  if v_previous.intent is distinct from pg_catalog.jsonb_build_object(
    'action',p_action,'payload',v_intent) then
    raise exception 'Template request ID reused with changed input' using errcode='23505';
  end if;
  return v_previous.response;
 end if;
 v_description:=coalesce(p_payload->>'description','');
 if length(v_description)>2000 then
  raise exception 'Description is too long' using errcode='22023';
 end if;
 if p_action in ('create','copy') then
  v_name:=pg_catalog.btrim(p_payload->>'title');
  v_key:=p_payload->>'template_key';
  if coalesce(length(v_name),0) not between 3 and 160
    or coalesce(v_key,'') !~ '^[a-z][a-z0-9_-]{2,63}$' then
    raise exception 'Valid template title and key are required' using errcode='22023';
  end if;
  if p_action='copy' then
   if v_tenant is null then
    raise exception 'Copying a starter requires a tenant' using errcode='22023';
   end if;
   v_source_id:=(p_payload->>'source_template_id')::uuid;
   select * into v_source from convay_private.meeting_template_catalog s
    where s.id=v_source_id and s.tenant_id is null
      and s.published_revision is not null;
   if not found then
    raise exception 'Published Convay starter template not found' using errcode='P0002';
   end if;
   select definition into v_definition from convay_private.meeting_template_versions v
    where v.template_id=v_source.id and v.revision=v_source.published_revision
      and v.state='published';
  else
   v_definition:=p_payload->'definition';
  end if;
  perform convay_private.validate_meeting_template_definition(v_definition);
  insert into convay_private.meeting_template_catalog(
    tenant_id,template_key,title,description,created_by,source_template_id)
   values(v_tenant,v_key,v_name,v_description,v_actor,v_source_id)
   returning * into v_catalog;
  insert into convay_private.meeting_template_versions(
    template_id,revision,definition,created_by)
   values(v_catalog.id,1,v_definition,v_actor);
  v_revision:=1;
 elsif p_action='revise' then
  if coalesce(p_payload->>'expected_revision','') !~ '^[1-9][0-9]{0,6}$' then
   raise exception 'Expected template revision required' using errcode='22023';end if;
  v_expected:=(p_payload->>'expected_revision')::integer;
  select * into v_catalog from convay_private.meeting_template_catalog
   where id=v_id for update;
  if v_catalog.current_revision<>v_expected then
   raise exception 'Template changed; reload before editing' using errcode='40001';end if;
  v_definition:=p_payload->'definition';
  perform convay_private.validate_meeting_template_definition(v_definition);
  update convay_private.meeting_template_catalog
   set current_revision=current_revision+1,
       title=coalesce(nullif(pg_catalog.btrim(p_payload->>'title'),''),title),
       description=case when p_payload ? 'description' then v_description else description end,
       updated_at=now()
   where id=v_id returning * into v_catalog;
  v_revision:=v_catalog.current_revision;
  insert into convay_private.meeting_template_versions(
   template_id,revision,definition,created_by)
   values(v_id,v_revision,v_definition,v_actor);
 else
  if coalesce(p_payload->>'expected_revision','') !~ '^[1-9][0-9]{0,6}$' then
   raise exception 'Expected template revision required' using errcode='22023';end if;
  v_expected:=(p_payload->>'expected_revision')::integer;
  select * into v_catalog from convay_private.meeting_template_catalog
   where id=v_id for update;
  if v_catalog.current_revision<>v_expected then
   raise exception 'Template changed; reload before publishing' using errcode='40001';end if;
  update convay_private.meeting_template_versions v set
    state='published',published_at=now()
   where v.template_id=v_id and v.revision=v_expected and v.state='draft';
  if not found then
   raise exception 'Only the latest draft revision can be published' using errcode='23514';end if;
  update convay_private.meeting_template_catalog
   set published_revision=v_expected,updated_at=now()
   where id=v_id returning * into v_catalog;
  v_revision:=v_expected;
 end if;
 insert into convay_private.meeting_template_events(
   template_id,actor_id,request_id,operation,revision,details)
 values(v_catalog.id,v_actor,v_request,p_action,v_revision,
   pg_catalog.jsonb_build_object('tenant_id',v_catalog.tenant_id,
     'source_template_id',v_catalog.source_template_id));
 v_output:=pg_catalog.jsonb_build_object('template_id',v_catalog.id,
  'tenant_id',v_catalog.tenant_id,'revision',v_revision,
  'published_revision',v_catalog.published_revision,
  'action',p_action,'request_id',v_request,'meeting_activation_enabled',false);
 insert into convay_private.meeting_template_receipts(actor_id,request_id,intent,response)
  values(v_actor,v_request,pg_catalog.jsonb_build_object(
    'action',p_action,'payload',v_intent),v_output);
 return v_output;
end $fn$;
revoke all on function public.convay_meeting_template_manage(text,jsonb) from public,anon,authenticated;
grant execute on function public.convay_meeting_template_manage(text,jsonb) to authenticated;
comment on function public.convay_meeting_template_manage(text,jsonb) is
'Admin-only company meeting template drafts, revisions, publish and Convay marketplace copy. Not a meeting creation or tenant-isolation grant.';