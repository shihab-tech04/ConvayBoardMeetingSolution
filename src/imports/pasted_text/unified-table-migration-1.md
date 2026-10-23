Use the current My Tasks table as the single visual and interaction standard for every table in the Board Meeting Solution.

Study the complete project before changing anything. Reuse the existing table components, page configurations, filters, drawers, registries, routes, permissions, responsive patterns, theme tokens, and business logic.

Do not redesign the My Tasks table. Its current appearance is the approved reference. Fix its scrolling issue, then migrate every other table to the same component and styling.

## Approved table reference

The canonical reference is the table currently rendered on:

`src/app/pages/dashboard/PSRDashboardPage.tsx`

All full-page, report, administration, archive, modal, embedded, desktop, tablet, and mobile tables must use the same visual system.

Match the My Tasks table’s:

- Single card surface
- Border
- Radius
- Background
- Toolbar height and padding
- Title typography
- Record-count badge
- Search field
- Filter button
- Optional Print and Export buttons
- Tabs
- Table-header background
- Header typography
- Column spacing
- Row height
- Row dividers
- Hover and focus states
- Structured cell hierarchy
- Type labels
- Due-date presentation
- Status badges
- View action
- Pagination
- Empty, loading, and error states
- Responsive mobile-card behavior

Do not create another table design.

## 1. Fix the scrolling issue first

The My Tasks page currently cannot scroll far enough to reach the remaining rows and pagination.

The current app shell uses a fixed viewport and nested flex containers:

- `.app-shell`
- `.app-main-shell`
- `.app-page-content`
- `.app-page-content--workspace`
- `.dashboard-page`
- `.home-workspace-page`

`app-page-content--workspace` uses `overflow: hidden`, while the route-level page is expected to handle vertical scrolling. The flex chain is missing reliable `min-height: 0` behavior, causing the page content to be clipped instead of scrollable.

Fix the root scroll architecture rather than adding a temporary scrollbar only to My Tasks.

Required behavior:

- The main page-content area must scroll vertically when content exceeds the viewport.
- The complete My Tasks page must be reachable, including all table rows and pagination.
- Mouse wheel, trackpad, keyboard, touch, and scrollbar scrolling must work.
- The page must scroll naturally behind the fixed top navigation and side navigation.
- Do not make the top navigation or side navigation scroll with the page.
- Do not create two competing vertical scrollbars.
- Do not give the My Tasks table an arbitrary fixed height.
- Do not trap vertical scrolling inside the table body on normal full-page tables.
- Preserve the current scroll position when a detail drawer opens and closes.

Fix the full flex and overflow chain:

- Add `min-height: 0` to every required flex child in the main content hierarchy.
- Ensure the route page wrapper can shrink inside its flex parent.
- Keep one authoritative vertical scroll container.
- Remove or override any page-level `overflow: hidden` that clips full-page content.
- Keep horizontal table scrolling separate from page-level vertical scrolling.
- Confirm that body-scroll locking from drawers and modals is always restored when overlays close.

Recommended responsibility:

- App shell: fixed viewport
- Main content shell: flex container with `min-height: 0`
- Route content area: the single vertical scrolling region
- Table wrapper: horizontal scrolling only when required
- Modal or drawer body: its own vertical scrolling only inside that overlay

Do not solve the problem with JavaScript wheel handlers or manual scroll calculations.

## 2. Horizontal table scrolling

Some tables contain more columns than the available width.

Use the internal table wrapper for horizontal scrolling:

- `overflow-x: auto`
- `overflow-y: visible`
- Smooth touch scrolling
- No clipping of focus rings, dropdowns, tooltips, or action buttons
- Keep the Actions column reachable
- Do not reduce text to unreadable widths just to avoid horizontal scrolling

The outer `UnifiedDataTable` card may keep its rounded visual clipping, but it must not block access to the internal horizontal scrollbar.

On mobile, do not show the desktop table. Use the existing mobile-card pattern.

## 3. Make UnifiedDataTable the only public table component

Use:

`src/app/components/tables/UnifiedDataTable.tsx`

as the only public page-level table component.

Keep these as internal rendering layers:

- `ResponsiveTable`
- `CardTable`
- `UnifiedMobileCard`

All page files must import through:

`src/app/components/tables/index.ts`

Do not import `ResponsiveTable`, `CardTable`, or `UnifiedMobileCard` directly from pages.

After migration, remove the temporary legacy export of internal table components from `tables/index.ts` unless another internal shared component genuinely requires it.

Do not create a second unified table component.

## 4. Preserve the My Tasks design exactly

The My Tasks table is the visual reference.

Keep its current structure:

1. Toolbar
2. Optional tabs
3. Optional filter panel
4. Applied-filter chips
5. Table header
6. Table rows
7. Pagination

Toolbar layout:

- Title and count badge on the left
- Search, Filter, optional Export, and optional Print on the right
- Keep controls in one row at normal desktop widths
- Use the same heights, spacing, borders, icons, typography, and button treatment
- Allow responsive wrapping only at smaller breakpoints

Do not force buttons that a page does not support.

Examples:

- Show Export only when the existing page already supports export.
- Show Print only when the existing page already supports print.
- Do not add fake export or print behavior.
- Preserve disabled-export messaging where currently used.

## 5. One continuous table card

Every full-page table must use one continuous surface.

Do not create:

- A table card inside another table card
- A separate rounded table body inside the toolbar card
- A separate pagination card
- A second border around `CardTable`
- Duplicate shadows or radii

`UnifiedDataTable` must own the outer card.

Its internal `ResponsiveTable` and `CardTable` must render with `noCard` or the equivalent internal mode.

The toolbar, tabs, filter area, table body, and pagination must look like one component.

## 6. Standardize all full-page tables

Migrate these current direct implementations:

- `src/app/components/pages/GeneratedTablePage.tsx`
- `src/app/pages/dashboard/PSRDashboardPage.tsx`
- `src/app/pages/administration-requests/UserManagementPage.tsx`
- `src/app/pages/administration-requests/RoleManagementPage.tsx`
- `src/app/pages/administration-requests/PermissionListPage.tsx`
- `src/app/pages/administration-requests/SpecialRegistrationPage.tsx`

`GeneratedTablePage.tsx` controls many module pages. Migrating it correctly must update every page that uses its configuration.

Remove duplicated page-level implementations of:

- `.table-card`
- `.table-card__toolbar`
- `.table-card__title-group`
- `.table-card__search-wrapper`
- `.table-card__filter-panel`
- Custom pagination wrappers
- Direct `ResponsiveTable` usage
- Separate mobile Search and Filter sections when `UnifiedDataTable` already provides them

Do not remove page headers, KPI sections, entry buttons, summary toggles, or unrelated page content.

## 7. Preserve each table’s information

All tables should look the same, but they must not show the same columns.

Preserve every page’s existing:

- Table title
- Record data
- Column sequence
- Column labels
- Search fields
- Filter definitions
- Applied filters
- Tabs
- Status values
- Pagination
- Page size
- Row actions
- Mobile card mapping
- Empty states
- Loading states
- Error states
- Retry behavior

Do not replace real data with My Tasks data.

Do not hardcode task-specific columns into the shared table.

The component must remain configuration-driven.

## 8. Support structured cells

Keep the structured cell support used by My Tasks.

Columns must support:

- Plain text
- Primary and secondary text
- Icon with text
- Status badge
- Type badge
- Date and secondary due text
- Numeric values
- Long text with controlled truncation
- Custom cell renderer
- Attachment summary
- Accessible labels

Reuse the My Tasks hierarchy where a table has similar information.

For tables without secondary text, render a normal single-line cell without creating unnecessary empty space.

Do not force all rows to use task icons or two-line content.

## 9. Standard column and row treatment

Every table must use the same shared styling for:

- Header background
- Header font size and weight
- Header padding
- Cell font size
- Cell padding
- Row height
- Divider
- Zebra treatment, if retained
- Hover
- Keyboard focus
- Selected row
- Empty value
- Long-text truncation
- Status badges
- Action button

Use the existing design tokens.

Remove page-specific table colors, borders, shadows, radii, and row heights.

Do not remove useful domain-specific cell content.

## 10. Standard toolbar behavior

Use the same toolbar order across the system:

1. Table title
2. Dynamic count badge
3. Flexible space
4. Search
5. Filter
6. Export, when supported
7. Print, when supported

Requirements:

- Search and Filter stay in one row on desktop.
- Do not render another Search or Filter section above the table on desktop.
- Do not show duplicate filter buttons.
- Search width must remain controlled and must not consume the full toolbar.
- Count labels must support singular and plural.

Examples:

- `1 task`
- `26 tasks`
- `1 record`
- `38 records`
- `1 user`
- `12 users`

## 11. Tabs

Tables with tabs must use the same tab row as My Tasks.

Support:

- Label
- Dynamic count
- Active state
- Horizontal scrolling at smaller widths
- Keyboard navigation
- Correct selected state

Tabs must appear inside the table card directly below the toolbar.

Do not put tabs inside a second card.

Do not add tabs to pages that do not need them.

## 12. Standard table interactions

Preserve the previously approved interaction rule across the entire system:

- Clicking a desktop table row opens the selected record’s detail drawer.
- Clicking View opens the same detail drawer.
- Pressing Enter or Space on a focused row opens the same drawer.
- Tapping a mobile table card opens the same drawer.
- All triggers must display the same record.
- Do not navigate directly from a table row.
- Do not open a View modal.
- Do not fire the handler twice.

Every table row must have one visible table action:

`View`

Use the existing Eye icon.

Keep the Actions column at the far right.

Do not add overflow dots before View.

Move Edit, Approve, Reject, Delete, Start, Join, Download, Assign, Print, and other workflow actions into the existing detail drawer footer.

Do not remove those actions or change permission rules.

## 13. Preserve specialized detail drawers

Keep existing specialized drawer content and behavior, including:

- `DynamicDetailsDrawer`
- `UserDetailDrawer`
- Role details drawer
- Permission details drawer
- `SpecialRegistrationDrawer`
- Meeting details drawer
- Agenda details drawer
- Board Pack details drawer
- Document details drawer
- Decision and resolution details
- Minutes details
- Action-item details
- Archive and report details

Do not replace a complete specialized drawer with a weaker generic drawer.

The table migration must only standardize how the drawer is opened.

## 14. Administration pages

### User Management

Use `UnifiedDataTable`.

Preserve:

- User columns
- Search
- Filters
- Pagination
- Loading and error states
- User Detail drawer
- Edit
- Role assignment
- Activate or deactivate
- Delete
- Permissions

Row click and View must open `UserDetailDrawer`.

### Role Management

Use `UnifiedDataTable`.

Preserve:

- Role columns
- Permission information
- Filters
- Pagination
- Create role
- Edit
- Duplicate
- Delete
- Existing stepper modal
- Role details drawer

### Permission List

Use `UnifiedDataTable`.

Preserve:

- Permission columns
- Search
- Filters
- Pagination
- Detail drawer
- Edit and delete permissions

### Special Registration

Use `UnifiedDataTable`.

Preserve:

- Current columns
- Search and filters
- Completeness rules
- Attachments
- Loading and error handling
- Pagination
- `SpecialRegistrationDrawer`
- Edit
- Approve
- Reject

## 15. Generated module pages

Update `GeneratedTablePage.tsx` to render `UnifiedDataTable` rather than manually assembling a table card.

Pass its existing configuration into the shared component:

- Columns
- Rows
- Search
- Filters
- Applied-filter chips
- Pagination
- Export
- Print
- Mobile mapping
- Empty states
- Row view handler
- Drawer actions

Preserve:

- Page heading and description
- Entry button
- Extra buttons
- KPI section
- Show or Hide Summary behavior
- Create and edit forms
- Bulk upload
- Attachments
- Approve and reject flows
- Confirmation modals
- Existing registry updates
- Custom action resolvers

Do not change the module page data or workflows.

## 16. Embedded and modal tables

`src/app/pages/meetings/MeetingContextualModals.tsx` still contains raw `<table>` elements.

Replace all of them with the compact or embedded variant of `UnifiedDataTable`.

The embedded variant must use the same:

- Table header
- Row style
- Cell spacing
- Status badge
- View interaction
- Empty state
- Horizontal scrolling
- Mobile behavior

It may hide the full toolbar, tabs, filters, and pagination when those controls are unnecessary.

For embedded tables:

- Allow the modal body to scroll vertically.
- Allow the table wrapper to scroll horizontally.
- Do not create a second vertical scrollbar unless the embedded table has a defined, necessary maximum height.
- Keep the parent modal usable.
- Ensure detail drawers open above the modal.
- Closing the detail drawer must return the user to the still-open modal.

After migration, the only raw HTML `<table>` must live inside the internal shared desktop table renderer.

## 17. Mobile table behavior

All tables must use the same `UnifiedMobileCard` pattern through `UnifiedDataTable`.

Requirements:

- Hide the desktop table at the existing responsive breakpoint.
- Render standard mobile cards.
- Make the entire card clickable.
- Do not add a separate View Details button.
- Use the same drawer as desktop.
- Keep Search and Filter in one row.
- Search takes the available width.
- Filter uses an icon-based control.
- Show an active-filter indicator.
- Open filters through the existing bottom sheet.
- Hide Export and Print on mobile.
- Preserve horizontally scrollable tabs.
- Maintain 44px minimum tap targets.
- Allow the page to scroll vertically without trapping touch gestures.

Do not use desktop horizontal table scrolling as the mobile experience.

## 18. Pagination

Use the shared pagination component and My Tasks pagination styling everywhere.

Requirements:

- Pagination appears inside the table card footer.
- It must remain reachable through vertical page scrolling.
- It must not be clipped by `overflow: hidden`.
- Changing search, filters, tabs, KPI selection, or page size resets to page 1.
- Closing a detail drawer must not reset the current page.
- Pagination counts must use the filtered result count.
- Do not render duplicate pagination controls.

## 19. Empty, loading, and error states

Use one shared state design inside the table body.

Support:

- Loading
- Error
- Retry
- No records
- No search results
- No filtered results
- Clear filters
- Contextual empty-state title and description

Do not hardcode `No records found` inside `CardTable`.

`CardTable` must render the state passed by `UnifiedDataTable`.

Keep states compact and consistent with My Tasks.

## 20. CSS consolidation

Use `src/styles/tables.css` as the authoritative table stylesheet.

Consolidate or remove duplicate table rules from:

- `globals.css`
- `my-tasks.css`
- `users.css`
- `roles.css`
- `permissions.css`
- `special-registration.css`
- Page-specific stylesheets
- Inline table styles in `MeetingContextualModals.tsx`

Remove obsolete styles only after confirming they are no longer used.

Keep My Tasks-specific CSS only for:

- KPI grid
- KPI selected state
- Page-specific spacing
- Non-table task content

Do not keep duplicate `.table-card` and `.udt` systems after migration.

## 21. Scroll validation

Test scrolling on:

- My Tasks with more than one page of rows
- A GeneratedTablePage with many rows
- User Management
- Role Management
- Permission List
- Special Registration
- A wide table with many columns
- Embedded modal tables
- Desktop
- Laptop-height screens
- Tablet
- Mobile
- Large font scale

Verify:

- The page scrolls to the final row.
- Pagination is reachable.
- The horizontal scrollbar is reachable.
- Vertical wheel scrolling works while the pointer is over the table.
- Trackpad diagonal scrolling behaves naturally.
- Touch scrolling works on mobile.
- Opening and closing a drawer does not permanently disable scrolling.
- Opening and closing a modal does not permanently disable scrolling.
- No nested scrollbar appears on ordinary full-page tables.
- No content is clipped below the viewport.
- Sticky navigation remains stable.
- Focused rows and action buttons are not clipped.

## 22. Accessibility

Ensure:

- Meaningful table `aria-label`
- Contextual search label
- Filter button exposes `aria-expanded`
- Tabs expose selected state
- Count changes use polite announcements
- Clickable rows support Enter and Space
- View buttons stop event propagation
- Visible focus indicators
- Status is not communicated only through color
- Scrollable regions are keyboard accessible when required
- Mobile cards expose the same record name as desktop
- Focus returns to the triggering row or View button after closing the drawer

## 23. Future-table rule

Add or update the developer handbook with these rules:

- Import `UnifiedDataTable` only from `components/tables`.
- Do not manually create a table toolbar.
- Do not directly import internal table renderers into pages.
- Do not create raw page-level HTML tables.
- Configure columns, rows, filters, tabs, actions, states, and mobile mapping through `UnifiedDataTable`.
- Use the compact variant only for modal or embedded tables.
- Use one View action.
- Row click, View, and mobile-card click must open the same detail drawer.
- Use page-level vertical scrolling and table-level horizontal scrolling.
- Never create a fixed-height full-page table just to solve scrolling.

Do not create any User Guide or Help content. The Help icon and User Guide feature must remain hidden.

## Validation checklist

Confirm all of the following:

- My Tasks keeps its approved visual design.
- My Tasks can scroll to every row and pagination.
- The scroll issue is fixed at the layout level, not patched only on one page.
- Every full-page table uses `UnifiedDataTable`.
- Every modal table uses the compact unified variant.
- Every table visually matches the My Tasks table.
- Search and Filter align consistently.
- Optional Export and Print controls retain working behavior.
- Every table has one continuous card.
- No nested table card remains.
- Tabs use the shared style and dynamic counts where available.
- Columns and page data remain unchanged.
- Row click and View open the correct detail drawer.
- Mobile cards open the same drawer.
- Only one visible View action appears in rows.
- Secondary workflow actions remain inside drawers.
- Pagination remains reachable and functional.
- Horizontal scrolling works for wide tables.
- Mobile pages scroll naturally.
- No raw page-level `<table>` elements remain.
- No page imports `ResponsiveTable` or `CardTable` directly.
- Duplicate table CSS is removed safely.
- Existing APIs, routes, registries, permissions, modals, drawers, filters, and business logic still work.
- Light theme, dark theme, EN/BN, font scaling, desktop, tablet, and mobile remain stable.
- The project builds without TypeScript errors.

## Golden Rules

- Do not break solved issues.
- Do not change unrelated files.
- Do not remove working features or actions.
- Do not change APIs, routes, registries, permissions, data, or business logic.
- Use the My Tasks table as the exact visual reference.
- Use one unified table component across the entire system.
- Fix scrolling at the correct layout level.
- Keep page-level vertical scrolling and table-level horizontal scrolling separate.
- Preserve the approved detail-drawer interaction.
- Reuse existing components and design tokens.
- Test responsive behavior.
- Keep EN/BN language parity.
- Keep the User Guide hidden.
- Do not create User Guide content.