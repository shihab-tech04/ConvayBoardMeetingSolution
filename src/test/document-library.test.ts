/**
 * Document library — filtering, search, tab counts, URL state, permission-based actions.
 * Pure logic tests; no React rendering.
 */
import { describe, it, expect } from "vitest";

// ── Minimal document shape for testing ────────────────────────────────────────

interface TestDoc {
  id: string;
  doc_name: string;
  doc_type: string;
  approval_status: string;
  acknowledgement_required: string;
  is_template?: boolean;
  owner?: string;
  confidentiality?: string;
}

const DOCS: TestDoc[] = [
  { id: "d1", doc_name: "Board Paper Q1",   doc_type: "Board Paper",   approval_status: "Draft",            acknowledgement_required: "No",  owner: "Alice" },
  { id: "d2", doc_name: "March Agenda",      doc_type: "Agenda",        approval_status: "Under Review",     acknowledgement_required: "No",  owner: "Bob" },
  { id: "d3", doc_name: "Risk Policy 2025",  doc_type: "Policy",        approval_status: "Approved",         acknowledgement_required: "Yes", owner: "Alice", confidentiality: "Restricted" },
  { id: "d4", doc_name: "Minutes Feb 2025",  doc_type: "Minutes",       approval_status: "Published",        acknowledgement_required: "No",  owner: "Carol" },
  { id: "d5", doc_name: "Audit Report FY25", doc_type: "Audit Report",  approval_status: "Pending Approval", acknowledgement_required: "Yes", owner: "Bob" },
  { id: "t1", doc_name: "Board Paper Template", doc_type: "Board Paper", approval_status: "Approved",        acknowledgement_required: "No",  is_template: true },
];

// ── Filter helpers ─────────────────────────────────────────────────────────────

function filterDocs(
  docs: TestDoc[],
  opts: {
    search?: string;
    status?: string;
    type?: string;
    excludeTemplates?: boolean;
  } = {},
): TestDoc[] {
  let result = docs;

  if (opts.excludeTemplates) {
    result = result.filter(d => !d.is_template);
  }

  if (opts.search) {
    const q = opts.search.toLowerCase();
    result = result.filter(d =>
      d.doc_name.toLowerCase().includes(q) || d.doc_type.toLowerCase().includes(q),
    );
  }

  if (opts.status) {
    result = result.filter(d => d.approval_status === opts.status);
  }

  if (opts.type) {
    result = result.filter(d => d.doc_type === opts.type);
  }

  return result;
}

function tabCount(docs: TestDoc[], tab: string): number {
  switch (tab) {
    case "all":        return docs.filter(d => !d.is_template).length;
    case "templates":  return docs.filter(d => d.is_template).length;
    case "my":         return docs.filter(d => !d.is_template && d.owner === "Alice").length;
    case "ack":        return docs.filter(d => !d.is_template && d.acknowledgement_required === "Yes").length;
    default:           return 0;
  }
}

// ── Permission helpers ─────────────────────────────────────────────────────────

function canEdit(doc: TestDoc, user: string): boolean {
  if (doc.approval_status === "Pending Approval" || doc.approval_status === "Approved") return false;
  if (doc.owner === user) return true;
  if (doc.confidentiality === "Restricted" && doc.owner !== user) return false;
  return true;
}

function canDownload(doc: TestDoc, restrictions: { restrict_download?: boolean }): boolean {
  return !restrictions.restrict_download;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Library tabs — counts", () => {
  it("all tab excludes templates", () => {
    expect(tabCount(DOCS, "all")).toBe(5);
  });

  it("templates tab counts only templates", () => {
    expect(tabCount(DOCS, "templates")).toBe(1);
  });

  it("my tab counts docs owned by Alice", () => {
    expect(tabCount(DOCS, "my")).toBe(2);
  });

  it("ack tab counts docs requiring acknowledgement (non-template)", () => {
    expect(tabCount(DOCS, "ack")).toBe(2);
  });
});

describe("Library search", () => {
  it("finds docs by name", () => {
    const results = filterDocs(DOCS, { search: "board", excludeTemplates: true });
    expect(results.some(d => d.id === "d1")).toBe(true);
  });

  it("finds docs by type", () => {
    const results = filterDocs(DOCS, { search: "policy", excludeTemplates: true });
    expect(results.some(d => d.id === "d3")).toBe(true);
  });

  it("returns empty array for no matches", () => {
    const results = filterDocs(DOCS, { search: "zzznomatch", excludeTemplates: true });
    expect(results).toHaveLength(0);
  });

  it("search is case-insensitive", () => {
    const lower = filterDocs(DOCS, { search: "audit", excludeTemplates: true });
    const upper = filterDocs(DOCS, { search: "AUDIT", excludeTemplates: true });
    expect(lower).toEqual(upper);
  });
});

describe("Library filters", () => {
  it("filters by approval status", () => {
    const results = filterDocs(DOCS, { status: "Draft", excludeTemplates: true });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("d1");
  });

  it("filters by doc type", () => {
    const results = filterDocs(DOCS, { type: "Minutes", excludeTemplates: true });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("d4");
  });

  it("combined search + status filter", () => {
    const results = filterDocs(DOCS, { search: "board", status: "Draft", excludeTemplates: true });
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("d1");
  });

  it("filter returns nothing when no docs match status", () => {
    const results = filterDocs(DOCS, { status: "Archived", excludeTemplates: true });
    expect(results).toHaveLength(0);
  });
});

describe("Permission-based actions", () => {
  it("owner can edit a Draft document", () => {
    const doc = DOCS.find(d => d.id === "d1")!;
    expect(canEdit(doc, "Alice")).toBe(true);
  });

  it("non-owner cannot edit a Restricted document", () => {
    const doc = DOCS.find(d => d.id === "d3")!; // confidentiality: Restricted, owner: Alice
    expect(canEdit(doc, "Bob")).toBe(false);
  });

  it("nobody can edit a Pending Approval document", () => {
    const doc = DOCS.find(d => d.id === "d5")!;
    expect(canEdit(doc, "Bob")).toBe(false);
    expect(canEdit(doc, "Alice")).toBe(false);
  });

  it("nobody can edit an Approved document", () => {
    const doc = DOCS.find(d => d.id === "d3")!;
    expect(canEdit(doc, "Alice")).toBe(false);
  });

  it("download is permitted when no restriction", () => {
    const doc = DOCS[0];
    expect(canDownload(doc, {})).toBe(true);
  });

  it("download is blocked when restrict_download is true", () => {
    const doc = DOCS[0];
    expect(canDownload(doc, { restrict_download: true })).toBe(false);
  });
});

describe("URL state — view param parsing", () => {
  function parseViewParam(search: string): string | null {
    const params = new URLSearchParams(search);
    return params.get("view");
  }

  it("parses view param from URL search string", () => {
    expect(parseViewParam("?view=doc-001")).toBe("doc-001");
  });

  it("returns null when no view param", () => {
    expect(parseViewParam("?tab=all")).toBeNull();
  });

  it("returns null for empty search", () => {
    expect(parseViewParam("")).toBeNull();
  });
});

describe("Drawer deep link", () => {
  function shouldOpenDrawer(viewParam: string | null, docs: TestDoc[]): TestDoc | null {
    if (!viewParam) return null;
    return docs.find(d => d.id === viewParam || d.doc_name === viewParam) ?? null;
  }

  it("opens drawer for a matching document ID", () => {
    const doc = shouldOpenDrawer("d1", DOCS);
    expect(doc?.id).toBe("d1");
  });

  it("returns null when document not found", () => {
    const doc = shouldOpenDrawer("no-such-id", DOCS);
    expect(doc).toBeNull();
  });

  it("returns null when view param is absent", () => {
    const doc = shouldOpenDrawer(null, DOCS);
    expect(doc).toBeNull();
  });
});
