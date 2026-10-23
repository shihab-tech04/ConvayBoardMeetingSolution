import { useState } from "react";
import { ChevronRight, Building2, Layers, LayoutGrid, Plus, Pencil, Trash2, AlertTriangle, List, Network, X, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useOrgUnitRegistry, generateId, type OrgUnit } from "../../data/boardMeetingData";
import { SConfirmModal } from "../../components/modals/SConfirmModal";
import { AppModal } from "../../components/modals/AppModal";
import { AppTextField } from "../../components/forms/AppTextField";
import { AppSelectField } from "../../components/forms/AppSelectField";

// ── types ─────────────────────────────────────────────────────────────────────

interface TreeNode extends OrgUnit {
  children: TreeNode[];
  depth: number;
}

// ── helpers ───────────────────────────────────────────────────────────────────

function buildTree(units: OrgUnit[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  units.forEach(u => map.set(u.id, { ...u, children: [], depth: 0 }));
  const roots: TreeNode[] = [];
  units.forEach(u => {
    const node = map.get(u.id)!;
    if (u.parent_unit_id && map.has(u.parent_unit_id)) {
      map.get(u.parent_unit_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  function setDepth(nodes: TreeNode[], d: number) {
    nodes.forEach(n => { n.depth = d; setDepth(n.children, d + 1); });
  }
  setDepth(roots, 0);
  return roots;
}

/** Returns all descendant IDs of a node (not including itself). */
function getAllDescendantIds(units: OrgUnit[], unitId: string): string[] {
  const children = units.filter(u => u.parent_unit_id === unitId);
  return children.flatMap(c => [c.id, ...getAllDescendantIds(units, c.id)]);
}

/** True if setting newParentId as parent of unitId would create a cycle. */
function wouldCreateCycle(units: OrgUnit[], unitId: string, newParentId: string): boolean {
  if (unitId === newParentId) return true;
  return getAllDescendantIds(units, unitId).includes(newParentId);
}

const UNIT_TYPES = ["Head Office", "Branch", "Division", "Department", "Secretariat", "Region", "Governing Body"];

// ── OrgUnitFormModal ──────────────────────────────────────────────────────────

interface OrgUnitFormModalProps {
  open: boolean;
  unit: OrgUnit | null; // null = add mode
  units: OrgUnit[];
  onClose: () => void;
  onSave: (data: Partial<OrgUnit> & { id?: string }) => void;
}

function OrgUnitFormModal({ open, unit, units, onClose, onSave }: OrgUnitFormModalProps) {
  const [unitName, setUnitName] = useState(unit?.unit_name ?? "");
  const [unitType, setUnitType] = useState(unit?.unit_type ?? "Branch");
  const [parentId, setParentId] = useState(unit?.parent_unit_id ?? "");
  const [head, setHead]         = useState(unit?.head ?? "");
  const [code, setCode]         = useState(unit?.code ?? "");
  const [status, setStatus]     = useState(unit?.status ?? "Active");
  const [errors, setErrors]     = useState<Record<string, string>>({});

  // Reset on open
  useState(() => {
    if (open) {
      setUnitName(unit?.unit_name ?? "");
      setUnitType(unit?.unit_type ?? "Branch");
      setParentId(unit?.parent_unit_id ?? "");
      setHead(unit?.head ?? "");
      setCode(unit?.code ?? "");
      setStatus(unit?.status ?? "Active");
      setErrors({});
    }
  });

  // Valid parent options: exclude self and all descendants
  const excludeIds = unit ? new Set([unit.id, ...getAllDescendantIds(units, unit.id)]) : new Set<string>();
  const parentOptions = [
    { id: "", label: "— None (Top Level) —" },
    ...units
      .filter(u => !excludeIds.has(u.id))
      .map(u => ({ id: u.id, label: `${u.unit_name} (${u.unit_type})` })),
  ];
  const parentLabelMap = new Map(parentOptions.map(o => [o.id, o.label]));
  const selectedParentLabel = parentLabelMap.get(parentId) ?? "— None (Top Level) —";
  const selectedParent = units.find(u => u.id === parentId);

  function validate() {
    const errs: Record<string, string> = {};
    if (!unitName.trim()) errs.unitName = "Unit name is required.";
    if (parentId && wouldCreateCycle(units, unit?.id ?? "", parentId)) {
      errs.parentId = "This parent would create a circular hierarchy.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    const parentUnit = units.find(u => u.id === parentId);
    onSave({
      id:             unit?.id,
      unit_name:      unitName.trim(),
      unit_type:      unitType,
      parent_unit_id: parentId || undefined,
      parent_unit:    parentUnit?.unit_name ?? "",
      head:           head.trim(),
      code:           code.trim(),
      status,
    });
    onClose();
  }

  return (
    <AppModal
      open={open}
      onClose={onClose}
      title={unit ? "Edit Organization Unit" : "Add Organization Unit"}
      icon={<Building2 size={15} />}
      size="lg"
      footer={
        <>
          <button onClick={onClose} style={{ padding: "6px 16px", borderRadius: 8, background: "var(--color-muted)", border: "1px solid var(--color-border)", cursor: "pointer", fontSize: "0.82rem" }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "6px 16px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600 }}>
            {unit ? "Save Changes" : "Add Unit"}
          </button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <AppTextField id="ouf-name" label="Unit Name" value={unitName} onChange={v => { setUnitName(v); setErrors(e => ({ ...e, unitName: "" })); }} required autoComplete="off" />
            {errors.unitName && <p style={{ color: "#ef4444", fontSize: "0.73rem", marginTop: 3 }}>{errors.unitName}</p>}
          </div>
          <AppSelectField id="ouf-type" label="Unit Type" value={unitType} onChange={setUnitType} options={UNIT_TYPES} required />
          <div>
            <AppSelectField
              id="ouf-parent"
              label="Parent Unit"
              value={selectedParentLabel}
              onChange={label => {
                const match = parentOptions.find(o => o.label === label);
                setParentId(match?.id ?? "");
                setErrors(e => ({ ...e, parentId: "" }));
              }}
              options={parentOptions.map(o => o.label)}
              helper={selectedParent ? `Type: ${selectedParent.unit_type}` : "Leave blank for a top-level unit"}
            />
            {errors.parentId && <p style={{ color: "#ef4444", fontSize: "0.73rem", marginTop: 3 }}>{errors.parentId}</p>}
          </div>
          <AppTextField id="ouf-head" label="Unit Head" value={head} onChange={setHead} placeholder="Name of unit head" />
          <AppTextField id="ouf-code" label="Unit Code" value={code} onChange={setCode} placeholder="e.g. FIN, OPS" helper="Short identifier" />
          <AppSelectField id="ouf-status" label="Status" value={status} onChange={setStatus} options={["Active", "Inactive"]} />
        </div>
      </div>
    </AppModal>
  );
}

// ── OrgUnitTreeNode ───────────────────────────────────────────────────────────

function OrgUnitTreeNode({ node, onEdit, onDelete }: { node: TreeNode; onEdit: (u: OrgUnit) => void; onDelete: (u: OrgUnit) => void }) {
  const [expanded, setExpanded] = useState(node.depth < 2);
  const hasChildren = node.children.length > 0;

  const typeColor: Record<string, string> = {
    "Head Office": "#6366f1", Branch: "#3b82f6", Division: "#8b5cf6",
    Department: "#06b6d4", Secretariat: "#10b981", Region: "#f59e0b",
    "Governing Body": "#ef4444",
  };
  const color = typeColor[node.unit_type] ?? "#94a3b8";

  return (
    <div>
      <div
        style={{
          display: "grid", gridTemplateColumns: "1fr 110px 140px 70px 80px 88px",
          alignItems: "center", padding: "0.45rem 0.75rem",
          paddingLeft: `${0.75 + node.depth * 1.5}rem`,
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-card)",
          transition: "background 0.1s",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-muted)")}
        onMouseLeave={e => (e.currentTarget.style.background = "var(--color-card)")}
      >
        {/* Name + expander */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", minWidth: 0 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            style={{ visibility: hasChildren ? "visible" : "hidden", background: "none", border: "none", cursor: "pointer", padding: 2, color: "var(--color-muted-foreground)", flexShrink: 0 }}
          >
            <ChevronRight size={13} style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
          </button>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {node.unit_name}
          </span>
        </div>
        {/* Type */}
        <span style={{ fontSize: "0.72rem", color, fontWeight: 600 }}>{node.unit_type}</span>
        {/* Head */}
        <span style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{node.head || "—"}</span>
        {/* Members */}
        <span style={{ fontSize: "0.78rem", color: "var(--color-muted-foreground)", textAlign: "center" }}>{node.member_count}</span>
        {/* Status */}
        <span style={{
          fontSize: "0.68rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999,
          background: node.status === "Active" ? "#22c55e22" : "#6b728022",
          color: node.status === "Active" ? "#22c55e" : "#6b7280",
          border: `1px solid ${node.status === "Active" ? "#22c55e44" : "#6b728044"}`,
        }}>{node.status}</span>
        {/* Actions */}
        <div style={{ display: "flex", gap: "0.3rem", justifyContent: "flex-end" }}>
          <button onClick={() => onEdit(node)} style={{ padding: "3px 7px", borderRadius: 6, background: "var(--color-muted)", border: "1px solid var(--color-border)", cursor: "pointer", color: "var(--color-foreground)", display: "flex", alignItems: "center" }} title="Edit">
            <Pencil size={11} />
          </button>
          <button onClick={() => onDelete(node)} style={{ padding: "3px 7px", borderRadius: 6, background: "#fee2e2", border: "1px solid #fecaca", cursor: "pointer", color: "#ef4444", display: "flex", alignItems: "center" }} title="Delete">
            <Trash2 size={11} />
          </button>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {node.children.map(child => (
            <OrgUnitTreeNode key={child.id} node={child} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── ApprovalListPage ──────────────────────────────────────────────────────────

export function ApprovalListPage() {
  const registry = useOrgUnitRegistry();
  const units = registry.items;

  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [formOpen, setFormOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<OrgUnit | null>(null);
  const [deleteUnit, setDeleteUnit] = useState<OrgUnit | null>(null);

  const tree = buildTree(units);

  // Stats
  const total     = units.length;
  const branches  = units.filter(u => u.unit_type === "Branch").length;
  const divisions = units.filter(u => u.unit_type === "Division").length;
  const depts     = units.filter(u => u.unit_type === "Department").length;
  const active    = units.filter(u => u.status === "Active").length;

  function handleAdd() {
    setEditUnit(null);
    setFormOpen(true);
  }

  function handleEdit(u: OrgUnit) {
    setEditUnit(u);
    setFormOpen(true);
  }

  function handleDeleteClick(u: OrgUnit) {
    setDeleteUnit(u);
  }

  function handleDeleteConfirm() {
    if (!deleteUnit) return;
    const hasChildren = units.some(u => u.parent_unit_id === deleteUnit.id);
    if (hasChildren) {
      toast.error("Cannot delete: this unit has child units. Reassign them first.");
      setDeleteUnit(null);
      return;
    }
    registry.remove(deleteUnit.id);
    toast.success(`"${deleteUnit.unit_name}" deleted.`);
    setDeleteUnit(null);
  }

  function handleSave(data: Partial<OrgUnit> & { id?: string }) {
    if (data.id) {
      registry.update(data.id, data as never);
      toast.success("Organization unit updated.");
    } else {
      const newId = generateId("OU", units.map(u => u.unit_id));
      registry.add({ ...data, id: newId, unit_id: newId, member_count: "0", created_at: new Date().toISOString() } as never);
      toast.success("Organization unit added.");
    }
  }

  const deleteHasChildren = deleteUnit ? units.some(u => u.parent_unit_id === deleteUnit.id) : false;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem", flexWrap: "wrap", gap: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--color-foreground)", margin: 0 }}>Organization Structure</h1>
          <p style={{ fontSize: "0.82rem", color: "var(--color-muted-foreground)", margin: "0.2rem 0 0" }}>
            Manage organizational units, branches, divisions, and departments.
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {/* View toggle */}
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", border: "1px solid var(--color-border)" }}>
            <button onClick={() => setViewMode("tree")} style={{ padding: "6px 12px", background: viewMode === "tree" ? "var(--color-primary)" : "var(--color-card)", color: viewMode === "tree" ? "#fff" : "var(--color-foreground)", border: "none", cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 4 }}>
              <Network size={13} /> Tree
            </button>
            <button onClick={() => setViewMode("list")} style={{ padding: "6px 12px", background: viewMode === "list" ? "var(--color-primary)" : "var(--color-card)", color: viewMode === "list" ? "#fff" : "var(--color-foreground)", border: "none", cursor: "pointer", fontSize: "0.78rem", display: "flex", alignItems: "center", gap: 4 }}>
              <List size={13} /> List
            </button>
          </div>
          <button
            onClick={handleAdd}
            style={{ padding: "7px 14px", borderRadius: 8, background: "var(--color-primary)", color: "#fff", border: "none", cursor: "pointer", fontSize: "0.82rem", fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}
          >
            <Plus size={14} /> Add Unit
          </button>
        </div>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.75rem", marginBottom: "1.25rem" }}>
        {[
          { label: "Total Units", value: total, color: "var(--color-primary)" },
          { label: "Active",      value: active,    color: "#22c55e" },
          { label: "Branches",   value: branches,  color: "#3b82f6" },
          { label: "Divisions",  value: divisions, color: "#8b5cf6" },
          { label: "Departments",value: depts,     color: "#06b6d4" },
        ].map(k => (
          <div key={k.label} style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "0.85rem 1rem" }}>
            <div style={{ fontSize: "1.5rem", fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: "0.72rem", color: "var(--color-muted-foreground)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden" }}>
        {viewMode === "tree" ? (
          <>
            {/* Tree header */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 110px 140px 70px 80px 88px", padding: "0.5rem 0.75rem", background: "var(--color-muted)", borderBottom: "1px solid var(--color-border)", fontSize: "0.72rem", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              <span style={{ paddingLeft: "1.5rem" }}>Unit Name</span>
              <span>Type</span>
              <span>Head</span>
              <span>Members</span>
              <span>Status</span>
              <span style={{ textAlign: "right" }}>Actions</span>
            </div>
            {tree.length === 0 ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--color-muted-foreground)" }}>
                <Building2 size={40} style={{ margin: "0 auto 1rem", opacity: 0.3, display: "block" }} />
                <p>No organization units yet. Click "Add Unit" to create the first one.</p>
              </div>
            ) : tree.map(node => (
              <OrgUnitTreeNode key={node.id} node={node} onEdit={handleEdit} onDelete={handleDeleteClick} />
            ))}
          </>
        ) : (
          /* List view */
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ background: "var(--color-muted)", borderBottom: "1px solid var(--color-border)" }}>
                {["Unit Name", "Type", "Parent Unit", "Head", "Members", "Status", "Actions"].map(h => (
                  <th key={h} style={{ padding: "0.5rem 0.75rem", textAlign: "left", fontSize: "0.72rem", fontWeight: 700, color: "var(--color-muted-foreground)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {units.map(u => (
                <tr key={u.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{u.unit_name}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{u.unit_type}</td>
                  <td style={{ padding: "0.5rem 0.75rem", color: "var(--color-muted-foreground)" }}>{u.parent_unit || "—"}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{u.head || "—"}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>{u.member_count}</td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>
                    <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "2px 8px", borderRadius: 999, background: u.status === "Active" ? "#22c55e22" : "#6b728022", color: u.status === "Active" ? "#22c55e" : "#6b7280", border: `1px solid ${u.status === "Active" ? "#22c55e44" : "#6b728044"}` }}>
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem 0.75rem" }}>
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      <button onClick={() => handleEdit(u)} style={{ padding: "3px 8px", borderRadius: 6, background: "var(--color-muted)", border: "1px solid var(--color-border)", cursor: "pointer", fontSize: "0.75rem" }}>Edit</button>
                      <button onClick={() => handleDeleteClick(u)} style={{ padding: "3px 8px", borderRadius: 6, background: "#fee2e2", border: "1px solid #fecaca", cursor: "pointer", color: "#ef4444", fontSize: "0.75rem" }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add/Edit Modal */}
      <OrgUnitFormModal
        open={formOpen}
        unit={editUnit}
        units={units}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
      />

      {/* Delete confirm */}
      <SConfirmModal
        title={deleteHasChildren ? "Cannot Delete — Has Children" : `Delete "${deleteUnit?.unit_name}"?`}
        message={
          deleteHasChildren
            ? `"${deleteUnit?.unit_name}" has child units. You must reassign or delete them before deleting this unit.`
            : `This will permanently remove "${deleteUnit?.unit_name}". This action cannot be undone.`
        }
        confirmLabel={deleteHasChildren ? "OK" : "Delete"}
        danger={!deleteHasChildren}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteUnit(null)}
      />
    </div>
  );
}
