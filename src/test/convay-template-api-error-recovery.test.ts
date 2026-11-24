import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { authenticatedRequest: vi.fn() },
}));
import { convayAuth } from "../app/services/supabase/convayAuth";
import { templateAction } from "../app/services/saas/meetingTemplateControl";

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
