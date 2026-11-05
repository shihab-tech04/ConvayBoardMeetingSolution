import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Eye, Shield, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../../components/buttons/Button";
import { StatCard } from "../../components/cards/StatCard";
import { AppModal } from "../../components/modals/AppModal";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import { AppTextField } from "../../components/forms/AppTextField";
import { AppPasswordField } from "../../components/forms/AppPasswordField";
import { AppCheckbox } from "../../components/forms/AppCheckbox";
import { useAccessSnapshot, reloadAccessSnapshot } from "../../services/supabase/convayAccess";
import { ResponsiveOverlay } from "../../components/shared/ResponsiveOverlay";
import { UnifiedDataTable } from "../../components/tables";
import { fc, BADGE } from "../modulePageUtils";
import type { ColDef, FilterDef } from "../modulePageUtils";
import { convayAuth, type ConvayProfile } from "../../services/supabase/convayAuth";

type Mode = "invite" | "edit" | "password" | null;
type StatusAction = "active" | "suspended" | "inactive" | "delete";
interface FormState { name: string; username: string; email: string; password: string; phone: string; }
const blank: FormState = { name: "", username: "", email: "", password: "", phone: "" };
const columns: ColDef[] = [
  fc("employeeId", "ID"),
  fc("name", "User"),
  fc("email", "Email"),
  fc("userType", "User Type"),
  fc("primaryRole", "Primary Role"),
  BADGE("accountStatus", "Account Status"),
  fc("lastActive", "Last Active"),
];
const filters: FilterDef[] = [
  { key: "status", label: "Account Status", type: "select", options: ["All", "Active", "Awaiting verification", "Finish account setup", "Inactive", "Suspended"] },
  { key: "role", label: "Role", type: "select", options: ["All", "Super Admin", "User"] },
];
function displayStatus(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}
function displayAccountStatus(user: ConvayProfile) {
  if (user.invitation_status === "pending") return "Awaiting verification";
  if (user.invitation_status === "verified") return "Finish account setup";
  return displayStatus(user.account_status);
}
function csv(value: unknown) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

export function SupabaseUserManagementPage() {
  const navigate = useNavigate();
  const access = useAccessSnapshot();
  const [users, setUsers] = useState<ConvayProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [filtersSelected, setFiltersSelected] = useState<Record<string, string>>({});
  const [applied, setApplied] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<Mode>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ id: string; action: StatusAction } | null>(null);
  const [form, setForm] = useState<FormState>(blank);
  const [roleAssignId, setRoleAssignId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [assignError, setAssignError] = useState("");

  const loadUsers = async () => {
    setLoading(true);
    setLoadError("");
    try {
      const result = await convayAuth.users("list");
      setUsers(result.users ?? []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void loadUsers(); }, []);

  const selected = users.find(u => u.user_id === selectedId) ?? null;
  const editing = users.find(u => u.user_id === editId) ?? null;

  const filtered = useMemo(() => users.filter(u => {
    const q = search.trim().toLowerCase();
    if (q && ![u.username, u.display_name, u.email, u.employee_id, u.phone]
      .some(text => String(text ?? "").toLowerCase().includes(q))) return false;
    if (applied.status && applied.status !== "All" && displayAccountStatus(u) !== applied.status) return false;
    if (applied.role && applied.role !== "All"
      && (u.account_role === "super_admin" ? "Super Admin" : "User") !== applied.role) return false;
    return true;
  }), [users, search, applied]);

  const pageRows = filtered.slice((page - 1) * 10, page * 10).map(u => ({
    id: u.user_id,
    employeeId: u.employee_id || "—",
    name: u.display_name,
    email: u.email,
    userType: u.user_type || "Internal Employee",
    primaryRole: u.account_role === "super_admin" ? "Super Admin" :
      access.user_assignments.filter(a => a.user_id === u.user_id)
        .map(a => access.roles.find(r => r.id === a.role_id)?.name).filter(Boolean).join(", ") || "Unassigned",
    accountStatus: displayAccountStatus(u),
    lastActive: u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : "—",
  }));
  const stats = [
    { label: "Total Users", value: users.length, Icon: Users, tone: "primary" as const },
    { label: "Active", value: users.filter(u => u.account_status === "active").length, Icon: UserCheck, tone: "success" as const },
    { label: "Inactive / Suspended", value: users.filter(u => u.account_status !== "active").length, Icon: UserX, tone: "neutral" as const },
    { label: "Super Admins", value: users.filter(u => u.account_role === "super_admin").length, Icon: Shield, tone: "primary" as const },
  ];

  const openRoleAssignment = (user: ConvayProfile) => {
    setSelectedId(null);
    setRoleAssignId(user.user_id);
    setSelectedRoles(access.user_assignments.filter(a => a.user_id === user.user_id).map(a => a.role_id));
    setAssignError("");
  };
  const saveRoleAssignments = async () => {
    if (!roleAssignId || working) return;
    setWorking(true);
    setAssignError("");
    try {
      await convayAuth.access("assign_roles", { user_id: roleAssignId, role_ids: selectedRoles });
      await reloadAccessSnapshot();
      setRoleAssignId(null);
      toast.success("User roles updated");
    } catch (error) {
      setAssignError(error instanceof Error ? error.message : "Unable to assign roles");
    } finally {
      setWorking(false);
    }
  };
  const closeForm = () => {
    if (working) return;
    setMode(null);
    setEditId(null);
    setForm(blank);
    setFormError("");
  };
  const openInvite = () => {
    setForm(blank);
    setFormError("");
    setEditId(null);
    setMode("invite");
  };
  const openEdit = (user: ConvayProfile) => {
    setSelectedId(null);
    setEditId(user.user_id);
    setForm({ name: user.display_name, username: user.username, email: user.email,
      password: "", phone: user.phone ?? "" });
    setFormError("");
    setMode("edit");
  };
  const openPassword = (user: ConvayProfile) => {
    setSelectedId(null);
    setEditId(user.user_id);
    setForm({ name: user.display_name, username: user.username, email: user.email,
      password: "", phone: user.phone ?? "" });
    setFormError("");
    setMode("password");
  };
  const setField = (field: keyof FormState, value: string) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const save = async () => {
    if (!mode || working) return;
    if (mode !== "password" && (!form.name.trim() || !form.email.trim())) {
      setFormError("User name and email are required");
      return;
    }
    if (mode === "password" && form.password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    setWorking(true);
    setFormError("");
    try {
      if (mode === "invite") {
        await convayAuth.users("invite", {
          name: form.name.trim(), username: form.username.trim() || undefined,
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
        });
        toast.success("Invitation sent. The account stays inactive until the user verifies their email and sets a password.");
      } else if (mode === "edit" && editing) {
        await convayAuth.users("update", {
          user_id: editing.user_id, name: form.name.trim(), username: form.username.trim(),
          phone: form.phone.trim(),
        });
        toast.success("User updated");
      } else if (mode === "password" && editing) {
        await convayAuth.users("set_password", {
          user_id: editing.user_id, password: form.password,
        });
        toast.success("Password updated");
      } else {
        throw new Error("User not found");
      }
      setMode(null);
      setEditId(null);
      setForm(blank);
      await loadUsers();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Unable to save user");
    } finally {
      setWorking(false);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirm || working) return;
    setWorking(true);
    setLoadError("");
    try {
      if (confirm.action === "delete") {
        await convayAuth.users("delete", { user_id: confirm.id });
        toast.success("User removed");
      } else {
        await convayAuth.users("set_status", { user_id: confirm.id, status: confirm.action });
        toast.success("Account status updated");
      }
      setConfirm(null);
      setSelectedId(null);
      await loadUsers();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Unable to update account");
      setConfirm(null);
    } finally {
      setWorking(false);
    }
  };
  const exportUsers = () => {
    const csvText = [
      ["User name", "Email", "Role", "Status"].map(csv).join(","),
      ...filtered.map(u => [u.display_name, u.email,
        u.account_role === "super_admin" ? "Super Admin" : "User",
        displayStatus(u.account_status)].map(csv).join(",")),
    ].join("\r\n");
    const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "convay-users.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="user-management">
      <div className="user-management__header">
        <div className="user-management__header-row">
          <div>
            <h1 className="user-management__title">User Management</h1>
            <p className="user-management__subtitle">{users.length} users · Manage system users and access</p>
          </div>
          <div className="user-management__actions">
            <Button variant="secondary" size="sm" leadingIcon={Shield} onClick={() => navigate("/administration/roles-permissions/roles")}>Manage Roles</Button>
            <Button variant="primary" size="lg" leadingIcon={UserPlus} onClick={openInvite}>Invite User</Button>
          </div>
        </div>
      </div>
      <div className="user-management__stats">
        {stats.map(({ label, value, Icon, tone }) => (
          <StatCard key={label} icon={Icon} value={String(value)} label={label} tone={tone} />
        ))}
      </div>
      {loadError && <p role="alert" className="text-red-600 text-sm my-3">{loadError}</p>}
      <UnifiedDataTable
        title="Users" countLabel="users" singularLabel="user" totalCount={filtered.length}
        cols={columns} rows={pageRows}
        actions={[{ id: "view", label: "View Details", icon: Eye }]}
        onViewRow={row => setSelectedId(String(row.id))}
        search={search} searchPlaceholder="Search by name, email or username…"
        onSearchChange={v => { setSearch(v); setPage(1); }}
        filterDefs={filters} filterValues={filtersSelected} appliedFilters={applied}
        onFilterChange={(k, v) => setFiltersSelected(p => ({ ...p, [k]: v }))}
        onApplyFilters={() => { setApplied(filtersSelected); setPage(1); }}
        onResetFilters={() => { setFiltersSelected({}); setApplied({}); setPage(1); }}
        onExport={exportUsers}
        loading={loading} error={loadError || undefined} onRetry={() => void loadUsers()}
        page={page} perPage={10} onPageChange={setPage}
        mobileCardMapping={{ primary: "name", identifier: "email",
          meta: ["userType", "primaryRole"], status: "accountStatus" }}
        emptyLabel="No accounts yet. Invite a user to get started."
        filteredEmptyLabel="No users match your search or filters."
        aria-label="User Management"
      />

      {selected && (
        <ResponsiveOverlay
          open={true} onClose={() => setSelectedId(null)} title="User Details"
          desktopWidth="26rem"
          footer={selected.account_role !== "super_admin" ? (
            <div className="user-drawer-footer">
              <div className="flex flex-col gap-2">
                <Button variant="primary" size="lg" fullWidth onClick={() => openEdit(selected)}>Edit User</Button>
                <Button variant="secondary" size="md" fullWidth onClick={() => openPassword(selected)}
                  disabled={selected.invitation_status === "pending" || selected.invitation_status === "verified"}>
                  Set Password
                </Button>
                <Button variant="secondary" size="md" fullWidth onClick={() => openRoleAssignment(selected)}>Assign Roles</Button>
                <Button variant="secondary" size="md" fullWidth onClick={() => {
                  setConfirm({ id: selected.user_id, action: selected.account_status === "active" ? "suspended" : "active" });
                }} disabled={selected.account_status !== "active" &&
                  (selected.invitation_status === "pending" || selected.invitation_status === "verified")}>
                  {selected.account_status === "active" ? "Suspend User" : "Activate User"}
                </Button>
                <Button variant="secondary" size="md" fullWidth onClick={() => {
                  setConfirm({ id: selected.user_id, action: "inactive" });
                }}>Deactivate User</Button>
                <Button variant="destructive" size="md" fullWidth onClick={() => {
                  setConfirm({ id: selected.user_id, action: "delete" });
                }}>Delete User</Button>
              </div>
            </div>
          ) : undefined}
        >
          <div className="detail-section">
            <h3>{selected.display_name}</h3>
            <p>Username: {selected.username}</p>
            <p>Email: {selected.email}</p>
            <p>Roles: {selected.account_role === "super_admin" ? "Super Admin" :
              access.user_assignments.filter(a => a.user_id === selected.user_id)
                .map(a => access.roles.find(r => r.id === a.role_id)?.name).filter(Boolean).join(", ") || "Unassigned"}</p>
            <p>Status: {displayAccountStatus(selected)}</p>
            {selected.invitation_status && selected.invitation_status !== "accepted" && (
              <p>Email verification: {selected.email_verified_at ? "Verified — the invitee must finish setting a password." : "Pending — access stays inactive until the invitee verifies this address."}</p>
            )}
            {selected.phone && <p>Phone: {selected.phone}</p>}
          </div>
        </ResponsiveOverlay>
      )}

      <AppModal
        open={mode !== null} onClose={closeForm}
        title={mode === "invite" ? "Invite User" : mode === "password" ? "Set User Password" : "Edit User"}
        icon={<UserPlus size={16}/>} size="md"
        footer={<div className="flex justify-end gap-2">
          <Button variant="ghost" size="lg" onClick={closeForm} disabled={working}>Cancel</Button>
          <Button variant="primary" size="lg" onClick={() => void save()} loading={working}>
            {mode === "invite" ? "Send invitation" : mode === "password" ? "Save Password" : "Save Changes"}
          </Button>
        </div>}
      >
        <div className="flex flex-col gap-4">
          {mode !== "password" && (
            <>
              <AppTextField id="convay-user-name" label="User name" value={form.name}
                onChange={v => setField("name", v)} required placeholder="Enter user's name"/>
              <AppTextField id="convay-username" label="Account username (optional)" value={form.username}
                onChange={v => setField("username", v)} placeholder="Optional unique account username"/>
              <AppTextField id="convay-user-email" label="Email address" value={form.email}
                onChange={v => setField("email", v)} required placeholder="user@example.com"
                readOnly={mode === "edit"}
                helper={mode === "edit" ? "Email changes require a separate verified process." : "The user must verify this address before access is activated."}/>
              <AppTextField id="convay-user-phone" label="Phone (optional)" value={form.phone}
                onChange={v => setField("phone", v)} placeholder="Phone number"/>
            </>
          )}
          {mode === "invite" && <p className="text-sm text-slate-600">Convay will email a secure invitation link. The account remains inactive until the recipient verifies this address and chooses their own password.</p>}
          {mode === "password" && (
            <AppPasswordField id="convay-user-password" label="Password" value={form.password}
              onChange={v => setField("password", v)} autoComplete="new-password"
              placeholder="Set login password"/>
          )}
          {formError && <p role="alert" className="text-red-600 text-sm">{formError}</p>}
        </div>
      </AppModal>
      <AppModal open={roleAssignId !== null}
        title="Assign User Roles"
        size="md"
        onClose={() => { if (!working) setRoleAssignId(null); }}
        footer={<div className="flex justify-end gap-2">
          <Button variant="ghost" size="lg" onClick={() => setRoleAssignId(null)} disabled={working}>Cancel</Button>
          <Button variant="primary" size="lg" onClick={() => { void saveRoleAssignments(); }} loading={working}>Save Roles</Button>
        </div>}>
        <div className="flex flex-col gap-3">
          <p>Select which application roles this user may use. Permissions take effect from the selected roles.</p>
          {access.roles.filter(r => r.status === "Active" && !r.is_system_role).length === 0 &&
            <p>No custom roles yet. Create one from Role Management.</p>}
          {access.roles.filter(r => r.status === "Active" && !r.is_system_role).map(r => (
            <AppCheckbox key={r.id} id={"assign-" + r.id} label={r.name}
              checked={selectedRoles.includes(r.id)}
              onChange={checked => setSelectedRoles(old => checked
                ? [...old, r.id] : old.filter(id => id !== r.id))} />
          ))}
          {assignError && <p role="alert" className="text-red-600 text-sm">{assignError}</p>}
        </div>
      </AppModal>
      {confirm && (
        <SConfirmModal
          title={confirm.action === "delete" ? "Delete User" : "Change User Status"}
          message={confirm.action === "delete"
            ? "Permanently delete this user and their login? This cannot be undone."
            : "Confirm the account status change for this user."}
          confirmLabel="Confirm"
          onConfirm={() => { void runConfirmedAction(); }}
          onClose={() => { if (!working) setConfirm(null); }}
          danger={confirm.action === "delete" || confirm.action === "suspended"}
        />
      )}
    </div>
  );
}
