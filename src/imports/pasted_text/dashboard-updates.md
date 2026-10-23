Work directly inside the latest NCC Bank Board Meeting Solution React and TypeScript project.

Repair and redesign only:

1. Home → My Tasks
2. Home → My Calendar

The recent revisions broke the page structure and made both pages inconsistent with Home → Overview and the rest of the design system.

Do not modify the Overview hero, Overview cards, navigation, application shell, APIs, registry IDs, permissions, authentication, themes, meeting lifecycle logic, or unrelated pages.

First inspect the current code before changing anything.

Primary files:

- src/app/pages/dashboard/PSRDashboardPage.tsx
- src/app/pages/dashboard/CombinedDashboardPage.tsx
- src/app/pages/dashboard/DashboardPage.tsx
- src/styles/cards.css
- src/styles/index.css

Shared components to reuse:

- StatCard
- TabBar
- AppSearchField
- FilterPanel
- MobileFilterOverlay
- AppliedFilterChips
- Button
- IconButton
- FullScreenWorkspaceShell
- LiveMeetingWorkspace
- Existing details drawers
- useResolvedActions
- useCurrentUser
- Existing entity registries
- Existing design tokens

Do not rename or move PSRDashboardPage.tsx or CombinedDashboardPage.tsx in this task.

# Phase 1 — Restore the correct page shell

Both My Tasks and My Calendar currently bypass the page wrapper used by Overview.

Update both root page components so they use the existing dashboard page structure:

- flex: 1
- overflow-y: auto
- padding: 24px 28px on desktop
- padding: 16px on mobile
- 20px vertical gap
- consistent content alignment

Reuse `.dashboard-page` instead of creating another page-shell implementation.

Recommended root structure:

<div className="dashboard-page home-workspace-page">
  ...
</div>

Use the existing dashboard header classes:

- dashboard-page__header
- dashboard-page__header-body
- dashboard-page__title
- dashboard-page__subtitle

Both page headings must align exactly with the Overview heading.

Fix page-level scrolling so:

- Rows are not clipped below the viewport
- Pagination remains reachable
- The floating Help button does not cover the last row
- Mobile pages can scroll safely
- The application shell itself remains unchanged

# Phase 2 — Create one shared Home workflow model

The current pages build and route tasks independently.

Create one small shared utility module, such as:

src/app/pages/dashboard/homeWorkspaceUtils.ts

It should provide reusable helpers such as:

- buildCurrentUserTasks(...)
- buildCurrentUserCalendarEvents(...)
- deduplicateTasks(...)
- openTaskWorkflow(...)
- openCalendarEvent(...)
- resolveImmediateMeetingAction(...)

Do not create another registry.

Preserve source IDs in every task and event.

Recommended task model:

interface HomeTask {
  id: string;
  sourceId: string;
  sourceType:
    | "meeting"
    | "agenda-item"
    | "board-pack"
    | "rsvp"
    | "declaration"
    | "minutes"
    | "vote"
    | "signature"
    | "action-item";
  meetingId?: string;
  title: string;
  context: string;
  type: string;
  dueDate?: string;
  status: string;
  assigneeKey?: string;
}

Recommended event model:

interface HomeCalendarEvent {
  id: string;
  sourceId: string;
  sourceType:
    | "meeting"
    | "board-pack"
    | "rsvp"
    | "action-item"
    | "minutes"
    | "vote"
    | "review";
  meetingId?: string;
  title: string;
  context: string;
  date: string;
  time?: string;
  eventType: "meeting" | "deadline" | "action" | "review";
  status: string;
  mode?: string;
  venue?: string;
}

# Phase 3 — Make My Tasks personal

My Tasks must not show every organization-wide record.

Use `useCurrentUser()` and existing user, role, participant, RSVP, and assignment data.

Include a task only when the current user is genuinely responsible for it through one of these relationships:

- Direct user assignment
- Matching participant record
- Matching participant name
- Matching employee ID
- Matching authorized designation or system role
- Assigned approver
- Assigned reviewer
- Assigned action owner
- Required signer
- RSVP participant
- Declaration owner
- Minutes reviewer
- Meeting Secretary or Secretariat responsibility when the workflow explicitly belongs to that role

Do not treat every pending record as the signed-in user’s task.

Deduplicate using:

sourceType + sourceId + assignee identity

Do not remove separate assignments merely because their titles are the same.

When a useful meeting or record title exists, do not show a technical ID as the main context.

Bad:

MTG-2026-0001 · Action

Good:

344th Board of Directors Meeting · Action

Use a reference ID only as fallback information.

# Phase 4 — Make My Calendar personal

My Calendar must show events relevant to the current user.

Include:

- Meetings where the user is a participant, organizer, secretary, chairperson, approver, or authorized viewer
- The user’s RSVP deadlines
- The user’s Board Pack reviews
- The user’s minutes reviews
- The user’s votes and signatures
- Action items assigned to the user
- Relevant meeting deadlines

Do not load every organization-wide action item into My Calendar.

Use the same identity and role matching rules as My Tasks.

# Phase 5 — Share direct workflow routing

Remove the current generic route-only behavior in:

- navigateToTask
- openEvent

Do not route every record to a generic list page.

Use the source type and source ID.

Required behavior:

Meeting approval:
- Open the selected Meeting details drawer in approval context

Agenda approval:
- Open the selected Agenda Item drawer or Agenda Management filtered to that record

Board Pack review:
- Open the selected Board Pack drawer or assigned review flow

RSVP:
- Open the selected meeting’s RSVP workflow

Declaration:
- Open the selected declaration form or drawer

Minutes:
- Open the selected Minutes drawer

Vote or signature:
- Open the selected meeting workflow

Action item:
- Open the selected Action Item drawer

Completed record:
- Open the selected source in read-only mode

Use source IDs. Do not search by title when an ID exists.

For immediate meeting actions, use `useResolvedActions("meeting")`.

Start, Join, Rejoin, Continue, Resume, and Resume After Break must open:

/meetings/:meetingId/live

The route already renders the reusable full-screen meeting workspace.

Do not display a Join label that opens the generic All Meetings page.

# Phase 6 — Rebuild My Tasks page hierarchy

Use this structure:

Page header

Four summary cards

Task workspace card
├── Workspace header
├── Category tabs
├── Applied filters
├── Task list
└── Pagination

## Summary cards

Keep:

- Open
- Due Soon
- Overdue
- Completed This Month

Counts must use the current-user task dataset.

Make cards clickable and keyboard accessible.

Add a selected state to StatCard or reuse an existing selected pattern.

When a KPI filter is active:

- Use a primary border
- Use a very soft primary background
- Add `aria-pressed`
- Keep the normal card size

Only one KPI filter may be selected at a time.

Do not create a separate KPI-card component.

## Task workspace header

Add a proper workspace header:

Left:

Task queue
Current result count

Right:

Search tasks
Filter

Example:

Task queue · 13

Place the tabs in a separate row below the workspace header.

Do not force seven tabs, search, and Filter into one crowded row.

Desktop:

- Workspace heading and count on the left
- Search and Filter on the right
- Tabs use the full width below

Tablet and mobile:

- Header actions wrap cleanly
- Tabs scroll horizontally

Reuse AppSearchField and Button.

## Task list rows

Use a consistent 64–68px row.

Structure:

[Neutral task icon]  Task title                              Due state
                     Related record · Task type

Rules:

- Use a small neutral icon container
- Do not color the complete icon container by status
- Maximum two text lines
- Title uses one line with ellipsis
- Context uses one line with ellipsis
- Due state is right aligned
- Entire row opens the direct workflow
- Use Enter and Space keyboard support
- Use the existing hover and focus treatment

Do not add:

- Red priority dots
- Full-height red sidebars
- Colored task-type pills
- A separate Action column
- Review, Update, Approve, or View buttons on every row

Use semantic color only for the due state:

- Overdue → error text
- Due today → warning text
- Due soon → primary or normal text
- Completed → success text
- Later → secondary text

Use friendly due writing:

- Overdue
- Overdue by 3 days
- Due today
- Tomorrow
- Due in 3 days
- 8 Aug
- No due date

For very old tasks, use `Overdue by 30+ days` rather than a large number.

## Pagination

Keep 10 results per page.

Show:

1–10 of 38 tasks

Use IconButton for Previous and Next.

Reset to page one after:

- Tab change
- Search
- Filter
- KPI selection

# Phase 7 — Rebuild My Calendar structure

Use this structure:

Page header

Three summary cards

Calendar workspace

## Summary cards

Keep:

- Current or Next Meeting
- Meetings This Month
- Upcoming Deadlines

Use current-user events only.

Current or Next Meeting card:

- If a meeting is live, show `Live now`
- Otherwise show `Today`, `Tomorrow`, or a friendly date
- Use the meeting title as subInfo
- Clicking opens the selected meeting, not the generic meeting list

Meetings This Month:

- Switch to Month view

Upcoming Deadlines:

- Switch to Agenda view filtered to deadline and review events

Add a visible selected state when a summary card changes the current view or filter.

# Phase 8 — Create a coherent Calendar workspace

Use one calendar card with:

- Period navigation
- View tabs
- Compact event legend
- Active calendar view

Do not place page controls in several disconnected cards.

Toolbar:

Previous    Current period    Next    Today

Use:

- IconButton for Previous and Next
- Secondary Button for Today

Tabs:

- Month
- Week
- Agenda

Legend:

- Meeting
- Deadline
- Action
- Review

Use a passive compact legend by default.

Only make legend items interactive when the filtering behavior is complete and accessible.

Do not use locally styled raw buttons for unfinished filters.

# Phase 9 — Use view-specific calendar layouts

## Month and Week

Use:

- Main calendar: approximately 72%
- Context schedule panel: approximately 28%

Keep both cards aligned.

## Agenda

Use a full-width agenda list.

Hide the Upcoming schedule panel in Agenda view because it duplicates the same information.

Do not display two lists containing the same events side by side.

# Phase 10 — Improve Month view

Use a real seven-column month grid.

Requirements:

- Six calendar rows when needed
- Day-cell minimum height around 100px
- Clear weekday header
- Consistent grid lines
- 8–10px day padding
- Two visible events per day
- `+N more` when additional events exist

Today:

- Use a small filled date circle
- Do not tint the whole cell strongly

Selected date:

- Soft primary background
- Primary border
- Clear keyboard selected state

Event item:

● Event title

Use:

- One small type dot
- Neutral or softly tinted surface
- One-line title
- Theme text colors

Do not use strong colored event blocks.

Make each event itself clickable.

Clicking an event must open that event’s direct workflow.

Clicking empty space inside a day selects the day and updates the schedule panel.

Do not make users select a date and then find the same event again before opening it.

Implement `+N more`:

- Selecting it should show all events for that day in the side panel or an existing responsive overlay
- Do not render a nonfunctional button

# Phase 11 — Improve Week view

Keep seven day columns on large desktop, but make them readable.

Each day column should show:

- Day name
- Date
- Events ordered by time

Event card:

9:00 AM
344th Board of Directors Meeting
Board of Directors

Rules:

- Title may use two lines
- Metadata may use one line
- Do not force titles into one tiny line
- Do not use 9–10px body typography
- Do not show `No events` repeatedly in every empty column
- Empty columns may use a subtle dash or remain visually quiet
- Use one small event-type accent
- Entire event card is clickable

Use an internal day-column scroll only when required.

Tablet may horizontally scroll the week grid inside the calendar card.

Mobile should use a day selector plus selected-day agenda instead of seven compressed columns.

# Phase 12 — Fix Agenda view

Agenda view is an upcoming work queue.

Do not display a month heading that changes while the agenda data remains unchanged.

Use one of these coherent behaviors:

Preferred:

- Label the period `Upcoming 60 days`
- Hide Previous and Next in Agenda view
- Keep Today available
- Group items by Today, Tomorrow, This Week, and Later

Do not show a false month navigation state.

Agenda row:

[Type dot]  Event title                               Time or due state
            Related record · Event type

Rules:

- Full-width layout
- Maximum two text lines
- Entire row opens the direct workflow
- No status pill on every row
- No generic View Details button
- No full-height colored sidebar

Show a visible button only for an immediate action:

- Start
- Join
- Rejoin
- Continue
- Resume

The visible button must perform that exact meeting action.

# Phase 13 — Improve contextual schedule panel

Show this panel only in Month and Week views.

Default heading:

Upcoming schedule

When a date is selected:

Wednesday, 22 July

Panel row:

[Dot]  9:00 AM                                      Today
       344th Board of Directors Meeting
       Board Room A · Meeting

Rules:

- Maximum three lines
- Do not use a large event-type badge
- Do not use a full-width button on every row
- Entire row opens the source record
- Use one visible compact action only for immediate Start, Join, Rejoin, Continue, or Resume actions
- Use thin separators
- Use subtle hover and focus states
- Internally scroll when needed

When a selected date has no records, show:

No events on this date

Your meetings and deadlines for this date will appear here.

Provide a tertiary `Show upcoming` action to clear the selected date.

# Phase 14 — CSS architecture cleanup

Do not continue appending page styles to cards.css.

Create:

- src/styles/my-tasks.css
- src/styles/my-calendar.css

Import both once from:

- src/styles/index.css

Keep in cards.css only genuinely shared styles such as:

- StatCard
- dashboard-page
- dash-compact-card
- dash-compact-row
- common card foundations

Move active `.mytasks-*`, `.my-calendar-*`, and page-specific `.calendar-*` rules into their own files.

After migration, remove or stop using the old active calendar and task blocks from cards.css.

Do not remove a shared class still used by Overview.

Use existing tokens for:

- Colors
- Typography
- Spacing
- Radius
- Borders
- Shadows
- Focus
- Motion

Do not use hardcoded fallback colors such as:

- #f59e0b
- #22c55e

Do not use inline visual styles inside PSRDashboardPage.tsx or CombinedDashboardPage.tsx.

Dynamic values such as progress width or an event type CSS variable may remain only when necessary.

# Phase 15 — Responsive behavior

## Desktop

- Both pages align exactly with Overview
- Correct page padding
- Internal page scrolling
- Summary cards remain balanced
- No clipped content
- No horizontal page overflow

## Tablet

My Tasks:

- Summary cards use two columns
- Workspace header wraps cleanly
- Tabs scroll horizontally

My Calendar:

- Calendar becomes full width
- Context schedule moves below the calendar when necessary
- Week view scrolls inside its own card

## Mobile

My Tasks order:

1. Heading
2. Summary cards
3. Workspace heading
4. Search and Filter
5. Tabs
6. Task cards
7. Pagination

My Calendar order:

1. Heading
2. Summary cards
3. Calendar toolbar
4. Tabs
5. Legend
6. Active view
7. Context schedule when relevant

Use:

- 16px page padding
- Minimum 44px interactive targets
- Existing mobile Filter bottom sheet
- Full-row task and event interactions
- No View Details button on cards
- Safe vertical scrolling
- No horizontal page overflow

# Phase 16 — Accessibility

Verify:

- Page content can be reached and scrolled by keyboard
- Selected KPI cards expose `aria-pressed`
- Tabs expose the active state
- Task rows support Enter and Space
- Calendar days support keyboard selection
- Calendar events support Enter and Space
- Immediate action buttons have accurate labels
- Previous and Next labels match the active view
- Event types do not rely only on color
- Focus states are visible
- Light and dark themes meet contrast requirements

# Acceptance criteria

The task is complete only when:

- My Tasks and My Calendar use the same page padding and alignment as Overview.
- Both pages scroll correctly inside the application shell.
- No content is clipped behind the viewport or Help button.
- My Tasks contains only current-user work.
- My Calendar contains only current-user events.
- Duplicate source tasks are removed.
- Task and event clicks open the selected source workflow.
- Generic module navigation is no longer used when a source ID exists.
- Immediate meeting actions open the correct full-screen meeting workspace.
- KPI cards clearly show the active selection.
- My Tasks toolbar has a clear workspace header and separate tabs.
- Task rows are structured, readable, and free from repetitive buttons.
- Month events can be opened directly.
- Week events are readable without extreme truncation.
- Agenda view uses the full width and does not duplicate Upcoming schedule.
- Agenda navigation and displayed data agree.
- `+N more` is functional.
- Calendar controls use Button and IconButton.
- Page-specific CSS is removed from cards.css and placed in scoped files.
- Overview remains visually and functionally unchanged.
- Existing APIs, registries, routes, permissions, themes, drawers, and business logic remain intact.
- Desktop, tablet, mobile, light mode, dark mode, and every existing theme work.
- The project builds without TypeScript errors.

# Golden Rules

- Do not break solved issues.
- Do not change Home → Overview.
- Do not change the hero banner.
- Do not change navigation or application-shell dimensions.
- Do not change API contracts or registry IDs.
- Do not create another task or calendar registry.
- Do not create another Button, IconButton, TabBar, StatCard, drawer, modal, or theme system.
- Reuse current-user data and existing action resolvers.
- Open the selected record, not a generic page.
- Keep semantic colors restrained.
- Do not add a visible button to every row.
- Do not leave legacy page-specific CSS active after migration.
- Test every responsive breakpoint and theme.