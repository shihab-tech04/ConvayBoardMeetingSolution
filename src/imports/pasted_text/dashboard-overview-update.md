Work directly inside the latest NCC Bank Board Meeting Solution React and TypeScript project.

Update only Home → Overview and the shared seed data or selectors required by this dashboard.

The current version still shows only two future meetings, does not surface ongoing meetings, and still uses Board Pack Progress. Make the changes visibly different and fully functional.

Do not redesign the existing hero banner style. Keep its current color, radius, typography, badges, and overall visual identity.

# Phase 1 — Fix meeting selection

The current dashboard builds the hero and Upcoming Meetings from future dates only. This excludes active meetings that started earlier.

Create three separate datasets:

1. Ongoing meetings
   - In Progress
   - Paused
   - On Break

2. Upcoming meetings
   - Under Preparation
   - Pending Approval
   - Approved
   - Published
   - Invitations Sent
   - Scheduled
   - Ready to Start

3. Hero meetings
   - Ongoing meetings first
   - Ready to Start second
   - Scheduled meetings inside the entry window
   - Pending Approval
   - Approved or Published
   - Other upcoming meetings

Do not exclude an In Progress, Paused, or On Break meeting because its scheduled date is before today.

The hero must contain 3–5 useful meeting slides.

The shared Meeting registry must contain enough realistic seed records to demonstrate the UI:

- At least one In Progress meeting
- At least one Ready to Start or Scheduled meeting
- At least one Pending Approval meeting
- At least one Approved or Published meeting
- At least six total ongoing or upcoming meetings

Add these records to the shared Meeting registry, not directly inside DashboardPage.

# Phase 2 — Improve the hero carousel

Keep the current hero design but make it more useful.

For an ongoing meeting slide, show:

- LIVE NOW label
- Meeting mode
- In Progress, Paused, or On Break status
- Meeting title
- Governance body
- Start time or elapsed time
- Relevant dynamic actions

Examples:

- In Progress participant → Join Meeting or Rejoin Meeting
- In Progress host → Continue Meeting
- Paused host → Resume Meeting
- On Break host → Resume After Break
- Ready to Start host → Start Meeting
- Ready to Start participant → Join Meeting
- Pending Approval approver → Review Meeting
- Approved organizer → Publish Meeting

Use the existing authoritative meeting-action resolver.

Do not maintain separate dashboard action logic.

Do not show only View Details when a more relevant action is available.

Hero action rules:

- Show only actions that are relevant to the current user and meeting state.
- Do not enforce an arbitrary action-count limit.
- Remove duplicate actions.
- Do not show both Join and Rejoin.
- Do not show two View Details buttons.
- Keep the most important action visually primary.
- Keep lower-priority management actions in the Meeting details drawer.

Keep the carousel behavior:

- Change slides every 4 seconds
- Pause on hover or keyboard focus
- Resume afterward
- Reset the timer after manual selection
- Use selectable dots at the bottom
- Active dot is wider

Do not add:

- Previous or next arrows
- Slide numbers
- `1/3` counters
- Timeline graphics
- Connected lifecycle dots
- Carousel progress bars

Improve hero spacing:

- 26–28px internal padding
- Clear spacing between badges, title, metadata, and actions
- Keep controls away from buttons
- Reduce unused empty space
- Prevent content from feeling compressed

# Phase 3 — Use a stronger bento layout

Change the Overview desktop grid to a 12-column layout.

Top row:

- Hero carousel: 7 columns
- Four attention cards: 5 columns in a 2×2 grid

Middle row:

- Ongoing & Upcoming Meetings: 7 columns
- My Tasks: 5 columns

Bottom row:

- Agenda Progress: 7 columns
- Recent Updates: 5 columns

Use:

- 16px gaps
- Balanced card heights
- Existing border radius
- Subtle borders and shadows
- Consistent card-header heights
- Clean internal spacing
- No large empty gaps

Do not create a new card system. Reuse the existing dashboard components and theme tokens.

# Phase 4 — Expand Ongoing & Upcoming Meetings

Rename the section:

`Ongoing & Upcoming Meetings`

Show active meetings first, followed by upcoming meetings.

Display exactly four rows at once and allow internal scrolling for additional records.

The section must contain at least six records when the shared registry provides them.

Each row should show:

- Compact date or LIVE block
- Meeting title
- Governance body
- Time
- Status
- One contextual action

For ongoing meetings, replace the normal date block with a compact live state:

- LIVE
- PAUSED
- BREAK

Possible row actions:

- Continue
- Join
- Rejoin
- Resume
- Start
- Review
- Publish
- View

Use the shared meeting-action resolver.

Keep one visible action per row.

Clicking the rest of the row opens Meeting Details.

Use internal scrolling instead of increasing the card height.

# Phase 5 — Keep My Tasks useful

Keep four task rows visible and scroll for additional tasks.

Sort tasks by:

1. Overdue
2. Due today
3. Critical or high priority
4. Due soon

Each row should show:

- Task title
- Related meeting or record
- Friendly due state
- One contextual action

Use:

- Overdue
- Due today
- Tomorrow
- Due in 3 days
- 8 Aug

Do not show large values such as `169 days overdue` as the dominant text.

Use actions such as:

- Review
- Approve
- Vote
- Sign
- Declare
- Prepare
- Update
- Submit

Keep the UI compact and aligned with the meeting list.

# Phase 6 — Replace Board Pack Progress with Agenda Progress

Remove the current Board Pack Progress panel from Overview.

Replace it with:

`Agenda Progress`

Use data from the shared Agenda registry.

Do not create a hardcoded agenda array.

Show up to four meetings at once.

For each meeting, display:

- Meeting title
- Total agenda items
- Approved items
- Pending items
- Completed items when the meeting is live or completed
- Progress bar
- Agenda status

Examples:

`6 of 8 agenda items approved`

`3 pending approval`

`5 of 9 items completed`

Progress calculation:

Before the meeting:
- Approved agenda items ÷ total agenda items

During or after the meeting:
- Completed agenda items ÷ total agenda items

Use meaningful status badges:

- Draft
- Pending Approval
- Approved
- In Progress
- Completed
- Attention Required

For an ongoing meeting, also show the current agenda item when available:

`Current: Review of Q2 Financial Performance`

Make each agenda row clickable.

Clicking a row should open Agenda Management filtered to that meeting or open the related agenda drawer.

Keep one View all action in the section header.

If more than four meetings have agenda records, enable internal scrolling.

Remove unused Board Pack Progress imports, calculations, and component code only when they are no longer used by Overview. Do not remove the Board Pack feature from the rest of the system.

# Phase 7 — Improve Recent Updates

Keep Recent Updates beside Agenda Progress.

Show five updates at once and scroll for more.

Use real timestamps from activity, registry, or audit records.

Do not display Just now for every item.

Use varied, accurate values:

- Just now
- 12 min ago
- 2 hr ago
- Yesterday
- 3 days ago

Include useful updates such as:

- Meeting started
- Participant joined
- Agenda approved
- Agenda item completed
- Board Pack published
- Vote opened
- Decision recorded
- Action item updated
- Minutes submitted

Use different semantic icons for different update types.

Make each update clickable and open the related meeting, agenda, decision, action, or document drawer.

Do not add a button to every update.

# Phase 8 — Dynamic behavior

All dashboard content must update automatically after:

- Starting or joining a meeting
- Pausing or resuming a meeting
- Approving a meeting
- Publishing a meeting
- Creating or updating an agenda item
- Completing a live agenda item
- Updating a task
- Recording a vote
- Recording a decision
- Updating an action item

Do not hardcode:

- Meetings
- Agenda progress
- Tasks
- Statuses
- Actions
- Counts
- Timestamps
- Progress values

Use the existing shared registries and action resolver.

# Responsive behavior

Tablet:

- Hero becomes full width
- Attention cards remain two columns
- Ongoing & Upcoming Meetings and My Tasks stack
- Agenda Progress and Recent Updates stack

Mobile:

- Show one compact hero slide
- Keep the primary meeting action accessible
- Use dots only
- Ongoing meetings appear before upcoming meetings
- Lists use existing mobile rows or cards
- Agenda Progress becomes a stacked list
- No horizontal overflow

# Acceptance criteria

The task is complete only when:

- At least one ongoing meeting appears in the hero.
- Ongoing meetings appear at the top of the meeting list.
- The hero displays 3–5 meeting slides.
- Relevant Start, Join, Rejoin, Continue, or Resume actions appear.
- The meeting list contains more than four records.
- Four meeting rows remain visible and additional rows scroll.
- My Tasks shows four visible rows and scrolls.
- Board Pack Progress is replaced by Agenda Progress.
- Agenda Progress uses real agenda records.
- Recent Updates uses accurate and varied timestamps.
- The desktop layout uses a clear 7/5 bento structure.
- The dashboard looks visibly more polished than the current screenshots.
- Existing routes, APIs, themes, drawers, and reusable components remain unchanged.
- The project builds without TypeScript errors.

# Golden Rules

- Do not break solved issues.
- Do not redesign the hero banner’s existing visual identity.
- Do not change unrelated pages.
- Do not create duplicate dashboard components.
- Do not hardcode meetings, agendas, tasks, or actions.
- Use shared registries.
- Use the existing meeting-action resolver.
- Keep one action per meeting or task row.
- Do not show duplicate hero actions.
- Do not add hero arrows, counters, or timelines.
- Do not remove the Board Pack feature outside this dashboard.
- Preserve desktop, tablet, mobile, light mode, dark mode, and all existing theme colors.