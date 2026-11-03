import { useSyncExternalStore } from "react";
import { convayAuth } from "./convayAuth";

export interface AccessRole {
  id: string;
  name: string;
  description: string;
  level: string;
  status: "Active" | "Inactive";
  is_system_role: boolean;
  permission_ids: string[];
  users_count: number;
  created_at: string;
  updated_at: string;
}
export interface AccessPermission {
  id: string;
  label: string;
  label_key?: string | null;
  group_id: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  service_name: string;
  access_label: "PUBLIC" | "AUTH" | "AUTHORIZE";
  status: "Active" | "Inactive";
  is_custom: boolean;
  created_at: string;
  updated_at: string;
}
export interface AccessAssignment { user_id: string; role_id: string }
export interface AccessSnapshot {
  loaded: boolean;
  error: string | null;
  is_super_admin: boolean;
  effective_permissions: string[];
  user_role_ids: string[];
  roles: AccessRole[];
  permissions: AccessPermission[];
  user_assignments: AccessAssignment[];
}
const empty: AccessSnapshot = {
  loaded: false, error: null, is_super_admin: false, effective_permissions: [],
  user_role_ids: [], roles: [], permissions: [], user_assignments: [],
};
let current: AccessSnapshot = empty;
let request: Promise<AccessSnapshot> | null = null;
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};
const getSnapshot = () => current;
function publish(value: AccessSnapshot) {
  current = value;
  for (const fn of listeners) fn();
}
export function useAccessSnapshot(): AccessSnapshot {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
export function readAccessSnapshot(): AccessSnapshot { return current; }
export function clearAccessSnapshot() {
  request = null;
  publish({ ...empty });
}
export async function reloadAccessSnapshot(): Promise<AccessSnapshot> {
  // Shared request across the sidebar, role modal, and permission page.
  if (request) return request;
  request = (async () => {
    try {
      const payload = await convayAuth.access<Partial<AccessSnapshot>>("snapshot");
      const value: AccessSnapshot = {
        loaded: true, error: null,
        is_super_admin: payload.is_super_admin === true,
        effective_permissions: payload.effective_permissions ?? [],
        user_role_ids: payload.user_role_ids ?? [],
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
        user_assignments: payload.user_assignments ?? [],
      };
      publish(value);
      return value;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to verify permissions";
      publish({ ...empty, error: message });
      throw error;
    }
  })();
  try { return await request; } finally { request = null; }
}
export const hasAccess = (code: string, state: AccessSnapshot = current) =>
  state.loaded && (state.is_super_admin || state.effective_permissions.includes(code));

// Canonical route-to-permission mapping: one server-returned grant decides
// the desktop/mobile navigation and direct route access.
const direct: Record<string, string> = {
  "home/overview": "home_dashboard",
  "home/my-tasks": "home_my_tasks",
  "home/my-calendar": "home_my_calendar",
  "meetings/all-meetings": "mtg_view",
  "meetings/meeting-overview": "mtg_view",
  "meetings/meeting-calendar": "mtg_view",
  "agenda-documents/agenda-management": "agd_view",
  "agenda-documents/document-library": "doc_view",
  "agenda-documents/board-packs": "agd_view",
  "decisions-followup/decisions": "dec_view",
  "decisions-followup/resolutions": "res_view",
  "decisions-followup/action-items": "act_view",
  "governance-org/governance-bodies": "gov_body_view",
  "governance-org/organization-structure": "gov_org_view",
  "governance-org/users-assignments": "admin_users",
  "governance-org/designations-positions": "gov_org_view",
  "governance-org/participant-groups": "gov_group_view",
  "archive-reports/meeting-archive": "arc_view",
  "archive-reports/minutes": "arc_view",
  "archive-reports/registers/resolution-register": "res_view",
  "archive-reports/registers/decision-register": "dec_view",
  "archive-reports/registers/action-register": "act_view",
  "archive-reports/registers/attendance-register": "mtg_view",
  "archive-reports/registers/conflict-register": "mtg_view",
  "archive-reports/reports-analytics/meeting-performance": "rep_meeting",
  "archive-reports/reports-analytics/participation": "rep_attendance",
  "archive-reports/reports-analytics/governance": "rep_governance",
  "archive-reports/reports-analytics/decisions-actions": "rep_decisions",
  "archive-reports/reports-analytics/financial-resource-impact": "rep_meeting",
  "archive-reports/audit-trail": "admin_audit_log",
  "administration/roles-permissions/roles": "admin_roles",
  "administration/roles-permissions/permissions": "admin_roles",
};
// Parent/redirect URLs resolve to their child authorization boundary.
export function permissionForPath(path: string): string | null {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (direct[clean]) return direct[clean];
  if (/^meetings\/[^/]+\/(live|record)$/.test(clean))
    return clean.endsWith("/live") ? "mtg_join" : "mtg_view";
  if (/^agenda-documents\/document-library\/[^/]+\/editor$/.test(clean))
    return "doc_view";
  if (clean.startsWith("administration/")) return "admin_roles";
  if (clean.startsWith("governance-org/")) return "gov_org_view";
  if (clean.startsWith("archive-reports/")) return "arc_view";
  if (clean.startsWith("meetings/")) return "mtg_view";
  if (clean.startsWith("agenda-documents/")) return "agd_view";
  if (clean.startsWith("decisions-followup/")) return "dec_view";
  if (clean.startsWith("home/")) return "home_dashboard";
  return null;
}
export function mayVisitPath(path: string, state: AccessSnapshot = current) {
  if (!state.loaded) return false;
  if (state.is_super_admin) return true;
  const required = permissionForPath(path);
  return !!required && hasAccess(required, state);
}