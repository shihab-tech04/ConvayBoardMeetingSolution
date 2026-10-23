import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { AppCheckbox } from "../forms/AppCheckbox";
import { AppSearchField } from "../forms/AppSearchField";
import { type PermGroupDef } from "../../data/permissions";
import { usePermissionRegistry } from "../../hooks/usePermissionRegistry";
import { PermissionGroup } from "./PermissionGroup";

interface PermissionsPanelProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function PermissionsPanel({ selectedIds, onChange }: PermissionsPanelProps) {
  const { permissionGroups, allPermissionIds } = usePermissionRegistry();
  const [permSearch, setPermSearch] = useState("");
  const q = permSearch.trim().toLowerCase();

  const filteredGroups: PermGroupDef[] = q === "" ? permissionGroups : permissionGroups.reduce<PermGroupDef[]>((acc, g) => {
    const groupMatch = g.label.toLowerCase().includes(q);
    const matchPerms = g.permissions.filter((p) => p.label.toLowerCase().includes(q));
    if (groupMatch || matchPerms.length > 0) acc.push({ ...g, permissions: groupMatch ? g.permissions : matchPerms });
    return acc;
  }, []);

  const allSelected = allPermissionIds.length > 0 && allPermissionIds.every((id) => selectedIds.includes(id));
  const someSelected = selectedIds.length > 0 && !allSelected;

  return (
    <div className="permissions-panel">
      <div className="permissions-panel__header">
        <div className="permissions-panel__search-wrapper">
          <AppSearchField
            value={permSearch}
            onChange={setPermSearch}
            placeholder="Search permissions…"
            label="Search permissions"
            size="compact"
          />
        </div>
        <div className="permissions-panel__controls">
          <div className="permissions-panel__select-all">
            <AppCheckbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={(checked) => onChange(checked ? [...allPermissionIds] : [])}
              ariaLabel="Select all permissions"
              label="Select all permissions"
            />
          </div>
          <div className="permissions-panel__control-actions">
            <span className="permissions-panel__count-badge">{selectedIds.length} / {allPermissionIds.length}</span>
            <button
              type="button"
              onClick={() => onChange([])}
              aria-label="Reset all permissions"
              className="permissions-panel__reset-btn"
            >
              <RotateCcw size={9} strokeWidth={2} />{"Reset"}
            </button>
          </div>
        </div>
      </div>

      <div className="permissions-panel__body">
        {filteredGroups.length === 0 ? (
          <div className="permissions-panel__empty">
            <p className="permissions-panel__empty-title">{"No permissions found"}</p>
            <p className="permissions-panel__empty-subtitle">{"Try a different search term."}</p>
          </div>
        ) : filteredGroups.map((group) => (
          <PermissionGroup key={group.id} group={group} selectedIds={selectedIds} onChange={onChange} />
        ))}
      </div>
    </div>
  );
}
