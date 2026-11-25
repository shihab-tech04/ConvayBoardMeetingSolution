import { beforeEach, describe, expect, it, vi } from "vitest";
import { convayAuth } from "../app/services/supabase/convayAuth";

const KEY = "convay.supabase.session.v1";
const OLD_ID = "previous-account";
const NEW_ID = "next-account";

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { "Content-Type": "application/json" },
  });
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => { resolve = yes; });
  return { promise, resolve };
}
function seedExpiredSession() {
  localStorage.setItem(KEY, JSON.stringify({
    accessToken: "previous-access", refreshToken: "previous-refresh",
    userId: OLD_ID, expiresAt: Date.now() - 60_000,
  }));
}
const refreshedOld = {
  access_token: "refreshed-previous", refresh_token: "rotated-previous",
  expires_in: 3600, user: { id: OLD_ID },
};
const signedInNext = {
  access_token: "next-access", refresh_token: "next-refresh",
  expires_in: 3600, user: { id: NEW_ID },
};
const nextProfile = {
  user_id: NEW_ID, username: "next", display_name: "Next",
  email: "next@example.org", account_role: "user", account_status: "active",
};

beforeEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
  sessionStorage.clear();
});

describe("authenticated token refresh account-session isolation", () => {
  it("cannot restore a session after sign-out while refresh is pending", async () => {
    seedExpiredSession();
    const started = deferred<void>();
    const pending = deferred<Response>();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("grant_type=refresh_token")) {
        started.resolve();
        return pending.promise;
      }
      if (url.endsWith("/auth/v1/logout")) return json({});
      if (url.endsWith("/rest/v1/private")) return json({ ok: true });
      throw new Error("Unexpected endpoint " + url);
    });
    vi.stubGlobal("fetch", fetchMock);
    const inFlight = convayAuth.authenticatedRequest("/rest/v1/private");
    await started.promise;
    await convayAuth.signOut();
    pending.resolve(json(refreshedOld));
    await expect(inFlight).rejects.toThrow(/Session expired/);
    expect(sessionStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith("/rest/v1/private"))).toBe(false);
  });

  it("does not replace the next account's session with a late older refresh", async () => {
    seedExpiredSession();
    const started = deferred<void>();
    const pending = deferred<Response>();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("grant_type=refresh_token")) {
        started.resolve();
        return pending.promise;
      }
      if (url.includes("grant_type=password")) return json(signedInNext);
      if (url.includes("/rest/v1/user_profiles")) return json([nextProfile]);
      if (url.endsWith("/rest/v1/private")) return json({ ok: true });
      throw new Error("Unexpected endpoint " + url);
    });
    vi.stubGlobal("fetch", fetchMock);
    const earlier = convayAuth.authenticatedRequest("/rest/v1/private");
    await started.promise;
    await convayAuth.signIn("next@example.org", "valid-password", true);
    pending.resolve(json(refreshedOld));
    await expect(earlier).rejects.toThrow(/Session expired/);
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}").userId).toBe(NEW_ID);
    await convayAuth.authenticatedRequest("/rest/v1/private");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/rest/v1/private"),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: "Bearer next-access" }),
      }),
    );
  });

  it("cannot clear the next account after an older refresh fails", async () => {
    seedExpiredSession();
    const started = deferred<void>();
    const pending = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("grant_type=refresh_token")) {
        started.resolve();
        return pending.promise;
      }
      if (url.includes("grant_type=password")) return json(signedInNext);
      if (url.includes("/rest/v1/user_profiles")) return json([nextProfile]);
      throw new Error("Unexpected endpoint " + url);
    }));
    const earlier = convayAuth.authenticatedRequest("/rest/v1/private");
    await started.promise;
    await convayAuth.signIn("next@example.org", "valid-password", true);
    pending.resolve(json({ error: "Expired token" }, 401));
    await expect(earlier).rejects.toThrow(/Session expired/);
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}").userId).toBe(NEW_ID);
  });

  it("deduplicates concurrent refreshes within one unchanged session", async () => {
    seedExpiredSession();
    const started = deferred<void>();
    const pending = deferred<Response>();
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("grant_type=refresh_token")) {
        started.resolve();
        return pending.promise;
      }
      if (url.includes("/rest/v1/")) return json({ ok: true });
      throw new Error("Unexpected endpoint " + url);
    });
    vi.stubGlobal("fetch", fetchMock);
    const a = convayAuth.authenticatedRequest("/rest/v1/a");
    const b = convayAuth.authenticatedRequest("/rest/v1/b");
    await started.promise;
    pending.resolve(json(refreshedOld));
    await Promise.all([a, b]);
    expect(fetchMock.mock.calls.filter(([url]) =>
      String(url).includes("grant_type=refresh_token"))).toHaveLength(1);
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}").accessToken)
      .toBe("refreshed-previous");
  });
});

describe("password sign-in and profile restore session isolation", () => {
  const oldProfile = { ...nextProfile, user_id: OLD_ID, account_role: "super_admin" };
  function seedCurrentSession() {
    localStorage.setItem(KEY, JSON.stringify({ accessToken: "previous-access",
      refreshToken: "previous-refresh", userId: OLD_ID, expiresAt: Date.now() + 3_600_000 }));
  }
  it("rejects a profile for a different authenticated identity", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => url.includes("grant_type=password")
      ? json(signedInNext) : json([oldProfile])));
    await expect(convayAuth.signIn("next@example.org", "password", true)).rejects.toThrow(/authenticated identity/);
    expect(localStorage.getItem(KEY)).toBeNull();
  });
  it("does not resurrect a password sign-in after logout", async () => {
    const started = deferred<void>(); const pending = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.includes("grant_type=password")) { started.resolve(); return pending.promise; }
      return json([oldProfile]);
    }));
    const first = convayAuth.signIn("old@example.org", "password", true);
    const rejection = expect(first).rejects.toThrow(/superseded/);
    await started.promise; await convayAuth.signOut(); pending.resolve(json(refreshedOld));
    await rejection; expect(localStorage.getItem(KEY)).toBeNull();
  });
  it("preserves the newer account when the older profile completes late", async () => {
    const started = deferred<void>(); const pending = deferred<Response>();
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url.includes("grant_type=password")) return String(init?.body).includes("old@example.org")
        ? json(refreshedOld) : json(signedInNext);
      if (String((init?.headers as Record<string,string>)?.Authorization).includes("refreshed-previous")) {
        started.resolve(); return pending.promise;
      }
      return json([nextProfile]);
    }));
    const first = convayAuth.signIn("old@example.org", "password", true);
    const rejection = expect(first).rejects.toThrow(/superseded/);
    await started.promise;
    await convayAuth.signIn("next@example.org", "password", true);
    pending.resolve(json([oldProfile])); await rejection;
    expect(JSON.parse(localStorage.getItem(KEY) ?? "{}").userId).toBe(NEW_ID);
  });
  for (const status of [200, 401]) {
    it(`ignores an obsolete restore (${status}) without altering the next account`, async () => {
      seedCurrentSession(); const started = deferred<void>(); const pending = deferred<Response>();
      vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
        if (url.includes("grant_type=password")) return json(signedInNext);
        if ((init?.headers as Record<string,string>)?.Authorization === "Bearer previous-access") {
          started.resolve(); return pending.promise;
        }
        return json([nextProfile]);
      }));
      const restore = convayAuth.restore(); await started.promise;
      await convayAuth.signIn("next@example.org", "password", true);
      pending.resolve(json(status === 200 ? [oldProfile] : { message: "expired" }, status));
      expect(await restore).toBeNull();
      expect(JSON.parse(localStorage.getItem(KEY) ?? "{}").userId).toBe(NEW_ID);
    });
  }
});
