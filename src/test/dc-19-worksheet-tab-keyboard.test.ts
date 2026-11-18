import { describe, expect, it } from "vitest";
import { normalizeWorksheetRename, shouldActivateWorksheetTab } from "../app/components/documents/spreadsheet/worksheetTabKeyboard";

describe("DC-19 worksheet tab keyboard handling", () => {
  it("activates focused worksheet tabs with Enter", () => expect(shouldActivateWorksheetTab("Enter", true)).toBe(true));
  it("activates focused worksheet tabs with Space", () => expect(shouldActivateWorksheetTab(" ", true)).toBe(true));
  it("does not activate on escape", () => expect(shouldActivateWorksheetTab("Escape", true)).toBe(false));
  it("does not activate on regular typing", () => expect(shouldActivateWorksheetTab("N", true)).toBe(false));
  it("ignores rename input Enter bubbling", () => expect(shouldActivateWorksheetTab("Enter", false)).toBe(false));
  it("ignores rename input Space bubbling", () => expect(shouldActivateWorksheetTab(" ", false)).toBe(false));
  it("ignores context menu button keyboard", () => expect(shouldActivateWorksheetTab("Enter", false)).toBe(false));
  it("trims valid worksheet names", () => expect(normalizeWorksheetRename("  Budget FY27 ")).toBe("Budget FY27"));
  it("cancels blank worksheet rename", () => expect(normalizeWorksheetRename("   ")).toBeNull());
  it("preserves Unicode worksheet name", () => expect(normalizeWorksheetRename("বাজেট")).toBe("বাজেট"));
});
