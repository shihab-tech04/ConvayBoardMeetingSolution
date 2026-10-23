Work directly inside the latest **NCC Bank Board Meeting Solution** React and TypeScript project.

Update only **Home → Overview**.

Preserve the current hero banner design and the existing top-row layout. Fix the button behavior, meeting-row colors, and dashboard grid proportions without changing unrelated pages or business logic.

# 1. Fix all dashboard button functions

Audit every clickable item on Overview and connect it to the selected record instead of opening a generic page.

Reuse the existing meeting-action resolver, entity drawers, routes, registries, and permission checks.

## Hero banner actions

The hero’s primary action must come from the shared meeting-action resolver.

Required behavior:

* Start Meeting → open `/meetings/:meetingId/live`
* Join Meeting → open `/meetings/:meetingId/live`
* Rejoin Meeting → open `/meetings/:meetingId/live`
* Continue Meeting → open `/meetings/:meetingId/live`
* Resume Meeting → open `/meetings/:meetingId/live`
* Resume After Break → open `/meetings/:meetingId/live`
* Review Meeting → open the selected Meeting details drawer in its approval context
* Publish Meeting → open the selected Meeting drawer and run the existing Publish flow
* Continue Setup → open the selected Meeting edit flow
* Prepare Minutes → open the selected meeting’s Minutes workflow
* View Details → open the selected Meeting details drawer
* View Meeting Record → open the selected completed meeting record

Do not send every non-live action to the generic All Meetings page.

Do not open a drawer for the wrong meeting.

## Ongoing & Upcoming Meetings actions

Each row must use the same resolver as the hero.

Examples:

* In Progress → Join, Rejoin, or Continue
* Paused → Resume or Rejoin
* On Break → Resume After Break or Rejoin
* Ready to Start → Start or Join
* Pending Approval → Review Meeting
* Approved → Publish Meeting
* Draft or Under Preparation → Continue Setup
* Otherwise → View Details

Clicking the row itself must open that meeting’s details drawer.

Keep one visible action button per row.

## My Tasks actions

Do not send every task action to `/home/my-tasks`.

Connect each task to its source record:

* Meeting approval → selected Meeting drawer
* Agenda approval → selected Agenda Item drawer
* Document review → selected Document drawer
* Board Pack review → selected Board Pack drawer
* Vote → selected Vote or Meeting workflow
* Conflict declaration → selected declaration form
* Minutes review → selected Minutes drawer
* Action update → selected Action Item drawer
* RSVP → selected Meeting RSVP flow

The task button must open the direct workflow represented by its label.

## Agenda Progress

* Clicking an agenda row must open the selected meeting’s Agenda Management view or related Agenda drawer.
* `View all` must open Agenda Management.
* Preserve the selected meeting as a filter when possible.

## Recent Updates

* Clicking an update must open the related Meeting, Agenda Item, Decision, Action Item, Document, Board Pack, or Minutes drawer.
* Do not route every update to All Meetings.
* `View all` should open the existing audit or recent-activity view.

## Attention cards

Fix their destinations:

* My Tasks → My Tasks
* Pending Approvals → relevant approval list with Pending filter
* Overdue Actions → Action Items filtered to Overdue
* Documents to Review → Document Library or assigned-review view filtered to pending review

Remove any remaining legacy routes related to PSR, stock, tax, returns, or unrelated modules.

# 2. Fix Ongoing & Upcoming Meetings row backgrounds

The current ongoing rows use a large pale-green background across the full row. Remove this treatment.

Use the normal dashboard card surface for every row:

* Default: `var(--color-surface)`
* Hover: `var(--color-surface-secondary)`
* Selected or keyboard-focused: existing theme-primary focus treatment

Communicate live state through smaller elements only:

* LIVE badge
* In Progress status badge
* Small live icon
* Optional 3px left success accent

Do not color the whole row green.

For other states:

* Paused → neutral row with warning badge
* On Break → neutral row with warning badge
* Ready to Start → neutral row with primary badge
* Pending Approval → neutral row with warning badge
* Approved → neutral row with success badge

Keep borders clear between rows.

Use the same row background behavior in light and dark modes.

# 3. Make all non-hero dashboard rows 50/50

Keep the current first row unchanged:

* Hero carousel
* Four attention cards

Do not change the hero row ratio.

Change every dashboard row below it to equal columns.

## Row 2

```text
Ongoing & Upcoming Meetings — 50%
My Tasks — 50%
```

Use:

* `lg:grid-cols-2`, or
* Two equal six-column spans in the existing 12-column grid

Both cards must have equal width and aligned top and bottom edges.

## Row 3

```text
Agenda Progress — 50%
Recent Updates — 50%
```

Both cards must have equal width and balanced height.

Do not leave the existing 7/5 layout below the hero.

## Internal list heights

Keep consistent visible heights:

* Ongoing & Upcoming Meetings: four visible rows, then internal scrolling
* My Tasks: four visible rows, then internal scrolling
* Agenda Progress: four visible rows, then internal scrolling
* Recent Updates: five visible updates, then internal scrolling

Use subtle internal scrollbars.

Do not allow one card to stretch the entire row because it has more records.

# 4. Improve meeting-row buttons

Keep one button per row.

Use concise labels:

* Start
* Join
* Rejoin
* Continue
* Resume
* Review
* Publish
* Prepare Minutes
* View Details

Use clear hierarchy:

* Start, Join, Rejoin, Continue, Resume → primary or success style
* Review, Publish, Continue Setup → primary style
* View Details → neutral style

Do not use tiny buttons that look disabled.

Minimum button height:

* 32px desktop
* 40px touch layout

Add hover, focus, loading, and disabled states.

When disabled, show the reason through a tooltip or helper text.

# 5. Preserve the current hero

Do not redesign the hero banner.

Keep:

* Existing colors
* Existing shape
* Existing carousel dots
* Existing typography
* Existing slide transition
* Existing content hierarchy

Only fix its actions if they are incorrect.

Do not add:

* Arrows
* Slide counters
* Lifecycle timeline
* Extra progress bars
* Duplicate View Details buttons

# Acceptance criteria

The task is complete only when:

* Every hero action performs the correct workflow for the selected meeting.
* View Details opens the selected meeting drawer.
* Start, Join, Rejoin, Continue, and Resume open the correct Live Meeting route.
* Every meeting-row action is resolved dynamically.
* Every task action opens its source workflow.
* Agenda rows and recent updates open their related records.
* Attention cards use correct Board Meeting routes and filters.
* No dashboard button uses a legacy tax, PSR, stock, or return route.
* Ongoing meeting rows no longer have a full green background.
* Live state remains clear through badges and a small accent.
* Row 2 uses a 50/50 layout.
* Row 3 uses a 50/50 layout.
* The hero row remains unchanged.
* Paired cards have equal widths and balanced heights.
* Internal lists scroll without increasing the dashboard height.
* Desktop, tablet, mobile, light mode, and dark mode work.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not redesign the hero banner.
* Do not change unrelated pages.
* Do not change API contracts.
* Reuse the existing meeting-action resolver.
* Reuse existing drawers, forms, routes, buttons, and theme tokens.
* Do not create separate dashboard action logic.
* Keep one visible action per meeting or task row.
* Open the selected record, not a generic page.
* Remove all active legacy dashboard routes.
* Preserve responsive behavior and every existing theme.
