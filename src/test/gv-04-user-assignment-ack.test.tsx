import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrgUnit } from "../app/data/boardMeetingData";
import type { BmsUser } from "../app/data/bmsUsers";
import { AssignUserModal } from "../app/pages/governance/modals/AssignUserModal";

const state = vi.hoisted(() => ({
  userUpdate: vi.fn(),
  auditAdd: vi.fn(),
  toastWarning: vi.fn(),
}));
vi.mock("../app/data/bmsUsers", () => ({
  useBmsUserRegistry: () => ({
    items: [{
      id: "user-1", name: "Assignment Candidate",
      display_name: "Assignment Candidate", email: "candidate@example.test",
      account_status: "active", primary_org_unit_id: undefined,
    }],
    update: state.userUpdate,
  }),
}));
vi.mock("../app/data/boardMeetingData", () => ({
  useAuditEventRegistry: () => ({ items: [], add: state.auditAdd }),
  generateId: () => "AUD-2026-001",
}));
vi.mock("../app/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "actor-1", name: "Admin", designation: "Secretary" }),
}));
vi.mock("sonner", () => ({ toast: { warning: state.toastWarning } }));

const unit = {
  id: "unit-1", unit_id: "OU-2026-001", unit_name: "Finance Division",
  unit_type: "Division", parent_unit: "Head Office",
  status: "Active", head: "", member_count: "0", created_at: "2026-11-20",
} as OrgUnit;

function openConfirmation(onClose: () => void, onSuccess: () => void) {
  render(<AssignUserModal unit={unit} allUnits={[unit]} onClose={onClose} onSuccess={onSuccess} />);
  fireEvent.click(screen.getByText("Assignment Candidate"));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm Assignment" }));
}

beforeEach(() => {
  state.userUpdate.mockReset();
  state.auditAdd.mockReset().mockResolvedValue(true);
  state.toastWarning.mockReset();
});

describe("GV-04 authorized assignment ACK before UI completion", () => {
  it("keeps modal open and never logs a denied user-directory write", async () => {
    state.userUpdate.mockRejectedValue(new Error("Manage user accounts through authorized User Management"));
    const onClose = vi.fn(), onSuccess = vi.fn();
    openConfirmation(onClose, onSuccess);
    expect(await screen.findByRole("alert")).toHaveTextContent("authorized User Management");
    expect(state.auditAdd).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirm Assignment" })).toBeEnabled();
  });

  it("requires a true server acknowledgement before audit and closure", async () => {
    state.userUpdate.mockResolvedValue(false);
    const onClose = vi.fn(), onSuccess = vi.fn();
    openConfirmation(onClose, onSuccess);
    expect(await screen.findByRole("alert")).toHaveTextContent("Assignment was not saved");
    expect(state.auditAdd).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("only emits audit and success after confirmed registry update", async () => {
    state.userUpdate.mockResolvedValue(true);
    const onClose = vi.fn(), onSuccess = vi.fn();
    openConfirmation(onClose, onSuccess);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(state.userUpdate).toHaveBeenCalledWith("user-1", expect.objectContaining({
      primary_org_unit_id: "unit-1", division_id: "unit-1",
    }));
    expect(state.auditAdd).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
