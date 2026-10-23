Standardize every table in the Board Meeting Solution and rebuild the “My Tasks” task queue using the same table system as the existing “Agenda Management” page.

Use the Agenda Management table as the canonical visual and interaction reference. The final result must have one reusable, config-driven table component for all current and future tables.

The project already contains these reusable foundations:

- `src/app/components/tables/ResponsiveTable.tsx`
- `src/app/components/tables/CardTable.tsx`
- `src/app/components/tables/UnifiedMobileCard.tsx`
- `src/app/components/forms/AppSearchField.tsx`
- `src/app/components/filters/FilterPanel.tsx`
- `src/app/components/filters/MobileFilterOverlay.tsx`
- `src/app/components/filters/AppliedFilterChips.tsx`
- `src/app/components/shared/Pagination.tsx`
- `src/app/components/pages/GeneratedTablePage.tsx`

Reuse and consolidate these components. Do not create another unrelated table style.

## Main objective

Create one public table component named `UnifiedDataTable` under:

`src/app/components/tables/UnifiedDataTable.tsx`

All page-level tables must use this component. `ResponsiveTable`, `CardTable`, and `UnifiedMobileCard` should remain internal rendering layers used by `UnifiedDataTable`.

Pages must no longer manually rebuild the same table card, toolbar, search field, filter panel, applied chips, table body, mobile cards, and pagination.

## UnifiedDataTable responsibilities

The component must support the following through props or configuration:

- Table title
- Record count and contextual count label
- Column definitions
- Row data
- Single row action
- Row click
- Search value, placeholder, and change handler
- Filter definitions, draft values, applied values, apply, reset, and close handlers
- Optional tabs
- Optional Export button
- Optional Print button
- Pagination
- Loading state
- Error state with retry action
- Empty state
- Filtered-empty state with clear-filter action
- Mobile card mapping
- Accessible table label
- Full-page and compact embedded variants

Use one consistent toolbar order on desktop:

1. Table title
2. Record-count badge
3. Flexible empty space
4. Search field
5. Filter button
6. Export button, when enabled
7. Print button, when enabled

The search, filter, export, and print controls must match the Agenda Management page in height, spacing, icon size, border, typography, hover, focus, active, and disabled states.

Do not use custom inline search inputs or page-specific filter buttons.

## Canonical table design

Centralize the visual styling currently used by Agenda Management.

The standard table must have:

- One surface card
- Existing system border and shadow
- Existing 16px card radius
- A single toolbar with consistent padding
- Table title and count badge aligned on the left
- Search and actions aligned on the right
- A subtle table-header background
- Consistent header typography
- Consistent cell padding and row height
- Horizontal dividers between rows
- Existing subtle alternating row treatment
- Existing hover and keyboard-focus states
- Status values rendered through `StatusBadge`
- A single Actions column at the far right
- The existing compact “View” action button
- Horizontal scrolling only when the columns genuinely cannot fit
- Standard pagination inside the table card footer

Do not use the red or orange left-border row treatment from the current My Tasks list. Urgency must be communicated through the standard status badge so the table remains consistent with other pages.

Use existing theme tokens. Do not introduce hardcoded page-specific colors, shadows, radii, fonts, or button styles.

## Rebuild the My Tasks table

Update:

`src/app/pages/dashboard/PSRDashboardPage.tsx`

Keep the following unchanged:

- Page heading and description
- Four KPI cards
- KPI calculations
- KPI click filtering
- Task-generation logic
- Current-user filtering
- Task tabs
- Search logic
- Filter definitions and filtering logic
- Pagination logic
- `navigateToTask`
- Existing routes
- Registry data
- Business rules
- Mobile filter overlay behavior

Remove the bespoke task-list UI built with:

- `.mytasks-list`
- `.mytasks-row`
- `.mytasks-row__icon`
- `.mytasks-row__body`
- `.mytasks-row__badge`
- Custom My Tasks pagination markup

Convert the filtered tasks into rows for `UnifiedDataTable`.

Use these desktop columns in this exact order:

1. Task
2. Related Meeting
3. Type
4. Due Date
5. Status
6. Actions

Recommended field mapping:

- `title` → Task
- `relatedMeeting` → Related Meeting
- `type` → Type
- `dueLabel` → Due Date
- `status` → Status badge

The Actions column must remain the final column and contain only one standard “View” action.

Clicking the row or View action must call the existing `navigateToTask(task)` function. Do not replace the current routing logic with a generic drawer.

The My Tasks table card must match Agenda Management:

- “Task Queue” title on the left
- Dynamic task-count badge beside the title
- Search field on the right
- Filter button immediately after search
- Export button after Filter
- Print button after Export
- Tabs in a full-width row below the toolbar
- Filter panel below the tabs when opened
- Applied-filter chips below the filter area
- Standard column header and table rows below them
- Standard pagination footer

Use the existing export-disabled handler until a real export feature exists. Do not create fake export functionality. Print can continue using the existing print behavior.

The task count must react to tabs, KPI selection, search, and applied filters.

## Tabs inside the unified component

Add optional tab support to `UnifiedDataTable`.

For My Tasks, render these existing tabs below the toolbar:

- All
- Approvals
- Reviews
- Votes & Signatures
- Actions
- Declarations
- Completed

The active-tab underline, typography, spacing, and horizontal overflow behavior must continue to use the existing `TabBar` component.

Tabs must not change the table card width or create another nested card.

## Mobile behavior

Use the existing `UnifiedMobileCard` rendering through `ResponsiveTable`.

For My Tasks mobile cards, use:

- Primary: Task title
- Identifier: Task type
- Meta: Related meeting
- Status: Task status
- Date: Due date

Mobile requirements:

- Do not display the desktop table.
- Render the same standard mobile card pattern used by the rest of the system.
- The full card must be clickable.
- Do not add a separate “View Details” button.
- Search and filter must appear in one row.
- The search field must take the available width.
- The filter control must be an icon-based button with a clear active-filter indicator.
- Opening Filter must use the existing bottom-sheet `MobileFilterOverlay`.
- Tabs must scroll horizontally without breaking the layout.
- Hide Export and Print on mobile.
- Maintain at least 44px tap targets.
- Preserve the current task navigation behavior.

Do not change the desktop layout while fixing mobile behavior, and do not change mobile behavior while standardizing desktop.

## Migrate every current table

Replace duplicated table-shell markup with `UnifiedDataTable` in at least these files:

- `src/app/components/pages/GeneratedTablePage.tsx`
- `src/app/pages/dashboard/PSRDashboardPage.tsx`
- `src/app/pages/administration-requests/UserManagementPage.tsx`
- `src/app/pages/administration-requests/RoleManagementPage.tsx`
- `src/app/pages/administration-requests/PermissionListPage.tsx`
- `src/app/pages/administration-requests/SpecialRegistrationPage.tsx`

Preserve every page’s existing:

- Columns
- Data
- Search behavior
- Filters
- Applied-filter values
- Pagination
- Loading and error handling
- Empty states
- Row actions
- Drawers
- Modals
- Create and edit flows
- API calls
- Routes
- Permissions
- Registry updates

Do not convert functional page logic into hardcoded mock behavior.

## Embedded and modal tables

`MeetingContextualModals.tsx` currently contains several raw `<table>` implementations.

Replace these with the compact or embedded variant of the same unified table system.

The compact variant may hide the full search/filter/export/print toolbar when the data is a small static summary, but it must still use the same:

- Header style
- Cell spacing
- Borders
- Row behavior
- Status badges
- Empty state
- Responsive handling

After this work, no page or modal should create a new raw HTML table directly. The only raw `<table>` element should live inside the internal table-rendering component.

## Future-table rule

Create a single export entry point such as:

`src/app/components/tables/index.ts`

Future pages must import `UnifiedDataTable` from this entry point.

Add a clear developer note to the existing handbook or table component documentation:

- Do not manually build a table toolbar.
- Do not directly use `CardTable` or `ResponsiveTable` from a page.
- Do not create raw HTML tables.
- Define columns, filters, actions, mobile mapping, and states through `UnifiedDataTable`.
- Use the compact variant only for embedded or modal tables.

## CSS cleanup

Consolidate table-related styles into the existing shared table styles.

Remove or stop using duplicate My Tasks table styles after migration, including bespoke task-row, task-badge, and custom pagination rules.

Keep My Tasks styles that are still needed for:

- KPI layout
- Selected KPI state
- Page spacing
- Any non-table content

Do not remove styles that are still used elsewhere.

Avoid duplicate definitions between:

- `tables.css`
- `globals.css`
- `my-tasks.css`
- `buttons.css`
- `filters.css`

There should be one authoritative style for each table element.

## Accessibility

Ensure:

- The table has a meaningful `aria-label`.
- Search fields have contextual accessible labels.
- Filter buttons expose `aria-expanded`.
- Rows triggered by keyboard support Enter and Space.
- Action buttons stop row-click propagation.
- Focus indicators remain visible.
- Status is not communicated by color alone.
- Loading and empty states use appropriate live-region or status semantics.
- Count updates are announced without being disruptive.

## Validation

After implementation, verify:

- My Tasks visually matches the Agenda Management table system.
- Search, Filter, Export, and Print align in one row on desktop.
- My Tasks tabs remain directly below the toolbar.
- Every task tab displays the correct records.
- KPI filtering still works.
- Search and filters work together.
- Reset clears draft and applied filters correctly.
- Row click and View action route to the correct workflow.
- Pagination resets when search, tab, KPI, or filters change.
- All full-page tables use `UnifiedDataTable`.
- Modal tables use the compact unified variant.
- Mobile tables render as standard cards.
- Mobile search and filter remain in one row.
- The mobile filter opens from the bottom.
- Light theme, dark theme, font scaling, and responsive layouts remain correct.
- There are no raw page-level `<table>` elements.
- There are no duplicate table toolbars left in page components.
- The project builds without TypeScript errors.

## Golden Rules

- Do not break solved issues.
- Do not change unrelated files.
- Do not remove working features.
- Do not change APIs, routes, registries, permissions, or business logic.
- Reuse existing components and design tokens.
- Keep only one row action in table rows.
- Preserve desktop and mobile behavior.
- Test responsive behavior.
- Keep EN/BN language parity where translations are supported.