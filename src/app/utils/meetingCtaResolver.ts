// Centralized Meeting CTA resolver — determines which actions are available
// for a given meeting record based on status, role, invitation state, and time.

export type MeetingStatus =
  | "Draft"
  | "Pending Approval"
  | "Approved"
  | "Scheduled"
  | "In Progress"
  | "Completed"
  | "Awaiting Minutes"
  | "Minutes Submitted"
  | "Minutes Approved"
  | "Cancelled"
  | "Postponed";

export type UserRole =
  | "Board Secretary"
  | "Company Secretary"
  | "Chairperson"
  | "Board Member"
  | "Independent Director"
  | "Observer"
  | "Viewer"
  | "Admin";

export type MeetingCta =
  | "edit"
  | "submit_for_approval"
  | "approve"
  | "reject"
  | "request_revision"
  | "schedule"
  | "publish_board_pack"
  | "join_meeting"
  | "start_meeting"
  | "view_live"
  | "record_minutes"
  | "submit_minutes"
  | "approve_minutes"
  | "create_next_meeting"
  | "cancel"
  | "postpone"
  | "view_details"
  | "download_pack"
  | "export_minutes";

export interface MeetingCtaContext {
  status: MeetingStatus;
  role: UserRole;
  isInvited: boolean;
  meetingDate?: string;   // ISO date string
  startTime?: string;     // "HH:MM"
  now?: Date;
}

function isMeetingUpcoming(date?: string, time?: string, now = new Date()): boolean {
  if (!date) return false;
  const dt = new Date(`${date}T${time ?? "00:00"}:00`);
  return dt > now;
}

function isMeetingJoinable(date?: string, time?: string, now = new Date()): boolean {
  if (!date) return false;
  const dt = new Date(`${date}T${time ?? "00:00"}:00`);
  const diff = (dt.getTime() - now.getTime()) / 60000; // minutes
  return diff <= 30 && diff >= -480; // within 30 min before to 8 hrs after start
}

const EDITING_ROLES: UserRole[] = ["Board Secretary", "Company Secretary", "Admin"];
const APPROVER_ROLES: UserRole[] = ["Board Secretary", "Company Secretary", "Admin", "Chairperson"];
const MINUTES_ROLES: UserRole[] = ["Board Secretary", "Company Secretary", "Admin"];

export function resolveMeetingCtas(ctx: MeetingCtaContext): MeetingCta[] {
  const { status, role, isInvited, meetingDate, startTime, now } = ctx;
  const ctas: MeetingCta[] = [];
  const canEdit = EDITING_ROLES.includes(role);
  const canApprove = APPROVER_ROLES.includes(role);
  const canMinutes = MINUTES_ROLES.includes(role);

  // Always available
  ctas.push("view_details");

  switch (status) {
    case "Draft":
      if (canEdit) {
        ctas.push("edit", "submit_for_approval", "cancel");
      }
      break;

    case "Pending Approval":
      if (canApprove) {
        ctas.push("approve", "reject", "request_revision");
      }
      if (canEdit) {
        ctas.push("edit");
      }
      break;

    case "Approved":
    case "Scheduled":
      if (canEdit) {
        ctas.push("edit", "publish_board_pack", "cancel", "postpone");
      }
      if (isInvited) {
        ctas.push("download_pack");
      }
      if (isMeetingJoinable(meetingDate, startTime, now)) {
        ctas.push("join_meeting");
        if (canApprove) ctas.push("start_meeting");
      }
      break;

    case "In Progress":
      if (isInvited || canEdit) {
        ctas.push("view_live");
      }
      if (canApprove) {
        ctas.push("start_meeting");
      }
      break;

    case "Completed":
    case "Awaiting Minutes":
      if (canMinutes) {
        ctas.push("record_minutes");
      }
      if (isInvited) {
        ctas.push("download_pack");
      }
      if (canEdit) {
        ctas.push("create_next_meeting");
      }
      break;

    case "Minutes Submitted":
      if (canApprove) {
        ctas.push("approve_minutes", "request_revision");
      }
      if (canMinutes) {
        ctas.push("record_minutes");
      }
      if (isInvited) {
        ctas.push("download_pack");
      }
      break;

    case "Minutes Approved":
      ctas.push("export_minutes", "download_pack");
      if (canEdit) {
        ctas.push("create_next_meeting");
      }
      break;

    case "Cancelled":
    case "Postponed":
      if (canEdit && status === "Postponed") {
        ctas.push("edit", "schedule");
      }
      break;
  }

  return [...new Set(ctas)];
}

// Returns whether a specific CTA is available
export function hasMeetingCta(ctx: MeetingCtaContext, cta: MeetingCta): boolean {
  return resolveMeetingCtas(ctx).includes(cta);
}
