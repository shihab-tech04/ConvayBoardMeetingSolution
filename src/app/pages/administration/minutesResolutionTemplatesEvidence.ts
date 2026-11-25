import type { TableRow } from "../modulePageUtils";

/** AD-11 remains unverified until the versioned, authorized workflow is authoritative. */
export function unverifiedMinutesResolutionTemplatesView(): {
  rows: TableRow[];
  unavailableReason: string;
} {
  return {
    rows: [],
    unavailableReason:
      "An authoritative, tenant-scoped minutes and resolution template source has not been verified. Approved-version document generation, editing a new draft without changing its template, signed-snapshot immutability, wrong-tenant/unprivileged denial, save retry/reopen by stable ID, and audit readback remain unverified. No sample templates or counts are shown; template creation and edits are disabled.",
  };
}
