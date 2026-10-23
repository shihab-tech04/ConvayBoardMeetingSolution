/**
 * Account lifecycle state machine for the Board Meeting Solution.
 *
 * Defines valid account-status transitions, their requirements (reason,
 * sensitivity), and helpers to generate structured audit metadata.
 */

import type { AccountStatus } from "./bmsUsers";

// ── Valid transitions ─────────────────────────────────────────────────────────

export const VALID_TRANSITIONS: Readonly<Record<AccountStatus, readonly AccountStatus[]>> = {
  draft:              ["invited", "active", "archived"],
  invited:            ["pending_activation", "active", "archived"],
  pending_activation: ["active", "archived"],
  active:             ["suspended", "locked", "inactive", "deactivated", "archived"],
  suspended:          ["active", "deactivated", "archived"],
  locked:             ["active", "suspended", "deactivated"],
  inactive:           ["active", "deactivated", "archived"],
  deactivated:        ["archived"],
  archived:           ["inactive"],
};

export function isValidTransition(from: AccountStatus, to: AccountStatus): boolean {
  return (VALID_TRANSITIONS[from] as readonly string[]).includes(to);
}

// ── Transition requirements ────────────────────────────────────────────────────

export interface TransitionRequirements {
  requiresReason:  boolean;
  isSensitive:     boolean;
  impactSummary:   string;
  actionVerb:      string;
}

export function getTransitionRequirements(
  from: AccountStatus,
  to: AccountStatus,
): TransitionRequirements {
  const key = `${from}→${to}`;
  switch (key) {
    case "draft→invited":
      return { requiresReason: false, isSensitive: false, actionVerb: "send invitation",  impactSummary: "An invitation email will be sent to the user." };
    case "draft→active":
      return { requiresReason: false, isSensitive: true,  actionVerb: "activate directly", impactSummary: "User will immediately have system access without an invitation flow." };
    case "draft→archived":
      return { requiresReason: true,  isSensitive: false, actionVerb: "archive",           impactSummary: "Draft record will be archived before ever being activated." };
    case "invited→pending_activation":
      return { requiresReason: false, isSensitive: false, actionVerb: "mark pending",      impactSummary: "User has opened the invitation link and is completing activation." };
    case "invited→active":
      return { requiresReason: false, isSensitive: true,  actionVerb: "activate",          impactSummary: "User bypasses the invitation flow and gains immediate access." };
    case "invited→archived":
      return { requiresReason: true,  isSensitive: false, actionVerb: "archive",           impactSummary: "Invitation will be cancelled and the user record archived." };
    case "pending_activation→active":
      return { requiresReason: false, isSensitive: false, actionVerb: "complete activation", impactSummary: "User completes the invitation flow and gains active access." };
    case "pending_activation→archived":
      return { requiresReason: true,  isSensitive: false, actionVerb: "archive",           impactSummary: "Pending activation will be cancelled and the user archived." };
    case "active→suspended":
      return { requiresReason: true,  isSensitive: false, actionVerb: "suspend",           impactSummary: "User will immediately lose all system access. Suspension can be reversed." };
    case "active→locked":
      return { requiresReason: false, isSensitive: false, actionVerb: "lock",              impactSummary: "User account is locked. Sessions are terminated." };
    case "active→inactive":
      return { requiresReason: true,  isSensitive: false, actionVerb: "set inactive",      impactSummary: "User access is removed but the record is preserved." };
    case "active→deactivated":
      return { requiresReason: true,  isSensitive: true,  actionVerb: "deactivate",        impactSummary: "User loses all access permanently until explicitly restored by an administrator." };
    case "active→archived":
      return { requiresReason: true,  isSensitive: true,  actionVerb: "archive",           impactSummary: "User record is archived. Historical relationships are preserved." };
    case "suspended→active":
      return { requiresReason: false, isSensitive: false, actionVerb: "unsuspend",         impactSummary: "User regains their previous access level." };
    case "suspended→deactivated":
      return { requiresReason: true,  isSensitive: true,  actionVerb: "deactivate",        impactSummary: "Suspended user is permanently deactivated." };
    case "suspended→archived":
      return { requiresReason: true,  isSensitive: false, actionVerb: "archive",           impactSummary: "Suspended user record is archived." };
    case "locked→active":
      return { requiresReason: false, isSensitive: false, actionVerb: "unlock",            impactSummary: "Account lock is cleared. Failed-login counter is reset." };
    case "locked→suspended":
      return { requiresReason: true,  isSensitive: false, actionVerb: "suspend",           impactSummary: "Locked account is moved to suspended state." };
    case "locked→deactivated":
      return { requiresReason: true,  isSensitive: true,  actionVerb: "deactivate",        impactSummary: "Locked account is permanently deactivated." };
    case "inactive→active":
      return { requiresReason: false, isSensitive: false, actionVerb: "reactivate",        impactSummary: "User account is restored to active status." };
    case "inactive→deactivated":
      return { requiresReason: true,  isSensitive: false, actionVerb: "deactivate",        impactSummary: "Inactive user is permanently deactivated." };
    case "inactive→archived":
      return { requiresReason: true,  isSensitive: false, actionVerb: "archive",           impactSummary: "Inactive user record is archived." };
    case "deactivated→archived":
      return { requiresReason: true,  isSensitive: false, actionVerb: "archive",           impactSummary: "Deactivated user record is archived for long-term retention." };
    case "archived→inactive":
      return { requiresReason: false, isSensitive: false, actionVerb: "restore",           impactSummary: "Archived user is restored to inactive. An administrator can then reactivate them." };
    default:
      return { requiresReason: false, isSensitive: false, actionVerb: "change status",     impactSummary: "Account status will be updated." };
  }
}

// ── Lifecycle audit metadata ───────────────────────────────────────────────────

export interface LifecycleTransitionRecord {
  user_id:          string;
  from_status:      AccountStatus;
  to_status:        AccountStatus;
  actor_id:         string;
  actor_name:       string;
  timestamp:        string;
  reason?:          string;
  is_sensitive:     boolean;
  impact_summary:   string;
}

export function buildLifecycleTransitionRecord(params: {
  userId:     string;
  from:       AccountStatus;
  to:         AccountStatus;
  actorId:    string;
  actorName:  string;
  reason?:    string;
}): LifecycleTransitionRecord {
  const { userId, from, to, actorId, actorName, reason } = params;
  const req = getTransitionRequirements(from, to);
  return {
    user_id:        userId,
    from_status:    from,
    to_status:      to,
    actor_id:       actorId,
    actor_name:     actorName,
    timestamp:      new Date().toISOString(),
    reason,
    is_sensitive:   req.isSensitive,
    impact_summary: req.impactSummary,
  };
}

// ── Sensitive permissions ─────────────────────────────────────────────────────

export const SENSITIVE_PERM_IDS = new Set([
  "admin_users",
  "admin_users_add",
  "admin_users_reassign",
  "admin_roles",
  "admin_config",
  "doc_approve",
  "doc_publish",
  "mtg_approve",
  "min_approve",
  "gov_body_manage",
  "gov_org_manage",
]);

export function isSensitivePermission(permId: string): boolean {
  return SENSITIVE_PERM_IDS.has(permId);
}

// ── Status display helpers ────────────────────────────────────────────────────

export const ACCOUNT_STATUS_DISPLAY: Record<AccountStatus, { label: string; canTransitionTo: readonly AccountStatus[] }> = {
  draft:              { label: "Draft",              canTransitionTo: VALID_TRANSITIONS.draft },
  invited:            { label: "Invited",            canTransitionTo: VALID_TRANSITIONS.invited },
  pending_activation: { label: "Pending Activation", canTransitionTo: VALID_TRANSITIONS.pending_activation },
  active:             { label: "Active",             canTransitionTo: VALID_TRANSITIONS.active },
  suspended:          { label: "Suspended",          canTransitionTo: VALID_TRANSITIONS.suspended },
  locked:             { label: "Locked",             canTransitionTo: VALID_TRANSITIONS.locked },
  inactive:           { label: "Inactive",           canTransitionTo: VALID_TRANSITIONS.inactive },
  deactivated:        { label: "Deactivated",        canTransitionTo: VALID_TRANSITIONS.deactivated },
  archived:           { label: "Archived",           canTransitionTo: VALID_TRANSITIONS.archived },
};
