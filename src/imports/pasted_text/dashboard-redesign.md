Work directly inside the latest existing React and TypeScript project, **NCC Bank Board Meeting Solution**.

Redesign only the Home module dashboards:

- Overview
- My Tasks
- My Calendar

Do not rebuild the application or create a separate dashboard system. Reuse the existing components, registries, routes, themes, cards, tables, drawers, buttons, tabs, status badges, and responsive behavior.

The dashboard must give each user a clear picture of:

- What meeting is next
- What needs immediate attention
- Whether upcoming meetings are ready
- Which approvals, reviews, votes, and actions are pending
- Whether decisions and resolutions are being implemented
- Which meetings are waiting for minutes or closure

# Current issues to fix

The current Home module has three major problems:

1. `Overview` is a basic collection of KPI cards and tables. It does not prioritize the next meeting, meeting readiness, or dynamic user actions.
2. `My Tasks` incorrectly displays a static “Minutes Dashboard” built from legacy helpers such as `CIRCLES_DATA`, `NAMES`, `gen`, assessment year, PSR-style fields, and hardcoded totals.
3. `My Calendar` incorrectly displays a “Committee Dashboard” instead of an actual calendar and deadline view.

Also fix these visible issues:

- Global search still says `Search reports, cases, members...`
- The `FY 2024-25` control is not relevant to every Home page
- Several dashboard values are hardcoded
- Upcoming Meetings can include the wrong statuses
- Tables do not provide useful dynamic actions
- No prominent Start or Join Meeting action exists
- Current pages are too table-heavy and do not have a clear visual hierarchy
- Page names and content do not match the navigation labels

# Phase 1 — Reuse and clean the dashboard foundation

Keep the existing route and file mapping:

- `DashboardPage.tsx` → Overview
- `PSRDashboardPage.tsx` → My Tasks
- `CombinedDashboardPage.tsx` → My Calendar

Do not rename or move these files.

Refactor them to use the real Board Meeting registries.

Remove active dashboard dependencies on:

- `CIRCLES_DATA`
- `NAMES`
- `gen`
- PSR fields
- Tax totals
- Assessment year
- Circle or Zone
- Static committee-minute totals
- Hardcoded dashboard statistics

Reuse:

- `StatCard`
- `DashSection`
- `ResponsiveTable`
- `UnifiedMobileCard`
- `StatusBadge`
- `TabBar`
- Existing button components
- Existing details drawer
- Existing meeting-action resolver
- Existing registries and selectors
- Existing theme tokens

Extend reusable components only when necessary. Do not create separate copies of StatCard, DashSection, table, drawer, or status components.

# Phase 2 — Redesign Overview

## Header

Replace the generic heading with a role-aware header.

Example:

Heading:

`Welcome back, Rafigul.`

Description for Company Secretary:

`Review meeting readiness, pending approvals, Board Pack progress, and overdue follow-up items.`

Show the current role as a compact badge:

`Meeting Secretary`

For authorized roles, add a segmented switch:

- My Dashboard
- Organization Overview

Default behavior:

- Board Member → My Dashboard
- Chairperson → Organization Overview
- Meeting Secretary or Company Secretary → Organization Overview
- Administrator → Organization Overview

Do not create a new navigation item for Organization Overview.

## A. Next Meeting hero

Add one prominent full-width Next Meeting card above KPI cards.

Show:

- Meeting title
- Meeting reference
- Governance body
- Date and time
- Countdown
- Meeting mode
- Venue or virtual meeting
- User’s meeting role
- Meeting status
- Board Pack status
- RSVP status
- Personal review progress
- Readiness status
- Quorum forecast

Use a clear visual hierarchy. Do not make it look like another normal KPI card.

### Dynamic primary action

Resolve the button from the real meeting record, user role, invitation, status, and timing:

- Draft and authorized organizer → `Continue Setup`
- Pending Approval and authorized approver → `Review Meeting`
- Approved and authorized organizer → `Publish Meeting`
- Scheduled within host entry window → `Start Meeting`
- Scheduled within participant entry window → `Join Meeting`
- In Progress → `Join Meeting`
- Previously disconnected → `Rejoin Meeting`
- Paused → `Resume Meeting` for host, `Rejoin Meeting` for participant
- On Break → `Resume After Break` for host, `Rejoin Meeting` for participant
- Awaiting Minutes → `Prepare Minutes`
- Completed → `View Meeting Record`
- Archived → `View Archive`

Start, Join, and Rejoin must open:

`/meetings/:meetingId/live`

When entry is not yet available, show a disabled button with a clear explanation and allowed join time.

## B. Attention cards

Use four compact attention cards instead of six oversized cards.

For Company Secretary, show:

- Meetings Requiring Attention
- Pending Approvals
- Quorum or RSVP Risks
- Overdue Actions

Each card must show:

- Dynamic count
- Optional urgent count
- One short supporting line
- Appropriate icon and tone
- Click behavior

Examples:

`3 meetings`
`2 blocked by missing approvals`

`5 pending approvals`
`2 due today`

`2 quorum risks`
`7 RSVP responses missing`

`12 overdue actions`
`4 more than 30 days overdue`

Clicking a card must open the related page with the correct filter applied.

Do not navigate to an unfiltered generic page.

## C. Meeting lifecycle

Add a compact horizontal Meeting Lifecycle section.

Stages:

- Draft
- Under Preparation
- Pending Approval
- Approved
- Published
- Scheduled
- In Progress
- Awaiting Minutes
- Completed

Show the record count for each stage.

Clicking a stage opens All Meetings filtered to that status.

Do not create nine separate KPI cards.

## D. Upcoming meetings and readiness

Add a primary table titled:

`Upcoming Meetings and Readiness`

Use no more than seven columns:

- Meeting
- Governance Body
- Date & Time
- Readiness
- Quorum
- Status
- Action

Readiness must be calculated from actual records:

- Meeting details completed
- Chairperson assigned
- Secretary assigned
- Participants invited
- RSVP progress
- Quorum forecast
- Agenda approved
- Required documents uploaded
- Board Pack approved
- Board Pack published
- Required reviews completed
- Conflict declarations completed
- Notifications scheduled
- Virtual meeting access configured

Use states:

- Ready
- Nearly Ready
- Attention Required
- Blocked

The table must contain one dynamic action only:

- Continue Setup
- Review Meeting
- Start Meeting
- Join Meeting
- Rejoin Meeting
- Prepare Minutes
- View Details

Clicking the row may open the Meeting details drawer.

## E. Readiness issues

Beside or below the meetings table, add a compact issue list.

Examples:

- Quorum at risk
- Agenda approval overdue
- Board Pack not published
- Required document missing
- Participant responses missing
- Conflict declaration unresolved
- Virtual meeting link missing
- Minutes from previous meeting not approved

Each issue must show:

- Meeting
- Issue
- Severity
- Responsible person
- Deadline
- Resolve action

Use the existing card and status patterns.

## F. Preparation and follow-up

Use a balanced two-column layout.

Left:

`Agenda and Board Pack Preparation`

Show:

- Pending agenda approvals
- Agenda items requiring revision
- Board Packs pending approval
- Unpublished Board Packs
- Updated Board Packs awaiting acknowledgement

Right:

`Decisions and Action Follow-up`

Show:

- Open decisions
- Open actions
- Overdue actions
- Blocked actions
- Completion reviews pending

Each row must contain one contextual action.

## G. Minutes and closure

Add a compact section titled:

`Minutes and Meeting Closure`

Show:

- Meetings awaiting draft minutes
- Minutes under secretary review
- Minutes under chairperson review
- Minutes awaiting member review
- Approved but unsigned minutes
- Meetings awaiting archive

Columns:

- Meeting
- Meeting Date
- Current Stage
- Responsible Person
- Due Date
- Action

## H. Recent updates

Add a compact activity feed for changes relevant to the current user.

Examples:

- Meeting rescheduled
- Agenda updated
- New Board Pack version published
- Question answered
- Vote opened
- Action reassigned
- Minutes ready for review

Show:

- Update
- Related meeting
- Time
- Importance
- Read status

Group repeated low-priority updates from the same meeting.

# Phase 3 — Rebuild My Tasks correctly

Remove the current Minutes Dashboard completely from the My Tasks route.

Page heading:

`My Tasks`

Description:

`Review approvals, document requests, votes, declarations, and assigned follow-up actions.`

## Task KPI cards

Use five compact cards:

- Open Tasks
- Due Today
- Due This Week
- Overdue
- Completed This Month

Calculate values from real task-related records.

Task sources include:

- RSVP
- Agenda approval
- Meeting approval
- Document review
- Board Pack review
- Vote
- Signature
- Conflict declaration
- Minutes review
- Action item
- Completion review

## Task tabs

Use the existing TabBar:

- All
- Approvals
- Reviews
- Votes & Signatures
- Actions
- Declarations
- Completed

Tabs must filter the same task dataset.

## Search and filters

Search placeholder:

`Search my tasks`

Filters:

- Task type
- Related meeting
- Priority
- Due date
- Status

Search, filters, sorting, and tabs must work together.

## Task table

Use no more than seven columns:

- Task
- Type
- Related Meeting
- Due Date
- Priority
- Status
- Action

The one action must be dynamic:

- Respond
- Review
- Approve
- Vote
- Sign
- Declare
- Update Progress
- Submit Completion
- View Details

The button must resolve from task type and task status.

Do not show a generic View button when a direct next action is available.

## Task details

Clicking the row opens the relevant entity drawer, not a generic task drawer when the source record already has a drawer.

Examples:

- Agenda approval → Agenda Item drawer
- Document review → Document drawer
- Vote → Vote or Meeting drawer
- Action item → Action Item drawer
- Minutes review → Minutes drawer

# Phase 4 — Rebuild My Calendar correctly

Remove the current Committee Dashboard from the My Calendar route.

Page heading:

`My Calendar`

Description:

`View meetings, review deadlines, voting windows, and action due dates.`

## Calendar summary cards

Use four compact cards:

- Meetings This Week
- Meetings This Month
- Pending Confirmations
- Upcoming Deadlines

Use actual data.

## Calendar views

Use the existing TabBar:

- Month
- Week
- List

Do not install a new calendar library unless the project already contains one.

Build the calendar from existing components and CSS.

Calendar items must include:

- Meetings
- RSVP deadlines
- Board Pack publication dates
- Document review deadlines
- Voting deadlines
- Minutes review deadlines
- Action due dates

Use clear visual categories with existing theme tones.

## Calendar interaction

Selecting a date shows a right-side or lower event panel.

Each event shows:

- Title
- Event type
- Related meeting
- Date and time
- Location or virtual mode
- Status
- Responsible role
- Dynamic action

Meeting event actions:

- Start Meeting
- Join Meeting
- Rejoin Meeting
- Review Board Pack
- View Meeting

Task event actions:

- Review
- Approve
- Vote
- Update Action
- View Details

Clicking an event must open the related drawer or workflow.

## List view

Columns:

- Event
- Type
- Date & Time
- Related Meeting
- Status
- Action

Do not show recent decisions or unrelated committee statistics on My Calendar.

# Phase 5 — Make dashboard data fully dynamic

Use one shared data source for each entity.

Derive dashboard content from:

- Meeting registry
- Participant registry
- Invitation and RSVP registry
- Agenda registry
- Document registry
- Board Pack registry
- Document review records
- Conflict declaration registry
- Quorum rules and readiness data
- Decision registry
- Resolution registry
- Action registry
- Minutes registry
- Workflow and approval records
- Audit or notification records

Do not hardcode dashboard rows, names, counts, dates, statuses, or percentages.

Seed data may remain only if it is stored in the same registries used by created records.

After any Create, Edit, Approve, Join, Review, Vote, or status action:

- Recalculate KPI cards
- Update tables
- Update the calendar
- Update recent activity
- Update readiness
- Update My Tasks
- Preserve current filters where possible

# Phase 6 — Improve visual hierarchy

Use a clean 12-column desktop grid.

Recommended Overview hierarchy:

1. Role-aware header
2. Next Meeting hero
3. Four compact attention cards
4. Meeting lifecycle
5. Upcoming Meetings and Readiness
6. Readiness Issues
7. Agenda and Board Pack Preparation
8. Decisions and Action Follow-up
9. Minutes and Closure
10. Recent Updates

Do not place six equal large KPI cards at the top.

Visual rules:

- Use stronger spacing between major sections
- Use compact padding inside data-dense cards
- Keep card heights balanced
- Use subtle borders and shadows from existing tokens
- Do not introduce gradients or decorative graphics
- Keep icons small and purposeful
- Keep status colors consistent
- Keep table text readable for senior users
- Avoid excessive empty white space
- Avoid horizontal scrolling

# Phase 7 — Header and UX writing cleanup

On Home routes, change the global search placeholder to:

`Search meetings, agendas, documents, and people`

Do not use:

`Search reports, cases, members...`

The FY selector is not relevant to every Home dashboard.

On Home routes:

- Hide it, or
- Replace it with a dashboard date-range control:

  - This Month
  - This Quarter
  - This Year
  - Custom Range

Do not change its behavior on unrelated pages unless required.

Use these exact page labels:

- Overview
- My Tasks
- My Calendar

Do not show:

- Minutes Dashboard
- Committee Dashboard
- Total Minutes Entries
- Committee-wise Minutes Status
- Recent Minutes Entries

Use entity-specific writing throughout.

# Responsive behavior

## Desktop

- Use the full content width
- Keep the Next Meeting hero prominent
- Use two-column sections where appropriate
- Tables must remain within seven columns
- No unnecessary horizontal scrolling

## Tablet

- Reduce multi-column sections to one column when necessary
- Keep attention cards in two columns
- Keep dynamic actions visible

## Mobile

Order content by urgency:

1. Next Meeting
2. Urgent tasks
3. Attention cards
4. My Tasks
5. Upcoming Meetings
6. Readiness issues
7. Open Actions
8. Recent Updates

Mobile rules:

- Cards use one column
- Tables become existing mobile cards
- Card tap opens details
- Dynamic primary action remains visible
- Calendar defaults to List or compact Week view
- Do not compress the full desktop calendar into a narrow screen

# Loading, empty, error, and disabled states

Every dashboard section must support:

- Loading skeleton
- Empty state
- Error state
- Disabled action with explanation
- Permission-restricted state

Examples:

Empty upcoming meetings:

Heading:

`No upcoming meetings`

Text:

`Your next scheduled meeting will appear here.`

Empty tasks:

Heading:

`You are all caught up`

Text:

`There are no pending tasks assigned to you.`

Readiness unavailable:

`Readiness cannot be calculated until participants, agenda items, and required documents are added.`

# Likely files to update

Inspect and update the existing files where required:

- `src/app/pages/dashboard/DashboardPage.tsx`
- `src/app/pages/dashboard/PSRDashboardPage.tsx`
- `src/app/pages/dashboard/CombinedDashboardPage.tsx`
- `src/app/components/dashboard/DashSection.tsx`
- `src/app/components/cards/StatCard.tsx`
- Existing dashboard data selectors
- Existing meeting-action resolver
- Existing registries
- Existing details drawer
- Existing ResponsiveTable and UnifiedMobileCard
- Dashboard-related styles in `src/styles/cards.css`
- Home route labels and breadcrumbs
- Global header search placeholder and page-specific utility control

Do not rename or move the three dashboard page files.

# Acceptance criteria

The task is complete only when:

- Overview provides a clear picture of the meeting lifecycle.
- The Next Meeting card is the most prominent dashboard item.
- Start, Join, and Rejoin Meeting appear dynamically.
- KPI cards use real data.
- Every KPI card opens a relevant filtered view.
- My Tasks no longer displays the Minutes Dashboard.
- My Tasks shows real tasks assigned to the current user.
- My Calendar no longer displays the Committee Dashboard.
- My Calendar shows meetings and deadlines.
- Role-based dashboard content works.
- Company Secretary, Chairperson, Board Member, and Administrator see relevant information.
- Tables contain no more than seven columns.
- Every dashboard table contains one contextual action.
- Dashboard actions update the underlying registries.
- Search, filters, tabs, and date ranges work.
- The interface works on desktop, tablet, and mobile.
- Existing routes, APIs, themes, drawers, forms, and reusable components remain intact.
- The project builds without TypeScript errors.

# Golden Rules

- Do not break solved issues.
- Do not change unrelated files.
- Do not rename or move existing dashboard page files.
- Do not change existing API contracts.
- Do not replace the application shell.
- Do not create a second dashboard component system.
- Reuse existing cards, tables, drawers, tabs, buttons, badges, and theme tokens.
- Do not use static numbers for operational dashboard data.
- Do not use legacy PSR, tax, Circle, Zone, or assessment-year logic.
- Keep Home role-aware.
- Keep Start, Join, and Rejoin actions dynamic.
- Keep tables within five to seven columns.
- Keep only one action in each dashboard table.
- Preserve responsive behavior.
- Preserve light mode, dark mode, and all theme colors.
- Test all dashboard roles.
- Test dashboard updates after Create, Edit, Approve, Join, Vote, and status changes.