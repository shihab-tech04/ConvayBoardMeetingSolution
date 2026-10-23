import { useState, useEffect, useCallback, useRef, type CSSProperties, type ReactNode } from "react";

import { toast } from "sonner";
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, Phone, PhoneOff,
  Users, MessageSquare, Hand, Smile, MoreHorizontal,
  Lock, Unlock, Radio, Play, Pause,
  Clock, CheckCircle, FileText, ArrowLeft, AlertCircle,
  Coffee, X, Maximize2, Minimize2,
  Signal, ChevronRight, ChevronLeft,
  Layers, BookOpen, Gavel,
  ThumbsUp, ThumbsDown, Minus, RotateCcw, Eye,
} from "lucide-react";
import {
  useMeetingRegistry, useDecisionRegistry, useActionItemRegistry,
  useMotionRegistry, useMinutesRegistry, useParticipantRegistry, useAgendaRegistry,
  useAttendanceRegistry, useQuorumEventRegistry, useResolutionRegistry,
  useVoteRegistry, useGovernanceRegistry, useParticipantGroupRegistry,
  useQuorumRuleRegistry, useMeetingInteractionRegistry, useLiveMeetingSessionRegistry,
  useMeetingAgendaLinkRegistry, useAgendaDocumentLinkRegistry, useDocumentRegistry,
  useMeetingParticipantLinkRegistry,
} from "../../data/boardMeetingData";
import { useBmsUserRegistry } from "../../data/bmsUsers";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useDocumentCommentRegistry } from "../../data/documentWorkspaceData";
import type { DocumentCommentThread, CommentReply } from "../../data/documentWorkspaceData";
import { calculateMeetingQuorum, quorumStatusLabel } from "../../utils/quorumCalculation";
import { MeetingPreJoinPanel, type PreJoinRole } from "../../components/meetings/MeetingPreJoinPanel";
import { PreMeetingReadinessPanel } from "../../components/meetings/PreMeetingReadinessPanel";
import { DocumentWorkspaceRouter } from "../../components/documents/DocumentWorkspaceRouter";
import { getEditorProvider } from "../../components/documents/editor/DocumentEditorProvider";
import type { BoardDocument, Decision, Resolution, ActionItem } from "../../data/boardMeetingData";
import { AppModal } from "../../components/modals/AppModal";
import { EntryForm } from "../../components/forms/EntryForm";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { SecondaryButton } from "../../components/buttons/SecondaryButton";
import { Button } from "../../components/buttons/Button";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import { MOTION_FORM_FIELDS, MINUTES_FORM_FIELDS } from "../boardMeetingFormFields";
import type { EntryFormValue } from "../../components/forms/EntryForm";

// ─── Types ────────────────────────────────────────────────────────────────────

type MeetingCtrlStatus = "not-started" | "in-progress" | "paused" | "on-break" | "adjourned" | "ended";

const AGENDA_DESC_FALLBACK: Record<string, string> = {
  "Opening and Quorum Declaration":
    "The Chairperson calls the meeting to order and welcomes all members. The Company Secretary confirms the attendance of members and determines whether the requisite quorum has been met in accordance with the Constitution and applicable regulatory requirements. Apologies received from absent members are noted for the record. If quorum is not achieved within the prescribed waiting period, the meeting will be adjourned and rescheduled in accordance with the rules of the governance body. Upon confirmation of quorum, the Chairperson formally opens the meeting and confirms that all necessary notices and supporting materials were circulated within the required timeframes.",

  "Approval of Previous Meeting Minutes":
    "The Company Secretary presents the draft minutes of the previous meeting for review and approval by the Board. Members are invited to raise any corrections, amendments, or clarifications. Once the minutes accurately reflect the proceedings, decisions, and action items arising from the prior meeting, the Board is requested to formally adopt them as a true and correct record. Approved minutes are signed by the Chairperson and filed in accordance with the governance framework. Outstanding action items from the previous meeting are reviewed and their completion status is noted for the record.",

  "Confirmation of Previous Meeting Minutes":
    "The Company Secretary tables the draft minutes of the immediately preceding meeting for the Committee's review. Members are given the opportunity to propose any factual corrections or amendments. Upon satisfactory review, the Committee is requested to confirm the minutes as an accurate and complete record of proceedings, decisions taken, and action items agreed. The confirmed minutes will be signed by the Chairperson and retained in the official minute book. Progress on action items committed to at the previous meeting is also reviewed at this stage.",

  "Review of Q2 Financial Performance":
    "The Chief Financial Officer presents a comprehensive review of the organisation's financial performance for the second quarter ending 30 June 2026. The presentation covers key profit and loss metrics, balance sheet position, capital adequacy ratios, liquidity indicators, and significant variances against the approved annual budget and comparative prior-year figures. The Board is invited to scrutinise performance drivers, assess the outlook for the second half of the year, and provide strategic direction to management on any corrective measures required. Detailed financial statements, ratio analyses, and management commentary are included in the supporting board pack.",

  "Capital Expenditure Approval — Q3":
    "Management presents the capital expenditure proposals for Q3 2026, totalling ৳50,000,000 across core investment categories including digital infrastructure, branch network expansion, and operational equipment. Each proposal is supported by a business case outlining strategic alignment, expected return on investment, payback period, and risk assessment. The Board is requested to review the individual expenditure items, satisfy itself that the proposals represent prudent allocation of capital in line with the approved strategic plan, and to formally approve the Q3 capital expenditure programme within the organisation's delegated authority framework.",

  "Compliance and Regulatory Update":
    "The Head of Compliance presents a summary of the regulatory landscape and the organisation's compliance status for the period under review. The update covers correspondence received from regulatory bodies, the status of any outstanding regulatory submissions or undertakings, recent legislative or policy changes of significance, and the outcome of compliance monitoring activities conducted during the quarter. Key compliance risks and any breach remediation activities are highlighted for the Board's awareness. The Board is invited to note the update and provide guidance on matters requiring Board-level oversight or escalation.",

  "Internal Audit Findings — Q2 2026":
    "The Head of Internal Audit presents the consolidated findings from internal audit engagements conducted during the second quarter of 2026. The report categorises findings by risk rating — Critical, High, Medium, and Low — and identifies control weaknesses, process deficiencies, and areas of non-compliance with policies and procedures. Management responses and agreed remediation timelines are included for each finding. The Audit Committee reviews the adequacy and timeliness of management responses, follows up on overdue action items from prior audit cycles, and assesses the overall effectiveness of the internal control environment.",

  "External Auditor Status Update":
    "The Committee receives a status update from the external auditors on the progress of the annual statutory audit engagement and any interim review work completed to date. The external auditors report on areas of audit focus, significant accounting judgements identified, and any matters that may require the Committee's attention or guidance. Independence confirmations and any non-audit services provided during the period are disclosed. The Committee reviews the quality of management cooperation with the audit process and confirms the ongoing adequacy of the audit scope relative to organisational risk.",

  "Risk Appetite Statement Review":
    "The Chief Risk Officer presents the annual review of the organisation's Risk Appetite Statement for the Committee's consideration and recommendation to the Board. The review assesses whether the current risk appetite remains appropriate in light of changes in the strategic direction, operating environment, and regulatory expectations. Proposed amendments to risk tolerance thresholds across key risk categories — credit, market, operational, liquidity, and reputational — are presented with supporting rationale. The Committee is requested to endorse the revised Risk Appetite Statement and recommend it to the Board for formal adoption.",

  "Key Risk Indicator Dashboard Q2":
    "The Chief Risk Officer presents the Q2 Key Risk Indicator dashboard providing the Committee with a quantitative overview of the organisation's risk profile against approved appetite thresholds. Indicators that have breached or are trending toward warning or limit levels are highlighted, together with management's explanations and proposed mitigating actions. The dashboard covers credit concentration risk, market risk exposures, liquidity coverage, operational loss events, and cyber security metrics. The Committee reviews the effectiveness of risk controls in place and considers whether any indicators warrant escalation to the full Board.",

  "Board Remuneration Policy Review":
    "The Company Secretary presents the annual review of the Board Remuneration Policy for the Committee's consideration. The review benchmarks current remuneration levels for Non-Executive Directors against comparable governance bodies in the sector, taking into account meeting frequency, committee responsibilities, and market practice. Proposed revisions to fee structures, allowances, and other benefits, if any, are presented for discussion. The Committee is requested to review the policy for continued fitness for purpose and to make a formal recommendation to the Board regarding any amendments, ensuring alignment with governance best practice and regulatory expectations.",

  "Shariah Compliance Report Q2":
    "The Shariah Adviser presents the Q2 Shariah Compliance Report covering the Committee's oversight activities, product compliance reviews, fatwa issuances, and training initiatives undertaken during the period. The report highlights any Shariah non-compliance events identified, their root causes, rectification measures taken, and the outcome of charity payment calculations where applicable. The Committee reviews the effectiveness of the Shariah governance framework and considers emerging Shariah standards that may impact the organisation's product offerings and operational practices. Members are invited to raise queries and provide guidance on matters requiring Shariah Committee direction.",

  "New Product Shariah Certification":
    "Management presents the product structuring papers and Shariah compliance documentation for a new financial product proposed for launch. The submission includes a detailed description of the underlying contract, transaction flows, supporting documentation, draft customer disclosures, and legal opinions confirming structural validity. The Shariah advisers present their technical analysis of the product's compliance with applicable Shariah principles and relevant accounting standards. The Committee deliberates on the proposed structure and, if satisfied with its Shariah compliance, resolves to issue a formal Shariah certification permitting the product's commercialisation.",

  "Monthly Business Performance Review":
    "The Managing Director and senior management present the monthly business performance dashboard for the Executive Committee's review. The presentation covers revenue performance against targets, customer growth metrics, digital channel adoption rates, human capital indicators, and operational efficiency ratios. Significant business developments, competitive intelligence, and market dynamics during the period are highlighted. The Executive Committee provides oversight of management performance, identifies areas requiring corrective action, and ensures alignment of operational activities with the strategic priorities approved by the Board.",

  "Executive Performance Review — Q2 2026":
    "The Chief Financial Officer presents a detailed review of Q2 2026 financial and operational performance against approved Key Performance Indicators and strategic objectives. Significant variances from budget are analysed with root cause explanations and proposed corrective actions. The Committee reviews the performance of individual business divisions and functional units against their agreed targets. The Managing Director provides commentary on key business developments, market conditions, and management initiatives during the quarter. The Committee assesses overall executive performance and determines whether any matters warrant escalation to the Board.",

  "Strategic Initiative Progress Report":
    "The Managing Director provides a progress update on the five strategic initiatives included in the 2026–2030 Strategic Plan as approved by the Board. For each initiative, the report covers milestones achieved during the period, activities planned for the next quarter, risks and impediments to delivery, resource requirements, and an updated forecast against the original implementation timeline and budget. The Committee reviews the overall health of the strategic programme and provides guidance on prioritisation, resource allocation, and escalation of any issues that may require Board-level decision. Initiatives presenting material delivery risk are discussed in detail.",

  "Review of Internal Audit Emergency Report":
    "The Head of Internal Audit presents findings from the emergency internal audit conducted in response to operational risk events identified during Q3. The audit identified critical and high-rated findings across key risk areas including segregation of duties in payment processing, gaps in AML transaction monitoring controls, and weaknesses in IT system access management. Each finding is presented with supporting evidence, risk rating rationale, potential financial and reputational impact, and recommended control enhancements. Management is invited to respond to the findings and commit to remediation timelines. The Board considers the seriousness of the findings and determines the appropriate governance response.",

  "Management Letter Response & Remediation Plan":
    "The Chief Financial Officer and Chief Risk Officer present management's formal response to the audit findings and a comprehensive remediation plan addressing each critical and high-rated issue identified. For each finding, the plan specifies the root cause, the agreed corrective action, the responsible owner, target completion date, and interim controls in place pending full remediation. The Board reviews the adequacy and credibility of the proposed responses, satisfies itself that management has appropriately prioritised remediation efforts, and formally approves the remediation plan. The Audit Committee is directed to monitor progress and report to the Board at its next scheduled meeting.",

  "Resolution on Immediate Corrective Actions":
    "The Board considers and passes a formal resolution directing management to implement immediate corrective actions in respect of critical and high-rated audit findings identified in the emergency internal audit report. The resolution sets out specific timeframes within which each corrective action must be completed, assigns accountability to named senior officers, and establishes reporting obligations back to the Board and Audit Committee. By passing this resolution, the Board formally exercises its oversight authority and creates a binding governance record of its direction to management. The Company Secretary is directed to circulate the resolution to all relevant parties and to track completion against agreed deadlines.",

  "Any Other Business & Meeting Closure":
    "Members are invited to raise any matters of relevance that have not been captured in the formal agenda, subject to the Chairperson's discretion regarding the appropriateness and urgency of matters so raised. Any significant matters raised under this item that require further consideration or formal decision may be deferred to the next scheduled meeting or addressed through an out-of-session process as appropriate. Following the conclusion of all agenda items, the Chairperson confirms the date, time, and venue of the next scheduled meeting. The Chairperson formally closes the meeting and thanks members for their attendance and contributions.",

  // ── Child agenda item descriptions ──────────────────────────────────────────
  "Review of Action Items from Previous Meeting":
    "Each action item committed to at the previous meeting is reviewed in sequence. For each item, the responsible officer reports on completion status, with supporting evidence where applicable. Where items remain outstanding, an explanation is provided and a revised completion date is agreed. The Board Secretary notes all updates for inclusion in the minutes.",
  "Matters Arising from Previous Minutes":
    "Members are invited to raise any matters arising from the recorded minutes of the previous meeting that require further clarification, correction, or follow-up direction from the Board. This item is distinct from the formal adoption of the minutes and is intended to surface any procedural or substantive matters that may have been omitted or that warrant re-examination before the minutes are finalised.",
  "Action Items Progress":
    "Systematic review of all action items arising from the immediately preceding Board meeting. Each item is presented with its completion status — Completed, In Progress, or Overdue — along with the responsible officer's commentary. Overdue items are subject to Board scrutiny and management is expected to provide a credible revised completion date and explanation for any delay.",
  "Revenue & Profitability Analysis":
    "The CFO presents a detailed breakdown of Q2 revenue across all business segments — corporate banking, retail banking, treasury, and fee-based services. Net interest margin movement, fee income growth, and trading gains are analysed against both budget and the prior year comparative. The Board discusses key revenue drivers, pricing dynamics, and the strategic implications of segment-level variances.",
  "Cost Management & Operating Efficiency":
    "Analysis of operating expenditure against the approved budget for the period, with a focus on the cost-to-income ratio trend. Efficiency initiatives implemented during the quarter are reviewed for impact. Management presents a forecast for full-year costs and highlights any unbudgeted expenditure requiring Board awareness. Headcount movement and its cost implications are also addressed.",
  "Capital Adequacy & Liquidity Position":
    "The organisation's capital adequacy ratios — Common Equity Tier 1 (CET1), Tier 1 Capital, and Total Capital Adequacy Ratio — are presented against regulatory minimums and internal targets. Liquidity metrics including the Liquidity Coverage Ratio (LCR) and Net Stable Funding Ratio (NSFR) are reviewed. The Board considers the capital planning assumptions for the remainder of the financial year and any buffer adequacy concerns.",
  "Benchmarking Analysis & Market Comparison":
    "The independent benchmarking study prepared by Willis Towers Watson is presented to the Committee, comparing the organisation's current NED remuneration levels to market data from peer institutions in the banking and financial services sector. The study covers base board fees, committee chair supplements, meeting attendance allowances, and equity participation arrangements where applicable in the peer group.",
  "Proposed Revised Remuneration Framework":
    "The NRC presents its formal recommendation for a revised NED remuneration framework incorporating the benchmarking findings. Key proposals include a 12% adjustment to the base Board fee, introduction of a Lead Independent Director allowance, revised committee chair supplements calibrated by committee workload, and an updated travel and accommodation reimbursement policy. A draft resolution for Board approval is tabled.",
  "Digital Banking Transformation Initiative":
    "Progress update on the Digital Banking Transformation Initiative covering: completion of core banking module migration for Retail segment (Phase 1), mobile app enhancement release and adoption statistics, digital transaction volume growth, and Phase 2 roadmap covering corporate digital banking, API banking, and open finance readiness. Programme risks, budget burn rate, and vendor performance are discussed.",
  "Talent & Leadership Development Programme":
    "The Managing Director presents the mid-year update on the Talent & Leadership Development Programme. Key metrics include internal promotion rate, succession pipeline readiness for critical roles, external hire ratio, leadership training completion rates by band, and 12-month rolling attrition rates by division. High-potential talent identified through the talent review process are summarised at a cohort level.",
  "Enterprise Risk Framework Enhancement":
    "Status update on the multi-year programme to strengthen the enterprise risk management framework. Deliverables reviewed include updated Risk Policy architecture, Three Lines of Defence model implementation, Board risk dashboard enhancements, integration of the revised risk appetite statement into business planning processes, and progress on the risk technology platform replacement project.",
  "Income Statement & Profitability Drivers":
    "The CFO presents the consolidated income statement for the period with detailed variance commentary against budget and prior year. Revenue breakdown by segment, net interest margin analysis, impairment charge movements, and operating expenditure by category are presented. The Board discusses the quality of earnings and the sustainability of current profit margins given the prevailing interest rate and credit environment.",
  "Balance Sheet & Asset Quality Review":
    "Comprehensive review of the balance sheet as at period end, with particular focus on loan portfolio composition, NPL ratio movement, provision coverage adequacy, deposit funding base, and wholesale borrowing profile. Asset quality trends are discussed in the context of the macroeconomic environment and sector concentration exposures. Management provides forward guidance on expected credit loss provisions for the remainder of the year.",
  "Regulatory Capital & Liquidity Ratios":
    "The CFO and Treasurer present regulatory capital ratios, ICAAP outputs, and liquidity metrics filed with the regulator. Compliance with minimum capital requirements and internal buffer targets is confirmed. Stress test outcomes under the base, adverse, and severe scenarios are summarised for Board review. The Board discusses capital distribution plans and the implications of any forthcoming regulatory changes.",
  "IT Infrastructure & Digital Platform Investment":
    "Business case for Q3 IT capital expenditure covering core banking system upgrade (৳18M), cybersecurity infrastructure enhancement (৳8M), cloud migration Phase 2 (৳4M), and disaster recovery site upgrade (৳2M). Each component is supported by an architecture decision record, vendor selection rationale, independent technical review, and a projected three-year ROI calculation. Board approval is sought in accordance with the delegated authority framework.",
  "Branch Network Expansion Programme":
    "Approval sought for capital expenditure to establish three new branch locations in Sylhet, Khulna, and Rajshahi Divisions in accordance with the Board-approved Network Expansion Strategy 2025-2027. Each location is supported by a market feasibility study, regulatory licensing status confirmation, five-year financial projection, and projected break-even timeline. The Real Estate team presents site-selection rationale and lease terms for each proposed location.",
  "Bangladesh Bank Regulatory Correspondence":
    "The Head of Compliance presents a structured summary of all formal correspondence received from Bangladesh Bank during the period under review. Items include inspection findings and management responses, regulatory reporting submissions and acknowledgements, new circulars and guidelines requiring policy updates, and supervisory letters requiring Board-level acknowledgement. Management's response status and timelines for each item are noted.",
  "AML/CFT & KYC Compliance Status":
    "Quarterly AML/CFT compliance dashboard covering: transaction monitoring alert volumes and disposition rates, STR and SAR filing statistics, high-risk customer review completion rate, KYC remediation programme progress, de-risking decisions taken during the period, and regulatory examination readiness assessment. Staff training completion rates for AML/CFT modules are also reported. The Board notes any escalated matters and provides direction on material compliance risks.",
};

function getAgendaDescription(item: { title: string; description?: string; purpose?: string }): string {
  if (item.description && item.description.trim()) return item.description.trim();
  for (const [key, desc] of Object.entries(AGENDA_DESC_FALLBACK)) {
    if (item.title.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(item.title.toLowerCase())) {
      return desc;
    }
  }
  const purposeDesc: Record<string, string> = {
    "For noting": "This item is presented to the Board for information and formal noting. No decision is required; however, members are invited to raise queries or seek clarification from the presenter on any aspect of the material provided.",
    "For approval": "The Board is requested to review the matter presented and, if satisfied, to formally approve the recommendation as set out in the supporting paper. Members should consider the strategic, financial, and governance implications before exercising their vote.",
    "For discussion": "This item is brought to the Board for deliberation and strategic guidance. Management will present the relevant context and considerations, and the Board is invited to provide direction that will inform subsequent management action or a future decision paper.",
    "For information": "This item is provided to keep the Board informed of developments in the relevant area. No formal decision is required at this stage, though members may raise questions or provide commentary for management's consideration.",
    "For review": "The Board is invited to conduct a thorough review of the materials presented and to assess whether the matter meets the required standards, thresholds, or policy requirements. Feedback and observations from the Board will guide the next steps.",
  };
  return purposeDesc[item.purpose ?? ""] ?? "This agenda item has been submitted for the Board's consideration. Supporting materials are included in the board pack circulated in advance of the meeting. Members are encouraged to review the relevant documents prior to the meeting to facilitate informed discussion.";
}
// Spec-aligned attendance states (Section 6)
type AttendanceStatus  = "Not Joined" | "Present" | "Temporarily Away" | "Left" | "Excused" | "Recused";
type AgendaStatus      = "Not Started" | "In Discussion" | "Completed" | "Deferred" | "Skipped";
type ViewMode          = "speaker" | "grid" | "document";
type PanelTab          = "agenda" | "documents" | "participants" | "motions" | "decisions" | "minutes";
type ConnectionQuality = "excellent" | "good" | "poor" | "offline";
type MyRole            = "Chairperson" | "Company Secretary" | "Board Member" | "Independent Director" | "Presenter" | "Observer" | "Guest" | "Administrator";

interface VirtualParticipant {
  id: string;
  name: string;
  role: string;
  initials: string;
  isMuted: boolean;
  isCameraOff: boolean;
  isSpeaking: boolean;
  handRaised: boolean;
  connectionQuality: ConnectionQuality;
  isHost: boolean;
}

interface LiveAgendaItem {
  key: string;
  title: string;
  duration: number;
  purpose: string;
  presenter?: string;
  level?: number;
  parentKey?: string;
  description?: string;
  owner?: string;
}

interface LiveMotion {
  id: string;
  title: string;
  proposedBy: string;
  secondedBy: string;
  status: "Proposed" | "Seconded" | "Passed" | "Rejected" | "Withdrawn";
  linkedVoteId?: string;
  agendaKey?: string;
}

interface ActiveVote {
  id: string;
  motionId: string | null;
  motionTitle: string;
  agendaItem: string;
  voteType: "Open" | "Secret Ballot" | "Show of Hands";
  threshold: string;
  thresholdPct: number;
  openedAt: string;
  openedBy: string;
  castVotes: Record<string, "For" | "Against" | "Abstain">;
  chairmanCastingVote?: "For" | "Against";
  status: "Open" | "Closed" | "Cancelled";
  result?: "Passed" | "Failed";
  votesFor: number;
  votesAgainst: number;
  abstentions: number;
  reopenHistory: Array<{ at: string; by: string; reason: string }>;
}

interface ChatMessage {
  id: string;
  from: string;
  text: string;
  time: string;
}

// ─── Persisted session state ──────────────────────────────────────────────────

interface LiveSession {
  ctrlStatus: MeetingCtrlStatus;
  elapsed: number;
  activeIdx: number;
  agendaStatuses: Record<number, AgendaStatus>;
  notes: Record<number, string>;
  motions: LiveMotion[];
  attendance: Record<string, AttendanceStatus>;
  activeVote: ActiveVote | null;
  timeline: Record<string, string>;
  /** agenda-specific recusals: agendaKey → userId[] */
  agendaRecusals: Record<string, string[]>;
}

function loadSession(meetingId: string | undefined): LiveSession {
  const empty: LiveSession = {
    ctrlStatus: "not-started", elapsed: 0, activeIdx: 0,
    agendaStatuses: {}, notes: {}, motions: [],
    attendance: {}, activeVote: null, timeline: {},
    agendaRecusals: {},
  };
  if (!meetingId) return empty;
  try {
    const raw = localStorage.getItem(`bms.live.${meetingId}`);
    if (!raw) return empty;
    return { ...empty, ...JSON.parse(raw) };
  } catch { return empty; }
}

function saveSession(meetingId: string, session: LiveSession) {
  try { localStorage.setItem(`bms.live.${meetingId}`, JSON.stringify(session)); } catch { /* quota */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mkId(prefix: string): string { return `${prefix}-${Date.now()}`; }
function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
function nowISO(): string { return new Date().toISOString(); }
function fmtClock(): string {
  return new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}
const INITIALS = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

// ─── ParticipantPanel — isolated so useState is never called inside an IIFE ──

const PFILTER = ["All", "Present", "Not Joined", "Temporarily Away", "Left", "Excused"] as const;
type PFilter = typeof PFILTER[number];
type PEntry = { id: string; name: string; role: string; category: "quorum" | "general"; isRequired: boolean; votingEligible: boolean; initials: string };

function ParticipantPanel({ entries, attendanceMap, activeStates, quorumMet, quorumLabel, eligibleCount, requiredCount, canUpdate, isEnded, onSetAttendance, agendaKey, agendaRecusedIds, onToggleAgendaRecusal }: {
  entries: PEntry[];
  attendanceMap: Record<string, string>;
  activeStates: string[];
  quorumMet: boolean;
  quorumLabel: string;
  eligibleCount: number;
  requiredCount: number;
  canUpdate: boolean;
  isEnded: boolean;
  onSetAttendance: (id: string, status: string) => void;
  agendaKey: string;
  agendaRecusedIds: Set<string>;
  onToggleAgendaRecusal: (userId: string) => void;
}) {
  const [filter, setFilter] = useState<PFilter>("All");
  const filtered = entries.filter(e => filter === "All" || (attendanceMap[e.id] ?? "Not Joined") === filter);
  const qEntries = filtered.filter(e => e.category === "quorum");
  const gEntries = filtered.filter(e => e.category === "general");
  const renderRow = (e: PEntry) => {
    const status = attendanceMap[e.id] ?? "Not Joined";
    const active = activeStates.includes(status);
    const isAgendaRecused = agendaRecusedIds.has(e.id);
    return (
      <div key={e.id} style={{ padding: "0.45rem 0.5rem", borderRadius: "6px", background: "#1e293b", border: `1px solid ${isAgendaRecused ? "#7c3aed" : "#334155"}`, display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: active ? "#22c55e" : "#334155", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: "#fff", flexShrink: 0 }}>{e.initials}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</p>
          <p style={{ margin: 0, fontSize: "0.62rem", color: "#64748b" }}>
            {e.role}{e.isRequired ? " · Required" : ""}{e.votingEligible ? " · Voting" : ""}
            {isAgendaRecused && <span style={{ marginLeft: "0.3rem", color: "#a78bfa", fontWeight: 700 }}>· Agenda-Recused</span>}
          </p>
        </div>
        {agendaKey && canUpdate && !isEnded && (
          <button
            type="button"
            title={isAgendaRecused ? "Restore voting rights for this agenda item" : "Recuse from this agenda item only"}
            onClick={() => onToggleAgendaRecusal(e.id)}
            style={{ fontSize: "0.6rem", padding: "0.12rem 0.35rem", borderRadius: "4px", border: `1px solid ${isAgendaRecused ? "#7c3aed" : "#475569"}`, background: isAgendaRecused ? "#4c1d95" : "transparent", color: isAgendaRecused ? "#c4b5fd" : "#64748b", cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {isAgendaRecused ? "Restore" : "Recuse"}
          </button>
        )}
        <select value={status} onChange={ev => onSetAttendance(e.id, ev.target.value)} disabled={isEnded || !canUpdate} style={{ fontSize: "0.66rem", padding: "0.15rem 0.25rem", borderRadius: "4px", border: "1px solid #334155", background: "#0f172a", color: "#94a3b8", cursor: "pointer" }}>
          {["Not Joined", "Present", "Temporarily Away", "Left", "Excused", "Recused"].map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
    );
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flexShrink: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Participants ({entries.length})</p>
        <span style={{ fontSize: "0.68rem", padding: "0.12rem 0.4rem", borderRadius: 9999, background: quorumMet ? "#14532d" : "#7f1d1d", color: quorumMet ? "#22c55e" : "#ef4444", fontWeight: 600 }}>{quorumLabel}</span>
      </div>
      <p style={{ fontSize: "0.65rem", color: "#64748b", margin: 0 }}>Present eligible: {eligibleCount} · Required: {requiredCount}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", margin: "0.2rem 0" }}>
        {PFILTER.map(f => <button key={f} type="button" onClick={() => setFilter(f)} style={{ padding: "0.15rem 0.4rem", borderRadius: 9999, fontSize: "0.65rem", fontWeight: filter === f ? 700 : 400, background: filter === f ? "var(--color-primary)" : "#334155", color: filter === f ? "#fff" : "#94a3b8", border: "none", cursor: "pointer" }}>{f}</button>)}
      </div>
      {qEntries.length > 0 && <><p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", margin: "0.2rem 0 0" }}>Quorum Members</p>{qEntries.map(renderRow)}</>}
      {gEntries.length > 0 && <><p style={{ fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8", margin: "0.35rem 0 0" }}>General Members</p>{gEntries.map(renderRow)}</>}
      {entries.length === 0 && <p style={{ fontSize: "0.75rem", color: "#475569", textAlign: "center", padding: "1rem 0" }}>No meeting participants are configured.</p>}
      {entries.length > 0 && filtered.length === 0 && <p style={{ fontSize: "0.75rem", color: "#475569", textAlign: "center", padding: "1rem 0" }}>No participants match this filter.</p>}
    </div>
  );
}

function parseQuorumPct(raw: string | undefined, memberCount: number): number {
  if (!raw) return 0.6;
  const pctMatch = raw.match(/(\d+(?:\.\d+)?)%/);
  if (pctMatch) { const n = parseFloat(pctMatch[1]); return n > 1 ? n / 100 : n; }
  const memberMatch = raw.match(/^(\d+)\s*members?/i);
  if (memberMatch && memberCount > 0) return parseInt(memberMatch[1]) / memberCount;
  return 0.6;
}

function calcThresholdPct(threshold: string): number {
  switch (threshold) {
    case "Simple Majority": return 0.5;
    case "Two-Thirds":      return 2 / 3;
    case "Three-Quarters":  return 0.75;
    case "Unanimous":       return 1.0;
    default:                return 0.5;
  }
}

// Role permissions
const canControl  = (r: MyRole) => ["Chairperson", "Administrator"].includes(r);
const canRecord   = (r: MyRole) => ["Chairperson", "Company Secretary", "Administrator"].includes(r);
const canVote     = (r: MyRole) => ["Chairperson", "Board Member", "Independent Director", "Administrator"].includes(r);
const isObserver  = (r: MyRole) => ["Observer", "Guest", "Presenter"].includes(r);

const LIVE_ROLES: MyRole[] = ["Chairperson", "Company Secretary", "Board Member", "Independent Director", "Presenter", "Observer", "Guest", "Administrator"];

// ─── Defaults ─────────────────────────────────────────────────────────────────


const CLOSURE_CHECKLIST = [
  { key: "agenda_complete",   label: "All agenda items addressed (completed, deferred, or skipped)" },
  { key: "decisions_noted",   label: "All decisions have been recorded" },
  { key: "actions_assigned",  label: "Action items have been assigned with due dates" },
  { key: "quorum_maintained", label: "Quorum was maintained throughout the meeting" },
  { key: "minutes_assigned",  label: "Minute-taker confirmed for post-meeting minutes" },
  { key: "next_meeting",      label: "Date of next meeting noted or deferred" },
];

const CONNECTION_COLOR: Record<ConnectionQuality, string> = {
  excellent: "#22c55e", good: "#f59e0b", poor: "#ef4444", offline: "#94a3b8",
};

const REACTIONS = ["👍", "👏", "❤️", "😄", "🤔", "🙋"];


// ─── Participant Tile ─────────────────────────────────────────────────────────

function ParticipantTile({ p, isActive, size = "normal" }: { p: VirtualParticipant; isActive?: boolean; size?: "normal" | "large" | "small" }) {
  const sz = size === "large" ? 80 : size === "small" ? 32 : 52;
  const nameSz = size === "large" ? "0.9rem" : size === "small" ? "0.65rem" : "0.75rem";
  const roleSz = size === "small" ? "0.6rem" : "0.68rem";
  return (
    <div style={{ position: "relative", borderRadius: "10px", overflow: "hidden", background: "#1e293b", ...(size === "large" ? { flex: 1 } : { aspectRatio: "16/9" }), display: "flex", alignItems: "center", justifyContent: "center", border: isActive ? "2px solid var(--color-primary)" : "2px solid transparent" }}>
      <div style={{ width: sz, height: sz, borderRadius: "50%", background: p.isCameraOff ? "var(--color-primary)" : `hsl(${p.id.charCodeAt(1) * 30},40%,30%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: `${sz * 0.35}px`, fontWeight: 700, color: "#fff" }}>
        {p.initials}
      </div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0.3rem 0.5rem", background: "linear-gradient(transparent, rgba(0,0,0,0.7))", display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: nameSz, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{size === "small" ? p.initials : p.name.split(" ").slice(-2).join(" ")}</p>
          {size !== "small" && <p style={{ margin: 0, fontSize: roleSz, color: "#94a3b8" }}>{p.role}</p>}
        </div>
        <div style={{ display: "flex", gap: "0.25rem", flexShrink: 0 }}>
          {p.isMuted    && <MicOff  size={size === "small" ? 10 : 12} style={{ color: "#ef4444" }} />}
          {p.isSpeaking && <Mic     size={size === "small" ? 10 : 12} style={{ color: "#22c55e" }} />}
          {p.handRaised && <Hand    size={size === "small" ? 10 : 12} style={{ color: "#f59e0b" }} />}
          {size !== "small" && <Signal size={12} style={{ color: CONNECTION_COLOR[p.connectionQuality] }} />}
        </div>
      </div>
      {p.isHost && size !== "small" && (
        <div style={{ position: "absolute", top: "0.3rem", left: "0.3rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: "rgba(139,92,246,0.9)", fontSize: "0.62rem", fontWeight: 700, color: "#fff" }}>HOST</div>
      )}
    </div>
  );
}

// ─── DocCommentCard ───────────────────────────────────────────────────────────

function DocCommentCard({ thread, currentUser, onReply, onResolve }: {
  thread: DocumentCommentThread;
  currentUser: string;
  onReply: (threadId: string, body: string) => void;
  onResolve: () => void;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const isResolved = thread.status === "resolved";
  const submit = () => {
    if (!replyBody.trim()) return;
    onReply(thread.id, replyBody.trim());
    setReplyBody("");
    setReplyOpen(false);
  };
  return (
    <div style={{ padding: "0.6rem 0.7rem", borderRadius: "7px", background: isResolved ? "#0f172a" : "#1e293b", border: `1px solid ${isResolved ? "#1e293b" : "#334155"}`, opacity: isResolved ? 0.6 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.4rem", marginBottom: "0.3rem" }}>
        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#e2e8f0" }}>{thread.created_by}</span>
        <div style={{ display: "flex", gap: "0.3rem", flexShrink: 0 }}>
          <button onClick={onResolve} title={isResolved ? "Reopen" : "Resolve"} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.6rem", color: isResolved ? "#22c55e" : "#64748b", padding: "0 2px" }}>
            {isResolved ? "✓ Resolved" : "Resolve"}
          </button>
        </div>
      </div>
      <p style={{ margin: "0 0 0.4rem", fontSize: "0.73rem", color: "#94a3b8", lineHeight: 1.5 }}>{thread.body}</p>
      {thread.replies.map(r => (
        <div key={r.id} style={{ marginLeft: "0.6rem", paddingLeft: "0.6rem", borderLeft: "2px solid #334155", marginTop: "0.35rem" }}>
          <span style={{ fontSize: "0.62rem", fontWeight: 700, color: "#cbd5e1" }}>{r.author}</span>
          <p style={{ margin: "0.1rem 0 0", fontSize: "0.7rem", color: "#94a3b8" }}>{r.body}</p>
        </div>
      ))}
      {!isResolved && (
        replyOpen ? (
          <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.35rem" }}>
            <input value={replyBody} onChange={e => setReplyBody(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Reply…" style={{ flex: 1, padding: "0.25rem 0.4rem", fontSize: "0.68rem", borderRadius: "4px", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9" }} />
            <button onClick={submit} style={{ padding: "0.25rem 0.5rem", borderRadius: "4px", background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.65rem", fontWeight: 600 }}>Send</button>
            <button onClick={() => setReplyOpen(false)} style={{ padding: "0.25rem 0.4rem", borderRadius: "4px", background: "#334155", color: "#94a3b8", border: "none", cursor: "pointer", fontSize: "0.65rem" }}>✕</button>
          </div>
        ) : (
          <button onClick={() => setReplyOpen(true)} style={{ marginTop: "0.35rem", background: "none", border: "none", cursor: "pointer", color: "#60a5fa", fontSize: "0.65rem", padding: 0 }}>Reply</button>
        )
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export type LiveMeetingEntryAction =
  | "start_meeting"
  | "join_meeting"
  | "rejoin_meeting"
  | "continue_meeting"
  | "resume_meeting"
  | "resume_after_break";

interface LiveMeetingWorkspaceProps {
  meetingId: string;
  entryAction?: LiveMeetingEntryAction;
  onClose: () => void;
  openedFrom?: string;
}

export function LiveMeetingWorkspace({ meetingId, entryAction, onClose, openedFrom: _openedFrom }: LiveMeetingWorkspaceProps) {

  // ── Registries ────────────────────────────────────────────────────────────
  const { items: meetings, update: updateMeeting }                       = useMeetingRegistry();
  const { items: decisionItems,    add: addDecision }                    = useDecisionRegistry();
  const { items: actionItems,      add: addAction }                      = useActionItemRegistry();
  const { items: motionItems,      add: addMotionRec }                   = useMotionRegistry();
  const {                          add: addMinutes }                      = useMinutesRegistry();
  const { items: resolutionItems,  add: addResolution }                  = useResolutionRegistry();
  const { items: voteItems,        add: addVoteRecord }                  = useVoteRegistry();
  const { items: allParticipants }                                       = useParticipantRegistry();
  const { items: allAgendaItems, add: addAgendaItem }                    = useAgendaRegistry();
  const { items: meetingAgendaLinks }                                    = useMeetingAgendaLinkRegistry();
  const { items: agendaDocLinks }                                        = useAgendaDocumentLinkRegistry();
  const { items: allDocuments }                                          = useDocumentRegistry();
  const { items: docCommentThreads, add: addDocThread, update: updateDocThread } = useDocumentCommentRegistry();
  const { add: addInteraction }                                          = useMeetingInteractionRegistry();
  const { items: liveSessions, add: addSession, update: updateSession }  = useLiveMeetingSessionRegistry();
  const { items: attendanceItems, add: addAttendanceRec, update: updateAttendanceRec } = useAttendanceRegistry();
  const { add: addQuorumEvent }                                          = useQuorumEventRegistry();
  const { items: govBodies }                                             = useGovernanceRegistry();
  const { items: partGroups }                                            = useParticipantGroupRegistry();
  const { items: quorumRules }                                           = useQuorumRuleRegistry();
  const { items: allParticipantLinks }                                   = useMeetingParticipantLinkRegistry();
  const { items: bmsUsers }                                              = useBmsUserRegistry();
  const currentUser                                                      = useCurrentUser();

  const meeting = meetings.find(m => m.meeting_id === meetingId);

  // Build participant list from registry — no synthetic defaults
  const baseParticipants: VirtualParticipant[] = (() => {
    const fromReg = allParticipants.filter(p => p.meeting_id === meetingId);
    if (fromReg.length > 0) {
      return fromReg.map(p => ({
        id: p.participant_id, name: p.name, role: p.role, initials: INITIALS(p.name),
        isMuted: false, isCameraOff: false, isSpeaking: false, handRaised: false,
        connectionQuality: "good" as ConnectionQuality, isHost: p.role === "Chairperson",
      }));
    }
    // Also try canonical participant links (preferred path after Meeting Creation)
    const linksForMeeting = allParticipantLinks.filter(l => l.meeting_id === meetingId);
    if (linksForMeeting.length > 0) {
      return linksForMeeting.map(l => {
        const user = bmsUsers.find(u => u.id === l.user_id);
        const name = user?.name ?? l.user_id;
        return {
          id: l.user_id, name, role: l.participant_type,
          initials: INITIALS(name),
          isMuted: false, isCameraOff: false, isSpeaking: false, handRaised: false,
          connectionQuality: "good" as ConnectionQuality, isHost: l.participant_type === "Chairperson",
        };
      });
    }
    return []; // no canonical data — empty state shown in UI
  })();

  const agendaItems: LiveAgendaItem[] = (() => {
    // 1. Try meeting-agenda links (preferred — gives correct display order)
    const links = meetingAgendaLinks
      .filter(l => l.meeting_id === meetingId)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));

    const linkedAgendas = links
      .map(l => allAgendaItems.find(a => a.agenda_id === l.agenda_id || a.id === l.agenda_id))
      .filter((a): a is NonNullable<typeof a> => !!a);

    // Expand each linked agenda to include its descendants (children + grandchildren)
    const expandedIds = new Set<string>();
    const expandedItems: typeof linkedAgendas = [];

    const collect = (id: string, depth: number) => {
      if (expandedIds.has(id) || depth > 3) return;
      expandedIds.add(id);
      const item = allAgendaItems.find(a => a.id === id || a.agenda_id === id);
      if (item) {
        expandedItems.push(item);
        allAgendaItems
          .filter(c => c.parent_agenda_id === id)
          .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
          .forEach(c => collect(c.id, depth + 1));
      }
    };

    linkedAgendas.forEach(a => collect(a.id, 1));

    // Resolve a raw parent_agenda_id to the key format used by this list (agenda_id ?? id)
    const resolveParentKey = (pid: string | undefined): string | undefined => {
      if (!pid) return undefined;
      const p = allAgendaItems.find(a => a.id === pid || a.agenda_id === pid);
      return p ? (p.agenda_id ?? p.id) : pid;
    };

    if (expandedItems.length > 0) {
      return expandedItems.map(a => ({
        key: a.agenda_id ?? a.id,
        title: a.agenda_title,
        duration: parseInt(a.estimated_duration) || 15,
        purpose: a.purpose ?? "",
        presenter: (a as unknown as { presenter?: string }).presenter ?? "",
        level: a.agenda_level ?? 1,
        parentKey: resolveParentKey(a.parent_agenda_id),
        description: a.description ?? "",
        owner: (a as unknown as { owner?: string }).owner ?? "",
      }));
    }

    // 2. Fallback: direct meeting_id filter
    const fromReg = allAgendaItems.filter(a => a.meeting_id === meetingId);
    if (fromReg.length > 0) {
      return fromReg.map(a => ({
        key: a.agenda_id ?? a.id,
        title: a.agenda_title,
        duration: parseInt(a.estimated_duration) || 15,
        purpose: a.purpose ?? "",
        presenter: (a as unknown as { presenter?: string }).presenter ?? "",
        level: a.agenda_level ?? 1,
        parentKey: resolveParentKey(a.parent_agenda_id),
        description: a.description ?? "",
      }));
    }
    return []; // no linked agendas — empty state shown in UI
  })();

  // ── Governance quorum ──────────────────────────────────────────────────────
  const govBody    = govBodies.find(g => g.body_name === meeting?.committee);
  const partGroup  = partGroups.find(g => g.governance_body === meeting?.committee && g.group_type === "Voting Members");
  const govQuorumRule = quorumRules.find(r => r.body_name === meeting?.committee && r.status === "Active");
  const memberCount = parseInt(partGroup?.member_count ?? govBody?.member_count ?? "0") || baseParticipants.length;
  // Priority: QuorumRule registry → participant group rule → governance body requirement → default 60%
  const quorumPct   = parseQuorumPct(govQuorumRule?.quorum_percent ?? partGroup?.quorum_rule ?? govBody?.quorum_requirement, memberCount);

  // ── Canonical participant links ────────────────────────────────────────────
  const meetingLinks = allParticipantLinks.filter(l => l.meeting_id === meetingId);

  // ── Resolve the canonical current-user participant relationship ───────────
  const myLink = meetingLinks.find(l => l.user_id === currentUser.id);
  // Derive the user's meeting role from their canonical participant link.
  // Falls back to leadership fields when no link exists (pre-creation state).
  const myRole: MyRole = (() => {
    if (myLink) {
      const t = myLink.participant_type ?? "";
      if (t === "Chairperson" || t === "Chair") return "Chairperson";
      if (t === "Company Secretary" || t === "Secretary") return "Company Secretary";
      if (t === "Independent Director") return "Independent Director";
      if (t === "Presenter") return "Presenter";
      if (t === "Observer") return "Observer";
      if (t === "Guest") return "Guest";
      if (t === "Administrator") return "Administrator";
      return "Board Member";
    }
    if (meeting?.chairperson === currentUser.id || meeting?.chairperson === currentUser.name) return "Chairperson";
    if (meeting?.secretary   === currentUser.id || meeting?.secretary   === currentUser.name) return "Company Secretary";
    if (meeting?.organizer   === currentUser.id || meeting?.organizer   === currentUser.name) return "Administrator";
    return "Board Member";
  })();

  // ── Load persisted session ─────────────────────────────────────────────────
  const initSession = loadSession(meetingId);
  const [ctrlStatus,     setCtrlStatusRaw]    = useState<MeetingCtrlStatus>(initSession.ctrlStatus);
  const [elapsed,        setElapsed]          = useState(initSession.elapsed);
  const [activeIdx,      setActiveIdx]        = useState(initSession.activeIdx);
  const [agendaStatuses, setAgendaStatuses]   = useState<Record<number, AgendaStatus>>(initSession.agendaStatuses);
  const [notes,          setNotes]            = useState<Record<number, string>>(initSession.notes);
  const [motions,        setMotions]          = useState<LiveMotion[]>(initSession.motions);
  const [attendanceMap,  setAttendanceMap]    = useState<Record<string, AttendanceStatus>>(initSession.attendance);
  const [activeVote,     setActiveVote]       = useState<ActiveVote | null>(initSession.activeVote);
  const [timeline,       setTimeline]         = useState<Record<string, string>>(initSession.timeline);
  const [agendaRecusals, setAgendaRecusals]   = useState<Record<string, string[]>>(initSession.agendaRecusals);
  // Transient UI — not persisted
  const [viewerDoc,      setViewerDoc]        = useState<BoardDocument | null>(null);

  // Status map for meeting registry (approval_status field)
  const CTRL_TO_APPROVAL: Record<MeetingCtrlStatus, string> = {
    "not-started": "Scheduled",
    "in-progress": "In Progress",
    "paused":      "Paused",
    "on-break":    "On Break",
    "adjourned":   "Adjourned",
    "ended":       "Awaiting Minutes",
  };

  // Wrap setCtrlStatus to also log timeline and persist to meeting registry
  const setCtrlStatus = useCallback((s: MeetingCtrlStatus) => {
    setCtrlStatusRaw(s);
    setTimeline(prev => ({ ...prev, [`${s}_at`]: nowISO() }));
    if (meeting) updateMeeting(meeting.id, { approval_status: CTRL_TO_APPROVAL[s] } as never);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting, updateMeeting]);

  // ── Sync canonical session status on mount (canonical > localStorage) ─────
  // Only runs once. If the Live Session registry already has a record for this
  // meeting, use its status as the authoritative source so that refresh and
  // resume correctly restore the running session rather than re-reading a
  // stale localStorage snapshot.
  // ── Seed rich mock content once agendaItems first loads ─────────────────────
  const agendaSeedDone = useRef(false);
  useEffect(() => {
    if (agendaSeedDone.current || agendaItems.length === 0) return;
    agendaSeedDone.current = true;

    const SEED_AUTHORS = [
      "Dr. Sarah Mitchell", "Mr. Md. Nurul Amin", "Ms. Nasrin Sultana",
      "Mr. Abdul Awal Mintoo", "Mr. Shafiuddin Ahmed", "Ms. Tahmina Begum",
    ];
    const SEED_COMMENTS: Record<string, string[][]> = {
      "For noting":      [
        ["Thank you for the clear presentation. I have no further questions at this stage.", "The materials were comprehensive. Please note the Chairperson's observation for the record."],
        ["Noted with thanks. The Governance team should circulate the updated schedule to all members before the next session.", "I would request that a summary is included in the minutes for future reference."],
      ],
      "For approval":    [
        ["I support the recommendation. The supporting analysis is thorough and the proposed approach is consistent with our risk framework.", "I propose we proceed to a formal vote. The NRC recommendation aligns with our benchmarking commitments."],
        ["Before we vote, can management confirm that the legal review is complete? I want to ensure we have full comfort.", "Confirmed — the Company Secretary has confirmed that all regulatory pre-conditions have been satisfied."],
      ],
      "For discussion":  [
        ["I'd like to raise a concern about the timeline. The Q3 targets appear optimistic given the current market conditions.", "The CFO has addressed this in the supplementary note circulated this morning — pages 7 and 8 cover the revised projections."],
        ["Can we have a clearer breakdown of the variance by business segment? The consolidated figures make it difficult to identify root causes.", "Management can provide a segment-level breakout. I suggest we note this as an action item for the CFO."],
      ],
      "For information":  [
        ["This is a very helpful update. The progress on the digital initiative is encouraging. What is the expected go-live date for Phase 2?", "Phase 2 is scheduled for Q4 2026 subject to regulatory sandbox approval. The MD has flagged this as the critical dependency."],
        ["The talent metrics are positive but I note the attrition rate in the technology division remains elevated. Is there a targeted retention plan in place?", "Correct — HR is implementing a targeted retention programme for tech roles. Details are in the supplementary paper attached to the board pack."],
      ],
      "For review":      [
        ["The findings are well-documented. I want to ensure management's responses are robust and not merely procedural tick-boxes.", "The Audit Committee has independently reviewed management's responses and is satisfied with the remediation timelines proposed."],
        ["Can we confirm the deadline for resolution of the critical-rated finding? The timeline proposed seems too extended given the risk level.", "Management is proposing a 30-day resolution period. The Committee can include a provision for a two-week progress report."],
      ],
    };

    const SEED_MOTIONS: Record<string, { title: string; proposedBy: string; secondedBy: string; status: "Proposed" | "Seconded" | "Passed" | "Rejected" }> = {
      "For approval": {
        title: "",
        proposedBy: SEED_AUTHORS[2],
        secondedBy: SEED_AUTHORS[3],
        status: "Proposed",
      },
    };

    const newComments: Record<string, Array<{id:string;author:string;body:string;at:string}>> = {};
    const newVotes: Record<string, Record<string, "For"|"Against"|"Abstain">> = {};
    const newMotions: LiveMotion[] = [];
    const now = Date.now();

    agendaItems.forEach((item, idx) => {
      const purposeKey = item.purpose in SEED_COMMENTS ? item.purpose : "For information";
      const commentPool = SEED_COMMENTS[purposeKey] ?? SEED_COMMENTS["For information"];
      const pair = commentPool[idx % commentPool.length];
      newComments[item.key] = [
        { id: `sc-${idx}-0`, author: SEED_AUTHORS[idx % SEED_AUTHORS.length],     body: pair[0], at: new Date(now - 3600000 * (4 - idx * 0.4)).toISOString() },
        { id: `sc-${idx}-1`, author: SEED_AUTHORS[(idx + 2) % SEED_AUTHORS.length], body: pair[1], at: new Date(now - 1800000 * (3 - idx * 0.3)).toISOString() },
        { id: `sc-${idx}-2`, author: SEED_AUTHORS[(idx + 4) % SEED_AUTHORS.length], body: `Further to the above — I concur with the position taken. The ${item.purpose.toLowerCase()} process is appropriate given the materiality of this item. Recommend we proceed as proposed.`, at: new Date(now - 600000 * (2 - idx * 0.1)).toISOString() },
      ];

      // Quick votes for all non-"noting" items
      if (item.purpose !== "For noting") {
        newVotes[`qv-${item.key}`] = {
          [SEED_AUTHORS[0]]: "For",
          [SEED_AUTHORS[1]]: "For",
          [SEED_AUTHORS[2]]: "For",
          [SEED_AUTHORS[3]]: idx % 3 === 0 ? "Abstain" : "For",
          [SEED_AUTHORS[4]]: "For",
          [SEED_AUTHORS[5]]: idx % 4 === 0 ? "Against" : "For",
        };
      }

      // Motions for approval/discussion items
      if (item.purpose === "For approval" || item.purpose === "For discussion") {
        const mId = `sm-${idx}`;
        const purposePrefix = item.purpose === "For approval" ? "That the Board resolves to approve" : "That the Board notes and endorses the management position on";
        newMotions.push({
          id: mId,
          agendaKey: item.key,
          title: `${purposePrefix} ${item.title} as presented, and authorises management to proceed in accordance with the supporting paper tabled at this meeting.`,
          proposedBy: SEED_AUTHORS[(idx + 2) % SEED_AUTHORS.length],
          secondedBy: SEED_AUTHORS[(idx + 4) % SEED_AUTHORS.length],
          status: item.purpose === "For approval" ? "Proposed" : "Proposed",
        });
        newVotes[mId] = {
          [SEED_AUTHORS[0]]: "For",
          [SEED_AUTHORS[1]]: "For",
          [SEED_AUTHORS[2]]: "For",
          [SEED_AUTHORS[3]]: idx % 3 === 0 ? "Abstain" : "For",
        };
      }
    });

    setAgendaComments(prev => {
      const merged: typeof newComments = {};
      agendaItems.forEach(item => { merged[item.key] = newComments[item.key] ?? []; });
      Object.entries(prev).forEach(([k, v]) => { if (v.length > 0) merged[k] = [...(merged[k] ?? []), ...v]; });
      return merged;
    });
    setAgendaMotionVotes(prev => ({ ...newVotes, ...prev }));
    setAgendaItemMotions(prev => {
      const existingIds = new Set(prev.map(m => m.id));
      return [...prev, ...newMotions.filter(m => !existingIds.has(m.id))];
    });
  }, [agendaItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasSyncedCanonical = useRef(false);
  useEffect(() => {
    if (hasSyncedCanonical.current || !meetingId) return;
    const canonical = liveSessions.find(s => s.meeting_id === meetingId);
    if (!canonical) return;
    hasSyncedCanonical.current = true;
    const map: Record<string, MeetingCtrlStatus> = {
      active: "in-progress", paused: "paused", ended: "ended", not_started: "not-started",
    };
    const canonicalCtrl = map[canonical.session_status ?? ""] ?? null;
    if (canonicalCtrl && canonicalCtrl !== ctrlStatus) {
      setCtrlStatusRaw(canonicalCtrl);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Persist to localStorage on every state change ─────────────────────────
  useEffect(() => {
    if (!meetingId) return;
    saveSession(meetingId, { ctrlStatus, elapsed, activeIdx, agendaStatuses, notes, motions, attendance: attendanceMap, activeVote, timeline, agendaRecusals });
  }, [meetingId, ctrlStatus, elapsed, activeIdx, agendaStatuses, notes, motions, attendanceMap, activeVote, timeline, agendaRecusals]);

  // ── UI state (not persisted — transient display only) ─────────────────────
  // "readiness" → only for start_meeting with not-started status
  // "prejoin"   → for join actions or after readiness completes
  // "meeting"   → the live workspace
  const determineInitialPhase = (): "readiness" | "prejoin" | "meeting" => {
    if (ctrlStatus !== "not-started") return "meeting";
    if (entryAction === "start_meeting") return "readiness";
    if (entryAction === "join_meeting")  return "prejoin";
    return "meeting";
  };
  const [phase, setPhase]             = useState<"readiness" | "prejoin" | "meeting">(determineInitialPhase);
  const [myMicOn, setMyMicOn]         = useState(true);
  const [myCamOn, setMyCamOn]         = useState(true);
  const [isSharing, setIsSharing]     = useState(false);
  const [isRecording, setIsRecording]               = useState(false);
  const [isRecordingPaused, setIsRecordingPaused]   = useState(false);
  const [isTranscribing, setIsTranscribing]         = useState(false);
  const [isTranscribingPaused, setIsTranscribingPaused] = useState(false);
  const [isMinutesCapture, setIsMinutesCapture]     = useState(false);
  const [isMinutesPaused, setIsMinutesPaused]       = useState(false);
  const [recordingStartedAt, setRecordingStartedAt] = useState<string | null>(null);
  const [isLocked, setIsLocked]       = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode]       = useState<ViewMode>("speaker");
  const [presentingAgendaIdx, setPresentingAgendaIdx] = useState<number | null>(null);
  const [presentingDoc, setPresentingDoc] = useState<BoardDocument | null>(null);
  // agendaComments: keyed by agenda item key, value is array of {author, body, at}
  const [agendaComments, setAgendaComments] = useState<Record<string, Array<{id:string;author:string;body:string;at:string}>>>({
    [`AGD-${new Date().getFullYear()}-0036`]: [
      { id: "ac-001", author: "Mr. Md. Nurul Amin", body: "Can we get the Q2 variance report circulated before we proceed? The numbers in this draft differ from the management pack.", at: new Date(Date.now() - 2 * 3600000).toISOString() },
    ],
    [`AGD-${new Date().getFullYear()}-0010`]: [
      { id: "ac-002", author: "Ms. Nasrin Sultana", body: "NRC recommends tabling the approval pending receipt of the independent benchmarking confirmation letter.", at: new Date(Date.now() - 1 * 3600000).toISOString() },
      { id: "ac-003", author: "Mr. Abdul Awal Mintoo", body: "Agreed. We can pass a conditional approval today and ratify once the letter is received.", at: new Date(Date.now() - 30 * 60000).toISOString() },
    ],
  });
  const [agendaCommentInputs, setAgendaCommentInputs] = useState<Record<string, string>>({});
  // Per-agenda inline motions (separate from the formal motion registry)
  const YEAR = new Date().getFullYear();
  const [agendaItemMotions, setAgendaItemMotions] = useState<LiveMotion[]>([
    {
      id: "aim-001", agendaKey: `AGD-${YEAR}-0010`,
      title: `That the Board approve the revised remuneration framework effective 1 July ${YEAR}, subject to receipt of the independent benchmarking confirmation letter from Willis Towers Watson.`,
      proposedBy: "Ms. Nasrin Sultana", secondedBy: "Mr. Md. Nurul Amin", status: "Proposed",
    },
  ]);
  const [agendaMotionForms, setAgendaMotionForms] = useState<Record<string, { open: boolean; text: string; proposedBy: string; secondedBy: string }>>({});
  const [agendaMotionVotes, setAgendaMotionVotes] = useState<Record<string, Record<string, "For" | "Against" | "Abstain">>>({
    "aim-001": { "Ms. Nasrin Sultana": "For", "Mr. Md. Nurul Amin": "For", "Mr. Md. Abul Bashar": "Abstain" },
  });
  const [activeSpeakerId, setActiveSpeakerId] = useState<string>("");
  const [docSidebarTab,  setDocSidebarTab]  = useState<"comments" | "motions" | "voting">("comments");
  const [agendaSidebarTab, setAgendaSidebarTab] = useState<"comments" | "motions" | "voting">("comments");
  const [agendaDetailTab, setAgendaDetailTab] = useState<"info" | "activities" | "docs" | "comments" | "voting">("info");
  const [panelOpen, setPanelOpen]     = useState(true);
  const [panelTab, setPanelTab]       = useState<PanelTab>("agenda");
  const [chatOpen, setChatOpen]       = useState(false);
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const [speakingQueue, setSpeakingQueue] = useState<string[]>([]);
  const [chatMessages, setChatMessages]   = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]         = useState("");
  const [closureOpen, setClosureOpen]     = useState(false);
  const [closureChecked, setClosureChecked] = useState<Record<string, boolean>>({});
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false);
  const [participants, setParticipants]   = useState<VirtualParticipant[]>(baseParticipants);

  // Modal flags
  const [motionOpen,     setMotionOpen]     = useState(false);
  const [motionProposer, setMotionProposer] = useState<string>("");
  const [voteOpen,       setVoteOpen]       = useState(false);
  const [decisionOpen,   setDecisionOpen]   = useState(false);
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [actionOpen,     setActionOpen]     = useState(false);
  const [minutesOpen,    setMinutesOpen]    = useState(false);
  const [reopenOpen,     setReopenOpen]     = useState(false);
  const [reopenReason,   setReopenReason]   = useState("");
  const [agendaReasonModal, setAgendaReasonModal] = useState<{ action: "Defer" | "Skip" | "Reopen"; idx: number } | null>(null);
  const [agendaReasonText,  setAgendaReasonText]  = useState("");
  const [tempAgendaOpen, setTempAgendaOpen] = useState(false);
  const [tempAgendaTitle, setTempAgendaTitle] = useState("");
  const [tempAgendaDesc,  setTempAgendaDesc]  = useState("");
  const [agendaDetailIdx, setAgendaDetailIdx] = useState<number | null>(null);
  const [agendaChildListParentIdx, setAgendaChildListParentIdx] = useState<number | null>(null);

  const [clockStr, setClockStr] = useState(fmtClock());
  useEffect(() => { const t = setInterval(() => setClockStr(fmtClock()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    if (ctrlStatus !== "in-progress") return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [ctrlStatus]);

  // Active speaker is driven by actual audio detection (not simulated).
  // activeSpeakerId defaults to the current user's participant ID when joining.

  // ── Quorum calculation using shared engine (Section 7) ────────────────────
  const ACTIVE_STATES: AttendanceStatus[] = ["Present", "Temporarily Away"];
  const presentIds  = Object.entries(attendanceMap).filter(([, s]) => ACTIVE_STATES.includes(s as AttendanceStatus)).map(([id]) => id);
  const recusedIds  = Object.entries(attendanceMap).filter(([, s]) => s === "Recused").map(([id]) => id);
  const presentCount = presentIds.length;

  // Filter canonical quorum links to those who are present and not recused
  const presentQuorumLinks = meetingLinks
    .filter(l => l.quorum_eligible && presentIds.includes(l.user_id) && !recusedIds.includes(l.user_id));
  const quorumCalcResult = calculateMeetingQuorum({
    boardCommitteeId: meeting?.committee ?? "",
    boardCommitteeName: meeting?.committee ?? "",
    participantLinks: presentQuorumLinks,
    governanceBodies: govBodies,
    quorumRules,
  });
  const quorumMet      = quorumCalcResult.status === "expected" || quorumCalcResult.status === "at_risk";
  const quorumRequired = quorumCalcResult.requiredCount;
  const eligibleCount  = meetingLinks.filter(l => l.quorum_eligible && !recusedIds.includes(l.user_id)).length;

  // Legacy display string (kept for Minutes autosave)
  const quorumRuleDisplay = govQuorumRule
    ? `${govQuorumRule.quorum_percent} (min ${govQuorumRule.minimum_members} members)`
    : (partGroup?.quorum_rule ?? govBody?.quorum_requirement ?? "Not Configured");

  // ── Meeting controls ───────────────────────────────────────────────────────
  const handleStart = useCallback(() => {
    setCtrlStatus("in-progress");
    setAgendaStatuses(p => ({ ...p, 0: "In Discussion" }));
    // Ensure canonical session is active
    const existingSid = liveSessions.find(s => s.meeting_id === meetingId)?.id;
    if (existingSid) updateSession(existingSid, { session_status: "active" } as never);
    toast.success("Meeting started");
  }, [setCtrlStatus, liveSessions, meetingId, updateSession]);

  const handleEnd = useCallback(() => {
    setCtrlStatus("ended");
    // Update canonical session record so refresh/resume know it's ended
    const sid = liveSessions.find(s => s.meeting_id === meetingId)?.id;
    if (sid) updateSession(sid, { session_status: "ended", ended_at: nowISO(), ended_by: currentUser.id } as never);
    // Auto-generate structured draft minutes and save to registry
    if (meetingId) {
      const mId = mkId("MIN");
      const attendanceSummary = participants.map(p => {
        const st = attendanceMap[p.id] ?? "Not Yet";
        return `${p.name} (${p.role}) — ${st}`;
      }).join("\n");

      const agendaSummary = agendaItems.map((item, idx) => {
        const st = agendaStatuses[idx] ?? "Not Started";
        const note = notes[idx] ? `\n   Notes: ${notes[idx]}` : "";
        return `${idx + 1}. ${item.title} [${st}]${note}`;
      }).join("\n");

      const motionSummary = motions.length > 0
        ? motions.map(m => `• ${m.title} — ${m.status} (By: ${m.proposedBy}${m.secondedBy ? `, Seconded: ${m.secondedBy}` : ""})`).join("\n")
        : "No motions recorded.";

      const voteSummary = activeVote
        ? `${activeVote.motionTitle}: ${activeVote.result ?? activeVote.status} (For: ${activeVote.votesFor}, Against: ${activeVote.votesAgainst}, Abstain: ${activeVote.abstentions})`
        : "No votes held.";

      const quorumSummary = `${presentCount} of ${eligibleCount} eligible members present.\nRule applied: ${quorumRuleDisplay}\nQuorum was ${quorumMet ? "met" : "NOT met"} at close of meeting.`;

      const fullSummary = [
        "=== ATTENDANCE ===",
        attendanceSummary,
        "",
        "=== QUORUM ===",
        quorumSummary,
        "",
        "=== AGENDA ITEMS ===",
        agendaSummary,
        "",
        "=== MOTIONS ===",
        motionSummary,
        "",
        "=== VOTING ===",
        voteSummary,
      ].join("\n");

      addMinutes({
        id: mId, minutes_id: mId,
        meeting_id: meetingId,
        meeting_title: meeting?.meeting_title ?? "",
        minutes_template: "Standard",
        minute_taker: "",
        co_authors: "",
        quorum_statement: `Quorum: ${presentCount}/${quorumRequired} present. Rule: ${quorumRuleDisplay}. ${quorumMet ? "Quorum met." : "Quorum NOT met."}`,
        discussion_summary: fullSummary,
        next_meeting_date: "",
        closing_time: nowISO(),
        version: "1.0",
        approval_status: "Draft",
        created_at: nowISO(),
      } as never);

      toast.success("Meeting ended — structured draft minutes saved automatically.");
    }
    setMinutesOpen(true);
  }, [meeting, meetingId, setCtrlStatus, addMinutes, agendaItems, agendaStatuses, notes, motions, activeVote, participants, attendanceMap, presentCount, eligibleCount, quorumRequired, quorumMet, quorumRuleDisplay]);

  const closureAllChecked = CLOSURE_CHECKLIST.every(i => closureChecked[i.key]);

  // ── Attendance (uses canonical participant links) ──────────────────────────
  const setAttendance = useCallback((id: string, status: AttendanceStatus) => {
    setAttendanceMap(prev => ({ ...prev, [id]: status }));
    const participant = participants.find(p => p.id === id);
    const link        = meetingLinks.find(l => l.user_id === id);
    const user        = bmsUsers.find(u => u.id === id);
    if (!meetingId) return;

    const checkInTime  = ACTIVE_STATES.includes(status) ? nowISO() : "";
    const checkOutTime = status === "Left" ? nowISO() : "";
    const existingRec  = attendanceItems.find(a => a.meeting_id === meetingId && a.participant_id === id);
    const pName        = participant?.name ?? user?.name ?? id;
    const pRole        = participant?.role ?? link?.participant_type ?? "Member";
    if (existingRec) {
      updateAttendanceRec(existingRec.id, {
        check_in_time:  checkInTime  || existingRec.check_in_time,
        check_out_time: checkOutTime || existingRec.check_out_time,
        quorum_eligible: status !== "Recused" && (link?.quorum_eligible ?? true) ? "Yes" : "No",
      } as never);
    } else if (ACTIVE_STATES.includes(status)) {
      const aid = mkId("ATT");
      addAttendanceRec({
        id: aid, attendance_id: aid,
        meeting_id: meetingId, meeting_title: meeting?.meeting_title ?? "",
        participant_id: id, participant_name: pName, designation: "", role: pRole,
        check_in_time: checkInTime, check_out_time: checkOutTime,
        attendance_mode: "In-Person",
        quorum_eligible: (link?.quorum_eligible ?? false) ? "Yes" : "No",
        signed: "No", notes: "", created_at: nowISO(),
      } as never);
    }

    // Track quorum threshold change — calculate with updated map
    const updatedMap = { ...attendanceMap, [id]: status };
    const newPresentIds  = Object.entries(updatedMap).filter(([, s]) => ACTIVE_STATES.includes(s as AttendanceStatus)).map(([uid]) => uid);
    const newRecusedIds  = Object.entries(updatedMap).filter(([, s]) => s === "Recused").map(([uid]) => uid);
    const newPresentQuorum = meetingLinks.filter(l => l.quorum_eligible && newPresentIds.includes(l.user_id) && !newRecusedIds.includes(l.user_id));
    const newQuorumCalc = calculateMeetingQuorum({
      boardCommitteeId: meeting?.committee ?? "",
      boardCommitteeName: meeting?.committee ?? "",
      participantLinks: newPresentQuorum,
      governanceBodies: govBodies, quorumRules,
    });
    const wasQuorum  = quorumMet;
    const isNowQuorum = newQuorumCalc.status === "expected" || newQuorumCalc.status === "at_risk";
    if (wasQuorum !== isNowQuorum && meetingId) {
      const qId = mkId("QRM");
      addQuorumEvent({ id: qId, event_id: qId, meeting_id: meetingId, meeting_title: meeting?.meeting_title ?? "", event_type: isNowQuorum ? "Quorum Restored" : "Quorum Lost", quorum_required: String(newQuorumCalc.requiredCount), quorum_present: String(newPresentQuorum.length), quorum_met: isNowQuorum ? "Yes" : "No", recorded_at: nowISO(), recorded_by: "System", notes: quorumStatusLabel(newQuorumCalc), created_at: nowISO() } as never);
      if (!isNowQuorum) {
        toast.error("⚠ Quorum lost! Votes and restricted decisions are blocked.");
      } else {
        toast.success("✓ Quorum restored. Voting and decisions are unblocked.");
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants, meetingLinks, meetingId, attendanceMap, attendanceItems, meeting, quorumMet, govBodies, quorumRules, bmsUsers, updateAttendanceRec, addAttendanceRec, addQuorumEvent]);

  // ── Vote lifecycle ─────────────────────────────────────────────────────────

  const openVoteForMotion = (motion: LiveMotion, voteType: string, threshold: string) => {
    if (activeVote?.status === "Open") { toast.error("A vote is already open. Close it first."); return; }
    const thresholdPct = calcThresholdPct(threshold);
    const vId = mkId("VT");
    const vote: ActiveVote = {
      id: vId, motionId: motion.id, motionTitle: motion.title,
      agendaItem: agendaItems[activeIdx]?.title ?? "",
      voteType: voteType as ActiveVote["voteType"],
      threshold, thresholdPct,
      openedAt: nowISO(), openedBy: "Chairperson",
      castVotes: {}, status: "Open",
      votesFor: 0, votesAgainst: 0, abstentions: 0,
      reopenHistory: [],
    };
    setActiveVote(vote);
    setMotions(prev => prev.map(m => m.id === motion.id ? { ...m, status: "Seconded", linkedVoteId: vId } : m));
    setPanelTab("motions");
    toast.success(`Vote opened: "${motion.title}"`);
  };

  const castVote = useCallback((participantId: string, choice: "For" | "Against" | "Abstain") => {
    if (!activeVote || activeVote.status !== "Open") return;
    setActiveVote(prev => {
      if (!prev) return prev;
      const updated = { ...prev, castVotes: { ...prev.castVotes, [participantId]: choice } };
      updated.votesFor      = Object.values(updated.castVotes).filter(v => v === "For").length;
      updated.votesAgainst  = Object.values(updated.castVotes).filter(v => v === "Against").length;
      updated.abstentions   = Object.values(updated.castVotes).filter(v => v === "Abstain").length;
      return updated;
    });
  }, [activeVote]);

  const closeVote = useCallback(() => {
    if (!activeVote || activeVote.status !== "Open") return;
    const eligible    = presentCount - (activeVote.chairmanCastingVote ? 0 : 0);
    const votesCast   = activeVote.votesFor + activeVote.votesAgainst;
    const passed      = activeVote.votesFor > votesCast * activeVote.thresholdPct;
    const result: "Passed" | "Failed" = passed ? "Passed" : "Failed";

    const closed: ActiveVote = { ...activeVote, status: "Closed", result };
    setActiveVote(closed);

    // Update motion status
    setMotions(prev => prev.map(m => m.id === activeVote.motionId ? { ...m, status: result === "Passed" ? "Passed" : "Rejected" } : m));

    // Save individual VoteRecords per voter + one summary record
    if (meetingId) {
      const now = nowISO();
      const auditNote = `${activeVote.voteType} · ${activeVote.threshold} · For: ${activeVote.votesFor} · Against: ${activeVote.votesAgainst} · Abstain: ${activeVote.abstentions}${activeVote.reopenHistory.length > 0 ? ` · Reopened ${activeVote.reopenHistory.length}×` : ""}`;

      // Per-voter records (non-secret ballot only; secret ballot saves anonymised aggregate)
      if (activeVote.voteType !== "Secret Ballot") {
        Object.entries(activeVote.castVotes).forEach(([participantId, choice]) => {
          const voter = participants.find(p => p.id === participantId);
          const vrcId = mkId("VRC");
          addVoteRecord({
            id: vrcId, vote_id: `${activeVote.id}-${participantId}`,
            meeting_id: meetingId,
            motion_id: activeVote.motionId ?? "",
            motion_title: activeVote.motionTitle,
            voter_name: voter?.name ?? participantId,
            vote: choice,
            vote_weight: "1",
            timestamp: now,
            notes: auditNote,
            created_at: now,
          } as never);
        });
      }

      // Summary / audit record
      const sumId = mkId("VRC");
      addVoteRecord({
        id: sumId, vote_id: activeVote.id,
        meeting_id: meetingId,
        motion_id: activeVote.motionId ?? "",
        motion_title: activeVote.motionTitle,
        voter_name: activeVote.voteType === "Secret Ballot" ? "Secret Ballot (anonymised)" : "Summary",
        vote: result,
        vote_weight: String(activeVote.votesFor + activeVote.votesAgainst + activeVote.abstentions),
        timestamp: now,
        notes: auditNote,
        created_at: now,
      } as never);
    }

    toast[result === "Passed" ? "success" : "error"](`Vote ${result}: ${activeVote.votesFor}–${activeVote.votesAgainst} (${activeVote.abstentions} abstain)`);
  }, [activeVote, meetingId, presentCount, addVoteRecord]);

  const cancelVote = useCallback(() => {
    if (!activeVote) return;
    setActiveVote(prev => prev ? { ...prev, status: "Cancelled" } : prev);
    toast("Vote cancelled");
  }, [activeVote]);

  const reopenVote = useCallback((reason: string) => {
    if (!activeVote || !canRecord(myRole)) { toast.error("Only the Chair or Secretary can reopen a vote."); return; }
    setActiveVote(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        status: "Open",
        result: undefined,
        reopenHistory: [...prev.reopenHistory, { at: nowISO(), by: myRole, reason }],
      };
    });
    toast.success("Vote reopened with reason recorded.");
  }, [activeVote, myRole]);

  // ── Record creators ────────────────────────────────────────────────────────
  const handleMotionSubmit = (values: Record<string, EntryFormValue>) => {
    const motion: LiveMotion = {
      id: mkId("MOT"), title: String(values.motion_title ?? "Motion"),
      proposedBy: String(values.proposed_by ?? ""), secondedBy: String(values.seconded_by ?? ""),
      status: "Proposed",
    };
    setMotions(prev => [...prev, motion]);
    const mId = mkId("MOT");
    addMotionRec({ id: mId, motion_id: mId, meeting_id: meetingId ?? "", agenda_item: agendaItems[activeIdx]?.title ?? "", motion_title: motion.title, motion_text: String(values.motion_text ?? ""), proposed_by: motion.proposedBy, seconded_by: motion.secondedBy, status: "Proposed", votes_for: "0", votes_against: "0", abstentions: "0", notes: "", created_at: nowISO() } as never);
    setMotionOpen(false);
    toast.success("Motion recorded");
  };

  const handleVoteSubmit = (values: Record<string, EntryFormValue>) => {
    const motionId = String(values.related_motion ?? "");
    const motion   = motions.find(m => m.id === motionId) ?? { id: "", title: String(values.vote_title ?? "Vote"), proposedBy: "", secondedBy: "", status: "Proposed" as const };
    const voteType = String(values.vote_type ?? "Open");
    const threshold = String(values.threshold ?? "Simple Majority");
    openVoteForMotion(motion, voteType, threshold);
    setVoteOpen(false);
  };

  const handleDecisionSubmit = (values: Record<string, EntryFormValue>) => {
    const dId = mkId("DEC");
    addDecision({ id: dId, decision_id: dId, decision_title: String(values.decision_title ?? "Decision"), source_meeting: meetingId ?? "", agenda_item: agendaItems[activeIdx]?.title ?? "", decision_type: String(values.decision_type ?? "Resolution"), decision_owner: String(values.decision_owner ?? "Board"), effective_date: String(values.effective_date ?? ""), implementation_deadline: "", financial_impact: "", implementation_status: "Not Started", approval_status: "Approved", created_at: nowISO(), activity_history: [{ action: "Decision recorded during live meeting", by: myRole, at: nowISO() }] } as never);
    setDecisionOpen(false);
    toast.success("Decision saved to Decision Register");
  };

  const handleResolutionSubmit = (values: Record<string, EntryFormValue>) => {
    const rId = mkId("RES");
    // Link to active vote's motion if available
    const linkedMotion  = activeVote ? motions.find(m => m.id === activeVote.motionId) : undefined;
    const linkedVoteId  = activeVote?.id ?? "";
    addResolution({
      id: rId, resolution_id: rId, resolution_no: rId,
      meeting_id: meetingId ?? "", meeting_title: meeting?.meeting_title ?? "",
      resolution_title: String(values.resolution_title ?? "Resolution"),
      resolution_text:  String(values.resolution_text ?? ""),
      resolution_type:  String(values.resolution_type ?? "Ordinary"),
      passed_by: String(values.passed_by ?? (linkedMotion ? "Majority Vote" : "Unanimous Vote")),
      votes_for:     String(values.votes_for     ?? (activeVote?.votesFor ?? "")),
      votes_against: String(values.votes_against ?? (activeVote?.votesAgainst ?? "")),
      abstentions:   String(values.abstentions   ?? (activeVote?.abstentions ?? "")),
      effective_date: String(values.effective_date ?? ""),
      implementation_status: "Not Started",
      approval_status: "Passed",
      source_motion: linkedMotion?.title ?? "",
      source_vote:   linkedVoteId,
      agenda_item:   agendaItems[activeIdx]?.title ?? "",
      decision_owner: String(values.decision_owner ?? "Board"),
      created_at: nowISO(),
    } as never);
    setResolutionOpen(false);
    toast.success("Resolution recorded in Resolution Register");
  };

  const handleActionSubmit = (values: Record<string, EntryFormValue>) => {
    const aId = mkId("ACT");
    addAction({ id: aId, action_id: aId, action_title: String(values.action_title ?? "Action Item"), source_meeting: meetingId ?? "", source_decision: "", assigned_to: String(values.assigned_to ?? ""), priority: String(values.priority ?? "Normal"), due_date: String(values.due_date ?? ""), completion_date: "", progress: "0", implementation_status: "Not Started", approval_status: "Open", created_at: nowISO(), activity_history: [{ action: "Action item created during live meeting", by: myRole, at: nowISO() }] } as never);
    setActionOpen(false);
    toast.success("Action item saved to Action Register");
  };

  const handleMinutesSubmit = (values: Record<string, EntryFormValue>) => {
    // Only save additional manual minutes if minute_taker is filled (avoids duplicate auto-generated minutes)
    if (String(values.minute_taker ?? "").trim()) {
      const mId = mkId("MIN");
      addMinutes({
        id: mId, minutes_id: mId,
        meeting_id: meetingId ?? "",
        meeting_title: meeting?.meeting_title ?? "",
        minutes_template: String(values.minutes_template ?? "Standard"),
        minute_taker: String(values.minute_taker ?? ""),
        co_authors: String(values.co_authors ?? ""),
        quorum_statement: String(values.quorum_statement ?? `Quorum: ${presentCount}/${quorumRequired} present (Rule: ${quorumRuleDisplay})`),
        discussion_summary: String(values.discussion_summary ?? ""),
        next_meeting_date: String(values.next_meeting_date ?? ""),
        closing_time: String(values.closing_time ?? nowISO()),
        version: "1.0",
        approval_status: "Draft",
        created_at: nowISO(),
      } as never);
    }
    // Mark meeting as awaiting secretary review
    if (meeting) updateMeeting(meeting.id, { approval_status: "Awaiting Minutes" } as never);
    setMinutesOpen(false);
    onClose();
    toast.success("Draft minutes saved. Review in Minutes Management.");
  };

  // ── Agenda helpers ─────────────────────────────────────────────────────────
  const completeItem = (idx: number) => {
    setAgendaStatuses(p => ({ ...p, [idx]: "Completed" }));
    const next = idx + 1;
    if (next < agendaItems.length) { setAgendaStatuses(p => ({ ...p, [next]: "In Discussion" })); setActiveIdx(next); }
  };

  const agendaColor = (s?: AgendaStatus) => {
    if (s === "In Discussion") return "var(--color-primary)";
    if (s === "Completed")     return "#22c55e";
    if (s === "Deferred")      return "#f59e0b";
    if (s === "Skipped")       return "#94a3b8";
    return "transparent";
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    const msgId = mkId("MSG");
    setChatMessages(prev => [...prev, { id: msgId, from: currentUser.name, text: chatInput, time: fmtClock() }]);
    // Persist to interaction registry
    if (meetingId) {
      addInteraction({
        id: msgId, meeting_id: meetingId,
        agenda_id: agendaItems[activeIdx]?.key,
        user_id: currentUser.id,
        interaction_type: "chat",
        content: chatInput,
        metadata: { sender: currentUser.name, time: nowISO() },
        created_at: nowISO(),
      } as never);
    }
    setChatInput("");
  };

  // ── Session / recording / transcription persistence ───────────────────────
  const getOrCreateSession = (): string => {
    if (!meetingId) return "";
    const existing = liveSessions.find(s => s.meeting_id === meetingId);
    if (existing) return existing.id;
    const sid = mkId("SES");
    addSession({
      id: sid, meeting_id: meetingId,
      started_at: nowISO(), started_by: currentUser.id,
      session_status: "active",
      recording_status: "not_started",
      transcription_status: "not_started",
      minutes_capture_status: "not_started",
      created_at: nowISO(),
    } as never);
    return sid;
  };

  const toggleRecording = () => {
    if (!meetingId) return;
    const now = nowISO();
    const sid = getOrCreateSession();
    if (!isRecording) {
      setRecordingStartedAt(now);
      setIsRecordingPaused(false);
      if (sid) updateSession(sid, { recording_status: "active" } as never);
      addInteraction({ id: mkId("REC"), meeting_id: meetingId, user_id: currentUser.id, interaction_type: "host_action", content: "Recording started", metadata: { event: "recording_start", time: now }, created_at: now } as never);
      toast.success("Recording started");
    } else {
      if (sid) updateSession(sid, { recording_status: "ended" } as never);
      const dur = recordingStartedAt ? Math.round((Date.now() - new Date(recordingStartedAt).getTime()) / 1000) : 0;
      addInteraction({ id: mkId("REC"), meeting_id: meetingId, user_id: currentUser.id, interaction_type: "host_action", content: "Recording stopped", metadata: { event: "recording_stop", started_at: recordingStartedAt, ended_at: now, duration_seconds: dur }, created_at: now } as never);
      setRecordingStartedAt(null);
      setIsRecordingPaused(false);
      toast("Recording stopped");
    }
    setIsRecording(v => !v);
  };

  const pauseResumeRecording = () => {
    if (!meetingId || !isRecording) return;
    const now = nowISO();
    const sid = getOrCreateSession();
    const nextPaused = !isRecordingPaused;
    if (sid) updateSession(sid, { recording_status: nextPaused ? "paused" : "active" } as never);
    addInteraction({ id: mkId("REC"), meeting_id: meetingId, user_id: currentUser.id, interaction_type: "host_action", content: nextPaused ? "Recording paused" : "Recording resumed", metadata: { event: nextPaused ? "recording_pause" : "recording_resume", time: now }, created_at: now } as never);
    setIsRecordingPaused(nextPaused);
    toast(nextPaused ? "Recording paused" : "Recording resumed");
  };

  const toggleTranscription = () => {
    if (!meetingId) return;
    const now = nowISO();
    const sid = getOrCreateSession();
    if (!isTranscribing) {
      setIsTranscribingPaused(false);
      if (sid) updateSession(sid, { transcription_status: "active" } as never);
      addInteraction({ id: mkId("TRX"), meeting_id: meetingId, user_id: currentUser.id, interaction_type: "host_action", content: "Transcription started", metadata: { event: "transcription_start", time: now }, created_at: now } as never);
      toast.success("Transcription started");
    } else {
      if (sid) updateSession(sid, { transcription_status: "ended" } as never);
      addInteraction({ id: mkId("TRX"), meeting_id: meetingId, user_id: currentUser.id, interaction_type: "host_action", content: "Transcription stopped", metadata: { event: "transcription_stop", time: now }, created_at: now } as never);
      setIsTranscribingPaused(false);
      toast("Transcription stopped");
    }
    setIsTranscribing(v => !v);
  };

  const pauseResumeTranscription = () => {
    if (!meetingId || !isTranscribing) return;
    const now = nowISO();
    const sid = getOrCreateSession();
    const nextPaused = !isTranscribingPaused;
    if (sid) updateSession(sid, { transcription_status: nextPaused ? "paused" : "active" } as never);
    addInteraction({ id: mkId("TRX"), meeting_id: meetingId, user_id: currentUser.id, interaction_type: "host_action", content: nextPaused ? "Transcription paused" : "Transcription resumed", metadata: { event: nextPaused ? "transcription_pause" : "transcription_resume", time: now }, created_at: now } as never);
    setIsTranscribingPaused(nextPaused);
    toast(nextPaused ? "Transcription paused" : "Transcription resumed");
  };

  const toggleMinutesCapture = () => {
    if (!meetingId) return;
    const now = nowISO();
    const sid = getOrCreateSession();
    if (!isMinutesCapture) {
      setIsMinutesPaused(false);
      if (sid) updateSession(sid, { minutes_capture_status: "active" } as never);
      addInteraction({ id: mkId("MIN"), meeting_id: meetingId, user_id: currentUser.id, interaction_type: "host_action", content: "Minutes capture started", metadata: { event: "minutes_start", time: now }, created_at: now } as never);
      toast.success("Minutes capture started");
    } else {
      if (sid) updateSession(sid, { minutes_capture_status: "ended" } as never);
      addInteraction({ id: mkId("MIN"), meeting_id: meetingId, user_id: currentUser.id, interaction_type: "host_action", content: "Minutes capture stopped", metadata: { event: "minutes_stop", time: now }, created_at: now } as never);
      setIsMinutesPaused(false);
      toast("Minutes capture stopped");
    }
    setIsMinutesCapture(v => !v);
  };

  const pauseResumeMinutes = () => {
    if (!meetingId || !isMinutesCapture) return;
    const now = nowISO();
    const sid = getOrCreateSession();
    const nextPaused = !isMinutesPaused;
    if (sid) updateSession(sid, { minutes_capture_status: nextPaused ? "paused" : "active" } as never);
    addInteraction({ id: mkId("MIN"), meeting_id: meetingId, user_id: currentUser.id, interaction_type: "host_action", content: nextPaused ? "Minutes capture paused" : "Minutes capture resumed", metadata: { event: nextPaused ? "minutes_pause" : "minutes_resume", time: now }, created_at: now } as never);
    setIsMinutesPaused(nextPaused);
    toast(nextPaused ? "Minutes capture paused" : "Minutes capture resumed");
  };

  // ── Temporary agenda creation ─────────────────────────────────────────────
  const handleCreateTempAgenda = () => {
    if (!tempAgendaTitle.trim() || !meetingId) return;
    const aId = mkId("TAGD");
    const now = nowISO();
    addAgendaItem({
      id: aId, agenda_id: aId,
      agenda_title: tempAgendaTitle.trim(),
      agenda_reference: aId,
      meeting_id: meetingId,
      meeting_title: meeting?.meeting_title ?? "",
      committee: meeting?.committee ?? "",
      meeting_type: meeting?.meeting_type ?? "",
      agenda_category: "For Discussion",
      submitted_by: "Meeting Host",
      submitting_division: "",
      purpose: "For Discussion",
      proposed_decision: "",
      priority: "Normal",
      confidentiality: "Confidential",
      estimated_duration: "15 min",
      voting_required: "No",
      financial_impact: "None",
      submission_date: now.slice(0, 10),
      approval_status: "Pending Approval",
      description: tempAgendaDesc.trim(),
      // Mark as temporary so post-meeting approval flow can identify it
      is_temporary: true,
      created_at: now,
    } as never);
    addInteraction({
      id: mkId("IA"), meeting_id: meetingId,
      agenda_id: aId, user_id: currentUser.id,
      interaction_type: "agenda_change",
      content: `Temporary agenda created: ${tempAgendaTitle.trim()}`,
      metadata: { agenda_id: aId, is_temporary: true },
      created_at: now,
    } as never);
    toast.success("Temporary agenda created and pending post-meeting approval.");
    setTempAgendaTitle("");
    setTempAgendaDesc("");
    setTempAgendaOpen(false);
  };

  // ── Not found ──────────────────────────────────────────────────────────────
  if (!meeting && meetings.length > 0) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem", color: "#f1f5f9" }}>
        <AlertCircle size={40} style={{ color: "#f59e0b" }} />
        <p>Meeting <strong>{meetingId}</strong> not found.</p>
        <button onClick={() => onClose()} style={{ padding: "0.6rem 1.2rem", borderRadius: "8px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <ArrowLeft size={14} /> Back
        </button>
      </div>
    );
  }

  // ── Pre-Meeting Readiness (Section 5) ─────────────────────────────────────
  if (phase === "readiness") {
    return (
      <PreMeetingReadinessPanel
        meetingId={meetingId}
        onClose={() => onClose()}
        onStartMeeting={(readinessAttendance) => {
          // Merge readiness attendance into live session attendance
          setAttendanceMap(prev => {
            const merged = { ...prev };
            for (const [uid, st] of Object.entries(readinessAttendance)) {
              merged[uid] = st as AttendanceStatus;
            }
            return merged;
          });
          // Create or validate single live session
          getOrCreateSession();
          handleStart();
          setPhase("meeting");
        }}
      />
    );
  }

  // ── Pre-join screen ────────────────────────────────────────────────────────
  if (phase === "prejoin") {
    // Block uninvited users only when canonical participant links exist for this meeting
    if (meetingLinks.length > 0 && !myLink) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "1rem", padding: "2rem", textAlign: "center", background: "#0f172a", color: "#f1f5f9" }}>
          <AlertCircle size={48} style={{ color: "#ef4444" }} />
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>Access Denied</h2>
          <p style={{ margin: 0, color: "#94a3b8", maxWidth: 400 }}>
            You are not listed as a participant in this meeting. Contact the meeting organizer to be added.
          </p>
          <button onClick={() => onClose()} style={{ marginTop: "0.5rem", padding: "0.5rem 1.25rem", borderRadius: "8px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", cursor: "pointer", fontSize: "0.85rem" }}>
            Go Back
          </button>
        </div>
      );
    }
    return (
      <MeetingPreJoinPanel
        meeting={meeting}
        initialRole={myRole as PreJoinRole}
        onJoin={opts => {
          setMyMicOn(opts.micOn);
          setMyCamOn(opts.camOn);
          setPhase("meeting");
          // Create or update canonical attendance record for the current user
          if (myLink) {
            setAttendance(currentUser.id, "Present");
          }
        }}
        onBack={() => onClose()}
      />
    );
  }

  // ── Meeting workspace ──────────────────────────────────────────────────────
  const activeSpeaker  = participants.find(p => p.id === activeSpeakerId) ?? participants[0] ?? null;
  const statusColor    = { "not-started": "#64748b", "in-progress": "#22c55e", "paused": "#f59e0b", "on-break": "#f59e0b", "adjourned": "#a78bfa", "ended": "#94a3b8" }[ctrlStatus];
  const statusLabel    = { "not-started": "Not Started", "in-progress": "In Progress", "paused": "Paused", "on-break": "On Break", "adjourned": "Adjourned", "ended": "Ended" }[ctrlStatus];

  const PANEL_TABS = [
    { id: "agenda"       as PanelTab, label: "Agenda",       icon: <Layers     size={13} /> },
    { id: "documents"    as PanelTab, label: "Docs",         icon: <BookOpen   size={13} /> },
    { id: "participants" as PanelTab, label: "Members",      icon: <Users      size={13} /> },
    { id: "motions"      as PanelTab, label: "Motions",      icon: <Gavel      size={13} /> },
    { id: "decisions"    as PanelTab, label: "Decisions",    icon: <CheckCircle size={13} /> },
    { id: "minutes"      as PanelTab, label: "Minutes",      icon: <FileText   size={13} /> },
  ];

  // Agenda-specific recusal for active agenda item (Section 14)
  const activeAgendaKey = agendaItems[activeIdx]?.key ?? "";
  const agendaRecusedIds = new Set(agendaRecusals[activeAgendaKey] ?? []);

  // ── Canonical live-form option lists (fix-dropdowns spec §12) ────────────────
  // Present participants eligible to propose/second a motion
  const presentParticipantOptions = (() => {
    if (meetingLinks.length > 0) {
      return meetingLinks
        .filter(l => ACTIVE_STATES.includes(attendanceMap[l.user_id] ?? "Not Joined" as AttendanceStatus))
        .map(l => {
          const user = bmsUsers.find(u => u.id === l.user_id);
          const name = user?.name ?? l.user_id;
          const desig = user?.designation ?? l.participant_type;
          return { value: l.user_id, label: desig ? `${name} — ${desig}` : name };
        });
    }
    return participants
      .filter(p => ACTIVE_STATES.includes(attendanceMap[p.id] ?? "Not Joined" as AttendanceStatus))
      .map(p => ({ value: p.id, label: `${p.name} — ${p.role}` }));
  })();

  // All active users for Assigned To / Responsible Owner selectors
  const activeUserOptions = bmsUsers
    .filter(u => {
      const st = (u.account_status ?? u.status ?? "active").toLowerCase();
      return st === "active" || st === "activated";
    })
    .map(u => ({
      value: u.id,
      label: [u.name, u.designation].filter(Boolean).join(" — "),
    }));

  // Motion options for Related Motion dropdown (show readable title, store ID)
  const motionOptions = [
    { value: "", label: "(none)" },
    ...motions.map(m => ({ value: m.id, label: m.title.length > 60 ? `${m.title.slice(0, 60)}…` : m.title })),
  ];

  // Voting eligibility: canonical voting_eligible flag + present + not globally or agenda-recused (Section 16)
  const votingEligibleIds = new Set(
    meetingLinks
      .filter(l =>
        l.voting_eligible &&
        ACTIVE_STATES.includes(attendanceMap[l.user_id] ?? "Not Joined" as AttendanceStatus) &&
        (attendanceMap[l.user_id] ?? "Not Joined") !== "Recused" &&
        !agendaRecusedIds.has(l.user_id)
      )
      .map(l => l.user_id)
  );
  // Fallback: if no canonical links, use role-based check from participants list
  const useFallbackVoting = meetingLinks.length === 0;

  const pendingVotes = activeVote
    ? participants.filter(p => {
        const isPresent = ACTIVE_STATES.includes(attendanceMap[p.id] ?? "Not Joined" as AttendanceStatus);
        const canVoteP  = useFallbackVoting ? canVote(myRole) && isPresent : votingEligibleIds.has(p.id);
        return canVoteP && !activeVote.castVotes[p.id];
      }).length
    : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0f172a", color: "#f1f5f9", overflow: "hidden", fontFamily: "inherit" }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────────── */}
      <div style={{ height: 52, background: "#1e293b", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", padding: "0 1rem", gap: "0.75rem", flexShrink: 0 }}>
        <button onClick={() => onClose()} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "0.3rem", borderRadius: "6px" }}>
          <ArrowLeft size={15} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meeting?.meeting_title ?? "Board Meeting"}</p>
          <p style={{ margin: 0, fontSize: "0.68rem", color: "#64748b" }}>{meeting?.meeting_id ?? meeting?.id ?? ""}{meeting?.committee ? ` · ${meeting.committee}` : ""} · {clockStr} · <span style={{ color: "#94a3b8" }}>{myRole}</span></p>
        </div>

        {/* Status */}
        <span style={{ padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: 600, background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44`, whiteSpace: "nowrap" }}>
          {statusLabel}
        </span>

        {/* Duration */}
        <span style={{ fontSize: "0.8rem", fontVariantNumeric: "tabular-nums", color: ctrlStatus === "in-progress" ? "#22c55e" : "#64748b", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Clock size={13} /> {fmtTime(elapsed)}
        </span>

        {/* Quorum badge */}
        <span
          title={`Rule: ${quorumRuleDisplay} · ${presentCount} present of ${eligibleCount} eligible`}
          style={{ padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: 600, background: quorumMet ? "#14532d22" : "#7f1d1d22", color: quorumMet ? "#22c55e" : "#ef4444", border: `1px solid ${quorumMet ? "#22c55e44" : "#ef444444"}`, whiteSpace: "nowrap", cursor: "help" }}>
          {quorumMet ? "✓ Quorum" : "✗ No Quorum"} ({presentCount}/{quorumRequired})
        </span>

        {/* Active vote indicator */}
        {activeVote?.status === "Open" && (
          <span style={{ padding: "0.2rem 0.6rem", borderRadius: "9999px", fontSize: "0.7rem", fontWeight: 600, background: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed44", display: "flex", alignItems: "center", gap: "0.3rem", animation: "pulse 1.5s infinite", whiteSpace: "nowrap" }}>
            <Gavel size={11} /> Vote Open · {pendingVotes} pending
          </span>
        )}

        {/* Recording indicator: only shown when a real integration is active (never simulated) */}

        <button onClick={() => setIsLocked(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: isLocked ? "#f59e0b" : "#475569", padding: "0.3rem", borderRadius: "6px" }}>
          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
        <button onClick={() => setIsFullscreen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "#475569", padding: "0.3rem", borderRadius: "6px" }}>
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>

        {/* Meeting controls — gated by role */}
        <div style={{ display: "flex", gap: "0.4rem" }}>
          {ctrlStatus === "not-started" && canControl(myRole) && (
            <button onClick={handleStart} style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", background: "#22c55e", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Play size={12} /> Start
            </button>
          )}
          {ctrlStatus === "in-progress" && canControl(myRole) && (
            <>
              <button onClick={() => setCtrlStatus("paused")} style={{ padding: "0.35rem 0.6rem", borderRadius: "6px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", cursor: "pointer", fontSize: "0.72rem" }} title="Pause">
                <Pause size={12} />
              </button>
              <button onClick={() => setCtrlStatus("on-break")} style={{ padding: "0.35rem 0.6rem", borderRadius: "6px", background: "#1e293b", color: "#f59e0b", border: "1px solid #334155", cursor: "pointer", fontSize: "0.72rem" }} title="Break">
                <Coffee size={12} />
              </button>
              <button onClick={() => !quorumMet && setCtrlStatus("adjourned")} disabled={quorumMet} title={quorumMet ? "Meeting is in quorum — use End to close" : "Adjourn (quorum lost)"} style={{ padding: "0.35rem 0.6rem", borderRadius: "6px", background: quorumMet ? "#1e293b" : "#7c3aed44", color: quorumMet ? "#475569" : "#a78bfa", border: "1px solid #334155", cursor: quorumMet ? "not-allowed" : "pointer", fontSize: "0.68rem" }}>
                Adjourn
              </button>
              <button onClick={() => setClosureOpen(true)} style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <PhoneOff size={12} /> End
              </button>
            </>
          )}
          {(ctrlStatus === "paused" || ctrlStatus === "on-break" || ctrlStatus === "adjourned") && canControl(myRole) && (
            <button onClick={() => setCtrlStatus("in-progress")} style={{ padding: "0.35rem 0.75rem", borderRadius: "6px", background: "#22c55e", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <Play size={12} /> Resume
            </button>
          )}
          {ctrlStatus === "not-started" && !canControl(myRole) && (
            <span style={{ fontSize: "0.72rem", color: "#475569", padding: "0.35rem 0.5rem" }}>Waiting for chair to start…</span>
          )}
        </div>
      </div>

      {/* ── QUORUM LOSS BANNER (Spec §7) — persistent when quorum is lost during in-progress meeting ── */}
      {!quorumMet && ctrlStatus === "in-progress" && (
        <div role="alert" style={{ padding: "0.4rem 1rem", background: "#7f1d1d", borderBottom: "1px solid #ef4444", display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
          <AlertCircle size={14} style={{ color: "#fca5a5", flexShrink: 0 }} />
          <span style={{ fontSize: "0.75rem", color: "#fecaca", fontWeight: 600 }}>
            Quorum lost — {quorumStatusLabel(quorumCalcResult)}. Present eligible: {quorumCalcResult.eligibleCount} of {quorumCalcResult.requiredCount} required.
            New votes and formal resolutions are blocked until quorum is restored.
          </span>
        </div>
      )}

      {/* ── MAIN AREA ──────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>

        {/* Video area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, minHeight: 0, overflow: "hidden", position: "relative" }}>

          {/* View mode bar */}
          <div style={{ height: 36, background: "#1a2332", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", padding: "0 0.75rem", gap: "0.5rem", flexShrink: 0 }}>
            {(["speaker","grid","document"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding: "0.2rem 0.6rem", borderRadius: "4px", background: viewMode === v ? "var(--color-primary)" : "none", color: viewMode === v ? "#fff" : "#64748b", border: "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: viewMode === v ? 600 : 400, textTransform: "capitalize" }}>
                {v === "speaker" ? "Speaker" : v === "grid" ? "Gallery" : "Present"}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            {isSharing && <span style={{ fontSize: "0.72rem", color: "#22c55e", display: "flex", alignItems: "center", gap: "0.3rem" }}><Monitor size={12} /> Sharing screen</span>}
            <button onClick={() => setPanelOpen(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.72rem" }}>
              {panelOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
              {panelOpen ? "Hide Panel" : "Board Controls"}
            </button>
          </div>

          {/* Video stage */}
          <div style={{ flex: 1, overflow: "hidden", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem", minHeight: 0 }}>
            {viewMode === "speaker" && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", minHeight: 0 }}>
                <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
                  {activeSpeaker && <ParticipantTile p={activeSpeaker} isActive size="large" />}
                </div>
                <div style={{ display: "flex", gap: "0.4rem", height: 80, overflowX: "auto", flexShrink: 0 }}>
                  {participants.filter(p => p.id !== activeSpeakerId).map(p => (
                    <div key={p.id} style={{ width: 120, flexShrink: 0, cursor: "pointer" }} onClick={() => setActiveSpeakerId(p.id)}>
                      <ParticipantTile p={p} size="small" />
                    </div>
                  ))}
                </div>
              </div>
            )}
            {viewMode === "grid" && (
              <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.5rem", alignContent: "start", overflowY: "auto" }}>
                {participants.map(p => (
                  <div key={p.id} style={{ cursor: "pointer" }} onClick={() => { setActiveSpeakerId(p.id); setViewMode("speaker"); }}>
                    <ParticipantTile p={p} isActive={p.id === activeSpeakerId} />
                  </div>
                ))}
              </div>
            )}
            {viewMode === "document" && (() => {
              const presentedItem = presentingAgendaIdx !== null ? agendaItems[presentingAgendaIdx] : null;

              // ── Inline document view ──────────────────────────────────────
              if (presentingDoc) {
                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, borderRadius: "10px", overflow: "hidden", background: "#0f172a", border: "1px solid #1e293b" }}>
                    {/* Doc header */}
                    <div style={{ height: 44, background: "#1e293b", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", padding: "0 1rem", gap: "0.75rem", flexShrink: 0 }}>
                      <button
                        onClick={() => setPresentingDoc(null)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.75rem", padding: "0.25rem 0.5rem", borderRadius: "5px" }}
                      >
                        <ArrowLeft size={13} /> Back to Agenda
                      </button>
                      <div style={{ width: 1, height: 20, background: "#334155" }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {presentingDoc.doc_name ?? presentingDoc.file_name ?? presentingDoc.id}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.62rem", color: "#64748b" }}>
                          v{presentingDoc.version ?? "1.0"} · {presentingDoc.confidentiality ?? "Confidential"} · {presentingDoc.doc_type ?? "Document"}
                        </p>
                      </div>
                      <span style={{ fontSize: "0.62rem", padding: "0.15rem 0.45rem", borderRadius: 9999, background: "#1e3a5f", color: "#60a5fa", fontWeight: 600, flexShrink: 0 }}>Read-only · Live Meeting</span>
                    </div>
                    {/* Doc content + comments split */}
                    <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                      {/* Body */}
                      <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem 2rem" }}>
                        {presentingDoc.content_body ? (
                          <pre style={{ margin: 0, fontFamily: "inherit", fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.8, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {presentingDoc.content_body}
                          </pre>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "0.75rem", color: "#475569" }}>
                            <FileText size={36} style={{ color: "#334155" }} />
                            <p style={{ fontSize: "0.82rem", fontWeight: 600, margin: 0 }}>No preview available</p>
                            <p style={{ fontSize: "0.72rem", margin: 0, color: "#64748b" }}>This document type cannot be rendered inline.</p>
                          </div>
                        )}
                      </div>
                      {/* Comments sidebar */}
                      {(() => {
                        const threads = docCommentThreads.filter(t => t.document_id === presentingDoc.id);
                        const [newBody, setNewBody] = [
                          agendaCommentInputs[`doc-${presentingDoc.id}`] ?? "",
                          (v: string) => setAgendaCommentInputs(p => ({ ...p, [`doc-${presentingDoc.id}`]: v })),
                        ];
                        const submitThread = () => {
                          if (!newBody.trim()) return;
                          const id = `dct-${Date.now()}`;
                          addDocThread({ id, thread_id: id, document_id: presentingDoc.id, body: newBody.trim(), status: "open", created_by: currentUser.name, created_at: new Date().toISOString(), mentions: [], replies: [] });
                          setNewBody("");
                        };
                        const addReply = (threadId: string, replyBody: string) => {
                          const thread = docCommentThreads.find(t => t.id === threadId);
                          if (!thread) return;
                          const reply: CommentReply = { id: `r-${Date.now()}`, thread_id: threadId, author: currentUser.name, body: replyBody, created_at: new Date().toISOString(), mentions: [] };
                          updateDocThread(threadId, { replies: [...thread.replies, reply] } as Partial<DocumentCommentThread>);
                        };
                        const docQvKey     = `qv-${agendaItems[presentingAgendaIdx ?? activeIdx]?.key ?? "doc"}`;
                          const docQvVotes   = agendaMotionVotes[docQvKey] ?? {};
                          const docQvFor     = Object.values(docQvVotes).filter(v => v === "For").length;
                          const docQvAgainst = Object.values(docQvVotes).filter(v => v === "Against").length;
                          const docQvAbstain = Object.values(docQvVotes).filter(v => v === "Abstain").length;
                          const docQvTotal   = docQvFor + docQvAgainst + docQvAbstain;
                          const docQvMyVote  = docQvVotes[currentUser.name] as "For" | "Against" | "Abstain" | undefined;
                          const docQvCanVote = canVote(myRole) || canRecord(myRole);
                          const docQvCast    = (v: "For" | "Against" | "Abstain") => {
                            if (!docQvCanVote) return;
                            setAgendaMotionVotes(p => ({ ...p, [docQvKey]: { ...(p[docQvKey] ?? {}), [currentUser.name]: v } }));
                          };
                          const docAgendaItem = agendaItems[presentingAgendaIdx ?? activeIdx];
                          return (
                          <div style={{ width: 288, borderLeft: "1px solid #1e293b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                            {/* Tab bar */}
                            <div style={{ display: "flex", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
                              {(["comments", "motions", "voting"] as const).map(tab => {
                                const docItemMotions = agendaItemMotions.filter(m => m.agendaKey === (agendaItems[presentingAgendaIdx ?? activeIdx]?.key ?? ""));
                                const isActive = docSidebarTab === tab;
                                const label    = tab === "comments" ? "Comments" : tab === "motions" ? "Motions" : "Voting";
                                const badge    = tab === "comments" ? threads.length : tab === "motions" ? docItemMotions.length : docQvTotal;
                                return (
                                  <button
                                    key={tab}
                                    onClick={() => setDocSidebarTab(tab)}
                                    style={{
                                      flex: 1, padding: "0.6rem 0.5rem", border: "none", background: "transparent",
                                      borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                                      color: isActive ? "#f1f5f9" : "#64748b", cursor: "pointer",
                                      fontSize: "0.7rem", fontWeight: isActive ? 700 : 500,
                                      display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
                                      transition: "color 0.15s",
                                    }}
                                  >
                                    {label}
                                    {badge > 0 && (
                                      <span style={{ fontSize: "0.55rem", fontWeight: 700, background: isActive ? "var(--color-primary)" : "#334155", color: "#fff", borderRadius: 9999, padding: "0 5px", minWidth: 16, textAlign: "center" }}>{badge}</span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Comments tab */}
                            {docSidebarTab === "comments" && (
                              <>
                                <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                                  {threads.length === 0 && <p style={{ fontSize: "0.72rem", color: "#475569", textAlign: "center", padding: "1rem 0" }}>No comments yet.</p>}
                                  {threads.map(t => (
                                    <DocCommentCard key={t.id} thread={t} currentUser={currentUser.name} onReply={addReply} onResolve={() => updateDocThread(t.id, { status: t.status === "resolved" ? "open" : "resolved" } as Partial<DocumentCommentThread>)} />
                                  ))}
                                </div>
                                <div style={{ padding: "0.65rem 0.75rem", borderTop: "1px solid #1e293b", flexShrink: 0 }}>
                                  <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Add a comment…" rows={2} style={{ width: "100%", padding: "0.4rem 0.5rem", fontSize: "0.73rem", borderRadius: "6px", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                                  <button onClick={submitThread} disabled={!newBody.trim()} style={{ marginTop: "0.35rem", width: "100%", padding: "0.3rem", borderRadius: "5px", background: newBody.trim() ? "var(--color-primary)" : "#334155", color: "#fff", border: "none", cursor: newBody.trim() ? "pointer" : "default", fontSize: "0.7rem", fontWeight: 600 }}>Post</button>
                                </div>
                              </>
                            )}

                            {/* Motions tab - doc view */}
                            {docSidebarTab === "motions" && (() => {
                              const docAKey = agendaItems[presentingAgendaIdx ?? activeIdx]?.key ?? "";
                              const docMotions = agendaItemMotions.filter(m => m.agendaKey === docAKey);
                              const dmForm = agendaMotionForms[docAKey] ?? { open: false, text: "", proposedBy: "", secondedBy: "" };
                              const setDmForm = (patch: Partial<typeof dmForm>) =>
                                setAgendaMotionForms(p => ({ ...p, [docAKey]: { ...(p[docAKey] ?? { open: false, text: "", proposedBy: "", secondedBy: "" }), ...patch } }));
                              return (
                                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                                  <div style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid #1e293b", flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
                                    <button
                                      onClick={() => setDmForm({ open: !dmForm.open })}
                                      style={{ padding: "0.32rem 0.8rem", borderRadius: "6px", background: dmForm.open ? "#334155" : "#f59e0b", color: dmForm.open ? "#94a3b8" : "#0f172a", border: dmForm.open ? "1px solid #475569" : "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}
                                    >
                                      {dmForm.open ? "✕ Cancel" : "+ Raise Motion"}
                                    </button>
                                  </div>
                                  <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                    {dmForm.open && (
                                      <div style={{ padding: "0.75rem", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(245,158,11,0.2)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                        <textarea value={dmForm.text} onChange={e => setDmForm({ text: e.target.value })} placeholder="Motion text: That the Board resolves to…" rows={3} style={{ width: "100%", padding: "0.45rem 0.55rem", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                                        <input value={dmForm.proposedBy} onChange={e => setDmForm({ proposedBy: e.target.value })} placeholder="Moved by…" style={{ width: "100%", padding: "0.35rem 0.55rem", fontSize: "0.73rem", borderRadius: "6px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", boxSizing: "border-box" }} />
                                        <input value={dmForm.secondedBy} onChange={e => setDmForm({ secondedBy: e.target.value })} placeholder="Seconded by… (optional)" style={{ width: "100%", padding: "0.35rem 0.55rem", fontSize: "0.73rem", borderRadius: "6px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", boxSizing: "border-box" }} />
                                        <button onClick={() => { if (!dmForm.text.trim()) return; setAgendaItemMotions(p => [...p, { id: `aim-${Date.now()}`, agendaKey: docAKey, title: dmForm.text.trim(), proposedBy: dmForm.proposedBy || currentUser.name, secondedBy: dmForm.secondedBy, status: "Proposed" }]); setDmForm({ open: false, text: "", proposedBy: "", secondedBy: "" }); }} style={{ alignSelf: "flex-end", padding: "0.35rem 1rem", borderRadius: "6px", background: "#f59e0b", color: "#0f172a", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}>Submit Motion</button>
                                      </div>
                                    )}
                                    {docMotions.length === 0 && !dmForm.open && <p style={{ fontSize: "0.72rem", color: "#475569", textAlign: "center", padding: "1rem 0" }}>No motions raised yet.</p>}
                                    {docMotions.map(m => {
                                      const votes = agendaMotionVotes[m.id] ?? {};
                                      const forC = Object.values(votes).filter(v => v === "For").length;
                                      const agC  = Object.values(votes).filter(v => v === "Against").length;
                                      const abC  = Object.values(votes).filter(v => v === "Abstain").length;
                                      const totV = forC + agC + abC;
                                      const myV  = votes[currentUser.name] as "For" | "Against" | "Abstain" | undefined;
                                      const mOk  = m.status === "Proposed" || m.status === "Seconded";
                                      const sc   = m.status === "Passed" ? "#22c55e" : m.status === "Rejected" ? "#ef4444" : m.status === "Withdrawn" ? "#64748b" : "#f59e0b";
                                      return (
                                        <div key={m.id} style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: `1px solid ${sc}28` }}>
                                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.3rem", marginBottom: "0.2rem" }}>
                                            <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4, flex: 1 }}>{m.title}</p>
                                            <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.35rem", borderRadius: "9999px", background: `${sc}20`, color: sc, fontWeight: 700, flexShrink: 0 }}>{m.status}</span>
                                          </div>
                                          <p style={{ margin: "0 0 0.5rem", fontSize: "0.63rem", color: "#64748b" }}>Moved: {m.proposedBy}{m.secondedBy ? ` · Seconded: ${m.secondedBy}` : ""}</p>
                                          {totV > 0 && (
                                            <div style={{ marginBottom: "0.4rem" }}>
                                              <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.15rem" }}>
                                                {([["For", forC, "#22c55e"], ["Against", agC, "#ef4444"], ["Abstain", abC, "#64748b"]] as const).map(([l, c, col]) => <span key={l} style={{ fontSize: "0.6rem", color: col, fontWeight: 600 }}>{l}: {c}</span>)}
                                              </div>
                                              <div style={{ height: 4, borderRadius: 9999, background: "#0f172a", overflow: "hidden", display: "flex" }}>
                                                {forC > 0 && <div style={{ flex: forC, background: "#22c55e" }} />}
                                                {agC  > 0 && <div style={{ flex: agC,  background: "#ef4444" }} />}
                                                {abC  > 0 && <div style={{ flex: abC,  background: "#475569" }} />}
                                              </div>
                                            </div>
                                          )}
                                          <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                                            {(["For", "Against", "Abstain"] as const).map(opt => {
                                              const col  = opt === "For" ? "#22c55e" : opt === "Against" ? "#ef4444" : "#94a3b8";
                                              const Icon = opt === "For" ? ThumbsUp : opt === "Against" ? ThumbsDown : Minus;
                                              return (
                                                <button key={opt} disabled={!mOk} onClick={() => setAgendaMotionVotes(p => ({ ...p, [m.id]: { ...(p[m.id] ?? {}), [currentUser.name]: opt } }))}
                                                  style={{ display: "flex", alignItems: "center", gap: "0.2rem", padding: "0.25rem 0.55rem", borderRadius: "5px", background: myV === opt ? col : `${col}18`, color: myV === opt ? "#fff" : col, border: `1px solid ${myV === opt ? col : `${col}40`}`, cursor: mOk ? "pointer" : "default", fontSize: "0.65rem", fontWeight: 600, opacity: mOk ? 1 : 0.5 }}>
                                                  <Icon size={10} /> {opt}
                                                </button>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })()}

                            {/* Voting tab */}
                            {docSidebarTab === "voting" && (
                              <div style={{ flex: 1, overflowY: "auto", padding: "0.9rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                                {/* Agenda item context */}
                                {docAgendaItem && (
                                  <div style={{ padding: "0.5rem 0.65rem", borderRadius: "7px", background: "#1e293b", border: "1px solid #334155" }}>
                                    <p style={{ margin: 0, fontSize: "0.6rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                      {(docAgendaItem.level ?? 1) > 1 ? "Sub-item" : "Agenda Item"}
                                    </p>
                                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4 }}>{docAgendaItem.title}</p>
                                    <p style={{ margin: "0.15rem 0 0", fontSize: "0.63rem", color: "#64748b" }}>{docAgendaItem.purpose} · {docAgendaItem.duration}m</p>
                                  </div>
                                )}

                                {/* Tally */}
                                {docQvTotal > 0 && (
                                  <div style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b" }}>
                                    <p style={{ margin: "0 0 0.4rem", fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Tally</p>
                                    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
                                      <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 700 }}>For: {docQvFor}</span>
                                      <span style={{ fontSize: "0.72rem", color: "#ef4444", fontWeight: 700 }}>Against: {docQvAgainst}</span>
                                      <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700 }}>Abstain: {docQvAbstain}</span>
                                    </div>
                                    <div style={{ height: 8, borderRadius: 9999, background: "#1e293b", overflow: "hidden", display: "flex" }}>
                                      {docQvFor     > 0 && <div style={{ flex: docQvFor,     background: "#22c55e", transition: "flex 0.3s" }} />}
                                      {docQvAgainst > 0 && <div style={{ flex: docQvAgainst, background: "#ef4444", transition: "flex 0.3s" }} />}
                                      {docQvAbstain > 0 && <div style={{ flex: docQvAbstain, background: "#475569", transition: "flex 0.3s" }} />}
                                    </div>
                                    <p style={{ margin: "0.35rem 0 0", fontSize: "0.6rem", color: "#475569", textAlign: "right" }}>{docQvTotal} vote{docQvTotal !== 1 ? "s" : ""} cast</p>
                                  </div>
                                )}

                                {/* Vote buttons */}
                                <div>
                                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cast Your Vote</p>
                                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                    {(["For", "Against", "Abstain"] as const).map(opt => {
                                      const col   = opt === "For" ? "#22c55e" : opt === "Against" ? "#ef4444" : "#94a3b8";
                                      const Icon  = opt === "For" ? ThumbsUp : opt === "Against" ? ThumbsDown : Minus;
                                      const active = docQvMyVote === opt;
                                      return (
                                        <button
                                          key={opt}
                                          disabled={!docQvCanVote}
                                          onClick={() => docQvCast(opt)}
                                          style={{
                                            display: "flex", alignItems: "center", gap: "0.5rem",
                                            padding: "0.6rem 0.85rem", borderRadius: "8px",
                                            background: active ? col : `${col}12`,
                                            color: active ? "#fff" : col,
                                            border: `1.5px solid ${active ? col : `${col}35`}`,
                                            cursor: docQvCanVote ? "pointer" : "not-allowed",
                                            fontSize: "0.82rem", fontWeight: 700,
                                            opacity: docQvCanVote ? 1 : 0.45,
                                            transition: "all 0.15s",
                                            width: "100%",
                                          }}
                                        >
                                          <Icon size={15} />
                                          <span style={{ flex: 1, textAlign: "left" }}>{opt}</span>
                                          {active && <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>✓ Your vote</span>}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {!docQvCanVote && (
                                    <p style={{ margin: "0.6rem 0 0", fontSize: "0.62rem", color: "#475569", textAlign: "center" }}>
                                      {ctrlStatus !== "in-progress" ? "Meeting not yet in progress" : "Your role does not permit voting"}
                                    </p>
                                  )}
                                </div>

                                {/* Individual votes — chair/secretary can see/record */}
                                {canRecord(myRole) && docQvTotal > 0 && (
                                  <div>
                                    <p style={{ margin: "0 0 0.4rem", fontSize: "0.62rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Individual Votes</p>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                      {Object.entries(docQvVotes).map(([voter, choice]) => {
                                        const col = choice === "For" ? "#22c55e" : choice === "Against" ? "#ef4444" : "#94a3b8";
                                        return (
                                          <div key={voter} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.5rem", borderRadius: "5px", background: "#0f172a" }}>
                                            <span style={{ flex: 1, fontSize: "0.7rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{voter}</span>
                                            <span style={{ fontSize: "0.65rem", fontWeight: 700, color: col, padding: "0.1rem 0.35rem", borderRadius: "4px", background: `${col}18` }}>{choice}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              }

              // ── Empty state ───────────────────────────────────────────────
              if (!presentedItem) {
                return (
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", borderRadius: "10px", border: "2px dashed #334155", color: "#475569" }}>
                    <Monitor size={48} style={{ color: "#334155" }} />
                    <p style={{ fontSize: "0.9rem", fontWeight: 600 }}>Document Presentation View</p>
                    <p style={{ fontSize: "0.8rem", color: "#64748b" }}>Select an agenda item from the Agenda panel to present</p>
                    <div style={{ display: "flex", gap: "0.5rem", height: 72, overflowX: "auto", padding: "0 0.5rem" }}>
                      {participants.map(p => <div key={p.id} style={{ width: 108, flexShrink: 0 }}><ParticipantTile p={p} size="small" /></div>)}
                    </div>
                  </div>
                );
              }

              // ── Full agenda presentation view ─────────────────────────────
              const pIdx = presentingAgendaIdx as number;
              const pSt = agendaStatuses[pIdx];
              const pDocLinks = agendaDocLinks
                .filter(l => l.agenda_id === presentedItem.key)
                .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
              const pDocs = pDocLinks
                .map(l => allDocuments.find(d => d.id === l.document_id))
                .filter((d): d is NonNullable<typeof d> => !!d);
              const purposeColor: Record<string, string> = {
                "For approval": "#7c3aed", "For discussion": "#0284c7", "For information": "#047857",
                "For noting": "#64748b", "For review": "#0284c7",
              };
              const pColor = purposeColor[presentedItem.purpose] ?? "#334155";
              const statusColor: Record<string, string> = {
                "In Discussion": "#3b82f6", "Completed": "#22c55e", "Deferred": "#f59e0b",
                "Skipped": "#64748b", "Not Started": "#475569",
              };
              return (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, borderRadius: "10px", overflow: "hidden", background: "#0f172a", border: "1px solid #1e293b" }}>
                  {/* Header bar */}
                  <div style={{ padding: "0.75rem 1.25rem", background: "#1e293b", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                        {meeting?.meeting_title ?? "Meeting"} · Agenda {pIdx + 1} of {agendaItems.length}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      {pSt && (
                        <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: 9999, background: statusColor[pSt] ?? "#334155", color: "#fff" }}>
                          {pSt}
                        </span>
                      )}
                      <button
                        onClick={() => { const prev = (pIdx - 1 + agendaItems.length) % agendaItems.length; setPresentingAgendaIdx(prev); setActiveIdx(prev); setPresentingDoc(null); }}
                        disabled={agendaItems.length <= 1}
                        style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#334155", color: "#94a3b8", border: "none", cursor: "pointer", fontSize: "0.72rem" }}
                      >◀</button>
                      <button
                        onClick={() => { const next = (pIdx + 1) % agendaItems.length; setPresentingAgendaIdx(next); setActiveIdx(next); setPresentingDoc(null); }}
                        disabled={agendaItems.length <= 1}
                        style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#334155", color: "#94a3b8", border: "none", cursor: "pointer", fontSize: "0.72rem" }}
                      >▶</button>
                    </div>
                  </div>

                  {/* Body split: left content + right sidebar */}
                  <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
                  {/* Left column: scrollable content + action footer */}
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, borderRight: "1px solid #1e293b" }}>
                  <div style={{ flex: 1, overflowY: "auto", padding: "2rem 2.5rem" }}>
                    {/* Purpose badge */}
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.25rem 0.75rem", borderRadius: 9999, background: pColor, color: "#fff", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {presentedItem.purpose}
                      </span>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                        <Clock size={12} /> {presentedItem.duration} min
                      </span>
                      {presentedItem.presenter && (
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Presenter: {presentedItem.presenter}</span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 style={{ margin: "0 0 1rem", fontSize: "1.5rem", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.3 }}>
                      {presentedItem.title}
                    </h2>

                    {/* Description */}
                    {presentedItem.description && (
                      <p style={{ margin: "0 0 1.5rem", fontSize: "0.9rem", color: "#94a3b8", lineHeight: 1.7, maxWidth: "68ch" }}>
                        {presentedItem.description}
                      </p>
                    )}

                    {/* Documents */}
                    {pDocs.length > 0 && (
                      <div style={{ marginTop: "1.25rem" }}>
                        <p style={{ margin: "0 0 0.65rem", fontSize: "0.65rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <FileText size={11} /> Supporting Documents ({pDocs.length})
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {pDocs.map(doc => {
                            const link = pDocLinks.find(l => l.document_id === doc.id);
                            const isPrimary = !!link?.is_primary;
                            const dName = doc.doc_name ?? doc.file_name ?? doc.id;
                            return (
                              <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.7rem 0.9rem 0.7rem 1rem", borderRadius: "8px", background: "#1e293b", borderLeft: `3px solid ${isPrimary ? "#3b82f6" : "#334155"}` }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dName}</p>
                                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.7rem", color: "#64748b" }}>
                                    {doc.doc_type ?? "Document"} · v{doc.version ?? "1.0"}{isPrimary ? <span style={{ color: "#3b82f6", fontWeight: 600 }}> · Primary</span> : null}
                                    {doc.confidentiality ? ` · ${doc.confidentiality}` : ""}
                                  </p>
                                </div>
                                <button
                                  onClick={() => setPresentingDoc(doc as BoardDocument)}
                                  style={{ padding: "0.3rem 0.8rem", borderRadius: "6px", background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, flexShrink: 0 }}
                                >
                                  Open →
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Notes (if any) */}
                    {notes[pIdx] && (
                      <div style={{ marginTop: "1.5rem", padding: "0.75rem 1rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155" }}>
                        <p style={{ margin: "0 0 0.4rem", fontSize: "0.65rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em" }}>Discussion Notes</p>
                        <p style={{ margin: 0, fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{notes[pIdx]}</p>
                      </div>
                    )}
                  </div>{/* /scrollable */}

                  {/* ── Action footer ── */}
                  <div style={{ flexShrink: 0, background: "#080f1e", borderTop: "1px solid #1e293b", padding: "0.85rem 1.75rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    {/* Current status pill */}
                    <span style={{
                      fontSize: "0.65rem", fontWeight: 700, padding: "0.28rem 0.7rem", borderRadius: 9999, flexShrink: 0,
                      background: pSt === "Completed" ? "rgba(34,197,94,0.12)" : pSt === "In Discussion" ? "rgba(59,130,246,0.12)" : pSt === "Deferred" ? "rgba(245,158,11,0.12)" : "rgba(100,116,139,0.1)",
                      color:      pSt === "Completed" ? "#22c55e"             : pSt === "In Discussion" ? "#60a5fa"              : pSt === "Deferred" ? "#f59e0b"              : "#64748b",
                      border:     `1px solid ${pSt === "Completed" ? "rgba(34,197,94,0.25)" : pSt === "In Discussion" ? "rgba(59,130,246,0.25)" : pSt === "Deferred" ? "rgba(245,158,11,0.25)" : "rgba(100,116,139,0.18)"}`,
                    }}>
                      {pSt ?? "Not Started"}
                    </span>

                    <div style={{ flex: 1 }} />

                    {/* Secondary: Defer + Skip (chair/sec only, not when done) */}
                    {canRecord(myRole) && pSt !== "Completed" && (
                      <>
                        <button onClick={() => setAgendaReasonModal({ action: "Defer", idx: pIdx })}
                          style={{ padding: "0.42rem 0.9rem", borderRadius: "7px", background: "rgba(245,158,11,0.07)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.22)", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>
                          Defer
                        </button>
                        <button onClick={() => setAgendaReasonModal({ action: "Skip", idx: pIdx })}
                          style={{ padding: "0.42rem 0.9rem", borderRadius: "7px", background: "transparent", color: "#475569", border: "1px solid #334155", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>
                          Skip
                        </button>
                      </>
                    )}

                    {/* Primary: Mark as Complete / Completed indicator */}
                    {pSt === "Completed" ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.45rem 1rem", borderRadius: "8px", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                        <CheckCircle size={14} style={{ color: "#22c55e" }} />
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#22c55e" }}>Completed</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setAgendaStatuses(p => ({ ...p, [pIdx]: "Completed" }));
                          const next = pIdx + 1;
                          if (next < agendaItems.length) {
                            setAgendaStatuses(p => ({ ...p, [next]: "In Discussion" }));
                            setPresentingAgendaIdx(next);
                            setActiveIdx(next);
                          }
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: "0.45rem",
                          padding: "0.52rem 1.35rem", borderRadius: "8px",
                          background: "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
                          color: "#fff", border: "none", cursor: "pointer",
                          fontSize: "0.8rem", fontWeight: 700,
                          boxShadow: "0 2px 10px rgba(34,197,94,0.28)",
                          letterSpacing: "0.01em",
                        }}
                      >
                        <CheckCircle size={15} />
                        Mark as Complete
                      </button>
                    )}
                  </div>
                  </div>{/* /left column */}

                  {/* Right sidebar */}
                  <div style={{ width: 300, borderLeft: "1px solid #1e293b", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    {/* Tab bar */}
                    <div style={{ display: "flex", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
                      {(["comments", "motions", "voting"] as const).map(tab => {
                        const aKey = presentedItem.key;
                        const aComments = agendaComments[aKey] ?? [];
                        const itemMotions = agendaItemMotions.filter(m => m.agendaKey === aKey);
                        const qvKey = `qv-${aKey}`;
                        const qvVotes = agendaMotionVotes[qvKey] ?? {};
                        const qvTotal = Object.keys(qvVotes).length;
                        const isActive = agendaSidebarTab === tab;
                        const label = tab === "comments" ? "Comments" : tab === "motions" ? "Motions" : "Voting";
                        const badge = tab === "comments" ? aComments.length : tab === "motions" ? itemMotions.length : qvTotal;
                        return (
                          <button
                            key={tab}
                            onClick={() => setAgendaSidebarTab(tab)}
                            style={{
                              flex: 1, padding: "0.6rem 0.5rem", border: "none", background: "transparent",
                              borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                              color: isActive ? "#f1f5f9" : "#64748b", cursor: "pointer",
                              fontSize: "0.7rem", fontWeight: isActive ? 700 : 500,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem",
                            }}
                          >
                            {label}
                            {badge > 0 && (
                              <span style={{ fontSize: "0.55rem", fontWeight: 700, background: isActive ? "var(--color-primary)" : "#334155", color: "#fff", borderRadius: 9999, padding: "0 5px", minWidth: 16, textAlign: "center" }}>{badge}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Comments tab */}
                    {agendaSidebarTab === "comments" && (() => {
                      const aKey = presentedItem.key;
                      const aComments = agendaComments[aKey] ?? [];
                      const inputVal = agendaCommentInputs[aKey] ?? "";
                      const setInput = (v: string) => setAgendaCommentInputs(p => ({ ...p, [aKey]: v }));
                      const submitComment = () => {
                        if (!inputVal.trim()) return;
                        setAgendaComments(p => ({ ...p, [aKey]: [...(p[aKey] ?? []), { id: `ac-${Date.now()}`, author: currentUser.name, body: inputVal.trim(), at: new Date().toISOString() }] }));
                        setInput("");
                      };
                      return (
                        <>
                          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                            {aComments.length === 0 && <p style={{ fontSize: "0.72rem", color: "#475569", textAlign: "center", padding: "1rem 0" }}>No comments yet.</p>}
                            {aComments.map(c => (
                              <div key={c.id} style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                                  <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#e2e8f0" }}>{c.author}</span>
                                  <span style={{ fontSize: "0.6rem", color: "#475569" }}>{new Date(c.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", lineHeight: 1.6 }}>{c.body}</p>
                              </div>
                            ))}
                          </div>
                          <div style={{ padding: "0.65rem 0.75rem", borderTop: "1px solid #1e293b", flexShrink: 0 }}>
                            <textarea value={inputVal} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitComment(); } }} placeholder="Add a comment…" rows={2} style={{ width: "100%", padding: "0.4rem 0.5rem", fontSize: "0.73rem", borderRadius: "6px", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", resize: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                            <button onClick={submitComment} disabled={!inputVal.trim()} style={{ marginTop: "0.35rem", width: "100%", padding: "0.3rem", borderRadius: "5px", background: inputVal.trim() ? "var(--color-primary)" : "#334155", color: "#fff", border: "none", cursor: inputVal.trim() ? "pointer" : "default", fontSize: "0.7rem", fontWeight: 600 }}>Post</button>
                          </div>
                        </>
                      );
                    })()}

                    {/* Motions tab */}
                    {agendaSidebarTab === "motions" && (() => {
                      const aKey = presentedItem.key;
                      const itemMotions = agendaItemMotions.filter(m => m.agendaKey === aKey);
                      const mForm = agendaMotionForms[aKey] ?? { open: false, text: "", proposedBy: "", secondedBy: "" };
                      const setForm = (patch: Partial<typeof mForm>) =>
                        setAgendaMotionForms(p => ({ ...p, [aKey]: { ...(p[aKey] ?? { open: false, text: "", proposedBy: "", secondedBy: "" }), ...patch } }));
                      return (
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                          {/* Raise Motion button */}
                          <div style={{ padding: "0.65rem 0.75rem", borderBottom: "1px solid #1e293b", flexShrink: 0, display: "flex", justifyContent: "flex-end" }}>
                            <button
                              onClick={() => setForm({ open: !mForm.open })}
                              style={{ padding: "0.32rem 0.8rem", borderRadius: "6px", background: mForm.open ? "#334155" : "#f59e0b", color: mForm.open ? "#94a3b8" : "#0f172a", border: mForm.open ? "1px solid #475569" : "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}
                            >
                              {mForm.open ? "✕ Cancel" : "+ Raise Motion"}
                            </button>
                          </div>
                          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                            {mForm.open && (
                              <div style={{ padding: "0.75rem", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(245,158,11,0.2)", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <textarea value={mForm.text} onChange={e => setForm({ text: e.target.value })} placeholder="Motion text: That the Board resolves to…" rows={3} style={{ width: "100%", padding: "0.45rem 0.55rem", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                                <input value={mForm.proposedBy} onChange={e => setForm({ proposedBy: e.target.value })} placeholder="Moved by…" style={{ width: "100%", padding: "0.35rem 0.55rem", fontSize: "0.73rem", borderRadius: "6px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", boxSizing: "border-box" }} />
                                <input value={mForm.secondedBy} onChange={e => setForm({ secondedBy: e.target.value })} placeholder="Seconded by… (optional)" style={{ width: "100%", padding: "0.35rem 0.55rem", fontSize: "0.73rem", borderRadius: "6px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", boxSizing: "border-box" }} />
                                <button onClick={() => { if (!mForm.text.trim()) return; setAgendaItemMotions(p => [...p, { id: `aim-${Date.now()}`, agendaKey: aKey, title: mForm.text.trim(), proposedBy: mForm.proposedBy || currentUser.name, secondedBy: mForm.secondedBy, status: "Proposed" }]); setForm({ open: false, text: "", proposedBy: "", secondedBy: "" }); }} style={{ alignSelf: "flex-end", padding: "0.35rem 1rem", borderRadius: "6px", background: "#f59e0b", color: "#0f172a", border: "none", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}>Submit Motion</button>
                              </div>
                            )}
                            {itemMotions.length === 0 && !mForm.open && <p style={{ fontSize: "0.72rem", color: "#475569", textAlign: "center", padding: "1rem 0" }}>No motions raised yet.</p>}
                            {itemMotions.map(m => {
                              const votes = agendaMotionVotes[m.id] ?? {};
                              const forC = Object.values(votes).filter(v => v === "For").length;
                              const agC  = Object.values(votes).filter(v => v === "Against").length;
                              const abC  = Object.values(votes).filter(v => v === "Abstain").length;
                              const totV = forC + agC + abC;
                              const myV  = votes[currentUser.name] as "For" | "Against" | "Abstain" | undefined;
                              const mOk  = m.status === "Proposed" || m.status === "Seconded";
                              const sc   = m.status === "Passed" ? "#22c55e" : m.status === "Rejected" ? "#ef4444" : m.status === "Withdrawn" ? "#64748b" : "#f59e0b";
                              return (
                                <div key={m.id} style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: `1px solid ${sc}28` }}>
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.3rem", marginBottom: "0.2rem" }}>
                                    <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, color: "#e2e8f0", lineHeight: 1.4, flex: 1 }}>{m.title}</p>
                                    <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.35rem", borderRadius: "9999px", background: `${sc}20`, color: sc, fontWeight: 700, flexShrink: 0 }}>{m.status}</span>
                                  </div>
                                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.65rem", color: "#64748b" }}>Moved: {m.proposedBy}{m.secondedBy ? ` · Seconded: ${m.secondedBy}` : ""}</p>
                                  {totV > 0 && (
                                    <div style={{ marginBottom: "0.4rem" }}>
                                      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.15rem" }}>
                                        {([["For", forC, "#22c55e"], ["Against", agC, "#ef4444"], ["Abstain", abC, "#64748b"]] as const).map(([l, c, col]) => <span key={l} style={{ fontSize: "0.62rem", color: col, fontWeight: 600 }}>{l}: {c}</span>)}
                                        <span style={{ marginLeft: "auto", fontSize: "0.6rem", color: "#475569" }}>{totV} cast</span>
                                      </div>
                                      <div style={{ height: 4, borderRadius: 9999, background: "#0f172a", overflow: "hidden", display: "flex" }}>
                                        {forC > 0 && <div style={{ flex: forC, background: "#22c55e" }} />}
                                        {agC  > 0 && <div style={{ flex: agC,  background: "#ef4444" }} />}
                                        {abC  > 0 && <div style={{ flex: abC,  background: "#475569" }} />}
                                      </div>
                                    </div>
                                  )}
                                  <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                                    {(["For", "Against", "Abstain"] as const).map(opt => {
                                      const col  = opt === "For" ? "#22c55e" : opt === "Against" ? "#ef4444" : "#94a3b8";
                                      const Icon = opt === "For" ? ThumbsUp : opt === "Against" ? ThumbsDown : Minus;
                                      return (
                                        <button key={opt} disabled={!mOk} onClick={() => setAgendaMotionVotes(p => ({ ...p, [m.id]: { ...(p[m.id] ?? {}), [currentUser.name]: opt } }))}
                                          style={{ display: "flex", alignItems: "center", gap: "0.2rem", padding: "0.25rem 0.6rem", borderRadius: "5px", background: myV === opt ? col : `${col}18`, color: myV === opt ? "#fff" : col, border: `1px solid ${myV === opt ? col : `${col}40`}`, cursor: mOk ? "pointer" : "default", fontSize: "0.68rem", fontWeight: 600, opacity: mOk ? 1 : 0.5 }}>
                                          <Icon size={10} /> {opt}
                                        </button>
                                      );
                                    })}
                                    {mOk && canRecord(myRole) && (
                                      <div style={{ marginLeft: "auto", display: "flex", gap: "0.2rem" }}>
                                        <button onClick={() => setAgendaItemMotions(p => p.map(x => x.id === m.id ? { ...x, status: "Passed" } : x))} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer", fontSize: "0.62rem", fontWeight: 700 }}>✓</button>
                                        <button onClick={() => setAgendaItemMotions(p => p.map(x => x.id === m.id ? { ...x, status: "Rejected" } : x))} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontSize: "0.62rem", fontWeight: 700 }}>✗</button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                            {/* Decisions & Outcomes */}
                            {(() => {
                              const pDecisions   = decisionItems.filter(d => (d as Decision & { agenda_item?: string }).agenda_item === aKey);
                              const pResolutions = resolutionItems.filter(r => (r as Resolution & { source_decision?: string }).source_decision && pDecisions.some(d => d.id === (r as Resolution & { source_decision?: string }).source_decision));
                              const pActions     = actionItems.filter(a => (a as ActionItem & { source_decision?: string }).source_decision && pDecisions.some(d => d.id === (a as ActionItem & { source_decision?: string }).source_decision));
                              if (pDecisions.length === 0 && pResolutions.length === 0 && pActions.length === 0) return null;
                              const scD = (s: string) => s === "Approved" || s === "Adopted" || s === "Completed" ? "#22c55e" : s === "Conditional" || s === "Pending Signature" ? "#f59e0b" : s === "Rejected" ? "#ef4444" : "#94a3b8";
                              return (
                                <div style={{ borderTop: "1px solid #1e293b", paddingTop: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                  <p style={{ margin: 0, fontSize: "0.6rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                    <CheckCircle size={9} /> Decisions & Outcomes
                                  </p>
                                  {pDecisions.map(d => (
                                    <div key={d.id} style={{ padding: "0.5rem 0.65rem", borderRadius: "7px", background: "#1e293b", border: `1px solid ${scD(d.approval_status)}22` }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.3rem", alignItems: "flex-start" }}>
                                        <span style={{ fontSize: "0.73rem", color: "#e2e8f0", flex: 1, lineHeight: 1.4 }}>{d.decision_title}</span>
                                        <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.35rem", borderRadius: "9999px", background: `${scD(d.approval_status)}20`, color: scD(d.approval_status), fontWeight: 700, flexShrink: 0 }}>{d.approval_status}</span>
                                      </div>
                                      <p style={{ margin: "0.1rem 0 0", fontSize: "0.62rem", color: "#475569" }}>{d.decision_type} · {d.decision_owner}</p>
                                    </div>
                                  ))}
                                  {pResolutions.map(r => (
                                    <div key={r.id} style={{ padding: "0.5rem 0.65rem", borderRadius: "7px", background: "#1e293b", border: `1px solid ${scD(r.approval_status)}22` }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.3rem", alignItems: "flex-start" }}>
                                        <span style={{ fontSize: "0.73rem", color: "#e2e8f0", flex: 1, lineHeight: 1.4 }}>{r.resolution_title}</span>
                                        <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.35rem", borderRadius: "9999px", background: `${scD(r.approval_status)}20`, color: scD(r.approval_status), fontWeight: 700, flexShrink: 0 }}>{r.approval_status}</span>
                                      </div>
                                    </div>
                                  ))}
                                  {pActions.length > 0 && (
                                    <div style={{ padding: "0.5rem 0.65rem", borderRadius: "7px", background: "#1e293b", border: "1px solid rgba(245,158,11,0.18)" }}>
                                      <p style={{ margin: "0 0 0.3rem", fontSize: "0.58rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Action Items</p>
                                      {pActions.map(a => (
                                        <div key={a.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.3rem", marginBottom: "0.2rem" }}>
                                          <div>
                                            <p style={{ margin: 0, fontSize: "0.72rem", color: "#e2e8f0" }}>{a.action_title}</p>
                                            <p style={{ margin: "0.05rem 0 0", fontSize: "0.62rem", color: "#64748b" }}>→ {a.assigned_to} · Due {a.due_date}</p>
                                          </div>
                                          <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.3rem", borderRadius: "4px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 700, flexShrink: 0 }}>{a.action_status ?? a.implementation_status}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      );
                    })()}

                    {/* Voting tab */}
                    {agendaSidebarTab === "voting" && (() => {
                      const aKey = presentedItem.key;
                      const qvKey = `qv-${aKey}`;
                      const qvVotes   = agendaMotionVotes[qvKey] ?? {};
                      const qvFor     = Object.values(qvVotes).filter(v => v === "For").length;
                      const qvAgainst = Object.values(qvVotes).filter(v => v === "Against").length;
                      const qvAbstain = Object.values(qvVotes).filter(v => v === "Abstain").length;
                      const qvTotal   = qvFor + qvAgainst + qvAbstain;
                      const qvMyVote  = qvVotes[currentUser.name] as "For" | "Against" | "Abstain" | undefined;
                      const qvCanVote = canVote(myRole) || canRecord(myRole);
                      const qvCast    = (v: "For" | "Against" | "Abstain") => {
                        if (!qvCanVote) return;
                        setAgendaMotionVotes(p => ({ ...p, [qvKey]: { ...(p[qvKey] ?? {}), [currentUser.name]: v } }));
                      };
                      return (
                        <div style={{ flex: 1, overflowY: "auto", padding: "0.9rem 0.85rem", display: "flex", flexDirection: "column", gap: "0.9rem" }}>
                          {qvTotal > 0 && (
                            <div style={{ padding: "0.65rem 0.75rem", borderRadius: "8px", background: "#0f172a", border: "1px solid #1e293b" }}>
                              <p style={{ margin: "0 0 0.4rem", fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Current Tally</p>
                              <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem" }}>
                                <span style={{ fontSize: "0.72rem", color: "#22c55e", fontWeight: 700 }}>For: {qvFor}</span>
                                <span style={{ fontSize: "0.72rem", color: "#ef4444", fontWeight: 700 }}>Against: {qvAgainst}</span>
                                <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 700 }}>Abstain: {qvAbstain}</span>
                              </div>
                              <div style={{ height: 8, borderRadius: 9999, background: "#1e293b", overflow: "hidden", display: "flex" }}>
                                {qvFor     > 0 && <div style={{ flex: qvFor,     background: "#22c55e", transition: "flex 0.3s" }} />}
                                {qvAgainst > 0 && <div style={{ flex: qvAgainst, background: "#ef4444", transition: "flex 0.3s" }} />}
                                {qvAbstain > 0 && <div style={{ flex: qvAbstain, background: "#475569", transition: "flex 0.3s" }} />}
                              </div>
                              <p style={{ margin: "0.35rem 0 0", fontSize: "0.6rem", color: "#475569", textAlign: "right" }}>{qvTotal} vote{qvTotal !== 1 ? "s" : ""} cast</p>
                            </div>
                          )}
                          <div>
                            <p style={{ margin: "0 0 0.5rem", fontSize: "0.62rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>Cast Your Vote</p>
                            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                              {(["For", "Against", "Abstain"] as const).map(opt => {
                                const col   = opt === "For" ? "#22c55e" : opt === "Against" ? "#ef4444" : "#94a3b8";
                                const Icon  = opt === "For" ? ThumbsUp : opt === "Against" ? ThumbsDown : Minus;
                                const active = qvMyVote === opt;
                                return (
                                  <button key={opt} disabled={!qvCanVote} onClick={() => qvCast(opt)}
                                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.6rem 0.85rem", borderRadius: "8px", background: active ? col : `${col}12`, color: active ? "#fff" : col, border: `1.5px solid ${active ? col : `${col}35`}`, cursor: qvCanVote ? "pointer" : "not-allowed", fontSize: "0.82rem", fontWeight: 700, opacity: qvCanVote ? 1 : 0.45, transition: "all 0.15s", width: "100%" }}>
                                    <Icon size={15} />
                                    <span style={{ flex: 1, textAlign: "left" }}>{opt}</span>
                                    {active && <span style={{ fontSize: "0.65rem", opacity: 0.8 }}>✓ Your vote</span>}
                                  </button>
                                );
                              })}
                            </div>
                            {!qvCanVote && <p style={{ margin: "0.6rem 0 0", fontSize: "0.62rem", color: "#475569", textAlign: "center" }}>{ctrlStatus !== "in-progress" ? "Meeting not in progress" : "Your role does not permit voting"}</p>}
                          </div>
                          {canRecord(myRole) && qvTotal > 0 && (
                            <div>
                              <p style={{ margin: "0 0 0.4rem", fontSize: "0.62rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Individual Votes</p>
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.2rem" }}>
                                {Object.entries(qvVotes).map(([voter, choice]) => {
                                  const col = choice === "For" ? "#22c55e" : choice === "Against" ? "#ef4444" : "#94a3b8";
                                  return (
                                    <div key={voter} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.5rem", borderRadius: "5px", background: "#0f172a" }}>
                                      <span style={{ flex: 1, fontSize: "0.7rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{voter}</span>
                                      <span style={{ fontSize: "0.65rem", fontWeight: 700, color: col, padding: "0.1rem 0.35rem", borderRadius: "4px", background: `${col}18` }}>{choice}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  </div>

                  {/* Participants strip */}
                  <div style={{ borderTop: "1px solid #1e293b", padding: "0.4rem 0.75rem", display: "flex", gap: "0.4rem", overflowX: "auto", flexShrink: 0, background: "#0a1120" }}>
                    {participants.map(p => <div key={p.id} style={{ width: 100, flexShrink: 0 }}><ParticipantTile p={p} size="small" /></div>)}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ── BOTTOM DOCK ──────────────────────────────────────────────────── */}
          <div style={{ height: 64, background: "#1e293b", borderTop: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", padding: "0 1rem", flexShrink: 0 }}>
            <DockButton active={myMicOn}  danger={!myMicOn}  label={myMicOn  ? "Mute"        : "Unmute"}      onClick={() => setMyMicOn(v => !v)}>
              {myMicOn ? <Mic size={18} /> : <MicOff size={18} />}
            </DockButton>
            <DockButton active={myCamOn} danger={!myCamOn} label={myCamOn  ? "Stop Video"  : "Start Video"}  onClick={() => setMyCamOn(v => !v)}>
              {myCamOn ? <Video size={18} /> : <VideoOff size={18} />}
            </DockButton>
            <DockButton active={isSharing} label={isSharing ? "Stop Share" : "Share Screen"} onClick={() => { setIsSharing(v => !v); if (!isSharing) setViewMode("document"); }}>
              {isSharing ? <MonitorOff size={18} /> : <Monitor size={18} />}
            </DockButton>

            <div style={{ width: 1, height: 32, background: "#334155", margin: "0 0.25rem" }} />

            <DockButton active={panelOpen && panelTab === "participants"} label="Members" onClick={() => { setPanelTab("participants"); setPanelOpen(p => panelTab === "participants" ? !p : true); }}>
              <Users size={18} />
            </DockButton>
            <DockButton active={chatOpen} label="Chat" onClick={() => setChatOpen(v => !v)}>
              <MessageSquare size={18} />
              {chatMessages.length > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: "#ef4444", color: "#fff", fontSize: "0.6rem", borderRadius: "9999px", padding: "1px 4px", fontWeight: 700 }}>{chatMessages.length}</span>}
            </DockButton>
            <DockButton active={participants.find(p => p.id === currentUser.id)?.handRaised ?? false} label="Raise Hand" onClick={() => { setParticipants(prev => prev.map(p => p.id === currentUser.id ? { ...p, handRaised: !p.handRaised } : p)); toast("Hand raised"); }}>
              <Hand size={18} />
            </DockButton>
            <DockButton active={reactionsOpen} label="Reactions" onClick={() => setReactionsOpen(v => !v)}>
              <Smile size={18} />
            </DockButton>

            <div style={{ width: 1, height: 32, background: "#334155", margin: "0 0.25rem" }} />

            {/* Recording and transcription require real integrations — not configured */}
            <span title="Integration not configured" style={{ opacity: 0.4, display: "contents" }}>
              <DockButton active={false} label="Record" onClick={() => toast("Recording integration is not configured.")}>
                <Radio size={18} />
              </DockButton>
            </span>
            <span title="Integration not configured" style={{ opacity: 0.4, display: "contents" }}>
              <DockButton active={false} label="Captions" onClick={() => toast("Transcription integration is not configured.")}>
                <MessageSquare size={18} />
              </DockButton>
            </span>
            <DockButton active={isMinutesCapture} label={isMinutesCapture ? "Stop Min" : "Minutes"} onClick={toggleMinutesCapture}>
              <FileText size={18} />
            </DockButton>
            {isMinutesCapture && (
              <DockButton active={!isMinutesPaused} label={isMinutesPaused ? "Resume" : "Pause Min"} onClick={pauseResumeMinutes}>
                {isMinutesPaused ? <Play size={18} /> : <Pause size={18} />}
              </DockButton>
            )}
            <DockButton active={false} label="More" onClick={() => {}}>
              <MoreHorizontal size={18} />
            </DockButton>

            <div style={{ flex: 1 }} />

            <button
              onClick={() => setLeaveConfirmOpen(true)}
              style={{ padding: "0.5rem 1rem", borderRadius: "8px", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.35rem" }}>
              <Phone size={14} /> Leave
            </button>
          </div>
        </div>

        {/* ── RIGHT PANEL ──────────────────────────────────────────────────────── */}
        {panelOpen && (
          <div style={{ width: 360, borderLeft: "1px solid #334155", display: "flex", flexDirection: "column", background: "#1a2332", flexShrink: 0, overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: "1px solid #334155", flexShrink: 0, overflowX: "auto" }}>
              {PANEL_TABS.map(tab => (
                <button key={tab.id} onClick={() => setPanelTab(tab.id)} style={{ flex: 1, minWidth: 0, padding: "0.55rem 0.25rem", background: panelTab === tab.id ? "#1e293b" : "none", color: panelTab === tab.id ? "#f1f5f9" : "#64748b", border: "none", borderBottom: panelTab === tab.id ? "2px solid var(--color-primary)" : "2px solid transparent", cursor: "pointer", fontSize: "0.65rem", fontWeight: panelTab === tab.id ? 700 : 400, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflowY: panelTab === "agenda" && (agendaDetailIdx !== null || agendaChildListParentIdx !== null) ? "hidden" : "auto", padding: "0.75rem" }}>

              {/* ── AGENDA TAB ───────────────────────────────────────────── */}
              {panelTab === "agenda" && (() => {
                const activeItem = agendaItems[activeIdx];

                // ── Detail view ───────────────────────────────────────────
                if (agendaDetailIdx !== null) {
                  const detailIdx = agendaDetailIdx;
                  const detailItem = agendaItems[detailIdx];
                  const st = agendaStatuses[detailIdx];
                  const isCurrentlyActive = detailIdx === activeIdx && st === "In Discussion";

                  const itemDocLinks = agendaDocLinks
                    .filter(l => l.agenda_id === detailItem.key)
                    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
                  const itemDocs = itemDocLinks
                    .map(l => allDocuments.find(d => d.id === l.document_id))
                    .filter((d): d is NonNullable<typeof d> => !!d);

                  const dItemDecisions = decisionItems.filter(d => (d as Decision & { agenda_item?: string }).agenda_item === detailItem.key);
                  const dItemResolutions = resolutionItems.filter(r => (r as Resolution & { source_decision?: string }).source_decision && dItemDecisions.some(d => d.id === (r as Resolution & { source_decision?: string }).source_decision));
                  const dItemActions = actionItems.filter(a => (a as ActionItem & { source_decision?: string }).source_decision && dItemDecisions.some(d => d.id === (a as ActionItem & { source_decision?: string }).source_decision));

                  const dItemMotions = agendaItemMotions.filter(m => m.agendaKey === detailItem.key);
                  const dMForm = agendaMotionForms[detailItem.key] ?? { open: false, text: "", proposedBy: "", secondedBy: "" };
                  const dSetForm = (patch: Partial<typeof dMForm>) =>
                    setAgendaMotionForms(p => ({ ...p, [detailItem.key]: { ...(p[detailItem.key] ?? { open: false, text: "", proposedBy: "", secondedBy: "" }), ...patch } }));

                  const dComments = agendaComments[detailItem.key] ?? [];
                  const dCommentInput = agendaCommentInputs[detailItem.key] ?? "";
                  const dSetCommentInput = (v: string) => setAgendaCommentInputs(p => ({ ...p, [detailItem.key]: v }));
                  const dPostComment = () => {
                    if (!dCommentInput.trim()) return;
                    setAgendaComments(p => ({ ...p, [detailItem.key]: [...(p[detailItem.key] ?? []), { id: `ac-${Date.now()}`, author: currentUser.name, body: dCommentInput.trim(), at: new Date().toISOString() }] }));
                    dSetCommentInput("");
                  };

                  const purposeColors: Record<string, string> = {
                    "For approval": "#7c3aed", "For discussion": "#0284c7",
                    "For information": "#047857", "For noting": "#64748b", "For review": "#0284c7",
                  };
                  const dStatusColor = (s: string | undefined) =>
                    s === "In Discussion" ? "#3b82f6" : s === "Completed" ? "#22c55e" : s === "Deferred" ? "#f59e0b" : s === "Skipped" ? "#64748b" : "#475569";

                  // ── 5-tab detail layout ────────────────────────────────
                  const adQvKey     = `qv-${detailItem.key}`;
                  const adQvVotes   = agendaMotionVotes[adQvKey] ?? {};
                  const adQvFor     = Object.values(adQvVotes).filter(v => v === "For").length;
                  const adQvAgainst = Object.values(adQvVotes).filter(v => v === "Against").length;
                  const adQvAbstain = Object.values(adQvVotes).filter(v => v === "Abstain").length;
                  const adQvTotal   = adQvFor + adQvAgainst + adQvAbstain;
                  const activityCount = dItemDecisions.length + dItemResolutions.length + dItemActions.length + dItemMotions.length;

                  const DETAIL_TABS = [
                    { id: "info",       label: "Details",    badge: 0 },
                    { id: "activities", label: "Activity",   badge: activityCount },
                    { id: "docs",       label: "Docs",       badge: itemDocs.length },
                    { id: "comments",   label: "Comments",   badge: dComments.length },
                    { id: "voting",     label: "Voting",     badge: adQvTotal },
                  ] as const;

                  const parentItem = detailItem.parentKey ? agendaItems.find(a => a.key === detailItem.parentKey) : undefined;

                  return (
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, margin: "-0.75rem", minHeight: 0 }}>

                      {/* ── Back header ── */}
                      <div style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", gap: "0.5rem", background: "#0d1726", flexShrink: 0 }}>
                        <button
                          onClick={() => { setAgendaDetailIdx(null); setAgendaDetailTab("info"); }}
                          style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.55rem", borderRadius: "6px", background: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "1px solid #334155", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}
                        >
                          <ArrowLeft size={12} /> Back
                        </button>
                        <span style={{ flex: 1, fontSize: "0.62rem", color: "#475569", textAlign: "center" }}>
                          {detailIdx + 1} of {agendaItems.length}
                          {(detailItem.level ?? 1) > 1 && <span style={{ marginLeft: "0.3rem", color: "#7c3aed" }}>· Sub-item</span>}
                        </span>
                        <span style={{ fontSize: "0.6rem", padding: "0.15rem 0.45rem", borderRadius: "9999px", background: `${dStatusColor(st)}20`, color: dStatusColor(st), fontWeight: 700, border: `1px solid ${dStatusColor(st)}35`, whiteSpace: "nowrap" }}>
                          {st ?? "Not Started"}
                        </span>
                      </div>

                      {/* ── Title strip ── */}
                      <div style={{ padding: "0.7rem 0.85rem 0.6rem", background: "#111827", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
                        <h3 style={{ margin: "0 0 0.35rem", fontSize: "0.9rem", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.35 }}>{detailItem.title}</h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                          <span style={{ fontSize: "0.62rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "9999px", background: `${purposeColors[detailItem.purpose] ?? "#334155"}25`, color: purposeColors[detailItem.purpose] ?? "#94a3b8", border: `1px solid ${purposeColors[detailItem.purpose] ?? "#334155"}40` }}>
                            {detailItem.purpose}
                          </span>
                          <span style={{ display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.62rem", color: "#64748b" }}>
                            <Clock size={9} /> {detailItem.duration}m
                          </span>
                          {detailItem.presenter && <span style={{ fontSize: "0.62rem", color: "#64748b" }}>· {detailItem.presenter}</span>}
                        </div>
                      </div>

                      {/* ── Tab bar ── */}
                      <div style={{ display: "flex", background: "#0d1726", borderBottom: "1px solid #1e293b", flexShrink: 0, overflowX: "auto" }}>
                        {DETAIL_TABS.map(tab => {
                          const isAct = agendaDetailTab === tab.id;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => setAgendaDetailTab(tab.id)}
                              style={{
                                flex: 1, minWidth: 0, padding: "0.5rem 0.3rem 0.45rem", border: "none", background: "transparent",
                                borderBottom: isAct ? "2px solid var(--color-primary)" : "2px solid transparent",
                                color: isAct ? "#f1f5f9" : "#64748b", cursor: "pointer",
                                fontSize: "0.62rem", fontWeight: isAct ? 700 : 500,
                                display: "flex", flexDirection: "column", alignItems: "center", gap: "0.15rem",
                                transition: "color 0.15s",
                              }}
                            >
                              <span>{tab.label}</span>
                              {tab.badge > 0 && (
                                <span style={{ fontSize: "0.52rem", fontWeight: 700, background: isAct ? "var(--color-primary)" : "#334155", color: "#fff", borderRadius: 9999, padding: "0 4px", minWidth: 14, textAlign: "center", lineHeight: "14px" }}>{tab.badge}</span>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* ── Scrollable tab content ── */}
                      <div style={{ flex: 1, overflowY: "auto", padding: "0.85rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>

                        {/* INFO TAB — full agenda details */}
                        {agendaDetailTab === "info" && (
                          <>
                            {/* Description */}
                            <div>
                              <p style={{ margin: "0 0 0.4rem", fontSize: "0.6rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Agenda Details</p>
                              <div style={{ padding: "0.7rem 0.85rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155" }}>
                                <p style={{ margin: 0, fontSize: "0.77rem", color: "#94a3b8", lineHeight: 1.8 }}>{getAgendaDescription(detailItem)}</p>
                              </div>
                            </div>

                            {/* Action buttons */}
                            {ctrlStatus === "in-progress" && (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                                <div style={{ display: "flex", gap: "0.4rem" }}>
                                  <button onClick={() => { setPresentingAgendaIdx(detailIdx); setViewMode("document"); }} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.3rem", padding: "0.45rem 0.6rem", borderRadius: "7px", background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.73rem", fontWeight: 600 }}>
                                    ▶ Present
                                  </button>
                                  {!isCurrentlyActive && canRecord(myRole) && st !== "Completed" && (
                                    <button onClick={() => { setActiveIdx(detailIdx); setAgendaStatuses(p => ({ ...p, [detailIdx]: "In Discussion" })); }} style={{ padding: "0.45rem 0.6rem", borderRadius: "7px", background: "#1e293b", color: "#60a5fa", border: "1px solid #334155", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600 }}>
                                      Make Active
                                    </button>
                                  )}
                                </div>
                                {canRecord(myRole) && (
                                  <div style={{ display: "flex", gap: "0.4rem" }}>
                                    <button onClick={() => setAgendaReasonModal({ action: "Defer", idx: detailIdx })} style={{ flex: 1, padding: "0.38rem 0.5rem", borderRadius: "6px", background: "rgba(245,158,11,0.1)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.25)", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}>Defer</button>
                                    <button onClick={() => setAgendaReasonModal({ action: "Skip", idx: detailIdx })} style={{ flex: 1, padding: "0.38rem 0.5rem", borderRadius: "6px", background: "rgba(100,116,139,0.08)", color: "#94a3b8", border: "1px solid #334155", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}>Skip</button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Discussion Notes (when item is currently active) */}
                            {isCurrentlyActive && (
                              <div>
                                <p style={{ margin: "0 0 0.4rem", fontSize: "0.6rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>Discussion Notes</p>
                                <textarea value={notes[detailIdx] ?? ""} onChange={e => setNotes(p => ({ ...p, [detailIdx]: e.target.value }))} placeholder="Capture discussion notes…" rows={4} style={{ width: "100%", padding: "0.4rem 0.5rem", fontSize: "0.75rem", borderRadius: "6px", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                              </div>
                            )}
                          </>
                        )}

                        {/* ACTIVITIES TAB — Decisions, Resolutions, Actions, Motions */}
                        {agendaDetailTab === "activities" && (
                          <>
                            {/* Motions */}
                            <div>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                <p style={{ margin: 0, fontSize: "0.6rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                  <Gavel size={9} /> Motions{dItemMotions.length > 0 ? ` (${dItemMotions.length})` : ""}
                                </p>
                                <button
                                  onClick={() => dSetForm({ open: !dMForm.open })}
                                  style={{ padding: "0.32rem 0.8rem", borderRadius: "6px", background: dMForm.open ? "#334155" : "#f59e0b", color: dMForm.open ? "#94a3b8" : "#0f172a", border: dMForm.open ? "1px solid #475569" : "none", cursor: "pointer", fontSize: "0.72rem", fontWeight: 700 }}
                                >
                                  {dMForm.open ? "✕ Cancel" : "+ Raise Motion"}
                                </button>
                              </div>
                              {dMForm.open && (
                                <div style={{ padding: "0.85rem 1rem", borderRadius: "8px", background: "#0f172a", border: "1px solid rgba(245,158,11,0.2)", marginBottom: "0.5rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                                  <textarea
                                    value={dMForm.text}
                                    onChange={e => dSetForm({ text: e.target.value })}
                                    placeholder="Motion text: That the Board resolves to…"
                                    rows={3}
                                    style={{ width: "100%", padding: "0.5rem 0.65rem", fontSize: "0.82rem", borderRadius: "6px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                                  />
                                  <input value={dMForm.proposedBy} onChange={e => dSetForm({ proposedBy: e.target.value })} placeholder="Moved by…" style={{ width: "100%", padding: "0.4rem 0.65rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", boxSizing: "border-box" }} />
                                  <input value={dMForm.secondedBy} onChange={e => dSetForm({ secondedBy: e.target.value })} placeholder="Seconded by… (optional)" style={{ width: "100%", padding: "0.4rem 0.65rem", fontSize: "0.8rem", borderRadius: "6px", border: "1px solid #334155", background: "#1e293b", color: "#f1f5f9", boxSizing: "border-box" }} />
                                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                                    <button
                                      onClick={() => {
                                        if (!dMForm.text.trim()) return;
                                        setAgendaItemMotions(p => [...p, { id: `aim-${Date.now()}`, agendaKey: detailItem.key, title: dMForm.text.trim(), proposedBy: dMForm.proposedBy || currentUser.name, secondedBy: dMForm.secondedBy, status: "Proposed" }]);
                                        dSetForm({ open: false, text: "", proposedBy: "", secondedBy: "" });
                                      }}
                                      style={{ padding: "0.4rem 1.25rem", borderRadius: "6px", background: "#f59e0b", color: "#0f172a", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 700 }}
                                    >
                                      Submit Motion
                                    </button>
                                  </div>
                                </div>
                              )}
                              {dItemMotions.length === 0 && !dMForm.open && <p style={{ fontSize: "0.72rem", color: "#475569", fontStyle: "italic" }}>No motions raised yet.</p>}
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                {dItemMotions.map(m => {
                                  const votes = agendaMotionVotes[m.id] ?? {};
                                  const forC = Object.values(votes).filter(v => v === "For").length;
                                  const agC  = Object.values(votes).filter(v => v === "Against").length;
                                  const abC  = Object.values(votes).filter(v => v === "Abstain").length;
                                  const totV = forC + agC + abC;
                                  const myV  = votes[currentUser.name] as "For" | "Against" | "Abstain" | undefined;
                                  const mOk  = m.status === "Proposed" || m.status === "Seconded";
                                  const sc   = m.status === "Passed" ? "#22c55e" : m.status === "Rejected" ? "#ef4444" : m.status === "Withdrawn" ? "#64748b" : "#f59e0b";
                                  return (
                                    <div key={m.id} style={{ padding: "0.55rem 0.65rem", borderRadius: "7px", background: "#1e293b", border: `1px solid ${sc}28` }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.3rem", marginBottom: "0.2rem" }}>
                                        <p style={{ margin: 0, fontSize: "0.73rem", fontWeight: 500, color: "#e2e8f0", lineHeight: 1.4, flex: 1 }}>{m.title}</p>
                                        <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.35rem", borderRadius: "9999px", background: `${sc}20`, color: sc, fontWeight: 700, flexShrink: 0 }}>{m.status}</span>
                                      </div>
                                      <p style={{ margin: "0 0 0.4rem", fontSize: "0.62rem", color: "#64748b" }}>Moved: {m.proposedBy}{m.secondedBy ? ` · Seconded: ${m.secondedBy}` : ""}</p>
                                      {totV > 0 && (
                                        <div style={{ marginBottom: "0.35rem" }}>
                                          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.18rem" }}>
                                            {([["For", forC, "#22c55e"], ["Against", agC, "#ef4444"], ["Abstain", abC, "#64748b"]] as const).map(([l, c, col]) => <span key={l} style={{ fontSize: "0.6rem", color: col, fontWeight: 600 }}>{l}: {c}</span>)}
                                          </div>
                                          <div style={{ height: 4, borderRadius: 9999, background: "#0f172a", overflow: "hidden", display: "flex" }}>
                                            {forC > 0 && <div style={{ flex: forC, background: "#22c55e" }} />}
                                            {agC > 0  && <div style={{ flex: agC,  background: "#ef4444" }} />}
                                            {abC > 0  && <div style={{ flex: abC,  background: "#475569" }} />}
                                          </div>
                                        </div>
                                      )}
                                      <div style={{ display: "flex", gap: "0.25rem", alignItems: "center", flexWrap: "wrap" }}>
                                        {(["For", "Against", "Abstain"] as const).map(opt => {
                                          const col  = opt === "For" ? "#22c55e" : opt === "Against" ? "#ef4444" : "#94a3b8";
                                          const Icon = opt === "For" ? ThumbsUp : opt === "Against" ? ThumbsDown : Minus;
                                          return (
                                            <button key={opt} disabled={!mOk} onClick={() => setAgendaMotionVotes(p => ({ ...p, [m.id]: { ...(p[m.id] ?? {}), [currentUser.name]: opt } }))} style={{ display: "flex", alignItems: "center", gap: "0.18rem", padding: "0.18rem 0.5rem", borderRadius: "5px", background: myV === opt ? col : `${col}18`, color: myV === opt ? "#fff" : col, border: `1px solid ${myV === opt ? col : `${col}40`}`, cursor: mOk ? "pointer" : "default", fontSize: "0.63rem", fontWeight: 600, opacity: mOk ? 1 : 0.5 }}>
                                              <Icon size={9} /> {opt}
                                            </button>
                                          );
                                        })}
                                        {mOk && canRecord(myRole) && (
                                          <div style={{ marginLeft: "auto", display: "flex", gap: "0.2rem" }}>
                                            <button onClick={() => setAgendaItemMotions(p => p.map(x => x.id === m.id ? { ...x, status: "Passed" } : x))} style={{ padding: "0.18rem 0.4rem", borderRadius: "4px", background: "rgba(34,197,94,0.15)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.3)", cursor: "pointer", fontSize: "0.6rem", fontWeight: 700 }}>✓</button>
                                            <button onClick={() => setAgendaItemMotions(p => p.map(x => x.id === m.id ? { ...x, status: "Rejected" } : x))} style={{ padding: "0.18rem 0.4rem", borderRadius: "4px", background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontSize: "0.6rem", fontWeight: 700 }}>✗</button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Decisions & Outcomes */}
                            {(dItemDecisions.length > 0 || dItemResolutions.length > 0 || dItemActions.length > 0) && (
                              <div style={{ borderTop: dItemMotions.length > 0 || dMForm.open ? "1px solid #1e293b" : "none", paddingTop: dItemMotions.length > 0 || dMForm.open ? "0.75rem" : 0, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                <p style={{ margin: "0 0 0.3rem", fontSize: "0.6rem", fontWeight: 700, color: "#60a5fa", textTransform: "uppercase", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                  <CheckCircle size={9} /> Decisions & Outcomes
                                </p>
                                {dItemDecisions.map(d => {
                                  const sc = d.approval_status === "Approved" || d.approval_status === "Adopted" ? "#22c55e" : d.approval_status === "Rejected" ? "#ef4444" : d.approval_status === "Conditional" ? "#f59e0b" : "#94a3b8";
                                  return (
                                    <div key={d.id} style={{ padding: "0.45rem 0.6rem", borderRadius: "7px", background: "#1e293b", border: `1px solid ${sc}22` }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.35rem", alignItems: "flex-start" }}>
                                        <span style={{ fontSize: "0.75rem", color: "#e2e8f0", flex: 1, lineHeight: 1.4 }}>{d.decision_title}</span>
                                        <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.38rem", borderRadius: "9999px", background: `${sc}20`, color: sc, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>{d.approval_status}</span>
                                      </div>
                                      <p style={{ margin: "0.15rem 0 0", fontSize: "0.62rem", color: "#475569" }}>{d.decision_type} · {d.decision_owner}</p>
                                    </div>
                                  );
                                })}
                                {dItemResolutions.map(r => {
                                  const sc = r.approval_status === "Approved" || r.approval_status === "Adopted" ? "#22c55e" : r.approval_status === "Rejected" ? "#ef4444" : "#f59e0b";
                                  return (
                                    <div key={r.id} style={{ padding: "0.45rem 0.6rem", borderRadius: "7px", background: "#1e293b", border: `1px solid ${sc}22` }}>
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.35rem", alignItems: "flex-start" }}>
                                        <span style={{ fontSize: "0.75rem", color: "#e2e8f0", flex: 1, lineHeight: 1.4 }}>{r.resolution_title}</span>
                                        <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.38rem", borderRadius: "9999px", background: `${sc}20`, color: sc, fontWeight: 700, flexShrink: 0, whiteSpace: "nowrap" }}>{r.approval_status}</span>
                                      </div>
                                      <p style={{ margin: "0.12rem 0 0", fontSize: "0.62rem", color: "#475569" }}>For {r.votes_for} · Against {r.votes_against} · Abstain {r.abstentions}</p>
                                    </div>
                                  );
                                })}
                                {dItemActions.length > 0 && (
                                  <div style={{ padding: "0.45rem 0.6rem", borderRadius: "7px", background: "#1e293b", border: "1px solid rgba(245,158,11,0.18)" }}>
                                    <p style={{ margin: "0 0 0.25rem", fontSize: "0.58rem", fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Action Items</p>
                                    {dItemActions.map(a => (
                                      <div key={a.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.35rem", alignItems: "flex-start", marginBottom: "0.2rem" }}>
                                        <div>
                                          <p style={{ margin: 0, fontSize: "0.73rem", color: "#e2e8f0" }}>{a.action_title}</p>
                                          <p style={{ margin: "0.05rem 0 0", fontSize: "0.62rem", color: "#475569" }}>→ {a.assigned_to} · Due {a.due_date}</p>
                                        </div>
                                        <span style={{ fontSize: "0.58rem", padding: "0.1rem 0.35rem", borderRadius: "4px", background: "rgba(245,158,11,0.15)", color: "#f59e0b", fontWeight: 700, flexShrink: 0 }}>{a.action_status ?? a.implementation_status}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {activityCount === 0 && !dMForm.open && <p style={{ fontSize: "0.73rem", color: "#475569", fontStyle: "italic" }}>No activities recorded for this item yet.</p>}
                          </>
                        )}

                        {/* DOCS TAB */}
                        {agendaDetailTab === "docs" && (
                          <>
                            {itemDocs.length === 0 ? (
                              <p style={{ fontSize: "0.73rem", color: "#475569", fontStyle: "italic" }}>No documents linked to this agenda item.</p>
                            ) : (
                              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                                {itemDocs.map(doc => {
                                  const link = itemDocLinks.find(l => l.document_id === doc.id);
                                  const isPrimary = !!link?.is_primary;
                                  const docName = doc.doc_name ?? doc.file_name ?? doc.id;
                                  return (
                                    <div key={doc.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.65rem 0.5rem 0.75rem", borderRadius: "8px", background: "#1e293b", borderLeft: `3px solid ${isPrimary ? "#3b82f6" : "#334155"}` }}>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docName}</p>
                                        <p style={{ margin: "0.1rem 0 0", fontSize: "0.62rem", color: "#475569" }}>{doc.doc_type ?? "Document"} · v{doc.version ?? "1.0"}{isPrimary ? " · Primary" : ""}</p>
                                      </div>
                                      <button onClick={() => { setPresentingDoc(doc as BoardDocument); setViewMode("document"); }} style={{ padding: "0.22rem 0.55rem", borderRadius: "5px", background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)", cursor: "pointer", fontSize: "0.65rem", fontWeight: 600, flexShrink: 0 }}>Open →</button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}

                        {/* COMMENTS TAB */}
                        {agendaDetailTab === "comments" && (
                          <>
                            {dComments.length === 0 && <p style={{ fontSize: "0.73rem", color: "#475569", fontStyle: "italic" }}>No comments yet.</p>}
                            {dComments.map(c => (
                              <div key={c.id} style={{ padding: "0.5rem 0.65rem", borderRadius: "7px", background: "#1e293b", border: "1px solid #334155" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#cbd5e1" }}>{c.author}</span>
                                  <span style={{ fontSize: "0.6rem", color: "#475569" }}>{new Date(c.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                                </div>
                                <p style={{ margin: 0, fontSize: "0.73rem", color: "#94a3b8", lineHeight: 1.55 }}>{c.body}</p>
                              </div>
                            ))}
                            <div style={{ display: "flex", gap: "0.35rem" }}>
                              <input value={dCommentInput} onChange={e => dSetCommentInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") dPostComment(); }} placeholder="Add a comment… (Enter to post)" style={{ flex: 1, padding: "0.35rem 0.5rem", fontSize: "0.73rem", borderRadius: "6px", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9" }} />
                              <button onClick={dPostComment} style={{ padding: "0.35rem 0.6rem", borderRadius: "6px", background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}>Post</button>
                            </div>
                          </>
                        )}

                        {/* VOTING TAB */}
                        {agendaDetailTab === "voting" && (
                          <>
                            {/* Context label */}
                            <div style={{ padding: "0.4rem 0.55rem", borderRadius: "6px", background: "#0f172a", border: "1px solid #334155" }}>
                              <p style={{ margin: 0, fontSize: "0.58rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                                {(detailItem.level ?? 1) > 1 ? "Sub-item vote" : "Agenda item vote"}
                              </p>
                              <p style={{ margin: "0.12rem 0 0", fontSize: "0.75rem", fontWeight: 600, color: "#e2e8f0", lineHeight: 1.35 }}>{detailItem.title}</p>
                            </div>

                            {/* Tally */}
                            {adQvTotal > 0 && (
                              <div>
                                <p style={{ margin: "0 0 0.35rem", fontSize: "0.6rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Tally — {adQvTotal} vote{adQvTotal !== 1 ? "s" : ""}</p>
                                <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.3rem" }}>
                                  <span style={{ fontSize: "0.7rem", color: "#22c55e", fontWeight: 700 }}>For: {adQvFor}</span>
                                  <span style={{ fontSize: "0.7rem", color: "#ef4444", fontWeight: 700 }}>Against: {adQvAgainst}</span>
                                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", fontWeight: 700 }}>Abstain: {adQvAbstain}</span>
                                </div>
                                <div style={{ height: 8, borderRadius: 9999, background: "#0f172a", overflow: "hidden", display: "flex" }}>
                                  {adQvFor     > 0 && <div style={{ flex: adQvFor,     background: "#22c55e", transition: "flex 0.3s" }} />}
                                  {adQvAgainst > 0 && <div style={{ flex: adQvAgainst, background: "#ef4444", transition: "flex 0.3s" }} />}
                                  {adQvAbstain > 0 && <div style={{ flex: adQvAbstain, background: "#475569", transition: "flex 0.3s" }} />}
                                </div>
                              </div>
                            )}

                            {/* Individual votes */}
                            {canRecord(myRole) && adQvTotal > 0 && (
                              <div>
                                <p style={{ margin: "0 0 0.3rem", fontSize: "0.6rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Individual Votes</p>
                                <div style={{ display: "flex", flexDirection: "column", gap: "0.18rem" }}>
                                  {Object.entries(adQvVotes).map(([voter, choice]) => {
                                    const col = choice === "For" ? "#22c55e" : choice === "Against" ? "#ef4444" : "#94a3b8";
                                    return (
                                      <div key={voter} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.25rem 0.4rem", borderRadius: "5px", background: "#0f172a" }}>
                                        <span style={{ flex: 1, fontSize: "0.68rem", color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{voter}</span>
                                        <span style={{ fontSize: "0.63rem", fontWeight: 700, color: col, padding: "0.08rem 0.3rem", borderRadius: "4px", background: `${col}18` }}>{choice}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </>
                        )}

                      </div>

                      {/* ── Fixed-bottom "Mark Complete" footer ── */}
                      <div style={{ flexShrink: 0, background: "#0d1726", borderTop: "1px solid #1e293b", padding: "0.7rem 0.85rem" }}>
                        {st !== "Completed" ? (
                          <button
                            onClick={() => completeItem(detailIdx)}
                            style={{
                              width: "100%", padding: "0.65rem", borderRadius: "8px",
                              background: "#22c55e", color: "#fff",
                              border: "none", cursor: "pointer",
                              fontSize: "0.82rem", fontWeight: 700,
                              display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem",
                              transition: "background 0.15s",
                            }}
                          >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2.5 7l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            Mark as Complete
                          </button>
                        ) : (
                          <button
                            onClick={() => setAgendaStatuses(p => ({ ...p, [detailIdx]: "Not Started" }))}
                            style={{ width: "100%", padding: "0.65rem", borderRadius: "8px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.45rem" }}
                          >
                            <RotateCcw size={14} /> Reopen Item
                          </button>
                        )}
                      </div>
                    </div>
                  );
                }

                // ── Child list view ───────────────────────────────────────
                if (agendaChildListParentIdx !== null) {
                  const parentItem  = agendaItems[agendaChildListParentIdx];
                  const parentSt    = agendaStatuses[agendaChildListParentIdx];
                  const stColor = (s: string | undefined) => s === "Completed" ? "#22c55e" : s === "In Discussion" ? "#3b82f6" : s === "Deferred" ? "#f59e0b" : s === "Skipped" ? "#64748b" : "#475569";
                  const childItems  = agendaItems
                    .map((item, idx) => ({ item, idx }))
                    .filter(({ item }) => item.parentKey === parentItem.key);

                  return (
                    <div style={{ display: "flex", flexDirection: "column", flex: 1, margin: "-0.75rem", minHeight: 0 }}>
                      {/* Back header */}
                      <div style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", gap: "0.5rem", background: "#0d1726", flexShrink: 0 }}>
                        <button
                          onClick={() => setAgendaChildListParentIdx(null)}
                          style={{ display: "flex", alignItems: "center", gap: "0.3rem", padding: "0.25rem 0.55rem", borderRadius: "6px", background: "rgba(148,163,184,0.1)", color: "#94a3b8", border: "1px solid #334155", cursor: "pointer", fontSize: "0.7rem", fontWeight: 600 }}
                        >
                          <ArrowLeft size={12} /> Back
                        </button>
                        <span style={{ flex: 1, fontSize: "0.62rem", color: "#475569", textAlign: "center" }}>Sub-items</span>
                        <span style={{ fontSize: "0.6rem", padding: "0.15rem 0.45rem", borderRadius: "9999px", background: `${stColor(parentSt)}20`, color: stColor(parentSt), fontWeight: 700, border: `1px solid ${stColor(parentSt)}35`, whiteSpace: "nowrap" }}>
                          {parentSt ?? "Not Started"}
                        </span>
                      </div>

                      {/* Parent title strip */}
                      <div style={{ padding: "0.65rem 0.85rem 0.55rem", background: "#111827", borderBottom: "1px solid #1e293b", flexShrink: 0 }}>
                        <p style={{ margin: "0 0 0.1rem", fontSize: "0.62rem", fontWeight: 700, color: "#475569", textTransform: "uppercase", letterSpacing: "0.06em" }}>Parent Agenda</p>
                        <h3 style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "#f1f5f9", lineHeight: 1.35 }}>{parentItem.title}</h3>
                        <p style={{ margin: "0.25rem 0 0", fontSize: "0.62rem", color: "#64748b" }}>
                          {childItems.length} sub-item{childItems.length !== 1 ? "s" : ""} · {childItems.filter(({ idx }) => agendaStatuses[idx] === "Completed").length} completed
                        </p>
                      </div>

                      {/* Child list */}
                      <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {childItems.length === 0 && (
                          <p style={{ fontSize: "0.73rem", color: "#475569", fontStyle: "italic" }}>No sub-items for this agenda.</p>
                        )}
                        {childItems.map(({ item, idx }) => {
                          const cSt = agendaStatuses[idx];
                          const isCompleted = cSt === "Completed";
                          const isActive    = idx === activeIdx && cSt === "In Discussion";
                          const dotColor    = isActive ? "#3b82f6" : isCompleted ? "#22c55e" : cSt === "Deferred" ? "#f59e0b" : cSt === "Skipped" ? "#475569" : "#334155";
                          return (
                            <div
                              key={item.key}
                              onClick={() => { setAgendaDetailIdx(idx); setAgendaDetailTab("info"); }}
                              style={{ padding: "0.6rem 0.65rem", borderRadius: "8px", background: isActive ? "#1e3a5f" : "#1e293b", border: `1px solid ${isActive ? "var(--color-primary)" : isCompleted ? "#22c55e30" : "#334155"}`, cursor: "pointer", display: "flex", alignItems: "center", gap: "0.5rem", transition: "background 0.12s" }}
                            >
                              {/* status dot */}
                              <div style={{ width: 10, height: 10, borderRadius: "50%", background: dotColor, flexShrink: 0, border: `2px solid ${dotColor}` }} />

                              {/* text */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ margin: 0, fontSize: "0.77rem", fontWeight: isActive ? 700 : 500, color: isCompleted ? "#64748b" : "#f1f5f9", lineHeight: 1.3, textDecoration: isCompleted ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</p>
                                <p style={{ margin: "0.1rem 0 0", fontSize: "0.62rem", color: "#64748b" }}>{item.duration}m · {item.purpose}</p>
                              </div>

                              {/* Open button */}
                              <button
                                onClick={e => { e.stopPropagation(); setPresentingAgendaIdx(idx); setViewMode("document"); }}
                                style={{ padding: "0.2rem 0.5rem", borderRadius: "5px", background: "rgba(96,165,250,0.12)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.25)", cursor: "pointer", fontSize: "0.65rem", fontWeight: 600, flexShrink: 0 }}
                              >
                                Open
                              </button>
                              <ChevronRight size={12} style={{ color: "#475569", flexShrink: 0 }} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }

                // ── Parent list view ──────────────────────────────────────
                const parentItems = agendaItems
                  .map((item, idx) => ({ item, idx }))
                  .filter(({ item }) => (item.level ?? 1) === 1);

                const completedCount = parentItems.filter(({ idx }) => agendaStatuses[idx] === "Completed").length;
                const inDiscussionCount = parentItems.filter(({ idx }) => agendaStatuses[idx] === "In Discussion").length;
                const deferredCount  = parentItems.filter(({ idx }) => agendaStatuses[idx] === "Deferred").length;
                const skippedCount   = parentItems.filter(({ idx }) => agendaStatuses[idx] === "Skipped").length;
                const remainingCount = parentItems.filter(({ idx }) => !agendaStatuses[idx] || agendaStatuses[idx] === "Not Started").length;
                const totalItems     = parentItems.length;
                const pct = totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
                const totalDuration  = agendaItems.reduce((s, a) => s + a.duration, 0);
                const doneDuration   = agendaItems.filter((_, i) => agendaStatuses[i] === "Completed").reduce((s, a) => s + a.duration, 0);

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>

                    {/* ── Meeting Progress Tracker ── */}
                    {totalItems > 0 && (
                      <div style={{ borderRadius: "10px", background: "#1e293b", border: "1px solid #334155", overflow: "hidden" }}>
                        {/* Header row */}
                        <div style={{ padding: "0.65rem 0.85rem 0.4rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                            <CheckCircle size={13} style={{ color: pct === 100 ? "#22c55e" : "#60a5fa" }} />
                            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f1f5f9" }}>Meeting Progress</span>
                          </div>
                          <span style={{ fontSize: "0.72rem", fontWeight: 800, color: pct === 100 ? "#22c55e" : "#60a5fa" }}>{pct}%</span>
                        </div>

                        {/* Segmented bar */}
                        <div style={{ margin: "0 0.85rem 0.55rem", height: 9, borderRadius: 9999, background: "#0f172a", overflow: "hidden", display: "flex" }}>
                          {completedCount   > 0 && <div style={{ flex: completedCount,   background: "#22c55e", transition: "flex 0.4s" }} />}
                          {inDiscussionCount > 0 && <div style={{ flex: inDiscussionCount, background: "#3b82f6", transition: "flex 0.4s" }} />}
                          {deferredCount    > 0 && <div style={{ flex: deferredCount,    background: "#f59e0b", transition: "flex 0.4s" }} />}
                          {skippedCount     > 0 && <div style={{ flex: skippedCount,     background: "#475569", transition: "flex 0.4s" }} />}
                          {remainingCount   > 0 && <div style={{ flex: remainingCount,   background: "#1e3a5f", transition: "flex 0.4s" }} />}
                        </div>

                        {/* Stat pills row */}
                        <div style={{ padding: "0 0.85rem 0.65rem", display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                          {([
                            ["Done",    completedCount,    "#22c55e", "✓"],
                            ["Active",  inDiscussionCount, "#3b82f6", "▶"],
                            ["Left",    remainingCount,    "#94a3b8", "○"],
                            ["Deferred",deferredCount,     "#f59e0b", "⏸"],
                            ["Skipped", skippedCount,      "#64748b", "—"],
                          ] as const).filter(([,count]) => count > 0).map(([label, count, color, icon]) => (
                            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: "0.2rem", fontSize: "0.63rem", fontWeight: 600, color, background: `${color}15`, border: `1px solid ${color}30`, padding: "0.12rem 0.4rem", borderRadius: 9999 }}>
                              <span style={{ fontSize: "0.6rem" }}>{icon}</span> {count} {label}
                            </span>
                          ))}
                        </div>

                        {/* Duration row */}
                        <div style={{ padding: "0.45rem 0.85rem", borderTop: "1px solid #0f172a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.62rem", color: "#475569" }}>
                            <Clock size={9} style={{ display: "inline", marginRight: 3 }} />{doneDuration}m covered of {totalDuration}m total
                          </span>
                          {activeItem && (
                            <span style={{ fontSize: "0.62rem", color: "#60a5fa", maxWidth: "55%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              ▶ {activeItem.title}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Agenda</p>
                    {ctrlStatus === "in-progress" && canRecord(myRole) && (
                      <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap" }}>
                        <button onClick={() => { const prev = activeIdx - 1; if (prev >= 0) { setActiveIdx(prev); if (!agendaStatuses[prev] || agendaStatuses[prev] === "Not Started") setAgendaStatuses(p => ({ ...p, [prev]: "In Discussion" })); } }} disabled={activeIdx === 0} title="Previous item" style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "#1e293b", color: activeIdx === 0 ? "#334155" : "#94a3b8", border: "1px solid #334155", cursor: activeIdx === 0 ? "not-allowed" : "pointer", fontSize: "0.68rem" }}>◀</button>
                        <button onClick={() => setAgendaReasonModal({ action: "Defer", idx: activeIdx })} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "#1e293b", color: "#f59e0b", border: "1px solid #334155", cursor: "pointer", fontSize: "0.68rem" }}>Defer</button>
                        <button onClick={() => setAgendaReasonModal({ action: "Skip", idx: activeIdx })} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", cursor: "pointer", fontSize: "0.68rem" }}>Skip</button>
                        <button onClick={() => completeItem(activeIdx)} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600 }}>Complete</button>
                        <button onClick={() => { const next = activeIdx + 1; if (next < agendaItems.length) { if (agendaStatuses[activeIdx] === "In Discussion") setAgendaStatuses(p => ({ ...p, [activeIdx]: "Completed" })); setAgendaStatuses(p => ({ ...p, [next]: "In Discussion" })); setActiveIdx(next); } }} disabled={activeIdx >= agendaItems.length - 1} title="Next item" style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "#1e293b", color: activeIdx >= agendaItems.length - 1 ? "#334155" : "#94a3b8", border: "1px solid #334155", cursor: activeIdx >= agendaItems.length - 1 ? "not-allowed" : "pointer", fontSize: "0.68rem" }}>▶</button>
                      </div>
                    )}
                  </div>

                  {parentItems.length === 0 && (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "#64748b", fontSize: "0.78rem", background: "#1e293b", borderRadius: "8px", border: "1px dashed #334155" }}>
                      No agendas are linked to this meeting.
                    </div>
                  )}

                  {parentItems.map(({ item, idx }) => {
                    const st = agendaStatuses[idx];
                    const isCompleted       = st === "Completed";
                    const isCurrentlyActive = idx === activeIdx && st === "In Discussion";
                    const children = agendaItems
                      .map((a, i) => ({ a, i }))
                      .filter(({ a }) => a.parentKey === item.key);
                    const childCount     = children.length;
                    const childCompleted = children.filter(({ i }) => agendaStatuses[i] === "Completed").length;
                    const hasChildren    = childCount > 0;
                    const sDotColor      = st === "In Discussion" ? "#3b82f6" : st === "Completed" ? "#22c55e" : st === "Deferred" ? "#f59e0b" : st === "Skipped" ? "#64748b" : "#334155";
                    return (
                      <div
                        key={item.key}
                        onClick={() => {
                          if (hasChildren) {
                            setAgendaChildListParentIdx(idx);
                          } else {
                            setAgendaDetailIdx(idx);
                            setAgendaDetailTab("info");
                          }
                        }}
                        style={{ padding: "0.55rem 0.65rem 0.55rem 0.5rem", borderRadius: "8px", background: isCurrentlyActive ? "#1e3a5f" : "#1e293b", border: `1px solid ${isCurrentlyActive ? "var(--color-primary)" : isCompleted ? "#22c55e30" : "#334155"}`, cursor: "pointer", transition: "background 0.15s, border-color 0.15s", display: "flex", alignItems: "center", gap: "0.45rem" }}
                      >
                        {/* Completion circle */}
                        <button
                          type="button"
                          title={isCompleted ? "Reopen" : "Mark complete"}
                          onClick={e => {
                            e.stopPropagation();
                            if (isCompleted) setAgendaStatuses(p => ({ ...p, [idx]: "Not Started" }));
                            else completeItem(idx);
                          }}
                          style={{ width: 20, height: 20, borderRadius: "50%", flexShrink: 0, border: `2px solid ${isCompleted ? "#22c55e" : "#475569"}`, background: isCompleted ? "#22c55e" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.15s", padding: 0 }}
                        >
                          {isCompleted && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </button>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: isCurrentlyActive ? 700 : 500, color: isCompleted ? "#64748b" : "#f1f5f9", textDecoration: isCompleted ? "line-through" : "none", lineHeight: 1.3 }}>{item.title}</p>
                          <p style={{ margin: "0.1rem 0 0", fontSize: "0.63rem", color: "#64748b" }}>{item.duration}m · {item.purpose}</p>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
                          {/* Child count badge */}
                          {hasChildren && (
                            <span style={{ display: "flex", alignItems: "center", gap: "0.18rem", fontSize: "0.6rem", fontWeight: 700, color: childCompleted === childCount ? "#22c55e" : "#94a3b8", padding: "0.1rem 0.35rem", borderRadius: "9999px", background: childCompleted === childCount ? "rgba(34,197,94,0.12)" : "#0f172a", border: `1px solid ${childCompleted === childCount ? "rgba(34,197,94,0.3)" : "#334155"}`, whiteSpace: "nowrap" }}>
                              {childCompleted}/{childCount}
                            </span>
                          )}
                          {st && st !== "Not Started" && (
                            <span style={{ fontSize: "0.58rem", padding: "0.08rem 0.28rem", borderRadius: "4px", background: "#0f172a", color: sDotColor, whiteSpace: "nowrap" }}>{st === "In Discussion" ? "Live" : st}</span>
                          )}
                          <ChevronRight size={13} style={{ color: "#475569" }} />
                        </div>
                      </div>
                    );
                  })}

                  {/* Temporary agenda button */}
                  {ctrlStatus === "in-progress" && canRecord(myRole) && (
                    <button onClick={() => setTempAgendaOpen(true)} style={{ padding: "0.4rem 0.75rem", borderRadius: "6px", background: "#1e293b", color: "#f59e0b", border: "1px dashed #f59e0b", cursor: "pointer", fontSize: "0.72rem", fontWeight: 600, textAlign: "center" }}>
                      + Create Temporary Agenda
                    </button>
                  )}
                </div>
              );
            })()}

              {/* ── DOCUMENTS TAB ────────────────────────────────────────── */}
              {panelTab === "documents" && (() => {
                // Collect doc IDs linked to agendas in this meeting
                const linkedAgendaIds = new Set(
                  meetingAgendaLinks.filter(l => l.meeting_id === meetingId).map(l => l.agenda_id)
                );
                // Also include agendas loaded by meeting_id
                agendaItems.forEach(a => linkedAgendaIds.add(a.key));
                const meetingDocIds = new Set(
                  agendaDocLinks.filter(l => linkedAgendaIds.has(l.agenda_id)).map(l => l.document_id)
                );
                const meetingDocs = allDocuments.filter(d => meetingDocIds.has(d.id));

                const logDocView = (docId: string, docName: string) => {
                  if (!meetingId) return;
                  addInteraction({ id: mkId("DOC"), meeting_id: meetingId, agenda_id: agendaItems[activeIdx]?.key, user_id: currentUser.id, interaction_type: "document_view", content: `Viewed: ${docName}`, metadata: { document_id: docId, document_name: docName, time: nowISO() }, created_at: nowISO() } as never);
                };

                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 0.25rem" }}>
                      Meeting Documents {meetingDocs.length > 0 ? `(${meetingDocs.length})` : ""}
                    </p>
                    {meetingDocs.length === 0 && (
                      <p style={{ fontSize: "0.73rem", color: "#64748b" }}>No documents linked to this meeting&apos;s agendas yet.</p>
                    )}
                    {meetingDocs.map(doc => {
                      const docName = doc.doc_name ?? doc.file_name ?? doc.id;
                      return (
                        <div key={doc.id} style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <FileText size={14} style={{ color: "#64748b", flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{docName}</p>
                            <p style={{ margin: 0, fontSize: "0.68rem", color: "#64748b" }}>{doc.doc_type ?? "Document"} · v{doc.version ?? "1.0"} · {doc.confidentiality ?? "Confidential"}</p>
                          </div>
                          <button onClick={() => { logDocView(doc.id, docName); setPresentingDoc(doc as BoardDocument); setViewMode("document"); }} style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600, flexShrink: 0 }}>Open</button>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              {/* ── PARTICIPANTS TAB (Section 13) ─────────────────────────── */}
              {panelTab === "participants" && (() => {
                const canonicalEntries: PEntry[] = meetingLinks.map(l => {
                  const user = bmsUsers.find(u => u.id === l.user_id) ?? participants.find(p => p.id === l.user_id);
                  const name = (user && "name" in user ? user.name : null) ?? l.user_id;
                  return { id: l.user_id, name, role: l.participant_type, category: (l.member_category === "quorum" || l.quorum_eligible) ? "quorum" as const : "general" as const, isRequired: l.is_required, votingEligible: l.voting_eligible, initials: name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase() };
                });
                const entries: PEntry[] = canonicalEntries.length > 0
                  ? canonicalEntries
                  : participants.map(p => ({ id: p.id, name: p.name, role: p.role, category: (canVote(p.role as MyRole) ? "quorum" : "general") as "quorum" | "general", isRequired: p.isHost, votingEligible: canVote(p.role as MyRole), initials: p.initials }));
                return (
                  <ParticipantPanel
                    entries={entries}
                    attendanceMap={attendanceMap}
                    activeStates={ACTIVE_STATES}
                    quorumMet={quorumMet}
                    quorumLabel={quorumStatusLabel(quorumCalcResult)}
                    eligibleCount={quorumCalcResult.eligibleCount}
                    requiredCount={quorumCalcResult.requiredCount}
                    canUpdate={canRecord(myRole)}
                    isEnded={ctrlStatus === "ended"}
                    onSetAttendance={(id, st) => setAttendance(id, st as AttendanceStatus)}
                    agendaKey={activeAgendaKey}
                    agendaRecusedIds={agendaRecusedIds}
                    onToggleAgendaRecusal={(userId) => {
                      setAgendaRecusals(prev => {
                        const existing = prev[activeAgendaKey] ?? [];
                        const updated = existing.includes(userId)
                          ? existing.filter(id => id !== userId)
                          : [...existing, userId];
                        return { ...prev, [activeAgendaKey]: updated };
                      });
                    }}
                  />
                );
              })()}

              {/* ── MOTIONS & VOTING TAB ─────────────────────────────────── */}
              {panelTab === "motions" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Motions & Voting</p>

                  {/* Summary pills */}
                  </div>
                  {motions.length > 0 && (() => {
                    const passed   = motions.filter(m => m.status === "Passed").length;
                    const rejected = motions.filter(m => m.status === "Rejected").length;
                    const pending  = motions.filter(m => !["Passed","Rejected"].includes(m.status)).length;
                    const pill = (label: string, color: string) => (
                      <span style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem", borderRadius: 9999, background: `${color}22`, color, fontWeight: 700, border: `1px solid ${color}44` }}>{label}</span>
                    );
                    return (
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap", marginBottom: "0.1rem" }}>
                        {pill(`${motions.length} Motion${motions.length !== 1 ? "s" : ""}`, "#94a3b8")}
                        {passed   > 0 && pill(`${passed} Passed`,   "#22c55e")}
                        {rejected > 0 && pill(`${rejected} Rejected`, "#ef4444")}
                        {pending  > 0 && pill(`${pending} Pending`,  "#f59e0b")}
                        {activeVote?.status === "Open" && pill("Vote Open", "#a78bfa")}
                      </div>
                    );
                  })()}
                  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
                    {ctrlStatus === "in-progress" && canRecord(myRole) && (
                      <div style={{ display: "flex", gap: "0.3rem" }}>
                        <button onClick={() => setMotionOpen(true)} style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#334155", color: "#f1f5f9", border: "none", cursor: "pointer", fontSize: "0.68rem" }}>+ Motion</button>
                        <button
                          onClick={() => setVoteOpen(true)}
                          disabled={!quorumMet || activeVote?.status === "Open"}
                          title={!quorumMet ? "No quorum" : activeVote?.status === "Open" ? "A vote is already open" : "Open vote"}
                          style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: quorumMet && activeVote?.status !== "Open" ? "var(--color-primary)" : "#334155", color: quorumMet && activeVote?.status !== "Open" ? "#fff" : "#64748b", border: "none", cursor: quorumMet && activeVote?.status !== "Open" ? "pointer" : "not-allowed", fontSize: "0.68rem", fontWeight: 600 }}>
                          + Vote
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Active vote panel */}
                  {activeVote && activeVote.status === "Open" && (
                    <div style={{ padding: "0.75rem", borderRadius: "8px", background: "#1e1a3f", border: "1px solid #7c3aed44" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#a78bfa" }}>🗳 Vote in Progress</p>
                          <p style={{ margin: "0.2rem 0 0", fontSize: "0.72rem", color: "#64748b" }}>{activeVote.motionTitle}</p>
                          <p style={{ margin: "0.1rem 0 0", fontSize: "0.66rem", color: "#475569" }}>{activeVote.voteType} · {activeVote.threshold} · {pendingVotes} pending</p>
                        </div>
                        {canRecord(myRole) && (
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            <button onClick={closeVote} style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#14532d", color: "#22c55e", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600 }}>Close Vote</button>
                            <button onClick={cancelVote} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "#7f1d1d", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "0.68rem" }}>Cancel</button>
                          </div>
                        )}
                      </div>

                      {/* Tally */}
                      <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.5rem" }}>
                        <TallyBadge label="For"     count={activeVote.votesFor}     color="#22c55e" />
                        <TallyBadge label="Against" count={activeVote.votesAgainst} color="#ef4444" />
                        <TallyBadge label="Abstain" count={activeVote.abstentions}  color="#94a3b8" />
                      </div>

                      {/* Cast vote — only for eligible voters */}
                      {canVote(myRole) && activeVote.voteType !== "Secret Ballot" && (
                        <div>
                          <p style={{ fontSize: "0.68rem", color: "#64748b", margin: "0 0 0.3rem" }}>Cast your vote:</p>
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            {(["For","Against","Abstain"] as const).map(choice => (
                              <button
                                key={choice}
                                onClick={() => castVote("self", choice)}
                                style={{ flex: 1, padding: "0.35rem 0.3rem", borderRadius: "6px", border: `1px solid ${activeVote.castVotes["self"] === choice ? (choice === "For" ? "#22c55e" : choice === "Against" ? "#ef4444" : "#64748b") : "#334155"}`, background: activeVote.castVotes["self"] === choice ? (choice === "For" ? "#14532d" : choice === "Against" ? "#7f1d1d" : "#1e293b") : "#1e293b", color: activeVote.castVotes["self"] === choice ? (choice === "For" ? "#22c55e" : choice === "Against" ? "#ef4444" : "#94a3b8") : "#64748b", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.25rem" }}
                              >
                                {choice === "For" ? <ThumbsUp size={11} /> : choice === "Against" ? <ThumbsDown size={11} /> : <Minus size={11} />} {choice}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Individual vote tracking */}
                      {activeVote.voteType !== "Secret Ballot" && (
                        <div style={{ marginTop: "0.5rem" }}>
                          <p style={{ fontSize: "0.68rem", color: "#64748b", margin: "0 0 0.3rem" }}>Individual votes (Chair/Secretary can record):</p>
                          {participants.filter(p => ["Board Member","Independent Director","Chairperson"].includes(p.role)).map(p => (
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: "0.4rem", padding: "0.2rem 0", borderBottom: "1px solid #1e293b" }}>
                              <span style={{ flex: 1, fontSize: "0.72rem", color: "#94a3b8" }}>{p.name.split(" ").slice(-1)[0]}</span>
                              {(["For","Against","Abstain"] as const).map(choice => (
                                <button
                                  key={choice}
                                  onClick={() => canRecord(myRole) ? castVote(p.id, choice) : undefined}
                                  disabled={!canRecord(myRole)}
                                  style={{ padding: "0.1rem 0.3rem", borderRadius: "3px", border: "none", background: activeVote.castVotes[p.id] === choice ? (choice === "For" ? "#14532d" : choice === "Against" ? "#7f1d1d" : "#334155") : "transparent", color: activeVote.castVotes[p.id] === choice ? (choice === "For" ? "#22c55e" : choice === "Against" ? "#ef4444" : "#94a3b8") : "#475569", cursor: canRecord(myRole) ? "pointer" : "default", fontSize: "0.65rem" }}
                                >
                                  {choice[0]}
                                </button>
                              ))}
                              {!activeVote.castVotes[p.id] && <span style={{ fontSize: "0.62rem", color: "#475569" }}>—</span>}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Chairman casting vote (tie-breaking) */}
                      {canControl(myRole) && activeVote.votesFor === activeVote.votesAgainst && activeVote.votesFor > 0 && (
                        <div style={{ marginTop: "0.5rem", padding: "0.4rem 0.5rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #f59e0b44" }}>
                          <p style={{ fontSize: "0.68rem", color: "#f59e0b", margin: "0 0 0.3rem" }}>⚖ Tied — Chairperson casting vote</p>
                          <div style={{ display: "flex", gap: "0.3rem" }}>
                            <button onClick={() => setActiveVote(v => v ? { ...v, chairmanCastingVote: "For",     votesFor:      v.votesFor + 1     } : v)} style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#14532d", color: "#22c55e", border: "none", cursor: "pointer", fontSize: "0.68rem" }}>Cast For</button>
                            <button onClick={() => setActiveVote(v => v ? { ...v, chairmanCastingVote: "Against", votesAgainst:  v.votesAgainst + 1 } : v)} style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#7f1d1d", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "0.68rem" }}>Cast Against</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Closed/cancelled vote result */}
                  {activeVote && activeVote.status !== "Open" && (
                    <div style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: `1px solid ${activeVote.result === "Passed" ? "#22c55e44" : "#ef444444"}` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: activeVote.status === "Cancelled" ? "#94a3b8" : activeVote.result === "Passed" ? "#22c55e" : "#ef4444" }}>
                            {activeVote.status === "Cancelled" ? "Vote Cancelled" : `Vote ${activeVote.result}`}
                          </p>
                          <p style={{ margin: "0.2rem 0 0", fontSize: "0.68rem", color: "#64748b" }}>{activeVote.motionTitle}</p>
                          {activeVote.status === "Closed" && (
                            <p style={{ margin: "0.1rem 0 0", fontSize: "0.66rem", color: "#475569" }}>
                              For: {activeVote.votesFor} · Against: {activeVote.votesAgainst} · Abstain: {activeVote.abstentions}
                            </p>
                          )}
                          {activeVote.reopenHistory.length > 0 && (
                            <p style={{ margin: "0.1rem 0 0", fontSize: "0.63rem", color: "#64748b" }}>Reopened {activeVote.reopenHistory.length}×</p>
                          )}
                        </div>
                        {canRecord(myRole) && (
                          <button onClick={() => setReopenOpen(true)} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "#334155", color: "#94a3b8", border: "none", cursor: "pointer", fontSize: "0.65rem", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                            <RotateCcw size={10} /> Reopen
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Motion list */}
                  {motions.length === 0 && !activeVote && (
                    <p style={{ fontSize: "0.78rem", color: "#475569", textAlign: "center", padding: "1.5rem 0" }}>No motions recorded yet.</p>
                  )}
                  {motions.map(m => (
                    <div key={m.id} style={{ padding: "0.6rem 0.75rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155" }}>
                      <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700, color: "#f1f5f9" }}>{m.title}</p>
                      <p style={{ margin: "0.2rem 0 0", fontSize: "0.68rem", color: "#64748b" }}>By {m.proposedBy}{m.secondedBy ? ` · Seconded by ${m.secondedBy}` : ""}</p>
                      <div style={{ display: "flex", gap: "0.35rem", marginTop: "0.5rem", alignItems: "center" }}>
                        {canRecord(myRole) && m.status === "Proposed" && !activeVote?.id && (
                          <>
                            <button onClick={() => setMotions(prev => prev.map(x => x.id === m.id ? { ...x, status: "Seconded" } : x))} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "#1e3a5f", color: "#60a5fa", border: "none", cursor: "pointer", fontSize: "0.65rem" }}>Second</button>
                            <button onClick={() => setVoteOpen(true)} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.65rem" }}>Put to Vote</button>
                          </>
                        )}
                        {canRecord(myRole) && (
                          <>
                            <button onClick={() => setMotions(prev => prev.map(x => x.id === m.id ? { ...x, status: "Passed" } : x))} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "#14532d", color: "#22c55e", border: "none", cursor: "pointer", fontSize: "0.68rem" }}>Pass</button>
                            <button onClick={() => setMotions(prev => prev.map(x => x.id === m.id ? { ...x, status: "Rejected" } : x))} style={{ padding: "0.2rem 0.4rem", borderRadius: "4px", background: "#7f1d1d", color: "#ef4444", border: "none", cursor: "pointer", fontSize: "0.68rem" }}>Reject</button>
                          </>
                        )}
                        <span style={{ marginLeft: "auto", fontSize: "0.68rem", padding: "0.15rem 0.4rem", borderRadius: "4px", background: m.status === "Passed" ? "#14532d" : m.status === "Rejected" ? "#7f1d1d" : m.status === "Seconded" ? "#1e3a5f" : "#1e293b", color: m.status === "Passed" ? "#22c55e" : m.status === "Rejected" ? "#ef4444" : m.status === "Seconded" ? "#60a5fa" : "#94a3b8" }}>{m.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── DECISIONS & ACTIONS TAB ──────────────────────────────── */}
              {panelTab === "decisions" && (() => {
                const mid = meetingId ?? "";
                const matchesMeeting = (item: unknown) => {
                  const r = item as { meeting_id?: string; source_meeting?: string };
                  return r.meeting_id === mid || r.source_meeting === mid;
                };
                const mtgMotions     = motionItems.filter(matchesMeeting);
                const mtgVotes       = voteItems.filter(matchesMeeting);
                const mtgDecisions   = decisionItems.filter(matchesMeeting);
                const mtgResolutions = resolutionItems.filter(matchesMeeting);
                const mtgActions     = actionItems.filter(matchesMeeting);
                const badge = (label: string, col: string) => (
                  <span style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem", borderRadius: 9999, background: `${col}22`, color: col, fontWeight: 700, flexShrink: 0 }}>{label}</span>
                );
                return (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", flexShrink: 0 }}>
                    {!quorumMet && <div style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", background: "#7f1d1d22", border: "1px solid #ef444444", fontSize: "0.75rem", color: "#fca5a5" }}>⚠ Quorum not met — decisions and resolutions are blocked</div>}
                    {/* Create buttons */}
                    {ctrlStatus === "in-progress" && !isObserver(myRole) && (
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        <button onClick={() => setDecisionOpen(true)} disabled={!quorumMet} style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: quorumMet ? "var(--color-primary)" : "#334155", color: quorumMet ? "#fff" : "#64748b", border: "none", cursor: quorumMet ? "pointer" : "not-allowed", fontSize: "0.68rem", fontWeight: 600 }}>+ Decision</button>
                        <button onClick={() => setResolutionOpen(true)} disabled={!quorumMet} style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: quorumMet ? "#1e3a5f" : "#334155", color: quorumMet ? "#60a5fa" : "#64748b", border: "none", cursor: quorumMet ? "pointer" : "not-allowed", fontSize: "0.68rem" }}>+ Resolution</button>
                        <button onClick={() => setActionOpen(true)} style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "#1e293b", color: "#94a3b8", border: "1px solid #334155", cursor: "pointer", fontSize: "0.68rem" }}>+ Action</button>
                      </div>
                    )}
                    {/* Motions — local (agenda panel) + registry */}
                    {(motions.length > 0 || mtgMotions.length > 0 || agendaItemMotions.length > 0) && (
                      <section>
                        <p style={{ margin: "0 0 0.3rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8" }}>Motions</p>
                        {[...agendaItemMotions, ...motions].map(m => {
                          const votes   = agendaMotionVotes[m.id] ?? {};
                          const forN    = Object.values(votes).filter(v => v === "For").length;
                          const againstN = Object.values(votes).filter(v => v === "Against").length;
                          const abstainN = Object.values(votes).filter(v => v === "Abstain").length;
                          const total   = forN + againstN + abstainN;
                          const sc      = m.status === "Passed" ? "#22c55e" : m.status === "Rejected" ? "#ef4444" : m.status === "Withdrawn" ? "#64748b" : "#f59e0b";
                          const agLabel = m.agendaKey ? agendaItems.find(a => a.key === m.agendaKey)?.title : undefined;
                          return (
                            <div key={m.id} style={{ padding: "0.45rem 0.55rem", borderRadius: "6px", background: "#1e293b", border: `1px solid ${sc}30`, marginBottom: "0.3rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.3rem", alignItems: "flex-start", marginBottom: "0.15rem" }}>
                                <span style={{ fontSize: "0.74rem", flex: 1, color: "#f1f5f9", lineHeight: 1.4 }}>{m.title}</span>
                                {badge(m.status, sc)}
                              </div>
                              {agLabel && <p style={{ margin: "0 0 0.15rem", fontSize: "0.6rem", color: "#475569" }}>Re: {agLabel}</p>}
                              <p style={{ margin: 0, fontSize: "0.63rem", color: "#475569" }}>Moved: {m.proposedBy}{m.secondedBy ? ` · Sec: ${m.secondedBy}` : ""}</p>
                              {total > 0 && (
                                <div style={{ marginTop: "0.3rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
                                  <div style={{ flex: 1, height: 4, borderRadius: 9999, background: "#0f172a", overflow: "hidden", display: "flex" }}>
                                    {forN > 0     && <div style={{ flex: forN,     background: "#22c55e" }} />}
                                    {againstN > 0 && <div style={{ flex: againstN, background: "#ef4444" }} />}
                                    {abstainN > 0 && <div style={{ flex: abstainN, background: "#475569" }} />}
                                  </div>
                                  <span style={{ fontSize: "0.6rem", color: "#64748b", whiteSpace: "nowrap" }}>{forN}–{againstN}–{abstainN}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </section>
                    )}
                    {/* Vote results */}
                    {mtgVotes.length > 0 && (
                      <section>
                        <p style={{ margin: "0 0 0.3rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8" }}>Vote Results</p>
                        {mtgVotes.map(v => {
                          const vv = v as unknown as { id: string; motion_text?: string; result?: string; votes_for?: number; votes_against?: number; abstentions?: number };
                          return (
                            <div key={vv.id} style={{ padding: "0.4rem 0.5rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #334155", marginBottom: "0.2rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.3rem", alignItems: "flex-start" }}>
                                <span style={{ fontSize: "0.75rem", flex: 1, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{vv.motion_text ?? "Vote"}</span>
                                {badge(vv.result ?? "Closed", vv.result === "Passed" ? "#22c55e" : vv.result === "Failed" ? "#ef4444" : "#94a3b8")}
                              </div>
                              <p style={{ margin: "0.1rem 0 0", fontSize: "0.63rem", color: "#475569" }}>For {vv.votes_for ?? 0} · Against {vv.votes_against ?? 0} · Abstain {vv.abstentions ?? 0}</p>
                            </div>
                          );
                        })}
                      </section>
                    )}
                    {/* Decisions */}
                    {mtgDecisions.length > 0 && (
                      <section>
                        <p style={{ margin: "0 0 0.3rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8" }}>Decisions</p>
                        {mtgDecisions.map(d => {
                          const dd = d as unknown as { id: string; decision_text?: string; decision_title?: string; approval_status?: string; decision_type?: string };
                          return (
                            <div key={dd.id} style={{ padding: "0.4rem 0.5rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #334155", marginBottom: "0.2rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.3rem", alignItems: "flex-start" }}>
                                <span style={{ fontSize: "0.75rem", flex: 1, color: "#f1f5f9" }}>{dd.decision_text ?? dd.decision_title ?? "Decision"}</span>
                                {badge(dd.approval_status ?? "Draft", dd.approval_status === "Confirmed" ? "#22c55e" : "#94a3b8")}
                              </div>
                              {dd.decision_type && <p style={{ margin: "0.1rem 0 0", fontSize: "0.63rem", color: "#475569" }}>{dd.decision_type}</p>}
                            </div>
                          );
                        })}
                      </section>
                    )}
                    {/* Resolutions */}
                    {mtgResolutions.length > 0 && (
                      <section>
                        <p style={{ margin: "0 0 0.3rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8" }}>Resolutions</p>
                        {mtgResolutions.map(r => {
                          const rr = r as unknown as { id: string; resolution_text?: string; resolution_title?: string; approval_status?: string };
                          return (
                            <div key={rr.id} style={{ padding: "0.4rem 0.5rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #334155", marginBottom: "0.2rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.3rem", alignItems: "flex-start" }}>
                                <span style={{ fontSize: "0.75rem", flex: 1, color: "#f1f5f9" }}>{rr.resolution_text ?? rr.resolution_title ?? "Resolution"}</span>
                                {badge(rr.approval_status ?? "Draft", rr.approval_status === "Confirmed" ? "#22c55e" : "#94a3b8")}
                              </div>
                            </div>
                          );
                        })}
                      </section>
                    )}
                    {/* Action Items */}
                    {mtgActions.length > 0 && (
                      <section>
                        <p style={{ margin: "0 0 0.3rem", fontSize: "0.68rem", fontWeight: 700, textTransform: "uppercase", color: "#94a3b8" }}>Action Items</p>
                        {mtgActions.map(a => {
                          const aa = a as unknown as { id: string; action_title?: string; action_text?: string; assigned_to?: string; due_date?: string; status?: string };
                          return (
                            <div key={aa.id} style={{ padding: "0.4rem 0.5rem", borderRadius: "6px", background: "#1e293b", border: "1px solid #334155", marginBottom: "0.2rem" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.3rem", alignItems: "flex-start" }}>
                                <span style={{ fontSize: "0.75rem", flex: 1, color: "#f1f5f9" }}>{aa.action_title ?? aa.action_text ?? "Action"}</span>
                                {badge(aa.status ?? "Open", aa.status === "Completed" ? "#22c55e" : "#f59e0b")}
                              </div>
                              <p style={{ margin: "0.1rem 0 0", fontSize: "0.63rem", color: "#475569" }}>{[aa.assigned_to && `→ ${aa.assigned_to}`, aa.due_date && `Due ${aa.due_date}`].filter(Boolean).join(" · ")}</p>
                            </div>
                          );
                        })}
                      </section>
                    )}
                    {motions.length === 0 && agendaItemMotions.length === 0 && mtgVotes.length === 0 && mtgDecisions.length === 0 && mtgResolutions.length === 0 && mtgActions.length === 0 && (
                      <div style={{ padding: "1.25rem 0.75rem", textAlign: "center", background: "#1e293b", borderRadius: "8px", border: "1px dashed #334155" }}>
                        <p style={{ fontSize: "0.78rem", color: "#64748b", margin: "0 0 0.3rem", fontWeight: 600 }}>No outcomes recorded yet</p>
                        <p style={{ fontSize: "0.7rem", color: "#475569", margin: 0 }}>Decisions, resolutions, and actions created during this meeting will appear here.</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ── MINUTES TAB ──────────────────────────────────────────── */}
              {panelTab === "minutes" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                    <p style={{ fontSize: "0.75rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", margin: 0 }}>Live Minutes</p>
                    {ctrlStatus !== "not-started" && canRecord(myRole) && (
                      <button onClick={() => setMinutesOpen(true)} style={{ padding: "0.2rem 0.5rem", borderRadius: "4px", background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600 }}>Save Draft</button>
                    )}
                  </div>

                  {/* Captured summary — shows what's been recorded this session */}
                  {(() => {
                    const completedCount = Object.values(agendaStatuses).filter(s => s === "Completed").length;
                    const mid = meetingId ?? "";
                    const matchesMeeting = (item: unknown) => {
                      const r = item as { meeting_id?: string; source_meeting?: string };
                      return r.meeting_id === mid || r.source_meeting === mid;
                    };
                    const capturedDecisions   = decisionItems.filter(matchesMeeting).length;
                    const capturedResolutions = resolutionItems.filter(matchesMeeting).length;
                    const capturedActions     = actionItems.filter(matchesMeeting).length;
                    const totalMotions        = motions.length;
                    const hasNotes = Object.values(notes).some(n => n && n.trim().length > 0);
                    const statPill = (label: string, val: number, color: string) => (
                      <div style={{ flex: 1, textAlign: "center", padding: "0.4rem 0.25rem", borderRadius: "6px", background: "#0f172a" }}>
                        <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color }}>{val}</p>
                        <p style={{ margin: 0, fontSize: "0.6rem", color: "#64748b", whiteSpace: "nowrap" }}>{label}</p>
                      </div>
                    );
                    return (
                      <div style={{ padding: "0.6rem", borderRadius: "8px", background: "#1e293b", border: "1px solid #334155", marginBottom: "0.25rem" }}>
                        <p style={{ margin: "0 0 0.5rem", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>Captured This Meeting</p>
                        <div style={{ display: "flex", gap: "0.3rem", marginBottom: "0.45rem" }}>
                          {statPill("Agenda Done", completedCount, "#60a5fa")}
                          {statPill("Motions", totalMotions, "#a78bfa")}
                          {statPill("Decisions", capturedDecisions, "#22c55e")}
                          {statPill("Actions", capturedActions, "#f59e0b")}
                        </div>
                        {capturedResolutions > 0 && (
                          <p style={{ margin: 0, fontSize: "0.68rem", color: "#64748b" }}>
                            + {capturedResolutions} resolution{capturedResolutions !== 1 ? "s" : ""} recorded
                          </p>
                        )}
                        <div style={{ marginTop: "0.4rem", display: "flex", gap: "0.3rem", alignItems: "center" }}>
                          <span style={{ fontSize: "0.65rem", color: hasNotes ? "#22c55e" : "#475569" }}>
                            {hasNotes ? "✓ Discussion notes captured" : "No discussion notes yet"}
                          </span>
                          <span style={{ fontSize: "0.65rem", color: "#334155" }}>·</span>
                          <span style={{ fontSize: "0.65rem", color: quorumMet ? "#22c55e" : "#ef4444" }}>
                            {quorumMet ? "✓ Quorum met" : "✗ Quorum lost"}
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  <p style={{ margin: "0.25rem 0 0", fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>Discussion Notes</p>

                  {agendaItems.map((item, idx) => (
                    <div key={item.key} style={{ borderRadius: "8px", border: "1px solid #334155", overflow: "hidden" }}>
                      <div style={{ padding: "0.45rem 0.6rem", background: agendaStatuses[idx] === "In Discussion" ? "#1e3a5f" : "#1e293b", fontSize: "0.75rem", fontWeight: 600, color: "#f1f5f9" }}>
                        {idx + 1}. {item.title}
                      </div>
                      <textarea value={notes[idx] ?? ""} onChange={e => setNotes(p => ({ ...p, [idx]: e.target.value }))} placeholder="Notes…" disabled={ctrlStatus === "ended" || isObserver(myRole)} style={{ width: "100%", minHeight: 50, padding: "0.4rem 0.6rem", fontSize: "0.75rem", border: "none", borderTop: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── CHAT OVERLAY ─────────────────────────────────────────────────────── */}
      {chatOpen && (
        <div style={{ position: "fixed", bottom: 80, right: panelOpen ? 376 : 16, width: 300, height: 360, background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", display: "flex", flexDirection: "column", zIndex: 100 }}>
          <div style={{ padding: "0.6rem 0.75rem", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>Chat</span>
            <button onClick={() => setChatOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={14} /></button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: "0.5rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {chatMessages.length === 0 && <p style={{ fontSize: "0.75rem", color: "#475569", textAlign: "center", padding: "1rem 0" }}>No messages yet.</p>}
            {chatMessages.map(m => (
              <div key={m.id} style={{ padding: "0.3rem 0.5rem", borderRadius: "6px", background: "#0f172a" }}>
                <p style={{ margin: 0, fontSize: "0.72rem", fontWeight: 700, color: "var(--color-primary)" }}>{m.from} <span style={{ fontWeight: 400, color: "#475569" }}>{m.time}</span></p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: "#f1f5f9" }}>{m.text}</p>
              </div>
            ))}
          </div>
          <div style={{ padding: "0.4rem 0.5rem", borderTop: "1px solid #334155", display: "flex", gap: "0.4rem" }}>
            <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter") sendChat(); }} placeholder="Type a message…" style={{ flex: 1, padding: "0.35rem 0.5rem", borderRadius: "6px", border: "1px solid #334155", background: "#0f172a", color: "#f1f5f9", fontSize: "0.78rem" }} />
            <Button type="button" variant="primary" size="lg" onClick={sendChat}>Send</Button>
          </div>
        </div>
      )}

      {/* ── REACTIONS ────────────────────────────────────────────────────────── */}
      {reactionsOpen && (
        <div style={{ position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)", display: "flex", gap: "0.5rem", padding: "0.5rem 0.75rem", background: "#1e293b", borderRadius: "9999px", border: "1px solid #334155", zIndex: 100 }}>
          {REACTIONS.map(r => (
            <button key={r} onClick={() => { toast(r); setReactionsOpen(false); }} style={{ fontSize: "1.3rem", background: "none", border: "none", cursor: "pointer" }}>{r}</button>
          ))}
          <button onClick={() => setReactionsOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b" }}><X size={14} /></button>
        </div>
      )}

      {/* ── CLOSURE CHECKLIST ────────────────────────────────────────────────── */}
      {closureOpen && (
        <AppModal open title="End Meeting" onClose={() => setClosureOpen(false)} footer={
          <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
            <Button type="button" variant="ghost" size="lg" onClick={() => setClosureOpen(false)}>Continue Meeting</Button>
            <Button type="button" variant="destructive" size="sm" leadingIcon={PhoneOff}
              disabled={activeVote?.status === "Open" || (!closureAllChecked)}
              title={activeVote?.status === "Open" ? "A vote is still open — close it before ending" : !closureAllChecked ? "Complete the checklist" : undefined}
              onClick={() => { setClosureOpen(false); setEndConfirmOpen(true); }}>
              End Meeting
            </Button>
          </div>
        }>
          <div style={{ padding: "0.5rem 0" }}>
            {/* Active vote blocker */}
            {activeVote?.status === "Open" && (
              <div style={{ padding: "0.6rem 0.75rem", borderRadius: 6, background: "#7f1d1d22", border: "1px solid #ef444444", marginBottom: "0.75rem", fontSize: "0.78rem", color: "#fca5a5", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <AlertCircle size={14} /> A vote is still open. Close it before ending the meeting.
              </div>
            )}

            {/* Pre-end summary */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {[
                { label: "Duration",    value: fmtTime(elapsed) },
                { label: "Completed",   value: String(Object.values(agendaStatuses).filter(s => s === "Completed").length) + "/" + agendaItems.length },
                { label: "Deferred",    value: String(Object.values(agendaStatuses).filter(s => s === "Deferred").length) },
                { label: "Skipped",     value: String(Object.values(agendaStatuses).filter(s => s === "Skipped").length) },
                { label: "Motions",     value: String(motions.length) },
                { label: "Actions",     value: "Recorded in register" },
                { label: "Present",     value: `${presentCount} participants` },
                { label: "Quorum",      value: quorumStatusLabel(quorumCalcResult) },
              ].map(({ label, value }) => (
                <div key={label} style={{ padding: "0.4rem 0.6rem", borderRadius: 6, background: "var(--muted)", fontSize: "0.75rem" }}>
                  <span style={{ color: "var(--muted-foreground)" }}>{label}: </span>
                  <span style={{ fontWeight: 600 }}>{value}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>Confirm all items before ending the meeting.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {CLOSURE_CHECKLIST.map(item => (
                <label key={item.key} style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", cursor: "pointer", padding: "0.5rem 0.75rem", borderRadius: "var(--radius)", border: `1px solid ${closureChecked[item.key] ? "var(--color-primary)" : "var(--border)"}`, background: closureChecked[item.key] ? "var(--color-primary-50,#eff6ff)" : "var(--background)" }}>
                  <input type="checkbox" checked={!!closureChecked[item.key]} onChange={e => setClosureChecked(p => ({ ...p, [item.key]: e.target.checked }))} style={{ marginTop: 2, accentColor: "var(--color-primary)", width: 15, height: 15, flexShrink: 0 }} />
                  <span style={{ fontSize: "0.78rem" }}>{item.label}</span>
                  {closureChecked[item.key] && <CheckCircle size={13} style={{ color: "var(--color-primary)", marginLeft: "auto", flexShrink: 0 }} />}
                </label>
              ))}
            </div>
            {!closureAllChecked && (
              <p style={{ fontSize: "0.75rem", color: "#b91c1c", marginTop: "0.5rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <AlertCircle size={13} /> {CLOSURE_CHECKLIST.filter(i => !closureChecked[i.key]).length} item(s) remaining.
              </p>
            )}
          </div>
        </AppModal>
      )}

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      {motionOpen && (
        <AppModal open title="Add Motion" size="lg" onClose={() => { setMotionOpen(false); setMotionProposer(""); }} footer={<><SecondaryButton style={{ marginRight: "auto" }} onClick={() => { setMotionOpen(false); setMotionProposer(""); }}>Cancel</SecondaryButton><PrimaryButton type="submit" form="live-motion-form">Record Motion</PrimaryButton></>}>
          <EntryForm
            formId="live-motion-form"
            fields={MOTION_FORM_FIELDS.map(f => {
              if (f.key === "proposed_by") return { ...f, type: "select" as const, options: presentParticipantOptions };
              if (f.key === "seconded_by") return { ...f, type: "select" as const, options: presentParticipantOptions.filter(o => (typeof o === "object" ? o.value : o) !== motionProposer) };
              return f;
            })}
            onClose={() => { setMotionOpen(false); setMotionProposer(""); }}
            onSubmit={handleMotionSubmit}
            onValuesSync={vals => { const p = String(vals.proposed_by ?? ""); if (p !== motionProposer) setMotionProposer(p); }}
            submitLabel="Record Motion"
          />
        </AppModal>
      )}

      {voteOpen && (
        <AppModal open title="Open Vote" size="lg" onClose={() => setVoteOpen(false)} footer={<><SecondaryButton style={{ marginRight: "auto" }} onClick={() => setVoteOpen(false)}>Cancel</SecondaryButton><PrimaryButton type="submit" form="live-vote-form">Open Vote</PrimaryButton></>}>
          <EntryForm
            formId="live-vote-form"
            fields={[
              { key: "vote_title",      label: "Vote Title",       type: "text",   required: true, span: true },
              { key: "related_motion",  label: "Related Motion",   type: "select", options: motionOptions, span: true },
              { key: "vote_type",       label: "Voting Method",    type: "select", options: ["Open", "Show of Hands", "Secret Ballot"], defaultValue: "Open" },
              { key: "threshold",       label: "Threshold",        type: "select", options: ["Simple Majority", "Two-Thirds", "Three-Quarters", "Unanimous"], defaultValue: "Simple Majority" },
              { key: "notes",           label: "Notes",            type: "textarea", span: true, rows: 2 },
            ]}
            onClose={() => setVoteOpen(false)}
            onSubmit={handleVoteSubmit}
            submitLabel="Open Vote"
          />
        </AppModal>
      )}

      {decisionOpen && (
        <AppModal open title="Record Decision" size="lg" onClose={() => setDecisionOpen(false)} footer={<><SecondaryButton style={{ marginRight: "auto" }} onClick={() => setDecisionOpen(false)}>Cancel</SecondaryButton><PrimaryButton type="submit" form="live-decision-form">Record Decision</PrimaryButton></>}>
          <EntryForm
            formId="live-decision-form"
            fields={[
              { key: "decision_title", label: "Decision Title",    type: "text",     required: true, span: true },
              { key: "decision_type",  label: "Decision Type",     type: "select",   required: true, options: ["Resolution","Directive","Policy Approval","Budget Approval","Appointment","Deferral","Rejection"] },
              { key: "decision_owner", label: "Responsible Owner", type: "select", options: activeUserOptions },
              { key: "effective_date", label: "Effective Date",    type: "date" },
              { key: "summary",        label: "Summary",           type: "textarea", span: true, rows: 3 },
            ]}
            onClose={() => setDecisionOpen(false)}
            onSubmit={handleDecisionSubmit}
            submitLabel="Record Decision"
          />
        </AppModal>
      )}

      {resolutionOpen && (
        <AppModal open title="Create Resolution" size="lg" onClose={() => setResolutionOpen(false)} footer={<><SecondaryButton style={{ marginRight: "auto" }} onClick={() => setResolutionOpen(false)}>Cancel</SecondaryButton><PrimaryButton type="submit" form="live-resolution-form">Create Resolution</PrimaryButton></>}>
          <EntryForm
            formId="live-resolution-form"
            fields={[
              { key: "resolution_title", label: "Resolution Title", type: "text",     required: true, span: true },
              { key: "resolution_type",  label: "Resolution Type",  type: "select",   required: true, options: ["Ordinary","Special","Extraordinary","Written"] },
              { key: "resolution_text",  label: "Resolution Text",  type: "textarea", required: true, span: true, rows: 4 },
              { key: "decision_owner",   label: "Resolution Owner", type: "select", options: activeUserOptions },
              { key: "passed_by",        label: "Passed By",        type: "select",   options: ["Unanimous Vote","Majority Vote","Show of Hands","Poll"] },
              { key: "votes_for",        label: "Votes For",        type: "text", defaultValue: String(activeVote?.votesFor ?? "") },
              { key: "votes_against",    label: "Votes Against",    type: "text", defaultValue: String(activeVote?.votesAgainst ?? "") },
              { key: "abstentions",      label: "Abstentions",      type: "text", defaultValue: String(activeVote?.abstentions ?? "") },
              { key: "effective_date",   label: "Effective Date",   type: "date" },
            ]}
            onClose={() => setResolutionOpen(false)}
            onSubmit={handleResolutionSubmit}
            submitLabel="Create Resolution"
          />
        </AppModal>
      )}

      {actionOpen && (
        <AppModal open title="Create Action Item" size="lg" onClose={() => setActionOpen(false)} footer={<><SecondaryButton style={{ marginRight: "auto" }} onClick={() => setActionOpen(false)}>Cancel</SecondaryButton><PrimaryButton type="submit" form="live-action-form">Create Action Item</PrimaryButton></>}>
          <EntryForm
            formId="live-action-form"
            fields={[
              { key: "action_title", label: "Action Title", type: "text",     required: true, span: true },
              { key: "assigned_to",  label: "Assigned To",  type: "select",   required: true, options: activeUserOptions },
              { key: "due_date",     label: "Due Date",     type: "date",     required: true },
              { key: "priority",     label: "Priority",     type: "select",   options: ["Critical","High","Normal","Low"], defaultValue: "Normal" },
              { key: "description",  label: "Description",  type: "textarea", span: true, rows: 3 },
            ]}
            onClose={() => setActionOpen(false)}
            onSubmit={handleActionSubmit}
            submitLabel="Create Action Item"
          />
        </AppModal>
      )}

      {minutesOpen && (
        <AppModal open title={ctrlStatus === "ended" ? "Review Auto-Generated Draft Minutes" : "Save Draft Minutes"} size="lg" onClose={() => { setMinutesOpen(false); if (ctrlStatus === "ended") onClose(); }} footer={<><SecondaryButton style={{ marginRight: "auto" }} onClick={() => { setMinutesOpen(false); if (ctrlStatus === "ended") onClose(); }}>{ctrlStatus === "ended" ? "Close & Review Later" : "Cancel"}</SecondaryButton><PrimaryButton type="submit" form="live-minutes-form">Save Draft Minutes</PrimaryButton></>}>
          {ctrlStatus === "ended" && (
            <div style={{ padding: "0.5rem 0.75rem", borderRadius: "6px", background: "var(--color-primary-50,#eff6ff)", border: "1px solid var(--color-primary)", marginBottom: "1rem", fontSize: "0.8rem", color: "var(--color-primary)" }}>
              ✓ Structured draft minutes were auto-generated from meeting data. Fill in the minute-taker and review. Or close and edit in Minutes Management.
            </div>
          )}
          <EntryForm
            formId="live-minutes-form"
            fields={MINUTES_FORM_FIELDS.map(f =>
              f.key === "minute_taker"
                ? { ...f, type: "select" as const, options: presentParticipantOptions.length > 0 ? presentParticipantOptions : activeUserOptions }
                : f
            )}
            initialValues={{
              meeting_id: meetingId ?? "",
              meeting_title: meeting?.meeting_title ?? "",
              quorum_statement: `Quorum: ${presentCount}/${quorumRequired} present. Rule: ${quorumRuleDisplay}.`,
              discussion_summary: agendaItems.map((item, idx) => {
                const st = agendaStatuses[idx] ?? "Not Started";
                const note = notes[idx] ? `\n${notes[idx]}` : "";
                return `${idx + 1}. ${item.title} [${st}]${note}`;
              }).join("\n\n"),
              closing_time: timeline["ended_at"] ?? nowISO(),
            }}
            onClose={() => { setMinutesOpen(false); if (ctrlStatus === "ended") onClose(); }}
            onSubmit={handleMinutesSubmit}
            submitLabel="Save Draft Minutes"
          />
        </AppModal>
      )}

      {endConfirmOpen && (
        <SConfirmModal title="End Meeting for All" message="This will end the meeting for all participants. You will be prompted to save draft minutes." confirmLabel="End Meeting" onConfirm={() => { setEndConfirmOpen(false); handleEnd(); }} onClose={() => setEndConfirmOpen(false)} danger />
      )}

      {leaveConfirmOpen && (() => {
        const myParticipantId = currentUser.id;
        const wasPresent = ctrlStatus === "in-progress" && ACTIVE_STATES.includes(attendanceMap[myParticipantId] ?? "Not Joined" as AttendanceStatus);
        const willLoseQuorum = wasPresent && quorumMet && (() => {
          const updatedMap = { ...attendanceMap, [myParticipantId]: "Left" as AttendanceStatus };
          const updatedPresentIds = Object.entries(updatedMap).filter(([, s]) => ACTIVE_STATES.includes(s as AttendanceStatus)).map(([id]) => id);
          const updatedPresQuorum = meetingLinks.filter(l => l.quorum_eligible && updatedPresentIds.includes(l.user_id));
          const calc = calculateMeetingQuorum({ boardCommitteeId: meeting?.committee ?? "", boardCommitteeName: meeting?.committee ?? "", participantLinks: updatedPresQuorum, governanceBodies: govBodies, quorumRules });
          return calc.status === "not_expected";
        })();
        const message = willLoseQuorum
          ? "Warning: your departure will cause quorum loss and may suspend the meeting. Are you sure you want to leave?"
          : "You will be marked as Left and disconnected from the meeting.";
        return (
          <SConfirmModal
            title="Leave Meeting"
            message={message}
            confirmLabel="Leave"
            onConfirm={() => {
              setLeaveConfirmOpen(false);
              if (wasPresent) setAttendance(myParticipantId, "Left");
              onClose();
            }}
            onClose={() => setLeaveConfirmOpen(false)}
            danger
          />
        );
      })()}

      {/* Reopen vote modal */}
      {reopenOpen && (
        <AppModal open title="Reopen Vote" onClose={() => setReopenOpen(false)} footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
            <Button type="button" variant="ghost" size="lg" onClick={() => setReopenOpen(false)}>Cancel</Button>
            <Button type="button" variant="primary" size="lg" onClick={() => { reopenVote(reopenReason); setReopenOpen(false); setReopenReason(""); }} disabled={!reopenReason.trim()}>Reopen Vote</Button>
          </div>
        }>
          <div style={{ padding: "1rem 0" }}>
            <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
              Provide a reason for reopening this vote. This will be recorded in the vote history.
            </p>
            <textarea
              value={reopenReason}
              onChange={e => setReopenReason(e.target.value)}
              placeholder="Reason for reopening…"
              style={{ width: "100%", minHeight: 80, padding: "0.5rem 0.75rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "0.85rem", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
        </AppModal>
      )}

      {/* ── DOCUMENT VIEWER OVERLAY (Spec §12) — renders above live workspace, preserves session ── */}
      {viewerDoc && (
        <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "#0f172a", display: "flex", flexDirection: "column" }}>
          <div style={{ height: 48, background: "#1e293b", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", padding: "0 1rem", gap: "0.75rem", flexShrink: 0 }}>
            <button onClick={() => setViewerDoc(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", display: "flex", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", padding: "0.3rem 0.5rem", borderRadius: "6px" }}>
              <ArrowLeft size={14} /> Back to Meeting
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 600, color: "#f1f5f9", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{viewerDoc.doc_name ?? viewerDoc.title}</p>
              <p style={{ margin: 0, fontSize: "0.68rem", color: "#64748b" }}>v{viewerDoc.version ?? "1.0"} · {viewerDoc.confidentiality ?? "Confidential"} · {viewerDoc.doc_type ?? "Document"}</p>
            </div>
            <span style={{ fontSize: "0.68rem", padding: "0.15rem 0.45rem", borderRadius: 9999, background: "#1e3a5f", color: "#60a5fa", fontWeight: 600 }}>Read-only · Live Meeting</span>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            <DocumentWorkspaceRouter
              document={viewerDoc}
              provider={getEditorProvider()}
              canEdit={false}
              onClose={() => setViewerDoc(null)}
              onRichText={() => {/* read-only rich text: handled by router fallback */}}
            />
          </div>
        </div>
      )}

      {/* Agenda reason modal — Defer / Skip / Reopen */}
      {agendaReasonModal && (
        <AppModal open title={`${agendaReasonModal.action} Agenda Item`} size="sm"
          onClose={() => { setAgendaReasonModal(null); setAgendaReasonText(""); }}
          footer={
            <>
              <SecondaryButton onClick={() => { setAgendaReasonModal(null); setAgendaReasonText(""); }}>Cancel</SecondaryButton>
              <PrimaryButton disabled={!agendaReasonText.trim()} onClick={() => {
                const { action, idx } = agendaReasonModal;
                if (action === "Defer") {
                  setAgendaStatuses(p => ({ ...p, [idx]: "Deferred" }));
                } else if (action === "Skip") {
                  setAgendaStatuses(p => ({ ...p, [idx]: "Skipped" }));
                  const next = idx + 1;
                  if (next < agendaItems.length) { setAgendaStatuses(p => ({ ...p, [next]: "In Discussion" })); setActiveIdx(next); }
                } else {
                  setAgendaStatuses(p => {
                    const n: Record<number, AgendaStatus> = {};
                    Object.entries(p).forEach(([k, v]) => { n[Number(k)] = v === "In Discussion" ? "Not Started" : v; });
                    n[idx] = "In Discussion";
                    return n;
                  });
                  setActiveIdx(idx);
                }
                setAgendaReasonModal(null); setAgendaReasonText("");
              }}>{agendaReasonModal.action}</PrimaryButton>
            </>
          }>
          <div style={{ padding: "0.5rem 0" }}>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
              Item: <strong>{agendaItems[agendaReasonModal.idx]?.title ?? "—"}</strong>
            </p>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>
              Reason <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <textarea
              value={agendaReasonText}
              onChange={e => setAgendaReasonText(e.target.value)}
              placeholder={`Reason for ${agendaReasonModal.action.toLowerCase()}…`}
              rows={3}
              style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "0.85rem", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
            />
          </div>
        </AppModal>
      )}

      {/* Temporary Agenda modal */}
      {tempAgendaOpen && (
        <AppModal open title="Create Temporary Agenda" size="md" onClose={() => setTempAgendaOpen(false)}
          footer={<><SecondaryButton onClick={() => setTempAgendaOpen(false)}>Cancel</SecondaryButton><PrimaryButton onClick={handleCreateTempAgenda} disabled={!tempAgendaTitle.trim()}>Create</PrimaryButton></>}>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", padding: "0.5rem 0" }}>
            <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
              This agenda will be marked as <strong>Pending Approval</strong> and must be reviewed after the meeting before becoming permanent.
            </p>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Agenda Title <span style={{ color: "#ef4444" }}>*</span></label>
              <input value={tempAgendaTitle} onChange={e => setTempAgendaTitle(e.target.value)} placeholder="Enter agenda title…" style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "0.85rem", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, marginBottom: "0.35rem" }}>Description</label>
              <textarea value={tempAgendaDesc} onChange={e => setTempAgendaDesc(e.target.value)} placeholder="Optional description or context…" rows={3} style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "var(--radius)", border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", fontSize: "0.85rem", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
            </div>
          </div>
        </AppModal>
      )}
    </div>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────────

function TallyBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ flex: 1, padding: "0.3rem", borderRadius: "6px", background: `${color}11`, border: `1px solid ${color}33`, textAlign: "center" }}>
      <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color }}>{count}</p>
      <p style={{ margin: 0, fontSize: "0.62rem", color: "#64748b" }}>{label}</p>
    </div>
  );
}


function DockButton({ children, label, active, danger, onClick }: { children: ReactNode; label: string; active?: boolean; danger?: boolean; onClick: () => void }) {
  const bg    = danger ? "rgba(239,68,68,0.18)"    : active ? "rgba(96,165,250,0.14)"  : "#1e293b";
  const color = danger ? "#f87171"                 : active ? "#93c5fd"                : "#64748b";
  const border = danger ? "1px solid rgba(239,68,68,0.38)" : active ? "1px solid rgba(96,165,250,0.32)" : "1px solid transparent";
  return (
    <button onClick={onClick} title={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem", padding: "0.45rem 0.65rem", borderRadius: "10px", background: bg, color, border, cursor: "pointer", position: "relative", minWidth: 48, transition: "background 0.15s, color 0.15s, border-color 0.15s" }}>
      {children}
      <span style={{ fontSize: "0.6rem", lineHeight: 1, fontWeight: 500 }}>{label}</span>
    </button>
  );
}
