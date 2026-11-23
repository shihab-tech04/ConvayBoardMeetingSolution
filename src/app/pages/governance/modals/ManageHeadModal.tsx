/**
 * ManageHeadModal — manage formal leadership assignments for an org unit.
 *
 * Supports:
 *  - Assign Permanent Head
 *  - Assign Acting Head
 *  - Assign Deputy
 *  - Replace Head (ends current, creates new)
 *  - End Assignment
 *  - Schedule future assignment
 *
 * Rules:
 *  - Only one active Permanent Head per unit.
 *  - Effective dates required.
 *  - Previous assignments are preserved in history (status → "ended").
 *  - Unit projection and immutable history updated atomically by SQL only.
 */

import { useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { X, Crown, Search, CheckCircle, UserMinus, Plus, Clock } from "lucide-react";

import type { OrgUnit, UnitHeadAssignment } from "../../../data/boardMeetingData";
import { useUnitHeadRegistry } from "../../../data/boardMeetingData";
import { convayAuth } from "../../../services/supabase/convayAuth";
import { commitUnitHeadMutation, type UnitHeadMutation } from "./unitHeadMutation";
import { toast } from "sonner";
import { useBmsUserRegistry } from "../../../data/bmsUsers";
import { isUnitAssignable } from "../../../utils/orgHierarchy";

// ── Types ──────────────────────────────────────────────────────────────────────

type AssignmentType = "Permanent Head" | "Acting Head" | "Deputy";

interface Props {
  unit: OrgUnit;
  onClose: () => void;
  onSuccess?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function AssignmentTypeBadge({ type }: { type: AssignmentType }) {
  const colors: Record<AssignmentType, string> = {
    "Permanent Head": "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
    "Acting Head":    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "Deputy":         "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colors[type]}`}>
      {type}
    </span>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ManageHeadModal({ unit, onClose, onSuccess }: Props) {
  const headReg     = useUnitHeadRegistry();
  const bmsUsers    = useBmsUserRegistry();

  const [mode, setMode] = useState<"list" | "assign" | "end">("list");
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId]   = useState("");
  const [assignmentType, setAssignmentType]   = useState<AssignmentType>("Permanent Head");
  const [startDate, setStartDate]             = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate]                 = useState("");
  const [reason, setReason]                   = useState("");
  const [endingAssignmentId, setEndingAssignmentId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  // Current active assignments for this unit
  const activeAssignments = useMemo(
    () => headReg.items.filter((a) => a.unit_id === unit.id && a.status === "active"),
    [headReg.items, unit.id],
  );

  const historicAssignments = useMemo(
    () => headReg.items.filter((a) => a.unit_id === unit.id && a.status === "ended").slice(0, 10),
    [headReg.items, unit.id],
  );

  const hasActivePermanentHead = activeAssignments.some((a) => a.assignment_type === "Permanent Head");

  // Eligible users (active or pending)
  const eligibleUsers = useMemo(
    () => bmsUsers.items.filter((u) => u.account_status === "active"),
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

  function getUserName(userId: string): string {
    const u = bmsUsers.items.find((u) => u.id === userId);
    return u ? (u.display_name ?? u.name) : userId;
  }

  // ── Actions ───────────────────────────────────────────────────────────────────

  const saveInFlight = useRef(false);
  const requestToken = useRef<{ fingerprint: string; id: string } | null>(null);
  function stableRequestId(fingerprint: string) {
    if (requestToken.current?.fingerprint === fingerprint) return requestToken.current.id;
    const id = crypto.randomUUID();
    requestToken.current = { fingerprint, id };
    return id;
  }

  async function sendServerMutation(intent: UnitHeadMutation) {
    return commitUnitHeadMutation(intent, {
      send: async (payload) => {
        // Server derives actor, permission, active membership and tenant from JWT.
        // Do not send a browser-provided actor or forged tenant attribute.
        const parameters: Record<string, unknown> = {
          p_action: payload.operation,
          p_unit_id: payload.unit_id,
          p_request_id: payload.request_id,
        };
        if (payload.operation === "assign") {
          parameters.p_user_id = payload.user_id;
          parameters.p_assignment_type = payload.assignment_type;
          parameters.p_start_date = payload.start_date;
          parameters.p_end_date = payload.end_date;
          parameters.p_reason = payload.reason;
        } else {
          parameters.p_record_id = payload.record_id;
        }
        const response = await convayAuth.authenticatedRequest(
          "/rest/v1/rpc/convay_manage_unit_head",
          { method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parameters) },
        );
        return response.json();
      },
      readAssignment: async (id) => {
        const result = await convayAuth.registry<UnitHeadAssignment>("bms.unitheads", "list");
        return result.records.find((entry) => entry.payload.id === id) ?? null;
      },
      readUnit: async (id) => {
        const result = await convayAuth.registry<OrgUnit>("bms.orgunits", "list");
        return result.records.find((entry) => entry.payload.id === id) ?? null;
      },
    });
  }

  async function completeVerifiedMutation() {
    let refreshError = false;
    try { await headReg.refresh?.(); } catch { refreshError = true; }
    requestToken.current = null;
    setMode("list");
    resetForm();
    if (refreshError) {
      toast.warning("The server confirmed the change, but the list refresh failed. Refresh to see current assignments.");
    }
    try { onSuccess?.(); } catch {
      toast.warning("Saved on the server; refresh the governance view to update the summary.");
    }
  }

  async function handleAssign() {
    if (saveInFlight.current) return;
    if (!selectedUserId) { setError("Select a user."); return; }
    if (!startDate) { setError("Effective start date is required."); return; }
    if (assignmentType === "Permanent Head" && hasActivePermanentHead) {
      setError("This unit already has an active Permanent Head. End that assignment first.");
      return;
    }
    if (!isUnitAssignable(unit)) {
      setError("This unit is inactive and cannot receive new assignments.");
      return;
    }
    // Display filtering is advisory. SQL must separately prove active board
    // membership, unit/tenant scope and sufficient role at mutation time.
    if (!eligibleUsers.some((user) => user.id === selectedUserId &&
          user.account_status === "active")) {
      setError("Only an active account can be considered for a leadership assignment.");
      return;
    }
    saveInFlight.current = true;
    setSaving(true);
    setError("");
    const data = {
      operation: "assign" as const,
      unit_id: unit.id,
      user_id: selectedUserId,
      assignment_type: assignmentType,
      start_date: startDate,
      end_date: endDate || null,
      reason: reason.trim(),
    };
    try {
      await sendServerMutation({
        ...data, request_id: stableRequestId(JSON.stringify(data)),
      });
      await completeVerifiedMutation();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message :
        "Unable to verify the leadership assignment. Refresh and retry.");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  async function handleEndAssignment() {
    if (saveInFlight.current) return;
    if (!endingAssignmentId) { setError("Select an assignment to end."); return; }
    const assignment = activeAssignments.find((entry) => entry.id === endingAssignmentId);
    if (!assignment) { setError("Assignment not found. Refresh before retrying."); return; }
    saveInFlight.current = true;
    setSaving(true);
    setError("");
    const data = {
      operation: "end" as const, unit_id: unit.id, record_id: assignment.id,
    };
    try {
      await sendServerMutation({
        ...data, request_id: stableRequestId(JSON.stringify(data)),
      });
      await completeVerifiedMutation();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message :
        "Unable to verify termination. Refresh and retry.");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  }

  function resetForm() {
    setSearch("");
    setSelectedUserId("");
    setAssignmentType("Permanent Head");
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setReason("");
    setEndingAssignmentId("");
    setError("");
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !saveInFlight.current) onClose(); }}
    >
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-primary" />
            <div>
              <p className="font-semibold text-foreground text-sm">Leadership Assignments</p>
              <p className="text-xs text-muted-foreground">{unit.unit_name}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="p-1 rounded hover:bg-muted text-muted-foreground"><X size={16} /></button>
        </div>

        {/* List mode */}
        {mode === "list" && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Active assignments */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Active Assignments</p>
                  <button
                    onClick={() => { resetForm(); setMode("assign"); }}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <Plus size={12} /> Assign
                  </button>
                </div>
                {activeAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No active leadership assignments</p>
                ) : (
                  <div className="space-y-2">
                    {activeAssignments.map((a) => (
                      <div key={a.id} className="flex items-start gap-3 p-3 rounded-lg border border-border">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                          {getUserName(a.user_id).charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{getUserName(a.user_id)}</span>
                            <AssignmentTypeBadge type={a.assignment_type} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            From {a.start_date}{a.end_date ? ` to ${a.end_date}` : " · ongoing"}
                          </p>
                        </div>
                        <button
                          onClick={() => { setEndingAssignmentId(a.id); setMode("end"); }}
                          className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 flex-shrink-0"
                        >
                          <UserMinus size={12} /> End
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* History */}
              {historicAssignments.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">History</p>
                  <div className="space-y-1">
                    {historicAssignments.map((a) => (
                      <div key={a.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                        <Clock size={12} className="flex-shrink-0" />
                        <span className="flex-1">{getUserName(a.user_id)}</span>
                        <AssignmentTypeBadge type={a.assignment_type} />
                        <span className="text-xs">{a.start_date} – {a.end_date ?? "?"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg">Close</button>
            </div>
          </>
        )}

        {/* Assign mode */}
        {mode === "assign" && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {/* Assignment type selector */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Assignment Type</p>
                <div className="flex gap-2">
                  {(["Permanent Head", "Acting Head", "Deputy"] as AssignmentType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setAssignmentType(t); setError(""); }}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-colors ${assignmentType === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {assignmentType === "Permanent Head" && hasActivePermanentHead && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                    <span>⚠</span> There is already an active Permanent Head. End it first.
                  </p>
                )}
              </div>

              {/* User picker */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Select User</p>
                <div className="relative mb-2">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users…"
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                  {filteredUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-muted/40 transition-colors text-sm ${selectedUserId === u.id ? "bg-primary/5" : ""}`}
                    >
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold flex-shrink-0">
                        {(u.display_name ?? u.name).charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 truncate">{u.display_name ?? u.name}</span>
                      <span className="text-xs text-muted-foreground">{u.employee_id}</span>
                      {selectedUserId === u.id && <CheckCircle size={14} className="text-primary flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Effective From <span className="text-destructive">*</span></label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">End Date (optional)</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Reason (optional)</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  placeholder="Reason for assignment…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => { resetForm(); setMode("list"); }} disabled={saving} className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg">Back</button>
              <button
                onClick={handleAssign}
                disabled={saving || !selectedUserId || !startDate}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-40"
              >
                {saving ? "Saving…" : "Confirm Assignment"}
              </button>
            </div>
          </>
        )}

        {/* End mode */}
        {mode === "end" && (
          <>
            <div className="flex-1 px-5 py-5 space-y-3">
              <p className="text-sm text-muted-foreground">Select the assignment to end:</p>
              {activeAssignments.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setEndingAssignmentId(a.id)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-colors ${endingAssignmentId === a.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted/40"}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{getUserName(a.user_id)}</span>
                      <AssignmentTypeBadge type={a.assignment_type} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">Since {a.start_date}</p>
                  </div>
                  {endingAssignmentId === a.id && <CheckCircle size={16} className="text-primary" />}
                </button>
              ))}
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => { resetForm(); setMode("list"); }} className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg">Back</button>
              <button
                onClick={handleEndAssignment}
                disabled={saving || !endingAssignmentId}
                className="px-4 py-2 text-sm font-medium text-white bg-destructive hover:bg-destructive/90 rounded-lg disabled:opacity-40"
              >
                {saving ? "Ending…" : "End Assignment"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
