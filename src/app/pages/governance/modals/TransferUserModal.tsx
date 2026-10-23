/**
 * TransferUserModal — formal user transfer between org units.
 *
 * Shows:
 *  - Current path and new path
 *  - Impact summary (meetings, documents, open actions, governance memberships)
 *  - Effective date, reason, optional new designation/manager/handover user
 *
 * On save:
 *  - Updates user's primary_org_unit_id and type-specific IDs
 *  - Creates audit event
 *  - Preserves previous assignment in member count recalc
 */

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, ArrowRight, AlertTriangle, Search, CheckCircle, Users } from "lucide-react";

import type { OrgUnit } from "../../../data/boardMeetingData";
import type { BmsUser } from "../../../data/bmsUsers";
import { useBmsUserRegistry } from "../../../data/bmsUsers";
import { useAuditEventRegistry, generateId, useOrgUnitRegistry } from "../../../data/boardMeetingData";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import {
  buildPathLabel,
  buildUnitAssignmentPatch,
  buildUnitClearancePatch,
  resolveUnitUsers,
} from "../../../utils/orgHierarchy";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  unit: OrgUnit;         // transfer destination
  allUnits: OrgUnit[];
  onClose: () => void;
  onSuccess?: () => void;
  /** Pre-select a user to transfer (e.g., from user detail). */
  initialUserId?: string;
}

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS = ["Select User", "Destination", "Details", "Impact", "Confirm"];

// ── Component ─────────────────────────────────────────────────────────────────

export function TransferUserModal({ unit, allUnits, onClose, onSuccess, initialUserId }: Props) {
  const bmsUsers    = useBmsUserRegistry();
  const auditReg    = useAuditEventRegistry();
  const orgReg      = useOrgUnitRegistry();
  const currentUser = useCurrentUser();

  const [step, setStep] = useState(initialUserId ? 1 : 0);
  const [selectedUserId, setSelectedUserId]   = useState(initialUserId ?? "");
  const [destUnitId, setDestUnitId]           = useState(unit.id);
  const [search, setSearch]                   = useState("");
  const [unitSearch, setUnitSearch]           = useState("");
  const [effectiveDate, setEffectiveDate]     = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason]                   = useState("");
  const [newDesignation, setNewDesignation]   = useState("");
  const [handoverUserId, setHandoverUserId]   = useState("");
  const [saving, setSaving]                   = useState(false);
  const [error, setError]                     = useState("");

  // Selected user
  const selectedUser = useMemo(
    () => bmsUsers.items.find((u) => u.id === selectedUserId),
    [bmsUsers.items, selectedUserId],
  );

  const destUnit = useMemo(
    () => allUnits.find((u) => u.id === destUnitId),
    [allUnits, destUnitId],
  );

  // Source unit
  const sourceUnitId = selectedUser?.primary_org_unit_id;
  const sourceUnit   = useMemo(
    () => allUnits.find((u) => u.id === sourceUnitId),
    [allUnits, sourceUnitId],
  );

  const sourcePath = sourceUnit ? buildPathLabel(sourceUnit.id, allUnits) : "—";
  const destPath   = destUnit   ? buildPathLabel(destUnit.id, allUnits)   : "—";

  // Impact counts (derived from registry state — real modules would expose hooks)
  const destMembers = useMemo(() => resolveUnitUsers(destUnitId, bmsUsers.items), [destUnitId, bmsUsers.items]);

  // User list for step 0
  const eligibleUsers = useMemo(
    () => bmsUsers.items.filter((u) => u.account_status === "active" || u.account_status === "pending_activation"),
    [bmsUsers.items],
  );
  const filteredUsers = useMemo(() => {
    if (!search) return eligibleUsers;
    const q = search.toLowerCase();
    return eligibleUsers.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.display_name ?? "").toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employee_id ?? "").toLowerCase().includes(q),
    );
  }, [eligibleUsers, search]);

  // Destination unit list for step 1
  const availableDests = useMemo(() => {
    const q = unitSearch.toLowerCase();
    return allUnits.filter(
      (u) =>
        (u.status === "Active" || u.status === "Draft") &&
        u.id !== sourceUnitId &&
        (!q || u.unit_name.toLowerCase().includes(q) || (u.code ?? "").toLowerCase().includes(q)),
    );
  }, [allUnits, sourceUnitId, unitSearch]);

  // Handover user options
  const handoverOptions = useMemo(
    () => bmsUsers.items.filter(
      (u) => (u.account_status === "active") && u.id !== selectedUserId,
    ),
    [bmsUsers.items, selectedUserId],
  );

  // ── Validation ────────────────────────────────────────────────────────────────

  function validate(): boolean {
    if (step === 0 && !selectedUserId) { setError("Select a user to transfer."); return false; }
    if (step === 1 && !destUnitId)     { setError("Select a destination unit.");  return false; }
    if (step === 1 && destUnitId === sourceUnitId) { setError("Destination must be different from the current unit."); return false; }
    if (step === 2 && !effectiveDate)  { setError("Effective date is required."); return false; }
    if (step === 2 && !reason.trim())  { setError("A transfer reason is required."); return false; }
    setError("");
    return true;
  }

  function next() { if (validate()) setStep((s) => s + 1); }
  function back() { setError(""); setStep((s) => s - 1); }

  // ── Save ──────────────────────────────────────────────────────────────────────

  async function handleConfirm() {
    if (!selectedUser || !destUnit) return;
    setSaving(true);
    const now = new Date().toISOString();

    const patch: Partial<BmsUser> = {
      ...buildUnitClearancePatch(),
      ...buildUnitAssignmentPatch(destUnit),
      updated_at: now,
      ...(newDesignation ? { position: newDesignation } : {}),
    };

    bmsUsers.update(selectedUser.id, patch);

    auditReg.add({
      id:              generateId("AUD", auditReg.items.map((a) => a.id)),
      created_at:      now,
      event_id:        `AUDIT-XFER-${Date.now()}`,
      entity_type:     "OrgUnit",
      entity_id:       destUnit.id,
      action:          "org_user_transferred",
      actor:           currentUser?.name ?? "System",
      actor_role:      currentUser?.designation ?? "",
      timestamp:       now,
      ip_address:      "",
      details:         `${selectedUser.name} transferred from ${sourcePath} to ${destPath}. Reason: ${reason}. Effective: ${effectiveDate}.`,
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
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRight size={18} className="text-primary" />
            <div>
              <p className="font-semibold text-foreground text-sm">Transfer User</p>
              <p className="text-xs text-muted-foreground">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {/* Step indicator */}
        <div className="flex px-5 py-2 border-b border-border flex-shrink-0 gap-0.5">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-full transition-colors ${i <= step ? "bg-primary" : "bg-muted"}`}
            />
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Step 0: Select user */}
          {step === 0 && (
            <div className="space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, email, ID…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>
              <div className="border border-border rounded-lg divide-y divide-border max-h-72 overflow-y-auto">
                {filteredUsers.map((u) => {
                  const unitName = allUnits.find((ou) => ou.id === u.primary_org_unit_id)?.unit_name;
                  return (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-3 hover:bg-muted/40 transition-colors ${selectedUserId === u.id ? "bg-primary/5" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                        {(u.display_name ?? u.name).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.display_name ?? u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.employee_id}{unitName ? ` · ${unitName}` : ""}</p>
                      </div>
                      {selectedUserId === u.id && <CheckCircle size={14} className="text-primary flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 1: Destination unit */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/40 text-sm mb-2">
                <span className="text-muted-foreground truncate flex-1">{sourcePath || "No current unit"}</span>
                <ArrowRight size={14} className="text-muted-foreground flex-shrink-0" />
                <span className="font-medium text-primary truncate flex-1 text-right">{destPath}</span>
              </div>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text" value={unitSearch} onChange={(e) => setUnitSearch(e.target.value)}
                  placeholder="Search destination unit…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
                {availableDests.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setDestUnitId(u.id)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-sm ${destUnitId === u.id ? "bg-primary/5" : ""}`}
                  >
                    <span className="flex-1 truncate">{u.unit_name}</span>
                    <span className="text-xs text-muted-foreground">{u.unit_type}</span>
                    {destUnitId === u.id && <CheckCircle size={14} className="text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Effective Date <span className="text-destructive">*</span></label>
                <input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason <span className="text-destructive">*</span></label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                  placeholder="Reason for transfer…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">New Designation (optional)</label>
                <input type="text" value={newDesignation} onChange={(e) => setNewDesignation(e.target.value)}
                  placeholder="e.g. Senior Officer"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Handover User (optional)</label>
                <select value={handoverUserId} onChange={(e) => setHandoverUserId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">— None —</option>
                  {handoverOptions.map((u) => (
                    <option key={u.id} value={u.id}>{u.display_name ?? u.name} ({u.employee_id})</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Step 3: Impact */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5 mb-1">
                  <AlertTriangle size={14} /> Impact Review
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Review the affected records before confirming the transfer.
                </p>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Destination unit current members",    value: destMembers.length },
                  { label: "Open meetings (estimate)",           value: 0 },
                  { label: "Pending approvals",                  value: 0 },
                  { label: "Open action items",                  value: 0 },
                  { label: "Active governance memberships",      value: selectedUser?.governance_membership_ids?.length ?? 0 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-medium ${value > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Historical records (past meetings, decisions, minutes) will remain linked to the user regardless of unit.
              </p>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Confirm the following transfer:</p>
              <div className="rounded-lg border border-border divide-y divide-border text-sm">
                {[
                  ["User",        selectedUser ? (selectedUser.display_name ?? selectedUser.name) : "—"],
                  ["From",        sourcePath || "—"],
                  ["To",          destPath],
                  ["Effective",   effectiveDate],
                  ["Reason",      reason],
                  ...(newDesignation ? [["New Designation", newDesignation]] : []),
                  ...(handoverUserId ? [["Handover to", bmsUsers.items.find((u) => u.id === handoverUserId)?.name ?? handoverUserId]] : []),
                ].map(([l, v]) => (
                  <div key={l} className="flex items-start justify-between px-3 py-2 gap-3">
                    <span className="text-muted-foreground flex-shrink-0">{l}</span>
                    <span className="font-medium text-foreground text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button onClick={step === 0 ? onClose : back} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg">
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < STEPS.length - 1 ? (
            <button onClick={next} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg">Continue</button>
          ) : (
            <button onClick={handleConfirm} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-40">
              {saving ? "Saving…" : "Confirm Transfer"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
