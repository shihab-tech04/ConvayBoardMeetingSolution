````text
Work directly inside the latest existing React and TypeScript project, **NCC Bank Board Meeting Solution**.

Refine only the Login page shown in the supplied screenshot.

The current layout direction is correct, but the color system, proportions, preview scale, typography, and visual hierarchy are not finished. Make the page feel calm, polished, premium, and appropriate for a secure banking and board-governance product.

Do not redesign any other page.

# Files and components to inspect

Reuse and refine the existing:

- `src/app/pages/auth/LoginPage.tsx`
- `src/app/components/auth/LoginBrandPanel.tsx`
- `src/app/components/auth/LoginSlider.tsx`
- `src/app/components/auth/LoginSlide.tsx`
- `src/app/components/auth/LoginForm.tsx`
- `src/app/components/navigation/NCCBankBoardLogo.tsx`
- Login styles inside `src/styles/globals.css`
- Existing form fields
- Existing authentication behavior
- Existing theme tokens

Do not create another login page, slider, form system, or preview component.

# Current problems to fix

The current implementation has these specific issues:

- The left background is too saturated and purple.
- The right panel is too close to black and feels visually disconnected.
- The selected theme color is being mixed too heavily into large surfaces.
- The Sign in button appears washed-out and lavender because white is mixed into its gradient.
- Text contrast is too low in several places.
- The product preview is too large vertically.
- The preview contains too much empty dark space.
- Slider heading and supporting text are too small compared with the preview.
- The caption and slide indicators feel detached.
- The overall page feels functional but not premium.
- Preview components still use hardcoded blue and indigo colors instead of the project theme.
- `globals.css` contains duplicate and legacy definitions for selectors such as:
  - `.slide-frame`
  - `.slide-frame__content`
  - `.login-slide`
  - `.login-slide__preview`
  - Other old login and slider selectors
- These duplicate rules can override the latest login design unpredictably.

Fix the root causes rather than adding another CSS override at the end of the file.

# 1. Consolidate the login CSS

Create one authoritative Login-page CSS section.

Remove, archive, or safely rename duplicate legacy login selectors that are no longer used.

There must be only one active definition for:

- `lp-root`
- `lp-visual`
- `lp-auth`
- `lp-slider`
- `lp-slider__stage`
- `lp-slider__caption`
- `login-slide`
- `login-slide__preview`
- `slide-frame`
- `slide-frame__chrome`
- `slide-frame__body`
- `slide-frame__sidebar`
- `slide-frame__content`
- Login-form selectors

Do not leave conflicting old `.login-slider` and `.slide-frame` blocks active later in `globals.css`.

Do not break `ForgotPasswordModal`.

# 2. Use a refined theme-based color palette

The Login page must use the existing theme colors, but the primary color should act as an accent rather than covering the entire page at high intensity.

Create local semantic Login variables derived from the existing tokens.

Use a palette direction similar to:

```text
Left workspace:
Muted indigo-navy with a small amount of the active primary color

Right authentication panel:
Deep neutral navy, slightly darker than the left panel

Preview frame:
Dark elevated navy surface

Inputs:
Subtle elevated dark surface

Primary action:
Solid active theme primary color

Main text:
Soft off-white

Secondary text:
Readable cool gray

Borders:
Low-contrast neutral white alpha

Warm accent:
Use the existing warm NCC accent only in very small details
````

For the default Indigo Blue theme, the visual result should feel close to:

```text
Left base: #151B31 to #1B2340
Right base: #0C0F1B to #101321
Preview: #10192C
Input surface: #171B2B
Primary accent: existing --color-primary
Warm accent: existing --accent
Main text: #F7F8FC
Secondary text: rgba(247, 248, 252, 0.68)
Muted text: rgba(247, 248, 252, 0.46)
Border: rgba(255, 255, 255, 0.11)
```

These are visual targets, not a new hardcoded global theme. Derive the final values from existing project variables where possible.

## Left panel

Replace the current highly saturated gradient:

```text
primary mixed at approximately 68%
```

with a restrained dark navy treatment using approximately 12–24% of the active primary color.

Use either:

* A nearly flat muted background, or
* A very subtle two-stop gradient with closely related tones

Keep no more than one restrained radial glow.

Reduce the dot-grid opacity significantly or remove it.

If retained:

* Opacity must be extremely subtle
* It must not compete with the preview
* It should disappear naturally at normal viewing distance

## Right panel

Make the right panel a deep neutral navy rather than pure black.

The left and right areas should feel related, but still clearly separated.

Add a subtle divider between them using a low-opacity border or shadow.

Do not create a visible bright vertical line.

## Primary button

Remove the washed-out lavender gradient.

Use:

* Solid `var(--color-primary)`
* `var(--color-primary-dark)` on hover
* `var(--color-text-on-primary)` for text
* A restrained primary-colored shadow
* A very subtle top inner highlight only if needed

Do not mix large amounts of white into the primary button background.

The button should feel confident and solid.

## Semantic preview colors

Refactor the preview UI so it uses:

* `var(--color-primary)`
* `var(--color-success)`
* `var(--color-warning)`
* `var(--color-error)`
* Theme-derived neutral colors

Remove hardcoded interface accents such as:

* `#3b82f6`
* `#6366f1`
* Hardcoded indigo navigation states

Do not remove legitimate semantic green, amber, and red meaning. Connect them to the existing semantic tokens.

If `StatusPill` currently builds alpha colors by concatenating hex strings, refactor it to use tone classes or `color-mix()` so CSS variables work correctly.

# 3. Rebalance the desktop split

Use:

```text
Large desktop: 58% visual / 42% authentication
Medium desktop: 55% visual / 45% authentication
```

This gives the form enough room while keeping the product preview prominent.

The page must:

* Fill `100dvh`
* Have a `100vh` fallback
* Have no desktop body scrolling
* Have no outer page margin
* Keep both panels aligned from top to bottom

Do not return to a centered white card layout.

# 4. Make the product preview smaller

Reduce the size of the dark product-preview frame by approximately 10–15%.

Target desktop behavior:

* Width: approximately 76–80% of the left panel
* Maximum width: approximately 720–780px
* Maximum height: approximately 50–56dvh
* Use a stable landscape aspect ratio
* Center it horizontally
* Keep enough breathing room around it
* Never let it dominate the full height

The frame should appear refined and intentional, not stretched.

On shorter desktop screens:

* Reduce the preview height further
* Preserve the caption
* Keep the complete layout within one viewport

# 5. Improve the preview itself

The preview frame is becoming smaller, so make its internal content clearer.

Improve:

* Text size inside meeting rows
* Status-badge readability
* Row height
* Sidebar icon proportions
* Browser-chrome proportions
* Spacing between preview sections
* Progress-bar labels
* Agenda-item readability

Reduce unused dark space inside each preview.

The preview should fill its frame with meaningful Board Meeting content while still looking clean.

Do not overload it with additional rows.

Use the same three existing preview concepts:

* Prepare meetings
* Run meetings
* Track decisions

# 6. Make slider copy larger and stronger

Increase the slider text hierarchy.

Use approximately:

```text
Headline:
34–40px on large desktop
30–34px on medium desktop
Font weight 700
Tighter letter spacing
Line height 1.15–1.25

Supporting text:
17–19px on large desktop
16–17px on medium desktop
Line height 1.5–1.6
Higher contrast than the current implementation
Maximum width around 680px
```

Keep the approved copy:

## Slide 1

`Prepare meetings with confidence`

`Create agendas, invite participants, and publish secure board packs from one workspace.`

## Slide 2

`Run focused board meetings`

`Manage attendance, quorum, documents, voting, and decisions during the meeting.`

## Slide 3

`Track every decision`

`Turn resolutions into accountable actions and monitor progress after the meeting.`

The heading should become one of the strongest elements on the page.

Do not make it larger than the Welcome back heading by an extreme amount.

# 7. Improve caption and slider-control placement

Place the caption directly below the preview with a clear relationship to it.

Recommended structure:

```text
Product preview
28–36px gap
Slide heading
8–12px gap
Slide description
Slide indicators aligned with the caption area
```

The indicators may sit:

* At the bottom-right of the caption row, or
* Directly below the supporting text

They must not appear lost in empty space.

Use:

* One active elongated indicator
* Two subtle inactive indicators
* Clear focus states
* Smooth transitions

Preserve autoplay and pause behavior.

Do not add large arrows or unnecessary carousel controls.

# 8. Refine the left branding

Keep the compact NCC Bank brand in the upper-left of the visual panel.

Improve:

* Logo clarity
* Alignment
* Gap between mark and text
* Product subtitle contrast

Keep it visually quiet.

It must not compete with the slide heading.

Use the existing mark and normal HTML text so nothing becomes truncated.

# 9. Make the authentication panel more premium

Keep the form unboxed and integrated into the dark right panel.

Do not add a white card.

Use a maximum form width around 420–460px.

Improve:

* Vertical centering
* Heading hierarchy
* Text contrast
* Field spacing
* Option-row alignment
* Link visibility
* Support-message spacing

## Heading

Use approximately:

* 38–44px on large desktop
* Font weight 700
* Main text color close to off-white

Keep:

`Welcome back`

## Supporting text

Increase the current low contrast.

Use approximately 15–16px with readable secondary text color.

Keep:

`Sign in to manage meetings, agendas, board packs, decisions, and follow-up actions.`

## Accent line

The small line above Welcome back may remain, but make it more refined:

* Width 32–40px
* Height 2px
* Theme-primary color
* No glow
* Adequate spacing below it

# 10. Refine the inputs

Continue using:

* `AppTextField`
* `AppPasswordField`
* `AppCheckbox`

Do not replace them.

Improve the dark Login-page overrides:

* Field height: approximately 50–52px
* Surface: slightly lighter than the right-panel background
* Border: visible but restrained
* Hover border: clearer neutral border
* Focus border: theme primary
* Focus ring: subtle theme-primary alpha
* Main input text: off-white
* Placeholder: readable muted gray
* Password icon: clearer contrast
* Labels: visible above fields

Do not make the input surfaces transparent.

Do not use extremely low-opacity placeholder text.

# 11. Refine secondary controls

Improve:

* Remember me
* Forgot password?
* Contact support

Use readable contrast.

The Forgot password link may use a lightly brightened version of the theme primary color.

Do not use near-gray links that look disabled.

Keep hover, focus, and active states.

The support text should remain secondary but legible.

# 12. Premium visual details

Use premium details sparingly:

* One soft shadow around the preview
* One restrained ambient glow
* Subtle panel divider
* Consistent border radii
* Clean typography
* Smooth 500–600ms slide crossfade
* Slight 4–6px slide movement during transition
* No excessive glassmorphism
* No heavy gradients
* No large glow around the button
* No bright decorative shapes
* No visual noise

The page should feel suitable for executives, directors, and a banking environment.

# 13. Responsive behavior

## Large desktop

At 1440px and above:

* Use 58/42
* Preview remains smaller than the current version
* Slider heading is large
* Form remains vertically centered
* No scrolling

## Medium desktop

From 1024px to 1439px:

* Use 55/45
* Preview max height around 48–52dvh
* Headline scales down safely
* Form remains fully visible
* No scrolling at common heights such as 768px

## Tablet and mobile

Below the existing desktop breakpoint:

* Hide the left visual panel
* Use the dark authentication panel at full width
* Show compact brand above the form
* Use a single-column layout
* Allow safe scrolling only on short mobile screens
* Make Sign in full width
* Preserve Forgot Password, Remember Me, loading, Enter submission, and accessibility

# 14. Required viewport testing

Verify the final layout at:

* 1366 × 768
* 1440 × 900
* 1680 × 900
* 1920 × 1080
* 1024 × 768
* Tablet portrait
* Common mobile widths

At normal desktop sizes:

* No page scrollbar
* No clipped caption
* No clipped form
* No preview overflow
* No branding collision

# Acceptance criteria

The work is complete only when:

* The left panel no longer looks overly purple.
* The right panel is deep navy rather than pure black.
* Both panels feel like one coherent palette.
* The active theme controls accents without recoloring the entire page too aggressively.
* The Sign in button uses a strong solid primary color.
* The product preview is visibly smaller than the current version.
* The preview contains less empty space.
* The slider headline and description are visibly larger.
* The caption and indicators feel connected to the preview.
* Text contrast is improved.
* Input fields are clear and premium.
* No duplicate active Login CSS causes cascade conflicts.
* Hardcoded blue and indigo preview accents are replaced with semantic theme tokens.
* The design remains inside one desktop viewport.
* The existing slider, authentication, Forgot Password, Remember Me, Enter submission, loading, and responsive behavior still work.
* No unrelated project page changes.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Work only on the Login experience.
* Do not change authentication logic or API contracts.
* Do not change unrelated files or pages.
* Reuse the existing Login components.
* Do not introduce a second slider.
* Do not introduce another form or UI library.
* Use the existing project theme and semantic tokens.
* Do not hardcode one fixed blue or purple palette.
* Do not use the primary color as a large high-saturation background.
* Do not add a floating white login card.
* Do not duplicate the NCC Bank brand.
* Do not use Bangla or old NBR artwork.
* Do not remove existing accessibility behavior.
* Consolidate duplicate CSS rather than adding another override.
* Keep desktop, tablet, mobile, light-mode, dark-mode, and accent-theme behavior working.

```
```
