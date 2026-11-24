import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkLiveKitTenantScope, scopedRoomIdentity, type SqlEntity }
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
    expect(edgeSource).toContain("scopedRoomIdentity(meeting, legacyRoomIdentity)");
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
