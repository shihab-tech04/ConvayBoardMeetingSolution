import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { calendarDateWindows } from "../app/pages/dashboard/calendarDateWindows";

const state = vi.hoisted(() => ({
  user: { name: "Ann", role: "Board Member", designation: "" },
  data: {} as Record<string, Record<string, unknown>[]>,
  errors: {} as Record<string, string | null>,
  loadingNames: [] as string[],
  retries: [] as string[],
  navigate: vi.fn(),
}));

vi.mock("react-router", async original => {
  const mod = await original<typeof import("react-router")>();
  return { ...mod, useNavigate: () => state.navigate };
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
    loading: state.loadingNames.includes(name),
    error: state.errors[name] ?? null,
    refresh: async () => { state.retries.push(name); },
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

import { OfflineReturnRegisterPage } from "../app/pages/return-register/OfflineReturnRegisterPage";
import { CombinedDashboardPage } from "../app/pages/dashboard/CombinedDashboardPage";

const today = () => calendarDateWindows(new Date()).today;
const meeting = (id: string, title: string, chairperson: string) => ({
  id, meeting_id: id, meeting_title: title, chairperson,
  meeting_date: today(), start_time: "10:00",
  approval_status: "Approved", mode: "Physical",
});

beforeEach(() => {
  state.user = { name: "Ann", role: "Board Member", designation: "" };
  state.data = {};
  state.errors = {};
  state.loadingNames = [];
  state.retries = [];
  state.navigate.mockClear();
});

describe("MT-02 governance-wide Meeting Calendar", () => {
  it("shows all Supabase-visible meetings in Month view, including other people's meetings", () => {
    state.data.meetings = [
      meeting("MTG-01", "Ann's Board Session", "Ann"),
      meeting("MTG-02", "Other Committee Meeting", "Someone Else"),
    ];
    render(<OfflineReturnRegisterPage />);
    expect(screen.getByRole("heading", { name: "Meeting Calendar" })).toBeInTheDocument();
    expect(screen.getByTestId("calendar-view-mode")).toHaveTextContent("month");
    expect(screen.getAllByText("Other Committee Meeting").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ann's Board Session").length).toBeGreaterThan(0);
    expect(screen.getByText("Meetings Next 7 Days: 2")).toBeInTheDocument();
  });

  it("does not mix personal action deadlines into the governance-wide calendar", () => {
    state.data.meetings = [meeting("MTG-02", "Committee Meeting", "Someone Else")];
    state.data.actions = [{
      id: "task1", action_title: "Ann Private Action", due_date: today(),
      implementation_status: "Pending", assigned_to: "Ann",
    }];
    render(<OfflineReturnRegisterPage />);
    expect(screen.queryByText("Ann Private Action")).not.toBeInTheDocument();
    expect(screen.queryByText(/Upcoming Deadlines:/)).not.toBeInTheDocument();
    expect(screen.getByText("Meetings Next 7 Days: 1")).toBeInTheDocument();
  });

  it("preserves the existing personal calendar identity filter and deadlines", () => {
    state.data.meetings = [
      meeting("MTG-01", "Ann's Personal Session", "Ann"),
      meeting("MTG-02", "Someone Else's Meeting", "Someone Else"),
    ];
    state.data.actions = [{
      id: "task1", action_title: "Ann Private Action", due_date: today(),
      implementation_status: "Pending", assigned_to: "Ann",
    }];
    render(<CombinedDashboardPage />);
    expect(screen.queryByText("Someone Else's Meeting")).not.toBeInTheDocument();
    expect(screen.getAllByText("Ann's Personal Session").length).toBeGreaterThan(0);
    expect(screen.getByText("Upcoming Deadlines: 1")).toBeInTheDocument();
    expect(screen.getByTestId("calendar-view-mode")).toHaveTextContent("week");
  });

  it("ignores an unrelated personal registry failure in Meeting Calendar mode", () => {
    state.errors.actions = "Personal action registry unavailable";
    state.data.meetings = [meeting("MTG-02", "Meeting Still Available", "Someone Else")];
    render(<OfflineReturnRegisterPage />);
    expect(screen.getAllByText("Meeting Still Available").length).toBeGreaterThan(0);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("blocks an empty-looking calendar after the meeting SQL registry fails and retries only that source", () => {
    state.errors.meetings = "Meeting query failed";
    render(<OfflineReturnRegisterPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Meeting records could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
    expect(state.retries).toEqual(["meetings"]);
    expect(screen.queryByText("Meetings This Month: 0")).not.toBeInTheDocument();
  });

  it("does not display false empty counts while meetings are loading", () => {
    state.loadingNames = ["meetings"];
    render(<OfflineReturnRegisterPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading the board and committee meeting calendar");
    expect(screen.queryByText("Meetings This Month: 0")).not.toBeInTheDocument();
  });

  it("navigates from a meeting on the calendar to its existing meeting workflow", () => {
    state.data.meetings = [meeting("MTG-02", "Review Board Meeting", "Someone Else")];
    render(<OfflineReturnRegisterPage />);
    fireEvent.click(screen.getAllByText("Review Board Meeting")[0]);
    expect(state.navigate).toHaveBeenCalledWith("/meetings/MTG-02/record");
  });
});
