# Force a Clean Version 15 Runtime Restore

The current project source already contains the complete Version 15 Board Meeting Solution. Do not rebuild, redesign, refactor, or recreate any feature.

The current problem is that the Figma preview is still holding the previous document-only application runtime, stale CSS state, old URL hash, or prototype localStorage values.

This task must force a clean runtime restart and mount the existing Version 15 application exactly.

## Strict scope

Only inspect and modify:

* `src/app/App.tsx`
* `src/main.tsx`
* Temporary obsolete entry files such as `src/app/App-3.tsx`

Do not modify:

* Routes
* Navigation
* Layouts
* Themes
* CSS design files
* Pages
* Tables
* Drawers
* Modals
* Forms
* Agenda Builder
* Document Management
* Meetings
* User Management
* Organization Structure
* Registries
* Business logic

---

## Step 1 — Restore `src/app/App.tsx` exactly

Replace the complete contents of `src/app/App.tsx` with:

```tsx
import { RouterProvider } from "react-router";
import { Provider } from "react-redux";
import { Toaster } from "sonner";

import { store } from "./store";
import { router } from "./routes";
import { runBmsMigrationIfNeeded } from "./utils/bmsMigration";

// Run once when the module loads — safe no-op if already run.
runBmsMigrationIfNeeded();

// Re-export types for external components.
export type { ThemeId, ThemeConfig } from "./data/themes";
export type { FontId, FontSizeId } from "./data/fonts";
export type {
  UserStatus,
  SystemUser,
  SystemRole,
  Notification,
  NotificationType,
  NotificationPriority,
} from "./data/mockData";
export type { PermissionItem, PermGroupDef } from "./data/permissions";

export default function App() {
  return (
    <Provider store={store}>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" richColors />
    </Provider>
  );
}
```

Use these existing imports and exports.

Do not add:

* `MemoryRouter`
* `BrowserRouter`
* Local navigation
* Local document state
* Direct `DocumentLibraryPage` rendering
* A second router
* A second theme provider

---

## Step 2 — Force the preview to perform one clean reload

The previous correction modified only `App.tsx`, which allowed Figma’s hot-reload preview to retain old runtime and CSS state.

Temporarily update `src/main.tsx` so it performs one controlled recovery reload.

Replace `src/main.tsx` with:

```tsx
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

const RECOVERY_KEY = "bms-version-15-runtime-restored-v1";

function removeBrokenPrototypeState() {
  const root = document.documentElement;

  // Remove stale classes previously added by the document-only prototype.
  root.classList.remove("dark", "light");

  // Remove only generic prototype theme variables that may remain inline
  // after hot reload. Do not remove the Board Meeting Solution --color-* tokens.
  [
    "--background",
    "--foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--primary",
    "--primary-foreground",
    "--secondary",
    "--secondary-foreground",
    "--muted",
    "--muted-foreground",
    "--accent",
    "--accent-foreground",
    "--destructive",
    "--border",
    "--input",
    "--ring",
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-border",
    "--sidebar-ring",
  ].forEach((property) => root.style.removeProperty(property));

  // Remove only storage created by the temporary Version 19 prototype.
  // Preserve all canonical bms.*, gov_ui_*, nbr.*, document content,
  // versions, relationships, settings, authentication, and user data.
  const prototypePrefixes = [
    "bms_reg_",
    "bms_doc_reg_",
    "bms_doc_content_",
  ];

  const prototypeExactKeys = new Set([
    "sidebar_state",
    "next-themes",
    "theme",
  ]);

  for (let index = localStorage.length - 1; index >= 0; index -= 1) {
    const key = localStorage.key(index);
    if (!key) continue;

    const isPrototypeKey =
      prototypePrefixes.some((prefix) => key.startsWith(prefix)) ||
      prototypeExactKeys.has(key);

    if (isPrototypeKey) {
      localStorage.removeItem(key);
    }
  }

  // Remove the old document-prototype hash route.
  if (
    window.location.hash === "#library" ||
    window.location.hash.startsWith("#workspace/")
  ) {
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }
}

if (!sessionStorage.getItem(RECOVERY_KEY)) {
  removeBrokenPrototypeState();
  sessionStorage.setItem(RECOVERY_KEY, "done");

  // Force a complete document and stylesheet reload rather than another
  // hot-module replacement.
  window.location.reload();
} else {
  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Application root element was not found.");
  }

  createRoot(rootElement).render(<App />);
}
```

This reload must happen only once.

Do not use a permanent reload loop.

Do not clear all localStorage.

Do not clear:

* Keys beginning with `bms.`
* Keys beginning with `gov_ui_`
* Keys beginning with `nbr.`
* Canonical users
* Canonical agendas
* Canonical meetings
* Document versions
* Approval history
* IndexedDB
* Audit records

---

## Step 3 — Remove obsolete entry stubs

Inspect:

```text
src/app/App-3.tsx
```

It is an unused stub from the failed restoration.

Confirm no source file imports it, then delete it.

Do not delete any real feature file.

Do not delete Markdown reference files unless they cause a build error.

---

## Step 4 — Confirm the correct CSS entry

Open:

```text
src/styles/index.css
```

Confirm it imports the complete existing Version 15 stylesheet system, including:

* Fonts
* Tailwind base
* Theme
* Tokens
* Typography
* Globals
* Layout
* Navigation
* Mobile navigation
* Tables
* Cards
* Forms
* Filters
* Buttons
* Badges
* Tabs
* Users
* Roles
* Permissions
* Attachments
* Appearance
* Modals
* Mobile modals
* Responsive overlays
* Drawers
* Dropdowns
* Animations
* Help
* Live Meeting
* Tasks
* Calendar
* Document Library
* Editor
* Documents
* Document editor

Do not replace this with the previous three-import document-prototype stylesheet.

Do not import `default_shadcn_theme.css`.

Do not change any design tokens.

---

## Step 5 — Verify the mounted runtime

After the forced reload, inspect the rendered component tree.

The active hierarchy must be:

```text
Provider
└── RouterProvider
    └── AppRoot
        └── AppShell
            ├── SidebarShell
            ├── MainShell
            ├── Breadcrumbs
            └── Routed page content
```

The active hierarchy must not be:

```text
Local App state
└── Hardcoded sidebar
    └── DocumentLibraryPage
```

Search the running source and confirm `src/app/App.tsx` contains none of:

* `NAV_ITEMS`
* `DocumentLibraryPage`
* `DocumentComposerModal`
* `DocumentDetailsDrawer`
* `DocumentWorkspaceRouter`
* `MemoryRouter`
* `useState`
* Hash-based routing
* Hardcoded user information

---

## Step 6 — Verify visual restoration

After the clean reload, verify:

* Original Version 15 sidebar
* Original nested navigation
* Original active-navigation style
* Original header
* Original breadcrumbs
* Original page widths
* Original Indigo Blue default theme
* Theme switching
* Dark mode
* Typography
* Tables
* Dashboard cards
* Detail drawers
* Modals
* Buttons
* Forms
* Status chips
* Mobile navigation
* Responsive behavior

Do not improve or redesign these elements.

The goal is exact restoration.

---

## Step 7 — Verify routes

Open these existing routes and confirm real pages render:

```text
/home/overview
/home/my-tasks
/home/my-calendar
/meetings/meeting-overview
/meetings/all-meetings
/meetings/meeting-calendar
/agenda-documents/agenda-management
/agenda-documents/document-library
/decisions-followup/decisions
/decisions-followup/resolutions
/decisions-followup/action-items
/governance-org/organization-structure
/governance-org/users-assignments
/governance-org/designations-positions
/governance-org/governance-bodies
/governance-org/participant-groups
/archive-reports/meeting-archive
/archive-reports/minutes
/administration/roles-permissions/roles
/administration/roles-permissions/permissions
```

Confirm:

* URL changes
* Browser Back works
* Browser Forward works
* Breadcrumbs update
* Navigation active states update
* Mobile navigation works
* No page is replaced by the document-only prototype

---

## Step 8 — Validate without changing unrelated code

Run the existing scripts:

```text
npm run typecheck
npm run test
npm run build
```

Fix only errors caused by:

* `App.tsx`
* `main.tsx`
* Obsolete entry files
* Duplicate router mounting
* Stale document-only imports

Do not perform broad refactoring.

Do not change action resolvers, feature models, tests, or business logic as part of this recovery unless an error directly prevents the restored shell from starting.

---

## Step 9 — Remove the temporary reload after verification

After the complete Version 15 interface is visibly restored and verified, simplify `src/main.tsx` back to:

```tsx
import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Application root element was not found.");
}

createRoot(rootElement).render(<App />);
```

Do not remove this temporary recovery code before confirming the preview has performed one full clean reload.

---

## Completion criteria

The task is complete only when:

* The Figma preview performs a full reload rather than only hot reload.
* The Version 19 document-only shell is no longer visible.
* The original Version 15 sidebar and navigation return.
* The original theme, colors, typography, layouts, tables, drawers, and modals return.
* Document Library opens inside the full application shell.
* All visible Phase 1 navigation routes work.
* No canonical project data is cleared.
* No working feature is redesigned.
* Type checking and build complete without entry-point errors.
* The temporary recovery reload is removed after successful restoration.

# Golden Rules

* Do not rebuild the project.
* Do not recreate Version 15 manually.
* Do not redesign any page.
* Do not change navigation labels or structure.
* Do not change themes, colors, typography, drawers, tables, modals, or buttons.
* Do not clear canonical localStorage or IndexedDB data.
* Do not touch unrelated feature files.
* Use the existing Version 15 source as the only source of truth.
* Force a clean runtime reload, verify restoration, then remove the temporary recovery code.
* Do not break solved issues.
