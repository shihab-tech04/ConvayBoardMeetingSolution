/**
 * Security controls for a specific user account.
 *
 * Every operation writes to the BMS user registry and emits an audit event.
 * No real authentication/session infrastructure is involved.
 */

import { useCallback } from "react";
import { useBmsUserRegistry } from "../data/bmsUsers";
import { useAuditEventRegistry, generateId } from "../data/boardMeetingData";

function nowIso() { return new Date().toISOString(); }

export function useSecurityControls(targetUserId: string) {
  const reg      = useBmsUserRegistry();
  const auditReg = useAuditEventRegistry();

  const getUser = useCallback(() => reg.items.find((u) => u.id === targetUserId), [reg.items, targetUserId]);

  function addAudit(actorName: string, action: string, details: string) {
    auditReg.add({
      id:              generateId("AUD", auditReg.items.map((a) => a.id)),
      event_id:        generateId("AUD", auditReg.items.map((a) => a.id)),
      entity_type:     "User",
      entity_id:       targetUserId,
      action,
      actor:           actorName,
      actor_role:      "Administrator",
      timestamp:       nowIso(),
      ip_address:      "—",
      details,
      approval_status: "Logged",
    } as Parameters<typeof auditReg.add>[0]);
  }

  // Sets the requirement flag so the user must enrol on next login.
  // Does NOT touch the enrollment field — that is cleared only by reset2FA.
  const require2FA = useCallback(
    (actorName: string) => {
      const u = getUser();
      if (!u) return;
      reg.update(u.id, { two_factor_required: true, updated_at: nowIso() });
      addAudit(actorName, "2fa_required", "2FA requirement enforced — user must enrol on next login");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getUser, reg, auditReg, targetUserId],
  );

  // Clears both enrollment and requirement, forcing the user to re-enrol.
  const reset2FA = useCallback(
    (actorName: string) => {
      const u = getUser();
      if (!u) return;
      reg.update(u.id, { two_factor_enrolled: false, two_factor_required: true, updated_at: nowIso() });
      addAudit(actorName, "2fa_reset", "Two-factor authentication reset. User must re-enrol.");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getUser, reg, auditReg, targetUserId],
  );

  const unlockAccount = useCallback(
    (actorName: string) => {
      const u = getUser();
      if (!u) return;
      const ts = nowIso();
      reg.update(u.id, {
        account_status:     "active",
        failed_login_count: 0,
        locked_at:          undefined,
        updated_at:         ts,
      });
      addAudit(actorName, "account_unlocked", "Account manually unlocked. Failed-login counter cleared.");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getUser, reg, auditReg, targetUserId],
  );

  const lockAccount = useCallback(
    (actorName: string, reason?: string) => {
      const u = getUser();
      if (!u) return;
      const ts = nowIso();
      reg.update(u.id, { account_status: "locked", locked_at: ts, updated_at: ts });
      addAudit(actorName, "account_locked", reason ? `Account locked: ${reason}` : "Account locked by administrator");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getUser, reg, auditReg, targetUserId],
  );

  const sendPasswordReset = useCallback(
    (actorName: string) => {
      const u = getUser();
      if (!u) return;
      reg.update(u.id, { password_reset_pending: true, updated_at: nowIso() } as Parameters<typeof reg.update>[1]);
      addAudit(actorName, "password_reset_sent", `Password-reset link dispatched to ${u.email}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getUser, reg, auditReg, targetUserId],
  );

  const revokeSessions = useCallback(
    (actorName: string) => {
      const u = getUser();
      if (!u) return;
      reg.update(u.id, { last_login_at: undefined, updated_at: nowIso() });
      addAudit(actorName, "sessions_revoked", "All active sessions revoked by administrator");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getUser, reg, auditReg, targetUserId],
  );

  const incrementFailedLogin = useCallback(
    (autoLockThreshold = 5) => {
      const u = getUser();
      if (!u) return;
      const next     = (u.failed_login_count ?? 0) + 1;
      const ts       = nowIso();
      const shouldLock = next >= autoLockThreshold;
      reg.update(u.id, {
        failed_login_count: next,
        account_status:     shouldLock ? "locked" : u.account_status,
        locked_at:          shouldLock ? ts : u.locked_at,
        updated_at:         ts,
      });
    },
    [getUser, reg],
  );

  const clearFailedLogins = useCallback(
    (actorName: string) => {
      const u = getUser();
      if (!u) return;
      reg.update(u.id, { failed_login_count: 0, updated_at: nowIso() });
      addAudit(actorName, "failed_logins_cleared", "Failed-login counter manually reset");
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getUser, reg, auditReg, targetUserId],
  );

  return {
    require2FA,
    reset2FA,
    unlockAccount,
    lockAccount,
    sendPasswordReset,
    revokeSessions,
    incrementFailedLogin,
    clearFailedLogins,
  };
}
