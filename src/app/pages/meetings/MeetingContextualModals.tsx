/**
 * MeetingContextualModals — all 13 contextual drawer-action modals for meetings.
 *
 * Consumed by OnlineReturnRegisterPage via cfg.onCustomAction.
 * Each modal reads from its own registry; none require navigation.
 */
import { useState, useCallback } from "react";
import {
  Users, UserPlus, UserCheck, RefreshCw, AlertTriangle,
  Calendar, Clock, BarChart2, ListChecks, FileText, Package, Upload,
  CheckCircle2, XCircle, Send, UploadCloud, Scale, FileCheck2,
  ClipboardList, BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { AppModal } from "../../components/modals/AppModal";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { SecondaryButton } from "../../components/buttons/SecondaryButton";
import { UnifiedDataTable } from "../../components/tables";
import { fc, BADGE } from "../modulePageUtils";
import type { TableRow, ColDef } from "../modulePageUtils";
import {
  useParticipantRegistry, useRSVPRegistry, useConflictRegistry,
  useAvailabilityPollRegistry, useDocumentRegistry, useBoardPackRegistry,
  useGovernanceRegistry, useParticipantGroupRegistry, useAgendaRegistry,
  useDecisionRegistry, useResolutionRegistry, useActionItemRegistry,
  useMinutesRegistry,
  generateId,
  MEETING_ROLES, CONFIDENTIALITY_LEVELS, DOCUMENT_TYPES,
} from "../../data/boardMeetingData";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="entry-form__field">
      <label className="entry-form__label">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="entry-form__input" />;
}

function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[] }) {
  return (
    <select {...props} className="entry-form__select">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className="entry-form__textarea" rows={props.rows ?? 3} />;
}

function StatusBadge({ value }: { value: string }) {
  const tone =
    value === "Accepted" || value === "Published" || value === "Active" ? "success" :
    value === "Declined" || value === "Rejected" ? "error" :
    value === "Pending" || value === "Draft" ? "neutral" : "primary";
  return <span className={`status-badge status-badge--${tone}`}>{value}</span>;
}

function EmptyState({ icon: Icon, message }: { icon: React.ComponentType<{ size?: number; className?: string }>; message: string }) {
  return (
    <div className="empty-state" style={{ padding: "2rem 0", textAlign: "center", color: "var(--color-text-secondary)" }}>
      <Icon size={32} className="empty-state__icon" />
      <p style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>{message}</p>
    </div>
  );
}

// ─── Readiness checklist helper ────────────────────────────────────────────────

function buildReadinessItems(meeting: TableRow, participantCount: number, agendaCount: number, documentCount: number, hasBoardPack: boolean, rsvpAccepted: number, quorumRule: string) {
  const totalRequired = parseFloat(quorumRule) / 100;
  const quorumMet = participantCount > 0 && rsvpAccepted / participantCount >= totalRequired;

  return [
    { label: "Meeting title and date set",         done: !!(meeting.meeting_title && meeting.meeting_date) },
    { label: "Governance body assigned",            done: !!meeting.committee },
    { label: "Chairperson confirmed",               done: !!meeting.chairperson },
    { label: "Secretary confirmed",                 done: !!meeting.secretary },
    { label: "Venue / virtual link confirmed",      done: !!(meeting.venue || meeting.virtual_link) },
    { label: `Participants added (${participantCount})`, done: participantCount > 0 },
    { label: "Invitations sent",                    done: rsvpAccepted > 0 || participantCount === 0 },
    { label: `Agenda items added (${agendaCount})`, done: agendaCount > 0 },
    { label: `Documents uploaded (${documentCount})`, done: documentCount > 0 },
    { label: "Board Pack created",                  done: hasBoardPack },
    { label: `Quorum achievable (${rsvpAccepted}/${participantCount})`, done: quorumMet },
  ];
}

// ─── 1. Manage Participants ────────────────────────────────────────────────────

export function ManageParticipantsModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: participants, add, remove } = useParticipantRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const local = participants.filter(p => p.meeting_id === meetingId);

  const [name, setName] = useState("");
  const [role, setRole] = useState("Member");
  const [req, setReq] = useState("Mandatory");

  const handleAdd = useCallback(() => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    const pId = generateId("PRT", participants.map(p => p.participant_id));
    add({
      id: pId, participant_id: pId,
      meeting_id: meetingId,
      meeting_title: String(meeting.meeting_title ?? ""),
      name: name.trim(), designation: "", organization: String(meeting.committee ?? ""),
      role, attendance_requirement: req,
      email: "", phone: "", rsvp_status: "Pending",
      attendance_status: "Not Yet", joined_at: "", left_at: "",
      proxy_for: "", conflict_declared: "No",
      created_at: new Date().toISOString(),
    } as never);
    setName(""); toast.success("Participant added.");
  }, [name, role, req, meetingId, meeting, participants, add]);

  return (
    <AppModal open onClose={onClose} title="Manage Participants" icon={<Users size={16} />} size="lg"
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Add form */}
        <div style={{ padding: "1rem", background: "var(--color-surface)", borderRadius: 8, display: "grid", gridTemplateColumns: "1fr 1fr 1fr auto", gap: "0.75rem", alignItems: "end" }}>
          <Field label="Name / Email">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name or email" />
          </Field>
          <Field label="Meeting Role">
            <Select value={role} onChange={e => setRole(e.target.value)} options={MEETING_ROLES} />
          </Field>
          <Field label="Attendance">
            <Select value={req} onChange={e => setReq(e.target.value)} options={["Mandatory", "Optional", "By Invitation"]} />
          </Field>
          <PrimaryButton onClick={handleAdd}>Add</PrimaryButton>
        </div>

        {/* Participant list */}
        <UnifiedDataTable
          variant="compact"
          cols={[fc("name", "Name"), fc("role", "Role"), fc("attendance_requirement", "Attendance"), BADGE("rsvp_status", "RSVP")]}
          rows={local.map(p => ({ id: p.id, name: p.name, role: p.role, attendance_requirement: p.attendance_requirement, rsvp_status: String(p.rsvp_status ?? "Pending") }))}
          totalCount={local.length}
          actions={[{ id: "remove", label: "Remove", icon: XCircle, color: "var(--color-error)" }]}
          onActionClick={(_id, row) => { remove(String(row.id)); toast.success("Participant removed."); }}
          emptyLabel="No participants added yet."
          aria-label="Participants"
        />
      </div>
    </AppModal>
  );
}

// ─── 2. Send Invitations ───────────────────────────────────────────────────────

export function SendInvitationsModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: participants } = useParticipantRegistry();
  const { items: rsvpRecords, add: addRSVP, update: updateRSVP } = useRSVPRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const local = participants.filter(p => p.meeting_id === meetingId);
  const [sending, setSending] = useState(false);

  const handleSend = useCallback(async () => {
    setSending(true);
    const now = new Date().toISOString();
    local.forEach(p => {
      const existing = rsvpRecords.find(r => r.meeting_id === meetingId && r.participant_id === p.participant_id);
      if (existing) {
        // Already has an RSVP — leave as-is (don't overwrite an accepted response)
      } else {
        const rsvpId = generateId("RSV", rsvpRecords.map(r => r.rsvp_id));
        addRSVP({
          id: rsvpId, rsvp_id: rsvpId,
          meeting_id: meetingId,
          meeting_title: String(meeting.meeting_title ?? ""),
          participant_id: p.participant_id,
          participant_name: p.name,
          response: "Pending",
          response_date: "",
          decline_reason: "", proxy_nominee: "", notes: "",
          created_at: now,
        } as never);
      }
    });
    await new Promise(r => setTimeout(r, 600));
    setSending(false);
    toast.success(`Invitations sent to ${local.length} participant${local.length !== 1 ? "s" : ""}.`);
    onClose();
  }, [local, rsvpRecords, meetingId, meeting, addRSVP, onClose]);

  return (
    <AppModal open onClose={onClose} title="Send Invitations" icon={<Send size={16} />} size="md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSend} loading={sending} disabled={local.length === 0 || sending}>
            Send to {local.length} Participant{local.length !== 1 ? "s" : ""}
          </PrimaryButton>
        </>
      }>
      {local.length === 0 ? (
        <EmptyState icon={Send} message="No participants added to this meeting yet. Add participants first." />
      ) : (
        <div>
          <p style={{ marginBottom: "1rem", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
            This will create RSVP records for all participants who have not yet received an invitation.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {local.map(p => (
              <li key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", background: "var(--color-surface)", borderRadius: 6, fontSize: "0.813rem" }}>
                <span>{p.name} — <em>{p.role}</em></span>
                <StatusBadge value={String(p.rsvp_status ?? "Pending")} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </AppModal>
  );
}

// ─── 3. Manage RSVP ───────────────────────────────────────────────────────────

export function ManageRSVPModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: rsvpRecords, update } = useRSVPRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const local = rsvpRecords.filter(r => r.meeting_id === meetingId);

  const handleChange = useCallback((id: string, response: string) => {
    update(id, { response, response_date: new Date().toISOString().slice(0, 10) } as never);
  }, [update]);

  const rsvpCols: ColDef[] = [
    fc("participant_name", "Participant"),
    BADGE("response", "Current Response"),
    {
      type: "col" as const,
      col: {
        key: "response",
        label: "Update Response",
        truncate: "none" as const,
        renderCell: (_val, row) => (
          <Select
            value={String(row["response"] ?? "Pending")}
            onChange={e => handleChange(String(row["id"]), e.target.value)}
            options={["Pending", "Accepted", "Declined", "Tentative", "Proxy"]}
            style={{ fontSize: "0.813rem", padding: "0.25rem 0.5rem" }}
          />
        ),
      },
    },
    fc("response_date", "Date"),
  ];

  return (
    <AppModal open onClose={onClose} title="Manage RSVP" icon={<UserCheck size={16} />} size="lg"
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}>
      <UnifiedDataTable
        variant="compact"
        cols={rsvpCols}
        rows={local.map(r => ({ id: r.id, participant_name: r.participant_name, response: String(r.response ?? "Pending"), response_date: String(r.response_date || "—") }))}
        totalCount={local.length}
        emptyLabel="No RSVP records for this meeting. Send invitations first."
        aria-label="RSVP Management"
      />
    </AppModal>
  );
}

// ─── 4. Add External Invitee ──────────────────────────────────────────────────

export function AddExternalInviteeModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: participants, add: addParticipant } = useParticipantRegistry();
  const { items: rsvpRecords, add: addRSVP } = useRSVPRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState("External Invitee");

  const handleAdd = useCallback(() => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    const now = new Date().toISOString();
    const pId = generateId("EXT", participants.map(p => p.participant_id));
    addParticipant({
      id: pId, participant_id: pId,
      meeting_id: meetingId,
      meeting_title: String(meeting.meeting_title ?? ""),
      name: name.trim(), designation: "External",
      organization: org.trim(), role,
      attendance_requirement: "By Invitation",
      email: email.trim(), phone: "",
      rsvp_status: "Pending", attendance_status: "Not Yet",
      joined_at: "", left_at: "", proxy_for: "", conflict_declared: "No",
      created_at: now,
    } as never);
    const rsvpId = generateId("RSV", rsvpRecords.map(r => r.rsvp_id));
    addRSVP({
      id: rsvpId, rsvp_id: rsvpId,
      meeting_id: meetingId, meeting_title: String(meeting.meeting_title ?? ""),
      participant_id: pId, participant_name: name.trim(),
      response: "Pending", response_date: "", decline_reason: "",
      proxy_nominee: "", notes: "External invitee", created_at: now,
    } as never);
    toast.success("External invitee added.");
    onClose();
  }, [name, email, org, role, meetingId, meeting, participants, rsvpRecords, addParticipant, addRSVP, onClose]);

  return (
    <AppModal open onClose={onClose} title="Add External Invitee" icon={<UserPlus size={16} />} size="md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleAdd}>Add Invitee</PrimaryButton>
        </>
      }>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Full Name *"><Input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" /></Field>
        </div>
        <Field label="Email"><Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" /></Field>
        <Field label="Organization"><Input value={org} onChange={e => setOrg(e.target.value)} placeholder="Company or institution" /></Field>
        <Field label="Role">
          <Select value={role} onChange={e => setRole(e.target.value)} options={["External Invitee", "Observer", "Advisor", "Guest"]} />
        </Field>
      </div>
    </AppModal>
  );
}

// ─── 5. Assign Alternate ──────────────────────────────────────────────────────

export function AssignAlternateModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: participants, add: addParticipant } = useParticipantRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const local = participants.filter(p => p.meeting_id === meetingId);

  const [forPart, setForPart] = useState(local[0]?.participant_id ?? "");
  const [altName, setAltName] = useState("");

  const handleSave = useCallback(() => {
    if (!altName.trim()) { toast.error("Alternate name is required."); return; }
    const original = participants.find(p => p.participant_id === forPart);
    if (!original) return;
    const now = new Date().toISOString();
    const pId = generateId("ALT", participants.map(p => p.participant_id));
    addParticipant({
      id: pId, participant_id: pId,
      meeting_id: meetingId, meeting_title: String(meeting.meeting_title ?? ""),
      name: altName.trim(), designation: "Alternate", organization: String(original.organization ?? ""),
      role: "Delegate", attendance_requirement: "Mandatory",
      email: "", phone: "", rsvp_status: "Accepted", attendance_status: "Not Yet",
      joined_at: "", left_at: "", proxy_for: original.name,
      conflict_declared: "No", created_at: now,
    } as never);
    toast.success(`Alternate assigned for ${original.name}.`);
    onClose();
  }, [altName, forPart, meetingId, meeting, participants, addParticipant, onClose]);

  return (
    <AppModal open onClose={onClose} title="Assign Alternate" icon={<RefreshCw size={16} />} size="sm"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave}>Assign</PrimaryButton>
        </>
      }>
      {local.length === 0 ? (
        <EmptyState icon={Users} message="No participants found for this meeting." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Field label="Assign Alternate For">
            <select className="entry-form__select" value={forPart} onChange={e => setForPart(e.target.value)}>
              {local.map(p => <option key={p.participant_id} value={p.participant_id}>{p.name} ({p.role})</option>)}
            </select>
          </Field>
          <Field label="Alternate Name *">
            <Input value={altName} onChange={e => setAltName(e.target.value)} placeholder="Full name of the alternate" />
          </Field>
        </div>
      )}
    </AppModal>
  );
}

// ─── 6. Add Conflict Declaration ──────────────────────────────────────────────

export function AddConflictDeclarationModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: participants } = useParticipantRegistry();
  const { items: agendaItems } = useAgendaRegistry();
  const { items: conflicts, add } = useConflictRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const localParticipants = participants.filter(p => p.meeting_id === meetingId);
  const localAgenda = agendaItems.filter(a => a.meeting_id === meetingId);

  const [declaredBy, setDeclaredBy] = useState(localParticipants[0]?.name ?? "");
  const [agendaItem, setAgendaItem] = useState(localAgenda[0]?.agenda_title ?? "");
  const [conflictType, setConflictType] = useState("Financial Interest");
  const [description, setDescription] = useState("");
  const [actionTaken, setActionTaken] = useState("Abstained from vote");

  const handleSave = useCallback(() => {
    if (!declaredBy.trim()) { toast.error("Declaring member is required."); return; }
    const cId = generateId("CON", conflicts.map(c => c.conflict_id));
    add({
      id: cId, conflict_id: cId,
      meeting_id: meetingId, meeting_title: String(meeting.meeting_title ?? ""),
      declared_by: declaredBy.trim(),
      agenda_item: agendaItem || "General",
      conflict_type: conflictType,
      description: description.trim(),
      action_taken: actionTaken,
      reviewed_by: "", review_status: "Pending",
      created_at: new Date().toISOString(),
    } as never);
    toast.success("Conflict declaration recorded.");
    onClose();
  }, [declaredBy, agendaItem, conflictType, description, actionTaken, meetingId, meeting, conflicts, add, onClose]);

  return (
    <AppModal open onClose={onClose} title="Add Conflict Declaration" icon={<AlertTriangle size={16} />} size="md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave}>Record Declaration</PrimaryButton>
        </>
      }>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <Field label="Declared By *">
          {localParticipants.length > 0 ? (
            <select className="entry-form__select" value={declaredBy} onChange={e => setDeclaredBy(e.target.value)}>
              {localParticipants.map(p => <option key={p.participant_id} value={p.name}>{p.name}</option>)}
            </select>
          ) : (
            <Input value={declaredBy} onChange={e => setDeclaredBy(e.target.value)} placeholder="Member name" />
          )}
        </Field>
        <Field label="Agenda Item">
          {localAgenda.length > 0 ? (
            <select className="entry-form__select" value={agendaItem} onChange={e => setAgendaItem(e.target.value)}>
              <option value="">General / All Items</option>
              {localAgenda.map(a => <option key={a.agenda_id} value={a.agenda_title}>{a.agenda_title}</option>)}
            </select>
          ) : (
            <Input value={agendaItem} onChange={e => setAgendaItem(e.target.value)} placeholder="Agenda item or General" />
          )}
        </Field>
        <Field label="Conflict Type">
          <Select value={conflictType} onChange={e => setConflictType(e.target.value)}
            options={["Financial Interest", "Relationship Conflict", "Business Conflict", "Regulatory Conflict", "Other"]} />
        </Field>
        <Field label="Action Taken">
          <Select value={actionTaken} onChange={e => setActionTaken(e.target.value)}
            options={["Abstained from vote", "Left the room", "Disclosed and remained", "Referred to committee"]} />
        </Field>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Description">
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the nature of the conflict" rows={3} />
          </Field>
        </div>
      </div>
    </AppModal>
  );
}

// ─── 7. Create Availability Poll ──────────────────────────────────────────────

export function CreateAvailabilityPollModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: polls, add } = useAvailabilityPollRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");

  const [title, setTitle] = useState(`Scheduling Poll — ${String(meeting.meeting_title ?? "")}`);
  const [deadline, setDeadline] = useState("");
  const [dates, setDates] = useState(["", "", ""]);

  const handleSave = useCallback(() => {
    if (!title.trim()) { toast.error("Poll title is required."); return; }
    const proposedDates = dates.filter(Boolean).join(", ");
    if (!proposedDates) { toast.error("Add at least one proposed date."); return; }
    const pId = generateId("POL", polls.map(p => p.poll_id));
    add({
      id: pId, poll_id: pId,
      poll_title: title.trim(),
      related_meeting_id: meetingId,
      related_meeting_title: String(meeting.meeting_title ?? ""),
      time_zone: "Asia/Dhaka (GMT+6)",
      response_deadline: deadline,
      allow_multiple: "Yes", allow_comments: "Yes",
      proposed_dates: proposedDates,
      participants: "0", best_option: "Pending responses",
      total_responses: "0", approval_status: "Open",
      created_by: "Meeting Secretary",
      created_at: new Date().toISOString(),
    } as never);
    toast.success("Availability poll created.");
    onClose();
  }, [title, deadline, dates, meetingId, meeting, polls, add, onClose]);

  return (
    <AppModal open onClose={onClose} title="Create Availability Poll" icon={<Calendar size={16} />} size="md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave}>Create Poll</PrimaryButton>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Field label="Poll Title *"><Input value={title} onChange={e => setTitle(e.target.value)} /></Field>
        <Field label="Response Deadline"><Input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} /></Field>
        <div>
          <label className="entry-form__label">Proposed Dates</label>
          {dates.map((d, i) => (
            <div key={i} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
              <Input type="date" value={d} onChange={e => setDates(prev => prev.map((v, j) => j === i ? e.target.value : v))} style={{ flex: 1 }} />
              {i === dates.length - 1 && dates.length < 6 && (
                <button onClick={() => setDates(prev => [...prev, ""])} style={{ fontSize: "0.75rem", background: "none", border: "1px solid var(--color-border)", borderRadius: 4, padding: "0.25rem 0.5rem", cursor: "pointer" }}>+ Add</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppModal>
  );
}

// ─── 8. Reschedule Meeting ────────────────────────────────────────────────────

export function RescheduleMeetingModal({ meeting, onClose, onUpdate }: { meeting: TableRow; onClose: () => void; onUpdate: (id: string, values: Record<string, unknown>) => void }) {
  const [date, setDate] = useState(String(meeting.meeting_date ?? ""));
  const [start, setStart] = useState(String(meeting.start_time ?? ""));
  const [end, setEnd] = useState(String(meeting.end_time ?? ""));
  const [reason, setReason] = useState("");

  const handleSave = useCallback(() => {
    if (!date) { toast.error("New date is required."); return; }
    const id = String(meeting.id ?? meeting.meeting_id ?? "");
    onUpdate(id, { meeting_date: date, start_time: start, end_time: end });
    toast.success("Meeting rescheduled.");
    onClose();
  }, [date, start, end, meeting, onUpdate, onClose]);

  return (
    <AppModal open onClose={onClose} title="Reschedule Meeting" icon={<Clock size={16} />} size="sm"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave}>Reschedule</PrimaryButton>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Field label="New Date *"><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <Field label="Start Time"><Input type="time" value={start} onChange={e => setStart(e.target.value)} /></Field>
          <Field label="End Time"><Input type="time" value={end} onChange={e => setEnd(e.target.value)} /></Field>
        </div>
        <Field label="Reason for Rescheduling">
          <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Optional — provide reason for audit trail" rows={2} />
        </Field>
      </div>
    </AppModal>
  );
}

// ─── 9. Review Quorum ─────────────────────────────────────────────────────────

export function ReviewQuorumModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: participants } = useParticipantRegistry();
  const { items: rsvpRecords } = useRSVPRegistry();
  const { items: govBodies } = useGovernanceRegistry();
  const { items: partGroups } = useParticipantGroupRegistry();

  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const committee = String(meeting.committee ?? "");

  const local = participants.filter(p => p.meeting_id === meetingId);
  const localRSVP = rsvpRecords.filter(r => r.meeting_id === meetingId);
  const accepted = localRSVP.filter(r => r.response === "Accepted").length;
  const pending = localRSVP.filter(r => r.response === "Pending").length;
  const declined = localRSVP.filter(r => r.response === "Declined").length;

  const govBody = govBodies.find(g => g.body_name === committee);
  const partGroup = partGroups.find(g => g.governance_body === committee && g.group_type === "Voting Members");
  const quorumRuleStr = partGroup?.quorum_rule ?? govBody?.quorum_requirement ?? "50%";
  const totalMembers = parseInt(String(partGroup?.member_count ?? local.length), 10) || local.length;

  // Parse quorum rule (e.g. "60%", "50% + 1", "2/3")
  const quorumPct = parseFloat(quorumRuleStr) / 100 || 0.5;
  const quorumRequired = Math.ceil(totalMembers * quorumPct);
  const quorumMet = accepted >= quorumRequired;
  const quorumAtRisk = !quorumMet && (accepted + pending) >= quorumRequired;

  return (
    <AppModal open onClose={onClose} title="Review Quorum" icon={<BarChart2 size={16} />} size="md"
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Governance body rule */}
        <div style={{ padding: "0.75rem 1rem", background: "var(--color-surface)", borderRadius: 8, fontSize: "0.813rem" }}>
          <div style={{ marginBottom: "0.5rem", fontWeight: 600 }}>{committee || "Governance Body"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
            <div><div style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>Quorum Rule</div><strong>{quorumRuleStr}</strong></div>
            <div><div style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>Total Members</div><strong>{totalMembers}</strong></div>
            <div><div style={{ color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>Required</div><strong>{quorumRequired}</strong></div>
          </div>
        </div>

        {/* RSVP breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "0.75rem" }}>
          {[
            { label: "Invited", value: local.length, color: "var(--color-primary)" },
            { label: "Accepted", value: accepted, color: "var(--color-success)" },
            { label: "Pending", value: pending, color: "var(--color-warning)" },
            { label: "Declined", value: declined, color: "var(--color-error)" },
          ].map(s => (
            <div key={s.label} style={{ textAlign: "center", padding: "0.75rem", background: "var(--color-surface)", borderRadius: 8 }}>
              <div style={{ fontSize: "1.5rem", fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Status indicator */}
        <div style={{
          padding: "0.75rem 1rem",
          borderRadius: 8,
          background: quorumMet ? "var(--color-success-subtle, #f0fdf4)" : quorumAtRisk ? "#fffbeb" : "#fef2f2",
          border: `1px solid ${quorumMet ? "var(--color-success)" : quorumAtRisk ? "var(--color-warning)" : "var(--color-error)"}`,
          display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem",
        }}>
          {quorumMet
            ? <><CheckCircle2 size={16} style={{ color: "var(--color-success)" }} /> <strong>Quorum Met</strong> — {accepted} of {quorumRequired} required members have accepted.</>
            : quorumAtRisk
            ? <><AlertTriangle size={16} style={{ color: "var(--color-warning)" }} /> <strong>Quorum at Risk</strong> — {accepted} confirmed, {pending} pending. Need {quorumRequired - accepted} more.</>
            : <><XCircle size={16} style={{ color: "var(--color-error)" }} /> <strong>Quorum Not Achievable</strong> — Only {accepted + pending} possible vs {quorumRequired} required.</>
          }
        </div>
      </div>
    </AppModal>
  );
}

// ─── 10. Resolve Readiness Issues ─────────────────────────────────────────────

export function ResolveReadinessModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: participants } = useParticipantRegistry();
  const { items: rsvpRecords } = useRSVPRegistry();
  const { items: agendaItems } = useAgendaRegistry();
  const { items: documents } = useDocumentRegistry();
  const { items: boardPacks } = useBoardPackRegistry();
  const { items: partGroups } = useParticipantGroupRegistry();

  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const committee = String(meeting.committee ?? "");

  const partCount = participants.filter(p => p.meeting_id === meetingId).length;
  const agCount = agendaItems.filter(a => a.meeting_id === meetingId).length;
  const docCount = documents.filter(d => d.related_meeting === meetingId).length;
  const hasBoardPack = boardPacks.some(bp => bp.related_meeting === meetingId);
  const rsvpAccepted = rsvpRecords.filter(r => r.meeting_id === meetingId && r.response === "Accepted").length;
  const partGroup = partGroups.find(g => g.governance_body === committee && g.group_type === "Voting Members");
  const quorumRule = partGroup?.quorum_rule ?? "50%";

  const items = buildReadinessItems(meeting, partCount, agCount, docCount, hasBoardPack, rsvpAccepted, quorumRule);
  const doneCount = items.filter(i => i.done).length;

  return (
    <AppModal open onClose={onClose} title="Readiness Checklist" icon={<ListChecks size={16} />} size="md"
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        <div style={{ marginBottom: "0.75rem", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
          <strong>{doneCount}/{items.length}</strong> readiness checks passed.
        </div>
        {items.map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "0.75rem",
            padding: "0.5rem 0.75rem", borderRadius: 6,
            background: item.done ? "var(--color-success-subtle, #f0fdf4)" : "var(--color-surface)",
            border: `1px solid ${item.done ? "var(--color-success)" : "var(--color-border)"}`,
            fontSize: "0.813rem",
          }}>
            {item.done
              ? <CheckCircle2 size={14} style={{ color: "var(--color-success)", flexShrink: 0 }} />
              : <XCircle size={14} style={{ color: "var(--color-error)", flexShrink: 0 }} />
            }
            <span style={{ color: item.done ? "inherit" : "var(--color-error)" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </AppModal>
  );
}

// ─── 11. Add Document ─────────────────────────────────────────────────────────

export function AddDocumentModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: documents, add } = useDocumentRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");

  const [docName, setDocName] = useState("");
  const [docType, setDocType] = useState("Board Paper");
  const [owner, setOwner] = useState("");
  const [conf, setConf] = useState("Confidential");

  const handleSave = useCallback(() => {
    if (!docName.trim()) { toast.error("Document name is required."); return; }
    const now = new Date().toISOString();
    const dId = generateId("DOC", documents.map(d => d.doc_id));
    add({
      id: dId, doc_id: dId, doc_name: docName.trim(),
      doc_number: `DOC-REF-${Date.now()}`,
      doc_type: docType,
      related_meeting: meetingId,
      related_agenda: "",
      owner: owner.trim() || "Meeting Secretary",
      version: "1.0",
      confidentiality: conf,
      effective_date: now.slice(0, 10),
      expiry_date: "",
      acknowledgement_required: "No",
      approval_status: "Draft",
      created_at: now,
    } as never);
    toast.success("Document added.");
    onClose();
  }, [docName, docType, owner, conf, meetingId, documents, add, onClose]);

  return (
    <AppModal open onClose={onClose} title="Add Document" icon={<FileText size={16} />} size="md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave}>Add Document</PrimaryButton>
        </>
      }>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <Field label="Document Name *"><Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Compliance Report Q2 2026" /></Field>
        </div>
        <Field label="Document Type">
          <Select value={docType} onChange={e => setDocType(e.target.value)} options={DOCUMENT_TYPES} />
        </Field>
        <Field label="Owner">
          <Input value={owner} onChange={e => setOwner(e.target.value)} placeholder="e.g. CFO" />
        </Field>
        <Field label="Confidentiality">
          <Select value={conf} onChange={e => setConf(e.target.value)} options={CONFIDENTIALITY_LEVELS} />
        </Field>
      </div>
    </AppModal>
  );
}

// ─── 12. Create Board Pack ────────────────────────────────────────────────────

export function CreateBoardPackModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: boardPacks, add } = useBoardPackRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const existing = boardPacks.filter(bp => bp.related_meeting === meetingId);

  const [title, setTitle] = useState(`Board Pack — ${String(meeting.meeting_title ?? "")}`);
  const [pubDate, setPubDate] = useState("");
  const [changeSummary, setChangeSummary] = useState(existing.length > 0 ? "Updated version" : "Initial version");

  const handleSave = useCallback(() => {
    if (!title.trim()) { toast.error("Board Pack title is required."); return; }
    const now = new Date().toISOString();
    const bId = generateId("BPK", boardPacks.map(bp => bp.pack_id));
    const version = `V${existing.length + 1}`;
    add({
      id: bId, pack_id: bId,
      pack_title: title.trim(),
      related_meeting: meetingId,
      meeting_title: String(meeting.meeting_title ?? ""),
      committee: String(meeting.committee ?? ""),
      version,
      document_count: "0",
      review_completion: "0%",
      publication_date: pubDate,
      change_summary: changeSummary.trim(),
      access_policy: "Board Members Only",
      approval_status: "Draft",
      created_at: now,
      created_by: "Meeting Secretary",
    } as never);
    toast.success(`Board Pack ${version} created.`);
    onClose();
  }, [title, pubDate, changeSummary, meetingId, meeting, boardPacks, existing.length, add, onClose]);

  return (
    <AppModal open onClose={onClose} title="Create Board Pack" icon={<Package size={16} />} size="md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave}>Create Board Pack</PrimaryButton>
        </>
      }>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <Field label="Board Pack Title *"><Input value={title} onChange={e => setTitle(e.target.value)} /></Field>
        <Field label="Publication Date"><Input type="date" value={pubDate} onChange={e => setPubDate(e.target.value)} /></Field>
        <Field label="Change Summary">
          <Textarea value={changeSummary} onChange={e => setChangeSummary(e.target.value)} rows={2} />
        </Field>
        {existing.length > 0 && (
          <p style={{ fontSize: "0.813rem", color: "var(--color-text-secondary)", margin: 0 }}>
            {existing.length} existing version{existing.length !== 1 ? "s" : ""} for this meeting. This will create version V{existing.length + 1}.
          </p>
        )}
      </div>
    </AppModal>
  );
}

// ─── 13. Publish Board Pack ───────────────────────────────────────────────────

export function PublishBoardPackModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: boardPacks, update } = useBoardPackRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const drafts = boardPacks.filter(bp => bp.related_meeting === meetingId && bp.approval_status !== "Published");

  const [selectedId, setSelectedId] = useState(drafts[0]?.id ?? "");
  const [publishing, setPublishing] = useState(false);

  const handlePublish = useCallback(async () => {
    if (!selectedId) return;
    setPublishing(true);
    await new Promise(r => setTimeout(r, 600));
    update(selectedId, { approval_status: "Published", publication_date: new Date().toISOString().slice(0, 10) } as never);
    setPublishing(false);
    toast.success("Board Pack published successfully.");
    onClose();
  }, [selectedId, update, onClose]);

  return (
    <AppModal open onClose={onClose} title="Publish Board Pack" icon={<Upload size={16} />} size="sm"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handlePublish} loading={publishing} disabled={!selectedId || publishing}>
            Publish
          </PrimaryButton>
        </>
      }>
      {drafts.length === 0 ? (
        <EmptyState icon={Package} message="No unpublished board packs for this meeting. Create one first." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", margin: 0 }}>
            Select a board pack to publish. Once published, participants will be able to access it.
          </p>
          <Field label="Board Pack">
            <select className="entry-form__select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              {drafts.map(bp => (
                <option key={bp.id} value={bp.id}>{bp.pack_title} ({bp.version}) — {bp.approval_status}</option>
              ))}
            </select>
          </Field>
        </div>
      )}
    </AppModal>
  );
}

// ─── 14. Upload New Version ───────────────────────────────────────────────────

export function UploadNewVersionModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: documents, update } = useDocumentRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const local = documents.filter(d => d.related_meeting === meetingId);

  const [selectedId, setSelectedId] = useState(local[0]?.id ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!selectedId) { toast.error("Select a document first."); return; }
    const doc = documents.find(d => d.id === selectedId);
    if (!doc) return;
    const parts = String(doc.version ?? "1.0").split(".");
    const newMinor = parseInt(parts[1] ?? "0", 10) + 1;
    const newVersion = `${parts[0]}.${newMinor}`;
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    update(selectedId, { version: newVersion, approval_status: "Draft" } as never);
    setSaving(false);
    toast.success(`Version ${newVersion} uploaded for "${doc.doc_name}".`);
    onClose();
  }, [selectedId, documents, update, onClose]);

  return (
    <AppModal open onClose={onClose} title="Upload New Version" icon={<UploadCloud size={16} />} size="md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave} loading={saving} disabled={!selectedId || saving}>Upload Version</PrimaryButton>
        </>
      }>
      {local.length === 0 ? (
        <EmptyState icon={FileText} message="No documents added to this meeting yet. Add a document first." />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", margin: 0 }}>
            Select a document to increment its version number. The document will revert to Draft status for re-approval.
          </p>
          <Field label="Document">
            <select className="entry-form__select" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              {local.map(d => (
                <option key={d.id} value={d.id}>{d.doc_name} (v{d.version}) — {d.approval_status}</option>
              ))}
            </select>
          </Field>
          <Field label="Version Notes (optional)">
            <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="What changed in this version?" rows={2} />
          </Field>
        </div>
      )}
    </AppModal>
  );
}

// ─── 15. View Decisions ───────────────────────────────────────────────────────

export function ViewDecisionsModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: decisions } = useDecisionRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const meetingTitle = String(meeting.meeting_title ?? "");
  const local = decisions.filter(d =>
    d.source_meeting === meetingId ||
    d.source_meeting === meetingTitle ||
    String(d.source_meeting ?? "").includes(meetingId)
  );

  return (
    <AppModal open onClose={onClose} title="Decisions" icon={<Scale size={16} />} size="lg"
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}>
      {local.length === 0 ? (
        <EmptyState icon={Scale} message="No decisions recorded for this meeting yet." />
      ) : (
        <UnifiedDataTable
          variant="compact"
          cols={[fc("decision_title", "Decision Title"), fc("decision_owner", "Owner"), fc("effective_date", "Effective Date"), BADGE("status", "Status")]}
          rows={local.map(d => ({ id: d.id, decision_title: d.decision_title, decision_owner: d.decision_owner, effective_date: d.effective_date, status: String(d.implementation_status ?? d.approval_status ?? "—") }))}
          totalCount={local.length}
        />
      )}
    </AppModal>
  );
}

// ─── 16. View Resolutions ─────────────────────────────────────────────────────

export function ViewResolutionsModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: resolutions } = useResolutionRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const meetingTitle = String(meeting.meeting_title ?? "");
  const local = resolutions.filter(r =>
    r.source_meeting === meetingId ||
    r.source_meeting === meetingTitle ||
    String(r.source_meeting ?? "").includes(meetingId)
  );

  return (
    <AppModal open onClose={onClose} title="Resolutions" icon={<FileCheck2 size={16} />} size="lg"
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}>
      {local.length === 0 ? (
        <EmptyState icon={FileCheck2} message="No resolutions recorded for this meeting yet." />
      ) : (
        <UnifiedDataTable
          variant="compact"
          cols={[fc("resolution_title", "Resolution Title"), fc("proposed_by", "Proposed By"), fc("vote_result", "Vote Result"), BADGE("status", "Status")]}
          rows={local.map(r => ({ id: r.id, resolution_title: r.resolution_title, proposed_by: r.proposed_by, vote_result: r.vote_result || "—", status: String(r.approval_status ?? "—") }))}
          totalCount={local.length}
        />
      )}
    </AppModal>
  );
}

// ─── 17. View Actions ─────────────────────────────────────────────────────────

export function ViewActionsModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: actions } = useActionItemRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const meetingTitle = String(meeting.meeting_title ?? "");
  const local = actions.filter(a =>
    a.source_meeting === meetingId ||
    a.source_meeting === meetingTitle ||
    String(a.source_meeting ?? "").includes(meetingId)
  );

  return (
    <AppModal open onClose={onClose} title="Action Items" icon={<ClipboardList size={16} />} size="lg"
      footer={<SecondaryButton onClick={onClose}>Close</SecondaryButton>}>
      {local.length === 0 ? (
        <EmptyState icon={ClipboardList} message="No action items recorded for this meeting yet." />
      ) : (
        <UnifiedDataTable
          variant="compact"
          cols={[fc("action_title", "Action Item"), fc("action_owner", "Owner"), fc("due_date", "Due Date"), BADGE("status", "Status")]}
          rows={local.map(a => ({ id: a.id, action_title: a.action_title, action_owner: a.action_owner, due_date: a.due_date, status: String(a.completion_status ?? a.approval_status ?? "—") }))}
          totalCount={local.length}
        />
      )}
    </AppModal>
  );
}

// ─── 18. Prepare Minutes ──────────────────────────────────────────────────────

export function PrepareMinutesModal({ meeting, onClose }: { meeting: TableRow; onClose: () => void }) {
  const { items: minutesList, add } = useMinutesRegistry();
  const meetingId = String(meeting.meeting_id ?? meeting.id ?? "");
  const existing = minutesList.filter(m => m.meeting_id === meetingId);

  const [taker, setTaker] = useState(String(meeting.secretary ?? ""));
  const [template, setTemplate] = useState("Standard");
  const [saving, setSaving] = useState(false);

  const handleCreate = useCallback(async () => {
    setSaving(true);
    const mId = generateId("MIN", minutesList.map(m => m.minutes_id));
    add({
      id: mId, minutes_id: mId,
      meeting_id: meetingId,
      meeting_title: String(meeting.meeting_title ?? ""),
      minutes_template: template,
      minute_taker: taker.trim() || "Meeting Secretary",
      co_authors: "",
      quorum_statement: "",
      discussion_summary: "",
      next_meeting_date: "",
      closing_time: "",
      version: "1.0",
      approval_status: "Draft",
      created_at: new Date().toISOString(),
    } as never);
    await new Promise(r => setTimeout(r, 400));
    setSaving(false);
    toast.success("Minutes record created — Draft.");
    onClose();
  }, [taker, template, meetingId, meeting, minutesList, add, onClose]);

  return (
    <AppModal open onClose={onClose} title="Prepare Minutes" icon={<BookOpen size={16} />} size="md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          {existing.length === 0 && (
            <PrimaryButton onClick={handleCreate} loading={saving} disabled={saving}>Create Minutes</PrimaryButton>
          )}
        </>
      }>
      {existing.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <div style={{ padding: "0.75rem 1rem", background: "var(--color-surface)", borderRadius: 8, fontSize: "0.813rem" }}>
            <strong>{existing.length} minutes record{existing.length !== 1 ? "s" : ""}</strong> exist for this meeting.
          </div>
          <UnifiedDataTable
            variant="compact"
            cols={[fc("minutes_id", "Minutes ID"), fc("minute_taker", "Taker"), fc("version", "Version"), BADGE("status", "Status")]}
            rows={existing.map(m => ({ id: m.id, minutes_id: m.minutes_id, minute_taker: m.minute_taker, version: m.version, status: String(m.approval_status ?? "Draft") }))}
            totalCount={existing.length}
          />
          <p style={{ fontSize: "0.813rem", color: "var(--color-text-secondary)", margin: 0 }}>
            To edit minutes, go to Minutes Management from the main navigation.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)", margin: 0 }}>
            No minutes exist for this meeting yet. Create a draft to begin the minutes preparation workflow.
          </p>
          <Field label="Minute Taker">
            <Input value={taker} onChange={e => setTaker(e.target.value)} placeholder="e.g. Company Secretary" />
          </Field>
          <Field label="Template">
            <Select value={template} onChange={e => setTemplate(e.target.value)}
              options={["Standard", "Condensed", "Verbatim", "Action-Only"]} />
          </Field>
        </div>
      )}
    </AppModal>
  );
}

// ─── Dispatcher ────────────────────────────────────────────────────────────────

interface MeetingContextualModalsProps {
  meeting: TableRow | null;
  actionId: string | null;
  onClose: () => void;
  onMeetingUpdate: (id: string, values: Record<string, unknown>) => void;
}

export function MeetingContextualModals({ meeting, actionId, onClose, onMeetingUpdate }: MeetingContextualModalsProps) {
  if (!meeting || !actionId) return null;

  switch (actionId) {
    case "manage_participants":      return <ManageParticipantsModal meeting={meeting} onClose={onClose} />;
    case "send_invitations":         return <SendInvitationsModal meeting={meeting} onClose={onClose} />;
    case "manage_rsvp":              return <ManageRSVPModal meeting={meeting} onClose={onClose} />;
    case "add_external_invitee":     return <AddExternalInviteeModal meeting={meeting} onClose={onClose} />;
    case "assign_alternate":         return <AssignAlternateModal meeting={meeting} onClose={onClose} />;
    case "add_conflict_declaration": return <AddConflictDeclarationModal meeting={meeting} onClose={onClose} />;
    case "create_availability_poll": return <CreateAvailabilityPollModal meeting={meeting} onClose={onClose} />;
    case "reschedule_meeting":       return <RescheduleMeetingModal meeting={meeting} onClose={onClose} onUpdate={onMeetingUpdate} />;
    case "review_quorum":            return <ReviewQuorumModal meeting={meeting} onClose={onClose} />;
    case "resolve_readiness":        return <ResolveReadinessModal meeting={meeting} onClose={onClose} />;
    case "add_document":             return <AddDocumentModal meeting={meeting} onClose={onClose} />;
    case "create_board_pack":        return <CreateBoardPackModal meeting={meeting} onClose={onClose} />;
    case "publish_board_pack":       return <PublishBoardPackModal meeting={meeting} onClose={onClose} />;
    case "upload_new_version":       return <UploadNewVersionModal meeting={meeting} onClose={onClose} />;
    case "view_decisions":           return <ViewDecisionsModal meeting={meeting} onClose={onClose} />;
    case "view_resolutions":         return <ViewResolutionsModal meeting={meeting} onClose={onClose} />;
    case "view_actions":             return <ViewActionsModal meeting={meeting} onClose={onClose} />;
    case "prepare_minutes":          return <PrepareMinutesModal meeting={meeting} onClose={onClose} />;
    default: return null;
  }
}
