import type { LucideIcon } from "lucide-react";

// ── Entity type registry ──────────────────────────────────────────────────────

export type EntityType =
  | "meeting"
  | "agenda_item"
  | "document"
  | "board_pack"
  | "question"
  | "decision"
  | "resolution"
  | "action_item"
  | "minutes"
  | "governance_body"
  | "user"
  | "workflow"
  | "notification";

// ── Resolved action ───────────────────────────────────────────────────────────

export type ActionTone = "primary" | "success" | "warning" | "danger" | "neutral";
export type ActionPlacement = "direct" | "more";

export interface ResolvedAction {
  /** Unique ID — must match GenPage switch-case IDs for native dispatch to work */
  id: string;
  label: string;
  icon: LucideIcon;
  tone: ActionTone;
  placement: ActionPlacement;
  /** Lower number = rendered first */
  priority: number;
  /** False → button not rendered at all */
  visible: boolean;
  /** False → button rendered but grayed/disabled */
  enabled: boolean;
  /** Shown as tooltip when enabled === false */
  disabledReason?: string;
  requiresConfirmation?: boolean;
  confirmMessage?: string;
  requiresReason?: boolean;
  reasonLabel?: string;
  /** For use outside GenPage (custom modals, drawer overrides). GenPage uses ID dispatch. */
  handler?: () => void;
  /** Legacy compat — CSS color token passed to icon */
  color?: string;
}

// ── Roles ─────────────────────────────────────────────────────────────────────

export type MeetingRole = "host" | "secretary" | "organizer" | "participant" | "approver" | "viewer";

// ── Relationships ─────────────────────────────────────────────────────────────

export interface RelationshipData {
  participants?: Array<{
    meeting_id: string;
    person_name: string;
    user_id?: string;
    role: string;
    rsvp_status?: string;
    attendance_status?: string;
  }>;
  rsvpRecords?: Array<{
    meeting_id: string;
    participant_name: string;
    response: string;
  }>;
  minutes?: Array<{
    meeting_id: string;
    approval_status: string;
    minute_taker?: string;
  }>;
  boardPacks?: Array<{
    related_meeting: string;
    approval_status: string;
    pack_id?: string;
  }>;
  agendaItems?: Array<{
    meeting_id: string;
    approval_status: string;
  }>;
  decisions?: Array<{
    source_meeting: string;
    approval_status: string;
  }>;
}

// ── Action context ────────────────────────────────────────────────────────────

export interface ActionContext {
  entity: EntityType;
  record: Record<string, unknown>;
  currentUser: {
    id: string;
    name: string;
    designation?: string;
    employeeId?: string;
  };
  userRole: string;
  permissions: string[];
  meetingRoles?: MeetingRole[];
  now: Date;
  relationships?: RelationshipData;
}
