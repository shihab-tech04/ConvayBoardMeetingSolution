# Navigation Restructure — Core Phase 1 System

Restructure only the navigation of the current Board Meeting Solution project.

The User Management correction is being implemented separately. Do not modify user forms, registries, lifecycle logic, permissions, tables, drawers, or business functions in this task.

## Inspect and update

* `src/app/data/navigation.ts`
* `src/app/routes.tsx`
* `src/app/hooks/useNavigation.ts`
* `src/app/hooks/useRouteNav.ts`
* `src/app/hooks/useBreadcrumbs.ts`
* `src/app/components/navigation/PrimarySidebar.tsx`
* `src/app/components/navigation/SecondarySidebar.tsx`
* `src/app/components/navigation/MobileNavigationDrawer.tsx`
* Dashboard shortcuts
* Help-content navigation references
* EN/BN navigation translation files

Reuse the current sidebar, active states, icons, collapse behavior, responsive layout, routes, and design system.

## Required visible navigation

### 1. Home

Second layer:

* Overview
* My Tasks
* My Calendar

Keep existing working routes.

### 2. Meetings

Second layer:

* Meeting Overview
* All Meetings
* Meeting Calendar

Hide **Meeting Templates** from the visible navigation. Keep its reusable code and route foundation for the final 100% phase.

Do not add Live Meeting as a permanent sidebar item.

Users must enter Live Meeting from a meeting action such as:

* Start Meeting
* Join Meeting
* Resume Meeting

Keep the existing live-meeting route functional.

### 3. Agenda & Documents

Second layer:

* Agenda Management
* Document Library

Keep these as in-page filtered views rather than sidebar items:

Agenda Management:

* All Agendas
* Approval Queue
* Temporary Agenda Review

Document Library:

* All Documents
* Unassigned Documents
* Attached to Agenda

Do not create unnecessary third-level sidebar navigation for these filtered states.

### 4. Decisions & Follow-up

Second layer:

* Decisions
* Resolutions
* Action Items

Keep Open, Overdue, Completed, Pending, and similar statuses as in-page filters or tabs.

### 5. Governance & Organization

Use this exact second-layer order:

1. Organization Structure
2. User Management
3. Designations & Positions
4. Governance Bodies
5. Participant Groups

Change the visible label **Users & Assignments** to **User Management**.

Preserve its existing functional route or add a safe redirect if the route is renamed.

Do not mix Governance Bodies with the office hierarchy.

### 6. Archive & Reports

Second layer:

* Meeting Records
* Minutes
* Registers

Change the visible label **Meeting Archive** to **Meeting Records**.

Registers may use third-level navigation:

* Resolution Register
* Decision Register
* Action Register
* Attendance Register

Hide these Phase 2 items:

* Conflict Register
* Reports & Analytics
* Audit Trail

Keep their data models, components, and routes when they are useful for the final 100% system, but do not show them in sidebars, mobile navigation, dashboard shortcuts, or normal breadcrumbs.

### 7. Administration

Second layer:

* Roles & Permissions

Third layer:

* Roles
* Permissions

Hide these Phase 2 administration groups:

* Workflows
* Meeting Configuration
* Templates
* Notifications
* Integrations
* Security & Retention

Keep reusable code and route foundations hidden.

## Contextual actions that must not appear in navigation

Do not add permanent navigation items for:

* Create Meeting
* Create Agenda
* Add User
* Live Meeting Workspace
* Waiting Room
* Meeting Readiness
* Agenda Document Picker
* User Detail
* Meeting Detail
* Meeting Record Detail
* Minutes Review
* Temporary Agenda Approval
* Document Editor
* Document Viewer

These must open from their related page, table, drawer, modal, or record action.

## Visibility architecture

Do not delete future features only to hide them.

Add one shared navigation-visibility method, such as:

* `phase`
* `isVisible`
* `featureFlag`
* `visibility`

Use the same filtered navigation source in:

* Primary sidebar
* Secondary sidebar
* Mobile drawer
* Breadcrumbs
* Dashboard shortcuts

Do not maintain separate hardcoded visibility lists in each component.

Hide a parent navigation group automatically when none of its children are visible or permitted.

Navigation must also respect existing role permissions where available.

## Route safety

* Keep all current Phase 1 routes working.
* Do not break bookmarks or direct links.
* When changing a visible name or canonical route, add redirects from existing routes.
* Keep hidden Phase 2 routes accessible only when intentionally opened or feature-enabled.
* Remove links to placeholder pages from visible UI.
* Fix broken links and mismatched route names.
* Keep backward-compatibility redirects for legacy URLs, but do not expose legacy routes in navigation.

Do not show NBR, tax, return, TIN, PSR, appeal, tribunal, payment, taxpayer, or special-registration labels anywhere in navigation.

## Breadcrumb behavior

Breadcrumbs must reflect the new structure.

Examples:

* Home → Overview
* Meetings → All Meetings
* Governance & Organization → User Management
* Archive & Reports → Registers → Resolution Register
* Administration → Roles & Permissions → Roles

Requirements:

* Do not repeat `Home → Home`.
* Do not display hidden Phase 2 labels during normal Phase 1 navigation.
* Use translated navigation labels.
* Keep breadcrumb active states synchronized with the URL.

## Desktop behavior

* Preserve the existing primary and secondary sidebar design.
* The primary sidebar shows only the seven approved top-level sections.
* The secondary sidebar shows the selected section’s visible children.
* Third-level items appear only for Registers and Roles & Permissions.
* Preserve collapsed and expanded behavior.
* Preserve active, hover, focus, and keyboard states.
* Do not redesign sidebar spacing, colors, typography, icons, or width.

## Mobile behavior

* Use the same navigation source as desktop.
* Show only visible Phase 1 items.
* Primary sections expand and collapse.
* Second-level items remain directly accessible.
* Third-level items for Registers and Roles & Permissions must be accessible through:

  * A nested mobile accordion, or
  * Clear page-level tabs after opening the parent
* Do not automatically navigate to the first third-level item while hiding access to the others.
* Close the drawer after selecting a final destination.
* Keep the active parent expanded.
* Preserve tap targets, focus states, scrolling, and no horizontal overflow.

## Translation requirements

Update EN and BN labels for:

* User Management
* Meeting Records
* All other moved or renamed items

Do not hardcode English labels inside navigation components.

Use existing translation keys where valid and add new keys only when needed.

## Cleanup

After restructuring:

* Remove unused navigation icon imports.
* Remove duplicate navigation definitions.
* Remove dead dashboard shortcuts.
* Remove visible links to placeholders.
* Update help content that points to old navigation labels.
* Do not remove hidden Phase 2 implementation code.
* Do not touch User Management business logic currently being implemented.

## Validation

Verify:

* Every visible item opens the correct page.
* Primary, second, and third layers show the correct active state.
* Breadcrumbs match the route.
* Desktop and mobile use the same visible structure.
* Hidden Phase 2 modules do not appear in UI.
* Live Meeting remains accessible from meeting actions.
* User Management remains accessible under Governance & Organization.
* Roles and Permissions remain accessible under Administration.
* Old bookmarks redirect safely.
* EN and BN navigation remain equivalent.
* Themes remain unchanged.
* No console errors appear.
* Type checking and production build pass.

# Golden Rules

* Do not break the User Management work currently in progress.
* Do not modify unrelated pages or business logic.
* Do not delete code needed for the final 100% system.
* Hide unfinished future features instead of exposing placeholders.
* Reuse the current navigation components and styles.
* Preserve desktop, mobile, themes, accessibility, and EN/BN parity.
* Do not expose legacy NBR or tax-system navigation.
