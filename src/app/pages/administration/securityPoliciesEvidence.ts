import type { TableRow } from "../modulePageUtils";

/** AD-14 stays unverified until security policies have an authoritative, protected registry. */
export function unverifiedSecurityPoliciesView(): {
  rows: TableRow[];
  unavailableReason: string;
} {
  return {
    rows: [],
    unavailableReason:
      "An authoritative, tenant-scoped security-policy registry has not been verified. Authorized Super Admin access, policy version and impact history, non-bypassable root protection (including denial of attempts to disable it), wrong-tenant/unprivileged denial with the original resource/version/references/access unchanged, stable-ID save retry/reopen after interruption, and audit readback remain unverified. No sample policies or counts are shown; policy creation and edits are disabled.",
  };
}
