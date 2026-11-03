import { beforeEach, describe, expect, it, vi } from "vitest";
import { convayAuth } from "../app/services/supabase/convayAuth";
import {
  clearAccessSnapshot, reloadAccessSnapshot, permissionForPath,
  mayVisitPath, readAccessSnapshot,
} from "../app/services/supabase/convayAccess";
import { getVisibleNav, NAVIGATION } from "../app/data/navigation";
import { PERM_GROUPS } from "../app/data/permissions";

const userId = "b9b40a31-7ac4-4416-830f-a84749661abe";
const userEmail = "reader@example.com";
const tokens = {
  access_token: "signed-access-token",
  refresh_token: "signed-refresh-token",
  expires_in: 3600,
  user: { id: userId },
};
const userProfile = {
  user_id: userId, username: "reader", display_name: "Reader",
  email: userEmail, account_role: "user", account_status: "active",
};
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status, headers: { "Content-Type": "application/json" },
  });
}
function mockAccess(effective: string[], isAdmin = false) {
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (url.includes("/auth/v1/token")) return json(tokens);
    if (url.includes("/rest/v1/user_profiles")) return json([{
      ...userProfile, account_role: isAdmin ? "super_admin" : "user",
    }]);
    if (url.includes("/functions/v1/convay-access")) return json({
      is_super_admin: isAdmin,
      effective_permissions: effective,
      user_role_ids: [], roles: [], permissions: [], user_assignments: [],
    });
    throw new Error("Unexpected call: " + url);
  }));
}
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  clearAccessSnapshot();
  vi.unstubAllGlobals();
});

describe("Convay SQL-backed role permissions in frontend", () => {
  it("starts with no navigation or feature access before verifying the session", () => {
    expect(getVisibleNav()).toEqual([]);
    expect(mayVisitPath("/home/overview")).toBe(false);
  });
  it("hides unauthorized navigation, including the admin menu", async () => {
    mockAccess(["home_dashboard", "mtg_view"]);
    await convayAuth.signIn(userEmail, "not-a-real-password", false);
    await reloadAccessSnapshot();
    const sections = getVisibleNav().map(x => x.id);
    expect(sections).toEqual(["home", "meetings"]);
    expect(mayVisitPath("/meetings/all-meetings")).toBe(true);
    expect(mayVisitPath("/decisions-followup/decisions")).toBe(false);
    expect(mayVisitPath("/administration/roles-permissions/roles")).toBe(false);
    expect(mayVisitPath("/governance-org/users-assignments")).toBe(false);
  });
  it("removes a feature after the server stops granting its permission", async () => {
    mockAccess(["home_dashboard", "mtg_view"]);
    await convayAuth.signIn(userEmail, "not-a-real-password", false);
    await reloadAccessSnapshot();
    expect(mayVisitPath("/meetings/all-meetings")).toBe(true);
    mockAccess(["home_dashboard"]);
    await reloadAccessSnapshot();
    expect(mayVisitPath("/meetings/all-meetings")).toBe(false);
    expect(getVisibleNav().map(x => x.id)).toEqual(["home"]);
  });
  it("allows the single authenticated Super Admin to use every phase-1 navigation item", async () => {
    mockAccess([], true);
    await convayAuth.signIn(userEmail, "not-a-real-password", false);
    await reloadAccessSnapshot();
    expect(readAccessSnapshot().is_super_admin).toBe(true);
    expect(getVisibleNav().map(x => x.id)).toEqual([
      "home", "meetings", "agenda-documents", "decisions-followup",
      "governance-org", "archive-reports", "administration",
    ]);
  });
  it("covers every visible navigation leaf with a real permission code", () => {
    const ids = new Set(PERM_GROUPS.flatMap(g => g.permissions.map(p => p.id)));
    for (const main of NAVIGATION.filter(m => m.visibility !== "phase2")) {
      for (const sub of main.children.filter(s => s.visibility !== "phase2")) {
        const items = sub.children?.filter(c => c.visibility !== "phase2");
        const paths = items?.length
          ? items.map(c => "/" + main.id + "/" + sub.id + "/" + c.id)
          : ["/" + main.id + "/" + sub.id];
        for (const path of paths) {
          const permission = permissionForPath(path);
          expect(permission, "No permission mapping for " + path).toBeTruthy();
          expect(ids.has(permission!), "Unknown permission code for " + path).toBe(true);
        }
      }
    }
  });
});