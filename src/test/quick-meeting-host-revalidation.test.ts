import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { canCreateQuickMeeting, isQuickMeetingActive, type QuickMeetingAccessRecord } from "../../supabase/functions/convay-quick-meeting/quickMeetingRules";

const now = Date.parse("2026-11-20T06:00:00.000Z");
const meeting = { status: "active", expires_at: "2026-11-20T07:00:00.000Z" } satisfies Pick<QuickMeetingAccessRecord, "status" | "expires_at">;
const edge = readFileSync(resolve(process.cwd(), "supabase/functions/convay-quick-meeting/index.ts"), "utf8");

describe("QM-01 host management permission and expiry boundary", () => {
  it("allows only super-admins or hosts with the current mtg_create grant", () => {
    expect(canCreateQuickMeeting(true, [])).toBe(true);
    expect(canCreateQuickMeeting(false, ["mtg_create"])).toBe(true);
    expect(canCreateQuickMeeting(false, ["mtg_view", "mtg_join"])).toBe(false);
    expect(canCreateQuickMeeting(false, [])).toBe(false);
  });

  it("rechecks current grants during every authenticated host request, not just create", () => {
    const start = edge.indexOf("async function requireHostUser(");
    const end = edge.indexOf("function roomService()", start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const hostAuthorization = edge.slice(start, end);
    expect(hostAuthorization).toMatch(/const snapshot = await authenticatedJson/);
    expect(hostAuthorization).toMatch(/if \(!canCreateQuickMeeting\(isSuperAdmin, permissions\)\) \{/);
    expect(hostAuthorization).toMatch(/throw new HttpError\(403, "You need Quick Meeting creation permission\."\)/);
    expect(edge).toMatch(/async function hostAction\(req: Request, body: JsonObject\)[\s\S]*?const host = await requireHostUser\(req\);/);
  });

  it("fails closed on malformed, missing, expired and ended meeting timestamps", () => {
    expect(isQuickMeetingActive(meeting, now)).toBe(true);
    for (const value of ["", "invalid", "Infinity", undefined, null]) {
      expect(isQuickMeetingActive({ ...meeting, expires_at: value as string }, now)).toBe(false);
    }
    expect(isQuickMeetingActive({ ...meeting, expires_at: new Date(now).toISOString() }, now)).toBe(false);
    expect(isQuickMeetingActive({ ...meeting, status: "ended" }, now)).toBe(false);
  });

  it("uses the fail-closed status check for host tokens, rotation and room creation", () => {
    expect(edge.match(/if \(!isQuickMeetingActive\(meeting\)\) \{/g)).toHaveLength(3);
  });
});


describe("QM authoritative company ownership", () => {
  it("checks current persisted scope before guest admission and media token issuance", () => {
    const link = edge.slice(edge.indexOf("async function requireGuestLink"), edge.indexOf("async function allRoomParticipants"));
    const token = edge.slice(edge.indexOf("async function issueRoomToken"), edge.indexOf("async function issueRoomToken")+1800);
    expect(link).toContain("await assertMeetingOwnerScope(meeting)");
    expect(token).toContain("await assertMeetingOwnerScope(meeting)");
    expect(edge).toContain('postRpc<boolean>("convay_quick_meeting_scope_valid"');
    expect(edge).toContain('postRpc<{allowed: boolean; tenant_id: string | null}>("convay_quick_host_scope"');
    expect(edge).toContain('if (action !== "end" && action !== "host-leave") await assertMeetingOwnerScope(meeting)');
  });
});
