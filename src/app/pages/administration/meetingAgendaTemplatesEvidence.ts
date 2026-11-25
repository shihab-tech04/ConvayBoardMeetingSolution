import type { TableRow } from "../modulePageUtils";

/** AD-10 remains unverified until its tenant-scoped, versioned workflow is authoritative. */
export function unverifiedMeetingAgendaTemplatesView(): {
  rows: TableRow[];
  unavailableReason: string;
} {
  return {
    rows: [],
    unavailableReason:
      "An authoritative, tenant-scoped meeting and agenda template source has not been verified. Template version snapshots, authorization, draft instantiation, isolation from existing agendas, and save retry/readback/audit behavior remain unverified. No sample templates or counts are shown; creation and edits are disabled.",
  };
}
