import { describe, expect, it } from "vitest";
import { buildPersonalDocumentTasks } from "../app/pages/dashboard/personalDocumentTasks";

const today = "2026-11-22";

function doc(overrides: Record<string, unknown>) {
  return {
    id: "doc-1",
    doc_id: "DOC-1",
    doc_name: "Board pack",
    owner: "Alice Smith",
    approval_status: "Under Review",
    acknowledgement_required: "No",
    is_template: false,
    effective_date: "2026-11-24",
    created_at: "2026-11-20T10:00:00Z",
    related_meeting: "Board meeting",
    ...overrides,
  };
}

describe("HM-01 overview and My Tasks document parity", () => {
  it("shares owner-scoped review and approval tasks and excludes unrelated owners", () => {
    const tasks = buildPersonalDocumentTasks(
      [
        doc({ id: "review", approval_status: "Under Review", owner: "Ms. Alice Smith", effective_date: "2026-11-20" }),
        doc({ id: "approval", approval_status: "Pending Approval", owner: "Alice Smith" }),
        doc({ id: "other-owner", approval_status: "Under Review", owner: "Bob Jones" }),
        doc({ id: "template", is_template: true, approval_status: "Pending Approval" }),
      ],
      [],
      { name: "Alice Smith", role: "Member" },
      today,
    );
    expect(tasks.map(task => task.id)).toEqual(["doc-rev-review", "doc-apv-approval"]);
    expect(tasks[0].status).toBe("Overdue");
    expect(tasks[1].status).toBe("Pending");
  });

  it("includes workflow-role review work with the same rules as My Tasks", () => {
    const tasks = buildPersonalDocumentTasks(
      [doc({ id: "secretariat", approval_status: "Under Review", owner: "Bob Jones" })],
      [],
      { name: "Alice Smith", designation: "Company Secretary" },
      today,
    );
    expect(tasks.map(task => task.id)).toEqual(["doc-rev-secretariat"]);
  });

  it("creates acknowledgement tasks only for published or approved documents that remain unacknowledged", () => {
    const tasks = buildPersonalDocumentTasks(
      [
        doc({ id: "ack-published", doc_id: "DOC-P", owner: "Bob Jones", approval_status: "Published", acknowledgement_required: "Yes" }),
        doc({ id: "ack-done", doc_id: "DOC-DONE", owner: "Bob Jones", approval_status: "Approved", acknowledgement_required: "Yes" }),
        doc({ id: "ack-pending", approval_status: "Under Review", acknowledgement_required: "Yes" }),
      ],
      [{ document_id: "DOC-DONE", acknowledged_by: "ALICE SMITH" }],
      { name: "Alice Smith", role: "Member" },
      today,
    );
    expect(tasks.map(task => task.id)).toEqual(["doc-ack-ack-published"]);
  });

  it("normalizes dated task status and uses created date when effective date is missing", () => {
    const tasks = buildPersonalDocumentTasks(
      [
        doc({ id: "date-fallback", effective_date: null, created_at: "2026-11-21T13:00:00Z" }),
        doc({ id: "no-date", effective_date: null, created_at: null }),
      ],
      [],
      { name: "Alice Smith" },
      today,
    );
    expect(tasks.map(task => task.dueDate)).toEqual(["2026-11-21", ""]);
    expect(tasks.map(task => task.status)).toEqual(["Overdue", "Pending"]);
  });
});
