import {
  LayoutDashboard, BarChart2, FileCheck, ShieldCheck, Briefcase, Settings2,
  Tag, FileX, Activity, Scale, ScrollText, Building2, ArrowUpCircle, Landmark,
  List, ClipboardList,
  Layers, ShieldAlert, FileText, FileCheckIcon, FileWarning,
  BookOpen, Archive, CloudUpload, HardDrive, BadgeCheck, FilePen,
  CopyCheck, Network, FolderX, Ban, ListChecks,
  ArrowLeftRight, Receipt, CreditCard, KeyRound, Rows3,
  Notebook, BadgeInfo, Globe, History, FileStack, FolderOpen,
  CalendarDays, CheckSquare, Home,
} from "lucide-react";

// LucideIcon type for navigation
type LucideIcon = React.ComponentType<{
  size?: number;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
}>;

// Navigation structure types
export interface ThirdNavDef {
  id: string;
  label: string;
  labelKey?: string;
  icon?: LucideIcon;
  /** "phase2" items are kept in the tree but hidden from all visible UI. */
  visibility?: "phase1" | "phase2";
}

export interface SubNavDef {
  id: string;
  label: string;
  labelKey?: string;
  icon?: LucideIcon;
  children?: ThirdNavDef[];
  /** "phase2" items are kept in the tree but hidden from all visible UI. */
  visibility?: "phase1" | "phase2";
}

export interface MainNavDef {
  id: string;
  label: string;
  labelKey?: string;
  icon: LucideIcon;
  children: SubNavDef[];
  /** "phase2" items are kept in the tree but hidden from all visible UI. */
  visibility?: "phase1" | "phase2";
}

/**
 * Returns only the navigation items that should be visible in Phase 1.
 * Use this in all sidebar, mobile drawer, and breadcrumb components instead
 * of the raw NAVIGATION array, so Phase 2 items are hidden from a single source.
 */
export function getVisibleNav(): MainNavDef[] {
  return NAVIGATION.map((main) => {
    const visibleChildren = main.children
      .filter((sub) => sub.visibility !== "phase2")
      .map((sub) => ({
        ...sub,
        children: sub.children?.filter((third) => third.visibility !== "phase2"),
      }));
    return { ...main, children: visibleChildren };
  }).filter(
    (main) => main.visibility !== "phase2" && main.children.length > 0,
  );
}

export const NAVIGATION: MainNavDef[] = [
  {
    id: "home",
    label: "Home",
    labelKey: "navigation.home.main",
    icon: Home,
    children: [
      { id: "overview", label: "Overview", labelKey: "navigation.home.overview", icon: LayoutDashboard },
      { id: "my-tasks", label: "My Tasks", labelKey: "navigation.home.myTasks", icon: ShieldAlert },
      { id: "my-calendar", label: "My Calendar", labelKey: "navigation.home.myCalendar", icon: CalendarDays },
    ],
  },
  {
    id: "meetings",
    label: "Meetings",
    labelKey: "navigation.meetings.main",
    icon: CalendarDays,
    children: [
      { id: "all-meetings", label: "All Meetings", labelKey: "navigation.meetings.allMeetings", icon: Archive },
      { id: "meeting-calendar", label: "Calendar", labelKey: "navigation.meetings.meetingCalendar", icon: CalendarDays },
      { id: "meeting-templates", label: "Templates", labelKey: "navigation.meetings.meetingTemplates", icon: FileStack, visibility: "phase2" },
    ],
  },
  {
    id: "agenda-documents",
    label: "Agenda & Documents",
    labelKey: "navigation.agendaDocuments.main",
    icon: FileStack,
    children: [
      { id: "agenda-management", label: "Agenda Management", labelKey: "navigation.agendaDocuments.agendaManagement", icon: ClipboardList },
      { id: "document-library",  label: "Document Library",  labelKey: "navigation.agendaDocuments.documentLibrary",  icon: BadgeCheck },
    ],
  },
  {
    id: "decisions-followup",
    label: "Decisions & Follow-up",
    labelKey: "navigation.decisionsFollowup.main",
    icon: CheckSquare,
    children: [
      { id: "decisions", label: "Decisions", labelKey: "navigation.decisionsFollowup.decisions", icon: BadgeCheck },
      { id: "resolutions", label: "Resolutions", labelKey: "navigation.decisionsFollowup.resolutions", icon: FilePen },
      { id: "action-items", label: "Action Items", labelKey: "navigation.decisionsFollowup.actionItems", icon: CopyCheck },
    ],
  },
  {
    id: "governance-org",
    label: "Governance & Organization",
    labelKey: "navigation.governanceOrg.main",
    icon: Building2,
    children: [
      { id: "organization-structure", label: "Organization Structure", labelKey: "navigation.governanceOrg.organizationStructure", icon: Network },
      { id: "users-assignments", label: "User Management", labelKey: "navigation.governanceOrg.userManagement", icon: KeyRound },
      { id: "designations-positions", label: "Designations & Positions", labelKey: "navigation.governanceOrg.designationsPositions", icon: Rows3 },
      { id: "governance-bodies", label: "Governance Bodies", labelKey: "navigation.governanceOrg.governanceBodies", icon: Landmark },
      { id: "participant-groups", label: "Participant Groups", labelKey: "navigation.governanceOrg.participantGroups", icon: Notebook },
    ],
  },
  {
    id: "archive-reports",
    label: "Archive & Reports",
    labelKey: "navigation.archiveReports.main",
    icon: Archive,
    children: [
      { id: "meeting-archive", label: "Meeting Records", labelKey: "navigation.archiveReports.meetingRecords", icon: FolderOpen },
      { id: "minutes",         label: "Minutes",         labelKey: "navigation.archiveReports.minutes",        icon: ScrollText },
      {
        id: "registers",
        label: "Registers",
        labelKey: "navigation.archiveReports.registers",
        icon: List,
        children: [
          { id: "resolution-register", label: "Resolution Register", labelKey: "navigation.archiveReports.resolutionRegister", icon: FilePen },
          { id: "decision-register", label: "Decision Register", labelKey: "navigation.archiveReports.decisionRegister", icon: BadgeCheck },
          { id: "action-register", label: "Action Register", labelKey: "navigation.archiveReports.actionRegister", icon: CopyCheck },
          { id: "attendance-register", label: "Attendance Register", labelKey: "navigation.archiveReports.attendanceRegister", icon: ListChecks },
          { id: "conflict-register", label: "Conflict Register", labelKey: "navigation.archiveReports.conflictRegister", icon: Scale, visibility: "phase2" },
        ],
      },
      {
        id: "reports-analytics",
        label: "Reports & Analytics",
        labelKey: "navigation.archiveReports.reportsAnalytics",
        icon: BarChart2,
        visibility: "phase2",
        children: [
          { id: "meeting-performance", label: "Meeting Performance", labelKey: "navigation.archiveReports.meetingPerformance", icon: Activity },
          { id: "participation", label: "Participation", labelKey: "navigation.archiveReports.participation", icon: ArrowUpCircle },
          { id: "governance", label: "Governance", labelKey: "navigation.archiveReports.governance", icon: Building2 },
          { id: "decisions-actions", label: "Decisions & Actions", labelKey: "navigation.archiveReports.decisionsActions", icon: FileWarning },
          { id: "financial-resource-impact", label: "Financial & Resource Impact", labelKey: "navigation.archiveReports.financialResourceImpact", icon: Briefcase },
        ],
      },
      { id: "audit-trail", label: "Audit Trail", labelKey: "navigation.archiveReports.auditTrail", icon: History, visibility: "phase2" },
    ],
  },
  {
    id: "administration",
    label: "Administration",
    labelKey: "navigation.administration.main",
    icon: Settings2,
    children: [
      {
        id: "roles-permissions",
        label: "Roles & Permissions",
        labelKey: "navigation.administration.rolesPermissions",
        icon: ShieldCheck,
        children: [
          { id: "roles", label: "Roles", labelKey: "navigation.administration.roles", icon: ShieldCheck },
          { id: "permissions", label: "Permissions", labelKey: "navigation.administration.permissions", icon: ListChecks },
        ],
      },
      {
        id: "workflows",
        label: "Workflows",
        labelKey: "navigation.administration.workflows",
        icon: ArrowLeftRight,
        visibility: "phase2",
        children: [
          { id: "workflow-definitions", label: "Workflow Definitions", labelKey: "navigation.administration.workflowDefinitions", icon: FilePen },
          { id: "approval-rules", label: "Approval Rules", labelKey: "navigation.administration.approvalRules", icon: BadgeCheck },
          { id: "review-revision-rules", label: "Review & Revision Rules", labelKey: "navigation.administration.reviewRevisionRules", icon: FileCheck },
          { id: "workflow-history", label: "Workflow History", labelKey: "navigation.administration.workflowHistory", icon: History },
        ],
      },
      {
        id: "meeting-configuration",
        label: "Meeting Configuration",
        labelKey: "navigation.administration.meetingConfiguration",
        icon: Settings2,
        visibility: "phase2",
        children: [
          { id: "meeting-types", label: "Meeting Types", labelKey: "navigation.administration.meetingTypes", icon: FileText },
          { id: "quorum-rules", label: "Quorum Rules", labelKey: "navigation.administration.quorumRules", icon: ListChecks },
          { id: "voting-methods", label: "Voting Methods", labelKey: "navigation.administration.votingMethods", icon: CopyCheck },
          { id: "statuses-numbering", label: "Statuses & Numbering Rules", labelKey: "navigation.administration.statusesNumbering", icon: Rows3 },
        ],
      },
      {
        id: "templates",
        label: "Templates",
        labelKey: "navigation.administration.templates",
        icon: FileStack,
        visibility: "phase2",
        children: [
          { id: "meeting-agenda-templates", label: "Meeting & Agenda Templates", labelKey: "navigation.administration.meetingAgendaTemplates", icon: CalendarDays },
          { id: "minutes-resolution-templates", label: "Minutes & Resolution Templates", labelKey: "navigation.administration.minutesResolutionTemplates", icon: ScrollText },
          { id: "document-templates", label: "Document Templates", labelKey: "navigation.administration.documentTemplates", icon: FileText },
          { id: "communication-templates", label: "Communication Templates", labelKey: "navigation.administration.communicationTemplates", icon: CloudUpload },
        ],
      },
      {
        id: "notifications",
        label: "Notifications",
        labelKey: "navigation.administration.notifications",
        icon: BadgeInfo,
        visibility: "phase2",
        children: [
          { id: "notification-rules", label: "Notification Rules", labelKey: "navigation.administration.notificationRules", icon: FileCheck },
          { id: "message-templates", label: "Message Templates", labelKey: "navigation.administration.messageTemplates", icon: FileText },
          { id: "delivery-logs", label: "Delivery Logs", labelKey: "navigation.administration.deliveryLogs", icon: History },
        ],
      },
      { id: "integrations", label: "Integrations", labelKey: "navigation.administration.integrations", icon: Globe, visibility: "phase2" },
      {
        id: "security-retention",
        label: "Security & Retention",
        labelKey: "navigation.administration.securityRetention",
        icon: ShieldAlert,
        visibility: "phase2",
        children: [
          { id: "security-policies", label: "Security Policies", labelKey: "navigation.administration.securityPolicies", icon: ShieldCheck },
          { id: "retention-legal-holds", label: "Retention & Legal Holds", labelKey: "navigation.administration.retentionLegalHolds", icon: Archive },
        ],
      },
    ],
  },
];

export const REPORT_META: Record<string, { icon: LucideIcon; category: string }> = {
  "meeting-archive": { icon: FolderOpen,  category: "Archive" },
  "minutes":         { icon: ScrollText, category: "Archive" },
  "resolution-register": { icon: FilePen, category: "Registers" },
  "decision-register": { icon: BadgeCheck, category: "Registers" },
  "action-register": { icon: CopyCheck, category: "Registers" },
  "attendance-register": { icon: ListChecks, category: "Registers" },
  "conflict-register": { icon: Scale, category: "Registers" },
  "meeting-performance": { icon: Activity, category: "Analytics" },
  "participation": { icon: ArrowUpCircle, category: "Analytics" },
  "governance": { icon: Building2, category: "Analytics" },
  "decisions-actions": { icon: FileWarning, category: "Analytics" },
  "financial-resource-impact": { icon: Briefcase, category: "Analytics" },
  "audit-trail": { icon: History, category: "Audit" },
};

export const ASSESSMENT_YEARS = ["2024-25", "2023-24", "2022-23", "2021-22", "2020-21"];

export const TAX_CIRCLES = [
  "Board Secretariat",
  "Audit Committee",
  "Risk Committee",
  "Executive Committee",
  "Nomination Committee",
  "Remuneration Committee",
  "IT & Technology Committee",
  "Asset-Liability Committee",
];

export const NAV_DISPLAY_LABEL: Record<string, string> = {
  home: "Home",
  meetings: "Meetings",
  "agenda-documents": "Agenda",
  "decisions-followup": "Decisions",
  "governance-org": "Governance",
  "archive-reports": "Records",
  administration: "Admin",
};
