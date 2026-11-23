import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrgUnit } from "../app/data/boardMeetingData";
import { AssignUserModal } from "../app/pages/governance/modals/AssignUserModal";

const state = vi.hoisted(() => ({
  write: vi.fn(), refresh: vi.fn(), close: vi.fn(), success: vi.fn(),
}));
vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { commitOrgMemberAssignment: state.write },
}));
vi.mock("../app/data/bmsUsers", () => ({
  useBmsUserRegistry: () => ({
    items: [{
      id: "user-1", name: "Assignment Candidate",
      display_name: "Assignment Candidate", email: "candidate@example.test",
      account_status: "active", primary_org_unit_id: undefined,
    }],
    refresh: state.refresh,
  }),
}));
const unit = {
  id: "unit-1", unit_id: "OU-2026-001", unit_name: "Finance Division",
  unit_type: "Division", parent_unit: "Head Office",
  status: "Active", head: "", member_count: "0", created_at: "2026-11-20",
} as OrgUnit;
function openConfirmation() {
  render(<AssignUserModal unit={unit} allUnits={[unit]} onClose={state.close} onSuccess={state.success} />);
  fireEvent.click(screen.getByText("Assignment Candidate"));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm Assignment" }));
}
beforeEach(() => {
  state.write.mockReset(); state.refresh.mockReset().mockResolvedValue(undefined);
  state.close.mockReset(); state.success.mockReset();
});
describe("GV-04 authoritative SQL member assignment", () => {
  it("never closes or confirms if the authorized RPC denies access", async () => {
    state.write.mockRejectedValue(new Error("Permission denied by SQL"));
    openConfirmation();
    expect((await screen.findByRole("alert")).textContent).toContain("Permission denied by SQL");
    expect(state.close).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
    expect(state.refresh).not.toHaveBeenCalled();
  });
  it("waits for SQL receipt and readback before announcing completion", async () => {
    state.write.mockResolvedValue({ member_id: "user-1", new_unit_id: "unit-1", revision: 1 });
    openConfirmation();
    await waitFor(() => expect(state.close).toHaveBeenCalledTimes(1));
    expect(state.write).toHaveBeenCalledWith(expect.objectContaining({
      memberId: "user-1", expectedUnitId: null, newUnitId: "unit-1",
      operation: "assign", requestId: expect.any(String),
    }));
    expect(state.refresh).toHaveBeenCalledTimes(1);
    expect(state.success).toHaveBeenCalledTimes(1);
  });
  it("never implies rollback or issues duplicate writes after readback fails", async () => {
    state.write.mockRejectedValue(new Error("Write acknowledged; SQL readback is stale"));
    openConfirmation();
    expect((await screen.findByRole("alert")).textContent).toContain("readback is stale");
    expect(state.write).toHaveBeenCalledTimes(1);
    expect(state.close).not.toHaveBeenCalled();
  });
});
