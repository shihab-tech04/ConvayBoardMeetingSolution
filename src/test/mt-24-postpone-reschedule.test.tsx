import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext } from "../app/actions/types";
import { actionGranted, filterActionsByAccess } from "../app/services/supabase/actionPermissions";
import { convayAuth } from "../app/services/supabase/convayAuth";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("../app/components/modals/AppModal", () => ({
  AppModal: ({ title, children, footer }: { title: string; children: React.ReactNode; footer: React.ReactNode }) => (
    <section role="dialog" aria-label={title}>{children}<footer>{footer}</footer></section>
  ),
}));
vi.mock("../app/components/buttons/PrimaryButton", () => ({
  PrimaryButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));
vi.mock("../app/components/buttons/SecondaryButton", () => ({
  SecondaryButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props} />,
}));
vi.mock("../app/components/tables", () => ({ UnifiedDataTable: () => null }));

import { RescheduleMeetingModal } from "../app/pages/meetings/MeetingContextualModals";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function context(status: string, role: "organizer" | "host" | "viewer" = "organizer"): ActionContext {
  return {
    entity: "meeting",
    record: {
      id: "MTG-MT24",
      meeting_id: "MTG-MT24",
      approval_status: status,
      organizer_user_id: "mt24-organizer",
      chairperson_user_id: "mt24-host",
      meeting_date: "2026-12-10",
      start_time: "10:00",
    },
    currentUser: { id: "mt24-organizer", name: "Organizer" },
    userRole: "Meeting Organizer",
    meetingRoles: [role],
    permissions: ["mtg_view", "mtg_postpone", "mtg_update", "mtg_cancel"],
    now: new Date("2026-12-01T12:00:00.000Z"),
  };
}

function setupSession() {
  sessionStorage.setItem("convay.supabase.session.v1", JSON.stringify({
    accessToken: "unit-test-access-token",
    refreshToken: "unit-test-refresh-token",
    userId: "f12dd5ac-7389-4de7-9f4c-e4f1c0d07235",
    expiresAt: Date.now() + 60 * 60 * 1000,
  }));
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  toast.success.mockReset();
  toast.error.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("MT-24 postpone and reschedule", () => {
  it("offers rescheduling for assigned leadership and keeps rejected/unknown states read-only", () => {
    const postponed = resolveMeetingActions(context("Postponed"));
    expect(postponed.find(action => action.id === "reschedule_meeting")?.visible).toBe(true);
    expect(actionGranted("meeting", "reschedule_meeting", ["mtg_postpone"], false)).toBe(true);
    expect(filterActionsByAccess("meeting", postponed, ["mtg_view"], false).map(action => action.id))
      .toEqual(["view_record"]);
    expect(filterActionsByAccess("meeting", postponed, ["mtg_postpone"], false).map(action => action.id))
      .toEqual(["reschedule_meeting"]);
    expect(resolveMeetingActions(context("Postponed", "viewer")).filter(action => action.visible).map(action => action.id))
      .toEqual(["view_record"]);
    expect(resolveMeetingActions(context("Rejected")).map(action => action.id)).toEqual(["view_record"]);
    expect(resolveMeetingActions(context("Unknown")).map(action => action.id)).toEqual(["view_record"]);
  });

  it("returns a server-confirmed reschedule and sends the validated values to the scoped RPC", async () => {
    setupSession();
    const userId = "f12dd5ac-7389-4de7-9f4c-e4f1c0d07235";
    const payload = {
      id: "MTG-MT24",
      status: "Rescheduled",
      approval_status: "Rescheduled",
      meeting_date: "2026-12-18",
      start_time: "13:30",
      end_time: "14:30",
      reschedule_reason: "Chairperson availability changed.",
      rescheduled_by: userId,
      rescheduled_at: "2026-11-06T09:00:00.000Z",
      reschedule_history: [{ reason: "Chairperson availability changed." }],
    };
    const fetchMock = vi.fn(async () => json(payload));
    vi.stubGlobal("fetch", fetchMock);

    const result = await convayAuth.rescheduleMeeting(" MTG-MT24 ", {
      meeting_date: "2026-12-18",
      start_time: "13:30",
      end_time: "14:30",
      reason: " Chairperson availability changed. ",
    });

    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cnrueblhgvdonplirlhv.supabase.co/rest/v1/rpc/convay_reschedule_meeting",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer unit-test-access-token" }),
        body: JSON.stringify({
          p_record_id: "MTG-MT24",
          p_new_meeting_date: "2026-12-18",
          p_new_start_time: "13:30",
          p_new_end_time: "14:30",
          p_reschedule_reason: "Chairperson availability changed.",
        }),
      }),
    );
  });

  it("rejects invalid times and short reasons before contacting Supabase", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const schedule = { meeting_date: "2026-12-18", start_time: "14:00", end_time: "13:00", reason: "Nope" };
    await expect(convayAuth.rescheduleMeeting("MTG-MT24", schedule))
      .rejects.toThrow("Meeting end time must be later than start time");
    await expect(convayAuth.rescheduleMeeting("MTG-MT24", { ...schedule, end_time: "15:00" }))
      .rejects.toThrow("Please provide a rescheduling reason (at least 5 characters)");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not report a reschedule when SQL rejects it or returns the wrong state", async () => {
    setupSession();
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "Meeting postponement permission required" }, 403)));
    await expect(convayAuth.rescheduleMeeting("MTG-MT24", {
      meeting_date: "2026-12-18", start_time: "13:30", end_time: "14:30", reason: "Schedule changed",
    })).rejects.toThrow("Meeting postponement permission required");

    vi.stubGlobal("fetch", vi.fn(async () => json({
      id: "MTG-MT24", status: "Published", approval_status: "Published",
      meeting_date: "2026-12-18", start_time: "13:30", end_time: "14:30",
      reschedule_reason: "Schedule changed", rescheduled_by: "actor", rescheduled_at: "now",
      reschedule_history: [],
    })));
    await expect(convayAuth.rescheduleMeeting("MTG-MT24", {
      meeting_date: "2026-12-18", start_time: "13:30", end_time: "14:30", reason: "Schedule changed",
    })).rejects.toThrow("Supabase did not confirm the meeting reschedule.");
  });

  it("waits for persistence, prevents duplicate submissions, and leaves the modal open on SQL errors", async () => {
    let resolveSave!: (result: Record<string, unknown>) => void;
    const onUpdate = vi.fn(() => new Promise<Record<string, unknown>>(resolve => { resolveSave = resolve; }));
    const onClose = vi.fn();
    const successful = render(<RescheduleMeetingModal
      meeting={{ id: "MTG-MT24", meeting_date: "2026-12-10", start_time: "10:00", end_time: "11:00" }}
      onClose={onClose}
      onUpdate={onUpdate}
    />);
    fireEvent.change(screen.getByLabelText("New Date"), { target: { value: "2026-12-18" } });
    fireEvent.change(screen.getByLabelText("Start Time"), { target: { value: "13:30" } });
    fireEvent.change(screen.getByLabelText("End Time"), { target: { value: "14:30" } });
    fireEvent.change(screen.getByLabelText("Reason for Rescheduling"), { target: { value: "Schedule changed" } });

    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    fireEvent.click(screen.getByRole("button", { name: "Saving…" }));
    await waitFor(() => expect(onUpdate).toHaveBeenCalledOnce());
    expect(onClose).not.toHaveBeenCalled();
    await act(async () => resolveSave({ approval_status: "Rescheduled" }));
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
    successful.unmount();

    const onFailedUpdate = vi.fn().mockRejectedValue(new Error("Meeting postponement permission required"));
    const failed = render(<RescheduleMeetingModal
      meeting={{ id: "MTG-MT24", meeting_date: "2026-12-10", start_time: "10:00", end_time: "11:00" }}
      onClose={onClose}
      onUpdate={onFailedUpdate}
    />);
    fireEvent.change(screen.getByLabelText("New Date"), { target: { value: "2026-12-19" } });
    fireEvent.change(screen.getByLabelText("Reason for Rescheduling"), { target: { value: "Schedule changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Meeting postponement permission required");
    expect(onClose).toHaveBeenCalledOnce();
    failed.unmount();
  });

  it("requires a reason before saving from the contextual modal", async () => {
    const onUpdate = vi.fn();
    render(<RescheduleMeetingModal
      meeting={{ id: "MTG-MT24", meeting_date: "2026-12-10", start_time: "10:00", end_time: "11:00" }}
      onClose={vi.fn()}
      onUpdate={onUpdate}
    />);
    fireEvent.change(screen.getByLabelText("New Date"), { target: { value: "2026-12-18" } });
    fireEvent.click(screen.getByRole("button", { name: "Reschedule" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("at least 5 characters"));
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
