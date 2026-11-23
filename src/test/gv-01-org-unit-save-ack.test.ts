import { describe, expect, it, vi } from "vitest";
import { persistOrgUnitChange, verifyOrgUnitSqlReadback } from "../app/pages/governance/orgUnitPersistence";

describe("GV-01 server-confirmed governance unit changes", () => {
  it("does not emit activity before an asynchronous registry save resolves", async () => {
    let confirmWrite: (ok: boolean) => void = () => {};
    const write = vi.fn(() => new Promise<boolean>(resolve => { confirmWrite = resolve; }));
    const audit = vi.fn().mockResolvedValue(true);
    const transaction = persistOrgUnitChange(write, audit);
    expect(audit).not.toHaveBeenCalled();
    confirmWrite(true);
    expect(await transaction).toBe("saved");
    expect(audit).toHaveBeenCalledTimes(1);
  });

  it("leaves failed or permission-denied saves uncommitted without fabricated audit", async () => {
    const audit = vi.fn().mockResolvedValue(true);
    expect(await persistOrgUnitChange(() => false, audit)).toBe("not-saved");
    expect(audit).not.toHaveBeenCalled();
  });

  it("propagates a failed registry request while never recording a success audit", async () => {
    const audit = vi.fn().mockResolvedValue(true);
    await expect(persistOrgUnitChange(() => Promise.reject(new Error("Denied by RLS")), audit))
      .rejects.toThrow("Denied by RLS");
    expect(audit).not.toHaveBeenCalled();
  });

  it("distinguishes audit-journal denial from confirmed primary record persistence", async () => {
    expect(await persistOrgUnitChange(() => true, () => false)).toBe("audit-unverified");
    expect(await persistOrgUnitChange(() => true, () => Promise.reject(new Error("audit unavailable"))))
      .toBe("audit-unverified");
  });

  it("does not retry a failed audit by repeating the governance mutation", async () => {
    const write = vi.fn().mockResolvedValue(true);
    const audit = vi.fn().mockRejectedValue(new Error("timeout"));
    expect(await persistOrgUnitChange(write, audit)).toBe("audit-unverified");
    expect(write).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalledTimes(1);
  });
});

describe("GV-01 authenticated SQL readback after a server-acknowledged write", () => {
  const expected = {
    id: "OU-009", unit_name: "Finance", unit_type: "Division", status: "Active",
    code: "FIN", parent_unit_id: "OU-001", head_user_id: "user-a", deputy_user_id: "user-b",
  };

  it("refreshes the SQL registry and confirms all persisted identity, hierarchy and leadership fields", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const read = vi.fn().mockReturnValue({ ...expected });
    await expect(verifyOrgUnitSqlReadback(refresh, read, expected)).resolves.toBe(true);
    expect(refresh).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledWith(expected.id);
  });

  it("treats a missing record as unverified instead of creating it twice", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    const read = vi.fn().mockReturnValue(undefined);
    await expect(verifyOrgUnitSqlReadback(refresh, read, expected)).resolves.toBe(false);
    expect(refresh).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledOnce();
  });

  it("rejects stale or modified status, code, hierarchy and leadership readback", async () => {
    const refresh = vi.fn().mockResolvedValue(undefined);
    for (const field of ["status", "code", "parent_unit_id", "head_user_id", "deputy_user_id"] as const) {
      const read = vi.fn().mockReturnValue({ ...expected, [field]: "unexpected" });
      await expect(verifyOrgUnitSqlReadback(refresh, read, expected)).resolves.toBe(false);
    }
  });

  it("fails readback without discarding the confirmed write when an authenticated refresh is denied", async () => {
    const refresh = vi.fn().mockRejectedValue(new Error("RLS denied"));
    const read = vi.fn();
    await expect(verifyOrgUnitSqlReadback(refresh, read, expected)).resolves.toBe(false);
    expect(read).not.toHaveBeenCalled();
  });

  it("compares every saved contact, date, parent label, path and leadership field", async () => {
    const complete = {
      ...expected,
      description: "Tax governance", phone: "+880 123456789", email: "unit@example.test",
      address: "Dhaka", effective_start_at: "2026-11-23",
      parent_unit: "Head Office", path_label: "Organization › Head Office › Finance",
      path_ids: ["OU-001", "OU-009"],
    };
    await expect(verifyOrgUnitSqlReadback(async () => {}, () => complete, complete))
      .resolves.toBe(true);
    for (const field of [
      "description", "phone", "email", "address", "effective_start_at",
      "parent_unit", "path_label",
    ] as const) {
      const stale = { ...complete, [field]: "stale" };
      await expect(verifyOrgUnitSqlReadback(async () => {}, () => stale, complete))
        .resolves.toBe(false);
    }
    await expect(verifyOrgUnitSqlReadback(
      async () => {}, () => ({ ...complete, path_ids: ["OU-009"] }), complete,
    )).resolves.toBe(false);
  });

  it("handles absent optional unit fields without a false mismatch", async () => {
    const root = {
      id: "OU-ROOT", unit_name: "Meridian", unit_type: "Organization", status: "Active",
    };
    await expect(verifyOrgUnitSqlReadback(
      async () => undefined,
      () => ({ ...root, code: undefined, parent_unit_id: undefined }),
      root,
    )).resolves.toBe(true);
  });
});
