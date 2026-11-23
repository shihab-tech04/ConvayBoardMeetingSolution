import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { OrgUnit } from "../app/data/boardMeetingData";
import { TransferUserModal } from "../app/pages/governance/modals/TransferUserModal";

const state = vi.hoisted(() => ({ write: vi.fn(), audit: vi.fn(), warning: vi.fn() }));
vi.mock("../app/data/bmsUsers", () => ({
  useBmsUserRegistry: () => ({
    items: [{
      id: "member-1", name: "Transfer Candidate", display_name: "Transfer Candidate",
      email: "transfer@example.test", account_status: "active", primary_org_unit_id: "source-1",
    }],
    update: state.write,
  }),
}));
vi.mock("../app/data/boardMeetingData", () => ({
  useAuditEventRegistry: () => ({ items: [], add: state.audit }),
  useOrgUnitRegistry: () => ({ items: [] }),
  generateId: () => "AUD-2026-001",
}));
vi.mock("../app/hooks/useCurrentUser", () => ({
  useCurrentUser: () => ({ id: "actor-1", name: "Secretary", designation: "Secretary" }),
}));
vi.mock("sonner", () => ({ toast: { warning: state.warning } }));

const units = [
  { id: "source-1", unit_id: "src", unit_name: "Current Branch", unit_type: "Branch",
    parent_unit: "—", head: "", member_count: "1", status: "Active", created_at: "2026-11-20" },
  { id: "dest-1", unit_id: "dst", unit_name: "New Division", unit_type: "Division",
    parent_unit: "—", head: "", member_count: "0", status: "Active", created_at: "2026-11-20" },
] as OrgUnit[];

function openReview(onClose: () => void, onSuccess: () => void) {
  render(<TransferUserModal unit={units[1]} allUnits={units}
    initialUserId="member-1" onClose={onClose} onSuccess={onSuccess} />);
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.change(screen.getByPlaceholderText("Reason for transfer…"), { target: { value: "Board reassignment" } });
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Continue" }));
  fireEvent.click(screen.getByRole("button", { name: "Confirm Transfer" }));
}

beforeEach(() => {
  state.write.mockReset();
  state.audit.mockReset().mockResolvedValue(true);
  state.warning.mockReset();
});

describe("GV-05 controlled transfer ACK", () => {
  it("keeps transfer form open on denied production directory write", async () => {
    state.write.mockRejectedValue(new Error("Manage user accounts through the authorized User Management page"));
    const onClose = vi.fn(), onSuccess = vi.fn();
    openReview(onClose, onSuccess);
    expect((await screen.findByRole("alert")).textContent).toContain("authorized User Management");
    expect(state.audit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("refuses false server acknowledgement without fake transfer audit", async () => {
    state.write.mockResolvedValue(false);
    const onClose = vi.fn(), onSuccess = vi.fn();
    openReview(onClose, onSuccess);
    expect((await screen.findByRole("alert")).textContent).toContain("Transfer was not saved");
    expect(state.audit).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it("only records audit after a confirmed simulated registry transfer", async () => {
    state.write.mockResolvedValue(true);
    const onClose = vi.fn(), onSuccess = vi.fn();
    openReview(onClose, onSuccess);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(state.write).toHaveBeenCalledWith("member-1", expect.objectContaining({
      primary_org_unit_id: "dest-1", division_id: "dest-1",
    }));
    expect(state.audit).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });
});
