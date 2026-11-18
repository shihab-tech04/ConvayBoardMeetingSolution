/** AG-09: persist a submission and its approval history as ONE canonical agenda update. */
import type { AgendaSubmission, AgendaApprovalEntry } from "../../data/boardMeetingData";
import type { EntityRegistry } from "../../hooks/useEntityRegistry";

const SUBMITTABLE = new Set(["Draft", "Incomplete", "Reopened", "Revision Requested"]);

export interface AgendaSubmitActor {
  name: string;
  role: string;
}

export async function submitAgendaWithHistory(
  agenda: AgendaSubmission,
  registry: Pick<EntityRegistry<AgendaSubmission>, "update">,
  actor: AgendaSubmitActor,
  note: string,
  authorized: boolean,
  getNow: () => string = () => new Date().toISOString(),
): Promise<void> {
  if (!authorized) throw new Error("You do not have permission to submit agendas.");
  if (!agenda?.id) throw new Error("Agenda not found. Refresh and try again.");
  if (!SUBMITTABLE.has(agenda.approval_status ?? "")) {
    throw new Error(`Cannot submit from \"${agenda.approval_status}\" status.`);
  }
  if (!actor.name.trim()) throw new Error("Sign in before submitting an agenda.");

  const now = getNow();
  const entry: AgendaApprovalEntry = {
    status: "Pending Approval",
    by: actor.name,
    at: now,
    note: note.trim(),
    // Extra fields retain the existing history shape used in the agenda detail drawer.
    ...{ prev_status: agenda.approval_status, action: "submit", actor_role: actor.role, reason: "" },
  };

  // One server write avoids the original race between independent status/history updates.
  const saved = await registry.update(agenda.id, {
    approval_status: "Pending Approval",
    approval_history: [...(agenda.approval_history ?? []), entry],
    updated_at: now,
    updated_by: actor.name,
  });
  if (saved !== true) throw new Error("Agenda submission was not saved. Refresh and try again.");
}
