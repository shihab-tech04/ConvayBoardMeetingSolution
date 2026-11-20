import { describe, expect, it, vi } from "vitest";
import { persistOrgUnitChange } from "../app/pages/governance/orgUnitPersistence";

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
