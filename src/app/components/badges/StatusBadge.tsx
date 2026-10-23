interface StatusBadgeProps {
  value: string;
}

const SUCCESS_STATUSES = new Set([
  "approved", "active", "verified", "paid", "resolved", "transferred",
  "disposed", "matched", "decided", "issued", "completed", "disbursed",
  "published", "signed", "implemented",
]);
const ERROR_STATUSES = new Set([
  "rejected", "inactive", "invalid", "unpaid", "failed", "cancelled",
  "mismatched", "suspended", "blocked", "withdrawn", "overdue",
]);
const WARNING_STATUSES = new Set([
  "pending", "pending review", "dormant", "partially paid", "in progress", "selected",
  "adjourned", "under review", "misfiled", "out of jurisdiction",
  "under preparation", "pending approval", "revision requested",
  "scheduled", "invitation sent", "paused", "awaiting minutes", "awaiting closure",
  "postponed", "implementing", "partially implemented", "deferred",
  "assigned", "acknowledged", "open",
]);
const SECONDARY_STATUSES = new Set(["waived", "archived", "superseded"]);

const STATUS_LABELS: Record<string, string> = {
  "active": "Active", "inactive": "Inactive", "pending": "Pending",
  "approved": "Approved", "rejected": "Rejected", "verified": "Verified",
  "unverified": "Unverified", "draft": "Draft", "submitted": "Submitted",
  "completed": "Completed", "in progress": "In Progress", "cancelled": "Cancelled",
  "paid": "Paid", "unpaid": "Unpaid", "partially paid": "Partially Paid",
  "resolved": "Resolved", "transferred": "Transferred", "disposed": "Disposed",
  "matched": "Matched", "decided": "Decided", "issued": "Issued",
  "disbursed": "Disbursed", "invalid": "Invalid", "failed": "Failed",
  "mismatched": "Mismatched", "suspended": "Suspended", "dormant": "Dormant",
  "selected": "Selected", "adjourned": "Adjourned", "under review": "Under Review",
  "misfiled": "Misfiled", "out of jurisdiction": "Out of Jurisdiction", "waived": "Waived",
  "pending review": "Pending Review", "under preparation": "Under Preparation",
  "pending approval": "Pending Approval", "revision requested": "Revision Requested",
  "published": "Published", "scheduled": "Scheduled", "invitation sent": "Invitation Sent",
  "paused": "Paused", "awaiting minutes": "Awaiting Minutes", "awaiting closure": "Awaiting Closure",
  "postponed": "Postponed", "archived": "Archived", "signed": "Signed",
  "implementing": "Implementing", "partially implemented": "Partially Implemented",
  "implemented": "Implemented", "superseded": "Superseded", "assigned": "Assigned",
  "acknowledged": "Acknowledged", "blocked": "Blocked", "deferred": "Deferred",
  "withdrawn": "Withdrawn", "open": "Open", "overdue": "Overdue",
  "processing": "Processing", "locked": "Locked", "unlocked": "Unlocked", "expired": "Expired",
};

// kept for variant lookup only
const STATUS_KEYS: Record<string, string> = {
  "active": "active", "inactive": "inactive", "pending": "pending",
  "approved": "approved", "rejected": "rejected", "verified": "verified",
  "unverified": "unverified", "draft": "draft", "submitted": "submitted",
  "completed": "completed", "in progress": "inProgress", "cancelled": "cancelled",
  "paid": "paid", "unpaid": "unpaid", "partially paid": "partiallyPaid",
  "resolved": "resolved", "transferred": "transferred", "disposed": "disposed",
  "matched": "matched", "decided": "decided", "issued": "issued",
  "disbursed": "disbursed", "invalid": "invalid", "failed": "failed",
  "mismatched": "mismatched", "suspended": "suspended", "dormant": "dormant",
  "selected": "selected", "adjourned": "adjourned", "under review": "underReview",
  "misfiled": "misfiled", "out of jurisdiction": "outOfJurisdiction", "waived": "waived",
  "pending review": "pendingReview",
  "under preparation": "underPreparation",
  "pending approval": "pendingApproval",
  "revision requested": "revisionRequested",
  "published": "published",
  "scheduled": "scheduled",
  "invitation sent": "invitationSent",
  "paused": "paused",
  "awaiting minutes": "awaitingMinutes",
  "awaiting closure": "awaitingClosure",
  "postponed": "postponed",
  "archived": "archived",
  "signed": "signed",
  "implementing": "implementing",
  "partially implemented": "partiallyImplemented",
  "implemented": "completed",
  "superseded": "superseded",
  "assigned": "assigned",
  "acknowledged": "acknowledged",
  "blocked": "blocked",
  "deferred": "deferred",
  "withdrawn": "withdrawn",
  "open": "open",
  "overdue": "overdue",
  "processing": "processing",
  "locked": "locked",
  "unlocked": "unlocked",
  "expired": "expired",
};

function getVariant(v: string): string {
  if (SUCCESS_STATUSES.has(v)) return "badge badge-success";
  if (ERROR_STATUSES.has(v)) return "badge badge-error";
  if (WARNING_STATUSES.has(v)) return "badge badge-warning";
  if (SECONDARY_STATUSES.has(v)) return "badge badge-secondary";
  return "badge badge-neutral";
}

export function StatusBadge({ value }: StatusBadgeProps) {
  const v = (value ?? "").toLowerCase();
  const className = getVariant(v);
  const label = STATUS_LABELS[v] ?? value;

  return <span className={className}>{label}</span>;
}
