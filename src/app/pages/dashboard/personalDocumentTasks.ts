import { friendlyDue } from "./dateUtils";
import { fieldMatchesUser, isWorkflowRole } from "./homeWorkspaceUtils";

export interface PersonalDocumentTaskRecord {
  id: string;
  doc_id?: unknown;
  doc_name?: unknown;
  owner?: unknown;
  approval_status?: unknown;
  acknowledgement_required?: unknown;
  is_template?: unknown;
  effective_date?: unknown;
  created_at?: unknown;
  related_meeting?: unknown;
}

export interface PersonalDocumentAcknowledgement {
  document_id?: unknown;
  acknowledged_by?: unknown;
}

export interface PersonalDocumentTask {
  id: string;
  sourceId: string;
  sourceType: "document";
  title: string;
  description: string;
  type: "Review" | "Approval";
  relatedMeeting: string;
  dueDate: string;
  dueLabel: string;
  status: "Pending" | "Overdue";
}

export interface PersonalDocumentTaskViewer {
  name: string;
  role?: string;
  designation?: string;
}

/**
 * Shared document task projection for the overview KPI and the full My Tasks
 * queue. RLS remains the authorization boundary; this applies the same
 * owner/workflow-role display rule in both places.
 */
export function buildPersonalDocumentTasks(
  documents: readonly PersonalDocumentTaskRecord[],
  acknowledgements: readonly PersonalDocumentAcknowledgement[],
  viewer: PersonalDocumentTaskViewer,
  today: string,
): PersonalDocumentTask[] {
  const name = String(viewer.name ?? "").trim().toLowerCase();
  const hasWorkflowAccess =
    isWorkflowRole(String(viewer.role ?? "")) ||
    isWorkflowRole(String(viewer.designation ?? ""));
  const tasks: PersonalDocumentTask[] = [];
  const seen = new Set<string>();

  const add = (task: PersonalDocumentTask) => {
    if (seen.has(task.id)) return;
    seen.add(task.id);
    tasks.push(task);
  };

  for (const document of documents) {
    if (document.is_template) continue;
    if (document.approval_status !== "Under Review") continue;
    if (!hasWorkflowAccess && !fieldMatchesUser(document.owner, name)) continue;
    const dueDate = String(document.effective_date ?? document.created_at ?? "").slice(0, 10);
    add({
      id: "doc-rev-" + document.id,
      sourceId: String(document.doc_id ?? document.id),
      sourceType: "document",
      title: "Review: " + String(document.doc_name ?? ""),
      description: "Document review required",
      type: "Review",
      relatedMeeting: String(document.related_meeting ?? ""),
      dueDate,
      dueLabel: friendlyDue(dueDate),
      status: dueDate !== "" && dueDate < today ? "Overdue" : "Pending",
    });
  }

  for (const document of documents) {
    if (document.is_template) continue;
    if (document.approval_status !== "Pending Approval") continue;
    if (!hasWorkflowAccess && !fieldMatchesUser(document.owner, name)) continue;
    const dueDate = String(document.effective_date ?? document.created_at ?? "").slice(0, 10);
    add({
      id: "doc-apv-" + document.id,
      sourceId: String(document.doc_id ?? document.id),
      sourceType: "document",
      title: "Approve: " + String(document.doc_name ?? ""),
      description: "Document approval required",
      type: "Approval",
      relatedMeeting: String(document.related_meeting ?? ""),
      dueDate,
      dueLabel: friendlyDue(dueDate),
      status: dueDate !== "" && dueDate < today ? "Overdue" : "Pending",
    });
  }

  for (const document of documents) {
    if (document.is_template) continue;
    if (document.acknowledgement_required !== "Yes") continue;
    if (document.approval_status !== "Approved" && document.approval_status !== "Published") continue;
    const documentId = String(document.doc_id ?? document.id);
    const alreadyAcknowledged = acknowledgements.some(ack =>
      String(ack.document_id ?? "") === documentId &&
      String(ack.acknowledged_by ?? "").toLowerCase() === name,
    );
    if (alreadyAcknowledged) continue;
    const dueDate = String(document.effective_date ?? document.created_at ?? "").slice(0, 10);
    add({
      id: "doc-ack-" + document.id,
      sourceId: documentId,
      sourceType: "document",
      title: "Acknowledge: " + String(document.doc_name ?? ""),
      description: "Explicit acknowledgement required for this document",
      type: "Review",
      relatedMeeting: String(document.related_meeting ?? ""),
      dueDate,
      dueLabel: friendlyDue(dueDate),
      status: dueDate !== "" && dueDate < today ? "Overdue" : "Pending",
    });
  }

  return tasks;
}
