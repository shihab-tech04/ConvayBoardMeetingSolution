/**
 * Document workflow tests.
 *
 * These test the workflow state-transition logic and approval record handling
 * using the registry interfaces directly (no React rendering needed).
 */
import { describe, it, expect } from "vitest";

// ── Workflow transition rules (mirrors DocumentDetailsDrawer WorkflowTab logic) ──

type WorkflowStatus =
  | "Draft"
  | "Under Review"
  | "Pending Approval"
  | "Approved"
  | "Published"
  | "Archived"
  | "Rejected"
  | "Withdrawn";

interface WorkflowTransition {
  from: WorkflowStatus;
  to: WorkflowStatus;
  action: string;
  requiresRole?: string;
}

const TRANSITIONS: WorkflowTransition[] = [
  { from: "Draft",            to: "Under Review",     action: "Submit for Review" },
  { from: "Under Review",     to: "Pending Approval",  action: "Submit for Approval" },
  { from: "Under Review",     to: "Draft",             action: "Return to Draft" },
  { from: "Pending Approval", to: "Approved",          action: "Approve",             requiresRole: "approver" },
  { from: "Pending Approval", to: "Rejected",          action: "Reject",              requiresRole: "approver" },
  { from: "Pending Approval", to: "Under Review",      action: "Request Revision" },
  { from: "Approved",         to: "Published",         action: "Publish" },
  { from: "Approved",         to: "Draft",             action: "Reset to Draft" },
  { from: "Published",        to: "Archived",          action: "Archive" },
];

function getAvailableTransitions(status: WorkflowStatus, isApprover: boolean): WorkflowTransition[] {
  return TRANSITIONS.filter(t => {
    if (t.from !== status) return false;
    if (t.requiresRole === "approver" && !isApprover) return false;
    return true;
  });
}

function isStatusLocked(status: WorkflowStatus): boolean {
  return status === "Pending Approval" || status === "Approved";
}

// ── Approval record helpers ────────────────────────────────────────────────────

interface ApprovalRecord {
  decision: "approved" | "rejected" | "pending";
  approver: string;
  decided_at?: string;
}

function computeApprovalResult(records: ApprovalRecord[]): "approved" | "rejected" | "pending" {
  if (records.some(r => r.decision === "rejected")) return "rejected";
  if (records.every(r => r.decision === "approved")) return "approved";
  return "pending";
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Workflow transitions — Draft", () => {
  it("can submit for review", () => {
    const t = getAvailableTransitions("Draft", false);
    expect(t.some(x => x.to === "Under Review")).toBe(true);
  });

  it("cannot publish directly from Draft", () => {
    const t = getAvailableTransitions("Draft", false);
    expect(t.some(x => x.to === "Published")).toBe(false);
  });
});

describe("Workflow transitions — Under Review", () => {
  it("can submit for approval", () => {
    const t = getAvailableTransitions("Under Review", false);
    expect(t.some(x => x.to === "Pending Approval")).toBe(true);
  });

  it("can return to draft", () => {
    const t = getAvailableTransitions("Under Review", false);
    expect(t.some(x => x.to === "Draft")).toBe(true);
  });
});

describe("Workflow transitions — Pending Approval", () => {
  it("approver can approve", () => {
    const t = getAvailableTransitions("Pending Approval", true);
    expect(t.some(x => x.action === "Approve")).toBe(true);
  });

  it("approver can reject", () => {
    const t = getAvailableTransitions("Pending Approval", true);
    expect(t.some(x => x.action === "Reject")).toBe(true);
  });

  it("non-approver cannot approve", () => {
    const t = getAvailableTransitions("Pending Approval", false);
    expect(t.some(x => x.action === "Approve")).toBe(false);
  });

  it("non-approver cannot reject", () => {
    const t = getAvailableTransitions("Pending Approval", false);
    expect(t.some(x => x.action === "Reject")).toBe(false);
  });

  it("can request revision (any role)", () => {
    const t = getAvailableTransitions("Pending Approval", false);
    expect(t.some(x => x.to === "Under Review")).toBe(true);
  });
});

describe("Workflow transitions — Approved", () => {
  it("can publish", () => {
    const t = getAvailableTransitions("Approved", false);
    expect(t.some(x => x.to === "Published")).toBe(true);
  });

  it("can reset to draft", () => {
    const t = getAvailableTransitions("Approved", false);
    expect(t.some(x => x.to === "Draft")).toBe(true);
  });
});

describe("Workflow — lock detection", () => {
  it("Pending Approval is locked", () => {
    expect(isStatusLocked("Pending Approval")).toBe(true);
  });

  it("Approved is locked", () => {
    expect(isStatusLocked("Approved")).toBe(true);
  });

  it("Draft is not locked", () => {
    expect(isStatusLocked("Draft")).toBe(false);
  });

  it("Under Review is not locked", () => {
    expect(isStatusLocked("Under Review")).toBe(false);
  });
});

describe("Approval result computation", () => {
  it("pending when all records are pending", () => {
    const recs: ApprovalRecord[] = [
      { decision: "pending", approver: "Alice" },
      { decision: "pending", approver: "Bob" },
    ];
    expect(computeApprovalResult(recs)).toBe("pending");
  });

  it("approved when all records are approved", () => {
    const recs: ApprovalRecord[] = [
      { decision: "approved", approver: "Alice", decided_at: "2025-01-01" },
      { decision: "approved", approver: "Bob",   decided_at: "2025-01-02" },
    ];
    expect(computeApprovalResult(recs)).toBe("approved");
  });

  it("rejected when any record is rejected", () => {
    const recs: ApprovalRecord[] = [
      { decision: "approved", approver: "Alice", decided_at: "2025-01-01" },
      { decision: "rejected", approver: "Bob",   decided_at: "2025-01-02" },
    ];
    expect(computeApprovalResult(recs)).toBe("rejected");
  });

  it("pending when one approved and one still pending", () => {
    const recs: ApprovalRecord[] = [
      { decision: "approved", approver: "Alice", decided_at: "2025-01-01" },
      { decision: "pending",  approver: "Bob" },
    ];
    expect(computeApprovalResult(recs)).toBe("pending");
  });
});

describe("Audit event generation", () => {
  function makeAuditId(): string {
    return `AUD-${Date.now()}-test`;
  }

  it("generates a non-empty audit ID", () => {
    expect(makeAuditId().length).toBeGreaterThan(0);
  });

  it("audit ID starts with AUD-", () => {
    expect(makeAuditId().startsWith("AUD-")).toBe(true);
  });
});
