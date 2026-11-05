import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { PageCfg, TableRow } from "../app/pages/modulePageUtils";

const state = vi.hoisted(() => ({
  access: {
    loaded: true,
    error: null,
    is_super_admin: false,
    effective_permissions: ["mtg_approve"],
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
    <div>
      {rows.map(row => (
        <button key={String(row.id)} type="button" onClick={() => onViewRow(row)}>
          {`Open ${String(row.id)}`}
        </button>
      ))}
    </div>
  ),
}));
vi.mock("../app/components/drawers/DynamicDetailsDrawer", () => ({
  DynamicDetailsDrawer: ({ open, rowData, extraFooterActions }: {
    open: boolean; rowData: TableRow | null; extraFooterActions?: React.ReactNode;
  }) => open && rowData ? (
    <section data-testid="details-drawer">
      <p>{String(rowData.approval_status ?? rowData.status ?? "")}</p>
      {rowData.revision_instructions && <p>{String(rowData.revision_instructions)}</p>}
      {extraFooterActions}
    </section>
  ) : null,
}));
vi.mock("../app/components/modals/AppModal", () => ({
  AppModal: ({ open, title, children, footer }: {
    open: boolean; title: string; children?: React.ReactNode; footer?: React.ReactNode;
  }) => open ? (
    <section role="dialog" aria-label={title}>
      <h2>{title}</h2>
      {children}
      {footer}
    </section>
  ) : null,
}));
vi.mock("../app/components/buttons/SecondaryButton", () => ({
  SecondaryButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>{children}</button>
  ),
}));
vi.mock("../app/components/forms/AppTextArea", () => ({
  AppTextArea: ({ id, label, value, error, disabled, onChange }: {
    id: string; label: string; value: string; error?: string; disabled?: boolean; onChange: (value: string) => void;
  }) => (
    <label htmlFor={id}>{label}<textarea id={id} value={value} disabled={disabled} onChange={event => onChange(event.target.value)} />{error && <span role="alert">{error}</span>}</label>
  ),
}));
vi.mock("../app/components/cards/CollapsibleKpiSection", () => ({ CollapsibleKpiSection: () => null }));
vi.mock("../app/components/modals/SConfirmModal", () => ({ SConfirmModal: () => null }));
vi.mock("../app/components/buttons/Button", () => ({ Button: () => null }));
vi.mock("../app/components/buttons/PrimaryButton", () => ({ PrimaryButton: () => null }));

import { GeneratedTablePage } from "../app/components/pages/GeneratedTablePage";

const initialRecord: TableRow = { id: "record-1", approval_status: "Pending" };
const rejectionAction = { id: "reject", label: "Reject Record", icon: () => null };
const revisionAction = { id: "request_revision", label: "Request Revision", icon: () => null };

function config(overrides: Partial<PageCfg> = {}): PageCfg {
  return {
    title: "Records",
    desc: "Approval tests",
    cols: [],
    filters: [],
    actions: [],
    drawerActions: [{ id: "approve", label: "Approve Record", icon: () => null }],
    rows: [{ ...initialRecord }],
    approvalPermission: "mtg_approve",
    approvalStatusField: "approval_status",
    ...overrides,
  };
}

function renderPage(cfg: PageCfg) {
  return render(<MemoryRouter><GeneratedTablePage cfg={cfg} /></MemoryRouter>);
}

async function openApproval() {
  fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));
  fireEvent.click(screen.getByRole("button", { name: "Approve Record" }));
  return screen.findByRole("dialog", { name: "Approve Record" });
}

async function openRejection() {
  fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));
  fireEvent.click(screen.getByRole("button", { name: "Reject Record" }));
  return screen.findByRole("dialog", { name: "Reject Record" });
}

function revisionConfig(overrides: Partial<PageCfg> = {}) {
  return config({
    drawerActions: [revisionAction],
    requestRevisionPermission: "mtg_approve",
    requestRevisionStatusField: "approval_status",
    ...overrides,
  });
}

async function openRevisionRequest() {
  fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));
  fireEvent.click(screen.getByRole("button", { name: "Request Revision" }));
  return screen.findByRole("dialog", { name: "Request Revision — Record" });
}

function enterRevisionInstructions(instructions = "Please correct the submitted meeting agenda.") {
  fireEvent.change(screen.getByLabelText("Revision Instructions *"), { target: { value: instructions } });
}

function enterRejectionReason(reason = "Needs changes") {
  fireEvent.change(screen.getByLabelText("Rejection Reason *"), { target: { value: reason } });
}

beforeEach(() => {
  state.access = {
    loaded: true,
    error: null,
    is_super_admin: false,
    effective_permissions: ["mtg_approve", "mtg_reject"],
    user_role_ids: [],
    roles: [],
    permissions: [],
    user_assignments: [],
  };
  state.toast.success.mockReset();
  state.toast.error.mockReset();
  state.toast.info.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("GeneratedTablePage shared Approve Record", () => {
  it("uses the confirmed SQL approval flow for meeting actions even when other actions are custom", async () => {
    let confirmWrite!: (value: true) => void;
    const save = vi.fn(() => new Promise<true>(resolve => { confirmWrite = resolve; }));
    const customAction = vi.fn();
    renderPage(config({
      onCustomAction: customAction,
      drawerActions: [],
      drawerActionsResolver: () => [{
        id: "approve",
        label: "Approve Meeting Request",
        icon: () => null,
        enabled: true,
      }],
      onApproveRecord: save,
    }));

    fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));
    fireEvent.click(screen.getByRole("button", { name: "Approve Meeting Request" }));
    expect(screen.getByRole("dialog", { name: "Approve Record" })).toBeInTheDocument();
    expect(customAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    expect(save).toHaveBeenCalledWith("record-1", {
      approval_status: "Approved",
      approval_remark: "",
    });
    expect(screen.getByRole("dialog", { name: "Approve Record" })).toBeInTheDocument();
    expect(state.toast.success).not.toHaveBeenCalled();

    confirmWrite(true);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Approve Record" })).not.toBeInTheDocument());
    expect(state.toast.success).toHaveBeenCalledWith("Record approved.");
    expect(customAction).not.toHaveBeenCalled();
  });

  it("waits for a confirmed SQL write before closing or reporting success", async () => {
    let confirmWrite!: (value: true) => void;
    const save = vi.fn(() => new Promise<true>(resolve => { confirmWrite = resolve; }));
    renderPage(config({ onApproveRecord: save }));
    await openApproval();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(save).toHaveBeenCalledWith("record-1", {
      approval_status: "Approved",
      approval_remark: "",
    });
    expect(screen.getByRole("button", { name: "Approving…" })).toBeDisabled();
    expect(screen.getByRole("dialog", { name: "Approve Record" })).toBeInTheDocument();
    expect(state.toast.success).not.toHaveBeenCalled();

    confirmWrite(true);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Approve Record" })).not.toBeInTheDocument());
    expect(state.toast.success).toHaveBeenCalledWith("Record approved.");
    expect(state.toast.error).not.toHaveBeenCalled();
  });

  it("keeps the record pending and the dialog open when SQL rejects the write", async () => {
    const save = vi.fn().mockRejectedValue(new Error("permission denied by row-level security"));
    renderPage(config({ onApproveRecord: save }));
    await openApproval();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(state.toast.error).toHaveBeenCalledWith("permission denied by row-level security"));
    expect(screen.getByRole("dialog", { name: "Approve Record" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("Pending");
    expect(state.toast.success).not.toHaveBeenCalled();
  });

  it("does not treat a missing server acknowledgement as a successful save", async () => {
    const save = vi.fn().mockResolvedValue(undefined) as unknown as NonNullable<PageCfg["onApproveRecord"]>;
    renderPage(config({ onApproveRecord: save }));
    await openApproval();
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    await waitFor(() => expect(state.toast.error).toHaveBeenCalledWith(
      "Supabase did not confirm the approval. No success was reported.",
    ));
    expect(screen.getByRole("dialog", { name: "Approve Record" })).toBeInTheDocument();
    expect(state.toast.success).not.toHaveBeenCalled();
  });

  it("denies approval when the server permission snapshot lacks the configured grant", () => {
    state.access.effective_permissions = ["meeting_view"];
    const save = vi.fn().mockResolvedValue(true);
    renderPage(config({ onApproveRecord: save }));
    fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));

    const approveButton = screen.getByRole("button", { name: "Approve Record" });
    expect(approveButton).toBeDisabled();
    expect(approveButton).toHaveAttribute("title", "You do not have permission to approve this record.");
    fireEvent.click(approveButton);
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Approve Record" })).not.toBeInTheDocument();
  });

  it("prevents duplicate submits and reloads the persisted approved status", async () => {
    let persisted = { ...initialRecord };
    let confirmWrite!: (value: true) => void;
    const save = vi.fn((_id: string, patch: Record<string, unknown>) => new Promise<true>(resolve => {
      confirmWrite = value => {
        persisted = { ...persisted, ...patch };
        resolve(value);
      };
    }));
    const view = renderPage(config({ onApproveRecord: save }));
    await openApproval();
    const approveButton = screen.getByRole("button", { name: "Approve" });
    fireEvent.click(approveButton);
    fireEvent.click(approveButton);
    expect(save).toHaveBeenCalledOnce();

    confirmWrite(true);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Approve Record" })).not.toBeInTheDocument());
    view.unmount();

    renderPage(config({ rows: [{ ...persisted }], onApproveRecord: save }));
    fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("Approved");
  });
});

describe("GeneratedTablePage shared Reject Record", () => {
  const rejectionConfig = (overrides: Partial<PageCfg> = {}) => config({
    title: "Records",
    drawerActions: [rejectionAction],
    rejectionPermission: "mtg_reject",
    rejectionStatusField: "approval_status",
    ...overrides,
  });

  it("waits for confirmed persistence before closing or reporting success", async () => {
    let confirmWrite!: (value: true) => void;
    const save = vi.fn(() => new Promise<true>(resolve => { confirmWrite = resolve; }));
    renderPage(rejectionConfig({ onRejectRecord: save }));
    await openRejection();
    enterRejectionReason();
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    expect(save).toHaveBeenCalledWith("record-1", {
      approval_status: "Rejected",
      rejection_reason: "Needs changes",
    });
    expect(screen.getByRole("button", { name: "Rejecting…" })).toBeDisabled();
    expect(screen.getByRole("dialog", { name: "Reject Record" })).toBeInTheDocument();
    expect(state.toast.success).not.toHaveBeenCalled();

    confirmWrite(true);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reject Record" })).not.toBeInTheDocument());
    expect(state.toast.success).toHaveBeenCalledWith("Record rejected.");
    expect(state.toast.error).not.toHaveBeenCalled();
  });

  it("uses the shared reason dialog when a module also has custom actions", async () => {
    const customAction = vi.fn();
    const save = vi.fn().mockResolvedValue(true);
    renderPage(rejectionConfig({
      onCustomAction: customAction,
      onRejectRecord: save,
      rejectionPermission: "mtg_approve",
    }));
    await openRejection();
    enterRejectionReason("The request is missing agenda documents.");
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reject Record" })).not.toBeInTheDocument());
    expect(save).toHaveBeenCalledWith("record-1", {
      approval_status: "Rejected",
      rejection_reason: "The request is missing agenda documents.",
    });
    expect(customAction).not.toHaveBeenCalled();
    expect(state.toast.success).toHaveBeenCalledWith("Record rejected.");
  });

  it("keeps the row pending and dialog open when the SQL write is rejected", async () => {
    const save = vi.fn().mockRejectedValue(new Error("permission denied by row-level security"));
    renderPage(rejectionConfig({ onRejectRecord: save }));
    await openRejection();
    enterRejectionReason();
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(state.toast.error).toHaveBeenCalledWith("permission denied by row-level security"));
    expect(screen.getByRole("dialog", { name: "Reject Record" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("Pending");
    expect(state.toast.success).not.toHaveBeenCalled();
  });

  it("denies rejection if the configured permission is absent", () => {
    state.access.effective_permissions = ["mtg_approve"];
    const save = vi.fn().mockResolvedValue(true);
    renderPage(rejectionConfig({ onRejectRecord: save }));
    fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));

    const rejectButton = screen.getByRole("button", { name: "Reject Record" });
    expect(rejectButton).toBeDisabled();
    expect(rejectButton).toHaveAttribute("title", "You do not have permission to reject this record.");
    fireEvent.click(rejectButton);
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Reject Record" })).not.toBeInTheDocument();
  });

  it("prevents duplicate submits and shows the persisted rejection after remount", async () => {
    let persisted = { ...initialRecord };
    let confirmWrite!: (value: true) => void;
    const save = vi.fn((_id: string, patch: Record<string, unknown>) => new Promise<true>(resolve => {
      confirmWrite = value => {
        persisted = { ...persisted, ...patch };
        resolve(value);
      };
    }));
    const view = renderPage(rejectionConfig({ onRejectRecord: save }));
    await openRejection();
    enterRejectionReason();
    const rejectButton = screen.getByRole("button", { name: "Reject" });
    fireEvent.click(rejectButton);
    fireEvent.click(rejectButton);
    expect(save).toHaveBeenCalledOnce();

    confirmWrite(true);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Reject Record" })).not.toBeInTheDocument());
    view.unmount();

    renderPage(rejectionConfig({ rows: [{ ...persisted }], onRejectRecord: save }));
    fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("Rejected");
    expect(screen.getByRole("button", { name: "Reject Record" })).toBeDisabled();
  });
});

describe("GeneratedTablePage shared Request Revision", () => {
  it("waits for confirmed persistence before updating status or reporting success", async () => {
    let confirmWrite!: (value: boolean) => void;
    const save = vi.fn((_id: string, _instructions: string) => new Promise<boolean>(resolve => {
      confirmWrite = resolve;
    }));
    renderPage(revisionConfig({ onRequestRevision: save }));
    await openRevisionRequest();
    enterRevisionInstructions();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Request Revision — Record" }))
      .getByRole("button", { name: "Request Revision" }));

    expect(save).toHaveBeenCalledWith("record-1", "Please correct the submitted meeting agenda.");
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
    expect(screen.getByRole("dialog", { name: "Request Revision — Record" })).toBeInTheDocument();
    expect(state.toast.success).not.toHaveBeenCalled();
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("Pending");

    confirmWrite(true);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Request Revision — Record" })).not.toBeInTheDocument());
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("Revision Requested");
    expect(state.toast.success).toHaveBeenCalledWith("Revision requested");
    expect(state.toast.error).not.toHaveBeenCalled();
  });

  it("keeps the modal and pending row unchanged after a rejected write, then allows retry", async () => {
    const save = vi.fn()
      .mockRejectedValueOnce(new Error("permission denied by row-level security"))
      .mockResolvedValueOnce(true);
    renderPage(revisionConfig({ onRequestRevision: save }));
    await openRevisionRequest();
    enterRevisionInstructions();
    const dialog = screen.getByRole("dialog", { name: "Request Revision — Record" });
    const submit = () => fireEvent.click(within(dialog).getByRole("button", { name: "Request Revision" }));
    submit();

    await waitFor(() => expect(state.toast.error).toHaveBeenCalledWith("permission denied by row-level security"));
    expect(screen.getByRole("dialog", { name: "Request Revision — Record" })).toBeInTheDocument();
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("Pending");
    expect(screen.getByRole("textbox", { name: /Revision Instructions/ })).toHaveValue("Please correct the submitted meeting agenda.");

    submit();
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Request Revision — Record" })).not.toBeInTheDocument());
    expect(save).toHaveBeenCalledTimes(2);
    expect(state.toast.success).toHaveBeenCalledWith("Revision requested");
  });

  it("denies users without mtg_approve before calling persistence", async () => {
    state.access.effective_permissions = ["mtg_view"];
    const save = vi.fn().mockResolvedValue(true);
    renderPage(revisionConfig({ onRequestRevision: save }));
    fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));
    const action = screen.getByRole("button", { name: "Request Revision" });
    expect(action).toBeDisabled();
    expect(action).toHaveAttribute("title", "You do not have permission to request a revision.");
    fireEvent.click(action);
    expect(save).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "Request Revision — Record" })).not.toBeInTheDocument();
  });

  it("prevents duplicate submits and renders the saved instructions after a refresh", async () => {
    let confirmWrite!: (value: boolean) => void;
    let persisted = { ...initialRecord };
    const save = vi.fn((_id: string, instructions: string) => new Promise<boolean>(resolve => {
      confirmWrite = value => {
        if (value) persisted = { ...persisted, approval_status: "Revision Requested", status: "Revision Requested", revision_instructions: instructions };
        resolve(value);
      };
    }));
    const view = renderPage(revisionConfig({ onRequestRevision: save }));
    await openRevisionRequest();
    enterRevisionInstructions();
    const submit = within(screen.getByRole("dialog", { name: "Request Revision — Record" }))
      .getByRole("button", { name: "Request Revision" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(save).toHaveBeenCalledOnce();

    confirmWrite(true);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Request Revision — Record" })).not.toBeInTheDocument());
    view.unmount();

    renderPage(revisionConfig({ rows: [persisted], onRequestRevision: save }));
    fireEvent.click(screen.getByRole("button", { name: "Open record-1" }));
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("Revision Requested");
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("Please correct the submitted meeting agenda.");
  });

  it("rejects instructions shorter than ten characters without calling SQL", async () => {
    const save = vi.fn().mockResolvedValue(true);
    renderPage(revisionConfig({ onRequestRevision: save }));
    await openRevisionRequest();
    enterRevisionInstructions("Too short");
    fireEvent.click(within(screen.getByRole("dialog", { name: "Request Revision — Record" }))
      .getByRole("button", { name: "Request Revision" }));

    expect(await screen.findByText("Please provide revision instructions (at least 10 characters)")).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    expect(state.toast.success).not.toHaveBeenCalled();
  });

  it("does not report a local-only success when no SQL callback is configured", async () => {
    renderPage(revisionConfig());
    await openRevisionRequest();
    enterRevisionInstructions();
    fireEvent.click(within(screen.getByRole("dialog", { name: "Request Revision — Record" }))
      .getByRole("button", { name: "Request Revision" }));

    expect(await screen.findByText("Revision requests are not connected to SQL for this module.")).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Request Revision — Record" })).toBeInTheDocument();
    expect(screen.getByTestId("details-drawer")).toHaveTextContent("Pending");
    expect(state.toast.success).not.toHaveBeenCalled();
  });
});
