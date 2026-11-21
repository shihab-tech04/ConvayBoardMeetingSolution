import type { TableRow } from "../modulePageUtils";

/** AD-15 remains unverified until retention and legal holds use an authoritative, protected registry. */
export function unverifiedRetentionLegalHoldsView(): {
  rows: TableRow[];
  unavailableReason: string;
} {
  return {
    rows: [],
    unavailableReason:
      "Authoritative, tenant-scoped retention-policy and legal-hold registries are not verified. Legal holds blocking purge, missing policies defaulting to retain, permitted-role and wrong-tenant denial with the original resource/version/references/access unchanged, stable-ID save retry and reopen after interruption, and audit readback remain unverified. No sample records or counts are shown; policy and legal-hold writes are disabled.",
  };
}
