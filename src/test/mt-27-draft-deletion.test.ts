import { beforeEach, describe, expect, it, vi } from "vitest";
import { convayAuth } from "../app/services/supabase/convayAuth";
import {
  deleteDraftMeeting, loadDraftDeletionSnapshot,
} from "../app/pages/return-register/meetingDraftDeletion";

vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { authenticatedRequest: vi.fn() },
}));
const send = vi.mocked(convayAuth.authenticatedRequest);
beforeEach(() => send.mockReset());
const id = "MTG-2026-0001", key = "intent-1", rev = 3;
const snapshot = {
  record_id: id, revision: rev,
  payload: { id, meeting_id: id, meeting_title: "Board Draft", approval_status: "Draft", status: "Draft" },
};
const ack = { record_id: id, request_id: key, outcome: "deleted" };
const body = (value: unknown) => ({ json: async () => value } as Response);

describe("MT-27 revision-bound, server-authoritative Draft deletion", () => {
  it("reads a unique current SQL Draft and its revision before confirmation", async () => {
    send.mockResolvedValueOnce(body([snapshot]));
    await expect(loadDraftDeletionSnapshot(id)).resolves.toEqual({
      recordId: id, title: "Board Draft", revision: rev,
    });
    expect(send).toHaveBeenCalledWith(
      expect.stringContaining("record_id=eq.MTG-2026-0001"), { method: "GET" },
    );
  });

  it("denies absent, duplicate, forged-ID, status-conflict and invalid-revision snapshots", async () => {
    const failures = [
      [], [snapshot, snapshot], null,
      [{ ...snapshot, record_id: "other" }],
      [{ ...snapshot, payload: { ...snapshot.payload, id: "other" } }],
      [{ ...snapshot, payload: { ...snapshot.payload, approval_status: "Scheduled" } }],
      [{ ...snapshot, payload: { ...snapshot.payload, status: "Approved" } }],
      [{ ...snapshot, revision: 0 }],
      [{ ...snapshot, revision: 1.5 }],
      [{ ...snapshot, revision: Number.MAX_SAFE_INTEGER + 1 }],
    ];
    for (const rows of failures) {
      send.mockResolvedValueOnce(body(rows));
      await expect(loadDraftDeletionSnapshot(id)).rejects.toThrow();
    }
  });

  it("posts the exact three-argument RPC; readback must prove the row is absent", async () => {
    send.mockResolvedValueOnce(body(ack)).mockResolvedValueOnce(body([]));
    await expect(deleteDraftMeeting(id, key, rev)).resolves.toBe("deleted");
    expect(send).toHaveBeenCalledTimes(2);
    expect(send.mock.calls[0][0]).toBe("/rest/v1/rpc/convay_delete_draft_meeting");
    expect(send.mock.calls[0][1]).toMatchObject({
      method: "POST", body: JSON.stringify({
        p_record_id: id, p_request_id: key, p_expected_revision: rev,
      }),
    });
    expect(send.mock.calls[1][1]).toMatchObject({ method: "GET" });
  });

  it("accepts idempotent replay only after independent persisted absence", async () => {
    send.mockResolvedValueOnce(body({ ...ack, outcome: "already_deleted" }))
      .mockResolvedValueOnce(body([]));
    await expect(deleteDraftMeeting(id, key, rev)).resolves.toBe("already_deleted");
  });

  it("rejects mismatched or malformed ACK without treating it as success", async () => {
    const failures = [
      { ...ack, record_id: "other" },
      { ...ack, request_id: "other" },
      { ...ack, outcome: "pending" }, null, [], true,
    ];
    for (const value of failures) {
      send.mockResolvedValueOnce(body(value));
      await expect(deleteDraftMeeting(id, key, rev)).rejects.toThrow("did not confirm");
    }
    expect(send).toHaveBeenCalledTimes(failures.length);
  });

  it("rejects unpersisted success when the meeting still exists", async () => {
    send.mockResolvedValueOnce(body(ack)).mockResolvedValueOnce(body([snapshot]));
    await expect(deleteDraftMeeting(id, key, rev)).rejects.toThrow("independently verified");
  });

  it("denies malformed readback and propagates server ownership refusal", async () => {
    send.mockResolvedValueOnce(body(ack)).mockResolvedValueOnce(body(null));
    await expect(deleteDraftMeeting(id, key, rev)).rejects.toThrow("independently verified");
    send.mockRejectedValueOnce(new Error("Draft owned by another user"));
    await expect(deleteDraftMeeting(id, key, rev)).rejects.toThrow("another user");
  });

  it("denies missing IDs and stale/invalid revision without network calls", async () => {
    await expect(deleteDraftMeeting(" ", key, rev)).rejects.toThrow("record ID");
    await expect(deleteDraftMeeting(id, " ", rev)).rejects.toThrow("request ID");
    await expect(deleteDraftMeeting(id, key, 0)).rejects.toThrow("revision");
    await expect(deleteDraftMeeting(id, key, NaN)).rejects.toThrow("revision");
    await expect(loadDraftDeletionSnapshot(" ")).rejects.toThrow("record ID");
    expect(send).not.toHaveBeenCalled();
  });

  it("retries with the same request key and revision after readback timeout", async () => {
    send.mockResolvedValueOnce(body(ack)).mockRejectedValueOnce(new Error("Readback timeout"))
      .mockResolvedValueOnce(body({ ...ack, outcome: "already_deleted" }))
      .mockResolvedValueOnce(body([]));
    await expect(deleteDraftMeeting(id, key, rev)).rejects.toThrow("Readback timeout");
    await expect(deleteDraftMeeting(id, key, rev)).resolves.toBe("already_deleted");
    const original = JSON.parse(String(send.mock.calls[0][1]?.body));
    const retried = JSON.parse(String(send.mock.calls[2][1]?.body));
    expect(original).toEqual(retried);
  });
});
