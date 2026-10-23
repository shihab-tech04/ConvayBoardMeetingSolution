````text
Work directly inside the latest NCC Bank Board Meeting Solution React and TypeScript project.

Redesign only:

Home → My Calendar

The current page is functional, but the UI feels weak and unfinished:

- The Month view has too much empty space.
- The Week view is cramped and truncates meeting titles.
- The Agenda view uses too many status pills and buttons.
- The right “Next 7 days” panel repeats the same information and adds a full-width button to every item.
- Calendar colors are too prominent.
- Navigation buttons use local styles instead of the unified button system.
- Several actions are static and do not use the existing meeting-action resolver.
- Most styling is written inline even though calendar styles already exist in `cards.css`.

Make the page cleaner, calmer, easier to scan, and consistent with the updated Overview and My Tasks pages.

Do not change unrelated pages, navigation, APIs, registries, permissions, routes, meeting data, or business logic.

# Files to inspect and update

Primary:

- `src/app/pages/dashboard/CombinedDashboardPage.tsx`
- `src/styles/cards.css`

Reuse:

- `StatCard`
- `TabBar`
- `Button`
- `IconButton`
- `useResolvedActions`
- Existing meeting details drawer
- Existing Live Meeting route or workspace behavior
- Existing task and entity workflows
- Existing date helpers
- Existing theme and typography tokens

Do not rename or move `CombinedDashboardPage.tsx`.

Do not create another calendar page or calendar data registry.

# 1. Preserve the page structure

Keep:

- Page heading
- Description
- Three summary cards
- Month, Week, and Agenda views
- Upcoming schedule panel
- Current calendar data sources

Use this desktop layout:

```text
Page heading

Three summary cards

Calendar workspace
├── Main calendar — approximately 72%
└── Upcoming schedule — approximately 28%
````

Keep the main calendar and right panel aligned at the top and bottom.

Use a minimum workspace height that makes proper use of the viewport without creating unnecessary page scrolling.

Do not leave a large blank area below the calendar content.

# 2. Improve the page heading

Keep:

`My Calendar`

Use this description:

`View your meetings, review deadlines, voting windows, and assigned due dates.`

Use the same heading width, typography, and spacing as the updated My Tasks page.

Remove inline heading styles.

Use existing page-heading classes or theme tokens.

# 3. Improve the summary cards

Keep three cards:

1. Next Meeting
2. Meetings This Month
3. Upcoming Deadlines

Use the existing `StatCard`.

## Next Meeting

Show:

* Value: friendly date, such as `Today`, `Tomorrow`, or `24 Jul`
* Label: `Next Meeting`
* `subInfo`: meeting title and time

Example:

```text
Today
Next Meeting
344th Board Meeting · 9:00 AM
```

When an active meeting is already in progress, show:

```text
Live now
Current Meeting
344th Board Meeting
```

Clicking the card should open or select the related meeting.

## Meetings This Month

Show the real number of meetings in the visible month.

Clicking it should switch to Month view.

## Upcoming Deadlines

Show only deadlines assigned to or relevant to the current user.

Clicking it should switch to Agenda view and show deadline events.

Use neutral card tones when the value is zero.

Do not hardcode counts.

# 4. Move the event legend into the calendar workspace

The current legend floats separately between the KPI cards and calendar.

Move it into the calendar card, below the view tabs or inside the calendar toolbar.

Use a compact legend:

```text
● Meetings   ● Deadlines   ● Actions   ● Reviews
```

Use small dots and muted text.

Do not use large colored pills.

Allow legend items to act as filters when practical:

* Clicking Meetings shows or hides meeting events.
* Clicking Deadlines shows or hides deadlines.
* Clicking Actions shows or hides action items.
* Clicking Reviews shows or hides review events.

Active filter:

* Normal text and colored dot

Inactive filter:

* Muted text and outlined dot

Do not create a separate filter system if the existing local state is enough.

# 5. Create one clean calendar shell

Use one calendar card containing:

```text
Calendar toolbar
View tabs
Optional legend/filter row
Active calendar view
```

The toolbar should contain:

```text
Previous       Current period title       Next      Today
```

Use:

* `IconButton` for Previous
* `IconButton` for Next
* `Button` with `variant="secondary"` and `size="sm"` for Today

Do not use raw locally styled buttons.

Do not use arrows inside the Today button.

Use existing button sizes and focus states.

# 6. Correct period navigation behavior

The current Previous and Next controls always change the month, even in Week view.

Fix the behavior:

## Month view

* Previous → previous month
* Next → next month
* Today → current month and today

## Week view

* Previous → previous week
* Next → next week
* Today → current week and today

Use `subWeeks` and `addWeeks`.

Do not change a whole month when the user is viewing one week.

## Agenda view

* Previous and Next may move by month
* The heading should show the active month
* Today returns to the current date and current agenda groups

# 7. Redesign Month view

The current Month view is visually too small and leaves unused space.

Use a proper calendar grid:

* Seven equal columns
* Six calendar rows when required
* Minimum day-cell height around 92–110px on desktop
* Clear weekday header
* Subtle grid borders
* Comfortable internal padding
* Consistent hover and selected states

Each day cell should show:

* Day number
* Up to two event rows
* `+N more` when additional events exist

## Event display

Use a restrained event row:

```text
● 344th Board Meeting
```

Use:

* One small type-colored dot
* Neutral or softly tinted background
* Primary text color
* Truncated title

Do not fill every event with a strong semantic color.

Do not use different text colors for every event type.

Use semantic color only in the small leading dot or 2px accent.

## Today

Show today using:

* Small filled circular day number
* Existing primary color

Do not change the entire day-cell background to a strong color.

## Selected day

Use:

* Soft primary surface
* Primary border
* Clear keyboard focus

Selecting a day must update the right panel.

If the selected date has no events, the right panel must show an empty state for that selected date.

Do not silently fall back to Next 7 days while still showing the selected date heading.

# 8. Redesign Week view

The current Week view is too compressed and meeting titles are heavily truncated.

Create seven clean day columns.

Each day column should contain:

* Day name
* Date
* Today indicator
* Events ordered by time

Use a minimum desktop height around 320–380px.

Each event should show:

```text
9:00 AM
344th Board Meeting
```

Optional second line:

`Board of Directors`

Rules:

* Keep event titles readable.
* Allow two lines before truncation.
* Use a small type-colored dot or side accent.
* Do not use strong colored backgrounds.
* Do not display status pills inside every event.
* Entire event card is clickable.

When a day has many events:

* Keep the day column scrollable, or
* Show the first three and a `View N more` tertiary action

Do not stretch the complete calendar page vertically without limit.

# 9. Redesign Agenda view

Make Agenda view follow the same restrained compact-row pattern as My Tasks and the lower Overview dashboard.

Group events by:

* Today
* Tomorrow
* This Week
* Later

Each row should show no more than two main text lines:

```text
Meeting or task title                              Due or time
Related meeting · Event type
```

Examples:

```text
344th Board of Directors Meeting                  9:00 AM
Board of Directors · Meeting
```

```text
Review Board Pack                                 Due tomorrow
Annual General Meeting · Review
```

Remove:

* Full-height colored sidebars
* Status pills on every row
* Visible View Details button on every row
* Separate action buttons for normal view actions
* Repeated status information

Make the full row clickable.

Show a visible action only for immediate actions such as:

* Start
* Join
* Rejoin
* Resume

For Review, Update, View Details, or other normal workflows, clicking the complete row should open the direct workflow.

Use semantic text color only for urgent due states.

# 10. Redesign the right-side panel

Rename:

`Next 7 days`

to:

`Upcoming schedule`

When a date is selected, use the selected friendly date as the heading.

Example:

`Wednesday, 22 July`

Add a small tertiary action:

`Show upcoming`

when a selected date is active.

Do not use the current arrow-prefixed writing:

`← Show next 7 days`

## Upcoming item structure

Use a compact clickable row:

```text
9:00 AM                                      Today
344th Board of Directors Meeting
Board Room A · Meeting
```

Rules:

* Remove the large event-type badge.
* Remove the full-width action button from every item.
* Remove arrow icons.
* Keep a maximum of three lines.
* Use one small event-type dot or icon.
* Make the full row clickable.
* Use thin separators.
* Use restrained hover and focus states.

Only show a small visible action when immediate participation is available:

* Join
* Rejoin
* Start
* Resume

Do not show View Details buttons.

Keep the panel internally scrollable when more items exist.

Use a subtle 4px scrollbar.

# 11. Connect events to real actions

The current calendar creates static actions using:

```text
In Progress → Join Meeting
Scheduled → Start Meeting
Everything else → View Details
```

Remove this local action logic for meetings.

Use the existing authoritative meeting-action resolver:

* `useResolvedActions("meeting")`

Resolve the action using the actual meeting record, current user, permissions, role, status, and time window.

Possible immediate meeting actions:

* Start
* Join
* Rejoin
* Continue
* Resume
* Resume After Break

Do not show both Join and Rejoin.

Do not show Start Meeting to users who are not authorized hosts.

For non-meeting events, keep enough source information in the calendar event model:

* `sourceType`
* `sourceId`
* `meetingId`

Do not locate source records by title when an ID exists.

Map event clicks to direct workflows:

* Meeting → meeting details or Live Meeting
* Board Pack deadline → Board Pack drawer
* RSVP → RSVP workflow
* Action item → Action Item drawer
* Minutes review → Minutes drawer
* Vote or signature → related meeting workflow

Do not route every event to a generic page.

# 12. Improve the event model

Extend `CalEvent` only as needed:

```ts
interface CalEvent {
  id: string;
  sourceId: string;
  sourceType: "meeting" | "board-pack" | "rsvp" | "action-item" | "minutes";
  meetingId?: string;
  title: string;
  date: string;
  time?: string;
  type: EventType;
  status: string;
  relatedMeeting: string;
  mode?: string;
  venue?: string;
}
```

Do not keep a hardcoded `action` label as the main authority.

Resolve actions at render or interaction time.

# 13. Use restrained color

The calendar should mainly use:

* Surface colors
* Primary and secondary text
* Borders and dividers
* Primary color for selection and active tabs
* Small semantic dots for event type

Do not use several semantic colors inside one item.

Bad:

```text
Purple badge + purple background + blue button + status pill
```

Good:

```text
Small purple meeting dot + neutral row
```

Use:

* Meeting → primary dot
* Deadline → warning dot
* Action → error dot only when overdue
* Review → neutral or success dot

A normal future action item should not be bright red simply because its event type is Action.

# 14. Reuse the unified button system

Replace all raw buttons in `CombinedDashboardPage.tsx` with:

* `Button`
* `IconButton`

Use:

* IconButton for previous and next
* Secondary Button for Today
* Tertiary Button for Show upcoming
* Primary or secondary small Button only for immediate meeting actions

Remove button appearance from inline styles.

Do not introduce calendar-specific button visuals.

# 15. Move visual styling out of JSX

The current page contains extensive inline styling.

Move page-specific visual styles into:

* `src/styles/cards.css`

Use or extend the existing calendar classes:

* `.cal-container`
* `.cal-nav`
* `.cal-nav__btn`
* `.cal-nav__label`
* `.cal-nav__today`
* `.cal-legend`
* `.cal-month`
* `.cal-month__header`
* `.cal-month__grid`
* `.cal-day`
* `.cal-week__header`
* `.cal-week__day`
* `.cal-week-event`
* `.cal-list`
* `.cal-event-card`

Add scoped classes only when required:

* `.my-calendar-page`
* `.my-calendar-summary`
* `.calendar-workspace`
* `.calendar-main`
* `.calendar-side-panel`
* `.calendar-side-row`
* `.calendar-agenda-group`
* `.calendar-agenda-row`

Remove or stop using duplicate inline styling after migration.

Do not hardcode:

* Colors
* Radii
* Font sizes
* Shadows
* Button dimensions

inside the page JSX.

# 16. Improve empty states

Use small, practical empty states.

## Empty selected date

Heading:

`No events on this date`

Text:

`Your meetings and deadlines for this date will appear here.`

## Empty agenda

Heading:

`No upcoming events`

Text:

`You have no meetings or deadlines in this period.`

## Empty week day

Use a simple muted:

`No events`

Do not use large illustrations.

# 17. Responsive behavior

## Desktop

* Three summary cards in one row
* Main calendar and Upcoming schedule side by side
* Month grid uses the available width
* Week view shows seven readable columns
* No horizontal page overflow

## Tablet

* Keep the main calendar full width
* Move Upcoming schedule below the calendar when the sidebar becomes too narrow
* Summary cards may remain three columns or wrap when required
* Week view may scroll horizontally inside its own container

## Mobile

Order:

1. Heading
2. Summary cards
3. Calendar toolbar
4. View tabs
5. Event filters
6. Active calendar view
7. Upcoming schedule

Mobile rules:

* Summary cards stack or use the existing mobile card pattern.
* Month cells remain readable.
* Week view becomes a horizontal day carousel or stacked daily agenda.
* Agenda rows become touch-friendly cards.
* Complete event cards are clickable.
* Do not add separate View Details buttons.
* Minimum 44px interactive targets.
* No horizontal page overflow.
* Use safe internal scrolling only where necessary.

# 18. Accessibility

Verify:

* Previous and Next buttons have accurate labels for the active view.
* Calendar days support keyboard selection.
* Selected date uses `aria-pressed` or an equivalent selected state.
* Event rows support Enter and Space.
* Active tab is announced.
* Event type does not rely only on color.
* Buttons use visible focus states.
* Date information is readable by screen readers.
* Light and dark themes maintain sufficient contrast.

# Acceptance criteria

The task is complete only when:

* The page looks visibly cleaner and more polished.
* The Month view uses the available vertical space.
* Month day cells are larger and easier to scan.
* Event items use restrained color.
* The Week view changes one week at a time.
* Week event titles are readable.
* Agenda view follows the compact dashboard-row pattern.
* The right panel no longer has a full-width button on every item.
* Generic View Details buttons are removed.
* Full event rows open their direct workflow.
* Immediate Start, Join, Rejoin, Continue, or Resume actions still appear when relevant.
* Meeting actions use the shared resolver.
* Selected empty dates show an empty selected-date state instead of Next 7 days.
* Calendar navigation uses the unified Button and IconButton system.
* Inline visual styles are removed from `CombinedDashboardPage.tsx`.
* Existing registries, routes, permissions, meeting logic, and workflows remain intact.
* Light mode, dark mode, desktop, tablet, and mobile work correctly.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not change Overview or My Tasks.
* Do not change unrelated files.
* Do not rename or move `CombinedDashboardPage.tsx`.
* Do not create another calendar or event registry.
* Do not create another button, tab, card, drawer, or action system.
* Reuse the existing meeting-action resolver.
* Reuse the unified Button and IconButton system.
* Keep event colors restrained.
* Do not place a visible button on every calendar item.
* Preserve all current data, routes, permissions, and responsive behavior.

```
```
