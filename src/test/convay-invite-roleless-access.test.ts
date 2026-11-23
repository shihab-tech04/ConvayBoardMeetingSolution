import { describe, expect, it } from "vitest";
import { workspaceAccessState, resolveActiveMainItem } from "../app/layouts/accountAccessState";

describe("Convay invited-user and permission-safe navigation", () => {
  it("shows the account-access waiting state for a verified user with no visible grants", () => {
    expect(workspaceAccessState({ loaded: true, error: null }, 0)).toBe("awaiting_permissions");
  });

  it("never interprets a failed permission read as a successful role assignment", () => {
    expect(workspaceAccessState({ loaded: false, error: "Permission service unavailable" }, 0)).toBe("verification_failed");
    expect(workspaceAccessState({ loaded: false, error: null }, 0)).toBe("verifying");
  });

  it("permits the authorized workspace once at least one visible route is granted", () => {
    expect(workspaceAccessState({ loaded: true, error: null }, 1)).toBe("ready");
  });

  it("returns null, not an undefined sidebar icon, for empty navigation", () => {
    expect(resolveActiveMainItem([], "home")).toBeNull();
  });

  it("keeps the requested active navigation item or falls back to the first permitted item", () => {
    const items = [{ id: "meetings", icon: "calendar" }, { id: "home", icon: "home" }];
    expect(resolveActiveMainItem(items, "home")).toEqual(items[1]);
    expect(resolveActiveMainItem(items, "invite")).toEqual(items[0]);
  });
});
