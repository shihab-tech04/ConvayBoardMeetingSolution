import { memo, useCallback, type ReactNode } from "react";
import { CardTable } from "./CardTable";
import { UnifiedMobileCard } from "./UnifiedMobileCard";
import type { ColDef, RowAction, TableRow, MobileCardMapping } from "../../pages/modulePageUtils";

interface ResponsiveTableProps {
  cols: ColDef[];
  rows: TableRow[];
  actions?: RowAction[];
  onRowClick?: (row: TableRow) => void;
  onActionClick?: (actionId: string, row: TableRow) => void;
  noCard?: boolean;
  mobileCardMapping?: MobileCardMapping;
  "aria-label"?: string;
  emptyLabel?: string;
  // ── Expandable row support (opt-in) ───────────────────────────────────────
  expandedRowIds?: Set<string>;
  onToggleRow?: (rowId: string) => void;
  renderExpandedRow?: (row: TableRow, colCount: number) => ReactNode;
  renderExpandedMobileContent?: (row: TableRow) => ReactNode;
}

export const ResponsiveTable = memo(function ResponsiveTable({
  cols,
  rows,
  actions,
  onRowClick,
  onActionClick,
  noCard,
  mobileCardMapping,
  "aria-label": ariaLabel,
  emptyLabel,
  expandedRowIds,
  onToggleRow,
  renderExpandedRow,
  renderExpandedMobileContent,
}: ResponsiveTableProps) {
  const makeCardClick = useCallback(
    (row: TableRow) => {
      if (onToggleRow) {
        const rid = String(row["id"] ?? "");
        return () => onToggleRow(rid);
      }
      return onRowClick ? () => onRowClick(row) : undefined;
    },
    [onRowClick, onToggleRow],
  );

  // Effective action handler: prefer onActionClick, fall back to onRowClick
  const handleActionClick = useCallback(
    (actionId: string, row: TableRow) => {
      if (onActionClick) {
        onActionClick(actionId, row);
      } else {
        onRowClick?.(row);
      }
    },
    [onActionClick, onRowClick],
  );

  return (
    <>
      {/* Desktop table view */}
      <CardTable
        cols={cols}
        rows={rows}
        actions={actions}
        onRowClick={onToggleRow ? undefined : onRowClick}
        onActionClick={handleActionClick}
        noCard={noCard}
        aria-label={ariaLabel}
        emptyLabel={emptyLabel}
        expandedRowIds={expandedRowIds}
        onToggleRow={onToggleRow}
        renderExpandedRow={renderExpandedRow}
      />

      {/* Mobile card view */}
      <div
        className="mobile-table-card-list"
        role="list"
        aria-label={ariaLabel}
      >
        {rows.length === 0 ? (
          <p className="mobile-table-card-list__empty" role="status">
            {emptyLabel ?? "Nothing to display."}
          </p>
        ) : (
          rows.map((row, index) => {
            const rid = String(row["id"] ?? "");
            const isExpanded = onToggleRow ? (expandedRowIds?.has(rid) ?? false) : false;
            return (
              <div key={index}>
                <UnifiedMobileCard
                  row={row}
                  cols={cols}
                  onCardClick={makeCardClick(row)}
                  mobileCardMapping={mobileCardMapping}
                />
                {isExpanded && renderExpandedMobileContent && (
                  <div style={{ marginTop: -8, marginBottom: 8 }}>
                    {renderExpandedMobileContent(row)}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </>
  );
});
