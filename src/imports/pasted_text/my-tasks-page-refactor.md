Fix the My Tasks page and complete the unified table system across the Board Meeting Solution.

Study the current project first. Reuse the existing design system, table patterns, registries, routing, responsive behavior, shared components, theme tokens, and business logic. Do not create a new visual style.

The current My Tasks implementation is only partially complete. It introduced `UnifiedDataTable`, but it broke task ownership, reduced the task count from 38 to 1, created a double-card table, stacked Search and Filter, omitted Export and Print, and did not complete the project-wide table migration.

The final result must fix both the data logic and the UI.

## 1. Restore the correct task dataset

The logged-in user is Rafiqul Islam with the Meeting Secretary role.

The My Tasks page must include all tasks that belong to the user directly or belong to the user’s workflow role. Do not depend only on an exact assignee-name match.

Restore role-based task visibility for relevant workflow roles, including:

- Meeting Secretary
- Secretariat
- Administrator
- Other roles already supported by the project

Do not hardcode the number 38. Generate the correct count from the current registries and workflow rules.

The dashboard and My Tasks page must use the same task source and the same calculation rules.

Create one shared task resolver or selector that returns:

- Task ID
- Task title
- Supporting description
- Related record title
- Related record ID
- Task type
- Task status
- Due date
- Human-readable due label
- Urgency
- Ownership
- Completed state
- Target route
- Target drawer, modal, or workflow identifier

Use this shared task resolver in both:

- `src/app/pages/dashboard/DashboardPage.tsx`
- `src/app/pages/dashboard/PSRDashboardPage.tsx`

The Dashboard “My Tasks” count and My Tasks page count must always match for the same logged-in user and active data.

Do not keep two separate task-building systems.

## 2. Preserve all current task sources

Keep and correctly map all current task categories:

- Meeting approvals
- Agenda approvals
- Board Pack reviews
- Document reviews
- RSVP or attendance confirmation
- Conflict declarations
- Minutes reviews
- Minutes signatures
- Votes
- Assigned actions
- Follow-up actions
- Completed tasks

Do not remove existing task categories.

If votes or signatures already have registries, connect them to the task resolver.

If they use a different existing source, reuse that source.

Do not create fake static task rows.

If a task category has no valid data, the tab may display zero, but the task-generation logic must exist.

## 3. Fix RSVP and related due dates

RSVP tasks currently show no due date because the RSVP record does not contain the meeting date.

Resolve the RSVP task’s date through its related meeting using `meeting_id`.

Use the correct related-record lookup for every task type.

Due-date logic must support:

- Overdue
- Due today
- Due soon
- Future
- No due date
- Completed

Use the same due-date calculation for:

- KPI cards
- Tabs
- Search results
- Filter results
- Sorting
- Table rows
- Dashboard cards

Default task sorting:

1. Overdue
2. Due today
3. Due soon
4. Future
5. No due date
6. Completed

Within each group, sort by the nearest due date.

## 4. Fix the My Tasks page UI

Keep unchanged:

- Main navigation
- Page title
- Page description
- Four KPI cards
- Existing routes
- Existing registries
- Existing APIs
- Existing permissions
- Existing task workflows
- Existing drawer and modal patterns
- Existing desktop shell
- Existing mobile navigation

Improve the page using the same visual system as the Overview dashboard and Agenda Management table.

## 5. KPI cards

Keep these four cards:

- Open
- Due Soon
- Overdue
- Completed This Month

Use the same height, padding, radius, icon treatment, typography, and spacing as the compact KPI cards on the Overview dashboard.

The cards must remain clickable.

When selected:

- Apply the related task filter.
- Show a clear selected state using existing theme tokens.
- Add an applied-filter chip above the table.
- Clicking the selected card again must clear the filter.
- The visible task count must update immediately.

Do not create hardcoded KPI values.

## 6. Use one continuous table card

The My Tasks area must use one single table surface.

Do not place a second bordered or rounded `CardTable` inside `UnifiedDataTable`.

The complete structure must be:

- Table toolbar
- Tabs
- Filter area when open
- Applied filter chips
- Table header
- Table body
- Pagination footer

All sections must appear inside one continuous card.

Update the internal table renderer so `UnifiedDataTable` can render the table without adding another card wrapper.

## 7. Desktop toolbar

The desktop toolbar must remain on one row.

Exact order:

1. Task Queue
2. Dynamic count badge
3. Flexible empty space
4. Search
5. Filter
6. Export
7. Print

The final structure should visually follow:

`Task Queue   38 tasks                     Search tasks   Filter   Export   Print`

Fix the width problem caused by `AppSearchField` using `width: 100%`.

Do not change the shared search field globally in a way that breaks other pages.

Add a controlled width or toolbar-specific wrapper for desktop.

Do not allow Search and Filter to stack at normal desktop widths.

The toolbar may wrap only at genuinely narrow responsive breakpoints.

Use the same labeled icon-button style as Agenda Management for:

- Filter
- Export
- Print

Do not use icon-only buttons on desktop.

Use the existing export-disabled behavior until real export functionality exists.

Use the existing print behavior.

Do not create fake export data.

## 8. Tabs with dynamic counts

Keep these tabs:

- All
- Approvals
- Reviews
- Votes & Signatures
- Actions
- Declarations
- Completed

Add dynamic counts beside every tab label.

Example:

- All 38
- Approvals 4
- Reviews 6
- Votes & Signatures 2
- Actions 18
- Declarations 8
- Completed 0

Extend the shared tab configuration to support an optional count.

Reuse the existing `TabBar` component.

Tabs must remain directly below the toolbar.

Do not wrap tabs into a separate card.

Allow horizontal scrolling on smaller widths.

Use the current active-tab underline and typography.

## 9. Table columns

Use these desktop columns in this exact order:

1. Task
2. Related Meeting / Record
3. Type
4. Due
5. Status
6. Actions

The Actions column must remain last.

The table should use the same shared table header, row spacing, divider, hover, focus, status badge, pagination, and responsive behavior used by Agenda Management.

Do not add red left borders to overdue rows.

Do not use multiple urgency indicators for the same status.

Use one standard status badge.

## 10. Structured Task cell

Extend `UnifiedDataTable` column definitions so cells can support structured content, not only plain strings.

The Task column should support:

- Task-type icon
- Primary action-oriented title
- Secondary supporting text

Example:

Primary:
`Review meeting approval`

Secondary:
`Approval required`

Do not use the meeting title as the task title.

Use action-first task labels such as:

- Review meeting approval
- Approve agenda submission
- Review Board Pack
- Confirm attendance
- Submit conflict declaration
- Review meeting minutes
- Sign approved minutes
- Cast your vote
- Update Risk Register
- Prepare Budget Implementation Report

The related meeting or record title must appear only in the Related Meeting / Record column.

## 11. Type and due presentation

The Type column may use the project’s existing compact badge style.

Examples:

- Approval
- Review
- Action
- RSVP
- Declaration
- Vote
- Signature

The Due column should display human-readable urgency first and the exact date second.

Examples:

`Overdue by 3 days`
`Due: 1 May 2026`

`Due tomorrow`
`Due: 6 May 2026`

`Due in 2 days`
`Due: 7 May 2026`

For no due date, display a neutral placeholder.

Do not show incorrect or missing dates when the date can be resolved from the related record.

## 12. Status and action

Use the shared `StatusBadge`.

Status examples:

- Overdue
- Due Soon
- Pending
- In Progress
- Completed

The Actions column must contain only one compact View action.

The current table renderer hardcodes the ellipsis and View action. Remove that hardcoded behavior.

Make the row action truly configuration-driven.

Support:

- Custom action label
- Custom action icon
- Action ID
- Click handler
- Disabled state
- Permission visibility

For My Tasks, use one View action.

Do not display an additional overflow menu unless the page configuration explicitly requests it.

## 13. Direct task workflow routing

Do not navigate tasks only to a general module list.

Clicking a task row or View action must open the exact task record and workflow.

Examples:

- Meeting approval → selected meeting approval drawer or workflow
- Agenda approval → selected agenda submission
- Board Pack review → selected Board Pack
- RSVP → selected meeting attendance response
- Declaration → selected conflict declaration
- Minutes review → selected minutes record
- Signature → selected signature workflow
- Vote → selected voting workflow
- Action item → selected action-item drawer
- Completed task → read-only selected record

Reuse the existing project drawer, modal, route state, query parameter, and record-selection patterns.

Do not invent a new modal system.

The action button must stop row-click propagation.

The row must remain keyboard accessible with Enter and Space.

## 14. Correct count grammar

The table count must support singular and plural labels.

Examples:

- `1 task`
- `2 tasks`

Do not display `1 tasks`.

Add singular and plural count-label support to `UnifiedDataTable`.

## 15. Search, filter, and count behavior

Search must support relevant task fields:

- Task title
- Related meeting or record
- Task type
- Status
- Identifier

Search, tabs, KPI selection, and filters must work together.

The count badge must always show the currently displayed result count.

Changing any of these must reset pagination to page 1:

- Search
- Tab
- KPI selection
- Applied filters
- Page size

Filter reset must clear both draft and applied filter values.

Show applied-filter chips below the tabs or filter area.

Filtered empty states must provide a clear action to remove search and filters.

## 16. Empty, loading, and error states

Use the standard table state pattern.

Required empty-state messages:

For no pending tasks:

`All caught up`
`You have no pending tasks.`

For search or filter with no results:

`No matching tasks`
`Try changing your search or filters.`

For completed tab with no results:

`No completed tasks`
`Completed tasks from this month will appear here.`

Keep these states compact inside the table body.

Do not use a large illustration.

Add:

- Loading skeleton
- Error state
- Retry action
- Clear-filter action
- Accessible status announcement

Fix `CardTable` so it uses the empty-state content passed by `UnifiedDataTable` instead of always rendering `No records found`.

## 17. Mobile behavior

Use the existing mobile table system and `UnifiedMobileCard`.

Mobile order:

1. Page header
2. KPI cards in a 2 × 2 layout
3. Horizontally scrollable tabs
4. Search and Filter in one row
5. Applied-filter chips
6. Task cards
7. Pagination

Mobile card content:

- Primary: Task title
- Secondary: Related meeting or record
- Meta: Type and due label
- Status: Standard status badge

Requirements:

- The full card must be clickable.
- Do not add a View Details button.
- Hide Export and Print.
- Use the existing bottom-sheet filter overlay.
- Keep Search and Filter in one row.
- Use an icon-based Filter button on mobile.
- Show an active-filter indicator when filters are applied.
- Maintain at least 44px tap targets.
- Preserve the same task-routing behavior as desktop.

Do not change desktop while fixing mobile.

## 18. Complete the unified table architecture

Use one public table component:

`src/app/components/tables/UnifiedDataTable.tsx`

Keep these as internal rendering layers:

- `ResponsiveTable`
- `CardTable`
- `UnifiedMobileCard`

Pages must import the table only through:

`src/app/components/tables/index.ts`

Do not import `ResponsiveTable`, `CardTable`, or `UnifiedMobileCard` directly from page files.

## 19. Migrate all current full-page tables

Replace duplicated table wrappers and toolbars with `UnifiedDataTable` in:

- `src/app/components/pages/GeneratedTablePage.tsx`
- `src/app/pages/dashboard/PSRDashboardPage.tsx`
- `src/app/pages/administration-requests/UserManagementPage.tsx`
- `src/app/pages/administration-requests/RoleManagementPage.tsx`
- `src/app/pages/administration-requests/PermissionListPage.tsx`
- `src/app/pages/administration-requests/SpecialRegistrationPage.tsx`

Preserve every page’s current:

- Data
- Columns
- Search behavior
- Filters
- Pagination
- Loading states
- Error states
- Empty states
- Row actions
- Drawers
- Modals
- APIs
- Routes
- Permissions
- Create and edit flows
- Business logic

Do not redesign unrelated pages.

## 20. Migrate modal and embedded tables

`MeetingContextualModals.tsx` still contains raw `<table>` elements.

Replace those tables with the compact or embedded variant of `UnifiedDataTable`.

The compact variant may hide:

- Search
- Filter
- Export
- Print
- Pagination

when they are not needed.

It must still reuse:

- Shared table header
- Shared cells
- Shared row spacing
- Shared status badges
- Shared empty state
- Shared responsive behavior

After migration, raw `<table>` markup must exist only inside the internal shared table renderer.

## 21. CSS cleanup

Remove or stop using obsolete My Tasks table styles, including unused rules for:

- `.mytasks-list`
- `.mytasks-row`
- `.mytasks-row__icon`
- `.mytasks-row__body`
- `.mytasks-row__badge`
- `.mytasks-pagination`
- Old task toolbar styles
- Old custom task filter styles

Keep styles still needed for:

- Page spacing
- KPI layout
- Selected KPI state
- Non-table content

Do not remove classes that are still used elsewhere.

Consolidate duplicate table styles across:

- `tables.css`
- `globals.css`
- `my-tasks.css`
- `buttons.css`
- `filters.css`

Use one authoritative shared style for every table element.

## 22. Accessibility

Ensure:

- Meaningful table `aria-label`
- Contextual search label
- Filter button uses `aria-expanded`
- Tabs expose selected state
- Keyboard-accessible rows
- Enter and Space activate rows
- Action buttons stop row-click propagation
- Visible focus indicators
- Status is not communicated only through color
- Loading and empty states use status semantics
- Count updates are announced politely
- Mobile controls meet tap-target requirements

## 23. Validation checklist

Verify all of the following:

- Rafiqul Islam sees the correct role-based task list again.
- The task count is not reduced to one due to exact-name ownership filtering.
- Dashboard My Tasks count and My Tasks page count match.
- KPI totals use the same shared task resolver.
- RSVP tasks resolve due dates from their related meeting.
- Vote and signature tasks are generated when their registries contain relevant records.
- Search and Filter stay in one row on desktop.
- Export and Print appear on desktop.
- Export and Print are hidden on mobile.
- Tabs display dynamic counts.
- The table uses one continuous card.
- There is no nested CardTable surface.
- Task cells support icon, primary text, and secondary text.
- Due cells show urgency and exact date.
- Only one row action appears.
- The action is configuration-driven.
- Row click and View open the exact selected workflow.
- `1 task` and `2 tasks` display correctly.
- Search, tab, KPI, and filters work together.
- Pagination resets after filtering changes.
- Desktop empty states use the provided contextual message.
- Filtered empty states include a clear action.
- Mobile uses `UnifiedMobileCard`.
- Mobile Search and Filter remain in one row.
- Mobile filter opens as a bottom sheet.
- All full-page tables use `UnifiedDataTable`.
- Modal tables use the compact unified variant.
- No page-level raw `<table>` elements remain.
- No page imports internal table components directly.
- The project builds without TypeScript errors.
- Existing APIs, routes, drawers, modals, and business logic still work.
- Light theme, dark theme, font scaling, EN/BN support, desktop, tablet, and mobile remain stable.

## Golden Rules

- Do not break solved issues.
- Do not change unrelated files.
- Do not remove working features.
- Do not hardcode task counts or task rows.
- Do not change APIs, routes, registries, permissions, or business logic.
- Preserve the existing dashboard and navigation.
- Reuse existing components and design tokens.
- Use one unified table system.
- Keep only one row action.
- Preserve desktop and mobile behavior.
- Test responsive behavior.
- Keep EN/BN language parity.