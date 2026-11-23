import { describe, expect, it } from "vitest";
import { firstPermittedLandingPath, redirectDeniedDefaultDashboard } from "../app/layouts/permissionAwareLanding";

describe("Convay server-permission-filtered first-login landing", () => {
  const participantNav = [
    { id: "meetings", children: [{ id: "all-meetings" }] },
  ];
  it("preserves the existing dashboard entry for an account with dashboard access", () => {
    expect(redirectDeniedDefaultDashboard("/home/overview", true, participantNav)).toBeNull();
  });
  it("sends meeting-only invitees to their first permitted page, not a denied dashboard", () => {
    expect(firstPermittedLandingPath(participantNav)).toBe("/meetings/all-meetings");
    expect(redirectDeniedDefaultDashboard("/home/overview", false, participantNav)).toBe("/meetings/all-meetings");
  });
  it("chooses the first visible Home child if dashboard is unavailable", () => {
    expect(redirectDeniedDefaultDashboard("/home/overview", false, [
      { id: "home", children: [{ id: "my-tasks" }] },
      ...participantNav,
    ])).toBe("/home/my-tasks");
  });
  it("uses the first permitted third-level navigation route", () => {
    expect(firstPermittedLandingPath([
      { id: "archive-reports", children: [{ id: "registers", children: [{ id: "resolution-register" }] }] },
    ])).toBe("/archive-reports/registers/resolution-register");
  });
  it("does not invent workspace access for accounts with no granted navigation", () => {
    expect(firstPermittedLandingPath([])).toBeNull();
    expect(redirectDeniedDefaultDashboard("/home/overview", false, [])).toBeNull();
  });
  it("never bypasses a denied explicit deep link by redirecting it elsewhere", () => {
    expect(redirectDeniedDefaultDashboard("/administration/roles-permissions/roles", false, participantNav)).toBeNull();
  });
});
