import type { SimState } from "./convayRuntime.types";

/** Synthetic, disposable two-tenant fixture. No real identities, tokens or official records. */
export function createConvayAcceptanceFixtures(): SimState {
  return {
    revision: 0,
    users: [
      { id: "sim-root", name: "Platform Administrator", platformRole: "root", active: true, revision: 1 },
      { id: "sim-secretary-a", name: "Tenant A Secretary", platformRole: "user", active: true, revision: 1 },
      { id: "sim-member-a", name: "Tenant A Member", platformRole: "user", active: true, revision: 1 },
      { id: "sim-member-b", name: "Tenant B Member", platformRole: "user", active: true, revision: 1 },
    ],
    tenants: [
      { id: "tenant-a", name: "Simulation Organisation A", status: "active", revision: 1 },
      { id: "tenant-b", name: "Simulation Organisation B", status: "active", revision: 1 },
    ],
    roles: [
      { id: "role-secretary-a", tenantId: "tenant-a", name: "Secretary", active: true, revision: 1,
        permissions: ["meeting:create", "meeting:read", "meeting:write", "meeting:transition", "meeting:attend", "document:read", "document:write", "report:read"] },
      { id: "role-member-a", tenantId: "tenant-a", name: "Member", active: true, revision: 1,
        permissions: ["meeting:read", "meeting:attend", "meeting:vote", "document:read"] },
      { id: "role-member-b", tenantId: "tenant-b", name: "Member", active: true, revision: 1,
        permissions: ["meeting:read", "meeting:attend", "meeting:vote", "document:read"] },
    ],
    memberships: [
      { id: "member-secretary-a", tenantId: "tenant-a", userId: "sim-secretary-a", roleIds: ["role-secretary-a"], active: true, revision: 1 },
      { id: "member-member-a", tenantId: "tenant-a", userId: "sim-member-a", roleIds: ["role-member-a"], active: true, revision: 1 },
      { id: "member-member-b", tenantId: "tenant-b", userId: "sim-member-b", roleIds: ["role-member-b"], active: true, revision: 1 },
    ],
    meetings: [
      { id: "meeting-a-draft", tenantId: "tenant-a", title: "Planning Meeting", status: "draft", createdBy: "sim-secretary-a", participants: ["sim-secretary-a", "sim-member-a"], present: [], quorum: 2, votes: {}, hasMinutes: false, revision: 1 },
      { id: "meeting-a-live", tenantId: "tenant-a", title: "Active Governance Meeting", status: "live", createdBy: "sim-secretary-a", participants: ["sim-secretary-a", "sim-member-a"], present: [], quorum: 2, votes: {}, hasMinutes: false, revision: 1 },
    ],
    documents: [
      { id: "document-a-1", tenantId: "tenant-a", meetingId: "meeting-a-draft", title: "Agenda draft", version: 1, body: "Synthetic agenda", revision: 1 },
    ],
    audit: [], receipts: [],
  };
}
