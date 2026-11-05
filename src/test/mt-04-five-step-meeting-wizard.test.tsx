import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import type { PageCfg, TableRow } from "../app/pages/modulePageUtils";

const state = vi.hoisted(() => ({
  access: {
    loaded: true,
    error: null,
    is_super_admin: true,
    effective_permissions: [],
    user_role_ids: [],
    roles: [],
    permissions: [],
    user_assignments: [],
  },
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock("sonner", () => ({ toast: state.toast }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@mui/material", async () => {
  const actual = await vi.importActual<typeof import("@mui/material")>("@mui/material");
  return { ...actual };
});
vi.mock("../app/services/supabase/convayAccess", () => ({
  useAccessSnapshot: () => state.access,
  readAccessSnapshot: () => state.access,
  hasAccess: (_permission: string, access = state.access) => access.loaded && access.is_super_admin,
}));
vi.mock("../app/components/tables", () => ({
  UnifiedDataTable: ({ rows, onViewRow }: { rows: TableRow[]; onViewRow?: (row: TableRow) => void }) => (
    <div>{rows.map(row => (
      <button key={String(row.id)} type="button" onClick={() => onViewRow?.(row)}>
        {`Open ${String(row.id)}`}
      </button>
    ))}</div>
  ),
}));
vi.mock("../app/components/drawers/DynamicDetailsDrawer", () => ({
  DynamicDetailsDrawer: ({ open, rowData, extraFooterActions }: {
    open: boolean; rowData: TableRow | null; extraFooterActions?: React.ReactNode;
  }) => open && rowData ? <section data-testid="draft-details-drawer">{extraFooterActions}</section> : null,
}));
vi.mock("../app/components/cards/CollapsibleKpiSection", () => ({ CollapsibleKpiSection: () => null }));
vi.mock("../app/components/modals/SConfirmModal", () => ({ SConfirmModal: () => null }));
vi.mock("../app/components/forms/AppTextArea", () => ({ AppTextArea: () => null }));
vi.mock("../app/components/modals/AppModal", () => ({
  AppModal: ({ open, title, children, footer, steps, currentStep, onStepClick }: {
    open: boolean;
    title: string;
    children?: React.ReactNode;
    footer?: React.ReactNode;
    steps?: string[];
    currentStep?: number;
    onStepClick?: (step: number) => void;
  }) => open ? (
    <section role="dialog" aria-label={title}>
      {steps && <nav aria-label="Form steps">
        {steps.map((step, index) => (
          <button key={step} type="button" disabled={index > (currentStep ?? 0)} onClick={() => onStepClick?.(index)}>
            {step}
          </button>
        ))}
      </nav>}
      {children}
      <footer>{footer}</footer>
    </section>
  ) : null,
}));
vi.mock("../app/components/buttons/SecondaryButton", () => ({
  SecondaryButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" {...props}>{children}</button>
  ),
}));
vi.mock("../app/components/buttons/PrimaryButton", () => ({
  PrimaryButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));
vi.mock("../app/components/buttons/Button", () => ({
  Button: ({ children, leadingIcon: _leadingIcon, variant: _variant, size: _size, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    leadingIcon?: React.ElementType;
    variant?: string;
    size?: string;
  }) => <button type="button" {...props}>{children}</button>,
}));

import { GeneratedTablePage } from "../app/components/pages/GeneratedTablePage";
import { MEETING_FORM_STEPS } from "../app/pages/boardMeetingFormFields";

const cfg: PageCfg = {
  title: "Meeting register",
  desc: "Create meetings",
  cols: [],
  filters: [],
  actions: [],
  rows: [],
  entryBtn: "Create meeting",
  formSteps: MEETING_FORM_STEPS,
  lastStepSubmitLabel: "Schedule Meeting",
  awaitCreateSave: true,
  formFields: [
    { key: "meeting_title", label: "Meeting Title", type: "text", required: true, step: 0 },
    { key: "participant_note", label: "Participant Note", type: "text", required: true, step: 1 },
  ],
};

function renderWizard(overrides: Partial<PageCfg> = {}) {
  return render(<MemoryRouter><GeneratedTablePage cfg={{ ...cfg, ...overrides }} /></MemoryRouter>);
}

function enterStepValues() {
  fireEvent.click(screen.getByRole("button", { name: "Create meeting" }));
  fireEvent.change(screen.getByLabelText(/Meeting Title/), { target: { value: "Quarterly Board Meeting" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByLabelText(/Participant Note/), { target: { value: "Invite all voting members" } });
}

beforeEach(() => {
  state.access.is_super_admin = true;
  state.toast.success.mockReset();
  state.toast.error.mockReset();
  state.toast.info.mockReset();
});

afterEach(() => vi.restoreAllMocks());

describe("MT-04 five-step meeting creation wizard", () => {
  it("uses the required five-step sequence", () => {
    expect(MEETING_FORM_STEPS).toEqual([
      "Meeting Details",
      "Participants",
      "Agendas and Documents",
      "Meeting Mode and Quorum",
      "Review and Schedule",
    ]);
  });

  it("keeps edits on a step when the user goes Back", () => {
    renderWizard();
    enterStepValues();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText(/Meeting Title/)).toHaveValue("Quarterly Board Meeting");

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText(/Participant Note/)).toHaveValue("Invite all voting members");
  });

  it("keeps edits on a step when the user returns via the stepper", () => {
    renderWizard();
    enterStepValues();

    fireEvent.click(screen.getByRole("button", { name: "Meeting Details" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByLabelText(/Participant Note/)).toHaveValue("Invite all voting members");
  });

  it("submits the retained step values when the user completes the wizard", async () => {
    const save = vi.fn().mockResolvedValue(true);
    renderWizard({ onRowCreate: save });
    enterStepValues();

    fireEvent.click(screen.getByRole("button", { name: "Meeting Details" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Schedule Meeting" }));

    await waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(save.mock.calls[0][0]).toMatchObject({
      meeting_title: "Quarterly Board Meeting",
      participant_note: "Invite all voting members",
    });
  });
});

describe("MT-11 save draft and continue", () => {
  const draftRow: TableRow = {
    id: "MTG-DRAFT-11",
    meeting_id: "MTG-DRAFT-11",
    meeting_title: "Saved board meeting",
    participant_note: "Saved participant note",
    approval_status: "Draft",
    draft_current_step: "1",
  };
  const continueAction = { id: "continue_setup", label: "Continue Setup", icon: () => null };

  function openSavedDraft(overrides: Partial<PageCfg> = {}) {
    const view = renderWizard({
      rows: [draftRow],
      drawerActionsResolver: () => [continueAction],
      ...overrides,
    });
    fireEvent.click(screen.getByRole("button", { name: "Open MTG-DRAFT-11" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue Setup" }));
    return view;
  }

  it("reopens the saved wizard step with persisted values and saves against the same draft ID", async () => {
    const saveDraft = vi.fn().mockResolvedValue("MTG-DRAFT-11");
    openSavedDraft({ onSaveDraft: saveDraft });

    expect(screen.getByLabelText(/Participant Note/)).toHaveValue("Saved participant note");
    fireEvent.click(screen.getByRole("button", { name: "Meeting Details" }));
    expect(screen.getByLabelText(/Meeting Title/)).toHaveValue("Saved board meeting");
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));

    await waitFor(() => expect(saveDraft).toHaveBeenCalledOnce());
    expect(saveDraft.mock.calls[0][0]).toMatchObject({
      meeting_title: "Saved board meeting",
      participant_note: "Saved participant note",
      _current_step: 0,
    });
    expect(saveDraft.mock.calls[0][1]).toBe("MTG-DRAFT-11");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("passes the existing draft identity to final scheduling instead of creating another meeting", async () => {
    const schedule = vi.fn().mockResolvedValue(true);
    const saveDraft = vi.fn();
    openSavedDraft({ onRowCreate: schedule, onSaveDraft: saveDraft });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Schedule Meeting" }));

    await waitFor(() => expect(schedule).toHaveBeenCalledOnce());
    expect(schedule.mock.calls[0][0]).toMatchObject({
      meeting_title: "Saved board meeting",
      participant_note: "Saved participant note",
      _draft_meeting_id: "MTG-DRAFT-11",
    });
    expect(saveDraft).not.toHaveBeenCalled();
  });

  it("prevents duplicate in-flight saves and keeps the modal open when the write fails", async () => {
    let finishSave!: (id: string) => void;
    const saveDraft = vi.fn(() => new Promise<string>(resolve => { finishSave = resolve; }));
    const firstRender = openSavedDraft({ onSaveDraft: saveDraft });
    const saveButton = screen.getByRole("button", { name: "Save Draft" });

    fireEvent.click(saveButton);
    fireEvent.click(saveButton);
    expect(saveDraft).toHaveBeenCalledOnce();
    finishSave("MTG-DRAFT-11");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    firstRender.unmount();

    const failedSave = vi.fn().mockRejectedValue(new Error("permission denied"));
    openSavedDraft({ onSaveDraft: failedSave });
    fireEvent.click(screen.getByRole("button", { name: "Save Draft" }));
    await waitFor(() => expect(state.toast.error).toHaveBeenCalledWith("permission denied"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
