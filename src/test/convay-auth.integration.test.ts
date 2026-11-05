import { beforeEach, describe, expect, it, vi } from "vitest";
import authReducer from "../app/store/authSlice";
import { convayAuth, profileToCurrentUser } from "../app/services/supabase/convayAuth";

const profile = {
  user_id: "4d0b19af-c0db-40df-8445-67cd363e9621",
  username: "shihab",
  display_name: "shihab",
  email: "shihabshajib01@gmail.com",
  account_role: "super_admin" as const,
  account_status: "active" as const,
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
const tokens = {
  access_token: "validated-access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  user: { id: profile.user_id },
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Supabase Auth migration", () => {
  it("never trusts the old localStorage authenticated flag", () => {
    localStorage.setItem("gov_ui_auth", JSON.stringify({ isAuthenticated: true, userId: "forged" }));
    expect(authReducer(undefined, { type: "unknown" }).isAuthenticated).toBe(false);
  });

  it("rejects an incorrect password before opening any application session", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error_description: "Invalid login credentials" }, 400)));
    await expect(convayAuth.signIn("shihab", "incorrect", true)).rejects.toThrow("Invalid login credentials");
    expect(localStorage.getItem("convay.supabase.session.v1")).toBeNull();
  });

  it("accepts the sole admin username through Auth, verifies the profile and never saves passwords", async () => {
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url.includes("/auth/v1/token")) {
        expect(String(opts?.body)).toContain("shihabshajib01@gmail.com");
        return json(tokens);
      }
      if (url.includes("/rest/v1/user_profiles")) return json([profile]);
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await convayAuth.signIn("shihab", "correct-password", true);
    expect(result.account_role).toBe("super_admin");
    expect(profileToCurrentUser(result).id).toBe(profile.user_id);
    expect(localStorage.getItem("convay.supabase.session.v1")).toContain("validated-access-token");
    expect(localStorage.getItem("convay.supabase.session.v1")).not.toContain("correct-password");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an inactive profile even after a successful Auth password response", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.includes("/auth/v1/token") ? json(tokens)
        : json([{ ...profile, account_status: "suspended" }])));
    await expect(convayAuth.signIn(profile.email, "some-password", false))
      .rejects.toThrow("Your account is not active");
    expect(sessionStorage.getItem("convay.supabase.session.v1")).toBeNull();
  });

  it("never calls the privileged endpoint without a validated session", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(convayAuth.users("invite", { name: "Test", email: "test@example.com" }))
      .rejects.toThrow("Session expired");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes a real bearer token to the protected user-management endpoint", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/auth/v1/token")) return json(tokens);
      if (url.includes("/rest/v1/user_profiles")) return json([profile]);
      if (url.includes("/functions/v1/convay-users")) return json({ users: [profile] });
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    await convayAuth.signIn(profile.email, "a-password", false);
    const result = await convayAuth.users("list");
    expect(result.users).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/functions/v1/convay-users"),
      expect.objectContaining({ headers: expect.objectContaining({
        Authorization: "Bearer validated-access-token",
      }) }),
    );
  });
});