import { beforeEach, describe, expect, it, vi } from "vitest";
import { convayAuth } from "../app/services/supabase/convayAuth";
import { deleteDraftMeeting } from "../app/pages/return-register/meetingDraftDeletion";

vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { authenticatedRequest: vi.fn() },
}));
const send = vi.mocked(convayAuth.authenticatedRequest);
beforeEach(() => send.mockReset());

describe("MT-27 dedicated Draft deletion transport", () => {
  it("requires exact matching server ACK and preserves idempotent request key", async () => {
    send.mockResolvedValue({ json: async () => ({
      record_id: "MTG-2026-0001", request_id: "intent-1", outcome: "deleted",
    }) } as Response);
    await expect(deleteDraftMeeting("MTG-2026-0001","intent-1")).resolves.toBe("deleted");
    expect(send).toHaveBeenCalledWith(
      "/rest/v1/rpc/convay_delete_draft_meeting",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({p_record_id:"MTG-2026-0001",p_request_id:"intent-1"}),
      }),
    );
    await expect(deleteDraftMeeting("MTG-2026-0001","intent-1")).resolves.toBe("deleted");
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("accepts server-acknowledged idempotent retries", async () => {
    send.mockResolvedValue({json:async()=>({
      record_id:"MTG-2026-0001", request_id:"intent-1", outcome:"already_deleted",
    })} as Response);
    await expect(deleteDraftMeeting("MTG-2026-0001","intent-1")).resolves.toBe("already_deleted");
  });
  it("rejects mismatched ACK and server refusal", async () => {
    send.mockResolvedValue({json:async()=>({
      record_id:"other-id",request_id:"intent-1",outcome:"deleted",
    })} as Response);
    await expect(deleteDraftMeeting("MTG-2026-0001","intent-1")).rejects.toThrow("did not confirm");
    send.mockRejectedValueOnce(new Error("Draft owned by another user"));
    await expect(deleteDraftMeeting("MTG-2026-0001","intent-1")).rejects.toThrow("another user");
  });
  it("rejects empty inputs without a request", async () => {
    await expect(deleteDraftMeeting("","intent-1")).rejects.toThrow();
    await expect(deleteDraftMeeting("MTG-2026-0001"," ")).rejects.toThrow();
    expect(send).not.toHaveBeenCalled();
  });
});
