import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkLiveKitTenantScope, scopedRoomIdentity, resolveLiveKitRoomIdentity, meetingLookupParams, uniqueSavedMeeting, checkAttendancePersistenceScope, type SqlEntity }
  from "../../supabase/functions/convay-livekit/tenantScope";
import type { OnlineMeeting, OnlineSession, OnlineLink }
  from "../../supabase/functions/convay-livekit/admission";

const alpha="11111111-1111-4111-8111-111111111111";
const beta="22222222-2222-4222-8222-222222222222";
const record=(tenant_id:string|null):SqlEntity<OnlineMeeting>=>({
  tenant_id,payload:{id:"MTG-42",meeting_id:"MTG-42",mode:"Virtual",approval_status:"In Progress"},
});
const session=(tenant_id:string|null):SqlEntity<OnlineSession>=>({
  tenant_id,payload:{id:"SES-42",meeting_id:"MTG-42",session_status:"active"},
});
const member=(tenant_id:string|null):SqlEntity<OnlineLink>=>({
  tenant_id,payload:{meeting_id:"MTG-42",user_id:"member-1",participant_type:"member"},
});
const edgeSource=readFileSync("supabase/functions/convay-livekit/index.ts","utf8");

describe("TEN-LK-01 LiveKit tenant and room isolation",()=>{
  it("preserves existing null-tenant room identities and reopened sessions",()=>{
    const meeting=record(null);
    expect(checkLiveKitTenantScope(meeting,[session(null),member(null)])).toEqual({allowed:true});
    expect(scopedRoomIdentity(meeting,"MTG-42")).toBe("MTG-42");
    expect(scopedRoomIdentity(meeting,"MTG-42:SES-42-R1")).toBe("MTG-42:SES-42-R1");
  });
  it("accepts SQL-consistent records for an active tenant, never client-provided tenant claims",()=>{
    expect(checkLiveKitTenantScope(record(alpha),[member(alpha),session(alpha)])).toEqual({allowed:true});
    expect(scopedRoomIdentity(record(alpha),"MTG-42"))
      .toBe("tenant:"+alpha+":MTG-42");
    expect(scopedRoomIdentity(record(alpha),"MTG-42:SES-42-R1"))
      .toBe("tenant:"+alpha+":MTG-42:SES-42-R1");
  });
  it("never lets equal business IDs collide across companies or with legacy rooms",()=>{
    const legacy=scopedRoomIdentity(record(null),"MTG-42");
    const a=scopedRoomIdentity(record(alpha),"MTG-42");
    const b=scopedRoomIdentity(record(beta),"MTG-42");
    expect(new Set([legacy,a,b]).size).toBe(3);
  });
  it("rejects foreign company session or member even if the business meeting ID matches",()=>{
    for(const bad of [
      [session(alpha),member(beta)],
      [session(beta),member(alpha)],
      [session(null),member(alpha)],
      [session(alpha),member(null)],
    ]){
      expect(checkLiveKitTenantScope(record(alpha),bad))
        .toMatchObject({allowed:false,status:403});
    }
  });
  it("denies scoped companion records for an ownerless legacy meeting",()=>{
    expect(checkLiveKitTenantScope(record(null),[session(alpha),member(null)]))
      .toMatchObject({allowed:false,status:403});
  });
  it("rejects missing or malformed SQL scope instead of treating it as legacy",()=>{
    const missing={payload:record(null).payload} as SqlEntity<OnlineMeeting>;
    expect(checkLiveKitTenantScope(missing,[session(null)]))
      .toMatchObject({allowed:false,status:403});
    expect(()=>scopedRoomIdentity(missing,"MTG-42")).toThrow();
    expect(checkLiveKitTenantScope(record("not-a-uuid"),[session("not-a-uuid")]))
      .toMatchObject({allowed:false,status:403});
    expect(checkLiveKitTenantScope(record(alpha),[
      {payload:member(null).payload} as SqlEntity<OnlineLink>,
    ])).toMatchObject({allowed:false,status:403});
    expect(()=>scopedRoomIdentity(record("evil"),"MTG-42")).toThrow();
  });
  it("never uses client metadata for company authorization or room identity",()=>{
    const helper=readFileSync("supabase/functions/convay-livekit/tenantScope.ts","utf8");
    expect(helper).toContain("tenant_id");
    expect(helper).not.toMatch(/auth\.jwt\(|user_metadata\s*\]|req\.body/);
    expect(edgeSource).toContain('select: "tenant_id,payload"');
    expect(edgeSource).toContain("checkLiveKitTenantScope(meeting, [...links, ...sessions])");
    expect(edgeSource).toContain("resolveLiveKitRoomIdentity(meeting, session, canonicalMeetingId)");
    expect(helper).toContain("scopedRoomIdentity(meeting, legacyRoomIdentity)");
    expect(edgeSource.indexOf("checkLiveKitTenantScope(meeting"))
      .toBeLessThan(edgeSource.indexOf("const decision = checkOnlineAdmission"));
    expect(edgeSource).toContain("links: links.map(row => row.payload)");
    expect(edgeSource).toContain("verify meeting access");
  });
  it("continues enforcing original session start, four-person limit and publisher roles",()=>{
    expect(edgeSource).toContain("if (activeSessions.length !== 1)");
    expect(edgeSource).toContain("checkOnlineAdmission(admission)");
    expect(edgeSource).toContain("canPublishOnlineMeeting(admission)");
    expect(edgeSource).toContain("checkOnlineRoomCapacity(liveRoom, MAX_LIVEKIT_PARTICIPANTS)");
    expect(edgeSource).toContain("session.reopen_started_at");
    expect(edgeSource).toContain('roomAdmin: false, roomCreate: false, roomList: false');
  });
});


describe("LiveKit token/attendance room parity", () => {
  it("uses the same shared room resolver in both gateways", () => {
    const attendance = readFileSync("supabase/functions/convay-attendance/index.ts", "utf8");
    expect(attendance).toContain('resolveLiveKitRoomIdentity, opaqueId');
    expect(attendance).toContain('resolveLiveKitRoomIdentity(meeting, session, meetingId)');
    expect(attendance).toContain('checkLiveKitTenantScope(meetingRow, [...linkRows, ...sessions])');
    expect(attendance).toContain('confirmedInLiveKit(meetingRow, session, canonicalMeetingId, participantId)');
    expect(attendance).toContain('select: "tenant_id,payload"');
    expect(edgeSource).toContain('resolveLiveKitRoomIdentity(meeting, session, canonicalMeetingId)');
  });
  it("preserves legacy identities and separates companies and recovered sessions", () => {
    const initial = {id:"SES-42", session_status:"active"};
    const reopened = {...initial, id:"SES-42-R1", reopen_started_at:"2026-11-24T00:00:00Z"};
    expect(resolveLiveKitRoomIdentity(record(null),initial,"alias")).toBe("MTG-42");
    expect(resolveLiveKitRoomIdentity(record(alpha),initial,"alias")).toBe("tenant:"+alpha+":MTG-42");
    expect(resolveLiveKitRoomIdentity(record(alpha),reopened,"alias")).toBe("tenant:"+alpha+":MTG-42:SES-42-R1");
    expect(resolveLiveKitRoomIdentity(record(null),reopened,"alias")).toBe("MTG-42:SES-42-R1");
    expect(resolveLiveKitRoomIdentity(record(beta),reopened,"alias")).not.toBe(resolveLiveKitRoomIdentity(record(alpha),reopened,"alias"));
    expect(() => resolveLiveKitRoomIdentity(record(alpha),{...reopened,id:"invalid"},"alias")).toThrow();
  });
});


describe("regular meeting lookup and persistence safety", () => {
  const legacy = {...record(null),record_id:"MTG-42"};
  const alias = {...record(null),record_id:"record-42"};
  it("queries all identity aliases in a single RLS-authorized lookup", () => {
    const params = meetingLookupParams("MTG-42");
    expect(params.get("or")).toBe("(record_id.eq.MTG-42,payload->>meeting_id.eq.MTG-42,payload->>id.eq.MTG-42)");
    expect(params.get("limit")).toBe("2");
    expect(() => meetingLookupParams("MTG-42,tenant_id.neq.null")).toThrow();
  });
  it("rejects direct-record/business-ID collisions rather than selecting one", () => {
    expect(() => uniqueSavedMeeting([legacy,alias],"MTG-42")).toThrow(/Ambiguous/);
    expect(() => uniqueSavedMeeting([legacy,{...record(alpha),record_id:"other"}],"MTG-42")).toThrow(/Ambiguous/);
    expect(uniqueSavedMeeting([legacy],"MTG-42")).toEqual(legacy);
    expect(uniqueSavedMeeting([alias],"record-42")).toEqual(alias);
    expect(uniqueSavedMeeting([],"MTG-42")).toBeNull();
    expect(() => uniqueSavedMeeting([legacy],"unrelated")).toThrow();
  });
  it("never routes a company-owned or missing-scope meeting into legacy privileged SQL", () => {
    expect(checkAttendancePersistenceScope(record(null))).toEqual({allowed:true});
    expect(checkAttendancePersistenceScope(record(alpha))).toMatchObject({allowed:false,status:409});
    expect(checkAttendancePersistenceScope({payload:legacy.payload} as SqlEntity<OnlineMeeting>)).toMatchObject({allowed:false});
  });
  it("guards both production gateways before provider issuance or SQL writes", () => {
    const attendance = readFileSync("supabase/functions/convay-attendance/index.ts","utf8");
    expect(edgeSource).toContain("checkAttendancePersistenceScope(meeting)");
    expect(attendance).toContain("checkAttendancePersistenceScope(meetingRow)");
    expect(edgeSource).toContain("uniqueSavedMeeting(await jsonRequest");
    expect(attendance).toContain("uniqueSavedMeeting(await authorizedFetch");
    expect(edgeSource.indexOf("checkAttendancePersistenceScope(meeting)")).toBeLessThan(edgeSource.indexOf("new AccessToken("));
    expect(attendance.indexOf("checkAttendancePersistenceScope(meetingRow)")).toBeLessThan(attendance.indexOf('await serviceRpc<Record<string, unknown>>("convay_read_live_attendance"'));
  });
});
