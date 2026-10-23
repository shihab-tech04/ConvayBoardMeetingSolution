/**
 * BmsUser — the canonical user model for the Board Meeting Solution.
 *
 * Single source of truth for all user records.
 * Storage key: bms.users
 *
 * useUserRegistry is a compatibility adapter that reads/writes through this
 * registry and exposes the legacy SystemUser shape for existing pages.
 */

import { createEntityRegistry, type EntityRecord } from "../hooks/useEntityRegistry";
import type { SystemUser } from "./mockData";

// ── Types ──────────────────────────────────────────────────────────────────────

export type UserType =
  | "Internal Employee"
  | "Governance Member"
  | "External Participant"
  | "Service Account";

export type AccountStatus =
  | "draft"
  | "invited"
  | "pending_activation"
  | "active"
  | "suspended"
  | "locked"
  | "inactive"
  | "deactivated"
  | "archived";

export type InvitationStatus =
  | "not_sent"
  | "pending"
  | "sent"
  | "opened"
  | "accepted"
  | "declined"
  | "expired"
  | "activated"
  | "cancelled"
  | "delivery_failed";

export interface BmsUser extends EntityRecord {
  // ── Identity ────────────────────────────────────────────────────────────────
  user_type?:             UserType;
  name:                   string;
  display_name?:          string;
  employee_id:            string;
  external_reference_id?: string;
  email:                  string;
  phone?:                 string;
  secondary_email?:       string;
  profile_image?:         string;
  preferred_language?:    string;
  timezone?:              string;

  // ── Organisation ────────────────────────────────────────────────────────────
  designation_id?:        string;
  position?:              string;
  employment_type?:       "full_time" | "part_time" | "contract" | "board_appointed" | "honorary";
  employment_start_at?:   string;
  employment_end_at?:     string;
  primary_org_unit_id?:   string;
  branch_id?:             string;
  division_id?:           string;
  department_id?:         string;
  manager_user_id?:       string;

  // ── Roles ───────────────────────────────────────────────────────────────────
  role_ids?:              string[];
  primary_role_id?:       string;
  governance_membership_ids?: string[];

  // ── Status ──────────────────────────────────────────────────────────────────
  account_status?:        AccountStatus;
  invitation_status?:     InvitationStatus;
  two_factor_required?:   boolean;
  two_factor_enabled?:    boolean;
  two_factor_enrolled?:   boolean;

  // ── Access dates ────────────────────────────────────────────────────────────
  access_start_at?:       string;
  access_expires_at?:     string;
  last_login_at?:         string;
  last_active_at?:        string;

  // ── Security events ─────────────────────────────────────────────────────────
  failed_login_count?:    number;
  locked_at?:             string;
  suspended_at?:          string;
  suspension_reason?:     string;
  deactivated_at?:        string;
  deactivation_reason?:   string;

  // ── Audit ───────────────────────────────────────────────────────────────────
  created_by?:            string;
  updated_at?:            string;
  updated_by?:            string;
  archived_at?:           string;
  archived_by?:           string;

  // ── Legacy compatibility display strings (kept for existing pages) ───────────
  /** Display label for the designation (e.g. "Board Chairman"). */
  designation?:           string;
  /** Primary role display name. */
  role?:                  string;
  /** Legacy org-unit display label (circle). */
  circle?:                string;
  /** Legacy position / zone display label. */
  zone?:                  string;
  /** Legacy level display label. */
  level?:                 string;
  /** ISO date string of last activity — legacy alias for last_active_at. */
  lastActive?:            string;
  /** Whether an invitation was requested at creation time. */
  sendInvite?:            boolean;
  /** Legacy 2FA flag — alias for two_factor_enabled. */
  twoFA?:                 boolean;
  /** Legacy active flag. */
  accountActive?:         boolean;
  /** Coarse display status for backward compat with SystemUser. */
  status?:                "Active" | "Inactive" | "Pending";
  /** Legacy role ID stored alongside display name. */
  role_id?:               string;
}

// ── Canonical status → legacy UserStatus mapping ──────────────────────────────

function mapAccountStatusToLegacy(status?: AccountStatus): "Active" | "Inactive" | "Pending" {
  switch (status) {
    case "active":             return "Active";
    case "invited":
    case "pending_activation":
    case "draft":              return "Pending";
    default:                   return "Inactive";
  }
}

// ── Conversion helpers ─────────────────────────────────────────────────────────

/**
 * Map a legacy SystemUser to a BmsUser, preserving all display fields and
 * deriving canonical status values.
 */
export function systemUserToBmsUser(u: SystemUser): BmsUser {
  // Accept extended shapes passed from UserFormModal
  const ext = u as SystemUser & {
    primary_org_unit_id?: string;
    role_id?: string;
    position?: string;
  };
  return {
    id:          u.id,
    created_at:  new Date().toISOString(),
    name:        u.name,
    email:       u.email,
    employee_id: u.employeeId,
    phone:       u.phone,
    designation: u.designation,
    role:        u.role,
    circle:      u.circle,
    zone:        u.zone,
    level:       u.level,
    status:      u.status,
    lastActive:  u.lastActive,
    sendInvite:  u.sendInvite,
    twoFA:       u.twoFA,
    two_factor_enabled:  u.twoFA,
    accountActive:       u.accountActive,
    account_status:      u.accountActive  ? "active"
                       : u.status === "Pending" ? "pending_activation"
                       : "inactive",
    invitation_status:   u.sendInvite ? "pending" : "not_sent",
    // Stable ID fields from extended form shape
    primary_org_unit_id: ext.primary_org_unit_id,
    role_id:             ext.role_id,
    position:            ext.position ?? u.zone,
  };
}

/**
 * Map a BmsUser back to the legacy SystemUser shape for existing pages.
 */
export function bmsUserToSystemUser(u: BmsUser): SystemUser {
  const legacyStatus: "Active" | "Inactive" | "Pending" =
    u.status ?? mapAccountStatusToLegacy(u.account_status);

  return {
    id:           u.id,
    name:         u.name,
    employeeId:   u.employee_id,
    email:        u.email,
    phone:        u.phone ?? "",
    designation:  u.designation ?? u.position ?? "",
    circle:       u.circle ?? "",
    zone:         u.zone ?? u.position ?? "",
    level:        u.level ?? "",
    role:         u.role ?? "",
    status:       legacyStatus,
    lastActive:   u.last_active_at ?? u.lastActive ?? "",
    sendInvite:   u.sendInvite ?? false,
    twoFA:        u.two_factor_enabled ?? u.twoFA ?? false,
    accountActive: u.account_status === "active" || (u.accountActive === true && !u.account_status),
  };
}

// ── Seed / mock data ───────────────────────────────────────────────────────────

import { MOCK_USERS } from "./mockData";

export const MOCK_BMS_USERS: BmsUser[] = MOCK_USERS.map(systemUserToBmsUser);

// ── User registry ──────────────────────────────────────────────────────────────

export const useBmsUserRegistry = createEntityRegistry<BmsUser>(
  "bms.users",
  "bms:users-updated",
  MOCK_BMS_USERS,
);

// ── User invitation ────────────────────────────────────────────────────────────

export interface UserInvitation extends EntityRecord {
  user_id:          string;
  email:            string;
  status:           InvitationStatus;
  sent_at?:         string;
  sent_by?:         string;
  opened_at?:       string;
  expires_at?:      string;
  resend_count?:    number;
  last_resent_at?:  string;
  activated_at?:    string;
  cancelled_at?:    string;
  delivery_status?: "queued" | "delivered" | "failed" | "bounced";
}

export const useUserInvitationRegistry = createEntityRegistry<UserInvitation>(
  "bms.invitations",
  "bms:invitations-updated",
  [],
);
