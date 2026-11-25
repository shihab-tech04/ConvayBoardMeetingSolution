/**
 * MoveUnitModal — move an org unit to a new parent.
 *
 * Shows:
 *  - Current path → proposed path
 *  - Child units affected
 *  - Users affected
 *  - Leadership
 *  - Cycle-detection block
 *  - Parent-type validation block
 *
 * On save:
 *  - Updates parent_unit_id on the unit
 *  - Recalculates path_ids / path_label for unit and all descendants
 *  - Creates audit event
 */

import { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X, GitBranch, ArrowRight, AlertTriangle, Search, CheckCircle, Users } from "lucide-react";

import type { OrgUnit } from "../../../data/boardMeetingData";

import { useBmsUserRegistry } from "../../../data/bmsUsers";
import { convayAuth } from "../../../services/supabase/convayAuth";
import { commitAtomicUnitMove } from "./atomicUnitMove";
import {
  buildPathLabel,
  detectCycle,
  validateParentType,
  findChildren,
  findDescendants,
  resolveDescendantUsers,
  VALID_PARENT_TYPES,
} from "../../../utils/orgHierarchy";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Props {
  unit: OrgUnit;
  allUnits: OrgUnit[];
  onClose: () => void;
  onSuccess?: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MoveUnitModal({ unit, allUnits, onClose, onSuccess }: Props) {
  const bmsUsers    = useBmsUserRegistry();

  const [step, setStep]             = useState<"select" | "impact" | "confirm">("select");
  const [newParentId, setNewParentId] = useState("");
  const [search, setSearch]         = useState("");
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason]         = useState("");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");

  const currentPath  = buildPathLabel(unit.id, allUnits);
  const currentParentId = unit.parent_unit_id;

  // New parent candidate
  const newParent = useMemo(() => allUnits.find((u) => u.id === newParentId), [allUnits, newParentId]);

  // Proposed path (simulate parent change for display)
  const proposedPath = useMemo(() => {
    if (!newParentId) return "";
    const parentPath = buildPathLabel(newParentId, allUnits);
    return `${parentPath} › ${unit.unit_name}`;
  }, [newParentId, allUnits, unit.unit_name]);

  // Affected users and children
  const children        = useMemo(() => findChildren(unit.id, allUnits), [unit.id, allUnits]);
  const descendants     = useMemo(() => findDescendants(unit.id, allUnits), [unit.id, allUnits]);
  const affectedUsers   = useMemo(() => resolveDescendantUsers(unit.id, allUnits, bmsUsers.items), [unit.id, allUnits, bmsUsers.items]);

  // Validation
  const hasCycle = newParentId
    ? detectCycle(unit.id, newParentId, allUnits)
    : false;

  const parentTypeValid = newParent
    ? validateParentType(unit.unit_type, newParent.unit_type)
    : true;

  const validParentTypes = VALID_PARENT_TYPES[unit.unit_type] ?? [];
  const isSameParent     = newParentId === currentParentId;

  // Candidate parent list
  const candidateParents = useMemo(() => {
    const descendantIds = new Set(descendants.map((d) => d.id));
    const q = search.toLowerCase();
    return allUnits.filter(
      (u) =>
        u.id !== unit.id &&
        !descendantIds.has(u.id) &&
        (u.status === "Active" || u.status === "Draft") &&
        validParentTypes.includes(u.unit_type) &&
        (!q || u.unit_name.toLowerCase().includes(q) || (u.code ?? "").toLowerCase().includes(q)),
    );
  }, [allUnits, unit.id, descendants, validParentTypes, search]);

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleContinue() {
    if (!newParentId)     { setError("Select a new parent unit."); return; }
    if (isSameParent)     { setError("The selected parent is already the current parent."); return; }
    if (hasCycle)         { setError("This move would create a circular reference — blocked."); return; }
    if (!parentTypeValid) { setError(`${unit.unit_type} cannot be placed under ${newParent?.unit_type}. Valid parents: ${validParentTypes.join(", ")}.`); return; }
    setError("");
    setStep("impact");
  }

  function handleProceedToConfirm() {
    if (!effectiveDate) { setError("Effective date is required."); return; }
    if (!reason.trim()) { setError("A reason is required."); return; }
    setError("");
    setStep("confirm");
  }

  // A unit move affects the entire descendant tree and must be one server
  // transaction. Never issue registry.update in a loop or forge a local audit.
  const saveInFlight = useRef(false);
  const requestId = useRef<string | null>(null);
  async function handleConfirm() {
    if (saveInFlight.current || !newParent) return;
    saveInFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const receipt = await commitAtomicUnitMove({
        unit_id: unit.id,
        expected_parent_id: currentParentId ?? null,
        new_parent_id: newParentId,
        effective_date: effectiveDate,
        reason,
        request_id: requestId.current ?? (requestId.current = crypto.randomUUID()),
      }, {
        send: async (payload) => {
          const response = await convayAuth.authenticatedRequest("/rest/v1/rpc/convay_move_org_unit", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              p_unit_id: payload.unit_id,
              p_expected_parent_id: payload.expected_parent_id,
              p_new_parent_id: payload.new_parent_id,
              p_effective_date: payload.effective_date,
              p_reason: payload.reason,
              p_request_id: payload.request_id,
            }),
          });
          return response.json();
        },
        read: async (id) => {
          const result = await convayAuth.registry<OrgUnit>("bms.orgunits", "list");
          const entry = result.records.find((record) => record.payload.id === id);
          return entry ? { parent_unit_id: entry.payload.parent_unit_id ?? null, revision: entry.revision } : null;
        },
      });
      if (receipt.unit_id !== unit.id) throw new Error("Unit move confirmation did not match the selected unit.");
      onSuccess?.();
      onClose();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Unable to verify the unit move. Reopen and retry.");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
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
            <GitBranch size={18} className="text-primary" />
            <div>
              <p className="font-semibold text-foreground text-sm">Move Unit</p>
              <p className="text-xs text-muted-foreground">{unit.unit_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Step: Select new parent */}
          {step === "select" && (
            <>
              {/* Current path */}
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground mb-1">Current path</p>
                <p className="text-sm font-medium text-foreground">{currentPath}</p>
              </div>

              {/* Allowed parent types info */}
              {validParentTypes.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Valid parent types for <strong>{unit.unit_type}</strong>: {validParentTypes.join(", ")}
                </p>
              )}

              {/* Search */}
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search parent units…"
                  className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  autoFocus
                />
              </div>

              {/* Parent list */}
              <div className="border border-border rounded-lg divide-y divide-border max-h-56 overflow-y-auto">
                {candidateParents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-6">No valid parent units found</p>
                )}
                {candidateParents.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => { setNewParentId(u.id); requestId.current = null; setError(""); }}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-sm ${newParentId === u.id ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{u.unit_name}</span>
                      <span className="text-xs text-muted-foreground">{buildPathLabel(u.id, allUnits)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{u.unit_type}</span>
                    {newParentId === u.id && <CheckCircle size={14} className="text-primary flex-shrink-0" />}
                  </button>
                ))}
              </div>

              {/* Proposed path preview */}
              {newParentId && proposedPath && (
                <div className="rounded-lg border border-border p-3 bg-emerald-50 dark:bg-emerald-950/20">
                  <p className="text-xs text-muted-foreground mb-1">Proposed path</p>
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{proposedPath}</p>
                </div>
              )}

              {/* Validation warnings */}
              {hasCycle && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Circular reference detected — this move is not allowed.</span>
                </div>
              )}
              {newParentId && !parentTypeValid && !hasCycle && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                  <span>Invalid parent type — {unit.unit_type} cannot be placed under {newParent?.unit_type}.</span>
                </div>
              )}
            </>
          )}

          {/* Step: Impact review */}
          {step === "impact" && (
            <>
              {/* Path change summary */}
              <div className="rounded-lg border border-border p-3 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20 flex-shrink-0">From</span>
                  <span className="text-foreground">{currentPath}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground w-20 flex-shrink-0">To</span>
                  <span className="font-medium text-primary">{proposedPath}</span>
                </div>
              </div>

              {/* Impact counts */}
              <div className="space-y-2">
                {[
                  { label: "Direct child units",      value: children.length },
                  { label: "Total descendants",        value: descendants.length },
                  { label: "Affected users",           value: affectedUsers.length },
                  { label: "Paths to recalculate",     value: descendants.length + 1 },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className={`font-medium ${value > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Effective date + reason */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Effective Date <span className="text-destructive">*</span></label>
                  <input type="date" value={effectiveDate} onChange={(e) => { setEffectiveDate(e.target.value); requestId.current = null; }}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason <span className="text-destructive">*</span></label>
                  <textarea value={reason} onChange={(e) => { setReason(e.target.value); requestId.current = null; }} rows={3}
                    placeholder="Reason for moving this unit…"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                </div>
              </div>
            </>
          )}

          {/* Step: Confirm */}
          {step === "confirm" && (
            <>
              <p className="text-sm text-muted-foreground">Confirm the unit move:</p>
              <div className="rounded-lg border border-border divide-y divide-border text-sm">
                {[
                  ["Unit",        unit.unit_name],
                  ["From",        currentPath],
                  ["To",          proposedPath],
                  ["Effective",   effectiveDate],
                  ["Reason",      reason],
                  ["Descendants", String(descendants.length + 1) + " paths recalculated"],
                  ["Users",       String(affectedUsers.length) + " affected"],
                ].map(([l, v]) => (
                  <div key={l} className="flex items-start justify-between px-3 py-2 gap-3">
                    <span className="text-muted-foreground flex-shrink-0">{l}</span>
                    <span className="font-medium text-foreground text-right">{v}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={step === "select" ? onClose : () => { setError(""); setStep(step === "confirm" ? "impact" : "select"); }}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg"
          >
            {step === "select" ? "Cancel" : "Back"}
          </button>
          {step === "select" && (
            <button onClick={handleContinue} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg">Continue</button>
          )}
          {step === "impact" && (
            <button onClick={handleProceedToConfirm} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg">Review</button>
          )}
          {step === "confirm" && (
            <button onClick={handleConfirm} disabled={saving} className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-40">
              {saving ? "Moving…" : "Confirm Move"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
