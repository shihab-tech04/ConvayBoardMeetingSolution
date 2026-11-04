import { describe, expect, it } from "vitest";
import { deriveDashboardRole } from "../app/pages/dashboard/dashboardRole";

describe("HM-02 authenticated dashboard role", () => {
  it("uses the canonical authenticated role before a stale legacy user record", () => {
    expect(deriveDashboardRole("super_admin", "Company Secretary")).toBe("admin");
  });
  it("renders the correct governance-specific presentation for known roles", () => {
    expect(deriveDashboardRole("Board Chairman")).toBe("chairperson");
    expect(deriveDashboardRole("Company Secretary")).toBe("secretary");
    expect(deriveDashboardRole("Board Member")).toBe("board_member");
    expect(deriveDashboardRole("Administrator")).toBe("admin");
  });
  it("does not assume company-secretary privileges for unrecognized roles", () => {
    expect(deriveDashboardRole("")).toBe("board_member");
    expect(deriveDashboardRole("user")).toBe("board_member");
    expect(deriveDashboardRole(undefined, undefined)).toBe("board_member");
  });
  it("uses legacy role only when the authenticated role is absent", () => {
    expect(deriveDashboardRole(" ", "Board Chairman")).toBe("chairperson");
  });
});
