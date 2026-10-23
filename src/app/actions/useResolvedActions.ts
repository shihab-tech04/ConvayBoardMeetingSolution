import { useMemo, useCallback } from "react";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { useUserRegistry } from "../hooks/useUserRegistry";
import { useRoleRegistry } from "../hooks/useRoleRegistry";
import {
  useMeetingRegistry,
  useParticipantRegistry,
  useMeetingParticipantLinkRegistry,
  useRSVPRegistry,
  useMinutesRegistry,
  useBoardPackRegistry,
  useAgendaRegistry,
  useDecisionRegistry,
} from "../data/boardMeetingData";
import { resolveRecordActions } from "./resolveRecordActions";
import type { EntityType, ResolvedAction, RelationshipData, MeetingRole } from "./types";
import type { TableRow } from "../pages/modulePageUtils";

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Returns a `resolve(row)` function that resolves actions for a given entity row.
 * The resolver captures live registry data so action visibility updates reactively.
 *
 * Usage:
 *   const { resolve } = useResolvedActions("meeting");
 *   const actions = resolve(row);
 */
export function useResolvedActions(entity: EntityType) {
  const currentUser = useCurrentUser();
  const { users } = useUserRegistry();
  const { roles } = useRoleRegistry();

  // Look up current user's system role and permissions
  const { userRole, permissions } = useMemo(() => {
    const sysUser = users.find(
      u => u.name === currentUser.name || u.employeeId === currentUser.employeeId,
    );
    const roleName = sysUser?.role ?? "";
    const role = roles.find(r => r.name === roleName);
    return {
      userRole: roleName,
      permissions: (role?.permissions ?? []) as string[],
    };
  }, [users, roles, currentUser.name, currentUser.employeeId]);

  // Pre-load relationship registries so the resolver can see live data
  const { items: participants } = useParticipantRegistry();
  const { items: participantLinks } = useMeetingParticipantLinkRegistry();
  const { items: rsvpRecords } = useRSVPRegistry();
  const { items: minutesItems } = useMinutesRegistry();
  const { items: boardPacks } = useBoardPackRegistry();
  const { items: agendaItems } = useAgendaRegistry();
  const { items: decisions } = useDecisionRegistry();

  const resolve = useCallback(
    (row: TableRow, extraRoles?: MeetingRole[]): ResolvedAction[] => {
      const meetingId = String(row.meeting_id ?? row.id ?? "");

      const relationships: RelationshipData = {
        participants: [
          ...participants
            .filter(p => p.meeting_id === meetingId)
            .map(p => ({
              meeting_id: p.meeting_id,
              person_name: String(p.name ?? ""),
              user_id: undefined as string | undefined,
              role: String(p.role ?? ""),
              rsvp_status: String(p.rsvp_status ?? ""),
              attendance_status: String(p.attendance_status ?? ""),
            })),
          ...participantLinks
            .filter(l => l.meeting_id === meetingId)
            .map(l => ({
              meeting_id: l.meeting_id,
              person_name: String(l.display_name ?? ""),
              user_id: l.user_id,
              role: String(l.role ?? ""),
              rsvp_status: undefined as string | undefined,
              attendance_status: undefined as string | undefined,
            })),
        ],
        rsvpRecords: rsvpRecords
          .filter(r => r.meeting_id === meetingId)
          .map(r => ({
            meeting_id: r.meeting_id,
            participant_name: String(r.participant_name ?? ""),
            response: String(r.response ?? ""),
          })),
        minutes: minutesItems
          .filter(m => m.meeting_id === meetingId)
          .map(m => ({
            meeting_id: m.meeting_id,
            approval_status: String(m.approval_status ?? ""),
            minute_taker: String(m.minute_taker ?? ""),
          })),
        boardPacks: boardPacks
          .filter(b => b.related_meeting === meetingId)
          .map(b => ({
            related_meeting: String(b.related_meeting ?? ""),
            approval_status: String(b.approval_status ?? ""),
            pack_id: String(b.pack_id ?? ""),
          })),
        agendaItems: agendaItems
          .filter(a => a.meeting_id === meetingId)
          .map(a => ({
            meeting_id: a.meeting_id,
            approval_status: String(a.approval_status ?? ""),
          })),
        decisions: decisions
          .filter(d => d.source_meeting === meetingId)
          .map(d => ({
            source_meeting: d.source_meeting,
            approval_status: String(d.approval_status ?? ""),
          })),
      };

      return resolveRecordActions({
        entity,
        record: row as Record<string, unknown>,
        currentUser: {
          id: currentUser.id,
          name: currentUser.name,
          designation: currentUser.designation,
          employeeId: currentUser.employeeId,
        },
        userRole,
        permissions,
        meetingRoles: extraRoles,
        now: new Date(),
        relationships,
      });
    },
    [
      entity,
      currentUser,
      userRole,
      permissions,
      participants,
      participantLinks,
      rsvpRecords,
      minutesItems,
      boardPacks,
      agendaItems,
      decisions,
    ],
  );

  return { resolve, currentUser, userRole, permissions };
}
