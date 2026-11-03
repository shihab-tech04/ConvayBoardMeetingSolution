-- Server authoritative records for the existing Convay entity registry hooks.
-- NO seeded meeting/user/role fixtures are imported.
create table convay_private.registry_types(
 entity_key text primary key,
 read_permission text references public.convay_permissions(id),
 create_permission text references public.convay_permissions(id),
 update_permission text references public.convay_permissions(id),
 delete_permission text references public.convay_permissions(id)
);
revoke all on convay_private.registry_types from public,anon,authenticated;
alter table convay_private.registry_types enable row level security;
insert into convay_private.registry_types(entity_key,read_permission,create_permission,update_permission,delete_permission)
values
('bms.meetings','mtg_view','mtg_create','mtg_update','mtg_cancel'),
('bms.agenda','agd_view','agd_submit','agd_submit','agd_review'),
('bms.decisions','dec_view','dec_record','dec_record','dec_approve'),
('bms.resolutions','res_view','res_create','res_create','res_approve'),
('bms.actionitems','act_view','act_create','act_update','act_close'),
('bms.govbodies','gov_body_view','gov_body_manage','gov_body_manage','gov_body_manage'),
('bms.motions','mtg_view','mtg_start','mtg_start','mtg_start'),
('bms.minutes','arc_view','min_create','min_create','min_approve'),
('bms.boardpacks','pack_view','pack_create','pack_create','pack_publish'),
('bms.documents','doc_view','doc_upload','doc_edit','doc_archive'),
('bms.matters','act_view','act_create','act_update','act_close'),
('bms.participants','mtg_view','mtg_participants','mtg_participants','mtg_participants'),
('bms.rsvp','mtg_view','mtg_rsvp','mtg_rsvp','mtg_rsvp'),
('bms.conflicts','mtg_view','mtg_join','mtg_join','mtg_update'),
('bms.attendance','mtg_view','mtg_attendance','mtg_attendance','mtg_attendance'),
('bms.votes','mtg_view','mtg_join','mtg_join','mtg_start'),
('bms.quorum','mtg_view','mtg_start','mtg_start','mtg_start'),
('bms.questions','mtg_view','mtg_join','mtg_join','mtg_update'),
('bms.notes','mtg_view','mtg_join','mtg_join','mtg_join'),
('bms.reviews','rep_meeting','mtg_update','mtg_update','mtg_update'),
('bms.polls','mtg_view','mtg_poll','mtg_poll','mtg_poll'),
('bms.partgroups','gov_group_view','gov_group_manage','gov_group_manage','gov_group_manage'),
('bms.templates','admin_templates','admin_templates','admin_templates','admin_templates'),
('bms.memberships','gov_body_view','gov_body_manage','gov_body_manage','gov_body_manage'),
('bms.orgunits','gov_org_view','gov_org_manage','gov_org_manage','gov_org_manage'),
('bms.unitheads','gov_org_view','gov_org_manage','gov_org_manage','gov_org_manage'),
('bms.docversions','doc_view','doc_manage_versions','doc_manage_versions','doc_manage_versions'),
('bms.packversions','pack_view','pack_create','pack_create','pack_publish'),
('bms.qresponses','mtg_view','mtg_join','mtg_join','mtg_update'),
('bms.progressupdates','act_view','act_update','act_update','act_update'),
('bms.extensions','act_view','act_update','act_update','act_update'),
('bms.completions','act_view','act_close','act_close','act_close'),
('bms.minversions','arc_view','min_create','min_create','min_approve'),
('bms.amendments','arc_view','min_create','min_create','min_approve'),
('bms.workflows','admin_workflows','admin_workflows','admin_workflows','admin_workflows'),
('bms.approvalrules','admin_approvals','admin_approvals','admin_approvals','admin_approvals'),
('bms.quorumrules','admin_config','admin_config','admin_config','admin_config'),
('bms.votingmethods','admin_config','admin_config','admin_config','admin_config'),
('bms.notifyrules','admin_notifications','admin_notifications','admin_notifications','admin_notifications'),
('bms.deliveries','admin_notifications','admin_notifications','admin_notifications','admin_notifications'),
('bms.audit','admin_audit_log',null,null,null),
('bms.agendaDocumentLinks','agd_view','agd_submit','agd_submit','agd_submit'),
('bms.meetingDocumentLinks','mtg_view','mtg_update','mtg_update','mtg_update'),
('bms.meetingAgendaLinks','mtg_view','mtg_update','mtg_update','mtg_update'),
('bms.meetingParticipantLinks','mtg_view','mtg_participants','mtg_participants','mtg_participants'),
('bms.liveSessions','mtg_view','mtg_start','mtg_start','mtg_start'),
('bms.meetingInteractions','mtg_view','mtg_join','mtg_join','mtg_join'),
('bms.invitations','admin_users','admin_users_add','admin_users_add','admin_users_add'),
('bms.designations','gov_org_view','gov_org_manage','gov_org_manage','gov_org_manage');

create table public.convay_entity_records(
 entity_key text not null references convay_private.registry_types(entity_key),
 record_id text not null check(length(record_id) between 1 and 180),
 payload jsonb not null check(jsonb_typeof(payload)='object'),
 created_by uuid references auth.users(id) on delete set null default auth.uid(),
 updated_by uuid references auth.users(id) on delete set null default auth.uid(),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 revision bigint not null default 1 check(revision>0),
 primary key(entity_key,record_id),
 constraint record_id_matches_json check(payload->>'id'=record_id)
);
create index convay_entity_records_modified_idx on public.convay_entity_records(entity_key,updated_at desc);
alter table public.convay_entity_records enable row level security;
revoke all on public.convay_entity_records from public,anon,authenticated;
grant select on public.convay_entity_records to authenticated;
grant insert(entity_key,record_id,payload) on public.convay_entity_records to authenticated;
grant update(payload) on public.convay_entity_records to authenticated;
grant delete on public.convay_entity_records to authenticated;

-- Fail closed for unknown entity keys and unknown actions.
create function convay_private.registry_authorized(p_key text,p_action text)
returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((
   select convay_private.has_permission(
     case p_action
       when 'read' then t.read_permission
       when 'create' then t.create_permission
       when 'update' then t.update_permission
       when 'delete' then t.delete_permission
       else null end)
   from convay_private.registry_types t
   where t.entity_key=p_key
 ),false);
$$;
revoke all on function convay_private.registry_authorized(text,text) from public,anon;
grant execute on function convay_private.registry_authorized(text,text) to authenticated;
create policy convay_records_read on public.convay_entity_records
 for select to authenticated using (convay_private.registry_authorized(entity_key,'read'));
create policy convay_records_create on public.convay_entity_records
 for insert to authenticated with check (convay_private.registry_authorized(entity_key,'create'));
create policy convay_records_update on public.convay_entity_records
 for update to authenticated using (convay_private.registry_authorized(entity_key,'update'))
 with check (convay_private.registry_authorized(entity_key,'update'));
create policy convay_records_delete on public.convay_entity_records
 for delete to authenticated using (convay_private.registry_authorized(entity_key,'delete'));

create table convay_private.entity_changes(
 change_id bigint generated always as identity primary key,
 entity_key text not null,
 record_id text not null,
 revision bigint,
 operation text not null,
 actor_id uuid,
 previous_payload jsonb,
 new_payload jsonb,
 happened_at timestamptz not null default now()
);
revoke all on convay_private.entity_changes from public,anon,authenticated;
alter table convay_private.entity_changes enable row level security;
create index convay_entity_changes_id_idx on convay_private.entity_changes(entity_key,record_id,happened_at desc);

create function convay_private.track_entity_change() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();
begin
 if tg_op='UPDATE' then
   if new.entity_key<>old.entity_key or new.record_id<>old.record_id
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
     raise exception 'Entity identity and creator are immutable';
   end if;
   new.revision:=old.revision+1;
   new.updated_at:=now();
   new.updated_by:=v_actor;
 end if;
 if tg_op='INSERT' then
   new.created_by:=v_actor; new.updated_by:=v_actor;
 end if;
 insert into convay_private.entity_changes(entity_key,record_id,revision,operation,actor_id,previous_payload,new_payload)
 values(coalesce(new.entity_key,old.entity_key),coalesce(new.record_id,old.record_id),
  case when tg_op='DELETE' then old.revision else new.revision end,
  tg_op,v_actor,
  case when tg_op='INSERT' then null else old.payload end,
  case when tg_op='DELETE' then null else new.payload end);
 return case when tg_op='DELETE' then old else new end;
end $$;
revoke all on function convay_private.track_entity_change() from public,anon,authenticated;
create trigger convay_entity_track before insert or update or delete on public.convay_entity_records
 for each row execute function convay_private.track_entity_change();
