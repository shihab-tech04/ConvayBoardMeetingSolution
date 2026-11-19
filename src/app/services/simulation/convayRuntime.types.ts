/** Isolated simulation models. They do not represent Supabase Auth/SQL/Storage state. */
export type SimPermission = "meeting:create" | "meeting:read" | "meeting:write" | "meeting:transition" | "meeting:attend" | "meeting:vote" | "document:read" | "document:write" | "report:read";
export type SimEntity = "tenants" | "users" | "memberships" | "roles" | "meetings" | "documents";
export interface SimUser { id: string; name: string; platformRole: "root" | "user"; active: boolean; revision: number }
export interface SimTenant { id: string; name: string; status: "active" | "suspended"; revision: number }
export interface SimMembership { id: string; tenantId: string; userId: string; roleIds: string[]; active: boolean; revision: number }
export interface SimRole { id: string; tenantId: string; name: string; permissions: SimPermission[]; active: boolean; revision: number }
export type MeetingStatus = "draft" | "scheduled" | "live" | "ended" | "cancelled";
export interface SimMeeting {
  id: string; tenantId: string; title: string; status: MeetingStatus; createdBy: string;
  participants: string[]; present: string[]; quorum: number; votes: Record<string, "yes" | "no" | "abstain">;
  hasMinutes: boolean; revision: number;
}
export interface SimDocument { id: string; tenantId: string; meetingId: string; title: string; version: number; body: string; revision: number }
export interface SimAuditEvent {
  id: string; at: string; actorId: string; tenantId: string | null; action: string; targetId: string;
  reason: string | null; before: unknown; after: unknown;
}
export interface SimReceipt { key: string; actorId: string; operation: string; result: unknown }
export interface SimState {
  revision: number; users: SimUser[]; tenants: SimTenant[]; memberships: SimMembership[];
  roles: SimRole[]; meetings: SimMeeting[]; documents: SimDocument[]; audit: SimAuditEvent[]; receipts: SimReceipt[];
}
export interface SimStore {
  load(): Promise<SimState | null>;
  save(expectedGlobalRevision: number, state: SimState): Promise<void>;
}
export interface SimWriteOptions { expectedRevision?: number; idempotencyKey: string; reason?: string }
export interface SimPersonaSession { personaId: string; tenantId: string | null; platformRoot: boolean }
