import {
  Eye, Pencil, CheckCircle2, XCircle, Users, Plus,
  Archive, Lock, Unlock, RotateCcw, Shield, UserPlus,
  Mail, Key, Trash2,
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

// ── Governance Body ───────────────────────────────────────────────────────────

export function resolveGovernanceBodyActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.status);
  const canManage =
    ctx.permissions.includes("governance_manage") || isAdmin(ctx);

  return [
    {
      id: "view",
      label: "View Body Details",
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
      id: "manage_members",
      label: "Manage Members",
      icon: Users,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 3,
      visible: canManage,
      enabled: status === "Active",
      disabledReason:
        status !== "Active" ? "Members can only be managed for active governance bodies." : undefined,
      color: "#3b82f6",
    },
    {
      id: "add_member",
      label: "Add Member",
      icon: UserPlus,
      tone: "primary" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 4,
      visible: canManage && status === "Active",
      enabled: true,
      color: "#22c55e",
    },
    {
      id: "deactivate",
      label: "Deactivate",
      icon: XCircle,
      tone: "warning" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 5,
      visible: canManage && status === "Active",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Deactivate this governance body? All associated meetings will require reassignment.",
      requiresReason: true,
      reasonLabel: "Reason for deactivation",
      color: "#f59e0b",
    },
    {
      id: "activate",
      label: "Activate",
      icon: CheckCircle2,
      tone: "success" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 5,
      visible: canManage && status === "Inactive",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Reactivate this governance body?",
      color: "#22c55e",
    },
    {
      id: "duplicate",
      label: "Duplicate Structure",
      icon: Plus,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 6,
      visible: canManage,
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
      visible: canManage && status === "Inactive",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Archive this governance body record?",
      color: "#6b7280",
    },
  ].filter(a => a.visible);
}

// ── User ──────────────────────────────────────────────────────────────────────

export function resolveUserActions(ctx: ActionContext): ResolvedAction[] {
  const status = str(ctx.record.status);
  const canManage =
    ctx.permissions.includes("admin_users") || isAdmin(ctx);
  const isSelf =
    str(ctx.record.employeeId) === ctx.currentUser.employeeId ||
    str(ctx.record.name) === ctx.currentUser.name;

  return [
    {
      id: "view",
      label: "View Profile",
      icon: Eye,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 1,
      visible: canManage || isSelf,
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "edit",
      label: "Edit User",
      icon: Pencil,
      tone: "neutral" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 2,
      visible: canManage,
      enabled: true,
      color: "#3b82f6",
    },
    {
      id: "assign_role",
      label: "Assign Role",
      icon: Shield,
      tone: "primary" as ActionTone,
      placement: "direct" as ActionPlacement,
      priority: 3,
      visible: canManage && !isSelf,
      enabled: true,
      color: "#6366f1",
    },
    {
      id: "send_invite",
      label: "Resend Invitation",
      icon: Mail,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 4,
      visible: canManage && status === "Pending",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Resend invitation email to this user?",
      color: "#3b82f6",
    },
    {
      id: "reset_password",
      label: "Reset Password",
      icon: Key,
      tone: "warning" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 5,
      visible: canManage,
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Send a password reset link to this user?",
      color: "#f59e0b",
    },
    {
      id: "deactivate_user",
      label: "Deactivate User",
      icon: Lock,
      tone: "warning" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 6,
      visible: canManage && status === "Active" && !isSelf,
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Deactivate this user account? They will be unable to log in.",
      requiresReason: true,
      reasonLabel: "Reason for deactivation",
      color: "#f59e0b",
    },
    {
      id: "activate_user",
      label: "Activate User",
      icon: Unlock,
      tone: "success" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 6,
      visible: canManage && status === "Inactive",
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Reactivate this user account?",
      color: "#22c55e",
    },
    {
      id: "toggle_2fa",
      label: "Manage 2FA",
      icon: Key,
      tone: "neutral" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 7,
      visible: canManage || isSelf,
      enabled: true,
      color: "#6b7280",
    },
    {
      id: "delete",
      label: "Delete User",
      icon: Trash2,
      tone: "danger" as ActionTone,
      placement: "more" as ActionPlacement,
      priority: 9,
      visible: canManage && status === "Inactive" && !isSelf,
      enabled: true,
      requiresConfirmation: true,
      confirmMessage: "Permanently delete this user account?",
      requiresReason: true,
      reasonLabel: "Reason for deletion",
      color: "#ef4444",
    },
  ].filter(a => a.visible);
}
