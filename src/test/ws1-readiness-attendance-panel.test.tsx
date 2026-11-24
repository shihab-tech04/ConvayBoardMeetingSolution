import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PreMeetingReadinessPanel } from "../app/components/meetings/PreMeetingReadinessPanel";

type Row = { id: string; meeting_id: string; participant_id: string; attendance_status?: string; check_in_time?: string; check_out_time?: string; live_session_id?: string };
const state = vi.hoisted(() => ({
  rows: [] as Row[], loading: false, error: null as string | null, reopened: false,
  update: vi.fn(), add: vi.fn(), refresh: vi.fn(), getById: vi.fn(), getRevision: vi.fn(),
}));
vi.mock("../app/data/boardMeetingData", () => ({
  useMeetingRegistry: () => ({ items: [{ id: "meeting-1", meeting_id: "MTG-1", meeting_title: "Board Meeting", chairperson: "Chair", secretary: "Secretary", committee: "Board", mode: "In-Person", reopened_at: state.reopened ? "2026-11-24T10:10:00Z" : undefined }] }),
  useMeetingParticipantLinkRegistry: () => ({ items: [{ id: "link-1", meeting_id: "MTG-1", user_id: "member-1", quorum_eligible: true, member_category: "quorum", participant_type: "Board Member", is_required: false }] }),
  useMeetingAgendaLinkRegistry: () => ({ items: [] }),
  useAgendaDocumentLinkRegistry: () => ({ items: [] }),
  useDocumentRegistry: () => ({ items: [] }),
  useGovernanceRegistry: () => ({ items: [] }),
  useQuorumRuleRegistry: () => ({ items: [] }),
  useAttendanceRegistry: () => ({ items: state.rows, loading: state.loading, error: state.error, add: state.add, update: state.update, refresh: state.refresh, getById: state.getById, getRevision: state.getRevision }),
}));
vi.mock("../app/data/bmsUsers", () => ({ useBmsUserRegistry: () => ({ items: [{ id: "member-1", name: "Board Member" }] }) }));
vi.mock("../app/utils/quorumCalculation", () => ({
  calculateMeetingQuorum: () => ({ status: "expected", requiredCount: 1, eligibleCount: 1, requiredPercent: 0, requiredRoles: [], missingRoles: [], reasons: [] }),
  quorumStatusLabel: () => "Quorum satisfied",
}));
const row: Row = { id: "ATT-1", meeting_id: "MTG-1", participant_id: "member-1", check_in_time: "2026-11-24T10:00:00Z", attendance_status: "Left" };
const renderPanel = () => {
  const onStartMeeting = vi.fn().mockResolvedValue(true);
  const component = () => <PreMeetingReadinessPanel meetingId="MTG-1" onClose={vi.fn()} onStartMeeting={onStartMeeting} />;
  const result = render(component());
  return { ...result, refreshPanel: () => result.rerender(component()), onStartMeeting };
};
beforeEach(() => {
  vi.clearAllMocks(); state.rows = []; state.loading = false; state.error = null; state.reopened = false;
  state.getRevision.mockReturnValue(1);
  state.getById.mockImplementation((id: string) => state.rows.find(r => r.id === id));
  state.refresh.mockResolvedValue(undefined);
  state.add.mockResolvedValue(true); state.update.mockResolvedValue(true);
});
describe("WS1 QR-03 pre-meeting attendance SQL consumption", () => {
  it("hydrates delayed SQL attendance and does not treat a departed member as present", () => {
    state.loading = true;
    const panel = renderPanel();
    expect(screen.getByRole("button", {name: "Start Meeting"})).toHaveProperty("disabled", true);
    state.rows = [row]; state.loading = false; panel.refreshPanel();
    expect(screen.getByRole("combobox")).toHaveProperty("value", "Left");
  });
  it("does not silently overwrite a changed SQL revision", async () => {
    state.rows = [row]; const panel = renderPanel();
    fireEvent.change(screen.getByRole("combobox"), {target: {value: "Present"}});
    state.rows = [{...row, attendance_status: "Recused"}]; state.getRevision.mockReturnValue(2); panel.refreshPanel();
    fireEvent.click(screen.getByRole("button", {name: "Start Meeting"}));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/changed in SQL/i));
    expect(state.update).not.toHaveBeenCalled(); expect(panel.onStartMeeting).not.toHaveBeenCalled();
  });
  it("does not advance on an ACK whose refreshed SQL state is inconsistent", async () => {
    state.rows = [row]; const panel = renderPanel();
    fireEvent.change(screen.getByRole("combobox"), {target: {value: "Present"}});
    fireEvent.click(screen.getByRole("button", {name: "Start Meeting"}));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/SQL readback did not match/i));
    expect(state.update).toHaveBeenCalledWith("ATT-1", expect.objectContaining({attendance_status: "Present"}));
    expect(panel.onStartMeeting).not.toHaveBeenCalled();
  });
  it("prevents reopened session records from being used by the pre-start editor", () => {
    state.rows = [{...row, attendance_status: "Present"}]; state.reopened = true;
    const panel = renderPanel();
    expect(screen.getByRole("combobox")).toHaveProperty("value", "Not Joined");
    expect(screen.getByRole("button", {name: "Start Meeting"})).toHaveProperty("disabled", true);
    expect(panel.onStartMeeting).not.toHaveBeenCalled();
  });
});
