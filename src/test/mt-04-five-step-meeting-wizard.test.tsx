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
  UnifiedDataTable: ({ rows }: { rows: TableRow[] }) => <div>{rows.length} rows</div>,
}));
vi.mock("../app/components/drawers/DynamicDetailsDrawer", () => ({ DynamicDetailsDrawer: () => null }));
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
