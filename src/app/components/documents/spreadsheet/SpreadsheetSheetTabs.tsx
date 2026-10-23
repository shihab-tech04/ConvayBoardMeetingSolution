/**
 * Sheet tab bar — matches the spec's sheet management requirements.
 */
import { useState } from "react";
import { Plus, X, Check } from "lucide-react";

export interface SheetTab {
  id: string;
  name: string;
  hidden?: boolean;
}

interface Props {
  sheets: SheetTab[];
  activeSheetId: string;
  onActivate: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  canEdit: boolean;
}

export function SpreadsheetSheetTabs({
  sheets, activeSheetId, onActivate, onAdd, onRename, onDelete, onDuplicate, canEdit,
}: Props) {
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editName,    setEditName]    = useState("");
  const [contextId,   setContextId]   = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  function startEdit(sheet: SheetTab) {
    if (!canEdit) return;
    setEditingId(sheet.id);
    setEditName(sheet.name);
    setContextId(null);
  }

  function commitEdit() {
    if (editingId && editName.trim()) {
      onRename(editingId, editName.trim());
    }
    setEditingId(null);
  }

  function handleDelete(id: string) {
    if (sheets.length <= 1) return; // must have at least one sheet
    setConfirmDelete(id);
    setContextId(null);
  }

  function confirmDeleteAction() {
    if (confirmDelete) { onDelete(confirmDelete); setConfirmDelete(null); }
  }

  const visibleSheets = sheets.filter(s => !s.hidden);

  return (
    <div className="spreadsheet-sheet-tabs" role="tablist" aria-label="Worksheet tabs">
      {visibleSheets.map(sheet => {
        const isActive = sheet.id === activeSheetId;
        return (
          <div
            key={sheet.id}
            className={`spreadsheet-sheet-tab${isActive ? " spreadsheet-sheet-tab--active" : ""}`}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") onActivate(sheet.id); }}
          >
            {editingId === sheet.id ? (
              <input
                className="spreadsheet-sheet-tab__rename"
                value={editName}
                autoFocus
                onChange={e => setEditName(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={e => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                aria-label="Rename sheet"
              />
            ) : (
              <span
                className="spreadsheet-sheet-tab__name"
                onClick={() => onActivate(sheet.id)}
                onDoubleClick={() => startEdit(sheet)}
              >
                {sheet.name}
              </span>
            )}

            {/* Context menu trigger */}
            {canEdit && (
              <div className="spreadsheet-sheet-tab__menu-wrap">
                <button
                  type="button"
                  className="spreadsheet-sheet-tab__menu-btn"
                  aria-label={`Sheet options for ${sheet.name}`}
                  onClick={e => { e.stopPropagation(); setContextId(contextId === sheet.id ? null : sheet.id); }}
                >
                  ▾
                </button>
                {contextId === sheet.id && (
                  <ul className="spreadsheet-sheet-tab__context-menu" role="menu">
                    <li role="menuitem">
                      <button type="button" onClick={() => startEdit(sheet)}>Rename</button>
                    </li>
                    <li role="menuitem">
                      <button type="button" onClick={() => { onDuplicate(sheet.id); setContextId(null); }}>Duplicate</button>
                    </li>
                    <li role="menuitem">
                      <button type="button"
                        disabled={sheets.length <= 1}
                        onClick={() => handleDelete(sheet.id)}
                      >Delete</button>
                    </li>
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}

      {canEdit && (
        <button type="button" className="spreadsheet-sheet-tab spreadsheet-sheet-tab--add"
          onClick={onAdd} aria-label="Add sheet" title="Add sheet">
          <Plus size={12} strokeWidth={2.5} />
        </button>
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="spreadsheet-sheet-tab__confirm" role="alertdialog" aria-label="Confirm sheet deletion">
          <span>Delete &ldquo;{sheets.find(s => s.id === confirmDelete)?.name}&rdquo;?</span>
          <button type="button" className="btn btn--danger btn--sm" onClick={confirmDeleteAction}>
            <Check size={11} strokeWidth={2.5} /> Delete
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmDelete(null)}>
            <X size={11} strokeWidth={2.5} /> Cancel
          </button>
        </div>
      )}
    </div>
  );
}
