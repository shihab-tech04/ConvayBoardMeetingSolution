import type { TableRow } from "../modulePageUtils";

/** AD-07: voting methods need a versioned, tenant-authorized policy and tested engine. */
export function unverifiedVotingMethodsView(): {
  rows: TableRow[];
  description: string;
  unavailableReason: string;
} {
  return {
    rows: [],
    description: "The authoritative, versioned voting method policy source is not verified. No sample methods or status counts are displayed.",
    unavailableReason: "Tenant-scoped policy versions, majority and eligibility enforcement, secret-vote visibility, and a tested voting engine have not been verified. Creation and edits are disabled.",
  };
}
