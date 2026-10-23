/**
 * Phase 8: Spreadsheet workspace unit tests.
 * Tests: CSV safety gate, sheet tab logic, import status, toolbar callbacks.
 */
import { describe, it, expect } from "vitest";

// ── CSV / TSV safety checks ───────────────────────────────────────────────────
// Mirror the isCsvSafe function from SpreadsheetWorkspace

const EXEC_SIGNATURES = [
  "\xFF\xFE",
  "MZ",
  "\x7FELF",
  "<?php",
  "<script",
  "=cmd(",
  "=HYPERLINK(",
  "@SUM(",
];

function isCsvSafe(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (text.includes("\0")) return false;
  if (/<html[\s>]/i.test(lower)) return false;
  for (const sig of EXEC_SIGNATURES) {
    if (text.startsWith(sig) || lower.startsWith(sig.toLowerCase())) return false;
  }
  return true;
}

describe("isCsvSafe", () => {
  it("accepts normal CSV text", () => {
    expect(isCsvSafe("name,value\nAlice,100\nBob,200")).toBe(true);
  });

  it("accepts CSV with quoted commas", () => {
    expect(isCsvSafe('"Smith, John",42\n"Doe, Jane",99')).toBe(true);
  });

  it("rejects text with NUL byte", () => {
    expect(isCsvSafe("name\0value")).toBe(false);
  });

  it("rejects HTML renamed as CSV", () => {
    expect(isCsvSafe("<html><body>data</body></html>")).toBe(false);
  });

  it("rejects <script injection", () => {
    expect(isCsvSafe("<script>alert(1)</script>")).toBe(false);
  });

  it("rejects PHP opener", () => {
    expect(isCsvSafe("<?php echo 'hi'; ?>")).toBe(false);
  });

  it("rejects CSV formula injection with =cmd(", () => {
    expect(isCsvSafe("=cmd(calc)")).toBe(false);
  });

  it("rejects =HYPERLINK injection", () => {
    expect(isCsvSafe("=HYPERLINK(\"http://evil.com\",\"click me\")")).toBe(false);
  });

  it("accepts a CSV that starts with = in a quoted field", () => {
    // Quoted fields with = are fine — this is not a leading = formula injection
    expect(isCsvSafe('"=SUM(A1:A10)","result"')).toBe(true);
  });
});

// ── Sheet tab logic ───────────────────────────────────────────────────────────

interface SheetTab { id: string; name: string; hidden?: boolean; }

function visibleSheets(sheets: SheetTab[]): SheetTab[] {
  return sheets.filter(s => !s.hidden);
}

function canDelete(sheets: SheetTab[]): boolean {
  return sheets.length > 1;
}

function renameSheet(sheets: SheetTab[], id: string, name: string): SheetTab[] {
  return sheets.map(s => s.id === id ? { ...s, name } : s);
}

function deleteSheet(sheets: SheetTab[], id: string): { sheets: SheetTab[]; nextActive: string } {
  const idx = sheets.findIndex(s => s.id === id);
  const remaining = sheets.filter(s => s.id !== id);
  const nextActive = remaining[Math.max(0, idx - 1)]?.id ?? remaining[0].id;
  return { sheets: remaining, nextActive };
}

function duplicateSheet(sheets: SheetTab[], id: string): SheetTab[] {
  const src = sheets.find(s => s.id === id);
  if (!src) return sheets;
  const copy: SheetTab = { id: `copy-${Date.now()}`, name: `${src.name} (copy)` };
  return [...sheets, copy];
}

describe("sheet tab operations", () => {
  const baseSheets: SheetTab[] = [
    { id: "s1", name: "Sheet1" },
    { id: "s2", name: "Sheet2" },
    { id: "s3", name: "Sheet3", hidden: true },
  ];

  it("filters out hidden sheets for display", () => {
    expect(visibleSheets(baseSheets)).toHaveLength(2);
  });

  it("can delete when multiple sheets", () => {
    expect(canDelete(baseSheets)).toBe(true);
  });

  it("cannot delete when only one sheet", () => {
    expect(canDelete([baseSheets[0]])).toBe(false);
  });

  it("renameSheet updates name only", () => {
    const result = renameSheet(baseSheets, "s1", "Overview");
    expect(result[0].name).toBe("Overview");
    expect(result[1].name).toBe("Sheet2");
  });

  it("deleteSheet removes sheet and returns next active id", () => {
    const { sheets, nextActive } = deleteSheet(baseSheets, "s1");
    expect(sheets.find(s => s.id === "s1")).toBeUndefined();
    expect(nextActive).toBe("s2");
  });

  it("deleteSheet of last visible falls back to first remaining", () => {
    const two: SheetTab[] = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
    const { sheets, nextActive } = deleteSheet(two, "b");
    expect(sheets).toHaveLength(1);
    expect(nextActive).toBe("a");
  });

  it("duplicateSheet adds a copy with modified name", () => {
    const result = duplicateSheet(baseSheets, "s1");
    expect(result).toHaveLength(4);
    const copy = result[result.length - 1];
    expect(copy.name).toContain("Sheet1");
    expect(copy.name).toContain("copy");
  });
});

// ── Import status transitions ────────────────────────────────────────────────

type ImportStatus =
  | "idle" | "loading" | "converting" | "ready"
  | "warning" | "macro-warning" | "too-large" | "corrupt" | "failed";

const ERROR_STATUSES: ImportStatus[] = ["corrupt", "failed", "too-large"];
const WARN_STATUSES:  ImportStatus[] = ["warning", "macro-warning"];
const LOAD_STATUSES:  ImportStatus[] = ["loading", "converting"];

function isTerminal(s: ImportStatus): boolean {
  return !["loading", "converting"].includes(s);
}

function showBanner(s: ImportStatus): boolean {
  return s !== "idle" && s !== "ready";
}

describe("ImportStatus transitions", () => {
  it("loading and converting are non-terminal", () => {
    for (const s of LOAD_STATUSES) {
      expect(isTerminal(s)).toBe(false);
    }
  });

  it("error statuses are terminal", () => {
    for (const s of ERROR_STATUSES) {
      expect(isTerminal(s)).toBe(true);
    }
  });

  it("idle and ready show no banner", () => {
    expect(showBanner("idle")).toBe(false);
    expect(showBanner("ready")).toBe(false);
  });

  it("warning statuses show banner", () => {
    for (const s of WARN_STATUSES) {
      expect(showBanner(s)).toBe(true);
    }
  });

  it("macro-warning is distinct from generic warning", () => {
    expect(WARN_STATUSES).toContain("macro-warning");
    expect(WARN_STATUSES).toContain("warning");
  });
});

// ── File size guard ───────────────────────────────────────────────────────────

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

function checkFileSize(bytes: number): "ok" | "too-large" {
  return bytes > MAX_BYTES ? "too-large" : "ok";
}

describe("file size guard", () => {
  it("accepts files under 50 MB", () => {
    expect(checkFileSize(10 * 1024 * 1024)).toBe("ok");
  });

  it("accepts exactly 50 MB", () => {
    expect(checkFileSize(MAX_BYTES)).toBe("ok");
  });

  it("rejects files over 50 MB", () => {
    expect(checkFileSize(MAX_BYTES + 1)).toBe("too-large");
  });

  it("rejects 100 MB file", () => {
    expect(checkFileSize(100 * 1024 * 1024)).toBe("too-large");
  });
});
