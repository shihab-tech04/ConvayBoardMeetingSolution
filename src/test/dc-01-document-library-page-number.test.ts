import { describe, expect, it } from "vitest";
import { normalizeDocumentPage as page } from "../app/pages/agenda-documents/documentLibraryPageNumber";
describe("DC-01 document-library URL pagination",()=>{
  it("defaults missing URL page to first",()=>expect(page(null,30)).toBe(1));
  it("accepts a valid page",()=>expect(page("3",31)).toBe(3));
  it("clamps stale page to last page",()=>expect(page("99",12)).toBe(2));
  it("clamps empty results to first page",()=>expect(page("42",0)).toBe(1));
  it("normalizes nonnumeric URL page",()=>expect(page("NaN",15)).toBe(1));
  it("normalizes infinity URL page",()=>expect(page("Infinity",15)).toBe(1));
  it("normalizes decimals",()=>expect(page("2.2",15)).toBe(1));
  it("normalizes negatives",()=>expect(page("-2",15)).toBe(1));
  it("normalizes zero",()=>expect(page("0",15)).toBe(1));
  it("normalizes unsafe integer",()=>expect(page("9007199254740993",50)).toBe(1));
  it("handles a custom page size",()=>expect(page("3",21,5)).toBe(3));
  it("clamps when filtered results shrink",()=>expect(page("8",9)).toBe(1));
});
