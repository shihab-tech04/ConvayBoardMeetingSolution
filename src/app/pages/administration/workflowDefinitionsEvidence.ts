/** AD-01: fail closed when no authoritative, versioned configuration
 * registry and tenant-scoped mutation service are available.
 * Do not treat absent backend as zero configured workflows.
 */
import type { TableRow, KpiDef } from "../modulePageUtils";
export interface WorkflowDefinitionEvidence {
  rows: TableRow[];
  kpis: KpiDef[];
  description: string;
  unavailableReason: string;
}
export function unverifiedWorkflowDefinitionsView(): WorkflowDefinitionEvidence {
  return {
    rows: [],
    kpis: [{ label: "Definitions evidence", value: "Unverified", tone: "warning" }],
    description: "Versioned workflow definitions are not connected to an authorized configuration service. No sample definitions or counts are displayed.",
    unavailableReason: "Workflow definition versioning, activation, tenant authorization and authoritative SQL readback are unavailable. Creation and edits are disabled.",
  };
}
