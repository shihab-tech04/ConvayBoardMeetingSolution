import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { Building2, ArrowRight, AlertTriangle, X } from "lucide-react";
import type { BmsUser } from "../../data/bmsUsers";
import { useOrgUnitRegistry } from "../../data/boardMeetingData";
import { AppSelectField } from "../forms/AppSelectField";
import { AppDateField } from "../forms/AppDateField";

interface OrgTransferModalProps {
  user:      BmsUser;
  onConfirm: (params: {
    branchId:      string;
    divisionId?:   string;
    departmentId?: string;
    effectiveDate: string;
    reason:        string;
  }) => void;
  onClose: () => void;
}

export function OrgTransferModal({ user, onConfirm, onClose }: OrgTransferModalProps) {
  const orgReg = useOrgUnitRegistry();

  const isActive    = (u: { status?: string }) => !u.status || !["Inactive","Archived","inactive","archived"].includes(u.status);
  const branches    = useMemo(() => orgReg.items.filter((u) => u.unit_type === "Branch"     && isActive(u)), [orgReg.items]);
  const divisions   = useMemo(() => orgReg.items.filter((u) => u.unit_type === "Division"   && isActive(u)), [orgReg.items]);
  const departments = useMemo(() => orgReg.items.filter((u) => u.unit_type === "Department" && isActive(u)), [orgReg.items]);

  const [branchId,      setBranchId]      = useState(user.branch_id     ?? "");
  const [divisionId,    setDivisionId]    = useState(user.division_id   ?? "");
  const [departmentId,  setDepartmentId]  = useState(user.department_id ?? "");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [reason,        setReason]        = useState("");

  const filteredDivisions = useMemo(() =>
    branchId
      ? divisions.filter((d) => d.parent_unit_id === branchId || d.parent_unit === branches.find((b) => b.id === branchId)?.unit_name)
      : divisions,
  [divisions, branches, branchId]);

  const filteredDepartments = useMemo(() =>
    divisionId
      ? departments.filter((d) => d.parent_unit_id === divisionId || d.parent_unit === divisions.find((v) => v.id === divisionId)?.unit_name)
      : departments,
  [departments, divisions, divisionId]);

  const unchanged =
    branchId     === (user.branch_id     ?? "") &&
    divisionId   === (user.division_id   ?? "") &&
    departmentId === (user.department_id ?? "");

  const canConfirm = !unchanged && reason.trim().length > 0;

  const currentBranch = branches.find((b) => b.id === user.branch_id);
  const currentDiv    = divisions.find((d) => d.id === user.division_id);
  const currentDept   = departments.find((d) => d.id === user.department_id);
  const currentPath   = [currentBranch?.unit_name, currentDiv?.unit_name, currentDept?.unit_name].filter(Boolean).join(" › ");

  const newBranch = branches.find((b) => b.id === branchId);
  const newDiv    = filteredDivisions.find((d) => d.id === divisionId);
  const newDept   = filteredDepartments.find((d) => d.id === departmentId);
  const newPath   = [newBranch?.unit_name, newDiv?.unit_name, newDept?.unit_name].filter(Boolean).join(" › ");

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border rounded-xl shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Building2 size={20} className="text-primary" />
            <div>
              <p className="font-semibold text-foreground">Transfer Organisation Unit</p>
              <p className="text-xs text-muted-foreground">{user.display_name ?? user.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="rounded-lg bg-muted/50 border border-border p-4">
            <p className="text-xs text-muted-foreground mb-1">Current Organisation</p>
            <p className="font-medium text-foreground">{currentPath || "—"}</p>
          </div>

          <p className="text-sm font-medium text-foreground">New Organisation</p>

          <AppSelectField
            id="ot-branch"
            label="Branch"
            value={branchId}
            onChange={(v) => { setBranchId(v); setDivisionId(""); setDepartmentId(""); }}
            options={[{ value: "", label: "— Select Branch —" }, ...branches.map((b) => ({ value: b.id, label: b.unit_name }))]}
          />
          <AppSelectField
            id="ot-division"
            label="Division"
            value={divisionId}
            onChange={(v) => { setDivisionId(v); setDepartmentId(""); }}
            options={[{ value: "", label: "— Select Division —" }, ...filteredDivisions.map((d) => ({ value: d.id, label: d.unit_name }))]}
            disabled={!branchId}
          />
          <AppSelectField
            id="ot-dept"
            label="Department"
            value={departmentId}
            onChange={setDepartmentId}
            options={[{ value: "", label: "— Select Department —" }, ...filteredDepartments.map((d) => ({ value: d.id, label: d.unit_name }))]}
            disabled={!divisionId}
          />

          {!unchanged && currentPath && newPath && (
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <span className="text-sm text-muted-foreground">{currentPath}</span>
              <ArrowRight size={16} className="text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground">{newPath}</span>
            </div>
          )}

          {!unchanged && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                Transferring this user will update their organisational context. Any role or governance body memberships tied to the current unit will need to be reviewed separately.
              </p>
            </div>
          )}

          <AppDateField
            id="ot-effective"
            label="Effective Date"
            value={effectiveDate}
            onChange={setEffectiveDate}
            customPicker
          />

          <div>
            <label className="block text-xs font-medium text-foreground mb-1" htmlFor="ot-reason">
              Reason for Transfer <span className="text-red-500">*</span>
            </label>
            <textarea
              id="ot-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Provide a reason for this transfer…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-muted/80 rounded-lg transition-colors">
            Cancel
          </button>
          <button
            onClick={() => canConfirm && onConfirm({ branchId, divisionId, departmentId, effectiveDate, reason })}
            disabled={!canConfirm}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            Confirm Transfer
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
