/**
 * Bulk operation foundations — NOT wired to any visible UI.
 *
 * Defines types and per-row validation for future bulk user actions.
 * These are referenced by hidden infrastructure only; no UI component
 * imports this module yet.
 */

import type { AccountStatus } from "./bmsUsers";

export type BulkAction =
  | "bulk_invite"
  | "bulk_activate"
  | "bulk_suspend"
  | "bulk_deactivate"
  | "bulk_archive"
  | "bulk_assign_role"
  | "bulk_export";

export interface BulkOperationRow {
  userId:       string;
  displayName:  string;
  currentStatus: AccountStatus;
  isValid:      boolean;
  reason?:      string;
}

export interface BulkOperationConfig {
  action:           BulkAction;
  selectedUserIds:  string[];
  actorId:          string;
  actorName:        string;
  reason?:          string;
  roleId?:          string;
}

const BULK_ALLOWED_FROM: Partial<Record<BulkAction, AccountStatus[]>> = {
  bulk_invite:     ["draft"],
  bulk_activate:   ["invited", "pending_activation", "inactive"],
  bulk_suspend:    ["active"],
  bulk_deactivate: ["active", "suspended", "inactive"],
  bulk_archive:    ["inactive", "deactivated"],
  bulk_assign_role: ["active", "invited", "draft"],
};

export function validateBulkRow(
  userId: string,
  displayName: string,
  currentStatus: AccountStatus,
  action: BulkAction,
): BulkOperationRow {
  const allowed = BULK_ALLOWED_FROM[action];
  if (!allowed) {
    return { userId, displayName, currentStatus, isValid: true };
  }
  const isValid = allowed.includes(currentStatus);
  return {
    userId,
    displayName,
    currentStatus,
    isValid,
    reason: isValid ? undefined : `Cannot apply "${action}" to a user with status "${currentStatus}".`,
  };
}
