import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { assertMinutesExportSelection } from "../app/pages/archive-reports/minutesExportSelection";

const record = { id: "r1", minutes_id: "MIN-1", meeting_id: "MTG-1", version: "1.0", approval_status: "Signed" };
const selected = { ...record, source_revision: 5 };
describe("MN-16 selected export identity and revision", () => {
  it("accepts the exact selected authorized revision", () => {
    expect(() => assertMinutesExportSelection(selected, record, 5)).not.toThrow();
  });
  it.each(["id", "minutes_id", "meeting_id", "version", "approval_status"] as const)("rejects changed %s", key => {
    expect(() => assertMinutesExportSelection(selected, { ...record, [key]: "other" }, 5)).toThrow(/changed/);
    expect(() => assertMinutesExportSelection({ ...selected, [key]: "" }, { ...record, [key]: "" }, 5)).toThrow(/changed/);
  });
  it.each([undefined, null, 0, -1, 1.5, "5", NaN, Number.MAX_SAFE_INTEGER + 1])("rejects invalid selected revision %s", revision => {
    expect(() => assertMinutesExportSelection({ ...selected, source_revision: revision }, record, revision)).toThrow(/changed/);
  });
  it("rejects same visible version with a changed SQL revision", () => {
    expect(() => assertMinutesExportSelection(selected, record, 6)).toThrow(/changed/);
  });
  it("requires fresh permission and version/revision readback before creating bytes", () => {
    const source = readFileSync("src/app/pages/archive-reports/MinutesManagementPage.tsx", "utf8");
    const exportCode = source.split("async function exportMinutes(row: TableRow)")[1].split("const dynamicFields")[0];
    expect(exportCode).toContain("const authorization = await reloadAccessSnapshot()");
    expect(exportCode).toContain("readAccessSnapshot() !== authorization");
    expect(exportCode).toContain("const finalAccess = await reloadAccessSnapshot()");
    expect(exportCode.indexOf("assertMinutesExportSelection(row, current, registry.getRevision(current.id))")).toBeLessThan(exportCode.indexOf("new Blob("));
    expect(source).toContain("source_revision: registry.getRevision?.(m.id)");
  });
});
