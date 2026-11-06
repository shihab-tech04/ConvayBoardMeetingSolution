import { describe, it, expect } from "vitest";
import { checkOnlineAdmission, checkOnlineRoomCapacity, type AdmissionContext } from "../../supabase/functions/convay-livekit/admission";

const valid = (): AdmissionContext => ({
  meeting: {
    id: "MTG-1", meeting_id: "MTG-1", mode: "Virtual",
    approval_status: "In Progress",
  },
  session: { meeting_id: "MTG-1", session_status: "active" },
  links: [{ meeting_id: "MTG-1", user_id: "user-1" }],
  userId: "user-1", isSuperAdmin: false, permissions: ["mtg_join"],
});

describe("Convay LiveKit admission", () => {
  it("accepts the joined, permissioned member of a started virtual meeting", () => {
    expect(checkOnlineAdmission(valid())).toEqual({ allowed: true });
  });
  it("accepts a started Hybrid meeting without changing physical access", () => {
    expect(checkOnlineAdmission({ ...valid(), meeting: { ...valid().meeting, mode: "Hybrid" } }))
      .toEqual({ allowed: true });
  });
  it("denies a nonmember, even when the user has meeting-join permission", () => {
    expect(checkOnlineAdmission({ ...valid(), userId: "stranger" })).toMatchObject({ allowed: false, status: 403 });
  });
  it("denies a user with membership but without meeting-join permission", () => {
    expect(checkOnlineAdmission({ ...valid(), permissions: [] })).toMatchObject({ allowed: false, status: 403 });
  });
  it("denies the wrong meeting membership", () => {
    expect(checkOnlineAdmission({ ...valid(), links: [{ meeting_id: "MTG-2", user_id: "user-1" }] }))
      .toMatchObject({ allowed: false, status: 403 });
  });
  it("denies physical-only rooms", () => {
    expect(checkOnlineAdmission({ ...valid(), meeting: { ...valid().meeting, mode: "Physical" } }))
      .toMatchObject({ allowed: false, status: 409 });
  });
  it("denies cancelled meetings and ended sessions", () => {
    expect(checkOnlineAdmission({ ...valid(), meeting: { ...valid().meeting, approval_status: "Cancelled" } }))
      .toMatchObject({ allowed: false, status: 409 });
    expect(checkOnlineAdmission({ ...valid(), session: { session_status: "ended" } }))
      .toMatchObject({ allowed: false, status: 409 });
  });
  it("denies scheduled but not-started meetings", () => {
    expect(checkOnlineAdmission({ ...valid(), session: null }))
      .toMatchObject({ allowed: false, status: 409 });
  });
  it("does not treat a leadership display name as verified identity", () => {
    expect(checkOnlineAdmission({
      ...valid(), userId: "stranger", links: [],
      meeting: { ...valid().meeting, chairperson: "stranger@example.com" },
    })).toMatchObject({ allowed: false, status: 403 });
  });
  it("allows a permissioned administrative role after meeting start", () => {
    expect(checkOnlineAdmission({ ...valid(), isSuperAdmin: true, userId: "superadmin", links: [] }))
      .toEqual({ allowed: true });
  });
});

describe("Convay LiveKit four-participant room capacity", () => {
  it("admits while the configured four-person room has a free seat", () => {
    expect(checkOnlineRoomCapacity({ maxParticipants: 4, numParticipants: 3 }))
      .toEqual({ allowed: true });
  });

  it("rejects a full room before issuing another token", () => {
    expect(checkOnlineRoomCapacity({ maxParticipants: 4, numParticipants: 4 }))
      .toMatchObject({ allowed: false, status: 409 });
  });

  it("fails closed when the room is missing or has a different participant limit", () => {
    expect(checkOnlineRoomCapacity(null)).toMatchObject({ allowed: false, status: 503 });
    expect(checkOnlineRoomCapacity({ maxParticipants: 8, numParticipants: 1 }))
      .toMatchObject({ allowed: false, status: 503 });
    expect(checkOnlineRoomCapacity({ maxParticipants: 4 }))
      .toMatchObject({ allowed: false, status: 503 });
  });
});
