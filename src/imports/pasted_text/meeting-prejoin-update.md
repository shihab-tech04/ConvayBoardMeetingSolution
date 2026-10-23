````text
Work directly inside the latest NCC Bank Board Meeting Solution React and TypeScript project.

Update only the reusable full-screen meeting pre-join interface.

The current layout is still unbalanced. The Device Check section makes the right card too tall and leaves the left video area visually disconnected.

Move Device Check directly below the video preview and redesign the page as one balanced pre-join workspace.

Do not change meeting-entry logic, APIs, attendance, permissions, session persistence, routes, or the active Live Meeting interface.

# Files to update

Primary files:

- `src/app/components/meetings/MeetingPreJoinPanel.tsx`
- `src/styles/live-meeting.css`

Do not change unrelated files unless required to fix an existing import or TypeScript error.

# Final desktop structure

Use this structure:

```text
Compact header
├── Back to Meetings
└── Pre-join check

Centered workspace — maximum width 1200–1240px
├── Left column — approximately 65%
│   ├── Video preview
│   └── Device readiness tray
└── Right column — approximately 35%
    └── Meeting entry card
````

The complete workspace should be vertically centered and use the viewport properly.

Do not leave a large empty area above or below the interface.

# 1. Move Device Check to the left column

Remove the current Device Check section from:

`.meeting-prejoin__card`

Create a new section directly below the camera preview:

`.meeting-prejoin__readiness-tray`

The left column should become:

```tsx
<div className="meeting-prejoin__preview">
  <div className="meeting-prejoin__camera-well">
    ...
  </div>

  <div className="meeting-prejoin__readiness-tray">
    ...
  </div>
</div>
```

The tray must contain three equal compact items:

1. Microphone
2. Camera
3. Connection

Each item should show:

* Small icon
* Device label
* Current state

Examples:

```text
Microphone
On

Camera
Off

Connection
Ready
```

Use existing semantic colors:

* On and Ready → success
* Muted and Off → error or neutral-error
* Connecting → warning
* Unavailable → error

Do not use tiny debug-style pills.

Do not use full bright green or red card backgrounds.

Use subtle semantic icons and text.

# 2. Design the Device Readiness tray

Make the readiness tray feel like a natural extension of the video preview.

Use:

* `var(--color-surface)`
* `var(--color-border)`
* Existing radius token
* Subtle shadow
* 12–16px padding
* Three equal columns
* Thin separators between items
* Minimum height around 68–76px

Recommended visual behavior:

```text
[ Mic icon  Microphone / On ]
[ Camera icon  Camera / Off ]
[ Wifi icon  Connection / Ready ]
```

Desktop:

* One horizontal row
* Three equal sections

Mobile:

* Keep three compact columns when space allows
* Otherwise stack into one compact list

Do not add separate buttons inside the readiness tray.

The microphone and camera controls must remain inside the video preview.

The tray reports state; the preview controls change state.

# 3. Improve the video preview

Preserve the existing camera and media logic.

Keep:

* 16:9 video ratio
* Neutral dark video surface
* Camera stream
* Camera-off avatar
* Microphone and camera buttons
* Permission warning

Improve the composition:

* Increase the preview width and visual presence
* Keep the avatar centered
* Keep device controls centered near the bottom
* Position the permission alert above the controls
* Reduce the alert width so it does not feel like a full-width form field
* Give the warning and controls enough separation

The warning should remain:

Heading:

`Camera unavailable`

Text:

`You can still join with your camera turned off.`

Do not repeat this warning below the video or inside the meeting card.

# 4. Simplify the right meeting card

The right card should now contain only:

```text
Ready to join

Meeting title
Governance body
Date
Time
Mode
Venue or virtual access

Optional meeting context

Join Meeting
Join with devices off
```

Remove completely:

* Your Role heading
* Role dropdown
* Assigned-role helper text
* Device Check
* Microphone status
* Camera status
* Connection status

Do not remove `initialRole` from the component properties or join payload.

Continue passing the resolved role silently when calling:

```ts
onJoin({
  micOn,
  camOn,
  role: initialRole
});
```

The user should not see or change the role in this pre-join interface.

# 5. Improve the right-card hierarchy

Use a cleaner information layout.

Top:

* Small success indicator
* `Ready to join`

Main:

* Meeting title
* Governance body
* Friendly date and time
* Mode
* Venue or secure virtual access

Optional compact information:

* Meeting type
* Confidentiality level

Only show these when real data exists.

Do not add agenda, participants, Board Pack information, voting, quorum, decisions, or actions.

Use fewer dividers.

Use spacing to separate content groups.

# 6. Keep the actions inside the right card

Keep the Join actions at the bottom of the meeting card.

Primary action:

`Join Meeting`

Secondary action:

`Join with devices off`

Reuse:

* `PrimaryButton`
* `SecondaryButton`

Do not create new button styles.

Do not add arrow icons.

If both microphone and camera are already off, do not show a secondary action that performs the same operation.

Preserve:

* Loading state
* Disabled state
* Permission checks
* Attendance creation
* Join persistence
* Existing meeting-session logic

# 7. Balance both columns

The right card should visually align with the complete left stack:

```text
Video preview + readiness tray
=
Meeting information card
```

Use stretch alignment on desktop.

Recommended CSS direction:

```css
.meeting-prejoin__grid {
  display: grid;
  grid-template-columns: minmax(0, 65fr) minmax(360px, 35fr);
  align-items: stretch;
  gap: 24px;
}

.meeting-prejoin__preview {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.meeting-prejoin__card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.meeting-prejoin__actions {
  margin-top: auto;
}
```

Do not force the right card to become excessively tall through empty spacer elements.

Use natural content spacing and `margin-top: auto` for the actions.

Remove `.meeting-prejoin__card-spacer` when it is no longer needed.

# 8. Use a more intentional page scale

The current interface still feels too small for the viewport.

Use:

* Maximum workspace width: 1200–1240px
* Left preview minimum height: approximately 410–450px on large desktop
* Right card padding: 28–32px
* Main workspace gap: 24px
* Page padding responsive through `clamp()`

The workspace should occupy a meaningful part of the viewport without becoming oversized.

Keep it vertically centered under the header.

# 9. Preserve theme behavior

Light themes:

* Light page background
* White or theme surface card
* Neutral dark video preview
* Existing border and text tokens
* Theme-primary Join button

Dark mode:

* Dark page background
* Elevated dark meeting card
* Dark readiness tray
* Existing dark borders and text
* Theme-primary Join button

Do not hardcode a white-only entry card.

Do not use the theme primary color as the full-page background.

Continue using existing CSS variables.

# 10. Responsive behavior

## Tablet

* Keep two columns while content remains readable
* Reduce the gap and padding
* Stack before the meeting card becomes cramped

## Mobile

Use this order:

1. Header
2. Video preview
3. Device readiness tray
4. Meeting information
5. Join actions

Mobile rules:

* One-column layout
* Full-width preview
* Full-width meeting card
* Full-width buttons
* Minimum 44px controls
* Safe vertical scrolling
* No horizontal overflow

# 11. UX writing

Use:

* `Pre-join check`
* `Ready to join`
* `Camera unavailable`
* `Camera is off`
* `Device readiness`
* `Microphone`
* `Camera`
* `Connection`
* `Join Meeting`
* `Join with devices off`

Do not show:

* Your Role
* Role
* Assigned for this meeting
* Physical · Hybrid
* Raw ISO dates
* Technical device error codes

Continue normalizing the mode to one value:

* Virtual
* Hybrid
* In Person

Show the venue separately.

# Acceptance criteria

The task is complete only when:

* Device Check is removed from the right card.
* A new Device Readiness tray appears directly below the video preview.
* The readiness tray contains Microphone, Camera, and Connection.
* Device controls remain inside the video preview.
* The right card contains only meeting details and join actions.
* Your Role and the role dropdown are completely removed from the visible UI.
* `initialRole` still passes correctly into the join handler.
* The left and right columns feel visually balanced.
* The workspace uses more of the viewport.
* The right card and left preview stack align cleanly.
* Meeting mode and venue remain correctly normalized.
* Join Meeting and Join with devices off remain functional.
* Camera, microphone, and permission behavior remain functional.
* Light mode and dark mode use the existing design-system palettes.
* Desktop, tablet, and mobile work correctly.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not change meeting APIs, permissions, attendance, routes, or session logic.
* Do not redesign the active Live Meeting workspace.
* Reuse `MeetingPreJoinPanel`.
* Reuse `FullScreenWorkspaceShell`.
* Reuse existing buttons, icons, typography, colors, spacing, borders, shadows, and radius tokens.
* Do not create a second pre-join component.
* Do not create another device-control system.
* Do not display a role selector.
* Do not duplicate device state in multiple places.
* Preserve Start, Join, Rejoin, Continue, and Resume behavior.

```
```
