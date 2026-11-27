import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { access: vi.fn() },
}));

import { convayAuth } from "../app/services/supabase/convayAuth";
import {
  clearAccessSnapshot, hasAccess, mayVisitPath, readAccessSnapshot,
  reloadAccessSnapshot,
} from "../app/services/supabase/convayAccess";

type SnapshotPayload = { is_super_admin: boolean; effective_permissions: string[] };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  clearAccessSnapshot();
  vi.mocked(convayAuth.access).mockReset();
});

describe("access snapshot account/session isolation", () => {
  it.each([
    null,
    { is_super_admin: "true", effective_permissions: [] },
    { is_super_admin: false, effective_permissions: "not_mtg_view" },
    { is_super_admin: true, effective_permissions: [null] },
    { is_super_admin: false, effective_permissions: [" "] },
    { is_super_admin: false },
    { is_super_admin: false, effective_permissions: [], user_role_ids: "role" },
    { is_super_admin: true, effective_permissions: [], roles: {} },
  ])("fails closed on malformed authorization response %#", async (malformed) => {
    vi.mocked(convayAuth.access)
      .mockResolvedValueOnce({ is_super_admin: true, effective_permissions: ["mtg_view"] } as never)
      .mockResolvedValueOnce(malformed as never)
      .mockResolvedValueOnce({ is_super_admin: false, effective_permissions: ["home_dashboard"] } as never);
    await reloadAccessSnapshot();
    expect(hasAccess("admin_users")).toBe(true);
    await expect(reloadAccessSnapshot()).rejects.toThrow("Invalid access verification response");
    expect(readAccessSnapshot()).toMatchObject({ loaded: false, is_super_admin: false, effective_permissions: [] });
    expect(hasAccess("mtg_view")).toBe(false);
    expect(mayVisitPath("/administration/roles-permissions/roles")).toBe(false);
    await reloadAccessSnapshot();
    expect(hasAccess("home_dashboard")).toBe(true);
    expect(hasAccess("admin_users")).toBe(false);
  });

  it("does not restore old privileges when a request resolves after sign-out", async () => {
    const pending = deferred<SnapshotPayload>();
    vi.mocked(convayAuth.access).mockReturnValueOnce(pending.promise as never);
    const oldRead = reloadAccessSnapshot();
    clearAccessSnapshot();
    pending.resolve({ is_super_admin: true, effective_permissions: ["admin_users"] });
    await expect(oldRead).rejects.toThrow(/session change/);
    expect(readAccessSnapshot().loaded).toBe(false);
    expect(hasAccess("admin_users")).toBe(false);
  });

  it("keeps the new account's request and readback if the older request finishes late", async () => {
    const old = deferred<SnapshotPayload>();
    const next = deferred<SnapshotPayload>();
    vi.mocked(convayAuth.access)
      .mockReturnValueOnce(old.promise as never)
      .mockReturnValueOnce(next.promise as never);
    const previous = reloadAccessSnapshot();
    clearAccessSnapshot();
    const current = reloadAccessSnapshot();
    old.resolve({ is_super_admin: true, effective_permissions: ["admin_users"] });
    await expect(previous).rejects.toThrow(/session change/);
    const sameCurrent = reloadAccessSnapshot();
    expect(convayAuth.access).toHaveBeenCalledTimes(2);
    next.resolve({ is_super_admin: false, effective_permissions: ["mtg_view"] });
    await expect(current).resolves.toMatchObject({ loaded: true, is_super_admin: false });
    await expect(sameCurrent).resolves.toMatchObject({ loaded: true, is_super_admin: false });
    expect(hasAccess("mtg_view")).toBe(true);
    expect(hasAccess("admin_users")).toBe(false);
  });

  it("ignores old request failures after a new account has loaded", async () => {
    const old = deferred<SnapshotPayload>();
    vi.mocked(convayAuth.access)
      .mockReturnValueOnce(old.promise as never)
      .mockResolvedValueOnce({ is_super_admin: false, effective_permissions: ["home_dashboard"] } as never);
    const previous = reloadAccessSnapshot();
    clearAccessSnapshot();
    await reloadAccessSnapshot();
    old.reject(new Error("Old account expired"));
    await expect(previous).rejects.toThrow("Old account expired");
    expect(readAccessSnapshot().error).toBeNull();
    expect(hasAccess("home_dashboard")).toBe(true);
  });

  it("rejects delegated administration permissions on direct URLs and preserves ordinary governance access", () => {
    const delegated = {
      ...readAccessSnapshot(), loaded: true, is_super_admin: false,
      effective_permissions: ["admin_users", "admin_roles", "admin_workflows", "admin_approvals",
        "admin_config", "admin_templates", "admin_notifications", "admin_integrations", "admin_retention", "gov_org_view"],
    };
    const root = { ...delegated, is_super_admin: true };
    const protectedRoutes = [
      "administration", "administration/roles-permissions/roles",
      "administration/roles-permissions/permissions", "administration/workflows/workflow-definitions",
      "administration/workflows/approval-rules", "administration/workflows/review-revision-rules",
      "administration/workflows/workflow-history", "administration/meeting-configuration/meeting-types",
      "administration/meeting-configuration/quorum-rules", "administration/meeting-configuration/voting-methods",
      "administration/meeting-configuration/statuses-numbering", "administration/templates/meeting-agenda-templates",
      "administration/templates/minutes-resolution-templates", "administration/templates/document-templates",
      "administration/templates/communication-templates", "administration/notifications/notification-rules",
      "administration/notifications/message-templates", "administration/notifications/delivery-logs",
      "administration/integrations", "administration/security-retention/security-policies",
      "administration/security-retention/retention-legal-holds", "governance-org/user-management",
    ];
    for (const path of protectedRoutes) {
      for (const candidate of [path, `/${path}`, `/${path}/`]) {
        expect(mayVisitPath(candidate, delegated), candidate).toBe(false);
        expect(mayVisitPath(candidate, root), candidate).toBe(true);
        expect(mayVisitPath(candidate, { ...root, loaded: false }), candidate).toBe(false);
      }
    }
    expect(mayVisitPath("/governance-org/organization-structure", delegated)).toBe(true);
    expect(mayVisitPath("/company-management/overview", {
      ...delegated, company_admin_tenant_ids: ["authorized-tenant"],
    })).toBe(true);
  });

  it("uses router-equivalent casing and encoding before applying route permissions", () => {
    const delegated = {
      ...readAccessSnapshot(), loaded: true, is_super_admin: false,
      effective_permissions: ["gov_org_view", "admin_users", "mtg_view", "agd_view", "arc_view"],
    };
    for (const path of [
      "/governance-org/Users-Assignments", "/governance-org/%75sers-assignments",
      "/governance-org/User-Management", "/governance-org/user-%6danagement",
      "/meetings/meeting-id/LIVE", "/meetings/meeting-id/%6cive",
      "/meetings/Quick-Meeting", "/meetings/%71uick-meeting",
      "/agenda-documents/Document-Library/doc-id/Editor",
      "/archive-reports/Registers/Resolution-Register",
      "/governance-org/%ZZ",
    ]) expect(mayVisitPath(path, delegated), path).toBe(false);
    expect(mayVisitPath("/governance-org/Organization-Structure", delegated)).toBe(true);
    expect(mayVisitPath("/meetings/meeting-id/LIVE", {
      ...delegated, effective_permissions: ["mtg_join"],
    })).toBe(true);
    expect(mayVisitPath("/agenda-documents/%64ocument-library/doc-id/Editor", {
      ...delegated, effective_permissions: ["doc_view"],
    })).toBe(true);
    expect(mayVisitPath("/Company-Management/overview", {
      ...delegated, company_admin_tenant_ids: ["authorized-tenant"],
    })).toBe(true);
    expect(mayVisitPath("/Company-Management/overview", delegated)).toBe(false);
  });

  it("enforces sole-root administration routes with or without leading slash", () => {
    const roleAdmin = {
      ...readAccessSnapshot(), loaded: true, is_super_admin: false,
      effective_permissions: ["admin_users", "admin_roles", "gov_org_view"],
    };
    for (const path of ["/governance-org/users-assignments", "governance-org/users-assignments",
      "/administration/roles-permissions/roles", "administration/roles-permissions/roles",
      "/administration/integrations", "administration/integrations"]) {
      expect(mayVisitPath(path, roleAdmin)).toBe(false);
    }
    // A delegated permission cannot grant non-delegable NI-14/15 root access.
    const delegated = { ...roleAdmin, effective_permissions: [...roleAdmin.effective_permissions, "admin_integrations"] };
    expect(mayVisitPath("/administration/integrations", delegated)).toBe(false);
    expect(mayVisitPath("/administration/integrations", { ...delegated, is_super_admin: true })).toBe(true);
    expect(mayVisitPath("/governance-org/organization-structure", roleAdmin)).toBe(true);
  });
});
