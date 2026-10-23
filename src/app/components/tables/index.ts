/**
 * Unified table system — import from here, never directly from CardTable or ResponsiveTable.
 *
 * Usage:
 *   import { UnifiedDataTable } from "../components/tables";
 *
 * Rules:
 *  - Do not manually build a table toolbar in a page component.
 *  - Do not import CardTable or ResponsiveTable directly from page components.
 *  - Do not create raw HTML tables in page or modal components.
 *  - Define columns, filters, actions, mobile mapping, and states through UnifiedDataTable.
 *  - Use variant="compact" only for embedded or modal tables with small static datasets.
 */

export { UnifiedDataTable } from "./UnifiedDataTable";
export type { UnifiedDataTableProps, TabDef } from "./UnifiedDataTable";

// Shared table interaction contract — every table must use TABLE_VIEW_ACTION as its
// sole row action. Workflow actions (edit, approve, reject, etc.) go in drawerActions.
export { TABLE_VIEW_ACTION } from "../../data/modulePageConfigs";

