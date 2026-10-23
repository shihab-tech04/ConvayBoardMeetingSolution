Work directly inside the latest **NCC Bank Board Meeting Solution** React and TypeScript project.

Update only the reusable full-screen meeting pre-join interface.

The layout is almost correct. Do not redesign the full screen again. Fix only these two areas:

1. Improve the right-side meeting-details card.
2. Add proper breathing space between the camera warning and device controls.

Preserve all existing meeting, camera, microphone, connection, attendance, permission, session, and join logic.

# Files to update

* `src/app/components/meetings/MeetingPreJoinPanel.tsx`
* `src/styles/live-meeting.css`

Do not change unrelated files.

# 1. Redesign the meeting-details card content

The current right card has too much empty space and presents all meeting information as one plain vertical list.

Keep the current card size, placement, theme behavior, border, radius, and join buttons.

Inside the card, use this structure:

```text
Ready to join

Meeting title
Governance body

Meeting details
├── Date
├── Time
├── Mode
└── Venue / Access

Join Meeting
Join with devices off
```

Do not restore the role selector.

## Header area

Keep:

* Green readiness dot
* `Ready to join`
* Meeting title
* Governance body

Improve spacing:

* 8px between readiness label and title
* 8px between title and governance body
* 22–24px before the meeting-details section

Make the meeting title easier to scan:

* Use the existing heading typography
* Maximum three lines
* Proper line height
* Do not reduce the font size to fit a long title

Show the governance body as a compact supporting line directly below the title.

Do not treat the governance body as one of several identical metadata rows.

# 2. Create a structured meeting-details grid

Replace the current plain `<ul className="meeting-prejoin__meta">` presentation with a compact two-column information grid.

Create classes such as:

```text
meeting-prejoin__details
meeting-prejoin__details-label
meeting-prejoin__details-grid
meeting-prejoin__detail-item
meeting-prejoin__detail-icon
meeting-prejoin__detail-content
meeting-prejoin__detail-key
meeting-prejoin__detail-value
```

Recommended layout:

```text
Meeting details

┌──────────────────────┬──────────────────────┐
│ Date                 │ Time                 │
│ Saturday, 4 Apr 2026 │ 2:00 PM              │
├──────────────────────┼──────────────────────┤
│ Mode                 │ Venue                │
│ In Person            │ Board Room A         │
└──────────────────────┴──────────────────────┘
```

Each item should contain:

* Small existing Lucide icon
* Small muted label
* Clear value

Use:

* Existing secondary-surface token
* Existing border token
* Existing radius token
* 12–14px internal padding
* 10–12px gap between tiles
* No heavy shadows
* No strong background colors

Do not make the details look like form fields.

Do not add editable inputs.

# 3. Meeting-data rules

Format the information clearly:

Date:

`Saturday, 4 April 2026`

Time:

`2:00 PM`

Mode:

* Virtual
* Hybrid
* In Person

Venue:

* Actual venue when available
* `Secure virtual meeting` for Virtual meetings
* `Venue not specified` only when the value is genuinely missing

Do not show:

* Raw ISO dates
* 24-hour time when the application uses 12-hour formatting
* `Physical · Hybrid`
* A mode value inside the Venue field
* Duplicate location rows

Continue using the existing mode and venue normalization helpers.

# 4. Improve the card’s vertical balance

The right card should no longer have one large blank middle area.

Use this flow:

```css
.meeting-prejoin__card {
  display: flex;
  flex-direction: column;
}

.meeting-prejoin__card-content {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.meeting-prejoin__actions {
  margin-top: auto;
}
```

Add one content wrapper when needed:

```tsx
<div className="meeting-prejoin__card-content">
  ...
</div>
```

Keep the join actions at the bottom, but let the meeting-details grid use more of the card’s available space naturally.

Do not add empty spacer elements.

Use approximately:

* Card padding: 30–32px
* Main section gap: 22–24px
* Button gap: 10px

# 5. Improve the camera-warning spacing

The current `Camera unavailable` alert is too close to:

* `Camera is off`
* The microphone and camera controls

Keep the alert inside the preview, but give it a dedicated visual zone.

Use this vertical order:

```text
Avatar
Camera is off

Breathing space

Camera unavailable alert

Breathing space

Microphone and camera controls
```

Update the warning position so there is at least:

* 20px between `Camera is off` and the alert
* 18px between the alert and device controls
* 20–24px between the controls and the preview’s bottom edge

Recommended desktop direction:

```css
.meeting-prejoin__alert {
  bottom: 96px;
  width: calc(100% - 96px);
  max-width: 460px;
  padding: 12px 14px;
}

.meeting-prejoin__device-controls {
  bottom: 22px;
}
```

Do not rely only on absolute values if the alert content can wrap. Ensure the warning never overlaps the avatar text or controls.

Increase the camera preview minimum height slightly when needed:

```css
.meeting-prejoin__camera-well {
  min-height: 440px;
}
```

Do not make the entire preview significantly taller than the right card.

# 6. Improve the warning UI

Keep the writing:

Heading:

`Camera unavailable`

Text:

`You can still join with your camera turned off.`

Improve readability:

* Alert icon: 15–16px
* Heading: existing label-small or body-small semibold
* Supporting text: existing body-small
* 4px gap between heading and text
* Proper line height
* Warning-tonal background
* Warning border
* No strong red background

The alert should feel informative, not alarming.

# 7. Device-control spacing

Keep the microphone and camera controls in the existing dark rounded control tray.

Use:

* 48px desktop controls
* Minimum 44px on mobile
* 10–12px internal gap
* 8px control-tray padding
* Existing on/off semantic states

Remove hover scaling if it still exists.

Use color, border, and background changes for hover and active states instead of:

```css
transform: scale(...)
```

Do not change the button functions.

# 8. Responsive behavior

## Tablet

* Meeting-details grid may remain two columns when readable.
* Switch to one column when the right card becomes narrow.
* Keep warning and controls separated.

## Mobile

* Meeting-details grid becomes one column.
* Camera alert must remain above the device controls.
* No overlap inside the preview.
* Full-width buttons.
* Safe vertical scrolling.
* No horizontal overflow.

# Acceptance criteria

The task is complete only when:

* The right card no longer looks empty.
* The meeting title and governance body have a clear hierarchy.
* Date, time, mode, and venue appear in a structured details grid.
* Meeting details are not presented as one plain metadata list.
* The role selector remains removed.
* Venue and mode values are correct and not duplicated.
* The camera warning has visible breathing room above and below it.
* The warning does not overlap `Camera is off`.
* The warning does not touch the microphone and camera controls.
* The camera preview and right card remain visually balanced.
* Join Meeting remains functional.
* Join with devices off remains functional.
* Camera and microphone controls remain functional.
* Light mode and dark mode continue using existing theme tokens.
* Desktop, tablet, and mobile layouts work.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not redesign the complete pre-join screen.
* Do not change unrelated files.
* Do not restore the role selector.
* Do not change meeting APIs, permissions, attendance, routes, or session logic.
* Reuse the existing `MeetingPreJoinPanel`.
* Reuse existing typography, colors, buttons, icons, borders, spacing, shadows, and radius tokens.
* Do not create another meeting-details or pre-join component.
* Do not add unnecessary meeting information.
* Preserve Start, Join, Rejoin, Continue, and Resume behavior.
