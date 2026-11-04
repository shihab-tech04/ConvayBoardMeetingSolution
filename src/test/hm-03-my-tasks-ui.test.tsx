import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({
  user: { name: "Ann", role: "user", designation: "" },
  data: {} as Record<string, Record<string, unknown>[]>,
  loading: false,
  error: null as string | null,
  refreshes: 0,
}));
vi.mock("react-router", async original => {
  const mod = await original<typeof import("react-router")>();
  return { ...mod, useNavigate: () => () => undefined };
});
vi.mock("../app/hooks/useCurrentUser", () => ({
  useCurrentUser: () => state.user,
}));
vi.mock("../app/components/tables/UnifiedDataTable", () => ({
  UnifiedDataTable: ({ rows }: { rows: Array<{ id: string; title: string }> }) => (
    <section data-testid="visible-task-queue">
      {rows.map(row => <p key={row.id}>{row.title}</p>)}
    </section>
  ),
}));
vi.mock("../app/components/cards/StatCard", () => ({
  StatCard: ({ label, value }: { label: string; value: string }) => (
    <p>{label}: {value}</p>
  ),
}));
vi.mock("../app/components/drawers/DynamicDetailsDrawer", () => ({
  DynamicDetailsDrawer: () => null,
}));
vi.mock("../app/data/boardMeetingData", () => {
  const registry = (name: string) => () => ({
    items: state.data[name] ?? [],
    loading: state.loading,
    error: state.error,
    refresh: async () => { state.refreshes++; },
  });
  return {
    useMeetingRegistry: registry("meetings"),
    useAgendaRegistry: registry("agendas"),
    useBoardPackRegistry: registry("boardPacks"),
    useRSVPRegistry: registry("rsvps"),
    useConflictRegistry: registry("conflicts"),
    useMinutesRegistry: registry("minutes"),
    useActionItemRegistry: registry("actions"),
    useDocumentRegistry: registry("documents"),
  };
});
vi.mock("../app/data/documentWorkspaceData", () => ({
  useDocumentAcknowledgementRegistry: () => ({
    items: state.data.acks ?? [],
    loading: state.loading,
    error: state.error,
    refresh: async () => { state.refreshes++; },
  }),
}));

import { PSRDashboardPage } from "../app/pages/dashboard/PSRDashboardPage";

beforeEach(() => {
  state.user = { name: "Ann", role: "user", designation: "" };
  state.data = {};
  state.loading = false;
  state.error = null;
  state.refreshes = 0;
});

describe("HM-03 My Tasks screen", () => {
  it("does not list Anna's tasks for Ann", () => {
    state.data.actions = [{
      id: "a1", action_title: "Private assignment for Anna",
      assigned_to: "Anna", implementation_status: "In Progress",
    }];
    render(<PSRDashboardPage />);
    expect(screen.queryByText("Private assignment for Anna")).not.toBeInTheDocument();
    expect(screen.getByText("Open: 0")).toBeInTheDocument();
  });

  it("includes tasks explicitly assigned to the current user", () => {
    state.data.actions = [{
      id: "a2", action_title: "Ann's assigned follow-up",
      assigned_to: "Ann", implementation_status: "In Progress",
    }];
    render(<PSRDashboardPage />);
    expect(screen.getByText("Ann's assigned follow-up")).toBeInTheDocument();
    expect(screen.getByText("Open: 1")).toBeInTheDocument();
  });

  it("does not place an Admin assignment in a Secretary's task queue", () => {
    state.user = { name: "Anne", role: "company_secretary", designation: "Company Secretary" };
    state.data.actions = [{
      id: "a3", action_title: "Admin-only assignment",
      assigned_to: "Admin", implementation_status: "In Progress",
    }];
    render(<PSRDashboardPage />);
    expect(screen.queryByText("Admin-only assignment")).not.toBeInTheDocument();
  });

  it("marks meeting minutes preparation as a review task instead of an approval", () => {
    state.data.meetings = [{
      id: "m1", meeting_title: "Quarterly Meeting",
      approval_status: "Awaiting Minutes", secretary: "Ann",
    }];
    render(<PSRDashboardPage />);
    expect(screen.getByText("Prepare meeting minutes")).toBeInTheDocument();
  });

  it("blocks misleading empty results and gives an actionable retry on SQL failure", () => {
    state.error = "Registry read denied";
    render(<PSRDashboardPage />);
    expect(screen.getByRole("alert")).toHaveTextContent("Tasks could not be loaded");
    expect(screen.queryByText("Open: 0")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry loading" }));
    expect(state.refreshes).toBe(9);
  });

  it("announces loading instead of claiming no tasks", () => {
    state.loading = true;
    render(<PSRDashboardPage />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading your assigned tasks");
    expect(screen.queryByText("Open: 0")).not.toBeInTheDocument();
  });
});
