/** AD-04 — zero fabricated workflow audit entries.
 * This projection intentionally does NOT turn unavailable SQL into an empty
 * but verified audit journal; real events require an approved, authenticated,
 * append-only provider with tenant/actor read permissions and audit proof.
 */
import type { TableRow, KpiDef } from "../modulePageUtils";

export interface UnverifiedWorkflowHistoryView {
  rows: TableRow[];
  kpis: KpiDef[];
  description: string;
  disabledReason: string;
}

export function unverifiedWorkflowHistoryView(): UnverifiedWorkflowHistoryView {
  return {
    rows: [],
    kpis: [{ label: "History evidence", value: "Unverified", tone: "warning" }],
    description: "Authenticated workflow history is not connected. Event records, actors, approval outcomes and counts are unverified; no sample events are displayed.",
    disabledReason: "No authenticated workflow event journal or export permission has been verified.",
  };
}
