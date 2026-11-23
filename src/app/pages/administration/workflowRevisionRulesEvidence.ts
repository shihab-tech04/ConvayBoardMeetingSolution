/** AD-03: absent authenticated tenant-scoped configuration source.
 * Do not fabricate policy rows, status counts or server write capability.
 */
import type { TableRow, KpiDef } from "../modulePageUtils";

export function unverifiedRevisionRulesView(): {
  rows: TableRow[];
  kpis: KpiDef[];
  description: string;
  unavailableReason: string;
} {
  return {
    rows: [],
    kpis: [{ label: "Review rules evidence", value: "Unverified", tone: "warning" }],
    description: "Authenticated review/revision-rule configuration is not connected. Conditions, assignments and counts are unverified; no sample rules are displayed.",
    unavailableReason: "Tenant-scoped review/revision rules, actor-authorized writes and SQL readback are unavailable. Creation and edits are disabled.",
  };
}
