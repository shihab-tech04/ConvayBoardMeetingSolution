import {
  Eye, Pencil, CheckCircle2, XCircle, Upload, Archive,
  RotateCcw, Plus, Download, History, Package,
} from "lucide-react";
import type { ResolvedAction, ActionContext } from "../types";

function str(v: unknown): string { return String(v ?? ""); }

export function resolveBoardPackActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.approval_status);
  const canApprove =
    ctx.permissions.includes("board_pack_approve") ||
    ctx.userRole === "Super Admin" ||
    ctx.userRole === "Board Secretary" ||
    ctx.userRole === "Admin";
  const isOwner =
    str(ctx.record.created_by) === ctx.currentUser.name ||
    str(ctx.record.created_by) === ctx.currentUser.employeeId;
  const canEdit = isOwner || canApprove;

  // ── Draft ─────────────────────────────────────────────────────────────────
  if (status === "Draft") {
    return [
      {
        id: "edit",
        label: "Edit Board Pack",
        icon: Pencil,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: canEdit,
        enabled: true,
        color: "#3b82f6",
      },
      {
        id: "approve",
        label: "Submit for Approval",
        icon: Upload,
        tone: "primary",
        placement: "direct",
        priority: 2,
        visible: isOwner,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Submit this board pack for approval?",
        color: "#6366f1",
      },
      {
        id: "add_document",
        label: "Add Document",
        icon: Plus,
        tone: "neutral",
        placement: "more",
        priority: 3,
        visible: canEdit,
        enabled: true,
        color: "#3b82f6",
      },
    ];
  }

  // ── Pending Approval ──────────────────────────────────────────────────────
  if (status === "Pending Approval") {
    return [
      {
        id: "view",
        label: "Review Pack",
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
        disabledReason: "You do not have permission to approve board packs.",
        requiresConfirmation: true,
        confirmMessage: "Approve this board pack?",
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
        confirmMessage: "Reject this board pack?",
        color: "#ef4444",
      },
    ];
  }

  // ── Approved ──────────────────────────────────────────────────────────────
  if (status === "Approved") {
    return [
      {
        id: "view",
        label: "View Board Pack",
        icon: Eye,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: true,
        enabled: true,
        color: "#6b7280",
      },
      {
        id: "publish",
        label: "Publish Board Pack",
        icon: Upload,
        tone: "primary",
        placement: "direct",
        priority: 2,
        visible: canApprove,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Publish this board pack? It will be distributed to all participants.",
        color: "#22c55e",
      },
      {
        id: "download_document",
        label: "Download",
        icon: Download,
        tone: "neutral",
        placement: "more",
        priority: 3,
        visible: true,
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
        label: "View Board Pack",
        icon: Eye,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: true,
        enabled: true,
        color: "#6b7280",
      },
      {
        id: "download_document",
        label: "Download",
        icon: Download,
        tone: "neutral",
        placement: "direct",
        priority: 2,
        visible: true,
        enabled: true,
        color: "#3b82f6",
      },
      {
        id: "create_board_pack",
        label: "Create New Version",
        icon: Package,
        tone: "neutral",
        placement: "more",
        priority: 3,
        visible: canApprove,
        enabled: true,
        color: "#8b5cf6",
      },
      {
        id: "version_history",
        label: "Version History",
        icon: History,
        tone: "neutral",
        placement: "more",
        priority: 4,
        visible: true,
        enabled: true,
        color: "#6b7280",
      },
      {
        id: "archive",
        label: "Supersede / Archive",
        icon: Archive,
        tone: "neutral",
        placement: "more",
        priority: 9,
        visible: canApprove,
        enabled: true,
        requiresConfirmation: true,
        confirmMessage: "Mark this board pack as superseded?",
        color: "#6b7280",
      },
    ];
  }

  // ── Superseded / Archived ─────────────────────────────────────────────────
  if (status === "Superseded" || status === "Archived") {
    return [
      {
        id: "view",
        label: "View Board Pack",
        icon: Eye,
        tone: "neutral",
        placement: "direct",
        priority: 1,
        visible: true,
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
        visible: true,
        enabled: true,
        color: "#6b7280",
      },
    ];
  }

  // ── Fallback ──────────────────────────────────────────────────────────────
  return [
    {
      id: "view",
      label: "View Board Pack",
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
      visible: canEdit,
      enabled: true,
      color: "#3b82f6",
    },
  ];
}
