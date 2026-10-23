/**
 * Board Meeting Solution — feature-specific form field configurations.
 *
 * Each function returns a FormField[] for a specific entity type.
 * Pages import and use these in their PageCfg.formFields.
 */

import type { FormField, SectionDef } from "../components/forms/EntryForm";
import {
  GOVERNANCE_BODIES,
  MEETING_TYPES,
  MEETING_MODES,
  MEETING_LANGUAGES,
  PRIORITIES,
  CONFIDENTIALITY_LEVELS,
  MEETING_ROLES,
  ATTENDANCE_REQUIREMENTS,
  DOCUMENT_TYPES,
  AGENDA_CATEGORIES,
  DECISION_TYPES,
  ACTION_PRIORITIES,
  TIME_ZONES,
  FINANCIAL_YEARS,
  DESIGNATIONS,
} from "../data/boardMeetingData";
import {
  CalendarDays,
  Landmark,
  Users,
  ListChecks,
  Files,
  ClipboardCheck,
  FileText,
  CalendarClock,
  MapPin,
  Settings2,
  AlignLeft,
  ShieldCheck,
  CalendarPlus,
  UserCheck,
  Network,
  Video,
  Laptop,
  Layers,
} from "lucide-react";

const TODAY = new Date().toISOString().slice(0, 10);
const YEAR  = String(new Date().getFullYear());

// ─── Meeting creation form — 5-step wizard ───────────────────────────────────
// step 0: Meeting Details  | step 1: Participants | step 2: Agendas & Documents
// step 3: Meeting Mode & Quorum | step 4: Review & Schedule

/** Full accessible step names (used as aria-labels). */
export const MEETING_FORM_STEPS = [
  "Meeting Details",
  "Participants",
  "Agendas and Documents",
  "Meeting Mode and Quorum",
  "Review and Schedule",
];

/** Short visible step labels shown in the stepper UI. */
export const MEETING_FORM_SHORT_STEPS = [
  "Details",
  "Participants",
  "Agendas",
  "Mode & Quorum",
  "Review",
];

export const MEETING_FORM_STEP_ICONS = [
  CalendarDays,
  Users,
  Layers,
  Settings2,
  ClipboardCheck,
];

export const MEETING_FORM_FIELDS: FormField[] = [
  // ── Step 0: Meeting Details ──────────────────────────────────────────────
  { key: "meeting_title",    label: "Meeting Title",      type: "text",     required: true, span: true,
    placeholder: "e.g. 344th Board of Directors Meeting", step: 0 },
  { key: "meeting_type",     label: "Meeting Type",       type: "select",   required: true, options: MEETING_TYPES, step: 0 },
  { key: "committee",        label: "Board / Committee",  type: "select",   required: true, options: GOVERNANCE_BODIES, step: 0 },
  { key: "meeting_date",     label: "Meeting Date",       type: "date",     required: true, defaultValue: TODAY, step: 0 },
  { key: "start_time",       label: "Start Time",         type: "time",     required: true, defaultValue: "10:00", step: 0 },
  { key: "end_time",         label: "End Time",           type: "time",     required: true, defaultValue: "13:00", step: 0 },
  { key: "time_zone",        label: "Time Zone",          type: "select",   options: TIME_ZONES, defaultValue: "Asia/Dhaka (GMT+6)", step: 0 },
  // User selectors — options are patched dynamically from bmsUserRegistry
  { key: "chairperson",      label: "Chairperson",        type: "select",   required: true, options: [], step: 0,
    helper: "Select from registered users — shows name, designation, and organisational unit" },
  { key: "secretary",        label: "Meeting Secretary",  type: "select",   required: true, options: [], step: 0,
    helper: "Select from registered users" },
  { key: "organizer",        label: "Meeting Organizer",  type: "select",   required: true, options: [], step: 0,
    helper: "Select from registered users" },
  { key: "confidentiality",  label: "Confidentiality",    type: "select",   required: true, options: CONFIDENTIALITY_LEVELS, defaultValue: "Confidential", step: 0 },
  { key: "purpose",          label: "Meeting Purpose",    type: "textarea", span: true, rows: 2,
    placeholder: "State the primary purpose of this meeting", step: 0 },
  { key: "description",      label: "Description / Notes",type: "textarea", span: true, rows: 3, step: 0 },

  // ── Step 1: Participants (rendered entirely by ParticipantSelectorStep custom renderer) ──
  // No standard form fields — all participant data written via participant_links_json.

  // ── Step 2: Agendas and Documents — rendered by AgendaDocumentStep (stepRenderers[2]) ──
  // No standard form fields here; all handled by the custom renderer.

  // ── Step 3: Meeting Mode and Quorum ───────────────────────────────────────
  { key: "mode",               label: "Meeting Mode",         type: "radio", variant: "segmented", required: true, options: MEETING_MODES, defaultValue: "Physical", span: true, step: 3,
    optionIcons: [MapPin, Video, Laptop] },
  { key: "venue",              label: "Venue",                type: "text",  placeholder: "e.g. Board Room A, Head Office", step: 3,
    condition: { field: "mode", value: ["Physical", "Hybrid"] } },

  // ── Step 4: Review & Schedule (rendered by MeetingReviewPanel; no standard fields needed) ──

  // ── Hidden state-carrier fields for draft restoration ─────────────────────
  // These are never rendered in the UI (condition never matches) but allow
  // buildInitialValuesFromRow to carry draft JSON blobs through to custom renderers.
  { key: "participant_links_json",      label: "", type: "readonly", step: 0, condition: { field: "__never__", value: "__never__" } },
  { key: "selected_agenda_ids_json",    label: "", type: "readonly", step: 0, condition: { field: "__never__", value: "__never__" } },
  { key: "additional_doc_ids_json",     label: "", type: "readonly", step: 0, condition: { field: "__never__", value: "__never__" } },
  { key: "draft_current_step",          label: "", type: "readonly", step: 0, condition: { field: "__never__", value: "__never__" } },
];

// ─── Meeting wizard section definitions ──────────────────────────────────────

export const MEETING_FORM_SECTIONS: SectionDef[] = [
  // Step 0: Meeting Details
  { id: "s0-identity",    step: 0, title: "Meeting Identity",     icon: FileText,      fieldKeys: ["meeting_title", "meeting_type", "committee"] },
  { id: "s0-datetime",    step: 0, title: "Date & Time",          icon: CalendarClock, fieldKeys: ["meeting_date", "start_time", "end_time", "time_zone"] },
  { id: "s0-leadership",  step: 0, title: "Meeting Leadership",   icon: Landmark,      fieldKeys: ["chairperson", "secretary", "organizer"] },
  { id: "s0-prefs",       step: 0, title: "Meeting Preferences",  icon: Settings2,     fieldKeys: ["confidentiality"] },
  { id: "s0-purpose",     step: 0, title: "Purpose & Notes",      icon: AlignLeft,     fieldKeys: ["purpose", "description"] },
  // Step 1: Participants — fully rendered by ParticipantSelectorStep (stepRenderers[1]); no standard sections.
  // Step 2: Agendas and Documents — rendered by AgendaDocumentStep (stepRenderers[2]); no standard sections.
  // Step 3: Meeting Mode and Quorum
  { id: "s3-mode",        step: 3, title: "Location & Access",    icon: MapPin,        fieldKeys: ["mode", "venue"] },
  // Step 4: Review & Schedule — rendered by MeetingReviewPanel (reviewRenderer); no standard sections.
];

// ─── Meeting Template form ────────────────────────────────────────────────────

export const MEETING_TEMPLATE_FORM_FIELDS: FormField[] = [
  { key: "template_name",     label: "Template Name",          type: "text",     required: true, span: true },
  { key: "description",       label: "Description",            type: "textarea", span: true, rows: 3 },
  { key: "meeting_type",      label: "Meeting Type",           type: "select",   required: true, options: MEETING_TYPES },
  { key: "committee",         label: "Governance Body",        type: "select",   options: GOVERNANCE_BODIES },
  { key: "default_duration",  label: "Default Duration (hrs)", type: "number",   placeholder: "e.g. 2" },
  { key: "default_mode",      label: "Default Mode",           type: "select",   options: MEETING_MODES },
  { key: "default_venue",     label: "Default Venue",          type: "text",     placeholder: "e.g. Board Room A" },
  { key: "confidentiality",   label: "Default Confidentiality",type: "select",   options: CONFIDENTIALITY_LEVELS },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Draft", "Archived"], defaultValue: "Active" },
];

// ─── Agenda Submission form ───────────────────────────────────────────────────

export const AGENDA_SUBMISSION_FORM_FIELDS: FormField[] = [
  { key: "agenda_title",      label: "Agenda Title",           type: "text",     required: true, span: true },
  { key: "agenda_reference",  label: "Agenda Reference",       type: "text",     helper: "Leave blank to auto-generate" },
  { key: "committee",         label: "Governance Body",        type: "select",   required: true, options: GOVERNANCE_BODIES },
  { key: "meeting_type",      label: "Meeting Type",           type: "select",   options: MEETING_TYPES },
  { key: "agenda_category",   label: "Category",               type: "select",   required: true, options: AGENDA_CATEGORIES },
  { key: "submitting_division",label: "Submitting Division",   type: "text",     placeholder: "e.g. Finance Division" },
  { key: "submitted_by",      label: "Submitted By",           type: "text",     required: true },
  { key: "presenter",         label: "Presenter",              type: "text" },
  { key: "purpose",           label: "Purpose",                type: "select",   options: ["For Approval", "For Information", "For Discussion", "For Noting"], defaultValue: "For Approval" },
  { key: "priority",          label: "Priority",               type: "select",   options: PRIORITIES, defaultValue: "Normal" },
  { key: "confidentiality",   label: "Confidentiality",        type: "select",   options: CONFIDENTIALITY_LEVELS, defaultValue: "Internal" },
  { key: "estimated_duration",label: "Estimated Duration",     type: "select",   options: ["5 min", "10 min", "15 min", "20 min", "30 min", "45 min", "60 min", "90 min"] },
  { key: "voting_required",   label: "Voting Required",        type: "toggle",   defaultValue: false },
  { key: "preferred_date",    label: "Preferred Meeting Date", type: "date" },
  { key: "financial_impact",  label: "Financial Impact (BDT)", type: "text",     placeholder: "e.g. ৳50,000,000" },
  { key: "background",        label: "Background",             type: "textarea", span: true, rows: 3, placeholder: "Provide context and background information" },
  { key: "proposed_decision", label: "Proposed Decision",      type: "textarea", span: true, rows: 3, placeholder: "State the proposed decision or resolution text" },
  { key: "remarks",           label: "Remarks",                type: "textarea", span: true, rows: 2 },
  { key: "attachments",       label: "Supporting Documents",   type: "file",     span: true, maxFiles: 10, maxSizeMB: 10, accept: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"] },
];

// ─── Board Pack form ──────────────────────────────────────────────────────────

export const BOARD_PACK_FORM_FIELDS: FormField[] = [
  { key: "pack_title",        label: "Board Pack Title",       type: "text",     required: true, span: true },
  { key: "meeting_id",        label: "Related Meeting",        type: "text",     required: true, placeholder: "e.g. MTG-2026-0344" },
  { key: "committee",         label: "Governance Body",        type: "select",   options: GOVERNANCE_BODIES },
  { key: "version",           label: "Version",                type: "text",     defaultValue: "V1", placeholder: "e.g. V1" },
  { key: "auto_version",      label: "Auto-number Version",    type: "toggle",   defaultValue: true },
  { key: "include_notice",    label: "Include Meeting Notice", type: "checkbox", defaultValue: true },
  { key: "include_minutes",   label: "Include Previous Minutes",type: "checkbox",defaultValue: true },
  { key: "include_matters",   label: "Include Matters Arising",type: "checkbox", defaultValue: true },
  { key: "confidentiality",   label: "Confidentiality",        type: "select",   options: CONFIDENTIALITY_LEVELS, defaultValue: "Confidential" },
  { key: "publication_date",  label: "Publication Date",       type: "date" },
  { key: "review_deadline",   label: "Review Deadline",        type: "date" },
  { key: "ack_required",      label: "Acknowledgement Required",type: "toggle",  defaultValue: false },
  { key: "change_summary",    label: "Change Summary",         type: "textarea", span: true, rows: 3 },
  { key: "attachments",       label: "Documents",              type: "file",     span: true, maxFiles: 20, maxSizeMB: 50, accept: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"] },
];

// ─── Document form ────────────────────────────────────────────────────────────

export const DOCUMENT_FORM_FIELDS: FormField[] = [
  { key: "doc_name",                   label: "Document Name",            type: "text",     required: true, span: true },
  { key: "doc_type",                   label: "Document Type",            type: "select",   required: true, options: DOCUMENT_TYPES },
  { key: "related_meeting",            label: "Related Meeting",          type: "select",   options: [] },
  { key: "related_agenda",             label: "Related Agenda Item",      type: "text",     placeholder: "e.g. AGD-2026-0344-01" },
  { key: "owner",                      label: "Document Owner",           type: "text" },
  { key: "version",                    label: "Version",                  type: "text",     defaultValue: "1.0" },
  { key: "confidentiality",            label: "Confidentiality",          type: "select",   options: CONFIDENTIALITY_LEVELS, defaultValue: "Internal" },
  { key: "effective_date",             label: "Effective Date",           type: "date" },
  { key: "expiry_date",                label: "Expiry Date",              type: "date" },
  { key: "download_permission",        label: "Download Permission",      type: "toggle",   defaultValue: true },
  { key: "print_permission",           label: "Print Permission",         type: "toggle",   defaultValue: false },
  { key: "acknowledgement_required",   label: "Acknowledgement Required", type: "toggle",   defaultValue: false },
  { key: "description",                label: "Description",              type: "textarea", span: true, rows: 3 },
  { key: "tags",                       label: "Tags",                     type: "text",     span: true, placeholder: "Comma-separated tags" },
  { key: "file",                       label: "Document File",            type: "file",     required: true, span: true, maxFiles: 1, maxSizeMB: 50, accept: [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".odt", ".rtf"] },
];

// ─── Decision form ────────────────────────────────────────────────────────────

export const DECISION_FORM_FIELDS: FormField[] = [
  { key: "decision_title",    label: "Decision Title",         type: "text",     required: true, span: true },
  { key: "decision_type",     label: "Decision Type",          type: "select",   required: true, options: DECISION_TYPES },
  { key: "source_meeting",    label: "Source Meeting",         type: "text",     placeholder: "e.g. MTG-2026-0344" },
  { key: "agenda_item",       label: "Related Agenda Item",    type: "text",     placeholder: "e.g. AGD-2026-0344-01" },
  { key: "decision_owner",    label: "Decision Owner",         type: "text",     required: true },
  { key: "committee",         label: "Governance Body",        type: "select",   required: true, options: GOVERNANCE_BODIES },
  { key: "effective_date",    label: "Effective Date",         type: "date",     required: true, defaultValue: TODAY },
  { key: "implementation_deadline", label: "Implementation Deadline", type: "date" },
  { key: "financial_impact",  label: "Financial Impact (BDT)", type: "text",     placeholder: "e.g. ৳50,000,000" },
  { key: "priority",          label: "Priority",               type: "select",   options: PRIORITIES, defaultValue: "Normal" },
  { key: "confidentiality",   label: "Confidentiality",        type: "select",   options: CONFIDENTIALITY_LEVELS, defaultValue: "Internal" },
  { key: "decision_text",     label: "Decision Text",          type: "textarea", required: true, span: true, rows: 4, placeholder: "The board hereby decides that…" },
  { key: "implementation_notes", label: "Implementation Notes",type: "textarea", span: true, rows: 3 },
  { key: "attachments",       label: "Supporting Documents",   type: "file",     span: true, maxFiles: 5, maxSizeMB: 10, accept: [".pdf", ".doc", ".docx"] },
];

// ─── Resolution form ──────────────────────────────────────────────────────────

export const RESOLUTION_FORM_FIELDS: FormField[] = [
  { key: "resolution_title",  label: "Resolution Title",       type: "text",     required: true, span: true },
  { key: "resolution_type",   label: "Resolution Type",        type: "select",   required: true, options: ["Ordinary", "Special", "Written", "Circular"] },
  { key: "source_meeting",    label: "Source Meeting",         type: "text",     placeholder: "e.g. MTG-2026-0344" },
  { key: "source_decision",   label: "Related Decision",       type: "text",     placeholder: "e.g. DEC-2026-0044" },
  { key: "committee",         label: "Governance Body",        type: "select",   required: true, options: GOVERNANCE_BODIES },
  { key: "proposed_by",       label: "Proposed By",            type: "text",     required: true },
  { key: "seconded_by",       label: "Seconded By",            type: "text" },
  { key: "voting_method",     label: "Voting Method",          type: "select",   options: ["Simple Majority", "Two-Third Majority", "Unanimous", "Consensus"] },
  { key: "votes_for",         label: "Votes For",              type: "number" },
  { key: "votes_against",     label: "Votes Against",          type: "number" },
  { key: "abstentions",       label: "Abstentions",            type: "number" },
  { key: "effective_date",    label: "Effective Date",         type: "date",     required: true, defaultValue: TODAY },
  { key: "confidentiality",   label: "Confidentiality",        type: "select",   options: CONFIDENTIALITY_LEVELS, defaultValue: "Internal" },
  // Written resolution extra fields
  { key: "circulation_date",  label: "Circulation Date",       type: "date",
    condition: { field: "resolution_type", value: "Written" } },
  { key: "signature_deadline",label: "Signature Deadline",     type: "date",
    condition: { field: "resolution_type", value: "Written" } },
  { key: "resolution_text",   label: "Resolution Text",        type: "textarea", required: true, span: true, rows: 5, placeholder: "The Board of Directors of Convay hereby resolves that…" },
  { key: "attachments",       label: "Supporting Documents",   type: "file",     span: true, maxFiles: 5, maxSizeMB: 10, accept: [".pdf", ".doc", ".docx"] },
];

// ─── Action Item form ─────────────────────────────────────────────────────────

export const ACTION_ITEM_FORM_FIELDS: FormField[] = [
  { key: "action_title",      label: "Action Title",           type: "text",     required: true, span: true },
  { key: "source_meeting",    label: "Source Meeting",         type: "text",     placeholder: "e.g. MTG-2026-0344" },
  { key: "source_decision",   label: "Related Decision",       type: "text",     placeholder: "e.g. DEC-2026-0044" },
  { key: "assigned_to",       label: "Assigned To",            type: "text",     required: true, placeholder: "Name or role" },
  { key: "committee",         label: "Governance Body",        type: "select",   options: GOVERNANCE_BODIES },
  { key: "priority",          label: "Priority",               type: "select",   options: ACTION_PRIORITIES, defaultValue: "Normal" },
  { key: "due_date",          label: "Due Date",               type: "date",     required: true },
  { key: "confidentiality",   label: "Confidentiality",        type: "select",   options: CONFIDENTIALITY_LEVELS, defaultValue: "Internal" },
  { key: "description",       label: "Action Description",     type: "textarea", required: true, span: true, rows: 4, placeholder: "Describe the required action clearly" },
  { key: "expected_outcome",  label: "Expected Outcome",       type: "textarea", span: true, rows: 3 },
  { key: "attachments",       label: "Reference Documents",    type: "file",     span: true, maxFiles: 5, maxSizeMB: 10, accept: [".pdf", ".doc", ".docx"] },
];

// ─── Question form ────────────────────────────────────────────────────────────

export const QUESTION_FORM_FIELDS: FormField[] = [
  { key: "question_text",     label: "Question",               type: "textarea", required: true, span: true, rows: 4, placeholder: "State your question clearly" },
  { key: "related_meeting",   label: "Related Meeting",        type: "text",     placeholder: "e.g. MTG-2026-0344" },
  { key: "agenda_item",       label: "Agenda Item",            type: "text",     placeholder: "e.g. Item 3 — Budget Approval" },
  { key: "document",          label: "Related Document",       type: "text",     placeholder: "e.g. DOC-2026-0118" },
  { key: "directed_to",       label: "Directed To",            type: "text",     placeholder: "Person or role" },
  { key: "priority",          label: "Priority",               type: "select",   options: PRIORITIES, defaultValue: "Normal" },
  { key: "visibility",        label: "Visibility",             type: "select",   options: ["Private", "Board Members Only", "All Participants"], defaultValue: "Board Members Only" },
  { key: "written_response",  label: "Written Response Required",type: "toggle", defaultValue: false },
  { key: "response_deadline", label: "Response Deadline",      type: "date" },
  { key: "additional_context",label: "Additional Context",     type: "textarea", span: true, rows: 3 },
  { key: "attachments",       label: "Attachments",            type: "file",     span: true, maxFiles: 5, maxSizeMB: 10, accept: [".pdf", ".jpg", ".png", ".doc", ".docx"] },
];

// ─── Private Note form ────────────────────────────────────────────────────────

export const NOTE_FORM_FIELDS: FormField[] = [
  { key: "note_title",        label: "Note Title",             type: "text",     required: true, span: true },
  { key: "related_meeting",   label: "Related Meeting",        type: "text",     placeholder: "e.g. MTG-2026-0344" },
  { key: "agenda_item",       label: "Agenda Item Reference",  type: "text" },
  { key: "document",          label: "Related Document",       type: "text" },
  { key: "note_content",      label: "Note",                   type: "textarea", required: true, span: true, rows: 6 },
  { key: "tags",              label: "Tags",                   type: "text",     span: true, placeholder: "Comma-separated tags" },
  { key: "private",           label: "Keep Private (not shared)", type: "toggle", defaultValue: true },
];

// ─── Matter Arising form ──────────────────────────────────────────────────────

export const MATTER_ARISING_FORM_FIELDS: FormField[] = [
  { key: "matter_title",      label: "Matter Title",           type: "text",     required: true, span: true },
  { key: "source_meeting",    label: "Source Meeting",         type: "text",     placeholder: "e.g. MTG-2026-0344" },
  { key: "source_decision",   label: "Related Decision",       type: "text" },
  { key: "assigned_to",       label: "Assigned To",            type: "text",     required: true },
  { key: "committee",         label: "Governance Body",        type: "select",   options: GOVERNANCE_BODIES },
  { key: "due_date",          label: "Expected Resolution Date",type: "date" },
  { key: "priority",          label: "Priority",               type: "select",   options: PRIORITIES, defaultValue: "Normal" },
  { key: "description",       label: "Description",            type: "textarea", required: true, span: true, rows: 4 },
  { key: "progress_notes",    label: "Progress Notes",         type: "textarea", span: true, rows: 3 },
];

// ─── Follow-up Question form ──────────────────────────────────────────────────

export const FOLLOWUP_QUESTION_FORM_FIELDS: FormField[] = [
  { key: "question_text",     label: "Follow-up Question",     type: "textarea", required: true, span: true, rows: 4 },
  { key: "original_question", label: "Original Question Reference",type: "text", placeholder: "e.g. QST-2026-0018" },
  { key: "related_meeting",   label: "Related Meeting",        type: "text" },
  { key: "directed_to",       label: "Directed To",            type: "text",     placeholder: "Person or role" },
  { key: "deadline",          label: "Response Deadline",      type: "date" },
  { key: "priority",          label: "Priority",               type: "select",   options: PRIORITIES, defaultValue: "Normal" },
  { key: "attachments",       label: "Attachments",            type: "file",     span: true, maxFiles: 3, maxSizeMB: 5, accept: [".pdf", ".jpg", ".png"] },
];

// ─── Governance Body form ─────────────────────────────────────────────────────

export const GOVERNANCE_BODY_FORM_FIELDS: FormField[] = [
  { key: "body_name",         label: "Body Name",              type: "text",     required: true, span: true, placeholder: "e.g. Board of Directors" },
  { key: "body_type",         label: "Body Type",              type: "select",   required: true, options: ["Board", "Committee", "Sub-Committee", "Advisory Panel", "Working Group"] },
  { key: "chairperson",       label: "Chairperson",            type: "text",     required: true },
  { key: "secretary",         label: "Secretary",              type: "text" },
  { key: "quorum_requirement",label: "Quorum Requirement",     type: "text",     placeholder: "e.g. 50%+1 or 3 members" },
  { key: "voting_method",     label: "Voting Method",          type: "select",   options: ["Simple Majority", "Two-Third Majority", "Unanimous", "Consensus"] },
  { key: "establishment_date",label: "Establishment Date",     type: "date" },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Inactive", "Suspended", "Dissolved"], defaultValue: "Active" },
  { key: "mandate",           label: "Mandate",                type: "textarea", span: true, rows: 4, placeholder: "Describe the purpose and mandate of this governance body" },
  { key: "charter",           label: "Charter / Terms of Reference",type: "file",span: true, maxFiles: 1, maxSizeMB: 10, accept: [".pdf", ".doc", ".docx"] },
];

// ─── Organization Unit form ───────────────────────────────────────────────────

export const ORG_UNIT_FORM_FIELDS: FormField[] = [
  { key: "unit_name",         label: "Unit Name",              type: "text",     required: true, span: true },
  { key: "unit_type",         label: "Unit Type",              type: "select",   required: true, options: ["Division", "Department", "Region", "Branch", "Subsidiary"] },
  { key: "parent_unit",       label: "Parent Unit",            type: "text",     placeholder: "e.g. Finance Division" },
  { key: "head",              label: "Unit Head",              type: "text",     required: true },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Inactive"], defaultValue: "Active" },
  { key: "description",       label: "Description",            type: "textarea", span: true, rows: 3 },
];

// ─── Designation / Position form ──────────────────────────────────────────────

export const DESIGNATION_FORM_FIELDS: FormField[] = [
  { key: "designation_title", label: "Designation Title",      type: "text",     required: true, span: true },
  { key: "category",          label: "Category",               type: "select",   options: ["Executive", "Non-Executive", "Independent", "External", "Advisory"] },
  { key: "governance_body",   label: "Governance Body",        type: "select",   options: GOVERNANCE_BODIES },
  { key: "level",             label: "Level",                  type: "select",   options: ["Board Level", "Senior Management", "Management", "Staff"] },
  { key: "voting_rights",     label: "Has Voting Rights",      type: "toggle",   defaultValue: true },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Inactive"], defaultValue: "Active" },
  { key: "description",       label: "Role Description",       type: "textarea", span: true, rows: 3 },
];

// ─── Participant Group form ───────────────────────────────────────────────────

export const PARTICIPANT_GROUP_FORM_FIELDS: FormField[] = [
  { key: "group_name",        label: "Group Name",             type: "text",     required: true, span: true },
  { key: "group_type",        label: "Group Type",             type: "select",   required: true, options: ["Static", "Dynamic", "Role-Based"] },
  { key: "description",       label: "Description",            type: "textarea", span: true, rows: 3 },
  { key: "governance_body",   label: "Default Governance Body",type: "select",   options: GOVERNANCE_BODIES },
  { key: "meeting_role",      label: "Default Meeting Role",   type: "select",   options: MEETING_ROLES },
  { key: "voting_eligible",   label: "Voting Eligible",        type: "toggle",   defaultValue: true },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Inactive"], defaultValue: "Active" },
];

// ─── Workflow form ────────────────────────────────────────────────────────────

export const WORKFLOW_FORM_FIELDS: FormField[] = [
  { key: "workflow_name",     label: "Workflow Name",          type: "text",     required: true, span: true },
  { key: "entity_type",       label: "Applies To",             type: "select",   required: true, options: ["Meeting", "Agenda Submission", "Board Pack", "Document", "Decision", "Resolution", "Minutes"] },
  { key: "trigger",           label: "Trigger Event",          type: "select",   options: ["On Creation", "On Submission", "On Status Change", "On Date"] },
  { key: "description",       label: "Description",            type: "textarea", span: true, rows: 3 },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Draft", "Inactive"], defaultValue: "Draft" },
  // Steps
  { key: "steps",             label: "Workflow Steps",         type: "repeatable-group", span: true, minRows: 1, maxRows: 10,
    subFields: [
      { key: "step_name",     label: "Step Name",              type: "text",     required: true },
      { key: "assignee",      label: "Assignee / Role",        type: "text",     required: true },
      { key: "action",        label: "Required Action",        type: "select",   options: ["Review", "Approve", "Sign", "Notify", "Publish"] },
      { key: "deadline_days", label: "Deadline (days)",        type: "number" },
    ]
  },
];

// ─── Meeting Type configuration form ─────────────────────────────────────────

export const MEETING_TYPE_FORM_FIELDS: FormField[] = [
  { key: "type_name",         label: "Meeting Type Name",      type: "text",     required: true, span: true },
  { key: "code",              label: "Short Code",             type: "text",     placeholder: "e.g. BOD, EXEC, AUD" },
  { key: "description",       label: "Description",            type: "textarea", span: true, rows: 3 },
  { key: "default_frequency", label: "Default Frequency",      type: "select",   options: ["Weekly", "Bi-Weekly", "Monthly", "Quarterly", "Semi-Annual", "Annual", "Ad Hoc"] },
  { key: "default_duration",  label: "Default Duration (hrs)", type: "number" },
  { key: "quorum_required",   label: "Quorum Required",        type: "toggle",   defaultValue: true },
  { key: "minutes_required",  label: "Minutes Required",       type: "toggle",   defaultValue: true },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Inactive"], defaultValue: "Active" },
];

// ─── Security Policy form ─────────────────────────────────────────────────────

export const SECURITY_POLICY_FORM_FIELDS: FormField[] = [
  { key: "policy_name",       label: "Policy Name",            type: "text",     required: true, span: true },
  { key: "policy_type",       label: "Policy Type",            type: "select",   required: true, options: ["Access Control", "Data Retention", "Encryption", "Authentication", "Authorization", "Audit"] },
  { key: "applies_to",        label: "Applies To",             type: "multiselect", options: ["All Users", "Board Members", "Secretariat", "Observers", "Administrators"] },
  { key: "effective_date",    label: "Effective Date",         type: "date" },
  { key: "review_date",       label: "Next Review Date",       type: "date" },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Draft", "Under Review", "Archived"], defaultValue: "Draft" },
  { key: "description",       label: "Policy Description",     type: "textarea", required: true, span: true, rows: 5 },
  { key: "attachments",       label: "Policy Document",        type: "file",     span: true, maxFiles: 2, maxSizeMB: 10, accept: [".pdf", ".doc", ".docx"] },
];

// ─── Retention / Legal Hold form ──────────────────────────────────────────────

export const RETENTION_FORM_FIELDS: FormField[] = [
  { key: "policy_name",       label: "Policy Name",            type: "text",     required: true, span: true },
  { key: "entity_type",       label: "Entity Type",            type: "select",   required: true, options: ["Meeting Records", "Minutes", "Resolutions", "Documents", "Attendance Records", "All Records"] },
  { key: "retention_period",  label: "Retention Period",       type: "select",   options: ["1 Year", "2 Years", "3 Years", "5 Years", "7 Years", "10 Years", "Permanent"] },
  { key: "disposal_method",   label: "Disposal Method",        type: "select",   options: ["Secure Delete", "Archive", "Transfer to Records Management"] },
  { key: "legal_basis",       label: "Legal Basis",            type: "textarea", span: true, rows: 3 },
  { key: "effective_date",    label: "Effective Date",         type: "date" },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Draft", "Archived"], defaultValue: "Draft" },
];

// ─── Custom Report form ───────────────────────────────────────────────────────

export const CUSTOM_REPORT_FORM_FIELDS: FormField[] = [
  { key: "report_name",       label: "Report Name",            type: "text",     required: true, span: true },
  { key: "report_type",       label: "Report Type",            type: "select",   required: true, options: ["Meeting Activity", "Decision Tracking", "Action Item Status", "Attendance", "Governance Summary", "Custom"] },
  { key: "data_source",       label: "Data Source",            type: "multiselect", options: ["Meetings", "Decisions", "Resolutions", "Action Items", "Attendance", "Documents"] },
  { key: "from_date",         label: "From Date",              type: "date" },
  { key: "to_date",           label: "To Date",                type: "date" },
  { key: "governance_body",   label: "Governance Body",        type: "select",   options: ["All", ...GOVERNANCE_BODIES] },
  { key: "format",            label: "Export Format",          type: "select",   options: ["PDF", "Excel", "CSV"], defaultValue: "PDF" },
  { key: "description",       label: "Description",            type: "textarea", span: true, rows: 3 },
  { key: "schedule",          label: "Schedule (optional)",    type: "select",   options: ["One-time", "Daily", "Weekly", "Monthly", "Quarterly"] },
];

// ─── Template form (generic) ──────────────────────────────────────────────────

export const TEMPLATE_FORM_FIELDS: FormField[] = [
  { key: "template_name",     label: "Template Name",          type: "text",     required: true, span: true },
  { key: "template_type",     label: "Template Type",          type: "select",   required: true, options: ["Meeting & Agenda", "Minutes & Resolution", "Document", "Communication", "Notification"] },
  { key: "description",       label: "Description",            type: "textarea", span: true, rows: 3 },
  { key: "language",          label: "Language",               type: "select",   options: ["English", "Bengali", "Both"], defaultValue: "English" },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Draft", "Archived"], defaultValue: "Draft" },
  { key: "file",              label: "Template File",          type: "file",     required: true, span: true, maxFiles: 1, maxSizeMB: 10, accept: [".pdf", ".doc", ".docx", ".html", ".txt"] },
];

// ─── Notification Rule form ───────────────────────────────────────────────────

export const NOTIFICATION_RULE_FORM_FIELDS: FormField[] = [
  { key: "rule_name",         label: "Rule Name",              type: "text",     required: true, span: true },
  { key: "trigger_event",     label: "Trigger Event",          type: "select",   required: true, options: ["Meeting Created", "Meeting Updated", "Board Pack Published", "Agenda Changed", "Action Item Due", "Decision Made", "Minutes Approved"] },
  { key: "recipients",        label: "Recipients",             type: "multiselect", options: ["All Board Members", "Secretariat", "Chairperson", "Meeting Organizer", "Action Owners", "All Participants"] },
  { key: "channels",          label: "Channels",               type: "multiselect", options: ["Email", "SMS", "In-App", "Push Notification"] },
  { key: "advance_days",      label: "Days Before Event",      type: "number",   placeholder: "e.g. 3 for 3 days before" },
  { key: "template",          label: "Message Template",       type: "text",     placeholder: "Template name or ID" },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Inactive"], defaultValue: "Active" },
];

// ─── Integration form ─────────────────────────────────────────────────────────

export const INTEGRATION_FORM_FIELDS: FormField[] = [
  { key: "integration_name",  label: "Integration Name",       type: "text",     required: true, span: true },
  { key: "integration_type",  label: "Type",                   type: "select",   required: true, options: ["Calendar (Exchange/Google)", "Email (SMTP)", "SMS Gateway", "Digital Signature", "Document Management", "ERP"] },
  { key: "endpoint_url",      label: "Endpoint URL",           type: "text",     required: true, span: true, placeholder: "https://api.example.com/v1" },
  { key: "api_key",           label: "API Key",                type: "text",     placeholder: "Will be stored securely" },
  { key: "status",            label: "Status",                 type: "select",   options: ["Active", "Inactive", "Testing"], defaultValue: "Testing" },
  { key: "description",       label: "Description",            type: "textarea", span: true, rows: 3 },
];

// ─── Approval Rule form ───────────────────────────────────────────────────────

export const APPROVAL_RULE_FORM_FIELDS: FormField[] = [
  { key: "rule_name",          label: "Rule Name",              type: "text",     required: true, span: true },
  { key: "rule_type",          label: "Rule Type",              type: "select",   required: true, options: ["Meeting Creation", "Agenda Submission", "Board Pack", "Document", "Resolution", "Minutes", "Action Item"] },
  { key: "applies_to",         label: "Applies To",             type: "multiselect", options: [...GOVERNANCE_BODIES, "All Governance Bodies"] },
  { key: "approval_mode",      label: "Approval Mode",          type: "select",   options: ["Sequential", "Parallel", "Any One", "Majority"], defaultValue: "Sequential" },
  { key: "required_approvers", label: "Required Approvers",     type: "multiselect", options: ["Chairperson", "Company Secretary", "CEO", "CFO", "CRO", "Head of Legal", "Board Member"] },
  { key: "min_approvals",      label: "Minimum Approvals",      type: "number",   placeholder: "e.g. 2" },
  { key: "deadline_days",      label: "Approval Deadline (days)", type: "number", placeholder: "e.g. 3" },
  { key: "escalation",         label: "Escalation Recipient",   type: "text",     placeholder: "Name or role" },
  { key: "effective_from",     label: "Effective From",         type: "date" },
  { key: "effective_to",       label: "Effective To",           type: "date" },
  { key: "status",             label: "Status",                 type: "select",   options: ["Active", "Inactive", "Draft"], defaultValue: "Active" },
  { key: "conditions",         label: "Conditions / Notes",     type: "textarea", span: true, rows: 3 },
];

// ─── Review & Revision Rule form ──────────────────────────────────────────────

export const REVIEW_RULE_FORM_FIELDS: FormField[] = [
  { key: "rule_name",          label: "Rule Name",              type: "text",     required: true, span: true },
  { key: "review_type",        label: "Review Type",            type: "select",   required: true, options: ["Document Review", "Minutes Review", "Resolution Review", "Board Pack Review", "Agenda Review"] },
  { key: "applies_to",         label: "Applies To",             type: "multiselect", options: [...GOVERNANCE_BODIES, "All Governance Bodies"] },
  { key: "required_reviewers", label: "Required Reviewers",     type: "multiselect", options: ["Chairperson", "Company Secretary", "Legal Counsel", "Compliance Officer", "Board Member"] },
  { key: "review_mode",        label: "Review Mode",            type: "select",   options: ["Sequential", "Parallel", "Any One"], defaultValue: "Sequential" },
  { key: "review_deadline",    label: "Review Deadline (days)", type: "number",   placeholder: "e.g. 5" },
  { key: "max_revision_cycles",label: "Max Revision Cycles",    type: "number",   placeholder: "e.g. 3", defaultValue: "3" },
  { key: "mandatory_comments", label: "Mandatory Comments",     type: "toggle",   defaultValue: true },
  { key: "escalation",         label: "Escalation Recipient",   type: "text",     placeholder: "Name or role" },
  { key: "effective_from",     label: "Effective From",         type: "date" },
  { key: "effective_to",       label: "Effective To",           type: "date" },
  { key: "status",             label: "Status",                 type: "select",   options: ["Active", "Inactive", "Draft"], defaultValue: "Active" },
];

// ─── Quorum Rule form ─────────────────────────────────────────────────────────

export const QUORUM_RULE_FORM_FIELDS: FormField[] = [
  { key: "rule_name",          label: "Rule Name",              type: "text",     required: true, span: true },
  { key: "governance_body",    label: "Governance Body",        type: "select",   required: true, options: GOVERNANCE_BODIES },
  { key: "quorum_type",        label: "Quorum Type",            type: "select",   options: ["Fixed Number", "Percentage", "Role-Based"], defaultValue: "Percentage" },
  { key: "min_members",        label: "Minimum Members",        type: "number",   placeholder: "e.g. 5" },
  { key: "min_percentage",     label: "Minimum Percentage (%)", type: "number",   placeholder: "e.g. 51" },
  { key: "required_roles",     label: "Required Roles Present", type: "multiselect", options: ["Chairperson", "Company Secretary", "CFO", "At Least One Independent Director"] },
  { key: "include_virtual",    label: "Include Virtual Attendance", type: "toggle", defaultValue: true },
  { key: "include_alternates", label: "Include Alternate Members",  type: "toggle", defaultValue: false },
  { key: "exclude_recused",    label: "Exclude Recused Members",    type: "toggle", defaultValue: true },
  { key: "lost_quorum",        label: "Lost Quorum Behavior",   type: "select",   options: ["Adjourn Meeting", "Suspend Voting Only", "Continue Without Binding Resolutions"] },
  { key: "effective_from",     label: "Effective From",         type: "date" },
  { key: "effective_to",       label: "Effective To",           type: "date" },
  { key: "status",             label: "Status",                 type: "select",   options: ["Active", "Inactive"], defaultValue: "Active" },
];

// ─── Voting Method form ───────────────────────────────────────────────────────

export const VOTING_METHOD_FORM_FIELDS: FormField[] = [
  { key: "method_name",        label: "Method Name",            type: "text",     required: true, span: true },
  { key: "method_code",        label: "Method Code",            type: "text",     placeholder: "e.g. SHOW_OF_HANDS" },
  { key: "voting_type",        label: "Voting Type",            type: "select",   required: true, options: ["Show of Hands", "Secret Ballot", "Voice Vote", "Electronic Vote", "Proxy Vote", "Written Consent"] },
  { key: "applicable_to",      label: "Applicable To",          type: "multiselect", options: [...GOVERNANCE_BODIES, "All Governance Bodies"] },
  { key: "threshold",          label: "Approval Threshold",     type: "select",   options: ["Simple Majority (>50%)", "Two-Thirds Majority (>66%)", "Three-Quarters (>75%)", "Unanimous", "Custom"], defaultValue: "Simple Majority (>50%)" },
  { key: "abstention",         label: "Abstention Treatment",   type: "select",   options: ["Count as Against", "Exclude from Count", "Count as Neutral"] },
  { key: "tie_handling",       label: "Tie Handling",           type: "select",   options: ["Chairman Casting Vote", "Motion Fails", "Re-vote"] },
  { key: "chairman_vote",      label: "Chairman Casting Vote",  type: "toggle",   defaultValue: false },
  { key: "secret_ballot",      label: "Secret Ballot",          type: "toggle",   defaultValue: false },
  { key: "proxy_allowed",      label: "Proxy Voting Allowed",   type: "toggle",   defaultValue: false },
  { key: "vote_change",        label: "Vote Change Allowed",    type: "toggle",   defaultValue: false },
  { key: "status",             label: "Status",                 type: "select",   options: ["Active", "Inactive"], defaultValue: "Active" },
];

// ─── Status & Numbering Configuration form ────────────────────────────────────

export const STATUS_CONFIG_FORM_FIELDS: FormField[] = [
  { key: "config_type",        label: "Configuration Type",     type: "radio",    required: true, options: ["Status", "Numbering"], defaultValue: "Status" },
  // Status fields
  { key: "entity_type",        label: "Entity Type",            type: "select",   required: true, options: ["Meeting", "Agenda", "Board Pack", "Document", "Decision", "Resolution", "Action Item", "Minutes"] },
  { key: "status_name",        label: "Status Name",            type: "text",     required: true },
  { key: "status_code",        label: "Status Code",            type: "text",     placeholder: "e.g. PENDING_APPROVAL" },
  { key: "badge_tone",         label: "Badge Colour",           type: "select",   options: ["primary", "success", "warning", "error", "neutral"], defaultValue: "neutral" },
  { key: "initial_status",     label: "Initial Status",         type: "toggle",   defaultValue: false },
  { key: "final_status",       label: "Final Status",           type: "toggle",   defaultValue: false },
  { key: "roles_allowed",      label: "Roles Allowed to Transition", type: "multiselect", options: ["Chairperson", "Company Secretary", "Board Member", "Administrator", "System"] },
  { key: "reason_required",    label: "Reason Required on Transition", type: "toggle", defaultValue: false },
  // Numbering fields
  { key: "prefix",             label: "Prefix",                 type: "text",     placeholder: "e.g. MTG, AGD, RES" },
  { key: "format_pattern",     label: "Format Pattern",         type: "text",     placeholder: "e.g. {PREFIX}-{YEAR}-{SEQ:4}" },
  { key: "sequence_length",    label: "Sequence Length",        type: "number",   defaultValue: "4" },
  { key: "starting_number",    label: "Starting Number",        type: "number",   defaultValue: "1" },
  { key: "reset_frequency",    label: "Reset Frequency",        type: "select",   options: ["Never", "Yearly", "Quarterly", "Monthly"] },
  { key: "status",             label: "Status",                 type: "select",   options: ["Active", "Inactive"], defaultValue: "Active" },
];

// ─── Legal Hold form ──────────────────────────────────────────────────────────

export const LEGAL_HOLD_FORM_FIELDS: FormField[] = [
  { key: "hold_title",         label: "Hold Title",             type: "text",     required: true, span: true },
  { key: "reference",          label: "Reference Number",       type: "text",     required: true },
  { key: "legal_matter",       label: "Related Legal Matter",   type: "text",     span: true, placeholder: "Case name, court reference, etc." },
  { key: "record_scope",       label: "Record Scope",           type: "multiselect", options: ["All Meeting Records", "Specific Meeting", "Resolutions", "Documents", "Minutes", "Attendance Records"] },
  { key: "reason",             label: "Reason for Hold",        type: "textarea", required: true, span: true, rows: 4 },
  { key: "custodian",          label: "Custodian / Owner",      type: "text",     required: true },
  { key: "start_date",         label: "Hold Start Date",        type: "date",     required: true },
  { key: "review_date",        label: "Review Date",            type: "date" },
  { key: "release_date",       label: "Anticipated Release Date", type: "date" },
  { key: "recipients",         label: "Notification Recipients",type: "multiselect", options: ["Legal Team", "Compliance", "Records Manager", "CEO", "Board Secretary"] },
  { key: "attachments",        label: "Supporting Attachment",  type: "file",     span: true, maxFiles: 3, maxSizeMB: 10, accept: [".pdf", ".doc", ".docx"] },
  { key: "status",             label: "Status",                 type: "select",   options: ["Active", "Under Review", "Released"], defaultValue: "Active" },
];

// ─── Position form ────────────────────────────────────────────────────────────

export const POSITION_FORM_FIELDS: FormField[] = [
  { key: "position_title",     label: "Position Title",         type: "text",     required: true, span: true },
  { key: "position_code",      label: "Position Code",          type: "text",     required: true, placeholder: "e.g. MD, DMD, SEVP" },
  { key: "position_type",      label: "Position Type",          type: "select",   options: ["Board Position", "Executive Position", "Managerial", "Staff"], defaultValue: "Board Position" },
  { key: "organization_unit",  label: "Organization Unit",      type: "select",   options: ["Head Office", "Board Secretariat", "Executive Office", "Finance", "Operations", "Legal", "Compliance"] },
  { key: "org_level",          label: "Organization Level",     type: "select",   options: ["Board Level", "C-Suite", "Senior Management", "Middle Management", "Staff"] },
  { key: "reports_to",         label: "Reports To",             type: "searchable-select", options: ["Board of Directors", "Chairman", "Managing Director", "DMD", "SEVP", "EVP"] },
  { key: "vacancy_status",     label: "Vacancy Status",         type: "select",   options: ["Filled", "Vacant", "Acting"], defaultValue: "Filled" },
  { key: "description",        label: "Description",            type: "textarea", span: true, rows: 3 },
  { key: "status",             label: "Status",                 type: "select",   options: ["Active", "Inactive"], defaultValue: "Active" },
];

// ─── Motion form ──────────────────────────────────────────────────────────────

export const MOTION_FORM_FIELDS: FormField[] = [
  { key: "motion_title",       label: "Motion Title",           type: "text",     required: true, span: true },
  { key: "motion_text",        label: "Motion Text",            type: "textarea", required: true, span: true, rows: 4 },
  { key: "proposed_by",        label: "Proposed By",            type: "text",     required: true },
  { key: "seconded_by",        label: "Seconded By",            type: "text" },
  { key: "voting_required",    label: "Voting Required",        type: "toggle",   defaultValue: true },
  { key: "amendments",         label: "Amendments (if any)",    type: "textarea", span: true, rows: 2 },
  { key: "notes",              label: "Notes",                  type: "textarea", span: true, rows: 2 },
];

// ─── Vote form ────────────────────────────────────────────────────────────────

export const VOTE_FORM_FIELDS: FormField[] = [
  { key: "voting_question",    label: "Voting Question",        type: "textarea", required: true, span: true, rows: 2 },
  { key: "voting_method",      label: "Voting Method",          type: "select",   required: true, options: ["Show of Hands", "Secret Ballot", "Electronic Vote", "Roll Call", "Written Resolution"] },
  { key: "threshold",          label: "Approval Threshold",     type: "select",   options: ["Simple Majority (50%+1)", "Two-Thirds Majority", "Three-Quarters Majority", "Unanimous"], defaultValue: "Simple Majority (50%+1)" },
  { key: "ballot_type",        label: "Ballot Type",            type: "radio",    options: ["Open Vote", "Secret Ballot"], defaultValue: "Open Vote" },
  { key: "allow_abstention",   label: "Allow Abstention",       type: "toggle",   defaultValue: true },
  { key: "proxy_voting",       label: "Allow Proxy Voting",     type: "toggle",   defaultValue: false },
  { key: "voting_duration",    label: "Voting Duration (min)",  type: "number",   placeholder: "e.g. 5" },
  { key: "notes",              label: "Notes",                  type: "textarea", span: true, rows: 2 },
];

// ─── Minutes form ─────────────────────────────────────────────────────────────

export const MINUTES_FORM_FIELDS: FormField[] = [
  { key: "meeting_id",         label: "Meeting ID",             type: "text",     required: true, placeholder: "e.g. MTG-2026-0001" },
  { key: "meeting_title",      label: "Meeting Title",          type: "text",     required: true },
  { key: "minutes_template",   label: "Minutes Template",       type: "select",   options: ["Standard Board Minutes", "Committee Minutes", "AGM Minutes", "Blank Template"] },
  { key: "minute_taker",       label: "Minute Taker",           type: "text",     required: true },
  { key: "co_authors",         label: "Co-Authors",             type: "text" },
  { key: "quorum_statement",   label: "Quorum Statement",       type: "textarea", span: true, rows: 2, placeholder: "A quorum was present throughout the meeting..." },
  { key: "discussion_summary", label: "Discussion Summary",     type: "textarea", span: true, rows: 6 },
  { key: "notes",              label: "Additional Notes",       type: "textarea", span: true, rows: 3 },
  { key: "next_meeting_date",  label: "Date of Next Meeting",   type: "date" },
  { key: "closing_time",       label: "Meeting Closing Time",   type: "time" },
];

// ─── Action Item: Progress Update form ───────────────────────────────────────

export const PROGRESS_UPDATE_FORM_FIELDS: FormField[] = [
  { key: "progress_pct",       label: "Progress (%)",           type: "number",   required: true, placeholder: "0 – 100" },
  { key: "status",             label: "Current Status",         type: "select",   required: true, options: ["In Progress", "Blocked", "Pending Review", "Overdue"] },
  { key: "update_summary",     label: "Update Summary",         type: "textarea", required: true, span: true, rows: 3 },
  { key: "blocker",            label: "Blocker (if any)",       type: "textarea", span: true, rows: 2 },
  { key: "forecast_date",      label: "Forecast Completion",    type: "date" },
  { key: "evidence",           label: "Evidence / Attachment",  type: "file",     span: true, maxFiles: 3, maxSizeMB: 10, accept: [".pdf", ".doc", ".docx", ".jpg", ".png"] },
];

// ─── Action Item: Extension Request form ─────────────────────────────────────

export const EXTENSION_REQUEST_FORM_FIELDS: FormField[] = [
  { key: "current_due_date",   label: "Current Due Date",       type: "date",     required: true },
  { key: "requested_due_date", label: "Requested New Due Date", type: "date",     required: true },
  { key: "reason",             label: "Reason for Extension",   type: "textarea", required: true, span: true, rows: 3 },
  { key: "delay_impact",       label: "Impact of Delay",        type: "textarea", span: true, rows: 2 },
  { key: "supporting_doc",     label: "Supporting Document",    type: "file",     span: true, maxFiles: 2, maxSizeMB: 10, accept: [".pdf", ".doc", ".docx"] },
  { key: "approver",           label: "Requested Approver",     type: "text" },
];

// ─── Action Item: Completion Submission form ──────────────────────────────────

export const COMPLETION_FORM_FIELDS: FormField[] = [
  { key: "completion_date",    label: "Completion Date",        type: "date",     required: true },
  { key: "outcome",            label: "Outcome",                type: "select",   required: true, options: ["Fully Completed", "Partially Completed", "Completed with Changes", "Superseded"] },
  { key: "completion_summary", label: "Completion Summary",     type: "textarea", required: true, span: true, rows: 3 },
  { key: "evidence",           label: "Completion Evidence",    type: "file",     required: true, span: true, maxFiles: 5, maxSizeMB: 20, accept: [".pdf", ".doc", ".docx", ".jpg", ".png", ".zip"] },
  { key: "final_remarks",      label: "Final Remarks",          type: "textarea", span: true, rows: 2 },
];

// ─── Meeting Participant form ─────────────────────────────────────────────────

export const PARTICIPANT_FORM_FIELDS: FormField[] = [
  { key: "meeting_id",             label: "Meeting ID",               type: "text",     required: true },
  { key: "name",                   label: "Participant Name",         type: "text",     required: true },
  { key: "designation",            label: "Designation",              type: "select",   required: true, options: DESIGNATIONS },
  { key: "organization",           label: "Organization",             type: "text",     defaultValue: "Convay" },
  { key: "role",                   label: "Meeting Role",             type: "select",   required: true, options: MEETING_ROLES },
  { key: "attendance_requirement", label: "Attendance Requirement",   type: "select",   options: ATTENDANCE_REQUIREMENTS },
  { key: "email",                  label: "Email Address",            type: "email" },
  { key: "phone",                  label: "Phone Number",             type: "phone" },
  { key: "rsvp_status",            label: "RSVP Status",              type: "select",   options: ["Pending", "Accepted", "Declined", "Tentative"], defaultValue: "Pending" },
  { key: "proxy_for",              label: "Proxy For (if applicable)", type: "text" },
  { key: "conflict_declared",      label: "Conflict Declared",        type: "select",   options: ["No", "Yes"], defaultValue: "No" },
];

// ─── RSVP Record form ─────────────────────────────────────────────────────────

export const RSVP_FORM_FIELDS: FormField[] = [
  { key: "meeting_id",       label: "Meeting ID",               type: "text",     required: true },
  { key: "participant_name", label: "Participant Name",         type: "text",     required: true },
  { key: "response",         label: "RSVP Response",            type: "select",   required: true, options: ["Accepted", "Declined", "Tentative", "Pending"] },
  { key: "response_date",    label: "Response Date",            type: "date",     required: true, defaultValue: TODAY },
  { key: "decline_reason",   label: "Reason for Declining",    type: "textarea", span: true, rows: 2 },
  { key: "proxy_nominee",    label: "Proxy Nominee",            type: "text" },
  { key: "notes",            label: "Additional Notes",         type: "textarea", span: true, rows: 2 },
];

// ─── Conflict Declaration form ────────────────────────────────────────────────

export const CONFLICT_FORM_FIELDS: FormField[] = [
  { key: "meeting_id",     label: "Meeting ID",           type: "text",     required: true },
  { key: "agenda_item",    label: "Agenda Item",          type: "text" },
  { key: "declared_by",    label: "Declared By",          type: "text",     required: true },
  { key: "conflict_type",  label: "Conflict Type",        type: "select",   required: true, options: ["Financial Interest", "Personal Relationship", "Competing Directorship", "Regulatory Conflict", "Other"] },
  { key: "description",    label: "Conflict Description", type: "textarea", required: true, span: true, rows: 3 },
  { key: "action_taken",   label: "Action Taken",         type: "select",   options: ["Recused from vote", "Abstained", "Left the room", "No action required"] },
  { key: "reviewed_by",    label: "Reviewed By",          type: "text",     defaultValue: "Company Secretary" },
];

// ─── Attendance Record form ───────────────────────────────────────────────────

export const ATTENDANCE_FORM_FIELDS: FormField[] = [
  { key: "meeting_id",       label: "Meeting ID",            type: "text",     required: true },
  { key: "participant_name", label: "Participant Name",      type: "text",     required: true },
  { key: "designation",      label: "Designation",           type: "select",   options: DESIGNATIONS },
  { key: "role",             label: "Role",                  type: "select",   options: MEETING_ROLES },
  { key: "check_in_time",    label: "Check-In Time",         type: "time" },
  { key: "check_out_time",   label: "Check-Out Time",        type: "time" },
  { key: "attendance_mode",  label: "Attendance Mode",       type: "select",   options: ["Physical", "Virtual", "Hybrid"], defaultValue: "Physical" },
  { key: "quorum_eligible",  label: "Quorum Eligible",       type: "select",   options: ["Yes", "No"], defaultValue: "Yes" },
  { key: "signed",           label: "Attendance Sheet Signed", type: "select", options: ["Yes", "No"], defaultValue: "Yes" },
  { key: "notes",            label: "Notes",                 type: "textarea", span: true, rows: 2 },
];

// ─── Quorum Event form ────────────────────────────────────────────────────────

export const QUORUM_EVENT_FORM_FIELDS: FormField[] = [
  { key: "meeting_id",      label: "Meeting ID",         type: "text",     required: true },
  { key: "event_type",      label: "Event Type",         type: "select",   required: true, options: ["Meeting Start", "Agenda Item", "After Break", "Vote", "End of Meeting"] },
  { key: "quorum_required", label: "Quorum Required",    type: "number",   required: true },
  { key: "quorum_present",  label: "Quorum Present",     type: "number",   required: true },
  { key: "quorum_met",      label: "Quorum Met",         type: "select",   options: ["Yes", "No"] },
  { key: "recorded_at",     label: "Time Recorded",      type: "time" },
  { key: "recorded_by",     label: "Recorded By",        type: "text",     defaultValue: "Company Secretary" },
  { key: "notes",           label: "Notes",              type: "textarea", span: true, rows: 2 },
];

// ─── Availability Poll form ───────────────────────────────────────────────────

export const AVAILABILITY_POLL_FORM_FIELDS: FormField[] = [
  { key: "poll_title",           label: "Poll Title",             type: "text",     required: true, span: true, placeholder: "e.g. Best date for Q3 Board Meeting" },
  { key: "related_meeting_id",   label: "Related Meeting",        type: "select",   options: [], placeholder: "Select a meeting" },
  { key: "time_zone",            label: "Time Zone",              type: "select",   options: TIME_ZONES, defaultValue: "Asia/Dhaka (GMT+6)" },
  { key: "response_deadline",    label: "Response Deadline",      type: "date",     required: true },
  { key: "proposed_dates",       label: "Proposed Date Options",  type: "textarea", span: true, rows: 3, placeholder: "List proposed dates, one per line (e.g. 2026-08-10, 2026-08-14)" },
  { key: "participants",         label: "Invited Participants",   type: "text",     placeholder: "Comma-separated names or roles" },
  { key: "allow_multiple",       label: "Allow Multiple Choices", type: "select",   options: ["Yes", "No"], defaultValue: "Yes" },
  { key: "allow_comments",       label: "Allow Comments",         type: "select",   options: ["Yes", "No"], defaultValue: "Yes" },
];

// ─── Meeting Effectiveness Review form ───────────────────────────────────────

const RATING_OPTIONS = ["1 - Very Poor", "2 - Poor", "3 - Satisfactory", "4 - Good", "5 - Excellent"];

export const EFFECTIVENESS_REVIEW_FORM_FIELDS: FormField[] = [
  { key: "related_meeting",       label: "Meeting Reference",        type: "text",     required: true, span: true },
  { key: "reviewer_name",         label: "Your Name",                type: "text" },
  { key: "anonymous",             label: "Submit Anonymously",       type: "toggle",   defaultValue: false },
  { key: "preparation_rating",    label: "Meeting Preparation",      type: "select",   required: true, options: RATING_OPTIONS, defaultValue: "4 - Good" },
  { key: "board_pack_quality",    label: "Board Pack Quality",       type: "select",   required: true, options: RATING_OPTIONS, defaultValue: "4 - Good" },
  { key: "agenda_relevance",      label: "Agenda Relevance",         type: "select",   required: true, options: RATING_OPTIONS, defaultValue: "4 - Good" },
  { key: "time_management",       label: "Time Management",          type: "select",   required: true, options: RATING_OPTIONS, defaultValue: "3 - Satisfactory" },
  { key: "discussion_quality",    label: "Quality of Discussion",    type: "select",   required: true, options: RATING_OPTIONS, defaultValue: "4 - Good" },
  { key: "decision_clarity",      label: "Clarity of Decisions",     type: "select",   required: true, options: RATING_OPTIONS, defaultValue: "4 - Good" },
  { key: "technology_performance",label: "Technology / Venue",       type: "select",   options: RATING_OPTIONS, defaultValue: "4 - Good" },
  { key: "overall_rating",        label: "Overall Meeting Rating",   type: "select",   required: true, options: RATING_OPTIONS, defaultValue: "4 - Good" },
  { key: "comments",              label: "Additional Comments",      type: "textarea", span: true, rows: 4, placeholder: "Any further observations or suggestions for improvement..." },
];
