/**
 * Invitation lifecycle manager.
 *
 * All writes go to BOTH the invitation registry AND the user registry
 * so that invitation_status mirrors account_status consistently.
 */

import { useCallback } from "react";
import { useUserInvitationRegistry, useBmsUserRegistry } from "../data/bmsUsers";
import type { InvitationStatus } from "../data/bmsUsers";
import { useAuditEventRegistry, generateId } from "../data/boardMeetingData";

function nowIso() {
  return new Date().toISOString();
}

function makeAuditEntry(
  auditItems: { id: string }[],
  entityId: string,
  actorName: string,
  action: string,
  details: string,
) {
  return {
    id:              generateId("AUD", auditItems.map((a) => a.id)),
    event_id:        generateId("AUD", auditItems.map((a) => a.id)),
    entity_type:     "User",
    entity_id:       entityId,
    action,
    actor:           actorName,
    actor_role:      "Administrator",
    timestamp:       nowIso(),
    ip_address:      "—",
    details,
    approval_status: "Logged",
  };
}

export function useInvitationManager() {
  const invReg  = useUserInvitationRegistry();
  const userReg = useBmsUserRegistry();
  const audit   = useAuditEventRegistry();

  const sendInvitation = useCallback(
    (userId: string, _actorId: string, actorName: string) => {
      const user = userReg.items.find((u) => u.id === userId);
      if (!user) return;

      const existing = invReg.items.find((i) => i.user_id === userId && i.status !== "cancelled");
      const ts = nowIso();

      if (existing) {
        invReg.update(existing.id, { status: "sent" as InvitationStatus, sent_at: ts });
      } else {
        invReg.add({
          user_id:      userId,
          email:        user.email,
          status:       "sent" as InvitationStatus,
          sent_at:      ts,
          resend_count: 0,
        } as Parameters<typeof invReg.add>[0]);
      }

      userReg.update(user.id, {
        account_status:    "invited",
        invitation_status: "sent",
        updated_at:        ts,
      });

      audit.add(makeAuditEntry(audit.items, userId, actorName, "invitation_sent", `Invitation sent to ${user.email}`) as Parameters<typeof audit.add>[0]);
    },
    [invReg, userReg, audit],
  );

  const resendInvitation = useCallback(
    (userId: string, _actorId: string, actorName: string) => {
      const user = userReg.items.find((u) => u.id === userId);
      if (!user) return;
      const inv = invReg.items.find((i) => i.user_id === userId && i.status !== "cancelled");
      if (!inv) return;
      const ts = nowIso();

      invReg.update(inv.id, {
        status:          "sent" as InvitationStatus,
        sent_at:         ts,
        resend_count:    (inv.resend_count ?? 0) + 1,
        last_resend_at:  ts,
      } as Parameters<typeof invReg.update>[1]);
      userReg.update(user.id, { invitation_status: "sent", updated_at: ts });

      audit.add(makeAuditEntry(audit.items, userId, actorName, "invitation_resent", `Invitation re-sent to ${user.email} (resend #${(inv.resend_count ?? 0) + 1})`) as Parameters<typeof audit.add>[0]);
    },
    [invReg, userReg, audit],
  );

  const cancelInvitation = useCallback(
    (userId: string, _actorId: string, actorName: string, reason?: string) => {
      const user = userReg.items.find((u) => u.id === userId);
      if (!user) return;
      const inv = invReg.items.find((i) => i.user_id === userId && i.status !== "cancelled");
      const ts  = nowIso();

      if (inv) invReg.update(inv.id, { status: "cancelled" as InvitationStatus });
      userReg.update(user.id, { account_status: "draft", invitation_status: "cancelled", updated_at: ts });

      audit.add(makeAuditEntry(audit.items, userId, actorName, "invitation_cancelled",
        reason ? `Invitation cancelled: ${reason}` : "Invitation cancelled") as Parameters<typeof audit.add>[0]);
    },
    [invReg, userReg, audit],
  );

  const markOpened = useCallback(
    (userId: string) => {
      const user = userReg.items.find((u) => u.id === userId);
      if (!user) return;
      const inv = invReg.items.find((i) => i.user_id === userId && i.status === "sent");
      const ts  = nowIso();

      if (inv) {
        invReg.update(inv.id, {
          status:    "opened" as InvitationStatus,
          opened_at: ts,
        } as Parameters<typeof invReg.update>[1]);
      }
      userReg.update(user.id, {
        account_status:    "pending_activation",
        invitation_status: "opened",
        updated_at:        ts,
      });
    },
    [invReg, userReg],
  );

  const completeActivation = useCallback(
    (userId: string, _actorId: string, actorName: string) => {
      const user = userReg.items.find((u) => u.id === userId);
      if (!user) return;
      const inv = invReg.items.find((i) => i.user_id === userId && ["sent", "opened"].includes(i.status));
      const ts  = nowIso();

      if (inv) invReg.update(inv.id, { status: "activated" as InvitationStatus, activated_at: ts });
      userReg.update(user.id, {
        account_status:    "active",
        invitation_status: "activated",
        activated_at:      ts,
        updated_at:        ts,
      });

      audit.add(makeAuditEntry(audit.items, userId, actorName, "user_activated",
        "User completed invitation activation and is now active") as Parameters<typeof audit.add>[0]);
    },
    [invReg, userReg, audit],
  );

  const markDeliveryFailed = useCallback(
    (userId: string, _actorId: string, actorName: string) => {
      const user = userReg.items.find((u) => u.id === userId);
      if (!user) return;
      const inv = invReg.items.find((i) => i.user_id === userId && i.status === "sent");
      const ts  = nowIso();

      if (inv) invReg.update(inv.id, { status: "delivery_failed" as InvitationStatus });
      userReg.update(user.id, { invitation_status: "delivery_failed", updated_at: ts });

      audit.add(makeAuditEntry(audit.items, userId, actorName, "invitation_delivery_failed",
        `Invitation delivery failed for ${user.email}`) as Parameters<typeof audit.add>[0]);
    },
    [invReg, userReg, audit],
  );

  const checkAndExpire = useCallback(
    () => {
      const now = new Date();
      invReg.items.forEach((inv) => {
        if (!["sent", "opened"].includes(inv.status)) return;
        if (!inv.expires_at) return;
        if (new Date(inv.expires_at) < now) {
          invReg.update(inv.id, { status: "expired" as InvitationStatus });
          const user = userReg.items.find((u) => u.id === inv.user_id);
          if (user) {
            userReg.update(user.id, { invitation_status: "expired" });
          }
        }
      });
    },
    [invReg, userReg],
  );

  return {
    sendInvitation,
    resendInvitation,
    cancelInvitation,
    markOpened,
    completeActivation,
    markDeliveryFailed,
    checkAndExpire,
  };
}
