import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { matchesDocumentWorkflowStatus, matchesAnyDocumentWorkflowStatus } from "../app/pages/agenda-documents/documentLibraryWorkflowFilter";

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
    expect(src).toContain('matchesDocumentWorkflowStatus(row, applied.workflow_status ?? "")');
    expect(src).not.toContain("row.approval_status !== applied.workflow_status");
    expect(src).toContain('label: "Workflow Status"');
  });
});

describe("DC-06 workflow status tabs and KPI consistency", () => {
  it("includes a document in needs attention only when its explicit workflow requires it", () => {
    expect(matchesAnyDocumentWorkflowStatus(
      { workflow_status: "Under Review", approval_status: "Approved" }, ["Under Review", "Changes Requested"],
    )).toBe(true);
    expect(matchesAnyDocumentWorkflowStatus(
      { workflow_status: "Changes Requested", approval_status: "Published" }, ["Under Review", "Changes Requested"],
    )).toBe(true);
    expect(matchesAnyDocumentWorkflowStatus(
      { workflow_status: "Approved", approval_status: "Under Review" }, ["Under Review", "Changes Requested"],
    )).toBe(false);
  });

  it("published tab and KPI use the workflow field when approval and workflow diverge", () => {
    expect(matchesDocumentWorkflowStatus({ workflow_status: "Published", approval_status: "Approved" }, "Published")).toBe(true);
    expect(matchesDocumentWorkflowStatus({ workflow_status: "Under Review", approval_status: "Published" }, "Published")).toBe(false);
  });

  it("archived tab refuses to classify a still-active workflow as archived", () => {
    expect(matchesDocumentWorkflowStatus({ workflow_status: "Archived", approval_status: "Approved" }, "Archived")).toBe(true);
    expect(matchesDocumentWorkflowStatus({ workflow_status: "Draft", approval_status: "Archived" }, "Archived")).toBe(false);
  });

  it("preserves old records with no explicit workflow_status", () => {
    expect(matchesAnyDocumentWorkflowStatus({ approval_status: "Under Review" }, ["Under Review", "Changes Requested"])).toBe(true);
    expect(matchesDocumentWorkflowStatus({ approval_status: "Published" }, "Published")).toBe(true);
    expect(matchesDocumentWorkflowStatus({ workflow_status: "", approval_status: "Archived" }, "Archived")).toBe(true);
  });

  it("does not fabricate workflow matches from missing, invalid, or unrelated states", () => {
    expect(matchesAnyDocumentWorkflowStatus({}, ["Under Review", "Changes Requested"])).toBe(false);
    expect(matchesAnyDocumentWorkflowStatus({ workflow_status: 3, approval_status: "Draft" }, ["Under Review", "Changes Requested"])).toBe(false);
    expect(matchesDocumentWorkflowStatus({ workflow_status: "Something Else", approval_status: "Published" }, "Published")).toBe(false);
  });

  it("does not change the source record when classifying tabs or KPI cards", () => {
    const row = Object.freeze({ workflow_status: "Under Review", approval_status: "Published" });
    matchesAnyDocumentWorkflowStatus(row, ["Under Review", "Changes Requested"]);
    expect(row).toEqual({ workflow_status: "Under Review", approval_status: "Published" });
  });

  it("wires filter, tabs, tab badge counts and KPI cards to the same authoritative helper", () => {
    const src = readFileSync("src/app/pages/agenda-documents/DocumentLibraryPage.tsx", "utf8");
    expect(src).toContain('matchesDocumentWorkflowStatus(row, applied.workflow_status ?? "")');
    expect(src).toContain('case "needs-attention": return matchesAnyDocumentWorkflowStatus(row, ["Under Review", "Changes Requested"]);');
    expect(src).toContain('case "published":       return matchesDocumentWorkflowStatus(row, "Published");');
    expect(src).toContain('case "archived":        return matchesDocumentWorkflowStatus(row, "Archived");');
    expect(src).toContain('const needsAttentionCount = searchFiltered.filter(d => matchesAnyDocumentWorkflowStatus(d, ["Under Review", "Changes Requested"])).length;');
    expect(src).toContain('const publishedCount      = searchFiltered.filter(d => matchesDocumentWorkflowStatus(d, "Published")).length;');
    expect(src).toContain('count: cnt(d => matchesDocumentWorkflowStatus(d, "Archived"))');
    expect(src).not.toContain('count: cnt(d => d.approval_status === "Published")');
    expect(src).not.toContain('count: cnt(d => d.approval_status === "Archived")');
  });
});
