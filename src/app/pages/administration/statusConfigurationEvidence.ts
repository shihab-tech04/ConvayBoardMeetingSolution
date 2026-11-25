import type { TableRow } from "../modulePageUtils";

/** AD-08: changing presentation must never mutate status keys or transition rules. */
export function unverifiedStatusConfigurationView(): {
  rows: TableRow[];
  description: string;
  unavailableReason: string;
} {
  return {
    rows: [],
    description: "The authoritative status configuration source is not verified. No sample states or configuration counts are displayed.",
    unavailableReason: "Server enforcement that label or color edits preserve immutable machine-state keys and transition rules is not verified. Versioned, tenant-authorized writes and audited readback are unavailable; status configuration is disabled.",
  };
}
