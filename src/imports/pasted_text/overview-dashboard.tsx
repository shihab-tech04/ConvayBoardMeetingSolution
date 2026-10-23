Work directly inside the latest **NCC Bank Board Meeting Solution** React and TypeScript project.

Update only the **Home → Overview dashboard**.

Preserve the current hero banner’s visual design exactly:

* Same gradient and theme colors
* Same border radius
* Same card proportions
* Same typography
* Same status-pill style
* Same overall placement

Do not redesign the hero banner. Only improve its content, spacing, carousel behavior, and actions.

# 1. Convert the hero banner into a dynamic meeting carousel

Use **3–5 real meeting records** from the existing Meeting registry.

Prioritize meetings that require an immediate action:

1. In Progress
2. Ready to Start
3. Scheduled within the entry window
4. Pending Approval
5. Approved and waiting to publish
6. Draft or Revision Requested
7. Awaiting Minutes

Each slide must use the existing central meeting-action resolver.

Possible primary actions:

* Start Meeting
* Join Meeting
* Rejoin Meeting
* Continue Meeting
* Continue Setup
* Review Meeting
* Publish Meeting
* Prepare Minutes
* View Meeting Record

Do not hardcode actions inside the dashboard.

The same meeting must show the same action in the dashboard, Meeting table, Meeting drawer, Tasks, and Calendar.

## Carousel behavior

* Automatically change slides every **4 seconds**.
* Acceptable interval range: 3–5 seconds.
* Pause while the user hovers over or focuses inside the hero.
* Resume automatically after hover or focus ends.
* Manual slide selection must reset the timer, not pause the carousel permanently.
* Use only small selectable dots at the bottom.
* Make the active dot slightly wider.
* Dots must be keyboard accessible and have clear labels.

Do not add:

* Previous or next arrows
* Arrow icons inside hero actions
* `1/3`, `2/3`, or similar counters
* Slide names beside the controls
* A progress bar
* A meeting-lifecycle timeline
* The current connected-dot lifecycle line

# 2. Simplify each hero slide

Reduce the information shown inside the hero.

Keep only:

* `Next Meeting`, `Live Meeting`, or another relevant short label
* Meeting mode
* One lifecycle-status badge
* Meeting title
* Governance body
* Date and time
* Countdown or live state
* One primary action
* One optional secondary action

Remove:

* Lifecycle timeline
* Excessive RSVP information
* Priority
* Repeated status values
* Unnecessary quorum details
* Multiple progress indicators
* Duplicate buttons

Use better internal spacing:

* 24–28px outer padding
* 12–16px between content groups
* Keep actions aligned at the bottom
* Leave enough space above the carousel controls
* Prevent text and controls from feeling compressed

## Hero buttons

Show a maximum of two buttons:

* Primary dynamic action
* `View details` as an optional secondary action

When the primary action is already `View details` or `View Meeting Record`, show only one button.

Remove all arrow icons from hero buttons.

Start, Join, Rejoin, and Continue Meeting must open:

`/meetings/:meetingId/live`

# 3. Improve Upcoming Meetings

Use all qualifying upcoming meetings from the shared Meeting registry.

Qualifying statuses may include:

* Pending Approval
* Approved
* Published
* Scheduled
* Ready to Start
* In Progress
* Paused
* On Break

Sort by:

1. Live meetings
2. Meetings ready to start
3. Earliest meeting date and time

The list must contain more than four records when the registry has them.

For prototype seed data, ensure the shared Meeting registry contains at least five valid upcoming meetings. Do not hardcode additional rows inside the dashboard component.

Show exactly **four meeting rows at once**.

* Keep the section height fixed to four rows.
* Enable internal vertical scrolling for additional records.
* Use a subtle scrollbar.
* Do not increase the overall dashboard height when more meetings exist.

Each row should show:

* Compact date block
* Meeting title
* Governance body
* Time
* Status
* One contextual action

Possible actions:

* Start
* Join
* Rejoin
* Review
* Publish
* Continue Setup
* View

Use the shared meeting-action resolver instead of the current local status-based conditions.

Keep only one button per row.

Do not add arrows inside row buttons.

# 4. Improve My Tasks

Load all relevant tasks from shared meeting, approval, document, minutes, vote, declaration, and action registries.

Sort by:

1. Overdue
2. Due today
3. High-priority
4. Due soon

Ensure the prototype seed data contains more than four valid tasks through the shared registries, not a hardcoded dashboard array.

Show exactly **four task rows at once**.

* Keep a fixed four-row height.
* Enable internal vertical scrolling.
* Use a subtle scrollbar.
* Keep `View all` in the section header.

Each task row should show:

* Task title
* Related meeting or record
* Friendly due status
* One contextual action

Use friendly due labels:

* Overdue by 3 days
* Due today
* Tomorrow
* 8 Aug

Avoid large values such as `169 days overdue` dominating the row. Keep the overdue information clear but visually restrained.

Possible actions:

* Review
* Approve
* Vote
* Sign
* Declare
* Prepare
* Update
* Submit

Keep exactly one action per task row.

Do not use a generic View action when a direct task action is available.

# 5. Keep only two bottom dashboard panels

The bottom section must contain only:

1. Board Pack Progress
2. Recent Updates

Remove any other bottom panels from the Overview, including:

* Readiness Overview
* Decisions and Actions
* Extra KPI summaries
* Additional tables

Use a balanced two-column layout on desktop.

Stack the two panels on tablet and mobile.

## Board Pack Progress

Show up to four meetings at once.

Each row should display:

* Meeting title
* Reviewed document count
* Total document count
* Progress bar
* Percentage
* Board Pack status

Example:

`7 of 10 documents reviewed`

Use actual review records.

Do not display `100%` when a Board Pack is still pending approval unless all required review records are genuinely complete.

Do not add a button to every row.

Make the row clickable to open the related Board Pack drawer.

Keep one `View all` link in the section header.

If more than four records exist, use internal scrolling.

## Recent Updates

Show the latest four or five relevant updates at once.

Each row should contain:

* Small semantic icon
* Short update title
* Related meeting or record
* Accurate relative time

Examples:

* Board Pack published
* Meeting approved
* Agenda item updated
* Vote opened
* Action item reassigned

Do not display `Just now` for every item.

Calculate relative time from actual timestamps:

* Just now
* 12 min ago
* 2 hr ago
* Yesterday
* 3 days ago

Group repeated low-priority updates when several updates relate to the same record.

Do not add a button to every update.

Clicking an update should open the related drawer.

Keep one `View all` link in the section header.

# 6. Reusable component and data rules

Reuse the current:

* Hero carousel
* Dashboard section/card patterns
* Meeting-action resolver
* Meeting registry
* Task data selectors
* Board Pack registry
* Activity registry
* Status badges
* Buttons
* Drawers
* Theme tokens

Do not build a second carousel, list, button, card, or action system.

Replace the current hardcoded Upcoming Meeting action logic with the shared resolver.

Do not hardcode:

* Meeting rows
* Task rows
* Actions
* Statuses
* Progress
* Timestamps
* Counts

All visible information must update after:

* Meeting status changes
* Meeting start or join
* Approval
* Board Pack publication
* Document review
* Task completion
* Vote
* Minutes creation
* Action update

# 7. Responsive behavior

Desktop:

* Preserve the current hero and four attention-card layout.
* Upcoming Meetings and My Tasks remain side by side.
* Board Pack Progress and Recent Updates remain side by side.
* Internal lists show four rows and scroll.

Tablet:

* Hero becomes full width.
* Attention cards remain two columns.
* Upcoming Meetings and My Tasks stack.
* Bottom panels stack.

Mobile:

* Hero uses one compact slide at a time.
* Keep the primary action visible.
* Use only selectable dots.
* Do not display arrows or slide counters.
* Upcoming Meetings and My Tasks use existing mobile-row/card patterns.
* Bottom panels stack.
* No horizontal overflow.

# Acceptance criteria

The task is complete only when:

* The hero’s current visual style remains unchanged.
* The hero automatically rotates through 3–5 relevant meetings.
* Slides change every four seconds.
* Users can select slides through dots.
* No arrows, counters, progress bars, or lifecycle timelines appear.
* Hero content has comfortable spacing.
* Each slide shows only essential information.
* Hero buttons are minimal and contextual.
* Duplicate View Details buttons are removed.
* Upcoming Meetings shows four visible rows with internal scrolling.
* My Tasks shows four visible rows with internal scrolling.
* Both lists contain more than four records when registry data is available.
* Every list row has one contextual action only.
* The bottom section contains only Board Pack Progress and Recent Updates.
* Board Pack progress uses real review data.
* Recent Update timestamps are accurate.
* All actions come from shared resolvers and registries.
* Existing routes, APIs, themes, drawers, and responsive behavior remain unchanged.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not redesign the hero banner.
* Do not change unrelated pages.
* Do not change existing API contracts.
* Do not create duplicate components.
* Reuse existing dashboard components and styles.
* Do not hardcode meeting or task actions.
* Keep one relevant action per list row.
* Keep a maximum of two actions in the hero.
* Do not add arrows to the hero.
* Do not add slide-number counters.
* Do not add a lifecycle timeline.
* Preserve desktop, tablet, mobile, light mode, dark mode, and all existing theme colors.
