import { useState, useCallback, type ReactNode } from "react";
import { Filter, Download, Printer } from "lucide-react";
import { Button } from "../buttons/Button";
import { AppSearchField } from "../forms/AppSearchField";
import { FilterPanel } from "../filters/FilterPanel";
import { MobileFilterOverlay } from "../filters/MobileFilterOverlay";
import { AppliedFilterChips } from "../filters/AppliedFilterChips";
import { TabBar } from "../tabs/TabBar";
import { ResponsiveTable } from "./ResponsiveTable";
import { Pagination } from "../shared/Pagination";
import { useUIState } from "../../hooks/useUI";
import type { ColDef, RowAction, TableRow, MobileCardMapping, FilterDef } from "../../pages/modulePageUtils";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TabDef {
  id: string;
  label: string;
  count?: number;
}

export interface UnifiedDataTableProps {
  /** Card title displayed in the toolbar */
  title?: string;
  /** Plural count label (e.g. "tasks"). Defaults to "records". */
  countLabel?: string;
  /** Singular count label (e.g. "task"). Defaults to stripping trailing "s" from countLabel. */
  singularLabel?: string;
  /** Total records in the current filtered view — used for count badge + pagination */
  totalCount: number;

  // Table data
  cols: ColDef[];
  rows: TableRow[];
  actions?: RowAction[];
  /**
   * Preferred unified handler. Called when the user clicks a row, presses
   * Enter/Space on a focused row, clicks the View action, or taps a mobile card.
   * When provided, this takes precedence over onRowClick + onActionClick.
   */
  onViewRow?: (row: TableRow) => void;
  /** @deprecated Prefer onViewRow. Kept for GeneratedTablePage backward compat. */
  onRowClick?: (row: TableRow) => void;
  /** @deprecated Prefer onViewRow. Kept for GeneratedTablePage backward compat. */
  onActionClick?: (actionId: string, row: TableRow) => void;
  "aria-label"?: string;

  // Search
  search?: string;
  searchPlaceholder?: string;
  onSearchChange?: (v: string) => void;

  // Filters
  filterDefs?: FilterDef[];
  filterValues?: Record<string, string>;
  appliedFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onApplyFilters?: () => void;
  onResetFilters?: () => void;

  // Tabs
  tabs?: TabDef[];
  activeTab?: string;
  onTabChange?: (id: string) => void;

  // Toolbar extras
  onExport?: () => void;
  onPrint?: () => void;

  // Pagination (1-based external page)
  page?: number;
  perPage?: number;
  onPageChange?: (p: number) => void;

  // States
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyLabel?: string;
  filteredEmptyLabel?: string;

  // Mobile
  mobileCardMapping?: MobileCardMapping;

  /** "page" = full-page card (default). "compact" = no toolbar search/filter/export. */
  variant?: "page" | "compact";

  // ── Expandable row support (opt-in — default behavior unchanged) ──────────
  expandedRowIds?: Set<string>;
  onToggleRow?: (rowId: string) => void;
  renderExpandedRow?: (row: TableRow, colCount: number) => ReactNode;
  renderExpandedMobileContent?: (row: TableRow) => ReactNode;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function UnifiedDataTable({
  title,
  countLabel = "records",
  singularLabel,
  totalCount,
  cols,
  rows,
  actions,
  onViewRow,
  onRowClick,
  onActionClick,
  "aria-label": ariaLabel,
  search = "",
  searchPlaceholder = "Search…",
  onSearchChange,
  filterDefs,
  filterValues = {},
  appliedFilters = {},
  onFilterChange,
  onApplyFilters,
  onResetFilters,
  tabs,
  activeTab,
  onTabChange,
  onExport,
  onPrint,
  page = 1,
  perPage = 10,
  onPageChange,
  loading,
  error,
  onRetry,
  emptyLabel,
  filteredEmptyLabel,
  mobileCardMapping,
  variant = "page",
  expandedRowIds,
  onToggleRow,
  renderExpandedRow,
  renderExpandedMobileContent,
}: UnifiedDataTableProps) {
  const { isDesktop } = useUIState();
  const [showFilter, setShowFilter] = useState(false);

  // onViewRow is the canonical handler — it unifies row click + View action click.
  // Fall back to separate onRowClick/onActionClick for GenPage backward compat.
  const effectiveRowClick = onViewRow ?? onRowClick;
  const effectiveActionClick = onViewRow
    ? (_actionId: string, row: TableRow) => onViewRow(row)
    : onActionClick;

  const hasActiveFilters = Object.values(appliedFilters).some(v => !!v);
  const canFilter = !!filterDefs && filterDefs.length > 0;
  const isCompact = variant === "compact";
  const effectiveLabel = totalCount === 1
    ? (singularLabel ?? countLabel.replace(/s$/, ""))
    : countLabel;

  const handleApply = useCallback(() => {
    onApplyFilters?.();
    setShowFilter(false);
  }, [onApplyFilters]);

  const handleReset = useCallback(() => {
    onResetFilters?.();
    setShowFilter(false);
  }, [onResetFilters]);

  const tableLabel = ariaLabel ?? title;

  return (
    <div className="udt">

      {/* ── Toolbar ── */}
      {!isCompact && (
        <div className="udt__toolbar">
          <div className="udt__toolbar-left">
            <span className="udt__title">{title}</span>
            <span className="udt__count-badge" aria-live="polite" aria-atomic="true">
              {totalCount} {effectiveLabel}
            </span>
          </div>
          <div className="udt__toolbar-right">
            {onSearchChange && (
              <div className="udt__search-wrap">
                <AppSearchField
                  value={search}
                  onChange={onSearchChange}
                  placeholder={searchPlaceholder}
                  label={searchPlaceholder}
                  size="compact"
                />
              </div>
            )}
            {canFilter && (
              <Button
                type="button"
                variant={showFilter || hasActiveFilters ? "secondary" : "ghost"}
                size="sm"
                leadingIcon={Filter}
                aria-expanded={showFilter}
                onClick={() => setShowFilter(s => !s)}
              >
                Filter
              </Button>
            )}
            {onExport && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leadingIcon={Download}
                onClick={onExport}
              >
                Export
              </Button>
            )}
            {onPrint && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leadingIcon={Printer}
                onClick={onPrint}
              >
                Print
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ── Tabs ── */}
      {tabs && tabs.length > 0 && onTabChange && (
        <div className="udt__tabs">
          <TabBar
            tabs={tabs}
            active={activeTab ?? tabs[0].id}
            onChange={onTabChange}
          />
        </div>
      )}

      {/* ── Desktop filter panel ── */}
      {!isCompact && canFilter && isDesktop && showFilter && filterDefs && (
        <div className="udt__filter-panel">
          <FilterPanel
            filters={filterDefs}
            values={filterValues}
            onChange={onFilterChange ?? (() => {})}
            onApply={handleApply}
            onReset={handleReset}
          />
        </div>
      )}

      {/* ── Applied filter chips ── */}
      {!isCompact && hasActiveFilters && (
        <AppliedFilterChips
          values={appliedFilters}
          onClear={handleReset}
          inCard
        />
      )}

      {/* ── Table body ── */}
      <div className="udt__body">
        {loading ? (
          <div className="udt__state" role="status" aria-live="polite">
            <span className="udt__state-text">Loading…</span>
          </div>
        ) : error ? (
          <div className="udt__state">
            <p className="udt__state-text">{error}</p>
            {onRetry && (
              <Button type="button" variant="secondary" size="sm" onClick={onRetry}>
                Retry
              </Button>
            )}
          </div>
        ) : (
          <ResponsiveTable
            cols={cols}
            rows={rows}
            actions={actions}
            onRowClick={onToggleRow ? undefined : effectiveRowClick}
            onActionClick={effectiveActionClick}
            mobileCardMapping={mobileCardMapping}
            aria-label={tableLabel}
            noCard
            emptyLabel={
              hasActiveFilters || !!search
                ? (filteredEmptyLabel ?? "No matching records. Try adjusting your search or filters.")
                : (emptyLabel ?? "No records found.")
            }
            expandedRowIds={expandedRowIds}
            onToggleRow={onToggleRow}
            renderExpandedRow={renderExpandedRow}
            renderExpandedMobileContent={renderExpandedMobileContent}
          />
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && !error && totalCount > perPage && onPageChange && (
        <div className="udt__pagination">
          <Pagination
            total={totalCount}
            page={page}
            perPage={perPage}
            onPage={onPageChange}
          />
        </div>
      )}

      {/* ── Mobile filter overlay ── */}
      {!isCompact && !isDesktop && canFilter && filterDefs && (
        <MobileFilterOverlay
          isOpen={showFilter}
          filters={filterDefs}
          values={filterValues}
          onChange={onFilterChange ?? (() => {})}
          onApply={handleApply}
          onReset={handleReset}
          onClose={() => setShowFilter(false)}
        />
      )}
    </div>
  );
}
