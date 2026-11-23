/** GV-01: do not record a governance action before the source write succeeds. */
export type OrgSaveResult = "saved" | "not-saved" | "audit-unverified";

/**
 * A rejected/denied registry write is not success. The audit is attempted only
 * after the server-backed write confirms, and an audit failure is separately
 * reported without claiming the already-saved primary write was rolled back.
 */
export async function persistOrgUnitChange(
  write: () => boolean | Promise<boolean>,
  audit: () => boolean | Promise<boolean>,
): Promise<OrgSaveResult> {
  const saved = await write();
  if (!saved) return "not-saved";
  try {
    return await audit() ? "saved" : "audit-unverified";
  } catch {
    return "audit-unverified";
  }
}

/**
 * Compare the saved unit with a fresh, authenticated SQL-backed registry read.
 * A successful HTTP write alone does not prove cross-session visibility.
 * Never reissue a create/update if this verification is unavailable: the
 * mutation may already have committed and retrying it can duplicate intent.
 */
export type OrgUnitReadback = {
  id: string;
  unit_name: string;
  unit_type: string;
  status: string;
  code?: string;
  parent_unit_id?: string;
  head_user_id?: string;
  deputy_user_id?: string;
};

export async function verifyOrgUnitSqlReadback(
  refresh: () => Promise<void>,
  getById: (id: string) => OrgUnitReadback | undefined,
  expected: OrgUnitReadback,
): Promise<boolean> {
  try {
    await refresh();
    const actual = getById(expected.id);
    if (!actual) return false;
    const fields: Array<keyof OrgUnitReadback> = [
      "id", "unit_name", "unit_type", "status", "code",
      "parent_unit_id", "head_user_id", "deputy_user_id",
    ];
    return fields.every(field =>
      (actual[field] ?? "").trim() === (expected[field] ?? "").trim()
    );
  } catch {
    // A network/read permission error does not roll back an acknowledged write.
    return false;
  }
}
