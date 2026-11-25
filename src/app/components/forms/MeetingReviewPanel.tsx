/**
 * MeetingReviewPanel — Step 5 Review and Schedule.
 * Reads canonical JSON blobs from wizard values + registry snapshots passed via closure.
 * Shows compact structured sections with exact scheduling blockers and edit links.
 */
import React, { useMemo } from "react";
import {
  CalendarDays, Landmark, Users, ListChecks, Files, Settings2, ShieldCheck,
  CheckCircle2, AlertTriangle, XCircle, Edit2, Clock, Video, MapPin,
} from "lucide-react";
import type { EntryFormValue } from "./EntryForm";
import type { DraftParticipantLink } from "./ParticipantSelectorStep";
import type { SelectedAgendaEntry, AdditionalDocEntry } from "./AgendaDocumentStep";
import type {
  AgendaSubmission, AgendaDocumentLink, BoardDocument, DocumentVersion,
  GovernanceBody, QuorumRule,
} from "../../data/boardMeetingData";
import type { BmsUser } from "../../data/bmsUsers";
import { calculateMeetingQuorum, quorumStatusLabel } from "../../utils/quorumCalculation";
import { normalizeDraftRelationships } from "../../pages/return-register/draftRelationshipPayload";
import { buildMeetingDocumentPlan } from "../../pages/return-register/meetingDocumentPlan";
import { normalizeMeetingIdentity, validateMeetingIdentity } from "../../pages/return-register/meetingIdentity";
import { normalizeMeetingSchedule, validateMeetingSchedule } from "../../pages/return-register/meetingSchedule";
import { resolveMeetingLeadership, meetingLeadershipLabel } from "../../pages/return-register/meetingLeadership";
import { validateLeadershipRoster } from "../../pages/return-register/leadershipRoster";
import { liveMeetingUrl } from "../../utils/liveMeetingLink";
import { readAttendanceRequirement, hasInvalidAttendanceRequirement } from "../../pages/return-register/attendanceRequirement";
import { meetingAccessBlockers } from "../../pages/return-register/meetingAccess";
import { parseOptionalMeetingAgendas, validateOptionalMeetingAgendas } from "../../pages/return-register/meetingAgendaSelection";

// ── Props ──────────────────────────────────────────────────────────────────────

export interface MeetingReviewPanelProps {
  values: Record<string, EntryFormValue>;
  onGoToStep: (step: number) => void;
  allAgendas?: AgendaSubmission[];
  agendaDocLinks?: AgendaDocumentLink[];
  allDocuments?: BoardDocument[];
  documentVersions?: DocumentVersion[];
  governanceBodies?: GovernanceBody[];
  quorumRules?: QuorumRule[];
  bmsUsers?: BmsUser[];
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SummaryCard({ icon, title, step, onEdit, children }: {
  icon: React.ReactNode; title: string; step: number;
  onEdit: (step: number) => void; children: React.ReactNode;
}) {
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)] shadow-sm">
      <div className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
        <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0" aria-hidden="true">
          {icon}
        </span>
        <span className="text-sm font-bold text-[var(--foreground)]">{title}</span>
        <button
          type="button"
          className="ml-auto flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors px-2.5 py-1 rounded-lg hover:bg-[var(--surface-raised)]"
          onClick={() => onEdit(step)}
          aria-label={`Edit ${title}`}
        >
          <Edit2 size={11} strokeWidth={2} /> Edit
        </button>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-3">
      <span className="text-[11px] text-[var(--muted-foreground)] shrink-0 w-32 font-medium">{label}</span>
      <span className={`text-xs font-semibold ${warn ? "text-amber-600 dark:text-amber-400" : "text-[var(--foreground)]"}`}>
        {value}
      </span>
    </div>
  );
}

function MultilineRow({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="space-y-1">
      <span className="block text-[11px] text-[var(--muted-foreground)] font-medium">{label}</span>
      <p className="m-0 min-w-0 text-xs font-semibold text-[var(--foreground)] whitespace-pre-wrap break-words">{value}</p>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <span className="text-[10px] italic text-[var(--muted-foreground)]">{text}</span>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function v(values: Record<string, EntryFormValue>, key: string): string {
  const raw = values[key];
  if (raw == null || raw === "") return "";
  if (Array.isArray(raw)) return raw.join(", ");
  return String(raw);
}

/** Resolve a user display name from either a user ID or a legacy "Name — Designation" label. */
function resolveUserName(val: string, bmsUsers: BmsUser[]): string {
  if (!val) return "";
  const byId = bmsUsers.find(u => u.id === val);
  if (byId) return byId.name;
  return val.split(" — ")[0].trim();
}

/** Resolve a governance body display name from id, body_id, or body_name. */
function resolveBodyName(
  val: string,
  governanceBodies: GovernanceBody[],
): string {
  if (!val) return "";
  const match = governanceBodies.find(
    b => b.id === val || b.body_id === val || b.body_name === val,
  );
  return match?.body_name ?? val;
}

/** Find a GovernanceBody by id, body_id, or body_name. */
function findBody(
  val: string,
  governanceBodies: GovernanceBody[],
): GovernanceBody | undefined {
  return governanceBodies.find(
    b => b.id === val || b.body_id === val || b.body_name === val,
  );
}

function parseLinks(json: EntryFormValue): DraftParticipantLink[] {
  try { return JSON.parse(String(json ?? "[]")) as DraftParticipantLink[]; }
  catch { return []; }
}
function parseAgendaEntries(json: EntryFormValue): SelectedAgendaEntry[] {
  try { return JSON.parse(String(json ?? "[]")) as SelectedAgendaEntry[]; }
  catch { return []; }
}
function parseAdditionalDocs(json: EntryFormValue): AdditionalDocEntry[] {
  try { return JSON.parse(String(json ?? "[]")) as AdditionalDocEntry[]; }
  catch { return []; }
}

function durationLabel(minutes: number): string {
  if (minutes <= 0) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m > 0 ? `${m}m` : ""}`.trim() : `${m}m`;
}

function scheduledDuration(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  return Math.max(0, toMin(endTime) - toMin(startTime));
}

interface Blocker { label: string; step: number }

// ── Main Component ────────────────────────────────────────────────────────────

export function MeetingReviewPanel({
  values, onGoToStep,
  allAgendas = [], agendaDocLinks = [], allDocuments = [], documentVersions = [],
  governanceBodies = [], quorumRules = [], bmsUsers = [],
}: MeetingReviewPanelProps) {

  // ── Parse canonical blobs ──────────────────────────────────────────────────
  const relationshipState = useMemo(() => {
    try { return {data:normalizeDraftRelationships(values,!v(values,"meeting_id")),error:""}; }
    catch(error) { return {data:{participants:[],agendas:[],documents:[]},error:error instanceof Error?error.message:"Invalid relationship selection"}; }
  },[values]);
  const {participants,agendas:agendaEntries,documents:additionalDocs}=relationshipState.data;
  const identity=normalizeMeetingIdentity(values);
  const schedule=normalizeMeetingSchedule(values);
  const leadership=resolveMeetingLeadership(values,bmsUsers);
  const documentPlan=useMemo(()=>buildMeetingDocumentPlan(agendaEntries,additionalDocs,allAgendas,agendaDocLinks,allDocuments,documentVersions,participants),
    [agendaEntries,additionalDocs,allAgendas,agendaDocLinks,allDocuments,documentVersions,participants]);

  // ── Participant stats ──────────────────────────────────────────────────────
  const participantStats = useMemo(() => {
    const required = participants.filter(p => readAttendanceRequirement(p) === "Mandatory").length;
    const optional = participants.filter(p => readAttendanceRequirement(p) === "Optional").length;
    const invited = participants.filter(p => readAttendanceRequirement(p) === "By Invitation").length;
    const voting   = participants.filter(p => p.voting_eligible).length;
    const quorum   = participants.filter(p => p.quorum_eligible).length;
    const presenters = participants.filter(p => p.participant_type === "Presenter").length;
    const hasChair = participants.some(p => p.participant_type === "Chairperson");
    const hasSecretary = participants.some(p => p.participant_type === "Meeting Secretary");
    return { total: participants.length, required, optional, invited, invalidAttendance: hasInvalidAttendanceRequirement(participants), voting, quorum, presenters, hasChair, hasSecretary };
  }, [participants]);

  // ── Agenda stats ───────────────────────────────────────────────────────────
  const agendaStats = useMemo(() => {
    const parentIds = agendaEntries.map(e => e.agenda_id);
    const children = allAgendas.filter(a =>
      a.parent_agenda_id != null && parentIds.includes(a.parent_agenda_id) && !a.archived_at,
    );
    const totalDuration = allAgendas
      .filter(a => parentIds.includes(a.agenda_id ?? a.id) || (a.parent_agenda_id != null && parentIds.includes(a.parent_agenda_id)))
      .reduce((sum, a) => sum + (parseInt(String((a as {estimated_duration?: string}).estimated_duration ?? "0"), 10) || 0), 0);
    const votingCount = allAgendas.filter(a =>
      parentIds.includes(a.agenda_id ?? a.id) &&
      ((a as {voting_required?: string}).voting_required === "Yes" || (a as {agenda_category?: string}).agenda_category === "For Decision"),
    ).length;
    const allApproved = agendaEntries.length > 0 && agendaEntries.every(e => {
      const agenda = allAgendas.find(a => (a.agenda_id ?? a.id) === e.agenda_id);
      return agenda?.approval_status === "Approved";
    });
    const allMeetingReady = agendaEntries.length > 0 && agendaEntries.every(e => {
      const agenda = allAgendas.find(a => (a.agenda_id ?? a.id) === e.agenda_id);
      return agenda?.approval_status === "Approved" && (agenda as {meeting_readiness?: string}).meeting_readiness === "Meeting Ready";
    });
    const draftAgendas = agendaEntries.filter(e => {
      const ag = allAgendas.find(a => (a.agenda_id ?? a.id) === e.agenda_id);
      return ag && ag.approval_status !== "Approved";
    });
    return { parentCount: parentIds.length, childCount: children.length, totalDuration, votingCount, allApproved, allMeetingReady, draftAgendas };
  }, [agendaEntries, allAgendas]);

  const docStats = {
    agendaDocCount:documentPlan.documents.filter(d=>d.source==="agenda").length,
    additionalCount:documentPlan.documents.filter(d=>d.source==="additional").length,
    restrictedCount:documentPlan.documents.filter(d=>d.confidentiality&&!["Non-Confidential","Internal"].includes(d.confidentiality)).length,
    missingAccess:documentPlan.accessConflicts,
  };

  // ── Quorum stats ───────────────────────────────────────────────────────────
  const quorumStats = useMemo(() => {
    const result = calculateMeetingQuorum({
      boardCommitteeId: v(values, "committee"),
      meetingId: v(values, "meeting_id") || v(values, "_draft_meeting_id"),
      draftLinks: participants,
      governanceBodies,
      quorumRules,
    });
    const rule = result.selectedRule;
    const ruleSource = rule
      ? `${rule.meeting_id ? "Meeting" : "Governance"} rule (${result.requiredPercent}% min)`
      : result.status === "not_configured" ? "Not configured" : result.reasons.join("; ");
    const eligible = rule ? result.eligibleCount : new Set(participants.filter(p => p.quorum_eligible && p.user_id).map(p => p.user_id)).size;
    return { eligible, required: result.requiredCount, requiredPct: result.requiredPercent,
      configured: result.status !== "not_configured", met: result.status === "expected", ruleSource, result, rule };
  }, [values, governanceBodies, quorumRules, participants]);

  // ── Scheduling blockers ────────────────────────────────────────────────────
  const blockers = useMemo((): Blocker[] => {
    const out: Blocker[] = [];
    for(const label of [...validateMeetingIdentity(identity),...validateMeetingSchedule(schedule),
      ...leadership.missing.map(role=>meetingLeadershipLabel(role)+" must be selected from active registered users")])
      out.push({label,step:0});
    const body=findBody(identity.committee,governanceBodies);
    if(body?.status && body.status!=="Active") out.push({label:`Governance body "${body.body_name}" is not active`,step:0});
    if(relationshipState.error) out.push({label:relationshipState.error,step:/agenda|document/i.test(relationshipState.error)?2:1});
    if(!relationshipState.error) validateLeadershipRoster(participants,leadership).forEach(label=>out.push({label,step:1}));
    documentPlan.errors.forEach(label=>out.push({label,step:2}));

    if (participantStats.invalidAttendance) out.push({ label: "Correct invalid attendance requirements", step: 1 });
    if (participantStats.total === 0)
      out.push({ label: "At least one participant is required",                  step: 1 });
    if (participantStats.required === 0)
      out.push({ label: "At least one required participant must be assigned",    step: 1 });
    if (participantStats.quorum === 0)
      out.push({ label: "At least one quorum-eligible participant is required",  step: 1 });

    // An agenda-free meeting is ready to schedule when the other gates pass.
    // Check explicitly selected agendas using the same rules as Step 3 and Save.
    validateOptionalMeetingAgendas(
      relationshipState.error ? parseOptionalMeetingAgendas(values.selected_agenda_ids_json) : agendaEntries, allAgendas,
    ).forEach(label => out.push({ label, step: 2 }));

    meetingAccessBlockers(values).forEach(label => out.push({ label, step: 3 }));

    // Quorum is assessed at meeting time; an unconfigured or not-yet-met
    // projection is information, not a scheduling blocker.

    if (docStats.missingAccess > 0)
      out.push({ label: `${docStats.missingAccess} document access conflict${docStats.missingAccess > 1 ? "s" : ""} must be resolved`, step: 2 });

    return out;
  }, [values, governanceBodies, bmsUsers, participantStats, agendaEntries, agendaStats, quorumStats, docStats, identity, schedule, leadership, participants, relationshipState, documentPlan, allAgendas]);

  const isReady = blockers.length === 0;
  const scheduledMin = scheduledDuration(v(values, "start_time"), v(values, "end_time"));
  const mode = v(values, "mode") || "Physical";

  return (
    <div className="space-y-4 pb-2">

      {/* Readiness banner */}
      <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${
        isReady
          ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
          : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
      }`}>
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
          isReady ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
                  : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"}`}>
          {isReady
            ? <CheckCircle2 size={18} strokeWidth={2} />
            : <AlertTriangle size={18} strokeWidth={2} />
          }
        </span>
        <div>
          <div className={`text-sm font-bold ${isReady ? "text-emerald-800 dark:text-emerald-300" : "text-amber-800 dark:text-amber-300"}`}>
            {isReady ? "Ready to Schedule" : `${blockers.length} Issue${blockers.length > 1 ? "s" : ""} to Resolve`}
          </div>
          <div className={`text-xs mt-0.5 ${isReady ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-400"}`}>
            {isReady ? "All requirements are met. You can schedule this meeting." : "Fix the issues below before scheduling."}
          </div>
        </div>
      </div>

      {/* Blocker list */}
      {blockers.length > 0 && (
        <div className="border border-red-200 dark:border-red-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
            <span className="text-xs font-bold text-red-800 dark:text-red-300 flex items-center gap-2">
              <XCircle size={13} strokeWidth={2} /> Scheduling Blockers
            </span>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900/30">
            {blockers.map((b, i) => (
              <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="text-xs text-red-700 dark:text-red-400">{b.label}</span>
                <button
                  type="button"
                  onClick={() => onGoToStep(b.step)}
                  className="shrink-0 text-xs font-medium text-[var(--primary)] hover:underline transition-colors"
                >
                  Fix →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Meeting */}
        <SummaryCard icon={<CalendarDays size={13} strokeWidth={2} />} title="Meeting" step={0} onEdit={onGoToStep}>
          <Row label="Title"           value={identity.meeting_title} />
          <Row label="Type"            value={identity.meeting_type} />
          <Row label="Governance Body" value={resolveBodyName(v(values, "committee"), governanceBodies)} />
          <Row label="Date"            value={v(values, "meeting_date")} />
          <Row label="Time"            value={[v(values, "start_time"), v(values, "end_time")].filter(Boolean).join(" – ")} />
          <Row label="Time Zone"       value={schedule.time_zone} />
          <Row label="Confidentiality" value={v(values, "confidentiality")} />
          <MultilineRow label="Purpose" value={v(values, "purpose")} />
          <MultilineRow label="Description" value={v(values, "description")} />
          <MultilineRow label="Supporting Notes" value={v(values, "notes")} />
          {scheduledMin > 0 && <Row label="Duration" value={durationLabel(scheduledMin)} />}
        </SummaryCard>

        {/* Leadership */}
        <SummaryCard icon={<Landmark size={13} strokeWidth={2} />} title="Leadership" step={0} onEdit={onGoToStep}>
          <Row label="Chairperson" value={leadership.names.chairperson || "Not verified"} warn={!leadership.ids.chairperson} />
          <Row label="Secretary" value={leadership.names.secretary || "Not verified"} warn={!leadership.ids.secretary} />
          <Row label="Organizer" value={leadership.names.organizer || "Not verified"} warn={!leadership.ids.organizer} />
          {!v(values, "chairperson") && <Empty text="Chairperson not assigned" />}
          {!v(values, "secretary")   && <Empty text="Secretary not assigned" />}
        </SummaryCard>

        {/* Participants */}
        <SummaryCard icon={<Users size={13} strokeWidth={2} />} title="Participants" step={1} onEdit={onGoToStep}>
          {participantStats.total > 0 ? (
            <>
              <Row label="Total"           value={String(participantStats.total)} />
              <Row label="Required"        value={String(participantStats.required)} />
              <Row label="Optional"        value={String(participantStats.optional)} />
              <Row label="By Invitation"   value={String(participantStats.invited)} />
              <Row label="Voting Eligible" value={String(participantStats.voting)} />
              <Row label="Quorum Eligible" value={String(participantStats.quorum)} />
              {participantStats.presenters > 0 && <Row label="Presenters" value={String(participantStats.presenters)} />}
              {participants.map(p=><MultilineRow key={p.user_id} label={p.user_name || p.user_id} value={[p.participant_type,readAttendanceRequirement(p),p.voting_eligible?"Voting eligible":"Not voting eligible",p.quorum_eligible?"Quorum eligible":"Not quorum eligible",p.user_id].join(" · ")} />)}
              {!participants.some(p=>p.user_id===leadership.ids.chairperson) && <div className="text-[10px] text-amber-600">Chairperson not in participant list</div>}
              {!participants.some(p=>p.user_id===leadership.ids.secretary) && <div className="text-[10px] text-amber-600">Meeting Secretary not in participant list</div>}
            </>
          ) : (
            <Empty text="No participants added" />
          )}
        </SummaryCard>

        {/* Agendas */}
        <SummaryCard icon={<ListChecks size={13} strokeWidth={2} />} title="Agendas" step={2} onEdit={onGoToStep}>
          {agendaEntries.length > 0 ? (
            <>
              <Row label="Parent Agendas"  value={String(agendaStats.parentCount)} />
              <Row label="Child Items"     value={String(agendaStats.childCount)} />
              <Row label="Total Duration"  value={durationLabel(agendaStats.totalDuration)} />
              {scheduledMin > 0 && agendaStats.totalDuration > scheduledMin && (
                <div className="text-[10px] text-amber-600">
                  Agenda duration ({durationLabel(agendaStats.totalDuration)}) exceeds scheduled time ({durationLabel(scheduledMin)})
                </div>
              )}
              {agendaStats.votingCount > 0 && <Row label="Decision Items" value={String(agendaStats.votingCount)} />}
              <Row label="Readiness"       value={agendaStats.allApproved ? "All Approved" : "Some not Approved"} warn={!agendaStats.allApproved} />
              {documentPlan.agendas.map((a,i)=><Row key={a.id} label={a.depth===0?"Agenda "+(i+1):"Child item"} value={a.title+" · "+a.id} />)}
            </>
          ) : (
            <Empty text="No agenda attached (optional)" />
          )}
        </SummaryCard>

        {/* Documents */}
        <SummaryCard icon={<Files size={13} strokeWidth={2} />} title="Documents" step={2} onEdit={onGoToStep}>
          <Row label="Agenda Docs"    value={docStats.agendaDocCount > 0 ? String(docStats.agendaDocCount) : ""} />
          <Row label="Additional"     value={docStats.additionalCount > 0 ? String(docStats.additionalCount) : ""} />
          {docStats.agendaDocCount === 0 && docStats.additionalCount === 0 && <Empty text="No documents linked" />}
          {docStats.restrictedCount > 0 && <Row label="Restricted"  value={String(docStats.restrictedCount)} />}
          {documentPlan.documents.map(d=><MultilineRow key={d.document_id} label={d.document_name} value={d.document_id+" · Version "+d.version+(d.document_version_id?" · "+d.document_version_id:"")+" · "+(d.source==="agenda"?"Agenda "+d.source_agenda_id:"Additional")} />)}
          {docStats.missingAccess > 0 && (
            <div className="text-[10px] text-red-600 dark:text-red-400">
              {docStats.missingAccess} access conflict{docStats.missingAccess > 1 ? "s" : ""} — resolve before scheduling
            </div>
          )}
          {docStats.missingAccess === 0 && (docStats.agendaDocCount + docStats.additionalCount) > 0 && (
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400">No role-based document access conflicts detected</div>
          )}
        </SummaryCard>

        {/* Mode */}
        <SummaryCard
          icon={mode === "Virtual" ? <Video size={13} strokeWidth={2} /> : <MapPin size={13} strokeWidth={2} />}
          title="Mode & Venue" step={3} onEdit={onGoToStep}
        >
          <Row label="Mode"             value={mode} />
          {(mode === "Physical" || mode === "Hybrid") && <Row label="Venue"          value={v(values, "venue")}            warn={!v(values, "venue")} />}
          {(mode === "Virtual"  || mode === "Hybrid") && <Row label="Platform"       value="LiveKit" />}
          {(mode === "Virtual" || mode === "Hybrid") && <Row label="LiveKit Join Link" value={v(values,"meeting_id") ? liveMeetingUrl(v(values,"meeting_id")) || "Assigned when saved" : "Assigned when saved"} />}
          {v(values, "invitation_date")  && <Row label="Invitation Date" value={v(values, "invitation_date")} />}
          {v(values, "board_pack_date")  && <Row label="Board Pack Date" value={v(values, "board_pack_date")} />}
        </SummaryCard>

        {/* Quorum */}
        <SummaryCard icon={<ShieldCheck size={13} strokeWidth={2} />} title="Quorum" step={3} onEdit={onGoToStep}>
          <Row label="Rule"             value={quorumStats.ruleSource} />
          {quorumStats.rule && <>
            <Row label="Policy ID" value={quorumStats.rule.rule_id || quorumStats.rule.id} />
            <Row label="Policy version" value={quorumStats.rule.policy_version==null?"Not versioned":String(quorumStats.rule.policy_version)} />
            <Row label="Rule type" value={String(quorumStats.rule.rule_type ?? "")} />
            <Row label="Required roles" value={quorumStats.result.requiredRoles.join(", ")} />
            <Row label="Lost-quorum action" value={String(quorumStats.rule.lost_quorum_action ?? "Not configured")} />
          </>}
          <Row label="Quorum Eligible"  value={String(quorumStats.eligible)} />
          {quorumStats.required > 0 && <Row label="Required Count" value={String(quorumStats.required)} />}
          {quorumStats.requiredPct > 0 && <Row label="Required %" value={`${quorumStats.requiredPct}%`} />}
          {quorumStats.result.reasons.map(reason=><Empty key={reason} text={reason} />)}
          {quorumStats.configured ? (
            <div className={`flex items-center gap-1 text-[10px] mt-0.5 ${quorumStats.met ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {quorumStats.met
                ? <><CheckCircle2 size={9} strokeWidth={2} /> Projected to meet</>
                : <><XCircle size={9} strokeWidth={2} /> {quorumStatusLabel(quorumStats.result)}</>
              }
            </div>
          ) : (
            <Empty text="Quorum not configured — scheduling is allowed" />
          )}
        </SummaryCard>

        {/* Readiness summary */}
        <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)] shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 bg-[var(--surface)] border-b border-[var(--border)]">
            <span className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
              <Clock size={14} strokeWidth={2} />
            </span>
            <span className="text-sm font-bold text-[var(--foreground)]">Scheduling Readiness</span>
          </div>
          <div className="px-4 py-3">
            {isReady ? (
              <div className="flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 size={14} strokeWidth={2} />
                <span className="font-semibold">Ready to Schedule</span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-sm text-amber-700 dark:text-amber-400 mb-1.5">
                  <AlertTriangle size={14} strokeWidth={2} />
                  <span className="font-semibold">Not Ready</span>
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {blockers.length} blocker{blockers.length > 1 ? "s" : ""} remain. See list above.
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
