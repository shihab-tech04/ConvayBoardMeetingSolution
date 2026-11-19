import { describe, expect, it } from "vitest";
import { USER_TYPES, userBusinessFields, validateUserBusinessFields } from "../app/pages/administration-requests/userBusinessFields";
import { readFileSync } from "node:fs";

describe("WS-D UAM-04 / UAM-15 configurable fields", () => {
  it("supports the same user-type catalogue as the approved user form", () => {
    expect(USER_TYPES).toEqual(["Internal Employee", "Governance Member", "External Participant"]);
  });
  it("normalizes user details for the existing protected server mutation", () => {
    expect(userBusinessFields({ employeeId: " EMP-103 ", userType: "Governance Member" })).toEqual({
      employee_id: "EMP-103", user_type: "Governance Member",
    });
  });
  it("permits an optional employee ID but rejects unsupported role-like user types", () => {
    expect(validateUserBusinessFields({ employeeId: "", userType: "External Participant" })).toBeNull();
    expect(validateUserBusinessFields({ employeeId: "X", userType: "Super Admin" })).toMatch(/valid User Type/);
    expect(() => userBusinessFields({ employeeId: "X".repeat(81), userType: "Internal Employee" })).toThrow(/80/);
  });
  it("wires editable fields to both invite and update without changing the protected account_role", () => {
    const source = readFileSync("src/app/pages/administration-requests/SupabaseUserManagementPage.tsx", "utf8");
    expect(source).toContain('id="convay-user-type"');
    expect(source).toContain('id="convay-employee-id"');
    expect(source.match(/\.\.\.userBusinessFields\(form\)/g)).toHaveLength(2);
    expect(source).not.toContain('account_role: form.userType');
  });
});

describe("WS-D RAM-01 / RAM-02 classification guard", () => {
  it("exposes the category and Custom filter without creating a second platform-root privilege", () => {
    const modal = readFileSync("src/app/components/roles/CreateEditRoleModal.tsx", "utf8");
    const list = readFileSync("src/app/pages/administration-requests/RoleManagementPage.tsx", "utf8");
    expect(modal).toContain('id="role-classification"');
    expect(modal).toContain('Classification does not grant platform Super Admin access.');
    expect(list).toContain('"Viewer", "Custom"');
  });
});
