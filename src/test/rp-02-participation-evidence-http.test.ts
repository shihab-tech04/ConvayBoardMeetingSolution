import { beforeEach, describe, expect, it, vi } from "vitest";
import { convayAuth } from "../app/services/supabase/convayAuth";
const seed = (userId = "user-a") => sessionStorage.setItem("convay.supabase.session.v1", JSON.stringify({ accessToken: `token-${userId}`, refreshToken: `refresh-${userId}`, userId, expiresAt: Date.now() + 3600000 }));
const record = (id: string) => ({ entity_key: "bms.meetings", record_id: id, tenant_id: null, payload: { id } });
const response = (rows: unknown[], range: string, status = 200) => new Response(JSON.stringify(rows), { status, headers: { "Content-Type": "application/json", "Content-Range": range } });
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
describe("RP-02 scoped report HTTP contract", () => {
  it("reads only three explicit SQL registries under the caller token and handles server page limits", async () => {
    seed();
    const fetchMock = vi.fn(async (url: string, opts: RequestInit) => {
      const params = new URL(url).searchParams;
      expect(params.get("entity_key")).toBe("in.(bms.meetings,bms.liveSessions,bms.attendance)");
      expect(params.get("select")).toBe("entity_key,record_id,tenant_id,payload");
      expect(params.get("order")).toBe("entity_key.asc,record_id.asc");
      expect(opts.headers).toMatchObject({ Authorization: "Bearer token-user-a", Prefer: "count=exact" });
      expect(opts.cache).toBe("no-store");
      return params.get("offset") === "0" ? response([record("1")], "0-0/2") : response([record("2")], "1-1/2");
    });
    vi.stubGlobal("fetch", fetchMock);
    expect((await convayAuth.participationEvidence()).map(r => r.record_id)).toEqual(["1", "2"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("never returns rows when the account changes while reading", async () => {
    seed();
    vi.stubGlobal("fetch", vi.fn(async () => { seed("user-b"); return response([record("1")], "0-0/1"); }));
    await expect(convayAuth.participationEvidence()).rejects.toThrow("session changed");
  });
  it("fails on denied source access and missing session", async () => {
    const fetchMock = vi.fn(async () => response([], "*/0", 403));
    vi.stubGlobal("fetch", fetchMock);
    await expect(convayAuth.participationEvidence()).rejects.toThrow("Session expired");
    expect(fetchMock).not.toHaveBeenCalled();
    seed();
    await expect(convayAuth.participationEvidence()).rejects.toThrow("Participation report could not be loaded");
  });
});
