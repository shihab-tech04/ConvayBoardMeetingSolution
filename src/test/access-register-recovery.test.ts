import { describe, expect, it } from "vitest";
import { clampRegisterPage, requireRoleSaveMode, requirePermissionEditKind } from "../app/pages/administration-requests/accessRegisterRecovery";
import { userDirectoryCsvCell } from "../app/pages/administration-requests/userDirectoryExport";
describe("RAM/PAM register recovery and safe export", () => {
  it("retains explicit edit intent instead of turning deleted roles into creates", () => {
    expect(() => requireRoleSaveMode("old", "old", [], () => false)).toThrow(/no longer available/);
    expect(() => requireRoleSaveMode("old", "new", [{id:"old"}], () => false)).toThrow();
    expect(() => requireRoleSaveMode("old", "old", [{id:"old"}], () => true)).toThrow();
    expect(requireRoleSaveMode("old", "old", [{id:"old"}], () => false)).toBe("update");
    expect(requireRoleSaveMode(null, "new", [{id:"old"}], () => false)).toBe("create");
    expect(() => requireRoleSaveMode(null, "old", [{id:"old"}], () => false)).toThrow();
  });
  it("rejects stale permission identity and category without dispatching a different write", () => {
    expect(() => requirePermissionEditKind("p","p",true,[])).toThrow();
    expect(() => requirePermissionEditKind("p","q",true,[{id:"p",isCustom:true}])).toThrow();
    expect(() => requirePermissionEditKind("p","p",true,[{id:"p",isCustom:false}])).toThrow();
    expect(() => requirePermissionEditKind("p","p",false,[{id:"p",isCustom:true}])).toThrow();
    expect(requirePermissionEditKind("p","p",true,[{id:"p",isCustom:true}])).toBe("custom");
    expect(requirePermissionEditKind("p","p",false,[{id:"p",isCustom:false}])).toBe("base");
  });
  it("clamps authoritative shrink without changing a valid page", () => {
    expect(clampRegisterPage(3, 20, 10)).toBe(2);
    expect(clampRegisterPage(3, 21, 10)).toBe(3);
    expect(clampRegisterPage(3, 0, 10)).toBe(1);
    expect(clampRegisterPage(2, 11, 10)).toBe(2);
  });
  it.each(["=1+1", "+1", "-1", "@SUM(A1)", "  =1", "＝1"])("exports literal text %s", input => {
    expect(userDirectoryCsvCell(input)).toBe("\"'" + input + "\"");
  });
});
