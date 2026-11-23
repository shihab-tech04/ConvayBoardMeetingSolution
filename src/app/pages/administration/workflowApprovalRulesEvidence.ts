/** AD-02: absent authenticated tenant-scoped configuration source.
 * Do not fabricate policy rows, status counts or server write capability.
 */
import type { TableRow, KpiDef } from "../modulePageUtils";

export function unverifiedApprovalRulesView(): {
  rows: TableRow[];
  kpis: KpiDef[];
  description: string;
  unavailableReason: string;
} {
  return {
    rows: [],
    kpis: [{ label: "Approval rules evidence", value: "Unverified", tone: "warning" }],
    description: "Authenticated approval-rule configuration is not connected. Policy and count evidence is unverified; no sample rules are displayed.",
    unavailableReason: "Tenant-scoped approval-rule reads, actor authorization, versioned writes and SQL readback are unavailable. Creation and edits are disabled.",
  };
}
