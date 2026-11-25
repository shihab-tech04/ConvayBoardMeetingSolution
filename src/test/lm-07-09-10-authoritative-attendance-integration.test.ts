import { afterEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { convayAuth } from "../app/services/supabase/convayAuth";
import { commitLiveAttendance, readLiveAttendance } from "../app/pages/meetings/regularMeetingAttendanceTransport";

const sql = readFileSync("supabase/migrations/20261122173000_convay_authoritative_live_attendance.sql", "utf8");
const edge = readFileSync("supabase/functions/convay-attendance/index.ts", "utf8");
const workspace = readFileSync("src/app/pages/meetings/LiveMeetingWorkspace.tsx", "utf8");

function reply(data: unknown): Promise<Response> {
  return Promise.resolve(new Response(JSON.stringify(data), {
    status: 200, headers: { "Content-Type": "application/json" },
  }));
}
const quorum = { revision: 5, required: 2, present: 1, met: false };
const initial = {
  requestId: "initial_1234567890123456", meetingId: "MTG-1", participantId: "actor-1",
  status: "Not Joined", attendanceId: "", attendanceRevision: 0,
  quorum: { revision: 0, required: 0, present: 0, met: false }, attendanceMap: {},
};
const receipt = {
  requestId: "lmatt_0123456789abcdef0123456789abcdef", meetingId: "MTG-1", participantId: "actor-1",
  status: "Present", attendanceId: "ATT-a", attendanceRevision: 1,
  quorum, attendanceMap: { "actor-1": "Present" },
};

afterEach(() => vi.restoreAllMocks());

describe("LM-07/09/10 authoritative online attendance gate", () => {
  it("requires service-role-only SQL RPC and does not grant browser access", () => {
    expect(sql).toContain("create table if not exists convay_private.live_attendance_commands");
    expect(sql).toContain("enable row level security");
    expect(sql).toContain("for update");
    expect(sql).toContain("from public,anon,authenticated");
    expect(sql).toContain("to service_role;");
    expect(sql).toContain("convay_private.has_permission('mtg_attendance')");
    expect(sql).toContain("convay_private.has_permission('mtg_join')");
    expect(sql).toContain("p_provider_confirmed is distinct from true");
    expect(sql).toContain("v_existing.revision");
    expect(sql).toContain("convay_private.live_quorum_snapshots");
  });

  it("keeps hosted release disabled until an authorized production activation", () => {
    expect(sql).toContain("live_attendance_release_gate");
    expect(sql).toContain("values(true,false) on conflict");
    expect(sql).toContain("Authoritative live attendance has not been activated");
    expect(sql).toContain("convay_a0_authoritative_live_guard");
    expect(sql).toContain("Online attendance and quorum must use the trusted transaction");
    expect(sql).toContain("Cannot write online votes without SQL-confirmed quorum");
    expect(sql).toContain("convay_z8_invalidate_live_quorum");
    expect(sql).toContain("bms.meetingParticipantLinks");
    expect(sql).toContain("bms.quorumrules");
    expect(sql).toContain("count_virtual_attendance");
    expect(sql).toContain("minimum_members_count");
    expect(sql).toContain("minimum_percentage");
    expect(sql).toContain("if v_rule->>\'rule_type\'=\'role_based\' then");
    expect(sql).toContain("meeting_id'=v_actual_mid");
  });

  it("derives true actor and actual provider presence inside the Edge boundary", () => {
    expect(edge).toContain('"/auth/v1/user"');
    expect(edge).toContain("account_status");
    expect(edge).toContain("checkOnlineAdmission");
    expect(edge).toContain('liveKit.listParticipants(room)');
    expect(edge).toContain("member.identity === identity");
    expect(edge).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(edge).toContain("p_actor_id: user.id");
    expect(edge).toContain("p_provider_confirmed: providerVerified");
    expect(edge).not.toContain("p_actor_id: request.actorId");
  });

  it("keeps online quorum fail-closed, while retaining legacy physical attendance", () => {
    expect(workspace).toContain("isOnlineMeeting ? {} : initSession.attendance");
    expect(workspace).toContain("serverQuorum?.met === true");
    expect(workspace).toContain("await commitLiveAttendance(meetingId, id, status, mode)");
    expect(workspace).toContain("applyVerifiedAttendance(saved)");
    expect(workspace).toContain("// Preserve existing in-person/offline attendance behaviour unchanged.");
    const start = workspace.indexOf("const setAttendance = useCallback(");
    const onlineGuard = workspace.indexOf("if (isOnlineMeeting)", start);
    const localUpdate = workspace.indexOf("setAttendanceMap(prev =>", start);
    expect(onlineGuard).toBeGreaterThan(start);
    expect(localUpdate).toBeGreaterThan(onlineGuard);
  });

  it("never includes client-supplied actor in authenticated readback", async () => {
    const seen: string[] = [];
    vi.spyOn(convayAuth, "authenticatedRequest").mockImplementation(async (_path, init) => {
      seen.push(String(init?.body));
      return reply(initial);
    });
    await expect(readLiveAttendance("MTG-1", "actor-1")).resolves.toMatchObject(initial);
    expect(JSON.parse(seen[0])).toEqual({
      action: "readback", meetingId: "MTG-1", participantId: "actor-1",
    });
  });

  it("requires two readbacks and one commit before reporting success", async () => {
    const calls: Record<string, unknown>[] = [];
    let writes = 0;
    vi.spyOn(convayAuth, "authenticatedRequest").mockImplementation(async (_path, init) => {
      const request = JSON.parse(String(init?.body)) as Record<string, unknown>;
      calls.push(request);
      if (request.action === "commit") {
        writes++;
        return reply({ ...receipt, requestId: request.requestId, attendanceMap: undefined });
      }
      if (writes === 0) return reply(initial);
      return reply({ ...receipt, requestId: calls.find(call => call.action === "commit")?.requestId });
    });
    const result = await commitLiveAttendance("MTG-1", "actor-1", "Present", "Online");
    expect(result).toMatchObject({ status: "Present", attendanceRevision: 1, quorum });
    expect(calls.map(call => call.action)).toEqual(["readback", "commit", "readback"]);
    expect(calls[1]).toMatchObject({
      meetingId: "MTG-1", participantId: "actor-1", nextStatus: "Present",
      expectedRevision: 0, attendanceMode: "Online",
    });
    expect(calls.every(call => !("actorId" in call) && !("p_actor_id" in call))).toBe(true);
  });

  it("rejects an incomplete or cross-participant SQL readback", async () => {
    vi.spyOn(convayAuth, "authenticatedRequest").mockImplementation(async () =>
      reply({ ...initial, participantId: "other-actor" }));
    await expect(readLiveAttendance("MTG-1", "actor-1")).rejects.toThrow(/another meeting or participant/);
  });

  it("never treats missing quorum data as success", async () => {
    vi.spyOn(convayAuth, "authenticatedRequest").mockImplementation(async () =>
      reply({ ...initial, quorum: undefined }));
    await expect(readLiveAttendance("MTG-1", "actor-1")).rejects.toThrow(/complete attendance and quorum snapshot/);
  });

  it.each([
    { status: "Unknown" },
    { status: ["Present"] },
    { attendanceRevision: -1 },
    { quorum: { ...quorum, revision: -1 } },
    { quorum: { ...quorum, required: -1 } },
    { quorum: { ...quorum, present: -1 } },
    { attendanceMap: { "actor-1": "Unknown" } },
    { attendanceMap: { "actor-1": ["Present"] } },
    { quorum: { ...quorum, present: 1.2 } },
    { attendanceRevision: 1.5 },
    { attendanceMap: [] },
    { quorum: { ...quorum, met: "true" } },
    { quorum: undefined },
  ])("fails closed on malformed attendance/quorum readback %j", async (patch) => {
    vi.spyOn(convayAuth, "authenticatedRequest").mockImplementation(async () =>
      reply({ ...initial, ...patch }));
    await expect(readLiveAttendance("MTG-1", "actor-1")).rejects.toThrow(/complete attendance and quorum snapshot/);
  });

  it.each(["Not Joined", "Present", "Left", "Temporarily Away", "Excused", "Recused"])(
    "retains valid %s status and authoritative required-role quorum failure", async (status) => {
      const snapshot = { ...receipt, status, attendanceMap: { "actor-1": status },
        quorum: { ...quorum, required: 2, present: 2, met: false } };
      vi.spyOn(convayAuth, "authenticatedRequest").mockImplementation(async () => reply(snapshot));
      await expect(readLiveAttendance("MTG-1", "actor-1")).resolves.toEqual(snapshot);
    });

});
