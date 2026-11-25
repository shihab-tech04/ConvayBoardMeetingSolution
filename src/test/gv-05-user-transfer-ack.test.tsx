import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrgUnit } from "../app/data/boardMeetingData";
import { TransferUserModal } from "../app/pages/governance/modals/TransferUserModal";

const state = vi.hoisted(() => ({
  write: vi.fn(), refresh: vi.fn(), close: vi.fn(), success: vi.fn(),
}));
vi.mock("../app/services/supabase/convayAuth", () => ({
  convayAuth: { commitOrgMemberAssignment: state.write },
}));
vi.mock("../app/data/bmsUsers", () => ({
  useBmsUserRegistry: () => ({
    items: [{
      id: "member-1", name: "Transfer Candidate", display_name: "Transfer Candidate",
      email: "transfer@example.test", account_status: "active", primary_org_unit_id: "source-1",
    }],
    refresh: state.refresh,
  }),
}));
vi.mock("../app/data/boardMeetingData", () => ({
  useOrgUnitRegistry: () => ({ items: [] }),
}));
const units = [
  { id: "source-1", unit_id: "src", unit_name: "Current Branch", unit_type: "Branch",
    parent_unit: "—", head: "", member_count: "1", status: "Active", created_at: "2026-11-20" },
  { id: "dest-1", unit_id: "dst", unit_name: "New Division", unit_type: "Division",
    parent_unit: "—", head: "", member_count: "0", status: "Active", created_at: "2026-11-20" },
] as OrgUnit[];
function openConfirmation() {
  render(<TransferUserModal unit={units[1]} allUnits={units}
    initialUserId="member-1" onClose={state.close} onSuccess={state.success} />);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByPlaceholderText("Reason for transfer…"), {
    target: { value: "Board reassignment" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm Transfer" }));
}
beforeEach(() => {
  state.write.mockReset(); state.refresh.mockReset().mockResolvedValue(undefined);
  state.close.mockReset(); state.success.mockReset();
});
describe("GV-05 authorized, revision-verified SQL unit transfer", () => {
  it("refuses a denied production RPC without false success", async () => {
    state.write.mockRejectedValue(new Error("Member transfer forbidden"));
    openConfirmation();
    expect((await screen.findByRole("alert")).textContent).toContain("forbidden");
    expect(state.close).not.toHaveBeenCalled();
    expect(state.success).not.toHaveBeenCalled();
  });
  it("submits a stable request and waits for SQL readback before completing", async () => {
    state.write.mockResolvedValue({ member_id: "member-1", revision: 1 });
    openConfirmation();
    await waitFor(() => expect(state.close).toHaveBeenCalledTimes(1));
    expect(state.write).toHaveBeenCalledWith(expect.objectContaining({
      memberId: "member-1", expectedUnitId: "source-1", newUnitId: "dest-1",
      operation: "transfer", reason: "Board reassignment", requestId: expect.any(String),
    }));
    expect(state.refresh).toHaveBeenCalledTimes(1);
    expect(state.success).toHaveBeenCalledTimes(1);
  });
  it("keeps the form open when a committed SQL write has no verified readback", async () => {
    state.write.mockRejectedValue(new Error("Write acknowledged; readback unavailable"));
    openConfirmation();
    expect((await screen.findByRole("alert")).textContent).toContain("readback unavailable");
    expect(state.close).not.toHaveBeenCalled();
    expect(state.write).toHaveBeenCalledTimes(1);
  });
});
