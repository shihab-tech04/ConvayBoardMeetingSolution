import type { BoardPack, Meeting } from "../../data/boardMeetingData";

type MeetingRef = Pick<Meeting, "meeting_id" | "meeting_title" | "committee" | "meeting_date">;
type ExistingPack = Pick<BoardPack, "pack_id">;
type DraftMetadata = Pick<BoardPack, "pack_title" | "related_meeting" | "meeting_title" |
  "committee" | "version" | "publication_date" | "change_summary" | "meeting_date"> & {
  meeting_id: string;
  auto_version: boolean;
  include_notice: boolean;
  include_minutes: boolean;
  include_matters: boolean;
  confidentiality: string;
  review_deadline: string;
  ack_required: boolean;
};

function trimmed(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function checked(value: unknown): boolean {
  return value === true || value === "true";
}

/**
 * Draft metadata only. Never turn the form's attachments into fake document links:
 * original bytes must be uploaded and authorized through the Storage/document API.
 */
function validatedDraftFields(values: Record<string, unknown>, meetings: readonly MeetingRef[]): DraftMetadata {
  const attachments = values.attachments;
  if (attachments != null && (!Array.isArray(attachments) || attachments.length > 0)) {
    throw new Error("Upload documents through the Document Library first; board-pack file upload is not connected to secure Storage.");
  }
  const pack_title = trimmed(values.pack_title);
  if (!pack_title || pack_title.length > 240) {
    throw new Error("Enter a board-pack title of up to 240 characters.");
  }
  const meeting_id = trimmed(values.meeting_id);
  const meeting = meetings.find(item => item.meeting_id === meeting_id);
  if (!meeting) throw new Error("Select an existing meeting you can access.");
  const committee = trimmed(values.committee);
  if (committee && committee !== meeting.committee) {
    throw new Error("The governance body must match the selected meeting.");
  }
  const version = trimmed(values.version) || "V1";
  if (version !== "V1") {
    throw new Error("A new board-pack draft starts at V1; later versions require the controlled publication workflow.");
  }
  return {
    pack_title, meeting_id, related_meeting: meeting_id,
    meeting_title: meeting.meeting_title, committee: meeting.committee,
    meeting_date: meeting.meeting_date,
    version, publication_date: trimmed(values.publication_date),
    change_summary: trimmed(values.change_summary),
    auto_version: checked(values.auto_version),
    include_notice: checked(values.include_notice),
    include_minutes: checked(values.include_minutes),
    include_matters: checked(values.include_matters),
    confidentiality: trimmed(values.confidentiality) || "Confidential",
    review_deadline: trimmed(values.review_deadline),
    ack_required: checked(values.ack_required),
  };
}

function nextDraftReference(existing: readonly ExistingPack[], year: number): string {
  const prefix = `BPK-${year}-`;
  const largest = existing.reduce((max, item) => {
    if (!item.pack_id.startsWith(prefix)) return max;
    const suffix = item.pack_id.slice(prefix.length);
    return /^\d+$/.test(suffix) ? Math.max(max, Number(suffix)) : max;
  }, 0);
  return `${prefix}${String(largest + 1).padStart(4, "0")}`;
}

/** Prepared only as Draft; SQL ACK and meeting/actor authorization remain mandatory. */
export function assembleBoardPackDraft(
  values: Record<string, unknown>, meetings: readonly MeetingRef[],
  existing: readonly ExistingPack[], id: string, actor: string, now: Date,
): BoardPack {
  if (!id.trim() || !actor.trim() || Number.isNaN(now.getTime())) {
    throw new Error("A verified actor and valid draft identity are required.");
  }
  const fields = validatedDraftFields(values, meetings);
  return {
    ...fields,
    id, pack_id: nextDraftReference(existing, now.getUTCFullYear()),
    approval_status: "Draft", document_count: "0", review_completion: "0%",
    access_policy: "", created_by: actor, created_at: now.toISOString(),
  };
}

/** Draft metadata may be changed but never used to publish, approve or replace versions. */
export function assembleBoardPackDraftUpdate(
  values: Record<string, unknown>, existing: BoardPack,
  meetings: readonly MeetingRef[],
): Partial<BoardPack> {
  if (existing.approval_status !== "Draft") {
    throw new Error("Only draft board packs can be edited; server lifecycle approval is required.");
  }
  const fields = validatedDraftFields(values, meetings);
  if (fields.version !== existing.version) {
    throw new Error("Changing a board-pack version requires the server-controlled version workflow.");
  }
  return fields;
}
