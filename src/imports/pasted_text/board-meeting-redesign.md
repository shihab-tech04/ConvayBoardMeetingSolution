````text
Work directly inside the latest project only:

Board Meeting solution (26)

Redesign and repair these two pages:

1. Home → My Tasks
2. Home → My Calendar

The current versions are functionally closer, but the page hierarchy, proportions, spacing, card usage, information density, and interaction patterns have become visually worse.

Do not continue patching the current layouts. Rebuild the page compositions using the existing design system and the strongest visual patterns already used in Home → Overview.

Use the current My Tasks and My Calendar pages as functional references only. Do not preserve their current visual structure when it conflicts with this prompt.

# Files to inspect first

Primary page files:

- `src/app/pages/dashboard/PSRDashboardPage.tsx`
- `src/app/pages/dashboard/CombinedDashboardPage.tsx`
- `src/app/pages/dashboard/homeWorkspaceUtils.ts`
- `src/app/pages/dashboard/DashboardPage.tsx`

Primary styles:

- `src/styles/my-tasks.css`
- `src/styles/my-calendar.css`
- `src/styles/cards.css`
- `src/styles/buttons.css`
- `src/styles/tabs.css`
- `src/styles/typography.css`
- `src/styles/tokens.css`

Shared components:

- `src/app/components/cards/StatCard.tsx`
- `src/app/components/tabs/TabBar.tsx`
- `src/app/components/forms/AppSearchField.tsx`
- `src/app/components/buttons/Button.tsx`
- `src/app/components/buttons/IconButton.tsx`
- `src/app/components/filters/FilterPanel.tsx`
- `src/app/components/filters/MobileFilterOverlay.tsx`
- `src/app/components/filters/AppliedFilterChips.tsx`
- `src/app/components/pages/GeneratedTablePage.tsx`
- Existing drawers and meeting-action resolver

Do not rename or move:

- `PSRDashboardPage.tsx`
- `CombinedDashboardPage.tsx`

# Main design direction

Both pages must feel like polished parts of the same Board Meeting product as Overview.

Use the following principles:

- Strong page-level hierarchy
- Fewer large containers
- Purposeful use of cards
- Comfortable spacing
- Clear visual anchors
- Restrained semantic colors
- Human-readable content
- No repeated buttons or status labels
- No unnecessary side panels
- No database-style presentation
- No tiny compressed typography
- No technical IDs as the main context
- No organization-wide data presented as personal information

Do not create another independent card, button, tab, filter, typography, or theme system.

# Shared page structure

Both pages must use:

```tsx
<div className="dashboard-page home-workspace-page">
````

Reuse:

* `dashboard-page__header`
* `dashboard-page__header-body`
* `dashboard-page__title`
* `dashboard-page__subtitle`

Maintain:

* Desktop page padding: existing `dashboard-page` padding
* Mobile page padding: existing responsive padding
* Internal page scrolling
* Same heading alignment as Overview
* Same content width and left edge as Overview
* Safe bottom spacing above the floating Help button

Do not add another page-shell class that overrides the application layout.

# Phase 1 — Fix personal data logic before styling

The current task and event builders still use `userHasWorkflowRole` as a broad bypass. This allows a Meeting Secretary or administrator to receive many organization-wide records as personal tasks and calendar events.

Remove `|| userHasWorkflowRole` as a universal inclusion rule.

Use explicit ownership and workflow responsibility.

Match the current user using available:

* User ID
* Employee ID
* Name
* Participant record
* Assigned person
* Assigned role
* Meeting secretary
* Meeting organizer
* Chairperson
* Reviewer
* Approver
* Minute taker
* Action-item owner
* RSVP participant
* Declaration owner

Use `useParticipantRegistry()` for meeting membership where required.

## Meeting Secretary scope

A Meeting Secretary may receive workflow tasks only when the user is:

* The secretary of that meeting
* The organizer of that meeting
* Explicitly assigned as reviewer or approver
* Responsible through an existing meeting workflow record

Being a Meeting Secretary must not automatically assign:

* Every RSVP
* Every action item
* Every declaration
* Every Board Pack
* Every minutes record
* Every organization-wide meeting

## Deduplication

Deduplicate using:

```text
source type + source record ID + assignment identity
```

Do not deduplicate separate legitimate assignments just because their titles match.

Use the existing `deduplicateTasks()` helper or improve it centrally.

Do not maintain separate identity-matching rules in both pages.

# Phase 2 — Improve shared Home workspace utilities

Expand:

`src/app/pages/dashboard/homeWorkspaceUtils.ts`

Use it as the shared source for:

* User identity matching
* Personal task eligibility
* Personal calendar-event eligibility
* Task deduplication
* Meeting-title resolution
* Source-record routing information
* Friendly source context

Do not create another registry or another separate task/event data store.

Use shared types instead of redefining nearly identical local task and event models where practical.

Each task and event must preserve:

* `sourceType`
* `sourceId`
* `meetingId`
* Friendly title
* Friendly related-record context
* Assignment identity
* Current status
* Due date or event date

# My Tasks redesign

# 1. Page header

Keep:

Heading:

`My Tasks`

Description:

`Review approvals, documents, votes, declarations, and assigned follow-up actions.`

Use the same width and vertical spacing as Overview.

Do not allow the description to wrap unnecessarily on large desktop screens.

# 2. Replace the oversized KPI row with compact summary cards

Keep these four summaries:

* Open
* Due Soon
* Overdue
* Completed This Month

Do not use the current tall 110px cards on this page.

Extend the existing `StatCard` component with an optional density prop:

```ts
density?: "default" | "compact"
```

Use:

```tsx
density="compact"
```

for My Tasks and My Calendar summaries only.

The default StatCard used by Overview must remain unchanged.

Compact summary-card behavior:

* Height approximately 84–92px
* Reduced internal padding
* Value and label remain readable
* Icon container approximately 40px
* Same border, radius, theme, focus, and selected behavior
* No heavy shadows
* No oversized empty area

Summary cards remain clickable and keyboard accessible.

Selected summary card:

* Subtle primary border
* Very soft primary surface
* `aria-pressed`
* No thick glow
* No strong colored background

Only one summary filter may be active at a time.

# 3. Rebuild the Task workspace

Use one clear workspace card.

Structure:

```text
Task workspace
├── Header
│   ├── Task queue and result count
│   └── Search and Filter
├── Category tabs
├── Applied filters
├── Grouped task list
└── Pagination
```

Do not split this into several stacked cards.

## Workspace header

Left:

```text
Task queue
13 assigned tasks
```

Use:

* Clear section heading
* Muted secondary count
* No count pill

Right:

* Search tasks
* Filter

Search and Filter must appear on the same row on desktop.

Do not stack the Filter button below Search on desktop.

Use a grid or flex layout that keeps:

* Search width around 240–280px
* Filter button directly beside Search
* Clear alignment with the workspace heading

On tablet and mobile, allow clean wrapping.

## Category tabs

Keep:

* All
* Approvals
* Reviews
* Votes & Signatures
* Actions
* Declarations
* Completed

Use the existing `TabBar`.

Do not create separate custom tab styling.

Do not show a permanently empty category when no source registry or feature supports it. Hide unsupported empty categories rather than presenting dead navigation.

Keep the tab row visually separate from Search and Filter.

# 4. Group tasks by urgency

Do not show one long undifferentiated list where every row ends with `Overdue`.

Group visible tasks into:

1. Needs attention
2. Upcoming
3. Completed

## Needs attention

Contains:

* Overdue
* Due Today
* Blocked tasks when supported

Group heading example:

```text
Needs attention · 5
```

## Upcoming

Contains:

* Due Soon
* Later
* No Due Date
* Pending work without an overdue condition

## Completed

Contains completed records when the Completed tab or summary is selected.

Do not show an empty group.

Group headings must be compact and low emphasis. They are not cards.

# 5. Redesign task rows

Use a calm, structured row.

Desktop structure:

```text
[icon]  Task action title                         Due information
        Related meeting or record · Task type
```

Examples:

```text
Review meeting approval                          Overdue by 3 days
128th Executive Committee Meeting · Approval
```

```text
Update Risk Register                             Tomorrow
344th Board of Directors Meeting · Action
```

```text
Review Board Pack                                8 Aug
Annual General Meeting · Review
```

Rules:

* Use an action-oriented task title.
* Do not use the meeting title as the task action title.
* Resolve technical meeting IDs into friendly meeting titles.
* Show IDs only as a fallback when no useful title exists.
* Maximum two text lines.
* Keep the title readable.
* Keep the secondary line muted.
* Use one neutral icon container.
* Do not tint the icon by urgency.
* Do not use colored type pills.
* Do not use a red left border.
* Do not use warning left borders.
* Do not use a status badge pill on every row.
* Do not add Review, Update, Approve, or View buttons to every row.
* The whole row opens the direct workflow.
* Use a subtle hover surface.
* Use the existing focus ring.

## Due writing

Use:

* Overdue
* Overdue by 3 days
* Overdue by 30+ days
* Due today
* Tomorrow
* Due in 3 days
* 8 Aug
* No due date
* Completed

Use semantic text color only on the due value:

* Error for overdue
* Warning for due today
* Primary or normal text for due soon
* Success for completed
* Secondary text for later

Do not combine several red signals in one row.

Remove active use of:

* `rowAccentClass`
* `badgeClass`
* `.mytasks-row--overdue`
* `.mytasks-row--today`
* `.mytasks-row__badge*`

Delete unused helpers and styles after migration.

# 6. Task filters

Keep the existing task filters:

* Task type
* Due state
* Related meeting
* Status

Desktop:

* Use the existing `FilterPanel`
* Position it directly below the workspace toolbar
* Do not make it look like a second card

Mobile:

* Use the existing `MobileFilterOverlay`

Applied filters:

* Use the existing `AppliedFilterChips`
* Keep them compact
* Do not add duplicate Clear buttons

# 7. Task pagination

Use 8–10 rows per page based on the available desktop height.

Keep:

```text
1–10 of 38 tasks
```

Use the shared `IconButton`.

Do not allow the floating Help button to cover pagination.

# 8. Task direct workflow behavior

Replace the current generic `navigateToTask()` behavior.

The row must open the selected source record.

Required behavior:

* Meeting task → selected Meeting details drawer
* Agenda task → selected Agenda Item drawer
* Board Pack task → selected Board Pack drawer
* RSVP task → selected RSVP or Meeting workflow
* Declaration task → selected declaration workflow
* Minutes task → selected Minutes drawer
* Action task → selected Action Item drawer
* Completed task → selected record in read-only mode

Do not route to only a generic list when a source ID exists.

## Shared deep-link support

Add optional record-opening support to `GeneratedTablePage`.

Use route state or a stable query parameter such as:

```text
?openRecord=<sourceId>
```

When the target GeneratedTablePage loads:

* Find the matching row using existing ID fields
* Open its existing DynamicDetailsDrawer
* Preserve all current drawer actions
* Remove or clear the one-time opening state after use
* Do not create a second drawer implementation

Do not change GeneratedTablePage visuals during this task.

# My Calendar redesign

# 1. Page header

Keep:

Heading:

`My Calendar`

Description:

`View your meetings, review deadlines, voting windows, and assigned due dates.`

Use the same page-header structure as Overview and My Tasks.

# 2. Replace three equal cards with a bento-style calendar summary

Use a 12-column summary grid:

```text
Current or Next Meeting — 6 columns
Meetings This Month — 3 columns
Upcoming Deadlines — 3 columns
```

## Current or Next Meeting card

Create one restrained featured card using existing card and button primitives.

Do not copy the Overview hero or use a large solid primary background.

Use:

* Normal surface
* Existing border
* Optional 3px primary accent
* Small status label
* Meeting title
* Date and time
* Mode
* One relevant action

States:

* Live now
* Starting soon
* Next meeting
* No upcoming meeting

Immediate action may be:

* Start
* Join
* Rejoin
* Continue
* Resume

Use the existing meeting-action resolver.

For non-immediate states, make the card clickable and open Meeting details. Do not add a generic View Details button.

## Meetings This Month and Upcoming Deadlines

Use compact StatCards:

```tsx
density="compact"
```

Keep them aligned with the featured card.

Clicking:

* Meetings This Month → Month view
* Upcoming Deadlines → Agenda view filtered to deadlines and reviews

# 3. Remove the permanent Upcoming Schedule side panel

Delete the default two-column calendar layout:

```css
grid-template-columns: 1fr 290px;
```

Do not permanently reserve 290px for a side panel.

The calendar must use the full available width.

Remove the current always-visible `Upcoming schedule` panel from Month and Week views.

This duplicated information and caused Week columns to become unreadable.

# 4. Rebuild the Calendar workspace

Use one full-width calendar card.

Structure:

```text
Calendar workspace
├── View tabs and period navigation
├── Passive event legend
└── Active view
```

## Toolbar layout

Desktop:

```text
Month  Week  Agenda             Previous  Period  Next  Today
```

Use:

* Existing `TabBar`
* `IconButton` for Previous and Next
* Secondary `Button` for Today

Do not use raw buttons.

Do not create three separate toolbar rows unless the screen is narrow.

On tablet and mobile, wrap cleanly.

## Legend

Show a passive compact legend:

* Meeting
* Deadline
* Action
* Review

Use small dots and muted labels.

Remove the interactive hide/show behavior for now.

Delete:

* `hiddenTypes`
* `toggleType`
* Raw legend buttons
* Inline legend dot borders

The legend should explain event types, not become another filter toolbar.

# 5. Month view

Use the full width of the calendar card.

Requirements:

* Seven equal columns
* Six calendar rows when needed
* Day-cell minimum height approximately 108–120px on large desktop
* Clear weekday header
* Consistent grid borders
* 8–10px internal padding
* Comfortable event text
* No 9.5px event typography

Each date shows:

* Day number
* Up to two events
* `+N more` when needed

Event item:

```text
● Meeting title
```

Use:

* One small event-type dot
* Neutral or softly tinted surface
* Normal text color
* Minimum 11.5–12px text
* One-line truncation

Do not use a strong colored event block.

## Event clicks

Clicking an event opens that exact source record.

Clicking empty date space selects the date.

## Selected-day details

When a date is selected, show an expandable contextual tray below the Month grid inside the same calendar card.

Tray heading:

```text
Wednesday, 22 July
```

Show that date’s events as readable rows.

Do not open a permanent side panel.

When there are no events:

Heading:

`No events on this date`

Text:

`Your meetings and deadlines for this date will appear here.`

Provide a tertiary Close or Clear date action.

## `+N more`

Make `+N more` functional.

It should select that date and open the contextual tray with all events.

# 6. Redesign Week view completely

Do not retain seven narrow event columns.

Use a two-part Week view.

## Part A — Week day selector

Show seven equal day buttons across the top:

```text
Mon 20
Tue 21
Wed 22 · 3
Thu 23
Fri 24 · 1
Sat 25
Sun 26
```

Each day shows:

* Day name
* Date
* Optional event count
* Selected state
* Today state

Use existing button interaction patterns but do not render them as large primary buttons.

## Part B — Selected-day schedule

Below the day selector, show the selected day’s schedule as a full-width timeline or compact list.

Example:

```text
9:00 AM
344th Board of Directors Meeting
Board of Directors · In Person

10:00 AM
57th Audit Committee Meeting
Audit Committee · Hybrid
```

Rules:

* Full meeting titles
* Minimum two readable lines
* No compressed 90px columns
* No repeated empty `No events` boxes
* One event-type accent
* Whole row opens the record
* One visible immediate meeting action only when relevant
* No generic View Details buttons

When the selected day is empty, show one small empty state.

Previous and Next move by exactly one week.

Today returns to the current week and selects today.

# 7. Agenda view

Use the full width.

Do not show a duplicate Upcoming Schedule panel.

Group events by:

* Today
* Tomorrow
* This Week
* Later

Use compact rows:

```text
[dot] Event title                              Time or due information
      Related meeting or source · Event type
```

Rules:

* Maximum two text lines
* No full-height colored borders
* No status pill on every row
* No generic View Details buttons
* Whole row opens the source workflow
* One immediate button only for Start, Join, Rejoin, Continue, or Resume

Use the heading:

`Upcoming 60 days`

Do not show misleading month navigation in Agenda view.

Hide Previous and Next while Agenda is active.

Today resets Agenda to the current period.

# 8. Calendar event routing

Replace the current generic `openEvent()` destinations.

Use the event’s:

* `sourceType`
* `sourceId`
* `meetingId`

Required behavior:

* Meeting → selected Meeting drawer
* Live or immediate Meeting action → `/meetings/:meetingId/live`
* Board Pack → selected Board Pack drawer
* RSVP → selected RSVP or Meeting workflow
* Action Item → selected Action Item drawer
* Minutes → selected Minutes drawer
* Review → selected review source

Do not use title matching when a source ID exists.

Use the same GeneratedTablePage deep-link support created for My Tasks.

# 9. Meeting actions

Continue using:

```ts
useResolvedActions("meeting")
```

Do not use status-only local action logic.

Use the resolver to determine:

* Start
* Join
* Rejoin
* Continue
* Resume
* Resume After Break

The visible button label and behavior must match.

Do not display Join and then perform a generic navigation.

# CSS cleanup

Rebuild these files cleanly:

* `src/styles/my-tasks.css`
* `src/styles/my-calendar.css`

Do not keep appending compatibility styles.

Remove unused or inactive styles after the JSX migration.

## My Tasks styles to remove or stop using

* `.mytasks-kpi-grid` duplicate alias
* Legacy toolbar aliases
* Urgency left-border styles
* Urgency icon tints
* Task status badge styles
* Duplicate due styles that are no longer used

## My Calendar styles to replace

* Fixed 290px workspace side panel
* Seven 90px Week columns
* 9.5px Month event text
* Interactive raw-button legend styles
* Permanent side-panel row styles
* Duplicate schedule-panel layout

Keep shared component styling in `cards.css`.

Do not move Overview-specific styles out of `cards.css`.

Do not change Overview styling.

Use only existing:

* Color tokens
* Typography tokens
* Spacing tokens
* Radius tokens
* Border tokens
* Shadow tokens
* Focus states
* Motion tokens

Do not hardcode feature colors.

# Responsive behavior

## Desktop

My Tasks:

* Four compact summary cards
* Full-width task workspace
* Search and Filter aligned in one row
* Grouped task list
* No clipped pagination

My Calendar:

* 6/3/3 summary grid
* Full-width calendar
* No permanent side panel
* Readable Month and Week content

## Tablet

My Tasks:

* Summary becomes 2×2
* Toolbar wraps cleanly
* Tabs scroll horizontally

My Calendar:

* Featured meeting card becomes full width
* Metric cards remain two columns
* Week selector scrolls horizontally only when required
* Selected-day schedule remains full width

## Mobile

My Tasks order:

1. Heading
2. Compact summary cards
3. Task workspace title
4. Search and Filter in one row
5. Tabs
6. Grouped task cards
7. Pagination

My Calendar order:

1. Heading
2. Current or Next Meeting card
3. Two metric cards
4. Calendar tabs and navigation
5. Legend
6. Active view
7. Selected-day details when relevant

Mobile rules:

* 16px page padding
* Full-width cards
* Minimum 44px interactive targets
* No horizontal page overflow
* Task and event cards open on full-card tap
* No separate View Details button
* Existing mobile filter bottom sheet
* Safe vertical scrolling

# Accessibility

Verify:

* All interactive cards support keyboard activation
* Selected KPI cards expose `aria-pressed`
* Selected week day exposes its selected state
* Calendar dates support keyboard selection
* Task and event rows support Enter and Space
* Immediate buttons have accurate accessible labels
* Event types do not rely only on color
* Focus states remain visible
* Dark mode has sufficient contrast
* Page content is not hidden behind the Help button

# Acceptance criteria

The work is complete only when:

* My Tasks and My Calendar feel visually related to Overview.
* The current ugly page compositions are fully replaced.
* Overview remains unchanged.
* Both pages use correct page padding and scrolling.
* My Tasks displays only genuine current-user work.
* My Calendar displays only genuine current-user events.
* Meeting Secretary role no longer creates universal ownership.
* Technical IDs are replaced with friendly context where possible.
* My Tasks summary cards are compact.
* My Tasks are grouped by urgency.
* Repeated Overdue labels no longer dominate the full page.
* Task rows contain no action buttons unless an immediate action is required.
* Calendar uses a full-width workspace.
* The permanent Upcoming Schedule side panel is removed.
* Week view uses a day selector plus readable selected-day schedule.
* Month view events open directly.
* `+N more` works.
* Agenda is full width and does not duplicate information.
* Visible meeting actions use the shared resolver.
* Task and calendar records open their selected details drawer.
* Existing drawers, forms, registries, permissions, and routes remain functional.
* Light mode, dark mode, desktop, tablet, and mobile work correctly.
* No TypeScript errors remain.
* The project builds successfully.

# Golden Rules

* Do not break solved issues.
* Do not change Home → Overview.
* Do not change the application shell or navigation.
* Do not change APIs or registry IDs.
* Do not create another task registry.
* Do not create another calendar registry.
* Do not create another Button, IconButton, StatCard, TabBar, filter, drawer, modal, typography, or theme system.
* Reuse existing components and tokens.
* Do not preserve the current broken page layout.
* Do not use broad role-based ownership as a shortcut.
* Do not use a permanent narrow calendar side panel.
* Do not show a button on every task or event row.
* Do not use several semantic colors in one row.
* Open the selected source record, not a generic list.
* Test every responsive breakpoint and theme.

```
```
