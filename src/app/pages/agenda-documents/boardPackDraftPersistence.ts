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
  const matches = meetings.filter(item => item.meeting_id === meeting_id);
  if (!meeting_id || matches.length !== 1) throw new Error("Select an existing meeting you can access.");
  const meeting = matches[0];
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

export interface BoardPackCreateGateway {
  list(): Promise<readonly BoardPack[]>;
  create(draft: BoardPack): Promise<boolean>;
  assertCurrent(): void;
}

/** Match every field in the original dispatched payload, not merely its ID. */
function exactDraft(saved: BoardPack, intended: BoardPack): boolean {
  return (Object.keys(intended) as (keyof BoardPack)[])
    .every(key => Object.is(saved[key], intended[key]));
}

/** Refuse changed intent while a previous create has an unresolved outcome. */
export function assertSameBoardPackDraftIntent(
  values: Record<string, unknown>, draft: BoardPack, meetings: readonly MeetingRef[],
): void {
  const fields = validatedDraftFields(values, meetings);
  if (Object.entries(fields).some(([key, value]) => !Object.is(draft[key as keyof BoardPack], value))) {
    throw new Error("A previous board-pack save is unresolved. Retry its original details before starting another draft.");
  }
}

/** A lost ACK can follow a committed insert. Retry only the original identity;
 * never claim success from a cache or a different record with a similar title. */
export async function persistBoardPackDraft(
  draft: BoardPack, gateway: BoardPackCreateGateway, previouslyDispatched: boolean,
  markDispatched: () => void,
): Promise<BoardPack> {
  const findSaved = async (): Promise<BoardPack | undefined> => {
    gateway.assertCurrent();
    const rows = await gateway.list();
    gateway.assertCurrent();
    const matches = rows.filter(row => row.id === draft.id);
    if (matches.length > 1 || rows.some(row => row.id !== draft.id && row.pack_id === draft.pack_id)) {
      throw new Error("Board-pack identity is ambiguous or conflicts with another record. Refresh before retrying.");
    }
    if (!matches.length) return undefined;
    if (!exactDraft(matches[0], draft)) {
      throw new Error("The saved board pack differs from the original request. Reopen it before editing.");
    }
    return matches[0];
  };
  const before = await findSaved();
  if (before) {
    if (!previouslyDispatched) throw new Error("Board-pack identity already exists. Refresh before saving.");
    return before;
  }
  gateway.assertCurrent();
  markDispatched();
  let failure: unknown;
  let acknowledged = false;
  try { acknowledged = await gateway.create(draft); }
  catch (error) { failure = error; }
  const after = await findSaved();
  if (after) return after;
  if (failure) throw failure;
  throw new Error(acknowledged
    ? "Board-pack SQL readback was not confirmed. Retry the original draft."
    : "Board-pack draft was not confirmed by SQL. Retry the original draft.");
}
