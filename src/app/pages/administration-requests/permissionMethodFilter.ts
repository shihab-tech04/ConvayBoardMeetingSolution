/** AC-05: keep catalogue method filtering aligned with the Supabase
 * AccessPermission method contract, without granting or writing permissions.
 */
import type { AccessPermission } from "../../services/supabase/convayAccess";

export const PERMISSION_METHOD_FILTER_OPTIONS = [
  "All", "GET", "POST", "PUT", "PATCH", "DELETE",
] as const satisfies readonly ("All" | AccessPermission["method"])[];

export function matchesPermissionMethod(
  actual: string,
  filter: string | undefined,
): boolean {
  if (!filter || filter === "All") return true;
  if (!PERMISSION_METHOD_FILTER_OPTIONS.some(option => option === filter)) return false;
  return actual === filter;
}
