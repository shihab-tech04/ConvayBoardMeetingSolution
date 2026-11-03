/**
 * Role Management reads and writes the authoritative Supabase access model.
 * No seeded roles, browser overrides, or inferred user counts.
 */
import { useCallback, useMemo } from "react";
import type { SystemRole } from "../data/mockData";
import { convayAuth } from "../services/supabase/convayAuth";
import { useAccessSnapshot, reloadAccessSnapshot } from "../services/supabase/convayAccess";

export const ROLE_STORAGE_KEY = "nbr.roleRegistry.customRoles";
export const ROLE_EVENT = "nbr:roles-updated";
export function useRoleRegistry() {
  const access = useAccessSnapshot();
  const roles: SystemRole[] = useMemo(() => access.roles.map(role => ({
    id: role.id,
    name: role.name,
    description: role.description,
    level: role.level,
    status: role.status,
    permissions: [...role.permission_ids],
    usersCount: role.users_count,
  })), [access.roles]);
  const activeRoles = useMemo(() => roles.filter(r => r.status === "Active"), [roles]);

  const addRole = useCallback(async (role: SystemRole): Promise<SystemRole> => {
    const result = await convayAuth.access<{ id: string }>("role_save", {
      name: role.name, description: role.description, level: role.level,
      status: role.status, permission_ids: role.permissions,
    });
    await reloadAccessSnapshot();
    return { ...role, id: result.id, usersCount: 0 };
  }, []);
  const updateRole = useCallback(async (role: SystemRole): Promise<SystemRole> => {
    await convayAuth.access("role_save", {
      id: role.id, name: role.name, description: role.description, level: role.level,
      status: role.status, permission_ids: role.permissions,
    });
    await reloadAccessSnapshot();
    return role;
  }, []);
  const deleteRole = useCallback(async (id: string): Promise<void> => {
    await convayAuth.access("role_delete", { id });
    await reloadAccessSnapshot();
  }, []);
  const duplicateRole = useCallback(async (source: SystemRole): Promise<SystemRole> => {
    return addRole({
      ...source, id: "", name: source.name + " (Copy)", usersCount: 0,
    });
  }, [addRole]);
  const removePermissionFromRoles = useCallback(async (_permissionId: string) => {
    // PostgreSQL ON DELETE CASCADE guarantees deletion from every role.
    await reloadAccessSnapshot();
  }, []);

  return {
    roles, activeRoles, addRole, updateRole, deleteRole, duplicateRole,
    removePermissionFromRoles,
    isProtectedRole: (id: string) => access.roles.some(r => r.id === id && r.is_system_role),
    loading: !access.loaded, error: access.error,
    refresh: reloadAccessSnapshot,
  };
}