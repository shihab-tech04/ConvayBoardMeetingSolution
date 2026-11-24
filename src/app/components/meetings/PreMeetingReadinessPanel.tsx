/**
 * Pre-Meeting Readiness Panel (Section 5 — live-meeting-journey spec)
 *
 * Shown after "Start Meeting" is selected and before the meeting is actually
 * marked In Progress. Allows authorized users to:
 *  - Review meeting setup
 *  - Check in / mark participants present
 *  - Confirm quorum status
 *  - Review agenda and document readiness
 *  - Start the meeting only when blockers are resolved (or override with reason)
 */

import { useState, useCallback, useRef, useEffect, useId } from "react";
import "./preMeetingReadiness.css";
import {
  CheckCircle, XCircle, AlertTriangle, Users, Layers, FileText,
  X, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  useMeetingRegistry,
  useMeetingParticipantLinkRegistry,
  useMeetingAgendaLinkRegistry,
  useAgendaDocumentLinkRegistry,
  useDocumentRegistry,
  useGovernanceRegistry,
  useQuorumRuleRegistry,
  useAttendanceRegistry,
} from "../../data/boardMeetingData";
import { useBmsUserRegistry } from "../../data/bmsUsers";
import { calculateMeetingQuorum, quorumStatusLabel } from "../../utils/quorumCalculation";
import { readReadinessAttendance, readinessAttendancePatch, PRESENT_STATES, type ReadinessAttendance } from "../../pages/return-register/readinessAttendance";
import { PrimaryButton } from "../buttons/PrimaryButton";
import { SecondaryButton } from "../buttons/SecondaryButton";

// ─── Attendance states ────────────────────────────────────────────────────────

type AttendanceEdit = { status: ReadinessAttendance; baseline: string };

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ title, icon, children, defaultOpen = true }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section className="pre-meeting-readiness__section">
      <button
        type="button"
        className="pre-meeting-readiness__section-toggle"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-controls={contentId}
      >
        {icon}
        <span className="pre-meeting-readiness__section-heading">{title}</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && <div id={contentId} className="pre-meeting-readiness__section-content">{children}</div>}
    </section>
  );
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function InfoRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="pre-meeting-readiness__info-row">
      <span className="pre-meeting-readiness__info-label">{label}</span>
      <span className="pre-meeting-readiness__info-value" style={warn ? { color: "var(--color-warning, #b45309)", fontWeight: 600 } : undefined}>{value || "—"}</span>
    </div>
  );
}

// ─── StatusChip ──────────────────────────────────────────────────────────────

function StatusChip({ ok, warn, label }: { ok?: boolean; warn?: boolean; label: string }) {
  const color = ok ? "#22c55e" : warn ? "#f59e0b" : "#ef4444";
  const bg    = ok ? "#14532d22" : warn ? "#78350f22" : "#7f1d1d22";
  const Icon  = ok ? CheckCircle : warn ? AlertTriangle : XCircle;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", padding: "0.2rem 0.55rem", borderRadius: 9999, background: bg, color, border: `1px solid ${color}44`, fontSize: "0.72rem", fontWeight: 600 }}>
      <Icon size={12} /> {label}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface PreMeetingReadinessPanelProps {
  meetingId: string;
  onClose: () => void;
  onStartMeeting: (attendance: Record<string, ReadinessAttendance>) => Promise<boolean> | boolean | void;
}

export function PreMeetingReadinessPanel({ meetingId, onClose, onStartMeeting }: PreMeetingReadinessPanelProps) {
  const meetingRegistry = useMeetingRegistry();
  const participantRegistry = useMeetingParticipantLinkRegistry();
  const { items: meetings } = meetingRegistry;
  const { items: participantLinks } = participantRegistry;
  const { items: agendaLinks }        = useMeetingAgendaLinkRegistry();
  const { items: agendaDocLinks }     = useAgendaDocumentLinkRegistry();
  const { items: allDocuments }       = useDocumentRegistry();
  const { items: govBodies }          = useGovernanceRegistry();
  const { items: quorumRules }        = useQuorumRuleRegistry();
  const { items: bmsUsers }           = useBmsUserRegistry();
  const attendanceRegistry = useAttendanceRegistry();
  const { items: attendanceItems, add: addAttendanceRec, update: updateAttendanceRec } = attendanceRegistry;

  const meeting = meetings.find(m => m.meeting_id === meetingId);
  const myLinks = participantLinks.filter(l => l.meeting_id === meetingId);
  const myAgendaLinks = agendaLinks.filter(l => l.meeting_id === meetingId);

  // Resolve user names from bmsUsers
  const resolveUser = useCallback((userId: string) => {
    return bmsUsers.find(u => u.id === userId || u.user_id === userId);
  }, [bmsUsers]);

  // SQL registry reads can arrive after mount. Keep unsaved selections separate
  // from the current persisted state; never infer presence from check-in alone.
  const reopened = Boolean((meeting as { reopened_at?: unknown } | undefined)?.reopened_at);
  const persisted = readReadinessAttendance(meetingId, myLinks, attendanceItems, { reopened });
  const hasSessionAttendance = attendanceItems.some(row => row.meeting_id === meetingId && myLinks.some(link => link.user_id === row.participant_id) && Boolean((row as typeof row & { live_session_id?: unknown }).live_session_id || (row as typeof row & { session_id?: unknown }).session_id));
  const sourceRows = [meetingRegistry, participantRegistry, attendanceRegistry];
  const sourceLoading = sourceRows.some(source => source.loading === true);
  const sourceFailure = sourceRows.map(source => source.error).find(Boolean);
  const sourceError = sourceLoading ? "Loading authoritative readiness records…"
    : sourceFailure ? "Readiness records could not be loaded. Refresh and retry."
    : !meeting ? "Saved meeting unavailable. Refresh and retry."
    : reopened || hasSessionAttendance ? "Session-scoped attendance must be confirmed in the live workspace."
    : persisted.conflicts.length ? persisted.conflicts.join("; ") : "";
  const [editScope, setEditScope] = useState<{ meetingId: string; values: Record<string, AttendanceEdit> }>({ meetingId, values: {} });
  const edits = editScope.meetingId === meetingId ? editScope.values : {};
  const attendanceMap: Record<string, ReadinessAttendance> = Object.fromEntries(
    Object.entries(persisted.values).map(([userId, value]) => [userId, edits[userId]?.status ?? value]));
  const baselineFor = (userId: string) => JSON.stringify(attendanceItems
    .filter(row => row.meeting_id === meetingId && row.participant_id === userId)
    .map(row => [row.id, attendanceRegistry.getRevision?.(row.id), row]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))));
  const changeAttendance = (userId: string, status: ReadinessAttendance) => {
    if (sourceError || !Object.prototype.hasOwnProperty.call(persisted.values, userId)) return;
    setEditScope(prev => {
      const values = { ...(prev.meetingId === meetingId ? prev.values : {}) };
      if (status === persisted.values[userId]) delete values[userId];
      else values[userId] = { status, baseline: values[userId]?.baseline ?? baselineFor(userId) };
      return { meetingId, values };
    });
  };

  const [overrideReason, setOverrideReason] = useState("");
  const [showOverride, setShowOverride] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const attendanceSaveInFlight = useRef(false);
  const attendanceEditVersion = useRef(0);
  const startRequested = useRef(false);
  const [startingMeeting, setStartingMeeting] = useState(false);
  const stillMounted = useRef(true);
  const latestAttendance = useRef(attendanceMap);
  latestAttendance.current = attendanceMap;
  useEffect(() => {
    stillMounted.current = true;
    return () => { stillMounted.current = false; };
  }, []);

  // ── Participant categories ─────────────────────────────────────────────────
  const quorumLinks  = myLinks.filter(l => l.member_category === "quorum" || l.quorum_eligible);
  const generalLinks = myLinks.filter(l => l.member_category !== "quorum" && !l.quorum_eligible);

  const presentCount       = myLinks.filter(l => PRESENT_STATES.includes(attendanceMap[l.user_id] ?? "Not Joined")).length;
  const quorumPresent      = quorumLinks.filter(l => PRESENT_STATES.includes(attendanceMap[l.user_id] ?? "Not Joined")).length;
  const generalPresent     = generalLinks.filter(l => PRESENT_STATES.includes(attendanceMap[l.user_id] ?? "Not Joined")).length;

  // Leadership required roles
  const requiredLinks   = myLinks.filter(l => l.is_required);
  const requiredPresent = requiredLinks.filter(l => PRESENT_STATES.includes(attendanceMap[l.user_id] ?? "Not Joined")).length;
  const requiredMissing = requiredLinks.filter(l => !PRESENT_STATES.includes(attendanceMap[l.user_id] ?? "Not Joined"));

  // ── Quorum using shared engine (all assigned members; attendance is separate) ──
  const presentUserIds = new Set(myLinks
    .filter(l => PRESENT_STATES.includes(attendanceMap[l.user_id] ?? "Not Joined"))
    .map(l => l.user_id));

  const quorumResult = calculateMeetingQuorum({
    meetingId,
    boardCommitteeId: meeting?.committee ?? "",
    boardCommitteeName: meeting?.committee ?? "",
    participantLinks: myLinks,
    presentUserIds,
    governanceBodies: govBodies,
    quorumRules,
  });

  // ── Agenda readiness ──────────────────────────────────────────────────────
  const linkedAgendaCount = myAgendaLinks.length;
  const linkedDocIds = new Set(
    agendaDocLinks
      .filter(l => myAgendaLinks.some(al => al.agenda_id === l.agenda_id))
      .map(l => l.document_id)
  );
  const linkedDocs = allDocuments.filter(d => linkedDocIds.has(d.id));
  const missingDocContent = linkedDocs.filter(d => !(d as { file_url?: string }).file_url && !(d as { content?: string }).content);

  // ── Blockers ──────────────────────────────────────────────────────────────
  const blockers: string[] = [];
  if (!meeting?.chairperson)    blockers.push("Chairperson not assigned");
  if (!meeting?.secretary)      blockers.push("Secretary not assigned");
  // Agenda-free meetings can start. Attendance and leadership safety checks remain.
  if (requiredMissing.length > 0) blockers.push(`Required leadership not present: ${requiredMissing.map(l => resolveUser(l.user_id)?.name ?? l.user_id).join(", ")}`);

  const warnings: string[] = [];
  if (quorumResult.status === "not_expected" || quorumResult.status === "not_configured") {
    warnings.push(quorumResult.status === "not_configured" ? "Quorum rule not configured" : "Quorum not met at start");
  }
  if (quorumResult.status === "at_risk") warnings.push("Quorum is at risk — some eligible members not yet present");
  if (missingDocContent.length > 0) warnings.push(`${missingDocContent.length} document(s) have no content available for preview`);

  const hasCriticalBlocker = blockers.length > 0;

  // ── Attendance toggle ─────────────────────────────────────────────────────
  const toggleAttendance = (userId: string) => {
    if (attendanceSaveInFlight.current || startRequested.current) return;
    attendanceEditVersion.current += 1;
    const current = attendanceMap[userId] ?? "Not Joined";
    const next: ReadinessAttendance = PRESENT_STATES.includes(current) ? "Not Joined" : "Present";
    changeAttendance(userId, next);
  };

  const setAttendanceStatus = (userId: string, status: ReadinessAttendance) => {
    if (attendanceSaveInFlight.current || startRequested.current) return;
    attendanceEditVersion.current += 1;
    changeAttendance(userId, status);
  };

  // ── Save attendance to registry ───────────────────────────────────────────
  // This UI guard awaits real SQL-backed registry ACKs. It does not replace
  // the WS0-owned atomic, actor-scoped attendance/quorum backend command.
  const saveAttendance = useCallback(async (): Promise<boolean> => {
    if (attendanceSaveInFlight.current || sourceError) return false;
    attendanceSaveInFlight.current = true;
    setSavingAttendance(true);
    setAttendanceError("");
    const requested = attendanceMap;
    const editVersion = attendanceEditVersion.current;
    try {
      const now = new Date().toISOString();
      const written: Array<{ id: string; userId: string; status: ReadinessAttendance }> = [];
      // Validate all local edits before touching SQL; a refresh must not turn
      // an outdated user selection into a write against the latest revision.
      for (const [userId, edit] of Object.entries(edits)) {
        if (!Object.prototype.hasOwnProperty.call(persisted.values, userId)) throw new Error("Participant assignment changed. Refresh and retry.");
        if (persisted.values[userId] !== edit.status && baselineFor(userId) !== edit.baseline) {
          throw new Error("Attendance changed in SQL. Review the current status and select it again before saving.");
        }
      }
      for (const [userId, edit] of Object.entries(edits)) {
        const status = edit.status;
        if (persisted.values[userId] === status) continue; // Already saved/read back.
        const link = myLinks.find(l => l.user_id === userId);
        const user = resolveUser(userId);
        const existing = attendanceItems.find(a => a.meeting_id === meetingId && a.participant_id === userId);
        const patch = readinessAttendancePatch(existing, status, now);
        let accepted: boolean | Promise<boolean> = true;
        let recordId: string;
        if (existing) {
          recordId = existing.id;
          accepted = updateAttendanceRec(recordId, patch as never);
        } else {
          recordId = `ATT-${meetingId}-${userId}`;
          accepted = addAttendanceRec({
            id: recordId, attendance_id: recordId,
            meeting_id: meetingId,
            meeting_title: meeting?.meeting_title ?? "",
            participant_id: userId,
            participant_name: user?.name ?? userId,
            designation: user?.designation ?? "",
            role: link?.participant_type ?? "Member",
            ...patch,
            attendance_mode: "In-Person",
            quorum_eligible: link?.quorum_eligible ? "Yes" : "No",
            signed: "No",
            notes: "",
            created_at: now,
          } as never);
        }
        if (await accepted !== true) throw new Error("Attendance could not be saved. Review the records and retry.");
        written.push({ id: recordId, userId, status });
      }
      // The production registry implements fresh SQL readback; test doubles
      // without a reader can only establish the prior ACK contract.
      if (typeof attendanceRegistry.refresh === "function" && typeof attendanceRegistry.getById === "function") {
        await attendanceRegistry.refresh();
        for (const write of written) {
          const row = attendanceRegistry.getById(write.id);
          const read = readReadinessAttendance(meetingId, myLinks, row ? [row] : []);
          if (!row || read.conflicts.length || read.values[write.userId] !== write.status) {
            throw new Error("Attendance SQL readback did not match the selection. Refresh and retry.");
          }
        }
      }
      // A selection changed while the write was pending. It must not be used
      // to start a meeting from a stale attendance/quorum calculation.
      if (attendanceEditVersion.current !== editVersion ||
          JSON.stringify(latestAttendance.current) !== JSON.stringify(requested)) {
        throw new Error("Attendance changed during saving. Save again before starting.");
      }
      if (stillMounted.current && typeof attendanceRegistry.refresh === "function" && typeof attendanceRegistry.getById === "function") {
        setEditScope({ meetingId, values: {} });
      }
      return stillMounted.current;
    } catch (cause) {
      if (stillMounted.current) setAttendanceError(
        cause instanceof Error ? cause.message : "Attendance could not be saved. Meeting was not started."
      );
      return false;
    } finally {
      attendanceSaveInFlight.current = false;
      if (stillMounted.current) setSavingAttendance(false);
    }
  }, [attendanceMap, myLinks, meetingId, meeting, resolveUser, attendanceItems, addAttendanceRec, updateAttendanceRec, sourceError, edits, persisted.values, baselineFor, attendanceRegistry]);

  const startAfterAttendanceSave = async () => {
    if (attendanceSaveInFlight.current || startRequested.current || sourceError) return;
    // The same readiness blockers apply to every start attempt, not just to
    // the disabled state of the button.
    if (hasCriticalBlocker && (!showOverride || !overrideReason.trim())) return;
    const requested = attendanceMap;
    const editVersion = attendanceEditVersion.current;
    startRequested.current = true;
    let started = false;
    try {
      if (!await saveAttendance()) return;
      if (!stillMounted.current || attendanceEditVersion.current !== editVersion ||
          JSON.stringify(latestAttendance.current) !== JSON.stringify(requested)) return;
      const result = await onStartMeeting(requested);
      if (result === false) {
        throw new Error("Meeting was not started. Review the error and retry.");
      }
      started = true;
      setStartingMeeting(true);
    } catch (error) {
      if (stillMounted.current) {
        setStartingMeeting(false);
        setAttendanceError(error instanceof Error
          ? error.message
          : "Meeting start could not be requested. Refresh and retry.");
      }
    } finally {
      // Keep the button guarded after a successful start request until the
      // parent closes the readiness screen; failure paths are retryable.
      if (!started) startRequested.current = false;
    }
  };

  // ── Status color ──────────────────────────────────────────────────────────
  const approvalStatusColor = (s: string) =>
    s === "Scheduled" ? "#3b82f6" : s === "In Progress" ? "#22c55e" : "#94a3b8";

  return (
    <div className="pre-meeting-readiness">

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="pre-meeting-readiness__header">
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
          <div style={{ flex: 1 }}>
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.7rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--muted-foreground)" }}>Pre-Meeting Readiness</p>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.15rem", fontWeight: 700 }}>{meeting?.meeting_title ?? "Board Meeting"}</h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
              <span style={{ fontSize: "0.73rem", color: "var(--muted-foreground)" }}>{meeting?.meeting_id}</span>
              <span style={{ fontSize: "0.73rem", color: "var(--muted-foreground)" }}>·</span>
              <span style={{ fontSize: "0.73rem", color: "var(--muted-foreground)" }}>{meeting?.meeting_date} {meeting?.start_time}</span>
              <span style={{ fontSize: "0.73rem", color: "var(--muted-foreground)" }}>·</span>
              <span style={{ fontSize: "0.73rem", color: "var(--muted-foreground)" }}>{meeting?.mode ?? "In-Person"}</span>
              <span style={{ padding: "0.15rem 0.5rem", borderRadius: 9999, fontSize: "0.68rem", fontWeight: 700, background: `${approvalStatusColor(meeting?.approval_status ?? "")}22`, color: approvalStatusColor(meeting?.approval_status ?? "") }}>
                {meeting?.approval_status ?? "Scheduled"}
              </span>
            </div>
          </div>
          <button type="button" aria-label="Close meeting readiness" onClick={() => { if (!attendanceSaveInFlight.current && !startRequested.current) onClose(); }} disabled={savingAttendance || startingMeeting} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "0.5rem" }}>
            <X size={18} />
          </button>
        </div>

        {/* Blocker/warning chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginTop: "0.75rem" }}>
          {blockers.map((b, i) => <StatusChip key={i} label={b} />)}
          {warnings.map((w, i) => <StatusChip key={`w${i}`} warn label={w} />)}
          {!hasCriticalBlocker && warnings.length === 0 && <StatusChip ok label="Ready to start" />}
        </div>
      </header>

      {/* ── SCROLLABLE BODY ───────────────────────────────────────────────── */}
      <main className="pre-meeting-readiness__body">

        {/* Meeting Setup */}
        <Section title="Meeting Setup" icon={<CheckCircle size={15} />}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <InfoRow label="Board / Committee" value={meeting?.committee ?? ""} />
            <InfoRow label="Chairperson"       value={meeting?.chairperson ?? ""} warn={!meeting?.chairperson} />
            <InfoRow label="Secretary"          value={meeting?.secretary ?? ""}  warn={!meeting?.secretary} />
            <InfoRow label="Organizer"          value={meeting?.organizer ?? ""} />
            <InfoRow label="Mode"               value={meeting?.mode ?? ""} />
            <InfoRow label="Venue"              value={meeting?.venue ?? meeting?.virtual_platform ?? ""} warn={!meeting?.venue && !meeting?.virtual_platform} />
          </div>
        </Section>

        {/* Participants */}
        <Section title="Participants" icon={<Users size={15} />}>
          {/* Summary counts */}
          <div className="pre-meeting-readiness__metrics">
            {[
              { label: "Total Invited",       value: myLinks.length },
              { label: "Checked In",          value: presentCount },
              { label: "Quorum Members",      value: `${quorumPresent}/${quorumLinks.length}` },
              { label: "General Members",     value: `${generalPresent}/${generalLinks.length}` },
              { label: "Leadership Present",  value: `${requiredPresent}/${requiredLinks.length}` },
              { label: "Not Joined",          value: myLinks.filter(l => (attendanceMap[l.user_id] ?? "Not Joined") === "Not Joined").length },
            ].map(({ label, value }) => (
              <div key={label} className="pre-meeting-readiness__metric">
                <p style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>{value}</p>
                <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--muted-foreground)" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Quorum member attendance */}
          {quorumLinks.length > 0 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", margin: "0 0 0.4rem" }}>Quorum Members</p>
              {quorumLinks.map(link => {
                const user   = resolveUser(link.user_id);
                const status = attendanceMap[link.user_id] ?? "Not Joined";
                const isPresent = PRESENT_STATES.includes(status);
                return (
                  <div key={link.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isPresent ? "#22c55e" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: isPresent ? "#fff" : "var(--muted-foreground)", flexShrink: 0 }}>
                      {(user?.name ?? link.user_id).split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name ?? link.user_id}</p>
                      <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--muted-foreground)" }}>
                        {link.participant_type}{link.is_required ? " · Required" : ""}{link.voting_eligible ? " · Voting" : ""}
                      </p>
                    </div>
                    <select
                      value={status}
                      onChange={e => setAttendanceStatus(link.user_id, e.target.value as ReadinessAttendance)}
                      style={{ fontSize: "0.72rem", padding: "0.2rem 0.3rem", borderRadius: 4, border: "1px solid var(--border)", background: "var(--background)", color: "var(--foreground)", cursor: "pointer" }}
                    >
                      {(["Not Joined", "Present", "Temporarily Away", "Excused", "Recused"] as ReadinessAttendance[]).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

          {/* General member attendance */}
          {generalLinks.length > 0 && (
            <div>
              <p style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted-foreground)", margin: "0.5rem 0 0.4rem" }}>General Members</p>
              {generalLinks.map(link => {
                const user   = resolveUser(link.user_id);
                const status = attendanceMap[link.user_id] ?? "Not Joined";
                const isPresent = PRESENT_STATES.includes(status);
                return (
                  <div key={link.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.35rem 0", borderBottom: "1px solid var(--border)" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: isPresent ? "#3b82f6" : "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, color: isPresent ? "#fff" : "var(--muted-foreground)", flexShrink: 0 }}>
                      {(user?.name ?? link.user_id).split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: "0.78rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.name ?? link.user_id}</p>
                      <p style={{ margin: 0, fontSize: "0.65rem", color: "var(--muted-foreground)" }}>{link.participant_type}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleAttendance(link.user_id)}
                      style={{ padding: "0.2rem 0.5rem", borderRadius: 4, background: isPresent ? "#14532d" : "var(--muted)", color: isPresent ? "#22c55e" : "var(--muted-foreground)", border: "none", cursor: "pointer", fontSize: "0.68rem", fontWeight: 600 }}
                    >
                      {isPresent ? "Present" : "Not Joined"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {myLinks.length === 0 && (
            <p style={{ fontSize: "0.78rem", color: "var(--muted-foreground)", padding: "0.5rem 0" }}>No participants linked to this meeting yet.</p>
          )}
        </Section>

        {/* Quorum */}
        <Section title="Quorum" icon={<CheckCircle size={15} />} defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            <InfoRow label="Quorum Rule"    value={quorumResult.status !== "not_configured" ? `Min. ${quorumResult.requiredCount} members${quorumResult.requiredPercent > 0 ? ` (${quorumResult.requiredPercent}%)` : ""}` : "Not Configured"} warn={quorumResult.status === "not_configured"} />
            <InfoRow label="Required Count" value={quorumResult.requiredCount > 0 ? String(quorumResult.requiredCount) : "—"} />
            <InfoRow label="Present Eligible" value={`${quorumResult.eligibleCount}${quorumResult.requiredCount > 0 ? ` / ${quorumResult.requiredCount}` : ""}`} />
            {quorumResult.requiredRoles.length > 0 && (
              <InfoRow label="Required Roles" value={quorumResult.requiredRoles.join(", ")} warn={quorumResult.missingRoles.length > 0} />
            )}
          </div>
          <div style={{ marginTop: "0.6rem" }}>
            <StatusChip
              ok={quorumResult.status === "expected"}
              warn={quorumResult.status === "at_risk"}
              label={quorumStatusLabel(quorumResult)}
            />
          </div>
          {quorumResult.reasons.length > 0 && (
            <ul style={{ margin: "0.5rem 0 0", padding: "0 0 0 1.2rem", fontSize: "0.75rem", color: "var(--muted-foreground)" }}>
              {quorumResult.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          )}
        </Section>

        {/* Agendas */}
        <Section title="Agendas" icon={<Layers size={15} />} defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <InfoRow label="Linked Agendas"  value={String(linkedAgendaCount)} />
            <InfoRow label="Agenda Documents" value={String(linkedDocIds.size)} />
          </div>
          {linkedAgendaCount === 0 && (
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.75rem", color: "#f59e0b" }}>No agenda attached (optional). You can start without one.</p>
          )}
        </Section>

        {/* Documents */}
        <Section title="Documents" icon={<FileText size={15} />} defaultOpen={false}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <InfoRow label="Total Documents"    value={String(linkedDocs.length)} />
            <InfoRow label="Missing Content"    value={String(missingDocContent.length)} warn={missingDocContent.length > 0} />
          </div>
          {missingDocContent.length > 0 && (
            <ul style={{ margin: "0.4rem 0 0", padding: "0 0 0 1.2rem", fontSize: "0.75rem", color: "#f59e0b" }}>
              {missingDocContent.map(d => <li key={d.id}>{d.doc_name ?? d.id}</li>)}
            </ul>
          )}
        </Section>

        {/* Override reason (only when blockers exist) */}
        {hasCriticalBlocker && (
          <div style={{ padding: "0.75rem 1rem", borderRadius: 8, background: "#7f1d1d22", border: "1px solid #ef444444" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.4rem" }}>
              <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#ef4444" }}>
                ⛔ Critical blockers must be resolved before starting
              </p>
              <button type="button" onClick={() => setShowOverride(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "0.72rem", color: "#ef4444", textDecoration: "underline" }}>
                {showOverride ? "Hide override" : "Override (requires reason)"}
              </button>
            </div>
            {blockers.map((b, i) => <p key={i} style={{ margin: "0.1rem 0", fontSize: "0.75rem", color: "#fca5a5" }}>• {b}</p>)}
            {showOverride && (
              <div style={{ marginTop: "0.6rem" }}>
                <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, marginBottom: "0.3rem", color: "#ef4444" }}>
                  Reason for override (required) *
                </label>
                <textarea
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="Explain why you are proceeding despite the blockers…"
                  style={{ width: "100%", minHeight: 60, padding: "0.4rem 0.5rem", borderRadius: 6, border: "1px solid #ef4444", background: "var(--background)", color: "var(--foreground)", fontSize: "0.78rem", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="pre-meeting-readiness__footer">
        <SecondaryButton onClick={onClose} disabled={savingAttendance || startingMeeting}>Close</SecondaryButton>
        <div className="pre-meeting-readiness__footer-actions">
          {(attendanceError || sourceError) && <span role="alert" style={{ fontSize: "0.72rem", color: "#ef4444", maxWidth: 320 }}>{attendanceError || sourceError}</span>}
          <SecondaryButton onClick={() => {
            if (sourceError) { void Promise.all(sourceRows.map(source => source.refresh?.())).catch(() => setAttendanceError("Readiness refresh failed. Retry.")); return; }
            void saveAttendance();
          }} disabled={savingAttendance || startingMeeting || sourceLoading}>
            {savingAttendance ? "Saving…" : "Save Attendance"}
          </SecondaryButton>
          <PrimaryButton
            onClick={() => { void startAfterAttendanceSave(); }}
            disabled={savingAttendance || startingMeeting || Boolean(sourceError) || (hasCriticalBlocker && (!showOverride || !overrideReason.trim()))}
            title={hasCriticalBlocker && !showOverride ? "Resolve blockers or provide an override reason" : undefined}
          >
            {savingAttendance ? "Saving attendance…" : startingMeeting ? "Starting meeting…" : "Start Meeting"}
          </PrimaryButton>
        </div>
      </footer>
    </div>
  );
}
