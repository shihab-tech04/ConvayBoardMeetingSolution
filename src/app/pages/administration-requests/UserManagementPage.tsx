import { useState, useRef, startTransition, useMemo, useEffect } from "react";
import { useNavigate } from "react-router";
import { Users, UserCheck, UserX, AlertCircle, Shield, UserPlus, Clock, Eye } from "lucide-react";
import { Button } from "../../components/buttons/Button";
import { handleExportDisabled } from "../../utils/exportDisabled";
import { StatCard } from "../../components/cards/StatCard";
import { useBmsUserRegistry, type BmsUser } from "../../data/bmsUsers";
import { useUserRegistry } from "../../hooks/useUserRegistry";
import { useRoleRegistry } from "../../hooks/useRoleRegistry";
import { useDesignationRegistry } from "../../data/designations";
import { useOrgUnitRegistry, useGovernanceRegistry, useAuditEventRegistry, generateId } from "../../data/boardMeetingData";
import { useUserInvitationRegistry } from "../../data/bmsUsers";
import { useUserManagementPermissions } from "../../utils/userPermissions";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useInvitationManager } from "../../hooks/useInvitationManager";
import { isValidTransition } from "../../data/userLifecycle";
import type { AccountStatus } from "../../data/bmsUsers";
import { UserDetailDrawer, ReAssignRoleModal } from "../../components/users/UserComponents";
import { UserFormModal } from "../../components/users/UserFormModal";
import { UnifiedDataTable } from "../../components/tables";
import type { ColDef, FilterDef } from "../modulePageUtils";
import { fc, BADGE } from "../modulePageUtils";

interface UserManagementPageProps {
  onManageRoles?: () => void;
}

// Friendly labels for account_status values
const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  draft:              "Draft",
  invited:            "Invited",
  pending_activation: "Pending Activation",
  active:             "Active",
  suspended:          "Suspended",
  locked:             "Locked",
  inactive:           "Inactive",
  deactivated:        "Deactivated",
  archived:           "Archived",
};

const INVITATION_STATUS_LABELS: Record<string, string> = {
  not_sent:        "Not Sent",
  pending:         "Pending",
  sent:            "Sent",
  opened:          "Opened",
  accepted:        "Accepted",
  declined:        "Declined",
  expired:         "Expired",
  activated:       "Activated",
  cancelled:       "Cancelled",
  delivery_failed: "Delivery Failed",
};

export function UserManagementPage({ onManageRoles }: UserManagementPageProps) {
  const navigate = useNavigate();
  const handleManageRoles = onManageRoles ?? (() => startTransition(() => navigate("/administration/role-management")));

  // Canonical registries
  const bmsReg      = useBmsUserRegistry();
  const roleReg     = useRoleRegistry();
  const desigReg    = useDesignationRegistry();
  const orgReg      = useOrgUnitRegistry();
  const govReg      = useGovernanceRegistry();
  const auditReg    = useAuditEventRegistry();
  const invRegRaw   = useUserInvitationRegistry();
  const userOps     = useUserRegistry();
  const perms       = useUserManagementPermissions();
  const currentUser = useCurrentUser();
  const actorName   = currentUser?.name ?? "Administrator";
  const invMgr      = useInvitationManager();

  // Run expiry check every time this page mounts or becomes visible
  useEffect(() => {
    invMgr.checkAndExpire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // For UserFormModal: pass bmsUsers so duplicate checking works
  const bmsUsers = bmsReg.items;
  const roles    = roleReg.roles;

  // ── UI state ──────────────────────────────────────────────────────────────────
  const [search, setSearch]       = useState("");
  const [fVals, setFVals]         = useState<Record<string, string>>({});
  const [applied, setApplied]     = useState<Record<string, string>>({});
  const [page, setPage]           = useState(1);
  const [drawerUser, setDrawerUser]   = useState<BmsUser | null>(null);
  const [reAssignUser, setReAssignUser] = useState<BmsUser | null>(null);
  const [addUserOpen, setAddUserOpen]   = useState(false);
  const [editUserId, setEditUserId]     = useState<string | null>(null);
  const addUserBtnRef = useRef<HTMLButtonElement>(null);
  const PER = 10;

  // ── Active filter count ────────────────────────────────────────────────────────
  const activeFilterCount = Object.values(applied).filter(v => v && v !== "All").length;

  // ── Derived options ────────────────────────────────────────────────────────────
  const activeRoleOptions   = ["All", ...roleReg.roles.map(r => r.name)];
  const designationOptions  = ["All", ...desigReg.items.filter(d => d.status === "Active").map(d => d.name)];
  const orgBranchOptions    = ["All", ...orgReg.items.filter(u => u.unit_type === "Branch").map(u => u.unit_name)];
  const allDivisions        = orgReg.items.filter(u => u.unit_type === "Division");
  const allDepts            = orgReg.items.filter(u => u.unit_type === "Department");

  // Cascading division/dept based on applied branch/division filters
  const filteredDivOpts = applied.branch && applied.branch !== "All"
    ? allDivisions.filter(d => d.parent_unit === applied.branch)
    : allDivisions;
  const filteredDeptOpts = applied.division && applied.division !== "All"
    ? allDepts.filter(d => d.parent_unit === applied.division)
    : allDepts;

  // ── Column definitions ─────────────────────────────────────────────────────────
  const cols: ColDef[] = [
    fc("employeeId",       "ID",               { headerKey: "userTable.employeeId" }),
    fc("name",             "User",             { headerKey: "userTable.user" }),
    fc("email",            "Email",            { headerKey: "userTable.email" }),
    fc("userType",         "User Type",        { headerKey: "userTable.userType" }),
    fc("designation",      "Designation",      { headerKey: "userTable.designation" }),
    fc("primaryRole",      "Primary Role",     { headerKey: "userTable.primaryRole" }),
    fc("organisation",     "Organisation",     { headerKey: "userTable.organisation" }),
    BADGE("accountStatus", "Account Status"),
    BADGE("invitationStatus", "Invitation"),
    fc("lastActive",       "Last Active",      { headerKey: "userTable.lastActive" }),
  ];

  // ── Filter definitions ─────────────────────────────────────────────────────────
  const filters: FilterDef[] = [
    { key: "userType",        label: "User Type",         type: "select", options: ["All", "Internal Employee", "Governance Member", "External Participant"] },
    { key: "accountStatus",   label: "Account Status",    type: "select", options: ["All", ...Object.keys(ACCOUNT_STATUS_LABELS)] },
    { key: "invitationStatus",label: "Invitation Status", type: "select", options: ["All", ...Object.keys(INVITATION_STATUS_LABELS)] },
    { key: "role",            label: "Role",              type: "select", options: activeRoleOptions },
    { key: "designation",     label: "Designation",       type: "select", options: designationOptions },
    { key: "branch",          label: "Branch",            type: "select", options: orgBranchOptions },
    { key: "division",        label: "Division",          type: "select", options: ["All", ...filteredDivOpts.map(u => u.unit_name)] },
    { key: "department",      label: "Department",        type: "select", options: ["All", ...filteredDeptOpts.map(u => u.unit_name)] },
    { key: "twoFA",           label: "2FA Status",        type: "select", options: ["All", "Enabled", "Disabled"] },
    { key: "accessExpiry",    label: "Access Expiry",     type: "select", options: ["All", "Expiring Soon (30 days)", "Expired", "No Expiry"] },
    { key: "lastActivity",    label: "Last Activity",     type: "select", options: ["All", "Today", "Last 7 days", "Last 30 days", "Over 90 days", "Never"] },
  ];

  // ── Filter + search logic ──────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return bmsUsers.filter(u => {
      // Search
      if (q) {
        const desig = desigReg.items.find(d => d.id === u.designation_id)?.name ?? u.designation ?? "";
        const orgUnit = orgReg.items.find(o => o.id === u.primary_org_unit_id)?.unit_name ?? u.circle ?? "";
        const roleLabel = roles.find(r => r.id === u.primary_role_id || r.id === u.role_id)?.name ?? u.role ?? "";
        const haystack = [
          u.name, u.display_name, u.email, u.employee_id,
          u.external_reference_id, u.phone, roleLabel, desig, orgUnit,
        ].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      // Filters
      if (applied.userType        && applied.userType !== "All"        && u.user_type !== applied.userType) return false;
      if (applied.accountStatus   && applied.accountStatus !== "All"   && u.account_status !== applied.accountStatus) return false;
      if (applied.invitationStatus && applied.invitationStatus !== "All" && u.invitation_status !== applied.invitationStatus) return false;
      if (applied.designation     && applied.designation !== "All") {
        const desig = desigReg.items.find(d => d.id === u.designation_id)?.name ?? u.designation ?? "";
        if (desig !== applied.designation) return false;
      }
      if (applied.role && applied.role !== "All") {
        const roleLabel = roles.find(r => r.id === u.primary_role_id || r.id === u.role_id)?.name ?? u.role ?? "";
        if (roleLabel !== applied.role) return false;
      }
      if (applied.branch && applied.branch !== "All") {
        const branch = orgReg.items.find(o => o.id === u.branch_id)?.unit_name ?? "";
        if (branch !== applied.branch) return false;
      }
      if (applied.division && applied.division !== "All") {
        const div = orgReg.items.find(o => o.id === u.division_id)?.unit_name ?? "";
        if (div !== applied.division) return false;
      }
      if (applied.department && applied.department !== "All") {
        const dept = orgReg.items.find(o => o.id === u.department_id)?.unit_name ?? "";
        if (dept !== applied.department) return false;
      }
      if (applied.twoFA && applied.twoFA !== "All") {
        const has2FA = !!(u.two_factor_enabled || u.two_factor_enrolled || u.twoFA);
        if (applied.twoFA === "Enabled"  && !has2FA) return false;
        if (applied.twoFA === "Disabled" && has2FA)  return false;
      }
      if (applied.accessExpiry && applied.accessExpiry !== "All") {
        const expiresAt = u.access_expires_at;
        const now = new Date();
        const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        if (applied.accessExpiry === "No Expiry"           && expiresAt) return false;
        if (applied.accessExpiry === "Expired"             && (!expiresAt || new Date(expiresAt) >= now)) return false;
        if (applied.accessExpiry === "Expiring Soon (30 days)" && (!expiresAt || new Date(expiresAt) < now || new Date(expiresAt) > in30)) return false;
      }
      if (applied.lastActivity && applied.lastActivity !== "All") {
        const lastAt = u.last_active_at ?? u.lastActive;
        const now = new Date();
        if (applied.lastActivity === "Never" && lastAt) return false;
        if (applied.lastActivity !== "Never" && !lastAt) return false;
        if (lastAt) {
          const d = new Date(lastAt);
          const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
          if (applied.lastActivity === "Today"       && diffDays >= 1)  return false;
          if (applied.lastActivity === "Last 7 days" && diffDays >= 7)  return false;
          if (applied.lastActivity === "Last 30 days"&& diffDays >= 30) return false;
          if (applied.lastActivity === "Over 90 days"&& diffDays < 90)  return false;
        }
      }
      return true;
    });
  }, [bmsUsers, search, applied, desigReg.items, orgReg.items, roles]);

  const pageUsers = filtered.slice((page - 1) * PER, page * PER);

  // ── Table rows ─────────────────────────────────────────────────────────────────
  const rows = pageUsers.map(u => {
    const desig    = desigReg.items.find(d => d.id === u.designation_id)?.name ?? u.designation ?? "";
    const orgUnit  = orgReg.items.find(o => o.id === u.primary_org_unit_id)?.unit_name ?? u.circle ?? "";
    const roleLabel = roles.find(r => r.id === u.primary_role_id || r.id === u.role_id)?.name ?? u.role ?? "";
    return {
      id:               u.id,
      employeeId:       u.employee_id,
      name:             u.name,
      email:            u.email,
      userType:         u.user_type ?? "—",
      designation:      desig || "—",
      primaryRole:      roleLabel || "—",
      organisation:     orgUnit || "—",
      accountStatus:    ACCOUNT_STATUS_LABELS[u.account_status ?? "inactive"] ?? u.account_status ?? "—",
      invitationStatus: INVITATION_STATUS_LABELS[u.invitation_status ?? "not_sent"] ?? "—",
      lastActive:       u.last_active_at ?? u.lastActive ?? "—",
      _original:        u,
    };
  });

  // ── Stats ──────────────────────────────────────────────────────────────────────
  const stats = [
    { label: "Total Users",    value: bmsUsers.length,                                                  Icon: Users,      tone: "primary"  as const },
    { label: "Active",         value: bmsUsers.filter(u => u.account_status === "active").length,        Icon: UserCheck,  tone: "success"  as const },
    { label: "Invited",        value: bmsUsers.filter(u => u.account_status === "invited" || u.account_status === "pending_activation").length, Icon: Clock, tone: "warning" as const },
    { label: "Inactive / Suspended", value: bmsUsers.filter(u => ["inactive","suspended","locked","deactivated"].includes(u.account_status ?? "")).length, Icon: UserX, tone: "neutral" as const },
  ];

  // ── Handlers ───────────────────────────────────────────────────────────────────

  const closeUserModal = () => {
    setAddUserOpen(false);
    setEditUserId(null);
    requestAnimationFrame(() => addUserBtnRef.current?.focus());
  };

  const handleSaveUser = (saved: BmsUser) => {
    const existing = bmsReg.getById(saved.id);
    const now = new Date().toISOString();
    if (existing) {
      bmsReg.update(saved.id, { ...existing, ...saved, updated_at: now });
      auditReg.add({
        id: generateId("AUD", auditReg.items.map(a => a.id)),
        event_id: generateId("AUD", auditReg.items.map(a => a.id)),
        entity_type: "User", entity_id: saved.id,
        action: "user_updated", actor: actorName, actor_role: "Administrator",
        timestamp: now, ip_address: "—",
        details: `User profile updated for ${saved.name}`,
        approval_status: "Logged",
      } as Parameters<typeof auditReg.add>[0]);
    } else {
      bmsReg.add({ ...saved, created_at: now });
      auditReg.add({
        id: generateId("AUD", auditReg.items.map(a => a.id)),
        event_id: generateId("AUD", auditReg.items.map(a => a.id)),
        entity_type: "User", entity_id: saved.id,
        action: "user_created", actor: actorName, actor_role: "Administrator",
        timestamp: now, ip_address: "—",
        details: `New user created: ${saved.name} (${saved.account_status ?? "draft"})`,
        approval_status: "Logged",
      } as Parameters<typeof auditReg.add>[0]);
    }
    // Recalculate usersCount for roles
    const updated = existing
      ? bmsReg.items.map(u => u.id === saved.id ? saved : u)
      : [...bmsReg.items, saved];
    roleReg.roles.forEach(r => {
      const count = updated.filter(u =>
        (u.primary_role_id === r.id || u.role_id === r.id || (u.role_ids ?? []).includes(r.id))
        && u.account_status === "active"
      ).length;
      if (count !== r.usersCount) roleReg.updateRole({ ...r, usersCount: count });
    });
  };

  const handleStatusChange = (
    userId: string,
    action: "activate" | "suspend" | "unsuspend" | "lock" | "unlock" | "deactivate" | "archive" | "restore" | "delete",
    reason?: string,
  ) => {
    const u = bmsReg.getById(userId);
    if (!u) return;

    // Handler-level permission guards
    if (action === "suspend"    && !perms.canSuspendUser)    return;
    if (action === "deactivate" && !perms.canDeactivateUser) return;
    if (action === "archive"    && !perms.canArchiveUser)    return;
    if (action === "restore"    && !perms.canArchiveUser)    return;
    if (action === "unlock"     && !perms.canUnlockUser)     return;

    // Lifecycle transition validation
    const TARGET_STATUS: Partial<Record<typeof action, AccountStatus>> = {
      activate:   "active",
      suspend:    "suspended",
      unsuspend:  "active",
      lock:       "locked",
      unlock:     "active",
      deactivate: "deactivated",
      archive:    "archived",
      restore:    "inactive",
    };
    const targetStatus = TARGET_STATUS[action];
    if (targetStatus && !isValidTransition((u.account_status ?? "inactive") as AccountStatus, targetStatus)) return;

    const now = new Date().toISOString();
    const patch: Partial<BmsUser> = { updated_at: now };

    const AUDIT_DETAILS: Record<string, string> = {
      activate:   `Account activated`,
      suspend:    reason ? `Account suspended: ${reason}` : "Account suspended",
      unsuspend:  "Account unsuspended (restored to active)",
      lock:       "Account locked",
      unlock:     "Account unlocked; failed login count cleared",
      deactivate: reason ? `Account deactivated: ${reason}` : "Account deactivated",
      archive:    reason ? `Account archived: ${reason}` : "Account archived",
      restore:    "Account restored from archive to inactive",
      delete:     "Draft account permanently deleted",
    };

    switch (action) {
      case "activate":    patch.account_status = "active";      patch.accountActive = true;  break;
      case "suspend":     patch.account_status = "suspended";   patch.suspended_at = now; patch.suspension_reason = reason; break;
      case "unsuspend":   patch.account_status = "active";      patch.suspended_at = undefined; break;
      case "lock":        patch.account_status = "locked";      patch.locked_at = now; break;
      case "unlock":      patch.account_status = "active";      patch.locked_at = undefined; patch.failed_login_count = 0; break;
      case "deactivate":  patch.account_status = "deactivated"; patch.deactivated_at = now; patch.deactivation_reason = reason; patch.accountActive = false; break;
      case "archive":     patch.account_status = "archived";    patch.archived_at = now; patch.archived_by = actorName; break;
      case "restore":     patch.account_status = "inactive";    patch.archived_at = undefined; break;
      case "delete": {
        if (u.account_status !== "draft") return;
        // Block permanent delete if any related history exists
        const hasAudit = auditReg.items.some(a => a.entity_id === userId);
        const hasInv   = invRegRaw.items.some(i => i.user_id === userId);
        if (hasAudit || hasInv) {
          // History exists — silently block; caller should offer Archive instead
          return;
        }
        auditReg.add({
          id: generateId("AUD", auditReg.items.map(a => a.id)),
          event_id: generateId("AUD", auditReg.items.map(a => a.id)),
          entity_type: "User", entity_id: userId,
          action: "user_deleted", actor: actorName, actor_role: "Administrator",
          timestamp: now, ip_address: "—",
          details: AUDIT_DETAILS.delete,
          approval_status: "Logged",
        } as Parameters<typeof auditReg.add>[0]);
        bmsReg.remove(userId);
        setDrawerUser(null);
        return;
      }
    }

    bmsReg.update(userId, { ...u, ...patch });

    auditReg.add({
      id: generateId("AUD", auditReg.items.map(a => a.id)),
      event_id: generateId("AUD", auditReg.items.map(a => a.id)),
      entity_type: "User", entity_id: userId,
      action: `account_${action}`,
      actor: actorName, actor_role: "Administrator",
      timestamp: now, ip_address: "—",
      details: AUDIT_DETAILS[action] ?? action,
      approval_status: "Logged",
    } as Parameters<typeof auditReg.add>[0]);

    // Refresh drawer user
    const updated = bmsReg.getById(userId);
    if (updated) setDrawerUser(updated);
    else setDrawerUser(null);
  };

  return (
    <div className="user-management">
      <div className="user-management__header">
        <div className="user-management__header-row">
          <div>
            <h1 className="user-management__title">User Management</h1>
            <p className="user-management__subtitle">
              {bmsUsers.length} users · {activeFilterCount > 0 ? `${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} active` : "Manage system users, roles, and access"}
            </p>
          </div>
          <div className="user-management__actions">
            {perms.canManageRoles && (
              <Button variant="secondary" size="sm" leadingIcon={Shield} onClick={handleManageRoles}>
                Manage Roles
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              leadingIcon={UserPlus}
              onClick={() => setAddUserOpen(true)}
            >
              Add User
            </Button>
          </div>
        </div>
      </div>

      <div className="user-management__stats">
        {stats.map(({ label, value, Icon, tone }) => (
          <StatCard key={label} icon={Icon} value={String(value)} label={label} tone={tone} />
        ))}
      </div>

      <UnifiedDataTable
        title="Users"
        countLabel="users"
        singularLabel="user"
        totalCount={filtered.length}
        cols={cols}
        rows={rows}
        actions={[{ id: "view", label: "View Details", labelKey: "actions.view", icon: Eye }]}
        emptyLabel="No users have been added yet. Click Add User to get started."
        filteredEmptyLabel="No users match your current search or filters. Try clearing some filters."
        onViewRow={row => {
          const u = bmsReg.items.find(u => u.id === row.id);
          if (u) setDrawerUser(u);
        }}
        search={search}
        searchPlaceholder="Search by name, email, ID, role, designation…"
        onSearchChange={v => { setSearch(v); setPage(1); }}
        filterDefs={filters}
        filterValues={fVals}
        appliedFilters={applied}
        onFilterChange={(k, v) => setFVals(p => ({ ...p, [k]: v }))}
        onApplyFilters={() => { setApplied(fVals); setPage(1); }}
        onResetFilters={() => { setFVals({}); setApplied({}); setPage(1); }}
        onExport={() => handleExportDisabled("Export is currently disabled.")}
        page={page}
        perPage={PER}
        onPageChange={setPage}
        mobileCardMapping={{
          primary:    "name",
          identifier: "employeeId",
          meta:       ["userType", "primaryRole", "organisation"],
          status:     "accountStatus",
        }}
        aria-label="User Management"
      />

      {/* Detail drawer */}
      {drawerUser && (
        <UserDetailDrawer
          user={drawerUser}
          onClose={() => setDrawerUser(null)}
          onEdit={() => {
            const id = drawerUser.id;
            setDrawerUser(null);
            setEditUserId(id);
          }}
          onReAssign={() => { setReAssignUser(drawerUser); setDrawerUser(null); }}
          onStatusChange={(action, reason) => handleStatusChange(drawerUser.id, action, reason)}
        />
      )}

      {/* Re-assign role modal */}
      {reAssignUser && (
        <ReAssignRoleModal
          user={reAssignUser}
          onConfirm={(newRoleId, newRoleName) => {
            userOps.assignRoles(reAssignUser.id, [newRoleId]);
            const u = bmsReg.getById(reAssignUser.id);
            if (u) bmsReg.update(reAssignUser.id, { ...u, primary_role_id: newRoleId, role: newRoleName, role_id: newRoleId });
            setReAssignUser(null);
          }}
          onClose={() => setReAssignUser(null)}
        />
      )}

      {/* Add / Edit modal */}
      <UserFormModal
        open={addUserOpen || editUserId !== null}
        userId={editUserId}
        bmsUsers={bmsUsers}
        roles={roles}
        onClose={closeUserModal}
        onSave={handleSaveUser}
        onNavigateToRoleManagement={handleManageRoles}
      />
    </div>
  );
}
