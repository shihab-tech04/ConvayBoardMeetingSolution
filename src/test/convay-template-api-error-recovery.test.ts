import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { authenticatedRequest: vi.fn() },
}));
import { convayAuth } from "../app/services/supabase/convayAuth";
import { readManagedTemplate, templateAction } from "../app/services/saas/meetingTemplateControl";

const request = vi.mocked(convayAuth.authenticatedRequest);
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
afterEach(() => vi.resetAllMocks());

describe("MT-CONFIG-01 authenticated SQL template API failure recovery", () => {
  it("reports server authorization failures without false success", async () => {
    request.mockResolvedValueOnce(response({ code:"42501", message:"Meeting template administration denied" },403));
    await expect(templateAction("publish",{template_id:"test"})).rejects.toThrow(
      "Meeting template administration denied");
  });
  it("preserves a readable error when the gateway response is not JSON", async () => {
    request.mockResolvedValueOnce(new Response("<html>Bad Gateway</html>",{status:502}));
    await expect(templateAction("list",{})).rejects.toThrow(
      "Meeting template SQL request failed. Refresh and retry.");
  });
  it("rejects an empty or array-shaped success response", async () => {
    request.mockResolvedValueOnce(new Response("",{status:200}));
    await expect(templateAction("list",{})).rejects.toThrow("Meeting template SQL response is invalid");
    request.mockResolvedValueOnce(response([]));
    await expect(templateAction("list",{})).rejects.toThrow("Meeting template SQL response is invalid");
  });
  it("retains the existing SQL request shape on a genuine success", async () => {
    const directory={templates:[]};
    request.mockResolvedValueOnce(response(directory));
    await expect(templateAction("list",{tenant_id:null})).resolves.toEqual(directory);
    expect(request).toHaveBeenCalledWith("/rest/v1/rpc/convay_meeting_template_manage",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({p_action:"list",p_payload:{tenant_id:null}}),
    });
  });
});


describe("MT-CONFIG-01 immutable template revision readback", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it.each([0, -1, 2, 4, 1.5, "3", null])("rejects a mismatched or invalid revision %s", async (revision) => {
    request.mockResolvedValueOnce(response({ template: { id, revision } }));
    await expect(readManagedTemplate(id, 3)).rejects.toThrow("Template SQL readback identity was not confirmed");
  });
  it("accepts the exact requested historical revision", async () => {
    const template = { id, revision: 3, current_revision: 4 };
    request.mockResolvedValueOnce(response({ template }));
    await expect(readManagedTemplate(id, 3)).resolves.toEqual(template);
    expect(request).toHaveBeenCalledWith("/rest/v1/rpc/convay_meeting_template_manage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ p_action: "read", p_payload: { template_id: id, revision: 3 } }),
    });
  });
  it.each([0, -1])("rejects nonpositive default readback %s", async (revision) => {
    request.mockResolvedValueOnce(response({ template: { id, revision } }));
    await expect(readManagedTemplate(id)).rejects.toThrow("Template SQL readback identity was not confirmed");
  });
  it("accepts a valid server-selected revision when none is requested", async () => {
    const template = { id, revision: 2 };
    request.mockResolvedValueOnce(response({ template }));
    await expect(readManagedTemplate(id)).resolves.toEqual(template);
  });
});

it("distinguishes a structured mutation rejection from a lost or failed readback",async()=>{
 request.mockResolvedValueOnce(response({code:"40001",message:"Template changed; reload before editing"},409));
 await expect(templateAction("revise",{})).rejects.toMatchObject({name:"TemplateMutationRejected"});
 request.mockResolvedValueOnce(response({code:"42501",message:"Readback denied"},403));
 await expect(templateAction("read",{})).rejects.not.toMatchObject({name:"TemplateMutationRejected"});
 request.mockResolvedValueOnce(response({code:"42501",message:"Gateway failure"},502));
 await expect(templateAction("create",{})).rejects.not.toMatchObject({name:"TemplateMutationRejected"});
});
