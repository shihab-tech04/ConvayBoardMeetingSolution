/**
 * useUserRegistry — compatibility adapter over the canonical bms.users registry.
 *
 * Exposes the legacy SystemUser shape so existing pages (UserManagementPage,
 * ReAssignRoleModal, etc.) continue to work without modification.
 *
 * All reads and writes now go through useBmsUserRegistry → localStorage key
 * "bms.users".  The old "nbr.userRegistry.customUsers" key is no longer written;
 * any data there is migrated to bms.users by bmsMigration at startup.
 */

import type { SystemUser } from "../data/mockData";
import {
  useBmsUserRegistry,
  bmsUserToSystemUser,
  systemUserToBmsUser,
  type BmsUser,
} from "../data/bmsUsers";
import { useAuditEventRegistry } from "../data/boardMeetingData";

// Kept for backward-compatibility — nothing should write to this key anymore.
export const USER_STORAGE_KEY = "nbr.userRegistry.customUsers";
export const USER_EVENT = "nbr:users-updated";

export function useUserRegistry() {
  const bmsReg  = useBmsUserRegistry();
  const auditReg = useAuditEventRegistry();

  /** All users in the canonical registry mapped to the legacy shape. */
  const users: SystemUser[] = bmsReg.items.map(bmsUserToSystemUser);

  /** Create or update a user.  Accepts the extended shape from UserFormModal. */
  const saveUser = (user: SystemUser) => {
    const now = new Date().toISOString();
    const existing: BmsUser | undefined = bmsReg.getById(user.id);
    const bmsUser = systemUserToBmsUser(user);

    if (existing) {
      bmsReg.update(user.id, {
        ...existing,
        ...bmsUser,
        // Preserve canonical-only fields that exist on the record already
        user_type:            existing.user_type,
        governance_membership_ids: existing.governance_membership_ids,
        access_start_at:      existing.access_start_at,
        access_expires_at:    existing.access_expires_at,
        failed_login_count:   existing.failed_login_count,
        created_at:           existing.created_at,
        created_by:           existing.created_by,
        updated_at:           now,
      });
    } else {
      bmsReg.add({ ...bmsUser, id: user.id, created_at: now });
    }

    auditReg.add({
      id:              `aud-u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at:      now,
      event_id:        `AUDIT-U-${Date.now()}`,
      entity_type:     "user",
      entity_id:       user.id,
      action:          existing ? "update" : "create",
      actor:           "system",
      actor_role:      "",
      timestamp:       now,
      ip_address:      "",
      details:         `User ${existing ? "updated" : "created"}: ${user.name}`,
      approval_status: "Approved",
    });
  };

  /**
   * Delete a user.
   * Draft users with no audit history are hard-deleted.
   * All others are archived so historical relationships are preserved.
   */
  const deleteUser = (id: string) => {
    const user = bmsReg.getById(id);
    if (!user) return;
    const now = new Date().toISOString();

    if (user.account_status === "draft") {
      bmsReg.remove(id);
    } else {
      bmsReg.update(id, {
        ...user,
        account_status: "archived",
        archived_at:    now,
        updated_at:     now,
      });
    }

    auditReg.add({
      id:              `aud-u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at:      now,
      event_id:        `AUDIT-U-DEL-${Date.now()}`,
      entity_type:     "user",
      entity_id:       id,
      action:          user.account_status === "draft" ? "delete" : "archive",
      actor:           "system",
      actor_role:      "",
      timestamp:       now,
      ip_address:      "",
      details:         `User ${user.account_status === "draft" ? "deleted" : "archived"}: ${user.name}`,
      approval_status: "Approved",
    });
  };

  /** Patch individual fields on a user record. */
  const updateUserField = (id: string, patch: Partial<SystemUser>) => {
    const user = bmsReg.getById(id);
    if (!user) return;
    const now = new Date().toISOString();
    // Merge patch into current legacy shape, then convert back to BmsUser
    const current = bmsUserToSystemUser(user);
    const bmsPatch = systemUserToBmsUser({ ...current, ...patch });
    bmsReg.update(id, { ...user, ...bmsPatch, updated_at: now });

    auditReg.add({
      id:              `aud-u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at:      now,
      event_id:        `AUDIT-U-PATCH-${Date.now()}`,
      entity_type:     "user",
      entity_id:       id,
      action:          "update",
      actor:           "system",
      actor_role:      "",
      timestamp:       now,
      ip_address:      "",
      details:         `User field update: ${Object.keys(patch).join(", ")}`,
      approval_status: "Approved",
    });
  };

  // ── Query helpers ───────────────────────────────────────────────────────────

  const queryByEmail = (email: string): BmsUser | undefined =>
    bmsReg.items.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

  const queryByEmployeeId = (employeeId: string): BmsUser | undefined =>
    bmsReg.items.find(u => u.employee_id.toUpperCase() === employeeId.trim().toUpperCase());

  const queryByRole = (roleId: string): BmsUser[] =>
    bmsReg.items.filter(u => u.role_ids?.includes(roleId) || u.role_id === roleId || u.primary_role_id === roleId);

  const queryByDesignation = (designationId: string): BmsUser[] =>
    bmsReg.items.filter(u => u.designation_id === designationId);

  const queryByOrgUnit = (unitId: string): BmsUser[] =>
    bmsReg.items.filter(u => u.primary_org_unit_id === unitId || u.branch_id === unitId || u.division_id === unitId || u.department_id === unitId);

  const queryByAccountStatus = (status: import("../data/bmsUsers").AccountStatus): BmsUser[] =>
    bmsReg.items.filter(u => u.account_status === status);

  // ── Lifecycle operations ────────────────────────────────────────────────────

  const archiveUser = (id: string) => {
    const user = bmsReg.getById(id);
    if (!user) return;
    const now = new Date().toISOString();
    bmsReg.update(id, { ...user, account_status: "archived", archived_at: now, updated_at: now });
  };

  const restoreUser = (id: string) => {
    const user = bmsReg.getById(id);
    if (!user) return;
    const now = new Date().toISOString();
    bmsReg.update(id, { ...user, account_status: "inactive", archived_at: undefined, updated_at: now });
  };

  const assignRoles = (id: string, roleIds: string[]) => {
    const user = bmsReg.getById(id);
    if (!user) return;
    bmsReg.update(id, { ...user, role_ids: [...new Set([...(user.role_ids ?? []), ...roleIds])], updated_at: new Date().toISOString() });
  };

  const removeRole = (id: string, roleId: string) => {
    const user = bmsReg.getById(id);
    if (!user) return;
    bmsReg.update(id, { ...user, role_ids: (user.role_ids ?? []).filter(r => r !== roleId), updated_at: new Date().toISOString() });
  };

  const assignDesignation = (id: string, designationId: string) => {
    const user = bmsReg.getById(id);
    if (!user) return;
    bmsReg.update(id, { ...user, designation_id: designationId, updated_at: new Date().toISOString() });
  };

  const assignOrg = (id: string, orgUnitId: string) => {
    const user = bmsReg.getById(id);
    if (!user) return;
    bmsReg.update(id, { ...user, primary_org_unit_id: orgUnitId, updated_at: new Date().toISOString() });
  };

  const transferOrg = (id: string, toOrgUnitId: string) => {
    assignOrg(id, toOrgUnitId);
  };

  const assignManager = (id: string, managerUserId: string) => {
    const user = bmsReg.getById(id);
    if (!user) return;
    if (managerUserId === id) return; // self-manager guard
    bmsReg.update(id, { ...user, manager_user_id: managerUserId, updated_at: new Date().toISOString() });
  };

  const changeStatus = (id: string, status: import("../data/bmsUsers").AccountStatus) => {
    const user = bmsReg.getById(id);
    if (!user) return;
    bmsReg.update(id, { ...user, account_status: status, updated_at: new Date().toISOString() });
  };

  return {
    users,
    saveUser,
    deleteUser,
    updateUserField,
    // Query helpers
    queryByEmail,
    queryByEmployeeId,
    queryByRole,
    queryByDesignation,
    queryByOrgUnit,
    queryByAccountStatus,
    // Lifecycle operations
    archiveUser,
    restoreUser,
    assignRoles,
    removeRole,
    assignDesignation,
    assignOrg,
    transferOrg,
    assignManager,
    changeStatus,
  };
}
