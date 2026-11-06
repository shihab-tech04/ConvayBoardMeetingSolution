import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { PageCfg, TableRow } from "../app/pages/modulePageUtils";
import { resolveMeetingActions } from "../app/actions/resolvers/meetingActions";
import type { ActionContext, MeetingRole } from "../app/actions/types";
import { actionGranted, filterActionsByAccess } from "../app/services/supabase/actionPermissions";
import { convayAuth } from "../app/services/supabase/convayAuth";

const state = vi.hoisted(() => ({
  access: {
    loaded: true,
    error: null,
    is_super_admin: false,
    effective_permissions: ["mtg_cancel"],
    user_role_ids: [],
    roles: [],
    permissions: [],
    user_assignments: [],
  },
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

vi.mock("sonner", () => ({ toast: state.toast }));
vi.mock("../app/services/supabase/convayAccess", () => ({
  useAccessSnapshot: () => state.access,
  readAccessSnapshot: () => state.access,
  hasAccess: (permission: string, access = state.access) => Boolean(
    access.loaded && (access.is_super_admin || access.effective_permissions.includes(permission)),
  ),
}));
vi.mock("../app/components/tables", () => ({
  UnifiedDataTable: ({ rows, onViewRow }: { rows: TableRow[]; onViewRow: (row: TableRow) => void }) => (
    <div>{rows.map(row => (
      <button key={String(row.id)} type="button" onClick={() => onViewRow(row)}>{`Open ${String(row.id)}`}</button>
    ))}</div>
  ),
}));
vi.mock("../app/components/drawers/DynamicDetailsDrawer", () => ({
  DynamicDetailsDrawer: ({ open, rowData, extraFooterActions }: {
    open: boolean; rowData: TableRow | null; extraFooterActions?: React.ReactNode;
  }) => open && rowData ? <section data-testid="details-drawer">
    <p>{String(rowData.approval_status ?? rowData.status ?? "")}</p>{extraFooterActions}
  </section> : null,
}));
vi.mock("../app/components/modals/AppModal", () => ({
  AppModal: ({ open, title, children, footer }: {
    open: boolean; title: string; children?: React.ReactNode; footer?: React.ReactNode;
  }) => open ? <section role="dialog" aria-label={title}><h2>{title}</h2>{children}{footer}</section> : null,
}));
vi.mock("../app/components/buttons/SecondaryButton", () => ({
  SecondaryButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>{children}</button>
  ),
}));
vi.mock("../app/components/forms/AppTextArea", () => ({
  AppTextArea: ({ id, label, value, error, disabled, onChange }: {
    id: string; label: string; value: string; error?: string; disabled?: boolean; onChange: (value: string) => void;
  }) => <label htmlFor={id}>{label}<textarea id={id} value={value} disabled={disabled}
    onChange={event => onChange(event.target.value)} />{error && <span role="alert">{error}</span>}</label>,
}));
vi.mock("../app/components/cards/CollapsibleKpiSection", () => ({ CollapsibleKpiSection: () => null }));
vi.mock("../app/components/modals/SConfirmModal", () => ({ SConfirmModal: () => null }));
vi.mock("../app/components/buttons/Button", () => ({ Button: () => null }));
vi.mock("../app/components/buttons/PrimaryButton", () => ({ PrimaryButton: () => null }));

import { GeneratedTablePage } from "../app/components/pages/GeneratedTablePage";

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
function setupSession() {
  sessionStorage.setItem("convay.supabase.session.v1", JSON.stringify({
    accessToken: "unit-test-access-token",
    refreshToken: "unit-test-refresh-token",
    userId: "f12dd5ac-7389-4de7-9f4c-e4f1c0d07235",
    expiresAt: Date.now() + 60 * 60 * 1000,
  }));
}
function context(status: string, role: MeetingRole = "organizer"): ActionContext {
  return {
    entity: "meeting",
    record: {
      id: "MTG-MT25",
      meeting_id: "MTG-MT25",
      approval_status: status,
      organizer_user_id: "mt25-organizer",
      chairperson_user_id: "mt25-host",
      meeting_date: "2026-12-10",
      start_time: "10:00",
    },
    currentUser: { id: "mt25-organizer", name: "Organizer" },
    userRole: "Meeting Organizer",
    meetingRoles: [role],
    permissions: ["mtg_view", "mtg_cancel", "mtg_update"],
    now: new Date("2026-12-01T12:00:00.000Z"),
  };
}
function config(overrides: Partial<PageCfg> = {}): PageCfg {
  return {
    title: "Meetings",
    desc: "MT-25 cancellation acceptance",
    cols: [],
    filters: [],
    actions: [],
    drawerActions: [{ id: "cancel", label: "Cancel Meeting", icon: () => null }],
    rows: [{ id: "MTG-MT25", meeting_id: "MTG-MT25", approval_status: "Scheduled" }],
    cancelPermission: "mtg_cancel",
    onCancelRecord: async () => true,
    ...overrides,
  };
}
function renderPage(cfg: PageCfg) {
  return render(<MemoryRouter><GeneratedTablePage cfg={cfg} /></MemoryRouter>);
}
function openCancel() {
  fireEvent.click(screen.getByRole("button", { name: "Open MTG-MT25" }));
  fireEvent.click(screen.getByRole("button", { name: "Cancel Meeting" }));
}
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  state.access = {
    loaded: true,
    error: null,
    is_super_admin: false,
    effective_permissions: ["mtg_cancel"],
    user_role_ids: [],
    roles: [],
    permissions: [],
    user_assignments: [],
  };
  state.toast.success.mockReset();
  state.toast.error.mockReset();
  state.toast.info.mockReset();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
afterEach(() => vi.restoreAllMocks());

describe("MT-25 controlled cancellation", () => {
  it("shows cancel only to assigned leadership in supported meeting statuses and requires confirmation and a reason", () => {
    for (const status of ["Scheduled", "Rescheduled", "Published", "Ready to Start"]) {
      const actions = resolveMeetingActions(context(status));
      const cancel = actions.find(action => action.id === "cancel");
      expect(cancel?.visible).toBe(true);
      expect(cancel?.requiresConfirmation).toBe(true);
      expect(cancel?.requiresReason).toBe(true);
      expect(resolveMeetingActions(context(status, "viewer")).some(action => action.visible && action.id === "cancel"))
        .toBe(false);
    }
    expect(actionGranted("meeting", "cancel", ["mtg_update"], false)).toBe(false);
    expect(actionGranted("meeting", "cancel", ["mtg_cancel"], false)).toBe(true);
    expect(filterActionsByAccess("meeting", resolveMeetingActions(context("Scheduled")), ["mtg_update"], false)
      .some(action => action.id === "cancel")).toBe(false);
  });

  it("keeps the confirmation open until the reason and server write are confirmed", async () => {
    state.access.effective_permissions = ["mtg_cancel"];
    let confirmWrite!: (value: boolean) => void;
    const save = vi.fn(() => new Promise<boolean>(resolve => { confirmWrite = resolve; }));
    renderPage(config({ onCancelRecord: save }));

    openCancel();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Cancellation" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Please provide a reason (at least 5 characters)");

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "  Meeting date changed.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Cancellation" }));
    expect(save).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledWith("MTG-MT25", "Meeting date changed.");
    expect(screen.getByRole("dialog", { name: "Cancel Meetings" })).toBeInTheDocument();
    expect(state.toast.success).not.toHaveBeenCalled();

    confirmWrite(true);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Cancel Meetings" })).not.toBeInTheDocument());
    expect(state.toast.success).toHaveBeenCalledWith("Meeting cancelled.");
  });

  it("denies the modal write when only mtg_update is granted", async () => {
    state.access.effective_permissions = ["mtg_update"];
    const save = vi.fn(async () => true);
    renderPage(config({ onCancelRecord: save }));
    openCancel();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Schedule change" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Cancellation" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission to cancel this meeting.");
  });

  it("sends a trimmed reason to the dedicated RPC and requires the persisted cancellation metadata", async () => {
    setupSession();
    const cancelled = {
      id: "MTG-MT25",
      status: "Cancelled",
      approval_status: "Cancelled",
      cancellation_reason: "Owner requested cancellation.",
      cancelled_by: "f12dd5ac-7389-4de7-9f4c-e4f1c0d07235",
      cancelled_at: "2026-11-06T07:00:00.000Z",
    };
    const fetchMock = vi.fn(async () => json(cancelled));
    vi.stubGlobal("fetch", fetchMock);

    const result = await convayAuth.cancelMeeting(" MTG-MT25 ", " Owner requested cancellation. ");
    expect(result).toEqual(cancelled);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://cnrueblhgvdonplirlhv.supabase.co/rest/v1/rpc/convay_cancel_meeting",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer unit-test-access-token" }),
        body: JSON.stringify({
          p_record_id: "MTG-MT25",
          p_cancellation_reason: "Owner requested cancellation.",
        }),
      }),
    );
  });

  it("rejects missing IDs and short reasons before contacting Supabase", async () => {
    setupSession();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(convayAuth.cancelMeeting("  ", "Please cancel")).rejects.toThrow("A meeting ID is required");
    await expect(convayAuth.cancelMeeting("MTG-MT25", "No")).rejects.toThrow("at least 5 characters");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces denied SQL writes and rejects an unconfirmed state", async () => {
    setupSession();
    vi.stubGlobal("fetch", vi.fn(async () => json({ message: "Meeting cancellation permission required" }, 403)));
    await expect(convayAuth.cancelMeeting("MTG-MT25", "Schedule changed"))
      .rejects.toThrow("Meeting cancellation permission required");

    vi.stubGlobal("fetch", vi.fn(async () => json({
      id: "MTG-MT25",
      status: "Scheduled",
      approval_status: "Scheduled",
      cancellation_reason: "Schedule changed",
      cancelled_by: "user-id",
      cancelled_at: "2026-11-06T07:00:00.000Z",
    })));
    await expect(convayAuth.cancelMeeting("MTG-MT25", "Schedule changed"))
      .rejects.toThrow("Supabase did not confirm the meeting cancellation");
  });
});
