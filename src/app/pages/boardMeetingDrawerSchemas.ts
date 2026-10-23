// ─── Independent Drawer Schemas for Every Active Entity ─────────────────────
// Each exported array is a complete ColDef[] for drawerCols in PageCfg.
// These schemas are independent of table columns — they expose all entity fields.
import { dg, df } from "./modulePageUtils";
import type { ColDef } from "./modulePageUtils";

// ─── Meeting Details ─────────────────────────────────────────────────────────
export const MEETING_DRAWER_COLS: ColDef[] = [
  dg("Overview", [
    { key: "meeting_id",       label: "Reference" },
    { key: "meeting_title",    label: "Title" },
    { key: "meeting_type",     label: "Type" },
    { key: "committee",        label: "Governance Body" },
    { key: "meeting_date",     label: "Date" },
    { key: "start_time",       label: "Start Time" },
    { key: "end_time",         label: "End Time" },
    { key: "time_zone",        label: "Time Zone" },
    { key: "mode",             label: "Mode" },
    { key: "confidentiality",  label: "Confidentiality" },
    { key: "purpose",          label: "Purpose" },
    { key: "approval_status",  label: "Status", badge: true },
  ]),
  dg("Leadership", [
    { key: "chairperson",  label: "Chairperson" },
    { key: "secretary",    label: "Secretary" },
    { key: "organizer",    label: "Organizer" },
  ]),
  dg("Venue & Access", [
    { key: "venue",             label: "Venue" },
    { key: "virtual_platform",  label: "Virtual Platform" },
    { key: "virtual_link",      label: "Meeting Link" },
  ]),
  dg("Quorum Members", [
    { key: "quorum_member_count",  label: "Count" },
    { key: "quorum_member_list",   label: "Members" },
  ]),
  dg("General Members", [
    { key: "general_member_count", label: "Count" },
    { key: "general_member_list",  label: "Members" },
  ]),
  dg("Attendance & RSVP", [
    { key: "participant_detail",  label: "Total Invited" },
    { key: "rsvp_accepted",       label: "RSVP Accepted" },
    { key: "rsvp_pending",        label: "RSVP Pending" },
    { key: "rsvp_declined",       label: "RSVP Declined" },
    { key: "readiness_score",     label: "Readiness" },
  ]),
  dg("Agendas", [
    { key: "agenda_count",  label: "Parent Agendas" },
    { key: "agenda_list",   label: "Selected Agendas" },
  ]),
  dg("Documents", [
    { key: "document_count",  label: "Total Documents" },
    { key: "document_list",   label: "Document Summary" },
    { key: "board_pack_status", label: "Board Pack" },
  ]),
  dg("Quorum", [
    { key: "quorum_rule_summary",  label: "Rule" },
    { key: "quorum_eligible",      label: "Eligible Participants" },
    { key: "quorum_forecast",      label: "Projected Result" },
  ]),
  dg("History & Audit", [
    { key: "created_by",        label: "Created By" },
    { key: "created_at",        label: "Created" },
    { key: "updated_at",        label: "Last Updated" },
    { key: "activity_summary",  label: "Recent Activity" },
  ]),
];

// ─── Agenda Item Details ──────────────────────────────────────────────────────
export const AGENDA_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "agenda_id",         label: "Reference" },
    { key: "agenda_title",      label: "Title" },
    { key: "agenda_reference",  label: "Agenda Reference" },
    { key: "agenda_category",   label: "Category" },
    { key: "priority",          label: "Priority" },
    { key: "confidentiality",   label: "Confidentiality" },
    { key: "approval_status",   label: "Status", badge: true },
  ]),
  dg("Meeting & Governance", [
    { key: "meeting_id",     label: "Meeting Reference" },
    { key: "meeting_title",  label: "Meeting" },
    { key: "committee",      label: "Governance Body" },
    { key: "meeting_type",   label: "Meeting Type" },
  ]),
  dg("Submission Details", [
    { key: "submitted_by",        label: "Submitted By" },
    { key: "owner",               label: "Owner" },
    { key: "presenter",           label: "Presenter" },
    { key: "submitting_division", label: "Submitting Division" },
    { key: "submission_date",     label: "Submission Date" },
    { key: "estimated_duration",  label: "Estimated Duration" },
    { key: "voting_required",     label: "Voting Required" },
  ]),
  dg("Content & Impact", [
    { key: "purpose",            label: "Purpose" },
    { key: "proposed_decision",  label: "Proposed Decision" },
    { key: "financial_impact",   label: "Financial Impact" },
  ]),
  dg("Approval History", [
    { key: "approval_history", label: "History" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Board Pack Details ───────────────────────────────────────────────────────
export const BOARD_PACK_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "pack_id",        label: "Reference" },
    { key: "pack_title",     label: "Title" },
    { key: "version",        label: "Version" },
    { key: "approval_status", label: "Status", badge: true },
    { key: "change_summary", label: "Change Summary" },
  ]),
  dg("Meeting & Governance", [
    { key: "related_meeting",  label: "Meeting Reference" },
    { key: "meeting_title",    label: "Meeting" },
    { key: "committee",        label: "Governance Body" },
  ]),
  dg("Content & Access", [
    { key: "document_count",     label: "Documents" },
    { key: "review_completion",  label: "Review Completion" },
    { key: "access_policy",      label: "Access Policy" },
  ]),
  dg("Schedule", [
    { key: "publication_date",  label: "Publication Date" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Document Details ─────────────────────────────────────────────────────────
export const DOCUMENT_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "doc_id",           label: "Reference" },
    { key: "doc_name",         label: "Document Name" },
    { key: "doc_number",       label: "Document Number" },
    { key: "doc_type",         label: "Document Type" },
    { key: "version",          label: "Version" },
    { key: "confidentiality",  label: "Confidentiality" },
    { key: "approval_status",  label: "Status", badge: true },
  ]),
  dg("Meeting & Ownership", [
    { key: "related_meeting",  label: "Related Meeting" },
    { key: "related_agenda",   label: "Related Agenda Item" },
    { key: "owner",            label: "Document Owner" },
  ]),
  dg("Validity & Compliance", [
    { key: "effective_date",           label: "Effective Date" },
    { key: "expiry_date",              label: "Expiry Date" },
    { key: "acknowledgement_required", label: "Acknowledgement Required" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Decision Details ─────────────────────────────────────────────────────────
export const DECISION_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "decision_id",      label: "Reference" },
    { key: "decision_title",   label: "Decision" },
    { key: "decision_type",    label: "Type" },
    { key: "approval_status",  label: "Approval Status", badge: true },
    { key: "implementation_status", label: "Implementation Status", badge: true },
  ]),
  dg("Source", [
    { key: "source_meeting",  label: "Source Meeting" },
    { key: "agenda_item",     label: "Agenda Item" },
  ]),
  dg("Ownership & Deadlines", [
    { key: "decision_owner",           label: "Decision Owner" },
    { key: "effective_date",           label: "Effective Date" },
    { key: "implementation_deadline",  label: "Implementation Deadline" },
    { key: "financial_impact",         label: "Financial Impact" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Resolution Details ───────────────────────────────────────────────────────
export const RESOLUTION_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "resolution_id",     label: "Reference" },
    { key: "resolution_title",  label: "Resolution" },
    { key: "resolution_type",   label: "Type" },
    { key: "approval_status",   label: "Status", badge: true },
  ]),
  dg("Source", [
    { key: "source_meeting",   label: "Source Meeting" },
    { key: "source_decision",  label: "Source Decision" },
  ]),
  dg("Content", [
    { key: "resolution_text",  label: "Resolution Text" },
    { key: "proposed_by",      label: "Proposed By" },
    { key: "seconded_by",      label: "Seconded By" },
  ]),
  dg("Voting", [
    { key: "vote_result",     label: "Vote Result" },
    { key: "votes_for",       label: "Votes For" },
    { key: "votes_against",   label: "Votes Against" },
    { key: "abstentions",     label: "Abstentions" },
  ]),
  dg("Effectivity", [
    { key: "effective_date",  label: "Effective Date" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Action Item Details ──────────────────────────────────────────────────────
export const ACTION_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "action_id",     label: "Reference" },
    { key: "action_title",  label: "Action" },
    { key: "priority",      label: "Priority" },
    { key: "approval_status",        label: "Approval Status", badge: true },
    { key: "implementation_status",  label: "Implementation Status", badge: true },
  ]),
  dg("Source", [
    { key: "source_meeting",   label: "Source Meeting" },
    { key: "source_decision",  label: "Source Decision" },
  ]),
  dg("Ownership & Progress", [
    { key: "assigned_to",      label: "Assigned To" },
    { key: "due_date",         label: "Due Date" },
    { key: "completion_date",  label: "Completion Date" },
    { key: "progress",         label: "Progress" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── RSVP / Invitation Details ────────────────────────────────────────────────
export const RSVP_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "rsvp_id",  label: "Reference" },
    { key: "response", label: "Response", badge: true },
  ]),
  dg("Meeting", [
    { key: "meeting_id",     label: "Meeting Reference" },
    { key: "meeting_title",  label: "Meeting" },
  ]),
  dg("Participant", [
    { key: "participant_id",    label: "Participant ID" },
    { key: "participant_name",  label: "Participant Name" },
  ]),
  dg("Response Details", [
    { key: "response_date",   label: "Response Date" },
    { key: "decline_reason",  label: "Decline Reason" },
    { key: "proxy_nominee",   label: "Proxy Nominee" },
    { key: "notes",           label: "Notes" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Minutes Details ──────────────────────────────────────────────────────────
export const MINUTES_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "minutes_id",       label: "Reference" },
    { key: "meeting_title",    label: "Meeting" },
    { key: "version",          label: "Version" },
    { key: "approval_status",  label: "Status", badge: true },
    { key: "minutes_template", label: "Template" },
  ]),
  dg("Authorship", [
    { key: "minute_taker",  label: "Minute Taker" },
    { key: "co_authors",    label: "Co-Authors" },
  ]),
  dg("Content", [
    { key: "quorum_statement",    label: "Quorum Statement" },
    { key: "discussion_summary",  label: "Discussion Summary" },
    { key: "closing_time",        label: "Closing Time" },
    { key: "next_meeting_date",   label: "Next Meeting Date" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Governance Body Details ──────────────────────────────────────────────────
export const GOV_BODY_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "body_id",    label: "Reference" },
    { key: "body_name",  label: "Name" },
    { key: "body_type",  label: "Type" },
    { key: "status",     label: "Status", badge: true },
  ]),
  dg("Leadership", [
    { key: "chairperson",  label: "Chairperson" },
    { key: "secretary",    label: "Secretary" },
  ]),
  dg("Composition & Voting", [
    { key: "member_count",        label: "Member Count" },
    { key: "quorum_requirement",  label: "Quorum Requirement" },
    { key: "voting_method",       label: "Voting Method" },
  ]),
  dg("Mandate & History", [
    { key: "establishment_date",  label: "Established" },
    { key: "mandate",             label: "Mandate" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Participant Group Details ─────────────────────────────────────────────────
export const PARTICIPANT_GROUP_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "group_id",    label: "Reference" },
    { key: "group_name",  label: "Group Name" },
    { key: "group_type",  label: "Type" },
    { key: "status",      label: "Status", badge: true },
  ]),
  dg("Membership", [
    { key: "member_count",     label: "Members" },
    { key: "membership_rule",  label: "Membership Rule" },
    { key: "committee",        label: "Associated Body" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Organization Unit Details ────────────────────────────────────────────────
export const ORG_UNIT_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "unit_id",     label: "Reference" },
    { key: "unit_name",   label: "Unit Name" },
    { key: "unit_type",   label: "Type" },
    { key: "status",      label: "Status", badge: true },
  ]),
  dg("Hierarchy", [
    { key: "parent_unit",  label: "Parent Unit" },
    { key: "child_units",  label: "Child Units" },
    { key: "head",         label: "Unit Head" },
  ]),
  dg("Governance", [
    { key: "committee",        label: "Linked Governance Body" },
    { key: "meeting_type",     label: "Meeting Types" },
    { key: "establishment_date", label: "Established" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Position / Designation Details ──────────────────────────────────────────
export const DESIGNATION_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "designation_id",    label: "Reference" },
    { key: "designation_title", label: "Designation" },
    { key: "designation_type",  label: "Type" },
    { key: "status",            label: "Status", badge: true },
  ]),
  dg("Scope & Authority", [
    { key: "level",       label: "Level" },
    { key: "committee",   label: "Governance Body" },
    { key: "authority",   label: "Authority" },
    { key: "mandate",     label: "Mandate" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Matter Arising Details ───────────────────────────────────────────────────
export const MATTER_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "matter_id",       label: "Reference" },
    { key: "matter_title",    label: "Matter" },
    { key: "current_status",  label: "Status", badge: true },
    { key: "progress",        label: "Progress" },
  ]),
  dg("Source", [
    { key: "source_meeting",   label: "Source Meeting" },
    { key: "source_agenda",    label: "Source Agenda Item" },
    { key: "source_decision",  label: "Source Decision" },
  ]),
  dg("Ownership & Timeline", [
    { key: "owner",             label: "Responsible Owner" },
    { key: "due_date",          label: "Due Date" },
    { key: "next_review_date",  label: "Next Review Date" },
    { key: "target_meeting",    label: "Target Meeting" },
    { key: "delay_reason",      label: "Delay Reason" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Conflict Declaration Details ─────────────────────────────────────────────
export const CONFLICT_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "conflict_id",    label: "Reference" },
    { key: "conflict_type",  label: "Conflict Type" },
    { key: "review_status",  label: "Status", badge: true },
  ]),
  dg("Meeting", [
    { key: "meeting_id",     label: "Meeting Reference" },
    { key: "meeting_title",  label: "Meeting" },
    { key: "agenda_item",    label: "Agenda Item" },
  ]),
  dg("Declaration", [
    { key: "declared_by",   label: "Declared By" },
    { key: "description",   label: "Description" },
    { key: "action_taken",  label: "Action Taken" },
  ]),
  dg("Review", [
    { key: "reviewed_by",  label: "Reviewed By" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Attendance Record Details ─────────────────────────────────────────────────
export const ATTENDANCE_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "attendance_id",   label: "Reference" },
    { key: "attendance_mode", label: "Mode" },
    { key: "signed",          label: "Signed", badge: true },
    { key: "quorum_eligible", label: "Quorum Eligible" },
  ]),
  dg("Meeting", [
    { key: "meeting_id",     label: "Meeting Reference" },
    { key: "meeting_title",  label: "Meeting" },
  ]),
  dg("Participant", [
    { key: "participant_id",    label: "Participant ID" },
    { key: "participant_name",  label: "Participant Name" },
    { key: "designation",       label: "Designation" },
    { key: "role",              label: "Role" },
  ]),
  dg("Attendance Timing", [
    { key: "check_in_time",   label: "Check-In Time" },
    { key: "check_out_time",  label: "Check-Out Time" },
    { key: "notes",           label: "Notes" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Poll Details ─────────────────────────────────────────────────────────────
export const POLL_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "poll_id",       label: "Reference" },
    { key: "poll_title",    label: "Poll Title" },
    { key: "poll_type",     label: "Type" },
    { key: "poll_status",   label: "Status", badge: true },
  ]),
  dg("Meeting & Scope", [
    { key: "meeting_id",     label: "Meeting Reference" },
    { key: "meeting_title",  label: "Meeting" },
    { key: "committee",      label: "Governance Body" },
  ]),
  dg("Schedule & Responses", [
    { key: "open_date",        label: "Open Date" },
    { key: "close_date",       label: "Close Date" },
    { key: "total_responses",  label: "Total Responses" },
    { key: "description",      label: "Description" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Security Policy Details ──────────────────────────────────────────────────
export const SECURITY_POLICY_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "meeting_title",  label: "Policy Name" },
    { key: "audit_type",     label: "Policy Type" },
    { key: "audit_status",   label: "Status", badge: true },
  ]),
  dg("Scope & Ownership", [
    { key: "committee",    label: "Applies To" },
    { key: "auditor",      label: "Policy Owner" },
    { key: "audit_date",   label: "Last Reviewed" },
    { key: "meeting_year", label: "Year" },
  ]),
  dg("Details", [
    { key: "audit_scope",      label: "Scope" },
    { key: "audit_findings",   label: "Findings" },
    { key: "audit_follow_up",  label: "Follow-Up Actions" },
  ]),
  dg("Activity", [
    { key: "meeting_id",  label: "Reference" },
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Retention / Legal Hold Rule Details ─────────────────────────────────────
export const RETENTION_RULE_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "hold_id",       label: "Reference" },
    { key: "hold_title",    label: "Rule Name" },
    { key: "hold_type",     label: "Type" },
    { key: "hold_status",   label: "Status", badge: true },
  ]),
  dg("Scope", [
    { key: "committee",    label: "Applies To" },
    { key: "meeting_year", label: "Year" },
    { key: "authority",    label: "Authority" },
  ]),
  dg("Dates", [
    { key: "effective_date",  label: "Effective Date" },
    { key: "expiry_date",     label: "Expiry Date" },
    { key: "created_by",      label: "Created By" },
    { key: "created_at",      label: "Created At" },
  ]),
];

// ─── Approval Rule Details ─────────────────────────────────────────────────────
export const APPROVAL_RULE_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "rule_id",     label: "Reference" },
    { key: "rule_name",   label: "Rule Name" },
    { key: "rule_type",   label: "Type" },
    { key: "status",      label: "Status", badge: true },
  ]),
  dg("Scope", [
    { key: "committee",    label: "Applies To" },
    { key: "circle",       label: "Unit" },
    { key: "approvers",    label: "Approvers" },
    { key: "threshold",    label: "Threshold" },
  ]),
  dg("Configuration", [
    { key: "escalation",   label: "Escalation" },
    { key: "sla_hours",    label: "SLA (Hours)" },
    { key: "description",  label: "Description" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Workflow Definition Details ──────────────────────────────────────────────
export const WORKFLOW_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "workflow_id",    label: "Reference" },
    { key: "workflow_name",  label: "Workflow Name" },
    { key: "workflow_type",  label: "Type" },
    { key: "status",         label: "Status", badge: true },
  ]),
  dg("Configuration", [
    { key: "steps",         label: "Steps" },
    { key: "committee",     label: "Applies To" },
    { key: "description",   label: "Description" },
    { key: "escalation",    label: "Escalation Path" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
    { key: "updated_at",  label: "Last Updated" },
  ]),
];

// ─── Revision Rule Details ────────────────────────────────────────────────────
export const REVISION_RULE_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "rule_id",     label: "Reference" },
    { key: "rule_name",   label: "Rule Name" },
    { key: "rule_type",   label: "Type" },
    { key: "status",      label: "Status", badge: true },
  ]),
  dg("Scope & Conditions", [
    { key: "applies_to",    label: "Applies To" },
    { key: "conditions",    label: "Conditions" },
    { key: "approvers",     label: "Approvers" },
    { key: "description",   label: "Description" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Workflow History Details ──────────────────────────────────────────────────
export const WORKFLOW_HISTORY_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "history_id",    label: "Reference" },
    { key: "entity_type",   label: "Entity Type" },
    { key: "entity_title",  label: "Entity" },
    { key: "action",        label: "Action", badge: true },
    { key: "status",        label: "Status", badge: true },
  ]),
  dg("Workflow", [
    { key: "workflow_name",  label: "Workflow" },
    { key: "step_name",      label: "Step" },
    { key: "committee",      label: "Governance Body" },
  ]),
  dg("Actor & Timing", [
    { key: "actor",       label: "Actor" },
    { key: "action_date", label: "Action Date" },
    { key: "duration",    label: "Duration" },
    { key: "notes",       label: "Notes" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Meeting Template Details ──────────────────────────────────────────────────
export const TEMPLATE_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "template_id",     label: "Reference" },
    { key: "template_name",   label: "Template Name" },
    { key: "template_type",   label: "Type" },
    { key: "status",          label: "Status", badge: true },
  ]),
  dg("Scope", [
    { key: "committee",    label: "Governance Body" },
    { key: "meeting_type", label: "Meeting Type" },
    { key: "language",     label: "Language" },
    { key: "description",  label: "Description" },
  ]),
  dg("Structure", [
    { key: "agenda_count",    label: "Agenda Sections" },
    { key: "document_count",  label: "Document Sections" },
    { key: "version",         label: "Version" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
    { key: "updated_at",  label: "Last Updated" },
  ]),
];

// ─── Board Question Details ────────────────────────────────────────────────────
export const QUESTION_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "question_id",    label: "Reference" },
    { key: "question_text",  label: "Question" },
    { key: "priority",       label: "Priority" },
    { key: "visibility",     label: "Visibility" },
    { key: "approval_status", label: "Status", badge: true },
  ]),
  dg("Meeting & Context", [
    { key: "related_meeting",  label: "Related Meeting" },
    { key: "agenda_item",      label: "Agenda Item" },
    { key: "document_ref",     label: "Document Reference" },
  ]),
  dg("Routing", [
    { key: "directed_to",               label: "Directed To" },
    { key: "asked_by",                  label: "Asked By" },
    { key: "written_response_required", label: "Written Response Required" },
    { key: "deadline",                  label: "Response Deadline" },
  ]),
  dg("Response", [
    { key: "response_text",  label: "Response" },
    { key: "responded_by",   label: "Responded By" },
    { key: "response_date",  label: "Response Date" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Private Note Details ──────────────────────────────────────────────────────
export const NOTE_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "note_id",     label: "Reference" },
    { key: "note_title",  label: "Title" },
    { key: "bookmarked",  label: "Bookmarked", badge: true },
    { key: "tags",        label: "Tags" },
  ]),
  dg("Meeting & Context", [
    { key: "related_meeting",  label: "Related Meeting" },
    { key: "agenda_item",      label: "Agenda Item" },
    { key: "document_ref",     label: "Document Reference" },
    { key: "page_reference",   label: "Page Reference" },
  ]),
  dg("Content & Sharing", [
    { key: "note_content",  label: "Note Content" },
    { key: "shared_with",   label: "Shared With" },
  ]),
  dg("Activity", [
    { key: "created_by",  label: "Created By" },
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Quorum Rule Details ──────────────────────────────────────────────────────
export const QUORUM_RULE_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "agenda_no",        label: "Rule Name" },
    { key: "approval_status",  label: "Status", badge: true },
  ]),
  dg("Governance & Scope", [
    { key: "name",         label: "Governance Body" },
    { key: "agenda_date",  label: "Quorum Type" },
    { key: "meeting_type", label: "Meeting Type" },
    { key: "committee",    label: "Committee" },
  ]),
  dg("Thresholds", [
    { key: "approved_amount",   label: "Min. Members" },
    { key: "disbursed_amount",  label: "Min. Percentage" },
  ]),
  dg("Validity", [
    { key: "outstanding",  label: "Effective Date" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// ─── Voting Method Details ─────────────────────────────────────────────────────
export const VOTING_METHOD_DRAWER_COLS: ColDef[] = [
  dg("Summary", [
    { key: "particulars",  label: "Method Name" },
    { key: "balance",      label: "Status", badge: true },
  ]),
  dg("Configuration", [
    { key: "reference",  label: "Method Type" },
    { key: "name",       label: "Applicable To" },
    { key: "debit",      label: "Majority Rule" },
    { key: "credit",     label: "Eligible Voters" },
  ]),
  dg("Validity", [
    { key: "transaction_date",  label: "Last Updated" },
  ]),
  dg("Activity", [
    { key: "created_at",  label: "Created At" },
  ]),
];

// Re-export df for convenience in pages that need single flat fields
export { df };
