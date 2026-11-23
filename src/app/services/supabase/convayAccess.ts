import { useSyncExternalStore } from "react";
import { convayAuth } from "./convayAuth";
import { listCompanies } from "../saas/companyDirectory";

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
  /** Fresh, server-authorized company-admin scopes only; never client-supplied. */
  company_admin_tenant_ids: string[];
}
const empty: AccessSnapshot = {
  loaded: false, error: null, is_super_admin: false, effective_permissions: [],
  user_role_ids: [], roles: [], permissions: [], user_assignments: [], company_admin_tenant_ids: [],
};
let current: AccessSnapshot = empty;
let request: Promise<AccessSnapshot> | null = null;
// Invalidate every previously started permission read on account/session changes.
// A completed request must never restore another account's grants after sign-out.
let sessionEpoch = 0;
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
  sessionEpoch += 1;
  request = null;
  publish({ ...empty });
}
export async function reloadAccessSnapshot(): Promise<AccessSnapshot> {
  // Deduplicate within a session, but never carry a request across a clear.
  if (request) return request;
  const epoch = sessionEpoch;
  const activeRequest: Promise<AccessSnapshot> = (async () => {
    try {
      const payload = await convayAuth.access<Partial<AccessSnapshot>>("snapshot");
      if (epoch !== sessionEpoch) {
        throw new Error("Access verification superseded by a session change");
      }
      // Company administration is an independent SQL entitlement.
      // A failure to read it must never grant tenant scope or break existing
      // non-company roles; only an exact server-scoped directory can add ids.
      const company_admin_tenant_ids = payload.is_super_admin === true
        ? []
        : await listCompanies().then(directory => directory.companies
            .filter(item => ["provisioning","active","suspended"].includes(item.lifecycle_state))
            .map(item => item.id)).catch(() => [] as string[]);
      if (epoch !== sessionEpoch) {
        throw new Error("Company scope verification superseded by a session change");
      }
      const value: AccessSnapshot = {
        loaded: true, error: null,
        is_super_admin: payload.is_super_admin === true,
        effective_permissions: payload.effective_permissions ?? [],
        user_role_ids: payload.user_role_ids ?? [],
        roles: payload.roles ?? [],
        permissions: payload.permissions ?? [],
        user_assignments: payload.user_assignments ?? [],
        company_admin_tenant_ids,
      };
      publish(value);
      return value;
    } catch (error) {
      // A stale rejection must not overwrite the newer session's permissions.
      if (epoch === sessionEpoch) {
        const message = error instanceof Error ? error.message : "Unable to verify permissions";
        publish({ ...empty, error: message });
      }
      throw error;
    }
  })();
  request = activeRequest;
  try { return await activeRequest; }
  finally {
    // An obsolete request must not clear the next session's in-flight read.
    if (request === activeRequest) request = null;
  }
}
export const hasAccess = (code: string, state: AccessSnapshot = current) =>
  state.loaded && (state.is_super_admin || state.effective_permissions.includes(code));

// Canonical route-to-permission mapping: one server-returned grant decides
// the desktop/mobile navigation and direct route access.
const direct: Record<string, string> = {
  "home/overview": "home_dashboard",
  "subscribers/overview": "admin_users",
  "home/my-tasks": "home_my_tasks",
  "home/my-calendar": "home_my_calendar",
  "meetings/all-meetings": "mtg_view",
  "meetings/meeting-overview": "mtg_view",
  "meetings/meeting-calendar": "mtg_view",
  "meetings/quick-meeting": "mtg_create",
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
  "archive-reports/registers/attendance-register": "arc_view",
  "archive-reports/registers/conflict-register": "arc_view",
  "archive-reports/reports-analytics/meeting-performance": "rep_meeting",
  "archive-reports/reports-analytics/participation": "rep_attendance",
  "archive-reports/reports-analytics/governance": "rep_governance",
  "archive-reports/reports-analytics/decisions-actions": "rep_decisions",
  "archive-reports/reports-analytics/financial-resource-impact": "rep_meeting",
  "archive-reports/audit-trail": "admin_audit_log",
  "administration/roles-permissions/roles": "admin_roles",
  "administration/roles-permissions/permissions": "admin_roles",
  "administration/workflows/workflow-definitions": "admin_workflows",
  "administration/workflows/approval-rules": "admin_approvals",
  "administration/workflows/review-revision-rules": "admin_approvals",
  "administration/workflows/workflow-history": "admin_workflows",
  "administration/meeting-configuration/meeting-types": "admin_config",
  "administration/meeting-configuration/quorum-rules": "admin_config",
  "administration/meeting-configuration/voting-methods": "admin_config",
  "administration/meeting-configuration/statuses-numbering": "admin_config",
  "administration/templates/meeting-agenda-templates": "admin_templates",
  "administration/templates/minutes-resolution-templates": "admin_templates",
  "administration/templates/document-templates": "admin_templates",
  "administration/templates/communication-templates": "admin_templates",
  "administration/notifications/notification-rules": "admin_notifications",
  "administration/notifications/message-templates": "admin_notifications",
  "administration/notifications/delivery-logs": "admin_notifications",
  "administration/integrations": "admin_integrations",
  "administration/security-retention/security-policies": "admin_config",
  "administration/security-retention/retention-legal-holds": "admin_retention",
  "administration/time-extension": "admin_retention",
};
// Parent/redirect URLs resolve to their child authorization boundary.
export function permissionForPath(path: string): string | null {
  const clean = path.replace(/^\/+|\/+$/g, "");
  if (direct[clean]) return direct[clean];
  if (/^meetings\/quick-meeting\/[^/]+$/.test(clean)) return "mtg_create";
  if (/^meetings\/[^/]+\/(live|record)$/.test(clean))
    return clean.endsWith("/live") ? "mtg_join" : "mtg_view";
  if (/^agenda-documents\/document-library\/[^/]+\/editor$/.test(clean))
    return "doc_view";
  if (clean.startsWith("administration/")) return null;
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
  const normalizedPath = "/" + path.replace(/^\/+|\/+$/g, "");
  if (/^\/company-management(?:\/|$)/.test(normalizedPath))
    return state.company_admin_tenant_ids.length > 0;
  if (/^\/subscribers(?:\/|$)/.test(normalizedPath)) return state.is_super_admin;
  if (/^\/(?:administration\/roles-permissions(?:\/|$)|administration\/integrations(?:\/|$)|governance-org\/users-assignments(?:\/|$))/.test(normalizedPath)) return false;
  const required = permissionForPath(path);
  return !!required && hasAccess(required, state);
}
