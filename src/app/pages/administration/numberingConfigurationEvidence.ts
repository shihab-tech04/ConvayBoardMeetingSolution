import type { TableRow } from "../modulePageUtils";

/** AD-09: numbering must be backed by an atomic, tenant-authorized server allocator. */
export function unverifiedNumberingConfigurationView(): {
  rows: TableRow[];
  description: string;
  unavailableReason: string;
} {
  return {
    rows: [],
    description: "The authoritative meeting-reference numbering source is not verified. No sample prefixes, next-sequence values, formats, or counters are displayed.",
    unavailableReason: "No numbering changes are enabled here. Server allocation that assigns unique meeting references atomically under concurrent meeting creates and never reuses a sequence is not verified. Tenant-authorized, versioned writes, stable-ID retry, durable readback, and audit are unavailable; numbering configuration remains disabled.",
  };
}
