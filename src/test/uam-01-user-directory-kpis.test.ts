import { describe, expect, it } from "vitest";
import { formatDirectoryKpi, summarizeUserDirectory } from
  "../app/pages/administration-requests/userDirectoryKpis";
import type { ConvayProfile } from "../app/services/supabase/convayAuth";

const user = (overrides: Partial<ConvayProfile> = {}): ConvayProfile => ({
  user_id: "11111111-1111-4111-8111-111111111111",
  username: "member",
  display_name: "Board Member",
  email: "member@example.com",
  account_role: "user",
  account_status: "active",
  ...overrides,
});

describe("UAM-01 user-directory KPI read states", () => {
  it("does not turn a pending or failed directory read into zero counts", () => {
    const unknown = summarizeUserDirectory([user()], false);

    expect(unknown).toEqual({
      total: null,
      active: null,
      inactiveOrSuspended: null,
      superAdmins: null,
    });
    expect(formatDirectoryKpi(unknown.total)).toBe("—");
  });

  it("shows zero only for a successfully loaded empty directory", () => {
    const empty = summarizeUserDirectory([], true);

    expect(empty).toEqual({ total: 0, active: 0, inactiveOrSuspended: 0, superAdmins: 0 });
    expect(formatDirectoryKpi(empty.total)).toBe("0");
  });

  it("derives each count from the server-returned account status and role", () => {
    const counts = summarizeUserDirectory([
      user(),
      user({ user_id: "22222222-2222-4222-8222-222222222222", account_status: "inactive" }),
      user({ user_id: "33333333-3333-4333-8333-333333333333", account_status: "suspended", account_role: "super_admin" }),
    ], true);

    expect(counts).toEqual({ total: 3, active: 1, inactiveOrSuspended: 2, superAdmins: 1 });
  });
});
