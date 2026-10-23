/**
 * Board Meeting Solution — shared entity data and registries.
 *
 * All entity registries use the same localStorage + custom-event pattern
 * as useUserRegistry / useRoleRegistry / usePermissionRegistry.
 *
 * Pages that share data (e.g., Meeting Overview, All Meetings, Meeting Calendar)
 * must import their registry from here so they read/write the same store.
 */

import { createEntityRegistry, type EntityRecord } from "../hooks/useEntityRegistry";

// ─── ID Generation ─────────────────────────────────────────────────────────────

const year = new Date().getFullYear();

function padded(n: number, width = 4): string {
  return String(n).padStart(width, "0");
}

/** Generates the next available ID for a given prefix using an existing list. */
export function generateId(prefix: string, existingIds: string[]): string {
  const pattern = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  const seqs = existingIds
    .map(id => { const m = id.match(pattern); return m ? parseInt(m[1], 10) : 0; })
    .filter(n => n > 0);
  const next = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
  return `${prefix}-${year}-${padded(next)}`;
}

/** Same but for sub-items like agenda items (AGD-2026-0001-01). */
export function generateSubId(prefix: string, parentSeq: string, existingIds: string[]): string {
  const pattern = new RegExp(`^${prefix}-${year}-${parentSeq}-(\\d+)$`);
  const seqs = existingIds
    .map(id => { const m = id.match(pattern); return m ? parseInt(m[1], 10) : 0; })
    .filter(n => n > 0);
  const next = seqs.length > 0 ? Math.max(...seqs) + 1 : 1;
  return `${prefix}-${year}-${parentSeq}-${padded(next, 2)}`;
}

// ─── Shared Constants ──────────────────────────────────────────────────────────

export const GOVERNANCE_BODIES = [
  "Board of Directors",
  "Executive Committee",
  "Audit Committee",
  "Risk Management Committee",
  "Shariah Supervisory Committee",
  "Nomination & Remuneration Committee",
  "HR Committee",
  "IT Steering Committee",
];

export const MEETING_TYPES = [
  "Regular",
  "Special",
  "Emergency",
  "Annual",
  "Extraordinary",
];

export const MEETING_MODES = ["Physical", "Virtual", "Hybrid"];

export const VIRTUAL_PLATFORMS = ["Zoom", "Microsoft Teams", "Google Meet", "Cisco Webex", "Other"];

export const MEETING_LANGUAGES = ["English", "Bengali", "Both"];

export const PRIORITIES = ["High", "Normal", "Low"];

export const CONFIDENTIALITY_LEVELS = ["Public", "Internal", "Confidential", "Strictly Confidential"];

export const MEETING_ROLES = [
  "Chairperson",
  "Member",
  "Secretary",
  "Observer",
  "Advisor",
  "External Invitee",
  "Delegate",
];

export const ATTENDANCE_REQUIREMENTS = ["Mandatory", "Optional", "By Invitation"];

export const DOCUMENT_TYPES = [
  "Meeting Notice",
  "Agenda",
  "Board Paper",
  "Resolution",
  "Minutes",
  "Financial Report",
  "Audit Report",
  "Compliance Report",
  "Presentation",
  "Supporting Document",
  "Other",
];

export const AGENDA_CATEGORIES = [
  "Governance",
  "Financial",
  "Compliance",
  "Operational",
  "Strategic",
  "Regulatory",
  "Human Resources",
  "Technology",
  "Risk Management",
];

export const DECISION_TYPES = [
  "Resolution",
  "Directive",
  "Policy Approval",
  "Budget Approval",
  "Appointment",
  "Deferral",
  "Rejection",
];

export const ACTION_PRIORITIES = ["Critical", "High", "Normal", "Low"];

export const TIME_ZONES = [
  "Asia/Dhaka (GMT+6)",
  "UTC",
  "Asia/Kolkata (GMT+5:30)",
  "Asia/Singapore (GMT+8)",
  "Europe/London (GMT+0/+1)",
];

export const FINANCIAL_YEARS = ["2026-2027", "2025-2026", "2024-2025", "2023-2024"];

export const DESIGNATIONS = [
  "Chairman",
  "Managing Director",
  "Deputy Managing Director",
  "Executive Director",
  "Independent Director",
  "Non-Executive Director",
  "Company Secretary",
  "CFO",
  "CRO",
  "CTO",
  "Head of Internal Audit",
  "Director",
  "Advisor",
];

// ─── Entity Type Definitions ───────────────────────────────────────────────────

export interface Meeting {
  id: string;
  meeting_id: string;
  meeting_title: string;
  committee: string;
  meeting_type: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  time_zone: string;
  mode: string;
  venue: string;
  virtual_platform: string;
  virtual_link: string;
  financial_year: string;
  chairperson: string;
  secretary: string;
  organizer: string;
  language: string;
  priority: string;
  confidentiality: string;
  purpose: string;
  description: string;
  approval_status: string;
  quorum_forecast: string;
  readiness: string;
  participant_count: string;
  agenda_count: string;
  document_count: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  activity_history: ActivityEntry[];
  draft_current_step?: string;
  status?: string;
  meeting_mode?: string;
  company_secretary?: string;
  governance_body?: string;
  quorum_required?: string;
  rsvp_deadline?: string;
  quorum?: string;
}

export interface AgendaApprovalEntry {
  status: string;
  by: string;
  at: string;
  note?: string;
}

export interface AgendaSubmission {
  id: string;
  agenda_id: string;
  agenda_title: string;
  agenda_reference: string;
  meeting_id: string;
  meeting_title: string;
  committee: string;
  meeting_type: string;
  agenda_category: string;
  submitted_by: string;
  submitting_division: string;
  purpose: string;
  proposed_decision: string;
  priority: string;
  confidentiality: string;
  estimated_duration: string;
  voting_required: string;
  financial_impact: string;
  submission_date: string;
  approval_status: string;
  created_at: string;
  // ── Phase 1.1: three-level hierarchy ─────────────────────────────────────
  /** ID of the parent agenda (null / undefined = Level 1). */
  parent_agenda_id?: string;
  /** Hierarchy level: 1 = parent, 2 = child, 3 = final child. */
  agenda_level?: 1 | 2 | 3;
  /** Relative display order within siblings. */
  display_order?: number;
  /** Long-form description (separate from purpose). */
  description?: string;
  /** Stable ID reference to the agenda owner user. */
  owner_user_id?: string;
  /** Ordered approval history entries. */
  approval_history?: AgendaApprovalEntry[];
  /** True when the agenda is a placeholder not yet committed to a meeting. */
  is_temporary?: boolean;
  updated_at?: string;
  updated_by?: string;
  archived_at?: string;
  archived_by?: string;
  submission_status?: string;
  meeting_date?: string;
}

export interface Decision {
  id: string;
  decision_id: string;
  decision_title: string;
  source_meeting: string;
  agenda_item: string;
  decision_type: string;
  decision_owner: string;
  effective_date: string;
  implementation_deadline: string;
  financial_impact: string;
  implementation_status: string;
  approval_status: string;
  created_at: string;
  activity_history: ActivityEntry[];
  meeting_id?: string;
  decision_reference?: string;
  decided_by?: string;
}

export interface Resolution {
  id: string;
  resolution_id: string;
  resolution_title: string;
  resolution_type: string;
  source_meeting: string;
  source_decision: string;
  resolution_text: string;
  proposed_by: string;
  seconded_by: string;
  vote_result: string;
  votes_for: string;
  votes_against: string;
  abstentions: string;
  effective_date: string;
  approval_status: string;
  created_at: string;
  meeting_id?: string;
  resolution_reference?: string;
  title?: string;
}

export interface ActionItem {
  id: string;
  action_id: string;
  action_title: string;
  source_meeting: string;
  source_decision: string;
  assigned_to: string;
  priority: string;
  due_date: string;
  completion_date: string;
  progress: string;
  implementation_status: string;
  approval_status: string;
  created_at: string;
  activity_history: ActivityEntry[];
  meeting_id?: string;
  action_status?: string;
  action_owner?: string;
  updated_at?: string;
  completion_status?: string;
}

export interface GovernanceBody {
  id: string;
  body_id: string;
  body_name: string;
  body_type: string;
  chairperson: string;
  secretary: string;
  member_count: string;
  quorum_requirement: string;
  voting_method: string;
  establishment_date: string;
  mandate: string;
  status: string;
  created_at: string;
}

export interface ActivityEntry {
  action: string;
  by: string;
  at: string;
  note?: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const NOW = new Date().toISOString();
const TODAY = NOW.slice(0, 10);

const EMG_MID   = `MTG-${year}-0011`;
const EMG_DATE  = `${year}-02-11`;
const EMG_START = `${EMG_DATE}T09:00:00Z`;
const EMG_END   = `${EMG_DATE}T12:00:00Z`;

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
}

function mkActivity(action: string): ActivityEntry[] {
  return [{ action, by: "System", at: NOW }];
}


// Extra records specifically for dashboard demonstration — cover all key statuses
const EXTRA_MEETINGS: Meeting[] = [
  {
    id: "13", meeting_id: `MTG-${year}-0013`,
    meeting_title: "344th Board of Directors Meeting — Q3 Session",
    committee: "Board of Directors", meeting_type: "Regular",
    meeting_date: TODAY, start_time: "09:00", end_time: "12:00",
    time_zone: "Asia/Dhaka (GMT+6)", mode: "Physical",
    venue: "Board Room A, Head Office", virtual_platform: "", virtual_link: "",
    financial_year: FINANCIAL_YEARS[0], chairperson: "Mr. Abdul Awal Mintoo",
    secretary: "Ms. Nasrin Sultana", organizer: "Governance Team",
    language: "English", priority: "High", confidentiality: "Confidential",
    purpose: "Q3 regular governance review", description: "",
    approval_status: "In Progress",
    quorum_forecast: "Met", readiness: "Ready",
    participant_count: "12", agenda_count: "8", document_count: "10",
    created_by: "System", created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 60000).toISOString(),
    activity_history: [{ action: "Meeting started", by: "Company Secretary", at: new Date(Date.now() - 90 * 60000).toISOString() }],
  },
  {
    id: "14", meeting_id: `MTG-${year}-0014`,
    meeting_title: "57th Audit Committee Meeting",
    committee: "Audit Committee", meeting_type: "Regular",
    meeting_date: TODAY, start_time: "10:00", end_time: "13:00",
    time_zone: "Asia/Dhaka (GMT+6)", mode: "Hybrid",
    venue: "Conference Room B", virtual_platform: "Microsoft Teams", virtual_link: "https://meet.example.com/audit-57",
    financial_year: FINANCIAL_YEARS[0], chairperson: "Mr. Md. Abul Bashar",
    secretary: "Ms. Nasrin Sultana", organizer: "Governance Team",
    language: "English", priority: "High", confidentiality: "Restricted",
    purpose: "Q3 audit review", description: "",
    approval_status: "Paused",
    quorum_forecast: "Met", readiness: "Ready",
    participant_count: "5", agenda_count: "5", document_count: "6",
    created_by: "System", created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60000).toISOString(),
    activity_history: [{ action: "Meeting paused", by: "Company Secretary", at: new Date(Date.now() - 20 * 60000).toISOString() }],
  },
  {
    id: "15", meeting_id: `MTG-${year}-0015`,
    meeting_title: "43rd Risk Management Committee Meeting",
    committee: "Risk Management Committee", meeting_type: "Regular",
    meeting_date: TODAY, start_time: "14:00", end_time: "16:00",
    time_zone: "Asia/Dhaka (GMT+6)", mode: "Virtual",
    venue: "Virtual", virtual_platform: "Zoom", virtual_link: "https://zoom.example.com/rmc-43",
    financial_year: FINANCIAL_YEARS[0], chairperson: "Mr. Md. Nurul Amin",
    secretary: "Mr. Kamal Hossain", organizer: "Governance Team",
    language: "English", priority: "Normal", confidentiality: "Confidential",
    purpose: "Q3 risk framework review", description: "",
    approval_status: "Ready to Start",
    quorum_forecast: "Met", readiness: "Ready",
    participant_count: "6", agenda_count: "6", document_count: "7",
    created_by: "System", created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    activity_history: [{ action: "Board Pack published", by: "Company Secretary", at: new Date(Date.now() - 4 * 3600000).toISOString() }],
  },
  {
    id: "16", meeting_id: `MTG-${year}-0016`,
    meeting_title: "30th Nomination & Remuneration Committee Meeting",
    committee: "Nomination & Remuneration Committee", meeting_type: "Regular",
    meeting_date: daysFromNow(2), start_time: "10:00", end_time: "12:00",
    time_zone: "Asia/Dhaka (GMT+6)", mode: "Physical",
    venue: "Board Room A, Head Office", virtual_platform: "", virtual_link: "",
    financial_year: FINANCIAL_YEARS[0], chairperson: "Mr. Abdul Awal Mintoo",
    secretary: "Ms. Nasrin Sultana", organizer: "Company Secretariat",
    language: "English", priority: "Normal", confidentiality: "Confidential",
    purpose: "Review board nominations", description: "",
    approval_status: "Pending Approval",
    quorum_forecast: "Pending", readiness: "In Preparation",
    participant_count: "4", agenda_count: "4", document_count: "5",
    created_by: "System", created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    activity_history: [{ action: "Submitted for approval", by: "Governance Analyst", at: new Date(Date.now() - 86400000).toISOString() }],
  },
  {
    id: "17", meeting_id: `MTG-${year}-0017`,
    meeting_title: "39th Shariah Supervisory Committee Meeting",
    committee: "Shariah Supervisory Committee", meeting_type: "Regular",
    meeting_date: daysFromNow(7), start_time: "09:30", end_time: "12:00",
    time_zone: "Asia/Dhaka (GMT+6)", mode: "Physical",
    venue: "Tower, 7th Floor", virtual_platform: "", virtual_link: "",
    financial_year: FINANCIAL_YEARS[0], chairperson: "Sheikh Md. Faridul Islam",
    secretary: "Mr. Imran Hossain", organizer: "Governance Team",
    language: "Both", priority: "High", confidentiality: "Confidential",
    purpose: "Shariah compliance quarterly review", description: "",
    approval_status: "Approved",
    quorum_forecast: "Met", readiness: "Ready",
    participant_count: "4", agenda_count: "5", document_count: "6",
    created_by: "System", created_at: new Date(Date.now() - 7 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    activity_history: [{ action: "Meeting approved", by: "Chairman", at: new Date(Date.now() - 2 * 86400000).toISOString() }],
  },
  {
    id: "18", meeting_id: `MTG-${year}-0018`,
    meeting_title: "129th Executive Committee Meeting",
    committee: "Executive Committee", meeting_type: "Regular",
    meeting_date: daysFromNow(14), start_time: "10:00", end_time: "13:00",
    time_zone: "Asia/Dhaka (GMT+6)", mode: "Hybrid",
    venue: "Board Room A, Head Office", virtual_platform: "Zoom", virtual_link: "https://zoom.example.com/exec-129",
    financial_year: FINANCIAL_YEARS[0], chairperson: "Mr. Md. Nurul Amin",
    secretary: "Mr. Kamal Hossain", organizer: "Company Secretariat",
    language: "English", priority: "Normal", confidentiality: "Confidential",
    purpose: "Monthly executive oversight", description: "",
    approval_status: "Published",
    quorum_forecast: "Met", readiness: "Ready",
    participant_count: "7", agenda_count: "7", document_count: "9",
    created_by: "System", created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    activity_history: [{ action: "Board Pack published", by: "Company Secretary", at: new Date(Date.now() - 3 * 86400000).toISOString() }],
  },
];

export const MOCK_MEETINGS: Meeting[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    id: String(i + 1),
    meeting_id: `MTG-${year}-${padded(i + 1)}`,
    meeting_title: [
      "344th Board of Directors Meeting",
      "128th Executive Committee Meeting",
      "56th Audit Committee Meeting",
      "42nd Risk Management Committee Meeting",
      "38th Shariah Supervisory Committee Meeting",
      "29th NRC Meeting",
      "Board Strategy Session",
      "15th IT Steering Committee Meeting",
      "Annual General Meeting",
      "Special Board Meeting",
      "Emergency Board Meeting",
      "Extraordinary General Meeting",
    ][i],
    committee: GOVERNANCE_BODIES[i % 8],
    meeting_type: MEETING_TYPES[i % 5],
    meeting_date: `${year}-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
    start_time: ["09:00", "10:00", "11:00", "14:00", "15:00"][i % 5],
    end_time: ["12:00", "13:00", "14:00", "17:00", "18:00"][i % 5],
    time_zone: "Asia/Dhaka (GMT+6)",
    mode: MEETING_MODES[i % 3],
    venue: ["Board Room A, Head Office", "Conference Room B", "Tower, 7th Floor", "Virtual", "Hybrid"][i % 5],
    virtual_platform: i % 3 !== 0 ? VIRTUAL_PLATFORMS[i % 5] : "",
    virtual_link: i % 3 !== 0 ? `https://meet.example.com/mtg-${i + 1}` : "",
    financial_year: FINANCIAL_YEARS[i % 4],
    chairperson: ["Mr. Abdul Awal Mintoo", "Mr. Md. Nurul Amin", "Mr. Md. Abul Bashar"][i % 3],
    secretary: ["Ms. Nasrin Sultana", "Mr. Kamal Hossain"][i % 2],
    organizer: ["Governance Team", "Company Secretariat"][i % 2],
    language: MEETING_LANGUAGES[i % 3],
    priority: PRIORITIES[i % 3],
    confidentiality: CONFIDENTIALITY_LEVELS[i % 4],
    purpose: ["Regular governance review", "Strategic planning", "Compliance review"][i % 3],
    description: "",
    approval_status: ["Draft", "Pending Approval", "Approved", "In Progress", "Completed", "Cancelled"][i % 6],
    quorum_forecast: ["Met", "Pending", "At Risk"][i % 3],
    readiness: ["Ready", "In Preparation", "Pending Board Pack"][i % 3],
    participant_count: String(5 + i),
    agenda_count: String(3 + i % 5),
    document_count: String(2 + i % 8),
    created_by: "System",
    created_at: NOW,
    updated_at: NOW,
    activity_history: mkActivity("Meeting created"),
  })),
  ...EXTRA_MEETINGS,
];

// Extra agenda items for the dashboard-ready meetings
const EXTRA_AGENDAS: AgendaSubmission[] = [
  { id: "21", agenda_id: `AGD-${year}-0021`, agenda_title: "Opening and Quorum Declaration", agenda_reference: "AGD-REF-3001", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For noting", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "22", agenda_id: `AGD-${year}-0022`, agenda_title: "Approval of Previous Meeting Minutes", agenda_reference: "AGD-REF-3002", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For approval", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "15 min", voting_required: "Yes", financial_impact: "", submission_date: TODAY, approval_status: "Approved", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "23", agenda_id: `AGD-${year}-0023`, agenda_title: "Review of Q2 Financial Performance", agenda_reference: "AGD-REF-3003", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For discussion", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "45 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "24", agenda_id: `AGD-${year}-0024`, agenda_title: "Capital Expenditure Approval — Q3", agenda_reference: "AGD-REF-3004", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For approval", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "30 min", voting_required: "Yes", financial_impact: "৳50,000,000", submission_date: TODAY, approval_status: "Pending", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "25", agenda_id: `AGD-${year}-0025`, agenda_title: "Compliance and Regulatory Update", agenda_reference: "AGD-REF-3005", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Compliance", submitted_by: "Head of Compliance", submitting_division: "Compliance", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "20 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "26", agenda_id: `AGD-${year}-0026`, agenda_title: "Internal Audit Findings — Q2 2026", agenda_reference: "AGD-REF-3006", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Head of Internal Audit", submitting_division: "Audit", purpose: "For review", proposed_decision: "", priority: "High", confidentiality: "Restricted", estimated_duration: "40 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "27", agenda_id: `AGD-${year}-0027`, agenda_title: "External Auditor Status Update", agenda_reference: "AGD-REF-3007", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Restricted", estimated_duration: "20 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "28", agenda_id: `AGD-${year}-0028`, agenda_title: "Risk Appetite Statement Review", agenda_reference: "AGD-REF-3008", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Risk Management", submitted_by: "CRO", submitting_division: "Risk", purpose: "For approval", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "35 min", voting_required: "Yes", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "29", agenda_id: `AGD-${year}-0029`, agenda_title: "Key Risk Indicator Dashboard Q2", agenda_reference: "AGD-REF-3009", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Risk Management", submitted_by: "CRO", submitting_division: "Risk", purpose: "For review", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "25 min", voting_required: "No", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "30", agenda_id: `AGD-${year}-0030`, agenda_title: "Board Remuneration Policy Review", agenda_reference: "AGD-REF-3010", meeting_id: `MTG-${year}-0016`, meeting_title: "30th Nomination & Remuneration Committee Meeting", committee: "Nomination & Remuneration Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For approval", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "30 min", voting_required: "Yes", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Pending", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "31", agenda_id: `AGD-${year}-0031`, agenda_title: "Shariah Compliance Report Q2", agenda_reference: "AGD-REF-3011", meeting_id: `MTG-${year}-0017`, meeting_title: "39th Shariah Supervisory Committee Meeting", committee: "Shariah Supervisory Committee", meeting_type: "Regular", agenda_category: "Compliance", submitted_by: "Mr. Imran Hossain", submitting_division: "Governance", purpose: "For discussion", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "40 min", voting_required: "No", financial_impact: "", submission_date: daysFromNow(-2), approval_status: "Approved", created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "32", agenda_id: `AGD-${year}-0032`, agenda_title: "New Product Shariah Certification", agenda_reference: "AGD-REF-3012", meeting_id: `MTG-${year}-0017`, meeting_title: "39th Shariah Supervisory Committee Meeting", committee: "Shariah Supervisory Committee", meeting_type: "Regular", agenda_category: "Compliance", submitted_by: "Mr. Imran Hossain", submitting_division: "Governance", purpose: "For approval", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "25 min", voting_required: "Yes", financial_impact: "", submission_date: daysFromNow(-2), approval_status: "Pending", created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "33", agenda_id: `AGD-${year}-0033`, agenda_title: "Monthly Business Performance Review", agenda_reference: "AGD-REF-3013", meeting_id: `MTG-${year}-0018`, meeting_title: "129th Executive Committee Meeting", committee: "Executive Committee", meeting_type: "Regular", agenda_category: "Operational", submitted_by: "MD", submitting_division: "Executive Office", purpose: "For review", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "30 min", voting_required: "No", financial_impact: "", submission_date: daysFromNow(-3), approval_status: "Approved", created_at: new Date(Date.now() - 10 * 86400000).toISOString() },
  // ── Special Board Meeting (MTG-2026-0010) — full agenda set ──────────────────
  // ── Special Board Meeting (MTG-2026-0010) — full agenda set ──────────────────
  { id: "34", agenda_id: `AGD-${year}-0034`, agenda_title: "Opening and Quorum Declaration", agenda_reference: "AGD-REF-4001", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For noting", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "5 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 1, created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "35", agenda_id: `AGD-${year}-0035`, agenda_title: "Confirmation of Previous Meeting Minutes", agenda_reference: "AGD-REF-4002", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For approval", proposed_decision: "That the minutes of the previous Executive Committee meeting be confirmed as a true and correct record.", priority: "Normal", confidentiality: "Confidential", estimated_duration: "10 min", voting_required: "Yes", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 2, created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "36", agenda_id: `AGD-${year}-0036`, agenda_title: "Executive Performance Review — Q2 2026", agenda_reference: "AGD-REF-4003", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For discussion", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "25 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 3, description: "Detailed review of Q2 financial performance against KPIs. CFO to present key variances and corrective measures.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "37", agenda_id: `AGD-${year}-0037`, agenda_title: "Strategic Initiative Progress Report", agenda_reference: "AGD-REF-4004", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Operational", submitted_by: "MD", submitting_division: "Executive Office", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "20 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 5, description: "Progress update on the five strategic initiatives approved in the 2026-2030 Strategic Plan.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "38", agenda_id: `AGD-${year}-0038`, agenda_title: "Any Other Business & Meeting Closure", agenda_reference: "AGD-REF-4005", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For noting", proposed_decision: "", priority: "Low", confidentiality: "Confidential", estimated_duration: "5 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 6, created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // ── Child agenda items — Special Board Meeting (MTG-2026-0010) ───────────────
  // Children of id="35" — Confirmation of Previous Meeting Minutes
  { id: "c-001", agenda_id: `AGD-${year}-0201`, agenda_title: "Review of Action Items from Previous Meeting", agenda_reference: "AGD-REF-4002-A", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For review", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "5 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "35", agenda_level: 2, display_order: 1, description: "A structured review of all action items resolved at the previous meeting, tracking completion status and identifying any outstanding obligations requiring escalation to the Board.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-002", agenda_id: `AGD-${year}-0202`, agenda_title: "Matters Arising from Previous Minutes", agenda_reference: "AGD-REF-4002-B", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For discussion", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "5 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "35", agenda_level: 2, display_order: 2, description: "Open discussion on matters arising from the previous meeting's minutes that are not covered under separate agenda items. Members may raise clarifications or provide updates on decisions previously recorded.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // Children of id="36" — Executive Performance Review
  { id: "c-003", agenda_id: `AGD-${year}-0203`, agenda_title: "Revenue & Profitability Analysis", agenda_reference: "AGD-REF-4003-A", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For discussion", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "36", agenda_level: 2, display_order: 1, description: "Detailed breakdown of Q2 revenue streams, net interest margin, fee income, and year-on-year profit growth. The CFO will present key drivers, segment performance, and explain variances against the approved annual budget targets.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-004", agenda_id: `AGD-${year}-0204`, agenda_title: "Cost Management & Operating Efficiency", agenda_reference: "AGD-REF-4003-B", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For discussion", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "8 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "36", agenda_level: 2, display_order: 2, description: "Analysis of operating expenditure against budget, cost-to-income ratio trends, and efficiency initiatives implemented during the quarter. Management will highlight cost reduction measures and their projected impact on the full-year result.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-005", agenda_id: `AGD-${year}-0205`, agenda_title: "Capital Adequacy & Liquidity Position", agenda_reference: "AGD-REF-4003-C", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For review", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "7 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "36", agenda_level: 2, display_order: 3, description: "Review of the organisation's capital adequacy ratios (CET1, Tier 1, Total CAR), liquidity coverage ratio, and net stable funding ratio as at 30 June 2026. Stress testing outcomes and buffer adequacy against regulatory minimums are presented.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // Children of id="10" (AGD-2026-0010) — Board Remuneration Review
  { id: "c-006", agenda_id: `AGD-${year}-0206`, agenda_title: "Benchmarking Analysis & Market Comparison", agenda_reference: "AGD-REF-R010-A", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For discussion", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "12 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "10", agenda_level: 2, display_order: 1, description: "Presentation of the independent benchmarking analysis prepared by Willis Towers Watson comparing current NED fee levels against comparable governance bodies in the banking and financial services sector. Market data covers base fees, committee chair allowances, meeting attendance fees, and equity-linked components where applicable.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-007", agenda_id: `AGD-${year}-0207`, agenda_title: "Proposed Revised Remuneration Framework", agenda_reference: "AGD-REF-R010-B", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For approval", proposed_decision: "That the Board approves the Revised Remuneration Framework effective 1 July 2026 as recommended by the Nomination & Remuneration Committee.", priority: "Normal", confidentiality: "Confidential", estimated_duration: "18 min", voting_required: "Yes", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "10", agenda_level: 2, display_order: 2, description: "The NRC presents its formal recommendation for the revised fee structure including proposed increases to the base Board fee, introduction of a Lead Independent Director allowance, revised committee chair supplements, and updated travel reimbursement guidelines. A formal motion will be put to the Board for approval.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // Children of id="37" — Strategic Initiative Progress Report
  { id: "c-008", agenda_id: `AGD-${year}-0208`, agenda_title: "Digital Banking Transformation Initiative", agenda_reference: "AGD-REF-4004-A", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Operational", submitted_by: "MD", submitting_division: "Executive Office", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "7 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "37", agenda_level: 2, display_order: 1, description: "Progress update on the Digital Banking Transformation Initiative, covering platform migration milestones, mobile app adoption metrics, digital transaction volumes, and remaining Phase 2 deliverables scheduled for Q3 2026. Key risks to the programme timeline are highlighted.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-009", agenda_id: `AGD-${year}-0209`, agenda_title: "Talent & Leadership Development Programme", agenda_reference: "AGD-REF-4004-B", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Operational", submitted_by: "MD", submitting_division: "Executive Office", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "7 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "37", agenda_level: 2, display_order: 2, description: "Status report on the Talent & Leadership Development Programme covering succession pipeline readiness, leadership training completion rates, external hire statistics, and retention KPIs. The MD will present outcomes from the mid-year talent review and highlight critical positions requiring succession planning attention.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-010", agenda_id: `AGD-${year}-0210`, agenda_title: "Enterprise Risk Framework Enhancement", agenda_reference: "AGD-REF-4004-C", meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", committee: "Executive Committee", meeting_type: "Special", agenda_category: "Operational", submitted_by: "MD", submitting_division: "Executive Office", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "6 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "37", agenda_level: 2, display_order: 3, description: "Update on enhancements to the enterprise risk management framework, covering implementation of the updated three-lines-of-defence model, new risk appetite metric integration, and the status of the Board-approved risk system replacement project.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // ── Child agenda items — 344th Board of Directors Meeting (MTG-2026-0013) ──
  // Children of id="22" — Approval of Previous Meeting Minutes
  { id: "c-011", agenda_id: `AGD-${year}-0211`, agenda_title: "Action Items Progress — 343rd Meeting", agenda_reference: "AGD-REF-3002-A", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For review", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "8 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "22", agenda_level: 2, display_order: 1, description: "Structured review of all action items arising from the 343rd Board Meeting. Each item is presented with current completion status, responsible officer, original deadline, and comments where timelines have been revised or extensions requested.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-012", agenda_id: `AGD-${year}-0212`, agenda_title: "Matters Arising from Previous Minutes", agenda_reference: "AGD-REF-3002-B", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For discussion", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "7 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "22", agenda_level: 2, display_order: 2, description: "Open discussion forum for members to raise any matters arising from the 343rd Board Meeting minutes that require further clarification, amendment, or Board direction before the minutes are formally adopted.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // Children of id="23" — Review of Q2 Financial Performance
  { id: "c-013", agenda_id: `AGD-${year}-0213`, agenda_title: "Income Statement & Profitability Drivers", agenda_reference: "AGD-REF-3003-A", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For discussion", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "15 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "23", agenda_level: 2, display_order: 1, description: "The CFO presents the Q2 income statement highlighting revenue composition, net interest income, non-interest income, impairment charges, and operating expenditure. Variance analysis against budget and prior-year comparative figures are presented alongside management commentary on key drivers.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-014", agenda_id: `AGD-${year}-0214`, agenda_title: "Balance Sheet & Asset Quality Review", agenda_reference: "AGD-REF-3003-B", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For discussion", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "15 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "23", agenda_level: 2, display_order: 2, description: "Review of the balance sheet as at 30 June 2026 covering total assets, loan portfolio growth, non-performing loan ratios, provision coverage, deposit base composition, and funding profile. The Board examines trends in asset quality and management's forward guidance on credit conditions.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-015", agenda_id: `AGD-${year}-0215`, agenda_title: "Regulatory Capital & Liquidity Ratios", agenda_reference: "AGD-REF-3003-C", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For review", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "15 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "23", agenda_level: 2, display_order: 3, description: "Regulatory capital adequacy ratios (CET1, Tier 1 Capital, Total CAR) and liquidity metrics (LCR, NSFR) as reported to the regulator for Q2 2026. The Board reviews compliance with minimum thresholds and management's capital planning assumptions for the remainder of the financial year.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // Children of id="24" — Capital Expenditure Approval — Q3
  { id: "c-016", agenda_id: `AGD-${year}-0216`, agenda_title: "IT Infrastructure & Digital Platform Investment", agenda_reference: "AGD-REF-3004-A", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For approval", proposed_decision: "That the Board approves the IT Infrastructure & Digital Platform capital expenditure of ৳32,000,000 for Q3 2026 as detailed in the supporting paper.", priority: "High", confidentiality: "Confidential", estimated_duration: "15 min", voting_required: "Yes", financial_impact: "৳32,000,000", submission_date: TODAY, approval_status: "Pending", parent_agenda_id: "24", agenda_level: 2, display_order: 1, description: "Business case for Q3 IT capital expenditure covering core banking system upgrade (৳18M), cybersecurity infrastructure enhancement (৳8M), cloud migration Phase 2 (৳4M), and disaster recovery site upgrade (৳2M). Each component is supported by technical specifications, vendor evaluations, and projected ROI calculations.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-017", agenda_id: `AGD-${year}-0217`, agenda_title: "Branch Network Expansion Programme", agenda_reference: "AGD-REF-3004-B", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Financial", submitted_by: "CFO", submitting_division: "Finance", purpose: "For approval", proposed_decision: "That the Board approves the Branch Network Expansion capital expenditure of ৳18,000,000 for Q3 2026 covering three new branch openings as detailed in the supporting paper.", priority: "High", confidentiality: "Confidential", estimated_duration: "15 min", voting_required: "Yes", financial_impact: "৳18,000,000", submission_date: TODAY, approval_status: "Pending", parent_agenda_id: "24", agenda_level: 2, display_order: 2, description: "Approval sought for capital expenditure to establish three new branch locations in Sylhet, Khulna, and Rajshahi Division as part of the approved Network Expansion Strategy 2025-2027. Each location is supported by a market feasibility study, regulatory licensing status, projected break-even analysis, and five-year financial model.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // Children of id="25" — Compliance and Regulatory Update
  { id: "c-018", agenda_id: `AGD-${year}-0218`, agenda_title: "Bangladesh Bank Regulatory Correspondence", agenda_reference: "AGD-REF-3005-A", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Compliance", submitted_by: "Head of Compliance", submitting_division: "Compliance", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "25", agenda_level: 2, display_order: 1, description: "Summary of formal correspondence received from Bangladesh Bank during Q2 2026, including inspection findings, compliance notices, reporting obligations, and circulars issued by the regulator. Management's responses and actions taken in respect of each item of correspondence are presented for the Board's awareness.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-019", agenda_id: `AGD-${year}-0219`, agenda_title: "AML/CFT & KYC Compliance Status", agenda_reference: "AGD-REF-3005-B", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Compliance", submitted_by: "Head of Compliance", submitting_division: "Compliance", purpose: "For information", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "25", agenda_level: 2, display_order: 2, description: "Quarterly update on the organisation's AML/CFT and KYC compliance posture including transaction monitoring alert volumes, suspicious transaction report filings, KYC remediation progress, high-risk customer review outcomes, and training completion statistics for all customer-facing staff.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // ── Emergency Board Meeting (MTG-2026-0011) — full agenda set ─────────────────
  { id: "39", agenda_id: `AGD-${year}-0039`, agenda_title: "Opening and Quorum Declaration", agenda_reference: "AGD-REF-5001", meeting_id: `MTG-${year}-0011`, meeting_title: "Emergency Board Meeting", committee: "Audit Committee", meeting_type: "Emergency", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For noting", proposed_decision: "", priority: "Normal", confidentiality: "Restricted", estimated_duration: "5 min", voting_required: "No", financial_impact: "", submission_date: `${year}-02-11`, approval_status: "Approved", display_order: 1, created_at: `${year}-02-10T18:00:00Z` } as AgendaSubmission,
  { id: "40", agenda_id: `AGD-${year}-0040`, agenda_title: "Review of Internal Audit Emergency Report", agenda_reference: "AGD-REF-5002", meeting_id: `MTG-${year}-0011`, meeting_title: "Emergency Board Meeting", committee: "Audit Committee", meeting_type: "Emergency", agenda_category: "Governance", submitted_by: "Head of Internal Audit", submitting_division: "Audit", purpose: "For review", proposed_decision: "That the Board accepts and notes the findings of the Emergency Internal Audit Report and authorises management to implement recommended corrective actions.", priority: "High", confidentiality: "Restricted", estimated_duration: "60 min", voting_required: "Yes", financial_impact: "৳12,500,000", submission_date: `${year}-02-10`, approval_status: "Approved", display_order: 2, description: "Presentation of critical and high-rated findings from the Q3 operational audit including segregation of duties, AML monitoring gaps, and IT access control weaknesses.", created_at: `${year}-02-10T18:00:00Z` } as AgendaSubmission,
  { id: "41", agenda_id: `AGD-${year}-0041`, agenda_title: "Management Letter Response & Remediation Plan", agenda_reference: "AGD-REF-5003", meeting_id: `MTG-${year}-0011`, meeting_title: "Emergency Board Meeting", committee: "Audit Committee", meeting_type: "Emergency", agenda_category: "Compliance", submitted_by: "CFO", submitting_division: "Finance", purpose: "For approval", proposed_decision: "That the Board approves the Management Remediation Plan and directs the Audit Committee to monitor progress at the next scheduled meeting.", priority: "High", confidentiality: "Restricted", estimated_duration: "45 min", voting_required: "Yes", financial_impact: "", submission_date: `${year}-02-10`, approval_status: "Approved", display_order: 3, description: "Management response to audit findings with time-bound action plan, responsible owners, and proposed control enhancements.", created_at: `${year}-02-10T18:30:00Z` } as AgendaSubmission,
  { id: "42", agenda_id: `AGD-${year}-0042`, agenda_title: "Resolution on Immediate Corrective Actions", agenda_reference: "AGD-REF-5004", meeting_id: `MTG-${year}-0011`, meeting_title: "Emergency Board Meeting", committee: "Audit Committee", meeting_type: "Emergency", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For approval", proposed_decision: "That the Board resolves to implement immediate corrective actions on Critical and High findings within prescribed timelines.", priority: "High", confidentiality: "Restricted", estimated_duration: "20 min", voting_required: "Yes", financial_impact: "", submission_date: `${year}-02-10`, approval_status: "Approved", display_order: 4, created_at: `${year}-02-10T18:30:00Z` } as AgendaSubmission,
  { id: "43", agenda_id: `AGD-${year}-0043`, agenda_title: "Any Other Business & Meeting Closure", agenda_reference: "AGD-REF-5005", meeting_id: `MTG-${year}-0011`, meeting_title: "Emergency Board Meeting", committee: "Audit Committee", meeting_type: "Emergency", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For noting", proposed_decision: "", priority: "Low", confidentiality: "Restricted", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: `${year}-02-10`, approval_status: "Approved", display_order: 5, created_at: `${year}-02-10T18:30:00Z` } as AgendaSubmission,
  // ── 344th Board of Directors Meeting — Q3 Session (MTG-2026-0013) extra items ─
  { id: "53", agenda_id: `AGD-${year}-0053`, agenda_title: "CEO & Managing Director Business Update", agenda_reference: "AGD-REF-3006", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Operational", submitted_by: "MD", submitting_division: "Executive Office", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "20 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 6, description: "The MD presents a summary of key business developments, strategic milestones, and significant operational matters arising during Q2 2026. The update includes progress on the Digital Transformation Programme, talent pipeline status, and market-facing initiatives.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "54", agenda_id: `AGD-${year}-0054`, agenda_title: "Governance, Risk & Board Nominations Update", agenda_reference: "AGD-REF-3007", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "15 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 7, description: "Company Secretary presents the governance calendar for H2 2026, pending committee appointments, and director training completion status. The Board notes the upcoming Annual General Meeting preparation schedule.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "55", agenda_id: `AGD-${year}-0055`, agenda_title: "Any Other Business & Meeting Closure", agenda_reference: "AGD-REF-3008", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For noting", proposed_decision: "", priority: "Low", confidentiality: "Confidential", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 8, created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // Children of id="53" — CEO Update
  { id: "c-020", agenda_id: `AGD-${year}-0220`, agenda_title: "Digital Banking Transformation — Phase 2 Milestone", agenda_reference: "AGD-REF-3006-A", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Operational", submitted_by: "MD", submitting_division: "Executive Office", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "53", agenda_level: 2, display_order: 1, description: "Progress update on Phase 2 of the Digital Banking Transformation covering new mobile features, API integration milestones, and projected Phase 3 timelines. The MD highlights adoption metrics and risk mitigation measures for the core-banking cutover scheduled in Q4.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  { id: "c-021", agenda_id: `AGD-${year}-0221`, agenda_title: "Human Capital & Talent Retention Report", agenda_reference: "AGD-REF-3006-B", meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", committee: "Board of Directors", meeting_type: "Regular", agenda_category: "Operational", submitted_by: "MD", submitting_division: "Executive Office", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "53", agenda_level: 2, display_order: 2, description: "Summary of Q2 talent metrics including attrition rate (4.2%), headcount changes, leadership development programme completion rates, and succession readiness for critical roles. Key retention initiatives and compensation benchmarking outcomes are presented.", created_at: new Date(Date.now() - 86400000).toISOString() } as AgendaSubmission,
  // ── 57th Audit Committee Meeting (MTG-2026-0014) — full agenda set ───────────
  { id: "44", agenda_id: `AGD-${year}-0044`, agenda_title: "Opening and Quorum Declaration", agenda_reference: "AGD-REF-6001", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For noting", proposed_decision: "", priority: "Normal", confidentiality: "Restricted", estimated_duration: "5 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 1, created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "45", agenda_id: `AGD-${year}-0045`, agenda_title: "Approval of Previous Audit Committee Minutes", agenda_reference: "AGD-REF-6002", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For approval", proposed_decision: "That the minutes of the 56th Audit Committee Meeting held on 15 June 2026 be confirmed as a true and accurate record.", priority: "Normal", confidentiality: "Restricted", estimated_duration: "10 min", voting_required: "Yes", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 2, created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "46", agenda_id: `AGD-${year}-0046`, agenda_title: "Fraud Risk Assessment & Incident Review Q2", agenda_reference: "AGD-REF-6005", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Risk Management", submitted_by: "Head of Internal Audit", submitting_division: "Audit", purpose: "For review", proposed_decision: "", priority: "High", confidentiality: "Restricted", estimated_duration: "30 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 5, description: "Summary of fraud incidents reported in Q2 2026 including case details, recovery status, root-cause analysis, and control enhancement actions taken. The Audit Committee reviews trend data and approves enhanced monitoring thresholds.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "47", agenda_id: `AGD-${year}-0047`, agenda_title: "Any Other Business & Meeting Closure", agenda_reference: "AGD-REF-6006", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For noting", proposed_decision: "", priority: "Low", confidentiality: "Restricted", estimated_duration: "5 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", display_order: 6, created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  // Children of id="26" — Internal Audit Findings Q2
  { id: "c-022", agenda_id: `AGD-${year}-0222`, agenda_title: "Critical & High Audit Findings Summary", agenda_reference: "AGD-REF-6003-A", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Head of Internal Audit", submitting_division: "Audit", purpose: "For review", proposed_decision: "", priority: "High", confidentiality: "Restricted", estimated_duration: "15 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "26", agenda_level: 2, display_order: 1, description: "Detailed walkthrough of all Critical and High-rated findings from the Q2 internal audit cycle. Findings span operational, financial, and IT domains. Root causes, management responses, and remediation deadlines are presented for each finding. The Committee evaluates adequacy of management's responses and escalates unresolved items.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "c-023", agenda_id: `AGD-${year}-0223`, agenda_title: "IT Audit & Cybersecurity Control Findings", agenda_reference: "AGD-REF-6003-B", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Head of Internal Audit", submitting_division: "Audit", purpose: "For review", proposed_decision: "", priority: "High", confidentiality: "Restricted", estimated_duration: "15 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "26", agenda_level: 2, display_order: 2, description: "IT audit findings covering privileged access management, patch management compliance, data encryption standards, and SWIFT security framework adherence. The Head of Internal Audit presents remediation status for IT findings from the previous quarter and introduces new findings from the Q2 IT audit cycle.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "c-024", agenda_id: `AGD-${year}-0224`, agenda_title: "Audit Recommendation Follow-Up Status", agenda_reference: "AGD-REF-6003-C", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Head of Internal Audit", submitting_division: "Audit", purpose: "For review", proposed_decision: "", priority: "Normal", confidentiality: "Restricted", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "26", agenda_level: 2, display_order: 3, description: "Tracker report on all audit recommendations issued in previous quarters showing: total open items (32), items closed since last meeting (11), items overdue (5), and items pending management response (7). The Committee reviews overdue items and determines whether escalation to the Board is required.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  // Children of id="27" — External Auditor Status Update
  { id: "c-025", agenda_id: `AGD-${year}-0225`, agenda_title: "Interim Audit Progress & Timeline", agenda_reference: "AGD-REF-6004-A", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Restricted", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "27", agenda_level: 2, display_order: 1, description: "External auditor (Rahman Rahman Huq — KPMG) presents the interim audit progress update covering fieldwork completion status (estimated 65% complete), key risk areas under examination, audit timeline for final report delivery, and any significant matters identified to date.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "c-026", agenda_id: `AGD-${year}-0226`, agenda_title: "Management Letter — Outstanding Items", agenda_reference: "AGD-REF-6004-B", meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", committee: "Audit Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For information", proposed_decision: "", priority: "Normal", confidentiality: "Restricted", estimated_duration: "10 min", voting_required: "No", financial_impact: "", submission_date: TODAY, approval_status: "Approved", parent_agenda_id: "27", agenda_level: 2, display_order: 2, description: "Review of outstanding management letter items from the prior year external audit. Of 18 items issued, 12 are confirmed closed, 4 are in progress with agreed timelines, and 2 are under further discussion with management. The external auditor confirms no repeat findings have been identified in the current interim cycle.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  // ── 43rd Risk Management Committee Meeting (MTG-2026-0015) — full agenda set ──
  { id: "48", agenda_id: `AGD-${year}-0048`, agenda_title: "Opening and Quorum Declaration", agenda_reference: "AGD-REF-7001", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For noting", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "5 min", voting_required: "No", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", display_order: 1, created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "49", agenda_id: `AGD-${year}-0049`, agenda_title: "Approval of Previous RMC Meeting Minutes", agenda_reference: "AGD-REF-7002", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For approval", proposed_decision: "That the minutes of the 42nd Risk Management Committee Meeting held on 4 April 2026 be confirmed as a true and accurate record.", priority: "Normal", confidentiality: "Confidential", estimated_duration: "10 min", voting_required: "Yes", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", display_order: 2, created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "50", agenda_id: `AGD-${year}-0050`, agenda_title: "Credit Risk Portfolio Review — Q2 2026", agenda_reference: "AGD-REF-7005", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Risk Management", submitted_by: "CRO", submitting_division: "Risk", purpose: "For review", proposed_decision: "", priority: "High", confidentiality: "Confidential", estimated_duration: "30 min", voting_required: "No", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", display_order: 5, description: "Detailed review of the credit risk portfolio covering NPL ratios by segment, large exposure concentrations, sector-specific risk trends, and provisioning adequacy. The CRO presents stress-test outcomes and recommends adjustments to sector exposure limits in response to Q2 findings.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "51", agenda_id: `AGD-${year}-0051`, agenda_title: "Operational Risk Incidents & Emerging Risks Q2", agenda_reference: "AGD-REF-7006", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Risk Management", submitted_by: "CRO", submitting_division: "Risk", purpose: "For review", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "25 min", voting_required: "No", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", display_order: 6, description: "Quarterly operational risk incident log covering Q2 events above the ৳500,000 threshold. Presentation includes root-cause analysis, insurance recovery status, and control enhancements implemented. The emerging risk section covers cyberattack trends in the sector and geopolitical exposure from foreign currency positions.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "52", agenda_id: `AGD-${year}-0052`, agenda_title: "Any Other Business & Meeting Closure", agenda_reference: "AGD-REF-7007", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Governance", submitted_by: "Company Secretary", submitting_division: "Governance", purpose: "For noting", proposed_decision: "", priority: "Low", confidentiality: "Confidential", estimated_duration: "5 min", voting_required: "No", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", display_order: 7, created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  // Children of id="28" — Risk Appetite Statement Review
  { id: "c-027", agenda_id: `AGD-${year}-0227`, agenda_title: "Market & Liquidity Risk Appetite Thresholds", agenda_reference: "AGD-REF-7003-A", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Risk Management", submitted_by: "CRO", submitting_division: "Risk", purpose: "For approval", proposed_decision: "That the RMC approves the revised Market Risk and Liquidity Risk appetite thresholds as presented, effective Q3 2026.", priority: "High", confidentiality: "Confidential", estimated_duration: "15 min", voting_required: "Yes", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", parent_agenda_id: "28", agenda_level: 2, display_order: 1, description: "Proposed revisions to market risk appetite including updated VaR limits for the trading book, interest rate sensitivity thresholds, and foreign currency net open position limits. Liquidity risk appetite revisions cover the minimum LCR buffer (proposed increase from 110% to 120%) and NSFR compliance timeline.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "c-028", agenda_id: `AGD-${year}-0228`, agenda_title: "Credit Risk Tolerance Limits & Sector Caps", agenda_reference: "AGD-REF-7003-B", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Risk Management", submitted_by: "CRO", submitting_division: "Risk", purpose: "For approval", proposed_decision: "That the RMC approves the revised sector concentration caps as presented, with a 6-month review cycle commencing Q4 2026.", priority: "High", confidentiality: "Confidential", estimated_duration: "20 min", voting_required: "Yes", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", parent_agenda_id: "28", agenda_level: 2, display_order: 2, description: "Review of sector-level credit concentration limits in light of Q2 NPL trend data. The CRO recommends reducing the Real Estate sector cap from 20% to 17% of total credit portfolio and introducing a new sub-limit for commercial real estate construction loans given elevated delinquency rates observed in H1.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  // Children of id="29" — KRI Dashboard
  { id: "c-029", agenda_id: `AGD-${year}-0229`, agenda_title: "Top-10 KRI Amber & Red Status Walkthrough", agenda_reference: "AGD-REF-7004-A", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Risk Management", submitted_by: "CRO", submitting_division: "Risk", purpose: "For review", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "12 min", voting_required: "No", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", parent_agenda_id: "29", agenda_level: 2, display_order: 1, description: "Structured presentation of all Key Risk Indicators rated Amber or Red at quarter-end. For each KRI the CRO presents: current value vs. threshold, trend direction, contributing factors, and management action to return to Green. The Committee reviews escalation criteria and confirms whether any KRI requires Board-level reporting.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
  { id: "c-030", agenda_id: `AGD-${year}-0230`, agenda_title: "Emerging Risk Register Update", agenda_reference: "AGD-REF-7004-B", meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", committee: "Risk Management Committee", meeting_type: "Regular", agenda_category: "Risk Management", submitted_by: "CRO", submitting_division: "Risk", purpose: "For discussion", proposed_decision: "", priority: "Normal", confidentiality: "Confidential", estimated_duration: "13 min", voting_required: "No", financial_impact: "", submission_date: daysFromNow(-1), approval_status: "Approved", parent_agenda_id: "29", agenda_level: 2, display_order: 2, description: "Quarterly update to the Emerging Risk Register incorporating new risks identified by the Risk team, industry peers, regulatory guidance, and the Board Risk Survey. New entries for Q2 include: AI model risk in credit decisioning, supply chain disruption impact on SME borrowers, and regulatory change risk from upcoming Basel IV implementation timeline.", created_at: new Date(Date.now() - 2 * 86400000).toISOString() } as AgendaSubmission,
];

// Merge extra agendas into the base array
const _BASE_AGENDAS: AgendaSubmission[] = Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  agenda_id: `AGD-${year}-${padded(i + 1)}`,
  agenda_title: [
    "Approval of Annual Budget 2026-27",
    "Risk Management Framework Update",
    "IT Security Policy Review",
    "HR Policy Amendment",
    "Compliance Report Q1 2026",
    "New Branch Expansion Proposal",
    "Loan Portfolio Review",
    "Capital Adequacy Assessment",
    "Anti-Money Laundering Policy",
    "Board Remuneration Review",
  ][i % 10],
  agenda_reference: `AGD-REF-${1000 + i}`,
  meeting_id: `MTG-${year}-${padded((i % 12) + 1)}`,
  meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
  committee: GOVERNANCE_BODIES[i % 8],
  meeting_type: MEETING_TYPES[i % 5],
  agenda_category: AGENDA_CATEGORIES[i % 9],
  submitted_by: ["Company Secretary", "Governance Analyst", "CFO"][i % 3],
  submitting_division: ["Governance", "Finance", "Risk", "Compliance", "IT"][i % 5],
  purpose: ["For approval", "For information", "For discussion"][i % 3],
  proposed_decision: "",
  priority: PRIORITIES[i % 3],
  confidentiality: CONFIDENTIALITY_LEVELS[i % 4],
  estimated_duration: ["15 min", "30 min", "45 min", "60 min"][i % 4],
  voting_required: ["Yes", "No"][i % 2],
  financial_impact: i % 3 === 0 ? `৳${(i + 1) * 5000000}` : "",
  submission_date: `${year}-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  approval_status: ["Pending", "Approved", "Deferred", "Rejected"][i % 4],
  created_at: NOW,
}));

export const MOCK_AGENDA_SUBMISSIONS: AgendaSubmission[] = [..._BASE_AGENDAS, ...EXTRA_AGENDAS];

const EMG_DECISIONS: Decision[] = [
  { id: "emg-d1", decision_id: `DEC-${year}-0101`, decision_title: "Accept Emergency Audit Report", source_meeting: EMG_MID, meeting_id: EMG_MID, agenda_item: `AGD-${year}-0040`, decision_type: "Board Resolution", decision_reference: `DEC-REF-${year}-0101`, decision_owner: "Audit Committee", decided_by: "Mr. Md. Nurul Amin", effective_date: EMG_DATE, implementation_deadline: `${year}-02-28`, financial_impact: "", implementation_status: "Completed", approval_status: "Approved", created_at: `${EMG_DATE}T10:20:00Z`, activity_history: mkActivity("Decision recorded — Board accepted the Emergency Internal Audit Report.") },
  { id: "emg-d2", decision_id: `DEC-${year}-0102`, decision_title: "Approve Management Remediation Plan", source_meeting: EMG_MID, meeting_id: EMG_MID, agenda_item: `AGD-${year}-0041`, decision_type: "Board Directive", decision_reference: `DEC-REF-${year}-0102`, decision_owner: "CFO", decided_by: "Mr. Md. Nurul Amin", effective_date: EMG_DATE, implementation_deadline: `${year}-03-15`, financial_impact: "", implementation_status: "In Progress", approval_status: "Approved", created_at: `${EMG_DATE}T11:08:00Z`, activity_history: mkActivity("Remediation plan approved — 30-day implementation deadline set.") },
  { id: "emg-d3", decision_id: `DEC-${year}-0103`, decision_title: "Implement Immediate Corrective Actions on Critical & High Findings", source_meeting: EMG_MID, meeting_id: EMG_MID, agenda_item: `AGD-${year}-0042`, decision_type: "Directive", decision_reference: `DEC-REF-${year}-0103`, decision_owner: "MD", decided_by: "Mr. Md. Nurul Amin", effective_date: EMG_DATE, implementation_deadline: `${year}-02-25`, financial_impact: "৳12,500,000", implementation_status: "In Progress", approval_status: "Approved", created_at: `${EMG_DATE}T11:35:00Z`, activity_history: mkActivity("Directive issued — 15 business-day deadline for Critical and High findings.") },
];

export const MOCK_DECISIONS: Decision[] = [...Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  decision_id: `DEC-${year}-${padded(i + 1)}`,
  decision_title: [
    "Approve Annual Budget 2026-27",
    "Ratify Risk Management Framework",
    "Adopt Updated Compliance Policy",
    "Authorize New Branch Opening",
    "Approve Capital Expenditure Plan",
    "Appoint External Auditor",
    "Revise Loan Approval Limits",
    "Endorse Strategic Plan 2026-2030",
    "Approve IT Infrastructure Investment",
    "Ratify HR Policy Changes",
  ][i % 10],
  source_meeting: `MTG-${year}-${padded((i % 12) + 1)}`,
  agenda_item: `AGD-${year}-${padded((i % 20) + 1)}`,
  decision_type: DECISION_TYPES[i % 7],
  decision_owner: ["Chairman", "MD", "CFO", "Company Secretary"][i % 4],
  effective_date: `${year}-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  implementation_deadline: `${year}-${String((i % 9) + 3).padStart(2, "0")}-30`,
  financial_impact: i % 2 === 0 ? `৳${(i + 1) * 10000000}` : "",
  implementation_status: ["Not Started", "In Progress", "Completed", "Overdue"][i % 4],
  approval_status: ["Pending", "Approved", "Implemented", "Deferred"][i % 4],
  created_at: NOW,
  activity_history: mkActivity("Decision recorded"),
})), ...EMG_DECISIONS];

export const MOCK_RESOLUTIONS: Resolution[] = [...Array.from({ length: 18 }, (_, i) => ({
  id: String(i + 1),
  resolution_id: `RES-${year}-${padded(i + 1)}`,
  resolution_title: [
    "Resolution to Approve Annual Budget",
    "Resolution on Risk Framework Adoption",
    "Resolution to Appoint External Auditors",
    "Resolution on Capital Expenditure",
    "Written Resolution on Policy Amendment",
    "Ordinary Resolution — Loan Limits",
    "Special Resolution — By-Laws Amendment",
    "Resolution to Open New Branch",
    "Resolution on IT Investment",
  ][i % 9],
  resolution_type: ["Ordinary", "Special", "Written"][i % 3],
  source_meeting: `MTG-${year}-${padded((i % 12) + 1)}`,
  source_decision: `DEC-${year}-${padded((i % 18) + 1)}`,
  resolution_text: "The Board hereby resolves that...",
  proposed_by: ["Chairman", "MD", "Independent Director"][i % 3],
  seconded_by: ["Director", "Executive Director", "Non-Executive Director"][i % 3],
  vote_result: ["Passed", "Passed Unanimously", "Failed", "Deferred"][i % 4],
  votes_for: String(5 + i % 4),
  votes_against: String(i % 2),
  abstentions: String(i % 2),
  effective_date: `${year}-0${(i % 9) + 1}-15`,
  approval_status: ["Pending", "Adopted", "Rejected", "Pending Signature"][i % 4],
  created_at: NOW,
})),
  { id: "emg-r1", resolution_id: `RES-${year}-0101`, resolution_title: "Resolution to Accept Emergency Audit Findings and Authorise Remediation", resolution_type: "Ordinary", source_meeting: EMG_MID, meeting_id: EMG_MID, source_decision: "emg-d1", resolution_text: "The Audit Committee hereby resolves that: (1) the findings of the Emergency Internal Audit Report dated 11 February 2026 are accepted and noted; (2) management is authorised and directed to implement all recommended corrective actions within the timelines specified in the approved Remediation Plan; and (3) the Audit Committee shall receive a progress update at each subsequent meeting until all findings are fully remediated.", proposed_by: "Mr. Md. Nurul Amin", seconded_by: "Mr. Md. Abul Bashar", vote_result: "Passed Unanimously", votes_for: "5", votes_against: "0", abstentions: "1", effective_date: EMG_DATE, approval_status: "Adopted", resolution_reference: `RES-REF-${year}-0101`, created_at: `${EMG_DATE}T11:40:00Z` },
];

export const MOCK_ACTION_ITEMS: ActionItem[] = [...Array.from({ length: 22 }, (_, i) => ({
  id: String(i + 1),
  action_id: `ACT-${year}-${padded(i + 1)}`,
  action_title: [
    "Prepare Budget Implementation Report",
    "Update Risk Register",
    "Circulate Approved Policy",
    "Submit Regulatory Filings",
    "Complete Branch Opening Checklist",
    "Onboard External Auditor",
    "Update Loan Approval Procedures",
    "Finalize Strategic Plan Document",
    "Procure IT Equipment",
    "Revise HR Handbook",
  ][i % 10],
  source_meeting: `MTG-${year}-${padded((i % 12) + 1)}`,
  source_decision: `DEC-${year}-${padded((i % 20) + 1)}`,
  assigned_to: ["Company Secretary", "CFO", "CRO", "Head of IT", "HR Manager"][i % 5],
  priority: ACTION_PRIORITIES[i % 4],
  due_date: `${year}-${String((i % 9) + 3).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  completion_date: i % 3 === 0 ? TODAY : "",
  progress: String(i % 4 === 0 ? 100 : i * 8 % 90),
  implementation_status: ["Not Started", "In Progress", "Completed", "Overdue", "On Hold"][i % 5],
  approval_status: ["Open", "Completed", "Overdue", "Cancelled"][i % 4],
  created_at: NOW,
  activity_history: mkActivity("Action item created"),
})),
  { id: "emg-act1", action_id: `ACT-${year}-0101`, action_title: "Implement dual-authorisation control for loan disbursements above ৳500,000", source_meeting: EMG_MID, meeting_id: EMG_MID, source_decision: "emg-d3", assigned_to: "CFO", action_owner: "Mr. Kamal Hossain", priority: "Critical", due_date: `${year}-02-25`, completion_date: "", progress: "40", implementation_status: "In Progress", action_status: "In Progress", approval_status: "Open", created_at: `${EMG_DATE}T12:00:00Z`, activity_history: mkActivity("Action item created from Emergency Board Meeting resolution."), updated_at: `${EMG_DATE}T12:00:00Z` },
  { id: "emg-act2", action_id: `ACT-${year}-0102`, action_title: "Remediate AML transaction monitoring backlog — clear 14 flagged transactions", source_meeting: EMG_MID, meeting_id: EMG_MID, source_decision: "emg-d3", assigned_to: "Head of Compliance", action_owner: "Mr. Imran Hossain", priority: "High", due_date: `${year}-02-25`, completion_date: "", progress: "20", implementation_status: "In Progress", action_status: "In Progress", approval_status: "Open", created_at: `${EMG_DATE}T12:00:00Z`, activity_history: mkActivity("AML remediation action issued — 15 business-day deadline."), updated_at: `${EMG_DATE}T12:00:00Z` },
  { id: "emg-act3", action_id: `ACT-${year}-0103`, action_title: "Formalise IT offboarding process — implement automated account deactivation workflow", source_meeting: EMG_MID, meeting_id: EMG_MID, source_decision: "emg-d3", assigned_to: "Head of IT", action_owner: "IT Director", priority: "High", due_date: `${year}-03-15`, completion_date: "", progress: "10", implementation_status: "In Progress", action_status: "In Progress", approval_status: "Open", created_at: `${EMG_DATE}T12:00:00Z`, activity_history: mkActivity("IT process remediation action — 30-day timeline."), updated_at: `${EMG_DATE}T12:00:00Z` },
  { id: "emg-act4", action_id: `ACT-${year}-0104`, action_title: "Complete documentation for 8 credit approvals above ৳5M threshold", source_meeting: EMG_MID, meeting_id: EMG_MID, source_decision: "emg-d2", assigned_to: "Company Secretary", action_owner: "Ms. Nasrin Sultana", priority: "Medium", due_date: `${year}-03-05`, completion_date: "", progress: "0", implementation_status: "Not Started", action_status: "Pending", approval_status: "Open", created_at: `${EMG_DATE}T12:00:00Z`, activity_history: mkActivity("Documentation remediation action — medium priority."), updated_at: `${EMG_DATE}T12:00:00Z` },
  { id: "emg-act5", action_id: `ACT-${year}-0105`, action_title: "Circulate Emergency Board Meeting action plan to all Board members within 48 hours", source_meeting: EMG_MID, meeting_id: EMG_MID, source_decision: "emg-d1", assigned_to: "Company Secretary", action_owner: "Ms. Nasrin Sultana", priority: "High", due_date: `${year}-02-13`, completion_date: `${year}-02-12`, progress: "100", implementation_status: "Completed", action_status: "Completed", approval_status: "Completed", created_at: `${EMG_DATE}T12:00:00Z`, activity_history: mkActivity("Action completed — action plan circulated 12 Feb 2026."), updated_at: `${year}-02-12T16:00:00Z` },
];

export const MOCK_GOVERNANCE_BODIES: GovernanceBody[] = [
  { id: "1", body_id: "GB-001", body_name: "Board of Directors", body_type: "Board", chairperson: "Mr. Abdul Awal Mintoo", secretary: "Ms. Nasrin Sultana", member_count: "12", quorum_requirement: "50%+1", voting_method: "Simple Majority", establishment_date: "1985-01-01", mandate: "Highest governing body of Convay", status: "Active", created_at: NOW },
  { id: "2", body_id: "GB-002", body_name: "Executive Committee", body_type: "Committee", chairperson: "Mr. Md. Nurul Amin", secretary: "Mr. Kamal Hossain", member_count: "7", quorum_requirement: "50%+1", voting_method: "Simple Majority", establishment_date: "1990-06-01", mandate: "Oversee day-to-day executive management", status: "Active", created_at: NOW },
  { id: "3", body_id: "GB-003", body_name: "Audit Committee", body_type: "Committee", chairperson: "Mr. Md. Abul Bashar", secretary: "Ms. Nasrin Sultana", member_count: "5", quorum_requirement: "3 members", voting_method: "Consensus", establishment_date: "2002-03-15", mandate: "Oversee financial reporting and internal audit", status: "Active", created_at: NOW },
  { id: "4", body_id: "GB-004", body_name: "Risk Management Committee", body_type: "Committee", chairperson: "Mr. Md. Nurul Amin", secretary: "Mr. Kamal Hossain", member_count: "6", quorum_requirement: "50%+1", voting_method: "Simple Majority", establishment_date: "2005-07-01", mandate: "Oversee risk management framework", status: "Active", created_at: NOW },
  { id: "5", body_id: "GB-005", body_name: "Shariah Supervisory Committee", body_type: "Committee", chairperson: "Sheikh Md. Faridul Islam", secretary: "Mr. Imran Hossain", member_count: "4", quorum_requirement: "3 members", voting_method: "Consensus", establishment_date: "1999-01-01", mandate: "Ensure Shariah compliance in Islamic banking products", status: "Active", created_at: NOW },
  { id: "6", body_id: "GB-006", body_name: "Nomination & Remuneration Committee", body_type: "Committee", chairperson: "Mr. Abdul Awal Mintoo", secretary: "Ms. Nasrin Sultana", member_count: "4", quorum_requirement: "3 members", voting_method: "Simple Majority", establishment_date: "2010-04-01", mandate: "Oversee board nominations and remuneration", status: "Active", created_at: NOW },
];

// ─── Motion Interface ──────────────────────────────────────────────────────────

export interface Motion {
  id: string;
  motion_id: string;
  meeting_id: string;
  agenda_item: string;
  motion_title: string;
  motion_text: string;
  proposed_by: string;
  seconded_by: string;
  status: string;
  votes_for: string;
  votes_against: string;
  abstentions: string;
  notes: string;
  created_at: string;
  title?: string;
}

// ─── Minutes Interface ─────────────────────────────────────────────────────────

export interface Minutes {
  id: string;
  minutes_id: string;
  meeting_id: string;
  meeting_title: string;
  minutes_template: string;
  minute_taker: string;
  co_authors: string;
  quorum_statement: string;
  discussion_summary: string;
  next_meeting_date: string;
  closing_time: string;
  version: string;
  approval_status: string;
  created_at: string;
  meeting_date?: string;
}

// ─── BoardPack Interface ───────────────────────────────────────────────────────

export interface BoardPack {
  id: string;
  pack_id: string;
  pack_title: string;
  related_meeting: string;
  meeting_title: string;
  committee: string;
  version: string;
  document_count: string;
  review_completion: string;
  publication_date: string;
  change_summary: string;
  access_policy: string;
  approval_status: string;
  created_at: string;
  created_by: string;
  meeting_date?: string;
}

// ─── BoardDocument Interface ───────────────────────────────────────────────────

export interface BoardDocument {
  id: string;
  doc_id: string;
  doc_name: string;
  doc_number: string;
  doc_type: string;
  related_meeting: string;
  related_agenda: string;
  owner: string;
  version: string;
  confidentiality: string;
  effective_date: string;
  expiry_date: string;
  acknowledgement_required: string;
  approval_status: string;
  created_at: string;
  // Extended metadata
  file_name?: string;
  file_format?: string;
  mime_type?: string;
  /** @deprecated Legacy alias for mime_type — normalise to mime_type on ingest */
  file_mime?: string;
  file_size?: number;
  original_file_ref?: string;
  content_type?: "uploaded" | "editor" | "linked";
  editor_provider?: string;
  created_by?: string;
  last_modified_by?: string;
  last_modified_at?: string;
  workflow_status?: string;
  current_version_id?: string;
  folder_id?: string;
  tags?: string;
  is_favorite?: boolean;
  is_pinned?: boolean;
  is_template?: boolean;
  is_locked?: boolean;
  locked_version_id?: string;
  unresolved_comment_count?: number;
  pending_suggestion_count?: number;
  // Format-specific metadata (populated on import / normalization)
  workspace_type?: string;
  page_count?: number;
  sheet_count?: number;
  active_sheet_id?: string;
  has_annotations?: boolean;
  annotation_count?: number;
  has_macros?: boolean;
  has_external_links?: boolean;
  conversion_warning?: string;
  title?: string;
  document_title?: string;
  /** Plain-text body shown in the inline document viewer when no binary file is attached. */
  content_body?: string;
}

// ─── MatterArising Interface ───────────────────────────────────────────────────

export interface MatterArising {
  id: string;
  matter_id: string;
  matter_title: string;
  source_meeting: string;
  source_agenda: string;
  source_decision: string;
  owner: string;
  due_date: string;
  current_status: string;
  progress: string;
  delay_reason: string;
  next_review_date: string;
  target_meeting: string;
  created_at: string;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────────

export const MOCK_MOTIONS: Motion[] = [
  {
    id: "mot-001",
    motion_id: `MOT-${year}-0001`,
    meeting_id: EMG_MID,
    agenda_item: `AGD-${year}-0040`,
    motion_title: "Acceptance of Emergency Internal Audit Report",
    motion_text: "That the Board accepts and notes the findings of the Emergency Internal Audit Report dated 11 February 2026, and authorises management to implement the recommended corrective actions within 30 days.",
    proposed_by: "Mr. Md. Nurul Amin",
    seconded_by: "Mr. Md. Abul Bashar",
    status: "Passed",
    votes_for: "5",
    votes_against: "0",
    abstentions: "1",
    notes: "Motion passed unanimously with one abstention.",
    created_at: `${EMG_DATE}T10:15:00Z`,
  },
  {
    id: "mot-002",
    motion_id: `MOT-${year}-0002`,
    meeting_id: EMG_MID,
    agenda_item: `AGD-${year}-0041`,
    motion_title: "Approval of Management Remediation Plan",
    motion_text: "That the Board approves the Management Remediation Plan as presented and directs the Audit Committee to monitor progress and report at the next scheduled meeting.",
    proposed_by: "Mr. Md. Abul Bashar",
    seconded_by: "Mr. Rafiqul Islam",
    status: "Passed",
    votes_for: "6",
    votes_against: "0",
    abstentions: "0",
    notes: "Passed unanimously.",
    created_at: `${EMG_DATE}T11:00:00Z`,
  },
  {
    id: "mot-003",
    motion_id: `MOT-${year}-0003`,
    meeting_id: EMG_MID,
    agenda_item: `AGD-${year}-0042`,
    motion_title: "Resolution on Immediate Corrective Actions",
    motion_text: "That the Board resolves to implement immediate corrective actions on findings rated Critical and High in the audit report, with a status update due within 15 business days.",
    proposed_by: "Ms. Nasrin Sultana",
    seconded_by: "Mr. Md. Nurul Amin",
    status: "Passed",
    votes_for: "6",
    votes_against: "0",
    abstentions: "0",
    notes: "Board directed the Company Secretary to circulate action plan to all members.",
    created_at: `${EMG_DATE}T11:30:00Z`,
  },
];

export const MOCK_MINUTES: Minutes[] = [
  {
    id: "min-001",
    minutes_id: `MIN-${year}-0001`,
    meeting_id: EMG_MID,
    meeting_title: "Emergency Board Meeting",
    minutes_template: "Standard Board Minutes",
    minute_taker: "Mr. Rafiqul Islam",
    co_authors: "Ms. Nasrin Sultana",
    quorum_statement: "Quorum was declared at 09:08 AM with 6 out of 8 eligible members present, satisfying the minimum quorum requirement of 4 members.",
    discussion_summary: `MINUTES OF THE EMERGENCY BOARD MEETING
Meeting ID: MTG-${year}-0011
Date: 11 February ${year}
Time: 09:00 AM – 12:00 PM
Venue: Board Room A, Head Office
Committee: Audit Committee

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

AGENDA ITEM 1: OPENING AND QUORUM DECLARATION
──────────────────────────────────────────────
The Chairperson, Mr. Md. Nurul Amin, called the meeting to order at 09:05 AM. The Company Secretary, Ms. Nasrin Sultana, confirmed that quorum was satisfied with 6 of 8 eligible committee members present. The meeting was declared open.

AGENDA ITEM 2: REVIEW OF INTERNAL AUDIT EMERGENCY REPORT
──────────────────────────────────────────────────────────
The Head of Internal Audit presented the Emergency Internal Audit Report covering critical findings identified during the Q3 operational review. Key findings included:

  • Finding 1 (Critical): Inadequate segregation of duties in the loan disbursement process. Estimated exposure: ৳12.5M.
  • Finding 2 (High): Gaps in the anti-money laundering (AML) transaction monitoring system — 14 flagged transactions not reviewed within prescribed timelines.
  • Finding 3 (High): IT access controls — 23 active user accounts belonging to former employees not deactivated within the required 24-hour window.
  • Finding 4 (Medium): Incomplete documentation for 8 credit approvals above the ৳5M threshold.

Discussion ensued. The CFO acknowledged the findings and confirmed that immediate interim controls had been activated for the loan disbursement process. The IT Director confirmed emergency deactivation of all identified accounts had been completed as of 09 February ${year}.

MOTION PASSED: The Board accepted and noted the findings of the Emergency Internal Audit Report and authorised management to implement all recommended corrective actions. Votes: 5 For, 0 Against, 1 Abstention.

AGENDA ITEM 3: MANAGEMENT LETTER RESPONSE & REMEDIATION PLAN
─────────────────────────────────────────────────────────────
Management presented the Remediation Plan outlining specific corrective actions, responsible owners, and target completion dates for each audit finding. The Audit Committee reviewed the plan and recommended the following enhancements:

  • All Critical findings to be resolved within 15 business days.
  • High findings to be resolved within 30 business days.
  • A mid-point progress report to be submitted to the Committee by 25 February ${year}.

MOTION PASSED: The Board approved the Management Remediation Plan as presented. Votes: 6 For, 0 Against, 0 Abstentions.

AGENDA ITEM 4: RESOLUTION ON IMMEDIATE CORRECTIVE ACTIONS
───────────────────────────────────────────────────────────
The Company Secretary tabled the proposed formal resolution for adoption. Following review:

MOTION PASSED: The Board resolved to implement immediate corrective actions on all Critical and High findings, with a written status update due within 15 business days. Votes: 6 For, 0 Against, 0 Abstentions.

AGENDA ITEM 5: ANY OTHER BUSINESS & CLOSURE
─────────────────────────────────────────────
The Chairperson noted the gravity of the findings and commended the Internal Audit team for the timely identification and escalation of risks. He directed the Company Secretary to circulate the action plan to all Board members within 48 hours.

There being no further business, the meeting was closed at 11:55 AM.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Signed: Mr. Rafiqul Islam (Minute Taker)
Date of Circulation: 12 February ${year}
Status: Pending Approval`,
    next_meeting_date: `${year}-03-05`,
    closing_time: "11:55",
    version: "1.0",
    approval_status: "Pending Review",
    created_at: `${EMG_DATE}T13:30:00Z`,
  },
];

export const MOCK_BOARD_PACKS: BoardPack[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(i + 1),
  pack_id: `BPK-${year}-${padded(i + 1)}`,
  pack_title: `Board Pack — ${MOCK_MEETINGS[i % 12].meeting_title}`,
  related_meeting: `MTG-${year}-${padded((i % 12) + 1)}`,
  meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
  committee: GOVERNANCE_BODIES[i % 8],
  version: `V${(i % 3) + 1}`,
  document_count: String(5 + i % 8),
  review_completion: `${30 + i * 7}%`,
  publication_date: `${year}-0${(i % 9) + 1}-${String((i % 20) + 5).padStart(2, "0")}`,
  change_summary: i === 0 ? "Initial version" : "Updated with revised agenda",
  access_policy: ["Board Members Only", "Committee Members", "All Attendees"][i % 3],
  approval_status: ["Draft", "Pending Approval", "Approved", "Published", "Superseded"][i % 5],
  created_at: NOW,
  created_by: ["Company Secretary", "Governance Analyst"][i % 2],
}));

// ── Template placeholder bodies ────────────────────────────────────────────────
// Keys match the template base name (doc_name without " Template" suffix).
// Placeholders: {{DOCUMENT_TITLE}} {{MEETING_TITLE}} {{MEETING_DATE}}
//               {{GOVERNANCE_BODY}} {{CHAIRPERSON}} {{MEETING_SECRETARY}}
//               {{PREPARED_BY}} {{AGENDA_REF}} {{RESOLUTION_REF}}

export const TEMPLATE_BODIES: Record<string, string> = {
  "Board Paper":
    "<h1>{{DOCUMENT_TITLE}}</h1>" +
    "<p><strong>Governance Body:</strong> {{GOVERNANCE_BODY}}<br/>" +
    "<strong>Meeting:</strong> {{MEETING_TITLE}}, {{MEETING_DATE}}<br/>" +
    "<strong>Prepared by:</strong> {{PREPARED_BY}}</p><hr/>" +
    "<h2>1. Executive Summary</h2><p>Provide a concise summary of the paper and its recommendation.</p>" +
    "<h2>2. Background</h2><p>Describe the context, history and strategic relevance.</p>" +
    "<h2>3. Analysis</h2><p>Present the analysis, options considered and key findings.</p>" +
    "<h2>4. Recommendation</h2><p>State the recommended course of action with clear rationale.</p>" +
    "<h2>5. Resolution Required</h2>" +
    "<p><strong>RESOLVED THAT</strong> the {{GOVERNANCE_BODY}} approves [insert resolution text]. (Ref: {{RESOLUTION_REF}})</p>",

  "Agenda Paper":
    "<h1>{{DOCUMENT_TITLE}}</h1>" +
    "<p><strong>Governance Body:</strong> {{GOVERNANCE_BODY}}<br/>" +
    "<strong>Meeting:</strong> {{MEETING_TITLE}}, {{MEETING_DATE}}<br/>" +
    "<strong>Agenda Reference:</strong> {{AGENDA_REF}}</p><hr/>" +
    "<h2>Purpose</h2><p>State the purpose of this agenda item.</p>" +
    "<h2>Background</h2><p>Summarise the relevant background and prior decisions.</p>" +
    "<h2>Options Considered</h2><p>List and evaluate the options considered.</p>" +
    "<h2>Recommendation</h2><p>State the recommended option and supporting rationale.</p>",

  "Meeting Notice":
    "<h1>Notice of Meeting — {{GOVERNANCE_BODY}}</h1>" +
    "<p>Notice is hereby given that a meeting of the <strong>{{GOVERNANCE_BODY}}</strong> will be held:</p>" +
    "<p><strong>Date:</strong> {{MEETING_DATE}}<br/>" +
    "<strong>Chairperson:</strong> {{CHAIRPERSON}}</p>" +
    "<h2>Agenda</h2>" +
    "<ol><li>Opening and Apologies</li>" +
    "<li>Declarations of Interest</li>" +
    "<li>Confirmation of Minutes of Previous Meeting</li>" +
    "<li>Matters Arising</li>" +
    "<li>New Business</li>" +
    "<li>Date of Next Meeting</li>" +
    "<li>Close</li></ol>" +
    "<p>By order of the {{GOVERNANCE_BODY}},<br/><br/>{{MEETING_SECRETARY}}</p>",

  "Board Resolution":
    "<h1>Board Resolution — {{RESOLUTION_REF}}</h1>" +
    "<p><strong>Governance Body:</strong> {{GOVERNANCE_BODY}}<br/>" +
    "<strong>Meeting:</strong> {{MEETING_TITLE}}, {{MEETING_DATE}}<br/>" +
    "<strong>Chairperson:</strong> {{CHAIRPERSON}}</p><hr/>" +
    "<p>At a duly constituted meeting of the <strong>{{GOVERNANCE_BODY}}</strong> held on {{MEETING_DATE}}, " +
    "the following resolution was passed:</p>" +
    "<p><strong>RESOLVED THAT</strong> [insert resolution text].</p>" +
    "<p>The resolution was: <strong>Carried / Not Carried / Deferred</strong></p>" +
    "<p>Signed: ___________________________<br/>{{CHAIRPERSON}}, Chairperson</p>",

  "Committee Resolution":
    "<h1>Committee Resolution — {{RESOLUTION_REF}}</h1>" +
    "<p><strong>Committee:</strong> {{GOVERNANCE_BODY}}<br/>" +
    "<strong>Meeting:</strong> {{MEETING_TITLE}}, {{MEETING_DATE}}</p><hr/>" +
    "<p>At a duly constituted meeting of the <strong>{{GOVERNANCE_BODY}}</strong> held on {{MEETING_DATE}}, " +
    "the following resolution was passed:</p>" +
    "<p><strong>RESOLVED THAT</strong> [insert resolution text].</p>" +
    "<p>Signed: ___________________________<br/>{{CHAIRPERSON}}, Chairperson</p>",

  "Meeting Minutes":
    "<h1>Minutes — {{GOVERNANCE_BODY}}</h1>" +
    "<p><strong>Date:</strong> {{MEETING_DATE}}<br/>" +
    "<strong>Chairperson:</strong> {{CHAIRPERSON}}<br/>" +
    "<strong>Minute Taker:</strong> {{MEETING_SECRETARY}}</p><hr/>" +
    "<h2>1. Attendance &amp; Apologies</h2><p>Present: <br/>Apologies: </p>" +
    "<h2>2. Declarations of Interest</h2><p>No declarations were recorded.</p>" +
    "<h2>3. Confirmation of Previous Minutes</h2>" +
    "<p>The minutes of the previous meeting were confirmed as a true and accurate record.</p>" +
    "<h2>4. Matters Arising</h2><p>Matters arising from the previous minutes were noted.</p>" +
    "<h2>5. Business</h2><p>Items discussed during the meeting.</p>" +
    "<h2>6. Next Meeting</h2><p>The next meeting will be held on [date].</p>" +
    "<h2>7. Close</h2><p>The meeting was declared closed at [time].</p>",

  "Policy":
    "<h1>{{DOCUMENT_TITLE}}</h1>" +
    "<p><strong>Policy Owner:</strong> {{PREPARED_BY}}<br/>" +
    "<strong>Approved by:</strong> {{GOVERNANCE_BODY}}<br/>" +
    "<strong>Effective Date:</strong> {{MEETING_DATE}}</p><hr/>" +
    "<h2>1. Purpose</h2><p>State the purpose and objectives of this policy.</p>" +
    "<h2>2. Scope</h2><p>Define the persons, entities and activities covered.</p>" +
    "<h2>3. Policy Statement</h2><p>Set out the policy requirements in clear, unambiguous terms.</p>" +
    "<h2>4. Responsibilities</h2><p>Define roles and responsibilities for implementation and oversight.</p>" +
    "<h2>5. Monitoring &amp; Review</h2><p>Describe how compliance will be monitored and the review schedule.</p>" +
    "<h2>6. Non-compliance</h2><p>Describe the consequences of non-compliance.</p>",

  "Approval Memo":
    "<h1>Approval Memorandum</h1>" +
    "<p><strong>To:</strong> {{GOVERNANCE_BODY}}<br/>" +
    "<strong>From:</strong> {{PREPARED_BY}}<br/>" +
    "<strong>Date:</strong> {{MEETING_DATE}}<br/>" +
    "<strong>Subject:</strong> {{DOCUMENT_TITLE}}</p><hr/>" +
    "<h2>Background</h2><p>Provide the background and context for this approval request.</p>" +
    "<h2>Request</h2><p>Describe precisely what approval is being sought.</p>" +
    "<h2>Justification</h2><p>Provide the rationale and evidence supporting approval.</p>" +
    "<h2>Risk Considerations</h2><p>Identify any relevant risks and mitigations.</p>" +
    "<h2>Approval</h2>" +
    "<p>Approved by: ___________________________<br/>{{CHAIRPERSON}}<br/>Date: _______________</p>",

  "Risk Report":
    "<h1>{{DOCUMENT_TITLE}}</h1>" +
    "<p><strong>Prepared for:</strong> {{GOVERNANCE_BODY}}<br/>" +
    "<strong>Meeting:</strong> {{MEETING_TITLE}}, {{MEETING_DATE}}<br/>" +
    "<strong>Prepared by:</strong> {{PREPARED_BY}}</p><hr/>" +
    "<h2>1. Executive Summary</h2><p>Summarise the overall risk profile and key changes since the last report.</p>" +
    "<h2>2. Risk Universe</h2><p>Describe the risk categories under review.</p>" +
    "<h2>3. Top Risks</h2><p>List the top risks with inherent rating, controls and residual rating.</p>" +
    "<h2>4. Emerging Risks</h2><p>Identify risks on the horizon that require monitoring.</p>" +
    "<h2>5. Conclusion</h2><p>Provide an overall risk assessment conclusion and outlook.</p>",

  "Audit Report":
    "<h1>{{DOCUMENT_TITLE}}</h1>" +
    "<p><strong>Prepared for:</strong> {{GOVERNANCE_BODY}}<br/>" +
    "<strong>Meeting:</strong> {{MEETING_TITLE}}, {{MEETING_DATE}}<br/>" +
    "<strong>Prepared by:</strong> {{PREPARED_BY}}</p><hr/>" +
    "<h2>1. Scope &amp; Objectives</h2><p>Define the scope and objectives of this audit engagement.</p>" +
    "<h2>2. Executive Summary</h2><p>Provide the overall audit opinion and key findings.</p>" +
    "<h2>3. Findings</h2><p>Document audit findings in order of priority (High / Medium / Low).</p>" +
    "<h2>4. Recommendations</h2><p>State the recommended remediation actions with agreed timelines.</p>" +
    "<h2>5. Management Response</h2><p>Summarise management responses to each finding.</p>" +
    "<h2>6. Conclusion</h2><p>Provide the final audit opinion and next review date.</p>",
};

const TEMPLATE_DEFS = [
  { name: "Board Paper",          type: "Board Paper"  },
  { name: "Agenda Paper",         type: "Agenda Paper" },
  { name: "Meeting Notice",       type: "Meeting Notice" },
  { name: "Board Resolution",     type: "Resolution"   },
  { name: "Committee Resolution", type: "Resolution"   },
  { name: "Meeting Minutes",      type: "Minutes"      },
  { name: "Policy",               type: "Policy"       },
  { name: "Approval Memo",        type: "Memorandum"   },
  { name: "Risk Report",          type: "Report"       },
  { name: "Audit Report",         type: "Report"       },
] as const;

const DOC_CONTENT_BODIES: Record<number, string> = {
  // Annual Budget 2026-27
  0: `EXECUTIVE SUMMARY

The Annual Budget for the financial year 2026-27 projects total revenue of ৳4,820 crore, representing a 12.4% increase over the prior year's actuals. Operating expenditure is budgeted at ৳3,640 crore, yielding a projected net profit before tax of ৳1,180 crore.

KEY ASSUMPTIONS
• GDP growth rate: 6.8% (Bangladesh Bureau of Statistics forecast)
• Average lending rate: 9.25% (blended portfolio)
• Non-performing loan (NPL) ratio target: below 3.5%
• Staff cost inflation: 8% year-on-year
• New branch rollout: 12 branches in Q2–Q3 FY2026-27

REVENUE PROJECTIONS
Interest income is forecast at ৳3,950 crore, driven by loan book growth of 14% and improved recovery on non-performing accounts. Non-interest income — comprising fees, commissions, and foreign exchange — is projected at ৳870 crore, up 9% from FY2025-26.

CAPITAL EXPENDITURE
Total capex is approved at ৳320 crore, allocated as follows:
  • IT infrastructure modernisation: ৳140 crore
  • Branch network expansion: ৳95 crore
  • ATM and digital channel upgrades: ৳55 crore
  • Head office renovation: ৳30 crore

RISK CONSIDERATIONS
The budget is subject to revision should the policy rate change by more than 50 basis points or if NPL deterioration exceeds the 3.5% threshold. A ৳75 crore contingency reserve has been earmarked within the operating budget.

RECOMMENDATION
The Board is requested to approve the Annual Budget 2026-27 as presented, and to authorise management to execute within the approved parameters.`,

  // Board Remuneration Policy
  9: `BOARD REMUNERATION POLICY
Version 3.0 — Effective Q3 2026

1. PURPOSE
This policy establishes the framework for determining and disclosing the remuneration of non-executive directors (NEDs) of the Company. It is designed to attract, retain, and motivate high-calibre individuals while ensuring alignment with shareholder interests and regulatory requirements.

2. SCOPE
This policy applies to all non-executive directors, including the Chairperson, independent directors, and members of Board committees. Executive directors are covered under a separate Executive Remuneration Policy.

3. REMUNERATION COMPONENTS

3.1 Base Retainer
The annual base retainer for each NED is set at ৳18,00,000 per annum, payable quarterly in arrears. The Chairperson receives a retainer of ৳30,00,000 per annum in recognition of additional responsibilities.

3.2 Committee Fees
  • Committee Chair (per committee): ৳6,00,000 per annum
  • Committee Member (per committee): ৳3,60,000 per annum
  • Maximum committee participation fee: capped at two committees per director

3.3 Meeting Attendance Fee
A per-meeting attendance fee of ৳25,000 applies to Board meetings attended in person. Virtual attendance is remunerated at ৳15,000 per meeting.

3.4 Expense Reimbursement
Reasonable travel, accommodation, and related expenses incurred in the performance of Board duties are reimbursed in full, subject to the Company's Expense Policy.

4. BENCHMARKING
Remuneration is reviewed annually against a peer group of 8 comparable financial institutions in Bangladesh. The target positioning is at the 60th percentile of the peer group.

5. PROPOSED ADJUSTMENTS — Q3 2026
Following the annual benchmarking review, the Nomination & Remuneration Committee recommends:
  (a) An increase in the base retainer from ৳15,00,000 to ৳18,00,000 (20% increase)
  (b) Introduction of the Committee Chair differential fee
  (c) Alignment of virtual meeting fees with market practice

6. APPROVAL
This policy requires Board approval and will be disclosed in the Annual Report.`,
};

export const MOCK_DOCUMENTS: BoardDocument[] = [
  ...Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    doc_id: `DOC-${year}-${padded(i + 1)}`,
    doc_name: [
      "Annual Budget 2026-27",
      "Risk Management Framework v3",
      "IT Security Policy",
      "HR Policy Amendment",
      "Compliance Report Q1",
      "Audit Committee Charter",
      "Strategic Plan 2026-2030",
      "Capital Adequacy Report",
      "Anti-Money Laundering Policy",
      "Board Remuneration Policy",
    ][i % 10],
    doc_number: `DOC-REF-${2000 + i}`,
    doc_type: DOCUMENT_TYPES[i % 11],
    related_meeting: `MTG-${year}-${padded((i % 12) + 1)}`,
    related_agenda: `AGD-${year}-${padded((i % 20) + 1)}`,
    owner: ["CFO", "CRO", "Company Secretary", "Head of Compliance", "Head of IT"][i % 5],
    version: `${(i % 3) + 1}.0`,
    confidentiality: CONFIDENTIALITY_LEVELS[i % 4],
    effective_date: `${year}-0${(i % 9) + 1}-01`,
    expiry_date: `${year + 1}-0${(i % 9) + 1}-01`,
    acknowledgement_required: ["Yes", "No"][i % 2],
    approval_status: ["Draft", "Under Review", "Approved", "Published", "Archived"][i % 5],
    created_at: NOW,
    content_body: DOC_CONTENT_BODIES[i % 10],
  })),
  // ── Document templates ──────────────────────────────────────────────────────
  ...TEMPLATE_DEFS.map((t, i) => ({
    id: `tmpl-${i + 1}`,
    doc_id: `TMPL-${padded(i + 1)}`,
    doc_name: `${t.name} Template`,
    doc_number: `TMPL-REF-${padded(i + 1)}`,
    doc_type: t.type,
    related_meeting: "",
    related_agenda: "",
    owner: "Company Secretary",
    version: "1.0",
    confidentiality: "Internal",
    effective_date: "",
    expiry_date: "",
    acknowledgement_required: "No" as string,
    approval_status: "Approved",
    created_at: NOW,
    content_type: "editor" as const,
    is_template: true,
  })),
];

export const MOCK_MATTERS_ARISING: MatterArising[] = Array.from({ length: 15 }, (_, i) => ({
  id: String(i + 1),
  matter_id: `MAT-${year}-${padded(i + 1)}`,
  matter_title: [
    "Follow up on budget implementation report",
    "Update to risk register pending",
    "Policy circulation overdue",
    "Regulatory filing deadline approaching",
    "Branch opening checklist incomplete",
    "Auditor onboarding delayed",
    "Loan procedure update pending",
    "Strategic plan document outstanding",
  ][i % 8],
  source_meeting: `MTG-${year}-${padded((i % 12) + 1)}`,
  source_agenda: `AGD-${year}-${padded((i % 20) + 1)}`,
  source_decision: `DEC-${year}-${padded((i % 20) + 1)}`,
  owner: ["Company Secretary", "CFO", "CRO", "Head of IT", "HR Manager"][i % 5],
  due_date: `${year}-${String((i % 9) + 3).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}`,
  current_status: ["Open", "In Progress", "Overdue", "Carried Forward"][i % 4],
  progress: `${i * 10 % 80}%`,
  delay_reason: i % 3 === 2 ? "Awaiting external data" : "",
  next_review_date: `${year}-${String((i % 9) + 4).padStart(2, "0")}-01`,
  target_meeting: `MTG-${year}-${padded((i % 12) + 3)}`,
  created_at: NOW,
}));

// ─── Participant / RSVP / Conflict / Attendance / Vote interfaces ─────────────

export interface MeetingParticipant {
  id: string;
  participant_id: string;
  meeting_id: string;
  meeting_title: string;
  name: string;
  designation: string;
  organization: string;
  role: string;
  attendance_requirement: string;
  email: string;
  phone: string;
  rsvp_status: string;
  attendance_status: string;
  joined_at: string;
  left_at: string;
  proxy_for: string;
  conflict_declared: string;
  created_at: string;
  participant_name?: string;
}

export interface RSVPRecord {
  id: string;
  rsvp_id: string;
  meeting_id: string;
  meeting_title: string;
  participant_id: string;
  participant_name: string;
  response: string;
  response_date: string;
  decline_reason: string;
  proxy_nominee: string;
  notes: string;
  created_at: string;
  meeting_date?: string;
}

export interface ConflictDeclaration {
  id: string;
  conflict_id: string;
  meeting_id: string;
  meeting_title: string;
  agenda_item: string;
  declared_by: string;
  conflict_type: string;
  description: string;
  action_taken: string;
  reviewed_by: string;
  review_status: string;
  created_at: string;
}

export interface AttendanceRecord {
  id: string;
  attendance_id: string;
  meeting_id: string;
  meeting_title: string;
  participant_id: string;
  participant_name: string;
  designation: string;
  role: string;
  check_in_time: string;
  check_out_time: string;
  attendance_mode: string;
  quorum_eligible: string;
  signed: string;
  notes: string;
  created_at: string;
}

export interface VoteRecord {
  id: string;
  vote_id: string;
  meeting_id: string;
  motion_id: string;
  motion_title: string;
  voter_name: string;
  vote: string;
  vote_weight: string;
  timestamp: string;
  notes: string;
  created_at: string;
}

export interface QuorumEvent {
  id: string;
  event_id: string;
  meeting_id: string;
  meeting_title: string;
  event_type: string;
  quorum_required: string;
  quorum_present: string;
  quorum_met: string;
  recorded_at: string;
  recorded_by: string;
  notes: string;
  created_at: string;
}

// ─── Mock Data for new registries ─────────────────────────────────────────────

const EMG_PARTICIPANTS: MeetingParticipant[] = [
  { id: "emg-p1", participant_id: `PRT-${year}-0101`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", name: "Mr. Md. Nurul Amin", designation: "Chairman", organization: "Convay", role: "Chairperson", attendance_requirement: "Mandatory", email: "nurul.amin@convay.com", phone: "+880171000001", rsvp_status: "Accepted", attendance_status: "Present", joined_at: `${EMG_DATE}T09:04:00Z`, left_at: `${EMG_DATE}T11:57:00Z`, proxy_for: "", conflict_declared: "No", created_at: `${EMG_DATE}T07:00:00Z` },
  { id: "emg-p2", participant_id: `PRT-${year}-0102`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", name: "Mr. Md. Abul Bashar", designation: "Independent Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "abul.bashar@convay.com", phone: "+880171000002", rsvp_status: "Accepted", attendance_status: "Present", joined_at: `${EMG_DATE}T09:06:00Z`, left_at: `${EMG_DATE}T11:55:00Z`, proxy_for: "", conflict_declared: "No", created_at: `${EMG_DATE}T07:00:00Z` },
  { id: "emg-p3", participant_id: `PRT-${year}-0103`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", name: "Ms. Nasrin Sultana", designation: "Company Secretary", organization: "Convay", role: "Secretary", attendance_requirement: "Mandatory", email: "nasrin.sultana@convay.com", phone: "+880171000003", rsvp_status: "Accepted", attendance_status: "Present", joined_at: `${EMG_DATE}T08:50:00Z`, left_at: `${EMG_DATE}T12:00:00Z`, proxy_for: "", conflict_declared: "No", created_at: `${EMG_DATE}T07:00:00Z` },
  { id: "emg-p4", participant_id: `PRT-${year}-0104`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", name: "Mr. Rafiqul Islam", designation: "Meeting Secretary", organization: "Convay", role: "Minute Taker", attendance_requirement: "Mandatory", email: "rafiqul.islam@convay.com", phone: "+880171000004", rsvp_status: "Accepted", attendance_status: "Present", joined_at: `${EMG_DATE}T08:45:00Z`, left_at: `${EMG_DATE}T12:00:00Z`, proxy_for: "", conflict_declared: "No", created_at: `${EMG_DATE}T07:00:00Z` },
  { id: "emg-p5", participant_id: `PRT-${year}-0105`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", name: "Dr. Aminul Haque", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "aminul.haque@convay.com", phone: "+880171000005", rsvp_status: "Accepted", attendance_status: "Present", joined_at: `${EMG_DATE}T09:10:00Z`, left_at: `${EMG_DATE}T11:50:00Z`, proxy_for: "", conflict_declared: "No", created_at: `${EMG_DATE}T07:00:00Z` },
  { id: "emg-p6", participant_id: `PRT-${year}-0106`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", name: "Mr. Zahir Uddin", designation: "Head of Internal Audit", organization: "Convay", role: "Presenter", attendance_requirement: "Required", email: "zahir.uddin@convay.com", phone: "+880171000006", rsvp_status: "Accepted", attendance_status: "Present", joined_at: `${EMG_DATE}T09:02:00Z`, left_at: `${EMG_DATE}T10:30:00Z`, proxy_for: "", conflict_declared: "No", created_at: `${EMG_DATE}T07:00:00Z` },
  { id: "emg-p7", participant_id: `PRT-${year}-0107`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", name: "Mr. Kamal Hossain", designation: "CFO", organization: "Convay", role: "Presenter", attendance_requirement: "Required", email: "kamal.hossain@convay.com", phone: "+880171000007", rsvp_status: "Accepted", attendance_status: "Present", joined_at: `${EMG_DATE}T10:35:00Z`, left_at: `${EMG_DATE}T11:55:00Z`, proxy_for: "", conflict_declared: "No", created_at: `${EMG_DATE}T07:00:00Z` },
  { id: "emg-p8", participant_id: `PRT-${year}-0108`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", name: "Ms. Fatema Begum", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "fatema.begum@convay.com", phone: "+880171000008", rsvp_status: "Accepted", attendance_status: "Arrived Late", joined_at: `${EMG_DATE}T09:28:00Z`, left_at: `${EMG_DATE}T11:55:00Z`, proxy_for: "", conflict_declared: "No", created_at: `${EMG_DATE}T07:00:00Z` },
];

// ─── Participants for Dashboard Live Meetings ─────────────────────────────────

const DASHBOARD_PARTICIPANTS: MeetingParticipant[] = [
  // ── Special Board Meeting (MTG-2026-0010) ─────────────────────────────────
  { id: "sbm-p1", participant_id: `PRT-${year}-0201`, meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", name: "Mr. Abdul Awal Mintoo", designation: "Chairman", organization: "Convay", role: "Chairperson", attendance_requirement: "Mandatory", email: "awal.mintoo@convay.com", phone: "+880171000011", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 2 * 3600000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "sbm-p2", participant_id: `PRT-${year}-0202`, meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", name: "Mr. Md. Nurul Amin", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "nurul.amin@convay.com", phone: "+880171000001", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 2 * 3600000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "sbm-p3", participant_id: `PRT-${year}-0203`, meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", name: "Mr. Md. Abul Bashar", designation: "Independent Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "abul.bashar@convay.com", phone: "+880171000002", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 2 * 3600000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "sbm-p4", participant_id: `PRT-${year}-0204`, meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", name: "Dr. Aminul Haque", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "aminul.haque@convay.com", phone: "+880171000005", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 2 * 3600000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "sbm-p5", participant_id: `PRT-${year}-0205`, meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", name: "Ms. Fatema Begum", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "fatema.begum@convay.com", phone: "+880171000008", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 2 * 3600000 + 900000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "sbm-p6", participant_id: `PRT-${year}-0206`, meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", name: "Mr. Shahadat Hossain", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "shahadat.hossain@convay.com", phone: "+880171000021", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 2 * 3600000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "sbm-p7", participant_id: `PRT-${year}-0207`, meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", name: "Ms. Nasrin Sultana", designation: "Company Secretary", organization: "Convay", role: "Secretary", attendance_requirement: "Mandatory", email: "nasrin.sultana@convay.com", phone: "+880171000003", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 2 * 3600000 - 1800000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "sbm-p8", participant_id: `PRT-${year}-0208`, meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", name: "Mr. Rafiqul Islam", designation: "Meeting Secretary", organization: "Convay", role: "Minute Taker", attendance_requirement: "Mandatory", email: "rafiqul.islam@convay.com", phone: "+880171000004", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 2 * 3600000 - 900000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "sbm-p9", participant_id: `PRT-${year}-0209`, meeting_id: `MTG-${year}-0010`, meeting_title: "Special Board Meeting", name: "Mr. Kamal Hossain", designation: "CFO", organization: "Convay", role: "Presenter", attendance_requirement: "Required", email: "kamal.hossain@convay.com", phone: "+880171000007", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 2 * 3600000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  // ── 344th Board of Directors Meeting — Q3 Session (MTG-2026-0013) ────────
  { id: "bod13-p1",  participant_id: `PRT-${year}-0301`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Mr. Abdul Awal Mintoo", designation: "Chairman", organization: "Convay", role: "Chairperson", attendance_requirement: "Mandatory", email: "awal.mintoo@convay.com", phone: "+880171000011", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 90 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p2",  participant_id: `PRT-${year}-0302`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Mr. Md. Nurul Amin", designation: "Independent Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "nurul.amin@convay.com", phone: "+880171000001", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 88 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p3",  participant_id: `PRT-${year}-0303`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Mr. Md. Abul Bashar", designation: "Independent Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "abul.bashar@convay.com", phone: "+880171000002", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 87 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p4",  participant_id: `PRT-${year}-0304`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Dr. Aminul Haque", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "aminul.haque@convay.com", phone: "+880171000005", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 85 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p5",  participant_id: `PRT-${year}-0305`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Ms. Fatema Begum", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "fatema.begum@convay.com", phone: "+880171000008", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 86 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p6",  participant_id: `PRT-${year}-0306`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Mr. Shahadat Hossain", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "shahadat.hossain@convay.com", phone: "+880171000021", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 89 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p7",  participant_id: `PRT-${year}-0307`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Mr. Ariful Islam", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "ariful.islam@convay.com", phone: "+880171000022", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 84 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p8",  participant_id: `PRT-${year}-0308`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Mr. Wahidur Rahman", designation: "Independent Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "wahidur.rahman@convay.com", phone: "+880171000023", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 83 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p9",  participant_id: `PRT-${year}-0309`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Ms. Nasrin Sultana", designation: "Company Secretary", organization: "Convay", role: "Secretary", attendance_requirement: "Mandatory", email: "nasrin.sultana@convay.com", phone: "+880171000003", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 100 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p10", participant_id: `PRT-${year}-0310`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Mr. Rafiqul Islam", designation: "Meeting Secretary", organization: "Convay", role: "Minute Taker", attendance_requirement: "Mandatory", email: "rafiqul.islam@convay.com", phone: "+880171000004", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 105 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p11", participant_id: `PRT-${year}-0311`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Mr. Kamal Hossain", designation: "Chief Financial Officer", organization: "Convay", role: "Presenter", attendance_requirement: "Required", email: "kamal.hossain@convay.com", phone: "+880171000007", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 82 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  { id: "bod13-p12", participant_id: `PRT-${year}-0312`, meeting_id: `MTG-${year}-0013`, meeting_title: "344th Board of Directors Meeting — Q3 Session", name: "Mr. Imran Hossain", designation: "Head of Compliance", organization: "Convay", role: "Presenter", attendance_requirement: "Required", email: "imran.hossain@convay.com", phone: "+880171000006", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 80 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 2 * 86400000).toISOString() },
  // ── 57th Audit Committee Meeting (MTG-2026-0014) ─────────────────────────
  { id: "aud14-p1", participant_id: `PRT-${year}-0401`, meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", name: "Mr. Md. Abul Bashar", designation: "Audit Committee Chairman", organization: "Convay", role: "Chairperson", attendance_requirement: "Mandatory", email: "abul.bashar@convay.com", phone: "+880171000002", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 50 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "aud14-p2", participant_id: `PRT-${year}-0402`, meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", name: "Dr. Aminul Haque", designation: "Independent Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "aminul.haque@convay.com", phone: "+880171000005", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 48 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "aud14-p3", participant_id: `PRT-${year}-0403`, meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", name: "Ms. Fatema Begum", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "fatema.begum@convay.com", phone: "+880171000008", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 47 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "aud14-p4", participant_id: `PRT-${year}-0404`, meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", name: "Ms. Nasrin Sultana", designation: "Company Secretary", organization: "Convay", role: "Secretary", attendance_requirement: "Mandatory", email: "nasrin.sultana@convay.com", phone: "+880171000003", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 65 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "aud14-p5", participant_id: `PRT-${year}-0405`, meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", name: "Mr. Rafiqul Islam", designation: "Meeting Secretary", organization: "Convay", role: "Minute Taker", attendance_requirement: "Mandatory", email: "rafiqul.islam@convay.com", phone: "+880171000004", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 68 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "aud14-p6", participant_id: `PRT-${year}-0406`, meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", name: "Mr. Zahir Uddin", designation: "Head of Internal Audit", organization: "Convay", role: "Presenter", attendance_requirement: "Required", email: "zahir.uddin@convay.com", phone: "+880171000006", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 55 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "aud14-p7", participant_id: `PRT-${year}-0407`, meeting_id: `MTG-${year}-0014`, meeting_title: "57th Audit Committee Meeting", name: "Mr. Kamal Hossain", designation: "Chief Financial Officer", organization: "Convay", role: "Invitee", attendance_requirement: "Optional", email: "kamal.hossain@convay.com", phone: "+880171000007", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 45 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  // ── 43rd Risk Management Committee Meeting (MTG-2026-0015) ───────────────
  { id: "rmc15-p1", participant_id: `PRT-${year}-0501`, meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", name: "Mr. Md. Nurul Amin", designation: "RMC Chairman", organization: "Convay", role: "Chairperson", attendance_requirement: "Mandatory", email: "nurul.amin@convay.com", phone: "+880171000001", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 20 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "rmc15-p2", participant_id: `PRT-${year}-0502`, meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", name: "Dr. Aminul Haque", designation: "Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "aminul.haque@convay.com", phone: "+880171000005", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 18 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "rmc15-p3", participant_id: `PRT-${year}-0503`, meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", name: "Mr. Md. Abul Bashar", designation: "Independent Director", organization: "Convay", role: "Committee Member", attendance_requirement: "Mandatory", email: "abul.bashar@convay.com", phone: "+880171000002", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 17 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "rmc15-p4", participant_id: `PRT-${year}-0504`, meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", name: "Mr. Kamal Hossain", designation: "Chief Financial Officer", organization: "Convay", role: "Secretary", attendance_requirement: "Mandatory", email: "kamal.hossain@convay.com", phone: "+880171000007", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 30 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "rmc15-p5", participant_id: `PRT-${year}-0505`, meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", name: "Mr. Rafiqul Islam", designation: "Meeting Secretary", organization: "Convay", role: "Minute Taker", attendance_requirement: "Mandatory", email: "rafiqul.islam@convay.com", phone: "+880171000004", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 35 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "rmc15-p6", participant_id: `PRT-${year}-0506`, meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", name: "Mr. Reza Ahmed", designation: "Chief Risk Officer", organization: "Convay", role: "Presenter", attendance_requirement: "Required", email: "reza.ahmed@convay.com", phone: "+880171000024", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 25 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
  { id: "rmc15-p7", participant_id: `PRT-${year}-0507`, meeting_id: `MTG-${year}-0015`, meeting_title: "43rd Risk Management Committee Meeting", name: "Ms. Tahmina Khanam", designation: "Senior Risk Analyst", organization: "Convay", role: "Observer", attendance_requirement: "Optional", email: "tahmina.khanam@convay.com", phone: "+880171000025", rsvp_status: "Accepted", attendance_status: "Present", joined_at: new Date(Date.now() - 22 * 60000).toISOString(), left_at: "", proxy_for: "", conflict_declared: "No", created_at: new Date(Date.now() - 86400000).toISOString() },
];

export const MOCK_PARTICIPANTS: MeetingParticipant[] = [...DASHBOARD_PARTICIPANTS, ...Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  participant_id: `PRT-${year}-${padded(i + 1)}`,
  meeting_id: `MTG-${year}-${padded((i % 12) + 1)}`,
  meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
  name: [
    "Mr. Abdul Awal Mintoo", "Mr. Md. Nurul Amin", "Mr. Md. Abul Bashar",
    "Ms. Nasrin Sultana", "Mr. Kamal Hossain", "Mr. Imran Hossain",
    "Ms. Fatema Begum", "Mr. Rafiqul Islam", "Dr. Aminul Haque", "Mr. Zahir Uddin",
  ][i % 10],
  designation: DESIGNATIONS[i % 13],
  organization: "Convay",
  role: MEETING_ROLES[i % 7],
  attendance_requirement: ATTENDANCE_REQUIREMENTS[i % 3],
  email: `member${i + 1}@nccbank.com.bd`,
  phone: `+8801${String(700000000 + i)}`,
  rsvp_status: ["Pending", "Accepted", "Declined", "Tentative"][i % 4],
  attendance_status: ["Present", "Absent", "By Proxy", "Arrived Late"][i % 4],
  joined_at: `09:${String(5 + i * 3).padStart(2, "0")}`,
  left_at: "",
  proxy_for: "",
  conflict_declared: i % 5 === 0 ? "Yes" : "No",
  created_at: NOW,
})), ...EMG_PARTICIPANTS];

export const MOCK_RSVP_RECORDS: RSVPRecord[] = Array.from({ length: 15 }, (_, i) => ({
  id: String(i + 1),
  rsvp_id: `RSV-${year}-${padded(i + 1)}`,
  meeting_id: `MTG-${year}-${padded((i % 12) + 1)}`,
  meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
  participant_id: `PRT-${year}-${padded(i + 1)}`,
  participant_name: MOCK_PARTICIPANTS[i].name,
  response: ["Accepted", "Declined", "Tentative", "Pending"][i % 4],
  response_date: `${year}-0${(i % 9) + 1}-${String((i % 20) + 1).padStart(2, "0")}`,
  decline_reason: i % 4 === 1 ? "Prior commitment" : "",
  proxy_nominee: "",
  notes: "",
  created_at: NOW,
}));

export const MOCK_CONFLICT_DECLARATIONS: ConflictDeclaration[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  conflict_id: `CON-${year}-${padded(i + 1)}`,
  meeting_id: `MTG-${year}-${padded((i % 12) + 1)}`,
  meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
  agenda_item: `AGD-${year}-${padded((i % 20) + 1)}`,
  declared_by: MOCK_PARTICIPANTS[i % 10].name,
  conflict_type: ["Financial Interest", "Personal Relationship", "Competing Directorship", "Regulatory Conflict"][i % 4],
  description: "Director has a material financial interest in this agenda item.",
  action_taken: ["Recused from vote", "Abstained", "Left the room"][i % 3],
  reviewed_by: "Company Secretary",
  review_status: ["Under Review", "Confirmed", "Dismissed"][i % 3],
  created_at: NOW,
}));

export const MOCK_ATTENDANCE_RECORDS: AttendanceRecord[] = [
  ...Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    attendance_id: `ATT-${year}-${padded(i + 1)}`,
    meeting_id: `MTG-${year}-${padded((i % 12) + 1)}`,
    meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
    participant_id: `PRT-${year}-${padded(i + 1)}`,
    participant_name: MOCK_PARTICIPANTS[i % 20].name,
    designation: DESIGNATIONS[i % 13],
    role: MEETING_ROLES[i % 7],
    check_in_time: `09:${String(5 + i * 2).padStart(2, "0")}`,
    check_out_time: `12:${String(i * 3 % 60).padStart(2, "0")}`,
    attendance_mode: ["Physical", "Virtual", "Hybrid"][i % 3],
    quorum_eligible: i % 5 === 4 ? "No" : "Yes",
    signed: i % 3 === 2 ? "No" : "Yes",
    notes: "",
    created_at: NOW,
  })),
  { id: "emg-a1", attendance_id: `ATT-${year}-0101`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", participant_id: `PRT-${year}-0101`, participant_name: "Mr. Md. Nurul Amin",   designation: "Chairman",             role: "Chairperson",    check_in_time: `${EMG_DATE}T09:04:00Z`, check_out_time: `${EMG_DATE}T11:57:00Z`, attendance_mode: "Physical", quorum_eligible: "Yes", signed: "Yes", notes: "", created_at: `${EMG_DATE}T09:04:00Z` },
  { id: "emg-a2", attendance_id: `ATT-${year}-0102`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", participant_id: `PRT-${year}-0102`, participant_name: "Mr. Md. Abul Bashar",  designation: "Independent Director", role: "Committee Member", check_in_time: `${EMG_DATE}T09:06:00Z`, check_out_time: `${EMG_DATE}T11:55:00Z`, attendance_mode: "Physical", quorum_eligible: "Yes", signed: "Yes", notes: "", created_at: `${EMG_DATE}T09:06:00Z` },
  { id: "emg-a3", attendance_id: `ATT-${year}-0103`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", participant_id: `PRT-${year}-0103`, participant_name: "Ms. Nasrin Sultana",   designation: "Company Secretary",    role: "Secretary",      check_in_time: `${EMG_DATE}T08:50:00Z`, check_out_time: `${EMG_DATE}T12:00:00Z`, attendance_mode: "Physical", quorum_eligible: "Yes", signed: "Yes", notes: "", created_at: `${EMG_DATE}T08:50:00Z` },
  { id: "emg-a4", attendance_id: `ATT-${year}-0104`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", participant_id: `PRT-${year}-0104`, participant_name: "Mr. Rafiqul Islam",    designation: "Meeting Secretary",    role: "Minute Taker",   check_in_time: `${EMG_DATE}T08:45:00Z`, check_out_time: `${EMG_DATE}T12:00:00Z`, attendance_mode: "Physical", quorum_eligible: "No",  signed: "Yes", notes: "Minute taker — non-voting", created_at: `${EMG_DATE}T08:45:00Z` },
  { id: "emg-a5", attendance_id: `ATT-${year}-0105`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", participant_id: `PRT-${year}-0105`, participant_name: "Dr. Aminul Haque",     designation: "Director",             role: "Committee Member", check_in_time: `${EMG_DATE}T09:10:00Z`, check_out_time: `${EMG_DATE}T11:50:00Z`, attendance_mode: "Physical", quorum_eligible: "Yes", signed: "Yes", notes: "", created_at: `${EMG_DATE}T09:10:00Z` },
  { id: "emg-a6", attendance_id: `ATT-${year}-0106`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", participant_id: `PRT-${year}-0106`, participant_name: "Mr. Zahir Uddin",      designation: "Head of Internal Audit", role: "Presenter",   check_in_time: `${EMG_DATE}T09:02:00Z`, check_out_time: `${EMG_DATE}T10:30:00Z`, attendance_mode: "Physical", quorum_eligible: "No",  signed: "Yes", notes: "Excused after presentation", created_at: `${EMG_DATE}T09:02:00Z` },
  { id: "emg-a7", attendance_id: `ATT-${year}-0107`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", participant_id: `PRT-${year}-0107`, participant_name: "Mr. Kamal Hossain",    designation: "CFO",                  role: "Presenter",      check_in_time: `${EMG_DATE}T10:35:00Z`, check_out_time: `${EMG_DATE}T11:55:00Z`, attendance_mode: "Physical", quorum_eligible: "No",  signed: "Yes", notes: "Joined for Agenda Item 3", created_at: `${EMG_DATE}T10:35:00Z` },
  { id: "emg-a8", attendance_id: `ATT-${year}-0108`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", participant_id: `PRT-${year}-0108`, participant_name: "Ms. Fatema Begum",     designation: "Director",             role: "Committee Member", check_in_time: `${EMG_DATE}T09:28:00Z`, check_out_time: `${EMG_DATE}T11:55:00Z`, attendance_mode: "Physical", quorum_eligible: "Yes", signed: "Yes", notes: "Arrived after traffic delay", created_at: `${EMG_DATE}T09:28:00Z` },
];

export const MOCK_VOTE_RECORDS: VoteRecord[] = [
  ...Array.from({ length: 15 }, (_, i) => ({
    id: String(i + 1),
    vote_id: `VOT-${year}-${padded(i + 1)}`,
    meeting_id: `MTG-${year}-${padded((i % 12) + 1)}`,
    motion_id: `MOT-${year}-${padded((i % 10) + 1)}`,
    motion_title: ["Budget Approval Motion", "Risk Framework Motion", "Policy Amendment Motion"][i % 3],
    voter_name: MOCK_PARTICIPANTS[i % 10].name,
    vote: ["For", "Against", "Abstain"][i % 3],
    vote_weight: "1",
    timestamp: `${year}-0${(i % 9) + 1}-15T10:${String(i * 4 % 60).padStart(2, "0")}:00Z`,
    notes: "",
    created_at: NOW,
  })),
  // Votes for Motion 1 (mot-001): Accept Audit Report
  { id: "emg-v1",  vote_id: `VOT-${year}-0101`, meeting_id: EMG_MID, motion_id: "mot-001", motion_title: "Acceptance of Emergency Internal Audit Report", voter_name: "Mr. Md. Nurul Amin",   vote: "For",     vote_weight: "1", timestamp: `${EMG_DATE}T10:18:00Z`, notes: "", created_at: `${EMG_DATE}T10:18:00Z` },
  { id: "emg-v2",  vote_id: `VOT-${year}-0102`, meeting_id: EMG_MID, motion_id: "mot-001", motion_title: "Acceptance of Emergency Internal Audit Report", voter_name: "Mr. Md. Abul Bashar",  vote: "For",     vote_weight: "1", timestamp: `${EMG_DATE}T10:18:00Z`, notes: "", created_at: `${EMG_DATE}T10:18:00Z` },
  { id: "emg-v3",  vote_id: `VOT-${year}-0103`, meeting_id: EMG_MID, motion_id: "mot-001", motion_title: "Acceptance of Emergency Internal Audit Report", voter_name: "Dr. Aminul Haque",     vote: "For",     vote_weight: "1", timestamp: `${EMG_DATE}T10:18:00Z`, notes: "", created_at: `${EMG_DATE}T10:18:00Z` },
  { id: "emg-v4",  vote_id: `VOT-${year}-0104`, meeting_id: EMG_MID, motion_id: "mot-001", motion_title: "Acceptance of Emergency Internal Audit Report", voter_name: "Ms. Fatema Begum",     vote: "For",     vote_weight: "1", timestamp: `${EMG_DATE}T10:18:00Z`, notes: "", created_at: `${EMG_DATE}T10:18:00Z` },
  { id: "emg-v5",  vote_id: `VOT-${year}-0105`, meeting_id: EMG_MID, motion_id: "mot-001", motion_title: "Acceptance of Emergency Internal Audit Report", voter_name: "Ms. Nasrin Sultana",   vote: "For",     vote_weight: "1", timestamp: `${EMG_DATE}T10:19:00Z`, notes: "", created_at: `${EMG_DATE}T10:19:00Z` },
  { id: "emg-v6",  vote_id: `VOT-${year}-0106`, meeting_id: EMG_MID, motion_id: "mot-001", motion_title: "Acceptance of Emergency Internal Audit Report", voter_name: "Mr. Rafiqul Islam",    vote: "Abstain", vote_weight: "0", timestamp: `${EMG_DATE}T10:19:00Z`, notes: "Non-voting member abstained", created_at: `${EMG_DATE}T10:19:00Z` },
  // Votes for Motion 2 (mot-002): Approve Remediation Plan
  { id: "emg-v7",  vote_id: `VOT-${year}-0107`, meeting_id: EMG_MID, motion_id: "mot-002", motion_title: "Approval of Management Remediation Plan", voter_name: "Mr. Md. Nurul Amin",   vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:05:00Z`, notes: "", created_at: `${EMG_DATE}T11:05:00Z` },
  { id: "emg-v8",  vote_id: `VOT-${year}-0108`, meeting_id: EMG_MID, motion_id: "mot-002", motion_title: "Approval of Management Remediation Plan", voter_name: "Mr. Md. Abul Bashar",  vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:05:00Z`, notes: "", created_at: `${EMG_DATE}T11:05:00Z` },
  { id: "emg-v9",  vote_id: `VOT-${year}-0109`, meeting_id: EMG_MID, motion_id: "mot-002", motion_title: "Approval of Management Remediation Plan", voter_name: "Dr. Aminul Haque",     vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:05:00Z`, notes: "", created_at: `${EMG_DATE}T11:05:00Z` },
  { id: "emg-v10", vote_id: `VOT-${year}-0110`, meeting_id: EMG_MID, motion_id: "mot-002", motion_title: "Approval of Management Remediation Plan", voter_name: "Ms. Fatema Begum",     vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:06:00Z`, notes: "", created_at: `${EMG_DATE}T11:06:00Z` },
  { id: "emg-v11", vote_id: `VOT-${year}-0111`, meeting_id: EMG_MID, motion_id: "mot-002", motion_title: "Approval of Management Remediation Plan", voter_name: "Ms. Nasrin Sultana",   vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:06:00Z`, notes: "", created_at: `${EMG_DATE}T11:06:00Z` },
  { id: "emg-v12", vote_id: `VOT-${year}-0112`, meeting_id: EMG_MID, motion_id: "mot-002", motion_title: "Approval of Management Remediation Plan", voter_name: "Mr. Rafiqul Islam",    vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:06:00Z`, notes: "", created_at: `${EMG_DATE}T11:06:00Z` },
  // Votes for Motion 3 (mot-003): Resolution on Corrective Actions
  { id: "emg-v13", vote_id: `VOT-${year}-0113`, meeting_id: EMG_MID, motion_id: "mot-003", motion_title: "Resolution on Immediate Corrective Actions", voter_name: "Mr. Md. Nurul Amin",   vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:33:00Z`, notes: "", created_at: `${EMG_DATE}T11:33:00Z` },
  { id: "emg-v14", vote_id: `VOT-${year}-0114`, meeting_id: EMG_MID, motion_id: "mot-003", motion_title: "Resolution on Immediate Corrective Actions", voter_name: "Mr. Md. Abul Bashar",  vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:33:00Z`, notes: "", created_at: `${EMG_DATE}T11:33:00Z` },
  { id: "emg-v15", vote_id: `VOT-${year}-0115`, meeting_id: EMG_MID, motion_id: "mot-003", motion_title: "Resolution on Immediate Corrective Actions", voter_name: "Dr. Aminul Haque",     vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:33:00Z`, notes: "", created_at: `${EMG_DATE}T11:33:00Z` },
  { id: "emg-v16", vote_id: `VOT-${year}-0116`, meeting_id: EMG_MID, motion_id: "mot-003", motion_title: "Resolution on Immediate Corrective Actions", voter_name: "Ms. Fatema Begum",     vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:33:00Z`, notes: "", created_at: `${EMG_DATE}T11:33:00Z` },
  { id: "emg-v17", vote_id: `VOT-${year}-0117`, meeting_id: EMG_MID, motion_id: "mot-003", motion_title: "Resolution on Immediate Corrective Actions", voter_name: "Ms. Nasrin Sultana",   vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:34:00Z`, notes: "", created_at: `${EMG_DATE}T11:34:00Z` },
  { id: "emg-v18", vote_id: `VOT-${year}-0118`, meeting_id: EMG_MID, motion_id: "mot-003", motion_title: "Resolution on Immediate Corrective Actions", voter_name: "Mr. Rafiqul Islam",    vote: "For", vote_weight: "1", timestamp: `${EMG_DATE}T11:34:00Z`, notes: "", created_at: `${EMG_DATE}T11:34:00Z` },
];

export const MOCK_QUORUM_EVENTS: QuorumEvent[] = [
  ...Array.from({ length: 10 }, (_, i) => ({
    id: String(i + 1),
    event_id: `QRM-${year}-${padded(i + 1)}`,
    meeting_id: `MTG-${year}-${padded((i % 12) + 1)}`,
    meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
    event_type: ["Meeting Start", "Agenda Item", "After Break", "Vote"][i % 4],
    quorum_required: String(Math.ceil((5 + i % 4) / 2) + 1),
    quorum_present: String(5 + i % 4),
    quorum_met: i % 5 === 4 ? "No" : "Yes",
    recorded_at: `09:${String(5 + i * 5).padStart(2, "0")}`,
    recorded_by: "Company Secretary",
    notes: "",
    created_at: NOW,
  })),
  { id: "emg-q1", event_id: `QRM-${year}-0101`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", event_type: "Meeting Start",  quorum_required: "4", quorum_present: "5", quorum_met: "Yes", recorded_at: `${EMG_DATE}T09:08:00Z`, recorded_by: "Ms. Nasrin Sultana", notes: "Quorum declared at 09:08 AM. Ms. Fatema Begum not yet arrived.",        created_at: `${EMG_DATE}T09:08:00Z` },
  { id: "emg-q2", event_id: `QRM-${year}-0102`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", event_type: "After Break",    quorum_required: "4", quorum_present: "6", quorum_met: "Yes", recorded_at: `${EMG_DATE}T10:35:00Z`, recorded_by: "Ms. Nasrin Sultana", notes: "Post-break check. Ms. Fatema Begum joined. Mr. Zahir Uddin excused.", created_at: `${EMG_DATE}T10:35:00Z` },
  { id: "emg-q3", event_id: `QRM-${year}-0103`, meeting_id: EMG_MID, meeting_title: "Emergency Board Meeting", event_type: "Vote",           quorum_required: "4", quorum_present: "5", quorum_met: "Yes", recorded_at: `${EMG_DATE}T11:30:00Z`, recorded_by: "Ms. Nasrin Sultana", notes: "Quorum confirmed prior to final vote on resolution.",                 created_at: `${EMG_DATE}T11:30:00Z` },
];

// ─── Question and Note interfaces ─────────────────────────────────────────────

export interface BoardQuestion {
  id: string;
  question_id: string;
  question_text: string;
  related_meeting: string;
  agenda_item: string;
  document_ref: string;
  directed_to: string;
  asked_by: string;
  priority: string;
  visibility: string;
  written_response_required: string;
  deadline: string;
  response_text: string;
  responded_by: string;
  response_date: string;
  current_status: string;
  created_at: string;
}

export interface PrivateNote {
  id: string;
  note_id: string;
  note_title: string;
  note_content: string;
  related_meeting: string;
  agenda_item: string;
  document_ref: string;
  page_reference: string;
  tags: string;
  bookmarked: string;
  shared_with: string;
  created_by: string;
  created_at: string;
}

export interface MeetingEffectivenessReview {
  id: string;
  review_id: string;
  related_meeting: string;
  meeting_title: string;
  reviewer_name: string;
  anonymous: string;
  preparation_rating: string;
  board_pack_quality: string;
  agenda_relevance: string;
  time_management: string;
  discussion_quality: string;
  decision_clarity: string;
  technology_performance: string;
  overall_rating: string;
  comments: string;
  created_at: string;
}

// ─── Mock data for Questions, Notes, Effectiveness Reviews ────────────────────

export const MOCK_QUESTIONS: BoardQuestion[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  question_id: `QST-${year}-${padded(i + 1)}`,
  question_text: [
    "What is the basis for the proposed budget allocation increase?",
    "Has the risk assessment been independently verified?",
    "What are the implementation timelines for the new policy?",
    "Can you clarify the financial impact projections?",
    "What alternative options were considered?",
    "How does this align with our strategic objectives?",
  ][i % 6],
  related_meeting: `MTG-${year}-${padded((i % 12) + 1)}`,
  agenda_item: `AGD-${year}-${padded((i % 20) + 1)}`,
  document_ref: `DOC-${year}-${padded((i % 20) + 1)}`,
  directed_to: ["CFO", "CRO", "Head of Compliance", "MD"][i % 4],
  asked_by: ["Chairman", "Independent Director", "Board Member"][i % 3],
  priority: PRIORITIES[i % 3],
  visibility: ["All Participants", "Board Only", "Private"][i % 3],
  written_response_required: ["Yes", "No"][i % 2],
  deadline: `${year}-0${(i % 9) + 1}-${String((i % 28) + 1).padStart(2, "0")}`,
  response_text: i % 3 === 0 ? "The allocation is based on projected growth targets..." : "",
  responded_by: i % 3 === 0 ? "CFO" : "",
  response_date: i % 3 === 0 ? `${year}-0${(i % 9) + 1}-${String((i % 20) + 5).padStart(2, "0")}` : "",
  current_status: ["Open", "Assigned", "Awaiting Response", "Response Submitted", "Resolved"][i % 5],
  created_at: NOW,
}));

export const MOCK_PRIVATE_NOTES: PrivateNote[] = Array.from({ length: 10 }, (_, i) => ({
  id: String(i + 1),
  note_id: `NOTE-${year}-${padded(i + 1)}`,
  note_title: [
    "Key concerns on budget proposal",
    "Follow-up with CFO on capital allocation",
    "Risk framework review notes",
    "Outstanding policy questions",
    "Points to raise at next meeting",
  ][i % 5],
  note_content: "Personal observation: the financial projections seem optimistic given current market conditions...",
  related_meeting: `MTG-${year}-${padded((i % 12) + 1)}`,
  agenda_item: `AGD-${year}-${padded((i % 20) + 1)}`,
  document_ref: `DOC-${year}-${padded((i % 20) + 1)}`,
  page_reference: `Page ${i + 3}`,
  tags: ["Budget", "Risk", "Compliance", "Strategy"][i % 4],
  bookmarked: ["Yes", "No"][i % 2],
  shared_with: "",
  created_by: "Board Member",
  created_at: NOW,
}));

export const MOCK_EFFECTIVENESS_REVIEWS: MeetingEffectivenessReview[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  review_id: `REV-${year}-${padded(i + 1)}`,
  related_meeting: `MTG-${year}-${padded((i % 12) + 1)}`,
  meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
  reviewer_name: i % 3 === 0 ? "Anonymous" : ["Board Member A", "Board Member B", "Independent Director"][i % 3],
  anonymous: i % 3 === 0 ? "Yes" : "No",
  preparation_rating: String(3 + i % 3),
  board_pack_quality: String(3 + i % 2),
  agenda_relevance: String(4),
  time_management: String(3 + i % 2),
  discussion_quality: String(4 + i % 2),
  decision_clarity: String(4),
  technology_performance: String(4 + i % 2),
  overall_rating: String(4 + i % 2),
  comments: i % 2 === 0 ? "Well-organized meeting with clear agenda and timely decisions." : "",
  created_at: NOW,
}));

// ─── Seed data for Special Board Meeting MTG-2026-0010 ───────────────────────

export const SEED_DECISIONS_MTG_0010: Decision[] = [
  {
    id: "dec-mtg10-001", decision_id: "DEC-2026-M10-001",
    decision_title: "Confirmation of Previous Board Meeting Minutes",
    source_meeting: "MTG-2026-0010", meeting_id: "MTG-2026-0010",
    agenda_item: `AGD-${year}-0035`,
    decision_type: "Administrative", decision_owner: "Company Secretary",
    effective_date: TODAY, implementation_deadline: TODAY,
    financial_impact: "", implementation_status: "Completed",
    approval_status: "Approved", created_at: NOW,
    activity_history: [],
  },
  {
    id: "dec-mtg10-002", decision_id: "DEC-2026-M10-002",
    decision_title: "Note Q2 2026 Executive Performance — CFO to Submit Corrective Measures",
    source_meeting: "MTG-2026-0010", meeting_id: "MTG-2026-0010",
    agenda_item: `AGD-${year}-0036`,
    decision_type: "Performance Review", decision_owner: "CFO",
    effective_date: TODAY, implementation_deadline: `${year}-09-30`,
    financial_impact: "", implementation_status: "In Progress",
    approval_status: "Approved", created_at: NOW,
    activity_history: [],
  },
  {
    id: "dec-mtg10-003", decision_id: "DEC-2026-M10-003",
    decision_title: "Conditional Approval of Revised Board Remuneration Framework",
    source_meeting: "MTG-2026-0010", meeting_id: "MTG-2026-0010",
    agenda_item: `AGD-${year}-0010`,
    decision_type: "Policy Approval", decision_owner: "Chairman",
    effective_date: `${year}-07-01`, implementation_deadline: `${year}-09-15`,
    financial_impact: "৳45,000,000 annually", implementation_status: "Not Started",
    approval_status: "Conditional", created_at: NOW,
    activity_history: [],
  },
  {
    id: "dec-mtg10-004", decision_id: "DEC-2026-M10-004",
    decision_title: "Board to Receive Strategic Initiative Progress Report — Q3 Update Required",
    source_meeting: "MTG-2026-0010", meeting_id: "MTG-2026-0010",
    agenda_item: `AGD-${year}-0037`,
    decision_type: "Monitoring", decision_owner: "MD",
    effective_date: TODAY, implementation_deadline: `${year}-10-15`,
    financial_impact: "", implementation_status: "Not Started",
    approval_status: "Noted", created_at: NOW,
    activity_history: [],
  },
];

export const SEED_RESOLUTIONS_MTG_0010: Resolution[] = [
  {
    id: "res-mtg10-001", resolution_id: "RES-2026-M10-001",
    resolution_title: "Resolution to Confirm Minutes of Previous Meeting",
    resolution_type: "Ordinary",
    source_meeting: "MTG-2026-0010", meeting_id: "MTG-2026-0010",
    source_decision: "dec-mtg10-001",
    resolution_text: "The Board hereby resolves to confirm the minutes of the previous Board meeting held on 15 June 2026 as a true and accurate record.",
    proposed_by: "Ms. Nasrin Sultana", seconded_by: "Mr. Md. Nurul Amin",
    vote_result: "Passed Unanimously", votes_for: "7", votes_against: "0", abstentions: "0",
    effective_date: TODAY, approval_status: "Adopted", created_at: NOW,
  },
  {
    id: "res-mtg10-002", resolution_id: "RES-2026-M10-002",
    resolution_title: "Special Resolution — Revised Board Remuneration Framework",
    resolution_type: "Special",
    source_meeting: "MTG-2026-0010", meeting_id: "MTG-2026-0010",
    source_decision: "dec-mtg10-003",
    resolution_text: "The Board hereby conditionally resolves to approve the Revised Board Remuneration Framework effective 1 July 2026, subject to receipt of the independent benchmarking confirmation letter from Willis Towers Watson within 30 days of this meeting.",
    proposed_by: "Ms. Nasrin Sultana", seconded_by: "Mr. Abdul Awal Mintoo",
    vote_result: "Passed", votes_for: "5", votes_against: "1", abstentions: "1",
    effective_date: `${year}-07-01`, approval_status: "Pending Signature", created_at: NOW,
  },
];

export const SEED_ACTIONS_MTG_0010: ActionItem[] = [
  {
    id: "act-mtg10-001", action_id: "ACT-2026-M10-001",
    action_title: "Obtain & Circulate Willis Towers Watson Benchmarking Confirmation Letter",
    source_meeting: "MTG-2026-0010", meeting_id: "MTG-2026-0010",
    source_decision: "dec-mtg10-003",
    assigned_to: "Company Secretary", priority: "High",
    due_date: `${year}-09-15`, completion_date: "", progress: "0",
    implementation_status: "Not Started", approval_status: "Open",
    action_status: "Open", created_at: NOW, activity_history: [],
  },
  {
    id: "act-mtg10-002", action_id: "ACT-2026-M10-002",
    action_title: "Prepare & Distribute Q2 Variance Report to All Board Members",
    source_meeting: "MTG-2026-0010", meeting_id: "MTG-2026-0010",
    source_decision: "dec-mtg10-002",
    assigned_to: "CFO", priority: "High",
    due_date: `${year}-08-25`, completion_date: "", progress: "30",
    implementation_status: "In Progress", approval_status: "Open",
    action_status: "Open", created_at: NOW, activity_history: [],
  },
  {
    id: "act-mtg10-003", action_id: "ACT-2026-M10-003",
    action_title: "Submit Q3 Strategic Initiative Progress Update to Board Secretariat",
    source_meeting: "MTG-2026-0010", meeting_id: "MTG-2026-0010",
    source_decision: "dec-mtg10-004",
    assigned_to: "MD", priority: "Medium",
    due_date: `${year}-10-15`, completion_date: "", progress: "0",
    implementation_status: "Not Started", approval_status: "Open",
    action_status: "Open", created_at: NOW, activity_history: [],
  },
  {
    id: "act-mtg10-004", action_id: "ACT-2026-M10-004",
    action_title: "Circulate Signed Minutes of Special Board Meeting to All Members",
    source_meeting: "MTG-2026-0010", meeting_id: "MTG-2026-0010",
    source_decision: "dec-mtg10-001",
    assigned_to: "Company Secretary", priority: "Medium",
    due_date: `${year}-08-25`, completion_date: "", progress: "0",
    implementation_status: "Not Started", approval_status: "Open",
    action_status: "Open", created_at: NOW, activity_history: [],
  },
];

// ─── Decisions, Resolutions & Actions — 344th Board Meeting (MTG-2026-0013) ──

export const SEED_DECISIONS_MTG_0013: Decision[] = [
  { id: "dec-mtg13-001", decision_id: "DEC-2026-M13-001", decision_title: "Approval of Q3 Capital Expenditure — IT Infrastructure & Digital Platform", source_meeting: `MTG-${year}-0013`, meeting_id: `MTG-${year}-0013`, agenda_item: `AGD-${year}-0024`, decision_type: "Capital Approval", decision_owner: "CFO", decided_by: "Mr. Abdul Awal Mintoo", effective_date: TODAY, implementation_deadline: `${year}-12-31`, financial_impact: "৳32,000,000", implementation_status: "Not Started", approval_status: "Approved", created_at: NOW, activity_history: [] },
  { id: "dec-mtg13-002", decision_id: "DEC-2026-M13-002", decision_title: "Approval of Q3 Capital Expenditure — Branch Network Expansion (3 branches)", source_meeting: `MTG-${year}-0013`, meeting_id: `MTG-${year}-0013`, agenda_item: `AGD-${year}-0024`, decision_type: "Capital Approval", decision_owner: "MD", decided_by: "Mr. Abdul Awal Mintoo", effective_date: TODAY, implementation_deadline: `${year}-12-31`, financial_impact: "৳18,000,000", implementation_status: "In Progress", approval_status: "Approved", created_at: NOW, activity_history: [] },
  { id: "dec-mtg13-003", decision_id: "DEC-2026-M13-003", decision_title: "Board Notes Q2 Financial Results — CFO to Implement NPL Recovery Programme", source_meeting: `MTG-${year}-0013`, meeting_id: `MTG-${year}-0013`, agenda_item: `AGD-${year}-0023`, decision_type: "Performance Review", decision_owner: "CFO", decided_by: "Mr. Abdul Awal Mintoo", effective_date: TODAY, implementation_deadline: `${year}-12-31`, financial_impact: "", implementation_status: "In Progress", approval_status: "Noted", created_at: NOW, activity_history: [] },
  { id: "dec-mtg13-004", decision_id: "DEC-2026-M13-004", decision_title: "AML Training Completion — All Staff to Complete by 31 August 2026", source_meeting: `MTG-${year}-0013`, meeting_id: `MTG-${year}-0013`, agenda_item: `AGD-${year}-0025`, decision_type: "Directive", decision_owner: "Head of Compliance", decided_by: "Mr. Abdul Awal Mintoo", effective_date: TODAY, implementation_deadline: `${year}-08-31`, financial_impact: "", implementation_status: "In Progress", approval_status: "Approved", created_at: NOW, activity_history: [] },
];

export const SEED_ACTIONS_MTG_0013: ActionItem[] = [
  { id: "act-mtg13-001", action_id: "ACT-2026-M13-001", action_title: "Commence IT Infrastructure Phase 2 Upgrade — Core Banking", source_meeting: `MTG-${year}-0013`, meeting_id: `MTG-${year}-0013`, source_decision: "dec-mtg13-001", assigned_to: "Head of IT", priority: "High", due_date: `${year}-12-31`, completion_date: "", progress: "5", implementation_status: "In Progress", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
  { id: "act-mtg13-002", action_id: "ACT-2026-M13-002", action_title: "Activate Branch Opening Programme — Sylhet, Khulna, Rajshahi", source_meeting: `MTG-${year}-0013`, meeting_id: `MTG-${year}-0013`, source_decision: "dec-mtg13-002", assigned_to: "MD", priority: "High", due_date: `${year}-12-31`, completion_date: "", progress: "40", implementation_status: "In Progress", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
  { id: "act-mtg13-003", action_id: "ACT-2026-M13-003", action_title: "Implement Monthly NPL Recovery Progress Reports to Board", source_meeting: `MTG-${year}-0013`, meeting_id: `MTG-${year}-0013`, source_decision: "dec-mtg13-003", assigned_to: "Company Secretary", priority: "Medium", due_date: `${year}-09-01`, completion_date: "", progress: "0", implementation_status: "Not Started", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
  { id: "act-mtg13-004", action_id: "ACT-2026-M13-004", action_title: "Ensure 100% AML Training Completion by 31 August 2026", source_meeting: `MTG-${year}-0013`, meeting_id: `MTG-${year}-0013`, source_decision: "dec-mtg13-004", assigned_to: "Head of Compliance", priority: "High", due_date: `${year}-08-31`, completion_date: "", progress: "91", implementation_status: "In Progress", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
];

// ─── Decisions & Actions — 57th Audit Committee Meeting (MTG-2026-0014) ──────

export const SEED_DECISIONS_MTG_0014: Decision[] = [
  { id: "dec-mtg14-001", decision_id: "DEC-2026-M14-001", decision_title: "Accept Q2 Internal Audit Report — Management to Remediate All Critical & High Findings", source_meeting: `MTG-${year}-0014`, meeting_id: `MTG-${year}-0014`, agenda_item: `AGD-${year}-0026`, decision_type: "Board Resolution", decision_owner: "Head of Internal Audit", decided_by: "Mr. Md. Abul Bashar", effective_date: TODAY, implementation_deadline: `${year}-09-30`, financial_impact: "", implementation_status: "In Progress", approval_status: "Approved", created_at: NOW, activity_history: [] },
  { id: "dec-mtg14-002", decision_id: "DEC-2026-M14-002", decision_title: "Quarterly Privileged Access Certification to be Standing KRI at Every Audit Committee Meeting", source_meeting: `MTG-${year}-0014`, meeting_id: `MTG-${year}-0014`, agenda_item: `AGD-${year}-0026`, decision_type: "Policy Approval", decision_owner: "Head of IT", decided_by: "Mr. Md. Abul Bashar", effective_date: TODAY, implementation_deadline: `${year}-09-30`, financial_impact: "", implementation_status: "Not Started", approval_status: "Approved", created_at: NOW, activity_history: [] },
  { id: "dec-mtg14-003", decision_id: "DEC-2026-M14-003", decision_title: "Note External Audit Interim Progress — No Material Issues", source_meeting: `MTG-${year}-0014`, meeting_id: `MTG-${year}-0014`, agenda_item: `AGD-${year}-0027`, decision_type: "Administrative", decision_owner: "Company Secretary", decided_by: "Mr. Md. Abul Bashar", effective_date: TODAY, implementation_deadline: TODAY, financial_impact: "", implementation_status: "Completed", approval_status: "Noted", created_at: NOW, activity_history: [] },
];

export const SEED_ACTIONS_MTG_0014: ActionItem[] = [
  { id: "act-mtg14-001", action_id: "ACT-2026-M14-001", action_title: "Remediate Critical Finding: Cash Advance Dual-Authorisation System Control", source_meeting: `MTG-${year}-0014`, meeting_id: `MTG-${year}-0014`, source_decision: "dec-mtg14-001", assigned_to: "Head of Operations", priority: "High", due_date: `${year}-08-31`, completion_date: "", progress: "50", implementation_status: "In Progress", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
  { id: "act-mtg14-002", action_id: "ACT-2026-M14-002", action_title: "Complete Privileged Access Review & Deactivate All Overdue Accounts", source_meeting: `MTG-${year}-0014`, meeting_id: `MTG-${year}-0014`, source_decision: "dec-mtg14-001", assigned_to: "Head of IT", priority: "High", due_date: `${year}-08-15`, completion_date: "", progress: "70", implementation_status: "In Progress", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
  { id: "act-mtg14-003", action_id: "ACT-2026-M14-003", action_title: "Add Quarterly Privileged Access Certification as Standing KRI in AC Reporting Pack", source_meeting: `MTG-${year}-0014`, meeting_id: `MTG-${year}-0014`, source_decision: "dec-mtg14-002", assigned_to: "Company Secretary", priority: "Medium", due_date: `${year}-09-30`, completion_date: "", progress: "0", implementation_status: "Not Started", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
  { id: "act-mtg14-004", action_id: "ACT-2026-M14-004", action_title: "Resolve AML Alert Backlog — Reduce to Below 50 Outstanding Alerts", source_meeting: `MTG-${year}-0014`, meeting_id: `MTG-${year}-0014`, source_decision: "dec-mtg14-001", assigned_to: "Head of Compliance", priority: "High", due_date: `${year}-08-31`, completion_date: "", progress: "30", implementation_status: "In Progress", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
];

// ─── Decisions & Actions — 43rd Risk Management Committee (MTG-2026-0015) ────

export const SEED_DECISIONS_MTG_0015: Decision[] = [
  { id: "dec-mtg15-001", decision_id: "DEC-2026-M15-001", decision_title: "Approve Revised Risk Appetite Statement — Market, Credit & Liquidity Thresholds", source_meeting: `MTG-${year}-0015`, meeting_id: `MTG-${year}-0015`, agenda_item: `AGD-${year}-0028`, decision_type: "Policy Approval", decision_owner: "CRO", decided_by: "Mr. Md. Nurul Amin", effective_date: TODAY, implementation_deadline: `${year}-09-30`, financial_impact: "", implementation_status: "Not Started", approval_status: "Approved", created_at: NOW, activity_history: [] },
  { id: "dec-mtg15-002", decision_id: "DEC-2026-M15-002", decision_title: "Reduce Real Estate Sector Cap from 20% to 17% — New Commercial Construction Sub-limit of 8%", source_meeting: `MTG-${year}-0015`, meeting_id: `MTG-${year}-0015`, agenda_item: `AGD-${year}-0028`, decision_type: "Policy Approval", decision_owner: "CRO", decided_by: "Mr. Md. Nurul Amin", effective_date: TODAY, implementation_deadline: `${year}-09-15`, financial_impact: "", implementation_status: "Not Started", approval_status: "Approved", created_at: NOW, activity_history: [] },
  { id: "dec-mtg15-003", decision_id: "DEC-2026-M15-003", decision_title: "Activate NPL Recovery Task Force — Monthly Progress Reporting to RMC", source_meeting: `MTG-${year}-0015`, meeting_id: `MTG-${year}-0015`, agenda_item: `AGD-${year}-0029`, decision_type: "Directive", decision_owner: "CRO", decided_by: "Mr. Md. Nurul Amin", effective_date: TODAY, implementation_deadline: `${year}-12-31`, financial_impact: "", implementation_status: "In Progress", approval_status: "Approved", created_at: NOW, activity_history: [] },
];

export const SEED_ACTIONS_MTG_0015: ActionItem[] = [
  { id: "act-mtg15-001", action_id: "ACT-2026-M15-001", action_title: "Update Risk Appetite Statement Document — Clarify Commercial Construction Sub-limit Definition", source_meeting: `MTG-${year}-0015`, meeting_id: `MTG-${year}-0015`, source_decision: "dec-mtg15-001", assigned_to: "CRO", priority: "High", due_date: `${year}-09-15`, completion_date: "", progress: "0", implementation_status: "Not Started", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
  { id: "act-mtg15-002", action_id: "ACT-2026-M15-002", action_title: "Distribute Revised RAS to All Business Unit Heads and Risk Owners", source_meeting: `MTG-${year}-0015`, meeting_id: `MTG-${year}-0015`, source_decision: "dec-mtg15-001", assigned_to: "CRO", priority: "Medium", due_date: `${year}-09-30`, completion_date: "", progress: "0", implementation_status: "Not Started", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
  { id: "act-mtg15-003", action_id: "ACT-2026-M15-003", action_title: "Implement Emergency Patching for 23 Overdue Servers — Report to Next RMC", source_meeting: `MTG-${year}-0015`, meeting_id: `MTG-${year}-0015`, source_decision: "dec-mtg15-003", assigned_to: "Head of IT", priority: "High", due_date: `${year}-08-31`, completion_date: "", progress: "0", implementation_status: "Not Started", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
  { id: "act-mtg15-004", action_id: "ACT-2026-M15-004", action_title: "Submit Monthly NPL Recovery Progress Report to RMC Secretary", source_meeting: `MTG-${year}-0015`, meeting_id: `MTG-${year}-0015`, source_decision: "dec-mtg15-003", assigned_to: "CRO", priority: "Medium", due_date: `${year}-09-05`, completion_date: "", progress: "0", implementation_status: "Not Started", approval_status: "Open", action_status: "Open", created_at: NOW, activity_history: [] },
];

// ─── Meeting-specific documents for Special Board Meeting MTG-2026-0010 ───────

export const MEETING_DOCS_MTG_0010: BoardDocument[] = [
  {
    id: "mtg10-d1", doc_id: `DOC-${year}-M10-001`, doc_name: `Minutes of Board Meeting — 15 June ${year}`,
    doc_number: `BM-MIN-${year}-06`, doc_type: "Meeting Notice", related_meeting: `MTG-${year}-0010`,
    related_agenda: `AGD-${year}-0035`, owner: "Company Secretary", version: "1.0",
    confidentiality: "Internal", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Approved", created_at: NOW,
    content_body: `MINUTES OF BOARD MEETING\nConvay Bank Limited\nDate: 15 June ${year} | Time: 10:00 AM\nVenue: Boardroom, Head Office\n\nATTENDANCE\nPresent: Mr. Abdul Awal Mintoo (Chairman), Ms. Nasrin Sultana, Mr. Md. Nurul Amin, Mr. Md. Abul Bashar, Mr. Kamal Hossain (MD & CEO), Ms. Fatema Begum (Company Secretary)\n\nQUORUM\nQuorum was declared present. 6 of 8 directors in attendance.\n\nRESOLUTIONS PASSED\n1. Annual Budget 2025-26 outturn noted and approved.\n2. Q1 performance results accepted by the Board.\n3. Compliance report noted; no material deficiencies.\n\nACTION ITEMS\n- CFO to circulate revised capital plan by 30 June.\n- Company Secretary to file regulatory returns by 10 July.\n\nMeeting adjourned at 12:45 PM.`,
  },
  {
    id: "mtg10-d2", doc_id: `DOC-${year}-M10-002`, doc_name: `Action Item Tracker — As at ${TODAY}`,
    doc_number: `BM-ACT-${year}-07`, doc_type: "Compliance Report", related_meeting: `MTG-${year}-0010`,
    related_agenda: `AGD-${year}-0035`, owner: "Company Secretary", version: "1.0",
    confidentiality: "Internal", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Published", created_at: NOW,
  },
  {
    id: "mtg10-d3", doc_id: `DOC-${year}-M10-003`, doc_name: `CEO Performance Dashboard — Q2 ${year}`,
    doc_number: `BM-PERF-${year}-Q2`, doc_type: "Audit Report", related_meeting: `MTG-${year}-0010`,
    related_agenda: `AGD-${year}-0036`, owner: "MD", version: "1.0",
    confidentiality: "Strictly Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "Yes",
    approval_status: "Under Review", created_at: NOW,
    content_body: `CEO PERFORMANCE DASHBOARD — Q2 ${year}\nConvay Bank Limited\n\nEXECUTIVE SUMMARY\nQ2 ${year} results reflect a mixed performance against the Annual Plan. Net profit of ৳142 crore was achieved against a target of ৳165 crore (86% achievement). Key variances driven by higher-than-anticipated credit provisioning and compressed NIM due to market rate changes.\n\nKEY METRICS\n• Net Interest Margin: 3.2% (target 3.6%)\n• Loan Book Growth: 8.4% YTD (target 12%)\n• NPL Ratio: 4.8% (target <4.0%) — BELOW TARGET\n• CASA Ratio: 38.2% (target 40%)\n• Capital Adequacy Ratio: 13.1% (minimum 10%) — COMPLIANT\n• Cost-to-Income Ratio: 52.3% (target 49%)\n\nDIGITAL CHANNELS\n• Mobile banking MAU: 340,000 (+22% YoY)\n• Digital transaction volume: ৳2,800 crore (+31% YoY)\n\nCORRECTIVE MEASURES PROPOSED\n1. NPL Recovery Drive — dedicated task force formed, target 0.5% reduction by Q3.\n2. NIM improvement — selective repricing of fixed-rate portfolio commencing Q3.\n3. Cost rationalisation — hiring freeze on non-critical roles; ৳8 crore savings targeted H2.`,
  },
  {
    id: "mtg10-d4", doc_id: `DOC-${year}-M10-004`, doc_name: "NRC Recommendation — Board Remuneration Review",
    doc_number: `BM-NRC-${year}-003`, doc_type: "Resolution", related_meeting: `MTG-${year}-0010`,
    related_agenda: `AGD-${year}-0010`, owner: "Company Secretary", version: "1.0",
    confidentiality: "Strictly Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Approved", created_at: NOW,
    content_body: `NRC RECOMMENDATION\nNomination & Remuneration Committee\nConvay Bank Limited\n\nSUBJECT: Revised Board Remuneration Framework — Recommendation to Full Board\n\nThe NRC, at its meeting on 5 August ${year}, reviewed the Board remuneration structure against industry benchmarks and recommends the following:\n\n1. BASE RETAINER\n   Current: ৳150,000/month per director\n   Proposed: ৳180,000/month per director (+20%)\n   Rationale: Benchmarked against top 8 listed banks; proposed rate aligns with peer median.\n\n2. COMMITTEE FEES\n   Per committee meeting: ৳25,000 (unchanged)\n   Cap: Maximum 2 committees per director (exception subject to Board approval)\n\n3. CHAIRMAN'S HONORARIUM\n   Current: ৳400,000/month\n   Proposed: ৳480,000/month (+20%)\n\n4. TRAVEL & ACCOMMODATION\n   International: Business class (journeys >4 hours)\n   Local: As per current policy — no change proposed\n\nEFFECTIVE DATE: 1 July ${year} (subject to Board approval and regulatory notification)\n\nBENCHMARKING\nWillis Towers Watson peer analysis (pending confirmation letter) supports the proposed increases. Full benchmarking report available on request.\n\nRECOMMENDATION\nThe NRC unanimously recommends that the Full Board approve the Revised Board Remuneration Framework as presented.`,
  },
  {
    id: "mtg10-d5", doc_id: `DOC-${year}-M10-005`, doc_name: `Strategic Initiative Progress Report — Q2 ${year}`,
    doc_number: `BM-STRAT-${year}-Q2`, doc_type: "Audit Report", related_meeting: `MTG-${year}-0010`,
    related_agenda: `AGD-${year}-0037`, owner: "MD", version: "1.0",
    confidentiality: "Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Published", created_at: NOW,
  },
];

export const MEETING_DOCS_MTG_0013: BoardDocument[] = [
  {
    id: "mtg13-d1", doc_id: `DOC-${year}-M13-001`, doc_name: `344th Board Meeting — Q3 Board Pack`,
    doc_number: `BM-PACK-${year}-Q3`, doc_type: "Board Pack", related_meeting: `MTG-${year}-0013`,
    related_agenda: `AGD-${year}-0021`, owner: "Company Secretary", version: "1.0",
    confidentiality: "Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "Yes",
    approval_status: "Published", created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    content_body: `344TH BOARD OF DIRECTORS MEETING — Q3 SESSION\nCONFIDENTIAL BOARD PACK\nConvay Bank Limited | ${TODAY}\n\nCHAIRPERSON: Mr. Abdul Awal Mintoo\nSECRETARY: Ms. Nasrin Sultana\nVENUE: Board Room A, Head Office\nTIME: 09:00 AM — 12:00 PM\n\nAGENDA SUMMARY\n1. Opening and Quorum Declaration\n2. Approval of Previous Meeting Minutes (343rd Board Meeting)\n3. Review of Q2 Financial Performance\n4. Capital Expenditure Approval — Q3 2026 (৳50,000,000)\n5. Compliance and Regulatory Update\n6. CEO & MD Business Update\n7. Governance, Risk & Board Nominations Update\n8. Any Other Business & Meeting Closure\n\nQUORUM REQUIREMENT: 7 of 12 directors (58%)\nCURRENT RSVP STATUS: 12 of 12 accepted\n\nNOTE: This document is strictly confidential and intended for Board members only.`,
  },
  {
    id: "mtg13-d2", doc_id: `DOC-${year}-M13-002`, doc_name: `Q2 ${year} Financial Performance Report — Board Edition`,
    doc_number: `BM-FIN-${year}-Q2`, doc_type: "Financial Report", related_meeting: `MTG-${year}-0013`,
    related_agenda: `AGD-${year}-0023`, owner: "Mr. Kamal Hossain", version: "2.0",
    confidentiality: "Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "Yes",
    approval_status: "Approved", created_at: new Date(Date.now() - 86400000).toISOString(),
    content_body: `Q2 ${year} FINANCIAL PERFORMANCE REPORT\nConvay Bank Limited — Board Edition\n\nEXECUTIVE SUMMARY\nThe Bank recorded net profit after tax of ৳142 crore for Q2 ${year}, representing 86% achievement against the annual plan target of ৳165 crore. While core banking revenues remain resilient, credit provisioning pressure and NIM compression are the primary drivers of variance.\n\nINCOME STATEMENT HIGHLIGHTS\n• Total Operating Income: ৳480 crore (+7.2% YoY)\n• Net Interest Income: ৳310 crore (NIM: 3.2% vs target 3.6%)\n• Non-Interest Income: ৳170 crore (+12.4% YoY)\n• Impairment Charges: ৳68 crore (prior year: ৳42 crore)\n• Operating Expenses: ৳251 crore (Cost-to-Income: 52.3%)\n• Net Profit After Tax: ৳142 crore\n\nBALANCE SHEET HIGHLIGHTS\n• Total Assets: ৳18,400 crore (+9.1% YTD)\n• Gross Loans & Advances: ৳11,200 crore (+8.4% YTD)\n• Non-Performing Loans: ৳538 crore (NPL Ratio: 4.8%)\n• Provision Coverage Ratio: 72%\n• Customer Deposits: ৳13,800 crore (+11.2% YTD)\n• CASA Ratio: 38.2%\n\nCAPITAL & LIQUIDITY\n• Capital Adequacy Ratio: 13.1% (regulatory minimum: 10%)\n• Tier 1 Capital Ratio: 10.8%\n• Liquidity Coverage Ratio (LCR): 128%\n• Net Stable Funding Ratio (NSFR): 118%\n\nMANAGEMENT COMMENTARY\nThe NPL ratio increase from 4.1% (Q1) to 4.8% (Q2) reflects stress in the SME and real estate segments. Management has initiated a dedicated NPL recovery programme targeting a 0.5 percentage point reduction by Q3. Capital and liquidity positions remain comfortably above regulatory thresholds.`,
  },
  {
    id: "mtg13-d3", doc_id: `DOC-${year}-M13-003`, doc_name: `Capital Expenditure Proposal — Q3 ${year}`,
    doc_number: `BM-CAPEX-${year}-Q3`, doc_type: "Policy Document", related_meeting: `MTG-${year}-0013`,
    related_agenda: `AGD-${year}-0024`, owner: "Mr. Kamal Hossain", version: "1.0",
    confidentiality: "Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Pending", created_at: new Date(Date.now() - 86400000).toISOString(),
    content_body: `CAPITAL EXPENDITURE PROPOSAL — Q3 ${year}\nConvay Bank Limited\n\nTOTAL CAPEX REQUESTED: ৳50,000,000\n\nBREAKDOWN\n\n1. IT INFRASTRUCTURE & DIGITAL PLATFORM (৳32,000,000)\n   a) Core Banking System Upgrade — ৳18,000,000\n      Vendor: Temenos T24 (Phase 2 migration)\n      Expected completion: Q4 ${year}\n   b) Cybersecurity Infrastructure — ৳8,000,000\n      SOC enhancements, SIEM upgrade, endpoint protection\n   c) Cloud Migration Phase 2 — ৳4,000,000\n      Secondary systems migration to Azure Government Cloud\n   d) DR Site Upgrade — ৳2,000,000\n\n2. BRANCH NETWORK EXPANSION (৳18,000,000)\n   a) Sylhet Division — Osmani Nagar Branch (৳6,500,000)\n      License approved | Site secured | Opening: Q4 ${year}\n   b) Khulna Division — Rupsha Branch (৳5,500,000)\n      License approved | Site under fit-out\n   c) Rajshahi Division — Boalia Branch (৳6,000,000)\n      License approved | Site under negotiation\n\nROI PROJECTIONS\n• IT investments: ৳24 crore net benefit over 3 years\n• Branch openings: Break-even within 18 months each\n\nAPPROVAL SOUGHT\nThe Board is requested to approve total Q3 capital expenditure of ৳50,000,000 as detailed above.`,
  },
  {
    id: "mtg13-d4", doc_id: `DOC-${year}-M13-004`, doc_name: `Minutes of 343rd Board Meeting — 15 June ${year}`,
    doc_number: `BM-MIN-${year}-343`, doc_type: "Meeting Notice", related_meeting: `MTG-${year}-0013`,
    related_agenda: `AGD-${year}-0022`, owner: "Company Secretary", version: "1.0",
    confidentiality: "Internal", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Approved", created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
    content_body: `MINUTES OF THE 343RD BOARD OF DIRECTORS MEETING\nConvay Bank Limited\n\nDate: 15 June ${year} | Time: 10:00 AM — 1:15 PM\nVenue: Board Room A, Head Office\n\nATTENDANCE (11 of 12 directors present — Quorum Met)\nPresent: Mr. Abdul Awal Mintoo (Chairman), Mr. Md. Nurul Amin, Mr. Md. Abul Bashar, Dr. Aminul Haque, Ms. Fatema Begum, Mr. Shahadat Hossain, Mr. Ariful Islam, Mr. Wahidur Rahman, Ms. Nasrin Sultana (Secretary), Mr. Rafiqul Islam (Minute Taker), Mr. Kamal Hossain (CFO), Mr. Imran Hossain\n\nSELECTED RESOLUTIONS\nR-343-01: Annual budget outturn for FY2025-26 noted and approved unanimously.\nR-343-02: Q1 FY2026-27 financial results accepted. CFO to prepare variance analysis.\nR-343-03: IT Security Policy v5 ratified. Effective 1 July ${year}.\nR-343-04: Branch opening application for Sylhet Division approved.\n\nACTION ITEMS\n- CFO: Circulate Q2 management accounts by 15 August ${year}. STATUS: Completed.\n- Compliance: File Q1 regulatory returns. STATUS: Completed.\n- Company Secretary: Prepare Q3 board pack. STATUS: In progress.`,
  },
  {
    id: "mtg13-d5", doc_id: `DOC-${year}-M13-005`, doc_name: `Compliance & Regulatory Update — Q2 ${year}`,
    doc_number: `BM-COMP-${year}-Q2`, doc_type: "Compliance Report", related_meeting: `MTG-${year}-0013`,
    related_agenda: `AGD-${year}-0025`, owner: "Mr. Imran Hossain", version: "1.0",
    confidentiality: "Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Approved", created_at: new Date(Date.now() - 86400000).toISOString(),
    content_body: `COMPLIANCE & REGULATORY UPDATE — Q2 ${year}\nConvay Bank Limited\n\nEXECUTIVE SUMMARY\nNo material regulatory breaches were recorded in Q2 ${year}. Two Bangladesh Bank circulars require implementation; management is on track. AML/CFT metrics have improved compared to Q1.\n\nBANGLADESH BANK CORRESPONDENCE\n• BRPD Circular 08/${year}: Capital adequacy reporting format change — implementation by 1 October ${year} (ON TRACK)\n• FID Circular 04/${year}: Foreign currency account documentation enhancement — implementation by 1 September ${year} (IN PROGRESS — 68% complete)\n• Inspection visit: No scheduled inspection for Q3; last examination completed satisfactorily in Q4 ${year-1}\n\nAML/CFT STATUS\n• STRs filed Q2: 23 (Q1: 18) — increase reflects enhanced monitoring thresholds\n• KYC remediation: 94% complete (target: 100% by September ${year})\n• High-risk customer reviews completed: 142 of 156 scheduled\n• Staff AML training completion: 91% (mandatory: 100%) — reminder campaign launched\n\nINTERNAL POLICY COMPLIANCE\n• IT Security Policy: Updated — ratified at 343rd Board Meeting\n• Lending Policy: Under review; draft to be presented at 345th Board Meeting\n• AML Policy: Revised version approved by Audit Committee — Board noting required\n\nOUTSTANDING ITEMS\n1. KYC remediation for 6% of customers remains outstanding — escalation to branch managers issued.\n2. AML training for 9% of staff — HR to enforce completion by 31 August.`,
  },
];

export const MEETING_DOCS_MTG_0014: BoardDocument[] = [
  {
    id: "mtg14-d1", doc_id: `DOC-${year}-M14-001`, doc_name: `Internal Audit Report — Q2 ${year} Full Report`,
    doc_number: `IA-RPT-${year}-Q2`, doc_type: "Audit Report", related_meeting: `MTG-${year}-0014`,
    related_agenda: `AGD-${year}-0026`, owner: "Mr. Zahir Uddin", version: "1.0",
    confidentiality: "Restricted", effective_date: TODAY, expiry_date: "", acknowledgement_required: "Yes",
    approval_status: "Approved", created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
    content_body: `INTERNAL AUDIT REPORT — Q2 ${year}\nConvay Bank Limited — RESTRICTED\n\nPREPARED BY: Internal Audit Division\nREPORTING TO: Audit Committee\nDATE: ${TODAY}\n\nEXECUTIVE SUMMARY\nThe Q2 ${year} audit cycle covered 8 audit assignments across Operations, IT, Finance, and Compliance domains. A total of 47 findings were raised: 2 Critical, 8 High, 22 Medium, 15 Low.\n\nCRITICAL FINDINGS\n\nFinding 1 (Critical) — Cash Advance Controls: IT-AC-001\nAudit Unit: Treasury Operations\nIssue: Insufficient dual-authorisation controls for cash advances above ৳500,000 at 3 branch locations. Interim control activated 15 July ${year} pending system fix.\nExposure: ৳4.2M\nDeadline: 31 August ${year}\n\nFinding 2 (Critical) — Privileged Access Review: IT-PAM-001\nAudit Unit: Information Technology\nIssue: 14 privileged IT accounts not reviewed in 12-month window; 3 accounts belong to staff no longer in IT roles.\nExposure: Cybersecurity risk — indeterminate financial exposure\nDeadline: 15 August ${year}\n\nHIGH FINDINGS SUMMARY\n• IA-FIN-002: Treasury limit monitoring — manual override log gaps (4 instances)\n• IA-AML-003: Transaction monitoring alert queue backlog — 67 alerts >5 business days\n• IA-HR-004: Performance review documentation missing for 12 senior roles\n• IA-COMP-005: AML policy training non-completion — 9% of staff outstanding\n• IA-OPS-006: Customer complaint escalation SLA breaches — 18 instances\n• IA-IT-007: Patch management — 23 servers outside 30-day patch window\n• IA-FIN-008: Interbank reconciliation delay >5 days in 3 of 13 cases\n• IA-PROC-009: Credit file documentation incomplete — 8 files above ৳10M threshold\n\nAUDIT CALENDAR — REMAINING Q3 ASSIGNMENTS\n• Shariah compliance audit (commencing 1 September)\n• SME lending portfolio review (commencing 15 September)\n• Business continuity plan test (October)`,
  },
  {
    id: "mtg14-d2", doc_id: `DOC-${year}-M14-002`, doc_name: `Audit Recommendation Tracker — As at ${TODAY}`,
    doc_number: `IA-TRK-${year}-08`, doc_type: "Compliance Report", related_meeting: `MTG-${year}-0014`,
    related_agenda: `AGD-${year}-0026`, owner: "Mr. Zahir Uddin", version: "1.0",
    confidentiality: "Restricted", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Published", created_at: new Date(Date.now() - 86400000).toISOString(),
    content_body: `AUDIT RECOMMENDATION TRACKER\nConvay Bank Limited — Internal Audit Division\nAs at ${TODAY}\n\nSUMMARY DASHBOARD\n• Total open recommendations: 32\n• Closed since last AC meeting: 11\n• Overdue (past agreed deadline): 5\n• Pending management response: 7\n• On track: 20\n\nOVERDUE ITEMS REQUIRING COMMITTEE ATTENTION\n\n1. IA-2026-Q1-003: Segregation of duties — Loan disbursement\n   Owner: Head of Operations | Original Deadline: 30 June ${year}\n   Status: In progress — system change delayed to Q3\n   Risk: Medium financial exposure if unresolved\n\n2. IA-2026-Q1-007: IT access certification — HR-IT handoff process\n   Owner: Head of IT | Original Deadline: 15 July ${year}\n   Status: Process redesigned; implementation pending UAT sign-off\n\n3. IA-2025-Q4-012: Credit committee quorum documentation\n   Owner: Head of Credit | Original Deadline: 31 March ${year}\n   Status: Policy updated; training completion at 78%\n\n4. IA-2025-Q4-019: Customer due diligence refresh — High-risk segment\n   Owner: Head of Compliance | Original Deadline: 30 April ${year}\n   Status: 94% complete; 6% outstanding due to customer non-response\n\n5. IA-2026-Q1-021: Treasury limit approval documentation\n   Owner: Head of Treasury | Original Deadline: 30 June ${year}\n   Status: New workflow implemented; historical documentation outstanding`,
  },
  {
    id: "mtg14-d3", doc_id: `DOC-${year}-M14-003`, doc_name: `External Auditor Status Report — Rahman Rahman Huq (KPMG)`,
    doc_number: `EA-UPD-${year}-Q2`, doc_type: "Audit Report", related_meeting: `MTG-${year}-0014`,
    related_agenda: `AGD-${year}-0027`, owner: "Ms. Nasrin Sultana", version: "1.0",
    confidentiality: "Restricted", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Published", created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    content_body: `EXTERNAL AUDITOR STATUS REPORT\nRahman Rahman Huq — Chartered Accountants (Member firm of KPMG)\nReporting Period: Interim Audit — Q2 ${year}\nClient: Convay Bank Limited\n\nAUDIT PROGRESS\n• Interim fieldwork: 65% complete\n• Audit team on-site: 12 senior auditors\n• Risk-based approach: High-risk areas prioritised\n\nKEY AREAS UNDER EXAMINATION\n1. Credit risk and provisioning methodology\n2. Revenue recognition on Islamic finance products\n3. IT general controls and automated controls\n4. Regulatory compliance and capital reporting\n5. Related party transactions\n\nSIGNIFICANT MATTERS IDENTIFIED (Preliminary)\n• No material misstatements identified to date\n• Provisioning model assumptions under review — preliminary feedback suggests provisions may be adequate\n• IT general controls — access management finding noted (management advised)\n\nMANAGEMENT LETTER — STATUS UPDATE\n• Prior year items issued: 18\n• Confirmed closed: 12\n• In progress with agreed timeline: 4\n• Under discussion: 2 (treasury reconciliation process; credit file standards)\n\nEXPECTED TIMELINE\n• Interim audit report: 15 September ${year}\n• Year-end audit commencement: 1 January ${year+1}\n• Audit opinion: 31 March ${year+1}`,
  },
  {
    id: "mtg14-d4", doc_id: `DOC-${year}-M14-004`, doc_name: `Fraud Risk Assessment — Q2 ${year}`,
    doc_number: `IA-FRAUD-${year}-Q2`, doc_type: "Risk Assessment", related_meeting: `MTG-${year}-0014`,
    related_agenda: `AGD-${year}-0046`, owner: "Mr. Zahir Uddin", version: "1.0",
    confidentiality: "Restricted", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Approved", created_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

export const MEETING_DOCS_MTG_0015: BoardDocument[] = [
  {
    id: "mtg15-d1", doc_id: `DOC-${year}-M15-001`, doc_name: `Risk Appetite Statement — Q3 ${year} Review`,
    doc_number: `RMC-RAS-${year}-Q3`, doc_type: "Policy Document", related_meeting: `MTG-${year}-0015`,
    related_agenda: `AGD-${year}-0028`, owner: "Mr. Reza Ahmed", version: "3.1",
    confidentiality: "Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "Yes",
    approval_status: "Pending", created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    content_body: `RISK APPETITE STATEMENT — Q3 ${year} REVIEW\nConvay Bank Limited — Risk Management Committee\n\nPURPOSE\nThis document presents proposed amendments to the Board-approved Risk Appetite Statement (RAS) for review and approval by the Risk Management Committee at the 43rd RMC Meeting.\n\nPROPOSED AMENDMENTS\n\n1. MARKET RISK APPETITE\nCurrent: VaR (99%, 1-day) ≤ ৳12 crore\nProposed: VaR (99%, 1-day) ≤ ৳10 crore\nRationale: Elevated market volatility in H1 ${year} warrants a more conservative threshold pending stabilisation.\n\nInterest Rate Risk:\nCurrent: NII sensitivity (200bp shock) ≤ 8% of projected NII\nProposed: ≤ 6% of projected NII\nRationale: Rising rate environment increases NIM sensitivity; tighter appetite reduces earnings at risk.\n\n2. CREDIT RISK APPETITE\nCurrent: NPL ratio ≤ 5.0%\nProposed: NPL ratio ≤ 4.5% (with early warning trigger at 4.0%)\nRationale: Q2 NPL ratio of 4.8% is uncomfortably close to the current limit; tightening the appetite signals Board commitment to credit quality improvement.\n\nSector Concentration Caps (Proposed revisions):\n• Real Estate: 20% → 17% of total credit portfolio\n• Construction (commercial): New sub-limit of 8% within Real Estate cap\n• SME Sector: Retained at 25% (no change)\n• Consumer: Retained at 18% (no change)\n\n3. LIQUIDITY RISK APPETITE\nMinimum LCR: 110% → 120% (above regulatory minimum of 100%)\nMinimum NSFR: 105% → 110%\n\nRATIONALE SUMMARY\nAll proposed tightening reflects management's proactive response to H1 stress signals and aligns with the Board's stated preference for a conservative risk profile in the current economic environment.`,
  },
  {
    id: "mtg15-d2", doc_id: `DOC-${year}-M15-002`, doc_name: `KRI Dashboard — Q2 ${year}`,
    doc_number: `RMC-KRI-${year}-Q2`, doc_type: "Risk Assessment", related_meeting: `MTG-${year}-0015`,
    related_agenda: `AGD-${year}-0029`, owner: "Mr. Reza Ahmed", version: "1.0",
    confidentiality: "Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Published", created_at: new Date(Date.now() - 86400000).toISOString(),
    content_body: `KEY RISK INDICATOR DASHBOARD — Q2 ${year}\nConvay Bank Limited — Risk Management Division\n\nOVERALL RISK RATING: AMBER\n\nKRI STATUS SUMMARY\nGreen: 18 | Amber: 7 | Red: 3 | Total: 28\n\nRED STATUS KRIs (Require Committee Action)\n\nKRI-CR-001: NPL Ratio\nCurrent: 4.8% | Threshold: Red ≥ 4.5%\nTrend: ↑ Deteriorating (Q1: 4.1%, Q2: 4.8%)\nDriver: SME sector stress and 3 large commercial real estate accounts\nAction: NPL Recovery Task Force activated. Target: 4.3% by Q3 end.\n\nKRI-OP-007: AML Alert Backlog\nCurrent: 67 alerts >5 business days | Threshold: Red ≥ 50\nTrend: ↑ Deteriorating (Q1: 31, Q2: 67)\nDriver: Alert volume increase following enhanced screening rules; insufficient review staffing\nAction: 2 temporary AML analysts hired. New queue management tool deployed 1 August.\n\nKRI-IT-003: Patch Compliance Rate\nCurrent: 81% | Threshold: Red < 85%\nTrend: ↓ Deteriorating (Q1: 89%, Q2: 81%)\nDriver: Delayed Q2 patch cycle due to change freeze during core banking upgrade testing\nAction: Emergency patching window scheduled. Target: 95% compliance by 31 August.\n\nAMBER STATUS KRIs (Monitoring Required)\n• KRI-LQ-002: LCR — 112% (Amber ≤ 115%); trend stable\n• KRI-CR-004: Large exposure concentration — 18.2% (Amber ≥ 17%); 2 accounts under review\n• KRI-HR-011: Staff turnover rate — 4.2% annualised (Amber ≥ 4%); driven by IT roles\n• KRI-OP-014: System availability — 99.1% (Amber < 99.5%); one major incident in Q2\n• KRI-COMP-005: Regulatory filing timeliness — 96% (Amber < 98%)\n• KRI-FIN-008: Cost-to-income ratio — 52.3% (Amber ≥ 50%); budget 49%\n• KRI-CR-009: Watch-list loan growth — ৳124cr (+18% QoQ; Amber ≥ 15%)`,
  },
  {
    id: "mtg15-d3", doc_id: `DOC-${year}-M15-003`, doc_name: `Credit Risk Portfolio Review — Q2 ${year}`,
    doc_number: `RMC-CRED-${year}-Q2`, doc_type: "Risk Assessment", related_meeting: `MTG-${year}-0015`,
    related_agenda: `AGD-${year}-0050`, owner: "Mr. Reza Ahmed", version: "1.0",
    confidentiality: "Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Approved", created_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "mtg15-d4", doc_id: `DOC-${year}-M15-004`, doc_name: `Minutes of 42nd RMC Meeting — 4 April ${year}`,
    doc_number: `RMC-MIN-${year}-042`, doc_type: "Meeting Notice", related_meeting: `MTG-${year}-0015`,
    related_agenda: `AGD-${year}-0049`, owner: "Mr. Kamal Hossain", version: "1.0",
    confidentiality: "Confidential", effective_date: TODAY, expiry_date: "", acknowledgement_required: "No",
    approval_status: "Approved", created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    content_body: `MINUTES OF THE 42ND RISK MANAGEMENT COMMITTEE MEETING\nConvay Bank Limited\n\nDate: 4 April ${year} | Time: 2:00 PM — 4:30 PM\nVenue: Board Room A, Head Office\n\nATTENDANCE (5 of 6 members present — Quorum Met)\nPresent: Mr. Md. Nurul Amin (Chairman), Dr. Aminul Haque, Mr. Md. Abul Bashar, Mr. Kamal Hossain (Secretary), Mr. Rafiqul Islam (Minute Taker), Mr. Reza Ahmed (CRO)\nApology: Ms. Tahmina Khanam (illness)\n\nAGENDA & RESOLUTIONS\n\nAgenda 1 — Opening & Quorum: Quorum declared (5/6 members). Meeting opened 2:05 PM.\n\nAgenda 2 — Previous Minutes: Minutes of 41st RMC (8 January ${year}) confirmed. 3 action items closed; 1 carried forward (KYC remediation tracking).\n\nAgenda 3 — Risk Appetite Statement Q1 Review: RAS reviewed. No threshold changes required. Credit NPL trend noted as emerging concern. CRO to prepare Q2 stress test.\n\nAgenda 4 — KRI Dashboard Q1: Overall rating GREEN. 21 Green, 5 Amber, 1 Red (AML alert backlog). Action: Head of Compliance to address AML staffing by 30 April.\n\nAgenda 5 — Credit Portfolio Q1: Gross loans ৳10,330cr. NPL 4.1%. Watch-list growth flagged. CRO to initiate sector cap review for real estate.\n\nACTION ITEMS\n- CRO: Prepare Q2 stress test — Due 31 July ${year}. STATUS: IN PROGRESS\n- Head of Compliance: AML analyst recruitment — Due 30 April ${year}. STATUS: COMPLETED\n- CRO: Sector cap review paper — Due 43rd RMC Meeting. STATUS: IN PROGRESS`,
  },
];

// ─── Registry Hooks ────────────────────────────────────────────────────────────

export const useMeetingRegistry     = createEntityRegistry<Meeting>          ("bms.meetings",      "bms:meetings-updated",       MOCK_MEETINGS);
export const useAgendaRegistry      = createEntityRegistry<AgendaSubmission> ("bms.agenda",        "bms:agenda-updated",         MOCK_AGENDA_SUBMISSIONS);
export const useDecisionRegistry    = createEntityRegistry<Decision>         ("bms.decisions",     "bms:decisions-updated",      [...MOCK_DECISIONS,    ...SEED_DECISIONS_MTG_0010, ...SEED_DECISIONS_MTG_0013, ...SEED_DECISIONS_MTG_0014, ...SEED_DECISIONS_MTG_0015]);
export const useResolutionRegistry  = createEntityRegistry<Resolution>       ("bms.resolutions",   "bms:resolutions-updated",    [...MOCK_RESOLUTIONS,  ...SEED_RESOLUTIONS_MTG_0010]);
export const useActionItemRegistry  = createEntityRegistry<ActionItem>       ("bms.actionitems",   "bms:actionitems-updated",    [...MOCK_ACTION_ITEMS, ...SEED_ACTIONS_MTG_0010, ...SEED_ACTIONS_MTG_0013, ...SEED_ACTIONS_MTG_0014, ...SEED_ACTIONS_MTG_0015]);
export const useGovernanceRegistry  = createEntityRegistry<GovernanceBody>   ("bms.govbodies",     "bms:govbodies-updated",      MOCK_GOVERNANCE_BODIES);
export const useMotionRegistry      = createEntityRegistry<Motion>           ("bms.motions",       "bms:motions-updated",        MOCK_MOTIONS);
export const useMinutesRegistry     = createEntityRegistry<Minutes>          ("bms.minutes",       "bms:minutes-updated",        MOCK_MINUTES);
export const useBoardPackRegistry   = createEntityRegistry<BoardPack>        ("bms.boardpacks",    "bms:boardpacks-updated",     MOCK_BOARD_PACKS);
export const useDocumentRegistry    = createEntityRegistry<BoardDocument>    ("bms.documents",     "bms:documents-updated",      [...MOCK_DOCUMENTS, ...MEETING_DOCS_MTG_0010, ...MEETING_DOCS_MTG_0013, ...MEETING_DOCS_MTG_0014, ...MEETING_DOCS_MTG_0015]);
export const useMatterArisingRegistry = createEntityRegistry<MatterArising>  ("bms.matters",       "bms:matters-updated",        MOCK_MATTERS_ARISING);
export const useParticipantRegistry   = createEntityRegistry<MeetingParticipant>("bms.participants","bms:participants-updated",  MOCK_PARTICIPANTS);
export const useRSVPRegistry          = createEntityRegistry<RSVPRecord>     ("bms.rsvp",          "bms:rsvp-updated",           MOCK_RSVP_RECORDS);
export const useConflictRegistry      = createEntityRegistry<ConflictDeclaration>("bms.conflicts", "bms:conflicts-updated",      MOCK_CONFLICT_DECLARATIONS);
export const useAttendanceRegistry    = createEntityRegistry<AttendanceRecord>("bms.attendance",   "bms:attendance-updated",     MOCK_ATTENDANCE_RECORDS);
export const useVoteRegistry          = createEntityRegistry<VoteRecord>     ("bms.votes",         "bms:votes-updated",          MOCK_VOTE_RECORDS);
export const useQuorumEventRegistry   = createEntityRegistry<QuorumEvent>    ("bms.quorum",        "bms:quorum-updated",         MOCK_QUORUM_EVENTS);
export const useQuestionRegistry            = createEntityRegistry<BoardQuestion>            ("bms.questions",     "bms:questions-updated",      MOCK_QUESTIONS);
export const usePrivateNoteRegistry         = createEntityRegistry<PrivateNote>              ("bms.notes",         "bms:notes-updated",          MOCK_PRIVATE_NOTES);
export const useEffectivenessReviewRegistry = createEntityRegistry<MeetingEffectivenessReview>("bms.reviews",     "bms:reviews-updated",        MOCK_EFFECTIVENESS_REVIEWS);

// ─── AvailabilityPoll ─────────────────────────────────────────────────────────

export interface AvailabilityPoll extends EntityRecord {
  poll_id: string;
  poll_title: string;
  related_meeting_id: string;
  related_meeting_title: string;
  time_zone: string;
  response_deadline: string;
  allow_multiple: string;
  allow_comments: string;
  proposed_dates: string;
  participants: string;
  best_option: string;
  total_responses: string;
  approval_status: string;
  created_by: string;
  created_at: string;
}

export const MOCK_AVAILABILITY_POLLS: AvailabilityPoll[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  poll_id: `POL-${year}-${padded(i + 1)}`,
  poll_title: [
    "Q3 Board Meeting — Best Date",
    "Annual General Meeting Scheduling",
    "Audit Committee Review Poll",
    "Risk Committee Q4 Session",
    "Emergency Board Meeting Availability",
    "NRC Annual Assessment Poll",
  ][i],
  related_meeting_id: `MTG-${year}-${padded(i + 1)}`,
  related_meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
  time_zone: "Asia/Dhaka (GMT+6)",
  response_deadline: `${year}-0${(i % 9) + 1}-${String((i % 20) + 5).padStart(2, "0")}`,
  allow_multiple: "Yes",
  allow_comments: "Yes",
  proposed_dates: `${year}-0${(i % 9) + 1}-15, ${year}-0${(i % 9) + 1}-22, ${year}-0${(i % 9) + 1}-29`,
  participants: String(5 + i * 2),
  best_option: i < 3 ? `${year}-0${(i % 9) + 1}-22` : "Pending responses",
  total_responses: String(i < 3 ? (4 + i) : 0),
  approval_status: ["Open", "Closed", "Open", "Draft", "Open", "Closed"][i],
  created_by: "Meeting Secretary",
  created_at: NOW,
}));

// ─── ParticipantGroup ─────────────────────────────────────────────────────────

export interface ParticipantGroup extends EntityRecord {
  group_id: string;
  group_name: string;
  group_type: string;
  governance_body: string;
  membership_rule: string;
  member_count: string;
  quorum_rule: string;
  description: string;
  status: string;
  created_at: string;
}

export const MOCK_PARTICIPANT_GROUPS: ParticipantGroup[] = [
  { id: "1", group_id: "PG-2026-001", group_name: "Board of Directors", group_type: "Voting Members", governance_body: "Board of Directors", membership_rule: "Ex-Officio", member_count: "12", quorum_rule: "60%", description: "Full board voting membership.", status: "Active", created_at: "2024-01-15" },
  { id: "2", group_id: "PG-2026-002", group_name: "Independent Directors", group_type: "Independent Members", governance_body: "Board of Directors", membership_rule: "Nomination", member_count: "4", quorum_rule: "50%", description: "Independent director group.", status: "Active", created_at: "2024-01-15" },
  { id: "3", group_id: "PG-2026-003", group_name: "Audit Committee", group_type: "Voting Members", governance_body: "Audit Committee", membership_rule: "Appointment", member_count: "5", quorum_rule: "60%", description: "Audit committee members.", status: "Active", created_at: "2024-02-01" },
  { id: "4", group_id: "PG-2026-004", group_name: "Risk Management Committee", group_type: "Voting Members", governance_body: "Risk Management Committee", membership_rule: "Appointment", member_count: "6", quorum_rule: "60%", description: "Risk committee voting group.", status: "Active", created_at: "2024-02-01" },
  { id: "5", group_id: "PG-2026-005", group_name: "External Advisors", group_type: "Non-Voting Observers", governance_body: "Executive Committee", membership_rule: "Invitation", member_count: "3", quorum_rule: "N/A", description: "External advisory observers.", status: "Active", created_at: "2024-03-10" },
  { id: "6", group_id: "PG-2026-006", group_name: "Executive Management", group_type: "Invitees", governance_body: "Board of Directors", membership_rule: "Position", member_count: "8", quorum_rule: "N/A", description: "Executive management invitees.", status: "Active", created_at: "2024-03-15" },
  { id: "7", group_id: "PG-2026-007", group_name: "Shariah Supervisory Committee", group_type: "Voting Members", governance_body: "Shariah Committee", membership_rule: "Appointment", member_count: "5", quorum_rule: "67%", description: "Shariah compliance committee.", status: "Active", created_at: "2024-04-01" },
  { id: "8", group_id: "PG-2026-008", group_name: "Company Secretariat", group_type: "Non-Voting Support", governance_body: "All Bodies", membership_rule: "Designation", member_count: "3", quorum_rule: "N/A", description: "Company secretariat support staff.", status: "Active", created_at: "2024-04-05" },
  { id: "9", group_id: "PG-2026-009", group_name: "Nomination & Remuneration Committee", group_type: "Voting Members", governance_body: "NRC", membership_rule: "Appointment", member_count: "4", quorum_rule: "50%", description: "NRC voting members.", status: "Active", created_at: "2024-05-01" },
  { id: "10", group_id: "PG-2026-010", group_name: "Legacy Observer Group", group_type: "Non-Voting Observers", governance_body: "Board of Directors", membership_rule: "Invitation", member_count: "2", quorum_rule: "N/A", description: "Legacy observer group.", status: "Inactive", created_at: "2023-06-20" },
];

// ─── MeetingTemplate ──────────────────────────────────────────────────────────

export interface MeetingTemplate extends EntityRecord {
  template_id: string;
  template_name: string;
  committee: string;
  meeting_type: string;
  default_mode: string;
  default_duration: string;
  agenda_structure: string;
  confidentiality: string;
  description: string;
  status: string;
  created_at: string;
}

export const MOCK_MEETING_TEMPLATES: MeetingTemplate[] = [
  { id: "1", template_id: "TPL-2026-001", template_name: "Standard Board Meeting", committee: "Board of Directors", meeting_type: "Regular Board Meeting", default_mode: "Physical", default_duration: "180 min", agenda_structure: "Standard", confidentiality: "Confidential", description: "Standard board meeting agenda template.", status: "Active", created_at: NOW },
  { id: "2", template_id: "TPL-2026-002", template_name: "Audit Committee Review", committee: "Audit Committee", meeting_type: "Committee Meeting", default_mode: "Hybrid", default_duration: "120 min", agenda_structure: "Audit-Specific", confidentiality: "Restricted", description: "Audit committee review template.", status: "Active", created_at: NOW },
  { id: "3", template_id: "TPL-2026-003", template_name: "Annual General Meeting", committee: "Board of Directors", meeting_type: "Annual General Meeting", default_mode: "Physical", default_duration: "240 min", agenda_structure: "AGM", confidentiality: "Public", description: "AGM agenda and procedure template.", status: "Active", created_at: NOW },
  { id: "4", template_id: "TPL-2026-004", template_name: "Emergency Board Meeting", committee: "Board of Directors", meeting_type: "Emergency Board Meeting", default_mode: "Virtual", default_duration: "60 min", agenda_structure: "Minimal", confidentiality: "Strictly Confidential", description: "Emergency meeting quick template.", status: "Active", created_at: NOW },
];

// ─── GovernanceMembership ────────────────────────────────────────────────────

export interface GovernanceMembership extends EntityRecord {
  membership_id: string;
  body_id: string;
  body_name: string;
  member_name: string;
  member_role: string;
  member_designation: string;
  voting_rights: string;
  start_date: string;
  end_date: string;
  status: string;
  created_at: string;
}

export const MOCK_GOVERNANCE_MEMBERSHIPS: GovernanceMembership[] = Array.from({ length: 15 }, (_, i) => ({
  id: String(i + 1),
  membership_id: `MBR-${year}-${padded(i + 1)}`,
  body_id: `GB-${year}-${padded((i % 6) + 1)}`,
  body_name: GOVERNANCE_BODIES[i % GOVERNANCE_BODIES.length],
  member_name: ["Mohammed Ali Rahman", "Fatima Begum", "Karim Ahmed", "Nasrin Akter", "Rashid Hassan", "Sultana Parvin", "Zahir Uddin", "Roksana Islam"][i % 8],
  member_role: MEETING_ROLES[i % MEETING_ROLES.length],
  member_designation: DESIGNATIONS[i % DESIGNATIONS.length],
  voting_rights: ["Yes", "No"][i % 2],
  start_date: `${year - 2}-01-01`,
  end_date: `${year + 1}-12-31`,
  status: i === 14 ? "Inactive" : "Active",
  created_at: NOW,
}));

// ─── OrgUnit ──────────────────────────────────────────────────────────────────

export type OrgUnitType =
  // ── Phase 1 visible types ─────────────────────────────────────────────────
  | "Organization"
  | "Head Office"
  | "Branch"
  | "Division"
  | "Department"
  // ── Phase 2 (prepared, hidden from UI until Phase 2) ──────────────────────
  | "Regional Office"
  | "Section"
  | "Team"
  // ── Legacy types (kept for backward compat; not shown in Phase 1 pickers) ─
  | "Governing Body"
  | "Secretariat"
  | "Region"
  | string;

export type OrgUnitStatus =
  | "Draft"
  | "Active"
  | "Inactive"
  | "Scheduled for Closure"
  | "Deactivated"
  | "Archived";

export interface OrgUnit extends EntityRecord {
  // ── Display codes ─────────────────────────────────────────────────────────
  unit_id: string;       // display reference code, e.g. "OU-001"
  unit_name: string;
  /** Short alphabetic code e.g. "FIN", "OPS". */
  code?: string;
  unit_type: OrgUnitType;
  // ── Hierarchy ─────────────────────────────────────────────────────────────
  /** @deprecated Use parent_unit_id. Kept for backward-compat display. */
  parent_unit: string;
  /** Stable entity ID of the parent OrgUnit. */
  parent_unit_id?: string;
  /** Ordered ancestor IDs from root to this unit (populated at save time). */
  path_ids?: string[];
  /** Human-readable path, e.g. "Meridian › Head Office › Finance Division". */
  path_label?: string;
  // ── Leadership ────────────────────────────────────────────────────────────
  /** @deprecated Use head_user_id. Kept for backward-compat display. */
  head: string;
  /** Stable user ID of the primary head. */
  head_user_id?: string;
  /** Stable user ID of the deputy head. */
  deputy_user_id?: string;
  // ── Derived counts (deprecated; prefer live calculation) ──────────────────
  /** @deprecated Derive from user registry using resolveUnitUsers(). */
  member_count: string;
  // ── Detail fields ─────────────────────────────────────────────────────────
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  // ── Lifecycle ─────────────────────────────────────────────────────────────
  status: string;
  effective_start_at?: string;
  effective_end_at?: string;
  created_at: string;
  created_by?: string;
  updated_at?: string;
  updated_by?: string;
  deactivated_at?: string;
  deactivated_by?: string;
  deactivation_reason?: string;
  archived_at?: string;
  archived_by?: string;
}

/**
 * Canonical mock org units for fresh installations.
 *
 * Hierarchy:
 *   id:"13"  Organization (root)
 *     id:"14"  Head Office
 *       id:"2"   Finance Division
 *         id:"4"   Risk Management (Dept)
 *         id:"5"   Compliance (Dept)
 *       id:"3"   Operations Division
 *       id:"7"   IT Division
 *     id:"10"  Gulshan Branch
 *     id:"11"  Motijheel Branch
 *     id:"12"  Agrabad Branch
 *
 * Legacy units (kept for backward compat, not in Phase 1 pickers):
 *   id:"1"   Board of Directors (Governing Body)
 *   id:"6"   Company Secretariat (Secretariat)
 *   id:"8"   Dhaka Region (Region)
 *   id:"9"   Chittagong Region (Region)
 */
export const MOCK_ORG_UNITS: OrgUnit[] = [
  // ── Legacy / governance units (kept for backward compat) ──────────────────
  {
    id: "1", unit_id: "OU-001", unit_name: "Board of Directors",
    unit_type: "Governing Body", parent_unit: "—", head: "Chairman",
    member_count: "12", status: "Active", created_at: NOW,
  },
  {
    id: "6", unit_id: "OU-006", unit_name: "Company Secretariat",
    unit_type: "Secretariat", parent_unit: "Board of Directors", head: "Company Secretary",
    member_count: "5", status: "Active", created_at: NOW,
    parent_unit_id: "1",
  },
  // ── Phase 2 region units (kept for backward compat) ───────────────────────
  {
    id: "8", unit_id: "OU-008", unit_name: "Dhaka Region",
    unit_type: "Region", parent_unit: "Operations Division", head: "Regional Head — Dhaka",
    member_count: "230", status: "Active", created_at: NOW,
    parent_unit_id: "3",
  },
  {
    id: "9", unit_id: "OU-009", unit_name: "Chittagong Region",
    unit_type: "Region", parent_unit: "Operations Division", head: "Regional Head — Chittagong",
    member_count: "185", status: "Active", created_at: NOW,
    parent_unit_id: "3",
  },
  // ── Phase 1 hierarchy ─────────────────────────────────────────────────────
  {
    id: "13", unit_id: "OU-013", unit_name: "Meridian Financial Group",
    code: "MFG",
    unit_type: "Organization", parent_unit: "—", head: "Group Chairman",
    member_count: "0", status: "Active", created_at: NOW,
    path_ids: ["13"], path_label: "Meridian Financial Group",
    description: "Root organisational entity.",
  },
  {
    id: "14", unit_id: "OU-014", unit_name: "Head Office",
    code: "HQ",
    unit_type: "Head Office", parent_unit: "Meridian Financial Group", head: "Managing Director",
    member_count: "0", status: "Active", created_at: NOW,
    parent_unit_id: "13",
    path_ids: ["13", "14"], path_label: "Meridian Financial Group › Head Office",
  },
  {
    id: "2", unit_id: "OU-002", unit_name: "Finance Division",
    code: "FIN",
    unit_type: "Division", parent_unit: "Head Office", head: "CFO",
    member_count: "45", status: "Active", created_at: NOW,
    parent_unit_id: "14",
    path_ids: ["13", "14", "2"], path_label: "Meridian Financial Group › Head Office › Finance Division",
  },
  {
    id: "3", unit_id: "OU-003", unit_name: "Operations Division",
    code: "OPS",
    unit_type: "Division", parent_unit: "Head Office", head: "COO",
    member_count: "78", status: "Active", created_at: NOW,
    parent_unit_id: "14",
    path_ids: ["13", "14", "3"], path_label: "Meridian Financial Group › Head Office › Operations Division",
  },
  {
    id: "7", unit_id: "OU-007", unit_name: "IT Division",
    code: "IT",
    unit_type: "Division", parent_unit: "Head Office", head: "CTO",
    member_count: "65", status: "Active", created_at: NOW,
    parent_unit_id: "14",
    path_ids: ["13", "14", "7"], path_label: "Meridian Financial Group › Head Office › IT Division",
  },
  {
    id: "4", unit_id: "OU-004", unit_name: "Risk Management",
    code: "RISK",
    unit_type: "Department", parent_unit: "Finance Division", head: "CRO",
    member_count: "18", status: "Active", created_at: NOW,
    parent_unit_id: "2",
    path_ids: ["13", "14", "2", "4"], path_label: "Meridian Financial Group › Head Office › Finance Division › Risk Management",
  },
  {
    id: "5", unit_id: "OU-005", unit_name: "Compliance",
    code: "COMP",
    unit_type: "Department", parent_unit: "Finance Division", head: "CCO",
    member_count: "12", status: "Active", created_at: NOW,
    parent_unit_id: "2",
    path_ids: ["13", "14", "2", "5"], path_label: "Meridian Financial Group › Head Office › Finance Division › Compliance",
  },
  {
    id: "10", unit_id: "OU-010", unit_name: "Gulshan Branch",
    code: "GSH",
    unit_type: "Branch", parent_unit: "Head Office", head: "Branch Manager",
    member_count: "35", status: "Active", created_at: NOW,
    parent_unit_id: "13",
    path_ids: ["13", "10"], path_label: "Meridian Financial Group › Gulshan Branch",
  },
  {
    id: "11", unit_id: "OU-011", unit_name: "Motijheel Branch",
    code: "MTJ",
    unit_type: "Branch", parent_unit: "Head Office", head: "Branch Manager",
    member_count: "40", status: "Active", created_at: NOW,
    parent_unit_id: "13",
    path_ids: ["13", "11"], path_label: "Meridian Financial Group › Motijheel Branch",
  },
  {
    id: "12", unit_id: "OU-012", unit_name: "Agrabad Branch",
    code: "AGR",
    unit_type: "Branch", parent_unit: "Head Office", head: "Branch Manager",
    member_count: "28", status: "Active", created_at: NOW,
    parent_unit_id: "13",
    path_ids: ["13", "12"], path_label: "Meridian Financial Group › Agrabad Branch",
  },
];

// ─── UnitHeadAssignment ───────────────────────────────────────────────────────

export type UnitHeadAssignmentType = "Permanent Head" | "Acting Head" | "Deputy";
export type UnitHeadAssignmentStatus = "active" | "ended";

/** Records a formal leadership assignment for an organisational unit. */
export interface UnitHeadAssignment extends EntityRecord {
  assignment_id: string;
  unit_id: string;          // entity ID of the OrgUnit
  user_id: string;          // entity ID of the BmsUser
  assignment_type: UnitHeadAssignmentType;
  start_date: string;
  end_date?: string;
  assigned_by: string;      // user ID of the assigning administrator
  reason?: string;
  status: UnitHeadAssignmentStatus;
}

export const MOCK_UNIT_HEAD_ASSIGNMENTS: UnitHeadAssignment[] = [];

// ─── DocumentVersion ──────────────────────────────────────────────────────────

export interface DocumentVersion extends EntityRecord {
  version_id: string;
  document_id: string;
  document_name: string;
  version_number: string;
  change_summary: string;
  created_by: string;
  created_at: string;
  approval_status: string;
  // Extended version metadata
  content_ref?: string;
  original_file_ref?: string;
  version_name?: string;
  snapshot_type?: "auto" | "manual" | "publish" | "restore";
  file_size?: number;
  checksum?: string;
  comment_count?: number;
  suggestion_count?: number;
  is_named?: boolean;
  is_approved?: boolean;
  restored_from_version_id?: string;
}

export const MOCK_DOCUMENT_VERSIONS: DocumentVersion[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  version_id: `DV-${year}-${padded(i + 1)}`,
  document_id: `DOC-${year}-${padded((i % 20) + 1)}`,
  document_name: `Board Document ${(i % 20) + 1}`,
  version_number: `${Math.floor(i / 4) + 1}.${i % 4}`,
  change_summary: ["Initial version", "Minor corrections", "Updated figures", "Board-approved revision"][i % 4],
  created_by: ["Company Secretary", "CFO", "CRO", "MD"][i % 4],
  created_at: NOW,
  approval_status: ["Draft", "Approved", "Superseded"][i % 3],
}));

// ─── BoardPackVersion ─────────────────────────────────────────────────────────

export interface BoardPackVersion extends EntityRecord {
  version_id: string;
  pack_id: string;
  pack_title: string;
  version_number: string;
  change_summary: string;
  created_by: string;
  created_at: string;
  approval_status: string;
}

export const MOCK_BOARD_PACK_VERSIONS: BoardPackVersion[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  version_id: `BPV-${year}-${padded(i + 1)}`,
  pack_id: `BP-${year}-${padded((i % 10) + 1)}`,
  pack_title: `Board Pack ${(i % 10) + 1}`,
  version_number: `${Math.floor(i / 3) + 1}.${i % 3}`,
  change_summary: ["Initial draft", "Documents added", "Secretary review", "Final version"][i % 4],
  created_by: "Company Secretary",
  created_at: NOW,
  approval_status: ["Draft", "Pending Approval", "Published"][i % 3],
}));

// ─── QuestionResponse ─────────────────────────────────────────────────────────

export interface QuestionResponse extends EntityRecord {
  response_id: string;
  question_id: string;
  question_text: string;
  response_text: string;
  responded_by: string;
  response_date: string;
  visibility: string;
  approval_status: string;
  created_at: string;
}

export const MOCK_QUESTION_RESPONSES: QuestionResponse[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  response_id: `RSP-${year}-${padded(i + 1)}`,
  question_id: `QST-${year}-${padded(i + 1)}`,
  question_text: ["What is the basis for the proposed budget allocation increase?", "Has the risk assessment been independently verified?", "What are the implementation timelines for the new policy?"][i % 3],
  response_text: "The allocation is based on projected growth targets for FY2026 with independent verification by the external auditors.",
  responded_by: ["CFO", "CRO", "Head of Compliance", "MD"][i % 4],
  response_date: `${year}-0${(i % 9) + 1}-${String((i % 20) + 5).padStart(2, "0")}`,
  visibility: ["All Participants", "Board Only"][i % 2],
  approval_status: ["Submitted", "Acknowledged", "Published"][i % 3],
  created_at: NOW,
}));

// ─── ProgressUpdate ───────────────────────────────────────────────────────────

export interface ProgressUpdate extends EntityRecord {
  update_id: string;
  action_id: string;
  action_title: string;
  progress_percent: string;
  update_notes: string;
  supporting_evidence: string;
  updated_by: string;
  updated_at: string;
  approval_status: string;
}

export const MOCK_PROGRESS_UPDATES: ProgressUpdate[] = Array.from({ length: 14 }, (_, i) => ({
  id: String(i + 1),
  update_id: `PU-${year}-${padded(i + 1)}`,
  action_id: `ACT-${year}-${padded((i % 22) + 1)}`,
  action_title: `Action Item ${(i % 22) + 1}`,
  progress_percent: String([10, 25, 40, 50, 65, 75, 80, 90, 100][i % 9]),
  update_notes: ["Initial progress reported", "Milestone achieved", "On track for completion", "Review meeting scheduled", "Evidence collected"][i % 5],
  supporting_evidence: i % 3 === 0 ? "Progress report attached" : "",
  updated_by: ["Action Owner", "Deputy Owner", "Team Lead"][i % 3],
  updated_at: NOW,
  approval_status: ["Submitted", "Acknowledged"][i % 2],
}));

// ─── ExtensionRequest ─────────────────────────────────────────────────────────

export interface ExtensionRequest extends EntityRecord {
  request_id: string;
  action_id: string;
  action_title: string;
  original_due_date: string;
  requested_due_date: string;
  extension_reason: string;
  approved_by: string;
  approval_status: string;
  created_at: string;
}

export const MOCK_EXTENSION_REQUESTS: ExtensionRequest[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  request_id: `EXT-${year}-${padded(i + 1)}`,
  action_id: `ACT-${year}-${padded((i % 22) + 1)}`,
  action_title: `Action Item ${(i % 22) + 1}`,
  original_due_date: `${year}-0${(i % 9) + 1}-15`,
  requested_due_date: `${year}-${String((i % 9) + 2).padStart(2, "0")}-15`,
  extension_reason: ["Resource constraints", "Dependencies unresolved", "Additional review required", "Scope expanded"][i % 4],
  approved_by: i < 3 ? "Board Secretary" : "",
  approval_status: ["Pending", "Approved", "Rejected", "Pending"][i % 4],
  created_at: NOW,
}));

// ─── CompletionReview ────────────────────────────────────────────────────────

export interface CompletionReview extends EntityRecord {
  review_id: string;
  action_id: string;
  action_title: string;
  completion_notes: string;
  evidence_summary: string;
  reviewed_by: string;
  review_date: string;
  approval_status: string;
  created_at: string;
}

export const MOCK_COMPLETION_REVIEWS: CompletionReview[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  review_id: `CR-${year}-${padded(i + 1)}`,
  action_id: `ACT-${year}-${padded((i % 22) + 1)}`,
  action_title: `Action Item ${(i % 22) + 1}`,
  completion_notes: "Action has been fully implemented and verified by the responsible department.",
  evidence_summary: "Supporting documents, sign-off sheet, and verification report attached.",
  reviewed_by: ["Board Secretary", "Chairperson", "Committee Chair"][i % 3],
  review_date: `${year}-0${(i % 9) + 1}-${String((i % 20) + 5).padStart(2, "0")}`,
  approval_status: ["Accepted", "Pending", "Returned for Revision"][i % 3],
  created_at: NOW,
}));

// ─── MinutesVersion ───────────────────────────────────────────────────────────

export interface MinutesVersion extends EntityRecord {
  version_id: string;
  minutes_id: string;
  meeting_title: string;
  version_number: string;
  change_summary: string;
  created_by: string;
  created_at: string;
  approval_status: string;
}

export const MOCK_MINUTES_VERSIONS: MinutesVersion[] = Array.from({ length: 8 }, (_, i) => ({
  id: String(i + 1),
  version_id: `MV-${year}-${padded(i + 1)}`,
  minutes_id: `MIN-${year}-${padded((i % 8) + 1)}`,
  meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
  version_number: `${Math.floor(i / 3) + 1}.${i % 3}`,
  change_summary: ["Initial draft", "Secretary corrections", "Chairperson review", "Member amendments", "Final approved"][i % 5],
  created_by: ["Minute Taker", "Company Secretary", "Chairperson"][i % 3],
  created_at: NOW,
  approval_status: ["Draft", "Under Review", "Approved", "Superseded"][i % 4],
}));

// ─── MinutesAmendment ────────────────────────────────────────────────────────

export interface MinutesAmendment extends EntityRecord {
  amendment_id: string;
  minutes_id: string;
  meeting_title: string;
  section_ref: string;
  original_text: string;
  amended_text: string;
  amendment_reason: string;
  proposed_by: string;
  approval_status: string;
  created_at: string;
}

export const MOCK_MINUTES_AMENDMENTS: MinutesAmendment[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  amendment_id: `AMD-${year}-${padded(i + 1)}`,
  minutes_id: `MIN-${year}-${padded((i % 8) + 1)}`,
  meeting_title: MOCK_MEETINGS[i % 12].meeting_title,
  section_ref: `Section ${i + 2}.${(i % 3) + 1}`,
  original_text: "The committee resolved to approve the proposed budget subject to further review.",
  amended_text: "The committee resolved to approve the proposed budget as presented.",
  amendment_reason: ["Factual correction", "Wording clarification", "Director request"][i % 3],
  proposed_by: ["Secretary", "Chairperson", "Board Member"][i % 3],
  approval_status: ["Pending", "Approved", "Rejected"][i % 3],
  created_at: NOW,
}));

// ─── Workflow ─────────────────────────────────────────────────────────────────

export interface Workflow extends EntityRecord {
  workflow_id: string;
  workflow_name: string;
  entity_type: string;
  steps: string;
  trigger_event: string;
  status: string;
  created_at: string;
}

export const MOCK_WORKFLOWS: Workflow[] = [
  { id: "1", workflow_id: "WF-001", workflow_name: "Meeting Approval Workflow", entity_type: "Meeting", steps: "Draft → Secretary Review → Chairperson Approval → Published", trigger_event: "Meeting Created", status: "Active", created_at: NOW },
  { id: "2", workflow_id: "WF-002", workflow_name: "Minutes Approval Workflow", entity_type: "Minutes", steps: "Draft → Secretary Review → Chairperson Review → Member Review → Approved", trigger_event: "Minutes Created", status: "Active", created_at: NOW },
  { id: "3", workflow_id: "WF-003", workflow_name: "Board Pack Publication Workflow", entity_type: "Board Pack", steps: "Draft → Secretary Review → Chairperson Approval → Published", trigger_event: "Board Pack Created", status: "Active", created_at: NOW },
  { id: "4", workflow_id: "WF-004", workflow_name: "Action Item Completion Workflow", entity_type: "Action Item", steps: "Not Started → In Progress → Submitted → Reviewed → Completed", trigger_event: "Action Item Created", status: "Active", created_at: NOW },
  { id: "5", workflow_id: "WF-005", workflow_name: "Document Approval Workflow", entity_type: "Document", steps: "Draft → Review → Approved → Published", trigger_event: "Document Uploaded", status: "Active", created_at: NOW },
];

// ─── ApprovalRule ─────────────────────────────────────────────────────────────

export interface ApprovalRule extends EntityRecord {
  rule_id: string;
  rule_name: string;
  entity_type: string;
  approver_role: string;
  approval_condition: string;
  escalation_path: string;
  deadline_hours: string;
  status: string;
  created_at: string;
}

export const MOCK_APPROVAL_RULES: ApprovalRule[] = [
  { id: "1", rule_id: "AR-001", rule_name: "Meeting Chairperson Approval", entity_type: "Meeting", approver_role: "Chairperson", approval_condition: "All agenda items confirmed", escalation_path: "Board Secretary", deadline_hours: "48", status: "Active", created_at: NOW },
  { id: "2", rule_id: "AR-002", rule_name: "Minutes Secretary Sign-off", entity_type: "Minutes", approver_role: "Company Secretary", approval_condition: "Minutes draft complete", escalation_path: "Chairperson", deadline_hours: "72", status: "Active", created_at: NOW },
  { id: "3", rule_id: "AR-003", rule_name: "Board Pack CFO Clearance", entity_type: "Board Pack", approver_role: "CFO", approval_condition: "Financial documents included", escalation_path: "MD", deadline_hours: "24", status: "Active", created_at: NOW },
  { id: "4", rule_id: "AR-004", rule_name: "Action Completion CEO Review", entity_type: "Action Item", approver_role: "CEO/MD", approval_condition: "Completion evidence provided", escalation_path: "Board Secretary", deadline_hours: "120", status: "Active", created_at: NOW },
];

// ─── QuorumRule ───────────────────────────────────────────────────────────────

export type QuorumRuleType = "fixed_number" | "percentage" | "role_based";
export type LostQuorumAction = "pause" | "record" | "adjourn";

export interface QuorumRule extends EntityRecord {
  rule_id: string;
  governance_body_id: string;
  body_name: string;
  /** Legacy percent string (e.g., "50%"). Use minimum_percentage for calculations. */
  quorum_percent: string;
  calculation_basis: string;
  /** Legacy count string. Use minimum_members_count for calculations. */
  minimum_members: string;
  exception_rules: string;
  status: string;
  created_at: string;
  // ── Phase 1.1: normalized quorum rule fields ──────────────────────────────
  /** When set, this rule applies to a specific meeting rather than a governance body. */
  meeting_id?: string;
  /** Normalized rule type discriminant. */
  rule_type?: QuorumRuleType;
  /** Numeric minimum percentage (e.g., 50 for 50%). */
  minimum_percentage?: number;
  /** Numeric minimum member count. */
  minimum_members_count?: number;
  /** Role IDs that must be present for role-based quorum. */
  required_role_ids?: string[];
  /** Whether virtual / remote attendees count toward quorum. */
  count_virtual_attendance?: boolean;
  /** Whether alternate / proxy members count toward quorum. */
  count_alternate_members?: boolean;
  /** Whether recused members are excluded from quorum count. */
  exclude_recused_members?: boolean;
  /** What to do when quorum is lost mid-meeting. */
  lost_quorum_action?: LostQuorumAction;
  updated_at?: string;
  updated_by?: string;
}

export const MOCK_QUORUM_RULES: QuorumRule[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  rule_id: `QR-${padded(i + 1)}`,
  governance_body_id: `GB-${year}-${padded(i + 1)}`,
  body_name: GOVERNANCE_BODIES[i % GOVERNANCE_BODIES.length],
  quorum_percent: ["50%", "60%", "67%", "50%", "60%", "75%"][i],
  calculation_basis: ["Total Registered Members", "Voting Members Only"][i % 2],
  minimum_members: String(3 + i),
  exception_rules: i % 2 === 0 ? "Proxy votes count toward quorum." : "Remote participants included.",
  status: "Active",
  created_at: NOW,
}));

// ─── VotingMethod ─────────────────────────────────────────────────────────────

export interface VotingMethod extends EntityRecord {
  method_id: string;
  method_name: string;
  description: string;
  supports_majority: string;
  threshold: string;
  anonymous_voting: string;
  status: string;
  created_at: string;
}

export const MOCK_VOTING_METHODS: VotingMethod[] = [
  { id: "1", method_id: "VM-001", method_name: "Simple Majority", description: "More than 50% of votes cast.", supports_majority: "Yes", threshold: "50%+1", anonymous_voting: "No", status: "Active", created_at: NOW },
  { id: "2", method_id: "VM-002", method_name: "Two-Thirds Majority", description: "At least 66.7% of votes cast.", supports_majority: "Yes", threshold: "66.7%", anonymous_voting: "No", status: "Active", created_at: NOW },
  { id: "3", method_id: "VM-003", method_name: "Unanimous Consent", description: "All eligible voters must agree.", supports_majority: "Yes", threshold: "100%", anonymous_voting: "No", status: "Active", created_at: NOW },
  { id: "4", method_id: "VM-004", method_name: "Secret Ballot", description: "Anonymous written ballot.", supports_majority: "Yes", threshold: "50%+1", anonymous_voting: "Yes", status: "Active", created_at: NOW },
  { id: "5", method_id: "VM-005", method_name: "Show of Hands", description: "Visual vote by raising hands.", supports_majority: "Yes", threshold: "50%+1", anonymous_voting: "No", status: "Active", created_at: NOW },
];

// ─── NotificationRule ────────────────────────────────────────────────────────

export interface NotificationRule extends EntityRecord {
  rule_id: string;
  rule_name: string;
  entity_type: string;
  trigger_event: string;
  channels: string;
  recipients: string;
  timing: string;
  template: string;
  status: string;
  created_at: string;
}

export const MOCK_NOTIFICATION_RULES: NotificationRule[] = [
  { id: "1", rule_id: "NR-001", rule_name: "Meeting Invitation", entity_type: "Meeting", trigger_event: "Meeting Published", channels: "Email, In-App", recipients: "All Participants", timing: "Immediately", template: "meeting-invitation", status: "Active", created_at: NOW },
  { id: "2", rule_id: "NR-002", rule_name: "Meeting Reminder — 3 Days", entity_type: "Meeting", trigger_event: "Meeting Date Approaching", channels: "Email, SMS", recipients: "All Participants", timing: "3 days before", template: "meeting-reminder", status: "Active", created_at: NOW },
  { id: "3", rule_id: "NR-003", rule_name: "Board Pack Available", entity_type: "Board Pack", trigger_event: "Board Pack Published", channels: "Email, In-App", recipients: "All Participants", timing: "Immediately", template: "board-pack-notice", status: "Active", created_at: NOW },
  { id: "4", rule_id: "NR-004", rule_name: "Action Item Due Reminder", entity_type: "Action Item", trigger_event: "Due Date Approaching", channels: "Email, In-App", recipients: "Action Owner", timing: "2 days before", template: "action-reminder", status: "Active", created_at: NOW },
  { id: "5", rule_id: "NR-005", rule_name: "Minutes Approval Request", entity_type: "Minutes", trigger_event: "Minutes Ready for Approval", channels: "Email", recipients: "Chairperson, Secretary", timing: "Immediately", template: "minutes-approval", status: "Active", created_at: NOW },
];

// ─── DeliveryRecord ───────────────────────────────────────────────────────────

export interface DeliveryRecord extends EntityRecord {
  record_id: string;
  notification_rule_id: string;
  rule_name: string;
  recipient: string;
  channel: string;
  sent_at: string;
  delivery_status: string;
  opened_at: string;
  entity_type: string;
  entity_id: string;
}

export const MOCK_DELIVERY_RECORDS: DeliveryRecord[] = Array.from({ length: 16 }, (_, i) => ({
  id: String(i + 1),
  record_id: `DR-${year}-${padded(i + 1)}`,
  notification_rule_id: `NR-00${(i % 5) + 1}`,
  rule_name: ["Meeting Invitation", "Meeting Reminder — 3 Days", "Board Pack Available", "Action Item Due Reminder", "Minutes Approval Request"][i % 5],
  recipient: ["Mohammed Ali Rahman", "Fatima Begum", "Karim Ahmed", "Nasrin Akter", "Rashid Hassan"][i % 5],
  channel: ["Email", "In-App", "SMS"][i % 3],
  sent_at: NOW,
  delivery_status: ["Delivered", "Opened", "Pending", "Failed"][i % 4],
  opened_at: i % 4 === 1 ? NOW : "",
  entity_type: ["Meeting", "Board Pack", "Action Item", "Minutes"][i % 4],
  entity_id: `${["MTG", "BP", "ACT", "MIN"][i % 4]}-${year}-${padded((i % 12) + 1)}`,
}));

// ─── AuditEvent ───────────────────────────────────────────────────────────────

export interface AuditEvent extends EntityRecord {
  event_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor: string;
  actor_role: string;
  timestamp: string;
  ip_address: string;
  details: string;
  approval_status: string;
}

export const MOCK_AUDIT_EVENTS: AuditEvent[] = [...Array.from({ length: 20 }, (_, i) => ({
  id: String(i + 1),
  event_id: `AUD-${year}-${padded(i + 1)}`,
  entity_type: ["Meeting", "Decision", "Resolution", "Action Item", "Board Pack", "Document", "Minutes", "User"][i % 8],
  entity_id: `${["MTG", "DEC", "RES", "ACT", "BP", "DOC", "MIN", "USR"][i % 8]}-${year}-${padded((i % 12) + 1)}`,
  action: ["Created", "Updated", "Approved", "Published", "Deleted", "Viewed", "Exported"][i % 7],
  actor: ["Mohammed Ali Rahman", "Fatima Begum", "Karim Ahmed", "Admin User", "System"][i % 5],
  actor_role: ["Board Member", "Company Secretary", "CFO", "System Admin", "System"][i % 5],
  timestamp: NOW,
  ip_address: `192.168.1.${(i % 254) + 1}`,
  details: `${["Meeting", "Decision", "Resolution", "Action Item", "Board Pack", "Document", "Minutes", "User"][i % 8]} record ${["created", "updated", "approved", "published"][i % 4]} by authorized user.`,
  approval_status: "Logged",
})),
  { id: "emg-aud1", event_id: `AUD-${year}-0101`, meeting_id: EMG_MID, entity_type: "Meeting",  entity_id: EMG_MID,          action: "Created",  actor: "Ms. Nasrin Sultana",  actor_role: "Company Secretary", timestamp: `${year}-02-10T17:45:00Z`, ip_address: "10.1.2.51", details: "Emergency Board Meeting created and notice circulated to all committee members.", approval_status: "Logged" },
  { id: "emg-aud2", event_id: `AUD-${year}-0102`, meeting_id: EMG_MID, entity_type: "Meeting",  entity_id: EMG_MID,          action: "Started",  actor: "Mr. Md. Nurul Amin",  actor_role: "Chairperson",       timestamp: `${EMG_DATE}T09:05:00Z`,  ip_address: "10.1.2.10", details: "Meeting opened. Quorum declared with 5 of 8 eligible members present.", approval_status: "Logged" },
  { id: "emg-aud3", event_id: `AUD-${year}-0103`, meeting_id: EMG_MID, entity_type: "Motion",   entity_id: "mot-001",        action: "Tabled",   actor: "Mr. Md. Nurul Amin",  actor_role: "Chairperson",       timestamp: `${EMG_DATE}T10:14:00Z`,  ip_address: "10.1.2.10", details: "Motion to accept Emergency Internal Audit Report tabled for vote.", approval_status: "Logged" },
  { id: "emg-aud4", event_id: `AUD-${year}-0104`, meeting_id: EMG_MID, entity_type: "Motion",   entity_id: "mot-001",        action: "Passed",   actor: "Ms. Nasrin Sultana",  actor_role: "Company Secretary", timestamp: `${EMG_DATE}T10:20:00Z`,  ip_address: "10.1.2.51", details: "Motion passed: 5 For, 0 Against, 1 Abstention.", approval_status: "Logged" },
  { id: "emg-aud5", event_id: `AUD-${year}-0105`, meeting_id: EMG_MID, entity_type: "Decision", entity_id: "emg-d1",         action: "Recorded", actor: "Ms. Nasrin Sultana",  actor_role: "Company Secretary", timestamp: `${EMG_DATE}T10:22:00Z`,  ip_address: "10.1.2.51", details: "Decision DEC-2026-0101 recorded: Accept Emergency Audit Report.", approval_status: "Logged" },
  { id: "emg-aud6", event_id: `AUD-${year}-0106`, meeting_id: EMG_MID, entity_type: "Motion",   entity_id: "mot-002",        action: "Passed",   actor: "Ms. Nasrin Sultana",  actor_role: "Company Secretary", timestamp: `${EMG_DATE}T11:08:00Z`,  ip_address: "10.1.2.51", details: "Motion passed unanimously: Approve Management Remediation Plan. 6 For, 0 Against.", approval_status: "Logged" },
  { id: "emg-aud7", event_id: `AUD-${year}-0107`, meeting_id: EMG_MID, entity_type: "Motion",   entity_id: "mot-003",        action: "Passed",   actor: "Ms. Nasrin Sultana",  actor_role: "Company Secretary", timestamp: `${EMG_DATE}T11:35:00Z`,  ip_address: "10.1.2.51", details: "Motion passed unanimously: Resolution on Immediate Corrective Actions. 6 For, 0 Against.", approval_status: "Logged" },
  { id: "emg-aud8", event_id: `AUD-${year}-0108`, meeting_id: EMG_MID, entity_type: "Meeting",  entity_id: EMG_MID,          action: "Closed",   actor: "Mr. Md. Nurul Amin",  actor_role: "Chairperson",       timestamp: `${EMG_DATE}T11:55:00Z`,  ip_address: "10.1.2.10", details: "Meeting adjourned at 11:55 AM by the Chairperson.", approval_status: "Logged" },
  { id: "emg-aud9", event_id: `AUD-${year}-0109`, meeting_id: EMG_MID, entity_type: "Minutes",  entity_id: "min-001",        action: "Created",  actor: "Mr. Rafiqul Islam",   actor_role: "Minute Taker",      timestamp: `${EMG_DATE}T13:30:00Z`,  ip_address: "10.1.2.34", details: "Minutes of Emergency Board Meeting drafted and submitted for review.", approval_status: "Logged" },
  { id: "emg-aud10",event_id: `AUD-${year}-0110`, meeting_id: EMG_MID, entity_type: "Action",   entity_id: "emg-act5",       action: "Completed",actor: "Ms. Nasrin Sultana",  actor_role: "Company Secretary", timestamp: `${year}-02-12T16:00:00Z`, ip_address: "10.1.2.51", details: "Action ACT-2026-0105 completed: Action plan circulated to all Board members on 12 Feb 2026.", approval_status: "Logged" },
];

// ─── Additional Registry Hooks ────────────────────────────────────────────────

export const useAvailabilityPollRegistry   = createEntityRegistry<AvailabilityPoll>  ("bms.polls",           "bms:polls-updated",          MOCK_AVAILABILITY_POLLS);
export const useParticipantGroupRegistry   = createEntityRegistry<ParticipantGroup>  ("bms.partgroups",      "bms:partgroups-updated",      MOCK_PARTICIPANT_GROUPS);
export const useMeetingTemplateRegistry    = createEntityRegistry<MeetingTemplate>   ("bms.templates",       "bms:templates-updated",       MOCK_MEETING_TEMPLATES);
export const useGovernanceMembershipRegistry = createEntityRegistry<GovernanceMembership>("bms.memberships", "bms:memberships-updated",     MOCK_GOVERNANCE_MEMBERSHIPS);
export const useOrgUnitRegistry            = createEntityRegistry<OrgUnit>           ("bms.orgunits",        "bms:orgunits-updated",        MOCK_ORG_UNITS);
export const useUnitHeadRegistry           = createEntityRegistry<UnitHeadAssignment>("bms.unitheads",       "bms:unitheads-updated",       MOCK_UNIT_HEAD_ASSIGNMENTS);
export const useDocumentVersionRegistry    = createEntityRegistry<DocumentVersion>   ("bms.docversions",     "bms:docversions-updated",     MOCK_DOCUMENT_VERSIONS);
export const useBoardPackVersionRegistry   = createEntityRegistry<BoardPackVersion>  ("bms.packversions",    "bms:packversions-updated",    MOCK_BOARD_PACK_VERSIONS);
export const useQuestionResponseRegistry   = createEntityRegistry<QuestionResponse>  ("bms.qresponses",      "bms:qresponses-updated",      MOCK_QUESTION_RESPONSES);
export const useProgressUpdateRegistry     = createEntityRegistry<ProgressUpdate>    ("bms.progressupdates", "bms:progressupdates-updated", MOCK_PROGRESS_UPDATES);
export const useExtensionRequestRegistry   = createEntityRegistry<ExtensionRequest>  ("bms.extensions",      "bms:extensions-updated",      MOCK_EXTENSION_REQUESTS);
export const useCompletionReviewRegistry   = createEntityRegistry<CompletionReview>  ("bms.completions",     "bms:completions-updated",     MOCK_COMPLETION_REVIEWS);
export const useMinutesVersionRegistry     = createEntityRegistry<MinutesVersion>    ("bms.minversions",     "bms:minversions-updated",     MOCK_MINUTES_VERSIONS);
export const useMinutesAmendmentRegistry   = createEntityRegistry<MinutesAmendment>  ("bms.amendments",      "bms:amendments-updated",      MOCK_MINUTES_AMENDMENTS);
export const useWorkflowRegistry           = createEntityRegistry<Workflow>          ("bms.workflows",       "bms:workflows-updated",       MOCK_WORKFLOWS);
export const useApprovalRuleRegistry       = createEntityRegistry<ApprovalRule>      ("bms.approvalrules",   "bms:approvalrules-updated",   MOCK_APPROVAL_RULES);
export const useQuorumRuleRegistry         = createEntityRegistry<QuorumRule>        ("bms.quorumrules",     "bms:quorumrules-updated",     MOCK_QUORUM_RULES);
export const useVotingMethodRegistry       = createEntityRegistry<VotingMethod>      ("bms.votingmethods",   "bms:votingmethods-updated",   MOCK_VOTING_METHODS);
export const useNotificationRuleRegistry   = createEntityRegistry<NotificationRule>  ("bms.notifyrules",     "bms:notifyrules-updated",     MOCK_NOTIFICATION_RULES);
export const useDeliveryRecordRegistry     = createEntityRegistry<DeliveryRecord>    ("bms.deliveries",      "bms:deliveries-updated",      MOCK_DELIVERY_RECORDS);
export const useAuditEventRegistry         = createEntityRegistry<AuditEvent>        ("bms.audit",           "bms:audit-updated",           MOCK_AUDIT_EVENTS);

// ─── Phase 1.1: Relationship records ─────────────────────────────────────────
// These link existing entities without copying data. All use the same
// createEntityRegistry pattern with bms.* storage keys.

// ── AgendaDocumentLink ────────────────────────────────────────────────────────

export interface AgendaDocumentLink extends EntityRecord {
  agenda_id: string;
  document_id: string;
  document_version_id?: string;
  linked_at: string;
  linked_by: string;
  is_primary?: boolean;
  display_order?: number;
}

const SEED_AGENDA_DOC_LINKS: AgendaDocumentLink[] = [
  // AGD-0035: Confirmation of Previous Meeting Minutes
  { id: "agdl-001", agenda_id: `AGD-${year}-0035`, document_id: "mtg10-d1", linked_at: NOW, linked_by: "Company Secretary", is_primary: true,  display_order: 1 },
  { id: "agdl-002", agenda_id: `AGD-${year}-0035`, document_id: "mtg10-d2", linked_at: NOW, linked_by: "Company Secretary", is_primary: false, display_order: 2 },
  // AGD-0036: Executive Performance Review Q2 2026
  { id: "agdl-003", agenda_id: `AGD-${year}-0036`, document_id: "mtg10-d3", linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-004", agenda_id: `AGD-${year}-0036`, document_id: "1",        linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 2 },
  { id: "agdl-005", agenda_id: `AGD-${year}-0036`, document_id: "8",        linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 3 },
  // AGD-0010: Board Remuneration Review
  { id: "agdl-006", agenda_id: `AGD-${year}-0010`, document_id: "10",       linked_at: NOW, linked_by: "Company Secretary", is_primary: true,  display_order: 1 },
  { id: "agdl-007", agenda_id: `AGD-${year}-0010`, document_id: "mtg10-d4", linked_at: NOW, linked_by: "Company Secretary", is_primary: false, display_order: 2 },
  // AGD-0037: Strategic Initiative Progress Report
  { id: "agdl-008", agenda_id: `AGD-${year}-0037`, document_id: "mtg10-d5", linked_at: NOW, linked_by: "MD", is_primary: true,  display_order: 1 },
  { id: "agdl-009", agenda_id: `AGD-${year}-0037`, document_id: "7",        linked_at: NOW, linked_by: "MD", is_primary: false, display_order: 2 },
  { id: "agdl-010", agenda_id: `AGD-${year}-0037`, document_id: "5",        linked_at: NOW, linked_by: "MD", is_primary: false, display_order: 3 },
  // Child items — Special Board Meeting
  { id: "agdl-011", agenda_id: `AGD-${year}-0201`, document_id: "mtg10-d2", linked_at: NOW, linked_by: "Company Secretary", is_primary: true,  display_order: 1 },
  { id: "agdl-012", agenda_id: `AGD-${year}-0202`, document_id: "mtg10-d1", linked_at: NOW, linked_by: "Company Secretary", is_primary: true,  display_order: 1 },
  { id: "agdl-013", agenda_id: `AGD-${year}-0203`, document_id: "mtg10-d3", linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-014", agenda_id: `AGD-${year}-0203`, document_id: "1",        linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 2 },
  { id: "agdl-015", agenda_id: `AGD-${year}-0204`, document_id: "8",        linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-016", agenda_id: `AGD-${year}-0205`, document_id: "2",        linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-017", agenda_id: `AGD-${year}-0205`, document_id: "6",        linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 2 },
  { id: "agdl-018", agenda_id: `AGD-${year}-0206`, document_id: "10",       linked_at: NOW, linked_by: "Company Secretary", is_primary: true,  display_order: 1 },
  { id: "agdl-019", agenda_id: `AGD-${year}-0206`, document_id: "mtg10-d4", linked_at: NOW, linked_by: "Company Secretary", is_primary: false, display_order: 2 },
  { id: "agdl-020", agenda_id: `AGD-${year}-0207`, document_id: "mtg10-d4", linked_at: NOW, linked_by: "Company Secretary", is_primary: true,  display_order: 1 },
  { id: "agdl-021", agenda_id: `AGD-${year}-0207`, document_id: "10",       linked_at: NOW, linked_by: "Company Secretary", is_primary: false, display_order: 2 },
  { id: "agdl-022", agenda_id: `AGD-${year}-0208`, document_id: "mtg10-d5", linked_at: NOW, linked_by: "MD", is_primary: true,  display_order: 1 },
  { id: "agdl-023", agenda_id: `AGD-${year}-0208`, document_id: "3",        linked_at: NOW, linked_by: "MD", is_primary: false, display_order: 2 },
  { id: "agdl-024", agenda_id: `AGD-${year}-0209`, document_id: "7",        linked_at: NOW, linked_by: "MD", is_primary: true,  display_order: 1 },
  { id: "agdl-025", agenda_id: `AGD-${year}-0210`, document_id: "5",        linked_at: NOW, linked_by: "MD", is_primary: true,  display_order: 1 },
  { id: "agdl-026", agenda_id: `AGD-${year}-0210`, document_id: "9",        linked_at: NOW, linked_by: "MD", is_primary: false, display_order: 2 },
  // Child items — 344th BoD Meeting
  { id: "agdl-027", agenda_id: `AGD-${year}-0211`, document_id: "mtg10-d2", linked_at: NOW, linked_by: "Company Secretary", is_primary: true,  display_order: 1 },
  { id: "agdl-028", agenda_id: `AGD-${year}-0212`, document_id: "mtg10-d1", linked_at: NOW, linked_by: "Company Secretary", is_primary: true,  display_order: 1 },
  { id: "agdl-029", agenda_id: `AGD-${year}-0213`, document_id: "1",        linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-030", agenda_id: `AGD-${year}-0213`, document_id: "8",        linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 2 },
  { id: "agdl-031", agenda_id: `AGD-${year}-0214`, document_id: "2",        linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-032", agenda_id: `AGD-${year}-0214`, document_id: "6",        linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 2 },
  { id: "agdl-033", agenda_id: `AGD-${year}-0215`, document_id: "4",        linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-034", agenda_id: `AGD-${year}-0216`, document_id: "3",        linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-035", agenda_id: `AGD-${year}-0216`, document_id: "11",       linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 2 },
  { id: "agdl-036", agenda_id: `AGD-${year}-0217`, document_id: "5",        linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-037", agenda_id: `AGD-${year}-0217`, document_id: "12",       linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 2 },
  { id: "agdl-038", agenda_id: `AGD-${year}-0218`, document_id: "9",        linked_at: NOW, linked_by: "Head of Compliance", is_primary: true,  display_order: 1 },
  { id: "agdl-039", agenda_id: `AGD-${year}-0219`, document_id: "13",       linked_at: NOW, linked_by: "Head of Compliance", is_primary: true,  display_order: 1 },
  { id: "agdl-040", agenda_id: `AGD-${year}-0219`, document_id: "9",        linked_at: NOW, linked_by: "Head of Compliance", is_primary: false, display_order: 2 },
  // Parent items — 344th BoD (AGD-0021 to 0025) doc links
  { id: "agdl-041", agenda_id: `AGD-${year}-0021`, document_id: "mtg10-d1", linked_at: NOW, linked_by: "Company Secretary", is_primary: true,  display_order: 1 },
  { id: "agdl-042", agenda_id: `AGD-${year}-0022`, document_id: "mtg10-d2", linked_at: NOW, linked_by: "Company Secretary", is_primary: true,  display_order: 1 },
  { id: "agdl-043", agenda_id: `AGD-${year}-0022`, document_id: "mtg10-d1", linked_at: NOW, linked_by: "Company Secretary", is_primary: false, display_order: 2 },
  { id: "agdl-044", agenda_id: `AGD-${year}-0023`, document_id: "1",        linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-045", agenda_id: `AGD-${year}-0023`, document_id: "8",        linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 2 },
  { id: "agdl-046", agenda_id: `AGD-${year}-0023`, document_id: "2",        linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 3 },
  { id: "agdl-047", agenda_id: `AGD-${year}-0024`, document_id: "3",        linked_at: NOW, linked_by: "CFO", is_primary: true,  display_order: 1 },
  { id: "agdl-048", agenda_id: `AGD-${year}-0024`, document_id: "11",       linked_at: NOW, linked_by: "CFO", is_primary: false, display_order: 2 },
  { id: "agdl-049", agenda_id: `AGD-${year}-0025`, document_id: "9",        linked_at: NOW, linked_by: "Head of Compliance", is_primary: true,  display_order: 1 },
  { id: "agdl-050", agenda_id: `AGD-${year}-0025`, document_id: "13",       linked_at: NOW, linked_by: "Head of Compliance", is_primary: false, display_order: 2 },
];

export const useAgendaDocumentLinkRegistry = createEntityRegistry<AgendaDocumentLink>(
  "bms.agendaDocumentLinks",
  "bms:agendaDocumentLinks-updated",
  SEED_AGENDA_DOC_LINKS,
);

// ── MeetingDocumentLink ───────────────────────────────────────────────────────

export interface MeetingDocumentLink extends EntityRecord {
  meeting_id: string;
  document_id: string;
  version: string;
  source: "agenda" | "additional";
  source_agenda_id?: string;
  display_order: number;
  added_by: string;
  added_at: string;
}

export const useMeetingDocumentLinkRegistry = createEntityRegistry<MeetingDocumentLink>(
  "bms.meetingDocumentLinks",
  "bms:meetingDocumentLinks-updated",
  [],
);

// ── MeetingAgendaLink ─────────────────────────────────────────────────────────

export interface MeetingAgendaLink extends EntityRecord {
  meeting_id: string;
  agenda_id: string;
  display_order: number;
  added_at: string;
  added_by: string;
}

const SEED_MEETING_AGENDA_LINKS: MeetingAgendaLink[] = [
  // Special Board Meeting (MTG-2026-0010) — six ordered agenda items
  { id: "mal-001", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0034`, display_order: 1, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-002", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0035`, display_order: 2, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-003", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0036`, display_order: 3, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-004", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0010`, display_order: 4, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-005", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0037`, display_order: 5, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-006", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0038`, display_order: 6, added_at: NOW, added_by: "Company Secretary" },
  // Emergency Board Meeting (MTG-2026-0011) — five ordered agenda items
  { id: "mal-011", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0039`, display_order: 1, added_at: `${EMG_DATE}T08:00:00Z`, added_by: "Company Secretary" },
  { id: "mal-012", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0040`, display_order: 2, added_at: `${EMG_DATE}T08:00:00Z`, added_by: "Company Secretary" },
  { id: "mal-013", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0041`, display_order: 3, added_at: `${EMG_DATE}T08:00:00Z`, added_by: "Company Secretary" },
  { id: "mal-014", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0042`, display_order: 4, added_at: `${EMG_DATE}T08:00:00Z`, added_by: "Company Secretary" },
  { id: "mal-015", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0043`, display_order: 5, added_at: `${EMG_DATE}T08:00:00Z`, added_by: "Company Secretary" },
  // 344th Board of Directors Meeting — Q3 Session (MTG-2026-0013) — eight agenda items
  { id: "mal-021", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0021`, display_order: 1, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-022", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0022`, display_order: 2, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-023", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0023`, display_order: 3, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-024", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0024`, display_order: 4, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-025", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0025`, display_order: 5, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-026", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0053`, display_order: 6, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-027", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0054`, display_order: 7, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-028", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0055`, display_order: 8, added_at: NOW, added_by: "Company Secretary" },
  // 57th Audit Committee Meeting (MTG-2026-0014) — six agenda items
  { id: "mal-031", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0044`, display_order: 1, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-032", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0045`, display_order: 2, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-033", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0026`, display_order: 3, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-034", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0027`, display_order: 4, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-035", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0046`, display_order: 5, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-036", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0047`, display_order: 6, added_at: NOW, added_by: "Company Secretary" },
  // 43rd Risk Management Committee Meeting (MTG-2026-0015) — seven agenda items
  { id: "mal-041", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0048`, display_order: 1, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-042", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0049`, display_order: 2, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-043", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0028`, display_order: 3, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-044", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0029`, display_order: 4, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-045", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0050`, display_order: 5, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-046", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0051`, display_order: 6, added_at: NOW, added_by: "Company Secretary" },
  { id: "mal-047", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0052`, display_order: 7, added_at: NOW, added_by: "Company Secretary" },
];

export const useMeetingAgendaLinkRegistry = createEntityRegistry<MeetingAgendaLink>(
  "bms.meetingAgendaLinks",
  "bms:meetingAgendaLinks-updated",
  SEED_MEETING_AGENDA_LINKS,
);

// ── MeetingParticipantLink ────────────────────────────────────────────────────

export type ParticipantSelectionSourceType =
  | "individual"
  | "branch"
  | "division"
  | "department"
  | "group";

export interface MeetingParticipantLink extends EntityRecord {
  meeting_id: string;
  user_id: string;
  participant_type: string;
  /** Primary source type (backward-compatible single-source field). */
  selection_source_type: ParticipantSelectionSourceType;
  /** Primary source ID (backward-compatible). */
  selection_source_id?: string;
  /** All sources as JSON — persists the full DraftParticipantLink.selection_sources array. */
  selection_sources_json?: string;
  /** Quorum vs general membership category. */
  member_category?: "quorum" | "general";
  quorum_eligible: boolean;
  voting_eligible: boolean;
  is_required: boolean;
  invitation_status: "pending" | "accepted" | "declined" | "tentative";
}

export const useMeetingParticipantLinkRegistry = createEntityRegistry<MeetingParticipantLink>(
  "bms.meetingParticipantLinks",
  "bms:meetingParticipantLinks-updated",
  [],
);

// ─── Phase 1.1: Live-meeting records ─────────────────────────────────────────

// ── LiveMeetingSession ────────────────────────────────────────────────────────

export type LiveSessionStatus = "not_started" | "active" | "paused" | "ended";
export type LiveCaptureStatus = "not_started" | "active" | "paused" | "ended";
export type MinutesCaptureStatus = "not_started" | "active" | "completed";

export interface LiveMeetingSession extends EntityRecord {
  meeting_id: string;
  started_at?: string;
  started_by?: string;
  ended_at?: string;
  ended_by?: string;
  session_status: LiveSessionStatus;
  recording_status: LiveCaptureStatus;
  transcription_status: LiveCaptureStatus;
  minutes_capture_status: MinutesCaptureStatus;
}

const SEED_LIVE_SESSIONS: LiveMeetingSession[] = [
  {
    id: "sess-emg-001",
    meeting_id: EMG_MID,
    started_at: EMG_START,
    started_by: "Mr. Md. Nurul Amin",
    ended_at: EMG_END,
    ended_by: "Mr. Md. Nurul Amin",
    session_status: "ended",
    recording_status: "ended",
    transcription_status: "ended",
    minutes_capture_status: "completed",
  },
  // Special Board Meeting — currently active (in progress)
  {
    id: "sess-sbm-010",
    meeting_id: `MTG-${year}-0010`,
    started_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    started_by: "Mr. Abdul Awal Mintoo",
    session_status: "active",
    recording_status: "active",
    transcription_status: "active",
    minutes_capture_status: "active",
  },
  // 344th Board Meeting — currently active (in progress)
  {
    id: "sess-bod-013",
    meeting_id: `MTG-${year}-0013`,
    started_at: new Date(Date.now() - 90 * 60000).toISOString(),
    started_by: "Mr. Abdul Awal Mintoo",
    session_status: "active",
    recording_status: "active",
    transcription_status: "active",
    minutes_capture_status: "active",
  },
  // 57th Audit Committee Meeting — paused
  {
    id: "sess-aud-014",
    meeting_id: `MTG-${year}-0014`,
    started_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    started_by: "Mr. Md. Abul Bashar",
    session_status: "paused",
    recording_status: "paused",
    transcription_status: "paused",
    minutes_capture_status: "active",
  },
];

export const useLiveMeetingSessionRegistry = createEntityRegistry<LiveMeetingSession>(
  "bms.liveSessions",
  "bms:liveSessions-updated",
  SEED_LIVE_SESSIONS,
);

// ── MeetingInteraction ────────────────────────────────────────────────────────

export type MeetingInteractionType =
  | "join"
  | "leave"
  | "chat"
  | "comment"
  | "vote"
  | "motion"
  | "decision"
  | "document_view"
  | "document_upload"
  | "agenda_change"
  | "host_action"
  | "quorum_change";

export interface MeetingInteraction extends EntityRecord {
  meeting_id: string;
  agenda_id?: string;
  user_id: string;
  interaction_type: MeetingInteractionType;
  content?: string;
  metadata?: Record<string, unknown>;
}

const SEED_INTERACTIONS: MeetingInteraction[] = [
  // Join / Leave events
  { id: "int-001", meeting_id: EMG_MID, user_id: "Ms. Nasrin Sultana",   interaction_type: "join",     content: "Joined the meeting",                                                                   created_at: `${EMG_DATE}T08:50:00Z` },
  { id: "int-002", meeting_id: EMG_MID, user_id: "Mr. Rafiqul Islam",    interaction_type: "join",     content: "Joined the meeting",                                                                   created_at: `${EMG_DATE}T08:45:00Z` },
  { id: "int-003", meeting_id: EMG_MID, user_id: "Mr. Md. Nurul Amin",   interaction_type: "join",     content: "Chairperson joined and called meeting to order",                                       created_at: `${EMG_DATE}T09:04:00Z` },
  { id: "int-004", meeting_id: EMG_MID, user_id: "Mr. Zahir Uddin",      interaction_type: "join",     content: "Joined the meeting",                                                                   created_at: `${EMG_DATE}T09:02:00Z` },
  { id: "int-005", meeting_id: EMG_MID, user_id: "Mr. Md. Abul Bashar",  interaction_type: "join",     content: "Joined the meeting",                                                                   created_at: `${EMG_DATE}T09:06:00Z` },
  { id: "int-006", meeting_id: EMG_MID, user_id: "Dr. Aminul Haque",     interaction_type: "join",     content: "Joined the meeting",                                                                   created_at: `${EMG_DATE}T09:10:00Z` },
  { id: "int-007", meeting_id: EMG_MID, user_id: "Ms. Fatema Begum",     interaction_type: "join",     content: "Arrived — delayed due to traffic",                                                     created_at: `${EMG_DATE}T09:28:00Z` },
  { id: "int-008", meeting_id: EMG_MID, user_id: "Mr. Zahir Uddin",      interaction_type: "leave",    content: "Excused after completing audit presentation",                                          created_at: `${EMG_DATE}T10:30:00Z` },
  { id: "int-009", meeting_id: EMG_MID, user_id: "Mr. Kamal Hossain",    interaction_type: "join",     content: "Joined for Agenda Item 3 — Management Response",                                      created_at: `${EMG_DATE}T10:35:00Z` },
  { id: "int-010", meeting_id: EMG_MID, user_id: "Dr. Aminul Haque",     interaction_type: "leave",    content: "Excused — prior commitment",                                                           created_at: `${EMG_DATE}T11:50:00Z` },
  // Chat messages
  { id: "int-011", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0040`, user_id: "Mr. Md. Abul Bashar",  interaction_type: "chat", content: "Can we get the full remediation timeline in writing before we vote?",              created_at: `${EMG_DATE}T10:05:00Z` },
  { id: "int-012", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0040`, user_id: "Mr. Zahir Uddin",      interaction_type: "chat", content: "The critical finding on loan disbursement has an immediate interim control activated as of yesterday.",  created_at: `${EMG_DATE}T10:08:00Z` },
  { id: "int-013", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0040`, user_id: "Dr. Aminul Haque",     interaction_type: "chat", content: "What is the estimated financial exposure from finding 1?",                        created_at: `${EMG_DATE}T10:12:00Z` },
  { id: "int-014", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0040`, user_id: "Mr. Zahir Uddin",      interaction_type: "chat", content: "Estimated exposure is ৳12.5M based on transactions reviewed in the period.",      created_at: `${EMG_DATE}T10:13:00Z` },
  { id: "int-015", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0041`, user_id: "Ms. Fatema Begum",     interaction_type: "chat", content: "I'd like to see monthly progress reports, not just one at the next scheduled meeting.",  created_at: `${EMG_DATE}T10:48:00Z` },
  { id: "int-016", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0041`, user_id: "Ms. Nasrin Sultana",   interaction_type: "chat", content: "Noted. Will update the remediation plan to include monthly reporting.",             created_at: `${EMG_DATE}T10:50:00Z` },
  { id: "int-017", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0042`, user_id: "Mr. Md. Nurul Amin",   interaction_type: "chat", content: "The Company Secretary will circulate the action plan within 48 hours of this meeting.",  created_at: `${EMG_DATE}T11:40:00Z` },
  // Transcription / comments
  { id: "int-018", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0039`, user_id: "Mr. Md. Nurul Amin",   interaction_type: "comment", content: "I call this emergency meeting to order. Quorum has been confirmed by the Company Secretary. We have a single primary purpose today — to review and act on the emergency audit findings. I expect frank discussion and decisive action.",  created_at: `${EMG_DATE}T09:05:00Z` },
  { id: "int-019", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0040`, user_id: "Mr. Zahir Uddin",      interaction_type: "comment", content: "The emergency report identifies four findings: one Critical relating to segregation of duties in loan disbursement, two High relating to AML monitoring delays and IT access controls, and one Medium relating to credit documentation. The Critical finding was identified during a routine transaction review and escalated immediately per audit protocol.",  created_at: `${EMG_DATE}T09:15:00Z` },
  { id: "int-020", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0040`, user_id: "Mr. Md. Abul Bashar",  interaction_type: "comment", content: "I have to say, the IT finding concerns me greatly. Former employee accounts remaining active is a basic control failure. How long has this been the case and has IT confirmed all 23 accounts are now disabled?",  created_at: `${EMG_DATE}T09:45:00Z` },
  { id: "int-021", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0040`, user_id: "Mr. Zahir Uddin",      interaction_type: "comment", content: "All 23 accounts were disabled as of the 9th of February. We have the deactivation logs. The root cause was a breakdown in the HR-IT offboarding communication process. The finding covers a window of approximately 47 days.",  created_at: `${EMG_DATE}T09:48:00Z` },
  { id: "int-022", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0041`, user_id: "Mr. Kamal Hossain",    interaction_type: "comment", content: "Management has prepared a full remediation plan. For the Critical finding, we have already implemented segregation by requiring dual authorisation for all disbursements above ৳500,000 effective immediately. The formal system control is expected to be in place within 15 business days.",  created_at: `${EMG_DATE}T10:40:00Z` },
  { id: "int-023", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0041`, user_id: "Dr. Aminul Haque",     interaction_type: "comment", content: "I move that the remediation plan be approved as presented, with the addition of monthly progress reports to the Audit Committee.",  created_at: `${EMG_DATE}T10:58:00Z` },
  { id: "int-024", meeting_id: EMG_MID, agenda_id: `AGD-${year}-0043`, user_id: "Mr. Md. Nurul Amin",   interaction_type: "comment", content: "I want to commend the Internal Audit team for the timely identification and escalation of these risks. It is a mark of a healthy audit function. This Board expects full resolution within the agreed timelines. The next quarterly meeting will include a standing agenda item for audit remediation progress. Meeting is adjourned.",  created_at: `${EMG_DATE}T11:52:00Z` },
  // System events
  { id: "int-025", meeting_id: EMG_MID, user_id: "System", interaction_type: "quorum_change",  content: "Quorum status updated: 5 of 4 required members present — QUORUM MET",                                          created_at: `${EMG_DATE}T09:08:00Z` },
  { id: "int-026", meeting_id: EMG_MID, user_id: "System", interaction_type: "agenda_change",  content: "Meeting moved to Agenda Item 2: Review of Internal Audit Emergency Report",                                   created_at: `${EMG_DATE}T09:13:00Z` },
  { id: "int-027", meeting_id: EMG_MID, user_id: "System", interaction_type: "agenda_change",  content: "Meeting moved to Agenda Item 3: Management Letter Response & Remediation Plan",                               created_at: `${EMG_DATE}T10:35:00Z` },
  { id: "int-028", meeting_id: EMG_MID, user_id: "System", interaction_type: "host_action",    content: "Recording stopped — Agenda Item 2 concluded",                                                                  created_at: `${EMG_DATE}T10:32:00Z` },
  { id: "int-029", meeting_id: EMG_MID, user_id: "System", interaction_type: "agenda_change",  content: "Meeting moved to Agenda Item 4: Resolution on Immediate Corrective Actions",                                  created_at: `${EMG_DATE}T11:20:00Z` },
  { id: "int-030", meeting_id: EMG_MID, user_id: "System", interaction_type: "agenda_change",  content: "Meeting moved to Agenda Item 5: Any Other Business & Closure",                                                 created_at: `${EMG_DATE}T11:48:00Z` },

  // ── Special Board Meeting (MTG-2026-0010) — Interactions ─────────────────
  { id: "int-101", meeting_id: `MTG-${year}-0010`, user_id: "Ms. Nasrin Sultana",    interaction_type: "join",        content: "Company Secretary joined — pre-meeting setup",                                                                   created_at: new Date(Date.now() - 2 * 3600000 - 1800000).toISOString() },
  { id: "int-102", meeting_id: `MTG-${year}-0010`, user_id: "Mr. Rafiqul Islam",     interaction_type: "join",        content: "Joined the meeting — minutes capture active",                                                                    created_at: new Date(Date.now() - 2 * 3600000 - 900000).toISOString() },
  { id: "int-103", meeting_id: `MTG-${year}-0010`, user_id: "Mr. Abdul Awal Mintoo", interaction_type: "join",        content: "Chairperson joined and called meeting to order",                                                                  created_at: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: "int-104", meeting_id: `MTG-${year}-0010`, user_id: "Mr. Md. Nurul Amin",    interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 2 * 3600000 + 120000).toISOString() },
  { id: "int-105", meeting_id: `MTG-${year}-0010`, user_id: "Mr. Md. Abul Bashar",   interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 2 * 3600000 + 180000).toISOString() },
  { id: "int-106", meeting_id: `MTG-${year}-0010`, user_id: "Dr. Aminul Haque",      interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 2 * 3600000 + 240000).toISOString() },
  { id: "int-107", meeting_id: `MTG-${year}-0010`, user_id: "Ms. Fatema Begum",      interaction_type: "join",        content: "Joined the meeting — attended via hybrid (virtual link)",                                                        created_at: new Date(Date.now() - 2 * 3600000 + 900000).toISOString() },
  { id: "int-108", meeting_id: `MTG-${year}-0010`, user_id: "Mr. Shahadat Hossain",  interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 2 * 3600000 + 60000).toISOString() },
  { id: "int-109", meeting_id: `MTG-${year}-0010`, user_id: "Mr. Kamal Hossain",     interaction_type: "join",        content: "CFO joined for Agenda Item 3",                                                                                   created_at: new Date(Date.now() - 2 * 3600000 + 300000).toISOString() },
  { id: "int-110", meeting_id: `MTG-${year}-0010`, user_id: "System",                interaction_type: "quorum_change", content: "Quorum status updated: 7 of 5 required members present — QUORUM MET",                                          created_at: new Date(Date.now() - 2 * 3600000 + 300000).toISOString() },
  { id: "int-111", meeting_id: `MTG-${year}-0010`, user_id: "Mr. Abdul Awal Mintoo", interaction_type: "comment",     content: "Good morning. I call this Special Board Meeting to order. Quorum has been declared. The primary business today is the Executive Performance Review and the Remuneration Framework proposal. I expect concise presentations and focused discussion so we can conclude within our allotted time.",                                                        created_at: new Date(Date.now() - 2 * 3600000 + 360000).toISOString() },
  { id: "int-112", meeting_id: `MTG-${year}-0010`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting moved to Agenda Item 2: Confirmation of Previous Meeting Minutes",                                       created_at: new Date(Date.now() - 2 * 3600000 + 420000).toISOString() },
  { id: "int-113", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0035`, user_id: "Mr. Md. Abul Bashar",  interaction_type: "chat",    content: "I have reviewed the minutes and they accurately reflect the discussions. I propose we confirm them as presented.",                                                created_at: new Date(Date.now() - 2 * 3600000 + 600000).toISOString() },
  { id: "int-114", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0035`, user_id: "Dr. Aminul Haque",     interaction_type: "chat",    content: "Agreed. No amendments required from my side.",                                                                               created_at: new Date(Date.now() - 2 * 3600000 + 660000).toISOString() },
  { id: "int-115", meeting_id: `MTG-${year}-0010`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting moved to Agenda Item 3: Executive Performance Review — Q2 2026",                                        created_at: new Date(Date.now() - 2 * 3600000 + 900000).toISOString() },
  { id: "int-116", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0036`, user_id: "Mr. Kamal Hossain",   interaction_type: "comment", content: "The Q2 results show resilience in core income lines despite the NIM compression. Net profit of ৳142 crore represents 86% achievement against plan. The variance is primarily driven by the higher provisioning requirement in SME and commercial real estate segments, and the repricing lag in our fixed-rate book. Management has initiated four corrective actions which I will walk through.",                                    created_at: new Date(Date.now() - 2 * 3600000 + 1200000).toISOString() },
  { id: "int-117", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0036`, user_id: "Mr. Md. Nurul Amin",  interaction_type: "chat",    content: "The NPL trend concerns me. 4.8% is too close to our appetite limit. What is the realistic Q3 outlook?",                                                              created_at: new Date(Date.now() - 2 * 3600000 + 1500000).toISOString() },
  { id: "int-118", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0036`, user_id: "Mr. Kamal Hossain",   interaction_type: "chat",    content: "The NPL Recovery Task Force has been activated. We have identified 18 accounts for targeted restructuring and recovery action. Realistic Q3 forecast is 4.4-4.5%, reaching 4.0% by year-end if the recovery programme stays on track.",                                        created_at: new Date(Date.now() - 2 * 3600000 + 1620000).toISOString() },
  { id: "int-119", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0036`, user_id: "Ms. Fatema Begum",    interaction_type: "chat",    content: "I appreciate the transparency. Can the Board receive monthly NPL recovery progress updates until year-end rather than waiting for the next quarterly report?",                                                          created_at: new Date(Date.now() - 2 * 3600000 + 1800000).toISOString() },
  { id: "int-120", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0036`, user_id: "Ms. Nasrin Sultana",  interaction_type: "chat",    content: "Noted, Ms. Begum. I will include a standing NPL recovery update in the monthly Board communication from September.",                                                          created_at: new Date(Date.now() - 2 * 3600000 + 1860000).toISOString() },
  { id: "int-121", meeting_id: `MTG-${year}-0010`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting moved to Agenda Item 4: Board Remuneration Review",                                                       created_at: new Date(Date.now() - 2 * 3600000 + 2700000).toISOString() },
  { id: "int-122", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0010`,  user_id: "Mr. Md. Abul Bashar",  interaction_type: "comment", content: "The NRC reviewed three independent benchmarking datasets. Our current board fees are at the 35th percentile of peer banks. The proposed 20% increase would bring us to the 55th percentile — a reasonable market position. I commend the recommendation to the full Board.",                                         created_at: new Date(Date.now() - 2 * 3600000 + 2880000).toISOString() },
  { id: "int-123", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0010`,  user_id: "Mr. Md. Nurul Amin",   interaction_type: "chat",    content: "I am satisfied with the benchmarking analysis. My only concern is the timing of the Willis Towers Watson confirmation letter. We should make approval conditional on receipt of that letter.",                                           created_at: new Date(Date.now() - 2 * 3600000 + 3000000).toISOString() },
  { id: "int-124", meeting_id: `MTG-${year}-0010`, agenda_id: `AGD-${year}-0010`,  user_id: "Ms. Nasrin Sultana",   interaction_type: "chat",    content: "Conditional approval with the letter as a condition precedent is the standard approach. I can draft the resolution text accordingly.",                                      created_at: new Date(Date.now() - 2 * 3600000 + 3060000).toISOString() },

  // ── 344th Board of Directors Meeting Q3 (MTG-2026-0013) — Interactions ───
  { id: "int-201", meeting_id: `MTG-${year}-0013`, user_id: "Ms. Nasrin Sultana",    interaction_type: "join",        content: "Company Secretary joined — pre-meeting Board Pack distribution confirmed",                                         created_at: new Date(Date.now() - 100 * 60000).toISOString() },
  { id: "int-202", meeting_id: `MTG-${year}-0013`, user_id: "Mr. Rafiqul Islam",     interaction_type: "join",        content: "Joined the meeting — minutes capture and recording active",                                                       created_at: new Date(Date.now() - 105 * 60000).toISOString() },
  { id: "int-203", meeting_id: `MTG-${year}-0013`, user_id: "Mr. Abdul Awal Mintoo", interaction_type: "join",        content: "Chairperson joined and called the 344th Board meeting to order",                                                   created_at: new Date(Date.now() - 90 * 60000).toISOString() },
  { id: "int-204", meeting_id: `MTG-${year}-0013`, user_id: "Mr. Md. Nurul Amin",    interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 88 * 60000).toISOString() },
  { id: "int-205", meeting_id: `MTG-${year}-0013`, user_id: "Mr. Md. Abul Bashar",   interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 87 * 60000).toISOString() },
  { id: "int-206", meeting_id: `MTG-${year}-0013`, user_id: "Dr. Aminul Haque",      interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 85 * 60000).toISOString() },
  { id: "int-207", meeting_id: `MTG-${year}-0013`, user_id: "Ms. Fatema Begum",      interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 86 * 60000).toISOString() },
  { id: "int-208", meeting_id: `MTG-${year}-0013`, user_id: "Mr. Shahadat Hossain",  interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 89 * 60000).toISOString() },
  { id: "int-209", meeting_id: `MTG-${year}-0013`, user_id: "Mr. Ariful Islam",      interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 84 * 60000).toISOString() },
  { id: "int-210", meeting_id: `MTG-${year}-0013`, user_id: "Mr. Wahidur Rahman",    interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 83 * 60000).toISOString() },
  { id: "int-211", meeting_id: `MTG-${year}-0013`, user_id: "Mr. Kamal Hossain",     interaction_type: "join",        content: "CFO joined — financial presentations prepared",                                                                   created_at: new Date(Date.now() - 82 * 60000).toISOString() },
  { id: "int-212", meeting_id: `MTG-${year}-0013`, user_id: "Mr. Imran Hossain",     interaction_type: "join",        content: "Head of Compliance joined",                                                                                      created_at: new Date(Date.now() - 80 * 60000).toISOString() },
  { id: "int-213", meeting_id: `MTG-${year}-0013`, user_id: "System",                interaction_type: "quorum_change", content: "Quorum status updated: 10 of 7 required members present — QUORUM MET",                                          created_at: new Date(Date.now() - 87 * 60000).toISOString() },
  { id: "int-214", meeting_id: `MTG-${year}-0013`, user_id: "Mr. Abdul Awal Mintoo", interaction_type: "comment",     content: "I call the 344th Board of Directors Meeting to order. The Board Pack was circulated 48 hours ago and I trust all members have reviewed the materials. We have a substantive agenda today including the Q2 financial results, Q3 capital expenditure approval, and the compliance update. We will proceed in order.",                                            created_at: new Date(Date.now() - 89 * 60000).toISOString() },
  { id: "int-215", meeting_id: `MTG-${year}-0013`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting moved to Agenda Item 3: Review of Q2 Financial Performance",                                            created_at: new Date(Date.now() - 75 * 60000).toISOString() },
  { id: "int-216", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0023`, user_id: "Mr. Kamal Hossain",     interaction_type: "comment", content: "The Q2 financial results reflect the operating environment we have all been navigating. Core revenues are strong — total operating income grew 7.2% year-on-year to ৳480 crore. The NIM compression from 3.6% to 3.2% reflects the lagged repricing of our fixed-rate book. We have initiated selective portfolio repricing which will benefit Q3 and Q4.",                                         created_at: new Date(Date.now() - 72 * 60000).toISOString() },
  { id: "int-217", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0023`, user_id: "Mr. Wahidur Rahman",    interaction_type: "chat",    content: "The NPL ratio at 4.8% is a concern for me. What is the sector breakdown? Which segments are driving the deterioration?",                                          created_at: new Date(Date.now() - 68 * 60000).toISOString() },
  { id: "int-218", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0023`, user_id: "Mr. Kamal Hossain",     interaction_type: "chat",    content: "Good question, Mr. Rahman. SME sector accounts for approximately 60% of the NPL increase — primarily textile and ready-made garment borrowers facing export order slowdowns. Commercial real estate accounts for 30%. Retail consumer NPLs remain stable at 1.8%.",                                                        created_at: new Date(Date.now() - 66 * 60000).toISOString() },
  { id: "int-219", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0023`, user_id: "Mr. Md. Abul Bashar",   interaction_type: "chat",    content: "Is the provision coverage ratio of 72% adequate given the NPL profile? I would like to understand whether management believes additional provisioning will be required in H2.",                                                            created_at: new Date(Date.now() - 63 * 60000).toISOString() },
  { id: "int-220", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0023`, user_id: "Mr. Kamal Hossain",     interaction_type: "chat",    content: "Our provisioning model runs quarterly stress tests. Under the base scenario, current provision coverage is adequate. Under an adverse scenario (NPL ratio reaching 6%), we would require an additional ৳45 crore of provisions. We believe the base scenario is more likely given the recovery programme underway.",                           created_at: new Date(Date.now() - 61 * 60000).toISOString() },
  { id: "int-221", meeting_id: `MTG-${year}-0013`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting moved to Agenda Item 4: Capital Expenditure Approval — Q3",                                              created_at: new Date(Date.now() - 55 * 60000).toISOString() },
  { id: "int-222", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0024`, user_id: "Mr. Kamal Hossain",     interaction_type: "comment", content: "The Q3 capex proposal totals ৳50,000,000 across two categories. The IT investment of ৳32,000,000 covers the core banking Phase 2 upgrade, cybersecurity enhancements, cloud migration Phase 2, and DR site upgrade. The branch expansion investment of ৳18,000,000 covers three new branches in Sylhet, Khulna, and Rajshahi divisions.",               created_at: new Date(Date.now() - 52 * 60000).toISOString() },
  { id: "int-223", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0024`, user_id: "Dr. Aminul Haque",      interaction_type: "chat",    content: "On the Sylhet branch — have we received the full regulatory license or is it still pending?",                                                                      created_at: new Date(Date.now() - 49 * 60000).toISOString() },
  { id: "int-224", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0024`, user_id: "Mr. Imran Hossain",     interaction_type: "chat",    content: "The Osmani Nagar (Sylhet) licence was granted on 18 July ${year}. All three sites have confirmed regulatory approvals. Khulna site fit-out is 40% complete.",        created_at: new Date(Date.now() - 47 * 60000).toISOString() },
  { id: "int-225", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0024`, user_id: "Ms. Fatema Begum",      interaction_type: "chat",    content: "I am supportive of the branch expansion — market presence in those divisions aligns with the strategic plan. I would like to ensure the opening timelines are realistic given the current construction environment.",                                           created_at: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: "int-226", meeting_id: `MTG-${year}-0013`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting moved to Agenda Item 5: Compliance and Regulatory Update",                                              created_at: new Date(Date.now() - 35 * 60000).toISOString() },
  { id: "int-227", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0025`, user_id: "Mr. Imran Hossain",     interaction_type: "comment", content: "I can confirm there were no material regulatory breaches in Q2. Two Bangladesh Bank circulars require implementation — both are on track. On AML/CFT, we filed 23 STRs in Q2, an increase from 18 in Q1, which reflects the enhanced monitoring thresholds we implemented. KYC remediation stands at 94% with the remaining 6% under active follow-up.",      created_at: new Date(Date.now() - 32 * 60000).toISOString() },
  { id: "int-228", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0025`, user_id: "Mr. Md. Nurul Amin",    interaction_type: "chat",    content: "The AML training completion at 91% is below the mandatory 100%. What is the timeline for full compliance?",                                                          created_at: new Date(Date.now() - 29 * 60000).toISOString() },
  { id: "int-229", meeting_id: `MTG-${year}-0013`, agenda_id: `AGD-${year}-0025`, user_id: "Mr. Imran Hossain",     interaction_type: "chat",    content: "We have issued a directive requiring all outstanding training to be completed by 31 August. HR is tracking daily. I am confident we will reach 100% by that date.",    created_at: new Date(Date.now() - 27 * 60000).toISOString() },
  { id: "int-230", meeting_id: `MTG-${year}-0013`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting moved to Agenda Item 6: CEO & MD Business Update",                                                        created_at: new Date(Date.now() - 20 * 60000).toISOString() },

  // ── 57th Audit Committee Meeting (MTG-2026-0014) — Interactions ──────────
  { id: "int-301", meeting_id: `MTG-${year}-0014`, user_id: "Ms. Nasrin Sultana",    interaction_type: "join",        content: "Company Secretary joined — Audit Committee pre-meeting materials confirmed distributed",                            created_at: new Date(Date.now() - 65 * 60000).toISOString() },
  { id: "int-302", meeting_id: `MTG-${year}-0014`, user_id: "Mr. Rafiqul Islam",     interaction_type: "join",        content: "Joined the meeting — minutes capture active",                                                                    created_at: new Date(Date.now() - 68 * 60000).toISOString() },
  { id: "int-303", meeting_id: `MTG-${year}-0014`, user_id: "Mr. Md. Abul Bashar",   interaction_type: "join",        content: "Audit Committee Chairman joined and called meeting to order",                                                     created_at: new Date(Date.now() - 50 * 60000).toISOString() },
  { id: "int-304", meeting_id: `MTG-${year}-0014`, user_id: "Dr. Aminul Haque",      interaction_type: "join",        content: "Joined the meeting",                                                                                             created_at: new Date(Date.now() - 48 * 60000).toISOString() },
  { id: "int-305", meeting_id: `MTG-${year}-0014`, user_id: "Ms. Fatema Begum",      interaction_type: "join",        content: "Joined the meeting via virtual link (Microsoft Teams)",                                                           created_at: new Date(Date.now() - 47 * 60000).toISOString() },
  { id: "int-306", meeting_id: `MTG-${year}-0014`, user_id: "Mr. Zahir Uddin",       interaction_type: "join",        content: "Head of Internal Audit joined — full audit report submitted to members prior to meeting",                          created_at: new Date(Date.now() - 55 * 60000).toISOString() },
  { id: "int-307", meeting_id: `MTG-${year}-0014`, user_id: "Mr. Kamal Hossain",     interaction_type: "join",        content: "CFO joined as invitee for financial audit items",                                                                created_at: new Date(Date.now() - 45 * 60000).toISOString() },
  { id: "int-308", meeting_id: `MTG-${year}-0014`, user_id: "System",                interaction_type: "quorum_change", content: "Quorum status updated: 4 of 3 required members present — QUORUM MET",                                           created_at: new Date(Date.now() - 47 * 60000).toISOString() },
  { id: "int-309", meeting_id: `MTG-${year}-0014`, user_id: "Mr. Md. Abul Bashar",   interaction_type: "comment",     content: "Good morning. I call the 57th Audit Committee Meeting to order. Quorum is confirmed. The primary focus today is the Q2 Internal Audit Report and the external auditor update. I remind members that these proceedings are restricted — materials should not be shared outside the committee.",                                                              created_at: new Date(Date.now() - 49 * 60000).toISOString() },
  { id: "int-310", meeting_id: `MTG-${year}-0014`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting moved to Agenda Item 3: Internal Audit Findings — Q2 2026",                                             created_at: new Date(Date.now() - 40 * 60000).toISOString() },
  { id: "int-311", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0026`, user_id: "Mr. Zahir Uddin",       interaction_type: "comment", content: "The Q2 audit cycle produced 47 findings in total: 2 Critical, 8 High, 22 Medium, and 15 Low. I will focus the Committee's attention on the Critical findings. The first Critical finding relates to cash advance controls at three branch locations. Interim dual-authorisation controls were implemented on 15 July, pending the system-level fix scheduled for August.",             created_at: new Date(Date.now() - 38 * 60000).toISOString() },
  { id: "int-312", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0026`, user_id: "Dr. Aminul Haque",      interaction_type: "chat",    content: "For the privileged access finding — 3 accounts belonging to staff no longer in IT roles. Were those accounts actively used between the persons leaving and the accounts being identified?",                                    created_at: new Date(Date.now() - 35 * 60000).toISOString() },
  { id: "int-313", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0026`, user_id: "Mr. Zahir Uddin",       interaction_type: "chat",    content: "Our log analysis shows no evidence of active use of those 3 accounts after the staff members' last working day. However, the access window existed. All 14 overdue privileged access accounts have now been reviewed — 3 were deactivated, 9 were revalidated with updated justification, 2 are pending senior IT approval.",          created_at: new Date(Date.now() - 33 * 60000).toISOString() },
  { id: "int-314", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0026`, user_id: "Ms. Fatema Begum",      interaction_type: "chat",    content: "I want to see a zero-tolerance approach to privileged access gaps going forward. Can the Committee direct that quarterly privileged access certification becomes a standing KRI reported at every Audit Committee meeting?",                                               created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "int-315", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0026`, user_id: "Mr. Md. Abul Bashar",   interaction_type: "chat",    content: "Agreed. Ms. Sultana, please note that as a Committee resolution — quarterly privileged access certification to be added as a standing KRI in the Audit Committee reporting framework.",                                                       created_at: new Date(Date.now() - 28 * 60000).toISOString() },
  { id: "int-316", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0026`, user_id: "Ms. Nasrin Sultana",    interaction_type: "chat",    content: "Noted and will be reflected in the minutes as a formal Committee direction.",                                                                                      created_at: new Date(Date.now() - 27 * 60000).toISOString() },
  { id: "int-317", meeting_id: `MTG-${year}-0014`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting paused — break called by Chairman at 11:30 AM. Meeting to resume at 12:00 PM",                            created_at: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: "int-318", meeting_id: `MTG-${year}-0014`, agenda_id: `AGD-${year}-0027`, user_id: "Mr. Zahir Uddin",       interaction_type: "chat",    content: "Before the break — I want to flag that the external auditor's interim findings are tracking broadly in line with our internal assessment. No material surprises to date which is reassuring.",                                                    created_at: new Date(Date.now() - 22 * 60000).toISOString() },

  // ── 43rd Risk Management Committee Meeting (MTG-2026-0015) — Interactions ─
  { id: "int-401", meeting_id: `MTG-${year}-0015`, user_id: "Mr. Kamal Hossain",     interaction_type: "join",        content: "RMC Secretary joined — documents and KRI dashboard loaded",                                                       created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "int-402", meeting_id: `MTG-${year}-0015`, user_id: "Mr. Rafiqul Islam",     interaction_type: "join",        content: "Joined the meeting — minutes capture active",                                                                    created_at: new Date(Date.now() - 35 * 60000).toISOString() },
  { id: "int-403", meeting_id: `MTG-${year}-0015`, user_id: "Mr. Md. Nurul Amin",    interaction_type: "join",        content: "RMC Chairman joined and called meeting to order",                                                                 created_at: new Date(Date.now() - 20 * 60000).toISOString() },
  { id: "int-404", meeting_id: `MTG-${year}-0015`, user_id: "Dr. Aminul Haque",      interaction_type: "join",        content: "Joined via Zoom virtual link",                                                                                   created_at: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: "int-405", meeting_id: `MTG-${year}-0015`, user_id: "Mr. Md. Abul Bashar",   interaction_type: "join",        content: "Joined via Zoom virtual link",                                                                                   created_at: new Date(Date.now() - 17 * 60000).toISOString() },
  { id: "int-406", meeting_id: `MTG-${year}-0015`, user_id: "Mr. Reza Ahmed",        interaction_type: "join",        content: "CRO joined — RAS and KRI presentations ready",                                                                   created_at: new Date(Date.now() - 25 * 60000).toISOString() },
  { id: "int-407", meeting_id: `MTG-${year}-0015`, user_id: "Ms. Tahmina Khanam",    interaction_type: "join",        content: "Risk Analyst joined as observer",                                                                                 created_at: new Date(Date.now() - 22 * 60000).toISOString() },
  { id: "int-408", meeting_id: `MTG-${year}-0015`, user_id: "System",                interaction_type: "quorum_change", content: "Quorum status updated: 4 of 3 required members present — QUORUM MET",                                           created_at: new Date(Date.now() - 17 * 60000).toISOString() },
  { id: "int-409", meeting_id: `MTG-${year}-0015`, user_id: "Mr. Md. Nurul Amin",    interaction_type: "comment",     content: "I call the 43rd Risk Management Committee Meeting to order. All members have joined — quorum is confirmed. The main business today is the Q3 Risk Appetite Statement review, the KRI Dashboard, and the Credit Portfolio update. Mr. Ahmed, please ensure the KRI dashboard is shared to all virtual participants before we get to that item.",     created_at: new Date(Date.now() - 19 * 60000).toISOString() },
  { id: "int-410", meeting_id: `MTG-${year}-0015`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting moved to Agenda Item 2: Approval of Previous RMC Meeting Minutes",                                      created_at: new Date(Date.now() - 15 * 60000).toISOString() },
  { id: "int-411", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0049`, user_id: "Mr. Md. Abul Bashar",   interaction_type: "chat",    content: "I have reviewed the 42nd RMC minutes. Accurate record. I propose we confirm them.",                                                                               created_at: new Date(Date.now() - 13 * 60000).toISOString() },
  { id: "int-412", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0049`, user_id: "Dr. Aminul Haque",      interaction_type: "chat",    content: "Seconded. One note — the action item on AML staffing has been marked completed which I confirm is correct based on the update I received.",                       created_at: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: "int-413", meeting_id: `MTG-${year}-0015`, user_id: "System",                interaction_type: "agenda_change", content: "Meeting moved to Agenda Item 3: Risk Appetite Statement Review",                                                created_at: new Date(Date.now() - 10 * 60000).toISOString() },
  { id: "int-414", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0028`, user_id: "Mr. Reza Ahmed",        interaction_type: "comment", content: "The proposed RAS amendments are driven by three observations from H1: first, elevated market volatility justifying a tighter VaR limit; second, NIM sensitivity in the rising rate environment; and third, the NPL ratio trajectory which is pushing us close to our current credit risk appetite ceiling. I am recommending conservative threshold adjustments across market, credit, and liquidity risk categories.",       created_at: new Date(Date.now() - 8 * 60000).toISOString() },
  { id: "int-415", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0028`, user_id: "Mr. Md. Nurul Amin",    interaction_type: "chat",    content: "I am supportive of tightening the NPL appetite from 5.0% to 4.5% with an early warning trigger at 4.0%. It sends the right signal to management and the market that the Board will not tolerate a drift toward 5%.",                                            created_at: new Date(Date.now() - 6 * 60000).toISOString() },
  { id: "int-416", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0028`, user_id: "Mr. Md. Abul Bashar",   interaction_type: "chat",    content: "The real estate sector cap reduction from 20% to 17% seems prudent given the current commercial property environment. I would add a condition that the new construction sub-limit of 8% applies specifically to commercial (not residential) construction to avoid inadvertently constraining the housing finance book.",           created_at: new Date(Date.now() - 4 * 60000).toISOString() },
  { id: "int-417", meeting_id: `MTG-${year}-0015`, agenda_id: `AGD-${year}-0028`, user_id: "Mr. Reza Ahmed",        interaction_type: "chat",    content: "Agreed, Mr. Bashar. The sub-limit is intended only for commercial construction. I will clarify the definition in the revised RAS document to make that explicit.",                                                              created_at: new Date(Date.now() - 2 * 60000).toISOString() },
];

export const useMeetingInteractionRegistry = createEntityRegistry<MeetingInteraction>(
  "bms.meetingInteractions",
  "bms:meetingInteractions-updated",
  SEED_INTERACTIONS,
);
