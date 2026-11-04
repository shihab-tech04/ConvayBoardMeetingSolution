/**
 * HM-02: display roles must come from the authenticated account, not a
 * potentially stale legacy user directory. Unrecognized roles fail closed to
 * the least-privileged board-member presentation.
 *
 * This is presentation logic only; SQL RLS and action permissions are the
 * actual authorization boundary.
 */
export type ViewRole = "chairperson" | "secretary" | "board_member" | "admin";

export function deriveDashboardRole(
  authenticatedRole?: string | null,
  legacyRole?: string | null,
): ViewRole {
  const role = (authenticatedRole?.trim() || legacyRole?.trim() || "").toLowerCase();
  if (role.includes("chairman") || role.includes("chairperson")) return "chairperson";
  if (role.includes("secretary")) return "secretary";
  if (role.includes("admin") || role.includes("administrator")) return "admin";
  if (role.includes("director") || role.includes("member")) return "board_member";
  return "board_member";
}
