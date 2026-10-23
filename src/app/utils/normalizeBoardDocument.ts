import type { BoardDocument } from "../data/boardMeetingData";

type RawDocumentRecord = Record<string, unknown>;

/**
 * Normalizes a raw document record from any storage source.
 * Handles legacy field names produced before field key canonicalization.
 */
export function normalizeBoardDocument(raw: RawDocumentRecord): BoardDocument {
  const pick = (canonical: string, ...aliases: string[]): unknown => {
    if (raw[canonical] !== undefined) return raw[canonical];
    for (const alias of aliases) {
      if (raw[alias] !== undefined) return raw[alias];
    }
    return undefined;
  };

  const str = (v: unknown, fallback = ""): string =>
    v !== undefined && v !== null ? String(v) : fallback;

  return {
    id:                       str(raw.id),
    doc_id:                   str(pick("doc_id", "document_id")),
    doc_name:                 str(pick("doc_name", "document_name")),
    doc_number:               str(raw.doc_number),
    doc_type:                 str(pick("doc_type", "document_type")),
    related_meeting:          str(pick("related_meeting", "meeting_id")),
    related_agenda:           str(pick("related_agenda", "agenda_id")),
    owner:                    str(raw.owner),
    version:                  str(raw.version, "1.0"),
    confidentiality:          str(raw.confidentiality, "Internal"),
    effective_date:           str(raw.effective_date),
    expiry_date:              str(raw.expiry_date),
    acknowledgement_required: str(pick("acknowledgement_required", "ack_required"), "No"),
    approval_status:          str(raw.approval_status, "Draft"),
    created_at:               str(raw.created_at),
    // Optional extended fields — pass through as-is
    file_name:                raw.file_name as string | undefined,
    file_format:              raw.file_format as string | undefined,
    // mime_type: canonical field. Normalise legacy file_mime alias → mime_type.
    mime_type:                (raw.mime_type ?? raw.file_mime) as string | undefined,
    file_size:                raw.file_size as number | undefined,
    original_file_ref:        raw.original_file_ref as string | undefined,
    content_type:             raw.content_type as BoardDocument["content_type"],
    editor_provider:          raw.editor_provider as string | undefined,
    created_by:               raw.created_by as string | undefined,
    last_modified_by:         raw.last_modified_by as string | undefined,
    last_modified_at:         raw.last_modified_at as string | undefined,
    workflow_status:          raw.workflow_status as string | undefined,
    current_version_id:       raw.current_version_id as string | undefined,
    folder_id:                raw.folder_id as string | undefined,
    tags:                     raw.tags as string | undefined,
    is_favorite:              raw.is_favorite as boolean | undefined,
    is_pinned:                raw.is_pinned as boolean | undefined,
    is_template:              raw.is_template as boolean | undefined,
    is_locked:                raw.is_locked as boolean | undefined,
    locked_version_id:        raw.locked_version_id as string | undefined,
    unresolved_comment_count: raw.unresolved_comment_count as number | undefined,
    pending_suggestion_count: raw.pending_suggestion_count as number | undefined,
    // Format-specific metadata
    workspace_type:           raw.workspace_type as string | undefined,
    page_count:               raw.page_count as number | undefined,
    sheet_count:              raw.sheet_count as number | undefined,
    active_sheet_id:          raw.active_sheet_id as string | undefined,
    has_annotations:          raw.has_annotations as boolean | undefined,
    annotation_count:         raw.annotation_count as number | undefined,
    has_macros:               raw.has_macros as boolean | undefined,
    has_external_links:       raw.has_external_links as boolean | undefined,
    conversion_warning:       raw.conversion_warning as string | undefined,
    title:                    raw.title as string | undefined,
  };
}
