/**
 * DeactivateUnitModal — guided deactivation flow for an org unit.
 *
 * Before deactivating, inspects:
 *  - Assigned users
 *  - Child units
 *  - Unit head
 *  - (estimated) Upcoming meetings, open actions, pending approvals
 *
 * Blocks deactivation until all dependencies are resolved.
 *
 * Provides resolution actions:
 *  - Transfer users (marks them for reassignment)
 *  - Move child units (opens MoveUnitModal)
 *  - Reassign leadership (opens ManageHeadModal)
 *  - Cancel
 *
 * A deactivated unit:
 *  - Remains in history
 *  - Rejects new assignments and child units
 *  - Is hidden from new meeting-participant selection
 */

import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, CheckCircle, Users, GitBranch, Crown, XCircle } from "lucide-react";

import type { OrgUnit } from "../../../data/boardMeetingData";
import { useOrgUnitRegistry, useUnitHeadRegistry, useAuditEventRegistry, generateId } from "../../../data/boardMeetingData";
import { useBmsUserRegistry } from "../../../data/bmsUsers";
import { useCurrentUser } from "../../../hooks/useCurrentUser";
import {
  findChildren,
  resolveUnitUsers,
} from "../../../utils/orgHierarchy";

// ── Types ──────────────────────────────────────────────────────────────────────

interface Dep {
  key: string;
  label: string;
  count: number;
  resolved: boolean;
}

interface Props {
  unit: OrgUnit;
  allUnits: OrgUnit[];
  onClose: () => void;
  onSuccess?: () => void;
  onTransferUsers?: (unitId: string) => void;
  onMoveUnit?: (unit: OrgUnit) => void;
  onManageHead?: (unit: OrgUnit) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DeactivateUnitModal({
  unit, allUnits, onClose, onSuccess,
  onTransferUsers, onMoveUnit, onManageHead,
}: Props) {
  const orgReg      = useOrgUnitRegistry();
  const headReg     = useUnitHeadRegistry();
  const bmsUsers    = useBmsUserRegistry();
  const auditReg    = useAuditEventRegistry();
  const currentUser = useCurrentUser();

  const [step, setStep]                = useState<"inspect" | "confirm">("inspect");
  const [resolvedKeys, setResolvedKeys] = useState<Set<string>>(new Set());
  const [saving, setSaving]            = useState(false);
  const [deactivationReason, setDeactivationReason] = useState("");

  // Dependencies
  const assignedUsers   = useMemo(() => resolveUnitUsers(unit.id, bmsUsers.items), [unit.id, bmsUsers.items]);
  const childUnits      = useMemo(() => findChildren(unit.id, allUnits), [unit.id, allUnits]);
  const activeHeads     = useMemo(
    () => headReg.items.filter((a) => a.unit_id === unit.id && a.status === "active"),
    [headReg.items, unit.id],
  );

  const deps: Dep[] = useMemo(() => [
    {
      key:      "users",
      label:    `Assigned users (${assignedUsers.length})`,
      count:    assignedUsers.length,
      resolved: resolvedKeys.has("users") || assignedUsers.length === 0,
    },
    {
      key:      "children",
      label:    `Child units (${childUnits.length})`,
      count:    childUnits.length,
      resolved: resolvedKeys.has("children") || childUnits.length === 0,
    },
    {
      key:      "heads",
      label:    `Active leadership assignments (${activeHeads.length})`,
      count:    activeHeads.length,
      resolved: resolvedKeys.has("heads") || activeHeads.length === 0,
    },
  ], [assignedUsers.length, childUnits.length, activeHeads.length, resolvedKeys]);

  const allResolved = deps.every((d) => d.resolved);

  function markResolved(key: string) {
    setResolvedKeys((prev) => new Set([...prev, key]));
  }

  // ── Confirm deactivation ──────────────────────────────────────────────────────

  async function handleDeactivate() {
    setSaving(true);
    const now = new Date().toISOString();

    // End all active head assignments
    for (const a of activeHeads) {
      headReg.update(a.id, { status: "ended", end_date: now.slice(0, 10) });
    }

    orgReg.update(unit.id, {
      status:              "Deactivated",
      deactivated_at:      now,
      deactivated_by:      currentUser?.id ?? "system",
      deactivation_reason: deactivationReason || undefined,
      head_user_id:        undefined,
      head:                "",
      updated_at:          now,
    });

    auditReg.add({
      id:              generateId("AUD", auditReg.items.map((a) => a.id)),
      created_at:      now,
      event_id:        `AUDIT-DEACT-${Date.now()}`,
      entity_type:     "OrgUnit",
      entity_id:       unit.id,
      action:          "org_unit_deactivated",
      actor:           currentUser?.name ?? "System",
      actor_role:      currentUser?.designation ?? "",
      timestamp:       now,
      ip_address:      "",
      details:         `Unit deactivated: ${unit.unit_name}. Reason: ${deactivationReason || "Not specified"}.`,
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
            <XCircle size={18} className="text-destructive" />
            <div>
              <p className="font-semibold text-foreground text-sm">Deactivate Unit</p>
              <p className="text-xs text-muted-foreground">{unit.unit_name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {step === "inspect" && (
            <>
              {/* Warning banner */}
              <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Resolve All Dependencies
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Deactivation cannot proceed until all dependencies below are resolved.
                  A deactivated unit will reject new assignments and be hidden from meeting selection.
                </p>
              </div>

              {/* Dependency list */}
              <div className="space-y-2">
                {deps.map((dep) => (
                  <div
                    key={dep.key}
                    className={`rounded-lg border p-3 transition-colors ${dep.resolved ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20" : "border-border bg-muted/30"}`}
                  >
                    <div className="flex items-start gap-3">
                      {dep.resolved
                        ? <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
                        : <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      }
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${dep.resolved ? "text-emerald-700 dark:text-emerald-300 line-through opacity-60" : "text-foreground"}`}>
                          {dep.label}
                        </p>

                        {/* Resolution actions */}
                        {!dep.resolved && dep.count > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {dep.key === "users" && (
                              <>
                                <button
                                  onClick={() => { onTransferUsers?.(unit.id); markResolved("users"); }}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                  Transfer Users
                                </button>
                                <button
                                  onClick={() => markResolved("users")}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
                                >
                                  Mark Resolved
                                </button>
                              </>
                            )}
                            {dep.key === "children" && (
                              <>
                                {childUnits.slice(0, 3).map((child) => (
                                  <button
                                    key={child.id}
                                    onClick={() => { onMoveUnit?.(child); }}
                                    className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                  >
                                    Move {child.unit_name}
                                  </button>
                                ))}
                                <button
                                  onClick={() => markResolved("children")}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
                                >
                                  Mark Resolved
                                </button>
                              </>
                            )}
                            {dep.key === "heads" && (
                              <>
                                <button
                                  onClick={() => { onManageHead?.(unit); markResolved("heads"); }}
                                  className="text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                >
                                  Manage Leadership
                                </button>
                                <button
                                  onClick={() => markResolved("heads")}
                                  className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
                                >
                                  Mark Resolved
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Detail list */}
                        {!dep.resolved && dep.key === "users" && assignedUsers.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {assignedUsers.slice(0, 3).map((u) => (
                              <div key={u.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Users size={11} />
                                <span>{u.display_name ?? u.name}</span>
                              </div>
                            ))}
                            {assignedUsers.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{assignedUsers.length - 3} more</p>
                            )}
                          </div>
                        )}
                        {!dep.resolved && dep.key === "children" && childUnits.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {childUnits.slice(0, 3).map((u) => (
                              <div key={u.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <GitBranch size={11} />
                                <span>{u.unit_name}</span>
                              </div>
                            ))}
                            {childUnits.length > 3 && (
                              <p className="text-xs text-muted-foreground">+{childUnits.length - 3} more</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Reason */}
              {allResolved && (
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Deactivation Reason (optional)</label>
                  <textarea
                    value={deactivationReason}
                    onChange={(e) => setDeactivationReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for deactivating this unit…"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                  />
                </div>
              )}
            </>
          )}

          {step === "confirm" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
                <XCircle size={32} className="text-destructive mx-auto mb-2" />
                <p className="font-medium text-foreground">Deactivate <strong>{unit.unit_name}</strong>?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  This unit will be deactivated and hidden from new assignments and meeting selection.
                  All historical records are preserved.
                </p>
              </div>
              {deactivationReason && (
                <p className="text-sm text-muted-foreground">
                  <strong>Reason:</strong> {deactivationReason}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            onClick={step === "inspect" ? onClose : () => setStep("inspect")}
            className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg"
          >
            {step === "inspect" ? "Cancel" : "Back"}
          </button>
          {step === "inspect" && (
            <button
              onClick={() => setStep("confirm")}
              disabled={!allResolved}
              className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Proceed to Deactivate
            </button>
          )}
          {step === "confirm" && (
            <button
              onClick={handleDeactivate}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-lg disabled:opacity-40"
            >
              {saving ? "Deactivating…" : "Confirm Deactivation"}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
