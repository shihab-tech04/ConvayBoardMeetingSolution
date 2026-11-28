import { describe, expect, it } from "vitest";
import { parseParticipationEvidence, recordedSessionCheckIns, verifyParticipationPage, type ParticipationEvidenceRow } from "../app/services/reports/participationEvidence";

const A = "11111111-1111-4111-8111-111111111111", B = "22222222-2222-4222-8222-222222222222";
const row = (entity_key: ParticipationEvidenceRow["entity_key"], record_id: string, tenant_id: string | null, payload: Record<string, unknown>): ParticipationEvidenceRow => ({ entity_key, record_id, tenant_id, payload: { ...payload, id: record_id } });
const meeting = (id: string, tenant: string | null) => row("bms.meetings", id, tenant, { meeting_id: "MTG-1", participant_count: "99" });
const session = (id: string, tenant: string | null) => row("bms.liveSessions", id, tenant, { meeting_id: "MTG-1", session_status: "ended", started_at: "2026-11-28T08:00:00Z", ended_at: "2026-11-28T09:00:00Z" });
const attendance = (id: string, tenant: string | null, person: string, sid: string, patch = {}) => row("bms.attendance", id, tenant, { meeting_id: "MTG-1", participant_id: person, live_session_id: sid, attendance_status: "Present", check_in_time: "2026-11-28 08:01:00.123+00", ...patch });
const base = [meeting("a", A), meeting("b", B), meeting("legacy", null), session("sa", A), session("sa2", A), session("sb", B)];

describe("RP-02 scoped recorded session check-ins", () => {
  it("counts distinct meeting-person pairs across reconnects and sessions, not the forecast", () => {
    const records = [...base, attendance("1", A, "u1", "sa"), attendance("2", A, "u1", "sa2"), attendance("3", A, "u2", "sa", { attendance_status: "Left" }), attendance("4", B, "u1", "sb")];
    expect([...recordedSessionCheckIns(parseParticipationEvidence(records))]).toEqual([["a", 2], ["b", 1]]);
  });
  it("never joins sessions by matching names, foreign tenant, legacy scope or different meeting", () => {
    const records = [...base, attendance("1", B, "u1", "sa"), attendance("2", null, "u2", "sa"), attendance("3", A, "u3", "sa", { meeting_id: "other" }), attendance("4", A, "u4", "", { participant_name: "u1" })];
    expect(recordedSessionCheckIns(records).size).toBe(0);
  });
  it.each([
    { attendance_status: "Not Joined" }, { attendance_status: "Absent" }, { participant_id: "" },
    { session_id: "conflict" }, { check_in_time: "2026-11-28T07:59:59Z" }, { check_in_time: "2026-11-28T09:00:01Z" },
    { check_in_time: "2026-02-30T08:00:00Z" }, { check_in_time: "2026-11-28T08:00:00" }, { check_in_time: "" },
  ])("does not treat invalid or non-session check-ins as attendance: %j", patch => {
    expect(recordedSessionCheckIns([...base, attendance("1", A, "u1", "sa", patch)]).size).toBe(0);
  });
  it("rejects ambiguous meeting references in the same tenant and incomplete ended session evidence", () => {
    expect(recordedSessionCheckIns([...base, meeting("a2", A), attendance("1", A, "u1", "sa")]).size).toBe(0);
    expect(recordedSessionCheckIns([meeting("a", A), row("bms.liveSessions", "sa", A, { meeting_id: "MTG-1", started_at: "2026-11-28T08:00:00Z", session_status: "ended" }), attendance("1", A, "u1", "sa")]).size).toBe(0);
  });
  it("requires authoritative metadata and rejects duplicates or unrelated entities", () => {
    expect(() => parseParticipationEvidence([{ ...base[0], tenant_id: undefined }])).toThrow();
    expect(() => parseParticipationEvidence([base[0], base[0]])).toThrow();
    expect(() => parseParticipationEvidence([{ ...base[0], entity_key: "bms.votes" }])).toThrow();
    expect(() => parseParticipationEvidence([{ ...base[0], payload: { id: "foreign" } }])).toThrow();
  });
  it("requires complete, consistent server range metadata instead of silent truncation", () => {
    expect(verifyParticipationPage("0-999/1001", 0, 1000)).toBe(1001);
    expect(verifyParticipationPage("1000-1000/1001", 1000, 1, 1001)).toBe(1001);
    expect(verifyParticipationPage("*/0", 0, 0)).toBe(0);
    for (const range of [null, "0-999/*", "0-999/100001", "1-1000/1001", "0-999/999"]) expect(() => verifyParticipationPage(range, 0, 1000)).toThrow();
    expect(() => verifyParticipationPage("1000-1001/1002", 1000, 2, 1001)).toThrow();
    expect(() => verifyParticipationPage("*/1001", 1000, 0, 1001)).toThrow();
  });
});
