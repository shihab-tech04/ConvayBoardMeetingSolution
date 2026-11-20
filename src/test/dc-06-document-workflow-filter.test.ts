import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchesDocumentWorkflowStatus } from "../app/pages/agenda-documents/documentLibraryWorkflowFilter";

describe("DC-06 document library Workflow Status filtering", () => {
  it("uses explicit Workflow column rather than distinct Approval Status", () => {
    expect(matchesDocumentWorkflowStatus({workflow_status:"Under Review",approval_status:"Draft"},"Under Review")).toBe(true);
    expect(matchesDocumentWorkflowStatus({workflow_status:"Under Review",approval_status:"Draft"},"Draft")).toBe(false);
  });
  it("supports Published workflow independent of an approval label", () => {
    expect(matchesDocumentWorkflowStatus({workflow_status:"Published",approval_status:"Approved"},"Published")).toBe(true);
    expect(matchesDocumentWorkflowStatus({workflow_status:"Approved",approval_status:"Published"},"Published")).toBe(false);
  });
  it("preserves legacy records lacking workflow_status via approval-status fallback", () => {
    expect(matchesDocumentWorkflowStatus({approval_status:"Draft"},"Draft")).toBe(true);
    expect(matchesDocumentWorkflowStatus({workflow_status:"",approval_status:"Archived"},"Archived")).toBe(true);
  });
  it("rejects invalid and unrelated workflow metadata instead of showing the wrong status", () => {
    expect(matchesDocumentWorkflowStatus({workflow_status:3,approval_status:"Draft"},"Published")).toBe(false);
    expect(matchesDocumentWorkflowStatus({workflow_status:"Changed",approval_status:"Published"},"Published")).toBe(false);
  });
  it("trims incidental metadata whitespace and matches known statuses exactly", () => {
    expect(matchesDocumentWorkflowStatus({workflow_status:" Under Review ",approval_status:"Draft"},"Under Review")).toBe(true);
    expect(matchesDocumentWorkflowStatus({workflow_status:"draft",approval_status:"Draft"},"Draft")).toBe(false);
  });
  it("keeps the All/default filter inclusive", () => {
    expect(matchesDocumentWorkflowStatus({workflow_status:"Changes Requested"},"All")).toBe(true);
    expect(matchesDocumentWorkflowStatus({},"")).toBe(true);
  });
  it("is actually wired into the library filter, not only unused code", () => {
    const src=readFileSync("src/app/pages/agenda-documents/DocumentLibraryPage.tsx","utf8");
    expect(src).toContain("matchesDocumentWorkflowStatus(row, applied.workflow_status)");
    expect(src).not.toContain("row.approval_status !== applied.workflow_status");
    expect(src).toContain('label: "Workflow Status"');
  });
});
