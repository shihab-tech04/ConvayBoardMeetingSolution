// ─── Shared Types and Utilities for Module Pages ────────────────────────────
import type React from "react";
import type { AttachmentItem } from "../components/attachments/attachmentTypes";
import type { SectionDef, EntryFormValue } from "../components/forms/EntryForm";

export type TableCellValue = string | number | boolean | null | undefined | AttachmentItem[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TableRow = Record<string, any>;
export type IconComponent = React.ComponentType<{ size?: number; strokeWidth?: number; className?: string; color?: string; style?: React.CSSProperties }>;

export type TC = {
  id: string; primary: string; primaryDark: string; primaryLight: string;
  secondary: string; accent: string; background: string; surface: string;
  border: string; textPrimary: string; textSecondary: string;
  success: string; warning: string; error: string;
};

export interface FlatCol { key: string; label: string; headerKey?: string; badge?: boolean; mono?: boolean; mobileCard?: boolean; truncate?: "compact" | "normal" | "long" | "none"; renderCell?: (value: TableCellValue, row: TableRow) => React.ReactNode; }
export interface ColGroup { label: string; groupKey?: string; cols: FlatCol[]; }
export type ColDef = { type: "col"; col: FlatCol } | { type: "group"; group: ColGroup };

export interface RowAction { id: string; label: string; labelKey?: string; icon: IconComponent; color?: string; enabled?: boolean; disabledReason?: string; }
export interface FilterDef { key: string; label: string; labelKey?: string; type: "select" | "date" | "text"; options?: string[]; optionKeys?: Record<string, string>; }
export interface KpiDef { label: string; labelKey?: string; value: string; color?: string; tone?: "primary" | "success" | "warning" | "error" | "neutral"; icon?: IconComponent; }

export interface MobileCardMapping {
  primary?: string;
  identifier?: string;
  meta?: string[];
  status?: string;
  date?: string;
  amount?: string;
}

export interface PageCfg {
  title: string; titleKey?: string;
  desc: string; descKey?: string;
  cols: ColDef[];
  /** Optional separate column definitions for the details drawer (supports groups). If absent, drawer auto-generates from cols. */
  drawerCols?: ColDef[];
  filters: FilterDef[];
  actions: RowAction[];
  drawerActions?: RowAction[];
  /** Per-row dynamic replacement for drawerActions — used only when provided. */
  drawerActionsResolver?: (row: TableRow) => RowAction[];
  rows: TableRow[];
  kpis?: KpiDef[];
  entryBtn?: string;
  extraBtns?: {
    id: string; label: string; icon: IconComponent; color?: string;
    tone?: "primary" | "neutral" | "warning";
    formKind?: "psr-entry" | "psr-bulk-entry" | "generic-upload";
    /** Generic form fields for this extra button's modal. Takes precedence over formKind. */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    formFields?: any[];
    formTitle?: string;
    submitLabel?: string;
    fullPageModal?: boolean;
    formSteps?: string[];
  }[];
  /** Optional explicit mobile card field mapping. If absent, uses smart fallback logic. */
  mobileCardMapping?: MobileCardMapping;
  /** Page-specific form fields for the Add/Create modal. If absent, uses board-meeting defaults. Typed as unknown[] to avoid circular dep; cast in GenPage. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formFields?: any[];
  /** Open Add/Create/Edit modal in full-page mode. */
  fullPageModal?: boolean;
  /** Step labels for multi-step modal. When set, fields with a matching step index are shown per step. */
  formSteps?: string[];
  /** Optional Lucide-compatible icon component for each step card (same order as formSteps). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  stepIcons?: React.ElementType<any>[];
  /** Short visible step labels for the stepper UI (e.g. "Details" instead of "Meeting Details"). Full names in formSteps serve as aria-labels. */
  formShortSteps?: string[];
  /** Section definitions for the opt-in meeting wizard section layout. */
  sections?: SectionDef[];
  /** Short subtitle shown in the full-page modal header (e.g. "Enter the meeting information..."). */
  wizardSubtitle?: string;
  /** When set, renders a custom review component at the top of the last step. Receives all form values and a step navigation callback. */
  reviewRenderer?: (values: Record<string, EntryFormValue>, onGoToStep: (step: number) => void) => React.ReactNode;
  /**
   * Custom renderers keyed by step index (0-based). When provided for the current step, the renderer
   * replaces field-level rendering for that step. Receives allValues + a stable onValuesChange setter.
   * The review step (last) continues to use reviewRenderer; stepRenderers takes precedence for other steps.
   */
  stepRenderers?: Record<number, (
    values: Record<string, EntryFormValue>,
    onValuesChange: (patch: Record<string, EntryFormValue>) => void,
  ) => React.ReactNode>;
  /** Called after a row is created. Use to sync with external registries. */
  onRowCreate?: (values: Record<string, unknown>) => void;
  /** Called after a row is updated. Use to sync with external registries. */
  onRowUpdate?: (id: string, values: Record<string, unknown>) => void;
  /** Override the primary submit button label on the last wizard step (default "Save"). */
  lastStepSubmitLabel?: string;
  /** When set, shows a "Save Draft" secondary button on every wizard step.
   *  Receives merged current+accumulated values and the existing draft ID (if any).
   *  Should return the saved meeting/draft ID (string) so subsequent saves can upsert instead of insert. */
  onSaveDraft?: (values: Record<string, unknown>, draftId?: string) => string | void;
  /** Contextual search placeholder text (e.g. "Search meetings", "Search agenda items"). Falls back to "Search {entity}". */
  searchPlaceholder?: string;
  /** Explicit drawer title. If absent, GenPage auto-detects from row field names. */
  drawerTitle?: string;
  /** Called for any drawerAction ID that GenPage does not handle natively. Use to open contextual modals. */
  onCustomAction?: (actionId: string, row: TableRow) => void;
  /** When provided, clicking the entryBtn calls this instead of opening the built-in form modal. */
  onEntryBtnClick?: () => void;
  /** Open this modal ID on initial mount (e.g. "entry" to auto-open the Create form when ?create=1 is in the URL). */
  initialModal?: string;
  /** Row field key to use for status tab filtering. Auto-detected from badge columns if absent. */
  statusTabField?: string;
  /** Explicit ordered tab definitions. If absent, tabs are auto-generated from unique status values. */
  statusTabs?: StatusTabDef[];
}

export interface StatusTabDef {
  id: string;
  label: string;
  /**
   * Row field values that map to this tab. When provided, a row matches if its
   * status field equals any of these values (case-insensitive). When absent,
   * the row's field value is compared directly against `id`.
   */
  values?: string[];
  /**
   * Custom row matcher. Takes precedence over both `id` and `values`.
   * Use only when value-based matching is insufficient.
   */
  match?: (row: TableRow) => boolean;
}

/** Drawer group helper — creates a grouped ColDef section for the details drawer. */
export function dg(label: string, cols: FlatCol[]): ColDef {
  return { type: "group", group: { label, cols } };
}
/** Drawer flat field helper — creates a single flat ColDef row for the drawer. */
export function df(key: string, label: string, headerKey?: string): ColDef {
  return { type: "col", col: { key, label, headerKey } };
}

// ─── Data Constants ──────────────────────────────────────────────────────────
export const ZONES = ["All Types", "Executive", "Governance", "Advisory", "Technical"];
export const CIRCLES = ["All Committees", "Board of Directors", "Executive Committee", "Audit Committee", "Risk Management Committee"];
export const AY_OPTS = ["All Years", "2024", "2023", "2022", "2021"];
export const CIRCLES_DATA = ["Board of Directors", "Executive Committee", "Audit Committee", "Risk Management Committee", "Shariah Supervisory Committee", "Nomination & Remuneration Committee", "HR Committee", "IT Steering Committee"];
export const NAMES = ["344th Board Meeting", "128th Executive Committee Meeting", "56th Audit Committee Meeting", "42nd Risk Committee Meeting", "38th Shariah Committee Meeting", "29th NRC Meeting", "Board Strategy Session", "15th IT Steering Meeting", "Audit Review Meeting", "Annual General Meeting"];

// ─── Helper Functions ────────────────────────────────────────────────────────
export function gen(n: number, extra: (i: number) => TableRow = () => ({})): TableRow[] {
  return Array.from({ length: n }, (_, i) => ({
    id: String(i + 1),
    meeting_id: `MTG-2026-${String(i + 1).padStart(3, "0")}`,
    committee: CIRCLES_DATA[i % 8],
    meeting_title: NAMES[i % 10],
    meeting_year: AY_OPTS[i % 4 + 1],
    ...extra(i),
  }));
}

export function rgba(hex: string, a: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ─── Column Helpers ──────────────────────────────────────────────────────────
export const fc = (key: string, label: string, opts: Partial<FlatCol> = {}): ColDef => ({ type: "col", col: { key, label, ...opts } });

export const BADGE = (key: string, label: string): ColDef => ({ type: "col", col: { key, label, badge: true, headerKey: "headers.status" } });

export const TIN_NAME: ColDef[] = [
  fc("meeting_id", "Meeting ID", { headerKey: "headers.meetingId" }),
  fc("meeting_title", "Meeting Title", { headerKey: "headers.meetingTitle" }),
];

export const CIRCLE_TIN_NAME: ColDef[] = [
  fc("committee", "Committee", { headerKey: "headers.committee" }),
  ...TIN_NAME,
];

// ─── Filter Constants ────────────────────────────────────────────────────────
export const BASE_FILTERS: FilterDef[] = [
  { key: "meeting_type", label: "Meeting Type", labelKey: "labels.meetingType", type: "select", options: ZONES, optionKeys: { "All Types": "options.allTypes" } },
  { key: "committee", label: "Committee", labelKey: "labels.committee", type: "select", options: CIRCLES, optionKeys: { "All Committees": "options.allCommittees" } },
  { key: "meeting_year", label: "Meeting Year", labelKey: "labels.meetingYear", type: "select", options: AY_OPTS, optionKeys: { "All Years": "options.allYears" } },
  { key: "from", label: "From Date", labelKey: "labels.fromDate", type: "date" },
  { key: "to", label: "To Date", labelKey: "labels.toDate", type: "date" },
];

// ─── Mock Data Arrays ────────────────────────────────────────────────────────
export const returnApprRows = gen(42, i => ({ meeting_type: ["Regular", "Special", "Emergency", "Annual"][i % 4], requested_by: ["Md. Alam", "S. Islam", "R. Hossain"][i % 3], request_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, approval_status: ["Pending", "Approved", "Rejected"][i % 3] }));
export const onlineRetRows = gen(38, i => ({ meeting_type: ["Regular", "Special", "Emergency"][i % 3], scheduled_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, resolutions: String(i * 2 + 3), status: ["Pending", "Confirmed", "Completed"][i % 3] }));
export const offlineRetRows = gen(35, i => ({ ref_no: `DOC-${2000 + i}`, venue: ["Board Room A", "Conference Room B", "Head Office"][i % 3], meeting_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, resolutions: String(i * 2 + 2), status: ["Pending", "Approved", "Verified"][i % 3] }));
export const archiveRows = gen(30, i => ({ archive_date: `2025-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, meeting_type: ["Regular", "Special"][i % 2], archived_by: ["System", "Md. Alam"][i % 2], file_size: `${300 + i * 20} KB` }));
export const reg4Rows = gen(32, i => ({ agenda_no: `AGD-${1000 + i}`, submission_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, agenda_title: NAMES[i % 10], priority: ["High", "Normal", "Low"][i % 3], submitted_by: ["Company Secretary", "Agenda Coordinator", "Meeting Secretary"][i % 3], status: ["Pending", "Approved", "Deferred"][i % 3] }));
export const stockRows = gen(24, i => ({ agenda_type: ["Governance", "Financial", "Compliance", "Operational"][i % 4], opening_count: String(50 - i), added: String(i * 2), approved: String(i * 1), closing_count: String(50 - i + i * 2 - i), last_updated: `2026-0${(i % 9) + 1}-15` }));
export const taxRegRows = gen(40, i => ({ member_id: `MBR-${5000 + i}`, member_type: ["Board Director", "Independent Director", "Shareholder", "Advisor"][i % 4], appointment_date: `2020-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, committee: CIRCLES_DATA[i % 8], active_status: ["Active", "Inactive"][i % 2] }));
export const reg5Rows = gen(30, i => ({ resolution_no: `RES-${3000 + i}`, resolution_type: ["Governance", "Financial", "Compliance"][i % 3], financial_impact: `৳${(i * 50 + 100) * 1000}`, assigned_to: ["Company Secretary", "Meeting Secretary"][i % 2], due_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, approval_status: ["Pending", "Approved", "Rejected"][i % 3] }));
export const psrRows = gen(36, i => ({ minutes_ref: `MIN-${7000 + i}`, submitted_by: ["Company Secretary", "Meeting Secretary", "Governance Analyst"][i % 3], submission_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, resolutions: String(i * 2 + 3), approval_status: ["Pending", "Approved", "Rejected"][i % 3] }));
export const psrEditRows = gen(22, i => ({ minutes_ref: `MIN-${7000 + i}`, edit_field: ["Resolution Text", "Date", "Attendees"][i % 3], original_value: "Original Content", new_value: "Revised Content", requested_by: NAMES[i % 10], request_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, approval_status: ["Pending", "Approved", "Rejected"][i % 3] }));
export const deStatusRows = gen(26, i => ({ vote_ref: `VT-${4000 + i}`, vote_type: ["In Person", "Written Resolution"][i % 2], proposed_by: NAMES[i % 10], seconded_by: NAMES[(i + 1) % 10], vote_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, vote_status: ["Passed", "Pending", "Failed"][i % 3] }));
export const deVerifRows = gen(22, i => ({ vote_ref: `VT-${4000 + i}`, financial_impact: `৳${(i * 30 + 50) * 1000}`, verif_status: ["Verified", "Pending", "Failed"][i % 3], verif_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}` }));
export const dormantRows = gen(18, i => ({ last_meeting: `2022-0${(i % 9) + 1}-01`, years_absent: String(i % 3 + 1), member_type: ["Board Director", "Independent Director"][i % 2], attendance_status: "Absent" }));
export const jurisdRows = gen(16, i => ({ issue_type: ["Wrong Committee", "Wrong Meeting Type"][i % 2], current_committee: CIRCLES_DATA[i % 8], correct_committee: CIRCLES_DATA[(i + 1) % 8], reported_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, resolution_status: ["Pending", "Resolved", "Transferred"][i % 3] }));
export const otherCircRows = gen(22, i => ({ original_committee: CIRCLES_DATA[i % 8], assigned_committee: CIRCLES_DATA[(i + 2) % 8], entry_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, transfer_status: ["Pending", "Transferred"][i % 2], remarks: ["Incorrect assignment", "Member request"][i % 2] }));
export const misfiledRows = gen(17, i => ({ error_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, correct_meeting: NAMES[(i + 3) % 10], filed_under: NAMES[(i + 5) % 10], resolve_status: ["Pending", "Resolved"][i % 2], detected_by: ["System", "Secretary"][i % 2] }));
export const invalidRows = gen(20, i => ({ invalid_reason: ["Duplicate Agenda", "Wrong Meeting Year", "Missing Signature", "Format Error"][i % 4], detected_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, detected_by: ["System Auto-Check", "Manual Review"][i % 2], resolution_status: ["Pending", "Resolved"][i % 2] }));
export const approvalListRows = gen(30, i => ({ request_type: ["Meeting View", "Minutes Entry", "Edit Request"][i % 3], requested_by: NAMES[i % 10], request_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, priority: ["High", "Normal", "Low"][i % 3], approval_status: ["Pending", "Approved", "Rejected"][i % 3] }));
export const transferRows = gen(26, i => ({ from_committee: CIRCLES_DATA[i % 8], to_committee: CIRCLES_DATA[(i + 1) % 8], transfer_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, transferred_by: NAMES[i % 10], reason: ["Committee Restructuring", "Member Request", "Board Order"][i % 3], transfer_status: ["Transferred", "Pending", "Cancelled"][i % 3] }));
export const litRows = (type: string) => gen(20, i => ({ action_no: `${type.slice(0, 3).toUpperCase()}-${2000 + i}`, action_type: type, action_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, assigned_to: ["Company Secretary", "Meeting Secretary", "Governance Analyst"][i % 3], financial_impact: `৳${(i * 80 + 100) * 1000}`, action_status: ["Pending", "Completed", "Overdue", "In Progress"][i % 4] }));
export const appealRows = gen(25, i => ({ revision_no: `REV-${6000 + i}`, revision_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, review_date: `2026-0${(i % 9) + 2}-${String((i % 28) + 1).padStart(2, "0")}`, revision_ground: ["Content Error", "Missing Signature"][i % 2], financial_impact: `৳${(i * 60 + 50) * 1000}`, revision_status: ["Pending", "Approved", "Rejected", "Under Review"][i % 4] }));
export const tribunalRows = gen(20, i => ({ escalation_no: `ESC-${8000 + i}`, escalation_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, escalated_to: ["Board Chairman", "Managing Director"][i % 2], matter_type: ["Governance", "Compliance"][i % 2], financial_impact: `৳${(i * 90 + 100) * 1000}`, escalation_status: ["Pending", "Resolved", "Deferred"][i % 3] }));
export const demandRows = gen(28, i => ({ agenda_no: `FIN-${9000 + i}`, agenda_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, approved_amount: `৳${(i * 100 + 100) * 1000}`, disbursed_amount: `৳${(i * 50 + 50) * 1000}`, outstanding: `৳${(i * 50) * 1000}`, approval_status: ["Approved", "Pending", "Under Review"][i % 3] }));
export const ledgerRows = gen(20, i => ({ transaction_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, particulars: ["Board Approval", "Budget Allocation", "Financial Resolution", "Disbursement"][i % 4], debit: `৳${(i * 20 + 50) * 1000}`, credit: `৳${(i * 10 + 10) * 1000}`, balance: `৳${(i * 10 + 100) * 1000}`, reference: `REF-${3000 + i}` }));
export const refundRows = gen(22, i => ({ adjustment_no: `ADJ-${5000 + i}`, adjustment_type: ["Budget Revision", "Cost Reallocation", "Error Correction"][i % 3], adjustment_amount: `৳${(i * 30 + 50) * 1000}`, request_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, adjustment_status: ["Pending", "Approved", "Rejected", "Processed"][i % 4] }));
export const certDataRows = gen(25, i => ({ document_no: `DOC-${4000 + i}`, document_type: ["Board Paper", "Meeting Notice", "Resolution Copy"][i % 3], requested_by: NAMES[i % 10], request_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, approval_status: ["Pending", "Approved", "Rejected", "Issued"][i % 4] }));
export const certEditRows = gen(15, i => ({ document_no: `DOC-${4000 + i}`, document_type: ["Board Paper", "Meeting Notice"][i % 2], edit_field: ["Title", "Date", "Signatories"][i % 3], original_value: "Previous Content", requested_value: "Revised Content", edit_status: ["Pending", "Approved", "Rejected"][i % 3] }));
export const certDisposalRows = gen(18, i => ({ document_no: `DOC-${4000 + i}`, document_type: ["Resolution Copy", "Meeting Minutes"][i % 2], issued_to: NAMES[i % 10], dispatch_date: `2026-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`, dispatch_method: ["Hand Delivery", "Email", "Portal"][i % 3], dispatch_status: "Dispatched" }));
export const specialRegRows = gen(20, i => ({ participant_no: `EXT-${2000 + i}`, participant_type: ["External Advisor", "Regulator", "Auditor", "Legal Counsel"][i % 4], reg_date: `2020-0${(i % 9) + 1}-01`, committee: CIRCLES_DATA[i % 8], active_status: ["Active", "Inactive", "Suspended"][i % 3] }));
export const timeExtRows = gen(22, i => ({ request_no: `RSC-${3000 + i}`, reschedule_type: ["Board Meeting", "Committee Meeting", "Special Session"][i % 3], original_date: `2026-0${(i % 9) + 1}-15`, new_date: `2026-0${(i % 9) + 2}-15`, requested_by: NAMES[i % 10], approval_status: ["Pending", "Approved", "Rejected"][i % 3] }));
export const auditRows = gen(18, i => ({ audit_no: `AUD-${1000 + i}`, audit_type: ["Compliance Audit", "Governance Review", "Special Audit"][i % 3], meeting_year: AY_OPTS[i % 4 + 1], audit_date: `2026-0${(i % 9) + 1}-01`, auditor: ["External Auditor", "Internal Auditor"][i % 2], audit_status: ["Selected", "In Progress", "Completed", "Cancelled"][i % 4] }));

// ─── Action Sets (Import icons where needed) ─────────────────────────────────
// Note: Icons must be imported from lucide-react in consuming modules
// ROW_VIEW is the standard row action - only "View Details" appears in table rows
// All other actions (Edit, Approve, Reject, etc.) should be passed via drawerActions