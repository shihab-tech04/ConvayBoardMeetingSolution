import { describe, expect, it, vi } from "vitest";
import {
  commitUnitHeadMutation, type UnitHeadGateway, type UnitHeadMutation,
  type UnitHeadReceipt,
} from "../app/pages/governance/modals/unitHeadMutation";

const assign: UnitHeadMutation = {
  operation: "assign", unit_id: "unit-a", user_id: "user-a",
  assignment_type: "Permanent Head", start_date: "2026-11-20",
  end_date: null, reason: "Approved succession", request_id: "stable-req",
};
const confirmed: UnitHeadReceipt = {
  operation: "assign", unit_id: "unit-a", record_id: "head-a",
  assignment_id: "UHA-100", user_id: "user-a", assignment_type: "Permanent Head",
  status: "active", request_id: "stable-req", revision: 3, unit_revision: 8,
  audit_event_id: "audit-a", history_record_id: "history-a",
  membership_verified: true, head_user_id: "user-a", deputy_user_id: null,
};
function mockGateway(ack: UnitHeadReceipt = confirmed): UnitHeadGateway {
  return {
    send: vi.fn(async () => ack),
    readAssignment: vi.fn(async () => ({
      payload: { id: ack.record_id, unit_id: ack.unit_id, user_id: ack.user_id,
        assignment_type: ack.assignment_type, status: ack.status },
      revision: ack.revision,
    })),
    readUnit: vi.fn(async () => ({
      payload: { id: ack.unit_id, head_user_id: ack.head_user_id,
        deputy_user_id: ack.deputy_user_id }, revision: ack.unit_revision,
    })),
  };
}
describe("GV-08 unit-head server-authoritative transaction", () => {
  it("requires a matching server audit, membership proof and two readbacks", async () => {
    const gateway = mockGateway();
    expect(await commitUnitHeadMutation(assign, gateway)).toEqual(confirmed);
    expect(gateway.send).toHaveBeenCalledTimes(1);
    expect(gateway.readAssignment).toHaveBeenCalledWith("head-a");
    expect(gateway.readUnit).toHaveBeenCalledWith("unit-a");
  });
  it("accepts exactly the ended record when server and unit projection reconcile", async () => {
    const ack: UnitHeadReceipt = {
      ...confirmed, operation: "end", status: "ended",
      head_user_id: null, revision: 4, unit_revision: 9,
    };
    const gateway = mockGateway(ack);
    expect((await commitUnitHeadMutation({
      operation: "end", unit_id: "unit-a", record_id: "head-a",
      request_id: "stable-req",
    }, gateway)).status).toBe("ended");
  });
  it("rejects absent user or invalid dates before any server request", async () => {
    const gateway = mockGateway();
    await expect(commitUnitHeadMutation({ ...assign, user_id: "" }, gateway)).rejects.toThrow(/eligible/);
    await expect(commitUnitHeadMutation({ ...assign, start_date: "2026-02-30" }, gateway)).rejects.toThrow(/dates/);
    await expect(commitUnitHeadMutation({ ...assign, end_date: "2020-01-01" }, gateway)).rejects.toThrow(/dates/);
    expect(gateway.send).not.toHaveBeenCalled();
  });
  it("rejects a confirmed-looking assignment without active membership proof", async () => {
    const gateway = mockGateway({ ...confirmed, membership_verified: false });
    await expect(commitUnitHeadMutation(assign, gateway)).rejects.toThrow(/eligible member/);
    expect(gateway.readUnit).not.toHaveBeenCalled();
  });
  it("rejects missing audit/history and mismatched request identity", async () => {
    const gateway = mockGateway({ ...confirmed, history_record_id: "" });
    await expect(commitUnitHeadMutation(assign, gateway)).rejects.toThrow(/audit\/history/);
    const mismatched = mockGateway({ ...confirmed, request_id: "another-request" });
    await expect(commitUnitHeadMutation(assign, mismatched)).rejects.toThrow(/acknowledgement/);
  });
  it("rejects a forged user, status or incorrect record termination", async () => {
    await expect(commitUnitHeadMutation(assign, mockGateway({ ...confirmed, user_id: "foreign" }))).rejects.toThrow(/eligible member/);
    await expect(commitUnitHeadMutation({
      operation: "end", unit_id: "unit-a", record_id: "head-b",
      request_id: "stable-req",
    }, mockGateway({ ...confirmed, operation: "end", status: "ended" }))).rejects.toThrow(/selected assignment/);
  });
  it("rejects a stale assignment revision", async () => {
    const gateway = mockGateway();
    gateway.readAssignment = vi.fn(async () => ({
      payload: { id: "head-a", unit_id: "unit-a", user_id: "user-a", assignment_type: "Permanent Head", status: "active" },
      revision: 2,
    }));
    await expect(commitUnitHeadMutation(assign, gateway)).rejects.toThrow(/readback/);
  });
  it("rejects a mismatched projected unit head or unit revision", async () => {
    const gateway = mockGateway();
    gateway.readUnit = vi.fn(async () => ({
      payload: { id: "unit-a", head_user_id: "other", deputy_user_id: null }, revision: 8,
    }));
    await expect(commitUnitHeadMutation(assign, gateway)).rejects.toThrow(/readback/);
  });
  it("keeps a stable request token across a network failure and retry", async () => {
    const gateway = mockGateway();
    gateway.send = vi.fn().mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(confirmed);
    await expect(commitUnitHeadMutation(assign, gateway)).rejects.toThrow("network");
    await commitUnitHeadMutation(assign, gateway);
    const calls = (gateway.send as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls[0][0].request_id).toBe("stable-req");
    expect(calls[1][0].request_id).toBe("stable-req");
  });
  it("rejects unsupported end operations before any network request", async () => {
    const gateway = mockGateway();
    await expect(commitUnitHeadMutation({
      operation: "end", unit_id: "unit-a", record_id: "", request_id: "stable-req",
    }, gateway)).rejects.toThrow(/record ID/);
    expect(gateway.send).not.toHaveBeenCalled();
  });
});
