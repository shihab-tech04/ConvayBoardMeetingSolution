import { createConvayAcceptanceFixtures } from "./convayAcceptanceFixtures";
import type {
  MeetingStatus, SimAuditEvent, SimDocument, SimEntity, SimMeeting, SimMembership,
  SimPermission, SimPersonaSession, SimReceipt, SimRole, SimState, SimStore, SimTenant,
  SimUser, SimWriteOptions,
} from "./convayRuntime.types";

/** Deliberate opt-in. NEVER substitute this for Convay production Auth/SQL/RLS. */
export const SIMULATION_CONFIRMATION = "CONVAY_V7_1_ISOLATED_SIMULATION";
export const SIMULATION_CAPABILITIES = Object.freeze({
  persistentWithinBrowserProfile: true, crossBrowserSync: false,
  realAuthentication: false, realSqlRls: false, realStorage: false, realMedia: false,
});

const copy = <T>(value: T): T => structuredClone(value);
function fail(message: string): never { throw new Error(message); }
const now = () => new Date().toISOString();
const id = () => crypto.randomUUID();
const allowedStatus: Record<MeetingStatus, MeetingStatus[]> = {
  draft: ["scheduled", "cancelled"], scheduled: ["live", "cancelled"],
  live: ["ended", "cancelled"], ended: [], cancelled: [],
};
const businessTypes: SimEntity[] = ["tenants", "users", "memberships", "roles", "meetings", "documents"];

type SimRecord = SimUser | SimTenant | SimMembership | SimRole | SimMeeting | SimDocument;
type SimMutationData = Record<string, unknown>;

function assertRootInvariant(state: SimState): void {
  const roots = state.users.filter(u => u.platformRole === "root" && u.active);
  if (roots.length !== 1 || roots[0].id !== "sim-root") fail("The simulation must retain exactly one designated active platform root");
}
function hasRevision(value: SimRecord, revision: number | undefined): void {
  if (revision === undefined || value.revision !== revision) fail("Stale revision. Refresh and retry with the current version.");
}
function stringValue(value: unknown, label: string, max = 120): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) fail(`${label} is required and must be at most ${max} characters`);
  return value.trim();
}
function nonEmptyReason(value: string | undefined): string {
  if (!value || value.trim().length < 8 || value.trim().length > 300) fail("A documented reason of 8–300 characters is required");
  return value.trim();
}
function recordById<K extends SimEntity>(s: SimState, kind: K, value: string): SimState[K][number] {
  const result = (s[kind] as Array<{ id: string }>).find(x => x.id === value);
  if (!result) fail("Record not found");
  return result as SimState[K][number];
}
function ensureTenant(s: SimState, tenantId: string, active = true): SimTenant {
  const tenant = s.tenants.find(t => t.id === tenantId) ?? fail("Tenant not found");
  if (active && tenant.status !== "active") fail("Tenant is suspended");
  return tenant;
}
function readRoot(s: SimState, userId: string): boolean {
  const user = s.users.find(u => u.id === userId);
  if (!user?.active) fail("Account is inactive or missing");
  return user.platformRole === "root" && user.id === "sim-root";
}
function scopedMembership(s: SimState, userId: string, tenantId: string): SimMembership {
  ensureTenant(s, tenantId);
  return s.memberships.find(m => m.userId === userId && m.tenantId === tenantId && m.active)
    ?? fail("No active membership for the requested tenant");
}
function hasPermission(s: SimState, userId: string, tenantId: string, permission: SimPermission): boolean {
  if (readRoot(s, userId)) return true;
  const membership = scopedMembership(s, userId, tenantId);
  return membership.roleIds.some(rid => s.roles.some(role =>
    role.id === rid && role.tenantId === tenantId && role.active && role.permissions.includes(permission)));
}
function ensureRoleIds(s: SimState, tenantId: string, roleIds: string[]): void {
  if (!Array.isArray(roleIds) || roleIds.length > 30 || new Set(roleIds).size !== roleIds.length) fail("Invalid or duplicate role assignment");
  for (const rid of roleIds) {
    if (!s.roles.some(r => r.id === rid && r.tenantId === tenantId && r.active)) fail("Role is inactive or outside the tenant");
  }
}
function tenantFor(s: SimState, kind: SimEntity, record: SimRecord): string | null {
  if (kind === "tenants") return (record as SimTenant).id;
  if (kind === "users") return null;
  return (record as SimMembership | SimRole | SimMeeting | SimDocument).tenantId;
}

/** Store with atomic compare-and-swap, suitable for isolated tests and reopening. */
export function createMemorySimStore(initial: SimState | null = null): SimStore {
  let value = initial ? copy(initial) : null;
  return {
    async load() { return value ? copy(value) : null; },
    async save(expected, state) {
      if ((value?.revision ?? 0) !== expected) fail("Storage changed in another session. Reload before saving.");
      value = copy(state);
    },
  };
}

/** Real IndexedDB persistence in this browser profile only; no cross-device claims. */
export function createIndexedDbSimStore(): SimStore {
  if (typeof indexedDB === "undefined") fail("IndexedDB is unavailable; persistent simulation cannot start");
  const open = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
    const req = indexedDB.open("convay.v7_1.simulation", 1);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains("snapshots")) req.result.createObjectStore("snapshots"); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? Error("Unable to open simulation storage"));
  });
  return {
    async load() {
      const db = await open();
      try {
        return await new Promise<SimState | null>((resolve, reject) => {
          const tx = db.transaction("snapshots", "readonly");
          const req = tx.objectStore("snapshots").get("state");
          req.onsuccess = () => resolve(req.result ? copy(req.result as SimState) : null);
          req.onerror = () => reject(req.error);
          tx.onerror = () => reject(tx.error);
        });
      } finally { db.close(); }
    },
    async save(expected, state) {
      const db = await open();
      try {
        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction("snapshots", "readwrite");
          const store = tx.objectStore("snapshots");
          const req = store.get("state");
          req.onsuccess = () => {
            const persisted = req.result as SimState | undefined;
            if ((persisted?.revision ?? 0) !== expected) { tx.abort(); return; }
            store.put(copy(state), "state");
          };
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(new Error("Storage revision conflict or write failure; refresh and retry"));
          tx.onerror = () => reject(tx.error ?? new Error("Simulation storage write failed"));
          req.onerror = () => reject(req.error);
        });
      } finally { db.close(); }
    },
  };
}

/**
 * Tenant-scope guard is evaluated for EVERY operation and after EVERY persisted reload.
 * Personas are synthetic fixture selectors, not Supabase Auth or permission tokens.
 */
export class ConvayRuntime {
  private session: SimPersonaSession | null = null;
  constructor(private readonly store: SimStore, private readonly fixture: () => SimState = createConvayAcceptanceFixtures) {}
  private async snapshot(): Promise<SimState> {
    const value = await this.store.load();
    const state = value ?? this.fixture();
    assertRootInvariant(state);
    return state;
  }
  private actor(state: SimState): { id: string; root: boolean; tenantId: string | null } {
    const session = this.session ?? fail("Select a simulation persona before using the runtime");
    const root = readRoot(state, session.personaId);
    if (!root) {
      if (!session.tenantId) fail("Tenant context is required");
      scopedMembership(state, session.personaId, session.tenantId);
    }
    return { id: session.personaId, root, tenantId: session.tenantId };
  }
  private scoped(state: SimState, tenantId: string): void {
    const actor = this.actor(state);
    if (!actor.root && actor.tenantId !== tenantId) fail("Cross-tenant access denied");
    ensureTenant(state, tenantId);
  }
  private permission(state: SimState, tenantId: string, code: SimPermission): void {
    this.scoped(state, tenantId);
    const actor = this.actor(state);
    if (!hasPermission(state, actor.id, tenantId, code)) fail("Permission denied");
  }
  private root(state: SimState): string {
    const actor = this.actor(state);
    if (!actor.root) fail("Only the designated platform Super Admin may perform this action");
    return actor.id;
  }
  private meetingScope(state: SimState, meeting: SimMeeting, action: SimPermission): void {
    this.permission(state, meeting.tenantId, action);
    const actor = this.actor(state);
    if (!actor.root && meeting.createdBy !== actor.id && !meeting.participants.includes(actor.id)) fail("Meeting resource is outside the assigned participant scope");
  }
  private documentScope(state: SimState, doc: SimDocument, action: SimPermission): void {
    this.permission(state, doc.tenantId, action);
    const meeting = recordById(state, "meetings", doc.meetingId) as SimMeeting;
    this.meetingScope(state, meeting, "meeting:read");
  }
  async personaSignIn(personaId: string, tenantId: string | null = null): Promise<SimPersonaSession> {
    const state = await this.snapshot();
    const root = readRoot(state, personaId);
    if (!root) scopedMembership(state, personaId, tenantId ?? fail("Choose an assigned tenant"));
    else if (tenantId) ensureTenant(state, tenantId, false);
    this.session = { personaId, tenantId, platformRoot: root };
    return copy(this.session);
  }
  signOut(): void { this.session = null; }
  async list<K extends SimEntity>(kind: K, tenantId: string | null = null): Promise<SimState[K]> {
    if (!businessTypes.includes(kind)) fail("Unknown resource type");
    const state = await this.snapshot();
    const actor = this.actor(state);
    if (["tenants", "users", "roles", "memberships"].includes(kind)) this.root(state);
    else if (!tenantId) fail("A tenant filter is required");
    if (tenantId) this.scoped(state, tenantId);
    const records = (state[kind] as SimRecord[]).filter(record => {
      if (!tenantId) return true;
      const scope = tenantFor(state, kind, record);
      return scope === tenantId;
    });
    const granted = records.filter(record => {
      if (actor.root) return true;
      if (kind === "meetings") {
        const meeting = record as SimMeeting;
        return (meeting.createdBy === actor.id || meeting.participants.includes(actor.id)) && hasPermission(state, actor.id, meeting.tenantId, "meeting:read");
      }
      if (kind === "documents") {
        const doc = record as SimDocument;
        const meeting = state.meetings.find(m => m.id === doc.meetingId);
        return !!meeting && (meeting.createdBy === actor.id || meeting.participants.includes(actor.id)) && hasPermission(state, actor.id, doc.tenantId, "document:read");
      }
      return hasPermission(state, actor.id, tenantId!, "report:read");
    });
    return copy(granted) as SimState[K];
  }
  async get<K extends SimEntity>(kind: K, recordId: string): Promise<SimState[K][number]> {
    if (!businessTypes.includes(kind)) fail("Unsupported resource");
    const state = await this.snapshot();
    if (["users", "tenants", "roles", "memberships"].includes(kind)) this.root(state);
    const record = recordById(state, kind, recordId);
    const tenantId = tenantFor(state, kind, record);
    if (tenantId) {
      if (kind === "meetings") this.meetingScope(state, record as SimMeeting, "meeting:read");
      if (kind === "documents") this.documentScope(state, record as SimDocument, "document:read");
    }
    return copy(record);
  }
  private async change<T>(operation: string, options: SimWriteOptions, handler: (state: SimState, actorId: string) => { result: T; entity: SimRecord; before: unknown; tenantId: string | null }): Promise<T> {
    if (!options.idempotencyKey || options.idempotencyKey.length < 4 || options.idempotencyKey.length > 150) fail("A valid idempotency key is required");
    const initial = await this.snapshot();
    const actor = this.actor(initial);
    const replay = initial.receipts.find(r => r.actorId === actor.id && r.key === options.idempotencyKey);
    if (replay) {
      if (replay.operation !== operation) fail("Idempotency key belongs to another operation");
      return copy(replay.result as T);
    }
    const state = copy(initial);
    const action = handler(state, actor.id);
    assertRootInvariant(state);
    const event: SimAuditEvent = { id: id(), at: now(), actorId: actor.id,
      tenantId: action.tenantId, action: operation, targetId: action.entity.id,
      reason: options.reason ?? null, before: action.before, after: copy(action.entity),
    };
    state.audit.push(event);
    state.receipts.push({ key: options.idempotencyKey, actorId: actor.id, operation, result: copy(action.result) } as SimReceipt);
    state.revision += 1;
    await this.store.save(initial.revision, state);
    return copy(action.result);
  }
  async create(kind: SimEntity, data: SimMutationData, options: SimWriteOptions): Promise<SimRecord> {
    return this.change(`create:${kind}`, options, (state, actorId) => {
      if (!businessTypes.includes(kind)) fail("Unsupported resource");
      const tenantId = String(data.tenantId ?? "");
      const common = { id: id(), revision: 1 };
      let entity: SimRecord;
      if (kind === "tenants") {
        this.root(state);
        entity = { ...common, name: stringValue(data.name, "Tenant name"), status: "active" } as SimTenant;
        state.tenants.push(entity as SimTenant);
      } else if (kind === "users") {
        this.root(state);
        entity = { ...common, name: stringValue(data.name, "User name"), platformRole: "user", active: false } as SimUser;
        state.users.push(entity as SimUser);
      } else if (kind === "roles") {
        this.root(state); ensureTenant(state, tenantId);
        entity = { ...common, tenantId, name: stringValue(data.name, "Role name"), active: true, permissions: [] } as SimRole;
        state.roles.push(entity as SimRole);
      } else if (kind === "memberships") {
        this.root(state); ensureTenant(state, tenantId);
        const userId = stringValue(data.userId, "Member identity");
        const user = state.users.find(u => u.id === userId);
        if (!user || user.platformRole === "root" || !user.active) fail("Assign only active ordinary users");
        if (state.memberships.some(m => m.tenantId === tenantId && m.userId === userId)) fail("Duplicate membership");
        const roleIds = Array.isArray(data.roleIds) ? data.roleIds as string[] : [];
        ensureRoleIds(state, tenantId, roleIds);
        entity = { ...common, tenantId, userId, roleIds: [...roleIds], active: true } as SimMembership;
        state.memberships.push(entity as SimMembership);
      } else if (kind === "meetings") {
        this.permission(state, tenantId, "meeting:create");
        const title = stringValue(data.title, "Meeting title");
        const participants = Array.isArray(data.participants) ? data.participants as string[] : [actorId];
        if (new Set(participants).size !== participants.length || !participants.includes(actorId) && !readRoot(state, actorId)) fail("Meeting owner must be a participant");
        for (const uid of participants) if (!readRoot(state, uid)) scopedMembership(state, uid, tenantId);
        entity = { ...common, tenantId, title, createdBy: actorId, status: "draft", participants: [...participants], present: [], votes: {}, quorum: 1, hasMinutes: false } as SimMeeting;
        state.meetings.push(entity as SimMeeting);
      } else {
        this.permission(state, tenantId, "document:write");
        const meetingId = stringValue(data.meetingId, "Meeting reference");
        const meeting = recordById(state, "meetings", meetingId) as SimMeeting;
        if (meeting.tenantId !== tenantId) fail("Cross-tenant document link denied");
        this.meetingScope(state, meeting, "meeting:read");
        entity = { ...common, tenantId, meetingId, title: stringValue(data.title, "Document title"), body: String(data.body ?? ""), version: 1 } as SimDocument;
        state.documents.push(entity as SimDocument);
      }
      return { result: entity, entity, before: null, tenantId: tenantFor(state, kind, entity) };
    });
  }
  async update(kind: SimEntity, recordId: string, patch: SimMutationData, options: SimWriteOptions): Promise<SimRecord> {
    if (!businessTypes.includes(kind)) fail("Unsupported resource");
    return this.change(`update:${kind}:${recordId}`, options, state => {
      if (["tenants", "users", "roles", "memberships"].includes(kind)) this.root(state);
      const entity = recordById(state, kind, recordId) as SimRecord;
      hasRevision(entity, options.expectedRevision);
      const before = copy(entity);
      const scope = tenantFor(state, kind, entity);
      if (kind === "tenants") {
        this.root(state);
        const tenant = entity as SimTenant;
        if (patch.name !== undefined) tenant.name = stringValue(patch.name, "Tenant name");
        if (patch.status !== undefined) {
          if (patch.status !== "active" && patch.status !== "suspended") fail("Invalid tenant transition");
          tenant.status = patch.status;
        }
      } else if (kind === "users") {
        this.root(state);
        const user = entity as SimUser;
        if (user.platformRole === "root") fail("The designated root account is immutable");
        if (patch.name !== undefined) user.name = stringValue(patch.name, "User name");
        if (patch.active !== undefined) {
          if (typeof patch.active !== "boolean") fail("Invalid account status");
          user.active = patch.active;
        }
      } else if (kind === "roles") {
        this.root(state);
        const role = entity as SimRole;
        if (patch.name !== undefined) role.name = stringValue(patch.name, "Role name");
        if (patch.active !== undefined) {
          if (typeof patch.active !== "boolean") fail("Invalid role status");
          role.active = patch.active;
        }
        if (patch.permissions !== undefined) {
          if (!Array.isArray(patch.permissions) || patch.permissions.some(x => !["meeting:create", "meeting:read", "meeting:write", "meeting:transition", "meeting:attend", "meeting:vote", "document:read", "document:write", "report:read"].includes(x))) fail("Invalid permission mapping");
          role.permissions = [...new Set(patch.permissions as SimPermission[])];
        }
      } else if (kind === "memberships") {
        this.root(state);
        const membership = entity as SimMembership;
        if (patch.roleIds !== undefined) {
          if (!Array.isArray(patch.roleIds) || patch.roleIds.some(x => typeof x !== "string")) fail("Invalid role IDs");
          ensureRoleIds(state, membership.tenantId, patch.roleIds as string[]);
          membership.roleIds = [...patch.roleIds as string[]];
        }
        if (patch.active !== undefined) {
          if (typeof patch.active !== "boolean") fail("Invalid member status");
          membership.active = patch.active;
        }
      } else if (kind === "meetings") {
        const meeting = entity as SimMeeting;
        this.meetingScope(state, meeting, "meeting:write");
        if (meeting.status !== "draft" && meeting.status !== "scheduled") fail("Cannot edit an active or historical meeting");
        if (patch.title !== undefined) meeting.title = stringValue(patch.title, "Meeting title");
        if (patch.quorum !== undefined) {
          if (typeof patch.quorum !== "number" || !Number.isInteger(patch.quorum) || patch.quorum < 1 || patch.quorum > meeting.participants.length) fail("Invalid quorum");
          meeting.quorum = patch.quorum;
        }
      } else {
        const doc = entity as SimDocument;
        this.documentScope(state, doc, "document:write");
        if (patch.title !== undefined) doc.title = stringValue(patch.title, "Document title");
        if (patch.body !== undefined) { if (typeof patch.body !== "string") fail("Invalid document content"); doc.body = patch.body; doc.version += 1; }
      }
      entity.revision += 1;
      return { result: entity, entity, before, tenantId: scope };
    });
  }
  async remove(kind: SimEntity, recordId: string, options: SimWriteOptions): Promise<{ removed: boolean }> {
    if (!businessTypes.includes(kind)) fail("Unsupported resource");
    return this.change(`remove:${kind}:${recordId}`, options, state => {
      this.root(state);
      if (kind === "tenants" || kind === "documents" || kind === "users" || kind === "meetings") fail("Governed records cannot be deleted until retention approval");
      const entity = recordById(state, kind, recordId) as SimRole | SimMembership;
      hasRevision(entity, options.expectedRevision);
      if (kind === "roles" && state.memberships.some(m => m.roleIds.includes(recordId))) fail("Role is assigned; revoke assignments before retiring it");
      if (kind === "memberships" && state.meetings.some(m => m.participants.includes((entity as SimMembership).userId))) fail("Membership has linked meeting history; suspend instead");
      const list = state[kind] as Array<{ id: string }>;
      list.splice(list.findIndex(x => x.id === recordId), 1);
      return { result: { removed: true }, entity, before: copy(entity), tenantId: entity.tenantId };
    });
  }
  async transitionMeeting(meetingId: string, next: MeetingStatus, options: SimWriteOptions): Promise<SimMeeting> {
    return this.change(`meeting:transition:${meetingId}:${next}`, options, state => {
      const meeting = recordById(state, "meetings", meetingId) as SimMeeting;
      hasRevision(meeting, options.expectedRevision);
      this.meetingScope(state, meeting, "meeting:transition");
      if (!allowedStatus[meeting.status].includes(next)) fail("Illegal meeting status transition");
      if (next === "cancelled") nonEmptyReason(options.reason);
      if (next === "live" && meeting.present.length < meeting.quorum) fail("Quorum not met");
      if (next === "ended" && !meeting.hasMinutes) fail("Minutes must be recorded before completion");
      const before = copy(meeting);
      meeting.status = next; meeting.revision += 1;
      return { result: meeting, entity: meeting, before, tenantId: meeting.tenantId };
    });
  }
  async setPresence(meetingId: string, participantId: string, present: boolean, options: SimWriteOptions): Promise<SimMeeting> {
    return this.change(`meeting:presence:${meetingId}:${participantId}:${present}`, options, state => {
      const meeting = recordById(state, "meetings", meetingId) as SimMeeting;
      hasRevision(meeting, options.expectedRevision);
      this.meetingScope(state, meeting, "meeting:attend");
      if (!meeting.participants.includes(participantId)) fail("Person is not an invited meeting participant");
      const actor = this.actor(state);
      if (!actor.root && actor.id !== participantId && meeting.createdBy !== actor.id) fail("Cannot change another participant's presence");
      if (meeting.status !== "scheduled" && meeting.status !== "live") fail("Attendance is not open");
      const before = copy(meeting);
      meeting.present = present ? [...new Set([...meeting.present, participantId])] : meeting.present.filter(uid => uid !== participantId);
      meeting.revision += 1;
      return { result: meeting, entity: meeting, before, tenantId: meeting.tenantId };
    });
  }
  async castVote(meetingId: string, decision: "yes" | "no" | "abstain", options: SimWriteOptions): Promise<SimMeeting> {
    return this.change(`meeting:vote:${meetingId}`, options, state => {
      const meeting = recordById(state, "meetings", meetingId) as SimMeeting;
      hasRevision(meeting, options.expectedRevision);
      this.meetingScope(state, meeting, "meeting:vote");
      const actor = this.actor(state);
      if (actor.root || !meeting.present.includes(actor.id)) fail("Only present, eligible participants may vote");
      if (meeting.status !== "live" || meeting.votes[actor.id]) fail("Voting is closed or already recorded");
      if (!["yes", "no", "abstain"].includes(decision)) fail("Invalid ballot");
      const before = copy(meeting);
      meeting.votes[actor.id] = decision; meeting.revision += 1;
      return { result: meeting, entity: meeting, before, tenantId: meeting.tenantId };
    });
  }
  async recordMinutes(meetingId: string, options: SimWriteOptions): Promise<SimMeeting> {
    return this.change(`meeting:minutes:${meetingId}`, options, state => {
      const meeting = recordById(state, "meetings", meetingId) as SimMeeting;
      hasRevision(meeting, options.expectedRevision);
      this.meetingScope(state, meeting, "meeting:write");
      if (meeting.status !== "live") fail("Minutes are recorded during the active meeting");
      const before = copy(meeting);
      meeting.hasMinutes = true; meeting.revision += 1;
      return { result: meeting, entity: meeting, before, tenantId: meeting.tenantId };
    });
  }
  async exportTenantSnapshot(tenantId: string, reason: string): Promise<{ tenant: SimTenant; memberships: SimMembership[]; roles: SimRole[]; meetings: SimMeeting[]; documents: SimDocument[] }> {
    const exportReason = nonEmptyReason(reason);
    const state = await this.snapshot();
    this.root(state);
    ensureTenant(state, tenantId, false);
    const result = {
      tenant: copy(state.tenants.find(t => t.id === tenantId)!),
      memberships: copy(state.memberships.filter(x => x.tenantId === tenantId)),
      roles: copy(state.roles.filter(x => x.tenantId === tenantId)),
      meetings: copy(state.meetings.filter(x => x.tenantId === tenantId)),
      documents: copy(state.documents.filter(x => x.tenantId === tenantId)),
    };
    await this.change(`tenant:export:${tenantId}`, { idempotencyKey: id(), reason: exportReason }, current => {
      if (current.revision !== state.revision) fail("Tenant changed while exporting. Refresh and retry.");
      return { result: { exported: true }, entity: result.tenant, before: null, tenantId };
    });
    return result;
  }
  async generateReport(tenantId: string): Promise<{ tenantId: string; meetings: number; documents: number; attendance: number }> {
    const state = await this.snapshot();
    this.permission(state, tenantId, "report:read");
    const meetings = state.meetings.filter(x => x.tenantId === tenantId);
    return { tenantId, meetings: meetings.length, documents: state.documents.filter(x => x.tenantId === tenantId).length,
      attendance: meetings.reduce((total, item) => total + item.present.length, 0) };
  }
  async readAudit(tenantId: string | null = null): Promise<SimAuditEvent[]> {
    const state = await this.snapshot(); this.root(state);
    return copy(state.audit.filter(e => !tenantId || e.tenantId === tenantId));
  }
  async offboardTenant(_tenantId: string): Promise<never> {
    return fail("Offboarding remains denied until the owner approves retention, holds, export and deletion policy");
  }
}

function requiredConfirmation(confirmation: string): void {
  if (confirmation !== SIMULATION_CONFIRMATION) fail("Explicit simulation confirmation is required");
}
export function createMemorySimulationRuntime(options: { confirmation: string; store?: SimStore; fixtures?: () => SimState }): ConvayRuntime {
  requiredConfirmation(options.confirmation);
  return new ConvayRuntime(options.store ?? createMemorySimStore(), options.fixtures);
}
export function createIndexedDbSimulationRuntime(options: { confirmation: string; fixtures?: () => SimState }): ConvayRuntime {
  requiredConfirmation(options.confirmation);
  return new ConvayRuntime(createIndexedDbSimStore(), options.fixtures);
}
