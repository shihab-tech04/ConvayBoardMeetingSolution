/**
 * useRoleRegistry — compatibility adapter over the canonical bms.roles.canonical registry.
 *
 * Exposes the legacy SystemRole shape so existing pages (RoleManagementPage,
 * UserComponents, useResolvedActions) continue to work without modification.
 *
 * All reads and writes now go through useBmsRoleRegistry → localStorage key
 * "bms.roles.canonical".  The old "nbr.roleRegistry.customRoles" key is no
 * longer written; any data there is migrated to bms.roles.canonical by
 * bmsMigration (v3) at startup.
 */

import { useCallback } from "react";
import type { SystemRole } from "../data/mockData";
import {
  useBmsRoleRegistry,
  bmsRoleToSystemRole,
  systemRoleToBmsRole,
  type BmsRole,
} from "../data/bmsRoles";

// Kept for backward-compatibility — nothing should write to this key anymore.
export const ROLE_STORAGE_KEY = "nbr.roleRegistry.customRoles";
export const ROLE_EVENT = "nbr:roles-updated";

export function useRoleRegistry() {
  const bmsReg = useBmsRoleRegistry();

  /** All roles in the canonical registry mapped to the legacy shape. */
  const roles: SystemRole[] = bmsReg.items.map(bmsRoleToSystemRole);

  /** Active roles only. */
  const activeRoles: SystemRole[] = roles.filter((r) => r.status === "Active");

  const addRole = useCallback((role: SystemRole) => {
    bmsReg.add(systemRoleToBmsRole(role));
  }, [bmsReg]);

  const updateRole = useCallback((role: SystemRole) => {
    const existing: BmsRole | undefined = bmsReg.getById(role.id);
    if (existing) {
      bmsReg.update(role.id, {
        ...existing,
        ...systemRoleToBmsRole(role),
        // Preserve canonical-only fields
        category:              existing.category,
        organizational_scope:  existing.organizational_scope,
        is_sensitive:          existing.is_sensitive,
        is_system_role:        existing.is_system_role,
        created_at:            existing.created_at,
        updated_at:            new Date().toISOString(),
      });
    } else {
      bmsReg.add(systemRoleToBmsRole(role));
    }
  }, [bmsReg]);

  const deleteRole = useCallback((id: string) => {
    bmsReg.remove(id);
  }, [bmsReg]);

  const duplicateRole = useCallback((source: SystemRole): SystemRole => {
    const clone: BmsRole = {
      ...systemRoleToBmsRole(source),
      id:         `r${Date.now()}`,
      name:       `${source.name} (Copy)`,
      usersCount: 0,
      created_at: new Date().toISOString(),
    };
    bmsReg.add(clone);
    return bmsRoleToSystemRole(clone);
  }, [bmsReg]);

  const removePermissionFromRoles = useCallback((permissionId: string) => {
    for (const role of bmsReg.items) {
      if (role.permission_ids.includes(permissionId)) {
        bmsReg.update(role.id, {
          ...role,
          permission_ids: role.permission_ids.filter((pid) => pid !== permissionId),
          updated_at: new Date().toISOString(),
        });
      }
    }
  }, [bmsReg]);

  return {
    roles,
    activeRoles,
    addRole,
    updateRole,
    deleteRole,
    duplicateRole,
    removePermissionFromRoles,
  };
}
