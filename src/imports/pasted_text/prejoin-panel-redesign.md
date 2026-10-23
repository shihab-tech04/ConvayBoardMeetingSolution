````text
Work directly inside the latest NCC Bank Board Meeting Solution React and TypeScript project.

Redesign only the reusable full-screen meeting pre-join panel.

The current output is cleaner than before, but it still has too much empty space, disconnected join buttons, duplicated device feedback, small typography, and incorrect meeting-mode presentation.

Do not redesign the active Live Meeting workspace. Do not change meeting APIs, attendance, permissions, session persistence, routes, or join logic.

# Files to inspect and update

Primary files:

- `src/app/components/meetings/MeetingPreJoinPanel.tsx`
- `src/styles/live-meeting.css`

Update only when required:

- `src/app/pages/meetings/LiveMeetingWorkspace.tsx`
- `src/app/components/shared/FullScreenWorkspaceShell.tsx`
- `src/styles/index.css`

Reuse:

- `PrimaryButton`
- `SecondaryButton`
- `AppSelectField`
- Existing typography tokens
- Existing color and theme tokens
- Existing radius, border, shadow, spacing, and focus patterns

Do not create another pre-join component.

# Main design direction

Treat the screen as one focused pre-join workspace:

```text
Full-screen theme background

Compact header
├── Back to Meetings
└── Pre-join check

Centered workspace
├── Camera preview — 7 columns
└── Unified meeting entry card — 5 columns
````

The interface should feel calm, professional, spacious, and suitable for senior board members.

Use Google Meet only to understand the usability pattern:

* Large camera preview
* Clear device controls
* Simple meeting information
* One obvious join flow
* Minimal distraction

Do not copy Google Meet branding, exact layout, colors, wording, icons, buttons, or styling.

# 1. Fix the overall page composition

The current workspace is placed too high and leaves most of the lower screen empty.

Update `.meeting-prejoin__layout` so it:

* Uses the available viewport height below the header
* Vertically centers the main workspace
* Uses a maximum width around 1120–1180px
* Uses a responsive 7/5 grid
* Has balanced horizontal and vertical padding
* Fits within one normal desktop viewport
* Does not create unnecessary page scrolling

Recommended behavior:

```css
.meeting-prejoin__layout {
  flex: 1;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding: clamp(24px, 4vh, 48px) clamp(24px, 4vw, 48px);
  display: grid;
  grid-template-columns: minmax(0, 7fr) minmax(320px, 5fr);
  align-items: center;
  gap: 28px;
}
```

Do not hardcode the interface near the top of the page.

Do not make the content excessively large. Keep it balanced and readable.

# 2. Improve the header

Keep the header compact, but make it feel connected to the centered workspace.

Add an inner header container matching the main workspace width.

Structure:

```text
Back to Meetings                         Pre-join check
```

Use:

* Existing ghost or secondary button styling for Back to Meetings
* Normal sentence case: `Pre-join check`
* Existing label or body typography
* Clear but subtle bottom border

Do not use a tiny uppercase label pushed to the extreme right edge of the viewport.

Do not add the application sidebar, breadcrumbs, or top navigation.

# 3. Keep the camera preview visually strong

The camera preview should remain the main visual element.

Use:

* 16:9 ratio
* Existing large radius token
* Neutral dark video surface
* Subtle border
* Softer shadow than the current version
* Real video stream when available
* Existing camera-off avatar state

The preview may remain dark in light and dark themes because it represents video content.

Do not make the full page dark.

Remove any heavy glow, oversized shadow, or decorative animation.

# 4. Organize the camera-off state

When the camera is off, show:

* User avatar or profile icon
* `Camera is off`
* No additional unnecessary supporting copy

Use readable text contrast.

Keep the avatar centered.

Do not make the avatar or text too small.

# 5. Improve device controls

Keep microphone and camera controls inside the preview near the bottom center.

Use:

* Minimum 44px control size
* Existing icon style
* Neutral tonal state when on
* Error-tonal state when off
* Existing focus ring
* Clear accessible labels

Do not scale buttons on hover.

Use background, border, and icon changes instead.

Keep enough spacing between the controls and the permission warning.

# 6. Simplify camera permission feedback

Keep one compact camera warning inside the preview.

Use:

Heading:

`Camera unavailable`

Text:

`You can still join with your camera turned off.`

Style:

* Warning-tonal background
* Warning icon
* Subtle warning border
* Readable text
* No solid red error block

Position it above the device controls with enough breathing room.

Do not repeat the same camera warning elsewhere.

# 7. Remove the device-status pills below the preview

Remove the current separate pills:

* Mic On
* Camera Off
* Connection Ready

They make the interface feel fragmented and look like debug indicators.

Move device readiness into the unified meeting entry card.

Use a compact section:

```text
Device readiness

Microphone          On
Camera              Off
Connection          Ready
```

Use:

* Small icons
* Clear labels
* Compact status text or badges
* Existing success, neutral, and error colors

Do not repeat device status in multiple locations.

# 8. Create one unified right-side entry card

The current meeting-information card and join buttons are separate.

Combine all right-side content inside one cohesive surface:

```text
Ready to join

Meeting title
Meeting metadata

Your role

Device readiness

Join actions
```

The card must contain:

* Context or meeting-state label
* Meeting title
* Governance body
* Date
* Time
* Meeting mode
* Venue or virtual access information
* User role
* Device readiness
* Join buttons

Use one card with:

* `var(--color-surface)`
* `var(--color-border)`
* Existing large radius
* Existing card shadow
* 24–28px padding
* Consistent internal spacing

Make the right card stretch to visually balance the camera preview.

Use a flex-column layout and keep the join actions at the bottom.

Do not place buttons outside the card.

# 9. Improve information hierarchy

Use the project’s existing typography system.

Recommended hierarchy:

Context:

`Ready to join`

Meeting title:

Existing `typ-h3` or equivalent

Metadata:

Existing `typ-body-sm`

Section labels:

Existing `typ-label-sm`

Do not use tiny 10–11px text for important information.

Do not introduce new font sizes or font weights when an existing typography token is available.

Show only essential information:

* Meeting title
* Governance body
* Date
* Time
* Mode
* Venue
* Assigned role
* Device readiness

Do not add agenda, participants, Board Pack, voting, minutes, or action-item information.

# 10. Correct meeting mode and venue presentation

The current UI can show contradictory information such as:

`Physical · Hybrid`

Fix the underlying presentation logic.

Use one normalized meeting mode:

* `Virtual`
* `Hybrid`
* `In Person`

Show venue separately.

Example:

```text
Mode
Hybrid

Venue
Board Room A, Head Office
```

For virtual meetings:

```text
Mode
Virtual

Access
Secure virtual meeting
```

Do not concatenate mode and venue into one unclear line.

Do not display a venue value when it is actually another mode value such as `Hybrid`, `Virtual`, or `Physical`.

Create or reuse one small normalization helper rather than patching individual meeting records.

# 11. Improve role selection

Replace the custom raw `<select>` and custom caret styling with the existing reusable `AppSelectField` where compatible.

Use the same:

* Input height
* Border
* Radius
* Typography
* Focus state
* Dropdown behavior
* Disabled state

The role must come from the participant, invitation, or permission record.

If only one role is permitted:

* Show the role as read-only
* Add helper text: `Assigned for this meeting`

If multiple authorized roles are available:

* Allow selection only from those roles

Do not allow users to select unauthorized roles such as Chairperson or Administrator.

Do not keep the current global static role list as the authority.

# 12. Improve join actions

Keep both actions inside the unified entry card footer.

Primary action:

`Join Meeting`

Secondary action:

`Join with devices off`

Use the existing:

* `PrimaryButton`
* `SecondaryButton`
* Existing large button size
* Existing button typography
* Existing loading and disabled states

Do not add arrow icons.

The primary action must join using the current microphone and camera states.

The secondary action must join with both microphone and camera disabled.

When both devices are already off, avoid showing two actions that perform the same result. Keep only the relevant Join Meeting action or adjust the secondary action state appropriately.

Do not change the existing join handler, attendance creation, permission validation, or session persistence.

# 13. Theme behavior

## Light themes

Use existing tokens for:

* Page background
* Card surface
* Borders
* Main text
* Supporting text
* Primary button
* Focus states
* Status colors

The overall page must remain light.

The camera preview may remain neutral dark.

Do not use the selected primary color as the entire page background.

## Dark mode

Allow the existing theme tokens to switch:

* Page background
* Entry card
* Borders
* Text
* Inputs
* Buttons
* Readiness states

Do not create a separate hardcoded dark-mode component.

Do not place scattered theme checks inside JSX.

Keep all theme behavior inside existing CSS variables and scoped styles.

# 14. Responsive behavior

## Large desktop

* 7/5 layout
* Workspace vertically centered
* Camera preview and right card visually balanced
* No unnecessary vertical scrolling

## Tablet

* Use a balanced two-column layout while content remains readable
* Stack before the right panel becomes cramped
* Keep the primary action visible

## Mobile

Use this order:

1. Header and Back action
2. Meeting title and compact metadata
3. Camera preview
4. Device controls
5. Role
6. Device readiness
7. Join actions

Mobile rules:

* One-column layout
* 16px page padding
* Full-width card and buttons
* Minimum 44px controls
* Safe vertical scrolling
* No horizontal overflow
* Do not shrink desktop typography excessively

# 15. Accessibility

Verify:

* Keyboard access for camera and microphone controls
* Clear `aria-label` values
* Visible focus states
* Permission warning uses `role="alert"`
* Role field has a proper label
* Join loading state is announced
* Sufficient light- and dark-mode contrast
* Minimum touch targets
* Focus is restored after closing
* Reduced-motion preference is respected

# Acceptance criteria

The task is complete only when:

* The workspace uses the viewport more effectively.
* The main content is vertically balanced.
* The large lower empty area is removed.
* Camera preview remains visually dominant.
* Meeting information, role, readiness, and actions appear inside one card.
* Join buttons are no longer disconnected from the meeting card.
* Device-status pills below the preview are removed.
* Device readiness appears once inside the entry card.
* Meeting mode and venue are displayed correctly.
* `Physical · Hybrid` can no longer appear.
* Role selection respects actual meeting assignments.
* Existing typography, colors, button sizes, radii, and spacing are reused.
* Light mode uses the light application palette.
* Dark mode uses the existing dark palette.
* Camera, microphone, permission warning, Join Meeting, and Join with devices off remain functional.
* Start, Join, and Rejoin flows continue using this same reusable component.
* The active meeting workspace remains unchanged.
* Desktop, tablet, and mobile layouts work.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not redesign the active Live Meeting workspace.
* Do not change meeting APIs, routes, registries, attendance, permissions, or session logic.
* Reuse `MeetingPreJoinPanel`.
* Reuse `FullScreenWorkspaceShell`.
* Reuse existing buttons, form fields, typography, colors, borders, radii, and spacing.
* Do not create another pre-join component.
* Do not create another select, button, device-control, or theme system.
* Do not hardcode one fixed light or dark palette.
* Keep the video preview neutral dark without making the entire page dark.
* Preserve Start, Join, Rejoin, Continue, and Resume behavior.
* Test every existing theme and responsive breakpoint.

```
```
