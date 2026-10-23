# Restore the Real Application Entry Point and Full Board Meeting System

Work only on restoring the existing Board Meeting Solution application entry point.

The complete project files, routes, layouts, navigation, themes, pages, shared components, registries, and business logic already exist inside the current project. The problem is that the wrong document-only application shell is still mounted from `src/app/App.tsx`.

Do not rebuild the application.

Do not redesign anything.

Do not create new pages, navigation, components, themes, routes, drawers, modals, or document systems.

Follow these steps exactly.

---

## Step 1 — Inspect the current application entry

Open:

```text
src/main.tsx
```

Confirm that it imports:

```tsx
import App from "./app/App.tsx";
```

Do not change `src/main.tsx` unless this exact import is missing.

Now open:

```text
src/app/App.tsx
```

The current incorrect file may contain:

* `MemoryRouter`
* `DocumentLibraryPage`
* Hardcoded sidebar navigation
* Local document state
* A `NAV_ITEMS` array
* Hash-based workspace navigation
* Document-only routes
* Local theme or sidebar markup
* Direct rendering of the Document Library

Remove this incorrect document-only application shell completely.

---

## Step 2 — Confirm the real project foundations exist

Before replacing `App.tsx`, locate these existing project files:

```text
src/app/store
src/app/routes
src/app/utils/bmsMigration
```

Depending on the current export structure, they may be files such as:

```text
src/app/store.ts
src/app/store/index.ts
src/app/routes.tsx
src/app/routes/index.tsx
src/app/utils/bmsMigration.ts
```

Also confirm that the project already contains:

* `RouterProvider`
* Redux store
* Application routes
* `AppRoot`
* `AppShell`
* Navigation configuration
* Theme and appearance system
* Language system
* Migration utility
* Sonner or existing toast system

Do not recreate any of these.

Use their existing exports.

---

## Step 3 — Replace `src/app/App.tsx`

Replace the complete contents of:

```text
src/app/App.tsx
```

with this application entry structure:

```tsx
import { Provider } from "react-redux";
import { RouterProvider } from "react-router";
import { Toaster } from "sonner";

import { router } from "./routes";
import { store } from "./store";
import { runBmsMigrationIfNeeded } from "./utils/bmsMigration";

runBmsMigrationIfNeeded();

export default function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" richColors />
    </Provider>
  );
}
```

Use the exact existing import paths and exports from the current project.

For example, if the project exports the router from:

```text
./routes/index
```

then adjust only the import path.

Do not change the router implementation.

Do not change the Redux store.

Do not change migration logic.

Do not add `MemoryRouter`, `BrowserRouter`, or another router around `RouterProvider`.

There must be only one application router.

---

## Step 4 — Remove obsolete document-only entry files

Search for temporary application entry files such as:

```text
src/app/App-3.tsx
src/app/App-old.tsx
src/app/App-backup.tsx
```

Delete them only when they are unused temporary copies of the broken document-only shell.

Before deleting, confirm that no file imports them.

Do not delete feature pages, document components, layouts, routes, or shared components.

Do not delete Markdown notes or imported reference content unless they cause build issues.

---

## Step 5 — Remove broken imports from the old shell

After restoring `App.tsx`, search for imports that existed only because of the broken document-only shell, such as:

```text
./data/documentData
DocumentLibraryPage directly inside App.tsx
DocumentDetailsDrawer directly inside App.tsx
DocumentComposerModal directly inside App.tsx
DocumentWorkspaceRouter directly inside App.tsx
MemoryRouter
NAV_ITEMS
```

These must not remain inside `src/app/App.tsx`.

Do not remove these document components from their real feature routes.

Document Management must still be opened through the existing application router and navigation.

---

## Step 6 — Do not modify the restored application architecture

Do not change:

* `src/main.tsx`
* Routes
* Route IDs
* Navigation configuration
* Sidebar
* Mobile navigation
* Breadcrumbs
* Layout components
* Theme tokens
* Appearance settings
* Dark mode
* Language switching
* Redux store
* Authentication shell
* Migration records
* Page components
* Tables
* Drawers
* Modals
* Buttons
* Forms
* Document viewer
* Document editor
* Agenda Builder
* Meeting pages
* User Management
* Organization Structure
* Archive and Reports
* Roles and Permissions

The task is to activate the existing system, not rewrite it.

---

## Step 7 — Verify the real system is mounted

Start the application and confirm that the following existing layers render:

```text
Provider
└── RouterProvider
    └── AppRoot
        └── AppShell
            ├── Sidebar or mobile navigation
            ├── Header
            ├── Breadcrumbs
            └── Routed page content
```

Confirm the application no longer directly renders only:

```text
DocumentLibraryPage
```

Confirm there is no hardcoded local sidebar inside `App.tsx`.

---

## Step 8 — Verify navigation

Open every visible Phase 1 navigation item.

Verify these open real pages:

### Home

* Overview
* My Tasks
* My Calendar

### Meetings

* Meeting Overview
* All Meetings
* Meeting Calendar

### Agenda and Documents

* Agenda Management
* Document Library

### Decisions and Follow-up

* Decisions
* Resolutions
* Action Items

### Governance and Organization

* Organization Structure
* User Management
* Designations and Positions
* Governance Bodies
* Participant Groups

### Archive and Reports

* Meeting Records
* Minutes
* Registers

### Administration

* Roles
* Permissions

Check:

* Route changes appear in the browser URL.
* Browser Back works.
* Browser Forward works.
* Breadcrumbs update.
* Page titles update.
* Mobile navigation works.
* Hidden Phase 2 items remain hidden.
* No visible navigation item is decorative or dead.

Do not change navigation labels or grouping during this recovery.

---

## Step 9 — Verify themes and appearance

Confirm the restored application uses the existing theme and appearance system.

Test:

* Existing default theme
* Other supported themes
* Light mode
* Dark mode
* Font settings where supported
* Font-size settings where supported

Verify:

* Sidebar colors
* Active navigation state
* Page background
* Cards
* Tables
* Drawers
* Modals
* Buttons
* Forms
* Status chips
* Typography
* Hover states
* Focus states

Do not replace existing theme tokens with generic Shadcn colors.

Do not create a new color palette.

---

## Step 10 — Verify shared UI systems

Confirm the restored routes use the project’s existing shared systems:

* Shared page layout
* Shared table components
* Shared mobile cards
* Shared detail drawers
* Shared responsive overlays
* Shared modals
* Shared confirmation dialogs
* Shared buttons
* Shared tabs
* Shared form fields
* Shared status badges
* Shared filters
* Shared empty states
* Shared loading states
* Shared error states
* Shared typography

Do not replace any shared component during this fix.

---

## Step 11 — Verify Document Management still opens correctly

Navigate through:

```text
Agenda and Documents → Document Library
```

Verify:

* Document Library opens through the real router.
* Add Document opens from the Document Library.
* Document Details drawer opens.
* Viewer and editor routes still work.
* Closing returns to Document Library.
* The full application sidebar and header remain visible where expected.
* Document Management does not replace the entire application shell.

Do not directly mount Document Library from `App.tsx`.

---

## Step 12 — Technical validation

Run:

```text
npm run typecheck
npm run test
npm run build
```

If the current package scripts use different names, use the existing equivalent scripts.

Fix only errors caused by the incorrect application entry or obsolete temporary entry files.

Check for:

* Missing route imports
* Missing store imports
* Incorrect migration import
* Duplicate router providers
* Invalid `App.tsx` imports
* References to missing `documentData`
* Invalid props left from the document-only shell
* Broken lazy route imports
* Circular imports
* Console errors

Do not silence errors with:

* `any`
* `@ts-ignore`
* Disabled strict mode
* Removed tests
* Commented-out routes

---

## Step 13 — Final regression check

Confirm these existing journeys still load:

* Dashboard
* User Management
* Organization Structure
* Agenda Management
* Agenda Builder
* Document Library
* Meeting List
* Meeting Creation
* Live Meeting
* Meeting Records
* Minutes
* Decisions
* Resolutions
* Action Items
* Roles
* Permissions

Also verify:

* Search works
* Filters work
* Tables work
* Mobile cards work
* Detail drawers work
* Modals work
* Theme switching works
* Language switching works
* Refresh preserves expected data
* No document-only hardcoded navigation remains

---

## Completion criteria

This task is complete only when:

* `src/app/App.tsx` mounts the Redux Provider and real RouterProvider.
* The migration utility runs through the restored application entry.
* The hardcoded document-only shell is removed.
* The real application navigation is restored.
* Every visible navigation item opens a real page.
* The existing theme and appearance system works.
* The existing page layouts and styles return.
* Shared drawers, modals, tables, buttons, tabs, and forms are active again.
* Document Management opens as a module inside the complete system.
* Type checking passes.
* Tests pass.
* Production build passes.
* No new console errors remain.

# Golden Rules

* Do not rebuild the application.
* Do not create new components.
* Do not create new routes.
* Do not create new navigation.
* Do not create a new theme or design system.
* Do not copy the document-only shell.
* Do not change unrelated files.
* Do not remove working pages or features.
* Restore and reuse the existing router, store, layouts, themes, navigation, pages, components, and business logic.
* Preserve desktop, tablet, mobile, accessibility, EN/BN, and all existing themes.
* Fix only the application entry problem and errors directly caused by it.
* Do not break solved issues.
