import { describe, expect, it } from "vitest";
import { indexReportLinks, selectedReportLinks } from "../app/pages/archive-reports/linkedReportSummary";

const parents = [{ id: "a", code: "A", label: "Board" }, { id: "b", code: "B", label: "Board" }, { id: "c", code: "C", label: "Audit" }];
const children = [{ id: "one", ref: "a" }, { id: "two", ref: "A" }, { id: "two", ref: "A" }, { id: "three", ref: "Audit" }, { id: "ambiguous", ref: "Board" }, { id: "orphan", ref: "Other" }, { id: "blank", ref: "" }];
const links = () => indexReportLinks(parents, children, p => [p.id, p.code, p.label], c => c.ref);

describe("RP-03/RP-04 selected linked report metrics", () => {
  it("supports canonical id and legacy code without double counting", () => {
    expect(links().get("a")?.map(c => c.id)).toEqual(["one", "two"]);
  });
  it("never maps an ambiguous label, orphan, or blank reference", () => {
    expect(links().has("b")).toBe(false);
    expect(selectedReportLinks(parents, links()).map(c => c.id)).toEqual(["one", "two", "three"]);
  });
  it("scopes totals to filtered parent rows, including empty selection", () => {
    expect(selectedReportLinks([{ id: "c" }], links()).map(c => c.id)).toEqual(["three"]);
    expect(selectedReportLinks([], links())).toEqual([]);
    expect(selectedReportLinks([{ id: "a" }, { id: "a" }], links())).toHaveLength(2);
    expect(selectedReportLinks([{ id: "foreign" }], links())).toEqual([]);
  });
  it("does not let a colliding alias authorize attribution", () => {
    const index = indexReportLinks([{ id: "a", code: "b" }, { id: "b", code: "B" }], [{ id: "x", ref: "b" }], p => [p.id, p.code], c => c.ref);
    expect(index.size).toBe(0);
  });
});
