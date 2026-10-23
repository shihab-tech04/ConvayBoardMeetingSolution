Work directly inside the latest **NCC Bank Board Meeting Solution** React and TypeScript project.

Create and implement one unified button system across the entire application.

The project currently uses multiple button components, native `<button>` elements, inline styles, feature-specific classes, inconsistent sizes, conflicting hierarchy, hardcoded colors, and different interaction patterns across dashboards, tables, drawers, modals, forms, mobile views, and the Live Meeting workspace.

Do not fix buttons page by page with more local CSS. Build one reusable design-system foundation, migrate active UI to it, and remove the active use of duplicate button systems.

Do not change existing business logic, handlers, APIs, routes, permissions, forms, meeting actions, table actions, drawer behavior, modal behavior, or responsive flows.

# Main objective

Every visible button must use one shared button foundation.

The system must control:

* Visual hierarchy
* Size
* Height
* Padding
* Radius
* Typography
* Icon size
* Theme colors
* Hover
* Focus
* Active
* Loading
* Disabled
* Destructive behavior
* Full-width behavior
* Icon-only accessibility
* Mobile touch targets

Do not allow feature files to redefine the appearance of buttons using inline styles or hardcoded colors.

# Phase 1 — Create the unified button foundation

Create or refactor:

```text
src/app/components/buttons/
├── Button.tsx
├── IconButton.tsx
├── ButtonGroup.tsx
└── index.ts
```

Replace the duplicated implementations of:

* `PrimaryButton`
* `SecondaryButton`
* `DangerButton`

with one reusable `Button` component.

Keep compatibility exports for existing imports during migration when necessary:

```ts
export const PrimaryButton = ...
export const SecondaryButton = ...
export const DangerButton = ...
```

These compatibility components must internally use the new `Button`. Do not keep separate visual implementations.

## Button API

Use an interface based on native button attributes:

```ts
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "tertiary"
  | "ghost"
  | "destructive"
  | "destructive-subtle";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  loading?: boolean;
  loadingText?: string;
  fullWidth?: boolean;
}
```

Support all native props, including:

* `type`
* `form`
* `name`
* `value`
* `style`
* `aria-*`
* `data-*`
* `title`
* `onClick`
* Keyboard events
* Form submission

Default to:

```ts
type="button"
```

Only submit actions should explicitly use:

```ts
type="submit"
```

## IconButton API

Create one reusable `IconButton`.

Required props:

```ts
interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  tooltip?: string;
}
```

Requirements:

* `label` is mandatory
* Use `aria-label`
* Use existing tooltip behavior when needed
* Use consistent icon sizes
* Do not allow unlabeled icon-only buttons

## ButtonGroup

Create a layout-only component for:

* Modal footers
* Drawer footers
* Form actions
* Page-header actions
* Inline action groups

It must manage:

* Alignment
* Gap
* Wrapping
* Left and right action groups
* Mobile stacking

It must not introduce another button visual style.

# Phase 2 — Define the button hierarchy

Use these rules consistently across the product.

## Primary

The single most important next action in the current context.

Examples:

* Create Meeting
* Save
* Submit for Approval
* Approve
* Publish
* Start Meeting
* Join Meeting
* Sign In

Use only one visually dominant primary button inside one immediate action area, such as:

* Modal footer
* Drawer footer
* Page header
* Hero card
* Form footer

## Secondary

A supporting action that should remain visible.

Examples:

* Edit
* Preview
* Save Draft
* Review Board Pack
* Back

## Tertiary

A low-priority text or subtle action.

Examples:

* View details
* View all
* Clear
* Reset
* Learn more

## Ghost

A low-emphasis control without a strong container.

Examples:

* Cancel
* Close
* Navigation controls
* Toolbar utilities

## Destructive

High-impact or irreversible action.

Examples:

* Delete
* End Meeting for Everyone
* Permanently Reject
* Cancel Meeting
* Remove Participant

Do not use a solid red button for every destructive action.

Use:

* `destructive-subtle` during normal workflows
* `destructive` inside the final confirmation step

Do not use status colors such as green, orange, or red as random general button variants.

# Phase 3 — Standardize sizes

Use these exact size rules:

```text
Small
Height: 32px
Horizontal padding: 12px
Icon: 14px
Use: dense tables, compact toolbars

Medium
Height: 40px
Horizontal padding: 16px
Icon: 16px
Use: default pages, drawers, modals, forms

Large
Height: 44px
Horizontal padding: 20px
Icon: 18px
Use: login, pre-join, mobile primary actions
```

Icon-only sizes:

```text
Small: 32×32px
Medium: 40×40px
Large: 44×44px
```

Fix the current broken medium size that uses:

* `height: auto`
* `padding: 16px`
* `width: 100%`

Width must never be controlled by size.

Use:

```tsx
fullWidth
```

only when the layout requires a full-width button.

Mobile touch targets must be at least 44px when the control is a primary touch interaction.

# Phase 4 — Standardize button styling

Update:

* `src/styles/buttons.css`

Use existing theme tokens only.

Control through CSS variables:

* Background
* Text
* Border
* Hover surface
* Active surface
* Focus ring
* Disabled surface
* Disabled text
* Destructive colors
* Dark mode
* Theme switching

Do not hardcode button colors inside feature files.

Do not use inline colors such as:

* `#22c55e`
* `#ef4444`
* `#334155`
* `#14532d`
* `#7f1d1d`

Do not add transform-based hover effects such as:

```css
transform: translateY(...)
transform: scale(...)
```

Use restrained background, border, and state-layer changes.

Use one focus treatment across all variants.

Use one disabled treatment that preserves readability.

Do not rely only on opacity.

# Phase 5 — Loading and disabled states

## Loading

When `loading` is true:

* Disable interaction
* Show a size-aware spinner
* Preserve button width
* Add `aria-busy="true"`
* Use `loadingText` when provided
* Announce loading state to assistive technology

## Disabled

Disabled buttons must:

* Remain readable
* Use theme-aware disabled surface and text
* Show `cursor: not-allowed`
* Block pointer and keyboard execution

For important disabled actions such as:

* Join Meeting
* Vote
* Submit
* Approve

show a tooltip or nearby helper message explaining why the action is disabled.

# Phase 6 — Unify button placement patterns

## Page headers

Use:

```text
Left: page heading and description
Right: utilities, then one primary Add/Create action
```

Utilities:

* Secondary
* Tertiary
* Ghost
* IconButton

## Modal footers

Use:

```text
Left: destructive action only when required

Right:
Cancel / Back
Secondary action
Primary action
```

Do not place all actions with equal emphasis.

## Details-drawer footers

Use:

```text
Left:
More Actions or destructive action

Right:
Close
Secondary action
Primary action
```

Move lower-priority actions into the existing More Actions menu.

Do not create drawer-specific button styling.

## Table toolbars

Use:

* Search
* Filters
* Secondary or ghost utilities
* One primary Add/Create button

The toolbar controls layout only.

Do not redefine button appearance through toolbar CSS.

## Table rows

Keep:

* One visible contextual action maximum, or
* One More Actions icon

The complete row may open details.

Keep all other actions inside the details drawer.

## Dashboard lists

Use full-row click for:

* View
* Review
* Update
* Open details

Show a visible button only for immediate actions such as:

* Start
* Join
* Rejoin
* Resume
* Approve

Do not add generic View buttons to every dashboard row.

## Mobile cards

* Card tap opens details
* Keep only one immediate action when required
* Do not recreate multiple desktop buttons inside mobile cards

# Phase 7 — Migrate modal, drawer, form, and toolbar buttons

Replace the active use of:

* `.record-drawer__action-btn`
* `.action-btn`
* `.mobile-modal-btn`
* `.filter-btn-reset`
* `.filter-btn-apply`
* `.table-card__toolbar-btn`
* `.card-table__action-btn`
* `.mobile-table-card__action-btn`
* `.user-action-btn`
* `.btn-app-primary`
* `.btn-app-secondary`

with the new components.

Update:

* Drawer footers
* Modal footers
* Stepper forms
* Filter overlays
* Table toolbars
* User Management
* Role Management
* Permission Management
* Create and edit forms
* Confirmation modals

Container CSS should manage:

* Alignment
* Spacing
* Wrapping
* Responsive layout

Container CSS must not redefine:

* Button background
* Button border
* Button text color
* Button height
* Button radius
* Button typography

# Phase 8 — Migrate dashboard buttons

Update:

* `src/app/pages/dashboard/DashboardPage.tsx`

Replace locally styled and inline-styled buttons.

Use the shared system for:

* Hero actions
* View details
* View all
* Start
* Join
* Rejoin
* Resume
* Dashboard task actions
* Agenda links
* Recent-update actions where applicable

Rules:

* Preserve the current hero layout and logic
* Use `Button` for visible actions
* Use tertiary or ghost treatment for `View details`
* Use a text-link or tertiary button for `View all`
* Do not add arrow icons automatically
* Do not change the meeting-action resolver

# Phase 9 — Migrate generated tables

Update:

* `src/app/components/pages/GeneratedTablePage.tsx`

Replace:

* Raw toolbar buttons
* Inline colors
* Unsupported button props
* Static action-button styling

Use:

* `Button`
* `IconButton`
* `ButtonGroup`

Preserve:

* Existing action handlers
* Drawer opening
* Create flow
* Edit flow
* Filters
* Search
* Pagination
* Permissions
* Mobile-card behavior

Keep one visible row action.

# Phase 10 — Refactor the Live Meeting button system

Update:

* `src/app/pages/meetings/LiveMeetingWorkspace.tsx`

Do not redesign the Live Meeting UI.

Create reusable feature-level wrappers built on the shared Button primitive:

```text
src/app/components/meetings/
├── MeetingControlButton.tsx
├── MeetingCommandButton.tsx
└── VoteChoiceButton.tsx
```

These components may provide specialized layout and semantic behavior, but must use the shared `Button` or `IconButton`.

## MeetingControlButton

Use for:

* Microphone
* Camera
* Raise Hand
* Reactions
* More
* Leave

## MeetingCommandButton

Use for:

* Start Meeting
* Pause
* Resume
* Start Break
* Adjourn
* End Meeting
* Present
* Complete Agenda Item
* Open Vote
* Close Vote

## VoteChoiceButton

Use for:

* For
* Against
* Abstain

Remove active inline styles from Live Meeting buttons.

Use theme variables and centralized meeting-specific semantic tokens.

Do not change:

* Meeting status transitions
* Voting behavior
* Agenda behavior
* Attendance
* Quorum
* Permissions
* Session persistence
* Existing handlers

# Phase 11 — Remove active legacy styles

After migration, remove or stop using duplicate visual classes such as:

* `.btn-app-*`
* `.action-btn`
* `.record-drawer__action-btn`
* `.mobile-modal-btn`
* `.user-action-btn`
* `.filter-btn-*`
* Feature-specific toolbar-button visuals
* Feature-specific table-action visuals

Do not remove a class until every active use has been migrated.

Feature classes may remain for layout only.

Example:

Allowed:

```css
.modal-footer__actions {
  display: flex;
  gap: 12px;
}
```

Not allowed:

```css
.modal-footer__button {
  height: 42px;
  background: blue;
  border-radius: 8px;
}
```

# Phase 12 — Audit native buttons

Inspect every active `<button>`.

Migrate action buttons to:

* `Button`
* `IconButton`
* Approved meeting-specific wrappers

Native buttons may remain only where required by a third-party or low-level semantic component, and they must still use the shared button classes and explicit `type`.

Fix all buttons that omit:

```tsx
type="button"
```

Do not allow accidental form submissions.

# Phase 13 — Add enforcement

Add automated checks or lint rules where possible.

Reject:

* New inline button styles
* New hardcoded button colors
* New feature-specific button visual classes
* Icon-only buttons without accessible labels
* Native action buttons outside approved primitives

Add component tests for:

* Every variant
* Every size
* Loading
* Disabled
* Full width
* Leading icon
* Trailing icon
* IconButton accessibility
* Form submission
* Dark mode
* Theme switching
* Keyboard focus

# Acceptance criteria

The task is complete only when:

* One shared Button primitive controls the application’s buttons.
* PrimaryButton, SecondaryButton, and DangerButton use the shared primitive.
* One reusable IconButton exists.
* Button sizes are consistent.
* Medium buttons no longer become full-width automatically.
* Buttons support native HTML attributes.
* Icon-only buttons require accessible labels.
* Loading and disabled states are consistent.
* Modal footers use the shared system.
* Drawer footers use the shared system.
* Table toolbars use the shared system.
* Dashboard buttons use the shared system.
* Generated tables use the shared system.
* Live Meeting controls use wrappers built from the shared system.
* Hardcoded Live Meeting button colors are removed.
* Inline button styling is removed from active UI.
* Row actions follow one-action-per-row rules.
* Mobile cards do not contain unnecessary action groups.
* Existing handlers, APIs, routes, permissions, forms, meeting logic, and responsive behavior remain unchanged.
* Every theme and Dark Mode display buttons correctly.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not change APIs, handlers, permissions, routes, or business logic.
* Do not redesign existing pages while migrating buttons.
* Do not create another independent button system.
* Reuse existing theme, typography, spacing, radius, border, and focus tokens.
* Do not use random status colors for buttons.
* Do not use inline styles for button appearance.
* Keep one dominant primary action per immediate action area.
* Keep one visible contextual action per table row.
* Require accessible labels for icon-only buttons.
* Preserve desktop, tablet, mobile, light mode, dark mode, and every existing theme.
