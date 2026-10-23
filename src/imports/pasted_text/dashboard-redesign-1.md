Work directly inside the latest **NCC Bank Board Meeting Solution** React and TypeScript project.

Redesign only the dashboard content below the hero row on:

`Home → Overview`

Keep the following completely unchanged:

* Hero carousel
* Hero actions
* Four attention cards
* Dashboard header
* Navigation
* Routes
* Registries
* Business logic
* Existing dynamic action resolver

The current lower dashboard feels visually noisy because each row uses too many competing signals:

* Colored left borders
* Colored count badges
* Status pills
* Action buttons
* Colored icons
* Progress bars
* Error text
* Multiple metadata lines

Create one restrained, consistent list pattern for all four lower dashboard panels.

# Files to update

Primary:

* `src/app/pages/dashboard/DashboardPage.tsx`
* `src/styles/cards.css`

Reuse or extend when useful:

* `src/app/components/dashboard/DashSection.tsx`
* Existing status, button, icon, and theme components

Do not create a second dashboard design system.

# 1. Preserve the existing layout

Keep the current 50/50 dashboard structure:

```text
Row 2
├── Ongoing & Upcoming Meetings — 50%
└── My Tasks — 50%

Row 3
├── Agenda Progress — 50%
└── Recent Updates — 50%
```

Keep both cards in each row:

* Equal width
* Equal height
* Aligned top and bottom edges
* Four visible rows
* Internal scrolling for additional records

Do not modify the hero row.

# 2. Create one consistent compact-section style

Use the same card structure for all four sections:

```text
Section header
Scrollable compact list
```

Use:

* Existing surface color
* Existing border color
* Existing large radius
* Very subtle shadow
* Consistent header height
* Consistent row height
* Consistent horizontal padding
* Consistent separators

Recommended measurements:

* Header height: 48–52px
* Row height: 64–68px
* Horizontal padding: 16px
* Row gap: 10–12px
* Four rows visible

Do not use different row structures for every panel.

Create a small reusable local or shared component only when it reduces repeated markup, such as:

* `DashboardCompactSection`
* `DashboardCompactRow`

Do not replace the existing global card system.

# 3. Simplify section headers

Current colored count bubbles make the headers visually busy.

Use this pattern:

```text
Ongoing & Upcoming Meetings   10                View all
My Tasks                      32                View all
Agenda Progress                                 View all
Recent Updates                                  View all
```

Rules:

* Keep the section icon small and in the existing primary color.
* Show counts as muted text, not green or red pills.
* Use one subtle `View all` text action.
* Remove arrow icons from `View all`.
* Do not use bright count backgrounds.
* Do not make the complete header clickable.

Example:

```text
My Tasks  ·  32
```

The count must not imply that every task is overdue.

# 4. Redesign Ongoing & Upcoming Meetings

Update the existing `MeetingsSection`.

The current row repeats meeting state through:

* Green left border
* LIVE block
* In Progress pill
* Join button

Use only one clear status treatment.

## New meeting-row structure

```text
[Date or Live indicator]  Meeting title                 [Contextual action]
                          Committee · Time · Status
```

### Leading indicator

For live meetings:

* Use one small live indicator with a dot and `Live`.
* Do not also show an `In Progress` pill.
* Remove the full-height green left border.
* Remove the large green LIVE block.

For Paused or On Break:

* Use one small muted status label with a warning-colored dot.
* Do not color the full row.

For upcoming meetings:

* Use the compact date block already in the project.

### Meeting information

Show only:

* Meeting title
* Governance body
* Time
* One short status label

Example:

```text
42nd Risk Management Committee Meeting
Risk Management Committee · 2:00 PM · Live
```

Do not place the status in a separate floating column above the action.

Do not repeat `Live`, `In Progress`, and a green accent for the same meeting.

### Meeting actions

Show a visible row action only when the user can take an immediate meeting action:

* Start
* Join
* Rejoin
* Continue
* Resume

For other states such as:

* Pending Approval
* Approved
* Published
* Scheduled
* Completed

Make the complete row open the meeting details or relevant workflow without adding another visible button.

Do not show generic `View` buttons on every row.

Keep row hover and keyboard-focus states so it remains clear that the row is interactive.

# 5. Redesign My Tasks

Update `MyTasksOverviewSection`.

The current task row has:

* Red left bar
* Overdue text
* Action button
* Two content lines

This gives every row too much visual weight.

## New task-row structure

```text
Task title                                      Due state
Related meeting or record
```

Rules:

* Remove the full-height red left border.
* Remove visible `Review`, `Update`, or other buttons from every row.
* Make the complete row open the direct task workflow.
* Preserve the existing `onTaskAction` behavior through row click.
* Use one or two text lines only.
* Show the due state at the far right on the first line.
* Use error color only for genuinely overdue tasks.
* Use neutral text for normal deadlines.

Examples:

```text
Review meeting approval                   Overdue
128th Executive Committee Meeting
```

```text
Update Risk Register                      Due tomorrow
344th Board of Directors Meeting
```

Do not show both `Overdue` and a separate action button.

On keyboard focus or hover, use a subtle surface change.

On mobile, the full card tap should perform the same direct action.

# 6. Redesign Agenda Progress

Update `AgendaProgressPanel`.

The current rows use:

* Multiple progress-bar colors
* Percentage
* Status pill
* Completion text
* Pending text

Simplify each row to:

```text
Meeting title                                  80%
████████████████░░░
4 of 5 agenda items completed
```

Rules:

* Remove the meeting-status pill from each agenda row.
* Use the theme-primary color for normal progress.
* Use success color only when progress reaches 100%.
* Use warning color only when there is a genuine blocked or overdue condition.
* Do not change colors based only on arbitrary percentage thresholds.
* Use one short progress description.
* Do not show `In Progress` beside every agenda row.
* Make the complete row clickable.

Before meeting:

`6 of 8 agenda items approved`

During or after meeting:

`4 of 5 agenda items completed`

Do not combine completion text with additional pending text when it makes the row too long.

# 7. Redesign Recent Updates

Update `RecentUpdatesPanel`.

The current rows use several differently colored icon backgrounds. This makes the section look busier than the information requires.

Use one neutral activity style:

```text
[small neutral icon]  Meeting started                     6 min ago
                      Special Board Meeting
```

Rules:

* Use the same neutral icon container for normal updates.
* Use semantic color only for warning, failure, or high-priority events.
* Keep update title to one line.
* Keep related meeting or record to one line.
* Show the time at the far right.
* Use actual relative timestamps.
* Do not show `Just now` for records that share old or identical timestamps.
* Do not add buttons to update rows.
* Make the complete row clickable.

Do not use green icon backgrounds for every successful event.

# 8. Use restrained color

The lower dashboard should primarily use:

* Surface color
* Main text
* Secondary text
* Border color
* Primary color for links and active progress
* Semantic colors only when they communicate a real condition

Remove excessive use of:

* Green
* Red
* Orange
* Purple

Do not use more than one semantic color signal within the same row.

Examples:

Bad:

```text
Green left border + green LIVE box + orange In Progress badge + blue Join button
```

Good:

```text
Small green live dot + Live text + Join action
```

Bad:

```text
Red left border + red Overdue label + gray Update button
```

Good:

```text
Overdue text in red; entire row opens the task
```

# 9. Improve scrolling

The existing scrollbars are visually heavy and appear directly beside row content.

Use:

* Thin 4px scrollbar
* Transparent track
* Muted thumb
* Thumb visible on hover or active scrolling
* Enough right padding so text and statuses do not touch the scrollbar

Do not hide important content behind the scrollbar.

Keep exactly four full rows visible. Do not show a partially clipped fifth row.

# 10. Interaction behavior

Preserve all existing functionality.

Meetings:

* Live row click opens meeting details.
* Start, Join, Rejoin, Continue, and Resume actions still open the correct meeting workspace.
* Do not change the shared meeting resolver.

Tasks:

* Clicking a task row opens its direct source workflow.
* Do not route every task to the generic My Tasks page.

Agenda:

* Clicking a row opens Agenda Management filtered to the selected meeting when possible.

Recent Updates:

* Clicking a row opens the related entity.

`View all` actions must continue opening the correct full pages.

# 11. Responsive behavior

## Desktop

* Two equal columns in each row
* Four full rows visible
* No clipped labels
* No horizontal overflow

## Tablet

* Stack paired sections when the columns become cramped
* Preserve compact row styling
* Keep row status and dates readable

## Mobile

* One-column layout
* Rows become compact touch-friendly cards
* Minimum 44px interactive height
* Entire card tap performs the row action
* No tiny separate action buttons
* No horizontal scrolling

# Acceptance criteria

The task is complete only when:

* The hero banner and attention cards remain unchanged.
* The lower dashboard looks visibly calmer.
* Section headers use one consistent pattern.
* Colored count pills are removed.
* View-all arrows are removed.
* Meeting rows no longer combine multiple status indicators.
* Full-row green meeting accents are removed.
* Meeting actions appear only for immediate Start, Join, Rejoin, Continue, or Resume actions.
* Generic meeting View buttons are removed.
* Task red sidebars are removed.
* Task action buttons are removed.
* Complete task rows open their direct workflows.
* Agenda status pills are removed.
* Agenda progress uses restrained colors.
* Recent-update icons use a consistent neutral treatment.
* Each row contains no more than two main text lines.
* Four complete rows are visible in each section.
* Internal scrolling remains functional.
* All existing data, actions, routes, themes, and responsive behavior remain intact.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not change the hero banner.
* Do not change the four attention cards.
* Do not change unrelated pages.
* Do not change APIs, registries, routes, or business logic.
* Reuse existing dashboard, theme, icon, and action patterns.
* Do not create a second card or button system.
* Do not use several status colors in one row.
* Do not add a button to every dashboard row.
* Keep dashboard rows compact, clickable, and easy to scan.
* Preserve desktop, tablet, mobile, light mode, dark mode, and every existing theme.
