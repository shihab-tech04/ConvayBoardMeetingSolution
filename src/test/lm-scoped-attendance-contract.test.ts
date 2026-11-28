import { describe, expect, it, vi, afterEach } from "vitest";
import { scopeFromPersistedSession, scopedRpcArgs, verifyScopedReceipt } from "../../supabase/functions/convay-attendance/scopedReceipt";
import { convayAuth } from "../app/services/supabase/convayAuth";
import { readLiveAttendance, commitLiveAttendance } from "../app/pages/meetings/regularMeetingAttendanceTransport";
const tenant = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const other = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const scope = { tenantId: tenant, sessionId: "SES-A-R2" };
const initial = { ...scope, meetingId: "MTG-1", participantId: "actor-1", requestId: "initial_1234567890123456", status: "Not Joined", attendanceId: "", attendanceRevision: 0, quorum: { revision: 0, required: 1, present: 0, met: false }, attendanceMap: {} };
const receipt = { ...initial, attendanceMode: "Online", status: "Present", attendanceId: "ATT-a", attendanceRevision: 1, quorum: { revision: 1, required: 1, present: 1, met: true }, attendanceMap: { "actor-1": "Present" } };
const reply = (data: unknown) => new Response(JSON.stringify(data), {status: 200});
afterEach(() => vi.restoreAllMocks());
describe("staged authoritative attendance tenant/session handshake", () => {
  it("uses persisted tenant and exact requested session in the privileged RPC", () => {
    expect(scopedRpcArgs(scopeFromPersistedSession(tenant, scope.sessionId, scope.sessionId, tenant))).toEqual({ p_tenant_id: tenant, p_session_id: scope.sessionId });
    expect(scopedRpcArgs(scopeFromPersistedSession(null, "SES-L", "SES-L", null))).toEqual({ p_tenant_id: null, p_session_id: "SES-L" });
  });
  it.each([undefined, null, "SES-A", "bad id"])("rejects invalid or previous-session request %j", requested => {
    expect(() => scopeFromPersistedSession(tenant, scope.sessionId, requested)).toThrow(/session changed/);
  });
  it.each([undefined, "invalid"])("rejects malformed persisted tenant %j", persisted => {
    expect(() => scopeFromPersistedSession(persisted, scope.sessionId, scope.sessionId)).toThrow(/authorization denied/);
  });
  it("rejects a changed tenant even when the requested session ID is equal", () => {
    expect(() => scopeFromPersistedSession(other, scope.sessionId, scope.sessionId, tenant)).toThrow(/authorization denied/);
  });
  it.each([{tenantId: other}, {tenantId: undefined}, {sessionId: "SES-A"}, {sessionId: undefined}, {meetingId: "MTG-OTHER"}, {participantId: "foreign"}])("rejects mismatched SQL receipt %j", patch => {
    expect(() => verifyScopedReceipt({...receipt,...patch},scope,"MTG-1","actor-1")).toThrow(/scope changed/);
  });
  it("accepts exact SQL proof", () => expect(verifyScopedReceipt(receipt,scope,"MTG-1","actor-1")).toEqual(receipt));
  it("never issues a write from an old session response", async () => {
    const spy=vi.spyOn(convayAuth,"authenticatedRequest").mockImplementation(async () => reply({...initial,sessionId:"SES-A"}));
    await expect(commitLiveAttendance("MTG-1","actor-1","Present","Online",()=>true,scope.sessionId)).rejects.toThrow(/session or company changed/);
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it.each([{tenantId: other},{sessionId: "SES-A"}])("rejects changed scope on command ACK %j", async patch => {
    const calls: string[]=[];
    vi.spyOn(convayAuth,"authenticatedRequest").mockImplementation(async (_path,init)=>{
      const body=JSON.parse(String(init?.body)); calls.push(body.action);
      return reply(body.action==="readback"?initial:{...receipt,...patch,requestId:body.requestId});
    });
    await expect(commitLiveAttendance("MTG-1","actor-1","Present","Online",()=>true,scope.sessionId)).rejects.toThrow(/session or company changed/);
    expect(calls).toEqual(["readback","commit"]);
  });
  it("binds read, write and independent readback to the same session and tenant", async () => {
    const calls: Record<string,unknown>[]=[];
    vi.spyOn(convayAuth,"authenticatedRequest").mockImplementation(async (_path,init)=>{
      const body=JSON.parse(String(init?.body)); calls.push(body);
      return reply(calls.length===1?initial:{...receipt,requestId:calls[1].requestId});
    });
    await expect(commitLiveAttendance("MTG-1","actor-1","Present","Online",()=>true,scope.sessionId)).resolves.toMatchObject({ ...receipt, requestId: expect.any(String) });
    expect(calls.map(c=>c.expectedSessionId)).toEqual([scope.sessionId,scope.sessionId,scope.sessionId]);
    expect(calls.slice(1).map(c=>c.expectedTenantId)).toEqual([tenant,tenant]);
    expect(calls.every(c=>!("actorId" in c))).toBe(true);
  });
  it.each([undefined, "In-Person"])("rejects incorrect company SQL mode proof %j", mode => {
    expect(() => verifyScopedReceipt({...receipt, attendanceMode: mode},scope,"MTG-1","actor-1","Online")).toThrow(/mode readback/);
  });
  it("keeps pre-rollout legacy receipts compatible", () => {
    const legacy = {...receipt, tenantId: null, attendanceMode: undefined};
    expect(verifyScopedReceipt(legacy,{tenantId:null,sessionId:scope.sessionId},"MTG-1","actor-1","Online")).toEqual(legacy);
  });
  it.each(["commit", "readback"])("rejects a company mode mismatch in %s", async failure => {
    let calls=0; let requestId="";
    vi.spyOn(convayAuth,"authenticatedRequest").mockImplementation(async (_path,init)=>{
      const body=JSON.parse(String(init?.body));calls++;
      if(calls===1)return reply(initial);
      if(body.action==="commit")requestId=body.requestId;
      return reply({...receipt,requestId,attendanceMode:body.action===failure?"In-Person":"Online"});
    });
    await expect(commitLiveAttendance("MTG-1","actor-1","Present","Online",()=>true,scope.sessionId)).rejects.toThrow(/mode/);
    expect(calls).toBe(failure==="commit"?2:3);
  });
  it("rejects missing scope from old gateway", async () => {
    vi.spyOn(convayAuth,"authenticatedRequest").mockImplementation(async()=>reply({...initial,sessionId:undefined,tenantId:undefined}));
    await expect(readLiveAttendance("MTG-1","actor-1",scope.sessionId)).rejects.toThrow(/session or company changed/);
  });
});
