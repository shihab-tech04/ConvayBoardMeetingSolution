import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { calendarDateWindows } from "../app/pages/dashboard/calendarDateWindows";

const state = vi.hoisted(() => ({
  user: { name: "Ann", role: "user", designation: "" },
  data: {} as Record<string, Record<string, unknown>[]>,
  loading: false,
  error: null as string | null,
  retries: 0,
}));

vi.mock("react-router", async original => {
  const mod = await original<typeof import("react-router")>();
  return { ...mod, useNavigate: () => () => undefined };
});
vi.mock("../app/hooks/useCurrentUser", () => ({ useCurrentUser: () => state.user }));
vi.mock("../app/actions/useResolvedActions", () => ({
  useResolvedActions: () => ({ resolve: () => [] }),
}));
vi.mock("../app/components/tabs/TabBar", () => ({
  TabBar: ({ active }: { active: string }) => <div data-testid="calendar-view-mode">{active}</div>,
}));
vi.mock("../app/components/cards/StatCard", () => ({
  StatCard: ({ label, value }: { label: string; value: string }) => <p>{label}: {value}</p>,
}));
vi.mock("../app/data/boardMeetingData", () => {
  const registry = (name: string) => () => ({
    items: state.data[name] ?? [],
    loading: state.loading,
    error: state.error,
    refresh: async () => { state.retries++; },
  });
  return {
    useMeetingRegistry: registry("meetings"),
    useActionItemRegistry: registry("actions"),
    useBoardPackRegistry: registry("boardPacks"),
    useRSVPRegistry: registry("rsvps"),
    useMinutesRegistry: registry("minutes"),
    useParticipantRegistry: registry("participants"),
  };
});

import { CombinedDashboardPage } from "../app/pages/dashboard/CombinedDashboardPage";

const includedMeeting = () => ({
  id: "m1", meeting_id: "MTG-001", meeting_title: "Personal Board Session",
  chairperson: "Ann", meeting_date: calendarDateWindows(new Date()).today,
  start_time: "10:00", approval_status: "Approved", mode: "Physical",
});

beforeEach(() => {
  state.user = { name: "Ann", role: "user", designation: "" };
  state.data = {};
  state.loading = false;
  state.error = null;
  state.retries = 0;
});

afterEach(() => vi.useRealTimers());

describe("HM-04 personal calendar", () => {
  it("displays only events matching the signed-in member identity", () => {
    state.data.meetings = [
      includedMeeting(),
      { id: "m2", meeting_title: "Anna's Private Meeting", chairperson: "Anna",
        meeting_date: calendarDateWindows(new Date()).today, start_time: "14:00" },
    ];
    render(<CombinedDashboardPage />);
    expect(screen.getAllByText("Personal Board Session").length).toBeGreaterThan(0);
    expect(screen.queryByText("Anna's Private Meeting")).not.toBeInTheDocument();
  });

  it("chooses the week view after asynchronous SQL records load", () => {
    state.loading = true;
    const view = render(<CombinedDashboardPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your meetings");
    state.loading = false;
    state.data.meetings = [includedMeeting()];
    view.rerender(<CombinedDashboardPage />);
    expect(screen.getByTestId("calendar-view-mode")).toHaveTextContent("week");
  });

  it("never presents a failed SQL read as an empty calendar and retries every source", () => {
    state.error = "Meeting registry unavailable";
    render(<CombinedDashboardPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("could not be loaded");
    expect(screen.queryByText("Meetings This Month: 0")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
    expect(state.retries).toBe(6);
  });

  it("shows an honest empty calendar when all registries are loaded and no events exist", () => {
    render(<CombinedDashboardPage />);
    expect(screen.getByText("Meetings This Month: 0")).toBeInTheDocument();
    expect(screen.getByText("Upcoming Deadlines: 0")).toBeInTheDocument();
  });

  it("features the earliest future meeting today instead of a past or later meeting", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 22, 8, 30, 0));
    const today = calendarDateWindows(new Date()).today;
    state.data.meetings = [
      { ...includedMeeting(), id: "later", meeting_title: "Later meeting", meeting_date: today, start_time: "11:00", approval_status: "Published" },
      { ...includedMeeting(), id: "past", meeting_title: "Past meeting", meeting_date: today, start_time: "07:45", approval_status: "Scheduled" },
      { ...includedMeeting(), id: "next", meeting_title: "Next meeting at nine", meeting_date: today, start_time: "09:00", approval_status: "Ready to Start" },
    ];

    const { container } = render(<CombinedDashboardPage />);
    const featured = container.querySelector(".cal-featured");
    expect(featured).toHaveTextContent("Next meeting at nine");
    expect(featured).toHaveTextContent("Starting soon");
    expect(featured).not.toHaveTextContent("Past meeting");
  });

  it("labels a paused meeting from its persisted status instead of calling it live or starting soon", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 22, 8, 30, 0));
    const today = calendarDateWindows(new Date()).today;
    state.data.meetings = [
      { ...includedMeeting(), id: "paused", meeting_title: "Paused meeting", meeting_date: today, start_time: "08:00", approval_status: "On Break" },
    ];

    const { container } = render(<CombinedDashboardPage />);
    const featured = container.querySelector(".cal-featured");
    expect(featured).toHaveTextContent("On break");
    expect(featured).not.toHaveTextContent("Live now");
    expect(featured).not.toHaveTextContent("Starting soon");
  });

  it("keeps on-hold lifecycle language distinct from upcoming and live", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 22, 8, 30, 0));
    const today = calendarDateWindows(new Date()).today;
    state.data.meetings = [
      { ...includedMeeting(), id: "on-hold", meeting_title: "On hold meeting", meeting_date: today, start_time: "08:00", approval_status: "On Hold" },
    ];

    const { container } = render(<CombinedDashboardPage />);
    const featured = container.querySelector(".cal-featured");
    expect(featured).toHaveTextContent("On hold");
    expect(featured).not.toHaveTextContent("Live now");
    expect(featured).not.toHaveTextContent("Starting soon");
  });

  it("keeps the next-seven-days KPI date-based while featured selection filters actual starts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 22, 8, 30, 0));
    const today = calendarDateWindows(new Date()).today;
    state.data.meetings = [
      { ...includedMeeting(), id: "past", meeting_title: "Past meeting", meeting_date: today, start_time: "07:45", approval_status: "Scheduled" },
      { ...includedMeeting(), id: "next", meeting_title: "Next meeting", meeting_date: today, start_time: "09:00", approval_status: "Ready to Start" },
      { ...includedMeeting(), id: "cancelled", meeting_title: "Cancelled meeting", meeting_date: today, start_time: "10:00", approval_status: "Cancelled" },
      { ...includedMeeting(), id: "live", meeting_title: "Live meeting", meeting_date: today, start_time: "08:00", approval_status: "In Progress" },
      { ...includedMeeting(), id: "tomorrow", meeting_title: "Tomorrow meeting", meeting_date: "2026-11-23", start_time: "08:00", approval_status: "Published" },
    ];

    render(<CombinedDashboardPage scope="meetings" title="Meeting Calendar" />);
    expect(screen.getByText("Meetings Next 7 Days: 5")).toBeInTheDocument();
  });
});
