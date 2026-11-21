import type { TableRow } from "../modulePageUtils";

/** AD-12 remains unverified until the versioned, authorized template workflow is authoritative. */
export function unverifiedDocumentTemplatesView(): {
  rows: TableRow[];
  unavailableReason: string;
} {
  return {
    rows: [],
    unavailableReason:
      "An authoritative, tenant-scoped document-template catalog has not been verified. Template metadata/content revision tracking, eligible-user instantiation, restricted-content enforcement (including denial of unrestricted content), wrong-tenant/unprivileged denial, save retry/reopen by stable ID, and audit readback remain unverified. No sample templates or counts are shown; template creation and edits are disabled.",
  };
}
