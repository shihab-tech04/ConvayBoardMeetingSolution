import { describe, expect, it } from "vitest";
import { userDirectoryCsvCell } from "../app/pages/administration-requests/userDirectoryExport";

describe("UAM-01 user register CSV literal export", () => {
  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "  =2", "\tname", "\rname", "\nname", "\uFEFF=1", "＝1"])(
    "neutralizes spreadsheet expression or control prefix %s", value => {
      expect(userDirectoryCsvCell(value)).toBe("\"'" + value + "\"");
    },
  );
  it("preserves ordinary text and RFC-compatible escaping", () => {
    expect(userDirectoryCsvCell('Name, "quoted"')).toBe('"Name, ""quoted"""');
    expect(userDirectoryCsvCell("user@example.com")).toBe('"user@example.com"');
    expect(userDirectoryCsvCell("বাংলা")).toBe('"বাংলা"');
    expect(userDirectoryCsvCell(null)).toBe('""');
  });
});
