/**
 * ParticipantSelectorStep — canonical multi-source participant selection for Step 1.
 *
 * Tabs: Quorum Members | General Members | Division | Department | Individual
 * Writes selected participants as JSON to values.participant_links_json.
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  Search, X, Users, Building2, User, Network,
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ShieldCheck,
} from "lucide-react";
import type { BmsUser } from "../../data/bmsUsers";
import type { OrgUnit, GovernanceBody } from "../../data/boardMeetingData";
import type { GovernanceMembership, MembershipRole } from "../../data/governanceMemberships";
import type { EntryFormValue } from "./EntryForm";
import { buildPathLabel, resolveUnitUsers } from "../../utils/orgHierarchy";

// ── Constants ────────────────────────────────────────────────────────────────

const MEETING_ROLES = [
  "Chairperson", "Meeting Secretary", "Member",
  "Presenter", "Invitee", "Observer", "Organizer",
] as const;
type MeetingRole = (typeof MEETING_ROLES)[number];

export type MemberCategory = "quorum" | "general";

type SourceTab = "quorum_members" | "general_members" | "division" | "department" | "individual";

const SOURCE_TABS: { id: SourceTab; label: string; icon: React.ElementType }[] = [
  { id: "quorum_members",  label: "Quorum Members",  icon: ShieldCheck },
  { id: "general_members", label: "General Members", icon: Users },
  { id: "division",        label: "Division",        icon: Building2 },
  { id: "department",      label: "Department",      icon: Network },
  { id: "individual",      label: "Individual",      icon: User },
];

// ── Draft type ───────────────────────────────────────────────────────────────

export interface DraftParticipantLink {
  id: string;
  user_id: string;
  user_name: string;
  user_designation: string;
  org_path: string;
  member_category: MemberCategory;
  participant_type: MeetingRole;
  is_required: boolean;
  voting_eligible: boolean;
  quorum_eligible: boolean;
  selection_sources: Array<{
    type: string;
    source_id: string;
    source_label: string;
  }>;
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface ParticipantSelectorStepProps {
  values: Record<string, EntryFormValue>;
  onValuesChange: (patch: Record<string, EntryFormValue>) => void;
  bmsUsers: BmsUser[];
  orgUnits: OrgUnit[];
  governanceBodies: GovernanceBody[];
  governanceMemberships: GovernanceMembership[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isActive(u: BmsUser): boolean {
  const s = (u.account_status ?? u.status ?? "active").toLowerCase();
  return s === "active" || s === "activated";
}

function userOrgPath(u: BmsUser, orgUnits: OrgUnit[]): string {
  const unitId = u.primary_org_unit_id ?? u.branch_id ?? u.department_id ?? "";
  if (!unitId) return u.circle ?? "";
  return buildPathLabel(unitId, orgUnits) || u.circle || "";
}

function resolveUserById(id: string, users: BmsUser[]): BmsUser | undefined {
  if (!id) return undefined;
  return users.find(u => u.id === id);
}

function roleForField(field: string): MeetingRole {
  if (field === "chairperson") return "Chairperson";
  if (field === "secretary")   return "Meeting Secretary";
  return "Organizer";
}

function membershipRoleToMeetingRole(role: MembershipRole): MeetingRole {
  if (role === "chair")       return "Chairperson";
  if (role === "secretary")   return "Meeting Secretary";
  return "Member";
}

function buildDraft(
  user: BmsUser,
  role: MeetingRole,
  category: MemberCategory,
  isRequired: boolean,
  voting: boolean,
  quorum: boolean,
  source: { type: string; source_id: string; source_label: string },
  orgUnits: OrgUnit[],
): DraftParticipantLink {
  return {
    id: `draft-${user.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    user_id: user.id,
    user_name: user.name,
    user_designation: user.designation ?? user.position ?? "",
    org_path: userOrgPath(user, orgUnits),
    member_category: category,
    participant_type: role,
    is_required: isRequired,
    voting_eligible: voting,
    quorum_eligible: quorum,
    selection_sources: [source],
  };
}

function mergeSource(
  existing: DraftParticipantLink,
  source: { type: string; source_id: string; source_label: string },
): DraftParticipantLink {
  const already = existing.selection_sources.some(
    s => s.type === source.type && s.source_id === source.source_id,
  );
  if (already) return existing;
  return { ...existing, selection_sources: [...existing.selection_sources, source] };
}

function sourceSummary(sources: DraftParticipantLink["selection_sources"]): string {
  if (sources.length === 0) return "Individually added";
  if (sources.length === 1) return `Via ${sources[0].source_label}`;
  return `Via ${sources.map(s => s.source_label).join(" and ")}`;
}

// ── Summary banner ───────────────────────────────────────────────────────────

interface SummaryProps { links: DraftParticipantLink[] }
function Summary({ links }: SummaryProps) {
  const quorumMembers  = links.filter(l => l.member_category === "quorum");
  const generalMembers = links.filter(l => l.member_category === "general");
  const hasChair = links.some(l => l.participant_type === "Chairperson");
  const hasSec   = links.some(l => l.participant_type === "Meeting Secretary");

  const warnings: string[] = [];
  if (!hasChair)              warnings.push("No Chairperson assigned");
  if (!hasSec)                warnings.push("No Meeting Secretary assigned");
  if (quorumMembers.length === 0) warnings.push("No quorum-eligible members");

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden mb-3">
      <div className="flex items-stretch divide-x divide-[var(--border)]">
        {/* Total count */}
        <div className="flex flex-col items-center justify-center px-5 py-3 min-w-[80px]">
          <span className="text-2xl font-bold text-[var(--foreground)] leading-none">{links.length}</span>
          <span className="text-[10px] font-medium text-[var(--muted-foreground)] mt-1 uppercase tracking-wide">Total</span>
        </div>
        {/* Quorum count */}
        <div className="flex flex-col items-center justify-center px-5 py-3 min-w-[80px]">
          <span className="text-2xl font-bold text-[var(--primary)] leading-none">{quorumMembers.length}</span>
          <span className="text-[10px] font-medium text-[var(--muted-foreground)] mt-1 uppercase tracking-wide">Quorum</span>
        </div>
        {/* General count */}
        <div className="flex flex-col items-center justify-center px-5 py-3 min-w-[80px]">
          <span className="text-2xl font-bold text-[var(--foreground)] leading-none">{generalMembers.length}</span>
          <span className="text-[10px] font-medium text-[var(--muted-foreground)] mt-1 uppercase tracking-wide">General</span>
        </div>
        {/* Status / warnings */}
        <div className="flex flex-col justify-center px-4 py-3 flex-1">
          {warnings.length > 0 ? (
            <div className="flex flex-col gap-1">
              {warnings.map(w => (
                <div key={w} className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                  <AlertTriangle size={11} strokeWidth={2} aria-hidden="true" />
                  {w}
                </div>
              ))}
            </div>
          ) : links.length > 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={11} strokeWidth={2} aria-hidden="true" />
              All required roles filled
            </div>
          ) : (
            <span className="text-xs text-[var(--muted-foreground)] italic">No participants added yet</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── User row in source panel ─────────────────────────────────────────────────

interface AvailableUserRowProps {
  user: BmsUser;
  orgUnits: OrgUnit[];
  checked: boolean;
  onToggle: (user: BmsUser) => void;
  badge?: string;
  disabled?: boolean;
}
function AvailableUserRow({ user, orgUnits, checked, onToggle, badge, disabled }: AvailableUserRowProps) {
  const path = userOrgPath(user, orgUnits);
  const initial = user.name.charAt(0).toUpperCase();
  return (
    <label
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
        ${checked ? "bg-[var(--primary)]/8" : "hover:bg-[var(--surface-raised)]"}
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => !disabled && onToggle(user)}
        className="shrink-0 accent-[var(--primary)]"
      />
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0
        ${checked ? "bg-[var(--primary)] text-white" : "bg-[var(--primary)]/10 text-[var(--primary)]"}`}>
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-[var(--foreground)] truncate">{user.name}</span>
          {badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium shrink-0">
              {badge}
            </span>
          )}
        </div>
        <div className="text-[10px] text-[var(--muted-foreground)] leading-tight mt-0.5">
          {[user.designation ?? user.position, path].filter(Boolean).join(" · ")}
        </div>
      </div>
    </label>
  );
}

// ── Selected participant card ─────────────────────────────────────────────────

interface SelectedCardProps {
  link: DraftParticipantLink;
  onChange: (updated: DraftParticipantLink) => void;
  onRemove: (id: string) => void;
}
function SelectedCard({ link, onChange, onRemove }: SelectedCardProps) {
  const [open, setOpen] = useState(false);
  const initial = link.user_name.charAt(0).toUpperCase();

  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)] transition-shadow hover:shadow-sm">
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Avatar */}
        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0
          ${link.member_category === "quorum" ? "bg-[var(--primary)] text-white" : "bg-[var(--primary)]/10 text-[var(--primary)]"}`}>
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm font-bold text-[var(--foreground)]">{link.user_name}</span>
            {link.member_category === "quorum" ? (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-semibold">
                Quorum
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[var(--foreground)]/8 text-[var(--foreground)] font-medium">
                General
              </span>
            )}
            <span className="text-xs px-2.5 py-0.5 rounded-full border border-[var(--border)] bg-[var(--background)] text-[var(--foreground)] font-medium">
              {link.participant_type}
            </span>
            {link.is_required && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold">
                Required
              </span>
            )}
          </div>
          <div className="text-xs text-[var(--muted-foreground)] leading-tight mt-1">
            {[link.user_designation, link.org_path].filter(Boolean).join(" · ")}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="p-2 rounded-lg hover:bg-[var(--surface-raised)] text-[var(--muted-foreground)] transition-colors"
            aria-label="Expand participant options"
          >
            {open ? <ChevronUp size={14} strokeWidth={2} /> : <ChevronDown size={14} strokeWidth={2} />}
          </button>
          {link.is_required ? (
            <span
              className="text-xs px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400 cursor-help font-semibold"
              title="Required leadership role — return to Meeting Details to replace"
            >
              Protected
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onRemove(link.id)}
              className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-[var(--muted-foreground)] hover:text-red-500 transition-colors"
              aria-label={`Remove ${link.user_name}`}
            >
              <X size={14} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="px-3 py-2 border-t border-[var(--border)] bg-[var(--surface-raised)] space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--muted-foreground)] w-16 shrink-0">Role</span>
            <select
              value={link.participant_type}
              onChange={e => onChange({ ...link, participant_type: e.target.value as MeetingRole })}
              className="text-xs border border-[var(--border)] rounded px-1.5 py-0.5 bg-[var(--background)] text-[var(--foreground)] flex-1"
            >
              {MEETING_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-[var(--muted-foreground)] w-16 shrink-0">Category</span>
            <select
              value={link.member_category}
              onChange={e => onChange({ ...link, member_category: e.target.value as MemberCategory })}
              className="text-xs border border-[var(--border)] rounded px-1.5 py-0.5 bg-[var(--background)] text-[var(--foreground)]"
            >
              <option value="quorum">Quorum</option>
              <option value="general">General</option>
            </select>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {(["is_required", "voting_eligible", "quorum_eligible"] as const).map(flag => (
              <label key={flag} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!link[flag]}
                  onChange={e => onChange({ ...link, [flag]: e.target.checked })}
                />
                <span className="text-[10px] text-[var(--muted-foreground)] capitalize">
                  {flag === "is_required" ? "Required" : flag === "voting_eligible" ? "Voting" : "Quorum"}
                </span>
              </label>
            ))}
          </div>
          <div className="text-[10px] text-[var(--muted-foreground)] italic">
            {sourceSummary(link.selection_sources)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Expandable org unit block ────────────────────────────────────────────────

interface OrgUnitBlockProps {
  unit: OrgUnit;
  users: BmsUser[];
  orgUnits: OrgUnit[];
  alreadySelectedIds: Set<string>;
  pendingUserIds: Set<string>;
  /** onToggle now receives the user AND the unit context (id + name) */
  onToggle: (u: BmsUser, unitId: string, unitName: string) => void;
  parentLabel?: string;
}
function OrgUnitBlock({ unit, users, orgUnits, alreadySelectedIds, pendingUserIds, onToggle, parentLabel }: OrgUnitBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const activeUsers = users.filter(isActive);
  const uid = unit.id ?? unit.unit_id ?? "";

  return (
    <div className="border border-[var(--border)] rounded-lg mb-1.5 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-[var(--surface-raised)] transition-colors bg-[var(--surface)]"
      >
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-md bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center text-[10px] font-bold shrink-0">
            {unit.unit_name.charAt(0)}
          </span>
          <span className="text-xs font-semibold text-[var(--foreground)]">{unit.unit_name}</span>
          {parentLabel && (
            <span className="text-[10px] text-[var(--muted-foreground)]">· {parentLabel}</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--primary)]/8 text-[var(--primary)] font-medium">{activeUsers.length}</span>
          {expanded ? <ChevronUp size={13} strokeWidth={2} /> : <ChevronDown size={13} strokeWidth={2} />}
        </div>
      </button>
      {expanded && (
        <div className="border-t border-[var(--border)] max-h-36 overflow-y-auto">
          {activeUsers.length === 0 ? (
            <p className="text-[10px] text-[var(--muted-foreground)] text-center py-3">No active users</p>
          ) : (
            activeUsers.map(u => (
              <AvailableUserRow
                key={u.id}
                user={u}
                orgUnits={orgUnits}
                checked={alreadySelectedIds.has(u.id) || pendingUserIds.has(u.id)}
                onToggle={(user) => onToggle(user, uid, unit.unit_name)}
                disabled={alreadySelectedIds.has(u.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ParticipantSelectorStep({
  values,
  onValuesChange,
  bmsUsers,
  orgUnits,
  governanceBodies,
  governanceMemberships,
}: ParticipantSelectorStepProps) {

  const committeeValue = String(values.committee ?? "");

  // Resolve the selected governance body (match by id or name)
  const govBody = useMemo(
    () => governanceBodies.find(
      b => b.id === committeeValue || b.body_id === committeeValue || b.body_name === committeeValue,
    ),
    [governanceBodies, committeeValue],
  );
  const govBodyId = govBody?.id ?? govBody?.body_id ?? committeeValue;

  // Filter quorum vs general memberships from canonical registry
  const quorumMemberships = useMemo(
    () => governanceMemberships.filter(
      m => (m.gov_body_id === govBodyId || m.gov_body_name === committeeValue)
        && m.counts_for_quorum
        && m.status === "active",
    ),
    [governanceMemberships, govBodyId, committeeValue],
  );

  const generalMemberships = useMemo(
    () => governanceMemberships.filter(
      m => (m.gov_body_id === govBodyId || m.gov_body_name === committeeValue)
        && !m.counts_for_quorum
        && m.status === "active",
    ),
    [governanceMemberships, govBodyId, committeeValue],
  );

  // Resolve BmsUser objects for memberships
  const quorumUsers = useMemo(
    () => quorumMemberships
      .map(m => ({ membership: m, user: resolveUserById(m.user_id, bmsUsers) }))
      .filter((e): e is { membership: GovernanceMembership; user: BmsUser } => !!e.user && isActive(e.user)),
    [quorumMemberships, bmsUsers],
  );

  const generalUsers = useMemo(
    () => generalMemberships
      .map(m => ({ membership: m, user: resolveUserById(m.user_id, bmsUsers) }))
      .filter((e): e is { membership: GovernanceMembership; user: BmsUser } => !!e.user && isActive(e.user)),
    [generalMemberships, bmsUsers],
  );

  // Org units by type
  const divisionUnits = useMemo(
    () => orgUnits.filter(u => u.unit_type === "Division" && (u.status ?? "Active") !== "Inactive"),
    [orgUnits],
  );
  const departmentUnits = useMemo(
    () => orgUnits.filter(u => u.unit_type === "Department" && (u.status ?? "Active") !== "Inactive"),
    [orgUnits],
  );

  // Users per unit (lazy-resolved on render via resolveUnitUsers)
  const unitUsersMap = useMemo(() => {
    const map = new Map<string, BmsUser[]>();
    [...divisionUnits, ...departmentUnits].forEach(u => {
      const uid = u.id ?? u.unit_id ?? "";
      if (uid) map.set(uid, resolveUnitUsers(uid, bmsUsers));
    });
    return map;
  }, [divisionUnits, departmentUnits, bmsUsers]);

  // Parent division label for a department
  const parentDivisionLabel = useCallback((dept: OrgUnit): string | undefined => {
    const parentId = dept.parent_unit_id ?? dept.parent_id ?? "";
    if (!parentId) return undefined;
    const parent = orgUnits.find(u => u.id === parentId || u.unit_id === parentId);
    return parent?.unit_name;
  }, [orgUnits]);

  // ── Initialize links from stored JSON + auto-add Step 0 leaders ──────────
  const initialised = useRef(false);
  const [links, setLinks] = useState<DraftParticipantLink[]>(() => {
    let stored: DraftParticipantLink[] = [];
    try {
      const raw = String(values.participant_links_json ?? "[]");
      if (raw !== "[]") stored = JSON.parse(raw) as DraftParticipantLink[];
    } catch { /* ignore */ }

    // Auto-add chairperson / secretary / organizer from Step 0 using user IDs
    const autoLeaders: DraftParticipantLink[] = [];
    for (const field of ["chairperson", "secretary", "organizer"] as const) {
      const rawVal = String(values[field] ?? "");
      if (!rawVal) continue;
      // Support both user ID (new) and "Name — Designation" rich label (legacy)
      let user: BmsUser | undefined = resolveUserById(rawVal, bmsUsers);
      if (!user && rawVal.includes(" — ")) {
        const name = rawVal.split(" — ")[0].trim();
        user = bmsUsers.find(u => u.name === name && isActive(u));
      }
      if (!user) continue;
      const alreadyIn = stored.some(l => l.user_id === user!.id);
      if (alreadyIn) continue;
      // Determine member_category from quorum membership
      const isMember = quorumMemberships.some(m => m.user_id === user!.id);
      autoLeaders.push(buildDraft(
        user,
        roleForField(field),
        isMember ? "quorum" : "general",
        true,
        field === "chairperson",
        field === "chairperson",
        { type: "individual", source_id: user.id, source_label: "Meeting Leadership" },
        orgUnits,
      ));
    }
    return [...stored, ...autoLeaders];
  });

  const updateLinks = useCallback((next: DraftParticipantLink[]) => {
    setLinks(next);
    onValuesChange({ participant_links_json: JSON.stringify(next) });
  }, [onValuesChange]);

  useEffect(() => {
    if (!initialised.current) {
      initialised.current = true;
      onValuesChange({ participant_links_json: JSON.stringify(links) });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Source tab state ───────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<SourceTab>("quorum_members");
  const [search, setSearch]       = useState("");
  const [pendingUserIds, setPendingUserIds] = useState<Set<string>>(new Set());
  // Track the org unit each pending user was selected from (for real ID persistence)
  const [pendingUserSources, setPendingUserSources] = useState<Map<string, { id: string; label: string }>>(new Map());

  const alreadySelectedIds = useMemo(
    () => new Set(links.map(l => l.user_id)),
    [links],
  );

  const togglePending = useCallback((user: BmsUser, unitId?: string, unitName?: string) => {
    setPendingUserIds(prev => {
      const next = new Set(prev);
      if (next.has(user.id)) {
        next.delete(user.id);
        setPendingUserSources(prev2 => { const m = new Map(prev2); m.delete(user.id); return m; });
      } else {
        next.add(user.id);
        if (unitId) setPendingUserSources(prev2 => new Map(prev2).set(user.id, { id: unitId, label: unitName ?? unitId }));
      }
      return next;
    });
  }, []);

  const switchTab = (tab: SourceTab) => {
    setActiveTab(tab);
    setSearch("");
    setPendingUserIds(new Set());
    setPendingUserSources(new Map());
  };

  // Filter helpers
  const filterBySearch = useCallback((u: BmsUser) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return u.name.toLowerCase().includes(q) ||
      (u.designation ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q);
  }, [search]);

  // Membership-tab source lists
  const filteredQuorumUsers = useMemo(
    () => quorumUsers.filter(e => filterBySearch(e.user)),
    [quorumUsers, filterBySearch],
  );
  const filteredGeneralUsers = useMemo(
    () => generalUsers.filter(e => filterBySearch(e.user)),
    [generalUsers, filterBySearch],
  );
  const filteredIndividualUsers = useMemo(
    () => bmsUsers.filter(isActive).filter(filterBySearch).slice(0, 40),
    [bmsUsers, filterBySearch],
  );

  // Fallback list for quorum/general tabs when no committee members are configured
  const filteredAllUsers = useMemo(
    () => bmsUsers.filter(isActive).filter(filterBySearch).slice(0, 40),
    [bmsUsers, filterBySearch],
  );

  // Add all from a membership list
  const addMemberships = useCallback((
    entries: { membership: GovernanceMembership; user: BmsUser }[],
    category: MemberCategory,
    sourceLabel: string,
  ) => {
    let next = [...links];
    for (const { membership: m, user } of entries) {
      const source = {
        type: category === "quorum" ? "quorum" : "general",
        source_id: m.gov_body_id,
        source_label: sourceLabel,
      };
      const existingIdx = next.findIndex(l => l.user_id === user.id);
      if (existingIdx >= 0) {
        next[existingIdx] = mergeSource(next[existingIdx], source);
      } else {
        next.push(buildDraft(
          user,
          membershipRoleToMeetingRole(m.membership_role),
          category,
          false,
          m.is_voting_member,
          category === "quorum",
          source,
          orgUnits,
        ));
      }
    }
    updateLinks(next);
    setPendingUserIds(new Set());
  }, [links, orgUnits, updateLinks]);

  // Add pending users from org/individual tabs.
  // For Division/Department tabs, reads real unit IDs from pendingUserSources.
  const addPendingUsers = useCallback((category: MemberCategory, sourceLabel: string, sourceType: string, sourceId: string) => {
    if (pendingUserIds.size === 0) return;
    let next = [...links];
    for (const uid of pendingUserIds) {
      const user = resolveUserById(uid, bmsUsers);
      if (!user) continue;
      // Resolve real unit context when available (Division/Department tabs)
      const unitCtx = pendingUserSources.get(uid);
      const resolvedId    = unitCtx?.id    ?? sourceId;
      const resolvedLabel = unitCtx?.label ?? sourceLabel;
      const source = { type: sourceType, source_id: resolvedId, source_label: resolvedLabel };
      const existingIdx = next.findIndex(l => l.user_id === uid);
      if (existingIdx >= 0) {
        next[existingIdx] = mergeSource(next[existingIdx], source);
      } else {
        next.push(buildDraft(user, "Member", category, false, false, category === "quorum", source, orgUnits));
      }
    }
    updateLinks(next);
    setPendingUserIds(new Set());
    setPendingUserSources(new Map());
  }, [pendingUserIds, pendingUserSources, bmsUsers, links, orgUnits, updateLinks]);

  const removeLink  = useCallback((id: string) => updateLinks(links.filter(l => l.id !== id)), [links, updateLinks]);
  const updateLink  = useCallback((updated: DraftParticipantLink) => updateLinks(links.map(l => l.id === updated.id ? updated : l)), [links, updateLinks]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <Summary links={links} />

      {/* Source panel */}
      <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)] shadow-sm">
        {/* Tab bar */}
        <div className="grid border-b-2 border-[var(--border)] bg-[var(--background)]" style={{ gridTemplateColumns: `repeat(${SOURCE_TABS.length}, 1fr)` }}>
          {SOURCE_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className="relative flex flex-col items-center justify-center gap-1.5 py-3 px-2 transition-all"
                style={isActive ? { color: "var(--color-primary)", background: "rgba(75,86,148,.06)" } : { color: "#626981" }}
              >
                <span
                  className="flex items-center justify-center w-8 h-8 rounded-xl transition-all"
                  style={isActive
                    ? { background: "var(--color-primary)", color: "#fff", boxShadow: "0 2px 8px rgba(75,86,148,.3)" }
                    : { background: "rgba(98,105,129,.12)", color: "#626981" }}
                >
                  <Icon size={15} strokeWidth={2} aria-hidden="true" />
                </span>
                <span className="text-[11px] font-semibold whitespace-nowrap leading-none">{tab.label}</span>
                {isActive && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[var(--primary)] rounded-t-sm" />}
              </button>
            );
          })}
        </div>

        <div className="p-4 space-y-3">
          {/* Quorum Members tab */}
          {activeTab === "quorum_members" && (
            <>
              {!committeeValue ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <ShieldCheck size={36} strokeWidth={1.5} className="text-[var(--primary)]/60" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">No board selected</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Select a Board / Committee in Step 1 to load quorum members</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      <span className="font-bold text-[var(--foreground)]">{quorumUsers.length}</span> quorum member{quorumUsers.length !== 1 ? "s" : ""}
                      {govBody && <> · <span className="font-medium text-[var(--foreground)]">{govBody.body_name}</span></>}
                    </p>
                    {quorumUsers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => addMemberships(quorumUsers, "quorum", govBody?.body_name ?? committeeValue)}
                        className="text-xs font-bold text-[var(--primary)] hover:underline"
                      >
                        Add all
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input
                      type="text"
                      placeholder="Search members…"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]"
                    />
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-0.5">
                    {filteredQuorumUsers.length > 0 ? (
                      filteredQuorumUsers.map(({ user, membership: m }) => (
                        <AvailableUserRow key={user.id} user={user} orgUnits={orgUnits}
                          checked={alreadySelectedIds.has(user.id) || pendingUserIds.has(user.id)}
                          onToggle={togglePending} badge={m.membership_role}
                          disabled={alreadySelectedIds.has(user.id)} />
                      ))
                    ) : filteredAllUsers.length === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-2 text-center">
                        <Users size={28} strokeWidth={1.5} className="text-[var(--muted-foreground)]/60" />
                        <p className="text-sm text-[var(--muted-foreground)]">No members found</p>
                      </div>
                    ) : (
                      <>
                        {quorumUsers.length === 0 && (
                          <p className="text-[10px] text-[var(--muted-foreground)] italic px-1 pb-1">
                            No committee quorum members configured — showing all users
                          </p>
                        )}
                        {filteredAllUsers.map(u => (
                          <AvailableUserRow key={u.id} user={u} orgUnits={orgUnits}
                            checked={alreadySelectedIds.has(u.id) || pendingUserIds.has(u.id)}
                            onToggle={togglePending} disabled={alreadySelectedIds.has(u.id)} />
                        ))}
                      </>
                    )}
                  </div>
                  {pendingUserIds.size > 0 && (
                    <button type="button"
                      onClick={() => {
                        if (filteredQuorumUsers.some(e => pendingUserIds.has(e.user.id))) {
                          addMemberships(filteredQuorumUsers.filter(e => pendingUserIds.has(e.user.id)), "quorum", govBody?.body_name ?? committeeValue);
                        } else {
                          addPendingUsers("quorum", govBody?.body_name ?? committeeValue, "quorum", govBodyId);
                        }
                      }}
                      className="w-full py-2.5 text-sm font-bold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity shadow-sm">
                      Add {pendingUserIds.size} quorum member{pendingUserIds.size !== 1 ? "s" : ""} →
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* General Members tab */}
          {activeTab === "general_members" && (
            <>
              {!committeeValue ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <Users size={36} strokeWidth={1.5} className="text-[var(--primary)]/60" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">No board selected</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Select a Board / Committee in Step 1 to load general members</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      <span className="font-bold text-[var(--foreground)]">{generalUsers.length}</span> general member{generalUsers.length !== 1 ? "s" : ""}
                      {govBody && <> · <span className="font-medium text-[var(--foreground)]">{govBody.body_name}</span></>}
                    </p>
                    {generalUsers.length > 0 && (
                      <button type="button"
                        onClick={() => addMemberships(generalUsers, "general", govBody?.body_name ?? committeeValue)}
                        className="text-xs font-bold text-[var(--primary)] hover:underline">Add all</button>
                    )}
                  </div>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input type="text" placeholder="Search members…" value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]" />
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-0.5">
                    {filteredGeneralUsers.length > 0 ? (
                      filteredGeneralUsers.map(({ user, membership: m }) => (
                        <AvailableUserRow key={user.id} user={user} orgUnits={orgUnits}
                          checked={alreadySelectedIds.has(user.id) || pendingUserIds.has(user.id)}
                          onToggle={togglePending} badge={m.membership_role}
                          disabled={alreadySelectedIds.has(user.id)} />
                      ))
                    ) : filteredAllUsers.length === 0 ? (
                      <div className="flex flex-col items-center py-8 gap-2 text-center">
                        <Users size={28} strokeWidth={1.5} className="text-[var(--muted-foreground)]/60" />
                        <p className="text-sm text-[var(--muted-foreground)]">No members found</p>
                      </div>
                    ) : (
                      <>
                        {generalUsers.length === 0 && (
                          <p className="text-[10px] text-[var(--muted-foreground)] italic px-1 pb-1">
                            No committee general members configured — showing all users
                          </p>
                        )}
                        {filteredAllUsers.map(u => (
                          <AvailableUserRow key={u.id} user={u} orgUnits={orgUnits}
                            checked={alreadySelectedIds.has(u.id) || pendingUserIds.has(u.id)}
                            onToggle={togglePending} disabled={alreadySelectedIds.has(u.id)} />
                        ))}
                      </>
                    )}
                  </div>
                  {pendingUserIds.size > 0 && (
                    <button type="button"
                      onClick={() => {
                        if (filteredGeneralUsers.some(e => pendingUserIds.has(e.user.id))) {
                          addMemberships(filteredGeneralUsers.filter(e => pendingUserIds.has(e.user.id)), "general", govBody?.body_name ?? committeeValue);
                        } else {
                          addPendingUsers("general", govBody?.body_name ?? committeeValue, "general", govBodyId);
                        }
                      }}
                      className="w-full py-2.5 text-sm font-bold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity shadow-sm">
                      Add {pendingUserIds.size} general member{pendingUserIds.size !== 1 ? "s" : ""} →
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* Division tab */}
          {activeTab === "division" && (
            <>
              {divisionUnits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <Building2 size={36} strokeWidth={1.5} className="text-[var(--primary)]/60" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">No divisions configured</p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input type="text" placeholder="Filter divisions…" value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]" />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {divisionUnits.filter(u => !search.trim() || u.unit_name.toLowerCase().includes(search.toLowerCase())).map(unit => {
                      const uid = unit.id ?? unit.unit_id ?? "";
                      return <OrgUnitBlock key={uid} unit={unit} users={unitUsersMap.get(uid) ?? []} orgUnits={orgUnits}
                        alreadySelectedIds={alreadySelectedIds} pendingUserIds={pendingUserIds} onToggle={togglePending} />;
                    })}
                  </div>
                  {pendingUserIds.size > 0 && (
                    <button type="button" onClick={() => addPendingUsers("general", "Division", "division", "division")}
                      className="w-full py-2.5 text-sm font-bold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity shadow-sm">
                      Add {pendingUserIds.size} participant{pendingUserIds.size !== 1 ? "s" : ""} →
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* Department tab */}
          {activeTab === "department" && (
            <>
              {departmentUnits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <Network size={36} strokeWidth={1.5} className="text-[var(--primary)]/60" />
                  <p className="text-sm font-semibold text-[var(--foreground)]">No departments configured</p>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                    <input type="text" placeholder="Filter departments…" value={search} onChange={e => setSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]" />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {departmentUnits.filter(u => !search.trim() || u.unit_name.toLowerCase().includes(search.toLowerCase())).map(unit => {
                      const uid = unit.id ?? unit.unit_id ?? "";
                      return <OrgUnitBlock key={uid} unit={unit} users={unitUsersMap.get(uid) ?? []} orgUnits={orgUnits}
                        alreadySelectedIds={alreadySelectedIds} pendingUserIds={pendingUserIds} onToggle={togglePending}
                        parentLabel={parentDivisionLabel(unit)} />;
                    })}
                  </div>
                  {pendingUserIds.size > 0 && (
                    <button type="button" onClick={() => addPendingUsers("general", "Department", "department", "department")}
                      className="w-full py-2.5 text-sm font-bold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity shadow-sm">
                      Add {pendingUserIds.size} participant{pendingUserIds.size !== 1 ? "s" : ""} →
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* Individual tab */}
          {activeTab === "individual" && (
            <>
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input type="text" placeholder="Search by name, designation, or email…"
                  value={search} onChange={e => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-[var(--border)] rounded-lg bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20 focus:border-[var(--primary)]" />
              </div>
              <div className="max-h-52 overflow-y-auto space-y-0.5">
                {filteredIndividualUsers.length === 0 ? (
                  <div className="flex flex-col items-center py-8 gap-2 text-center">
                    <User size={28} strokeWidth={1.5} className="text-[var(--muted-foreground)]/60" />
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {search.trim() ? `No users found for "${search}"` : "No users found"}
                    </p>
                  </div>
                ) : (
                  filteredIndividualUsers.map(u => (
                    <AvailableUserRow key={u.id} user={u} orgUnits={orgUnits}
                      checked={alreadySelectedIds.has(u.id) || pendingUserIds.has(u.id)}
                      onToggle={togglePending} disabled={alreadySelectedIds.has(u.id)} />
                  ))
                )}
              </div>
              {pendingUserIds.size > 0 && (
                <button type="button" onClick={() => addPendingUsers("general", "Individual", "individual", "individual")}
                  className="w-full py-2.5 text-sm font-bold rounded-lg bg-[var(--primary)] text-white hover:opacity-90 transition-opacity shadow-sm">
                  Add {pendingUserIds.size} participant{pendingUserIds.size !== 1 ? "s" : ""} →
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Selected list */}
      {links.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-bold text-[var(--foreground)]">
              Selected Participants
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--primary)] text-white font-semibold">
              {links.length}
            </span>
          </div>
          <div className="space-y-2">
            {links.map(link => (
              <SelectedCard key={link.id} link={link} onChange={updateLink} onRemove={removeLink} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
