import { createBrowserRouter, redirect } from "react-router";
import { AppRoot } from "./layouts/AppRoot";
import { PlaceholderPage } from "./pages/PlaceholderPage";

// ─── Static page imports (no lazy — dynamic import() fails in Make proxy) ────

import { LiveMeetingPage }          from "./pages/meetings/LiveMeetingPage";
import { DashboardPage }            from "./pages/dashboard/DashboardPage";
import { PSRDashboardPage }         from "./pages/dashboard/PSRDashboardPage";
import { CombinedDashboardPage }    from "./pages/dashboard/CombinedDashboardPage";
import { ReportViewPage }           from "./pages/report/ReportViewPage";
import { ReturnViewApprovalPage }   from "./pages/return-register/ReturnViewApprovalPage";
import { OnlineReturnRegisterPage } from "./pages/return-register/OnlineReturnRegisterPage";
import { OfflineReturnRegisterPage } from "./pages/return-register/OfflineReturnRegisterPage";
import { OnlineArchivePage }        from "./pages/return-register/OnlineArchivePage";
import { Register4ListPage }        from "./pages/register-stock/Register4ListPage";
import { TaxRegistryPage }          from "./pages/register-stock/TaxRegistryPage";
import { DocumentEditorPage }       from "./pages/agenda-documents/DocumentEditorPage";
import { BoardPacksPage }           from "./pages/agenda-documents/BoardPacksPage";
import { PSRApprovalPage }          from "./pages/psr-verification/PSRApprovalPage";
import { PSREditRequestPage }       from "./pages/psr-verification/PSREditRequestPage";
import { DoubleEntryStatusPage }    from "./pages/psr-verification/DoubleEntryStatusPage";
import { InvalidListPage }          from "./pages/psr-verification/InvalidListPage";
import { ApprovalListPage }         from "./pages/psr-verification/ApprovalListPage";
import { TransferHistoryPage }      from "./pages/psr-verification/TransferHistoryPage";
import { UserManagementPage }       from "./pages/administration-requests/UserManagementPage";
import { RoleManagementPage }       from "./pages/administration-requests/RoleManagementPage";
import { PermissionListPage }       from "./pages/administration-requests/PermissionListPage";
import { ParticipantGroupsPage }    from "./pages/governance/ParticipantGroupsPage";
import { OrganizationStructurePage } from "./pages/governance/OrganizationStructurePage";
import { TimeExtensionPage }        from "./pages/administration-requests/TimeExtensionPage";
import { AuditSelectionPage }       from "./pages/administration-requests/AuditSelectionPage";

import { WorkflowDefinitionsPage, ApprovalRulesPage, ReviewRevisionRulesPage, WorkflowHistoryPage } from "./pages/administration/WorkflowPages";
import { MeetingTypesPage, QuorumRulesPage, VotingMethodsPage, StatusesNumberingPage } from "./pages/administration/MeetingConfigPages";
import { MeetingAgendaTemplatesPage, MinutesResolutionTemplatesPage, DocumentTemplatesPage, CommunicationTemplatesPage } from "./pages/administration/TemplatePages";
import { NotificationRulesPage, MessageTemplatesPage, DeliveryLogsPage } from "./pages/administration/NotificationPages";
import { IntegrationsPage } from "./pages/administration/IntegrationsPage";

import { MeetingArchivePage }              from "./pages/archive-reports/MeetingArchivePage";
import { MeetingRecordPage }               from "./pages/archive-reports/MeetingRecordPage";
import {
  ResolutionRegisterPage,
  DecisionRegisterPage,
  ActionRegisterPage,
  AttendanceRegisterPage,
  ConflictRegisterPage,
} from "./pages/archive-reports/RegisterPages";
import { MinutesManagementPage }           from "./pages/archive-reports/MinutesManagementPage";
import {
  MeetingPerformanceAnalyticsPage,
  ParticipationAnalyticsPage,
  GovernanceReportPage,
  DecisionsActionsAnalyticsPage,
  FinancialResourceImpactPage,
} from "./pages/archive-reports/AnalyticsPages";

// ─── Route components ─────────────────────────────────────────────────────────

function MeetingArchiveRoute()          { return <MeetingArchivePage />; }
function MeetingRecordRoute()           { return <MeetingRecordPage />; }
function ResolutionRegisterRoute()      { return <ResolutionRegisterPage />; }
function DecisionRegisterRoute()        { return <DecisionRegisterPage />; }
function ActionRegisterRoute()          { return <ActionRegisterPage />; }
function AttendanceRegisterRoute()      { return <AttendanceRegisterPage />; }
function ConflictRegisterRoute()        { return <ConflictRegisterPage />; }
function MinutesManagementRoute()       { return <MinutesManagementPage />; }
function MeetingPerformanceRoute()      { return <MeetingPerformanceAnalyticsPage />; }
function ParticipationRoute()           { return <ParticipationAnalyticsPage />; }
function GovernanceReportRoute()        { return <GovernanceReportPage />; }
function DecisionsActionsRoute()        { return <DecisionsActionsAnalyticsPage />; }
function FinancialResourceImpactRoute() { return <FinancialResourceImpactPage />; }
function AuditTrailRoute()              { return <ReportViewPage reportId="user-activity-report" />; }

// preloadAllRoutes is a no-op now — all routes are statically imported
export function preloadAllRoutes() {}

// ─── Router ───────────────────────────────────────────────────────────────────

export const router = createBrowserRouter([
  {
    path: "/",
    Component: AppRoot,
    children: [
      // Root → home/overview
      { index: true, loader: async () => redirect("/home/overview") },

      // Parent placeholder routes
      { path: "home",               Component: PlaceholderPage },
      { path: "meetings",           Component: PlaceholderPage },
      { path: "agenda-documents",   Component: PlaceholderPage },
      { path: "decisions-followup", Component: PlaceholderPage },
      { path: "governance-org",     Component: PlaceholderPage },
      { path: "archive-reports",    Component: PlaceholderPage },
      { path: "administration",     Component: PlaceholderPage },

      // ── Home ──────────────────────────────────────────────────────────────
      { path: "home/overview",    Component: DashboardPage },
      { path: "home/my-tasks",    Component: PSRDashboardPage },
      { path: "home/my-calendar", Component: CombinedDashboardPage },

      // ── Meetings ──────────────────────────────────────────────────────────
      { path: "meetings/meeting-overview",  Component: ReturnViewApprovalPage },
      { path: "meetings/all-meetings",      Component: OnlineReturnRegisterPage },
      { path: "meetings/meeting-calendar",  Component: OfflineReturnRegisterPage },
      { path: "meetings/meeting-templates", Component: OnlineArchivePage },
      { path: "meetings/:meetingId/live",   Component: LiveMeetingPage },
      { path: "meetings/:meetingId/record", Component: MeetingRecordRoute },

      // ── Agenda & Documents ────────────────────────────────────────────────
      { path: "agenda-documents/agenda-management",                        Component: Register4ListPage },
      { path: "agenda-documents/board-packs",                              Component: BoardPacksPage },
      { path: "agenda-documents/document-library",                         Component: TaxRegistryPage },
      { path: "agenda-documents/document-library/:documentId/editor",      Component: DocumentEditorPage },

      // ── Decisions & Follow-up ─────────────────────────────────────────────
      { path: "decisions-followup/decisions",    Component: PSRApprovalPage },
      { path: "decisions-followup/resolutions",  Component: PSREditRequestPage },
      { path: "decisions-followup/action-items", Component: DoubleEntryStatusPage },

      // ── Governance & Organization ─────────────────────────────────────────
      { path: "governance-org/governance-bodies",      Component: InvalidListPage },
      { path: "governance-org/organization-structure", Component: OrganizationStructurePage },
      { path: "governance-org/users-assignments",      Component: UserManagementPage },
      { path: "governance-org/designations-positions", Component: TransferHistoryPage },
      { path: "governance-org/participant-groups",     Component: ParticipantGroupsPage },

      // ── Archive & Reports ─────────────────────────────────────────────────
      { path: "archive-reports/meeting-archive",  Component: MeetingArchiveRoute },
      { path: "archive-reports/minutes",          Component: MinutesManagementRoute },
      // Registers (tabs)
      { path: "archive-reports/registers",                     loader: async () => redirect("/archive-reports/registers/resolution-register") },
      { path: "archive-reports/registers/resolution-register", Component: ResolutionRegisterRoute },
      { path: "archive-reports/registers/decision-register",   Component: DecisionRegisterRoute },
      { path: "archive-reports/registers/action-register",     Component: ActionRegisterRoute },
      { path: "archive-reports/registers/attendance-register", Component: AttendanceRegisterRoute },
      { path: "archive-reports/registers/conflict-register",   Component: ConflictRegisterRoute },
      // Reports & Analytics (tabs)
      { path: "archive-reports/reports-analytics",                           loader: async () => redirect("/archive-reports/reports-analytics/meeting-performance") },
      { path: "archive-reports/reports-analytics/meeting-performance",       Component: MeetingPerformanceRoute },
      { path: "archive-reports/reports-analytics/participation",             Component: ParticipationRoute },
      { path: "archive-reports/reports-analytics/governance",                Component: GovernanceReportRoute },
      { path: "archive-reports/reports-analytics/decisions-actions",         Component: DecisionsActionsRoute },
      { path: "archive-reports/reports-analytics/financial-resource-impact", Component: FinancialResourceImpactRoute },
      // Audit Trail
      { path: "archive-reports/audit-trail", Component: AuditTrailRoute },

      // ── Administration ────────────────────────────────────────────────────
      { path: "administration/roles-permissions",             loader: async () => redirect("/administration/roles-permissions/roles") },
      { path: "administration/roles-permissions/roles",       Component: RoleManagementPage },
      { path: "administration/roles-permissions/permissions", Component: PermissionListPage },
      { path: "administration/workflows",                       loader: async () => redirect("/administration/workflows/workflow-definitions") },
      { path: "administration/workflows/workflow-definitions",  Component: WorkflowDefinitionsPage },
      { path: "administration/workflows/approval-rules",        Component: ApprovalRulesPage },
      { path: "administration/workflows/review-revision-rules", Component: ReviewRevisionRulesPage },
      { path: "administration/workflows/workflow-history",      Component: WorkflowHistoryPage },
      { path: "administration/meeting-configuration",                     loader: async () => redirect("/administration/meeting-configuration/meeting-types") },
      { path: "administration/meeting-configuration/meeting-types",       Component: MeetingTypesPage },
      { path: "administration/meeting-configuration/quorum-rules",        Component: QuorumRulesPage },
      { path: "administration/meeting-configuration/voting-methods",      Component: VotingMethodsPage },
      { path: "administration/meeting-configuration/statuses-numbering",  Component: StatusesNumberingPage },
      { path: "administration/templates",                                loader: async () => redirect("/administration/templates/meeting-agenda-templates") },
      { path: "administration/templates/meeting-agenda-templates",       Component: MeetingAgendaTemplatesPage },
      { path: "administration/templates/minutes-resolution-templates",   Component: MinutesResolutionTemplatesPage },
      { path: "administration/templates/document-templates",             Component: DocumentTemplatesPage },
      { path: "administration/templates/communication-templates",        Component: CommunicationTemplatesPage },
      { path: "administration/notifications",                     loader: async () => redirect("/administration/notifications/notification-rules") },
      { path: "administration/notifications/notification-rules",  Component: NotificationRulesPage },
      { path: "administration/notifications/message-templates",   Component: MessageTemplatesPage },
      { path: "administration/notifications/delivery-logs",       Component: DeliveryLogsPage },
      { path: "administration/integrations", Component: IntegrationsPage },
      { path: "administration/security-retention",                        loader: async () => redirect("/administration/security-retention/security-policies") },
      { path: "administration/security-retention/security-policies",      Component: AuditSelectionPage },
      { path: "administration/security-retention/retention-legal-holds",  Component: TimeExtensionPage },

      // ── Backward compatibility redirects ──────────────────────────────────
      { path: "governance-org/user-management", loader: async () => redirect("/governance-org/users-assignments") },
      { path: "archive-reports/meeting-records", loader: async () => redirect("/archive-reports/meeting-archive") },
      { path: "dashboard",                    loader: async () => redirect("/home/overview") },
      { path: "dashboard/dashboard-main",     loader: async () => redirect("/home/overview") },
      { path: "dashboard/psr-dashboard",      loader: async () => redirect("/home/my-tasks") },
      { path: "dashboard/combined-dashboard", loader: async () => redirect("/home/my-calendar") },
      { path: "report",                       loader: async () => redirect("/archive-reports/meeting-archive") },
      { path: "return-register",              loader: async () => redirect("/meetings/meeting-overview") },
      { path: "return-register/return-view-approval",    loader: async () => redirect("/meetings/meeting-overview") },
      { path: "return-register/online-return-register",  loader: async () => redirect("/meetings/all-meetings") },
      { path: "return-register/offline-return-register", loader: async () => redirect("/meetings/meeting-calendar") },
      { path: "return-register/online-archive",          loader: async () => redirect("/meetings/meeting-templates") },
      { path: "register-stock",               loader: async () => redirect("/agenda-documents/agenda-management") },
      { path: "register-stock/register-4",    loader: async () => redirect("/agenda-documents/agenda-management") },
      { path: "register-stock/tax-registry",  loader: async () => redirect("/agenda-documents/document-library") },
      { path: "psr-verification",             loader: async () => redirect("/decisions-followup/decisions") },
      { path: "psr-verification/psr-approval",        loader: async () => redirect("/decisions-followup/decisions") },
      { path: "psr-verification/psr-edit-request",    loader: async () => redirect("/decisions-followup/resolutions") },
      { path: "psr-verification/double-entry-status", loader: async () => redirect("/decisions-followup/action-items") },
      { path: "misfiled-returns",             loader: async () => redirect("/governance-org/governance-bodies") },
      { path: "misfiled-returns/invalid-list",     loader: async () => redirect("/governance-org/governance-bodies") },
      { path: "misfiled-returns/approval-list",    loader: async () => redirect("/governance-org/organization-structure") },
      { path: "misfiled-returns/transfer-history", loader: async () => redirect("/governance-org/designations-positions") },
      { path: "case-financial",               loader: async () => redirect("/decisions-followup/decisions") },
      { path: "administration/user-management",     loader: async () => redirect("/governance-org/users-assignments") },
      { path: "administration/role-management",     loader: async () => redirect("/administration/roles-permissions/roles") },
      { path: "administration/permission-list",     loader: async () => redirect("/administration/roles-permissions/permissions") },
      { path: "administration/special-registration",loader: async () => redirect("/governance-org/participant-groups") },
      { path: "administration/time-extension",      loader: async () => redirect("/administration/security-retention/retention-legal-holds") },
      { path: "administration/audit-selection",     loader: async () => redirect("/administration/security-retention/security-policies") },
    ],
  },
], { basename: import.meta.env.BASE_URL });
