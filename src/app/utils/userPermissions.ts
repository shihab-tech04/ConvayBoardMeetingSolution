/**
 * User administration permission context derived from verified SQL grants.
 * Never infer access from legacy browser users, role names or designations.
 */
import { useAccessSnapshot, hasAccess } from "../services/supabase/convayAccess";
export const PERM_ADMIN_USERS = "admin_users";
export const PERM_ADMIN_USERS_ADD = "admin_users_add";
export const PERM_ADMIN_USERS_ASSIGN = "admin_users_reassign";
export const PERM_ADMIN_ROLES = "admin_roles";

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

export function useUserManagementPermissions(): UserManagementPermissions {
  const access = useAccessSnapshot();
  const owner = access.loaded && access.is_super_admin;
  const has = (code: string) => hasAccess(code, access);
  return {
    isDemoMode: false,
    canViewUsers: owner,
    canAddUser: owner,
    canEditUser: owner,
    canDeleteUser: owner,
    canSuspendUser: owner,
    canDeactivateUser: owner,
    canArchiveUser: owner,
    canAssignRoles: owner,
    canManageRoles: owner,
    canInviteUser: owner,
    canResendInvite: owner,
    canCancelInvite: owner,
    canUnlockUser: owner,
    canViewAudit: owner || has("admin_audit_log"),
    canViewSecurity: owner,
    canTransferOrg: owner || has("gov_org_manage"),
    canManageGovBodies: owner || has("gov_body_manage"),
  };
}