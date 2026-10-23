import {
  Eye, Pencil, CheckCircle2, XCircle, Upload, Archive,
  RotateCcw, Trash2, Download, History, Lock, Unlock,
} from "lucide-react";
import type { ResolvedAction, ActionContext } from "../types";

function str(v: unknown): string { return String(v ?? ""); }

export function resolveDocumentActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.approval_status);
  const canApprove =
    ctx.permissions.includes("doc_approve") ||
    ctx.userRole === "Super Admin" ||
    ctx.userRole === "Board Secretary" ||
    ctx.userRole === "Admin";
  const isOwner =
    str(ctx.record.owner) === ctx.currentUser.name ||
    str(ctx.record.created_by) === ctx.currentUser.employeeId;
  const confidential = str(ctx.record.confidentiality).toLowerCase() === "confidential";
  const canView = !confidential || canApprove || isOwner;

  // ── Draft ─────────────────────────────────────────────────────────────────
  if (status === "Draft") {
    return [
      {
        id: "edit",
        label: "Edit Document",
        icon: Pencil,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: isOwner || canApprove,
        enabled: true,
        color: "#3b82f6",
      },
      {
        id: "approve",
        label: "Submit for Review",
        icon: Upload,
        tone: "primary",
        placement: "direct",
        priority: 2,
        visible: isOwner,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Submit this document for review?",
        color: "#6366f1",
      },
      {
        id: "delete",
        label: "Delete Draft",
        icon: Trash2,
        tone: "danger",
        placement: "more",
        priority: 9,
        visible: isOwner,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Delete this draft document? This cannot be undone.",
        color: "#ef4444",
      },
    ];
  }

  // ── Under Review ──────────────────────────────────────────────────────────
  if (status === "Under Review") {
    return [
      {
        id: "view",
        label: "Review Document",
        icon: Eye,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: canView,
        enabled: canView,
        disabledReason: "You do not have access to this confidential document.",
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
        requiresConfirmation: true,
        confirmMessage: "Approve this document?",
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
        confirmMessage: "Reject this document?",
        color: "#ef4444",
      },
    ];
  }

  // ── Approved ──────────────────────────────────────────────────────────────
  if (status === "Approved") {
    return [
      {
        id: "view",
        label: "View Document",
        icon: Eye,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: canView,
        enabled: true,
        color: "#6b7280",
      },
      {
        id: "publish",
        label: "Publish",
        icon: Upload,
        tone: "primary",
        placement: "direct",
        priority: 2,
        visible: canApprove,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Publish this document? It will be visible to all participants.",
        color: "#22c55e",
      },
      {
        id: "download_document",
        label: "Download",
        icon: Download,
        tone: "neutral",
        placement: "more",
        priority: 3,
        visible: canView,
        enabled: true,
        color: "#3b82f6",
      },
    ];
  }

  // ── Published ─────────────────────────────────────────────────────────────
  if (status === "Published") {
    return [
      {
        id: "view",
        label: "View Document",
        icon: Eye,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: canView,
        enabled: canView,
        disabledReason: "You do not have access to this confidential document.",
        color: "#6b7280",
      },
      {
        id: "download_document",
        label: "Download",
        icon: Download,
        tone: "neutral",
        placement: "direct",
        priority: 2,
        visible: canView,
        enabled: canView,
        disabledReason: "You do not have access to this confidential document.",
        color: "#3b82f6",
      },
      {
        id: "version_history",
        label: "Version History",
        icon: History,
        tone: "neutral",
        placement: "more",
        priority: 3,
        visible: canApprove || isOwner,
        enabled: true,
        color: "#6b7280",
      },
      {
        id: "archive",
        label: "Archive",
        icon: Archive,
        tone: "neutral",
        placement: "more",
        priority: 9,
        visible: canApprove,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Archive this document?",
        color: "#6b7280",
      },
    ];
  }

  // ── Archived ──────────────────────────────────────────────────────────────
  if (status === "Archived") {
    return [
      {
        id: "view",
        label: "View Archive",
        icon: Eye,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: canView,
        enabled: true,
        color: "#6b7280",
      },
      {
        id: "version_history",
        label: "Version History",
        icon: History,
        tone: "neutral",
        placement: "more",
        priority: 2,
        visible: canApprove || isOwner,
        enabled: true,
        color: "#6b7280",
      },
    ];
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return [
    {
      id: "view",
      label: "View Document",
      icon: Eye,
      tone: "neutral",
      placement: "direct",
      priority: 1,
      visible: canView,
      enabled: canView,
      disabledReason: "You do not have access to this document.",
      color: "#6b7280",
    },
    {
      id: "edit",
      label: "Edit",
      icon: Pencil,
      tone: "neutral",
      placement: "more",
      priority: 2,
      visible: isOwner || canApprove,
      enabled: true,
      color: "#3b82f6",
    },
    {
      id: "lock_document",
      label: "Lock Access",
      icon: Lock,
      tone: "warning",
      placement: "more",
      priority: 5,
      visible: canApprove,
      enabled: true,
      color: "#f59e0b",
    },
    {
      id: "unlock_document",
      label: "Unlock Access",
      icon: Unlock,
      tone: "neutral",
      placement: "more",
      priority: 6,
      visible: canApprove,
      enabled: true,
      color: "#3b82f6",
    },
  ];
}
