/**
 * Shared validation utilities for the Board Meeting Solution.
 *
 * These functions are pure (no side-effects) so they can be used by any
 * component, form, or registry hook without creating circular dependencies.
 * Do not import UI components or registries from here.
 */

import type { BmsUser, UserType } from "../data/bmsUsers";
import type { BmsRole } from "../data/bmsRoles";
import type { Designation } from "../data/designations";
import type { OrgUnit } from "../data/boardMeetingData";
import type { AgendaSubmission } from "../data/boardMeetingData";
import type { AgendaDocumentLink } from "../data/boardMeetingData";
import type { MeetingAgendaLink } from "../data/boardMeetingData";
import type { MeetingParticipantLink } from "../data/boardMeetingData";

// ── Format validation ─────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Returns true when the string is a structurally valid email address. */
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

/** Returns true when the string looks like a valid phone number (7-15 digits, optional +/spaces/dashes). */
export function isValidPhone(phone: string): boolean {
  return /^\+?[\d\s\-().]{7,20}$/.test(phone.trim());
}

// ── User validation ────────────────────────────────────────────────────────────

/**
 * Returns true when the email is not already used by another user in the list.
 * The check is case-insensitive.
 */
export function isEmailUnique(
  email: string,
  users: BmsUser[],
  excludeId?: string,
): boolean {
  const normalised = email.trim().toLowerCase();
  return !users.some(
    u => u.email.toLowerCase() === normalised && u.id !== excludeId,
  );
}

/**
 * Returns true when the employee ID is not already used by another user.
 */
export function isEmployeeIdUnique(
  employeeId: string,
  users: BmsUser[],
  excludeId?: string,
): boolean {
  const normalised = employeeId.trim().toUpperCase();
  return !users.some(
    u => u.employee_id.toUpperCase() === normalised && u.id !== excludeId,
  );
}

/**
 * Returns true when the role ID exists in the list and the role is Active.
 */
export function isActiveRole(roleId: string, roles: BmsRole[]): boolean {
  const r = roles.find(r => r.id === roleId);
  return !!r && r.status === "Active";
}

/**
 * Returns true when the designation ID exists in the list and is Active.
 */
export function isActiveDesignation(designationId: string, designations: Designation[]): boolean {
  const d = designations.find(d => d.id === designationId);
  return !!d && d.status === "Active";
}

/**
 * Returns true when the org unit ID exists and the unit is Active.
 */
export function isActiveOrgUnit(unitId: string, units: OrgUnit[]): boolean {
  const u = units.find(u => u.id === unitId);
  return !!u && (u.status === "Active" || u.status === undefined);
}

/**
 * Returns true when `managerId` is different from `userId` (prevents self-assignment).
 */
export function isNoSelfManager(userId: string, managerId: string | undefined | null): boolean {
  if (!managerId) return true;
  return managerId !== userId;
}

/**
 * Returns true when the role ID array contains no duplicates.
 */
export function hasNoDuplicateRoleIds(roleIds: string[]): boolean {
  return new Set(roleIds).size === roleIds.length;
}

/**
 * Returns true when access dates are logically consistent:
 * - Both absent → valid
 * - Only start → valid
 * - Only expiry → valid
 * - Both present → start must be strictly before expiry
 */
export function areValidAccessDates(
  startAt?: string | null,
  expiresAt?: string | null,
): boolean {
  if (!startAt || !expiresAt) return true;
  return new Date(startAt) < new Date(expiresAt);
}

/**
 * Returns true when the user type + org unit combination is valid:
 * Internal Employees must have a primary org unit;
 * other user types may omit it.
 */
export function requiresOrgUnit(userType: UserType | undefined, orgUnitId: string | undefined | null): boolean {
  if (userType === "Internal Employee" && !orgUnitId) return false;
  return true;
}

// ── Office hierarchy validation ────────────────────────────────────────────────

/**
 * Returns true when setting `childId.parent_unit_id = parentId` would not
 * create a circular reference.
 *
 * Walks up the ancestor chain from `parentId` and returns false if it ever
 * reaches `childId`.
 */
export function isValidOrgParent(
  childId: string,
  parentId: string | undefined | null,
  allUnits: OrgUnit[],
): boolean {
  if (!parentId) return true; // root unit — always valid
  if (parentId === childId) return false;

  const byId = new Map(allUnits.map(u => [u.id, u]));
  let current: OrgUnit | undefined = byId.get(parentId);
  const visited = new Set<string>();

  while (current) {
    if (visited.has(current.id)) break; // safety — cycle already in data
    visited.add(current.id);
    if (current.id === childId) return false;
    current = current.parent_unit_id ? byId.get(current.parent_unit_id) : undefined;
  }

  return true;
}

// ── Agenda hierarchy validation ────────────────────────────────────────────────

/** Maximum supported agenda nesting depth. */
export const MAX_AGENDA_LEVEL = 3;

/**
 * Returns the computed agenda level for a given parent (1-indexed).
 * A root agenda (no parent) is level 1.
 * Returns null when the nesting would exceed MAX_AGENDA_LEVEL.
 */
export function computeAgendaLevel(
  parentId: string | undefined | null,
  allAgendas: AgendaSubmission[],
): 1 | 2 | 3 | null {
  if (!parentId) return 1;

  const byId = new Map(allAgendas.map(a => [a.id, a]));
  const parent = byId.get(parentId);
  if (!parent) return 1; // parent not found — treat as root

  const parentLevel = parent.agenda_level ?? 1;
  const childLevel = (parentLevel + 1) as 1 | 2 | 3 | 4;

  if (childLevel > MAX_AGENDA_LEVEL) return null;
  return childLevel as 1 | 2 | 3;
}

/**
 * Returns true when the agenda can be added at the given level without
 * exceeding the three-level limit.
 */
export function isAgendaLevelValid(
  parentId: string | undefined | null,
  allAgendas: AgendaSubmission[],
): boolean {
  return computeAgendaLevel(parentId, allAgendas) !== null;
}

// ── Relationship deduplication ────────────────────────────────────────────────

/**
 * Returns true when the agenda→document link does not already exist.
 */
export function isAgendaDocumentLinkUnique(
  agendaId: string,
  documentId: string,
  links: AgendaDocumentLink[],
  excludeId?: string,
): boolean {
  return !links.some(
    l => l.agenda_id === agendaId && l.document_id === documentId && l.id !== excludeId,
  );
}

/**
 * Returns true when the meeting→agenda link does not already exist.
 */
export function isMeetingAgendaLinkUnique(
  meetingId: string,
  agendaId: string,
  links: MeetingAgendaLink[],
  excludeId?: string,
): boolean {
  return !links.some(
    l => l.meeting_id === meetingId && l.agenda_id === agendaId && l.id !== excludeId,
  );
}

/**
 * Returns true when the user is not already linked to the meeting.
 */
export function isMeetingParticipantUnique(
  meetingId: string,
  userId: string,
  links: MeetingParticipantLink[],
  excludeId?: string,
): boolean {
  return !links.some(
    l => l.meeting_id === meetingId && l.user_id === userId && l.id !== excludeId,
  );
}

// ── Relationship existence ─────────────────────────────────────────────────────

/**
 * Returns true when a given entity ID exists in the supplied list.
 */
export function entityExists<T extends { id: string }>(
  id: string | undefined | null,
  entities: T[],
): boolean {
  if (!id) return false;
  return entities.some(e => e.id === id);
}
