import {
  Eye, Pencil, CheckCircle2, XCircle, RotateCcw, Send,
  ArrowDown, ArrowUp, Clock, Trash2, FileText,
} from "lucide-react";
import type { ResolvedAction, ActionContext } from "../types";

function str(v: unknown): string { return String(v ?? ""); }

export function resolveAgendaActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.approval_status);
  const canApprove =
    ctx.permissions.includes("agenda_approve") ||
    ctx.userRole === "Super Admin" ||
    ctx.userRole === "Board Secretary" ||
    ctx.userRole === "Admin";
  const isOwner =
    str(ctx.record.submitted_by) === ctx.currentUser.name ||
    str(ctx.record.created_by) === ctx.currentUser.employeeId;

  // ── Pending ───────────────────────────────────────────────────────────────
  if (status === "Pending") {
    return [
      {
        id: "view",
        label: "Review Submission",
        icon: Eye,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: true,
        enabled: true,
        color: "#6b7280",
      },
      {
        id: "approve",
        label: "Approve",
        icon: CheckCircle2,
        tone: "success",
        placement: "direct",
        priority: 2,
        visible: canApprove,
        enabled: canApprove,
        disabledReason: "You do not have permission to approve agenda items.",
        requiresConfirmation: true,
        confirmMessage: "Approve this agenda item?",
        color: "#22c55e",
      },
      {
        id: "request_revision",
        label: "Request Revision",
        icon: RotateCcw,
        tone: "warning",
        placement: "direct",
        priority: 3,
        visible: canApprove,
        enabled: canApprove,
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
        visible: canApprove,
        enabled: canApprove,
        requiresReason: true,
        reasonLabel: "Reason for rejection",
        requiresConfirmation: true,
        confirmMessage: "Reject this agenda submission?",
        color: "#ef4444",
      },
      {
        id: "edit",
        label: "Edit Submission",
        icon: Pencil,
        tone: "neutral",
        placement: "more",
        priority: 5,
        visible: isOwner,
        enabled: true,
        color: "#3b82f6",
      },
    ];
  }

  // ── Approved ──────────────────────────────────────────────────────────────
  if (status === "Approved") {
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
        id: "move_up",
        label: "Move Up",
        icon: ArrowUp,
        tone: "neutral",
        placement: "direct",
        priority: 2,
        visible: canApprove,
        enabled: true,
        color: "#3b82f6",
      },
      {
        id: "move_down",
        label: "Move Down",
        icon: ArrowDown,
        tone: "neutral",
        placement: "direct",
        priority: 3,
        visible: canApprove,
        enabled: true,
        color: "#3b82f6",
      },
      {
        id: "defer",
        label: "Defer to Next Meeting",
        icon: Clock,
        tone: "warning",
        placement: "more",
        priority: 4,
        visible: canApprove,
        enabled: true,
        requiresReason: true,
        reasonLabel: "Deferral reason",
        color: "#f59e0b",
      },
    ];
  }

  // ── Deferred ──────────────────────────────────────────────────────────────
  if (status === "Deferred") {
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
        id: "approve",
        label: "Reinstate to Agenda",
        icon: CheckCircle2,
        tone: "primary",
        placement: "direct",
        priority: 2,
        visible: canApprove,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Reinstate this item to the active agenda?",
        color: "#22c55e",
      },
      {
        id: "edit",
        label: "Edit & Resubmit",
        icon: Pencil,
        tone: "neutral",
        placement: "more",
        priority: 3,
        visible: isOwner,
        enabled: true,
        color: "#3b82f6",
      },
    ];
  }

  // ── Rejected ──────────────────────────────────────────────────────────────
  if (status === "Rejected") {
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
        label: "Edit & Resubmit",
        icon: Send,
        tone: "neutral",
        placement: "direct",
        priority: 2,
        visible: isOwner,
        enabled: true,
        color: "#3b82f6",
      },
      {
        id: "delete",
        label: "Delete",
        icon: Trash2,
        tone: "danger",
        placement: "more",
        priority: 9,
        visible: isOwner,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Delete this rejected agenda item?",
        color: "#ef4444",
      },
    ];
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
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
      visible: canApprove || isOwner,
      enabled: true,
      color: "#3b82f6",
    },
    {
      id: "attach_document",
      label: "Attach Document",
      icon: FileText,
      tone: "neutral",
      placement: "more",
      priority: 3,
      visible: isOwner,
      enabled: true,
      color: "#6b7280",
    },
  ];
}
