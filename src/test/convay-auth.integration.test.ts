import { beforeEach, describe, expect, it, vi } from "vitest";
import authReducer from "../app/store/authSlice";
import { convayAuth, profileToCurrentUser } from "../app/services/supabase/convayAuth";
import { saveStagedCompanyDraft } from "../app/services/saas/companyMeetingDrafts";
import type { MeetingTemplateVersion } from "../app/services/saas/meetingTemplateControl";

const profile = {
  user_id: "4d0b19af-c0db-40df-8445-67cd363e9621",
  username: "shihab",
  display_name: "shihab",
  email: "shihabshajib01@gmail.com",
  account_role: "super_admin" as const,
  account_status: "active" as const,
};
function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
const tokens = {
  access_token: "validated-access-token",
  refresh_token: "refresh-token",
  expires_in: 3600,
  user: { id: profile.user_id },
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Supabase Auth migration", () => {
  it("never trusts the old localStorage authenticated flag", () => {
    localStorage.setItem("gov_ui_auth", JSON.stringify({ isAuthenticated: true, userId: "forged" }));
    expect(authReducer(undefined, { type: "unknown" }).isAuthenticated).toBe(false);
  });

  it("rejects an incorrect password before opening any application session", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json({ error_description: "Invalid login credentials" }, 400)));
    await expect(convayAuth.signIn("shihab", "incorrect", true)).rejects.toThrow("Invalid login credentials");
    expect(localStorage.getItem("convay.supabase.session.v1")).toBeNull();
  });

  it("accepts the sole admin username through Auth, verifies the profile and never saves passwords", async () => {
    const fetchMock = vi.fn(async (url: string, opts?: RequestInit) => {
      if (url.includes("/auth/v1/token")) {
        expect(String(opts?.body)).toContain("shihabshajib01@gmail.com");
        return json(tokens);
      }
      if (url.includes("/rest/v1/user_profiles")) return json([profile]);
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await convayAuth.signIn("shihab", "correct-password", true);
    expect(result.account_role).toBe("super_admin");
    expect(profileToCurrentUser(result).id).toBe(profile.user_id);
    expect(localStorage.getItem("convay.supabase.session.v1")).toContain("validated-access-token");
    expect(localStorage.getItem("convay.supabase.session.v1")).not.toContain("correct-password");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects an inactive profile even after a successful Auth password response", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) =>
      url.includes("/auth/v1/token") ? json(tokens)
        : json([{ ...profile, account_status: "suspended" }])));
    await expect(convayAuth.signIn(profile.email, "some-password", false))
      .rejects.toThrow("Your account is not active");
    expect(sessionStorage.getItem("convay.supabase.session.v1")).toBeNull();
  });

  it("never calls the privileged endpoint without a validated session", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(convayAuth.users("invite", { name: "Test", email: "test@example.com" }))
      .rejects.toThrow("Session expired");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("passes a real bearer token to the protected user-management endpoint", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/auth/v1/token")) return json(tokens);
      if (url.includes("/rest/v1/user_profiles")) return json([profile]);
      if (url.includes("/functions/v1/convay-users")) return json({ users: [profile] });
      throw new Error("Unexpected request");
    });
    vi.stubGlobal("fetch", fetchMock);
    await convayAuth.signIn(profile.email, "a-password", false);
    const result = await convayAuth.users("list");
    expect(result.users).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/functions/v1/convay-users"),
      expect.objectContaining({ headers: expect.objectContaining({
        Authorization: "Bearer validated-access-token",
      }) }),
    );
  });
});
describe("company draft rejection through the real authenticated transport",()=>{
  const tenant="11111111-1111-4111-8111-111111111111";
  const templateId="22222222-2222-4222-8222-222222222222";
  const requestId="33333333-3333-4333-8333-333333333333";
  const template:MeetingTemplateVersion={id:templateId,tenant_id:tenant,template_key:"board",
    title:"Board review",description:"",source_template_id:null,revision:2,current_revision:2,
    published_revision:2,state:"published",published_at:"2026-11-25T00:00:00Z",
    definition:{steps:[{id:"details",title:"Meeting details",fields:[
      {id:"title",label:"Meeting title",type:"text",required:true}]}]}};
  const create=()=>saveStagedCompanyDraft(tenant,template,"Board review",{title:"Budget"},requestId);
  const seed=()=>sessionStorage.setItem("convay.supabase.session.v1",JSON.stringify({
    accessToken:"test-access",refreshToken:"test-refresh",userId:"test-user",expiresAt:Date.now()+3600000,
  }));
  it("allows correction after a definitive SQL validation rejection",async()=>{
    seed();
    const fetchMock=vi.fn(async()=>json({message:"Invalid field",code:"23514"},400));
    vi.stubGlobal("fetch",fetchMock);
    await expect(create()).rejects.toMatchObject({name:"StagedDraftCreateRejected",message:"Invalid field"});
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("retains the original intent after a transport failure or ambiguous server error",async()=>{
    seed();
    const fetchMock=vi.fn().mockRejectedValueOnce(new Error("Network interrupted"))
      .mockResolvedValueOnce(json({message:"Server error",code:"23514"},503));
    vi.stubGlobal("fetch",fetchMock);
    await expect(create()).rejects.toMatchObject({name:"Error",message:"Network interrupted"});
    await expect(create()).rejects.toMatchObject({name:"Error",message:"Server error"});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it("does not classify a denied post-create readback as a rejected create",async()=>{
    seed();
    const fetchMock=vi.fn().mockResolvedValueOnce(json({tenant_id:tenant,draft_id:"DRAFT-1234567890ABCDEF1234",
      template_id:templateId,template_revision:2,request_id:requestId,status:"Staged Draft",meeting_activation_enabled:false}))
      .mockResolvedValueOnce(json({message:"Denied",code:"42501"},403));
    vi.stubGlobal("fetch",fetchMock);
    await expect(create()).rejects.toMatchObject({name:"Error",message:"Denied"});
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

describe("atomic document registry create",()=>{
  const doc={id:"DOC-LOCAL-1",doc_id:"DOC-LOCAL-1",title:"Board paper"};
  const seed=()=>sessionStorage.setItem("convay.supabase.session.v1",JSON.stringify({
    accessToken:"test-access",refreshToken:"test-refresh",userId:"test-user",expiresAt:Date.now()+3600000,
  }));
  it("uses one invoker-rights RPC and verifies its exact receipt",async()=>{
    seed();
    const fetchMock=vi.fn(async()=>json([{record_id:doc.id,revision:1}]));
    vi.stubGlobal("fetch",fetchMock);
    await expect(convayAuth.registry("bms.documents","create",doc)).resolves.toEqual({records:[],revision:1});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/rest/v1/rpc/convay_create_document_record"),
      expect.objectContaining({method:"POST",body:JSON.stringify({p_record:doc}),headers:expect.objectContaining({Authorization:"Bearer test-access"})}));
  });
  it("rejects an invalid receipt without repeating the mutation",async()=>{
    seed();
    const fetchMock=vi.fn(async()=>json([{record_id:doc.id,revision:0}]));
    vi.stubGlobal("fetch",fetchMock);
    await expect(convayAuth.registry("bms.documents","create",doc)).rejects.toThrow("changed or is inaccessible");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("does not fall back to the old write after a permission denial",async()=>{
    seed();
    const fetchMock=vi.fn(async()=>json({message:"Denied",code:"42501"},403));
    vi.stubGlobal("fetch",fetchMock);
    await expect(convayAuth.registry("bms.documents","create",doc)).rejects.toThrow("Denied");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("preserves other registry create contracts",async()=>{
    seed();
    const fetchMock=vi.fn(async()=>json([{record_id:doc.id,revision:1}]));
    vi.stubGlobal("fetch",fetchMock);
    await expect(convayAuth.registry("bms.templates","create",doc)).resolves.toEqual({records:[],revision:1});
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/rest/v1/convay_entity_records?select=record_id"),expect.objectContaining({body:JSON.stringify({entity_key:"bms.templates",record_id:doc.id,payload:doc})}));
  });
});
