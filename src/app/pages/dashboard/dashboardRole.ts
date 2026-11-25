/**
 * HM-02: display roles come from the authenticated account, not a potentially
 * stale legacy user directory. Match only explicit role labels; unrecognized
 * values fail closed to the least-privileged board-member presentation.
 *
 * This is presentation logic only; SQL RLS and action permissions are the
 * actual authorization boundary.
 */
export type ViewRole = "chairperson" | "secretary" | "board_member" | "admin";

function normalizeDashboardRole(value?: string | null): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

export function deriveDashboardRole(
  authenticatedRole?: string | null,
  legacyRole?: string | null,
): ViewRole {
  const role = normalizeDashboardRole(authenticatedRole) || normalizeDashboardRole(legacyRole);
  if (["chairman", "chairperson", "board chairman", "board chairperson", "chairman of the board"].includes(role)) {
    return "chairperson";
  }
  if (["secretary", "company secretary", "secretariat"].includes(role)) return "secretary";
  if (["admin", "administrator", "super admin", "super administrator"].includes(role)) return "admin";
  if (["director", "board director", "member", "board member"].includes(role)) return "board_member";
  return "board_member";
}
