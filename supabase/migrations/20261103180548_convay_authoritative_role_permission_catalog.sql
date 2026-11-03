-- Convay roles are authoritative SQL records, not browser seed fixtures.
create table public.convay_roles (
 id uuid primary key default gen_random_uuid(),
 name text not null check (length(btrim(name)) between 2 and 100),
 description text not null default '',
 level text not null default 'Custom',
 status text not null default 'Active' check(status in ('Active','Inactive')),
 is_system_role boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index convay_roles_name_ci on public.convay_roles(lower(name));
create unique index convay_one_system_role on public.convay_roles(is_system_role) where is_system_role;

create table public.convay_permissions (
 id text primary key check(id ~ '^[a-z][a-z0-9_-]{1,100}$'),
 label text not null check(length(btrim(label)) between 2 and 150),
 label_key text,
 group_id text not null check(group_id in
   ('home','meetings','agenda-documents','decisions-followup','governance-org','archive-reports','administration')),
 endpoint text not null check(length(btrim(endpoint)) between 1 and 255),
 method text not null check(method in ('GET','POST','PUT','PATCH','DELETE')),
 service_name text not null default '',
 access_label text not null default 'AUTHORIZE' check(access_label in ('PUBLIC','AUTH','AUTHORIZE')),
 status text not null default 'Active' check(status in ('Active','Inactive')),
 is_custom boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create unique index convay_permission_api_method on public.convay_permissions(endpoint,method);
create index convay_permission_group_status on public.convay_permissions(group_id,status);

create table public.convay_role_permissions (
 role_id uuid not null references public.convay_roles(id) on delete cascade,
 permission_id text not null references public.convay_permissions(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(role_id,permission_id)
);
create index convay_role_permission_by_permission on public.convay_role_permissions(permission_id);

create table public.convay_user_roles (
 user_id uuid not null references public.user_profiles(user_id) on delete cascade,
 role_id uuid not null references public.convay_roles(id) on delete restrict,
 assigned_at timestamptz not null default now(),
 assigned_by uuid references auth.users(id) on delete set null,
 primary key(user_id,role_id)
);
create index convay_user_roles_by_role on public.convay_user_roles(role_id);

-- No public/admin-data writes from an untrusted browser. The Edge service
-- validates Supabase Auth and admin status before using the service role.
alter table public.convay_roles enable row level security;
alter table public.convay_permissions enable row level security;
alter table public.convay_role_permissions enable row level security;
alter table public.convay_user_roles enable row level security;
revoke all on public.convay_roles, public.convay_permissions,
 public.convay_role_permissions, public.convay_user_roles from public, anon, authenticated;

-- Allow future SQL RLS policies to call one consistent access resolver.
-- Function is deliberately not in exposed public API schema.
create schema if not exists convay_private;
revoke all on schema convay_private from public, anon;
grant usage on schema convay_private to authenticated;
create function convay_private.has_permission(permission_code text)
 returns boolean
 language sql stable security definer
 set search_path = ''
 as $$
 select coalesce((
   select case when p.account_role='super_admin' then true else exists (
     select 1
     from public.convay_user_roles ur
     join public.convay_roles r on r.id=ur.role_id
     join public.convay_role_permissions rp on rp.role_id=r.id
     join public.convay_permissions cp on cp.id=rp.permission_id
     where ur.user_id=p.user_id
       and r.status='Active'
       and cp.id=permission_code
       and cp.status='Active'
   ) end
   from public.user_profiles p
   where p.user_id=(select auth.uid()) and p.account_status='active'
 ),false);
 $$;
revoke all on function convay_private.has_permission(text) from public, anon;
grant execute on function convay_private.has_permission(text) to authenticated;

-- Initial live roles are exactly one: shihab's protected Super Admin role.
do $$
declare admin_id uuid; admin_role uuid;
begin
 select user_id into strict admin_id from public.user_profiles
 where account_role='super_admin' and username='shihab' and account_status='active';
 insert into public.convay_roles(name,description,level,status,is_system_role)
 values ('Super Admin','Full system access; protected sole administrator','Super Admin','Active',true)
 returning id into admin_role;
 insert into public.convay_user_roles(user_id,role_id,assigned_by)
 values(admin_id,admin_role,admin_id);
end $$;

-- The actual 75 source-code permission definitions become SQL catalogue entries.
insert into public.convay_permissions
 (id,label,label_key,group_id,endpoint,method,service_name,access_label,status,is_custom)
select id,label,label_key,group_id,endpoint,method,service_name,access_label,status,false
from jsonb_to_recordset('[{"id":"home_dashboard","label":"View Dashboard","label_key":"permissions.items.viewDashboard","group_id":"home","endpoint":"/api/v1/dashboard","method":"GET","service_name":"Dashboard Service","access_label":"AUTHORIZE","status":"Active"},{"id":"home_overview","label":"View Overview","label_key":"permissions.items.viewOverview","group_id":"home","endpoint":"/api/v1/dashboard/overview","method":"GET","service_name":"Dashboard Service","access_label":"AUTHORIZE","status":"Active"},{"id":"home_my_tasks","label":"View My Tasks","label_key":"permissions.items.viewMyTasks","group_id":"home","endpoint":"/api/v1/dashboard/my-tasks","method":"GET","service_name":"Dashboard Service","access_label":"AUTHORIZE","status":"Active"},{"id":"home_my_calendar","label":"View My Calendar","label_key":"permissions.items.viewMyCalendar","group_id":"home","endpoint":"/api/v1/dashboard/calendar","method":"GET","service_name":"Dashboard Service","access_label":"AUTHORIZE","status":"Active"},{"id":"home_notifications","label":"View Notifications","label_key":"permissions.items.viewNotifications","group_id":"home","endpoint":"/api/v1/notifications","method":"GET","service_name":"Notification Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_view","label":"View Meetings","label_key":"permissions.items.viewMeetings","group_id":"meetings","endpoint":"/api/v1/meetings","method":"GET","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_create","label":"Create Meeting","label_key":"permissions.items.createMeeting","group_id":"meetings","endpoint":"/api/v1/meetings","method":"POST","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_update","label":"Update Meeting","label_key":"permissions.items.updateMeeting","group_id":"meetings","endpoint":"/api/v1/meetings/:id","method":"PUT","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_approve","label":"Approve Meeting","label_key":"permissions.items.approveMeeting","group_id":"meetings","endpoint":"/api/v1/meetings/:id/approve","method":"POST","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_cancel","label":"Cancel Meeting","label_key":"permissions.items.cancelMeeting","group_id":"meetings","endpoint":"/api/v1/meetings/:id/cancel","method":"POST","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_postpone","label":"Postpone Meeting","label_key":"permissions.items.postponeMeeting","group_id":"meetings","endpoint":"/api/v1/meetings/:id/postpone","method":"POST","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_start","label":"Start Meeting","label_key":"permissions.items.startMeeting","group_id":"meetings","endpoint":"/api/v1/meetings/:id/start","method":"POST","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_join","label":"Join Live Meeting","label_key":"permissions.items.joinMeeting","group_id":"meetings","endpoint":"/api/v1/meetings/:id/join","method":"POST","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_participants","label":"Manage Participants","label_key":"permissions.items.manageParticipants","group_id":"meetings","endpoint":"/api/v1/meetings/:id/participants","method":"POST","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_rsvp","label":"Manage RSVP","label_key":"permissions.items.manageRsvp","group_id":"meetings","endpoint":"/api/v1/meetings/:id/rsvp","method":"POST","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_poll","label":"Create Availability Poll","label_key":"permissions.items.createAvailabilityPoll","group_id":"meetings","endpoint":"/api/v1/availability-polls","method":"POST","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"mtg_attendance","label":"Record Attendance","label_key":"permissions.items.recordAttendance","group_id":"meetings","endpoint":"/api/v1/meetings/:id/attendance","method":"POST","service_name":"Meeting Service","access_label":"AUTHORIZE","status":"Active"},{"id":"agd_submit","label":"Submit Agenda","label_key":"permissions.items.submitAgenda","group_id":"agenda-documents","endpoint":"/api/v1/agenda","method":"POST","service_name":"Agenda Service","access_label":"AUTHORIZE","status":"Active"},{"id":"agd_review","label":"Review Agenda","label_key":"permissions.items.reviewAgenda","group_id":"agenda-documents","endpoint":"/api/v1/agenda/:id/review","method":"POST","service_name":"Agenda Service","access_label":"AUTHORIZE","status":"Active"},{"id":"agd_approve","label":"Approve Agenda","label_key":"permissions.items.approveAgenda","group_id":"agenda-documents","endpoint":"/api/v1/agenda/:id/approve","method":"POST","service_name":"Agenda Service","access_label":"AUTHORIZE","status":"Active"},{"id":"agd_view","label":"View Agenda","label_key":"permissions.items.viewAgenda","group_id":"agenda-documents","endpoint":"/api/v1/agenda","method":"GET","service_name":"Agenda Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_upload","label":"Upload Documents","label_key":"permissions.items.uploadDocuments","group_id":"agenda-documents","endpoint":"/api/v1/documents","method":"POST","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_view","label":"View Documents","label_key":"permissions.items.viewDocuments","group_id":"agenda-documents","endpoint":"/api/v1/documents","method":"GET","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_download","label":"Download Documents","label_key":"permissions.items.downloadDocuments","group_id":"agenda-documents","endpoint":"/api/v1/documents/:id/download","method":"GET","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_edit","label":"Edit Documents","label_key":"permissions.items.editDocuments","group_id":"agenda-documents","endpoint":"/api/v1/documents/:id","method":"PUT","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_comment","label":"Comment on Documents","label_key":"permissions.items.commentDocuments","group_id":"agenda-documents","endpoint":"/api/v1/documents/:id/comments","method":"POST","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_review","label":"Review Documents","label_key":"permissions.items.reviewDocuments","group_id":"agenda-documents","endpoint":"/api/v1/documents/:id/review","method":"POST","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_approve","label":"Approve Documents","label_key":"permissions.items.approveDocuments","group_id":"agenda-documents","endpoint":"/api/v1/documents/:id/approve","method":"POST","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_publish","label":"Publish Documents","label_key":"permissions.items.publishDocuments","group_id":"agenda-documents","endpoint":"/api/v1/documents/:id/publish","method":"POST","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_share","label":"Share Documents","label_key":"permissions.items.shareDocuments","group_id":"agenda-documents","endpoint":"/api/v1/documents/:id/access","method":"POST","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_manage_versions","label":"Manage Document Versions","label_key":"permissions.items.manageVersions","group_id":"agenda-documents","endpoint":"/api/v1/documents/:id/versions","method":"POST","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"doc_archive","label":"Archive Documents","label_key":"permissions.items.archiveDocuments","group_id":"agenda-documents","endpoint":"/api/v1/documents/:id/archive","method":"POST","service_name":"Document Service","access_label":"AUTHORIZE","status":"Active"},{"id":"pack_create","label":"Create Board Pack","label_key":"permissions.items.createBoardPack","group_id":"agenda-documents","endpoint":"/api/v1/board-packs","method":"POST","service_name":"Board Pack Service","access_label":"AUTHORIZE","status":"Active"},{"id":"pack_publish","label":"Publish Board Pack","label_key":"permissions.items.publishBoardPack","group_id":"agenda-documents","endpoint":"/api/v1/board-packs/:id/publish","method":"POST","service_name":"Board Pack Service","access_label":"AUTHORIZE","status":"Active"},{"id":"pack_view","label":"View Board Pack","label_key":"permissions.items.viewBoardPack","group_id":"agenda-documents","endpoint":"/api/v1/board-packs","method":"GET","service_name":"Board Pack Service","access_label":"AUTHORIZE","status":"Active"},{"id":"dec_record","label":"Record Decision","label_key":"permissions.items.recordDecision","group_id":"decisions-followup","endpoint":"/api/v1/decisions","method":"POST","service_name":"Decision Service","access_label":"AUTHORIZE","status":"Active"},{"id":"dec_view","label":"View Decisions","label_key":"permissions.items.viewDecisions","group_id":"decisions-followup","endpoint":"/api/v1/decisions","method":"GET","service_name":"Decision Service","access_label":"AUTHORIZE","status":"Active"},{"id":"dec_approve","label":"Approve Decision","label_key":"permissions.items.approveDecision","group_id":"decisions-followup","endpoint":"/api/v1/decisions/:id/approve","method":"POST","service_name":"Decision Service","access_label":"AUTHORIZE","status":"Active"},{"id":"res_create","label":"Create Resolution","label_key":"permissions.items.createResolution","group_id":"decisions-followup","endpoint":"/api/v1/resolutions","method":"POST","service_name":"Resolution Service","access_label":"AUTHORIZE","status":"Active"},{"id":"res_view","label":"View Resolutions","label_key":"permissions.items.viewResolutions","group_id":"decisions-followup","endpoint":"/api/v1/resolutions","method":"GET","service_name":"Resolution Service","access_label":"AUTHORIZE","status":"Active"},{"id":"res_approve","label":"Approve Resolution","label_key":"permissions.items.approveResolution","group_id":"decisions-followup","endpoint":"/api/v1/resolutions/:id/approve","method":"POST","service_name":"Resolution Service","access_label":"AUTHORIZE","status":"Active"},{"id":"act_create","label":"Assign Action Item","label_key":"permissions.items.assignActionItem","group_id":"decisions-followup","endpoint":"/api/v1/action-items","method":"POST","service_name":"Action Service","access_label":"AUTHORIZE","status":"Active"},{"id":"act_view","label":"View Action Items","label_key":"permissions.items.viewActionItems","group_id":"decisions-followup","endpoint":"/api/v1/action-items","method":"GET","service_name":"Action Service","access_label":"AUTHORIZE","status":"Active"},{"id":"act_update","label":"Update Action Item","label_key":"permissions.items.updateActionItem","group_id":"decisions-followup","endpoint":"/api/v1/action-items/:id","method":"PUT","service_name":"Action Service","access_label":"AUTHORIZE","status":"Active"},{"id":"act_close","label":"Close Action Item","label_key":"permissions.items.closeActionItem","group_id":"decisions-followup","endpoint":"/api/v1/action-items/:id/close","method":"POST","service_name":"Action Service","access_label":"AUTHORIZE","status":"Active"},{"id":"min_create","label":"Create Minutes","label_key":"permissions.items.createMinutes","group_id":"decisions-followup","endpoint":"/api/v1/minutes","method":"POST","service_name":"Minutes Service","access_label":"AUTHORIZE","status":"Active"},{"id":"min_approve","label":"Approve Minutes","label_key":"permissions.items.approveMinutes","group_id":"decisions-followup","endpoint":"/api/v1/minutes/:id/approve","method":"POST","service_name":"Minutes Service","access_label":"AUTHORIZE","status":"Active"},{"id":"gov_body_view","label":"View Governance Bodies","label_key":"permissions.items.viewGovernanceBodies","group_id":"governance-org","endpoint":"/api/v1/governance-bodies","method":"GET","service_name":"Governance Service","access_label":"AUTHORIZE","status":"Active"},{"id":"gov_body_manage","label":"Manage Governance Bodies","label_key":"permissions.items.manageGovernanceBodies","group_id":"governance-org","endpoint":"/api/v1/governance-bodies","method":"POST","service_name":"Governance Service","access_label":"AUTHORIZE","status":"Active"},{"id":"gov_group_view","label":"View Participant Groups","label_key":"permissions.items.viewParticipantGroups","group_id":"governance-org","endpoint":"/api/v1/participant-groups","method":"GET","service_name":"Governance Service","access_label":"AUTHORIZE","status":"Active"},{"id":"gov_group_manage","label":"Manage Participant Groups","label_key":"permissions.items.manageParticipantGroups","group_id":"governance-org","endpoint":"/api/v1/participant-groups","method":"POST","service_name":"Governance Service","access_label":"AUTHORIZE","status":"Active"},{"id":"gov_org_view","label":"View Organisation Units","label_key":"permissions.items.viewOrgUnits","group_id":"governance-org","endpoint":"/api/v1/org-units","method":"GET","service_name":"Governance Service","access_label":"AUTHORIZE","status":"Active"},{"id":"gov_org_manage","label":"Manage Organisation Units","label_key":"permissions.items.manageOrgUnits","group_id":"governance-org","endpoint":"/api/v1/org-units","method":"POST","service_name":"Governance Service","access_label":"AUTHORIZE","status":"Active"},{"id":"gov_ext_reg","label":"External Participant Registration","label_key":"permissions.items.externalParticipantRegistration","group_id":"governance-org","endpoint":"/api/v1/external-registration","method":"GET","service_name":"Admin Service","access_label":"AUTH","status":"Active"},{"id":"arc_view","label":"View Archive","label_key":"permissions.items.viewArchive","group_id":"archive-reports","endpoint":"/api/v1/archive","method":"GET","service_name":"Archive Service","access_label":"AUTHORIZE","status":"Active"},{"id":"arc_export","label":"Export Archive","label_key":"permissions.items.exportArchive","group_id":"archive-reports","endpoint":"/api/v1/archive/export","method":"POST","service_name":"Archive Service","access_label":"AUTHORIZE","status":"Active"},{"id":"rep_meeting","label":"View Meeting Activity Report","label_key":"permissions.items.viewMeetingReport","group_id":"archive-reports","endpoint":"/api/v1/reports/meetings","method":"GET","service_name":"Report Service","access_label":"AUTHORIZE","status":"Active"},{"id":"rep_decisions","label":"View Decision Tracking Report","label_key":"permissions.items.viewDecisionReport","group_id":"archive-reports","endpoint":"/api/v1/reports/decisions","method":"GET","service_name":"Report Service","access_label":"AUTHORIZE","status":"Active"},{"id":"rep_actions","label":"View Action Item Report","label_key":"permissions.items.viewActionReport","group_id":"archive-reports","endpoint":"/api/v1/reports/action-items","method":"GET","service_name":"Report Service","access_label":"AUTHORIZE","status":"Active"},{"id":"rep_attendance","label":"View Attendance Report","label_key":"permissions.items.viewAttendanceReport","group_id":"archive-reports","endpoint":"/api/v1/reports/attendance","method":"GET","service_name":"Report Service","access_label":"AUTHORIZE","status":"Active"},{"id":"rep_governance","label":"View Governance Summary","label_key":"permissions.items.viewGovernanceReport","group_id":"archive-reports","endpoint":"/api/v1/reports/governance","method":"GET","service_name":"Report Service","access_label":"AUTHORIZE","status":"Active"},{"id":"rep_export","label":"Export Report","label_key":"permissions.items.exportReport","group_id":"archive-reports","endpoint":"/api/v1/reports/export","method":"POST","service_name":"Report Service","access_label":"AUTHORIZE","status":"Active"},{"id":"rep_print","label":"Print Report","label_key":"permissions.items.printReport","group_id":"archive-reports","endpoint":"/api/v1/reports/print","method":"POST","service_name":"Report Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_users","label":"User Management","label_key":"permissions.items.userManagement","group_id":"administration","endpoint":"/api/v1/admin/users","method":"GET","service_name":"User Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_users_add","label":"Add / Release User","label_key":"permissions.items.addReleaseUser","group_id":"administration","endpoint":"/api/v1/admin/users","method":"POST","service_name":"User Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_users_reassign","label":"Re-Assign User","label_key":"permissions.items.reassignUser","group_id":"administration","endpoint":"/api/v1/admin/users/reassign","method":"PUT","service_name":"User Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_roles","label":"Manage Roles & Permissions","label_key":"permissions.items.manageRoles","group_id":"administration","endpoint":"/api/v1/admin/roles","method":"POST","service_name":"Admin Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_templates","label":"Manage Templates","label_key":"permissions.items.manageTemplates","group_id":"administration","endpoint":"/api/v1/admin/templates","method":"POST","service_name":"Admin Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_notifications","label":"Manage Notification Rules","label_key":"permissions.items.manageNotifications","group_id":"administration","endpoint":"/api/v1/admin/notification-rules","method":"POST","service_name":"Admin Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_approvals","label":"Manage Approval Rules","label_key":"permissions.items.manageApprovalRules","group_id":"administration","endpoint":"/api/v1/admin/approval-rules","method":"POST","service_name":"Admin Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_workflows","label":"Manage Workflows","label_key":"permissions.items.manageWorkflows","group_id":"administration","endpoint":"/api/v1/admin/workflows","method":"POST","service_name":"Admin Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_integrations","label":"Manage Integrations","label_key":"permissions.items.manageIntegrations","group_id":"administration","endpoint":"/api/v1/admin/integrations","method":"POST","service_name":"Admin Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_config","label":"System Configuration","label_key":"permissions.items.systemConfiguration","group_id":"administration","endpoint":"/api/v1/admin/config","method":"POST","service_name":"Admin Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_audit_log","label":"View Audit Log","label_key":"permissions.items.viewAuditLog","group_id":"administration","endpoint":"/api/v1/admin/audit-log","method":"GET","service_name":"Audit Service","access_label":"AUTHORIZE","status":"Active"},{"id":"admin_retention","label":"Manage Retention Policies","label_key":"permissions.items.manageRetention","group_id":"administration","endpoint":"/api/v1/admin/retention","method":"POST","service_name":"Admin Service","access_label":"AUTHORIZE","status":"Active"}]'::jsonb) as j(
 id text,label text,label_key text,group_id text,endpoint text,
 method text,service_name text,access_label text,status text
);
insert into public.convay_role_permissions(role_id,permission_id)
select r.id,p.id from public.convay_roles r cross join public.convay_permissions p
where r.is_system_role and p.status='Active';

-- New permission definitions remain included in the protected Super Admin role.
create function convay_private.grant_new_permission_to_super_admin() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into public.convay_role_permissions(role_id,permission_id)
 select id,new.id from public.convay_roles where is_system_role;
 return new;
end $$;
revoke all on function convay_private.grant_new_permission_to_super_admin() from public,anon,authenticated;
create trigger convay_permission_admin_grant after insert on public.convay_permissions
 for each row execute function convay_private.grant_new_permission_to_super_admin();

-- A trusted service can manage custom roles, but cannot demote/delete the sole system role.
create function convay_private.protect_super_admin_role() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.is_system_role and (
  TG_OP = 'DELETE' or
  new.is_system_role is distinct from true or
  new.status <> 'Active' or
  new.name <> old.name
 ) then
  raise exception 'The sole Super Admin role is protected';
 end if;
 return case when TG_OP='DELETE' then old else new end;
end $$;
revoke all on function convay_private.protect_super_admin_role() from public,anon,authenticated;
create trigger convay_protect_system_role
 before update or delete on public.convay_roles
 for each row execute function convay_private.protect_super_admin_role();
