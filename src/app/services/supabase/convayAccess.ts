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
  company_admin_tenant_ids?: string[];
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
      // A typed HTTP response is not runtime validation. In particular a string
      // permission list would turn includes() into a substring authorization check.
      if (!payload || typeof payload !== "object" || Array.isArray(payload) ||
          typeof payload.is_super_admin !== "boolean" ||
          !Array.isArray(payload.effective_permissions) ||
          !payload.effective_permissions.every(code => typeof code === "string" && code.trim().length > 0) ||
          (payload.user_role_ids !== undefined && (!Array.isArray(payload.user_role_ids) ||
            !payload.user_role_ids.every(id => typeof id === "string" && id.trim().length > 0))) ||
          [payload.roles, payload.permissions, payload.user_assignments].some(
            value => value !== undefined && !Array.isArray(value))) {
        throw new Error("Invalid access verification response");
      }
      // A root snapshot is the authoritative register, including empty arrays.
      // Omitted arrays must never be interpreted as proof of deletion/revocation.
      if (payload.is_super_admin && (
          !Array.isArray(payload.roles) ||
          !Array.isArray(payload.permissions) ||
          !Array.isArray(payload.user_assignments) ||
          !Array.isArray(payload.user_role_ids))) {
        throw new Error("Incomplete administrator access verification response");
      }
      if (payload.is_super_admin) {
        const roles = payload.roles!;
        const permissions = payload.permissions!;
        const assignments = payload.user_assignments!;
        const validId = (value: unknown): value is string =>
          typeof value === "string" && value.trim().length > 0 && value === value.trim();
        const validIds = (values: unknown): values is string[] =>
          Array.isArray(values) && values.every(validId) &&
          new Set(values).size === values.length;
        if (roles.some(role => !role || typeof role !== "object" ||
            !validId(role.id) || typeof role.name !== "string" ||
            typeof role.description !== "string" || typeof role.level !== "string" ||
            !["Active", "Inactive"].includes(role.status) ||
            typeof role.is_system_role !== "boolean" ||
            !validIds(role.permission_ids) || !Number.isSafeInteger(role.users_count) ||
            role.users_count < 0) ||
            permissions.some(perm => !perm || typeof perm !== "object" ||
              !validId(perm.id) || typeof perm.label !== "string" ||
              typeof perm.group_id !== "string" || typeof perm.endpoint !== "string" ||
              typeof perm.service_name !== "string" ||
              !["GET", "POST", "PUT", "PATCH", "DELETE"].includes(perm.method) ||
              !["PUBLIC", "AUTH", "AUTHORIZE"].includes(perm.access_label) ||
              !["Active", "Inactive"].includes(perm.status) ||
              typeof perm.is_custom !== "boolean") ||
            assignments.some(item => !item || typeof item !== "object" ||
              !validId(item.user_id) || !validId(item.role_id))) {
          throw new Error("Invalid administrator access register");
        }
        const roleIds = new Set(roles.map(role => role.id));
        const permissionIds = new Set(permissions.map(perm => perm.id));
        const pairs = new Set(assignments.map(item => JSON.stringify([item.user_id, item.role_id])));
        const assignmentCounts = new Map<string, number>();
        for (const item of assignments) {
          assignmentCounts.set(item.role_id, (assignmentCounts.get(item.role_id) ?? 0) + 1);
        }
        if (roleIds.size !== roles.length || permissionIds.size !== permissions.length ||
            pairs.size !== assignments.length ||
            !validIds(payload.effective_permissions) || !validIds(payload.user_role_ids) ||
            payload.effective_permissions.some(id => !permissionIds.has(id)) ||
            payload.user_role_ids!.some(id => !roleIds.has(id)) ||
            assignments.some(item => !roleIds.has(item.role_id)) ||
            roles.some(role => role.permission_ids.some(id => !permissionIds.has(id)) ||
              role.users_count !== (assignmentCounts.get(role.id) ?? 0))) {
          throw new Error("Ambiguous or inconsistent administrator access register");
        }
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
  // Navigation catalogue integrity: a real permission label is required.
  // Company route authorization instead uses freshly verified tenant_admin
  // membership via convay_company_directory, never global admin_users.
  "company-management/overview": "admin_users",
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
// Match React Router's case-insensitive, per-segment decoded pathname matching.
// Keep encoded slashes inside their segment; never turn them into route separators.
function canonicalPermissionPath(path: string): string | null {
  try {
    return path.replace(/^\/+|\/+$/g, "").split("/")
      .map(segment => decodeURIComponent(segment).replace(/\//g, "%2F"))
      .join("/").toLowerCase();
  } catch {
    return null; // malformed path cannot grant broader fallback permissions
  }
}

// Parent/redirect URLs resolve to their child authorization boundary.
export function permissionForPath(path: string): string | null {
  const clean = canonicalPermissionPath(path);
  return clean === null ? null : permissionForCanonicalPath(clean);
}
function permissionForCanonicalPath(clean: string): string | null {
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
  const clean = canonicalPermissionPath(path);
  if (clean === null) return false;
  const normalizedPath = "/" + clean;
  if (/^\/company-management(?:\/|$)/.test(normalizedPath))
    return (state.company_admin_tenant_ids?.length ?? 0) > 0;
  if (/^\/subscribers(?:\/|$)/.test(normalizedPath)) return state.is_super_admin;
  // AD-01–15 and NI-01–15 are non-delegable platform-root operations.
  // Match the root-only navigation catalogue at direct URLs as well; a delegated
  // permission code alone must not mount a configuration or provider page.
  if (/^\/(?:administration(?:\/|$)|governance-org\/(?:users-assignments|user-management)(?:\/|$))/.test(normalizedPath)) return false;
  const required = permissionForCanonicalPath(clean);
  return !!required && hasAccess(required, state);
}
