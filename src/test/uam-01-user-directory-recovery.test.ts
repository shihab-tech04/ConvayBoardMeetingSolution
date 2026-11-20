import { describe, expect, it } from "vitest";
import { createLatestUserDirectoryRead, type UserDirectoryUpdate } from
  "../app/pages/administration-requests/userDirectoryRead";

type User = {
  user_id: string;
  display_name: string;
  email: string;
  account_role: "user" | "super_admin";
  account_status: "active" | "inactive" | "suspended";
};
const user: User = {
  user_id: "33333333-3333-4333-8333-333333333333",
  display_name: "Test Member", email: "test@example.com",
  account_role: "user", account_status: "active",
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

describe("UAM-01 fail-closed user-directory read and account recovery", () => {
  it("loads an authenticated server-returned directory with honest loading and readback", async () => {
    const gate = createLatestUserDirectoryRead<User>();
    const updates: UserDirectoryUpdate<User>[] = [];
    await expect(gate.load(async () => ({ users: [user] }), u => updates.push(u)))
      .resolves.toBe(true);
    expect(updates).toEqual([
      { phase: "loading", users: [], error: "" },
      { phase: "ready", users: [user], error: "" },
    ]);
  });
  it("accepts a legitimate empty directory without making up users", async () => {
    const updates: UserDirectoryUpdate<User>[] = [];
    await createLatestUserDirectoryRead<User>()
      .load(async () => ({ users: [] }), u => updates.push(u));
    expect(updates.at(-1)).toEqual({ phase: "ready", users: [], error: "" });
  });
  it("rejects a successful HTTP response missing users instead of showing an empty success", async () => {
    const updates: UserDirectoryUpdate<User>[] = [];
    await expect(createLatestUserDirectoryRead<User>()
      .load(async () => ({}), u => updates.push(u))).resolves.toBe(false);
    expect(updates.at(-1)).toMatchObject({
      phase: "error", users: [], error: expect.stringMatching(/Invalid user directory/),
    });
  });
  it("rejects malformed user rows rather than publishing some other account's details", async () => {
    const updates: UserDirectoryUpdate<User>[] = [];
    await createLatestUserDirectoryRead<User>().load(
      async () => ({ users: [{ ...user, user_id: "" }] }), u => updates.push(u),
    );
    expect(updates.at(-1)).toMatchObject({ phase: "error", users: [] });
  });
  it("clears a previous directory immediately on retry and after a failed request", async () => {
    const gate = createLatestUserDirectoryRead<User>();
    const updates: UserDirectoryUpdate<User>[] = [];
    await gate.load(async () => ({ users: [user] }), u => updates.push(u));
    await gate.load(async () => { throw new Error("Session expired"); }, u => updates.push(u));
    expect(updates.slice(-2)).toEqual([
      { phase: "loading", users: [], error: "" },
      { phase: "error", users: [], error: "Session expired" },
    ]);
  });
  it("ignores an old delayed success when a newer account's request finishes first", async () => {
    const gate = createLatestUserDirectoryRead<User>();
    const slow = deferred<{ users: User[] }>();
    const updates: UserDirectoryUpdate<User>[] = [];
    const first = gate.load(() => slow.promise, u => updates.push(u));
    const newUser: User = { ...user, user_id: "44444444-4444-4444-8444-444444444444" };
    await gate.load(async () => ({ users: [newUser] }), u => updates.push(u));
    slow.resolve({ users: [user] });
    await expect(first).resolves.toBe(false);
    expect(updates.at(-1)).toEqual({ phase: "ready", users: [newUser], error: "" });
  });
  it("ignores an old rejected request after a newer account's success", async () => {
    const gate = createLatestUserDirectoryRead<User>();
    const slow = deferred<{ users: User[] }>();
    const updates: UserDirectoryUpdate<User>[] = [];
    const first = gate.load(() => slow.promise, u => updates.push(u));
    await gate.load(async () => ({ users: [user] }), u => updates.push(u));
    slow.reject(new Error("Previous account expired"));
    await expect(first).resolves.toBe(false);
    expect(updates.at(-1)).toEqual({ phase: "ready", users: [user], error: "" });
  });
  it("invalidates an in-flight read after sign-out/unmount without republishing it", async () => {
    const gate = createLatestUserDirectoryRead<User>();
    const slow = deferred<{ users: User[] }>();
    const updates: UserDirectoryUpdate<User>[] = [];
    const active = gate.load(() => slow.promise, u => updates.push(u));
    gate.invalidate();
    slow.resolve({ users: [user] });
    await expect(active).resolves.toBe(false);
    expect(updates).toEqual([{ phase: "loading", users: [], error: "" }]);
  });
});
