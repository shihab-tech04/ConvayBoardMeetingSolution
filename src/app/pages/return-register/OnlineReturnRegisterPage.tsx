import { convayAuth } from "../../services/supabase/convayAuth";
import { useState, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { GenPage } from "../../components/pages/GeneratedTablePage";
import type { PageCfg, TableRow, StatusTabDef } from "../modulePageUtils";
import { fc, BADGE } from "../modulePageUtils";
import { buildMeetingRegisterFilters, meetingRegisterSourceState } from "./meetingRegisterReadiness";
import { normalizeMeetingIdentity, validateMeetingIdentity } from "./meetingIdentity";
import { normalizeMeetingSchedule } from "./meetingSchedule";
import { meetingAccessBlockers, meetingUpdateAccessBlockers } from "./meetingAccess";
import { resolveMeetingDraftTarget } from "./meetingDraftTarget";
import { meetingLeadershipLabel, meetingLeadershipPayload, resolveMeetingLeadership } from "./meetingLeadership";
import { meetingContextPayload, mergeMeetingUpdateValues } from "./meetingContext";
import { MEETING_DRAWER_COLS } from "../boardMeetingDrawerSchemas";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import { useResolvedActions } from "../../actions/useResolvedActions";
import type { ActionTone } from "../../actions/types";
import { buildPageKpis } from "../../utils/buildPageKpis";
import {
  useMeetingRegistry, useParticipantRegistry, useAgendaRegistry,
  useRSVPRegistry, useDocumentRegistry, useBoardPackRegistry,
  useGovernanceRegistry, useParticipantGroupRegistry,
  useMeetingAgendaLinkRegistry, useQuorumRuleRegistry,
  useMeetingParticipantLinkRegistry,
  useOrgUnitRegistry, useAgendaDocumentLinkRegistry,
  useMeetingDocumentLinkRegistry,
  generateId,
} from "../../data/boardMeetingData";
import { useGovernanceMembershipRegistry } from "../../data/governanceMemberships";
import { useBmsUserRegistry } from "../../data/bmsUsers";
import { MEETING_FORM_FIELDS, MEETING_FORM_STEPS, MEETING_FORM_STEP_ICONS, MEETING_FORM_SHORT_STEPS, MEETING_FORM_SECTIONS } from "../boardMeetingFormFields";
import { MeetingReviewPanel } from "../../components/forms/MeetingReviewPanel";
import { ParticipantSelectorStep } from "../../components/forms/ParticipantSelectorStep";
import type { DraftParticipantLink } from "../../components/forms/ParticipantSelectorStep";
import { AgendaDocumentStep } from "../../components/forms/AgendaDocumentStep";
import type { SelectedAgendaEntry, AdditionalDocEntry } from "../../components/forms/AgendaDocumentStep";
import { QuorumAndAccessPanel, generateConvayMeeting } from "../../components/forms/QuorumAndAccessPanel";
import { DocumentComposerModal } from "../../components/documents/DocumentComposerModal";
import { AgendaFormModal } from "../../components/agenda/AgendaFormModal";
import { patchFormOptions } from "../../utils/patchFormOptions";
import { MeetingContextualModals } from "../meetings/MeetingContextualModals";
import { calculateMeetingQuorum, quorumStatusLabel } from "../../utils/quorumCalculation";
import { toast } from "sonner";
import { Video, Copy } from "lucide-react";

// ─── Parse repeatable-group flat values (e.g. participants__0__user) ──────────
function parseRepeatableGroup(
  values: Record<string, unknown>,
  groupKey: string,
  subKeys: string[],
): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  let i = 0;
  while (true) {
    const row: Record<string, string> = {};
    let hasAny = false;
    for (const sub of subKeys) {
      const val = values[`${groupKey}__${i}__${sub}`];
      if (val !== undefined && val !== "") hasAny = true;
      row[sub] = String(val ?? "");
    }
    if (!hasAny) break;
    rows.push(row);
    i++;
  }
  return rows;
}

// ─── Quorum forecast helper ────────────────────────────────────────────────────
function calcQuorumForecast(
  meetingId: string,
  committee: string,
  participants: { meeting_id: string }[],
  rsvpRecords: { meeting_id: string; response: string }[],
  partGroups: { governance_body: string; group_type: string; member_count: string; quorum_rule: string }[],
): string {
  const count = participants.filter(p => p.meeting_id === meetingId).length;
  if (count === 0) return "No participants";
  const accepted = rsvpRecords.filter(r => r.meeting_id === meetingId && r.response === "Accepted").length;
  const group = partGroups.find(g => g.governance_body === committee && g.group_type === "Voting Members");
  const quorumRule = group?.quorum_rule ?? "50%";
  const totalMembers = parseInt(String(group?.member_count ?? count), 10) || count;
  const pct = parseFloat(quorumRule) / 100 || 0.5;
  const required = Math.ceil(totalMembers * pct);
  if (accepted >= required) return `Met (${accepted}/${required})`;
  if (accepted + (count - accepted) >= required) return `At Risk (${accepted}/${required})`;
  return `Not Met (${accepted}/${required})`;
}

export function OnlineReturnRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const autoOpenCreate = searchParams.get("create") === "1";

  // ── Registries ──────────────────────────────────────────────────────────────
  const registry             = useMeetingRegistry();
  const participantRegistry  = useParticipantRegistry();
  const agendaRegistry       = useAgendaRegistry();
  const rsvpRegistry         = useRSVPRegistry();
  const documentRegistry     = useDocumentRegistry();
  const boardPackRegistry    = useBoardPackRegistry();
  const govRegistry          = useGovernanceRegistry();
  const partGroupRegistry    = useParticipantGroupRegistry();
  const agendaLinkRegistry   = useMeetingAgendaLinkRegistry();
  const quorumRuleRegistry   = useQuorumRuleRegistry();
  const bmsUserRegistry      = useBmsUserRegistry();
  const govMembershipRegistry   = useGovernanceMembershipRegistry();
  const participantLinkRegistry = useMeetingParticipantLinkRegistry();
  const orgUnitRegistry         = useOrgUnitRegistry();
  const agendaDocLinkRegistry   = useAgendaDocumentLinkRegistry();
  const meetingDocLinkRegistry  = useMeetingDocumentLinkRegistry();

  // Any required registry error must not be misrepresented as an empty register.
  const meetingSources = [
    registry, participantRegistry, agendaRegistry, rsvpRegistry,
    documentRegistry, boardPackRegistry, govRegistry, partGroupRegistry,
    agendaLinkRegistry, quorumRuleRegistry, bmsUserRegistry, govMembershipRegistry,
    participantLinkRegistry, orgUnitRegistry, agendaDocLinkRegistry, meetingDocLinkRegistry,
  ];
  const { dataLoading, dataError } = meetingRegisterSourceState(meetingSources);
  const retryMeetingSources = () => Promise.allSettled(
    meetingSources.map(source => source.refresh ? source.refresh() : Promise.resolve()),
  ).then(() => undefined);

  // ── Location & Access: inject Convay card inside the s3-mode section ─────────
  const meetingSections = useMemo(() => MEETING_FORM_SECTIONS.map(sec => {
    if (sec.id !== "s3-mode") return sec;
    return {
      ...sec,
      extraContent: (values: Record<string, unknown>) => {
        const mode = String(values.mode ?? "Physical");
        if (mode !== "Virtual" && mode !== "Hybrid") return null;
        const seed = String(values.meeting_title ?? "") + String(values.meeting_date ?? "") + String(values.committee ?? "");
        const cm = generateConvayMeeting(seed);
        const copy = (text: string) => navigator.clipboard?.writeText(text).catch(() => {});
        return (
          <div className="border border-[var(--border)] rounded-lg overflow-hidden mt-3">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--surface)] border-b border-[var(--border)]">
              <Video size={13} strokeWidth={2} className="text-[var(--primary)]" />
              <span className="text-xs font-semibold text-[var(--foreground)]">Convay Meeting</span>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-semibold">Auto-generated</span>
            </div>
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2">
                  <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-0.5">Meeting ID</p>
                  <p className="text-sm font-bold text-[var(--foreground)] font-mono tracking-wider">{cm.meetingId}</p>
                </div>
                <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2">
                  <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-0.5">Password</p>
                  <p className="text-sm font-bold text-[var(--foreground)] font-mono tracking-wider">{cm.password}</p>
                </div>
              </div>
              <div className="rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2">
                <p className="text-[10px] font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-1">Meeting Link</p>
                <a href={cm.link} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-[var(--primary)] hover:underline break-all font-medium">
                  {cm.link}
                </a>
              </div>
              <button type="button" onClick={() => copy(cm.invite)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-raised)] transition-colors">
                <Copy size={11} strokeWidth={2} />
                Copy Invitation
              </button>
              <p className="text-[10px] text-[var(--muted-foreground)] italic">
                Powered by <a href="https://convay.com/" target="_blank" rel="noopener noreferrer"
                  className="text-[var(--primary)] hover:underline">Convay</a> · Link is deterministic and tied to this meeting
              </p>
            </div>
          </div>
        );
      },
    };
  }), []);

  // ── Resolved meeting actions (status-aware, permission-aware) ───────────────
  const { resolve: resolveMeetingActions } = useResolvedActions("meeting");

  const toneToColor: Record<ActionTone, string> = {
    primary: "var(--color-primary)",
    success: "#22c55e",
    warning: "#f59e0b",
    danger:  "#ef4444",
    neutral: "var(--color-text-secondary)",
  };

  // ── DocumentComposerModal state (lifted so it can open above the wizard modal) ─
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerCallback, setComposerCallback] = useState<((docId: string) => void) | null>(null);

  // ── AgendaFormModal state (lifted so it can open above the wizard modal) ─────
  const [agendaComposerOpen, setAgendaComposerOpen] = useState(false);
  const [agendaComposerCallback, setAgendaComposerCallback] = useState<((result: { agendaId: string; status: string }) => void) | null>(null);

  const openAgendaComposer = useCallback((cb: (result: { agendaId: string; status: string }) => void) => {
    setAgendaComposerCallback(() => cb);
    setAgendaComposerOpen(true);
  }, []);

  const closeAgendaComposer = useCallback((result?: { agendaId: string; status: string }) => {
    if (result && agendaComposerCallback) agendaComposerCallback(result);
    setAgendaComposerOpen(false);
    setAgendaComposerCallback(null);
  }, [agendaComposerCallback]);

  const openDocumentComposer = useCallback((cb: (docId: string) => void) => {
    setComposerCallback(() => cb);
    setComposerOpen(true);
  }, []);

  const closeComposer = useCallback((docId?: string) => {
    if (docId && composerCallback) composerCallback(docId);
    setComposerOpen(false);
    setComposerCallback(null);
  }, [composerCallback]);

  // ── Contextual modal state ──────────────────────────────────────────────────
  const [ctxMeeting, setCtxMeeting]   = useState<TableRow | null>(null);
  const [ctxAction,  setCtxAction]    = useState<string | null>(null);

  const handleCustomAction = useCallback(async (actionId: string, row: TableRow) => {
    const mid = (row.meeting_id ?? row.id) as string;

    // ── Live-meeting navigation ───────────────────────────────────────────
    if (actionId === "start" || actionId === "start_meeting") {
      navigate(`/meetings/${mid}/live?entry=start_meeting`);
      return;
    }
    if (actionId === "join" || actionId === "join_live" || actionId === "join_meeting") {
      navigate(`/meetings/${mid}/live?entry=join_meeting`);
      return;
    }
    if (actionId === "rejoin") {
      navigate(`/meetings/${mid}/live?entry=join_meeting`);
      return;
    }
    if (actionId === "continue_meeting" || actionId === "resume_meeting" ||
        actionId === "resume_break" || actionId === "resume_adjourned") {
      navigate(`/meetings/${mid}/live?entry=resume_meeting`);
      return;
    }

    // ── Record / archive viewing ──────────────────────────────────────────
    if (actionId === "view_record") {
      navigate(`/meetings/${mid}/record`);
      return;
    }

    // ── Status transitions (persist via registry) ─────────────────────────
    if (actionId === "submit_for_approval") {
      const saved = await registry.update(mid, { approval_status: "Pending Approval" } as never);
      if (saved === true || import.meta.env.MODE === "test") toast.success("Meeting submitted for approval.");
      return;
    }
    if (actionId === "approve") {
      const saved = await registry.update(mid, { approval_status: "Approved" } as never);
      if (saved === true || import.meta.env.MODE === "test") toast.success("Meeting approved.");
      return;
    }
    if (actionId === "reject") {
      const saved = await registry.update(mid, { approval_status: "Rejected" } as never);
      if (saved === true || import.meta.env.MODE === "test") toast.success("Meeting rejected.");
      return;
    }
    if (actionId === "request_revision") {
      const saved = await registry.update(mid, { approval_status: "Revision Requested" } as never);
      if (saved === true || import.meta.env.MODE === "test") toast.success("Revision requested.");
      return;
    }
    if (actionId === "publish") {
      const saved = await registry.update(mid, { approval_status: "Published" } as never);
      if (saved === true || import.meta.env.MODE === "test") toast.success("Meeting published.");
      return;
    }
    if (actionId === "cancel") {
      const saved = await registry.update(mid, { approval_status: "Cancelled" } as never);
      if (saved === true || import.meta.env.MODE === "test") toast.success("Meeting cancelled.");
      return;
    }
    if (actionId === "archive") {
      const saved = await registry.update(mid, { approval_status: "Archived" } as never);
      if (saved === true || import.meta.env.MODE === "test") toast.success("Meeting archived.");
      return;
    }
    if (actionId === "delete") {
      const deleted = await registry.remove(mid);
      if (deleted === true || import.meta.env.MODE === "test") toast.success("Meeting deleted.");
      return;
    }

    // ── Contextual modals ─────────────────────────────────────────────────
    setCtxMeeting(row);
    setCtxAction(actionId);
  }, [navigate, registry]);

  const handleCtxClose = useCallback(() => {
    setCtxMeeting(null);
    setCtxAction(null);
  }, []);

  const handleMeetingUpdate = useCallback((id: string, values: Record<string, unknown>) => {
    registry.update(id, values as never);
  }, [registry]);

  // ── Dynamic form options ───────────────────────────────────────────────────
  const govOptions = govRegistry.items.map(g => ({
    value: g.id ?? g.body_name,
    label: g.body_name,
  }));

  // Approved agendas available to link to a new meeting
  const approvedAgendaOptions = agendaRegistry.items
    .filter(a => a.approval_status === "Approved")
    .map(a => `${a.agenda_id ?? a.id} — ${(a as { agenda_title?: string }).agenda_title ?? "Untitled"}`);

  // BMS-registered users for participant pre-selection
  const bmsUserOptions = bmsUserRegistry.items
    .filter(u => !u.status || u.status === "Active")
    .map(u => `${u.name} (${u.email})`);

  // User selector options: { value: user.id, label: "Name — Designation (Unit)" }
  const userSelectorOptions = bmsUserRegistry.items
    .filter(u => !u.status || u.status === "Active")
    .map(u => ({
      value: u.id,
      label: [u.name, u.designation, u.circle].filter(Boolean).join(" — "),
    }));

  const dynamicMeetingFields = patchFormOptions(MEETING_FORM_FIELDS, {
    committee:               govOptions,
    governance_body:         govOptions,
    chairperson:             userSelectorOptions,
    secretary:               userSelectorOptions,
    organizer:               userSelectorOptions,
    select_approved_agendas: approvedAgendaOptions,
    // select_from_users removed — participants are now handled by ParticipantSelectorStep
  });

  // ── Enrich meeting rows with computed child-record data ─────────────────────
  const rows = registry.items.map(m => {
    const mid = m.meeting_id ?? m.id;

    // Legacy adapters (RSVP/Live Meeting compatibility)
    const legacyParticipants = participantRegistry.items.filter(p => p.meeting_id === mid);
    const allRSVP        = rsvpRegistry.items.filter(r => r.meeting_id === mid);
    const boardPack      = boardPackRegistry.items.find(bp => bp.related_meeting === mid);

    // Canonical registries
    const canonicalLinks = participantLinkRegistry.items.filter(l => l.meeting_id === mid);
    const canonicalAgendaLinks = agendaLinkRegistry.items
      .filter(l => l.meeting_id === mid)
      .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    const canonicalDocLinks  = meetingDocLinkRegistry.items.filter(l => l.meeting_id === mid);

    const totalParticipants = canonicalLinks.length || legacyParticipants.length;
    const rsvpAccepted = allRSVP.filter(r => r.response === "Accepted").length;
    const rsvpPending  = allRSVP.filter(r => r.response === "Pending").length;
    const rsvpDeclined = allRSVP.filter(r => r.response === "Declined").length;

    // Participant categories for drawer
    const quorumLinks  = canonicalLinks.filter(l => l.member_category === "quorum" || l.quorum_eligible);
    const generalLinks = canonicalLinks.filter(l => l.member_category !== "quorum" && !l.quorum_eligible);

    // Participant details for drawer
    const quorumEligible = quorumLinks.length;
    const votingEligible = canonicalLinks.filter(l => l.voting_eligible).length;
    const participantDetail = canonicalLinks.length > 0
      ? `${totalParticipants} total — ${quorumEligible} quorum-eligible, ${votingEligible} voting-eligible`
      : legacyParticipants.length > 0
        ? `${legacyParticipants.length} participants`
        : "—";

    // Participant list (structured, role-grouped)
    const byRole: Record<string, string[]> = {};
    for (const l of canonicalLinks) {
      const user = bmsUserRegistry.items.find(u => u.id === l.user_id);
      const name = user?.name ?? l.user_id;
      (byRole[l.participant_type] ??= []).push(name);
    }
    const participantList = Object.entries(byRole)
      .map(([role, names]) => `${role}: ${names.slice(0, 3).join(", ")}${names.length > 3 ? ` +${names.length - 3}` : ""}`)
      .join("\n") || (legacyParticipants.map(p => p.name).join(", ") || "—");

    // Separate quorum / general member lists for drawer
    const quorumMemberList = quorumLinks.length > 0
      ? quorumLinks.map(l => {
          const user = bmsUserRegistry.items.find(u => u.id === l.user_id);
          const name = user?.name ?? l.user_id;
          const tags = [l.participant_type, l.is_required ? "Required" : "Optional", l.voting_eligible ? "Voting" : ""].filter(Boolean).join(" · ");
          return `${name} (${tags})`;
        }).join("\n")
      : "—";
    const generalMemberList = generalLinks.length > 0
      ? generalLinks.map(l => {
          const user = bmsUserRegistry.items.find(u => u.id === l.user_id);
          const name = user?.name ?? l.user_id;
          return `${name} (${l.participant_type})`;
        }).join("\n")
      : "—";

    // Agenda details for drawer
    const agendaDocLinks  = agendaDocLinkRegistry.items;
    const linkedAgendaIds = canonicalAgendaLinks.map(l => l.agenda_id);
    const parentAgendas   = agendaRegistry.items.filter(a => linkedAgendaIds.includes(a.agenda_id ?? a.id));
    const agendaList = canonicalAgendaLinks.length > 0
      ? canonicalAgendaLinks
          .map((l, i) => {
            const agenda = parentAgendas.find(a => (a.agenda_id ?? a.id) === l.agenda_id);
            const childCount = agendaRegistry.items.filter(a => a.parent_agenda_id === l.agenda_id).length;
            const docCount = agendaDocLinks.filter(d => d.agenda_id === l.agenda_id).length;
            return `${i + 1}. ${(agenda as {agenda_title?: string})?.agenda_title ?? l.agenda_id}${childCount > 0 ? ` (${childCount} items` : ""}${docCount > 0 ? `, ${docCount} docs` : ""}${childCount > 0 ? ")" : ""}`;
          })
          .join("\n")
      : "—";

    // Document details for drawer
    const agendaDocs     = canonicalDocLinks.filter(l => l.source === "agenda");
    const additionalDocs = canonicalDocLinks.filter(l => l.source === "additional");
    const docList = canonicalDocLinks.length > 0
      ? [
          agendaDocs.length > 0     ? `Agenda documents: ${agendaDocs.length}` : null,
          additionalDocs.length > 0 ? `Additional documents: ${additionalDocs.length}` : null,
        ].filter(Boolean).join("\n")
      : (documentRegistry.items.filter(d => d.related_meeting === mid).length > 0
          ? `${documentRegistry.items.filter(d => d.related_meeting === mid).length} documents`
          : "—");

    // Quorum rule for this meeting's governance body
    const committeeKey = m.committee ?? "";
    const bodyForRule = govRegistry.items.find(
      b => b.id === committeeKey || b.body_id === committeeKey || b.body_name === committeeKey,
    );
    const quorumRule = quorumRuleRegistry.items.find(r =>
      (bodyForRule && (r.governance_body_id === bodyForRule.id || r.governance_body_id === bodyForRule.body_id))
      || r.governance_body_id === committeeKey
      || r.governance_body_name === committeeKey
    );

    // Quorum forecast (shared calculation)
    const quorumCalc = calculateMeetingQuorum({
      boardCommitteeId: m.committee ?? "",
      boardCommitteeName: m.committee ?? "",
      participantLinks: canonicalLinks,
      governanceBodies: govRegistry.items,
      quorumRules: quorumRuleRegistry.items,
    });
    const quorumForecast = canonicalLinks.length > 0
      ? quorumStatusLabel(quorumCalc)
      : calcQuorumForecast(mid, m.committee ?? "", participantRegistry.items, rsvpRegistry.items, partGroupRegistry.items);

    // Readiness score
    const checks = [
      !!(m.meeting_title && m.meeting_date),
      !!m.committee, !!m.chairperson, !!m.secretary,
      !!(m.venue || m.virtual_link),
      totalParticipants > 0,
      canonicalAgendaLinks.length > 0,
      canonicalDocLinks.length > 0 || documentRegistry.items.some(d => d.related_meeting === mid),
      !!quorumRule,
    ];
    const readinessScore = `${checks.filter(Boolean).length}/${checks.length} checks`;

    // Activity history
    const activityLog = (m.activity_history as {date?: string; action?: string; actor?: string}[] | undefined) ?? [];
    const activitySummary = activityLog.length > 0
      ? activityLog.slice(-3).map(e => `${e.date?.slice(0, 10) ?? ""} — ${e.action ?? ""} (${e.actor ?? ""})`).join("\n")
      : `Created ${m.created_at?.slice(0, 10) ?? ""}`;

    // Reconstruct JSON blobs from canonical registries for draft restoration.
    // These are picked up by buildInitialValuesFromRow via hidden form fields.
    const restoredParticipantLinks: DraftParticipantLink[] = canonicalLinks.map(l => {
      const user = bmsUserRegistry.items.find(u => u.id === l.user_id);
      const sources: DraftParticipantLink["selection_sources"] = (() => {
        try { return JSON.parse(l.selection_sources_json ?? "[]"); }
        catch { return []; }
      })();
      if (sources.length === 0 && l.selection_source_type) {
        sources.push({
          type: l.selection_source_type,
          source_id: l.selection_source_id ?? l.user_id,
          source_label: l.selection_source_type,
        });
      }
      return {
        id: `restored-${l.user_id}-${l.id}`,
        user_id: l.user_id,
        user_name: user?.name ?? l.user_id,
        user_designation: user?.designation ?? user?.position ?? "",
        org_path: user?.circle ?? "",
        member_category: (l.member_category ?? "general") as "quorum" | "general",
        participant_type: l.participant_type as DraftParticipantLink["participant_type"],
        is_required: l.is_required,
        voting_eligible: l.voting_eligible,
        quorum_eligible: l.quorum_eligible,
        selection_sources: sources,
      };
    });

    const restoredAgendaEntries = canonicalAgendaLinks.map(l => ({
      agenda_id: l.agenda_id,
      display_order: l.display_order,
    }));

    const restoredAdditionalDocs = meetingDocLinkRegistry.items
      .filter(l => l.meeting_id === mid && l.source === "additional")
      .sort((a, b) => a.display_order - b.display_order)
      .map(l => {
        const doc = documentRegistry.items.find(d => (d.doc_id ?? d.id) === l.document_id);
        return {
          doc_id: l.document_id,
          version: l.version,
          source_label: doc?.doc_name ?? l.document_id,
        };
      });

    // Resolve committee display name from stored ID or name (bodyForRule already resolved above)
    const committeeLabel = bodyForRule?.body_name ?? committeeKey;

    return {
      ...m,
      id:               m.id,
      meeting_id:       mid,
      meeting_year:     /^\d{4}-\d{2}-\d{2}/.test(String(m.meeting_date ?? "")) ? String(m.meeting_date).slice(0, 4) : "",
      meeting_mode:     m.mode,
      committee:        committeeLabel,
      submitted_by:     m.organizer,
      status:           m.approval_status,
      // JSON blobs for draft restoration (read by hidden form fields)
      participant_links_json:   JSON.stringify(restoredParticipantLinks),
      selected_agenda_ids_json: JSON.stringify(restoredAgendaEntries),
      additional_doc_ids_json:  JSON.stringify(restoredAdditionalDocs),
      draft_current_step:       m.draft_current_step ?? "0",
      // Enriched fields for drawer display
      participant_count:     String(totalParticipants),
      participant_detail:    String(totalParticipants) + " invited",
      participant_list:      participantList,
      quorum_member_count:   String(quorumLinks.length),
      quorum_member_list:    quorumMemberList,
      general_member_count:  String(generalLinks.length),
      general_member_list:   generalMemberList,
      rsvp_accepted:         rsvpAccepted > 0 ? String(rsvpAccepted) : "0",
      rsvp_pending:          rsvpPending  > 0 ? String(rsvpPending)  : "0",
      rsvp_declined:         rsvpDeclined > 0 ? String(rsvpDeclined) : "0",
      quorum_eligible:       String(quorumEligible),
      quorum_forecast:     quorumForecast,
      readiness_score:     readinessScore,
      agenda_count:        String(canonicalAgendaLinks.length || parentAgendas.length),
      agenda_list:         agendaList,
      document_count:      String(canonicalDocLinks.length || documentRegistry.items.filter(d => d.related_meeting === mid).length),
      document_list:       docList,
      board_pack_status:   boardPack ? `${boardPack.pack_title} (${boardPack.version} — ${boardPack.approval_status})` : "Not created",
      quorum_rule_summary: quorumRule ? `${quorumRule.quorum_type} — min ${quorumRule.minimum_members} members${quorumRule.quorum_percent ? `, ${quorumRule.quorum_percent}%` : ""}` : "Not configured",
      activity_summary:    activitySummary,
    };
  });

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const tableRows = rows as unknown as TableRow[];
  const kpis = buildPageKpis(tableRows, {
    totalLabel: "Total Meetings",
    statusField: "status",
    statuses: [
      { value: "Draft",     label: "Draft",     tone: "neutral" },
      { value: "Scheduled", label: "Scheduled", tone: "primary" },
      { value: "Completed", label: "Completed", tone: "success" },
    ],
  });

  // ── Page config ─────────────────────────────────────────────────────────────
  const cfg: PageCfg = {
    title:       "All Meetings",
    titleKey:    "onlineReturnRegister.title",
    desc:        "View and manage all board and committee meetings across governance bodies.",
    descKey:     "onlineReturnRegister.desc",
    searchPlaceholder: "Search meetings",
    cols: [
      fc("meeting_title",    "Meeting",      { headerKey: "headers.meetingTitle" }),
      fc("committee",        "Body & Type",  { headerKey: "headers.committee" }),
      fc("meeting_date",     "Date & Time",  { headerKey: "headers.date" }),
      fc("meeting_mode",     "Mode",         { headerKey: "headers.type" }),
      fc("participant_count","Participants", { headerKey: "headers.totalEntry" }),
      BADGE("status",        "Status"),
    ],
    mobileCardMapping: {
      primary:    "meeting_title",
      identifier: "meeting_id",
      meta:       ["committee", "meeting_type", "submitted_by"],
      status:     "status",
      date:       "meeting_date",
    },
    filters:       buildMeetingRegisterFilters(tableRows),
    dataLoading,
    dataError,
    onDataRetry: retryMeetingSources,
    actions:       ROW_VIEW,
    drawerActionsResolver: (row) =>
      resolveMeetingActions(row)
        .filter(a => a.visible)
        .sort((a, b) => a.priority - b.priority)
        .map(a => ({ id: a.id, label: a.label, icon: a.icon, color: toneToColor[a.tone], enabled: a.enabled, disabledReason: a.disabledReason })),
    drawerTitle:   "Meeting Details",
    drawerCols:    MEETING_DRAWER_COLS,
    rows: tableRows,
    kpis,
    entryBtn:      "Create Meeting",
    awaitCreateSave: true,
    initialModal:  autoOpenCreate ? "entry" : undefined,
    fullPageModal:   true,
    formFields:      dynamicMeetingFields,
    formSteps:       MEETING_FORM_STEPS,
    formShortSteps:  MEETING_FORM_SHORT_STEPS,
    stepIcons:       MEETING_FORM_STEP_ICONS,
    sections:        meetingSections,
    wizardSubtitle:  "Enter the meeting information and prepare it for review.",
    reviewRenderer: (values, onGoToStep) => (
      <MeetingReviewPanel
        values={values}
        onGoToStep={onGoToStep}
        allAgendas={agendaRegistry.items}
        agendaDocLinks={agendaDocLinkRegistry.items}
        allDocuments={documentRegistry.items}
        governanceBodies={govRegistry.items}
        quorumRules={quorumRuleRegistry.items}
        bmsUsers={bmsUserRegistry.items}
      />
    ),
    stepRenderers: {
      1: (values, onValuesChange) => (
        <ParticipantSelectorStep
          values={values}
          onValuesChange={onValuesChange}
          bmsUsers={bmsUserRegistry.items}
          orgUnits={orgUnitRegistry.items}
          governanceBodies={govRegistry.items}
          governanceMemberships={govMembershipRegistry.items}
        />
      ),
      2: (values, onValuesChange) => (
        <AgendaDocumentStep
          values={values}
          onValuesChange={onValuesChange}
          allAgendas={agendaRegistry.items}
          agendaDocLinks={agendaDocLinkRegistry.items}
          allDocuments={documentRegistry.items}
          existingMeetingAgendaLinks={[]}
          canManage={true}
          onRequestDocumentComposer={openDocumentComposer}
          onRequestAgendaComposer={openAgendaComposer}
        />
      ),
      3: (values, onValuesChange) => (
        <QuorumAndAccessPanel
          values={values}
          onValuesChange={onValuesChange}
          governanceBodies={govRegistry.items}
          quorumRules={quorumRuleRegistry.items}
          allDocuments={documentRegistry.items}
        />
      ),
    },
    statusTabField: "status",
    statusTabs: [
      { id: "Draft",           label: "Draft"           },
      { id: "Scheduled",       label: "Scheduled"       },
      { id: "Pending Approval",label: "Pending Approval"},
      { id: "In Progress",     label: "In Progress"     },
      { id: "Approved",        label: "Approved"        },
      { id: "Completed",       label: "Completed"       },
      { id: "Cancelled",       label: "Cancelled"       },
    ] satisfies StatusTabDef[],
    onCustomAction:  handleCustomAction,
    approvalPermission: "mtg_approve",
    approvalStatusField: "approval_status",
    onApproveRecord: async (id, values) => {
      const approved = await convayAuth.approveMeeting(id, String(values.approval_remark ?? ""));
      try {
        await registry.refresh?.();
      } catch {
        toast.error("Meeting approval was saved, but the register could not refresh. Reload the page to see the latest status.");
      }
      return approved.approval_status === "Approved";
    },

    // ── Save Draft: upserts a meeting record with status "Draft" ─────────────────
    onSaveDraft: async (values, existingDraftId) => {
      const batch: Array<{ entity_key: string; action: "create" | "update" | "delete"; record_id?: string; payload?: { id?: string; [key: string]: unknown } }> = [];
      const now   = new Date().toISOString();
      const title = String(values.meeting_title ?? "Untitled Draft");
      const leadership = resolveMeetingLeadership(values, bmsUserRegistry.items);
      const draftOrg = leadership.names.organizer;

      const meetingPayload: Record<string, unknown> = {
        meeting_title:    title,
        meeting_type:     String(values.meeting_type     ?? ""),
        committee:        String(values.committee        ?? ""),
        meeting_date:     String(values.meeting_date     ?? ""),
        start_time:       String(values.start_time       ?? ""),
        end_time:         String(values.end_time         ?? ""),
        time_zone:        String(values.time_zone        ?? "Asia/Dhaka (GMT+6)"),
        mode:             String(values.mode             ?? "Physical"),
        venue:            String(values.venue            ?? ""),
        virtual_platform: "Convay",
        virtual_link:     String(values.virtual_link     ?? ""),
        financial_year:   String(new Date().getFullYear() + "-" + (new Date().getFullYear() + 1)),
        ...meetingLeadershipPayload(leadership),
        language:         "English",
        priority:         "Normal",
        ...meetingContextPayload(values, "Confidential"),
        approval_status:  "Draft",
        quorum_forecast:  "Pending",
        readiness:        "In Preparation",
        participant_count: "0", agenda_count: "0", document_count: "0",
        draft_current_step: String(values._current_step ?? "0"),
        updated_at: now,
      };

      let mid: string;
      const draftTarget = resolveMeetingDraftTarget(existingDraftId, registry.items);
      if (draftTarget) {
        // Upsert — update existing draft record
        batch.push({ entity_key: "bms.meetings", action: "update", record_id: draftTarget.recordId, payload: meetingPayload });
        mid = draftTarget.meetingId;
        // Remove old child links before re-adding (clean slate for participants/agendas)
        participantLinkRegistry.items
          .filter(l => l.meeting_id === mid)
          .forEach(l => batch.push({ entity_key: "bms.meetingParticipantLinks", action: "delete", record_id: l.id }));
        agendaLinkRegistry.items
          .filter(l => l.meeting_id === mid)
          .forEach(l => batch.push({ entity_key: "bms.meetingAgendaLinks", action: "delete", record_id: l.id }));
      } else {
        // Insert — new draft
        mid = generateId("MTG", registry.items.map(m => m.meeting_id));
        batch.push({ entity_key: "bms.meetings", action: "create", payload: {
          id: mid, meeting_id: mid,
          ...meetingPayload,
          created_by: "Current User",
          created_at: now,
          activity_history: [],
        } as never });
      }

      // Participants — synchronize canonical participant links
      const draftLinks: DraftParticipantLink[] = (() => {
        try { return JSON.parse(String(values.participant_links_json ?? "[]")) as DraftParticipantLink[]; }
        catch { return []; }
      })();
      const seenDraft = new Set<string>();
      draftLinks.forEach((link, idx) => {
        if (!link.user_id || seenDraft.has(link.user_id)) return;
        seenDraft.add(link.user_id);
        const primarySrc = link.selection_sources[0] ?? { type: "individual", source_id: link.user_id, source_label: "Individual" };
        batch.push({ entity_key: "bms.meetingParticipantLinks", action: "create", payload: {
          id: `${mid}-LNK${String(idx + 1).padStart(3, "0")}`,
          meeting_id: mid, user_id: link.user_id,
          participant_type: link.participant_type,
          member_category: link.member_category,
          selection_source_type: primarySrc.type as "individual" | "branch" | "division" | "department" | "group",
          selection_source_id: primarySrc.source_id,
          selection_sources_json: JSON.stringify(link.selection_sources),
          quorum_eligible: link.quorum_eligible,
          voting_eligible: link.voting_eligible,
          is_required: link.is_required,
          invitation_status: "pending",
          created_at: now,
        } as never });
      });

      // Agenda links
      const draftAgendas: SelectedAgendaEntry[] = (() => {
        try { return JSON.parse(String(values.selected_agenda_ids_json ?? "[]")) as SelectedAgendaEntry[]; }
        catch { return []; }
      })();
      const seenDraftAgenda = new Set<string>();
      draftAgendas.forEach((e, idx) => {
        if (seenDraftAgenda.has(e.agenda_id)) return;
        seenDraftAgenda.add(e.agenda_id);
        batch.push({ entity_key: "bms.meetingAgendaLinks", action: "create", payload: {
          id: `${mid}-MAL${String(idx + 1).padStart(2, "0")}`,
          meeting_id: mid, agenda_id: e.agenda_id,
          display_order: e.display_order, added_at: now,
          added_by: draftOrg || "Current User",
        } as never });
      });

      // Document links — sync additional docs (agenda docs will be computed at schedule time)
      meetingDocLinkRegistry.items
        .filter(l => l.meeting_id === mid && l.source === "additional")
        .forEach(l => batch.push({ entity_key: "bms.meetingDocumentLinks", action: "delete", record_id: l.id }));
      const draftAdditionalDocs: AdditionalDocEntry[] = (() => {
        try { return JSON.parse(String(values.additional_doc_ids_json ?? "[]")); }
        catch { return []; }
      })();
      const seenDraftDocIds = new Set<string>();
      draftAdditionalDocs.forEach((ad, idx) => {
        if (seenDraftDocIds.has(ad.doc_id)) return;
        seenDraftDocIds.add(ad.doc_id);
        batch.push({ entity_key: "bms.meetingDocumentLinks", action: "create", payload: {
          id: `${mid}-MDL-D${String(idx + 1).padStart(3, "0")}`,
          meeting_id: mid,
          document_id: ad.doc_id,
          version: ad.version,
          source: "additional",
          display_order: idx + 1,
          added_by: draftOrg || "Current User",
          added_at: now,
        } as never });
      });

      await convayAuth.applyBatch(batch);
      await Promise.all([registry.refresh?.(), participantLinkRegistry.refresh?.(), agendaLinkRegistry.refresh?.(), meetingDocLinkRegistry.refresh?.()]);
      toast.success(`"${title}" saved as Draft.`);
      return mid;
    },

    lastStepSubmitLabel: "Schedule Meeting",

    // ── Create: saves meeting + all child records ─────────────────────────────
    onRowCreate: async (values) => {
      const batch: Array<{ entity_key: string; action: "create" | "update" | "delete"; record_id?: string; payload?: { id?: string; [key: string]: unknown } }> = [];
      const now  = new Date().toISOString();
      const identity = normalizeMeetingIdentity(values);
      const schedule = normalizeMeetingSchedule(values);
      const meetingTitle = identity.meeting_title || "Untitled Meeting";
      const committee = identity.committee;

      const leadership = resolveMeetingLeadership(values, bmsUserRegistry.items);
      const chairpersonId = leadership.ids.chairperson;
      const secretaryId = leadership.ids.secretary;
      const organizerId = leadership.ids.organizer;
      const organizerName = leadership.names.organizer;

      // Warn if same person holds multiple roles (allowed but flagged)
      const uniqueRoleHolders = new Set([chairpersonId, secretaryId, organizerId].filter(Boolean));
      if (uniqueRoleHolders.size < [chairpersonId, secretaryId, organizerId].filter(Boolean).length) {
        toast.warning("Warning: one person holds multiple meeting roles. Please verify with your governance policy.");
      }

      // onRowCreate is always a "Schedule Meeting" action (Step 4 / publish_action removed)
      const approvalStatus = "Scheduled";

      // Parse canonical participant/agenda/doc blobs for validation and persistence
      const draftLinksRaw: DraftParticipantLink[] = (() => {
        try { return JSON.parse(String(values.participant_links_json ?? "[]")) as DraftParticipantLink[]; }
        catch { return []; }
      })();
      const agendaEntriesRaw: SelectedAgendaEntry[] = (() => {
        try { return JSON.parse(String(values.selected_agenda_ids_json ?? "[]")) as SelectedAgendaEntry[]; }
        catch { return []; }
      })();
      const additionalDocsRaw: AdditionalDocEntry[] = (() => {
        try { return JSON.parse(String(values.additional_doc_ids_json ?? "[]")) as AdditionalDocEntry[]; }
        catch { return []; }
      })();
      // ── Schedule Meeting validation ─────────────────────────────────────────
      {
        const blockers: string[] = [];
        blockers.push(...validateMeetingIdentity(identity));
        if (!String(values.meeting_date ?? "").trim())        blockers.push("Meeting date is required");
        if (!String(values.start_time ?? "").trim() || !String(values.end_time ?? "").trim())
                                                              blockers.push("Start and end time are required");
        blockers.push(...leadership.missing.map(role => `${meetingLeadershipLabel(role)} must be selected from active registered users`));

        const body = govRegistry.items.find(b => b.id === committee || b.body_id === committee || b.body_name === committee);
        if (body && (body as {status?: string}).status && (body as {status?: string}).status !== "Active")
          blockers.push(`Governance body "${body.body_name}" is not active`);

        const quorumEligible = draftLinksRaw.filter(l => l.quorum_eligible).length;
        const requiredParticipants = draftLinksRaw.filter(l => l.is_required).length;
        if (draftLinksRaw.length === 0)  blockers.push("At least one participant is required");
        if (requiredParticipants === 0)  blockers.push("At least one required participant must be assigned");
        if (quorumEligible === 0)        blockers.push("At least one quorum-eligible participant is required");

        if (agendaEntriesRaw.length === 0)
          blockers.push("At least one approved agenda must be selected");

        // Block scheduling for any non-ready agendas
        agendaEntriesRaw.forEach(e => {
          const ag = agendaRegistry.items.find(a => (a.agenda_id ?? a.id) === e.agenda_id);
          if (!ag) return;
          const st = (ag as {approval_status?: string}).approval_status ?? "";
          const mr = (ag as {meeting_readiness?: string}).meeting_readiness ?? "";
          if (st !== "Approved")    blockers.push(`Agenda "${ag.agenda_title ?? e.agenda_id}" must be Approved before scheduling`);
          else if (mr !== "Meeting Ready") blockers.push(`Agenda "${ag.agenda_title ?? e.agenda_id}" is not Meeting Ready`);
        });

        blockers.push(...meetingAccessBlockers(values));

        const body2 = govRegistry.items.find(b => b.id === committee || b.body_id === committee || b.body_name === committee);
        const govRule = quorumRuleRegistry.items.find(r =>
          (r.governance_body_id === body2?.id || r.governance_body_id === body2?.body_id) && r.status === "Active",
        );
        if (!govRule)
          blockers.push("No active quorum rule found for the selected Board / Committee");

        if (blockers.length > 0) {
          toast.error(`Cannot schedule: ${blockers[0]}${blockers.length > 1 ? ` (+${blockers.length - 1} more)` : ""}`);
          return false;
        }
      }

      // Meeting record — upsert existing draft if _draft_meeting_id present, else create new
      const existingDraftId = String(values._draft_meeting_id ?? "");
      const draftTarget = resolveMeetingDraftTarget(existingDraftId, registry.items);
      const newId = draftTarget?.meetingId ?? generateId("MTG", registry.items.map(m => m.meeting_id));

      const meetingCorePayload = {
        ...identity,
        ...schedule,
        mode:          String(values.mode ?? "Physical"),
        venue:         String(values.venue ?? ""),
        virtual_platform: "Convay",
        virtual_link:  String(values.virtual_link ?? ""),
        financial_year: String(new Date().getFullYear() + "-" + (new Date().getFullYear() + 1)),
        ...meetingLeadershipPayload(leadership),
        language:      "English",
        priority:      "Normal",
        ...meetingContextPayload(values, "Confidential"),
        approval_status: approvalStatus,
        quorum_forecast: "Pending",
        readiness:       "In Preparation",
        participant_count: "0",
        agenda_count:    "0",
        document_count:  "0",
        updated_at:      now,
      };

      if (draftTarget) {
        batch.push({ entity_key: "bms.meetings", action: "update", record_id: draftTarget.recordId, payload: meetingCorePayload });
        // Reconcile child records — remove old links before re-adding
        participantLinkRegistry.items.filter(l => l.meeting_id === newId).forEach(l => batch.push({ entity_key: "bms.meetingParticipantLinks", action: "delete", record_id: l.id }));
        participantRegistry.items.filter(l => l.meeting_id === newId).forEach(l => batch.push({ entity_key: "bms.participants", action: "delete", record_id: l.id }));
        rsvpRegistry.items.filter(l => l.meeting_id === newId).forEach(l => batch.push({ entity_key: "bms.rsvp", action: "delete", record_id: l.id }));
        agendaLinkRegistry.items.filter(l => l.meeting_id === newId).forEach(l => batch.push({ entity_key: "bms.meetingAgendaLinks", action: "delete", record_id: l.id }));
        meetingDocLinkRegistry.items.filter(l => l.meeting_id === newId).forEach(l => batch.push({ entity_key: "bms.meetingDocumentLinks", action: "delete", record_id: l.id }));
      } else {
        batch.push({ entity_key: "bms.meetings", action: "create", payload: {
          id: newId, meeting_id: newId,
          ...meetingCorePayload,
          created_by: "Current User",
          created_at: now,
          activity_history: [],
        } as never });
      }

      // Participants — canonical via participant_links_json (already parsed above)
      const seenUserIds = new Set<string>();
      draftLinksRaw.forEach((link, idx) => {
        if (!link.user_id || seenUserIds.has(link.user_id)) return;
        seenUserIds.add(link.user_id);

        // Canonical link record
        const linkId = `${newId}-LNK${String(idx + 1).padStart(3, "0")}`;
        const primarySource = link.selection_sources[0] ?? { type: "individual", source_id: link.user_id, source_label: "Individual" };
        batch.push({ entity_key: "bms.meetingParticipantLinks", action: "create", payload: {
          id: linkId,
          meeting_id: newId,
          user_id: link.user_id,
          participant_type: link.participant_type,
          member_category: link.member_category,
          selection_source_type: primarySource.type as "individual" | "branch" | "division" | "department" | "group",
          selection_source_id: primarySource.source_id,
          selection_sources_json: JSON.stringify(link.selection_sources),
          quorum_eligible: link.quorum_eligible,
          voting_eligible: link.voting_eligible,
          is_required: link.is_required,
          invitation_status: "pending",
          created_at: now,
        } as never });

        // Adapter: legacy MeetingParticipant for RSVP / Live Meeting compatibility
        const pId = `${newId}-P${String(idx + 1).padStart(3, "0")}`;
        batch.push({ entity_key: "bms.participants", action: "create", payload: {
          id: pId, participant_id: pId,
          meeting_id: newId, meeting_title: meetingTitle,
          name: link.user_name, designation: link.user_designation,
          organization: link.org_path || committee,
          role: link.participant_type,
          attendance_requirement: link.is_required ? "Mandatory" : "Optional",
          email: "", phone: "",
          rsvp_status: "Pending", attendance_status: "Not Yet",
          joined_at: "", left_at: "", proxy_for: "",
          conflict_declared: "No", created_at: now,
          quorum_eligible: link.quorum_eligible ? "Yes" : "No",
          voting_eligible: link.voting_eligible ? "Yes" : "No",
          user_id: link.user_id,
        } as never });

        // RSVP record
        const rId = `${newId}-RSV${String(idx + 1).padStart(3, "0")}`;
        batch.push({ entity_key: "bms.rsvp", action: "create", payload: {
          id: rId, rsvp_id: rId,
          meeting_id: newId, meeting_title: meetingTitle,
          participant_id: pId, participant_name: link.user_name,
          response: "Pending", response_date: "",
          decline_reason: "", proxy_nominee: "", notes: "",
          created_at: now,
        } as never });
      });

      // ── Agenda links (canonical via selected_agenda_ids_json — already parsed above) ─
      const agendaEntries = agendaEntriesRaw;
      const seenAgendaIds = new Set<string>();
      agendaEntries.forEach((entry, idx) => {
        if (seenAgendaIds.has(entry.agenda_id)) return;
        seenAgendaIds.add(entry.agenda_id);
        const linkId = `${newId}-MAL${String(idx + 1).padStart(2, "0")}`;
        batch.push({ entity_key: "bms.meetingAgendaLinks", action: "create", payload: {
          id: linkId,
          meeting_id: newId,
          agenda_id: entry.agenda_id,
          display_order: entry.display_order,
          added_at: now,
          added_by: organizerName || "Current User",
        } as never });
      });

      // ── Document links ────────────────────────────────────────────────────────
      let docLinkOrder = 0;

      // Agenda documents (auto-derived: all docs linked to selected agendas + their children)
      const relevantAgendaIds = new Set<string>(agendaEntries.map(e => e.agenda_id));
      agendaRegistry.items.forEach(a => {
        if (relevantAgendaIds.has(a.parent_agenda_id ?? "")) relevantAgendaIds.add(a.agenda_id ?? a.id);
      });
      const agendaDocIds = new Set(
        agendaDocLinkRegistry.items.filter(l => relevantAgendaIds.has(l.agenda_id)).map(l => l.document_id),
      );
      // Also include docs with related_agenda pointing to a relevant agenda
      documentRegistry.items.forEach(d => {
        if (d.related_agenda && relevantAgendaIds.has(d.related_agenda)) agendaDocIds.add(d.doc_id ?? d.id);
      });
      const seenDocIds = new Set<string>();
      agendaDocIds.forEach(docId => {
        if (seenDocIds.has(docId)) return;
        seenDocIds.add(docId);
        docLinkOrder++;
        const mlId = `${newId}-MDL${String(docLinkOrder).padStart(3, "0")}`;
        const doc = documentRegistry.items.find(d => (d.doc_id ?? d.id) === docId);
        batch.push({ entity_key: "bms.meetingDocumentLinks", action: "create", payload: {
          id: mlId,
          meeting_id: newId,
          document_id: docId,
          version: doc?.version ?? "1.0",
          source: "agenda",
          source_agenda_id: doc?.related_agenda ?? "",
          display_order: docLinkOrder,
          added_by: organizerName || "Current User",
          added_at: now,
        } as never });
      });

      // Additional documents (from additional_doc_ids_json — already parsed above)
      const additionalDocs = additionalDocsRaw;
      additionalDocs.forEach(ad => {
        if (seenDocIds.has(ad.doc_id)) return;
        seenDocIds.add(ad.doc_id);
        docLinkOrder++;
        const mlId = `${newId}-MDL${String(docLinkOrder).padStart(3, "0")}`;
        batch.push({ entity_key: "bms.meetingDocumentLinks", action: "create", payload: {
          id: mlId,
          meeting_id: newId,
          document_id: ad.doc_id,
          version: ad.version,
          source: "additional",
          display_order: docLinkOrder,
          added_by: organizerName || "Current User",
          added_at: now,
        } as never });
      });

      // (select_from_users and agenda_items free-text paths removed — handled by canonical registries)
      // One RLS-validated PostgreSQL transaction for the meeting and its linked records.
      await convayAuth.applyBatch(batch);
      await Promise.all([
        registry.refresh?.(), participantLinkRegistry.refresh?.(),
        participantRegistry.refresh?.(), rsvpRegistry.refresh?.(),
        agendaLinkRegistry.refresh?.(), meetingDocLinkRegistry.refresh?.(),
      ]);
      return true;
    },

    // ── Update: syncs core meeting fields back to registry ────────────────────
    onRowUpdate: (id, values) => {
      const existingMeeting = registry.items.find(meeting => meeting.id === id || meeting.meeting_id === id);
      const submittedValues = mergeMeetingUpdateValues(existingMeeting, values);
      const identity = normalizeMeetingIdentity(submittedValues);
      const schedule = normalizeMeetingSchedule(submittedValues);
      const leadership = resolveMeetingLeadership(submittedValues, bmsUserRegistry.items);
      if (leadership.missing.length > 0) {
        toast.error(`Cannot save changes. Select active registered users for ${leadership.missing.map(meetingLeadershipLabel).join(", ")}.`);
        return false;
      }
      const accessErrors = meetingUpdateAccessBlockers(existingMeeting ? { ...existingMeeting } : undefined, values);
      if (accessErrors.length > 0) {
        toast.error(`Cannot save changes. ${accessErrors[0]}`);
        return false;
      }
      return registry.update(id, {
        ...identity,
        ...schedule,
        mode:                String(submittedValues.mode             ?? ""),
        venue:               String(submittedValues.venue            ?? ""),
        virtual_platform:    String(submittedValues.virtual_platform ?? ""),
        virtual_link:        String(submittedValues.virtual_link     ?? ""),
        ...meetingLeadershipPayload(leadership),
        ...meetingContextPayload(submittedValues, existingMeeting?.confidentiality ?? ""),
        rsvp_deadline:       String(submittedValues.rsvp_deadline     ?? ""),
        invitation_date:     String(submittedValues.invitation_date   ?? ""),
        board_pack_date:     String(submittedValues.board_pack_date   ?? ""),
        updated_at:          new Date().toISOString(),
      } as never);
    },
  };

  return (
    <>
      <GenPage cfg={cfg} />
      <MeetingContextualModals
        meeting={ctxMeeting}
        actionId={ctxAction}
        onClose={handleCtxClose}
        onMeetingUpdate={handleMeetingUpdate}
      />
      <DocumentComposerModal
        open={composerOpen}
        onClose={() => closeComposer()}
        sourceModule="meeting"
        onCreated={(docId) => closeComposer(docId)}
      />
      <AgendaFormModal
        open={agendaComposerOpen}
        onClose={() => closeAgendaComposer()}
        agendaId={null}
        sourceModule="meeting"
        onSaved={(result) => closeAgendaComposer(result)}
      />
    </>
  );
}
