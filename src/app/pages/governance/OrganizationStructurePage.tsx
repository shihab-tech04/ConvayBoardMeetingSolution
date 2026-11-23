import { useState, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { persistOrgUnitChange, verifyOrgUnitSqlReadback, type OrgSaveResult } from "./orgUnitPersistence";
import { validateOrgUnitFormStep, firstInvalidOrgUnitStep, type UnitFormValues } from "./orgUnitFormValidation";
import { createPortal } from "react-dom";
import {
  Building2, ChevronRight, ChevronDown, Plus, Pencil, Eye,
  Users, Search, X, MoreHorizontal, List, FolderTree,
  UserCheck, GitBranch, CheckCircle,
  ChevronLeft, Phone, Mail, MapPin, History, Filter,
  ChevronsDownUp, ChevronsUpDown, Network, Crown, ArrowRight, XCircle,
  Lock,
} from "lucide-react";

import type { OrgUnit } from "../../data/boardMeetingData";
import { useOrgUnitRegistry, useAuditEventRegistry, generateId } from "../../data/boardMeetingData";
import { useBmsUserRegistry } from "../../data/bmsUsers";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  findChildren, findDescendants, findParent, buildPathLabel, buildPathIds,
  getValidParents, validateParentType, detectCycle,
  resolveUnitUsers, recalculateChildCount, recalculateMemberCount,
  isUnitAssignable, PHASE1_UNIT_TYPES, VALID_PARENT_TYPES,
} from "../../utils/orgHierarchy";
import { useOrgPermissions } from "../../utils/orgPermissions";
import { AppTextField } from "../../components/forms/AppTextField";
import { AppSelectField } from "../../components/forms/AppSelectField";
import { AppTextArea } from "../../components/forms/AppTextArea";
import { AppModal } from "../../components/modals/AppModal";
import { PrimaryButton } from "../../components/buttons/PrimaryButton";
import { SecondaryButton } from "../../components/buttons/SecondaryButton";
import { StatCard } from "../../components/cards/StatCard";
import { AssignUserModal }    from "./modals/AssignUserModal";
import { ManageHeadModal }    from "./modals/ManageHeadModal";
import { TransferUserModal }  from "./modals/TransferUserModal";
import { MoveUnitModal }      from "./modals/MoveUnitModal";
import { DeactivateUnitModal } from "./modals/DeactivateUnitModal";

// ── Constants ──────────────────────────────────────────────────────────────────

const PHASE1_TYPES = [...PHASE1_UNIT_TYPES];

const STATUS_OPTIONS = ["Draft", "Active", "Inactive", "Scheduled for Closure", "Deactivated", "Archived"];

const STATUS_COLOR: Record<string, string> = {
  Active:                  "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  Draft:                   "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
  Inactive:                "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  "Scheduled for Closure": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  Deactivated:             "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  Archived:                "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

const TYPE_COLOR: Record<string, string> = {
  Organization:  "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
  "Head Office": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  Branch:        "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
  Division:      "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  Department:    "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
};

// ── Inline badge components ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[status] ?? "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLOR[type] ?? "bg-slate-100 text-slate-600"}`}>
      {type}
    </span>
  );
}

// ── Tree View ──────────────────────────────────────────────────────────────────

interface TreeNodeProps {
  unit: OrgUnit;
  allUnits: OrgUnit[];
  users: import("../../data/bmsUsers").BmsUser[];
  depth: number;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (unit: OrgUnit) => void;
  onAddChild: (parentId: string) => void;
  onEdit: (unit: OrgUnit) => void;
  onActivate: (unit: OrgUnit) => void;
  onDeactivate: (unit: OrgUnit) => void;
  onAssignUser?: (unit: OrgUnit) => void;
  onManageHead?: (unit: OrgUnit) => void;
  onMove?: (unit: OrgUnit) => void;
}

function OrgTreeNode({
  unit, allUnits, users, depth, expanded,
  onToggle, onSelect, onAddChild, onEdit, onActivate, onDeactivate,
  onAssignUser, onManageHead, onMove,
}: TreeNodeProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const children = useMemo(() => findChildren(unit.id, allUnits), [unit.id, allUnits]);
  const memberCount = useMemo(() => recalculateMemberCount(unit.id, users), [unit.id, users]);
  const isExpanded = expanded.has(unit.id);
  const hasChildren = children.length > 0;
  const headUser = users.find(u => u.id === unit.head_user_id);
  const isActive = unit.status === "Active";

  return (
    <>
      {/* Tree node row */}
      <div
        className="group flex items-center gap-2 py-2 px-3 hover:bg-muted/50 rounded-lg transition-colors cursor-pointer"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={() => onSelect(unit)}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={e => { e.stopPropagation(); if (hasChildren) onToggle(unit.id); }}
          className={`flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors ${!hasChildren ? "opacity-0 pointer-events-none" : ""}`}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        {/* Unit icon */}
        <Building2 size={15} className="flex-shrink-0 text-muted-foreground" />

        {/* Name + code */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground truncate">{unit.unit_name}</span>
            {unit.code && (
              <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{unit.code}</span>
            )}
          </div>
        </div>

        {/* Badges — hidden on mobile to save space */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <TypeBadge type={unit.unit_type} />
          <StatusBadge status={unit.status} />
        </div>

        {/* Head user */}
        <div className="hidden lg:flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0 w-36">
          <UserCheck size={12} className="flex-shrink-0" />
          <span className="truncate">
            {headUser ? (headUser.display_name ?? headUser.name) : (unit.head || "—")}
          </span>
        </div>

        {/* Counts */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
          <span className="flex items-center gap-1" title="Child units">
            <GitBranch size={12} /> {children.length}
          </span>
          <span className="flex items-center gap-1" title="Assigned users">
            <Users size={12} /> {memberCount}
          </span>
        </div>

        {/* Actions */}
        <div
          className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => onAddChild(unit.id)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Add child unit"
          >
            <Plus size={13} />
          </button>
          <button
            onClick={() => onEdit(unit)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            title="Edit unit"
          >
            <Pencil size={13} />
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
              title="More actions"
            >
              <MoreHorizontal size={13} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 bg-background border border-border rounded-lg shadow-lg py-1 w-52" onMouseLeave={() => setMenuOpen(false)}>
                <button onClick={() => { setMenuOpen(false); onSelect(unit); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground">View Details</button>
                {onAssignUser && <button onClick={() => { setMenuOpen(false); onAssignUser(unit); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2"><UserCheck size={13} /> Assign User</button>}
                {onManageHead && <button onClick={() => { setMenuOpen(false); onManageHead(unit); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2"><Crown size={13} /> Manage Head</button>}
                {onMove && <button onClick={() => { setMenuOpen(false); onMove(unit); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2"><ArrowRight size={13} /> Move Unit</button>}
                <div className="my-1 border-t border-border" />
                {isActive
                  ? <button onClick={() => { setMenuOpen(false); onDeactivate(unit); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-amber-600 flex items-center gap-2"><XCircle size={13} /> Deactivate</button>
                  : <button onClick={() => { setMenuOpen(false); onActivate(unit); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-emerald-600">Activate</button>
                }
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Children */}
      {isExpanded && children.map(child => (
        <OrgTreeNode
          key={child.id}
          unit={child}
          allUnits={allUnits}
          users={users}
          depth={depth + 1}
          expanded={expanded}
          onToggle={onToggle}
          onSelect={onSelect}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
          onAssignUser={onAssignUser}
          onManageHead={onManageHead}
          onMove={onMove}
        />
      ))}
    </>
  );
}

// ── Unit Detail Drawer ────────────────────────────────────────────────────────

type DrawerTab = "overview" | "hierarchy" | "users" | "history";

function UnitDetailDrawer({
  unit,
  allUnits,
  users,
  auditItems,
  onClose,
  onEdit,
  onAddChild,
  onActivate,
  onDeactivate,
  onAssignUser,
  onManageHead,
  onTransferUser,
  onMove,
}: {
  unit: OrgUnit;
  allUnits: OrgUnit[];
  users: import("../../data/bmsUsers").BmsUser[];
  auditItems: import("../../data/boardMeetingData").AuditEvent[];
  onClose: () => void;
  onEdit: (u: OrgUnit) => void;
  onAddChild: (parentId: string) => void;
  onActivate: (u: OrgUnit) => void;
  onDeactivate: (u: OrgUnit) => void;
  onAssignUser?: (u: OrgUnit) => void;
  onManageHead?: (u: OrgUnit) => void;
  onTransferUser?: (u: OrgUnit) => void;
  onMove?: (u: OrgUnit) => void;
}) {
  const [tab, setTab] = useState<DrawerTab>("overview");

  const children = useMemo(() => findChildren(unit.id, allUnits), [unit.id, allUnits]);
  const parent = useMemo(() => findParent(unit, allUnits), [unit, allUnits]);
  const siblings = useMemo(() => {
    if (!unit.parent_unit_id) return [];
    return allUnits.filter(u => u.parent_unit_id === unit.parent_unit_id && u.id !== unit.id);
  }, [unit, allUnits]);
  const pathLabel = useMemo(() => buildPathLabel(unit.id, allUnits), [unit.id, allUnits]);
  const assignedUsers = useMemo(() => resolveUnitUsers(unit.id, users), [unit.id, users]);
  const headUser = users.find(u => u.id === unit.head_user_id);
  const deputyUser = users.find(u => u.id === unit.deputy_user_id);
  const unitAudit = useMemo(
    () => auditItems.filter(a => a.entity_id === unit.id || a.entity_id === unit.unit_id).sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [auditItems, unit],
  );

  const isActive = unit.status === "Active";

  const TABS: { id: DrawerTab; label: string; icon: typeof Eye }[] = [
    { id: "overview",  label: "Overview",  icon: Eye },
    { id: "hierarchy", label: "Hierarchy", icon: GitBranch },
    { id: "users",     label: "Users",     icon: Users },
    { id: "history",   label: "History",   icon: History },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[60]">
      {/* Full-screen backdrop — covers sidebar (z-50) and main content */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel — pinned to right edge, above the backdrop */}
      <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-background border-l border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Building2 size={20} className="text-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{unit.unit_name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {unit.code && <span className="text-xs font-mono text-muted-foreground">{unit.code}</span>}
                <TypeBadge type={unit.unit_type} />
                <StatusBadge status={unit.status} />
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground flex-shrink-0 ml-2">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-4 flex-shrink-0 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "overview" && (
            <div className="space-y-5">
              {unit.description && (
                <p className="text-sm text-muted-foreground">{unit.description}</p>
              )}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <InfoRow label="Unit ID" value={unit.unit_id} />
                <InfoRow label="Effective From" value={unit.effective_start_at ? unit.effective_start_at.slice(0, 10) : "—"} />
                <InfoRow label="Created" value={unit.created_at.slice(0, 10)} />
                {unit.effective_end_at && <InfoRow label="Closes" value={unit.effective_end_at.slice(0, 10)} />}
                {unit.updated_at && <InfoRow label="Last Updated" value={unit.updated_at.slice(0, 10)} />}
              </div>
              {(unit.phone || unit.email || unit.address) && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Contact</p>
                  {unit.phone && <div className="flex items-center gap-2 text-sm"><Phone size={14} className="text-muted-foreground" />{unit.phone}</div>}
                  {unit.email && <div className="flex items-center gap-2 text-sm"><Mail size={14} className="text-muted-foreground" />{unit.email}</div>}
                  {unit.address && <div className="flex items-center gap-2 text-sm"><MapPin size={14} className="text-muted-foreground" />{unit.address}</div>}
                </div>
              )}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Leadership</p>
                <InfoRow label="Unit Head" value={headUser ? (headUser.display_name ?? headUser.name) : (unit.head || "—")} />
                {deputyUser && <InfoRow label="Deputy Head" value={deputyUser.display_name ?? deputyUser.name} />}
              </div>
            </div>
          )}

          {tab === "hierarchy" && (
            <div className="space-y-5">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Full Path</p>
                <p className="text-sm text-foreground bg-muted/40 rounded-lg p-3">{pathLabel || unit.unit_name}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Parent Unit</p>
                {parent ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 text-sm">
                    <Building2 size={14} className="text-muted-foreground" />
                    <span className="font-medium">{parent.unit_name}</span>
                    <TypeBadge type={parent.unit_type} />
                  </div>
                ) : <p className="text-sm text-muted-foreground">Root unit (no parent)</p>}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Child Units ({children.length})
                </p>
                {children.length > 0 ? (
                  <div className="space-y-1">
                    {children.map(c => (
                      <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 text-sm">
                        <Building2 size={13} className="text-muted-foreground" />
                        <span className="flex-1">{c.unit_name}</span>
                        <TypeBadge type={c.unit_type} />
                        <StatusBadge status={c.status} />
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">No child units</p>}
              </div>
              {siblings.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Sibling Units ({siblings.length})
                  </p>
                  <div className="space-y-1">
                    {siblings.map(s => (
                      <div key={s.id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground">
                        <Building2 size={13} className="text-muted-foreground" />
                        <span className="flex-1">{s.unit_name}</span>
                        <TypeBadge type={s.unit_type} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "users" && (
            <div className="space-y-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Assigned Users ({assignedUsers.length})
              </p>
              {assignedUsers.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No users assigned to this unit</div>
              ) : (
                <div className="space-y-2">
                  {assignedUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 text-sm">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                        {(u.display_name ?? u.name).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{u.display_name ?? u.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                      <StatusBadge status={u.account_status ?? "inactive"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === "history" && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Audit History</p>
              {unitAudit.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">No audit events for this unit</div>
              ) : (
                <div className="space-y-2">
                  {unitAudit.map(a => (
                    <div key={a.id} className="p-3 rounded-lg border border-border text-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-foreground capitalize">{a.action.replace(/_/g, " ")}</span>
                        <span className="text-xs text-muted-foreground">{a.timestamp.slice(0, 10)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{a.details}</p>
                      {a.actor && <p className="text-xs text-muted-foreground mt-1">by {a.actor}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <FooterActions
          unit={unit}
          isActive={isActive}
          onEdit={onEdit}
          onAddChild={onAddChild}
          onAssignUser={onAssignUser}
          onManageHead={onManageHead}
          onMove={onMove}
          onActivate={onActivate}
          onDeactivate={onDeactivate}
          onClose={onClose}
        />
      </div>
    </div>,
    document.body,
  );
}

// ── Info Row helper ───────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground mt-0.5">{value || "—"}</p>
    </div>
  );
}

// ── Drawer footer action bar ──────────────────────────────────────────────────

function FooterActions({
  unit, isActive,
  onEdit, onAddChild, onAssignUser, onManageHead, onMove,
  onActivate, onDeactivate, onClose,
}: {
  unit: OrgUnit;
  isActive: boolean;
  onEdit: (u: OrgUnit) => void;
  onAddChild: (id: string) => void;
  onAssignUser?: (u: OrgUnit) => void;
  onManageHead?: (u: OrgUnit) => void;
  onMove?: (u: OrgUnit) => void;
  onActivate: (u: OrgUnit) => void;
  onDeactivate: (u: OrgUnit) => void;
  onClose: () => void;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const hasSecondary = onAssignUser || onManageHead || onMove;

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-border flex-shrink-0 flex-wrap">
      {/* Primary actions */}
      <button
        onClick={() => onEdit(unit)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
      >
        <Pencil size={13} /> Edit
      </button>
      <button
        onClick={() => onAddChild(unit.id)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
      >
        <Plus size={13} /> Add Child
      </button>

      {/* Secondary actions — collapsed into a "More" dropdown */}
      {hasSecondary && (
        <div className="relative">
          <button
            onClick={() => setMoreOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors"
          >
            <MoreHorizontal size={13} /> More
          </button>
          {moreOpen && (
            <div
              className="absolute bottom-full mb-1 left-0 z-[10] bg-background border border-border rounded-lg shadow-lg py-1 w-44"
              onMouseLeave={() => setMoreOpen(false)}
            >
              {onAssignUser && (
                <button onClick={() => { setMoreOpen(false); onAssignUser(unit); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2">
                  <UserCheck size={13} /> Assign User
                </button>
              )}
              {onManageHead && (
                <button onClick={() => { setMoreOpen(false); onManageHead(unit); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2">
                  <Crown size={13} /> Manage Head
                </button>
              )}
              {onMove && (
                <button onClick={() => { setMoreOpen(false); onMove(unit); }} className="w-full text-left px-3 py-2 text-sm hover:bg-muted text-foreground flex items-center gap-2">
                  <ArrowRight size={13} /> Move Unit
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Deactivate / Activate — pushed to the right */}
      <div className="ml-auto">
        {isActive
          ? (
            <button
              onClick={() => { onDeactivate(unit); onClose(); }}
              className="px-3 py-1.5 text-sm font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <XCircle size={13} /> Deactivate
            </button>
          ) : (
            <button
              onClick={() => { onActivate(unit); onClose(); }}
              className="px-3 py-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <CheckCircle size={13} /> Activate
            </button>
          )
        }
      </div>
    </div>
  );
}

// ── Unit Form Modal (multi-step create / edit) ─────────────────────────────────

const FORM_STEPS = ["Unit Type", "Basic Info", "Parent & Path", "Leadership", "Review"];

function UnitFormModal({
  editUnit,
  defaultParentId,
  allUnits,
  users,
  onConfirm,
  onClose,
}: {
  editUnit?: OrgUnit;
  defaultParentId?: string;
  allUnits: OrgUnit[];
  users: import("../../data/bmsUsers").BmsUser[];
  onConfirm: (values: UnitFormValues) => Promise<boolean>;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [vals, setVals] = useState<UnitFormValues>({
    unit_type:          editUnit?.unit_type ?? "",
    unit_name:          editUnit?.unit_name ?? "",
    code:               editUnit?.code ?? "",
    description:        editUnit?.description ?? "",
    phone:              editUnit?.phone ?? "",
    email:              editUnit?.email ?? "",
    address:            editUnit?.address ?? "",
    parent_unit_id:     editUnit?.parent_unit_id ?? defaultParentId ?? "",
    effective_start_at: editUnit?.effective_start_at ?? "",
    head_user_id:       editUnit?.head_user_id ?? "",
    deputy_user_id:     editUnit?.deputy_user_id ?? "",
    status:             (editUnit?.status === "Active" ? "Active" : "Draft") as "Draft" | "Active",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  const originalValues = useRef(vals);

  const set = useCallback(<K extends keyof UnitFormValues>(k: K, v: UnitFormValues[K]) => {
    setVals(prev => ({ ...prev, [k]: v }));
    setErrors(prev => { const n = { ...prev }; delete n[k]; return n; });
  }, []);

  // Derive valid parents whenever unit_type changes
  const parentOptions = useMemo(() => {
    if (!vals.unit_type) return [];
    const validParentTypes = VALID_PARENT_TYPES[vals.unit_type] ?? [];
    if (validParentTypes.length === 0) return [];
    const excludeId = editUnit?.id ?? "";
    return allUnits.filter(u =>
      validParentTypes.includes(u.unit_type) &&
      (u.status === "Active" || u.status === "Draft") &&
      u.id !== excludeId &&
      !detectCycle(excludeId, u.id, allUnits),
    );
  }, [vals.unit_type, allUnits, editUnit?.id]);

  const selectedParent = allUnits.find(u => u.id === vals.parent_unit_id);
  const futurePath = useMemo(() => {
    if (!vals.parent_unit_id) return vals.unit_name || "New Unit";
    const parentPath = buildPathLabel(vals.parent_unit_id, allUnits);
    return `${parentPath} › ${vals.unit_name || "New Unit"}`;
  }, [vals.parent_unit_id, vals.unit_name, allUnits]);

  const activeUsers = users.filter(u => u.account_status === "active");

  function validateStep(s: number): boolean {
    const found = validateOrgUnitFormStep(s, vals, allUnits, users, editUnit);
    setErrors(found);
    return Object.keys(found).length === 0;
  }
  function nextStep() { if (step < FORM_STEPS.length - 1 && validateStep(step)) setStep(s => s + 1); }
  function prevStep() { setErrors({}); setStep(s => Math.max(0, s - 1)); }
  async function handleSubmit(saveStatus: "Draft" | "Active") {
    if (saveInFlight.current) return;
    const invalid = firstInvalidOrgUnitStep(vals, allUnits, users, editUnit, saveStatus);
    if (invalid) { setStep(invalid.step); setErrors(invalid.errors); return; }
    saveInFlight.current = true;
    setSaving(true);
    setErrors(prev => { const next = { ...prev }; delete next.save; return next; });
    try {
      const saved = await onConfirm({
        ...vals, unit_name: vals.unit_name.trim(), code: vals.code.trim().toUpperCase(),
        phone: vals.phone.trim(), email: vals.email.trim(), address: vals.address.trim(),
        status: saveStatus,
      });
      if (!saved) setErrors(prev => ({ ...prev, save: "The organization record was not saved. Review access or reload and retry." }));
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        save: error instanceof Error ? error.message : "Unable to save this organization record.",
      }));
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  const isEdit = !!editUnit;
  const isDirty = JSON.stringify(vals) !== JSON.stringify(originalValues.current);
  const requestClose = () => {
    if (saveInFlight.current) return;
    if (isDirty && !window.confirm("Discard your unsaved unit changes?")) return;
    onClose();
  };
  return (
    <AppModal
      open
      title={isEdit ? "Edit Unit" : "Create Unit"}
      subtitle="Set up the organizational hierarchy and review the unit before saving."
      onClose={requestClose}
      fullPage
      icon={<Building2 size={18} />}
      steps={FORM_STEPS}
      currentStep={step}
      onStepClick={target => { if (target < step && !saving) { setStep(target); setErrors({}); } }}
      footer={
        <>
          <SecondaryButton type="button" disabled={saving}
            style={{ marginRight: "auto" }}
            onClick={step === 0 ? requestClose : prevStep}>
            {step === 0 ? "Cancel" : "Back"}
          </SecondaryButton>
          {step < FORM_STEPS.length - 1 ? (
            <PrimaryButton type="button" disabled={saving} onClick={nextStep}>Continue</PrimaryButton>
          ) : (
            <>
              <SecondaryButton type="button" disabled={saving} onClick={() => { void handleSubmit("Draft"); }}>
                Save as Draft
              </SecondaryButton>
              <PrimaryButton type="button" disabled={saving} onClick={() => { void handleSubmit("Active"); }}>
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Save & Activate"}
              </PrimaryButton>
            </>
          )}
        </>
      }
    >
      <div className="wiz-form-body">
          {/* Step 0: Unit Type */}
          {step === 0 && (
            <section className="form-section" aria-label="Unit Type">
              <div className="form-section__header">
                <span className="form-section__icon" aria-hidden="true"><Building2 size={16} /></span>
                <div>
                  <div className="form-section__title">Unit Type</div>
                  <p className="text-xs text-muted-foreground">Choose where the unit belongs in the organization hierarchy.</p>
                </div>
              </div>
              <div className="form-section__body--stack">
              <p className="text-sm text-muted-foreground">Select the type of organisational unit you are creating.</p>
              <div className="grid grid-cols-1 gap-2">
                {PHASE1_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => {
                      set("unit_type", type);
                      const preferredId = vals.parent_unit_id || defaultParentId || "";
                      const preferred = allUnits.find(u => u.id === preferredId);
                      set("parent_unit_id", preferred && validateParentType(type, preferred.unit_type) ? preferredId : "");
                    }}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors text-left ${
                      vals.unit_type === type
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border hover:border-border/80 hover:bg-muted/40 text-foreground"
                    }`}
                  >
                    <Building2 size={16} className={vals.unit_type === type ? "text-primary" : "text-muted-foreground"} />
                    <div>
                      <p className="text-sm font-medium">{type}</p>
                      <p className="text-xs text-muted-foreground">
                        {VALID_PARENT_TYPES[type]?.length ? `Belongs under: ${VALID_PARENT_TYPES[type].join(", ")}` : "Root level (no parent required)"}
                      </p>
                    </div>
                    {vals.unit_type === type && <CheckCircle size={16} className="text-primary ml-auto" />}
                  </button>
                ))}
              </div>
              {errors.unit_type && <p className="text-xs text-destructive">{errors.unit_type}</p>}
              </div>
            </section>
          )}

          {/* Step 1: Basic Info */}
          {step === 1 && (
            <section className="form-section" aria-label="Basic Information">
              <div className="form-section__header">
                <span className="form-section__icon" aria-hidden="true"><Building2 size={16} /></span>
                <div>
                  <div className="form-section__title">Basic Information</div>
                  <p className="text-xs text-muted-foreground">Identity and contact details for this organizational unit.</p>
                </div>
              </div>
              <div className="form-section__body--grid">
              <AppTextField
                id="unit_name" label="Unit Name" required
                value={vals.unit_name} onChange={v => set("unit_name", v)}
                placeholder="e.g. Finance Division"
                error={errors.unit_name}
              />
              <AppTextField
                id="code" label="Short Code"
                value={vals.code} onChange={v => set("code", v.toUpperCase())}
                placeholder="e.g. FIN"
                error={errors.code}
              />
              <div className="field-group--full"><AppTextArea
                id="desc" label="Description"
                value={vals.description} onChange={v => set("description", v)}
                rows={3} placeholder="Optional description of this unit's purpose and responsibilities"
              /></div>
              <AppTextField id="phone" label="Phone" value={vals.phone} onChange={v => set("phone", v)}
                  error={errors.phone} placeholder="+880 2..." />
                <AppTextField id="email" label="Email" value={vals.email} onChange={v => set("email", v)}
                  error={errors.email} placeholder="unit@example.com" />
              <div className="field-group--full"><AppTextField id="address" label="Address" value={vals.address} onChange={v => set("address", v)} placeholder="Street address" /></div>
              </div>
            </section>
          )}

          {/* Step 2: Parent & Path */}
          {step === 2 && (
            <section className="form-section" aria-label="Parent & Path">
              <div className="form-section__header">
                <span className="form-section__icon" aria-hidden="true"><GitBranch size={16} /></span>
                <div>
                  <div className="form-section__title">Parent & Path</div>
                  <p className="text-xs text-muted-foreground">Confirm the parent and resulting hierarchy.</p>
                </div>
              </div>
              <div className="form-section__body--stack">
              {(VALID_PARENT_TYPES[vals.unit_type] ?? []).length === 0 ? (
                <div className="rounded-lg bg-muted/40 border border-border p-4 text-sm text-muted-foreground">
                  <strong>{vals.unit_type}</strong> is a root-level unit and does not require a parent.
                </div>
              ) : (
                <>
                  <AppSelectField
                    id="parent" label="Parent Unit" required
                    value={vals.parent_unit_id}
                    onChange={v => set("parent_unit_id", v)}
                    options={[
                      { value: "", label: "— Select Parent —" },
                      ...parentOptions.map(u => ({ value: u.id, label: `${u.unit_name}${u.code ? ` (${u.code})` : ""} — ${u.unit_type}` })),
                    ]}
                    error={errors.parent_unit_id}
                  />
                  {parentOptions.length === 0 && (
                    <p role="status" className="text-xs text-amber-700 dark:text-amber-300">
                      No eligible parent units yet. Create and activate the required parent first.
                    </p>
                  )}
                  {vals.parent_unit_id && (
                    <div className="rounded-lg bg-muted/40 border border-border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Full path after save</p>
                      <p className="text-sm font-medium text-foreground">{futurePath}</p>
                    </div>
                  )}
                </>
              )}
              <div>
                <label htmlFor="effective_start" className="block text-xs font-medium text-muted-foreground mb-1.5">Effective Date</label>
                <input
                  id="effective_start"
                  type="date"
                  value={vals.effective_start_at}
                  onChange={e => set("effective_start_at", e.target.value)}
                  aria-invalid={!!errors.effective_start_at}
                  aria-describedby={errors.effective_start_at ? "effective-start-error" : undefined}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {errors.effective_start_at && (
                  <p id="effective-start-error" role="alert" className="text-xs text-destructive mt-1">
                    {errors.effective_start_at}
                  </p>
                )}
              </div>
              </div>
            </section>
          )}

          {/* Step 3: Leadership */}
          {step === 3 && (
            <section className="form-section" aria-label="Leadership">
              <div className="form-section__header">
                <span className="form-section__icon" aria-hidden="true"><Users size={16} /></span>
                <div>
                  <div className="form-section__title">Leadership</div>
                  <p className="text-xs text-muted-foreground">Assign an active unit head and deputy, or leave them unassigned.</p>
                </div>
              </div>
              <div className="form-section__body--stack">
              <AppSelectField
                id="head" label="Unit Head"
                error={errors.head_user_id}
                value={vals.head_user_id}
                onChange={v => set("head_user_id", v)}
                options={[
                  { value: "", label: "— Assign Later —" },
                  ...activeUsers.map(u => ({ value: u.id, label: `${u.display_name ?? u.name} — ${u.employee_id ?? ""}` })),
                ]}
              />
              <AppSelectField
                id="deputy" label="Deputy Head"
                error={errors.deputy_user_id}
                value={vals.deputy_user_id}
                onChange={v => set("deputy_user_id", v)}
                options={[
                  { value: "", label: "— None —" },
                  ...activeUsers.filter(u => u.id !== vals.head_user_id).map(u => ({ value: u.id, label: `${u.display_name ?? u.name} — ${u.employee_id ?? ""}` })),
                ]}
              />
              <p className="text-xs text-muted-foreground">Leadership assignments can be updated at any time from the unit detail page.</p>
              </div>
            </section>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <section className="form-section" aria-label="Review Unit">
              <div className="form-section__header">
                <span className="form-section__icon" aria-hidden="true"><CheckCircle size={16} /></span>
                <div>
                  <div className="form-section__title">Review Unit</div>
                  <p className="text-xs text-muted-foreground">Check every field before saving or activating the unit.</p>
                </div>
              </div>
              <div className="form-section__body--stack">
              <p className="text-sm text-muted-foreground">Review the details before saving.</p>
              <div className="rounded-lg border border-border divide-y divide-border">
                {[
                  ["Unit Type",   vals.unit_type],
                  ["Unit Name",   vals.unit_name],
                  ["Code",        vals.code || "—"],
                  ["Parent",      selectedParent?.unit_name || (VALID_PARENT_TYPES[vals.unit_type]?.length === 0 ? "Root unit" : "—")],
                  ["Full Path",   futurePath],
                  ["Head User",   activeUsers.find(u => u.id === vals.head_user_id)?.name ?? "— Assign Later —"],
                  ["Deputy",      activeUsers.find(u => u.id === vals.deputy_user_id)?.name ?? "— None —"],
                  ["Description", vals.description || "—"],
                  ["Phone",       vals.phone || "—"],
                  ["Email",       vals.email || "—"],
                  ["Address",     vals.address || "—"],
                  ["Eff. Date",   vals.effective_start_at || "—"],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="text-muted-foreground">{l}</span>
                    <span className="font-medium text-foreground text-right max-w-xs truncate">{v}</span>
                  </div>
                ))}
              </div>
              </div>
            </section>
          )}

        {errors.save && <p role="alert" className="text-sm text-red-600">{errors.save}</p>}
      </div>
    </AppModal>
  );
}

// ── Filter panel ───────────────────────────────────────────────────────────────

interface Filters {
  type: string;
  status: string;
  parent: string;
  hasUsers: boolean | null;
  hasChildren: boolean | null;
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function OrganizationStructurePage() {
  const orgReg    = useOrgUnitRegistry();
  const bmsUsers  = useBmsUserRegistry();
  const auditReg  = useAuditEventRegistry();
  const currentUser = useCurrentUser();
  const perm      = useOrgPermissions();

  const [view, setView] = useState<"tree" | "list">("tree");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ type: "", status: "", parent: "", hasUsers: null, hasChildren: null });
  const [filterOpen, setFilterOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>();
    orgReg.items.forEach(u => { if (!u.parent_unit_id) s.add(u.id); });
    return s;
  });
  const [selectedUnit,     setSelectedUnit]     = useState<OrgUnit | null>(null);
  const [formOpen,         setFormOpen]         = useState(false);
  const [editingUnit,      setEditingUnit]       = useState<OrgUnit | undefined>(undefined);
  const [defaultParentId,  setDefaultParentId]  = useState<string | undefined>(undefined);

  // O3 modals
  const [assignUserTarget,    setAssignUserTarget]    = useState<OrgUnit | null>(null);
  const [manageHeadTarget,    setManageHeadTarget]    = useState<OrgUnit | null>(null);
  const [transferUserTarget,  setTransferUserTarget]  = useState<OrgUnit | null>(null);
  const [moveUnitTarget,      setMoveUnitTarget]      = useState<OrgUnit | null>(null);
  const [deactivateTarget,    setDeactivateTarget]    = useState<OrgUnit | null>(null);

  const units = orgReg.items;
  const users = bmsUsers.items;

  // ── Derived data ─────────────────────────────────────────────────────────────

  const activeFilterCount = [
    filters.type, filters.status, filters.parent,
    filters.hasUsers !== null ? "1" : "",
    filters.hasChildren !== null ? "1" : "",
  ].filter(Boolean).length + (search ? 1 : 0);

  const filteredUnits = useMemo(() => {
    let list = units;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u =>
        u.unit_name.toLowerCase().includes(q) ||
        (u.code ?? "").toLowerCase().includes(q) ||
        (u.parent_unit ?? "").toLowerCase().includes(q) ||
        (u.head ?? "").toLowerCase().includes(q) ||
        (u.address ?? "").toLowerCase().includes(q),
      );
    }
    if (filters.type)   list = list.filter(u => u.unit_type === filters.type);
    if (filters.status) list = list.filter(u => u.status === filters.status);
    if (filters.parent) list = list.filter(u => u.parent_unit_id === filters.parent);
    if (filters.hasUsers === true)  list = list.filter(u => recalculateMemberCount(u.id, users) > 0);
    if (filters.hasUsers === false) list = list.filter(u => recalculateMemberCount(u.id, users) === 0);
    if (filters.hasChildren === true)  list = list.filter(u => findChildren(u.id, units).length > 0);
    if (filters.hasChildren === false) list = list.filter(u => findChildren(u.id, units).length === 0);
    return list;
  }, [units, users, search, filters]);

  // Tree roots: units with no parent, or whose parent is not in the filtered set
  const treeRoots = useMemo(() => {
    const filteredIds = new Set(filteredUnits.map(u => u.id));
    return filteredUnits.filter(u => !u.parent_unit_id || !filteredIds.has(u.parent_unit_id));
  }, [filteredUnits]);

  // KPIs
  const totalUnits     = units.length;
  const activeUnits    = units.filter(u => u.status === "Active").length;
  const branchCount    = units.filter(u => u.unit_type === "Branch").length;
  const divisionCount  = units.filter(u => u.unit_type === "Division").length;
  const deptCount      = units.filter(u => u.unit_type === "Department").length;

  // Parent options for filter
  const parentFilterOptions = useMemo(() => [
    { value: "", label: "All Parents" },
    ...units.filter(u => findChildren(u.id, units).length > 0)
      .map(u => ({ value: u.id, label: u.unit_name })),
  ], [units]);

  // ── Callbacks ─────────────────────────────────────────────────────────────────

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpanded(new Set(units.map(u => u.id)));
  }, [units]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  const handleFormConfirm = useCallback(async (values: UnitFormValues): Promise<boolean> => {
    if (editingUnit ? !perm.edit_units : !perm.create_units) return false;
    const now = new Date().toISOString();
    let result: OrgSaveResult;
    let savedRecordId = editingUnit?.id ?? "";
    if (editingUnit) {
      result = await persistOrgUnitChange(
        () => orgReg.update(editingUnit.id, {
          unit_name:          values.unit_name,
          unit_type:          values.unit_type,
          code:               values.code || undefined,
          description:        values.description || undefined,
          phone:              values.phone || undefined,
          email:              values.email || undefined,
          address:            values.address || undefined,
          parent_unit_id:     values.parent_unit_id || undefined,
          parent_unit:        allUnits.find(u => u.id === values.parent_unit_id)?.unit_name ?? "—",
          head_user_id:       values.head_user_id || undefined,
          deputy_user_id:     values.deputy_user_id || undefined,
          effective_start_at: values.effective_start_at || undefined,
          status:             values.status,
          updated_at:         now,
          updated_by:         currentUser?.id,
          path_ids:           values.parent_unit_id ? buildPathIds(values.parent_unit_id, units).concat(editingUnit.id) : [editingUnit.id],
          path_label:         values.parent_unit_id ? `${buildPathLabel(values.parent_unit_id, units)} › ${values.unit_name}` : values.unit_name,
        }),
        // SQL BEFORE trigger convay_entity_track writes immutable entity_changes
        // in the same transaction. bms.audit direct INSERT is denied in production.
        () => true,
      );
    } else {
      const newId = generateId("OU", units.map(u => u.unit_id));
      savedRecordId = newId;
      const parentPath = values.parent_unit_id ? buildPathLabel(values.parent_unit_id, units) : "";
      result = await persistOrgUnitChange(
        () => orgReg.add({
          id:                 newId,
          unit_id:            newId,
          unit_name:          values.unit_name,
          unit_type:          values.unit_type,
          code:               values.code || undefined,
          description:        values.description || undefined,
          phone:              values.phone || undefined,
          email:              values.email || undefined,
          address:            values.address || undefined,
          parent_unit:        allUnits.find(u => u.id === values.parent_unit_id)?.unit_name ?? "—",
          parent_unit_id:     values.parent_unit_id || undefined,
          head:               "",
          head_user_id:       values.head_user_id || undefined,
          deputy_user_id:     values.deputy_user_id || undefined,
          member_count:       "0",
          effective_start_at: values.effective_start_at || undefined,
          status:             values.status,
          created_at:         now,
          created_by:         currentUser?.id,
          path_ids:           values.parent_unit_id ? [...buildPathIds(values.parent_unit_id, units), newId] : [newId],
          path_label:         parentPath ? `${parentPath} › ${values.unit_name}` : values.unit_name,
        }),
        // The server mutation atomically writes entity_changes via convay_entity_track.
        () => true,
      );
    }
    if (result === "not-saved") return false;
    if (result === "audit-unverified") {
      toast.warning("The organization record was saved, but its activity journal could not be confirmed.");
    }
    // Production registry is SQL-backed. Re-fetch the authoritative record
    // before announcing a completed mutation; never retry a confirmed write
    // automatically if this independent read fails.
    if (orgReg.refresh) {
      const readbackConfirmed = await verifyOrgUnitSqlReadback(
        orgReg.refresh,
        orgReg.getById,
        {
          id: savedRecordId,
          unit_name: values.unit_name,
          unit_type: values.unit_type,
          status: values.status,
          code: values.code || undefined,
          description: values.description || undefined,
          phone: values.phone || undefined,
          email: values.email || undefined,
          address: values.address || undefined,
          effective_start_at: values.effective_start_at || undefined,
          parent_unit_id: values.parent_unit_id || undefined,
          parent_unit: allUnits.find(u => u.id === values.parent_unit_id)?.unit_name ?? "—",
          path_ids: values.parent_unit_id
            ? [...buildPathIds(values.parent_unit_id, units), savedRecordId] : [savedRecordId],
          path_label: values.parent_unit_id
            ? `${buildPathLabel(values.parent_unit_id, units)} › ${values.unit_name}` : values.unit_name,
          head_user_id: values.head_user_id || undefined,
          deputy_user_id: values.deputy_user_id || undefined,
        },
      );
      if (!readbackConfirmed) {
        toast.warning("Unit write was acknowledged, but SQL readback could not be confirmed. Refresh Organization Structure before making further changes.");
      }
    }
    setFormOpen(false);
    setEditingUnit(undefined);
    setDefaultParentId(undefined);
    return true;
  }, [editingUnit, orgReg, units, currentUser, perm.edit_units, perm.create_units]);

  // Alias for path functions inside handleFormConfirm
  const allUnits = units;

  const handleActivate = useCallback(async (unit: OrgUnit): Promise<void> => {
    if (!perm.activate_units) return;
    const now = new Date().toISOString();
    // The server's convay_entity_track trigger records this change atomically.
    // A direct client bms.audit INSERT is forbidden by the registry contract.
    const result = await persistOrgUnitChange(
      () => orgReg.update(unit.id, {
        status: "Active", updated_at: now, updated_by: currentUser?.id,
      }),
      () => true,
    );
    if (result === "not-saved") {
      toast.error("Activation was not saved. Check permissions and retry.");
      return;
    }
    if (!orgReg.refresh) {
      toast.warning("Activation acknowledged but SQL readback is unavailable. Refresh before editing.");
      return;
    }
    const confirmed = await verifyOrgUnitSqlReadback(
      orgReg.refresh, orgReg.getById,
      {
        id: unit.id, unit_name: unit.unit_name, unit_type: unit.unit_type,
        status: "Active", code: unit.code,
        description: unit.description, phone: unit.phone, email: unit.email,
        address: unit.address, effective_start_at: unit.effective_start_at,
        parent_unit_id: unit.parent_unit_id, parent_unit: unit.parent_unit,
        path_ids: unit.path_ids, path_label: unit.path_label,
        head_user_id: unit.head_user_id, deputy_user_id: unit.deputy_user_id,
      },
    );
    if (!confirmed) toast.warning("Activation acknowledged but SQL readback is unverified. Refresh before editing.");
  }, [perm.activate_units, orgReg, currentUser]);

  const handleDeactivate = useCallback((unit: OrgUnit) => {
    if (!perm.deactivate_units) return;
    // Open guided deactivation modal instead of direct deactivate
    setDeactivateTarget(unit);
  }, [perm.deactivate_units]);

  const openCreate = (parentId?: string) => {
    if (!perm.create_units) return;
    setEditingUnit(undefined);
    setDefaultParentId(parentId);
    setFormOpen(true);
  };

  const openEdit = (unit: OrgUnit) => {
    if (!perm.edit_units) return;
    setEditingUnit(unit);
    setDefaultParentId(undefined);
    setFormOpen(true);
    setSelectedUnit(null);
  };

  // ── List view columns ─────────────────────────────────────────────────────────

  const listCols = [
    { key: "unit_name", label: "Unit" },
    { key: "code",      label: "Code" },
    { key: "unit_type", label: "Type" },
    { key: "parent",   label: "Parent" },
    { key: "head",     label: "Unit Head" },
    { key: "users",    label: "Users" },
    { key: "children", label: "Child Units" },
    { key: "status",   label: "Status" },
    { key: "effective", label: "Effective Date" },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 min-h-full">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Organization Structure</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your organisational hierarchy, units, and leadership assignments.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {perm.create_units && (
            <PrimaryButton type="button" onClick={() => openCreate()}>
              <Plus size={16} /> Add Unit
            </PrimaryButton>
          )}
          {!perm.create_units && (
            <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-muted-foreground bg-muted rounded-lg">
              <Lock size={12} /> View Only
            </div>
          )}
        </div>
      </div>

      {/* KPI cards — same approved StatCard component as other Convay pages. */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        <StatCard icon={Building2} value={String(totalUnits)} label="Total Units" tone="primary" loading={orgReg.loading} />
        <StatCard icon={CheckCircle} value={String(activeUnits)} label="Active" tone="success" loading={orgReg.loading} />
        <StatCard icon={GitBranch} value={String(branchCount)} label="Branches" tone="primary" loading={orgReg.loading} />
        <StatCard icon={Network} value={String(divisionCount)} label="Divisions" tone="primary" loading={orgReg.loading} />
        <StatCard icon={FolderTree} value={String(deptCount)} label="Departments" tone="primary" loading={orgReg.loading} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, code, head, address…"
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filters button */}
        <button
          onClick={() => setFilterOpen(v => !v)}
          className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${filterOpen || activeFilterCount > 0 ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-primary text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">{activeFilterCount}</span>
          )}
        </button>

        {/* View toggle */}
        <div className="flex items-center border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setView("tree")}
            title="Tree View"
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${view === "tree" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/50"}`}
          >
            <FolderTree size={14} /> <span className="hidden sm:inline">Tree</span>
          </button>
          <button
            onClick={() => setView("list")}
            title="List View"
            className={`flex items-center gap-1.5 px-3 py-2 text-sm transition-colors ${view === "list" ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted/50"}`}
          >
            <List size={14} /> <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </div>

      {/* Filter panel */}
      {filterOpen && (
        <div className="rounded-xl border border-border bg-background p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Unit Type</label>
            <select
              value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Types</option>
              {PHASE1_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
            <select
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Parent Unit</label>
            <select
              value={filters.parent}
              onChange={e => setFilters(f => ({ ...f, parent: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {parentFilterOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Has Users</label>
            <select
              value={filters.hasUsers === null ? "" : String(filters.hasUsers)}
              onChange={e => setFilters(f => ({ ...f, hasUsers: e.target.value === "" ? null : e.target.value === "true" }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Any</option>
              <option value="true">Has users</option>
              <option value="false">No users</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">Has Children</label>
            <select
              value={filters.hasChildren === null ? "" : String(filters.hasChildren)}
              onChange={e => setFilters(f => ({ ...f, hasChildren: e.target.value === "" ? null : e.target.value === "true" }))}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="">Any</option>
              <option value="true">Has child units</option>
              <option value="false">No children</option>
            </select>
          </div>
          <div className="col-span-2 md:col-span-4 flex justify-end">
            <button
              onClick={() => { setFilters({ type: "", status: "", parent: "", hasUsers: null, hasChildren: null }); setSearch(""); }}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <X size={13} /> Clear All
            </button>
          </div>
        </div>
      )}

      {/* Tree expand/collapse controls */}
      {view === "tree" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <button onClick={expandAll} className="flex items-center gap-1 hover:text-foreground transition-colors"><ChevronsUpDown size={12} /> Expand All</button>
          <span>·</span>
          <button onClick={collapseAll} className="flex items-center gap-1 hover:text-foreground transition-colors"><ChevronsDownUp size={12} /> Collapse All</button>
          <span className="ml-auto">{filteredUnits.length} unit{filteredUnits.length !== 1 ? "s" : ""}</span>
        </div>
      )}

      {/* Content area */}
      <div className="bg-background border border-border rounded-xl overflow-hidden">
        {orgReg.loading ? (
          <div role="status" className="py-16 text-center text-sm text-muted-foreground">Loading organization units…</div>
        ) : orgReg.error ? (
          <div role="alert" className="flex flex-col items-center gap-3 py-12 px-4 text-center">
            <p className="text-sm text-destructive">Unable to load units: {orgReg.error}</p>
            <button onClick={() => { void orgReg.refresh?.(); }}
              className="rounded-lg px-4 py-2 text-sm bg-primary text-primary-foreground">Retry loading</button>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Network size={40} className="text-muted-foreground mb-3 opacity-40" />
            <p className="text-sm font-medium text-muted-foreground">{units.length === 0 ? "No organization units yet" : "No units match your filters"}</p>
            {units.length === 0 && perm.create_units && <button onClick={() => openCreate()} className="mt-3 rounded-lg px-4 py-2 bg-primary text-primary-foreground text-sm">Create first Organization</button>}
            {(search || activeFilterCount > 0) && (
              <button onClick={() => { setSearch(""); setFilters({ type: "", status: "", parent: "", hasUsers: null, hasChildren: null }); }} className="mt-2 text-xs text-primary hover:underline">Clear filters</button>
            )}
          </div>
        ) : view === "tree" ? (
          /* ── Tree View ── */
          <div className="py-2" role="tree" aria-label="Organization hierarchy">
            {treeRoots.map(root => (
              <OrgTreeNode
                key={root.id}
                unit={root}
                allUnits={filteredUnits}
                users={users}
                depth={0}
                expanded={expanded}
                onToggle={toggleExpand}
                onSelect={setSelectedUnit}
                onAddChild={openCreate}
                onEdit={openEdit}
                onActivate={handleActivate}
                onDeactivate={handleDeactivate}
                onAssignUser={perm.assign_users ? (u) => setAssignUserTarget(u) : undefined}
                onManageHead={perm.assign_heads ? (u) => setManageHeadTarget(u) : undefined}
                onMove={perm.move_units ? (u) => setMoveUnitTarget(u) : undefined}
              />
            ))}
          </div>
        ) : (
          /* ── List View ── */
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    {listCols.map(c => (
                      <th key={c.key} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{c.label}</th>
                    ))}
                    <th className="text-right px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUnits.map(u => {
                    const mc = recalculateMemberCount(u.id, users);
                    const cc = recalculateChildCount(u.id, units);
                    const parent = findParent(u, units);
                    const headUser = users.find(usr => usr.id === u.head_user_id);
                    return (
                      <tr key={u.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-muted-foreground flex-shrink-0" />
                            <span className="font-medium text-foreground">{u.unit_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.code || "—"}</td>
                        <td className="px-4 py-3"><TypeBadge type={u.unit_type} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{parent?.unit_name ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground truncate max-w-[140px]">
                          {headUser ? (headUser.display_name ?? headUser.name) : (u.head || "—")}
                        </td>
                        <td className="px-4 py-3 text-center">{mc}</td>
                        <td className="px-4 py-3 text-center">{cc}</td>
                        <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                        <td className="px-4 py-3 text-muted-foreground">{u.effective_start_at ? u.effective_start_at.slice(0, 10) : "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelectedUnit(u)}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors ml-auto"
                          >
                            <Eye size={12} /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-border">
              {filteredUnits.map(u => {
                const mc = recalculateMemberCount(u.id, users);
                const cc = recalculateChildCount(u.id, units);
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUnit(u)}
                    className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-foreground">{u.unit_name}</span>
                          {u.code && <span className="text-xs font-mono text-muted-foreground">{u.code}</span>}
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <TypeBadge type={u.unit_type} />
                          <StatusBadge status={u.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><GitBranch size={11} />{cc} children</span>
                          <span className="flex items-center gap-1"><Users size={11} />{mc} users</span>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Detail drawer */}
      {selectedUnit && (
        <UnitDetailDrawer
          unit={selectedUnit}
          allUnits={units}
          users={users}
          auditItems={auditReg.items}
          onClose={() => setSelectedUnit(null)}
          onEdit={openEdit}
          onAddChild={openCreate}
          onActivate={handleActivate}
          onDeactivate={handleDeactivate}
          onAssignUser={perm.assign_users ? (u) => { setSelectedUnit(null); setAssignUserTarget(u); } : undefined}
          onManageHead={perm.assign_heads ? (u) => { setSelectedUnit(null); setManageHeadTarget(u); } : undefined}
          onTransferUser={perm.transfer_users ? (u) => { setSelectedUnit(null); setTransferUserTarget(u); } : undefined}
          onMove={perm.move_units ? (u) => { setSelectedUnit(null); setMoveUnitTarget(u); } : undefined}
        />
      )}

      {/* Create / edit modal */}
      {formOpen && (
        <UnitFormModal
          editUnit={editingUnit}
          defaultParentId={defaultParentId}
          allUnits={units}
          users={users}
          onConfirm={handleFormConfirm}
          onClose={() => { setFormOpen(false); setEditingUnit(undefined); setDefaultParentId(undefined); }}
        />
      )}

      {/* Assign user modal */}
      {assignUserTarget && (
        <AssignUserModal
          unit={assignUserTarget}
          allUnits={units}
          onClose={() => setAssignUserTarget(null)}
          onSuccess={() => setAssignUserTarget(null)}
        />
      )}

      {/* Manage head modal */}
      {manageHeadTarget && (
        <ManageHeadModal
          unit={manageHeadTarget}
          onClose={() => setManageHeadTarget(null)}
          onSuccess={() => setManageHeadTarget(null)}
        />
      )}

      {/* Transfer user modal */}
      {transferUserTarget && (
        <TransferUserModal
          unit={transferUserTarget}
          allUnits={units}
          onClose={() => setTransferUserTarget(null)}
          onSuccess={() => setTransferUserTarget(null)}
        />
      )}

      {/* Move unit modal */}
      {moveUnitTarget && (
        <MoveUnitModal
          unit={moveUnitTarget}
          allUnits={units}
          onClose={() => setMoveUnitTarget(null)}
          onSuccess={() => setMoveUnitTarget(null)}
        />
      )}

      {/* Deactivate unit modal */}
      {deactivateTarget && (
        <DeactivateUnitModal
          unit={deactivateTarget}
          allUnits={units}
          onClose={() => setDeactivateTarget(null)}
          onSuccess={() => setDeactivateTarget(null)}
          onTransferUsers={(unitId) => {
            const u = units.find((x) => x.id === unitId);
            if (u) { setDeactivateTarget(null); setTransferUserTarget(u); }
          }}
          onMoveUnit={(child) => { setDeactivateTarget(null); setMoveUnitTarget(child); }}
          onManageHead={(u) => { setDeactivateTarget(null); setManageHeadTarget(u); }}
        />
      )}
    </div>
  );
}
