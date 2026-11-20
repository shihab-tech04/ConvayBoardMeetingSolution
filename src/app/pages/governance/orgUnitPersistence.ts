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
