````text
Work directly inside the latest NCC Bank Board Meeting Solution React and TypeScript project.

Redesign only the full-screen meeting pre-join/start panel shown before a user enters a virtual meeting.

The current panel is functional, but it uses a heavy primary-colored background and does not follow the application’s light and dark theme surfaces closely enough.

Create a clean, focused, theme-aware pre-join experience inspired by the usability principles of modern meeting products, while keeping the design unique to the NCC Bank Board Meeting Solution.

Do not copy Google Meet branding, layout, wording, icons, or styling.

# Files identified in the current project

The current pre-join interface is implemented directly inside:

- `src/app/pages/meetings/LiveMeetingWorkspace.tsx`
  - `PreJoinScreen`
  - Camera preview
  - Microphone and camera controls
  - Permission-error message
  - Meeting information
  - Role selector
  - Join actions

The full-screen container is:

- `src/app/components/shared/FullScreenWorkspaceShell.tsx`

The route adapter is:

- `src/app/pages/meetings/LiveMeetingPage.tsx`

The existing design-system sources are:

- `src/styles/theme.css`
- `src/styles/tokens.css`
- `src/styles/typography.css`
- `src/styles/buttons.css`
- `src/app/data/themes.ts`
- `src/app/components/buttons/PrimaryButton.tsx`
- `src/app/components/buttons/SecondaryButton.tsx`

# Phase 1 — Refactor the pre-join UI into a reusable component

Extract `PreJoinScreen` from `LiveMeetingWorkspace.tsx`.

Create:

`src/app/components/meetings/MeetingPreJoinPanel.tsx`

The component should receive:

```ts
interface MeetingPreJoinPanelProps {
  meeting?: {
    id?: string;
    meeting_title?: string;
    committee?: string;
    meeting_date?: string;
    start_time?: string;
    mode?: string;
    venue?: string;
  };
  initialRole: MyRole;
  onJoin: (options: {
    micOn: boolean;
    camOn: boolean;
    role: MyRole;
  }) => void;
  onBack: () => void;
}
````

Move only the pre-join presentation and device-check logic into this reusable component.

Keep inside `LiveMeetingWorkspace.tsx`:

* Meeting-session logic
* Attendance
* Quorum
* Voting
* Agenda
* Decisions
* Resolutions
* Minutes
* Active meeting controls
* Join persistence
* Role permissions

Do not duplicate the pre-join logic.

Every Start, Join, Rejoin, Continue, and Resume flow that requires a pre-join check must use this same component.

# Phase 2 — Add scoped meeting styles

Create:

`src/styles/live-meeting.css`

Import it once from:

`src/styles/index.css`

Move the large inline pre-join style blocks out of `LiveMeetingWorkspace.tsx`.

Use scoped class names such as:

* `.meeting-prejoin`
* `.meeting-prejoin__header`
* `.meeting-prejoin__layout`
* `.meeting-prejoin__preview`
* `.meeting-prejoin__details`
* `.meeting-prejoin__device-controls`
* `.meeting-prejoin__actions`
* `.meeting-prejoin__alert`

Do not add pre-join styles to global card, button, form, or layout classes.

# Phase 3 — Use the correct theme behavior

## Light themes

For Indigo Blue, Government Blue, Slate Purple, Plum Executive, and Fresh Teal:

Use:

* Page background: `var(--color-background)`
* Main surfaces: `var(--color-surface)`
* Secondary surfaces: `var(--color-surface-hover)` or an existing secondary-surface token
* Borders: `var(--color-border)`
* Main text: `var(--color-text-primary)`
* Supporting text: `var(--color-text-secondary)`
* Primary actions and focus states: `var(--color-primary)`
* Status feedback: existing success, warning, and error tokens

Do not use `var(--color-primary-dark)` as the full-page background.

Do not cover the entire screen in the selected theme color.

Use the primary theme color only for:

* Primary button
* Focus ring
* Selected device control
* Small status accents
* Links
* Compact badges

## Dark mode

When the active theme is Dark Mode, automatically use:

* `var(--color-background)`
* `var(--color-surface)`
* `var(--color-border)`
* `var(--color-text-primary)`
* `var(--color-text-secondary)`
* Dark-mode primary, success, warning, and error tokens

Do not create a separate hardcoded dark design.

Do not use a light-mode-only white background.

The component must switch correctly through the existing theme system without manual theme checks scattered across the JSX.

# Phase 4 — New desktop composition

Use a centered pre-join workspace with a maximum width around 1120–1180px.

Use a responsive 12-column layout:

* Camera preview: 7 columns
* Meeting and join panel: 5 columns

The full page should feel open and calm, not like one dark modal floating inside a colored page.

Recommended structure:

```text
Full-screen theme background

Compact top bar
├── Back to Meetings
└── Pre-join Check

Main workspace
├── Camera preview
│   ├── Video or avatar
│   ├── Permission message
│   └── Microphone and camera controls
└── Meeting entry panel
    ├── Meeting title and status
    ├── Committee
    ├── Date and time
    ├── Mode and venue
    ├── User role
    ├── Device readiness
    └── Join actions
```

Use generous white space and balanced alignment.

Do not vertically center a very small interface inside a huge empty screen.

The main workspace should occupy a meaningful portion of the viewport while still fitting inside one desktop screen.

# Phase 5 — Camera-preview design

Keep the camera area as the strongest visual element.

Use a 16:9 preview with:

* Existing large radius token
* Neutral dark preview surface
* Subtle border
* Soft shadow using existing tokens
* Real camera stream when available
* Existing avatar state when the camera is off

The camera preview may remain dark in both themes because it represents video content.

Do not make the entire page dark just because the preview is dark.

## Camera-off state

Show:

* Existing user/avatar icon
* `Camera is off`
* Short supporting text only when useful

Do not use glowing animated rings around the avatar.

Remove the current heavy glow animation.

## Device controls

Place microphone and camera buttons in a compact floating control group near the bottom center of the preview.

Use the existing icon-button conventions.

States:

* Device on: neutral tonal control
* Device off: error-tonal control
* Hover: existing state-layer behavior
* Focus: existing primary focus ring

Use at least a 44px tap target.

Do not enlarge controls on hover with `transform: scale()`.

Use subtle background and border changes instead.

# Phase 6 — Permission and device feedback

Replace the current strong full-width warning treatment with a compact inline alert.

Example:

Heading:

`Camera unavailable`

Text:

`You can still join with your camera turned off.`

Use:

* Warning-tonal background
* Warning icon
* Warning-colored border
* Readable text
* No bright solid red block

Show compact device readiness below the preview or inside the entry panel:

* Microphone On or Muted
* Camera On or Off
* Connection Ready

Do not repeat the same state in several places.

Do not show both large status pills and another duplicate device-status panel.

# Phase 7 — Meeting information panel

Use one light or dark theme-aware surface.

Do not use a transparent primary-colored card.

The panel should contain:

## Context

Small label:

`Ready to join`

Optional status badge:

* Meeting Live
* Starting Soon
* On Break
* Paused

## Main information

* Meeting title
* Governance body
* Friendly date
* Time
* Mode
* Venue or meeting-room information

Use friendly formatting:

* `Tuesday, 21 July 2026`
* `9:00 AM`
* `Hybrid`
* `Board Room A, Head Office`

Do not show raw ISO dates or 24-hour timestamps when the rest of the product uses friendly display values.

Use the existing typography scale:

* Meeting title: existing `typ-h3` or equivalent
* Metadata: `typ-body-sm`
* Labels: `typ-label-sm`
* Buttons: existing button typography

Do not introduce a new font or custom text scale.

# Phase 8 — Role selection

Preserve the existing role-selection behavior.

Replace the raw custom-styled `<select>` with the existing reusable select component where compatible:

* `AppSelectField`, or
* `SSelect`

Use the same input:

* Height
* Border
* Radius
* Typography
* Focus state
* Disabled state
* Dropdown behavior

Do not create another select style.

Default to the role already resolved from the participant or invitation record.

Do not allow users to select unauthorized roles.

When the role is fixed by the meeting assignment, display it as read-only rather than showing a misleading editable select.

# Phase 9 — Join actions

Reuse:

* `PrimaryButton`
* `SecondaryButton`

Do not create custom button styles.

Primary action:

`Join Meeting`

Alternative action:

`Join without camera or microphone`

Use the existing button sizes and typography.

Recommended desktop arrangement:

* Primary Join button with clear emphasis
* Alternative action below it as a secondary or tonal action

Do not add an arrow icon to Join Meeting.

Do not create oversized Google-style pill buttons.

Do not change the existing join handler, attendance creation, permission checks, or meeting-session logic.

Show loading and disabled states when joining.

# Phase 10 — Unique product details

Make the design belong to the Board Meeting Solution rather than a generic video-meeting application.

Use restrained board-meeting context such as:

* Governance body
* Meeting type
* User’s assigned meeting role
* Confidentiality badge when relevant
* Quorum-readiness note when the user is allowed to see it

Keep this information compact.

Do not add:

* Agenda table
* Participants table
* Board Pack list
* Voting controls
* Meeting-management actions

Those belong inside the active meeting workspace after joining.

# Phase 11 — Top navigation

Keep a compact `Back to Meetings` control above the main workspace.

Style it using the existing ghost or secondary button system.

Do not use a small low-contrast pill floating on the background.

Add a concise page context such as:

`Pre-join Check`

Do not show the application sidebar, top bar, or breadcrumbs because the pre-join workspace already uses the full-screen shell.

# Phase 12 — Responsive behavior

## Large desktop

* 7/5 preview and information layout
* Maximum width around 1120–1180px
* Preview remains 16:9
* No vertical page scrolling at common desktop heights

## Tablet

* Use approximately 6/6 or stack when required
* Preserve readable meeting details
* Keep join actions visible without scrolling where possible

## Mobile

Stack in this order:

1. Back control
2. Meeting title and compact metadata
3. Camera preview
4. Device controls
5. Role
6. Join actions

Mobile rules:

* Full-width surfaces
* 16px page padding
* Minimum 44px controls
* Join button full width
* No horizontal overflow
* Allow safe vertical scrolling on short screens
* Do not compress the desktop two-column layout

# Phase 13 — Accessibility

Verify:

* Keyboard access for microphone and camera controls
* Clear `aria-label` values
* Visible focus state
* Role selector label
* Permission alert announcement
* Join loading announcement
* Sufficient contrast in light and dark themes
* Minimum touch targets
* Focus restoration when closing
* Reduced-motion support

Remove or disable nonessential glowing and scaling animations when reduced motion is requested.

# Exact implementation rules

Update:

* `src/app/pages/meetings/LiveMeetingWorkspace.tsx`
* `src/app/components/shared/FullScreenWorkspaceShell.tsx` only if a reusable theme-aware workspace class or `100dvh` support is needed
* `src/styles/index.css`

Create:

* `src/app/components/meetings/MeetingPreJoinPanel.tsx`
* `src/styles/live-meeting.css`

Do not redesign or rewrite:

* Active meeting workspace
* Participant tiles
* Agenda panel
* Voting
* Motions
* Decisions
* Resolutions
* Minutes
* Meeting dock
* Attendance and quorum logic
* Full-screen portal architecture
* Live Meeting route behavior

# Acceptance criteria

The task is complete only when:

* Light themes show a light theme-aware pre-join page.
* Dark Mode shows the proper dark theme palette.
* The full page is no longer covered by a heavy primary color.
* The camera preview remains visually strong.
* Meeting information is easy to scan.
* The layout follows the project’s existing typography, colors, spacing, borders, and buttons.
* The design is unique and does not copy Google Meet.
* The role selector uses an existing form component.
* Camera and microphone controls remain functional.
* Camera-denied behavior remains functional.
* Join Meeting remains functional.
* Join without camera or microphone remains functional.
* Start, Join, and Rejoin flows use the same reusable pre-join component.
* Desktop, tablet, mobile, light themes, and Dark Mode work correctly.
* No unrelated page is changed.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not change meeting APIs, registries, permissions, attendance, or session logic.
* Do not rebuild the active Live Meeting workspace.
* Reuse the existing FullScreenWorkspaceShell.
* Reuse existing buttons, inputs, typography, radii, colors, and theme tokens.
* Do not hardcode one light or dark palette.
* Do not use the primary-dark color as the entire page background.
* Do not create duplicate device, role, button, or meeting-workspace components.
* Keep Start, Join, Rejoin, Continue, and Resume behavior intact.
* Preserve desktop, tablet, mobile, and every existing theme.

```
```
