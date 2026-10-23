import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import {
  ArrowLeft, Users, Calendar, FileText, Mic, Video,
  MessageSquare, Vote, CheckSquare, BookOpen, Clock,
  AlertCircle, CheckCircle, RefreshCw,
} from "lucide-react";
import {
  useMeetingRegistry,
  useParticipantRegistry,
  useAttendanceRegistry,
  useQuorumEventRegistry,
  useAgendaRegistry,
  useMeetingAgendaLinkRegistry,
  useAgendaDocumentLinkRegistry,
  useDocumentRegistry,
  useMotionRegistry,
  useVoteRegistry,
  useDecisionRegistry,
  useResolutionRegistry,
  useActionItemRegistry,
  useMinutesRegistry,
  useAuditEventRegistry,
  useMeetingInteractionRegistry,
  useLiveMeetingSessionRegistry,
} from "../../data/boardMeetingData";

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { dateStyle: "medium" });
}

function StatusPill({ value }: { value?: string }) {
  if (!value) return null;
  const color: Record<string, string> = {
    Approved: "#22c55e", Completed: "#22c55e", Signed: "#22c55e", "Minutes Approved": "#22c55e",
    "Met": "#22c55e", Passed: "#22c55e",
    "In Progress": "#3b82f6", "Awaiting Minutes": "#f59e0b",
    Rejected: "#ef4444", "Not Met": "#ef4444", Failed: "#ef4444",
    "Revision Requested": "#f59e0b", Abstained: "#f59e0b",
    Draft: "#94a3b8", Pending: "#94a3b8", "Pending Review": "#f59e0b",
    Archived: "#6b7280",
  };
  const bg = color[value] ?? "#94a3b8";
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 999,
      fontSize: "0.7rem", fontWeight: 600, background: bg + "22", color: bg,
      border: `1px solid ${bg}44`,
    }}>
      {value}
    </span>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 2rem", color: "var(--color-muted-foreground)" }}>
      <Icon size={40} style={{ margin: "0 auto 1rem", opacity: 0.4, display: "block" }} />
      <p style={{ fontSize: "0.9rem" }}>{message}</p>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "1.25rem", marginBottom: "1rem" }}>
      <h3 style={{ fontSize: "0.78rem", fontWeight: 700, color: "var(--color-muted-foreground)", marginBottom: "0.85rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</h3>
      {children}
    </div>
  );
}

function KV({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.4rem", fontSize: "0.82rem" }}>
      <span style={{ color: "var(--color-muted-foreground)", minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "var(--color-foreground)", fontWeight: 500 }}>{value ?? "—"}</span>
    </div>
  );
}

function TH({ children }: { children: string }) {
  return <th style={{ padding: "0.5rem", textAlign: "left", color: "var(--color-muted-foreground)", fontWeight: 600, fontSize: "0.78rem", borderBottom: "1px solid var(--color-border)" }}>{children}</th>;
}

function TD({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <td style={{ padding: "0.5rem", fontSize: "0.82rem", borderBottom: "1px solid var(--color-border)", ...style }}>{children}</td>;
}

// ── tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  { id: "overview",       label: "Overview",                icon: FileText },
  { id: "participants",   label: "Participants",            icon: Users },
  { id: "quorum",         label: "Quorum History",          icon: AlertCircle },
  { id: "agenda",         label: "Agenda & Documents",      icon: BookOpen },
  { id: "transcription",  label: "Transcription",           icon: Mic },
  { id: "recording",      label: "Recording",               icon: Video },
  { id: "chat",           label: "Chat & Interactions",     icon: MessageSquare },
  { id: "motions",        label: "Motions & Votes",         icon: Vote },
  { id: "decisions",      label: "Decisions & Actions",     icon: CheckSquare },
  { id: "temp_agendas",   label: "Temporary Agendas",       icon: AlertCircle },
  { id: "minutes",        label: "Minutes",                 icon: FileText },
  { id: "audit",          label: "Audit History",           icon: Clock },
] as const;

type TabId = typeof TABS[number]["id"];

// ── page ──────────────────────────────────────────────────────────────────────

export function MeetingRecordPage() {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [editMinutesId, setEditMinutesId] = useState<string | null>(null);
  const [tempAgendaParent, setTempAgendaParent] = useState<Record<string, string>>({});

  const meetingReg     = useMeetingRegistry();
  const participantReg = useParticipantRegistry();
  const attendanceReg  = useAttendanceRegistry();
  const quorumEventReg = useQuorumEventRegistry();
  const agendaReg      = useAgendaRegistry();
  const agendaLinks    = useMeetingAgendaLinkRegistry();
  const agendaDocLinks = useAgendaDocumentLinkRegistry();
  const documentReg    = useDocumentRegistry();
  const motionReg      = useMotionRegistry();
  const voteReg        = useVoteRegistry();
  const decisionReg    = useDecisionRegistry();
  const resolutionReg  = useResolutionRegistry();
  const actionReg      = useActionItemRegistry();
  const minutesReg     = useMinutesRegistry();
  const auditReg       = useAuditEventRegistry();
  const interactionReg = useMeetingInteractionRegistry();
  const sessionReg     = useLiveMeetingSessionRegistry();

  const meeting = meetingReg.items.find(m => m.id === meetingId || m.meeting_id === meetingId);

  if (!meeting) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <AlertCircle size={48} style={{ margin: "0 auto 1rem", color: "#ef4444", display: "block" }} />
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, marginBottom: "0.5rem" }}>Meeting Not Found</h2>
        <p style={{ color: "var(--color-muted-foreground)", marginBottom: "1.5rem" }}>
          No meeting record found for ID: {meetingId}
        </p>
        <button onClick={() => navigate(-1)} style={{ padding: "0.5rem 1.25rem", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer" }}>
          Go Back
        </button>
      </div>
    );
  }

  const mid = meeting.meeting_id ?? meeting.id;

  const linkedAgendaIds   = agendaLinks.items.filter(l => l.meeting_id === mid).map(l => l.agenda_id);
  const meetingAgendas    = agendaReg.items.filter(a => linkedAgendaIds.includes(a.id));
  // Temporary agendas: created during live meeting and marked pending approval
  const tempAgendas       = agendaReg.items.filter(a => a.meeting_id === mid && (a as { is_temporary?: boolean }).is_temporary);
  const meetingParticipants = participantReg.items.filter(p => p.meeting_id === mid);
  const meetingAttendance = attendanceReg.items.filter(a => a.meeting_id === mid);
  const meetingQuorumEvts = quorumEventReg.items.filter(q => q.meeting_id === mid);
  const meetingMotions    = motionReg.items.filter(m => m.meeting_id === mid);
  const meetingVotes      = voteReg.items.filter(v => v.meeting_id === mid);
  const meetingDecisions  = decisionReg.items.filter(d => d.meeting_id === mid || d.source_meeting === mid);
  const meetingResolutions = resolutionReg.items.filter(r => r.meeting_id === mid || r.source_meeting === mid);
  const meetingActions    = actionReg.items.filter(a => a.meeting_id === mid || a.source_meeting === mid);
  const meetingMinutes    = minutesReg.items.filter(m => m.meeting_id === mid);
  const meetingAudit      = auditReg.items.filter(a => a.meeting_id === mid);
  const meetingInteractions = interactionReg.items.filter(i => i.meeting_id === mid);
  const meetingSessions   = sessionReg.items.filter(s => s.meeting_id === mid);

  // Group votes by motion
  const votesByMotion: Record<string, typeof meetingVotes> = {};
  meetingVotes.forEach(v => {
    const key = v.motion_id;
    if (!votesByMotion[key]) votesByMotion[key] = [];
    votesByMotion[key].push(v);
  });

  // ── tab renderers ───────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
      <SectionCard title="Meeting Information">
        <KV label="Meeting ID"    value={meeting.meeting_id} />
        <KV label="Title"         value={meeting.meeting_title} />
        <KV label="Committee"     value={meeting.committee} />
        <KV label="Meeting Type"  value={meeting.meeting_type} />
        <KV label="Status"        value={meeting.approval_status} />
        <KV label="Date"          value={fmtDate(meeting.meeting_date)} />
        <KV label="Start / End"   value={`${meeting.start_time ?? "—"} — ${meeting.end_time ?? "—"}`} />
        <KV label="Mode"          value={meeting.meeting_mode} />
        <KV label="Venue"         value={meeting.venue} />
      </SectionCard>
      <SectionCard title="Governance">
        <KV label="Chairperson"       value={meeting.chairperson} />
        <KV label="Secretary"         value={meeting.company_secretary} />
        <KV label="Governance Body"   value={meeting.governance_body} />
        <KV label="Participants"      value={meeting.participant_count} />
        <KV label="Quorum Required"   value={meeting.quorum_required} />
        <KV label="Agenda Items"      value={String(meetingAgendas.length)} />
        <KV label="Minutes Records"   value={String(meetingMinutes.length)} />
        <KV label="Decisions"         value={String(meetingDecisions.length)} />
        <KV label="Actions"           value={String(meetingActions.length)} />
      </SectionCard>
      {meetingSessions.length > 0 && (
        <SectionCard title="Live Session">
          {meetingSessions.map(s => (
            <div key={s.id}>
              <KV label="Session Status"    value={s.session_status} />
              <KV label="Recording"         value={s.recording_status} />
              <KV label="Transcription"     value={s.transcription_status} />
              <KV label="Started By"        value={s.started_by} />
              <KV label="Started At"        value={fmt(s.started_at)} />
              <KV label="Ended At"          value={fmt(s.ended_at)} />
            </div>
          ))}
        </SectionCard>
      )}
    </div>
  );

  const renderParticipants = () => (
    <>
      <SectionCard title={`Participants (${meetingParticipants.length})`}>
        {meetingParticipants.length === 0 ? (
          <EmptyState icon={Users} message="No participant records linked to this meeting." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>Name</TH><TH>Role</TH><TH>Designation</TH><TH>RSVP</TH><TH>Attendance</TH><TH>Joined</TH><TH>Left</TH></tr></thead>
            <tbody>
              {meetingParticipants.map(p => (
                <tr key={p.id}>
                  <TD>{p.name}</TD>
                  <TD>{p.role}</TD>
                  <TD>{p.designation}</TD>
                  <TD><StatusPill value={p.rsvp_status} /></TD>
                  <TD><StatusPill value={p.attendance_status} /></TD>
                  <TD>{fmt(p.joined_at)}</TD>
                  <TD>{fmt(p.left_at)}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
      <SectionCard title={`Attendance Records (${meetingAttendance.length})`}>
        {meetingAttendance.length === 0 ? (
          <EmptyState icon={Users} message="No attendance records for this meeting." />
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead><tr><TH>Participant</TH><TH>Mode</TH><TH>Check-In</TH><TH>Check-Out</TH><TH>Quorum Eligible</TH><TH>Signed</TH></tr></thead>
            <tbody>
              {meetingAttendance.map(a => (
                <tr key={a.id}>
                  <TD>{a.participant_name}</TD>
                  <TD>{a.attendance_mode}</TD>
                  <TD>{fmt(a.check_in_time)}</TD>
                  <TD>{fmt(a.check_out_time)}</TD>
                  <TD>{a.quorum_eligible}</TD>
                  <TD>{a.signed}</TD>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );

  const renderQuorum = () => (
    <SectionCard title={`Quorum Events (${meetingQuorumEvts.length})`}>
      {meetingQuorumEvts.length === 0 ? (
        <EmptyState icon={AlertCircle} message="No quorum events recorded for this meeting." />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH>Recorded At</TH><TH>Event Type</TH><TH>Present</TH><TH>Required</TH><TH>Quorum Met</TH><TH>Recorded By</TH></tr></thead>
          <tbody>
            {meetingQuorumEvts.map(q => (
              <tr key={q.id}>
                <TD>{fmt(q.recorded_at)}</TD>
                <TD>{q.event_type}</TD>
                <TD>{q.quorum_present}</TD>
                <TD>{q.quorum_required}</TD>
                <TD><StatusPill value={q.quorum_met === "Yes" ? "Met" : "Not Met"} /></TD>
                <TD>{q.recorded_by}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );

  const renderAgenda = () => (
    <>
      {meetingAgendas.length === 0 ? (
        <EmptyState icon={BookOpen} message="No agendas linked to this meeting." />
      ) : meetingAgendas.map(a => {
        const docIds = agendaDocLinks.items.filter(l => l.agenda_id === a.id).map(l => l.document_id);
        const docs = documentReg.items.filter(d => docIds.includes(d.id));
        return (
          <SectionCard key={a.id} title={a.agenda_title}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
              <div>
                <KV label="Agenda ID"    value={a.agenda_id} />
                <KV label="Status"       value={a.approval_status} />
                <KV label="Category"     value={a.agenda_category} />
                <KV label="Purpose"      value={a.purpose} />
              </div>
              <div>
                <KV label="Submitted By" value={a.submitted_by} />
                <KV label="Duration"     value={a.estimated_duration} />
                <KV label="Voting Req."  value={a.voting_required} />
                <KV label="Priority"     value={a.priority} />
              </div>
            </div>
            {docs.length > 0 && (
              <div>
                <p style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--color-muted-foreground)", marginBottom: "0.4rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Attached Documents</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {docs.map(d => (
                    <span key={d.id} style={{ fontSize: "0.75rem", padding: "2px 10px", borderRadius: 6, background: "var(--color-muted)", border: "1px solid var(--color-border)" }}>
                      {d.document_title ?? d.file_name ?? d.id}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
        );
      })}
    </>
  );

  const renderTranscription = () => {
    const transcriptItems = meetingInteractions.filter(i => i.interaction_type === "comment");
    return (
      <SectionCard title={`Transcription Segments (${transcriptItems.length})`}>
        {transcriptItems.length === 0 ? (
          <EmptyState icon={Mic} message="No transcription data captured for this meeting." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {transcriptItems.map(t => (
              <div key={t.id} style={{ padding: "0.6rem 0.8rem", borderRadius: 8, background: "var(--color-muted)", fontSize: "0.82rem" }}>
                <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 600 }}>{t.user_id}</span>
                  <span style={{ color: "var(--color-muted-foreground)", fontSize: "0.75rem" }}>{fmt(t.created_at as string | undefined)}</span>
                </div>
                <p style={{ margin: 0 }}>{t.content ?? "—"}</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    );
  };

  const renderRecording = () => (
    <SectionCard title="Recording Records">
      {meetingSessions.length === 0 ? (
        <EmptyState icon={Video} message="No live session or recording data for this meeting." />
      ) : meetingSessions.map(s => (
        <div key={s.id}>
          <KV label="Session Status"       value={s.session_status} />
          <KV label="Recording Status"     value={s.recording_status} />
          <KV label="Transcription Status" value={s.transcription_status} />
          <KV label="Minutes Capture"      value={s.minutes_capture_status} />
          <KV label="Started By"           value={s.started_by} />
          <KV label="Started At"           value={fmt(s.started_at)} />
          <KV label="Ended By"             value={s.ended_by} />
          <KV label="Ended At"             value={fmt(s.ended_at)} />
        </div>
      ))}
    </SectionCard>
  );

  const renderChat = () => {
    const chatItems = meetingInteractions.filter(i => i.interaction_type === "chat");
    const otherItems = meetingInteractions.filter(i => i.interaction_type !== "chat" && i.interaction_type !== "comment");
    return (
      <>
        <SectionCard title={`Chat Messages (${chatItems.length})`}>
          {chatItems.length === 0 ? (
            <EmptyState icon={MessageSquare} message="No chat messages recorded for this meeting." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              {chatItems.map(c => (
                <div key={c.id} style={{ display: "flex", gap: "0.75rem", fontSize: "0.82rem", padding: "0.5rem 0", borderBottom: "1px solid var(--color-border)" }}>
                  <span style={{ fontWeight: 600, minWidth: 140, flexShrink: 0 }}>{c.user_id}</span>
                  <span style={{ flex: 1, color: "var(--color-foreground)" }}>{c.content}</span>
                  <span style={{ color: "var(--color-muted-foreground)", fontSize: "0.72rem", whiteSpace: "nowrap" }}>{fmt(c.created_at as string | undefined)}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
        <SectionCard title={`Interaction Log (${otherItems.length})`}>
          {otherItems.length === 0 ? (
            <EmptyState icon={Clock} message="No interaction events recorded." />
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><TH>Time</TH><TH>User</TH><TH>Type</TH><TH>Detail</TH></tr></thead>
              <tbody>
                {otherItems.map(i => (
                  <tr key={i.id}>
                    <TD>{fmt(i.created_at as string | undefined)}</TD>
                    <TD>{i.user_id}</TD>
                    <TD>{i.interaction_type.replace(/_/g, " ")}</TD>
                    <TD>{i.content ?? "—"}</TD>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </>
    );
  };

  const renderMotions = () => {
    if (meetingMotions.length === 0 && meetingVotes.length === 0) {
      return <EmptyState icon={Vote} message="No motions recorded for this meeting." />;
    }
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {meetingMotions.length === 0 ? (
          <EmptyState icon={Vote} message="No motions recorded for this meeting." />
        ) : meetingMotions.map(motion => {
          const votes = votesByMotion[motion.id] ?? [];
          const forCount     = parseInt(motion.votes_for)    || votes.filter(v => v.vote === "For").length;
          const againstCount = parseInt(motion.votes_against) || votes.filter(v => v.vote === "Against").length;
          const abstainCount = parseInt(motion.abstentions)  || votes.filter(v => v.vote === "Abstain" || v.vote === "Abstained").length;
          const total        = forCount + againstCount + abstainCount || 1;
          const passed = motion.status === "Passed";
          const rejected = motion.status === "Rejected" || motion.status === "Failed";

          return (
            <SectionCard key={motion.id} title={motion.motion_id ?? motion.id}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", marginBottom: "0.75rem" }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.95rem", fontWeight: 700, color: "var(--color-foreground)" }}>{motion.motion_title}</p>
                  {motion.motion_text && (
                    <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-muted-foreground)", lineHeight: 1.5 }}>{motion.motion_text}</p>
                  )}
                </div>
                <StatusPill value={motion.status} />
              </div>

              {/* Meta grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.25rem 1.5rem", marginBottom: "1rem" }}>
                <KV label="Proposed By"  value={motion.proposed_by} />
                <KV label="Seconded By"  value={motion.seconded_by || "—"} />
                <KV label="Agenda Item"  value={motion.agenda_item || "—"} />
                <KV label="Recorded At"  value={fmt(motion.created_at)} />
              </div>

              {/* Vote progress */}
              <div style={{ background: "var(--color-muted)", borderRadius: 8, padding: "0.85rem 1rem", marginBottom: votes.length > 0 ? "0.85rem" : 0 }}>
                <p style={{ margin: "0 0 0.65rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-muted-foreground)" }}>
                  Vote Results — {forCount + againstCount + abstainCount} vote{forCount + againstCount + abstainCount !== 1 ? "s" : ""} cast
                </p>
                {[
                  { label: "For",     count: forCount,     color: "#22c55e" },
                  { label: "Against", count: againstCount, color: "#ef4444" },
                  { label: "Abstain", count: abstainCount, color: "#94a3b8" },
                ].map(({ label, count, color }) => {
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: "0.65rem", marginBottom: "0.4rem" }}>
                      <span style={{ minWidth: 52, fontSize: "0.75rem", fontWeight: 600, color }}>{label}</span>
                      <div style={{ flex: 1, height: 7, borderRadius: 999, background: "var(--color-border)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999 }} />
                      </div>
                      <span style={{ minWidth: 20, fontSize: "0.78rem", fontWeight: 700, color, textAlign: "right" }}>{count}</span>
                      <span style={{ minWidth: 36, fontSize: "0.7rem", color: "var(--color-muted-foreground)", textAlign: "right" }}>{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
                {(passed || rejected) && (
                  <div style={{ marginTop: "0.6rem", paddingTop: "0.6rem", borderTop: "1px solid var(--color-border)" }}>
                    <span style={{ fontSize: "0.8rem", fontWeight: 700, color: passed ? "#22c55e" : "#ef4444" }}>
                      {passed ? "✓ Motion Passed" : "✗ Motion Rejected"}
                    </span>
                  </div>
                )}
              </div>

              {/* Individual voter breakdown */}
              {votes.length > 0 && (
                <div>
                  <p style={{ margin: "0 0 0.5rem", fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "var(--color-muted-foreground)" }}>
                    Individual Votes ({votes.length})
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "0.35rem" }}>
                    {votes.map(v => {
                      const vc = v.vote === "For" ? "#22c55e" : v.vote === "Against" ? "#ef4444" : "#94a3b8";
                      return (
                        <div key={v.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.3rem 0.55rem", borderRadius: 6, background: `${vc}11`, border: `1px solid ${vc}33` }}>
                          <span style={{ flex: 1, fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.voter_name}</span>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: vc, flexShrink: 0 }}>{v.vote}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </SectionCard>
          );
        })}
      </div>
    );
  };

  const renderDecisions = () => (
    <>
      <SectionCard title={`Decisions (${meetingDecisions.length})`}>
        {meetingDecisions.length === 0 ? (
          <EmptyState icon={CheckSquare} message="No decisions recorded." />
        ) : meetingDecisions.map(d => (
          <div key={d.id} style={{ padding: "0.6rem 0", borderBottom: "1px solid var(--color-border)", fontSize: "0.82rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{d.decision_title}</div>
            <div style={{ display: "flex", gap: "1rem", color: "var(--color-muted-foreground)" }}>
              <span>Ref: {d.decision_reference}</span>
              <span>By: {d.decided_by}</span>
              <StatusPill value={d.approval_status} />
            </div>
          </div>
        ))}
      </SectionCard>
      <SectionCard title={`Resolutions (${meetingResolutions.length})`}>
        {meetingResolutions.length === 0 ? (
          <EmptyState icon={CheckCircle} message="No resolutions recorded." />
        ) : meetingResolutions.map(r => (
          <div key={r.id} style={{ padding: "0.6rem 0", borderBottom: "1px solid var(--color-border)", fontSize: "0.82rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{r.resolution_title}</div>
            <div style={{ display: "flex", gap: "1rem", color: "var(--color-muted-foreground)" }}>
              <span>Ref: {r.resolution_reference}</span>
              <StatusPill value={r.approval_status} />
            </div>
          </div>
        ))}
      </SectionCard>
      <SectionCard title={`Action Items (${meetingActions.length})`}>
        {meetingActions.length === 0 ? (
          <EmptyState icon={CheckSquare} message="No action items recorded." />
        ) : meetingActions.map(a => (
          <div key={a.id} style={{ padding: "0.6rem 0", borderBottom: "1px solid var(--color-border)", fontSize: "0.82rem" }}>
            <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{a.action_title}</div>
            <div style={{ display: "flex", gap: "1rem", color: "var(--color-muted-foreground)" }}>
              <span>Assigned: {a.assigned_to}</span>
              <span>Due: {fmtDate(a.due_date)}</span>
              <StatusPill value={a.action_status} />
            </div>
          </div>
        ))}
      </SectionCard>
    </>
  );

  const renderMinutes = () => (
    <>
      {meetingMinutes.length === 0 ? (
        <EmptyState icon={FileText} message="No minutes records found for this meeting." />
      ) : meetingMinutes.map(m => (
        <SectionCard key={m.id} title={`${m.minutes_id} — Version ${m.version ?? "1.0"}`}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
            <div>
              <KV label="Meeting"     value={m.meeting_title} />
              <KV label="Taker"       value={m.minute_taker || "—"} />
              <KV label="Created"     value={fmt(m.created_at)} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
              <StatusPill value={m.approval_status} />
              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                {m.approval_status !== "Signed" && m.approval_status !== "Archived" && (
                  <>
                    <button
                      onClick={() => { minutesReg.update(m.id, { approval_status: "Signed" }); toast.success("Minutes signed and approved."); }}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <CheckCircle size={12} /> Sign & Approve
                    </button>
                    <button
                      onClick={() => { minutesReg.update(m.id, { approval_status: "Revision Requested" }); toast.info("Revision requested."); }}
                      style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                    >
                      <RefreshCw size={12} /> Request Revision
                    </button>
                  </>
                )}
                {m.approval_status === "Signed" && (
                  <button
                    onClick={() => {
                      minutesReg.update(m.id, { approval_status: "Archived" });
                      meetingReg.update(mid, { approval_status: "Minutes Approved" });
                      toast.success("Minutes archived. Meeting marked as Minutes Approved.");
                    }}
                    style={{ padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", background: "#6b728022", color: "#6b7280", border: "1px solid #6b728044", cursor: "pointer" }}
                  >
                    Archive
                  </button>
                )}
              </div>
            </div>
          </div>
          {editMinutesId === m.id ? (
            <div>
              <textarea
                defaultValue={m.discussion_summary ?? m.quorum_statement ?? ""}
                id={`min-edit-${m.id}`}
                rows={12}
                style={{ width: "100%", fontFamily: "monospace", fontSize: "0.78rem", borderRadius: 6, padding: "0.5rem", background: "var(--color-muted)", border: "1px solid var(--color-border)", color: "var(--color-foreground)", resize: "vertical", boxSizing: "border-box" }}
              />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem" }}>
                <button
                  onClick={() => {
                    const el = document.getElementById(`min-edit-${m.id}`) as HTMLTextAreaElement | null;
                    if (el) { minutesReg.update(m.id, { discussion_summary: el.value }); toast.success("Minutes content updated."); }
                    setEditMinutesId(null);
                  }}
                  style={{ padding: "4px 14px", borderRadius: 6, fontSize: "0.8rem", background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer" }}
                >
                  Save
                </button>
                <button onClick={() => setEditMinutesId(null)} style={{ padding: "4px 14px", borderRadius: 6, fontSize: "0.8rem", background: "var(--color-muted)", color: "var(--color-foreground)", border: "1px solid var(--color-border)", cursor: "pointer" }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <pre style={{ fontSize: "0.78rem", whiteSpace: "pre-wrap", background: "var(--color-muted)", borderRadius: 6, padding: "0.75rem", maxHeight: 320, overflowY: "auto", color: "var(--color-foreground)", lineHeight: 1.6 }}>
                {m.discussion_summary || m.quorum_statement || "No content captured."}
              </pre>
              <button
                onClick={() => setEditMinutesId(m.id)}
                style={{ marginTop: "0.5rem", padding: "4px 10px", borderRadius: 6, fontSize: "0.75rem", background: "var(--color-muted)", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)", cursor: "pointer" }}
              >
                Edit Minutes
              </button>
            </div>
          )}
        </SectionCard>
      ))}
    </>
  );

  const renderAudit = () => (
    <SectionCard title={`Audit Events (${meetingAudit.length})`}>
      {meetingAudit.length === 0 ? (
        <EmptyState icon={Clock} message="No audit events recorded for this meeting." />
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead><tr><TH>Time</TH><TH>Actor</TH><TH>Action</TH><TH>Entity</TH><TH>Detail</TH></tr></thead>
          <tbody>
            {meetingAudit.map(a => (
              <tr key={a.id}>
                <TD>{fmt(a.timestamp)}</TD>
                <TD>{a.actor}</TD>
                <TD>{a.action}</TD>
                <TD>{a.entity_type}</TD>
                <TD>{a.details ?? "—"}</TD>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );

  const renderTempAgendas = () => (
    <SectionCard title={`Temporary Agendas (${tempAgendas.length})`}>
      {tempAgendas.length === 0 ? (
        <EmptyState icon={AlertCircle} message="No temporary agendas were created during this meeting." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {tempAgendas.map(a => {
            const status = a.approval_status ?? "Pending Approval";
            const parentOptions = agendaReg.items
              .filter(p => p.id !== a.id && !(p as { is_temporary?: boolean }).is_temporary && (p.approval_status === "Approved" || p.approval_status === "Pending Approval"))
              .map(p => ({ id: p.id, label: (p as { agenda_title?: string }).agenda_title ?? p.agenda_id }));
            const canAct = status === "Pending Approval" || status === "Pending Review";
            return (
              <div key={a.id} style={{ border: "1px solid var(--color-border)", borderRadius: 8, padding: "0.85rem 1rem", background: "var(--color-card)" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-foreground)" }}>
                        {(a as { agenda_title?: string }).agenda_title ?? a.agenda_id}
                      </span>
                      <StatusPill value={status} />
                    </div>
                    {(a as { description?: string }).description && (
                      <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "var(--color-muted-foreground)" }}>
                        {(a as { description?: string }).description}
                      </p>
                    )}
                    {status === "Approved" && (
                      <div style={{ marginTop: "0.5rem" }}>
                        <label style={{ fontSize: "0.75rem", fontWeight: 600, display: "block", marginBottom: "0.25rem" }}>Place under parent agenda:</label>
                        <select
                          value={tempAgendaParent[a.id] ?? ""}
                          onChange={e => setTempAgendaParent(p => ({ ...p, [a.id]: e.target.value }))}
                          style={{ padding: "0.3rem 0.5rem", fontSize: "0.8rem", borderRadius: 6, border: "1px solid var(--color-border)", background: "var(--color-background)", color: "var(--color-foreground)" }}
                        >
                          <option value="">— None (Top Level) —</option>
                          {parentOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                        </select>
                        <button
                          style={{ marginLeft: "0.5rem", padding: "0.3rem 0.75rem", borderRadius: 6, background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.78rem", fontWeight: 600 }}
                          onClick={() => {
                            const parentId = tempAgendaParent[a.id];
                            agendaReg.update(a.id, {
                              is_temporary: false,
                              parent_agenda_id: parentId || undefined,
                              approval_status: "Approved",
                            } as never);
                            toast.success("Temporary agenda promoted to permanent.");
                          }}
                        >
                          Make Permanent
                        </button>
                      </div>
                    )}
                  </div>
                  {canAct && (
                    <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                      <button
                        onClick={() => { agendaReg.update(a.id, { approval_status: "Approved" } as never); toast.success("Temporary agenda approved."); }}
                        style={{ padding: "0.3rem 0.65rem", borderRadius: 6, background: "#22c55e22", color: "#22c55e", border: "1px solid #22c55e44", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        <CheckCircle size={12} /> Approve
                      </button>
                      <button
                        onClick={() => { agendaReg.update(a.id, { approval_status: "Revision Requested" } as never); toast.info("Revision requested."); }}
                        style={{ padding: "0.3rem 0.65rem", borderRadius: 6, background: "#f59e0b22", color: "#f59e0b", border: "1px solid #f59e0b44", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        <RefreshCw size={12} /> Revise
                      </button>
                      <button
                        onClick={() => { agendaReg.update(a.id, { approval_status: "Rejected" } as never); toast.error("Temporary agenda rejected."); }}
                        style={{ padding: "0.3rem 0.65rem", borderRadius: 6, background: "#ef444422", color: "#ef4444", border: "1px solid #ef444444", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}
                      >
                        <AlertCircle size={12} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );

  const tabContent: Record<TabId, React.ReactNode> = {
    overview:      renderOverview(),
    participants:  renderParticipants(),
    quorum:        renderQuorum(),
    agenda:        renderAgenda(),
    transcription: renderTranscription(),
    recording:     renderRecording(),
    chat:          renderChat(),
    motions:       renderMotions(),
    decisions:     renderDecisions(),
    temp_agendas:  renderTempAgendas(),
    minutes:       renderMinutes(),
    audit:         renderAudit(),
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--color-background)" }}>
      {/* Header */}
      <div style={{
        background: "var(--color-card)", borderBottom: "1px solid var(--color-border)",
        padding: "0.85rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem",
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ padding: "6px", borderRadius: 8, background: "transparent", border: "1px solid var(--color-border)", cursor: "pointer", color: "var(--color-foreground)", display: "flex", alignItems: "center" }}
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--color-foreground)" }}>
            {meeting.meeting_title}
          </h1>
          <p style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", margin: 0, display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span>{meeting.meeting_id}</span>
            <span>·</span>
            <span>{meeting.committee}</span>
            <span>·</span>
            <StatusPill value={meeting.approval_status} />
          </p>
        </div>
        <span style={{ fontSize: "0.75rem", color: "var(--color-muted-foreground)", display: "flex", alignItems: "center", gap: "0.3rem" }}>
          <Calendar size={12} />
          {fmtDate(meeting.meeting_date)}
        </span>
      </div>

      {/* Tab bar */}
      <div style={{
        background: "var(--color-card)", borderBottom: "1px solid var(--color-border)",
        overflowX: "auto", display: "flex", padding: "0 1rem",
      }}>
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex", alignItems: "center", gap: "0.3rem",
                padding: "0.65rem 0.85rem", fontSize: "0.76rem",
                fontWeight: isActive ? 700 : 500,
                color: isActive ? "var(--color-primary)" : "var(--color-muted-foreground)",
                background: "transparent", border: "none",
                borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                cursor: "pointer", whiteSpace: "nowrap", transition: "color 0.15s",
              }}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
        {tabContent[activeTab]}
      </div>
    </div>
  );
}
