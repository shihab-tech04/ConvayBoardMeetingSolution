/** AD-05: the meeting type configuration has no authoritative registry source.
 * Keep fabricated setup records, counters and unsupported mutations out of the UI.
 */
import type { TableRow } from "../modulePageUtils";

export function unverifiedMeetingTypesView(): {
  rows: TableRow[];
  description: string;
  unavailableReason: string;
} {
  return {
    rows: [],
    description: "The authoritative, versioned meeting type registry is not connected. No sample records or status counts are displayed.",
    unavailableReason: "Tenant-scoped reads, actor authorization, versioned writes and SQL readback are unavailable. Creation and edits are disabled.",
  };
}
