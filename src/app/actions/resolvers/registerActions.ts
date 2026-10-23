/**
 * Action resolvers for register-type entities:
 * Decision, Resolution, ActionItem, Minutes, Question
 */
import {
  Eye, Pencil, CheckCircle2, XCircle, RotateCcw, Upload,
  Clock, Plus, Archive, FileText, MessageSquare, BarChart2,
  Printer, Download, Send, AlertTriangle, PlayCircle,
} from "lucide-react";
import type { ResolvedAction, ActionContext, ActionTone, ActionPlacement } from "../types";

function str(v: unknown): string { return String(v ?? ""); }

function isAdmin(ctx: ActionContext): boolean {
  return (
    ctx.userRole === "Super Admin" ||
    ctx.userRole === "Admin" ||
    ctx.userRole === "Board Secretary"
  );
}

// ── Decision ──────────────────────────────────────────────────────────────────

export function resolveDecisionActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.approval_status || ctx.record.implementation_status);
  const canApprove =
    ctx.permissions.includes("decision_approve") || isAdmin(ctx);
  const isOwner =
    str(ctx.record.decision_owner) === ctx.currentUser.name ||
    str(ctx.record.created_by) === ctx.currentUser.employeeId;
  const now = ctx.now;
  const deadline = str(ctx.record.implementation_deadline);
  const isOverdue = deadline
    ? new Date(deadline) < now && status !== "Implemented"
    : false;

  return [
    {
      id: "view",
      label: "View Decision",
      icon: Eye,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 1,
      visible: true,
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "edit",
      label: "Edit",
      icon: Pencil,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 2,
      visible: canApprove,
      enabled: status === "Pending" || status === "Deferred",
      disabledReason:
        status !== "Pending" && status !== "Deferred"
          ? "Only pending or deferred decisions can be edited."
          : undefined,
      color: "#3b82f6",
    },
    {
      id: "approve",
      label: "Approve Decision",
      icon: CheckCircle2,
      tone: "success" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: canApprove && status === "Pending",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Approve this decision?",
      color: "#22c55e",
    },
    {
      id: "mark_implemented",
      label: "Mark Implemented",
      icon: CheckCircle2,
      tone: "success" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: status === "Approved" && (isOwner || canApprove),
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Mark this decision as implemented?",
      color: "#22c55e",
    },
    {
      id: "defer",
      label: "Defer Decision",
      icon: Clock,
      tone: "warning" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 3,
      visible: canApprove && (status === "Pending" || status === "Approved"),
      enabled: true,
      requiresReason: true,
      reasonLabel: "Reason for deferral",
      color: "#f59e0b",
    },
    {
      id: "add_progress_update",
      label: "Add Progress Update",
      icon: BarChart2,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 4,
      visible: isOwner && status === "Approved",
      enabled: true,
      color: "#6366f1",
    },
    {
      id: "flag_overdue",
      label: "Flag as Overdue",
      icon: AlertTriangle,
      tone: "danger" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 5,
      visible: canApprove && isOverdue,
      enabled: true,
      color: "#ef4444",
    },
  ].filter(a => a.visible);
}

// ── Resolution ────────────────────────────────────────────────────────────────

export function resolveResolutionActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.approval_status);
  const canApprove =
    ctx.permissions.includes("resolution_approve") || isAdmin(ctx);

  return [
    {
      id: "view",
      label: "View Resolution",
      icon: Eye,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 1,
      visible: true,
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "approve",
      label: "Adopt Resolution",
      icon: CheckCircle2,
      tone: "success" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: canApprove && status === "Pending",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Formally adopt this resolution?",
      color: "#22c55e",
    },
    {
      id: "request_signature",
      label: "Request Signature",
      icon: FileText,
      tone: "primary" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: canApprove && status === "Adopted",
      enabled: true,
      color: "#6366f1",
    },
    {
      id: "reject",
      label: "Reject Resolution",
      icon: XCircle,
      tone: "danger" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 4,
      visible: canApprove && status === "Pending",
      enabled: true,
      requiresReason: true,
      reasonLabel: "Reason for rejection",
      requiresConfirmation: true,
      confirmMessage: "Reject this resolution?",
      color: "#ef4444",
    },
    {
      id: "print_resolution",
      label: "Print",
      icon: Printer,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 5,
      visible: status === "Adopted" || status === "Pending Signature",
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "archive",
      label: "Archive",
      icon: Archive,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 9,
      visible: canApprove && (status === "Adopted" || status === "Rejected"),
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Archive this resolution?",
      color: "#6b7280",
    },
  ].filter(a => a.visible);
}

// ── Action Item ───────────────────────────────────────────────────────────────

export function resolveActionItemActions(ctx: ActionContext): ResolvedAction[] {
  const implStatus = str(ctx.record.implementation_status);
  const approvalStatus = str(ctx.record.approval_status);
  const status = approvalStatus || implStatus;
  const canApprove =
    ctx.permissions.includes("action_item_approve") || isAdmin(ctx);
  const isAssignee =
    str(ctx.record.assigned_to) === ctx.currentUser.name;
  const now = ctx.now;
  const dueDate = str(ctx.record.due_date);
  const isOverdue =
    dueDate &&
    new Date(dueDate) < now &&
    !["Completed", "Cancelled"].includes(implStatus);

  return [
    {
      id: "view",
      label: "View Action Item",
      icon: Eye,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 1,
      visible: true,
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "update_progress",
      label: "Update Progress",
      icon: BarChart2,
      tone: "primary" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: isAssignee && implStatus !== "Completed" && implStatus !== "Cancelled",
      enabled: true,
      color: "#6366f1",
    },
    {
      id: "mark_complete",
      label: "Mark Complete",
      icon: CheckCircle2,
      tone: "success" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 3,
      visible:
        (isAssignee || canApprove) &&
        implStatus !== "Completed" &&
        implStatus !== "Cancelled",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Mark this action item as completed?",
      color: "#22c55e",
    },
    {
      id: "request_extension",
      label: "Request Extension",
      icon: Clock,
      tone: "warning" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 4,
      visible: isAssignee && isOverdue !== false,
      enabled: true,
      requiresReason: true,
      reasonLabel: "Reason for extension request",
      color: "#f59e0b",
    },
    {
      id: "reassign",
      label: "Reassign",
      icon: Send,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 5,
      visible: canApprove && implStatus !== "Completed",
      enabled: true,
      color: "#3b82f6",
    },
    {
      id: "cancel",
      label: "Cancel Action Item",
      icon: XCircle,
      tone: "danger" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 9,
      visible: canApprove && implStatus !== "Cancelled" && implStatus !== "Completed",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Cancel this action item?",
      requiresReason: true,
      reasonLabel: "Reason for cancellation",
      color: "#ef4444",
    },
    {
      id: "flag_overdue",
      label: "Flag as Overdue",
      icon: AlertTriangle,
      tone: "danger" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 6,
      visible: canApprove && !!isOverdue,
      enabled: true,
      color: "#ef4444",
    },
  ].filter(a => a.visible);
}

// ── Minutes ───────────────────────────────────────────────────────────────────

export function resolveMinutesActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.approval_status);
  const canApprove =
    ctx.permissions.includes("minutes_approve") || isAdmin(ctx);
  const isSecretary =
    str(ctx.record.minute_taker) === ctx.currentUser.name ||
    ctx.userRole === "Board Secretary";

  return [
    {
      id: "view",
      label: "View Minutes",
      icon: Eye,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 1,
      visible: true,
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "edit",
      label: "Edit Draft",
      icon: Pencil,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: (isSecretary || canApprove) && status === "Draft",
      enabled: true,
      color: "#3b82f6",
    },
    {
      id: "approve",
      label: "Submit for Review",
      icon: Send,
      tone: "primary" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: isSecretary && status === "Draft",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Submit these minutes for board review?",
      color: "#6366f1",
    },
    {
      id: "approve",
      label: "Approve Minutes",
      icon: CheckCircle2,
      tone: "success" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: canApprove && status === "Under Review",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Approve these minutes?",
      color: "#22c55e",
    },
    {
      id: "request_revision",
      label: "Request Amendment",
      icon: RotateCcw,
      tone: "warning" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 3,
      visible: canApprove && status === "Under Review",
      enabled: true,
      requiresReason: true,
      reasonLabel: "Amendment instructions",
      color: "#f59e0b",
    },
    {
      id: "print_minutes",
      label: "Print",
      icon: Printer,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 5,
      visible: status === "Approved",
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "download_document",
      label: "Download PDF",
      icon: Download,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 6,
      visible: status === "Approved",
      enabled: true,
      color: "#3b82f6",
    },
    {
      id: "supersede",
      label: "Supersede",
      icon: Archive,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 9,
      visible: canApprove && status === "Approved",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Supersede these minutes with a new version?",
      color: "#6b7280",
    },
  ].filter(a => a.visible);
}

// ── Question ──────────────────────────────────────────────────────────────────

export function resolveQuestionActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.current_status || ctx.record.approval_status);
  const canApprove =
    ctx.permissions.includes("question_respond") || isAdmin(ctx);
  const isOwner =
    str(ctx.record.asked_by) === ctx.currentUser.name ||
    str(ctx.record.submitted_by) === ctx.currentUser.name;

  return [
    {
      id: "view",
      label: "View Question",
      icon: Eye,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 1,
      visible: true,
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "assign_question",
      label: "Assign for Response",
      icon: Send,
      tone: "primary" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: canApprove && (status === "Open" || status === "Awaiting Response"),
      enabled: true,
      color: "#3b82f6",
    },
    {
      id: "submit_response",
      label: "Submit Response",
      icon: MessageSquare,
      tone: "success" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 3,
      visible: (canApprove || isOwner) && status === "Assigned",
      enabled: true,
      color: "#22c55e",
    },
    {
      id: "close_question",
      label: "Mark Resolved",
      icon: CheckCircle2,
      tone: "success" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 4,
      visible: canApprove && status === "Response Submitted",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Mark this question as resolved?",
      color: "#22c55e",
    },
    {
      id: "escalate",
      label: "Escalate",
      icon: AlertTriangle,
      tone: "warning" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 5,
      visible: canApprove && (status === "Awaiting Response" || status === "Assigned"),
      enabled: true,
      requiresReason: true,
      reasonLabel: "Escalation reason",
      color: "#f59e0b",
    },
    {
      id: "delete",
      label: "Delete",
      icon: XCircle,
      tone: "danger" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 9,
      visible: (isOwner || canApprove) && status === "Open",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Delete this question?",
      color: "#ef4444",
    },
  ].filter(a => a.visible);
}

// ── Workflow ──────────────────────────────────────────────────────────────────

export function resolveWorkflowActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.status);
  const canManage =
    ctx.permissions.includes("workflow_manage") || isAdmin(ctx);

  return [
    {
      id: "view",
      label: "View Workflow",
      icon: Eye,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 1,
      visible: true,
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "edit",
      label: "Edit Configuration",
      icon: Pencil,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: canManage && status === "Active",
      enabled: true,
      color: "#3b82f6",
    },
    {
      id: "activate_workflow",
      label: "Activate",
      icon: PlayCircle,
      tone: "success" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: canManage && status === "Inactive",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Activate this workflow?",
      color: "#22c55e",
    },
    {
      id: "deactivate_workflow",
      label: "Deactivate",
      icon: XCircle,
      tone: "warning" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 4,
      visible: canManage && status === "Active",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Deactivate this workflow? It will stop processing new triggers.",
      color: "#f59e0b",
    },
    {
      id: "duplicate",
      label: "Duplicate",
      icon: Plus,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 5,
      visible: canManage,
      enabled: true,
      color: "#6b7280",
    },
  ].filter(a => a.visible);
}

// ── Notification ──────────────────────────────────────────────────────────────

export function resolveNotificationActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.delivery_status || ctx.record.status);
  const canManage =
    ctx.permissions.includes("notification_manage") || isAdmin(ctx);

  return [
    {
      id: "view",
      label: "View Notification",
      icon: Eye,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 1,
      visible: true,
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "resend_notification",
      label: "Resend",
      icon: Send,
      tone: "primary" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: canManage && (status === "Failed" || status === "Pending"),
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Resend this notification?",
      color: "#3b82f6",
    },
    {
      id: "cancel",
      label: "Cancel Notification",
      icon: XCircle,
      tone: "danger" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 3,
      visible: canManage && status === "Pending",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Cancel this pending notification?",
      color: "#ef4444",
    },
  ].filter(a => a.visible);
}
