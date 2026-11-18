import { describe, expect, it, vi } from "vitest";
import { searchPdfText, type PdfSearchableDocument } from "../app/components/documents/pdf/pdfTextSearch";

function pdf(pages: string[]): PdfSearchableDocument {
  return {
    numPages: pages.length,
    getPage: async n => ({ getTextContent: async () => ({ items: [{ str: pages[n - 1] }] }) }),
  };
}

describe("DC-17 PDF text search", () => {
  it("searches later pages even if the first page has no text", async () => {
    const results = await searchPdfText(pdf(["", "Board resolution", ""]), "resolution", () => true);
    expect(results).toHaveLength(1);
    expect(results[0].pageNum).toBe(2);
  });

  it("finds case-insensitive text and retains existing one-result-per-page semantics", async () => {
    const results = await searchPdfText(pdf(["AGENDA agenda", "No match", "Draft Agenda"]), "agenda", () => true);
    expect(results.map(r => r.pageNum)).toEqual([1, 3]);
    expect(results[0].excerpt).toContain("AGENDA");
  });

  it("does not read pages for an empty search", async () => {
    const getPage = vi.fn();
    const results = await searchPdfText({ numPages: 5, getPage }, "  ", () => true);
    expect(results).toEqual([]);
    expect(getPage).not.toHaveBeenCalled();
  });

  it("discards an outdated search after a slow page response", async () => {
    let finish!: (value: { getTextContent: () => Promise<{ items: { str: string }[] }> }) => void;
    let current = true;
    const promise = searchPdfText({ numPages: 2, getPage: () => new Promise(resolve => { finish = resolve; }) }, "term", () => current);
    current = false;
    finish({ getTextContent: async () => ({ items: [{ str: "term" }] }) });
    expect(await promise).toEqual([]);
  });

  it("propagates an active PDF.js error to the panel error handler", async () => {
    await expect(searchPdfText({ numPages: 1, getPage: async () => { throw new Error("PDF failed"); } }, "term", () => true))
      .rejects.toThrow("PDF failed");
  });
});
