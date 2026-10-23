# Complete Agenda Management — Parent-Centric Table, Expandable Children, Detail Drawer, and Permissions

Work only on **Agenda Management** in the current restored Board Meeting Solution.

The Agenda Builder and Document Management journeys are already being handled separately. Preserve them exactly.

Do not redesign navigation, themes, layouts, shared tables, shared drawers, modals, buttons, document systems, approvals, or unrelated modules.

The required Agenda Management journey is:

`Agenda List → View Parent Agendas → Expand Parent Row → View Child Agendas → Open Parent or Child Details → Perform Authorized Actions`

---

## 1. Inspect the current implementation first

Inspect and reuse:

```text
src/app/pages/register-stock/Register4ListPage.tsx
src/app/components/agenda/AgendaFormModal.tsx
src/app/components/pages/GeneratedTablePage.tsx
src/app/components/tables/UnifiedDataTable.tsx
src/app/components/tables/ResponsiveTable.tsx
src/app/components/tables/CardTable.tsx
src/app/components/tables/UnifiedMobileCard.tsx
src/app/components/drawers/DynamicDetailsDrawer.tsx
src/app/pages/boardMeetingDrawerSchemas.ts
src/app/actions/resolvers/agendaActions.ts
src/app/actions/useResolvedActions.ts
src/app/data/boardMeetingData.ts
src/app/data/bmsUsers.ts
src/app/hooks/useRoleRegistry.ts
```

Also inspect and reuse:

* Agenda registry
* Agenda-document link registry
* Document registry
* Canonical user registry
* Roles and permissions registry
* Audit registry
* Status badges
* Attachment list
* Unified document viewer
* Confirmation modals
* Existing approval dialogs
* Existing responsive behavior

Do not create:

* Another agenda table
* Another drawer shell
* Another permission engine
* Another agenda registry
* Another document list
* Another viewer
* Another approval system

---

# 2. Preserve the completed Agenda Builder

Do not change the existing creation journey:

```text
Agenda List
→ Add Agenda
→ Parent Agenda Details
→ Agenda Builder
→ Multiple Child Agendas
→ Documents
→ Save Agenda
```

Preserve:

* Full-screen builder
* Parent-first creation
* One parent with multiple Level 2 children
* Rich-text child details
* Upload New Document
* Choose from Library
* Child ordering
* Save Draft
* Save Child
* Save and Add Another
* Save Agenda
* Historical Level 3 data

Do not allow new Level 3 creation.

Only make a small adapter when Edit Parent or Edit Child needs to open the existing builder correctly.

---

# 3. Replace the flat Agenda table with a parent-centric table

The current All Agendas table flattens Parent, Child, and historical Level 3 records into separate top-level rows.

Stop showing the hierarchy this way.

## Main table data

The main table must contain **Parent Agendas only**.

A Parent Agenda is an agenda with:

```text
parent_agenda_id = empty
agenda_level = 1
```

Do not permanently modify or duplicate records to build the table.

Create derived table-row data from the existing registry.

Each parent row must include:

* Parent agenda ID
* Parent agenda title
* Direct child count
* Owner name
* Total child duration
* Unique document count
* Approval status
* Updated date
* Search text containing related child information

## Table columns

Use only these columns:

1. Parent Agenda
2. Child Agendas
3. Owner
4. Total Duration
5. Documents
6. Status
7. Last Updated
8. Action

Do not show these columns in the main table:

* Level
* Submitted By
* Priority
* Submission Date
* Meeting ID
* Committee
* Manual Display Order

Keep relevant information in the detail drawer.

## Parent Agenda cell

The Parent Agenda cell should contain:

* Expand or collapse chevron
* Agenda title
* Agenda reference in small supporting text, when available

Do not add a separate hierarchy column.

## Child Agendas column

Show:

```text
3 child agendas
```

Use the number of direct Level 2 children only.

Do not include historical Level 3 records in this count.

## Duration

Calculate total duration from direct child agendas.

Use the existing duration helpers.

Display:

* `45 min`
* `1h 20m`
* `—` when unavailable

## Documents

Show the unique number of documents linked to:

* The parent
* Its direct children

Do not double-count the same document when linked more than once.

---

# 4. Add opt-in expandable rows to the existing table system

Do not build a custom Agenda table.

Extend the existing shared table chain with optional row-expansion support:

```text
UnifiedDataTable
→ ResponsiveTable
→ CardTable
→ UnifiedMobileCard
```

Add only optional props such as:

```text
getRowId
isRowExpandable
expandedRowIds
onToggleRow
renderExpandedRow
renderExpandedMobileContent
rowClickMode
```

Names may follow the current project conventions.

Default behavior for every other table must remain unchanged.

## Desktop interaction

For Agenda Management only:

* Clicking a parent table row expands or collapses it.
* Clicking the chevron also expands or collapses it.
* The Action column contains one View action.
* Clicking View opens the Parent Agenda detail drawer.
* The View action must not toggle the row.
* Expansion must be keyboard accessible.
* Enter or Space on the focused parent row toggles expansion.
* Use `aria-expanded` and `aria-controls`.

Preserve expansion state when:

* Opening and closing the drawer
* Opening document preview
* Editing an agenda
* Returning from the Agenda Builder

Safely remove expansion IDs when records no longer exist.

---

# 5. Expanded child-agenda content

When a parent row expands, show its direct child agendas underneath it.

Do not show another independent page or nested modal.

Use a full-width expanded table row containing a compact child list.

## Child list columns

Show:

1. Number
2. Child Agenda
3. Purpose
4. Presenter
5. Duration
6. Documents
7. Status

Example:

```text
1.1 | Quarterly Financial Performance | For Review | Ayesha Rahman | 20 min | 2 | Draft
1.2 | Capital Adequacy Position        | For Approval | Tanvir Ahmed | 15 min | 1 | Approved
```

Use automatic numbering based on the parent and child display order.

Do not store the visible number as a permanent manual field.

## Child interaction

* The complete child row is clickable.
* Clicking a child opens that child’s details inside the same Agenda detail drawer.
* Do not open a second drawer.
* Do not open a nested modal.
* Do not add a separate View Details text button.
* Use a clear hover and keyboard-focus state.

## Empty child state

When a parent has no children, show:

```text
No child agendas added yet.
```

Show `Add Child Agenda` only when the current user is authorized.

The action must open the existing Agenda Builder with the parent selected.

---

# 6. Search, filters, counts, and tabs

## Search

Search must match:

* Parent title
* Parent reference
* Parent owner
* Child title
* Child presenter
* Child purpose
* Child status

Add a derived child-search string to the parent table row.

Do not duplicate child records in search results.

When a child matches, show its parent row.

## Agenda-specific filters

Replace the irrelevant generic meeting filters on the All Agendas view.

Use only:

* Status
* Owner
* Purpose
* Confidentiality
* Has Child Agendas

Do not add excessive filters.

## Counts

All Agendas count must represent Parent Agendas, not every hierarchy record.

Recommended summary values:

* Parent Agendas
* Child Agendas
* Pending Approval
* Approved

Reuse the existing KPI components.

Do not create new dashboard-card designs.

## Approval Queue

Use the same parent-centric table behavior.

Show a parent when:

* The parent requires approval, or
* One or more direct children require approval

When expanded, show only the relevant actionable children or clearly identify their status.

Do not remove the working approval dialogs.

## Temporary Review

Preserve the current Temporary Agenda Review behavior.

Only group temporary items under a parent when a valid parent relationship already exists.

Do not invent parent records for orphan temporary items.

---

# 7. Replace the generic Agenda drawer content with agenda-specific details

Continue using:

```text
DynamicDetailsDrawer
ResponsiveOverlay
```

Do not create an `AgendaDetailsDrawer` shell.

The existing drawer may be extended with small optional reusable props such as:

```text
backAction
extraBodyContent
relatedContent
```

These props must be optional and must not change any other drawer.

---

# 8. Parent Agenda detail drawer

Opening View from a parent row must show the Parent Agenda drawer.

## Header and summary

Show:

* Parent agenda title
* Agenda reference
* Status
* Confidentiality
* Last updated

## Essential sections

### Overview

Show only:

* Title
* Purpose
* Background or summary
* Owner
* Confidentiality
* Category, only when populated
* Created by
* Created date
* Last updated

Do not show empty values.

Do not show raw IDs when names are available.

### Agenda Summary

Show:

* Child agenda count
* Total duration
* Unique document count
* Approved child count
* Pending child count
* Meeting readiness where already supported

Keep this section compact.

### Child Agendas

Show the direct child agenda list.

Each child item must display:

* Automatic number
* Title
* Purpose
* Presenter
* Duration
* Document count
* Status

The complete child item must be clickable.

Clicking it changes the same drawer from Parent Details to Child Details.

### Documents

Show documents linked directly to the parent.

Use the existing attachment or document list pattern.

Allow:

* Preview
* Open

Use `UnifiedDocumentViewer`.

Do not create a second document viewer.

### Approval and History

Show real:

* Current approval status
* Approval progress
* Submitted by
* Submitted date
* Approval history
* Revision reason
* Rejection reason
* Reopen history

Do not show hardcoded timeline records.

### Audit

Show existing agenda audit events when the user has permission.

---

# 9. Child Agenda detail view inside the same drawer

When a child is selected, keep the drawer open and show:

```text
Parent Agenda
› Child Agenda
```

Add a Back action:

```text
Back to Parent Agenda
```

Do not close and reopen another drawer.

## Child details

Show:

* Child agenda number
* Child title
* Status
* Parent agenda title
* Purpose
* Discussion Details
* Presenter
* Duration
* Document count
* Created date
* Last updated

## Rich-text display

Render Discussion Details as safe read-only rich text.

Do not display raw HTML tags.

Use the same safe serialization format used by the Agenda Builder.

Do not create another rich-text editor inside the drawer.

## Child documents

Show all documents linked to the selected child.

Allow:

* Preview
* Open
* Download when permitted

Do not allow unlinking from a read-only detail view unless the user has Edit or Manage Documents permission.

Unlinking must not delete the document.

## Child approval

Show:

* Current status
* Submission information
* Approver
* Approval history
* Revision or rejection notes
* Parent-status impact

---

# 10. Drawer actions

The table must continue showing only one View action.

All other actions belong in the drawer footer or existing overflow menu.

## Parent actions

Show only when valid and authorized:

* Edit Parent Agenda
* Add Child Agenda
* Submit for Approval
* Preview Full Agenda
* Reopen
* Archive

## Child actions

Show only when valid and authorized:

* Edit Child Agenda
* Submit for Approval
* Approve
* Request Revision
* Reject
* Reopen
* Manage Documents

Do not show:

* Add Child Agenda on a child
* Level 3 creation
* Duplicate primary actions
* Nonfunctional actions
* Unauthorized actions

Use the existing shared Button and action-menu systems.

---

# 11. Complete the Agenda permission journey

The current Agenda page contains a local designation-based `PERM_MAP`.

Remove this local permission logic.

Do not decide permissions by checking whether designation text contains words such as:

```text
Meeting Secretary
Company Secretary
Admin
```

Use the existing centralized system:

```text
useResolvedActions("agenda_item")
resolveAgendaActions
Canonical users
Canonical roles
Canonical permissions
```

## Required Agenda permissions

Use existing matching permission IDs where available.

Do not create duplicate permission IDs.

Required capabilities:

* View Agenda
* View Confidential Agenda
* Create Agenda
* Edit Agenda
* Manage Child Agendas
* Reorder Child Agendas
* Attach or Unlink Documents
* Submit Agenda
* Approve Agenda
* Reject Agenda
* Request Revision
* Reopen Agenda
* Archive Agenda
* View Approval History
* View Audit History

## Permission behavior

### Agenda owner

May:

* View own agenda
* Edit own Draft or Revision Requested agenda
* Manage own child agendas when authorized
* Attach documents
* Submit for approval

Must not automatically approve their own agenda unless their role explicitly grants approval permission.

### Meeting or Company Secretary

May perform agenda-management actions based on assigned role permissions.

Do not hardcode the designation inside the page.

### Approver

May:

* View submitted agenda
* Approve
* Reject
* Request revision
* View approval history

Only when granted by the role-permission registry.

### Presenter

May view the assigned child agenda and permitted documents.

Presenter status alone must not grant edit or approval rights.

### Confidential and Restricted agendas

Only allow access to:

* Owner
* Explicitly assigned approver
* Authorized secretary or administrator
* User with confidential-agenda permission

Block access in handlers as well as the UI.

## Stable identity

Use stable user IDs for:

* Owner
* Presenter
* Creator
* Submitter
* Approver
* Actor

Use names only as display labels or legacy fallback.

Do not match permissions or ownership using duplicate user names.

---

# 12. Approval and parent-status rules

Preserve the existing approval system and audit history.

For the current two-level journey:

* Each child can be submitted and approved independently.
* Parent progress must use direct children.
* Parent status becomes Partially Approved when only some children are approved.
* Parent becomes Approved when all active direct children qualify and the existing parent-completion rules pass.
* Rejection or revision of an approved child must recalculate the parent.
* Editing an approved child must require confirmation and reopen the child and parent when required.
* Archived children must not block approval.
* Historical Level 3 records must remain preserved but must not appear in the current creation or main-table hierarchy.

Do not delete existing approval history.

Do not update only local UI state.

Persist every action through the agenda registry and audit registry.

---

# 13. Mobile behavior

Do not force the desktop table onto mobile.

Use the existing `UnifiedMobileCard`.

## Parent card

Show:

* Parent title
* Child count
* Owner
* Total duration
* Documents
* Status

Behavior:

* Use a clear expand control to show children.
* Tapping the parent title or main content opens Parent Details.
* Do not add a large View Details button.

## Expanded mobile children

Show compact child cards with:

* Number
* Title
* Presenter
* Duration
* Document count
* Status

Tapping a child opens Child Details in the same mobile drawer.

Ensure:

* No horizontal overflow
* Comfortable tap targets
* Drawer footer remains accessible
* Document viewer opens above the drawer
* Back to Parent works
* Expansion state is preserved

Do not break desktop while fixing mobile.

---

# 14. Update Agenda drawer schemas

Replace the current generic `AGENDA_DRAWER_COLS` with essential agenda-specific fields.

Remove irrelevant or legacy fields from the normal drawer, including:

* Meeting Type
* Financial Impact
* Proposed Decision when empty
* Submitting Division when unused
* Priority when not used in the current builder
* Raw Meeting IDs when no meeting is linked
* Manual display order
* Level badge

Create separate derived drawer data for:

* Parent Agenda
* Child Agenda

Do not create duplicate stored models.

Use derived display fields such as:

* Owner name
* Presenter name
* Parent title
* Child count
* Total duration
* Document count
* Approval progress

---

# 15. Regression audit and automatic correction

After implementation, test this exact journey:

1. Open Agenda Management.
2. Confirm All Agendas shows Parent Agendas only.
3. Confirm child records are not duplicated as top-level rows.
4. Confirm the Child Agendas column is accurate.
5. Click a parent row.
6. Confirm it expands.
7. Click it again.
8. Confirm it collapses.
9. Expand multiple parents.
10. Confirm expansion state remains while opening a drawer.
11. Click View.
12. Confirm Parent Details opens.
13. Confirm the child list appears.
14. Click a child.
15. Confirm Child Details replaces parent content in the same drawer.
16. Select Back to Parent.
17. Preview a child document.
18. Close the viewer.
19. Confirm the same child remains selected.
20. Edit the parent.
21. Confirm the existing Agenda Builder opens.
22. Edit a child.
23. Confirm the same parent and child are focused.
24. Search using a child title.
25. Confirm the correct parent appears.
26. Apply status and owner filters.
27. Open Approval Queue.
28. Approve a child.
29. Confirm parent progress recalculates.
30. Request revision.
31. Confirm parent status recalculates.
32. Test an unauthorized user.
33. Confirm actions are hidden and blocked.
34. Test a confidential agenda.
35. Test mobile.
36. Test EN and BN.
37. Test light and dark themes.
38. Refresh and confirm persistence.

## Negative tests

Test:

* Parent with no children
* Parent with many children
* Child with no presenter
* Child with no documents
* Duplicate document link
* Archived child
* Historical Level 3 child
* Inactive owner
* Unauthorized edit
* Unauthorized approval
* Unauthorized confidential access
* Double action click
* Deleted child while row is expanded
* Search while rows are expanded
* Pagination while rows are expanded

## Technical validation

Run:

```text
npm run typecheck
npm run test
npm run build
```

Add focused tests for:

* Parent-only table rows
* Child count aggregation
* Expand and collapse
* Keyboard expansion
* Child-row rendering
* Parent drawer
* Child drawer navigation
* Search through child information
* Unique document counting
* Permission enforcement
* Approval cascade
* Mobile expansion
* Historical Level 3 preservation

Do not remove or weaken existing tests.

---

# Completion criteria

Agenda Management is complete only when:

* The main table shows Parent Agendas only.
* The number of direct child agendas is accurate.
* Parent rows expand and collapse.
* Expanded content shows direct child agendas.
* Clicking a child opens its details.
* Parent Details includes a clickable child list.
* Child Details appears inside the same drawer.
* Rich-text details render correctly.
* Documents preview through the existing viewer.
* Table actions remain limited to View.
* Contextual actions appear in the drawer.
* Permissions use the centralized role-permission system.
* Unauthorized actions are blocked in handlers.
* Parent approval recalculates from child statuses.
* Historical Level 3 data remains safe.
* The existing Agenda Builder remains unchanged.
* Document Management remains unchanged.
* Desktop, tablet, and mobile work.
* EN/BN and themes remain intact.
* Type checking, tests, and production build pass.

# Golden Rules

* Do not break solved issues.
* Do not rebuild Agenda Management.
* Do not create a new table or drawer component.
* Extend existing shared components only through optional backward-compatible props.
* Do not change the completed Agenda Builder layout or creation journey.
* Do not change Document Management while it is being completed.
* Do not create Level 3 agendas.
* Do not delete historical Level 3 records.
* Do not duplicate agenda, child, user, document, approval, or audit data.
* Do not add unnecessary columns, inputs, filters, cards, tabs, or actions.
* Reuse existing tables, drawers, overlays, buttons, status badges, viewers, registries, permissions, and design tokens.
* Preserve navigation, themes, routes, APIs, IDs, persistence, approvals, documents, audit history, desktop, mobile, accessibility, and EN/BN parity.
