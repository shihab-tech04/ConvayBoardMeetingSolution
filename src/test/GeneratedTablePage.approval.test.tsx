import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  AppTextArea: ({ id, label, value, onChange }: {
    id: string; label: string; value: string; onChange: (value: string) => void;
  }) => (
    <label htmlFor={id}>{label}<textarea id={id} value={value} onChange={event => onChange(event.target.value)} /></label>
  ),
}));
vi.mock("../app/components/cards/CollapsibleKpiSection", () => ({ CollapsibleKpiSection: () => null }));
vi.mock("../app/components/modals/SConfirmModal", () => ({ SConfirmModal: () => null }));
vi.mock("../app/components/buttons/Button", () => ({ Button: () => null }));
vi.mock("../app/components/buttons/PrimaryButton", () => ({ PrimaryButton: () => null }));

import { GeneratedTablePage } from "../app/components/pages/GeneratedTablePage";

const initialRecord: TableRow = { id: "record-1", approval_status: "Pending" };

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

beforeEach(() => {
  state.access = {
    loaded: true,
    error: null,
    is_super_admin: false,
    effective_permissions: ["mtg_approve"],
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
