Work directly inside the latest **NCC Bank Board Meeting Solution** React and TypeScript project.

Update only **Home → Overview**.

Preserve the current hero banner’s visual design:

* Keep the existing colors, gradient, radius, proportions, typography, badges, and placement.
* Do not replace the hero component or introduce a different visual style.
* Improve only its content hierarchy, spacing, carousel behavior, meeting selection, and dynamic actions.

Do not change unrelated pages, routes, APIs, registries, themes, or working business logic.

# 1. Turn the hero banner into a meeting carousel

Use **3–5 real meeting records** from the shared Meeting registry.

Prioritize meetings that need attention:

1. In Progress
2. Ready to Start
3. Scheduled within the entry window
4. Pending Approval
5. Approved and waiting to publish
6. Draft or Revision Requested
7. Awaiting Minutes
8. Upcoming Scheduled meetings

Each slide must use the existing authoritative meeting-action resolver.

Possible contextual actions include:

* Start Meeting
* Join Meeting
* Rejoin Meeting
* Continue Meeting
* Continue Setup
* Review Meeting
* Publish Meeting
* Manage RSVP
* Review Board Pack
* Prepare Minutes
* View Meeting Record
* View Details

Do not hardcode dashboard actions separately from the Meeting table or drawer.

## Carousel behavior

* Automatically change slides every **4 seconds**.
* Allow an interval between 3 and 5 seconds if needed for accessibility or performance.
* Pause while the user hovers over the hero or focuses on its controls.
* Resume when hover or focus ends.
* Reset the timer after manual slide selection.
* Add small selectable dots at the bottom.
* Make the active dot slightly wider.
* Dots must support keyboard interaction and accessible labels.

Do not add:

* Previous or next arrows
* Slide counters such as `1/3`
* Lifecycle labels beside the dots
* A carousel progress bar
* The current timeline-style connected dots
* A meeting lifecycle line

# 2. Simplify the hero content

Each slide should show only the information needed to understand the meeting and take the next action.

Keep:

* Short context label, such as `Next Meeting`, `Live Meeting`, or `Needs Attention`
* Meeting mode
* One clear lifecycle-status badge
* Meeting title
* Governance body
* Date and time
* Countdown or live state
* Contextually relevant actions

Remove or reduce:

* Timeline visualization
* Repeated status information
* Excessive RSVP details
* Priority when it does not affect the immediate action
* Unnecessary quorum details
* Multiple progress indicators
* Duplicate buttons
* Secondary information already available in the Meeting drawer

Use comfortable spacing:

* 24–28px outer padding
* 12–16px between content groups
* Clear separation between meeting details and actions
* Enough bottom space for carousel dots
* No overlap between buttons and slider controls

## Hero actions

Show only actions that are relevant to the current user and the current meeting state.

* Give the most important next action clear primary emphasis.
* Show additional actions only when they provide a distinct and necessary function.
* Do not impose an arbitrary fixed number of hero actions.
* Avoid duplicate actions with different labels.
* Do not show both `View Details` and `View details`.
* Do not show `Join Meeting` and `Rejoin Meeting` together.
* Do not show actions the user cannot perform.
* Put lower-priority meeting management actions in the Meeting details drawer rather than crowding the hero.

Do not place arrow icons inside hero buttons.

Start, Join, Rejoin, Continue, and Resume actions must open:

`/meetings/:meetingId/live`

# 3. Improve Upcoming Meetings

Use all qualifying records from the shared Meeting registry.

Qualifying statuses may include:

* Under Preparation
* Pending Approval
* Approved
* Published
* Invitations Sent
* Scheduled
* Ready to Start
* In Progress
* Paused
* On Break

Sort by:

1. Live meetings
2. Ready-to-start meetings
3. Meetings requiring approval or preparation
4. Earliest meeting date and time

Ensure the shared prototype registry contains at least five useful meeting records. Do not hardcode extra rows inside the dashboard.

Display exactly **four rows at once**.

* Keep the section height fixed to four rows.
* Allow internal vertical scrolling for additional meetings.
* Use a subtle scrollbar.
* Do not increase the full dashboard height when more records exist.

Each row should show:

* Compact date block
* Meeting title
* Governance body
* Time
* Status
* One contextual action

Possible row actions:

* Start
* Join
* Rejoin
* Review
* Publish
* Continue Setup
* View

Use the shared meeting-action resolver.

Keep one action per row.

Do not add arrow icons inside row buttons.

# 4. Improve My Tasks

Load tasks from the existing shared registries, including:

* Meeting approvals
* Agenda approvals
* Document reviews
* Board Pack reviews
* RSVP
* Votes
* Signatures
* Conflict declarations
* Minutes reviews
* Action items
* Completion reviews

Sort tasks by:

1. Overdue
2. Due today
3. Critical or high priority
4. Due soon

Ensure the shared registries contain more than four useful task records. Do not create a separate hardcoded dashboard task array.

Display exactly **four task rows at once**.

* Keep a fixed four-row height.
* Enable internal vertical scrolling.
* Use a subtle scrollbar.
* Keep `View all` in the section header.

Each row should show:

* Task title
* Related meeting or record
* Friendly due status
* One contextual action

Use friendly due text:

* Overdue by 3 days
* Due today
* Tomorrow
* 8 Aug

Do not let large values such as `169 days overdue` dominate the row. Keep overdue information visible but visually restrained.

Possible actions:

* Review
* Approve
* Vote
* Sign
* Declare
* Prepare
* Update
* Submit

Do not use a generic View action when a direct next action exists.

# 5. Keep only two bottom sections

The bottom dashboard area must contain only:

1. Board Pack Progress
2. Recent Updates

Remove other bottom panels from Overview, including:

* Readiness Overview
* Decisions and Actions
* Additional KPI summaries
* Extra tables

Use a balanced two-column desktop layout.

Stack the sections on tablet and mobile.

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

Use actual review and acknowledgement records.

Do not display 100% unless all required documents and reviews are genuinely complete.

Do not add a separate button to every row.

Make the row clickable to open the related Board Pack drawer.

Keep one `View all` action in the section header.

Use internal scrolling when more than four records exist.

## Recent Updates

Show the latest four or five relevant updates.

Each item should contain:

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

Calculate timestamps from actual activity data:

* Just now
* 12 min ago
* 2 hr ago
* Yesterday
* 3 days ago

Do not show `Just now` for every update.

Group repeated low-priority updates when several updates belong to the same record.

Do not add a separate button to every item.

Clicking an update should open the related drawer.

Keep one `View all` action in the section header.

# 6. Data and component rules

Reuse the existing:

* Hero component and carousel behavior
* Dashboard card and section components
* Meeting-action resolver
* Meeting registry
* Task selectors
* Board Pack registry
* Activity or audit registry
* Status badges
* Buttons
* Details drawers
* Theme tokens

Do not create a second:

* Carousel
* Card system
* List system
* Action resolver
* Button system
* Drawer system

Replace any local Upcoming Meeting action logic with the shared resolver.

Do not hardcode:

* Meetings
* Tasks
* Actions
* Statuses
* Progress values
* Timestamps
* Counts

The dashboard must update after:

* Meeting status changes
* Meeting start, join, or rejoin
* Approval
* Board Pack publication
* Document review
* RSVP response
* Vote
* Minutes creation
* Task completion
* Action-item update

# 7. Responsive behavior

## Desktop

* Preserve the current hero and attention-card arrangement.
* Upcoming Meetings and My Tasks remain side by side.
* Board Pack Progress and Recent Updates remain side by side.
* Lists display four visible rows with internal scrolling.

## Tablet

* Hero becomes full width.
* Attention cards use two columns.
* Upcoming Meetings and My Tasks stack.
* Bottom sections stack.

## Mobile

* Show one compact hero slide at a time.
* Keep the most important action easy to reach.
* Use selectable dots only.
* Do not add arrows or slide counters.
* Upcoming Meetings and My Tasks use the existing mobile card or row pattern.
* Bottom sections stack.
* Prevent horizontal overflow.

# Acceptance criteria

The task is complete only when:

* The current hero visual style remains intact.
* The hero rotates through 3–5 relevant meetings.
* Slides change automatically every four seconds.
* Users can select a slide through dots.
* No arrows or slide-number counters appear.
* The timeline-style line is removed.
* Hero spacing is improved.
* Hero content is reduced to essential information.
* Hero actions are contextual, useful, and free from duplicates.
* No arbitrary maximum action count is enforced.
* Upcoming Meetings displays four visible records and scrolls for more.
* My Tasks displays four visible records and scrolls for more.
* Both sections can contain more than four records.
* Every list row contains one contextual action.
* The bottom area contains only Board Pack Progress and Recent Updates.
* Board Pack percentages use real review data.
* Recent-update timestamps are accurate.
* All meeting actions come from the shared resolver.
* Existing routes, APIs, themes, drawers, and responsive behavior remain unchanged.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not redesign the hero banner.
* Do not change unrelated pages.
* Do not change existing API contracts.
* Do not duplicate existing components.
* Reuse the current dashboard design and components.
* Do not hardcode meeting or task actions.
* Do not impose a fixed maximum number of hero actions.
* Keep only relevant, non-duplicate hero actions.
* Keep one contextual action per list row.
* Do not add hero arrows.
* Do not add slide counters.
* Do not add a lifecycle timeline.
* Preserve desktop, tablet, mobile, light mode, dark mode, and all existing theme colors.
