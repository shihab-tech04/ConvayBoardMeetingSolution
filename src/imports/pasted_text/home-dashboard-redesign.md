Work directly inside the latest NCC Bank Board Meeting Solution React and TypeScript project.

Redesign only the Home module:

- Overview
- My Tasks
- My Calendar

The current dashboard is too crowded, visually flat, and difficult to scan. Too many KPI cards, lifecycle boxes, large tables, raw dates, and empty calendar cells compete for attention.

Use the simpler dashboard direction already approved:

- One prominent next-meeting card
- Four compact attention cards
- Two useful working sections
- Four small summary panels
- Clear dynamic actions
- Less data, better hierarchy

Do not change unrelated pages, routes, APIs, registries, themes, navigation, or working business logic.

# Phase 1 — Clean the shared dashboard layout

Reuse the existing:

- `DashboardPage.tsx`
- `PSRDashboardPage.tsx`
- `CombinedDashboardPage.tsx`
- `StatCard`
- `DashSection`
- `ResponsiveTable`
- `UnifiedMobileCard`
- `StatusBadge`
- `TabBar`
- Details drawers
- Meeting action resolver
- Existing registries
- Existing theme tokens

Do not create another dashboard component system.

Update dashboard spacing:

- Page padding: 24–28px desktop
- Main section gap: 20–24px
- Card gap: 14–16px
- Card radius: use the existing medium or large radius
- Card padding: 16–20px
- Use subtle borders and shadows
- Reduce unnecessary card height
- Avoid excessive empty white space
- Do not use six large KPI cards
- Use semantic colors only for warnings, success, and errors

Hide the `FY 2024-25` selector on Home pages.

Replace it with a relevant dashboard range control where needed:

- Next 30 Days
- This Quarter
- This Year

Change the Home search placeholder to:

`Search meetings, agendas, documents, and people`

# Phase 2 — Simplify Overview

Remove from the default Overview:

- The nine-item Meeting Lifecycle strip
- Six oversized KPI cards
- Large Meetings Requiring Preparation table
- Separate Pending Agenda Approvals table
- Separate Overdue Action Items table
- Repeated status information

Do not delete the underlying data. Move detailed data to the relevant pages and filtered views.

Use this exact desktop structure.

## Row 1: Next Meeting and attention cards

Use a 12-column grid.

### Left: Next Meeting card — 6 columns

Display:

- `Next Meeting` label
- Meeting title
- Governance body
- Date and time
- Countdown
- Meeting mode
- Current user’s meeting role
- Status
- RSVP or readiness summary

Show one strong dynamic primary button:

- Continue Setup
- Review Meeting
- Publish Meeting
- Start Meeting
- Join Meeting
- Rejoin Meeting
- Resume Meeting
- Prepare Minutes
- View Meeting Record

Resolve the action from:

- Meeting status
- User role
- Invitation status
- Permission
- Join window
- Meeting time

Start, Join, and Rejoin must open:

`/meetings/:meetingId/live`

Add one subtle secondary action:

`View details`

Do not show separate Status, Quorum, and Priority blocks floating on the far right. Show only the most useful status badge and one short readiness line.

### Right: four compact attention cards — 6 columns

Use a 2×2 grid:

- My Tasks
- Pending Approvals
- Overdue Actions
- Documents to Review

Each card must contain:

- Icon
- Label
- Count
- One short supporting line
- Small arrow or click affordance

Examples:

- `7 tasks` / `3 due this week`
- `5 approvals` / `2 due today`
- `12 overdue` / `4 over 30 days`
- `9 documents` / `3 due this week`

Clicking a card must open the correct filtered page.

Do not show fake values.

## Row 2: two main working sections

Use two equal-width cards.

### Upcoming Meetings

Show the next three to five relevant meetings.

Columns:

- Meeting
- Governance Body
- Date & Time
- Status
- Action

Use friendly date formatting:

- `8 Aug 2026`
- `10:00 AM`
- `Tomorrow`
- `In 3 days`

Do not show raw ISO dates such as `2026-08-08`.

The one action must be dynamic:

- Start
- Join
- Rejoin
- Review Setup
- View

Add `View all meetings` in the section footer or header.

### My Tasks

Show the five most urgent tasks.

Columns:

- Task
- Related To
- Due
- Status
- Action

Task actions must be contextual:

- Review
- Approve
- Vote
- Declare
- Prepare
- Update

Do not use only `View`.

Sort tasks by:

1. Overdue
2. Due today
3. High priority
4. Due soon

Add `View all tasks`.

## Row 3: four compact summary panels

Use four equal-width cards:

### Board Pack Progress

Show no more than three upcoming meetings.

Display:

- Meeting title
- Review progress bar
- Percentage
- Number reviewed, such as `7 of 10 documents`

Do not use one large decorative donut chart.

### Readiness Overview

Show compact counts:

- Ready
- Nearly Ready
- Attention Required
- Blocked

Use semantic badges and numbers.

Clicking a row opens filtered meetings.

### Decisions and Actions

Show:

- Decisions this quarter
- Resolutions this quarter
- Open actions
- Completed actions

Keep this a compact summary, not a table.

### Recent Updates

Show the latest five relevant updates:

- Board Pack published
- Agenda updated
- Vote opened
- Question answered
- Action reassigned

Display:

- Short update text
- Relative time
- Small semantic dot

Do not show a separate large activity table.

# Phase 3 — Improve My Tasks

Keep the page focused on work the current user must complete.

## Header

Heading:

`My Tasks`

Description:

`Review approvals, documents, votes, declarations, and assigned follow-up actions.`

Remove the decorative `Tasks` pill from the far right unless it provides a real function.

## Summary

Use four compact cards only:

- Open
- Due Soon
- Overdue
- Completed This Month

Do not show separate `Due Today` and `Due This Week` cards when both values are zero.

When a count is zero, keep the card visually quiet.

## Task workspace

Use one full-width task card.

Top toolbar:

- Tabs
- Search
- Filter button

Tabs:

- All
- Approvals
- Reviews
- Votes & Signatures
- Actions
- Declarations
- Completed

Table columns:

- Task
- Type
- Related Meeting
- Due
- Status
- Action

Remove Priority as a separate column. Show priority as a small indicator beside the task title only when it is High or Critical.

Improve task title presentation.

Do not show:

`Approve: 128th Executive Committee...`

Show:

Title:
`Review meeting approval`

Context:
`128th Executive Committee Meeting`

Use friendly due values:

- Overdue by 3 days
- Due today
- Tomorrow
- 8 Aug

The one action must be dynamic:

- Review
- Approve
- Vote
- Sign
- Declare
- Update
- Submit

Limit the initial table to 8–10 rows and use pagination.

Clicking the row opens the related entity drawer.

# Phase 4 — Improve My Calendar

The current month calendar is too large and mostly empty.

Use an agenda-first calendar design.

## Header

Heading:

`My Calendar`

Description:

`View meetings, review deadlines, voting windows, and action due dates.`

Remove the decorative `Calendar` pill from the far right.

## Summary

Use three compact cards:

- Next Meeting
- Meetings This Month
- Upcoming Deadlines

Remove empty cards such as `0 Meetings This Week` and `0 Pending Confirmations` when they add no value.

## Desktop layout

Use a 12-column layout:

### Left: calendar — 8 columns

Tabs:

- Month
- Week
- Agenda

Default view:

- Use Week when the current week contains events
- Otherwise use Agenda

Month view must be more compact:

- Reduce cell height
- Show at most two events per day
- Show `+2 more` for additional events
- Do not leave large empty cells
- Use subtle event pills
- Keep today clearly visible

### Right: Upcoming agenda — 4 columns

Show events for the selected date or upcoming seven days.

Each event card contains:

- Time
- Title
- Event type
- Related meeting
- Status
- One dynamic action

Examples:

- Join Meeting
- Review Board Pack
- Respond
- Vote
- Update Action
- View Details

Do not require the user to click an almost-empty calendar cell before useful event information appears.

## Agenda view

Use a clean grouped list:

- Today
- Tomorrow
- This Week
- Later

Each event row shows:

- Date and time
- Event
- Related meeting
- Status
- Action

Do not show unrelated recent decisions or committee statistics.

# Phase 5 — Fix data presentation

All dashboard values must come from existing registries.

Do not hardcode:

- Counts
- Percentages
- Meeting rows
- Task rows
- Dates
- Statuses
- Progress
- Calendar events

Use real records from:

- Meetings
- Participants
- RSVP
- Agenda
- Documents
- Board Packs
- Reviews
- Decisions
- Resolutions
- Actions
- Minutes
- Workflows
- Notifications

Format data for humans.

Dates:

- `8 Aug 2026`
- `8 Aug, 10:00 AM`
- `Tomorrow`
- `3 days overdue`

Statuses:

- Pending Approval
- In Progress
- Awaiting Minutes

Do not display raw keys or ISO strings.

Use accurate labels.

Do not show:

- `Body` when the value represents a governance body
- `Pending` when the real status is Pending Approval
- `Quorum: Pending` without explaining what is pending

Use:

- Governance Body
- Pending Approval
- Quorum not calculated
- RSVP incomplete

Do not show a progress percentage unless it is calculated from real child records.

# Phase 6 — Dynamic interactions

Every dashboard item must be actionable.

Examples:

- Pending Approvals opens the filtered approvals page
- Overdue Actions opens Action Items filtered to Overdue
- Documents to Review opens the assigned review list
- Readiness issue opens the relevant Meeting drawer section
- Join Meeting opens the Live Meeting route
- Task Review opens the source drawer or form
- Calendar event opens the correct entity

Keep exactly one action per table row.

Do not add row-level More menus.

Dashboard updates must refresh after:

- Meeting creation or edit
- Approval
- RSVP response
- Board Pack publication
- Document review
- Vote
- Action update
- Minutes creation

# Responsive behavior

## Tablet

- Next Meeting becomes full width
- Attention cards remain in two columns
- Main tables stack vertically
- Summary panels use two columns

## Mobile

Order:

1. Next Meeting
2. Attention cards
3. My Tasks
4. Upcoming Meetings
5. Readiness
6. Recent Updates

Rules:

- One-column layout
- Tables use existing mobile cards
- Card tap opens details
- Primary action remains visible
- Calendar defaults to Agenda view
- No compressed seven-column calendar
- No horizontal overflow

# Acceptance criteria

The task is complete only when:

- Overview is visually simple and easy to scan.
- The lifecycle strip is removed from the default Overview.
- Six large KPI cards are replaced by four compact attention cards.
- Next Meeting is the strongest visual element.
- Upcoming Meetings and My Tasks are the main working sections.
- Lower-priority summaries use compact cards.
- My Tasks uses readable task titles and friendly due dates.
- My Calendar no longer displays a mostly empty oversized grid as the default.
- Calendar includes a useful upcoming agenda panel.
- No raw ISO dates appear.
- No hardcoded dashboard values remain.
- Start, Join, and Rejoin actions work.
- Every table has one contextual action.
- All cards and actions use existing reusable components.
- Light mode, dark mode, desktop, tablet, and mobile work.
- Other project pages remain unchanged.
- The project builds without TypeScript errors.

# Golden Rules

- Do not break solved issues.
- Do not change unrelated files.
- Do not rename or move dashboard files.
- Do not change API contracts.
- Do not create a second dashboard design system.
- Reuse existing components and theme tokens.
- Keep the dashboard simple.
- Do not place every system metric on the Home page.
- Do not use large empty cards.
- Do not show misleading or fabricated values.
- Keep only one action per row.
- Keep dynamic actions based on status, role, permission, and timing.
- Preserve desktop and mobile behavior.
- Test every Home route after the redesign.