/**
 * AssignUserModal — assign or reassign a canonical BmsUser to an org unit.
 *
 * - Shows current assignment, designation, and role for each candidate user.
 * - Prevents duplicate primary assignment to the same unit.
 * - Asks whether the operation is an assignment or transfer when the user
 *   already belongs to a different unit.
 * - Updates `primary_org_unit_id` (and type-specific IDs) on the BmsUser record.
 * - Creates an audit event.
 */

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, UserCheck, Search, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";

import type { OrgUnit } from "../../../data/boardMeetingData";
import type { BmsUser } from "../../../data/bmsUsers";
import { useBmsUserRegistry } from "../../../data/bmsUsers";
import { useAuditEventRegistry, generateId } from "../../../data/boardMeetingData";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import {
  buildUnitAssignmentPatch,
  buildUnitClearancePatch,
  isUserAlreadyAssigned,
  resolveUnitUsers,
} from "../../../utils/orgHierarchy";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  unit: OrgUnit;
  allUnits: OrgUnit[];
  onClose: () => void;
  onSuccess?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AssignUserModal({ unit, allUnits, onClose, onSuccess }: Props) {
  const bmsUsers   = useBmsUserRegistry();
  const auditReg   = useAuditEventRegistry();
  const currentUser = useCurrentUser();

  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [operationType, setOperationType] = useState<"assign" | "transfer" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  // Only active/pending users are eligible
  const eligibleUsers = useMemo(
    () => bmsUsers.items.filter(
      (u) => u.account_status === "active" || u.account_status === "pending_activation",
    ),
    [bmsUsers.items],
  );

  // Current unit members
  const currentMembers = useMemo(
    () => resolveUnitUsers(unit.id, bmsUsers.items),
    [unit.id, bmsUsers.items],
  );
  const currentMemberIds = useMemo(() => new Set(currentMembers.map((u) => u.id)), [currentMembers]);

  // Filtered + search
  const filtered = useMemo(() => {
    if (!search) return eligibleUsers;
    const q = search.toLowerCase();
    return eligibleUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.display_name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employee_id ?? "").toLowerCase().includes(q) ||
        (u.position ?? "").toLowerCase().includes(q),
    );
  }, [eligibleUsers, search]);

  const selectedUser = useMemo(
    () => bmsUsers.items.find((u) => u.id === selectedUserId),
    [bmsUsers.items, selectedUserId],
  );

  // Determine if selected user already belongs to this unit or another
  const alreadyInThisUnit = selectedUser
    ? isUserAlreadyAssigned(selectedUser.id, bmsUsers.items, [unit.id])
    : false;

  const currentUnitId = selectedUser?.primary_org_unit_id;
  const currentUnitName = currentUnitId
    ? (allUnits.find((u) => u.id === currentUnitId)?.unit_name ?? currentUnitId)
    : null;

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleSelectUser(user: BmsUser) {
    setSelectedUserId(user.id);
    setOperationType(null);
    setError("");
    setConfirming(false);
    if (isUserAlreadyAssigned(user.id, bmsUsers.items, [unit.id])) return;
    if (user.primary_org_unit_id && user.primary_org_unit_id !== unit.id) {
      // User already in another unit — need to confirm operation type
    }
  }

  function handleContinue() {
    if (!selectedUser) { setError("Select a user first."); return; }
    if (alreadyInThisUnit) { setError("This user is already assigned to this unit."); return; }
    if (selectedUser.primary_org_unit_id && !operationType) {
      setError("Choose whether this is an assignment or transfer.");
      return;
    }
    setError("");
    setConfirming(true);
  }

  async function handleConfirm() {
    if (!selectedUser) return;
    setSaving(true);
    const now = new Date().toISOString();
    const prevUnitId = selectedUser.primary_org_unit_id;

    const patch: Partial<BmsUser> = {
      ...buildUnitClearancePatch(),
      ...buildUnitAssignmentPatch(unit),
      updated_at: now,
    };

    bmsUsers.update(selectedUser.id, patch);

    const action = operationType === "transfer" ? "org_user_transferred" : "org_user_assigned";
    const details = operationType === "transfer"
      ? `User ${selectedUser.name} transferred from ${prevUnitId ?? "—"} to ${unit.unit_name}`
      : `User ${selectedUser.name} assigned to ${unit.unit_name}`;

    auditReg.add({
      id:              generateId("AUD", auditReg.items.map((a) => a.id)),
      created_at:      now,
      event_id:        `AUDIT-ASSIGN-${Date.now()}`,
      entity_type:     "OrgUnit",
      entity_id:       unit.id,
      action,
      actor:           currentUser?.name ?? "System",
      actor_role:      currentUser?.designation ?? "",
      timestamp:       now,
      ip_address:      "",
      details,
      approval_status: "Approved",
    });

    setSaving(false);
    onSuccess?.();
    onClose();
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <UserCheck size={18} className="text-primary" />
            <div>
              <p className="font-semibold text-foreground text-sm">Assign User</p>
              <p className="text-xs text-muted-foreground">{unit.unit_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {!confirming ? (
          <>
            {/* Current members summary */}
            {currentMembers.length > 0 && (
              <div className="px-5 py-3 bg-muted/30 border-b border-border flex-shrink-0">
                <p className="text-xs text-muted-foreground">
                  {currentMembers.length} user{currentMembers.length !== 1 ? "s" : ""} currently assigned
                </p>
              </div>
            )}

            {/* Search */}
            <div className="px-5 py-3 border-b border-border flex-shrink-0">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, ID, position…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">No eligible users found</p>
              )}
              {filtered.map((user) => {
                const inThisUnit = currentMemberIds.has(user.id);
                const inOtherUnit = user.primary_org_unit_id && user.primary_org_unit_id !== unit.id;
                const isSelected = selectedUserId === user.id;

                return (
                  <button
                    key={user.id}
                    onClick={() => handleSelectUser(user)}
                    className={`w-full text-left flex items-center gap-3 px-5 py-3 hover:bg-muted/40 transition-colors ${isSelected ? "bg-primary/5 border-l-2 border-primary" : ""}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                      {(user.display_name ?? user.name).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{user.display_name ?? user.name}</span>
                        {inThisUnit && (
                          <span className="text-xs text-emerald-600 dark:text-emerald-400 flex-shrink-0">✓ assigned</span>
                        )}
                        {!inThisUnit && inOtherUnit && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">in other unit</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                        <span>{user.employee_id}</span>
                        {user.position && <><span>·</span><span>{user.position}</span></>}
                      </div>
                    </div>
                    {isSelected && <CheckCircle size={16} className="text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Transfer clarification */}
            {selectedUser && !alreadyInThisUnit && selectedUser.primary_org_unit_id && (
              <div className="px-5 py-4 border-t border-border bg-amber-50 dark:bg-amber-950/20 flex-shrink-0">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> User already assigned to another unit
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                  {selectedUser.display_name ?? selectedUser.name} is currently in <strong>{currentUnitName}</strong>.
                  Choose how to proceed:
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOperationType("assign")}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${operationType === "assign" ? "border-primary bg-primary text-white" : "border-border hover:bg-muted"}`}
                  >
                    Add assignment
                  </button>
                  <button
                    onClick={() => setOperationType("transfer")}
                    className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${operationType === "transfer" ? "border-primary bg-primary text-white" : "border-border hover:bg-muted"}`}
                  >
                    Transfer (move)
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && <p className="px-5 pb-2 text-xs text-destructive">{error}</p>}

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg">Cancel</button>
              <button
                onClick={handleContinue}
                disabled={!selectedUserId || alreadyInThisUnit}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </>
        ) : (
          /* Confirmation view */
          <>
            <div className="flex-1 px-5 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">Confirm the following assignment:</p>
              <div className="rounded-lg border border-border divide-y divide-border text-sm">
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">User</span>
                  <span className="font-medium">{selectedUser?.display_name ?? selectedUser?.name}</span>
                </div>
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Operation</span>
                  <span className="font-medium capitalize">{operationType ?? "assignment"}</span>
                </div>
                {currentUnitName && (
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-muted-foreground">From</span>
                    <span className="font-medium">{currentUnitName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between px-3 py-2">
                  <span className="text-muted-foreground flex items-center gap-1">
                    {currentUnitName && <ArrowRight size={12} />} To
                  </span>
                  <span className="font-medium text-primary">{unit.unit_name}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => setConfirming(false)} className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg">Back</button>
              <button
                onClick={handleConfirm}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-40"
              >
                {saving ? "Saving…" : "Confirm Assignment"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
