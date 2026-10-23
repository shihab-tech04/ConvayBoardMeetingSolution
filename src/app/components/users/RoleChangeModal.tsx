import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Shield, Plus, Minus, AlertTriangle, X } from "lucide-react";
import type { BmsUser } from "../../data/bmsUsers";
import type { SystemRole } from "../../data/mockData";
import { isSensitivePermission } from "../../data/userLifecycle";
import { AppSelectField } from "../forms/AppSelectField";

interface RoleChangeModalProps {
  user:        BmsUser;
  roles:       SystemRole[];
  onConfirm:   (newRoleId: string, reason: string) => void;
  onClose:     () => void;
}

export function RoleChangeModal({ user, roles, onConfirm, onClose }: RoleChangeModalProps) {
  const currentRoleId = user.role_id ?? user.role_ids?.[0] ?? "";
  const [selectedRoleId, setSelectedRoleId] = useState(currentRoleId);
  const [reason, setReason]                 = useState("");

  const currentRole  = roles.find((r) => r.id === currentRoleId);
  const proposedRole = roles.find((r) => r.id === selectedRoleId);

  const diff = useMemo(() => {
    const current  = new Set(currentRole?.permissions  ?? []);
    const proposed = new Set(proposedRole?.permissions ?? []);
    const added    = [...proposed].filter((p) => !current.has(p));
    const removed  = [...current].filter((p) => !proposed.has(p));
    return { added, removed };
  }, [currentRole, proposedRole]);

  const hasSensitiveAdded   = diff.added.some(isSensitivePermission);
  const hasSensitiveRemoved = diff.removed.some(isSensitivePermission);
  const isUnchanged         = selectedRoleId === currentRoleId;
  const canConfirm          = !isUnchanged && reason.trim().length > 0;

  const roleOptions = roles.map((r) => ({ value: r.id, label: r.name }));

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-2xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Shield size={20} className="text-primary" />
            <div>
              <p className="font-semibold text-foreground">Change Role</p>
              <p className="text-xs text-muted-foreground">{user.display_name ?? user.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Current Role</p>
            <p className="font-medium text-foreground">{currentRole?.name ?? "—"}</p>
          </div>

          <AppSelectField
            id="rc-new-role"
            label="New Role"
            value={selectedRoleId}
            onChange={setSelectedRoleId}
            options={roleOptions}
            required
          />

          {!isUnchanged && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Permission Changes</p>

              {diff.added.length > 0 && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-3 space-y-1">
                  <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Plus size={12} /> {diff.added.length} permission{diff.added.length !== 1 ? "s" : ""} added
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diff.added.map((p) => (
                      <span key={p} className={`text-xs px-2 py-0.5 rounded-full font-mono ${isSensitivePermission(p) ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"}`}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {diff.removed.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800 p-3 space-y-1">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400 flex items-center gap-1">
                    <Minus size={12} /> {diff.removed.length} permission{diff.removed.length !== 1 ? "s" : ""} removed
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {diff.removed.map((p) => (
                      <span key={p} className={`text-xs px-2 py-0.5 rounded-full font-mono ${isSensitivePermission(p) ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-300" : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"}`}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(hasSensitiveAdded || hasSensitiveRemoved) && (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                  <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    This role change affects <strong>sensitive permissions</strong>. Ensure this is authorised by the appropriate authority before proceeding.
                  </p>
                </div>
              )}

              {diff.added.length === 0 && diff.removed.length === 0 && (
                <p className="text-sm text-muted-foreground italic">No permission changes — both roles share the same permissions.</p>
              )}
            </div>
          )}

          {!isUnchanged && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1" htmlFor="rc-reason">
                Reason for Change <span className="text-red-500">*</span>
              </label>
              <textarea
                id="rc-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Provide a business justification for this role change…"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => canConfirm && onConfirm(selectedRoleId, reason)}
            disabled={!canConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Confirm Change
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
