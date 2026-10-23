Work directly inside the latest **NCC Bank Board Meeting Solution** React and TypeScript project.

Redesign only the Login page.

The current Login page is permanently styled as a dark, color-heavy screen. Change it so the active application theme controls the complete page:

* Light theme → light Login page
* Dark theme → dark Login page
* Other supported themes → use their existing tokens correctly

Move the NCC Bank logo and product name from the left visual panel to the right authentication panel, directly above `Welcome back`.

Do not change authentication logic, slider content, forgot-password behavior, help behavior, Redux state, routes, or existing theme selection.

# Existing project structure

Inspect and update:

* `src/app/pages/auth/LoginPage.tsx`
* `src/app/components/auth/LoginBrandPanel.tsx`
* `src/app/components/auth/LoginForm.tsx`
* `src/app/components/auth/LoginSlider.tsx`
* `src/app/components/auth/LoginSlide.tsx`
* The authoritative Login styles inside `src/styles/globals.css`

Reuse:

* `NCCBankBoardLogo`
* `AppTextField`
* `AppPasswordField`
* `AppCheckbox`
* The unified `Button` component
* Existing typography tokens
* Existing light and dark theme tokens
* Existing slider and authentication logic

`AppRoot` already calls `useAppearance()`. Do not create another Login-specific theme state or a second theme provider.

# 1. Preserve the desktop layout

Keep the current two-column desktop structure:

```text
Left visual panel — approximately 60%
Right authentication panel — approximately 40%
```

Keep:

* Existing feature slider
* Existing three slides
* Existing slide timing and transitions
* Existing responsive breakpoint
* Existing mobile single-column behavior

Do not place the form inside the left panel.

Do not reverse the column order.

# 2. Move the logo to the right panel

Remove the visible brand strip from the top of `LoginBrandPanel`.

The left panel should contain only:

* Product preview slider
* Slide heading
* Slide description
* Slider dots

Do not leave an empty space where the left logo was.

Update `LoginForm` so the existing brand lockup appears on both desktop and mobile.

Place it immediately above the heading block:

```text
NCC Bank logo

NCC Bank
Board Meeting Solution

Welcome back
Sign in to manage meetings, agendas, board packs, decisions, and follow-up actions.
```

Use the existing logo component and brand text. Do not recreate the logo as an image, SVG, or custom drawing.

Recommended spacing:

* Brand to heading: 28–32px
* Logo mark: 36–40px
* Gap between mark and wordmark: 12px
* `NCC Bank`: existing strong label/body typography
* `Board Meeting Solution`: existing secondary text typography

Keep the brand left-aligned with the form fields.

# 3. Make light mode the light application palette

Remove the current hardcoded dark Login-page foundation, including values such as:

* `#0E1120`
* `#111729`
* `#151B31`
* `#F7F8FC`
* Repeated `rgba(255,255,255,...)` text and border values

For light themes, use:

## Page and panels

* Root background: `var(--color-background)`
* Left visual panel: a restrained primary-tinted background created from the active theme
* Right authentication panel: `var(--color-surface)`
* Column divider: `var(--color-border)`

Recommended light left-panel background:

```css
background:
  linear-gradient(
    145deg,
    color-mix(in srgb, var(--color-primary) 7%, var(--color-background)),
    color-mix(in srgb, var(--color-primary) 3%, var(--color-surface))
  );
```

Do not use a saturated primary-color wash.

Do not make the left panel dark in light mode.

## Text

Use:

* Main headings: `var(--color-text-primary)`
* Supporting text: `var(--color-text-secondary)`
* Muted labels: `var(--color-text-muted)`
* Links: `var(--color-primary)`

The slide heading and description must also use light-theme text colors when the selected theme is light.

## Decorative effects

In light mode:

* Keep the background pattern very subtle
* Use the primary color at low opacity
* Use soft theme-aware borders
* Remove white dot-grid and white-glow assumptions
* Avoid heavy shadows

# 4. Make the slider preview theme-aware

The product preview inside `LoginSlide.tsx` currently uses a hardcoded dark interface.

Convert the preview shell and its inner elements to semantic tokens.

Use:

* Preview frame: `var(--color-surface)`
* Raised preview areas: `var(--color-surface-raised)`
* Preview secondary areas: `var(--color-surface-secondary)`
* Preview border: `var(--color-border)`
* Preview heading text: `var(--color-text-primary)`
* Preview metadata: `var(--color-text-secondary)`
* Preview muted information: `var(--color-text-muted)`
* Preview tracks and dividers: existing border and divider tokens

Keep semantic colors for:

* Live
* Success
* Warning
* Error
* Primary status

Do not use hardcoded white text or dark navy backgrounds.

The mock preview should look like a light version of the Board Meeting dashboard in light mode and automatically become dark in dark mode.

Preserve:

* Browser-frame composition
* Sidebar preview
* Meeting rows
* Agenda preview
* Participant tiles
* Progress values
* Slide content

Do not redesign the slider’s subject matter.

# 5. Dark-mode behavior

When the active theme is Dark Mode, use the existing master dark palette already applied through `useAppearance()`.

The Login page must automatically use:

* `var(--color-background)`
* `var(--color-surface)`
* `var(--color-surface-secondary)`
* `var(--color-surface-raised)`
* `var(--color-border)`
* `var(--color-text-primary)`
* `var(--color-text-secondary)`
* `var(--color-text-muted)`
* `var(--color-primary)`

Do not create a second `.dark-login` theme.

Do not add scattered dark-mode checks inside JSX.

Do not hardcode a separate set of dark colors inside Login components.

Use the active CSS variables as the single source of truth.

The user’s selected appearance must persist on the Login page through the existing Redux appearance system.

Do not add a new theme switcher to the Login page.

# 6. Improve the right authentication panel

Keep the form clean and vertically centered.

Use:

* Width: approximately 80% of the right panel
* Maximum width: 440–460px
* Comfortable top and bottom padding
* Clear spacing between brand, heading, fields, actions, and help text

Do not wrap the form inside an unnecessary large card.

The right panel itself should provide the surface.

Use this hierarchy:

```text
Brand lockup

Welcome back
Description

User ID or email
Password

Remember me                 Forgot password?

Sign in

Need help signing in? Contact support
```

Remove the decorative accent line above `Welcome back`. The relocated brand already provides enough visual identity.

Do not add extra headings, badges, or promotional content.

# 7. Use the unified button system

Replace the custom native Sign-in button and its local visual styling with the existing shared button system.

Use:

```tsx
<Button
  variant="primary"
  size="lg"
  fullWidth
  loading={isLoading}
  loadingText="Signing in…"
  onClick={handleSignIn}
>
  Sign in
</Button>
```

Preserve the existing sign-in handler and loading delay.

Use the shared button hierarchy for action-like text controls:

* Forgot password → tertiary small button
* Contact support → tertiary small button

Keep them visually lightweight.

Do not introduce another Login-specific button style.

Remove active styling from:

* `.lp-form__submit`
* `.lp-form__forgot`
* `.lp-form__hint-link`

Container classes may remain for layout only.

Do not add arrow icons to Sign in.

# 8. Fix field styling

Continue using:

* `AppTextField`
* `AppPasswordField`
* `AppCheckbox`

Remove the current `.lp-auth` MUI overrides that force:

* White labels
* White placeholders
* Dark input surfaces
* White icon colors
* Dark-only checkbox colors

Allow the existing reusable form components and theme variables to control:

* Input background
* Border
* Text
* Placeholder
* Label
* Password icon
* Hover
* Focus
* Error
* Disabled state

Do not create separate Login input styling unless it is strictly required for layout.

The Login inputs must match forms elsewhere in the application.

# 9. Slider controls

Keep the current slider-dot behavior.

Update their colors to use theme tokens:

* Active dot: `var(--color-primary)`
* Inactive dot: theme-aware muted border or text color
* Hover: existing primary-hover token
* Focus: existing focus-ring token

Do not use permanent white dots.

Do not add arrows or slide counters.

Preserve keyboard accessibility and `aria-current`.

# 10. Responsive behavior

## Desktop

* Keep the two-column layout
* Logo appears only in the right form area
* Slider uses the left area efficiently
* Form remains vertically centered
* No unnecessary vertical scrolling

## Tablet and mobile

Hide the visual slider as the project currently does.

Use:

* Full-width authentication panel
* `var(--color-background)` or `var(--color-surface)`
* Visible brand lockup above `Welcome back`
* Maximum readable form width
* 24–28px horizontal padding
* Full-width Sign-in button
* Safe vertical scrolling
* No horizontal overflow

Do not retain any dark fixed mobile background when the selected theme is light.

# 11. Accessibility

Verify:

* Labels remain associated with inputs
* Enter still submits
* Sign-in loading state is announced
* Focus states use the active theme
* Forgot-password and support actions remain keyboard accessible
* Slider dots remain accessible
* Light and dark modes meet contrast requirements
* Reduced-motion preference is respected
* No essential information relies only on color

# Acceptance criteria

The task is complete only when:

* The NCC Bank logo no longer appears in the left panel.
* The logo appears directly above `Welcome back` on the right.
* The brand appears correctly on desktop, tablet, and mobile.
* Light themes display a genuinely light Login page.
* Dark Mode displays the existing dark palette.
* Theme selection uses the existing appearance system.
* The left visual panel is light and softly tinted in light mode.
* The slider preview becomes light in light mode and dark in dark mode.
* Hardcoded dark Login colors are removed.
* Login text uses semantic theme tokens.
* Inputs match the application’s reusable form system.
* Sign in uses the unified Button component.
* Forgot password and Contact support follow the button hierarchy.
* Slider content and behavior remain unchanged.
* Authentication, forgot password, help, loading, and Enter-key behavior remain functional.
* No unrelated page changes.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not change authentication or Redux logic.
* Do not change routes or forgot-password behavior.
* Do not create another theme system.
* Do not add a Login-specific theme switcher.
* Reuse the existing appearance tokens.
* Reuse the unified Button system.
* Reuse the existing form components.
* Do not hardcode dark or light colors inside Login components.
* Do not display the logo twice on desktop.
* Preserve the slider, responsive behavior, and accessibility.
