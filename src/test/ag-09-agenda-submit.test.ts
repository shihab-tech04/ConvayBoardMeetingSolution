import { describe, expect, it, vi } from "vitest";
import { submitAgendaWithHistory } from "../app/pages/register-stock/submitAgendaWithHistory";
import type { AgendaSubmission } from "../app/data/boardMeetingData";
import type { EntityRegistry } from "../app/hooks/useEntityRegistry";

const agenda = (status = "Draft") => ({
  id: "agd-1", approval_status: status, approval_history: [
    { status: "Draft", by: "Secretary", at: "2026-11-01T00:00:00Z", note: "Created" },
  ],
}) as AgendaSubmission;
const writer = (f: (id: string, patch: Partial<AgendaSubmission>) => boolean | Promise<boolean>) =>
  ({ update: f }) as Pick<EntityRegistry<AgendaSubmission>, "update">;
const actor = { name: "Secretary", role: "Board Secretary" };
const now = () => "2026-11-07T03:00:00.000Z";

describe("AG-09 agenda submission", () => {
  it("saves status and history with one SQL-backed update", async () => {
    const update = vi.fn(async () => true);
    await submitAgendaWithHistory(agenda(), writer(update), actor, "Review this", true, now);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith("agd-1", expect.objectContaining({
      approval_status: "Pending Approval", updated_by: "Secretary", updated_at: now(),
      approval_history: [expect.anything(), expect.objectContaining({status: "Pending Approval", action: "submit", note: "Review this"})],
    }));
  });
  it("denies missing submission permission before mutation", async () => {
    const update = vi.fn(async () => true);
    await expect(submitAgendaWithHistory(agenda(), writer(update), actor, "", false, now)).rejects.toThrow("permission");
    expect(update).not.toHaveBeenCalled();
  });
  it.each(["Pending Approval", "Approved", "Archived", "Rejected"])("refuses duplicate/invalid status %s", async status => {
    const update = vi.fn(async () => true);
    await expect(submitAgendaWithHistory(agenda(status), writer(update), actor, "", true, now)).rejects.toThrow("Cannot submit");
    expect(update).not.toHaveBeenCalled();
  });
  it("reports SQL rejection rather than claiming success", async () => {
    const update = vi.fn(async () => false);
    await expect(submitAgendaWithHistory(agenda(), writer(update), actor, "", true, now)).rejects.toThrow("not saved");
  });
  it("does not mutate the original history on failure", async () => {
    const item = agenda();
    await expect(submitAgendaWithHistory(item, writer(async () => false), actor, "", true, now)).rejects.toThrow();
    expect(item.approval_status).toBe("Draft");
    expect(item.approval_history).toHaveLength(1);
  });
  it("allows legitimate resubmission from Revision Requested", async () => {
    const update = vi.fn(async () => true);
    await submitAgendaWithHistory(agenda("Revision Requested"), writer(update), actor, "Updated", true, now);
    expect(update).toHaveBeenCalledOnce();
  });
});
