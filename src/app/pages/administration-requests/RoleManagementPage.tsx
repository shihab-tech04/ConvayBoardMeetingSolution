import { useState, useMemo } from "react";
import { ExpandableText } from "../../components/shared/SafeText";
import { Plus, Copy, Pencil, Trash2, Lock, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "../../components/buttons/Button";
import { handleExportDisabled } from "../../utils/exportDisabled";
import { type SystemRole } from "../../data/mockData";
import { usePermissionRegistry } from "../../hooks/usePermissionRegistry";
import { useRoleRegistry } from "../../hooks/useRoleRegistry";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import { StatusBadge } from "../../components/badges/StatusBadge";
import { CollapsibleKpiSection } from "../../components/cards/CollapsibleKpiSection";
import { CreateEditRoleModal } from "../../components/roles/CreateEditRoleModal";
import { ResponsiveOverlay } from "../../components/shared/ResponsiveOverlay";
import { UnifiedDataTable } from "../../components/tables";
import { ROW_VIEW } from "../../data/modulePageConfigs";
import { fc, BADGE } from "../modulePageUtils";
import type { ColDef, FilterDef, KpiDef, TableRow } from "../modulePageUtils";

const PER_PAGE = 10;

const ROLE_COLS: ColDef[] = [
  fc("name",             "Role Name",   { headerKey: "headers.role" }),
  fc("level",            "Level",       { headerKey: "headers.level" }),
  fc("description",      "Description", { headerKey: "headers.description" }),
  fc("users_count",      "Users",       { headerKey: "headers.permissions" }),
  fc("permissions_count","Permissions", { headerKey: "headers.permissions" }),
  BADGE("status",        "Status"),
];

const ROLE_MOBILE_MAPPING = {
  primary:    "name",
  identifier: "level",
  meta:       ["description", "users_count", "permissions_count"],
  status:     "status",
};

const LEVEL_OPTIONS = ["All", "Super Admin", "Admin", "Manager", "Officer", "Viewer"];
const PERM_COUNT_OPTIONS = ["All", "0", "1–10", "11–25", "26+"];
const USER_COUNT_OPTIONS  = ["All", "0", "1–5",  "6–20",  "21+"];

function matchPermCount(count: number, option: string): boolean {
  if (option === "All" || !option) return true;
  if (option === "0")    return count === 0;
  if (option === "1–10") return count >= 1  && count <= 10;
  if (option === "11–25")return count >= 11 && count <= 25;
  if (option === "26+")  return count >= 26;
  return true;
}

function matchUserCount(count: number, option: string): boolean {
  if (option === "All" || !option) return true;
  if (option === "0")    return count === 0;
  if (option === "1–5")  return count >= 1  && count <= 5;
  if (option === "6–20") return count >= 6  && count <= 20;
  if (option === "21+")  return count >= 21;
  return true;
}

export function RoleManagementPage() {
  const { permissionGroups, allPermissionIds } = usePermissionRegistry();
  const { roles, addRole, updateRole, deleteRole, duplicateRole } = useRoleRegistry();

  const [selectedRoleId,    setSelectedRoleId]    = useState<string | null>(null);
  const [roleSearch,        setRoleSearch]         = useState("");
  const [confirmDeleteRole, setConfirmDeleteRole]  = useState<string | null>(null);
  const [createRoleOpen,    setCreateRoleOpen]     = useState(false);
  const [editRoleId,        setEditRoleId]         = useState<string | null>(null);
  const [detailsOpen,       setDetailsOpen]        = useState(false);
  const [kpiOpen,           setKpiOpen]            = useState(true);
  const [page,              setPage]               = useState(1);
  const [fVals,             setFVals]              = useState<Record<string, string>>({});
  const [applied,           setApplied]            = useState<Record<string, string>>({});

  const selectedRole = selectedRoleId ? (roles.find((r) => r.id === selectedRoleId) ?? null) : null;

  // ── Filters ─────────────────────────────────────────────────────────────
  const filters: FilterDef[] = [
    { key: "level",      label: "Level",            type: "select", options: LEVEL_OPTIONS },
    { key: "status",     label: "Status",           type: "select", options: ["All", "Active", "Inactive"] },
    { key: "permCount",  label: "Permission Count", type: "select", options: PERM_COUNT_OPTIONS },
    { key: "userCount",  label: "User Count",       type: "select", options: USER_COUNT_OPTIONS },
  ];

  const applyFilters = () => { setApplied(fVals); setPage(1); };
  const clearFilters = () => { setFVals({}); setApplied({}); setPage(1); };

  // ── Search + filter ───────────────────────────────────────────────────────
  const q = roleSearch.toLowerCase();
  const filteredRoles = useMemo(() => roles.filter((r) => {
    const matchSearch = q === "" ||
      r.name.toLowerCase().includes(q) ||
      (r.description ?? "").toLowerCase().includes(q) ||
      r.level.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q);

    const matchLevel  = !applied.level     || applied.level     === "All" || r.level     === applied.level;
    const matchStatus = !applied.status    || applied.status    === "All" || r.status    === applied.status;
    const matchPerms  = matchPermCount(r.permissions.length, applied.permCount ?? "");
    const matchUsers  = matchUserCount(r.usersCount,         applied.userCount ?? "");

    return matchSearch && matchLevel && matchStatus && matchPerms && matchUsers;
  }), [roles, q, applied]);

  const pageRoles = useMemo(
    () => filteredRoles.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [filteredRoles, page]
  );

  // ── Table rows ───────────────────────────────────────────────────────────
  const tableRows: TableRow[] = useMemo(() =>
    pageRoles.map((r) => ({
      id:                r.id,
      name:              r.name,
      level:             r.level,
      description:       r.description || "—",
      users_count:       String(r.usersCount),
      permissions_count: String(r.permissions.length),
      status:            r.status,
    })),
    [pageRoles]
  );

  // ── KPI cards ─────────────────────────────────────────────────────────────
  const kpis = useMemo<KpiDef[]>(() => {
    const active   = roles.filter((r) => r.status === "Active").length;
    const inactive = roles.filter((r) => r.status === "Inactive").length;
    const avgPerms = roles.length > 0 ? Math.round(roles.reduce((s, r) => s + r.permissions.length, 0) / roles.length) : 0;
    return [
      { label: "Total Roles",    value: String(roles.length), tone: "primary" },
      { label: "Active Roles",   value: String(active),       tone: "success" },
      { label: "Inactive Roles", value: String(inactive),     tone: "warning" },
      { label: "Avg. Permissions",      value: String(avgPerms),     tone: "neutral" },
    ];
  }, [roles]);

  // ── Actions ───────────────────────────────────────────────────────────────
  const handleSaveRole = (saved: SystemRole) => {
    const exists = roles.some((r) => r.id === saved.id);
    if (exists) updateRole(saved); else addRole(saved);
    setSelectedRoleId(saved.id);
  };

  const handleDuplicate = (role: SystemRole) => {
    const cloned = duplicateRole(role);
    setSelectedRoleId(cloned.id);
  };

  const handleRowClick = (row: TableRow) => {
    const rid = String(row.id);
    setSelectedRoleId(rid);
    setDetailsOpen(true);
  };

  const handleDelete = (roleId: string) => {
    deleteRole(roleId);
    if (selectedRoleId === roleId) { setSelectedRoleId(null); setDetailsOpen(false); }
    setConfirmDeleteRole(null);
  };

  // ── Drawer footer ─────────────────────────────────────────────────────────
  const detailsFooter = selectedRole ? (
    <div className="user-drawer-footer">
      <div className="user-drawer-footer__grid">
        <Button variant="secondary" size="md" leadingIcon={Pencil} onClick={() => { setEditRoleId(selectedRole.id); setDetailsOpen(false); }}>{"Edit"}</Button>
        <Button variant="secondary" size="md" leadingIcon={Copy} onClick={() => { handleDuplicate(selectedRole); setDetailsOpen(false); }}>{"Duplicate Role"}</Button>
      </div>
      <div className="user-drawer-footer__divider" />
      <Button variant="destructive" size="md" fullWidth leadingIcon={Trash2} onClick={() => { setConfirmDeleteRole(selectedRole.id); setDetailsOpen(false); }}>{"Delete"}</Button>
    </div>
  ) : undefined;

  return (
    <div className="table-page">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="table-page__header">
        <div>
          <h1 className="table-page__title">{"Role Management"}</h1>
          <p className="table-page__desc">{"Create roles and assign permissions by module."}</p>
        </div>
        <div className="table-page__actions">
          <button
            type="button"
            onClick={() => setKpiOpen((o) => !o)}
            className="table-page__kpi-toggle"
            aria-expanded={kpiOpen}
          >
            {kpiOpen
              ? <><ChevronUp size={13} strokeWidth={2} aria-hidden="true" />{"Hide Summary"}</>
              : <><ChevronDown size={13} strokeWidth={2} aria-hidden="true" />{"Show Summary"}</>
            }
          </button>
          <Button variant="primary" size="lg" leadingIcon={Plus} onClick={() => setCreateRoleOpen(true)}>{"Create New Role"}</Button>
        </div>
      </div>

      {/* ── KPIs ───────────────────────────────────────────────── */}
      <CollapsibleKpiSection kpis={kpis} open={kpiOpen} />

      {/* ── Table ─────────────────────────────────────────────── */}
      <UnifiedDataTable
        title="All Roles"
        countLabel="roles"
        singularLabel="role"
        totalCount={filteredRoles.length}
        cols={ROLE_COLS}
        rows={tableRows}
        actions={ROW_VIEW}
        onViewRow={handleRowClick}
        search={roleSearch}
        searchPlaceholder="Search roles…"
        onSearchChange={(v) => { setRoleSearch(v); setPage(1); }}
        filterDefs={filters}
        filterValues={fVals}
        appliedFilters={applied}
        onFilterChange={(k, v) => setFVals((p) => ({ ...p, [k]: v }))}
        onApplyFilters={applyFilters}
        onResetFilters={clearFilters}
        onExport={() => handleExportDisabled("Download/export is currently disabled.")}
        page={page}
        perPage={PER_PAGE}
        onPageChange={setPage}
        mobileCardMapping={ROLE_MOBILE_MAPPING}
        aria-label="Role Management"
      />

      {/* ── Role details drawer ─────────────────────────────────── */}
      {selectedRole && (
        <ResponsiveOverlay
          open={detailsOpen}
          onClose={() => { setDetailsOpen(false); setSelectedRoleId(null); }}
          title={"Role Details"}
          footer={detailsFooter}
          closeLabel={"Close drawer"}
        >
          <div className="role-details-drawer">
            {/* Role name shown inside body, not as broken drawer title */}
            <div className="role-details-drawer__name-row">
              <ExpandableText value={selectedRole.name} collapsedLines={2} maxChars={120} as="p" className="role-details-drawer__name" />
            </div>
            <div className="role-details-drawer__meta">
              <StatusBadge value={selectedRole.status} />
              <span className="role-details-drawer__meta-item">
                <strong>{selectedRole.usersCount}</strong> {"users"}
              </span>
              <span className="role-details-drawer__meta-item">
                <strong className="text-[var(--color-primary)]">{selectedRole.permissions.length}</strong> / {allPermissionIds.length} {"perms"}
              </span>
              <span className="role-details-drawer__meta-item role-details-drawer__meta-item--muted">{selectedRole.level}</span>
            </div>

            {selectedRole.description && (
              <div className="role-details-drawer__desc">
                <ExpandableText value={selectedRole.description} collapsedLines={4} maxChars={180} />
              </div>
            )}

            <div className="role-details-drawer__section-header">
              <Lock size={13} strokeWidth={2} className="text-[var(--color-primary)]" />
              <span className="role-details-drawer__section-title">{"Permissions by Module"}</span>
            </div>

            <div className="permission-section__modules">
              {permissionGroups.map((g) => {
                const total   = g.permissions.length;
                const granted = g.permissions.filter((p) => selectedRole.permissions.includes(p.id)).length;
                const pct     = total > 0 ? Math.round((granted / total) * 100) : 0;
                return (
                  <div key={g.id} className="permission-module-card">
                    <div className="permission-module-card__header">
                      <span className="permission-module-card__title" title={g.label}>{g.label}</span>
                      <span className={`permission-module-card__count ${granted === total ? "permission-module-card__count--full" : granted > 0 ? "permission-module-card__count--partial" : "permission-module-card__count--none"}`}>
                        {granted}/{total}
                      </span>
                    </div>
                    <div className="permission-progress">
                      <div
                        className={`permission-progress__bar ${granted === total ? "permission-progress__bar--success" : "permission-progress__bar--primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="permission-module-card__chips">
                      {g.permissions.map((p) => {
                        const has = selectedRole.permissions.includes(p.id);
                        return (
                          <span key={p.id} title={p.label} className={`permission-chip ${has ? "permission-chip--granted" : "permission-chip--none"}`}>
                            {p.label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ResponsiveOverlay>
      )}

      {/* ── Modals ─────────────────────────────────────────────── */}
      {confirmDeleteRole && (
        <SConfirmModal
          title={"Delete Role"}
          message={`Delete Role "${roles.find((r) => r.id === confirmDeleteRole)?.name}"? users are currently assigned this role. They will lose access to associated permissions.`}
          confirmLabel={"Delete Role"}
          onConfirm={() => handleDelete(confirmDeleteRole)}
          onClose={() => setConfirmDeleteRole(null)}
          danger
        />
      )}
      <CreateEditRoleModal
        open={createRoleOpen || editRoleId !== null}
        roleId={editRoleId}
        roles={roles}
        onClose={() => { setCreateRoleOpen(false); setEditRoleId(null); }}
        onSave={handleSaveRole}
      />

    </div>
  );
}
