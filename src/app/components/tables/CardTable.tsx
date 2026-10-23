import { useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { StatusBadge } from "../badges/StatusBadge";
import type { ColDef, FlatCol, RowAction, TableRow } from "../../pages/modulePageUtils";
import { isAttachmentArray } from "../attachments/attachmentTypes";

interface CardTableProps {
  cols: ColDef[];
  rows: TableRow[];
  actions?: RowAction[];
  onRowClick?: (row: TableRow) => void;
  onActionClick?: (actionId: string, row: TableRow) => void;
  noCard?: boolean;
  "aria-label"?: string;
  emptyLabel?: string;
  // ── Expandable row support (opt-in — all other tables unchanged) ──────────
  expandedRowIds?: Set<string>;
  onToggleRow?: (rowId: string) => void;
  renderExpandedRow?: (row: TableRow, colCount: number) => ReactNode;
}

// ── Resolve truncation class from column key or explicit override ─────────────
const COMPACT_KEYS = new Set([
  "method", "status", "type", "typeLabel", "access", "accessLabel",
  "active_status", "approval_status", "payment_status", "transfer_status",
  "dormant_status", "match_status", "refund_status", "verif_status", "resolution_status",
  "count", "users", "users_count", "permissions_count",
  "zone", "circle", "ay", "date", "created_at", "updated_at",
  "reg_date", "registration_date", "issue_date", "quantity", "qty",
]);
const LONG_KEYS = new Set([
  "endpoint", "api_endpoint", "apiEndpoint", "url", "link",
  "email", "address", "description", "remarks", "reason",
  "message", "details", "summary", "activity_summary", "last_action",
]);

function cellTextClass(col: FlatCol): string {
  if (col.truncate === "none")    return "";
  if (col.truncate === "compact") return "card-table__cell-text card-table__cell-text--compact";
  if (col.truncate === "long")    return "card-table__cell-text card-table__cell-text--long";
  if (col.truncate === "normal")  return "card-table__cell-text card-table__cell-text--normal";
  if (COMPACT_KEYS.has(col.key)) return "card-table__cell-text card-table__cell-text--compact";
  if (LONG_KEYS.has(col.key))    return "card-table__cell-text card-table__cell-text--long";
  return "card-table__cell-text card-table__cell-text--normal";
}

export function CardTable({
  cols, rows, actions, onRowClick, onActionClick, noCard,
  "aria-label": ariaLabel, emptyLabel,
  expandedRowIds, onToggleRow, renderExpandedRow,
}: CardTableProps) {
  const [hovered, setHovered] = useState<number | null>(null);

  const flat: FlatCol[] = cols.flatMap(c => c.type === "col" ? [c.col] : c.group.cols);
  const hasGroups = cols.some(c => c.type === "group");
  const colCount  = flat.length + (actions ? 1 : 0);

  const translateHeader = (_headerKey: string | undefined, fallback: string): string => fallback;

  const getRowId = (row: TableRow): string =>
    String(row["id"] ?? row[flat[0]?.key] ?? "").trim();

  // When expandable, row click toggles; otherwise falls back to onRowClick
  const handleRowClick = (row: TableRow) => {
    if (onToggleRow) {
      onToggleRow(getRowId(row));
    } else {
      onRowClick?.(row);
    }
  };

  const isClickable = !!(onToggleRow || onRowClick);

  return (
    <div className={`card-table${noCard ? "" : " card-table--bordered"}`}>
      <div className="card-table__wrapper">
        <table className="card-table__table" aria-label={ariaLabel}>
          <thead>
            {hasGroups && (
              <tr className="card-table__header-group">
                {cols.map((c, ci) =>
                  c.type === "col" ? (
                    <th key={ci} rowSpan={2} scope="col" className="card-table__th card-table__th--secondary">
                      <span className="card-table__th-text" title={translateHeader(c.col.headerKey, c.col.label)}>
                        {translateHeader(c.col.headerKey, c.col.label)}
                      </span>
                    </th>
                  ) : (
                    <th key={ci} colSpan={c.group.cols.length} scope="colgroup" className="card-table__th card-table__th--group">
                      {c.group.label}
                    </th>
                  )
                )}
                {actions && (
                  <th rowSpan={2} scope="col" className="card-table__th card-table__th--secondary" style={{ textAlign: "center" }}>
                    {"Actions"}
                  </th>
                )}
              </tr>
            )}
            <tr className="card-table__header-standard">
              {hasGroups
                ? cols.flatMap((c, ci) =>
                    c.type === "col"
                      ? []
                      : c.group.cols.map((sc, sci) => (
                          <th key={`${ci}-${sci}`} scope="col" className="card-table__th card-table__th--sub">
                            <span className="card-table__th-text" title={translateHeader(sc.headerKey, sc.label)}>
                              {translateHeader(sc.headerKey, sc.label)}
                            </span>
                          </th>
                        ))
                  )
                : flat.map((col, ci) => (
                    <th key={ci} scope="col" className="card-table__th card-table__th--secondary">
                      <span className="card-table__th-text" title={translateHeader(col.headerKey, col.label)}>
                        {translateHeader(col.headerKey, col.label)}
                      </span>
                    </th>
                  ))}
              {!hasGroups && actions && (
                <th scope="col" className="card-table__th card-table__th--secondary" style={{ textAlign: "center" }}>
                  {"Actions"}
                </th>
              )}
            </tr>
          </thead>

          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="card-table__empty">
                  {emptyLabel ?? "No records found"}
                </td>
              </tr>
            ) : (
              rows.flatMap((row, ri) => {
                const rid      = getRowId(row);
                const isExpanded = onToggleRow ? (expandedRowIds?.has(rid) ?? false) : false;

                const mainRow = (
                  <tr
                    key={ri}
                    tabIndex={isClickable ? 0 : undefined}
                    aria-expanded={onToggleRow ? isExpanded : undefined}
                    aria-controls={onToggleRow ? `exp-row-${rid}` : undefined}
                    onMouseEnter={() => setHovered(ri)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => handleRowClick(row)}
                    onKeyDown={isClickable ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleRowClick(row);
                      }
                    } : undefined}
                    className={[
                      "card-table__row",
                      ri % 2 === 1 ? "card-table__row--striped" : "",
                      isClickable ? "card-table__row--clickable" : "",
                      hovered === ri ? "card-table__row--hovered" : "",
                    ].filter(Boolean).join(" ")}
                  >
                    {flat.map((col, ci) => {
                      const rawVal = row[col.key];
                      const displayVal = rawVal === null || rawVal === undefined
                        ? "—"
                        : isAttachmentArray(rawVal)
                          ? `${rawVal.length} file${rawVal.length !== 1 ? "s" : ""}`
                          : String(rawVal);
                      const cls = cellTextClass(col);
                      // For expandable rows, first non-badge column shows the expand chevron inline
                      const showChevron = onToggleRow && ci === 0 && !col.badge;
                      return (
                        <td
                          key={ci}
                          className={[
                            "card-table__td",
                            hasGroups && ci > 0 ? "card-table__td--right" : "card-table__td--left",
                            col.mono ? "card-table__td--mono" : "",
                            col.truncate === "none" ? "card-table__td--no-truncate" : "",
                          ].filter(Boolean).join(" ")}
                        >
                          {col.renderCell ? (
                            showChevron ? (
                              <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
                                <ChevronRight
                                  size={13}
                                  aria-hidden="true"
                                  style={{
                                    flexShrink: 0, marginTop: 3,
                                    color: "var(--color-text-secondary)",
                                    transform: isExpanded ? "rotate(90deg)" : "none",
                                    transition: "transform 0.15s",
                                  }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  {col.renderCell(rawVal, row)}
                                </div>
                              </div>
                            ) : col.renderCell(rawVal, row)
                          ) : col.badge ? (
                            <StatusBadge value={displayVal} />
                          ) : displayVal === "—" ? (
                            <span className="card-table__td--muted">—</span>
                          ) : showChevron ? (
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <ChevronRight
                                size={13}
                                aria-hidden="true"
                                style={{
                                  flexShrink: 0,
                                  color: "var(--color-text-secondary)",
                                  transform: isExpanded ? "rotate(90deg)" : "none",
                                  transition: "transform 0.15s",
                                }}
                              />
                              <span className={cls} title={displayVal}>{displayVal}</span>
                            </div>
                          ) : (
                            <span className={cls} title={displayVal}>
                              {displayVal}
                            </span>
                          )}
                        </td>
                      );
                    })}
                    {actions && actions.length > 0 && (
                      <td className="card-table__actions">
                        <div className="card-table__action-buttons">
                          {actions.map(action => {
                            const ActionIcon = action.icon;
                            return (
                              <button
                                key={action.id}
                                type="button"
                                aria-label={`${action.label} — ${rid}`}
                                title={action.label}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onActionClick?.(action.id, row);
                                }}
                                className="card-table__action-btn card-table__action-btn--seemore"
                                style={action.color ? { color: action.color } : undefined}
                              >
                                <ActionIcon size={13} strokeWidth={2} aria-hidden="true" />
                                <span aria-hidden="true">{action.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    )}
                  </tr>
                );

                const expandedRow = onToggleRow && isExpanded && renderExpandedRow ? (
                  <tr key={`${ri}-exp`} id={`exp-row-${rid}`} className="card-table__row card-table__row--expanded-content">
                    <td colSpan={colCount} style={{ padding: 0, border: "none" }}>
                      {renderExpandedRow(row, colCount)}
                    </td>
                  </tr>
                ) : null;

                return expandedRow ? [mainRow, expandedRow] : [mainRow];
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
