export interface PermissionItem {
  id: string;
  label: string;
  labelKey?: string;
  endpoint?: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  serviceName?: string;
  accessLabel?: "PUBLIC" | "AUTH" | "AUTHORIZE";
  status?: "Active" | "Inactive";
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
export interface PermGroupDef { id: string; label: string; labelKey?: string; permissions: PermissionItem[]; }

export const PERM_GROUPS: PermGroupDef[] = [
  { id: "home", label: "Home", labelKey: "permissions.groups.home", permissions: [
    { id: "home_dashboard",    label: "View Dashboard",            labelKey: "permissions.items.viewDashboard",       endpoint: "/api/v1/dashboard",                  method: "GET",  serviceName: "Dashboard Service",   accessLabel: "AUTHORIZE", status: "Active" },
    { id: "home_overview",     label: "View Overview",             labelKey: "permissions.items.viewOverview",        endpoint: "/api/v1/dashboard/overview",         method: "GET",  serviceName: "Dashboard Service",   accessLabel: "AUTHORIZE", status: "Active" },
    { id: "home_my_tasks",     label: "View My Tasks",             labelKey: "permissions.items.viewMyTasks",         endpoint: "/api/v1/dashboard/my-tasks",         method: "GET",  serviceName: "Dashboard Service",   accessLabel: "AUTHORIZE", status: "Active" },
    { id: "home_my_calendar",  label: "View My Calendar",          labelKey: "permissions.items.viewMyCalendar",      endpoint: "/api/v1/dashboard/calendar",         method: "GET",  serviceName: "Dashboard Service",   accessLabel: "AUTHORIZE", status: "Active" },
    { id: "home_notifications",label: "View Notifications",        labelKey: "permissions.items.viewNotifications",   endpoint: "/api/v1/notifications",              method: "GET",  serviceName: "Notification Service",accessLabel: "AUTHORIZE", status: "Active" },
  ] },
  { id: "meetings", label: "Meetings", labelKey: "permissions.groups.meetings", permissions: [
    { id: "mtg_view",          label: "View Meetings",             labelKey: "permissions.items.viewMeetings",        endpoint: "/api/v1/meetings",                   method: "GET",  serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_create",        label: "Create Meeting",            labelKey: "permissions.items.createMeeting",       endpoint: "/api/v1/meetings",                   method: "POST", serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_update",        label: "Update Meeting",            labelKey: "permissions.items.updateMeeting",       endpoint: "/api/v1/meetings/:id",               method: "PUT",  serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_approve",       label: "Approve Meeting",           labelKey: "permissions.items.approveMeeting",      endpoint: "/api/v1/meetings/:id/approve",       method: "POST", serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_cancel",        label: "Cancel Meeting",            labelKey: "permissions.items.cancelMeeting",       endpoint: "/api/v1/meetings/:id/cancel",        method: "POST", serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_postpone",      label: "Postpone Meeting",          labelKey: "permissions.items.postponeMeeting",     endpoint: "/api/v1/meetings/:id/postpone",      method: "POST", serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_start",         label: "Start Meeting",             labelKey: "permissions.items.startMeeting",        endpoint: "/api/v1/meetings/:id/start",         method: "POST", serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_join",          label: "Join Live Meeting",         labelKey: "permissions.items.joinMeeting",         endpoint: "/api/v1/meetings/:id/join",          method: "POST", serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_participants",  label: "Manage Participants",       labelKey: "permissions.items.manageParticipants",  endpoint: "/api/v1/meetings/:id/participants",  method: "POST", serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_rsvp",          label: "Manage RSVP",              labelKey: "permissions.items.manageRsvp",          endpoint: "/api/v1/meetings/:id/rsvp",          method: "POST", serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_poll",          label: "Create Availability Poll",  labelKey: "permissions.items.createAvailabilityPoll", endpoint: "/api/v1/availability-polls",      method: "POST", serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "mtg_attendance",    label: "Record Attendance",         labelKey: "permissions.items.recordAttendance",    endpoint: "/api/v1/meetings/:id/attendance",    method: "POST", serviceName: "Meeting Service",     accessLabel: "AUTHORIZE", status: "Active" },
  ] },
  { id: "agenda-documents", label: "Agenda & Documents", labelKey: "permissions.groups.agendaDocuments", permissions: [
    { id: "agd_submit",        label: "Submit Agenda",             labelKey: "permissions.items.submitAgenda",        endpoint: "/api/v1/agenda",                     method: "POST", serviceName: "Agenda Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "agd_review",        label: "Review Agenda",             labelKey: "permissions.items.reviewAgenda",        endpoint: "/api/v1/agenda/:id/review",          method: "POST", serviceName: "Agenda Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "agd_approve",       label: "Approve Agenda",            labelKey: "permissions.items.approveAgenda",       endpoint: "/api/v1/agenda/:id/approve",         method: "POST", serviceName: "Agenda Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "agd_view",          label: "View Agenda",               labelKey: "permissions.items.viewAgenda",          endpoint: "/api/v1/agenda",                     method: "GET",  serviceName: "Agenda Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_upload",        label: "Upload Documents",          labelKey: "permissions.items.uploadDocuments",     endpoint: "/api/v1/documents",                  method: "POST", serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_view",          label: "View Documents",            labelKey: "permissions.items.viewDocuments",       endpoint: "/api/v1/documents",                  method: "GET",  serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_download",        label: "Download Documents",          labelKey: "permissions.items.downloadDocuments",     endpoint: "/api/v1/documents/:id/download",       method: "GET",  serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_edit",            label: "Edit Documents",              labelKey: "permissions.items.editDocuments",         endpoint: "/api/v1/documents/:id",                method: "PUT",  serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_comment",         label: "Comment on Documents",        labelKey: "permissions.items.commentDocuments",      endpoint: "/api/v1/documents/:id/comments",       method: "POST", serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_review",          label: "Review Documents",            labelKey: "permissions.items.reviewDocuments",       endpoint: "/api/v1/documents/:id/review",         method: "POST", serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_approve",         label: "Approve Documents",           labelKey: "permissions.items.approveDocuments",      endpoint: "/api/v1/documents/:id/approve",        method: "POST", serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_publish",         label: "Publish Documents",           labelKey: "permissions.items.publishDocuments",      endpoint: "/api/v1/documents/:id/publish",        method: "POST", serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_share",           label: "Share Documents",             labelKey: "permissions.items.shareDocuments",        endpoint: "/api/v1/documents/:id/access",         method: "POST", serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_manage_versions", label: "Manage Document Versions",    labelKey: "permissions.items.manageVersions",        endpoint: "/api/v1/documents/:id/versions",       method: "POST", serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "doc_archive",         label: "Archive Documents",           labelKey: "permissions.items.archiveDocuments",      endpoint: "/api/v1/documents/:id/archive",        method: "POST", serviceName: "Document Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "pack_create",       label: "Create Board Pack",         labelKey: "permissions.items.createBoardPack",     endpoint: "/api/v1/board-packs",                method: "POST", serviceName: "Board Pack Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "pack_publish",      label: "Publish Board Pack",        labelKey: "permissions.items.publishBoardPack",    endpoint: "/api/v1/board-packs/:id/publish",    method: "POST", serviceName: "Board Pack Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "pack_view",         label: "View Board Pack",           labelKey: "permissions.items.viewBoardPack",       endpoint: "/api/v1/board-packs",                method: "GET",  serviceName: "Board Pack Service",  accessLabel: "AUTHORIZE", status: "Active" },
  ] },
  { id: "decisions-followup", label: "Decisions & Follow-up", labelKey: "permissions.groups.decisionsFollowup", permissions: [
    { id: "dec_record",        label: "Record Decision",           labelKey: "permissions.items.recordDecision",      endpoint: "/api/v1/decisions",                  method: "POST", serviceName: "Decision Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "dec_view",          label: "View Decisions",            labelKey: "permissions.items.viewDecisions",       endpoint: "/api/v1/decisions",                  method: "GET",  serviceName: "Decision Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "dec_approve",       label: "Approve Decision",          labelKey: "permissions.items.approveDecision",     endpoint: "/api/v1/decisions/:id/approve",      method: "POST", serviceName: "Decision Service",    accessLabel: "AUTHORIZE", status: "Active" },
    { id: "res_create",        label: "Create Resolution",         labelKey: "permissions.items.createResolution",    endpoint: "/api/v1/resolutions",                method: "POST", serviceName: "Resolution Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "res_view",          label: "View Resolutions",          labelKey: "permissions.items.viewResolutions",     endpoint: "/api/v1/resolutions",                method: "GET",  serviceName: "Resolution Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "res_approve",       label: "Approve Resolution",        labelKey: "permissions.items.approveResolution",   endpoint: "/api/v1/resolutions/:id/approve",    method: "POST", serviceName: "Resolution Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "act_create",        label: "Assign Action Item",        labelKey: "permissions.items.assignActionItem",    endpoint: "/api/v1/action-items",               method: "POST", serviceName: "Action Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "act_view",          label: "View Action Items",         labelKey: "permissions.items.viewActionItems",     endpoint: "/api/v1/action-items",               method: "GET",  serviceName: "Action Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "act_update",        label: "Update Action Item",        labelKey: "permissions.items.updateActionItem",    endpoint: "/api/v1/action-items/:id",           method: "PUT",  serviceName: "Action Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "act_close",         label: "Close Action Item",         labelKey: "permissions.items.closeActionItem",     endpoint: "/api/v1/action-items/:id/close",     method: "POST", serviceName: "Action Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "min_create",        label: "Create Minutes",            labelKey: "permissions.items.createMinutes",       endpoint: "/api/v1/minutes",                    method: "POST", serviceName: "Minutes Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "min_approve",       label: "Approve Minutes",           labelKey: "permissions.items.approveMinutes",      endpoint: "/api/v1/minutes/:id/approve",        method: "POST", serviceName: "Minutes Service",     accessLabel: "AUTHORIZE", status: "Active" },
  ] },
  { id: "governance-org", label: "Governance & Organisation", labelKey: "permissions.groups.governanceOrg", permissions: [
    { id: "gov_body_view",     label: "View Governance Bodies",    labelKey: "permissions.items.viewGovernanceBodies", endpoint: "/api/v1/governance-bodies",         method: "GET",  serviceName: "Governance Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "gov_body_manage",   label: "Manage Governance Bodies",  labelKey: "permissions.items.manageGovernanceBodies",endpoint: "/api/v1/governance-bodies",        method: "POST", serviceName: "Governance Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "gov_group_view",    label: "View Participant Groups",   labelKey: "permissions.items.viewParticipantGroups",endpoint: "/api/v1/participant-groups",         method: "GET",  serviceName: "Governance Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "gov_group_manage",  label: "Manage Participant Groups", labelKey: "permissions.items.manageParticipantGroups",endpoint: "/api/v1/participant-groups",       method: "POST", serviceName: "Governance Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "gov_org_view",      label: "View Organisation Units",   labelKey: "permissions.items.viewOrgUnits",        endpoint: "/api/v1/org-units",                  method: "GET",  serviceName: "Governance Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "gov_org_manage",    label: "Manage Organisation Units", labelKey: "permissions.items.manageOrgUnits",      endpoint: "/api/v1/org-units",                  method: "POST", serviceName: "Governance Service",  accessLabel: "AUTHORIZE", status: "Active" },
    { id: "gov_ext_reg",       label: "External Participant Registration", labelKey: "permissions.items.externalParticipantRegistration", endpoint: "/api/v1/external-registration", method: "GET", serviceName: "Admin Service", accessLabel: "AUTH", status: "Active" },
  ] },
  { id: "archive-reports", label: "Archive & Reports", labelKey: "permissions.groups.archiveReports", permissions: [
    { id: "arc_view",          label: "View Archive",              labelKey: "permissions.items.viewArchive",         endpoint: "/api/v1/archive",                    method: "GET",  serviceName: "Archive Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "arc_export",        label: "Export Archive",            labelKey: "permissions.items.exportArchive",       endpoint: "/api/v1/archive/export",             method: "POST", serviceName: "Archive Service",     accessLabel: "AUTHORIZE", status: "Active" },
    { id: "rep_meeting",       label: "View Meeting Activity Report",  labelKey: "permissions.items.viewMeetingReport",   endpoint: "/api/v1/reports/meetings",       method: "GET",  serviceName: "Report Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "rep_decisions",     label: "View Decision Tracking Report", labelKey: "permissions.items.viewDecisionReport",  endpoint: "/api/v1/reports/decisions",      method: "GET",  serviceName: "Report Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "rep_actions",       label: "View Action Item Report",   labelKey: "permissions.items.viewActionReport",    endpoint: "/api/v1/reports/action-items",       method: "GET",  serviceName: "Report Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "rep_attendance",    label: "View Attendance Report",    labelKey: "permissions.items.viewAttendanceReport",endpoint: "/api/v1/reports/attendance",         method: "GET",  serviceName: "Report Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "rep_governance",    label: "View Governance Summary",   labelKey: "permissions.items.viewGovernanceReport",endpoint: "/api/v1/reports/governance",         method: "GET",  serviceName: "Report Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "rep_export",        label: "Export Report",             labelKey: "permissions.items.exportReport",        endpoint: "/api/v1/reports/export",             method: "POST", serviceName: "Report Service",      accessLabel: "AUTHORIZE", status: "Active" },
    { id: "rep_print",         label: "Print Report",              labelKey: "permissions.items.printReport",         endpoint: "/api/v1/reports/print",              method: "POST", serviceName: "Report Service",      accessLabel: "AUTHORIZE", status: "Active" },
  ] },
  { id: "administration", label: "Administration", labelKey: "permissions.groups.administration", permissions: [
    { id: "admin_users",       label: "User Management",           labelKey: "permissions.items.userManagement",      endpoint: "/api/v1/admin/users",                method: "GET",  serviceName: "User Service",        accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_users_add",   label: "Add / Release User",        labelKey: "permissions.items.addReleaseUser",      endpoint: "/api/v1/admin/users",                method: "POST", serviceName: "User Service",        accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_users_reassign", label: "Re-Assign User",         labelKey: "permissions.items.reassignUser",        endpoint: "/api/v1/admin/users/reassign",       method: "PUT",  serviceName: "User Service",        accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_roles",       label: "Manage Roles & Permissions",labelKey: "permissions.items.manageRoles",         endpoint: "/api/v1/admin/roles",                method: "POST", serviceName: "Admin Service",       accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_templates",   label: "Manage Templates",          labelKey: "permissions.items.manageTemplates",     endpoint: "/api/v1/admin/templates",            method: "POST", serviceName: "Admin Service",       accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_notifications",label: "Manage Notification Rules",labelKey: "permissions.items.manageNotifications", endpoint: "/api/v1/admin/notification-rules",   method: "POST", serviceName: "Admin Service",       accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_approvals",   label: "Manage Approval Rules",     labelKey: "permissions.items.manageApprovalRules", endpoint: "/api/v1/admin/approval-rules",       method: "POST", serviceName: "Admin Service",       accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_workflows",   label: "Manage Workflows",          labelKey: "permissions.items.manageWorkflows",     endpoint: "/api/v1/admin/workflows",            method: "POST", serviceName: "Admin Service",       accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_integrations",label: "Manage Integrations",       labelKey: "permissions.items.manageIntegrations",  endpoint: "/api/v1/admin/integrations",         method: "POST", serviceName: "Admin Service",       accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_config",      label: "System Configuration",      labelKey: "permissions.items.systemConfiguration", endpoint: "/api/v1/admin/config",               method: "POST", serviceName: "Admin Service",       accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_audit_log",   label: "View Audit Log",            labelKey: "permissions.items.viewAuditLog",        endpoint: "/api/v1/admin/audit-log",            method: "GET",  serviceName: "Audit Service",       accessLabel: "AUTHORIZE", status: "Active" },
    { id: "admin_retention",   label: "Manage Retention Policies", labelKey: "permissions.items.manageRetention",     endpoint: "/api/v1/admin/retention",            method: "POST", serviceName: "Admin Service",       accessLabel: "AUTHORIZE", status: "Active" },
  ] },
];

export const ALL_PERM_IDS = PERM_GROUPS.flatMap((g) => g.permissions.map((p) => p.id));
