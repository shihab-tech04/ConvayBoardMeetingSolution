/**
 * User-management permission context.
 *
 * Reads the current user from Redux, resolves their BmsUser record,
 * and derives a permission set for the user-management UI.
 *
 * Deny-by-default: if the current user cannot be resolved to a BmsUser,
 * all write permissions are denied. Read-only access is granted only
 * when the Redux session has a valid id (so the admin user can still
 * browse even before a full BMS record exists).
 */

import { useMemo } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useBmsUserRegistry } from "../data/bmsUsers";
import { useBmsRoleRegistry } from "../data/bmsRoles";

// ── Permission IDs ────────────────────────────────────────────────────────────

export const PERM_ADMIN_USERS        = "admin_users";
export const PERM_ADMIN_USERS_ADD    = "admin_users_add";
export const PERM_ADMIN_USERS_ASSIGN = "admin_users_reassign";
export const PERM_ADMIN_ROLES        = "admin_roles";

// ── Hook ─────────────────────────────────────────────────────────────────────

export interface UserManagementPermissions {
  /** True when the current user is not resolved — all gates open (demo mode). */
  isDemoMode:       boolean;
  canViewUsers:     boolean;
  canAddUser:       boolean;
  canEditUser:      boolean;
  canDeleteUser:    boolean;
  canSuspendUser:   boolean;
  canDeactivateUser: boolean;
  canArchiveUser:   boolean;
  canAssignRoles:   boolean;
  canManageRoles:   boolean;
  canInviteUser:    boolean;
  canResendInvite:  boolean;
  canCancelInvite:  boolean;
  canUnlockUser:    boolean;
  canViewAudit:     boolean;
  canViewSecurity:  boolean;
  canTransferOrg:   boolean;
  canManageGovBodies: boolean;
}

/** Read-only fallback when session exists but BmsUser record is not found. */
const READ_ONLY_ACCESS: UserManagementPermissions = {
  isDemoMode:         false,
  canViewUsers:       true,
  canAddUser:         false,
  canEditUser:        false,
  canDeleteUser:      false,
  canSuspendUser:     false,
  canDeactivateUser:  false,
  canArchiveUser:     false,
  canAssignRoles:     false,
  canManageRoles:     false,
  canInviteUser:      false,
  canResendInvite:    false,
  canCancelInvite:    false,
  canUnlockUser:      false,
  canViewAudit:       false,
  canViewSecurity:    false,
  canTransferOrg:     false,
  canManageGovBodies: false,
};

/** Full deny when there is no session at all. */
const DENY_ALL: UserManagementPermissions = {
  isDemoMode:         false,
  canViewUsers:       false,
  canAddUser:         false,
  canEditUser:        false,
  canDeleteUser:      false,
  canSuspendUser:     false,
  canDeactivateUser:  false,
  canArchiveUser:     false,
  canAssignRoles:     false,
  canManageRoles:     false,
  canInviteUser:      false,
  canResendInvite:    false,
  canCancelInvite:    false,
  canUnlockUser:      false,
  canViewAudit:       false,
  canViewSecurity:    false,
  canTransferOrg:     false,
  canManageGovBodies: false,
};

export function useUserManagementPermissions(): UserManagementPermissions {
  const currentUser  = useCurrentUser();
  const usersReg     = useBmsUserRegistry();
  const rolesReg     = useBmsRoleRegistry();

  return useMemo(() => {
    if (!currentUser?.id) return DENY_ALL;

    const bmsUser = usersReg.items.find((u) => u.id === currentUser.id);
    if (!bmsUser) return READ_ONLY_ACCESS;

    const roleIds = bmsUser.role_ids ?? (bmsUser.role_id ? [bmsUser.role_id] : []);
    const permSet = new Set<string>();

    for (const rid of roleIds) {
      const role = rolesReg.items.find((r) => r.id === rid);
      if (role) {
        for (const p of role.permission_ids) permSet.add(p);
      }
    }

    const has = (p: string) => permSet.has(p);
    const isAdmin = has(PERM_ADMIN_USERS);

    return {
      isDemoMode:         false,
      canViewUsers:       isAdmin || has("home_dashboard"),
      canAddUser:         isAdmin || has(PERM_ADMIN_USERS_ADD),
      canEditUser:        isAdmin,
      canDeleteUser:      isAdmin,
      canSuspendUser:     isAdmin,
      canDeactivateUser:  isAdmin,
      canArchiveUser:     isAdmin,
      canAssignRoles:     isAdmin || has(PERM_ADMIN_USERS_ASSIGN),
      canManageRoles:     isAdmin || has(PERM_ADMIN_ROLES),
      canInviteUser:      isAdmin || has(PERM_ADMIN_USERS_ADD),
      canResendInvite:    isAdmin || has(PERM_ADMIN_USERS_ADD),
      canCancelInvite:    isAdmin,
      canUnlockUser:      isAdmin,
      canViewAudit:       isAdmin,
      canViewSecurity:    isAdmin,
      canTransferOrg:     isAdmin,
      canManageGovBodies: isAdmin || has("gov_body_manage"),
    };
  }, [currentUser?.id, usersReg.items, rolesReg.items]);
}
