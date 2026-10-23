````text
Fix only the Document Library detail drawer and dashboard summary cards in the current Board Meeting Solution.

The Add Document modal is now good. Do not redesign or change it.

Study the latest project before editing. Reuse the existing drawer, card, button, tab, editor, permission, workflow, and responsive components. Do not create another visual pattern.

## Main goals

1. Rebuild Document Details so it matches the original system detail-drawer design shown in the Governance Body Details reference.
2. Restore the missing `Edit in Editor` / `Preview in Editor` action.
3. Make the editor action permanently available whenever the user can view the document.
4. Fix the Document Library summary cards so they use the same shared KPI card component and layout as the rest of the system.
5. Apply every fix to desktop, tablet, and mobile.
6. Do not break any working document functionality.

## Exact files to inspect

At minimum, inspect and update:

- `src/app/components/documents/DocumentDetailsDrawer.tsx`
- `src/app/pages/agenda-documents/DocumentLibraryPage.tsx`
- `src/app/components/drawers/DynamicDetailsDrawer.tsx`
- `src/app/components/shared/ResponsiveOverlay.tsx`
- `src/app/components/cards/StatCard.tsx`
- `src/styles/drawers.css`
- `src/styles/doc-library.css`
- `src/styles/cards.css`

Reuse existing shared styles and components rather than copying them into document-specific files.

# 1. Rebuild Document Details using the original drawer design

Use the Governance Body Details drawer as the exact visual reference.

The document drawer must match its:

- Width
- Header
- Backdrop
- Summary card
- Section cards
- Field layout
- Spacing
- Border
- Radius
- Typography
- Footer
- Button size
- Button alignment
- Mobile behavior

Do not keep the current flat document-specific drawer body.

## Drawer shell

Use the existing `ResponsiveOverlay`.

Desktop:

- Open from the right.
- Use the standard system drawer width of approximately 480px.
- Do not resize the page.
- Keep the header fixed.
- Keep the body scrollable.
- Keep the footer fixed.
- Use the same backdrop as every other detail drawer.

Mobile:

- Use the existing responsive drawer or bottom-sheet behavior.
- Do not render a narrow desktop drawer.
- Keep the header and footer visible.
- Allow the body to scroll naturally.
- Maintain at least 44px tap targets.

Do not create another document-only overlay implementation.

## Drawer header

The header must contain only:

- `Document Details`
- Standard close icon

Do not add document name, status, buttons, or metadata directly inside the header.

## Summary card

Use the same `drawer-summary` card pattern as Governance Body Details.

The summary card should show:

- File-type icon
- Document name
- Document reference
- Version
- File format
- Status badge
- Lock indicator where relevant

Recommended hierarchy:

```text
[File icon] Document name                         Status

            DOC-2026-0025 · v1.0 · PDF
````

Requirements:

* Put the status at the top-right of the summary card.
* Use clear separators between reference, version, and file format.
* Do not concatenate values such as `DOC-2026-0025v1.0PDF`.
* Do not repeat the same document identity elsewhere in the drawer.
* Use the existing `StatusBadge`.
* Keep long document names readable without breaking the layout.

# 2. Use card-based detail sections

The current Overview uses flat headings and divider lines. Replace them with the same bordered section-card pattern used in Governance Body Details.

Reuse:

* `.detail-section`
* `.detail-section__head`
* `.detail-section__head--static`
* `.drawer-field-grid`
* `.drawer-field`
* `.drawer-field__label`
* `.drawer-field__value`

Do not maintain a separate flat `.doc-drawer__section` design for ordinary detail information.

Each section must have:

* Rounded bordered card
* Subtle tinted section header
* Uppercase section title
* Structured field body
* Consistent two-column field grid
* Full-width fields where the value is long

## Overview sections

Use these cards:

### Document Summary

Show:

* Document Type
* File Name
* File Format
* File Size
* Version
* Owner
* Created By
* Created
* Last Modified By
* Last Modified

Do not show technical fields such as:

* Content Type
* Workspace Type
* Storage reference
* MIME type
* Current version ID

unless they are genuinely useful to the end user.

### Board Context

Show only when relevant:

* Governance Body
* Related Meeting
* Related Agenda Item
* Related Board Pack
* Other related records

Resolve readable names from registries.

Do not show raw agenda or meeting IDs when a readable title exists.

Hide this complete section when no board context exists.

### Classification

Show only available values:

* Confidentiality
* Effective Date
* Expiry Date
* Acknowledgement Required
* Tags

Do not display empty values as repeated dashes.

Hide fields that have no value.

### Collaboration Summary

Use compact metric or status rows for:

* Open Comments
* Pending Suggestions
* Review Status
* Lock Status

Do not use oversized empty KPI boxes inside the drawer.

If all collaboration values are zero and no workflow is active, either keep the section compact or hide it.

# 3. Fix the drawer tabs

Keep these six functional tabs:

* Overview
* Access
* Workflow
* Versions
* Comments
* Activity

The current tabs wrap into two rows and make the drawer look broken.

Fix them so:

* All tabs remain in one horizontal row.
* Tabs never wrap.
* The row scrolls horizontally when necessary.
* The active tab automatically scrolls into view.
* Count badges remain compact.
* Keyboard navigation still works.
* The content width does not increase the drawer width.

Do not add separate top-level tabs for Board Packs, Acknowledgements, or Related Records.

Keep those features inside Overview or Workflow.

# 4. Restore Edit in Editor / Preview in Editor

The current footer incorrectly replaces the editor action whenever a workflow action exists.

Current broken logic effectively behaves like:

```text
Show workflow action OR show editor action
```

Change it to:

```text
Always show the editor action when the user can view the document
AND show relevant workflow actions separately
```

The editor action must never disappear because the document is:

* Draft
* Under Review
* Changes Requested
* Pending Approval
* Approved
* Published
* Archived

Permissions and lock state may change the label and mode, but the action must remain available for users with `doc_view`.

## Editor action label

Use:

### `Edit in Editor`

When:

* The user has `doc_edit`
* The document is not locked
* The active workspace/provider supports editing for that format

### `Preview in Editor`

When:

* The user has `doc_view`
* The user cannot edit
* The document is locked
* The file format is read-only in the active provider
* The document is approved or published and editing is restricted

For a local PDF viewer that cannot edit original PDF text, use:

`Preview in Editor`

Do not label it `Edit in Editor` unless the provider genuinely supports editing that PDF.

## Editor navigation

Both actions must open:

`/agenda-documents/document-library/:documentId/editor`

Use the existing shared document workspace router.

Do not create a separate Preview modal.

The shared editor route must open the correct workspace for:

* DOC/DOCX/ODT/RTF/TXT
* PDF
* XLS/XLSX/XLSM/CSV/TSV/ODS
* PPT/PPTX/ODP
* Images
* Other supported formats

# 5. Match the original footer button placement

The current custom segmented footer with full-width actions does not match the original detail-drawer footer.

Use the same footer layout as the Governance Body Details drawer.

Requirements:

* Use a natural left-aligned flex row.
* Allow buttons to wrap onto the next row.
* Use the same gap, height, radius, icon size, and typography.
* Do not stretch every button to 50% or 100% width on desktop.
* Do not place a large full-width workflow button at the bottom.
* Do not use a document-specific footer layout.

## Button order

Use this order:

1. Edit in Editor or Preview in Editor
2. Download
3. Save Note
4. Edit Metadata, when allowed
5. Add to Board Pack, when relevant
6. Workflow actions
7. Destructive actions

Examples of workflow actions:

* Request Review
* Request Revision
* Submit for Approval
* Approve
* Reject
* Publish
* Archive

The editor action must always be the first and most prominent action.

Use the primary button style for:

* `Edit in Editor`
* `Preview in Editor`

Keep workflow actions available but do not replace the editor action.

Use existing variants:

* Primary for editor action
* Secondary for safe supporting actions
* Warning or destructive-subtle for Request Revision or Reject
* Existing permission-aware variants for workflow actions

When there are too many actions:

* Keep Edit/Preview, Download, and the current main workflow action visible.
* Move low-priority actions into the existing More menu.
* Do not hide the editor action inside More.

## Mobile footer

On mobile:

* Use a responsive two-column layout or stacked full-width buttons.
* Keep Edit/Preview as the first action.
* Keep the primary action visible without horizontal scrolling.
* Do not allow the footer to cover drawer content.

# 6. Preserve all drawer functionality

Do not remove or break:

* Access management
* Workflow
* Review assignments
* Approval assignments
* Versions
* Version comparison
* Version restore
* Comments
* Replies
* Mentions
* Activity
* Board Pack links
* Acknowledgements
* Related records
* Save to My Notes
* Download
* Permission checks
* Lock rules
* Audit events

Move functionality into the correct section or footer without deleting it.

Every visible action must have a real handler.

Do not add placeholder alerts or no-op buttons.

# 7. Fix the Document Library dashboard cards

The Document Library summary cards currently look inconsistent because they use a page-specific grid that expects five columns while the page now contains four cards.

Remove the page-specific five-column layout.

Use the same shared card component and KPI layout used throughout the system.

Reuse:

* `StatCard`
* The shared dashboard KPI grid or a reusable shared KPI grid component
* Existing `cards.css` tokens and responsive rules

Do not create another Document Library card component.

## Card set

Keep these four cards:

* Total Documents
* Needs My Attention
* Published
* Unresolved Comments

Use four equal columns on normal desktop widths.

Responsive behavior:

* Desktop: four equal cards in one row
* Tablet: two cards per row
* Mobile: two cards per row
* Very narrow mobile: one card per row only when required

## Card appearance

All four cards must use the same:

* Height
* Padding
* Border
* Radius
* Shadow
* Number typography
* Label typography
* Icon size
* Icon container size
* Hover state
* Focus state
* Selected state

Match the cards already used on Overview and My Tasks.

Do not hardcode Document Library-specific card heights, borders, or shadows.

## Card behavior

Make all four cards clickable.

### Total Documents

* Clears card-specific filtering
* Selects All Documents

### Needs My Attention

* Selects Needs My Attention

### Published

* Selects Published

### Unresolved Comments

* Applies a real unresolved-comments filter
* Shows only documents with one or more unresolved comments

The Unresolved Comments card currently has no click handler. Fix it.

All cards must:

* Use the shared interactive-card hover
* Show pointer cursor
* Support Enter and Space
* Show `aria-pressed`
* Toggle off when the selected card is clicked again
* Reset pagination to page 1
* Work with Search, tabs, and other filters

Do not make one card static while the others are interactive.

## Selected state

Use the same selected-card style as other system KPI cards.

Do not use an unusually thick border or heavy background unique to Document Library.

Hover must not replace the selected state.

# 8. CSS cleanup

Remove or stop using document-specific styles that conflict with shared components.

Audit:

* `.doc-lib__cards`
* `.doc-drawer__section`
* `.doc-drawer__section-title`
* `.doc-drawer__field-grid`
* `.doc-drawer__field`
* `.doc-drawer__field-label`
* `.doc-drawer__field-value`
* Custom document footer layout rules
* Any custom tab wrapping rules

Reuse the shared:

* Card grid
* StatCard
* Drawer summary
* Detail sections
* Drawer field grid
* Drawer footer
* TabBar

Do not delete document-specific styles still needed for comments, versions, access, Board Packs, notes, or workflow components.

# 9. Validation

Verify all of the following:

* Add Document modal remains unchanged.
* Document Details matches Governance Body Details visually.
* Drawer width matches the system standard.
* Header contains only Document Details and Close.
* Summary card matches the original drawer component.
* Overview uses bordered section cards.
* Empty sections and fields are hidden.
* Tabs stay in one horizontal row.
* Edit in Editor appears for editable documents.
* Preview in Editor appears for read-only or locked documents.
* The editor action remains visible even when Request Review or Submit for Approval is available.
* PDF documents show Preview in Editor.
* DOCX and editable rich-text documents show Edit in Editor.
* Editable spreadsheets show Edit in Editor.
* Every editor action opens the shared editor route.
* Footer buttons match the original drawer placement.
* Buttons wrap naturally on desktop.
* Footer remains usable on mobile.
* Download still works.
* Save Note still works.
* Workflow actions still work.
* Access, versions, comments, activity, Board Packs, and acknowledgements remain available.
* Document Library uses four equal shared StatCards.
* No empty fifth card column remains.
* All four cards have the same hover and selected behavior.
* Unresolved Comments filters real documents.
* Desktop, tablet, and mobile are tested.
* Light theme, dark theme, font scaling, and EN/BN behavior remain stable.
* The project passes typecheck, tests, and build.

Run:

* `npm run typecheck`
* `npm run test`
* `npm run build`

Fix all failures before completion.

## Golden Rules

* Do not break solved issues.
* Do not change the working Add Document modal.
* Do not redesign the Document Library table.
* Do not remove existing document functionality.
* Do not remove original files, versions, comments, approvals, or audit history.
* Keep only View inside table rows.
* Always keep Edit in Editor or Preview in Editor available in the drawer.
* Use the original detail-drawer component and button placement.
* Reuse the shared StatCard component.
* Do not create page-specific card or drawer systems.
* Respect permissions, lock state, workflow state, and editor capabilities.
* Test desktop, tablet, and mobile.
* Keep the Help icon hidden.
* Do not create User Guide or Help content.

```
```
