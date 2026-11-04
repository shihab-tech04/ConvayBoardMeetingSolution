import { beforeEach, describe, expect, it, vi } from "vitest";
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
});
