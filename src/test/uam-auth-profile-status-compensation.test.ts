import { describe, expect, it, vi } from "vitest";
import { applyAccountStatusWithReadback, priorBanDuration } from "../../supabase/functions/convay-users/accountStatus";
import { readFileSync } from "node:fs";

const now = Date.parse("2026-11-24T00:00:00.000Z");
type Profile = { user_id: string; account_status: "active" | "inactive" | "suspended" };
const old: Profile = { user_id: "verified-user", account_status: "active" };
const next: Profile = { ...old, account_status: "suspended" };

function harness(options: {
  previousBannedUntil?: string | null;
  writeFails?: boolean;
  observed?: Profile;
  readFails?: boolean;
  rollbackFails?: boolean;
} = {}) {
  const changes: string[] = [];
  const setAuthBan = vi.fn(async (duration: string) => {
    changes.push("auth:" + duration);
    if (duration === "none" && options.rollbackFails) throw Error("Auth outage");
  });
  const saveProfile = vi.fn(async (status: Profile["account_status"]) => {
    changes.push("sql:" + status);
    if (options.writeFails) throw Error("SQL unavailable");
  });
  const readProfile = vi.fn(async () => {
    changes.push("read");
    if (options.readFails) throw Error("SQL readback unavailable");
    return options.observed ?? next;
  });
  const args = {
    previousStatus: old.account_status,
    nextStatus: next.account_status,
    previousBannedUntil: options.previousBannedUntil ?? null,
    nowMs: now,
    setAuthBan, saveProfile, readProfile,
    getProfileStatus: (profile: Profile) => profile.account_status,
  };
  return { changes, setAuthBan, saveProfile, readProfile, args };
}

describe("user status — Auth and SQL authoritative reconciliation", () => {
  it("confirms a successful SQL-backed status only after fresh readback", async () => {
    const h = harness();
    const r = await applyAccountStatusWithReadback(h.args);
    expect(r).toEqual({ kind: "confirmed", profile: next });
    expect(h.changes).toEqual(["auth:876000h", "sql:suspended", "read"]);
  });

  it("recovers a lost write response from authoritative SQL and does not replay the mutation", async () => {
    const h = harness({ writeFails: true, observed: next });
    expect(await applyAccountStatusWithReadback(h.args)).toEqual({ kind: "confirmed", profile: next });
    expect(h.setAuthBan).toHaveBeenCalledTimes(1);
    expect(h.saveProfile).toHaveBeenCalledTimes(1);
  });

  it("restores Auth only when SQL confirms the old profile survived a rejected write", async () => {
    const h = harness({ writeFails: true, observed: old });
    expect(await applyAccountStatusWithReadback(h.args)).toEqual({ kind: "reverted" });
    expect(h.changes).toEqual(["auth:876000h", "sql:suspended", "read", "auth:none"]);
  });

  it("preserves an earlier independent Auth ban when the SQL mutation must be undone", async () => {
    const h = harness({
      writeFails: true, observed: old,
      previousBannedUntil: "2026-11-24T01:00:00.000Z",
    });
    expect(await applyAccountStatusWithReadback(h.args)).toEqual({ kind: "reverted" });
    expect(h.changes.at(-1)).toBe("auth:3600s");
  });

  it("does not perform unsafe compensation when SQL readback is unreachable", async () => {
    const h = harness({ writeFails: true, readFails: true });
    expect(await applyAccountStatusWithReadback(h.args)).toEqual({ kind: "uncertain" });
    expect(h.setAuthBan).toHaveBeenCalledTimes(1);
  });

  it("never overwrites another administrator's state after a concurrent SQL change", async () => {
    const h = harness({ writeFails: true, observed: { ...old, account_status: "inactive" } });
    expect(await applyAccountStatusWithReadback(h.args)).toEqual({ kind: "uncertain" });
    expect(h.setAuthBan).toHaveBeenCalledTimes(1);
  });

  it("surfaces an Auth restoration failure instead of silently claiming success", async () => {
    const h = harness({ writeFails: true, observed: old, rollbackFails: true });
    expect(await applyAccountStatusWithReadback(h.args)).toEqual({ kind: "restore_failed" });
  });

  it("rejects invalid historic ban timestamps before either service is mutated", async () => {
    const h = harness({ previousBannedUntil: "not-a-timestamp" });
    await expect(applyAccountStatusWithReadback(h.args)).rejects.toThrow(/Unverifiable/);
    expect(h.changes).toEqual([]);
  });

  it("never clears a still-active ban just because SQL says active", () => {
    expect(priorBanDuration("2026-11-24T02:00:00.000Z",now)).toBe("7200s");
    expect(priorBanDuration(null,now)).toBe("none");
    expect(priorBanDuration("2026-11-23T23:00:00.000Z",now)).toBe("none");
  });

  it("routes real Edge user-status writes through readback and compensation", () => {
    const edge=readFileSync("supabase/functions/convay-users/index.ts","utf8");
    expect(edge).toContain("applyAccountStatusWithReadback({");
    expect(edge).toContain('      if (result.kind === "confirmed") {');
    expect(edge).toContain('.eq("account_status", target.account_status)');
    expect(edge).toContain("previousAuthBanUntil = targetAuth.user.banned_until ?? null");
    expect(edge).toContain('result.kind === "restore_failed"');
  });
});
