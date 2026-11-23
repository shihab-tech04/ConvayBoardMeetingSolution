import type { TableRow } from "../modulePageUtils";

/** AD-06: quorum policies are not authoritative until versioning and vote-time protections are verified. */
export function unverifiedQuorumRulesView(): {
  rows: TableRow[];
  description: string;
  unavailableReason: string;
} {
  return {
    rows: [],
    description: "The authoritative, versioned quorum policy source is not verified. No sample rules or status counts are displayed.",
    unavailableReason: "Tenant-scoped policy versions and protection against rule changes during active votes have not been verified. Creation and edits are disabled.",
  };
}
