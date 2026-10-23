````text
Standardize all table tabs, table components, row hover states, and card hover states across the entire Board Meeting Solution.

Study the current project before making changes. Reuse the approved My Tasks table as the visual and interaction reference.

Do not redesign the My Tasks table. Fix the shared architecture so every existing and future table inherits the same component, tab behavior, responsive behavior, states, and interactions.

## Main goals

1. Make every table tab fully functional.
2. Make every table use `UnifiedDataTable`.
3. Make all table rows use the same hover and focus behavior.
4. Make all clickable cards use one shared hover behavior.
5. Preserve all current data, columns, filters, drawers, routes, permissions, APIs, and business logic.

## 1. Fix the current table-tab bug

The status tabs in `GeneratedTablePage.tsx` are not reliably filtering the table.

The current filtered-row `useMemo` uses:

- `activeStatusTab`
- `statusTabField`

but they are missing from its dependency list.

Fix this immediately.

The filtered-row calculation must update whenever any of these change:

- Active table tab
- Search value
- Applied filters
- Current rows
- Status-tab field
- Any page-specific table filter

Do not suppress React dependency warnings.

## 2. Use live table data for tab counts

The current tab counts are calculated from `cfg.rows`, which is only the original configuration data.

This means counts can become incorrect after:

- Creating a record
- Editing a record
- Deleting a record
- Approving or rejecting a record
- Publishing or archiving a record
- Changing a status
- Registry updates

Calculate all tab counts from the current live `rows` state.

Do not use static configuration rows after the page has initialized.

Tab counts must update immediately after any table-data change.

## 3. Standard tab-filtering flow

Use this exact filtering sequence for every table with tabs:

1. Start with the current live rows.
2. Apply search.
3. Apply standard filters.
4. Calculate tab counts from this result.
5. Apply the active tab.
6. Apply sorting.
7. Apply pagination.

This ensures tab counts react to Search and Filter while remaining independent of the selected tab.

Example:

If Search finds 12 records:

- All should show 12.
- Each status tab should show its count within those 12 records.
- Selecting a tab should display only that tab’s records.

Do not calculate tab counts from paginated rows.

## 4. Extend status-tab configuration

Update `StatusTabDef` in:

`src/app/pages/modulePageUtils.ts`

Support:

- `id`
- `label`
- Optional `values`
- Optional custom row matcher when genuinely required

Example:

```ts
{
  id: "active",
  label: "Active",
  values: ["Scheduled", "Approved", "In Progress"]
}
````

Use exact normalized matching by default.

Normalize values by:

* Trimming whitespace
* Converting to lowercase
* Treating repeated spaces consistently

Do not rely on case-sensitive string comparison.

Support grouped tabs without hardcoding page-specific logic inside `GeneratedTablePage`.

## 5. Make all table tabs functional

Every visible table tab must:

* Filter the table when clicked.
* Display the correct dynamic count.
* Update the table count badge.
* Reset pagination to page 1.
* Work together with Search.
* Work together with applied Filters.
* Work together with KPI filters where present.
* Preserve the selected tab while opening and closing a detail drawer.
* Show the correct empty state when its count is zero.
* Remain usable on desktop, tablet, and mobile.

Do not display decorative tabs that have no filtering logic.

If a table has a tab that cannot be connected to valid data, either connect it correctly or remove that tab from that page. Do not create fake rows.

## 6. Handle active-tab data changes

If the active tab becomes invalid because the page configuration or dataset changes:

* Safely reset to `all`.
* Reset pagination to page 1.
* Do not leave the table in a blank or broken state.

If records are removed and the current page becomes greater than the available page count:

* Move to the last valid page.
* Do not show an empty page while records exist on an earlier page.

## 7. Improve shared TabBar behavior

Update:

`src/app/components/tabs/TabBar.tsx`

Keep its current approved visual style.

Add complete tab accessibility and interaction:

* Unique tab IDs
* Matching `aria-controls`
* `aria-selected`
* Roving `tabIndex`
* Left and Right arrow navigation
* Home moves to the first tab
* End moves to the final tab
* Enter and Space activate the focused tab
* Visible focus state
* Disabled support if required in the future

On tablet and mobile:

* Keep tabs in one horizontal row.
* Allow horizontal scrolling.
* Automatically scroll the active tab into view.
* Do not wrap tabs into multiple rows.
* Do not create page-level horizontal overflow.

Keep dynamic count badges beside labels.

## 8. Keep My Tasks tabs working

Preserve the current My Tasks tabs:

* All
* Approvals
* Reviews
* Votes & Signatures
* Actions
* Declarations
* Completed

Preserve their current data mapping and counts.

My Tasks tabs must continue to work with:

* KPI selection
* Search
* Filters
* Pagination
* Task drawer
* Mobile cards

Do not break the current My Tasks table while updating shared tab behavior.

Import both `UnifiedDataTable` and `TabDef` through:

`src/app/components/tables/index.ts`

Do not import directly from `UnifiedDataTable.tsx`.

## 9. Use one table component everywhere

`UnifiedDataTable` must remain the only public table component.

Public import:

```ts
import { UnifiedDataTable } from "../../components/tables";
```

Internal rendering layers:

* `ResponsiveTable`
* `CardTable`
* `UnifiedMobileCard`

Page components must not directly import or render internal table components.

Audit and standardize:

* `src/app/components/pages/GeneratedTablePage.tsx`
* `src/app/pages/dashboard/PSRDashboardPage.tsx`
* `src/app/pages/administration-requests/UserManagementPage.tsx`
* `src/app/pages/administration-requests/RoleManagementPage.tsx`
* `src/app/pages/administration-requests/PermissionListPage.tsx`
* `src/app/pages/administration-requests/SpecialRegistrationPage.tsx`
* `src/app/pages/meetings/MeetingContextualModals.tsx`
* Every page using `GeneratedTablePage`
* Every embedded or modal table
* Every report table
* Every archive table

After this work:

* No page-level raw `<table>` elements may exist.
* No page may manually build its own table toolbar.
* No page may manually create table pagination.
* No page may directly import `CardTable` or `ResponsiveTable`.
* Compact modal tables must use `variant="compact"`.

The only raw HTML `<table>` should remain inside the internal `CardTable` renderer.

## 10. Preserve page-specific table content

All tables must use the same component, but keep each page’s correct:

* Title
* Count label
* Columns
* Column order
* Data
* Search fields
* Filters
* Tabs
* Status values
* Structured cells
* Mobile-card mapping
* Pagination
* Loading state
* Error state
* Empty state
* Drawer
* Drawer actions
* Permissions
* Business logic

Do not force My Tasks columns onto other tables.

Do not replace real data with generic mock data.

## 11. Standard table-row hover

Every clickable desktop table row must use the same hover behavior as the approved My Tasks table.

Create one authoritative table-row hover style in:

`src/styles/tables.css`

Use the existing theme tokens.

The shared row state must include:

* Subtle primary-tinted background
* No vertical movement
* No layout shift
* Pointer cursor only when the row is clickable
* Smooth 120–160ms transition
* Consistent keyboard-focus treatment
* Consistent selected-row treatment while the drawer is open

Remove conflicting table-row hover styles from legacy selectors such as:

* `.table tbody tr:hover`
* `.dash-table`
* `.rct__row`
* `.data-table__row`
* Page-specific table row classes

Remove them only after confirming those legacy implementations are no longer used.

Non-clickable rows must not show a misleading pointer cursor.

## 12. Preserve table interactions

Keep the previously approved interaction across every table:

* Clicking a desktop row opens the detail drawer.
* Clicking View opens the same drawer.
* Pressing Enter or Space opens the same drawer.
* Tapping a mobile card opens the same drawer.
* View must not trigger the row handler twice.
* The Actions column remains last.
* Only one visible table action appears: View.
* Other actions remain inside the detail drawer.

Do not change drawer content, permission checks, or workflow actions.

## 13. Create one shared clickable-card hover

The project currently has conflicting hover styles across:

* `.card`
* `.card-hover`
* `.stat-card`
* `.report-card`
* `.hub-card`
* `.role-card`
* `.permission-module-card`
* `.mobile-table-card`
* Dashboard cards
* Other clickable card patterns

Create one shared interactive-card contract in:

`src/styles/cards.css`

Use a reusable class or data attribute such as:

* `.interactive-card`
* `[data-interactive-card="true"]`

Apply it only to cards that are genuinely clickable.

Use one consistent hover state:

* Subtle `var(--color-surface-hover)` or existing primary-tinted surface
* Shared border emphasis using existing theme tokens
* `var(--shadow-md)`
* No translate or lift
* No size change
* No layout movement
* 180–200ms transition
* Consistent pointer cursor
* Matching `focus-visible` state

Do not use different hover colors based on each page.

Do not make static cards look clickable.

## 14. Cards that should use the shared hover

Apply the shared interactive-card hover to clickable instances of:

* `StatCard`
* Report cards
* Hub or navigation cards
* Role cards
* Permission module cards
* Mobile table cards
* Clickable dashboard cards
* Other cards that trigger navigation, selection, filtering, or a drawer

Preserve selected states.

A selected card must remain visually selected when hovered. Hover may strengthen its shadow slightly, but it must not replace the selected background or border.

## 15. Cards that must not hover

Do not apply the shared hover to static containers such as:

* Unified table surface
* Form section cards
* Meeting review summary cards
* Repeatable form-item cards
* Upload areas
* Drawer sections
* Modal containers
* Static dashboard panels
* Read-only information cards
* Empty-state containers

Only interactive cards should react to hover.

## 16. Mobile and touch behavior

Hover styles must run only on devices that support hover:

```css
@media (hover: hover) and (pointer: fine)
```

On touch devices:

* Do not leave cards visually stuck in a hover state.
* Preserve the existing pressed state where useful.
* Do not create movement that interferes with scrolling.
* Keep at least 44px tap targets.

Respect `prefers-reduced-motion`.

## 17. CSS cleanup

Use these authoritative stylesheets:

* `tables.css` for tables, rows, pagination, and mobile table cards
* `tabs.css` for all shared tabs
* `cards.css` for shared interactive-card hover

Audit and safely remove conflicting hover or table styles from:

* `globals.css`
* `roles.css`
* `my-tasks.css`
* `users.css`
* `permissions.css`
* `special-registration.css`
* Page-specific stylesheets

Do not delete styles that are still used by unrelated components.

Do not leave two competing definitions for the same hover state.

## 18. Tests

Add or update tests for:

### Table tabs

* Clicking a tab filters rows.
* Active tab count is correct.
* Counts update after row status changes.
* Search and tabs work together.
* Filters and tabs work together.
* Tab change resets pagination.
* Empty tabs show the correct empty state.
* Arrow-key navigation works.
* Home and End navigation work.
* Active tab scrolls into view on narrow screens.

### Unified tables

* Every full-page table renders through `UnifiedDataTable`.
* Compact modal tables render through `UnifiedDataTable`.
* Row click and View open the same record.
* Mobile-card click opens the same record.
* No duplicate action firing occurs.

### Card hover

* Clickable cards receive the shared interactive class.
* Static cards do not receive the interactive class.
* Selected cards preserve selected state.

Run:

* `npm run typecheck`
* `npm run test`
* `npm run build`

Fix all TypeScript errors, test failures, and build errors.

## Validation checklist

Confirm all of the following:

* Every visible table tab filters correctly.
* Tab counts are calculated from live rows.
* Tab counts update after create, edit, delete, approval, rejection, publication, archive, and status changes.
* Search, Filter, KPI, Tabs, and Pagination work together.
* Changing tabs resets pagination.
* The active tab remains selected after opening and closing a drawer.
* Mobile tabs scroll horizontally.
* Every table uses `UnifiedDataTable`.
* No page imports internal table renderers.
* No raw page-level table remains.
* Every clickable table row has the same hover.
* Every clickable card has the same hover.
* Static cards do not react to hover.
* Selected-card styling remains stable.
* Desktop, tablet, mobile, light theme, dark theme, font scaling, and EN/BN remain correct.
* Existing APIs, routes, registries, drawers, modals, permissions, and business rules remain unchanged.
* The User Guide remains hidden.
* No User Guide content is created.

## Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not remove working features.
* Do not change APIs, routes, registries, permissions, or business logic.
* Keep the My Tasks table as the visual reference.
* Use one shared table component.
* Make every visible table tab functional.
* Use one table-row hover.
* Use one interactive-card hover.
* Do not apply hover to static cards.
* Reuse existing components and theme tokens.
* Test responsive behavior.
* Keep EN/BN language parity.
* Keep the User Guide hidden.
* Do not create User Guide content.

```
```
