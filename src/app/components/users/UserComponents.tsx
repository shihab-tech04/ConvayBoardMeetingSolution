import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  X, RefreshCw, Pencil, Lock, Trash2, Shield, Send,
  UserCheck, UserX, Building2, AlertTriangle, Clock,
  RotateCcw, Ban, Unlock, ShieldCheck, Mail, ArrowLeftRight,
  Landmark, ChevronRight,
} from "lucide-react";
import type { BmsUser, AccountStatus } from "../../data/bmsUsers";
import { useBmsUserRegistry, useUserInvitationRegistry } from "../../data/bmsUsers";
import { useRoleRegistry } from "../../hooks/useRoleRegistry";
import { useDesignationRegistry } from "../../data/designations";
import { useOrgUnitRegistry, useAuditEventRegistry, useGovernanceRegistry, generateId } from "../../data/boardMeetingData";
import { SafeText, ExpandableText } from "../shared/SafeText";
import { CopyValueButton } from "../shared/CopyValueButton";
import { RolePreviewCard } from "../roles/RolePreviewCard";
import { SSelect } from "../forms/SSelect";
import { StatusBadge } from "../badges/StatusBadge";
import { ResponsiveOverlay } from "../shared/ResponsiveOverlay";
import { Button } from "../buttons/Button";
import { SConfirmModal } from "../modals/SConfirmModal";
import { RoleChangeModal } from "./RoleChangeModal";
import { OrgTransferModal } from "./OrgTransferModal";
import { GovernanceMembershipModal } from "./GovernanceMembershipModal";
import { InvitationPanel } from "./InvitationPanel";
import { useInvitationManager } from "../../hooks/useInvitationManager";
import { useSecurityControls } from "../../hooks/useSecurityControls";
import { useUserManagementPermissions } from "../../utils/userPermissions";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useGovernanceMembershipRegistry } from "../../data/governanceMemberships";

// ── ReAssignRoleModal ──────────────────────────────────────────────────────────

export function ReAssignRoleModal({ user, onConfirm, onClose }: {
  user: BmsUser; onConfirm: (newRoleId: string, newRoleName: string) => void; onClose: () => void;
}) {
  const [selectedRoleName, setSelectedRoleName] = useState(user.role ?? "");
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const { activeRoles, roles } = useRoleRegistry();
  const preview = roles.find(r => r.name === selectedRoleName) ?? null;

  useEffect(() => { const t = setTimeout(() => closeBtnRef.current?.focus(), 50); return () => clearTimeout(t); }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div className="mobile-modal-backdrop fixed inset-0 z-[500] flex items-center justify-center p-4 overlay-enter"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="rar-title"
        className="mobile-modal-wrapper rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden modal-enter modal-fieldset"
        onClick={e => e.stopPropagation()}>
        <div className="mobile-modal-header modal-form-header">
          <div className="flex items-center gap-2.5">
            <div className="modal-form-header__icon"><RefreshCw size={15} strokeWidth={2} /></div>
            <div>
              <h2 id="rar-title" className="modal-form-header__title">Re-assign Role</h2>
              <p className="modal-form-header__subtitle">{user.name}</p>
            </div>
          </div>
          <button ref={closeBtnRef} type="button" onClick={onClose} aria-label="Cancel" className="mobile-modal-close modal-form-header__close">
            <X size={14} />
          </button>
        </div>
        <div className="mobile-modal-body p-5 flex gap-4">
          <div className="flex-1 min-w-0">
            <div className="rar-current-role mb-3">
              <p className="filter-label">Current Role</p>
              <p className="detail-row__val text-left"><SafeText value={user.role ?? "—"} mode="break" as="span" /></p>
            </div>
            <SSelect id="rar-role" label="New Role" value={selectedRoleName} onChange={setSelectedRoleName} options={activeRoles.map(r => r.name)} />
            {selectedRoleName !== (user.role ?? "") && (
              <p className="rar-warning mt-2">This will change the user&apos;s permissions.</p>
            )}
          </div>
          {preview && (
            <div className="w-52 flex-shrink-0">
              <RolePreviewCard roleName={preview.name} roleDescription={preview.description} selectedPermIds={preview.permissions} />
            </div>
          )}
        </div>
        <div className="mobile-modal-footer modal-form-footer">
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="lg" fullWidth
            onClick={() => {
              const role = roles.find(r => r.name === selectedRoleName);
              if (role) onConfirm(role.id, role.name);
            }}
            disabled={selectedRoleName === (user.role ?? "")}
          >
            Confirm
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── StatusChangeModal ──────────────────────────────────────────────────────────

interface StatusChangeModalProps {
  user: BmsUser;
  action: "activate" | "suspend" | "unsuspend" | "lock" | "unlock" | "deactivate" | "archive" | "restore" | "delete";
  onConfirm: (reason?: string) => void;
  onClose: () => void;
}

function StatusChangeModal({ user, action, onConfirm, onClose }: StatusChangeModalProps) {
  const [reason, setReason] = useState("");
  const needsReason = ["suspend", "deactivate", "archive"].includes(action);
  const isDangerous = ["deactivate", "archive", "delete"].includes(action);

  const META: Record<string, { title: string; message: string; confirmLabel: string }> = {
    activate:    { title: "Activate User",    message: `Activate "${user.name}"? They will gain system access.`,                      confirmLabel: "Activate" },
    suspend:     { title: "Suspend User",     message: `Suspend "${user.name}"? They will immediately lose access.`,                   confirmLabel: "Suspend" },
    unsuspend:   { title: "Unsuspend User",   message: `Unsuspend "${user.name}"? They will regain their previous access.`,            confirmLabel: "Unsuspend" },
    lock:        { title: "Lock Account",     message: `Lock "${user.name}"'s account? All active sessions will be terminated.`,       confirmLabel: "Lock Account" },
    unlock:      { title: "Unlock Account",   message: `Unlock "${user.name}"'s account? They will be able to sign in again.`,         confirmLabel: "Unlock Account" },
    deactivate:  { title: "Deactivate User",  message: `Deactivate "${user.name}"? They will lose all access.`,                       confirmLabel: "Deactivate" },
    archive:     { title: "Archive User",     message: `Archive "${user.name}"? The record is preserved but access is revoked.`,       confirmLabel: "Archive" },
    restore:     { title: "Restore User",     message: `Restore "${user.name}"? They will be set to inactive and can be reactivated.`, confirmLabel: "Restore" },
    delete:      { title: "Delete User",      message: `Permanently delete "${user.name}"? This cannot be undone.`,                   confirmLabel: "Delete" },
  };

  const meta = META[action];

  if (!needsReason) {
    return (
      <SConfirmModal
        title={meta.title}
        message={meta.message}
        confirmLabel={meta.confirmLabel}
        onConfirm={() => onConfirm(undefined)}
        onClose={onClose}
        danger={isDangerous}
      />
    );
  }

  return createPortal(
    <div className="mobile-modal-backdrop fixed inset-0 z-[600] flex items-center justify-center p-4 overlay-enter"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }} onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="scm-title"
        className="mobile-modal-wrapper rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden modal-enter"
        onClick={e => e.stopPropagation()}>
        <div className="mobile-modal-header modal-form-header">
          <h2 id="scm-title" className="modal-form-header__title">{meta.title}</h2>
          <button type="button" onClick={onClose} className="mobile-modal-close modal-form-header__close" aria-label="Cancel">
            <X size={14} />
          </button>
        </div>
        <div className="mobile-modal-body p-5 flex flex-col gap-3">
          <p className="text-[0.83rem] text-[var(--color-text-secondary)]">{meta.message}</p>
          <div>
            <label className="filter-label block mb-1" htmlFor="scm-reason">
              Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              id="scm-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              className="w-full text-[0.8rem] rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/30"
              placeholder={`Reason for ${action}…`}
              autoFocus
            />
          </div>
        </div>
        <div className="mobile-modal-footer modal-form-footer">
          <Button variant="ghost" size="lg" fullWidth onClick={onClose}>Cancel</Button>
          <Button
            variant={isDangerous ? "destructive" : "primary"}
            size="lg"
            fullWidth
            onClick={() => onConfirm(reason || undefined)}
            disabled={!reason.trim()}
          >
            {meta.confirmLabel}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── DrawerDetailRow ────────────────────────────────────────────────────────────

function DrawerDetailRow({ label, value, copyable = false }: {
  label: string; value?: string | null; copyable?: boolean;
}) {
  if (!value) return null;
  const isLong = value.length > 60 || /[^\s]{28,}/.test(value);
  return (
    <div className={`detail-row${isLong ? " detail-row--long" : ""}`}>
      <span className="detail-row__key">{label}</span>
      <span className="detail-row__val">
        <div className="detail-row__value-row">
          {isLong
            ? <ExpandableText value={value} maxChars={120} collapsedLines={3} mode="block" />
            : <SafeText value={value} mode="break" as="span" />
          }
          {copyable && <CopyValueButton value={value} label={label} />}
        </div>
      </span>
    </div>
  );
}

// ── Tab types ─────────────────────────────────────────────────────────────────

type DrawerTab = "profile" | "organisation" | "access" | "invitation" | "security" | "activity" | "audit";

// ── Contextual actions ─────────────────────────────────────────────────────────

type DrawerAction =
  | "edit" | "assign_role" | "transfer_org" | "add_gov" | "send_invite"
  | "resend_invite" | "cancel_invite" | "activate" | "suspend" | "unsuspend"
  | "lock" | "unlock" | "require_2fa" | "deactivate" | "archive" | "restore" | "delete";

function getContextualActions(u: BmsUser): DrawerAction[] {
  const status = u.account_status ?? "inactive";
  const inv    = u.invitation_status ?? "not_sent";
  const acts: DrawerAction[] = ["edit"];

  switch (status) {
    case "draft":
      acts.push("send_invite", "activate", "delete");
      break;
    case "invited":
      if (inv === "sent" || inv === "opened") acts.push("resend_invite", "cancel_invite");
      acts.push("activate");
      break;
    case "pending_activation":
      acts.push("activate");
      break;
    case "active":
      acts.push(
        "assign_role", "transfer_org", "add_gov",
        "send_invite",
        "require_2fa",
        "suspend", "deactivate",
      );
      if (u.two_factor_enrolled) acts.push("lock");
      break;
    case "suspended":
      acts.push("unsuspend", "deactivate");
      break;
    case "locked":
      acts.push("unlock", "suspend", "deactivate");
      break;
    case "inactive":
      acts.push("activate", "archive");
      break;
    case "deactivated":
      acts.push("restore", "archive");
      break;
    case "archived":
      acts.push("restore");
      break;
  }

  return acts;
}

const ACTION_META: Record<DrawerAction, { label: string; icon: React.ElementType; variant: string }> = {
  edit:          { label: "Edit User",              icon: Pencil,        variant: "primary" },
  assign_role:   { label: "Assign / Change Role",   icon: Shield,        variant: "secondary" },
  transfer_org:  { label: "Transfer Organisation",  icon: ArrowLeftRight, variant: "secondary" },
  add_gov:       { label: "Add Governance Membership", icon: Landmark,   variant: "secondary" },
  send_invite:   { label: "Send Invitation",        icon: Send,          variant: "secondary" },
  resend_invite: { label: "Resend Invitation",      icon: Send,          variant: "secondary" },
  cancel_invite: { label: "Cancel Invitation",      icon: Ban,           variant: "secondary" },
  activate:      { label: "Activate",               icon: UserCheck,     variant: "secondary" },
  suspend:       { label: "Suspend",                icon: AlertTriangle, variant: "destructive-subtle" },
  unsuspend:     { label: "Unsuspend",              icon: UserCheck,     variant: "secondary" },
  lock:          { label: "Lock Account",           icon: Lock,          variant: "destructive-subtle" },
  unlock:        { label: "Unlock Account",         icon: Unlock,        variant: "secondary" },
  require_2fa:   { label: "Require 2FA",            icon: ShieldCheck,   variant: "secondary" },
  deactivate:    { label: "Deactivate",             icon: UserX,         variant: "destructive-subtle" },
  archive:       { label: "Archive",                icon: Clock,         variant: "destructive-subtle" },
  restore:       { label: "Restore",                icon: RotateCcw,     variant: "secondary" },
  delete:        { label: "Delete User",            icon: Trash2,        variant: "destructive" },
};

// ── UserDetailDrawer ───────────────────────────────────────────────────────────

export interface UserDetailDrawerProps {
  user: BmsUser;
  onClose: () => void;
  onEdit: () => void;
  onReAssign: () => void;
  onStatusChange: (action: "activate" | "suspend" | "unsuspend" | "lock" | "unlock" | "deactivate" | "archive" | "restore" | "delete", reason?: string) => void;
}

export function UserDetailDrawer({ user, onClose, onEdit, onReAssign, onStatusChange }: UserDetailDrawerProps) {
  const { roles, updateRole } = useRoleRegistry();
  const desigReg  = useDesignationRegistry();
  const orgReg    = useOrgUnitRegistry();
  const auditReg  = useAuditEventRegistry();
  const govReg    = useGovernanceRegistry();
  const bmsReg    = useBmsUserRegistry();
  const govMemReg = useGovernanceMembershipRegistry();
  const perms     = useUserManagementPermissions();
  const currentUser = useCurrentUser();
  const actorName = currentUser?.name ?? "Administrator";

  const invMgr    = useInvitationManager();
  const security  = useSecurityControls(user.id);

  const [activeTab,       setActiveTab]       = useState<DrawerTab>("profile");
  const [pendingAction,   setPendingAction]   = useState<DrawerAction | null>(null);
  const [roleChangeOpen,  setRoleChangeOpen]  = useState(false);
  const [orgTransferOpen, setOrgTransferOpen] = useState(false);
  const [govMemberOpen,   setGovMemberOpen]   = useState(false);

  const initials = user.name.split(" ").map(n => n[0] ?? "").join("").slice(0, 2).toUpperCase();

  const primaryRole = roles.find(r => r.id === user.primary_role_id || r.id === user.role_id || r.name === user.role);
  const designation = desigReg.items.find(d => d.id === user.designation_id);
  const primaryUnit = orgReg.items.find(u => u.id === user.primary_org_unit_id);
  const branchUnit  = orgReg.items.find(u => u.id === user.branch_id);
  const divUnit     = orgReg.items.find(u => u.id === user.division_id);
  const deptUnit    = orgReg.items.find(u => u.id === user.department_id);
  const govBodies   = govReg.items.filter(g => (user.governance_membership_ids ?? []).includes(g.id));
  const userAudit   = auditReg.items
    .filter(a => a.entity_id === user.id)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 50);

  const orgPath = [branchUnit?.unit_name, divUnit?.unit_name, deptUnit?.unit_name, primaryUnit?.unit_name]
    .filter(Boolean).join(" › ");

  const invReg = useUserInvitationRegistry();
  // Remove "delete" when the draft user already has audit or invitation history
  const hasRelatedHistory = userAudit.length > 0 || invReg.items.some(i => i.user_id === user.id);
  const contextualActions = getContextualActions(user).filter(a => a !== "delete" || !hasRelatedHistory);
  const secondaryActions  = contextualActions.slice(1);

  const empTypeLabels: Record<string, string> = {
    full_time: "Full Time", part_time: "Part Time", contract: "Contract",
    board_appointed: "Board Appointed", honorary: "Honorary",
  };

  const invStatus = user.invitation_status ?? "not_sent";
  const canSendInvite   = perms.canInviteUser   && ["draft","inactive"].includes(user.account_status ?? "");
  const canResendInvite = perms.canResendInvite  && invStatus === "sent";
  const canCancelInvite = perms.canCancelInvite  && ["sent","opened"].includes(invStatus);

  // ── Tabs ───────────────────────────────────────────────────────────────────

  const tabs: { id: DrawerTab; label: string }[] = [
    { id: "profile",      label: "Profile" },
    { id: "organisation", label: "Org" },
    { id: "access",       label: "Access" },
    { id: "invitation",   label: "Invite" },
    { id: "security",     label: "Security" },
    { id: "activity",     label: "Activity" },
    { id: "audit",        label: "Audit" },
  ];

  // ── Tab content ────────────────────────────────────────────────────────────

  const tabProfile = (
    <div className="detail-section">
      <DrawerDetailRow label="Employee ID"   value={user.employee_id}       copyable />
      <DrawerDetailRow label="Email"         value={user.email}             copyable />
      <DrawerDetailRow label="Phone"         value={user.phone}             copyable />
      <DrawerDetailRow label="User Type"     value={user.user_type} />
      <DrawerDetailRow label="Display Name"  value={user.display_name} />
      <div className="detail-row">
        <span className="detail-row__key">Account Status</span>
        <span className="detail-row__val"><StatusBadge value={user.account_status ?? "inactive"} /></span>
      </div>
      <div className="detail-row">
        <span className="detail-row__key">Invitation</span>
        <span className="detail-row__val"><StatusBadge value={user.invitation_status ?? "not_sent"} /></span>
      </div>
      <DrawerDetailRow label="Preferred Language" value={user.preferred_language} />
      <DrawerDetailRow label="Access Start"  value={user.access_start_at} />
      <DrawerDetailRow label="Access Expiry" value={user.access_expires_at} />
      <DrawerDetailRow label="External Ref"  value={user.external_reference_id} copyable />
    </div>
  );

  const managerUser  = user.manager_user_id ? bmsReg.items.find(u => u.id === user.manager_user_id) : undefined;
  const transferHistory = userAudit.filter(a => a.action === "org_transfer");

  const tabOrganisation = (
    <div className="detail-section">
      {orgPath && (
        <div className="detail-row">
          <span className="detail-row__key">Org Path</span>
          <span className="detail-row__val">
            <span className="flex items-center gap-1 flex-wrap text-[0.78rem]">
              {[branchUnit?.unit_name, divUnit?.unit_name, deptUnit?.unit_name, primaryUnit?.unit_name]
                .filter(Boolean)
                .map((part, i, arr) => (
                  <span key={i} className="flex items-center gap-1">
                    <span>{part}</span>
                    {i < arr.length - 1 && <ChevronRight size={10} className="text-[var(--color-text-secondary)]" />}
                  </span>
                ))}
            </span>
          </span>
        </div>
      )}
      <DrawerDetailRow label="Designation"  value={designation?.name ?? user.designation} />
      <DrawerDetailRow label="Position"     value={user.position} />
      <DrawerDetailRow label="Manager"      value={managerUser ? managerUser.name : user.manager_user_id ? `ID: ${user.manager_user_id}` : undefined} />
      <DrawerDetailRow label="Employment"   value={user.employment_type ? empTypeLabels[user.employment_type] : undefined} />
      <DrawerDetailRow label="Start Date"   value={user.employment_start_at} />
      <DrawerDetailRow label="End Date"     value={user.employment_end_at} />
      {!orgPath && !designation && (
        <p className="text-[0.78rem] text-[var(--color-text-secondary)] p-2">No organisation assignment.</p>
      )}
      {transferHistory.length > 0 && (
        <div className="detail-row detail-row--long">
          <span className="detail-row__key">Transfer History</span>
          <span className="detail-row__val">
            <div className="flex flex-col gap-1">
              {transferHistory.map(a => (
                <div key={a.id} className="text-[0.72rem] text-[var(--color-text-secondary)]">
                  <span className="font-mono">{a.timestamp.slice(0,10)}</span> · {a.details}
                </div>
              ))}
            </div>
          </span>
        </div>
      )}
    </div>
  );

  const tabAccess = (
    <div className="detail-section">
      <DrawerDetailRow label="Primary Role"  value={primaryRole?.name ?? user.role} />
      <DrawerDetailRow label="Level"         value={primaryRole?.level ?? user.level} />
      {(user.role_ids ?? []).length > 1 && (
        <div className="detail-row">
          <span className="detail-row__key">All Roles</span>
          <span className="detail-row__val">
            <div className="flex flex-wrap gap-1">
              {(user.role_ids ?? []).map(id => {
                const r = roles.find(r => r.id === id);
                return r ? <span key={id} className="role-tag">{r.name}</span> : null;
              })}
            </div>
          </span>
        </div>
      )}
      {primaryRole && (
        <div className="detail-row detail-row--long">
          <span className="detail-row__key">Permissions</span>
          <span className="detail-row__val">
            <RolePreviewCard roleName={primaryRole.name} roleDescription={primaryRole.description} selectedPermIds={primaryRole.permissions} />
          </span>
        </div>
      )}
      {govBodies.length > 0 && (
        <div className="detail-row">
          <span className="detail-row__key">Governance Bodies</span>
          <span className="detail-row__val">
            <div className="flex flex-col gap-1">
              {govBodies.map(g => (
                <span key={g.id} className="text-[0.78rem]">{g.body_name} · <span className="text-[var(--color-text-secondary)]">{g.body_type}</span></span>
              ))}
            </div>
          </span>
        </div>
      )}
      {/* Governance memberships from dedicated registry */}
      {(() => {
        const mems = govMemReg.items.filter(m => m.user_id === user.id && m.status === "active");
        if (mems.length === 0) return null;
        return (
          <div className="detail-row">
            <span className="detail-row__key">Memberships</span>
            <span className="detail-row__val">
              <div className="flex flex-col gap-1">
                {mems.map(m => (
                  <span key={m.id} className="text-[0.78rem]">
                    {m.gov_body_name} · <span className="text-[var(--color-text-secondary)]">{m.membership_role}</span>
                    {m.is_voting_member && <span className="ml-1 text-[0.68rem] text-emerald-600">Voting</span>}
                  </span>
                ))}
              </div>
            </span>
          </div>
        );
      })()}
    </div>
  );

  const tabInvitation = (
    <div className="detail-section">
      <InvitationPanel
        user={user}
        onSend={() => invMgr.sendInvitation(user.id, currentUser?.id ?? "sys", actorName)}
        onResend={() => invMgr.resendInvitation(user.id, currentUser?.id ?? "sys", actorName)}
        onCancel={() => invMgr.cancelInvitation(user.id, currentUser?.id ?? "sys", actorName)}
        onSimulateOpen={() => invMgr.markOpened(user.id)}
        onSimulateActivate={() => invMgr.completeActivation(user.id, currentUser?.id ?? "sys", actorName)}
        canSend={canSendInvite}
        canResend={canResendInvite}
        canCancel={canCancelInvite}
      />
    </div>
  );

  const tabSecurity = (
    <div className="detail-section">
      <div className="detail-row">
        <span className="detail-row__key">2FA Required</span>
        <span className="detail-row__val">{user.two_factor_required ? "Yes" : "No"}</span>
      </div>
      <div className="detail-row">
        <span className="detail-row__key">2FA Enrolled</span>
        <span className="detail-row__val">{user.two_factor_enrolled ? "Yes" : user.two_factor_enabled ? "Yes" : "No"}</span>
      </div>
      <DrawerDetailRow label="Last Login"    value={user.last_login_at} />
      <DrawerDetailRow label="Last Active"   value={user.last_active_at ?? user.lastActive} />
      <div className="detail-row">
        <span className="detail-row__key">Failed Logins</span>
        <span className="detail-row__val">{user.failed_login_count ?? 0}</span>
      </div>
      <DrawerDetailRow label="Locked At"     value={user.locked_at} />
      <DrawerDetailRow label="Suspended At"  value={user.suspended_at} />
      <DrawerDetailRow label="Suspension Reason" value={user.suspension_reason} />
      {(user as BmsUser & { password_reset_pending?: boolean }).password_reset_pending && (
        <div className="detail-row">
          <span className="detail-row__key">Password Reset</span>
          <span className="detail-row__val text-amber-600 font-medium text-[0.78rem]">Pending</span>
        </div>
      )}
      <DrawerDetailRow label="Access Expiry" value={user.access_expires_at} />
      {perms.canViewSecurity && (
        <div className="flex flex-col gap-2 mt-3">
          <Button variant="secondary" size="sm" leadingIcon={ShieldCheck}
            onClick={() => security.reset2FA(actorName)}>
            Reset 2FA
          </Button>
          <Button variant="secondary" size="sm" leadingIcon={Mail}
            onClick={() => security.sendPasswordReset(actorName)}>
            Send Password Reset
          </Button>
          {(user.failed_login_count ?? 0) > 0 && (
            <Button variant="secondary" size="sm" leadingIcon={Unlock}
              onClick={() => security.clearFailedLogins(actorName)}>
              Clear Failed Logins ({user.failed_login_count})
            </Button>
          )}
        </div>
      )}
    </div>
  );

  const ACTIVITY_ACTIONS = new Set(["invitation_sent","invitation_resent","invitation_cancelled","invitation_delivery_failed","user_activated","account_locked","account_unlocked","2fa_reset","2fa_required","sessions_revoked","password_reset_sent","failed_logins_cleared","account_activate","account_suspend","account_unsuspend","account_lock","account_unlock","account_deactivate","account_archive","account_restore","account_delete","role_changed","org_transfer","governance_membership_added","user_deleted"]);

  const tabActivity = (
    <div className="detail-section">
      <div className="flex flex-col gap-2">
        {userAudit.filter(a => ACTIVITY_ACTIONS.has(a.action)).map(a => (
          <div key={a.id} className="flex items-start gap-2 p-2 rounded-md bg-[var(--color-surface)]">
            <span className="text-[0.7rem] text-[var(--color-text-secondary)] mt-0.5 shrink-0 w-24">{a.timestamp.slice(0,10)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[0.78rem] font-medium text-[var(--color-text-primary)] capitalize">{a.action.replace(/_/g, " ")}</p>
              <p className="text-[0.72rem] text-[var(--color-text-secondary)] truncate">{a.details}</p>
            </div>
          </div>
        ))}
        {userAudit.filter(a => ACTIVITY_ACTIONS.has(a.action)).length === 0 && (
          <p className="text-[0.78rem] text-[var(--color-text-secondary)] text-center py-4">No activity history yet.</p>
        )}
      </div>
    </div>
  );

  const tabAudit = (
    <div className="detail-section">
      {userAudit.length > 0 ? userAudit.map(a => (
        <div key={a.id} className="detail-row detail-row--long">
          <span className="detail-row__key">{a.timestamp.slice(0,16).replace("T"," ")}</span>
          <span className="detail-row__val">
            <div>
              <span className="text-[0.78rem] font-medium capitalize">{a.action.replace(/_/g, " ")}</span>
              {" · "}
              <span className="text-[0.72rem] text-[var(--color-text-secondary)]">{a.actor}</span>
              {a.details && <p className="text-[0.72rem] text-[var(--color-text-secondary)] mt-0.5">{a.details}</p>}
            </div>
          </span>
        </div>
      )) : (
        <p className="text-[0.78rem] text-[var(--color-text-secondary)] text-center py-4">No audit records.</p>
      )}
    </div>
  );

  const tabContent: Record<DrawerTab, React.ReactNode> = {
    profile:      tabProfile,
    organisation: tabOrganisation,
    access:       tabAccess,
    invitation:   tabInvitation,
    security:     tabSecurity,
    activity:     tabActivity,
    audit:        tabAudit,
  };

  // ── Footer ─────────────────────────────────────────────────────────────────

  const footerContent = (
    <div className="user-drawer-footer">
      <div className="flex flex-col gap-2">
        <Button variant="primary" size="lg" fullWidth leadingIcon={Pencil} onClick={onEdit}>
          Edit User
        </Button>
        {secondaryActions.slice(0, 4).map(act => {
          const meta = ACTION_META[act];
          const Icon = meta.icon;
          const isStatusAction = ["activate","suspend","unsuspend","lock","unlock","deactivate","archive","restore","delete"].includes(act);
          return (
            <Button
              key={act}
              variant={meta.variant as "secondary" | "destructive-subtle" | "destructive"}
              size="md"
              fullWidth
              leadingIcon={Icon as any}
              onClick={() => {
                if (act === "assign_role")   { setRoleChangeOpen(true);  return; }
                if (act === "transfer_org")  { setOrgTransferOpen(true); return; }
                if (act === "add_gov")       { setGovMemberOpen(true);   return; }
                if (act === "send_invite")   { invMgr.sendInvitation(user.id, currentUser?.id ?? "sys", actorName); setActiveTab("invitation"); return; }
                if (act === "resend_invite") { invMgr.resendInvitation(user.id, currentUser?.id ?? "sys", actorName); return; }
                if (act === "cancel_invite") { invMgr.cancelInvitation(user.id, currentUser?.id ?? "sys", actorName); return; }
                if (act === "require_2fa")   { security.require2FA(actorName); return; }
                if (isStatusAction)          { setPendingAction(act); return; }
              }}
            >
              {meta.label}
            </Button>
          );
        })}
        {secondaryActions.length > 4 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {secondaryActions.slice(4).map(act => {
              const meta = ACTION_META[act];
              const Icon = meta.icon;
              const isStatusAction = ["activate","suspend","unsuspend","lock","unlock","deactivate","archive","restore","delete"].includes(act);
              return (
                <Button key={act} variant="ghost" size="sm" leadingIcon={Icon as any}
                  onClick={() => {
                    if (isStatusAction) setPendingAction(act);
                  }}
                >
                  {meta.label}
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <ResponsiveOverlay
        open={true}
        onClose={onClose}
        title="User Details"
        footer={footerContent}
        closeLabel="Close user details"
        className="user-detail-drawer"
        desktopWidth="26rem"
      >
        {/* User header */}
        <div className="user-detail-drawer__header">
          <div className="user-drawer__avatar">{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <ExpandableText value={user.name} maxChars={90} collapsedLines={2} mode="block" className="user-detail-drawer__name" as="p" />
            <SafeText value={designation?.name ?? user.designation ?? user.position ?? ""} mode="break" as="p" className="user-detail-drawer__designation" />
            <div className="flex gap-2 flex-wrap mt-1">
              <StatusBadge value={user.account_status ?? "inactive"} />
              {user.user_type && (
                <span className="text-[0.68rem] bg-[var(--color-surface)] border border-[var(--color-border)] rounded px-1.5 py-0.5 text-[var(--color-text-secondary)]">
                  {user.user_type}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="user-drawer__tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`user-drawer__tab ${activeTab === tab.id ? "user-drawer__tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="user-detail-drawer__content">
          {tabContent[activeTab]}
        </div>
      </ResponsiveOverlay>

      {/* Status change confirmation modal */}
      {pendingAction && ["activate","suspend","unsuspend","lock","unlock","deactivate","archive","restore","delete"].includes(pendingAction) && (
        <StatusChangeModal
          user={user}
          action={pendingAction as StatusChangeModalProps["action"]}
          onConfirm={(reason) => {
            onStatusChange(pendingAction as StatusChangeModalProps["action"], reason);
            setPendingAction(null);
          }}
          onClose={() => setPendingAction(null)}
        />
      )}

      {/* Role change modal */}
      {roleChangeOpen && (
        <RoleChangeModal
          user={user}
          roles={roles}
          onConfirm={(newRoleId, reason) => {
            const u = bmsReg.items.find(r => r.id === user.id);
            if (u) {
              const prevRole = roles.find(r => r.id === (u.primary_role_id ?? u.role_id));
              const newRole  = roles.find(r => r.id === newRoleId);
              bmsReg.update(u.id, { primary_role_id: newRoleId, role_id: newRoleId, role: newRole?.name ?? u.role });
              // Recalculate user counts for affected roles
              const allUsers = bmsReg.items.map(bu => bu.id === u.id ? { ...u, primary_role_id: newRoleId, role_id: newRoleId } : bu);
              roles.forEach(r => {
                const count = allUsers.filter(bu =>
                  (bu.primary_role_id === r.id || bu.role_id === r.id || (bu.role_ids ?? []).includes(r.id))
                  && bu.account_status === "active"
                ).length;
                if (count !== r.usersCount) updateRole({ ...r, usersCount: count });
              });
              const ts = new Date().toISOString();
              auditReg.add({
                id: generateId("AUD", auditReg.items.map(a => a.id)),
                event_id: generateId("AUD", auditReg.items.map(a => a.id)),
                entity_type: "User", entity_id: user.id,
                action: "role_changed",
                actor: actorName, actor_role: "Administrator",
                timestamp: ts, ip_address: "—",
                details: `Role changed from "${prevRole?.name ?? "—"}" to "${newRole?.name ?? "—"}". Reason: ${reason}`,
                approval_status: "Logged",
              } as Parameters<typeof auditReg.add>[0]);
            }
            setRoleChangeOpen(false);
          }}
          onClose={() => setRoleChangeOpen(false)}
        />
      )}

      {/* Org transfer modal */}
      {orgTransferOpen && (
        <OrgTransferModal
          user={user}
          onConfirm={({ branchId, divisionId, departmentId, effectiveDate, reason }) => {
            const u = bmsReg.items.find(r => r.id === user.id);
            if (u) {
              const prevBranch = orgReg.items.find(o => o.id === u.branch_id)?.unit_name ?? "—";
              const newBranch  = orgReg.items.find(o => o.id === branchId)?.unit_name ?? "—";
              const ts = new Date().toISOString();
              const primaryUnitId = departmentId || divisionId || branchId;
              bmsReg.update(u.id, {
                branch_id:                   branchId,
                division_id:                 divisionId,
                department_id:               departmentId,
                primary_org_unit_id:         primaryUnitId,
                effective_org_transfer_date: effectiveDate || undefined,
                updated_at:                  ts,
              } as Parameters<typeof bmsReg.update>[1]);
              auditReg.add({
                id: generateId("AUD", auditReg.items.map(a => a.id)),
                event_id: generateId("AUD", auditReg.items.map(a => a.id)),
                entity_type: "User", entity_id: user.id,
                action: "org_transfer",
                actor: actorName, actor_role: "Administrator",
                timestamp: ts, ip_address: "—",
                details: `Organisation transferred from "${prevBranch}" to "${newBranch}". Reason: ${reason}`,
                approval_status: "Logged",
              } as Parameters<typeof auditReg.add>[0]);
            }
            setOrgTransferOpen(false);
          }}
          onClose={() => setOrgTransferOpen(false)}
        />
      )}

      {/* Governance membership modal */}
      {govMemberOpen && (
        <GovernanceMembershipModal
          user={user}
          onConfirm={(membership) => {
            const newMemId = generateId("MEM", govMemReg.items.map(m => m.id));
            govMemReg.add({
              id:                newMemId,
              user_id:           user.id,
              gov_body_id:       membership.govBodyId,
              gov_body_name:     membership.govBodyName,
              membership_role:   membership.membershipRole,
              is_voting_member:  membership.isVotingMember,
              counts_for_quorum: membership.countsForQuorum,
              start_date:        membership.startDate,
              end_date:          membership.endDate,
              appointed_by_name: membership.appointedByName,
              notes:             membership.notes,
              status:            "active",
              created_at:        new Date().toISOString(),
            } as Parameters<typeof govMemReg.add>[0]);
            // Store membership record ID on user so cross-module lookups work
            const u = bmsReg.items.find(r => r.id === user.id);
            if (u) {
              const existingIds = u.governance_membership_ids ?? [];
              bmsReg.update(u.id, { governance_membership_ids: [...existingIds, newMemId] });
            }
            const ts = new Date().toISOString();
            auditReg.add({
              id: generateId("AUD", auditReg.items.map(a => a.id)),
              event_id: generateId("AUD", auditReg.items.map(a => a.id)),
              entity_type: "User", entity_id: user.id,
              action: "governance_membership_added",
              actor: actorName, actor_role: "Administrator",
              timestamp: ts, ip_address: "—",
              details: `Added to "${membership.govBodyName}" as ${membership.membershipRole}`,
              approval_status: "Logged",
            } as Parameters<typeof auditReg.add>[0]);
            setGovMemberOpen(false);
          }}
          onClose={() => setGovMemberOpen(false)}
        />
      )}
    </>
  );
}
