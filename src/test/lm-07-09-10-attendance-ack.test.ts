import { describe, expect, it } from "vitest";
import {
  submitAndVerifyRegularAttendance,
  AttendanceProofError,
  type RegularAttendanceIntent,
  type RegularAttendanceReceipt,
} from "../app/pages/meetings/regularMeetingAttendanceAck";

const intent: RegularAttendanceIntent = {
  meetingId: "MTG-123",
  participantId: "u-1",
  nextStatus: "Present",
  expectedRevision: 4,
  requestId: "lm07_req_1234567890",
};
const receipt: RegularAttendanceReceipt = {
  requestId: intent.requestId,
  meetingId: intent.meetingId,
  participantId: intent.participantId,
  status: intent.nextStatus,
  attendanceId: "ATT-1",
  attendanceRevision: 5,
  quorum: { revision: 9, required: 3, present: 2, met: false },
};

const transport = (ack: unknown = receipt, stored: unknown = receipt) => ({
  submit: async (_request: RegularAttendanceIntent) => ack,
  readback: async (_m: string, _p: string) => stored,
});

describe("LM-07/09/10 server attendance proof boundary (not deployed)", () => {
  it("accepts exact acknowledged attendance and quorum readback", async () => {
    await expect(submitAndVerifyRegularAttendance(intent, transport())).resolves.toEqual(receipt);
  });
  it("rejects a forged participant or meeting identity in the acknowledgement", async () => {
    await expect(submitAndVerifyRegularAttendance(intent, transport({ ...receipt, participantId: "u-2" }))).rejects.toThrow(AttendanceProofError);
    await expect(submitAndVerifyRegularAttendance(intent, transport({ ...receipt, meetingId: "MTG-other" }))).rejects.toThrow(AttendanceProofError);
  });
  it("rejects stale revision, different request ID and permission denial response", async () => {
    await expect(submitAndVerifyRegularAttendance(intent, transport({ ...receipt, attendanceRevision: 4 }))).rejects.toThrow(AttendanceProofError);
    await expect(submitAndVerifyRegularAttendance(intent, transport({ ...receipt, requestId: "bad_request_key_22" }))).rejects.toThrow(AttendanceProofError);
    await expect(submitAndVerifyRegularAttendance(intent, transport({ error: "forbidden" }))).rejects.toThrow(AttendanceProofError);
  });
  it("rejects optimistic UI success when the database readback disagrees", async () => {
    await expect(submitAndVerifyRegularAttendance(intent, transport(receipt, { ...receipt, status: "Left" }))).rejects.toThrow(AttendanceProofError);
    await expect(submitAndVerifyRegularAttendance(intent, transport(receipt, { ...receipt, quorum: { ...receipt.quorum, present: 3 } }))).rejects.toThrow(AttendanceProofError);
  });
  it("preserves caller's idempotency key for a network failure and retry", async () => {
    const seen: string[] = [];
    const gateway = {
      submit: async (request: RegularAttendanceIntent) => { seen.push(request.requestId); if (seen.length === 1) throw new Error("timeout"); return receipt; },
      readback: async () => receipt,
    };
    await expect(submitAndVerifyRegularAttendance(intent, gateway)).rejects.toThrow("timeout");
    await expect(submitAndVerifyRegularAttendance(intent, gateway)).resolves.toEqual(receipt);
    expect(seen).toEqual([intent.requestId, intent.requestId]);
  });
  it("does not submit invalid status, missing IDs or bad revision", async () => {
    let calls = 0;
    const gateway = { submit: async () => { calls++; return receipt; }, readback: async () => receipt };
    await expect(submitAndVerifyRegularAttendance({ ...intent, nextStatus: "Host" as never }, gateway)).rejects.toThrow(AttendanceProofError);
    await expect(submitAndVerifyRegularAttendance({ ...intent, participantId: "" }, gateway)).rejects.toThrow(AttendanceProofError);
    await expect(submitAndVerifyRegularAttendance({ ...intent, expectedRevision: -1 }, gateway)).rejects.toThrow(AttendanceProofError);
    expect(calls).toBe(0);
  });
});
