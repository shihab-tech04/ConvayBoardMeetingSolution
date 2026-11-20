/**
 * DC document access action gate. The permission catalogue describes
 * available permissions, not the current actor's grants. Only the
 * SQL-backed effective-access snapshot may enable an action.
 * Backend RLS/Storage remains the final authority.
 */
import { hasAccess, type AccessSnapshot } from "../../services/supabase/convayAccess";

export function documentActionGranted(permission: string, snapshot: AccessSnapshot): boolean {
  return Boolean(permission.trim()) && hasAccess(permission, snapshot);
}

/**
 * If the session/access state changes during a network operation, never use
 * bytes or show success based on the old actor's response.
 * Object identity is deliberately strict: every access refresh invalidates
 * outstanding privileged frontend operations.
 */
export function documentActionSessionUnchanged(
  permission: string,
  before: AccessSnapshot,
  after: AccessSnapshot,
): boolean {
  return before === after && documentActionGranted(permission, after);
}
