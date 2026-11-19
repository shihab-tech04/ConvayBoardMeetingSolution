import { describe, expect, it } from "vitest";
import {
  SIMULATION_CONFIRMATION, ConvayRuntime, createIndexedDbSimulationRuntime,
  createMemorySimStore, createMemorySimulationRuntime, SIMULATION_CAPABILITIES,
} from "../app/services/simulation/ConvayRuntime";
import { createConvayAcceptanceFixtures } from "../app/services/simulation/convayAcceptanceFixtures";

const root = async (store = createMemorySimStore()) => {
  const runtime = createMemorySimulationRuntime({ confirmation: SIMULATION_CONFIRMATION, store });
  await runtime.personaSignIn("sim-root");
  return runtime;
};
const secretary = async (store = createMemorySimStore()) => {
  const runtime = createMemorySimulationRuntime({ confirmation: SIMULATION_CONFIRMATION, store });
  await runtime.personaSignIn("sim-secretary-a", "tenant-a");
  return runtime;
};
const member = async (store = createMemorySimStore()) => {
  const runtime = createMemorySimulationRuntime({ confirmation: SIMULATION_CONFIRMATION, store });
  await runtime.personaSignIn("sim-member-a", "tenant-a");
  return runtime;
};
const opt = (n: string, revision?: number, reason?: string) => ({ idempotencyKey: n, expectedRevision: revision, reason });

// This is a synthetic, isolated simulation suite, NOT Supabase Auth/SQL/Storage or media E2E.
describe("Convay V7.1 controller isolated simulation contract", () => {
  it("requires explicit, opt-in simulator confirmation", () => {
    expect(() => createMemorySimulationRuntime({ confirmation: "" })).toThrow(/confirmation/);
    expect(() => createIndexedDbSimulationRuntime({ confirmation: "invalid" })).toThrow(/confirmation/);
  });
  it("never claims cross-browser sync or real authentication", () => {
    expect(SIMULATION_CAPABILITIES).toMatchObject({ persistentWithinBrowserProfile: true, crossBrowserSync: false, realAuthentication: false, realSqlRls: false, realStorage: false, realMedia: false });
  });
  it("has exactly one designated root and two isolated synthetic organizations", () => {
    const seed = createConvayAcceptanceFixtures();
    expect(seed.users.filter(x => x.platformRole === "root" && x.active)).toHaveLength(1);
    expect(seed.tenants.map(x => x.id)).toEqual(["tenant-a", "tenant-b"]);
  });
  it("refuses access without selecting a persona", async () => {
    const rt = createMemorySimulationRuntime({ confirmation: SIMULATION_CONFIRMATION });
    await expect(rt.list("tenants")).rejects.toThrow(/persona/);
  });
  it("does not provide ordinary tenant users with root access", async () => {
    const rt = await secretary();
    await expect(rt.list("users")).rejects.toThrow(/Super Admin/);
    await expect(rt.create("tenants", { name: "Forbidden" }, opt("ordinary-create"))).rejects.toThrow(/Super Admin/);
  });
  it("allows root tenant creation and isolated reopen readback", async () => {
    const store = createMemorySimStore(); const rt = await root(store);
    const created = await rt.create("tenants", { name: "Tenant C" }, opt("tenant-create"));
    const reopened = await root(store);
    expect((await reopened.get("tenants", created.id)).id).toBe(created.id);
  });
  it("denies cross-tenant listing even with valid roles in another tenant", async () => {
    const rt = await member();
    await expect(rt.list("meetings", "tenant-b")).rejects.toThrow(/Cross-tenant/);
  });
  it("rejects arbitrary resource names including protected audit records", async () => {
    const rt = await root();
    await expect(rt.remove("audit" as "roles", "any", opt("delete-audit", 1))).rejects.toThrow(/Unsupported resource/);
    await expect(rt.update("receipts" as "roles", "any", {}, opt("change-receipts", 1))).rejects.toThrow(/Unsupported resource/);
  });
  it("denies tenant B's guessed meeting and document records", async () => {
    const store = createMemorySimStore(); const admin = await root(store);
    const meeting = await admin.create("meetings", { tenantId: "tenant-b", title: "B meeting" }, opt("tenant-b-mtg"));
    const a = await member(store);
    await expect(a.get("meetings", meeting.id)).rejects.toThrow(/Cross-tenant/);
    await expect(a.create("documents", { tenantId: "tenant-b", meetingId: meeting.id, title: "Bad" }, opt("bad-doc"))).rejects.toThrow(/Cross-tenant/);
  });
  it("suspends/restores tenant without deleting its meeting history", async () => {
    const store = createMemorySimStore();const admin = await root(store);
    const denied = await member(store);
    const suspended = await admin.update("tenants", "tenant-a", { status: "suspended" }, opt("suspend", 1));
    expect((suspended as {status:string}).status).toBe("suspended");
    await expect(denied.list("meetings", "tenant-a")).rejects.toThrow(/suspended/);
    await admin.update("tenants", "tenant-a", { status: "active" }, opt("restore", 2));
    expect((await denied.list("meetings", "tenant-a")).length).toBe(2);
  });
  it("rejects stale revision updates and allows safe refreshed retry", async () => {
    const rt = await root();
    await rt.update("tenants", "tenant-a", { name: "Renamed A" }, opt("tenant-up1", 1));
    await expect(rt.update("tenants", "tenant-a", { name: "Stale" }, opt("tenant-up2", 1))).rejects.toThrow(/Stale revision/);
    expect((await rt.update("tenants", "tenant-a", { name: "New A" }, opt("tenant-up3", 2)) as {name:string}).name).toBe("New A");
  });
  it("prevents duplicate idempotent creation on retry", async () => {
    const rt = await root();
    const first = await rt.create("tenants", { name: "Idempotent" }, opt("same-key"));
    const replay = await rt.create("tenants", { name: "Ignored duplicate" }, opt("same-key"));
    expect(replay.id).toBe(first.id);
    expect((await rt.list("tenants")).filter(x => x.id === first.id)).toHaveLength(1);
  });
  it("denies reuse of an idempotency key for an unrelated action", async () => {
    const rt = await root();
    await rt.create("tenants", { name: "A new tenant" }, opt("reused-key"));
    await expect(rt.create("users", { name: "Someone" }, opt("reused-key"))).rejects.toThrow(/another operation/);
  });
  it("denies stale cross-session writes to the same stored revision", async () => {
    const base = createMemorySimStore(); const older = await root(base); const newer = await root(base);
    await older.update("tenants", "tenant-b", { name: "Updated" }, opt("new-update", 1));
    await expect(newer.update("tenants", "tenant-b", { name: "Lost update" }, opt("old-update", 1))).rejects.toThrow(/Stale revision/);
  });
  it("permits only root to provision an ordinary user and scoped membership", async () => {
    const rt = await root();
    const user = await rt.create("users", { name: "New synthetic person" }, opt("create-user"));
    expect((user as {platformRole:string}).platformRole).toBe("user");
    await rt.update("users", user.id, { active: true }, opt("activate-user", 1));
    const m = await rt.create("memberships", { tenantId: "tenant-b", userId: user.id, roleIds: ["role-member-b"] }, opt("member-create"));
    expect((m as {tenantId:string}).tenantId).toBe("tenant-b");
    await expect(rt.create("memberships", { tenantId: "tenant-b", userId: user.id, roleIds: ["role-member-b"] }, opt("member-duplicate"))).rejects.toThrow(/Duplicate/);
  });
  it("denies root-role assignment through ordinary membership", async () => {
    const rt = await root();
    await expect(rt.create("memberships", { tenantId: "tenant-a", userId: "sim-root", roleIds: [] }, opt("root-member"))).rejects.toThrow(/ordinary users/);
  });
  it("denies cross-tenant and inactive role assignments", async () => {
    const rt = await root();
    await expect(rt.update("memberships", "member-secretary-a", { roleIds: ["role-member-b"] }, opt("wrong-role", 1))).rejects.toThrow(/outside the tenant/);
  });
  it("supports root-created custom roles without root privilege escalation", async () => {
    const rt = await root();
    const role = await rt.create("roles", { tenantId: "tenant-b", name: "Custom auditor" }, opt("role-create"));
    const updated = await rt.update("roles", role.id, { permissions: ["report:read"] }, opt("role-edit", 1));
    expect((updated as {permissions:string[]}).permissions).toEqual(["report:read"]);
    await expect(rt.update("roles", role.id, { permissions: ["platform:root"] }, opt("role-escalate", 2))).rejects.toThrow(/Invalid permission/);
  });
  it("allows a creator to read their own meeting draft without opening all tenant drafts", async () => {
    const store = createMemorySimStore();
    const s = await secretary(store);
    const created = await s.create("meetings", { tenantId: "tenant-a", title: "Secretariat prep", participants: ["sim-secretary-a"] }, opt("new-mtg"));
    expect((await s.get("meetings", created.id)).id).toBe(created.id);
    const m = await member(store);
    await expect(m.get("meetings", created.id)).rejects.toThrow(/not found|outside|scope/i);
  });
  it("blocks illegal meeting transitions and enforces cancellation reasons", async () => {
    const s = await secretary();
    await expect(s.transitionMeeting("meeting-a-draft", "ended", opt("bad-transition", 1))).rejects.toThrow(/Illegal/);
    await expect(s.transitionMeeting("meeting-a-draft", "cancelled", opt("bad-cancel", 1))).rejects.toThrow(/reason/);
    const cancelled = await s.transitionMeeting("meeting-a-draft", "cancelled", opt("good-cancel", 1, "Meeting postponed by owner"));
    expect(cancelled.status).toBe("cancelled");
  });
  it("requires quorum before starting a scheduled meeting", async () => {
    const s = await secretary();
    const scheduled = await s.transitionMeeting("meeting-a-draft", "scheduled", opt("schedule", 1));
    await expect(s.transitionMeeting("meeting-a-draft", "live", opt("bad-live", scheduled.revision))).rejects.toThrow(/Quorum/);
    const withPresence = await s.setPresence("meeting-a-draft", "sim-secretary-a", true, opt("present-host", scheduled.revision));
    const both = await s.setPresence("meeting-a-draft", "sim-member-a", true, opt("present-member", withPresence.revision));
    const active = await s.transitionMeeting("meeting-a-draft", "live", opt("good-live", both.revision));
    expect(active.status).toBe("live");
  });
  it("permits an eligible present member to vote once but denies unapproved root voting", async () => {
    const store = createMemorySimStore();const s = await secretary(store);
    const present = await s.setPresence("meeting-a-live", "sim-member-a", true, opt("attendance", 1));
    const v = await member(store);
    const voted = await v.castVote("meeting-a-live", "yes", opt("cast-vote", present.revision));
    expect(voted.votes["sim-member-a"]).toBe("yes");
    await expect(v.castVote("meeting-a-live", "no", opt("change-vote", voted.revision))).rejects.toThrow(/already recorded/);
    const r = await root(store);
    await expect(r.castVote("meeting-a-live", "no", opt("root-ballot", voted.revision))).rejects.toThrow(/eligible/);
  });
  it("preserves separate document versions and prevents private cross-tenant access", async () => {
    const store = createMemorySimStore(); const s = await secretary(store);
    const doc = await s.create("documents", { tenantId: "tenant-a", meetingId: "meeting-a-draft", title: "Versioned agenda" }, opt("create-doc"));
    const updated = await s.update("documents", doc.id, { body: "version 2" }, opt("version-doc", 1));
    expect((updated as {version:number}).version).toBe(2);
    const b = createMemorySimulationRuntime({ confirmation: SIMULATION_CONFIRMATION, store });
    await b.personaSignIn("sim-member-b", "tenant-b");
    await expect(b.get("documents", doc.id)).rejects.toThrow(/Cross-tenant/);
  });
  it("retains linked history and denies premature tenant offboarding", async () => {
    const rt = await root();
    await expect(rt.remove("documents", "document-a-1", opt("delete-doc", 1))).rejects.toThrow(/retention/);
    await expect(rt.offboardTenant("tenant-a")).rejects.toThrow(/retention/);
  });
  it("requires root plus an audit reason for tenant-scoped exports", async () => {
    const store = createMemorySimStore();const s = await secretary(store);
    await expect(s.exportTenantSnapshot("tenant-a", "Investigate access")).rejects.toThrow(/Super Admin/);
    const r = await root(store);
    await expect(r.exportTenantSnapshot("tenant-a", "short")).rejects.toThrow(/reason/);
    const exported = await r.exportTenantSnapshot("tenant-a", "Authorized governance export");
    expect(exported.meetings.every(x => x.tenantId === "tenant-a")).toBe(true);
    expect(exported.roles.every(x => x.tenantId === "tenant-a")).toBe(true);
    expect((await r.readAudit("tenant-a")).some(x => x.action.includes("tenant:export"))).toBe(true);
  });
  it("reports from the assigned tenant and denies an ungranted report permission", async () => {
    const s = await secretary();expect((await s.generateReport("tenant-a")).meetings).toBe(2);
    const m = await member(); await expect(m.generateReport("tenant-a")).rejects.toThrow(/Permission/);
  });
  it("never silently persists a failed storage write", async () => {
    const store = createMemorySimStore();
    const failed = createMemorySimulationRuntime({ confirmation: SIMULATION_CONFIRMATION,
      store: { load: store.load, save: async () => { throw Error("disk full"); } } });
    await failed.personaSignIn("sim-root");
    await expect(failed.create("tenants", { name: "Should not persist" }, opt("failed-write"))).rejects.toThrow(/disk full/);
    const verified = await root(store);
    expect((await verified.list("tenants")).some(t => t.name === "Should not persist")).toBe(false);
  });
  it("recovers persisted state across a fresh runtime instance using a shared store", async () => {
    const store = createMemorySimStore();const first = await root(store);
    const value = await first.create("tenants", { name: "Recovery tenant" }, opt("recover"));
    const second = await root(store);
    expect((await second.get("tenants", value.id)).id).toBe(value.id);
  });
  it("rejects actions after sign-out even when previous grants existed", async () => {
    const s = await secretary();s.signOut();
    await expect(s.list("meetings", "tenant-a")).rejects.toThrow(/persona/);
  });
});
