Standardize table interactions across the entire Board Meeting Solution.

Study the current project before making changes. Audit every full-page table, report table, embedded table, modal table, desktop table, and mobile table card.

This task is about interaction consistency. Do not redesign table layouts, change columns, replace data, alter filters, or modify unrelated business logic.

## Main interaction rule

Every table must follow the same interaction:

- Clicking anywhere on a table row opens that record’s detail drawer.
- Clicking the table action labeled “View” or “View Details” opens the same detail drawer.
- Clicking a mobile table card opens the same detail drawer.
- All three triggers must open the exact same selected record.
- They must not produce different destinations or different detail views.
- They must not trigger the handler twice.
- They must not navigate directly to another page.
- They must not open a view modal instead of the drawer.

Use one shared interaction contract for all current and future tables.

## Standard table action

Every table row must have only one visible action:

`View`

Use the existing Eye icon.

Requirements:

- Keep the Actions column at the far right.
- Do not show Edit, Approve, Reject, Delete, Download, Print, Start, Join, Assign, or other workflow actions directly inside table rows.
- Move existing secondary actions into the detail drawer footer.
- Do not remove any working action or permission rule.
- Remove overflow dots or menus that appear before the View label.
- Use `view` as the standard action ID.
- Use `View` as the visible label.
- Use an accessible label such as `View details — {record name}`.
- Use “View Details” as the tooltip where a tooltip is supported.

## Shared table interaction API

Update the shared table system:

- `src/app/components/tables/UnifiedDataTable.tsx`
- `src/app/components/tables/ResponsiveTable.tsx`
- `src/app/components/tables/CardTable.tsx`
- `src/app/components/tables/UnifiedMobileCard.tsx`
- `src/app/components/tables/index.ts`

Add one clear public handler:

`onViewRow(row)`

This handler must be used for:

- Desktop row click
- Desktop View action
- Keyboard row activation
- Mobile card click
- Any compact or embedded table View action

Pages should not create separate handlers for row click and View click.

Internally, both interactions must call `onViewRow` exactly once.

Do not allow page components to define unrelated row-level actions through the public table API.

Keep `RowAction` available for detail drawer actions, but do not use multi-action arrays inside table rows.

Create or retain one shared table action constant, such as:

`TABLE_VIEW_ACTION`

It should contain only:

- ID: `view`
- Label: `View`
- Icon: Eye

Replace duplicate `ROW_VIEW`, manually created View actions, and page-specific table View configurations with this shared constant where practical.

## Desktop row behavior

Every viewable desktop row must:

- Use a pointer cursor.
- Have the same hover state.
- Have the same keyboard-focus state.
- Open the detail drawer when the row background or a non-interactive cell is clicked.
- Support Enter and Space when focused.
- Use a meaningful accessible label.
- Keep the selected row visually clear while its drawer is open, using the existing subtle selected-row style if one exists.

Do not make text selection difficult. The interaction should still allow users to select text where reasonable.

Interactive elements inside the row must stop propagation, including:

- View button
- Checkboxes
- Links
- Copy buttons
- Attachment buttons
- Dropdowns
- Inline controls
- Toggle controls
- Any future interactive cell component

Clicking View must not cause the row handler to fire a second time.

## Mobile behavior

All mobile table cards must use the same interaction:

- The complete card is clickable.
- Tapping the card opens the detail drawer or existing responsive drawer overlay.
- Do not add a separate View Details button inside the mobile card.
- Do not navigate directly from the mobile card.
- Support keyboard activation where applicable.
- Maintain at least 44px tap targets.
- Preserve the existing mobile card design and information hierarchy.

Use the same selected record and detail content as desktop.

## Shared detail drawer behavior

Use the existing responsive drawer system:

- `DynamicDetailsDrawer`
- `ResponsiveOverlay`
- Existing specialized drawer components where domain-specific content is required

Do not create another unrelated drawer style.

All table detail drawers must follow the same shell behavior:

### Desktop

- Open from the right.
- Use the existing standard drawer width.
- Keep the drawer above the page content.
- Do not shift or resize the table.
- Keep the header fixed.
- Allow the body to scroll.
- Keep footer actions fixed and visible.

### Mobile

- Use the existing responsive drawer or bottom-sheet behavior.
- Do not display a narrow desktop drawer on mobile.
- Keep the close action accessible.
- Preserve the user’s table search, filters, tab, page, and scroll state after closing.

### Drawer structure

Each detail drawer must contain:

1. Header
   - Contextual detail title
   - Close button

2. Body
   - Record summary
   - Status
   - All meaningful record fields
   - Attachments when available
   - Related meeting or record information
   - Audit or workflow information where available

3. Footer
   - Existing contextual actions
   - Actions filtered by permissions and record status
   - Buttons arranged using the project’s existing drawer footer pattern

Do not show empty fields, raw `undefined`, raw object values, hidden technical metadata, or duplicate information.

Do not hardcode fake detail information.

## Preserve specialized drawers

Some pages already have specialized detail drawers. Keep their domain-specific content and actions, but make their opening behavior consistent.

Preserve and standardize:

- `DynamicDetailsDrawer`
- `UserDetailDrawer`
- Role details overlay
- `SpecialRegistrationDrawer`
- Any existing meeting, agenda, Board Pack, document, minutes, decision, resolution, action-item, permission, declaration, RSVP, archive, report, or governance detail drawer

Do not replace a complete specialized drawer with a generic drawer that loses information or actions.

All specialized drawers must still open through the same `onViewRow` interaction contract.

## GeneratedTablePage

Update:

`src/app/components/pages/GeneratedTablePage.tsx`

This component controls many pages, so fixing it correctly should standardize most of the system.

Requirements:

- Table row click opens `DynamicDetailsDrawer`.
- View action opens the same `DynamicDetailsDrawer`.
- Use the same selected-row state for both.
- Keep the current drawer columns and drawer-title logic.
- Keep all working `drawerActions`.
- Keep Edit, Approve, Reject, Start Meeting, Request Revision, Cancel, Postpone, Publish, Archive, Download, Print, Assign, and other contextual actions inside the drawer.
- Do not expose those actions in the table row.
- Do not call `cfg.onCustomAction` for the standard `view` action.
- `view` must always open the drawer first.
- Custom actions must continue to work from the drawer footer.
- Closing an edit or action modal must return users to the correct page state.
- Do not reset search, filters, pagination, KPI visibility, or table scroll when the drawer closes.

All pages that use `GenPage` must inherit this behavior automatically.

## Page configuration cleanup

Audit:

- `src/app/data/modulePageConfigs.ts`
- `src/app/pages/modulePageUtils.ts`
- Every `PageCfg` definition
- Every shared action set

Standardize the configuration rules:

- `actions` for table rows must contain only the shared View action.
- All other actions must use `drawerActions`.
- Do not use `MEETING_ACTIONS` with Start Meeting directly in a table row.
- Move Start Meeting into the meeting detail drawer.
- Keep status and permission checks intact.
- Do not remove action resolver logic.

Update comments and types so future developers understand:

- Table actions contain only View.
- Workflow actions belong in the detail drawer.
- Row click and View use one handler.
- Do not navigate directly from a table row.

## My Tasks page

Update:

`src/app/pages/dashboard/PSRDashboardPage.tsx`

The current My Tasks rows navigate directly through `navigateToTask`.

Change this interaction:

- Clicking a task row opens a Task Details drawer.
- Clicking View opens the same Task Details drawer.
- Tapping a mobile task card opens the same Task Details drawer.
- Do not navigate immediately.

Create or reuse a task-detail drawer that shows:

- Task title
- Supporting description
- Task type
- Status
- Due date
- Human-readable urgency
- Related meeting or record
- Related record identifier
- Assignment information
- Relevant workflow context

The drawer footer must contain one contextual primary action, such as:

- Open Task
- Review Approval
- Review Board Pack
- Confirm Attendance
- Submit Declaration
- Review Minutes
- Sign Minutes
- Cast Vote
- Open Action Item

That drawer action may call the existing `navigateToTask(task)` logic.

Preserve the current task resolver, task counts, search, filters, tabs, KPI filtering, sorting, and pagination.

This new drawer-first behavior replaces the earlier direct-navigation behavior.

## Meetings tables

For every meeting table:

- Row click opens Meeting Details.
- View opens Meeting Details.
- Start Meeting, Join Meeting, Resume, Approve, Reject, Edit, Postpone, Manage Participants, RSVP, Board Pack, and related actions must be inside the Meeting Details drawer where relevant.
- Do not keep Start Meeting as a second row action.
- Preserve live-meeting validation and status rules.
- Do not start or join a meeting by clicking the row.

## Agenda, documents, and Board Packs

For every agenda, document, and Board Pack table:

- Row click opens the selected record’s detail drawer.
- View opens the same drawer.
- Edit, approve, reject, defer, publish, archive, download, upload version, and review actions remain inside the drawer.
- Preserve attachments and document preview behavior.
- Do not open attachment preview automatically when the row is clicked.

## Decisions and follow-up tables

For decisions, resolutions, votes, questions, minutes, and action items:

- Row click opens the selected detail drawer.
- View opens the same drawer.
- Workflow actions remain inside the drawer.
- Preserve current resolver permissions and status checks.
- Do not open edit or approval modals directly from the View action.

## Administration tables

Apply the same interaction to:

- `UserManagementPage.tsx`
- `RoleManagementPage.tsx`
- `PermissionListPage.tsx`
- `SpecialRegistrationPage.tsx`

Requirements:

### User Management

- Row click and View open `UserDetailDrawer`.
- Keep Edit, Reassign Role, Activate/Deactivate, and Delete in the drawer.
- Preserve permission checks.

### Role Management

- Row click and View open the role details drawer.
- Keep Edit, Duplicate, and Delete in the drawer.
- Do not open the edit modal directly from the table.

### Permission List

- Row click and View open `DynamicDetailsDrawer`.
- Keep Edit and Delete actions inside the drawer where allowed.

### Special Registration

- Row click and View open `SpecialRegistrationDrawer`.
- Keep Edit, Approve, and Reject inside the drawer.
- Preserve completeness validation and attachment behavior.

## Report and archive tables

Every report and archive row must also open a detail drawer.

For aggregate report rows:

- Show the selected row’s full breakdown in the drawer.
- Preserve grouped values and labels.
- Do not invent record-level information that is not available.
- Use a contextual title such as `Report Details`, `Committee Summary`, or the configured drawer title.
- Keep Download and Print actions in the drawer where they already exist.

## Embedded and modal tables

Audit all raw or compact tables in:

`src/app/pages/meetings/MeetingContextualModals.tsx`

Replace or connect them to the shared compact table interaction.

Requirements:

- Row click opens a detail drawer above the current modal.
- View opens the same drawer.
- The drawer must not appear behind the modal.
- Use the project’s portal and z-index system.
- Closing the drawer returns the user to the still-open parent modal.
- Closing the parent modal must also close any child detail drawer.
- Do not create multiple stacked detail drawers.
- Preserve the modal’s current data and workflow actions.

After this work, no embedded table should have a different View behavior.

## Drawer layering and state

Ensure:

- Only one detail drawer is open at a time.
- Opening another record replaces the current selected record cleanly.
- A drawer never appears underneath another overlay.
- Edit, approve, reject, or confirmation modals opened from the drawer appear above it.
- Close the drawer before opening a full-page modal when required by the existing pattern.
- Closing an action modal must not leave an invisible overlay.
- Escape closes only the topmost overlay.
- Browser and table state remain stable.

## Permissions

Respect all existing permissions.

- Show View only when the user can view the record.
- When viewing is not allowed, do not make the row clickable.
- Do not expose hidden drawer fields or footer actions.
- Do not replace existing status-based and role-based action resolvers.
- Do not grant access through row click when the View button is hidden.

## Accessibility

Ensure:

- Clickable rows are keyboard accessible.
- Enter and Space open the detail drawer.
- View buttons have contextual accessible labels.
- View buttons stop event propagation.
- Focus indicators remain visible.
- Focus moves to the drawer when opened.
- Focus returns to the triggering row or View button when closed.
- The drawer has an accessible title and description.
- Close controls have clear accessible labels.
- Status is not communicated only through color.
- Mobile cards expose the same record label as desktop rows.

## Future table rule

All future tables must use the same contract:

- Use `UnifiedDataTable` from `src/app/components/tables`.
- Provide `onViewRow`.
- Use only the shared View table action.
- Open a detail drawer before any workflow navigation.
- Put secondary actions inside the drawer.
- Use `UnifiedMobileCard` through the shared table component.
- Do not build raw page-level tables.
- Do not create a separate View modal.

Add this rule to the existing developer handbook or table documentation.

Do not create any User Guide or Help content while updating documentation. The User Guide feature must remain hidden.

## Validation checklist

Verify every table in the system:

- Clicking a desktop row opens the correct detail drawer.
- Clicking View opens the same drawer.
- Pressing Enter or Space opens the same drawer.
- Tapping a mobile card opens the same drawer.
- View does not fire the row handler twice.
- No View action navigates directly to another page.
- No View action opens a popup modal.
- Every table row has only one visible action.
- The single action is View.
- The Actions column remains last.
- Other working actions are available inside the drawer.
- Drawer actions respect status and permission rules.
- The exact selected record is displayed.
- Search, filter, tab, pagination, and scroll state remain unchanged after closing.
- Embedded modal tables open drawers above the modal.
- Mobile drawers use the existing responsive behavior.
- My Tasks opens Task Details before workflow navigation.
- Meetings do not start or join from a row click.
- No working API, route, registry, drawer, modal, permission, or business rule is removed.
- No page-level raw table keeps a different View interaction.
- The project builds without TypeScript errors.
- Existing table and drawer tests pass.
- Add tests for row click, View click, keyboard opening, mobile card opening, event propagation, focus return, and overlay layering.

## Golden Rules

- Do not break solved issues.
- Do not change unrelated files.
- Do not remove working actions.
- Do not change table data, columns, filters, APIs, routes, permissions, or business logic.
- Use one interaction contract for every table.
- Row click, View, and mobile card must open the same detail drawer.
- Keep only one visible action in table rows.
- Move all other actions into the drawer.
- Preserve specialized drawer content.
- Reuse existing components and styles.
- Test desktop, tablet, and mobile.
- Keep EN/BN language parity.
- Keep the User Guide hidden.
- Do not create any User Guide content.