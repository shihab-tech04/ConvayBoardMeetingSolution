import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PreMeetingReadinessPanel } from "../app/components/meetings/PreMeetingReadinessPanel";

const store = vi.hoisted(() => ({
  add: vi.fn(),
  update: vi.fn(),
}));

vi.mock("../app/data/boardMeetingData", () => ({
  useMeetingRegistry: () => ({ items: [{ id: "meeting-1", meeting_id: "MTG-1", meeting_title: "Board Meeting", chairperson: "Chair", secretary: "Secretary", committee: "Board", mode: "In-Person" }] }),
  useMeetingParticipantLinkRegistry: () => ({ items: [{ id: "link-1", meeting_id: "MTG-1", user_id: "member-1", quorum_eligible: true, member_category: "quorum", participant_type: "Board Member", is_required: false }] }),
  useMeetingAgendaLinkRegistry: () => ({ items: [{ id: "agenda-link", meeting_id: "MTG-1", agenda_id: "agenda-1" }] }),
  useAgendaDocumentLinkRegistry: () => ({ items: [] }),
  useDocumentRegistry: () => ({ items: [] }),
  useGovernanceRegistry: () => ({ items: [] }),
  useQuorumRuleRegistry: () => ({ items: [] }),
  useAttendanceRegistry: () => ({ items: [], add: store.add, update: store.update }),
}));
vi.mock("../app/data/bmsUsers", () => ({
  useBmsUserRegistry: () => ({ items: [{ id: "member-1", name: "Board Member" }] }),
}));
vi.mock("../app/utils/quorumCalculation", () => ({
  calculateMeetingQuorum: () => ({ status: "expected", requiredCount: 1, eligibleCount: 1, requiredPercent: 0, requiredRoles: [], missingRoles: [], reasons: [] }),
  quorumStatusLabel: () => "Quorum satisfied",
}));

const renderReady = (onStartMeeting = vi.fn()) => {
  const result = render(<PreMeetingReadinessPanel meetingId="MTG-1" onClose={vi.fn()} onStartMeeting={onStartMeeting} />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "Present" } });
  return { ...result, onStartMeeting };
};

beforeEach(() => {
  vi.clearAllMocks();
  store.add.mockResolvedValue(true);
  store.update.mockResolvedValue(true);
});

describe("LM-01/07 pre-meeting attendance ACK before Start Meeting", () => {
  it("blocks start and retains the screen when the registry denies the attendance write", async () => {
    store.add.mockResolvedValue(false);
    const { onStartMeeting } = renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Start Meeting" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/could not be saved/i));
    expect(onStartMeeting).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Start Meeting" })).toBeTruthy();
  });

  it("never advances on a rejected network request and permits a later retry", async () => {
    store.add.mockRejectedValueOnce(new Error("Database temporarily unavailable")).mockResolvedValueOnce(true);
    const { onStartMeeting } = renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Start Meeting" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("Database temporarily unavailable"));
    expect(onStartMeeting).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Start Meeting" }));
    await waitFor(() => expect(onStartMeeting).toHaveBeenCalledTimes(1));
    expect(onStartMeeting).toHaveBeenCalledWith({ "member-1": "Present" });
  });

  it("awaits the backend ACK and ignores duplicate starts while a write is pending", async () => {
    let accept!: (v: boolean) => void;
    store.add.mockImplementation(() => new Promise<boolean>(resolve => { accept = resolve; }));
    const { onStartMeeting } = renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Start Meeting" }));
    expect(store.add).toHaveBeenCalledTimes(1);
    expect(onStartMeeting).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Saving attendance/i })).toHaveProperty("disabled", true);
    await act(async () => { accept(true); });
    await waitFor(() => expect(onStartMeeting).toHaveBeenCalledTimes(1));
    expect(store.add).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: /Starting meeting/i })).toHaveProperty("disabled", true);
  });

  it("does not allow Start Meeting to advance during a separate pending Save Attendance", async () => {
    let accept!: (v: boolean) => void;
    store.add.mockImplementation(() => new Promise<boolean>(resolve => { accept = resolve; }));
    const { onStartMeeting } = renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Save Attendance" }));
    expect(screen.getByRole("button", { name: /Saving attendance/i })).toHaveProperty("disabled", true);
    expect(onStartMeeting).not.toHaveBeenCalled();
    await act(async () => { accept(true); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Start Meeting" }).hasAttribute("disabled")).toBe(false));
    expect(onStartMeeting).not.toHaveBeenCalled();
  });

  it("restores Start Meeting after a failed start command so the user can retry", async () => {
    const onStartMeeting = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderReady(onStartMeeting);
    fireEvent.click(screen.getByRole("button", { name: "Start Meeting" }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(/not started/i));
    expect(screen.getByRole("button", { name: "Start Meeting" }).hasAttribute("disabled")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Start Meeting" }));
    await waitFor(() => expect(onStartMeeting).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("button", { name: /Starting meeting/i })).toHaveProperty("disabled", true);
  });

  it("does not advance a meeting if the screen unmounts before the write ACK", async () => {
    let accept!: (v: boolean) => void;
    store.add.mockImplementation(() => new Promise<boolean>(resolve => { accept = resolve; }));
    const { onStartMeeting, unmount } = renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Start Meeting" }));
    unmount();
    await act(async () => { accept(true); });
    expect(onStartMeeting).not.toHaveBeenCalled();
  });
});
