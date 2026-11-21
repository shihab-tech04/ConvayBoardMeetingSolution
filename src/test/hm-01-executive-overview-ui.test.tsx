import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({
  records: {} as Record<string, Record<string, unknown>[]>,
  loading: false,
  error: null as string | null,
  retries: 0,
  navigate: vi.fn(),
}));

vi.mock("react-redux", async importOriginal => {
  const actual = await importOriginal<typeof import("react-redux")>();
  return { ...actual, useSelector: (selector: (state: unknown) => unknown) => selector({ auth: { userId: null } }) };
});
vi.mock("react-router", async importOriginal => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => state.navigate };
});
vi.mock("../app/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "hm01-test-admin", name: "Test Admin", role: "super_admin" }),
}));
vi.mock("../app/hooks/useUserRegistry", () => ({ useUserRegistry: () => ({ users: [] }) }));
vi.mock("../app/hooks/useSettings", () => ({ useSettings: () => ({ themeId: "light-mode" }) }));
vi.mock("../app/actions/useResolvedActions", () => ({
  useResolvedActions: () => ({ resolve: () => [] }),
}));
vi.mock("../app/pages/meetings/LiveMeetingWorkspace", () => ({ LiveMeetingWorkspace: () => null }));
vi.mock("../app/data/boardMeetingData", () => {
  const registry = (name: string) => () => ({
    items: state.records[name] ?? [],
    loading: state.loading,
    error: state.error,
    refresh: async () => { state.retries += 1; },
  });
  return {
    useMeetingRegistry: registry("meetings"),
    useDecisionRegistry: registry("decisions"),
    useActionItemRegistry: registry("actions"),
    useAgendaRegistry: registry("agendas"),
    useBoardPackRegistry: registry("boardPacks"),
    useRSVPRegistry: registry("rsvps"),
    useConflictRegistry: registry("conflicts"),
    useMinutesRegistry: registry("minutes"),
    useResolutionRegistry: registry("resolutions"),
  };
});

import { DashboardPage } from "../app/pages/dashboard/DashboardPage";
import { dashboardCalendarWindow } from "../app/pages/dashboard/dashboardOverviewRules";

beforeEach(() => {
  state.records = {};
  state.loading = false;
  state.error = null;
  state.retries = 0;
  state.navigate.mockClear();
});

describe("HM-01 executive overview renders authoritative registry state", () => {
  it("shows true empty state only after all Supabase registries resolve", () => {
    render(<DashboardPage />);
    expect(screen.getAllByText("No upcoming meetings").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Pending Approvals: 0/ })).toBeInTheDocument();
  });

  it("renders real-looking meeting records and counts only actionable meeting approvals", () => {
    const today = dashboardCalendarWindow(new Date()).today;
    state.records.meetings = [
      {
        id: "hm01-fixture-1", meeting_id: "HM01-001", meeting_title: "Upcoming Governance Board Meeting",
        committee: "Board of Directors", approval_status: "Pending Approval",
        meeting_date: today, start_time: "10:00", mode: "Physical", activity_history: [],
      },
      {
        id: "hm01-fixture-2", meeting_id: "HM01-002", meeting_title: "Minutes Draft Follow-up",
        committee: "Audit Committee", approval_status: "Awaiting Minutes",
        meeting_date: today, start_time: "14:00", mode: "Hybrid", activity_history: [],
      },
    ];
    render(<DashboardPage />);
    expect(screen.getAllByText("Upcoming Governance Board Meeting").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Pending Approvals: 1/ })).toBeInTheDocument();
  });

  it("does not surface a stale In Progress meeting as current or live", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const staleDate = dashboardCalendarWindow(yesterday).today;
    state.records.meetings = [{
      id: "hm06-stale-live", meeting_id: "HM06-STALE", meeting_title: "Stale In Progress Meeting",
      committee: "Audit Committee", approval_status: "In Progress",
      meeting_date: staleDate, start_time: "10:00", mode: "Physical", activity_history: [],
    }];

    render(<DashboardPage />);

    const meetingsCard = screen.getByText("Ongoing & Upcoming Meetings").closest(".dash-compact-card");
    expect(meetingsCard).not.toBeNull();
    expect(meetingsCard?.textContent).not.toContain("Stale In Progress Meeting");
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
  });

  it("shows same-day On Hold as paused instead of live", () => {
    const today = dashboardCalendarWindow(new Date()).today;
    state.records.meetings = [{
      id: "hm06-on-hold", meeting_id: "HM06-HOLD", meeting_title: "Same-day On Hold Meeting",
      committee: "Audit Committee", approval_status: "On Hold",
      meeting_date: today, start_time: "10:00", mode: "Physical", activity_history: [],
    }];

    render(<DashboardPage />);

    expect(screen.getAllByText("Same-day On Hold Meeting").length).toBeGreaterThan(0);
    expect(screen.getByText("Meeting Paused")).toBeInTheDocument();
    expect(screen.getAllByText("On Hold").length).toBeGreaterThan(0);
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Join Live/ })).not.toBeInTheDocument();

    const meetingsCard = screen.getByText("Ongoing & Upcoming Meetings").closest(".dash-compact-card");
    const meetingRow = meetingsCard?.querySelector(".dash-compact-row");
    expect(meetingRow).not.toBeNull();
    fireEvent.click(meetingRow!);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getAllByText("On Hold").length).toBeGreaterThan(0);
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Join Live/ })).not.toBeInTheDocument();
  });

  it("keeps the live-workspace entry for a current paused meeting without claiming it is live", () => {
    const today = dashboardCalendarWindow(new Date()).today;
    state.records.meetings = [{
      id: "hm06-paused", meeting_id: "HM06-PAUSED", meeting_title: "Same-day Paused Meeting",
      committee: "Audit Committee", approval_status: "Paused",
      meeting_date: today, start_time: "10:00", mode: "Physical", activity_history: [],
    }];

    render(<DashboardPage />);
    const meetingsCard = screen.getByText("Ongoing & Upcoming Meetings").closest(".dash-compact-card");
    const meetingRow = meetingsCard?.querySelector(".dash-compact-row");
    expect(meetingRow).not.toBeNull();
    fireEvent.click(meetingRow!);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Join Live/ })).toBeInTheDocument();
    expect(screen.queryByText("LIVE")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Join Live/ }));
    expect(state.navigate).toHaveBeenCalledWith("/meetings/HM06-PAUSED/live");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not show false zero counts while Supabase data is loading", () => {
    state.loading = true;
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: "Loading your overview" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pending Approvals: 0/ })).not.toBeInTheDocument();
  });

  it("explains a failed data read and lets the user retry every source", () => {
    state.error = "Supabase temporarily unavailable";
    render(<DashboardPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Overview data could not be loaded");
    fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
    expect(state.retries).toBe(9);
  });
});
