import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  registry: vi.fn(),
  error: vi.fn(),
}));

vi.mock("react", () => ({
  useState: () => [0, () => undefined],
  useEffect: () => undefined,
  useCallback: (callback: unknown) => callback,
}));
vi.mock("sonner", () => ({ toast: { error: mock.error } }));
vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { registry: mock.registry },
}));

type RecordShape = { id: string };
type RegistryModule = typeof import("../app/hooks/useEntityRegistry");
let api: RegistryModule;
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
const current = () => api.createEntityRegistry<RecordShape>("bms.meetings", "bms:changed", [])();

beforeEach(async () => {
  vi.stubEnv("MODE", "production");
  vi.resetModules();
  mock.registry.mockReset();
  mock.error.mockReset();
  api = await import("../app/hooks/useEntityRegistry");
});
afterEach(() => { vi.unstubAllEnvs(); });

describe("persistent registry account-session isolation", () => {
  it("rejects a queued mutation from the account that just signed out", async () => {
    const write = current().add({ id: "old" });
    api.clearEntityRegistryCache();
    await expect(write).resolves.toBe(false);
    expect(mock.registry).not.toHaveBeenCalled();
    expect(mock.error).not.toHaveBeenCalled();
  });

  it("does not overwrite new account rows with an earlier pending read", async () => {
    const previous = deferred<{ records: Array<{ payload: RecordShape; revision: number }> }>();
    const next = deferred<{ records: Array<{ payload: RecordShape; revision: number }> }>();
    mock.registry.mockReturnValueOnce(previous.promise).mockReturnValueOnce(next.promise);
    const oldRead = current().refresh();
    await flush();
    api.clearEntityRegistryCache();
    const newRead = current().refresh();
    await flush();
    next.resolve({ records: [{ payload: { id: "new" }, revision: 2 }] });
    await newRead;
    previous.resolve({ records: [{ payload: { id: "old" }, revision: 1 }] });
    await oldRead;
    expect(current().items.map(item => item.id)).toEqual(["new"]);
  });

  it("does not report a late network mutation as a success after sign-out", async () => {
    const inFlight = deferred<{ revision: number }>();
    mock.registry.mockImplementation((_key: string, action: string) =>
      action === "list" ? Promise.resolve({ records: [] }) : inFlight.promise);
    await current().refresh();
    const mutation = current().add({ id: "previous" });
    await flush();
    expect(mock.registry).toHaveBeenCalledWith("bms.meetings", "create", { id: "previous" }, undefined);
    api.clearEntityRegistryCache();
    inFlight.resolve({ revision: 1 });
    await expect(mutation).resolves.toBe(false);
    expect(current().items).toEqual([]);
    expect(mock.error).not.toHaveBeenCalled();
  });

  it("allows the next session to save independently with revision tracking", async () => {
    const stored: RecordShape[] = [];
    mock.registry.mockImplementation((_key: string, action: string, record: RecordShape) => {
      if (action === "list") return Promise.resolve({ records: stored.map(payload => ({ payload, revision: 1 })) });
      if (action === "create") { stored.push(record); return Promise.resolve({ revision: 1 }); }
      throw new Error("Unexpected registry operation");
    });
    const old = current().add({ id: "old" });
    api.clearEntityRegistryCache();
    await expect(old).resolves.toBe(false);
    await expect(current().add({ id: "new" })).resolves.toBe(true);
    expect(stored.map(item => item.id)).toEqual(["new"]);
    expect(current().items.map(item => item.id)).toEqual(["new"]);
  });
});
