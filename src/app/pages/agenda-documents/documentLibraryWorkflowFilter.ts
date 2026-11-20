/** DC-06 UI filter only. Backend SQL/RLS remains sole document access authority. */
export interface DocumentWorkflowProjection {
  workflow_status?: unknown;
  approval_status?: unknown;
}

/** Display column "Workflow" is distinct from approval "Status".
 * Legacy documents may not have a workflow_status field, so preserve the
 * previous approval-status behavior only as that explicit fallback.
 */
export function matchesDocumentWorkflowStatus(
  row: DocumentWorkflowProjection,
  selectedStatus: string,
): boolean {
  if (!selectedStatus || selectedStatus === "All") return true;
  const workflow = typeof row.workflow_status === "string"
    ? row.workflow_status.trim() : "";
  const fallback = typeof row.approval_status === "string"
    ? row.approval_status.trim() : "";
  return (workflow || fallback) === selectedStatus;
}
