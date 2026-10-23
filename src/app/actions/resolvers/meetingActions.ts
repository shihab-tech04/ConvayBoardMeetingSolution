import {
  Pencil, PlayCircle, Send, Trash2, Eye,
  CheckCircle2, XCircle, RotateCcw, Upload,
  Clock, Users, Video, ArrowRightCircle,
  Play, FileText, Plus, Archive, BookOpen,
  AlertTriangle, BarChart2,
} from "lucide-react";
import type { ResolvedAction, ActionContext, MeetingRole } from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function str(v: unknown): string {
  return String(v ?? "");
}

/** All meeting roles the current user holds for this record. */
function deriveMeetingRoles(record: Record<string, unknown>, ctx: ActionContext): MeetingRole[] {
  if (ctx.meetingRoles && ctx.meetingRoles.length > 0) return ctx.meetingRoles;

  const userId = ctx.currentUser.id;
  const name = ctx.currentUser.name;
  const empId = ctx.currentUser.employeeId ?? ctx.currentUser.id;
  const designation = (ctx.currentUser.designation ?? "").toLowerCase();
  const roles: MeetingRole[] = [];

  // Host / Chairperson — match by user_id first, then display name
  if ((str(record.chairperson_user_id) && str(record.chairperson_user_id) === userId) ||
      str(record.chairperson) === name) {
    roles.push("host");
  }

  // Secretary — match by user_id first, then display name, then designation fallback
  if ((str(record.secretary_user_id) && str(record.secretary_user_id) === userId) ||
      str(record.secretary) === name ||
      (designation.includes("meeting secretary") || designation.includes("board secretary") || designation.includes("company secretary"))) {
    if (!roles.includes("secretary")) roles.push("secretary");
  }

  // Organizer — user_id, name, or employee-id on created_by
  if ((str(record.organizer_user_id) && str(record.organizer_user_id) === userId) ||
      str(record.organizer) === name ||
      str(record.created_by) === empId) {
    roles.push("organizer");
  }

  // Participant — from merged relationship list (includes both legacy participants and participant links)
  const participants = ctx.relationships?.participants ?? [];
  const meetingId = str(record.meeting_id || record.id);
  if (participants.some(p =>
    p.meeting_id === meetingId &&
    ((p.user_id && p.user_id === userId) || p.person_name === name)
  )) {
    roles.push("participant");
  }

  // Approver — role/permissions or designation
  const canApprove =
    ctx.permissions.includes("meeting_approve") ||
    ctx.userRole === "Super Admin" ||
    ctx.userRole === "Board Secretary" ||
    ctx.userRole === "Admin" ||
    designation.includes("board secretary") ||
    designation.includes("company secretary");
  if (canApprove) roles.push("approver");

  return roles.length > 0 ? roles : ["viewer"];
}

function hasRole(roles: MeetingRole[], ...check: MeetingRole[]): boolean {
  return check.some(r => roles.includes(r));
}

/** True when the meeting date+time is within the start window (≤15 min before, ≤2 hours after). */
function withinEntryWindow(record: Record<string, unknown>, now: Date): boolean {
  const dateStr = str(record.meeting_date);
  const timeStr = str(record.start_time) || "00:00";
  if (!dateStr) return false;
  try {
    const meeting = new Date(`${dateStr}T${timeStr}`);
    const diffMin = (meeting.getTime() - now.getTime()) / 60_000;
    return diffMin <= 15 && diffMin >= -120;
  } catch {
    return false;
  }
}

function meetingStartLabel(record: Record<string, unknown>): string {
  const dateStr = str(record.meeting_date);
  const timeStr = str(record.start_time);
  if (!dateStr) return "";
  return timeStr ? `${dateStr} at ${timeStr}` : dateStr;
}

// ── Main resolver ─────────────────────────────────────────────────────────────

export function resolveMeetingActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.approval_status || ctx.record.status);
  const roles = deriveMeetingRoles(ctx.record, ctx);
  const now = ctx.now;
  const window = withinEntryWindow(ctx.record, now);
  const startLabel = meetingStartLabel(ctx.record);

  // ── Draft ─────────────────────────────────────────────────────────────────
  if (status === "Draft") {
    const canEdit = hasRole(roles, "organizer", "host", "secretary");
    const savedStep = parseInt(str(ctx.record.draft_current_step || "0"), 10) || 0;
    const setupLabel = savedStep >= 2 ? "Finish Setup" : "Continue Setup";
    const isDraftComplete = savedStep >= 4;
    return [
      {
        id: "continue_setup",
        label: setupLabel,
        icon: ArrowRightCircle,
        tone: "primary",
        placement: "direct",
        priority: 1,
        visible: canEdit,
        enabled: true,
        color: "#6366f1",
      },
      {
        id: "submit_for_approval",
        label: "Submit for Approval",
        icon: Send,
        tone: "success",
        placement: "direct",
        priority: 2,
        visible: canEdit,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Submit this meeting for approval? It will be sent to the designated approver.",
        color: "#22c55e",
      },
      {
        id: "delete",
        label: "Delete Draft",
        icon: Trash2,
        tone: "danger",
        placement: "more",
        priority: 10,
        visible: hasRole(roles, "organizer", "secretary"),
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Permanently delete this draft meeting? This cannot be undone.",
        color: "#ef4444",
      },
    ];
  }

  // ── Pending Approval ──────────────────────────────────────────────────────
  if (status === "Pending Approval") {
    const isApprover = hasRole(roles, "approver");
    return [
      {
        id: "approve",
        label: "Approve",
        icon: CheckCircle2,
        tone: "success",
        placement: "direct",
        priority: 2,
        visible: isApprover,
        enabled: isApprover,
        disabledReason: "You do not have permission to approve meetings.",
        requiresConfirmation: true,
        confirmMessage: "Approve this meeting? It will proceed to the scheduling phase.",
        color: "#22c55e",
      },
      {
        id: "request_revision",
        label: "Request Revision",
        icon: RotateCcw,
        tone: "warning",
        placement: "direct",
        priority: 3,
        visible: isApprover,
        enabled: isApprover,
        disabledReason: "Only approvers can request revisions.",
        requiresReason: true,
        reasonLabel: "Revision instructions",
        color: "#f59e0b",
      },
      {
        id: "reject",
        label: "Reject",
        icon: XCircle,
        tone: "danger",
        placement: "more",
        priority: 4,
        visible: isApprover,
        enabled: isApprover,
        disabledReason: "Only approvers can reject meetings.",
        requiresReason: true,
        reasonLabel: "Reason for rejection",
        requiresConfirmation: true,
        confirmMessage: "Reject this meeting request?",
        color: "#ef4444",
      },
    ];
  }

  // ── Approved ──────────────────────────────────────────────────────────────
  if (status === "Approved") {
    return [
      {
        id: "publish",
        label: "Publish Meeting",
        icon: Upload,
        tone: "primary",
        placement: "direct",
        priority: 1,
        visible: hasRole(roles, "organizer", "host", "secretary"),
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Publish this meeting? Invitations will be sent to all participants.",
        color: "#6366f1",
      },
      {
        id: "edit",
        label: "Edit Permitted Fields",
        icon: Pencil,
        tone: "neutral",
        placement: "direct",
        priority: 2,
        visible: hasRole(roles, "organizer", "host", "secretary"),
        enabled: true,
        color: "#3b82f6",
      },
      {
        id: "manage_participants",
        label: "Manage Participants",
        icon: Users,
        tone: "neutral",
        placement: "more",
        priority: 4,
        visible: hasRole(roles, "organizer", "host", "secretary"),
        enabled: true,
        color: "#3b82f6",
      },
    ];
  }

  // ── Scheduled / Published / Ready to Start ───────────────────────────────
  if (status === "Scheduled" || status === "Published" || status === "Ready to Start") {
    const isHost = hasRole(roles, "host", "organizer");
    const isParticipant = hasRole(roles, "participant", "secretary");
    return [
      {
        id: "start",
        label: "Start Meeting",
        icon: PlayCircle,
        tone: "success",
        placement: "direct",
        priority: 1,
        visible: isHost,
        enabled: window,
        disabledReason: window
          ? undefined
          : `Meeting is scheduled for ${startLabel}. You can start it up to 15 minutes before.`,
        color: "#22c55e",
      },
      {
        id: "join",
        label: "Join Meeting",
        icon: Video,
        tone: "primary",
        placement: "direct",
        priority: 1,
        visible: isParticipant && !isHost,
        enabled: window,
        disabledReason: window
          ? undefined
          : `The meeting begins at ${startLabel}. Join will be available 15 minutes before start.`,
        color: "#3b82f6",
      },
      {
        id: "manage_participants",
        label: "Manage Participants",
        icon: Users,
        tone: "neutral",
        placement: "more",
        priority: 3,
        visible: hasRole(roles, "organizer", "host", "secretary"),
        enabled: true,
        color: "#3b82f6",
      },
      {
        id: "manage_rsvp",
        label: "Manage RSVP",
        icon: Users,
        tone: "neutral",
        placement: "more",
        priority: 4,
        visible: hasRole(roles, "organizer", "host", "secretary"),
        enabled: true,
        color: "#8b5cf6",
      },
      {
        id: "reschedule_meeting",
        label: "Reschedule",
        icon: Clock,
        tone: "warning",
        placement: "more",
        priority: 5,
        visible: hasRole(roles, "organizer", "host"),
        enabled: true,
        requiresReason: true,
        reasonLabel: "Reason for rescheduling",
        color: "#f59e0b",
      },
      {
        id: "cancel",
        label: "Cancel Meeting",
        icon: XCircle,
        tone: "danger",
        placement: "more",
        priority: 9,
        visible: hasRole(roles, "organizer", "host"),
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Cancel this meeting? All participants will be notified.",
        requiresReason: true,
        reasonLabel: "Reason for cancellation",
        color: "#ef4444",
      },
    ];
  }

  // ── In Progress ───────────────────────────────────────────────────────────
  if (status === "In Progress") {
    const isHost = hasRole(roles, "host", "organizer");
    const isSecretary = hasRole(roles, "secretary");
    return [
      {
        id: "rejoin",
        label: "Rejoin Meeting",
        icon: Video,
        tone: "primary",
        placement: "direct",
        priority: 1,
        visible: !isHost,
        enabled: true,
        color: "#3b82f6",
      },
      {
        id: "continue_meeting",
        label: "Continue Meeting",
        icon: PlayCircle,
        tone: "success",
        placement: "direct",
        priority: 1,
        visible: isHost,
        enabled: true,
        color: "#22c55e",
      },
      {
        id: "review_quorum",
        label: "Review Quorum",
        icon: BarChart2,
        tone: "neutral",
        placement: "more",
        priority: 2,
        visible: isHost || isSecretary,
        enabled: true,
        color: "#6366f1",
      },
    ];
  }

  // ── Paused ────────────────────────────────────────────────────────────────
  if (status === "Paused") {
    const isHost = hasRole(roles, "host", "organizer");
    return [
      {
        id: "resume_meeting",
        label: "Resume Meeting",
        icon: Play,
        tone: "success",
        placement: "direct",
        priority: 1,
        visible: isHost,
        enabled: true,
        color: "#22c55e",
      },
      {
        id: "rejoin",
        label: "Rejoin Meeting",
        icon: Video,
        tone: "primary",
        placement: "direct",
        priority: 1,
        visible: !isHost,
        enabled: true,
        color: "#3b82f6",
      },
    ];
  }

  // ── On Break ──────────────────────────────────────────────────────────────
  if (status === "On Break") {
    const isHost = hasRole(roles, "host", "organizer");
    return [
      {
        id: "resume_break",
        label: "Resume After Break",
        icon: Play,
        tone: "success",
        placement: "direct",
        priority: 1,
        visible: isHost,
        enabled: true,
        color: "#22c55e",
      },
      {
        id: "rejoin",
        label: "Rejoin Meeting",
        icon: Video,
        tone: "primary",
        placement: "direct",
        priority: 1,
        visible: !isHost,
        enabled: true,
        color: "#3b82f6",
      },
    ];
  }

  // ── Adjourned ─────────────────────────────────────────────────────────────
  if (status === "Adjourned") {
    const isHost = hasRole(roles, "host", "organizer");
    return [
      {
        id: "resume_adjourned",
        label: "Resume Adjourned Meeting",
        icon: Play,
        tone: "success",
        placement: "direct",
        priority: 1,
        visible: isHost,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Resume this adjourned meeting?",
        color: "#22c55e",
      },
      {
        id: "reschedule_meeting",
        label: "Reschedule Meeting",
        icon: Clock,
        tone: "warning",
        placement: "direct",
        priority: 2,
        visible: isHost,
        enabled: true,
        requiresReason: true,
        reasonLabel: "New date and reason",
        color: "#f59e0b",
      },
    ];
  }

  // ── Awaiting Minutes ──────────────────────────────────────────────────────
  if (status === "Awaiting Minutes") {
    const isSecretary = hasRole(roles, "secretary");
    const hasMinutes = (ctx.relationships?.minutes ?? [])
      .some(m => m.meeting_id === str(ctx.record.meeting_id));
    return [
      {
        id: "prepare_minutes",
        label: "Prepare Minutes",
        icon: FileText,
        tone: "primary",
        placement: "direct",
        priority: 1,
        visible: isSecretary,
        enabled: !hasMinutes,
        disabledReason: hasMinutes ? "Minutes are already being prepared for this meeting." : undefined,
        color: "#6366f1",
      },
      {
        id: "view_record",
        label: "View Meeting Record",
        icon: FileText,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: !isSecretary,
        enabled: true,
        color: "#6b7280",
      },
      {
        id: "view_record",
        label: "View Meeting Record",
        icon: FileText,
        tone: "neutral",
        placement: "more",
        priority: 2,
        visible: isSecretary,
        enabled: true,
        color: "#6b7280",
      },
    ];
  }

  // ── Completed ─────────────────────────────────────────────────────────────
  if (status === "Completed") {
    return [
      {
        id: "view_record",
        label: "View Meeting Record",
        icon: FileText,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: true,
        enabled: true,
        color: "#6b7280",
      },
      {
        id: "create_next_meeting",
        label: "Create Next Meeting",
        icon: Plus,
        tone: "primary",
        placement: "direct",
        priority: 2,
        visible: hasRole(roles, "organizer", "host", "secretary"),
        enabled: true,
        color: "#3b82f6",
      },
    ];
  }

  // ── Archived ──────────────────────────────────────────────────────────────
  if (status === "Archived") {
    return [
      {
        id: "view_record",
        label: "View Archive",
        icon: BookOpen,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: true,
        enabled: true,
        color: "#6b7280",
      },
    ];
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (status === "Cancelled") {
    return [
      {
        id: "view_record",
        label: "View Record",
        icon: FileText,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: true,
        enabled: true,
        color: "#6b7280",
      },
      {
        id: "create_next_meeting",
        label: "Schedule New Meeting",
        icon: Plus,
        tone: "neutral",
        placement: "more",
        priority: 2,
        visible: hasRole(roles, "organizer", "host"),
        enabled: true,
        color: "#3b82f6",
      },
      {
        id: "archive",
        label: "Archive",
        icon: Archive,
        tone: "neutral",
        placement: "more",
        priority: 9,
        visible: hasRole(roles, "organizer", "approver"),
        enabled: true,
        color: "#6b7280",
      },
    ];
  }

  // ── Fallback: unknown status ──────────────────────────────────────────────
  return [
    {
      id: "view",
      label: "View Details",
      icon: Eye,
      tone: "neutral",
      placement: "direct",
      priority: 1,
      visible: true,
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "edit",
      label: "Edit",
      icon: Pencil,
      tone: "neutral",
      placement: "more",
      priority: 2,
      visible: hasRole(roles, "organizer", "host", "secretary", "approver"),
      enabled: true,
      color: "#3b82f6",
    },
    {
      id: "cancel",
      label: "Cancel",
      icon: XCircle,
      tone: "danger",
      placement: "more",
      priority: 9,
      visible: hasRole(roles, "organizer", "host"),
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Cancel this meeting?",
      color: "#ef4444",
    },
    {
      id: "resolve_readiness",
      label: "Resolve Readiness Issues",
      icon: AlertTriangle,
      tone: "warning",
      placement: "more",
      priority: 5,
      visible: hasRole(roles, "organizer", "host", "secretary"),
      enabled: true,
      color: "#f59e0b",
    },
  ];
}
