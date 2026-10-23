/**
 * BmsRole — the canonical role model for the Board Meeting Solution.
 *
 * Single source of truth for all role records.
 * Storage key: bms.roles.canonical
 *
 * useRoleRegistry is a compatibility adapter that reads/writes through this
 * registry and exposes the legacy SystemRole shape for existing pages.
 */

import { createEntityRegistry, type EntityRecord } from "../hooks/useEntityRegistry";
import type { SystemRole } from "./mockData";
import { ALL_PERM_IDS } from "./permissions";

// ── Types ──────────────────────────────────────────────────────────────────────

export type RoleCategory =
  | "system"
  | "governance"
  | "operational"
  | "external";

export type RoleOrgScope =
  | "global"
  | "committee"
  | "department"
  | "board";

export type RoleStatus = "Active" | "Inactive";

export interface BmsRole extends EntityRecord {
  name:                   string;
  description?:           string;
  category?:              RoleCategory;
  permission_ids:         string[];
  organizational_scope?:  RoleOrgScope;
  is_sensitive?:          boolean;
  is_system_role?:        boolean;
  status:                 RoleStatus;
  updated_at?:            string;

  // ── Legacy compatibility (kept for existing pages) ───────────────────────────
  /** Legacy level display label (e.g. "Super Admin", "Board Director"). */
  level?:                 string;
  /** Approximate count of users assigned this role. */
  usersCount?:            number;
}

// ── Conversion helpers ─────────────────────────────────────────────────────────

export function bmsRoleToSystemRole(r: BmsRole): SystemRole {
  return {
    id:          r.id,
    name:        r.name,
    description: r.description ?? "",
    level:       r.level ?? r.category ?? "",
    status:      r.status,
    usersCount:  r.usersCount ?? 0,
    permissions: r.permission_ids,
  };
}

export function systemRoleToBmsRole(r: SystemRole): BmsRole {
  return {
    id:             r.id,
    created_at:     new Date().toISOString(),
    name:           r.name,
    description:    r.description,
    permission_ids: r.permissions,
    status:         r.status,
    level:          r.level,
    usersCount:     r.usersCount,
    is_system_role: false,
  };
}

// ── Seed data ──────────────────────────────────────────────────────────────────

// Board-meeting-scoped permission presets (no tax/PSR/TIN IDs)
const BOARD_PERMS = [
  "home_dashboard", "home_overview", "home_my_tasks", "home_my_calendar",
  "mtg_view", "mtg_approve",
  "agd_view", "agd_approve",
  "dec_view", "dec_approve", "res_view", "res_approve",
  "act_view", "gov_body_view", "gov_group_view", "gov_org_view",
  "arc_view", "rep_meeting", "rep_decisions", "rep_governance", "rep_export", "rep_print",
  "admin_users", "admin_users_add", "admin_roles",
];

const DIRECTOR_PERMS = [
  "home_dashboard", "home_overview", "home_my_tasks", "home_my_calendar",
  "mtg_view", "mtg_approve",
  "agd_view", "agd_approve",
  "dec_view", "dec_approve", "res_view", "res_approve", "act_view",
  "gov_body_view", "gov_group_view", "gov_org_view",
  "arc_view", "rep_meeting", "rep_decisions", "rep_governance", "rep_export", "rep_print",
];

const COMMITTEE_CHAIR_PERMS = [
  "home_dashboard", "home_overview", "home_my_tasks",
  "mtg_view", "mtg_create", "mtg_update", "mtg_approve", "mtg_participants", "mtg_rsvp", "mtg_attendance",
  "agd_submit", "agd_review", "agd_approve", "agd_view",
  "doc_upload", "doc_view", "doc_download", "doc_edit", "doc_comment", "doc_review", "doc_approve", "doc_publish",
  "dec_record", "dec_view", "dec_approve", "res_create", "res_view", "res_approve",
  "act_create", "act_view", "act_update", "act_close", "min_create", "min_approve",
  "gov_body_view", "gov_group_view", "gov_org_view",
  "arc_view", "rep_meeting", "rep_decisions", "rep_attendance", "rep_export", "rep_print",
];

const SECRETARY_PERMS = [
  "home_dashboard", "home_overview", "home_my_tasks", "home_my_calendar",
  "mtg_view", "mtg_create", "mtg_update", "mtg_participants", "mtg_rsvp", "mtg_attendance", "mtg_poll",
  "agd_submit", "agd_review", "agd_view",
  "doc_upload", "doc_view", "doc_download", "doc_edit", "doc_comment",
  "dec_record", "dec_view", "res_create", "res_view",
  "act_create", "act_view", "act_update", "act_close", "min_create",
  "gov_body_view", "gov_group_view",
  "arc_view", "rep_meeting", "rep_actions", "rep_attendance",
];

const DATA_ENTRY_PERMS = [
  "home_dashboard", "mtg_view",
  "agd_view", "doc_view", "doc_download", "doc_upload",
  "dec_view", "act_view",
];

const GOVERNANCE_OFFICER_PERMS = [
  "home_dashboard", "home_overview",
  "gov_body_view", "gov_body_manage", "gov_group_view", "gov_group_manage",
  "gov_org_view", "gov_org_manage",
  "mtg_view", "agd_view", "dec_view", "res_view", "act_view",
  "arc_view", "rep_governance",
];

const ANALYST_PERMS = [
  "home_dashboard", "home_overview",
  "mtg_view", "agd_view", "dec_view", "res_view", "act_view",
  "arc_view", "arc_export",
  "rep_meeting", "rep_decisions", "rep_actions", "rep_attendance", "rep_governance", "rep_export", "rep_print",
];

const VIEWER_PERMS = [
  "home_dashboard", "home_overview",
  "mtg_view", "agd_view",
];

export const MOCK_BMS_ROLES: BmsRole[] = [
  {
    id: "r1", created_at: "2024-01-01T00:00:00.000Z",
    name: "System Administrator",
    description: "Full system access with all permissions",
    category: "system",
    permission_ids: ALL_PERM_IDS,
    organizational_scope: "global",
    is_sensitive: true,
    is_system_role: true,
    status: "Active",
    level: "Super Admin",
    usersCount: 2,
  },
  {
    id: "r2", created_at: "2024-01-01T00:00:00.000Z",
    name: "Board Chairman",
    description: "Board meeting oversight and governance",
    category: "governance",
    permission_ids: BOARD_PERMS,
    organizational_scope: "board",
    is_sensitive: true,
    is_system_role: false,
    status: "Active",
    level: "Admin",
    usersCount: 5,
  },
  {
    id: "r3", created_at: "2024-01-01T00:00:00.000Z",
    name: "Board Director",
    description: "Director-level board participation and governance",
    category: "governance",
    permission_ids: DIRECTOR_PERMS,
    organizational_scope: "board",
    is_sensitive: false,
    is_system_role: false,
    status: "Active",
    level: "Board Director",
    usersCount: 8,
  },
  {
    id: "r4", created_at: "2024-01-01T00:00:00.000Z",
    name: "Committee Chair",
    description: "Senior committee management and meeting administration",
    category: "governance",
    permission_ids: COMMITTEE_CHAIR_PERMS,
    organizational_scope: "committee",
    is_sensitive: false,
    is_system_role: false,
    status: "Active",
    level: "Meeting Secretary",
    usersCount: 15,
  },
  {
    id: "r5", created_at: "2024-01-01T00:00:00.000Z",
    name: "Meeting Secretary",
    description: "Standard meeting secretariat operations",
    category: "operational",
    permission_ids: SECRETARY_PERMS,
    organizational_scope: "committee",
    is_sensitive: false,
    is_system_role: false,
    status: "Active",
    level: "Meeting Secretary",
    usersCount: 42,
  },
  {
    id: "r6", created_at: "2024-01-01T00:00:00.000Z",
    name: "Meeting Data Entry",
    description: "Data entry for meeting materials and documents",
    category: "operational",
    permission_ids: DATA_ENTRY_PERMS,
    organizational_scope: "department",
    is_sensitive: false,
    is_system_role: false,
    status: "Active",
    level: "Data Entry Operator",
    usersCount: 18,
  },
  {
    id: "r7", created_at: "2024-01-01T00:00:00.000Z",
    name: "Governance Officer",
    description: "Governance body and organisation unit management",
    category: "governance",
    permission_ids: GOVERNANCE_OFFICER_PERMS,
    organizational_scope: "global",
    is_sensitive: false,
    is_system_role: false,
    status: "Active",
    level: "Data Entry Operator",
    usersCount: 6,
  },
  {
    id: "r8", created_at: "2024-01-01T00:00:00.000Z",
    name: "Report Analyst",
    description: "Read-only access to all reports and archive",
    category: "operational",
    permission_ids: ANALYST_PERMS,
    organizational_scope: "global",
    is_sensitive: false,
    is_system_role: false,
    status: "Active",
    level: "Viewer",
    usersCount: 12,
  },
  {
    id: "r9", created_at: "2024-01-01T00:00:00.000Z",
    name: "Governance Reviewer",
    description: "Read-only review of governance and decisions",
    category: "governance",
    permission_ids: [
      "home_dashboard", "home_overview",
      "gov_body_view", "gov_group_view", "gov_org_view",
      "mtg_view", "agd_view", "dec_view", "res_view", "act_view",
      "arc_view", "rep_governance", "rep_decisions",
    ],
    organizational_scope: "committee",
    is_sensitive: false,
    is_system_role: false,
    status: "Active",
    level: "Meeting Secretary",
    usersCount: 9,
  },
  {
    id: "r10", created_at: "2024-01-01T00:00:00.000Z",
    name: "Read Only Viewer",
    description: "Dashboard and basic view access only",
    category: "external",
    permission_ids: VIEWER_PERMS,
    organizational_scope: "global",
    is_sensitive: false,
    is_system_role: false,
    status: "Inactive",
    level: "Viewer",
    usersCount: 3,
  },
];

// ── Role registry ──────────────────────────────────────────────────────────────

export const useBmsRoleRegistry = createEntityRegistry<BmsRole>(
  "bms.roles.canonical",
  "bms:roles-updated",
  MOCK_BMS_ROLES,
);
