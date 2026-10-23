Work directly inside the latest **NCC Bank Board Meeting Solution** React and TypeScript project.

Redesign only:

`Home → My Tasks`

Make the page follow the same restrained, compact visual language already used in the updated Overview dashboard.

The current My Tasks page is too table-heavy and visually noisy because it uses:

* Red priority dots
* Colored type pills
* Repeated overdue labels
* A separate action button on every row
* Cramped `Type / Due / Action` columns
* Inline styles
* Too many competing semantic colors

Do not change unrelated pages, routes, APIs, registries, permissions, task-generation logic, dashboard layout, navigation, or themes.

# Files to inspect and update

Primary:

* `src/app/pages/dashboard/PSRDashboardPage.tsx`
* `src/styles/cards.css`

Reuse:

* `StatCard`
* `TabBar`
* `AppSearchField`
* `Button`
* `IconButton`
* `FilterPanel`
* `MobileFilterOverlay`
* Existing details drawers
* Existing task and entity registries
* Existing dashboard compact-row styles
* Existing theme and typography tokens

Do not rename or move `PSRDashboardPage.tsx`.

Do not create a second task page or another task registry.

# 1. Keep the page header

Keep:

* Heading: `My Tasks`
* Description: `Review approvals, documents, votes, declarations, and assigned follow-up actions.`

Use the same page-heading spacing, typography, and content width as the Overview page.

Remove inline heading styles and use existing typography classes or tokens.

# 2. Correct the task dataset

This page is called `My Tasks`, so it must show only work assigned to or required from the current signed-in user.

Filter tasks using existing:

* Current user ID
* User role
* Participant record
* Assigned approver
* Assigned reviewer
* Assigned action owner
* Required signer
* RSVP participant
* Declaration owner
* Minute reviewer

Do not display all organization-wide tasks to every user.

Preserve role-based visibility.

Examples:

* Company Secretary sees tasks assigned to the secretariat.
* Board member sees their own reviews, votes, RSVP, declarations, and signatures.
* Chairperson sees approvals and meeting controls they are authorized to perform.
* A normal participant must not see another person’s action items.

Deduplicate tasks using the source entity ID and assignment ID.

Do not show duplicate rows for the same:

* Meeting approval
* Agenda submission
* Board Pack review
* Action item
* Minutes review
* RSVP
* Declaration

Do not deduplicate genuinely separate assignments merely because their titles match.

# 3. Keep four compact summary cards

Keep these cards:

1. Open
2. Due Soon
3. Overdue
4. Completed This Month

Continue using the existing `StatCard`.

Make each summary card clickable:

* Open → show all open tasks
* Due Soon → show pending tasks due within the next seven days
* Overdue → show overdue tasks
* Completed This Month → show completed tasks from the current month

Use the same card sizing and spacing as the Overview attention cards.

Rules:

* Zero-value cards use the neutral tone.
* Do not use strong semantic color when the value is zero.
* Counts must update from the filtered current-user task dataset.
* Do not hardcode counts.
* Keyboard activation must work.

# 4. Replace the current table with a compact task list

Remove the current desktop table structure:

```text
Task | Type | Due | Action
```

Remove the cramped table header where `Type`, `Due`, and `Action` appear joined together.

Use one clean full-width task workspace based on the Overview dashboard’s compact-row pattern.

Recommended structure:

```text
Task workspace
├── Tabs, search, and filter
├── Compact task rows
└── Pagination
```

Reuse or extend:

* `.dash-compact-card`
* `.dash-compact-row`
* `.dash-compact-row__body`
* `.dash-compact-row__title`
* `.dash-compact-row__meta`
* `.dash-compact-row__due`

Do not create a visually unrelated list component.

# 5. Simplify the task toolbar

Use one clean toolbar.

Desktop layout:

```text
Tabs                                         Search  Filter
```

Keep these tabs:

* All
* Approvals
* Reviews
* Votes & Signatures
* Actions
* Declarations
* Completed

Use the existing `TabBar`.

Use `AppSearchField` instead of the current custom inline search input.

Search placeholder:

`Search tasks`

Use the shared `Button` component for Filter:

```tsx
<Button
  variant="secondary"
  size="sm"
  leadingIcon={Filter}
>
  Filter
</Button>
```

Do not use a raw locally styled `<button>`.

Do not add a separate page-level Add button. Tasks are created from their source workflows.

# 6. Make the Filter button functional

The current Filter button is decorative.

Connect it to the existing filter pattern.

Desktop:

* Use the existing filter panel or popover pattern.

Mobile:

* Use the existing bottom-sheet `MobileFilterOverlay`.

Available filters:

* Task type
* Due state
* Related meeting
* Status

Task type:

* Approval
* Review
* Vote or Signature
* RSVP
* Declaration
* Action

Due state:

* Overdue
* Due Today
* Due Soon
* Later
* No Due Date

Status:

* Pending
* In Progress
* Completed

Use existing shared buttons for:

* Apply Filters
* Clear
* Cancel

Show applied-filter chips using the existing pattern when filters are active.

Do not create a new filter visual system.

# 7. Use a dashboard-style task row

Each task row should contain only two main text lines.

Desktop structure:

```text
Task title                                          Due state
Related meeting or record · Task type
```

Example:

```text
Review meeting approval                            Overdue
128th Executive Committee Meeting · Approval
```

Example:

```text
Update Risk Register                               Due tomorrow
344th Board of Directors Meeting · Action
```

Example:

```text
Review Board Pack                                  8 Aug
Annual General Meeting · Review
```

Rules:

* Remove the red priority dot.
* Remove the full-height red accent line.
* Remove colored type pills.
* Remove the separate Action column.
* Remove visible `Approve`, `Update`, `Review`, or `View` buttons from every row.
* Do not use a table header.
* Do not repeat the same task state in multiple places.
* Keep the task title to one line with ellipsis when required.
* Keep related context to one line.
* Keep due state right-aligned.
* Add enough right padding so content does not touch the scrollbar.

Task type should appear as muted supporting text, not a colored badge.

# 8. Use restrained status colors

Use semantic color only for the due state:

* Overdue → error text
* Due Today → warning text
* Due Soon → normal or primary text
* Completed → success text
* Later → secondary text

Do not combine:

* Red dot
* Red border
* Red label
* Colored button

for the same overdue task.

One semantic signal per row is enough.

Use the same neutral row surface for every task.

Hover and keyboard focus:

* Use `var(--color-surface-hover)`
* Use the existing focus ring
* Do not change the whole row to a strong semantic color

# 9. Make the complete row actionable

The whole row must open the task’s direct workflow.

Use:

* `role="button"`
* `tabIndex={0}`
* Enter and Space keyboard support
* Visible focus state

Do not route every row to the generic My Tasks page.

Map tasks to their source records:

## Meeting approval

Open the selected Meeting details drawer in approval context.

## Agenda approval

Open the selected Agenda Item drawer or Agenda Management filtered to that meeting and record.

## Board Pack review

Open the selected Board Pack drawer or assigned review flow.

## RSVP

Open the selected Meeting RSVP workflow.

## Conflict declaration

Open the selected declaration form or drawer.

## Minutes review

Open the selected Minutes drawer or review workflow.

## Vote or signature

Open the selected meeting’s voting or signature workflow.

## Action item

Open the selected Action Item drawer.

## Completed task

Open the related completed record in read-only mode.

Use the task’s existing source ID.

Do not search records by title when an ID is available.

# 10. Reuse the dashboard task routing logic

The Overview dashboard already contains task-routing behavior.

Do not maintain two unrelated task-action routers.

Extract or share one helper when necessary, such as:

```text
resolveTaskTarget(task)
openTaskWorkflow(task)
```

Use the same logic for:

* Overview → My Tasks compact list
* Full My Tasks page
* Calendar task events
* Notification task links

Do not change the existing entity drawers or routes.

# 11. Improve task writing

Use task titles that describe one clear action.

Good:

* Review meeting approval
* Approve agenda submission
* Review Board Pack
* Confirm attendance
* Submit conflict declaration
* Review meeting minutes
* Update Risk Register
* Sign approved minutes
* Cast your vote

Avoid:

* `Approve: 128th Executive Committee...`
* Raw registry keys
* Repeated meeting titles in both lines
* Technical record IDs as the only context

Use the meeting title or source record as the second line.

Show a reference ID only when it provides useful context and no meeting title exists.

# 12. Friendly due writing

Continue using `friendlyDue`, but ensure the output is concise.

Use:

* Overdue
* Overdue by 3 days
* Due today
* Tomorrow
* Due in 3 days
* 8 Aug
* No due date

Do not show raw ISO dates.

Do not let long overdue values dominate the row.

For very old tasks, use:

`Overdue`

or:

`Overdue by 30+ days`

instead of displaying very large values such as `169 days overdue`.

# 13. Pagination

Keep pagination after the task list.

Use the shared `IconButton` component for:

* Previous page
* Next page

Do not use raw inline-styled buttons.

Show:

```text
1–10 of 38 tasks
```

instead of:

```text
38 tasks · page 1 of 4
```

Rules:

* Default to 10 tasks per page.
* Reset to page one after tab, search, filter, or KPI changes.
* Disabled pagination buttons must use the shared disabled state.
* Keep the footer compact.

# 14. Empty states

Use one restrained empty state.

For no open tasks:

Heading:

`All caught up`

Text:

`You have no pending tasks.`

For no search or filter results:

Heading:

`No matching tasks`

Text:

`Try changing your search or filters.`

For completed:

Heading:

`No completed tasks`

Text:

`Completed tasks from this month will appear here.`

Reuse the existing dashboard empty-state style.

Do not use a large illustration.

# 15. Move visual styling out of JSX

The current page contains extensive inline styles.

Move page-specific layout styles into `src/styles/cards.css`.

Use scoped classes such as:

* `.mytasks-page`
* `.mytasks-summary`
* `.mytasks-workspace`
* `.mytasks-toolbar`
* `.mytasks-list`
* `.mytasks-row`
* `.mytasks-row__body`
* `.mytasks-row__title`
* `.mytasks-row__meta`
* `.mytasks-row__due`
* `.mytasks-pagination`

Reuse `.dash-compact-*` classes where they already meet the requirement.

Do not duplicate visual values already controlled by:

* Button system
* Stat cards
* Tab bar
* Search field
* Filter components
* Theme tokens

Do not hardcode colors, radii, or typography inside `PSRDashboardPage.tsx`.

# 16. Responsive behavior

## Desktop

* Four summary cards in one row
* Tabs left, search and filter right
* Full-width compact task list
* Task title and due state remain readable
* No horizontal scrolling

## Tablet

* Summary cards use two columns when necessary
* Toolbar may wrap cleanly
* Tabs remain horizontally scrollable
* Search and Filter remain in the same row when space permits

## Mobile

Order:

1. Page heading
2. Summary cards
3. Tabs
4. Search and Filter in one row
5. Task cards
6. Pagination

Mobile task card:

```text
Task title                            Due
Related meeting
Task type
```

Rules:

* Entire card tap opens the task workflow.
* Do not add a separate View Details button.
* Do not recreate desktop action buttons.
* Minimum 44px interactive height.
* No horizontal overflow.
* Use the existing mobile filter bottom sheet.

# Acceptance criteria

The task is complete only when:

* My Tasks follows the same restrained style as the Overview dashboard.
* Only tasks relevant to the current user are shown.
* Duplicate source tasks are removed.
* The four summary cards are dynamic and clickable.
* The current table header is removed.
* `Type`, `Due`, and `Action` no longer appear cramped.
* Task rows contain no more than two primary text lines.
* Colored type badges are removed.
* Red priority dots and row borders are removed.
* Per-row action buttons are removed.
* Entire rows open their direct workflows.
* Search uses `AppSearchField`.
* Filter uses the existing desktop and mobile filter system.
* Pagination uses shared `IconButton` components.
* Task writing and due labels are human-readable.
* No raw ISO dates appear.
* No inline visual button styles remain.
* Existing registries, permissions, actions, routes, drawers, and business logic remain intact.
* Light mode, Dark Mode, desktop, tablet, and mobile work.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not change the Overview dashboard.
* Do not change unrelated pages.
* Do not rename or move `PSRDashboardPage.tsx`.
* Do not change API contracts or registry IDs.
* Do not show organization-wide work as personal tasks.
* Do not create another task registry.
* Do not create another button, tab, search, filter, card, or pagination system.
* Reuse the updated dashboard compact-row pattern.
* Reuse the unified Button and IconButton system.
* Keep semantic color use restrained.
* Do not add a visible action button to every task row.
* Preserve desktop, tablet, mobile, light mode, dark mode, and every existing theme.
