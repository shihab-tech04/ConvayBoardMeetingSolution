Refine the current Document Library and document workspaces without breaking any working document, table, editor, upload, collaboration, workflow, permission, version, Board Pack, My Tasks, or My Notes functionality.

Study the current project before changing anything. Work with the existing implementation rather than creating a separate document module.

The current project already contains:

- `DocumentLibraryPage.tsx`
- `DocumentDetailsDrawer.tsx`
- `DocumentEditorPage.tsx`
- `DocumentWorkspaceRouter.tsx`
- Local Tiptap document editing
- PDF workspace components
- Spreadsheet workspace components
- `UnifiedDataTable`
- `ResponsiveOverlay`
- IndexedDB document storage
- Secure file validation
- Comments
- Versions
- Workflow and approvals
- Board Pack links
- My Notes integration
- My Tasks integration
- Existing document registries and permissions

Preserve all of these foundations.

# Main objectives

1. Replace the separate New Document and Upload Document forms with one clear Add Document flow.
2. Organize the form into icon-based collapsible sections.
3. Reduce and simplify the Document Library tabs.
4. Make every file type use the same editor shell and visual system as the current Docs editor.
5. Rebuild Document Details using the project’s original detail-drawer component, layout, tabs, and footer button placement.
6. Fix and preserve responsive behavior for desktop, tablet, and mobile.

# 1. Replace the three document actions with one Add Document action

The current header contains:

- New Document
- Upload Document
- Create from Template

Replace these with one primary action:

`Add Document`

Use the existing primary button style and a suitable `FilePlus` icon.

Clicking Add Document must open one shared modal:

`Add Document`

Create a reusable component such as:

`src/app/components/documents/DocumentComposerModal.tsx`

Remove the separate visible New Document, Upload Document, and Create from Template modals after their functionality has been migrated.

Do not delete the underlying working logic. Consolidate it.

## Document source selector

At the top of the modal, show three compact selectable options:

- Blank Document
- Upload File
- Use Template

Use icons:

- Blank Document: `FilePlus`
- Upload File: `UploadCloud`
- Use Template: `LayoutTemplate`

Use a compact segmented-card or icon-tab treatment.

Do not use oversized cards.

The selected source must control the form content through progressive disclosure.

## Blank Document behavior

Show only fields relevant to creating an editable blank document.

Required:

- Document Name
- Document Type

Optional:

- Owner
- Description
- Related Meeting
- Related Agenda
- Confidentiality

Creating the document must preserve the current behavior:

1. Create document metadata
2. Create empty IndexedDB editor content
3. Create version 1.0
4. Create an audit event
5. Open the document editor or Document Details drawer according to the existing flow

## Upload File behavior

Show the secure file uploader first.

Preserve all existing:

- Extension validation
- MIME validation
- Signature validation
- Office-container validation
- Disguised executable detection
- Maximum file size
- Original-file preservation
- Format routing

After selecting a file:

- Automatically derive the document name from the file name
- Allow the user to edit the document name
- Detect and display the file format
- Display the file size as read-only information
- Do not ask the user to manually type information already available from the file

Required:

- Document File
- Document Name
- Document Type

Optional:

- Owner
- Description
- Related Meeting
- Related Agenda
- Confidentiality

Do not show manually editable fields for:

- Original file name
- MIME type
- File size
- Workspace type
- Version
- Storage reference
- File format when it is already detected

After upload:

1. Validate the file
2. Preserve the original file in IndexedDB
3. Create metadata
4. Create version 1.0
5. Create an audit event
6. Open the correct Document Details drawer or editor workspace

## Use Template behavior

Move the current Create from Template functionality into the same Add Document modal.

Show:

- Template
- Document Name
- Related Meeting
- Related Agenda, when applicable
- Owner

Only show placeholder fields that are used by the selected template.

Do not display all placeholder fields for every template.

Creating from a template must:

- Create a new independent document
- Preserve the source template
- Resolve supported placeholders
- Create version 1.0
- Store editor content
- Create an audit event
- Open the editor or drawer

# 2. Organize the Add Document form into collapsible sections

Create or reuse a shared collapsible form-section component.

Suggested component:

`CollapsibleFormSection`

Each section must contain:

- One relevant icon
- Section title
- Optional one-line description
- Expand or collapse control
- Accessible `aria-expanded`
- Keyboard support
- Smooth but subtle transition

Do not place icons beside every field.

Use icons only for section headers and source selection.

## Section structure

### A. Source

Icon: `FileInput`

Contains:

- Blank Document
- Upload File
- Use Template

This section should remain expanded.

### B. Document Details

Icon: `FileText`

Contains only relevant fields:

- Document Name
- Document Type
- Owner
- Description

Keep this section expanded by default.

Use the current user as the default owner.

Use a real user selector if the existing permission model allows choosing another owner. Do not use a free-text owner field when user data is available.

### C. Board Context

Icon: `Landmark` or `CalendarRange`

Contains:

- Related Meeting
- Related Agenda Item
- Governance Body only when needed

Keep this section collapsed by default unless the selected template requires meeting context.

Behavior:

- Filter Related Agenda options by the selected meeting
- Resolve Governance Body from the selected meeting where possible
- Do not require the user to enter the same context more than once
- Do not use a free-text agenda ID when a real agenda selector exists

### D. Classification and Access

Icon: `ShieldCheck`

Contains:

- Confidentiality
- Acknowledgement Required
- Tags, only if tags are used elsewhere in the system

Keep this section collapsed by default.

### E. Lifecycle

Icon: `CalendarClock`

Contains:

- Effective Date
- Expiry Date

Only show this section for document types where these fields are meaningful, such as policies, charters, circulars, and controlled documents.

Do not show Effective Date and Expiry Date for every ordinary meeting attachment.

## Remove unnecessary fields

Do not display fields simply because they exist in the document model.

Hide system-generated or technical fields from the form.

Avoid showing:

- Version
- Approval Status
- Workflow Status
- Current Version ID
- Content Type
- Workspace Type
- Original File Reference
- MIME Type
- File Size as an editable field
- Storage keys
- Comment counts
- Suggestion counts
- Lock metadata
- Audit metadata

These values must continue to be generated and stored by the system.

## Modal behavior

Use the existing `AppModal`.

Desktop:

- Medium or large modal width
- Fixed header
- Scrollable body
- Fixed footer
- Cancel on the left or secondary position
- Add Document as the final primary button

Mobile:

- Full-width or existing mobile modal behavior
- One-column form
- Sticky header
- Scrollable body
- Sticky footer
- At least 44px tap targets
- Collapsible section headers remain easy to tap
- Do not allow the footer to cover the final form field

Preserve entered values when expanding or collapsing sections.

Changing the source type should not delete values unnecessarily.

# 3. Simplify the Document Library tabs

The current table has too many tabs:

- All Documents
- My Documents
- Shared With Me
- Awaiting My Review
- Draft
- Under Review
- Approved
- Published
- Archived
- Templates

This creates visual clutter and duplicates filters and summary cards.

Replace them with these five primary tabs:

1. All Documents
2. My Documents
3. Needs My Attention
4. Published
5. Archived

## Tab behavior

### All Documents

Show every non-template document the user can access.

### My Documents

Show documents owned or created by the current user.

### Needs My Attention

Combine documents where the current user has a real pending action:

- Review assignment
- Approval assignment
- Acknowledgement requirement
- Assigned unresolved comment
- Requested revision

Do not include every Under Review document unless the current user is assigned to it.

### Published

Show published documents.

### Archived

Show archived documents.

## Move removed tab functions elsewhere

Do not remove access to the underlying records.

Move the removed classifications into filters:

- Shared With Me → Access filter
- Draft → Status filter
- Under Review → Status filter
- Approved → Status filter
- Templates → Add Document > Use Template

Keep summary cards as quick filters where useful.

The status filter should include:

- Draft
- Under Review
- Changes Requested
- Pending Approval
- Approved
- Published
- Superseded
- Archived

Add an Access filter:

- All Accessible
- Owned by Me
- Shared With Me

## Preserve old URL state

The existing URL may contain old tab IDs.

Map old values safely:

- `shared` → All Documents with Shared With Me access filter
- `awaiting-review` → Needs My Attention
- `under-review` → All Documents with Under Review status filter
- `draft` → All Documents with Draft status filter
- `approved` → All Documents with Approved status filter
- `templates` → All Documents or open the Add Document modal with Use Template selected

Do not leave old links broken.

## Tab requirements

Every remaining tab must:

- Filter real live data
- Show a dynamic count
- Work with Search
- Work with Filters
- Work with summary-card filters
- Reset pagination
- Preserve state after opening and closing the drawer
- Preserve state after returning from an editor
- Scroll horizontally on small screens without wrapping

# 4. Create one shared editor shell for every file type

The current Docs editor is the approved visual reference.

Do not redesign the Docs editor.

The current PDF workspace uses a separate, unfinished visual system and appears broken. Replace the separate PDF layout with the same editor shell used by the Docs editor.

Do not force every file format into Tiptap. Use the correct format-specific engine inside one shared shell.

Create or extract:

`src/app/components/documents/editor/DocumentEditorShell.tsx`

The shared shell must be used by:

- Rich-text documents
- PDF documents
- Spreadsheets
- Presentations
- Images
- Read-only supported files

## Shared editor shell structure

Every format must use:

1. Editor header
2. Optional information or conversion banner
3. Format-specific toolbar
4. Left icon rail and optional panel
5. Main content canvas
6. Right icon rail and optional collaboration panel
7. Bottom status bar

The file type may change the toolbar and canvas, but not the application shell.

## Shared editor header

Follow the current Docs editor exactly.

Left:

- Back button
- File-type icon
- Editable or read-only document title
- Version

Center:

- Save state
- Editing or viewing mode
- Lock state

Right:

- Comments
- Versions
- Workflow or approval
- Share
- Save Version where supported
- More menu

Do not create a separate unstyled PDF title area.

## Shared side rails

Left panel options may include:

- Outline for text documents
- Page thumbnails for PDFs
- Sheets or workbook navigation where needed
- Slide thumbnails for presentations
- Bookmarks

Right panel options:

- Comments
- Versions
- Workflow
- Activity
- Access where appropriate

Only one panel should be open at a time.

## Shared bottom status bar

Use the same height and styling for every file type.

Examples:

Text:

- Word count
- Character count
- Zoom
- Online state
- Provider

PDF:

- Page X of Y
- Zoom
- Annotation state
- Online state
- Provider

Spreadsheet:

- Active sheet
- Selected range
- Sum, average, or count where supported
- Zoom
- Save state
- Provider

# 5. Fix the PDF workspace inside the shared editor shell

Update the current PDF components under:

`src/app/components/documents/pdf/`

The PDF workspace must not render its own separate page header or unrelated layout.

It must provide only:

- PDF toolbar content
- Thumbnail panel content
- Main PDF canvas
- Comments panel content
- PDF status-bar information

The shared `DocumentEditorShell` must provide the surrounding UI.

## PDF layout

Desktop:

- Left thumbnail rail or collapsible thumbnail panel
- Centered readable PDF pages
- Right comments, versions, workflow, and activity panels
- Main PDF page should use a readable width
- Thumbnails must stay on the left, not in the center of the workspace

Tablet:

- Thumbnail panel opens as an overlay
- Right panels open as overlays
- Toolbar scrolls horizontally

Mobile:

- PDF page fits the available width
- Page navigation remains usable
- Search remains usable
- Comments open in the existing bottom sheet
- Annotation tools use a compact secondary toolbar or bottom sheet
- No page-level horizontal overflow

## PDF toolbar

Match the current Docs toolbar height, border, icon sizing, hover, selected states, and spacing.

Keep only tools that genuinely work.

Required working controls:

- Previous page
- Next page
- Page number
- Zoom out
- Zoom in
- Fit width
- Fit page
- Rotate
- Search
- Select text
- Pan
- Supported annotations
- Download
- Print where permitted

Hide broken or incomplete tools instead of showing non-functional buttons.

## PDF error states

Provide a styled editor-shell state for:

- Missing file
- Invalid PDF
- Password-protected PDF
- Loading failure
- No searchable text
- Annotation save failure

Never display an empty white workspace or raw unstyled text.

# 6. Apply the same editor shell to spreadsheets and other formats

Update:

- `DocumentWorkspaceRouter.tsx`
- `DocumentEditorPage.tsx`
- Spreadsheet components
- ONLYOFFICE frame
- Presentation and unsupported-file states

The router should choose the correct canvas inside the shared shell.

## Rich text

Keep the current Tiptap editor appearance and behavior unchanged.

## Spreadsheet

Use the same header, side panels, collaboration panels, and status bar.

The grid remains the central canvas.

Sheet tabs may remain at the bottom of the spreadsheet canvas.

Do not create a separate visual brand.

## Presentation

When ONLYOFFICE is configured, mount the provider inside the same editor shell.

When it is not configured:

- Use a styled preview or safe fallback inside the shared shell
- Provide Download Original where permitted
- Do not show an unstyled unsupported page

## Images

Use the shared shell with:

- Image canvas
- Zoom
- Rotate
- Comments
- Versions
- Workflow
- Download

## Unsupported formats

Use the shared shell and show a clear centered state:

- File type
- Reason it cannot be edited
- Preview when available
- Download Original where permitted
- Return to Library

Do not navigate to a completely different design.

# 7. Rebuild Document Details using the original drawer component

The current `DocumentDetailsDrawer.tsx` uses:

- A custom 580px drawer
- A custom document header
- Header action buttons
- Nine top-level tabs
- No standard fixed action footer

Replace this custom shell with the project’s original detail-drawer structure.

Use:

- `ResponsiveOverlay`
- Default desktop width of 480px
- Standard header
- `.drawer-summary`
- `.detail-section`
- `.drawer-field-grid`
- `.drawer-action-footer`
- Existing drawer footer button styles
- Existing mobile drawer behavior

Do not redesign other drawers.

## Drawer header

The header must contain only:

- `Document Details`
- Standard close button

Remove from the header:

- File preview button
- Save Note
- Download
- Open Editor
- Status actions
- Board Pack actions

## Summary block

Place document identity inside the body using the existing `.drawer-summary` pattern.

Show:

- File-type icon
- Document name
- Document reference
- Version
- Status
- Confidentiality or lock state where relevant

Do not duplicate these values elsewhere.

## Reduce drawer tabs

Replace the current nine tabs with six:

1. Overview
2. Access
3. Workflow
4. Versions
5. Comments
6. Activity

Move existing features rather than deleting them.

### Overview

Include:

- Document summary
- File information
- Board context
- Related meeting and agenda
- Related records
- Board Pack links
- Classification
- Collaboration summary

### Access

Keep access grants and sharing.

### Workflow

Include:

- Workflow stage
- Review
- Approval
- Acknowledgements
- Lock state
- Workflow assignments

### Versions

Keep complete version history.

### Comments

Keep shared comments.

### Activity

Keep audit history.

Remove separate top-level tabs for:

- Board Packs
- Acknowledgements
- Related

Their functionality must remain inside Overview or Workflow.

## Drawer footer

All document actions must use the original fixed footer.

Use:

`drawer-action-footer`

### Safe-action row

Show relevant actions such as:

- Edit Metadata
- Download
- Save to My Notes
- Add to Board Pack

When more than three safe actions are available, keep the most important actions visible and place low-priority actions inside the existing More menu.

### Divider

Use:

`drawer-action-footer__divider`

### Workflow row

Place:

- Reject or Request Revision on the left when applicable
- One primary action as the final button on the right

The primary action should depend on document state and format.

Examples:

- Open Editor
- Open PDF
- Open Spreadsheet
- Open Presentation
- View Document
- Request Review
- Request Approval
- Approve
- Publish

Rules:

- Only one primary button at a time
- The primary action is always the final button
- Reject uses the existing destructive style
- Do not show duplicate actions in the body
- Do not place actions above the tabs
- Respect existing permission and workflow rules

## Fix current drawer logic

Replace the no-op:

`handleStatusChange`

with real workflow state updates.

Determine the primary action through:

- `getDocumentWorkspaceType`
- Document permissions
- Workflow state
- Lock state
- File availability

Do not determine it only from `content_type`.

Every visible drawer button must have a real handler.

# 8. Preserve all existing document functionality

Do not break:

- Existing document records
- Existing table data
- Search
- Filters
- Pagination
- Summary-card filtering
- Row click
- View action
- Mobile table cards
- URL state
- IndexedDB files
- Rich-text editor content
- DOCX conversion
- PDF rendering
- Spreadsheet import
- Comments
- Mentions
- Versions
- Version restore
- Workflow
- Approvals
- Acknowledgements
- Audit events
- Board Pack links
- My Tasks
- My Notes
- Access grants
- File security
- Download and print restrictions
- ONLYOFFICE provider support

Do not change APIs, routes, registries, permission IDs, or storage keys unless required for safe compatibility.

# 9. Mobile requirements

Apply every change to mobile.

## Document Library

- Header actions must not overflow
- Add Document becomes the single primary action
- Summary cards remain in the approved responsive grid
- Tabs scroll horizontally
- Search and Filter remain in one row
- Mobile cards remain fully clickable
- Do not add a View Details button inside cards

## Add Document modal

- Use one-column layout
- Sections collapse and expand cleanly
- Keep Source and Document Details expanded
- Keep optional sections collapsed
- Use the current mobile modal behavior
- Keep footer actions visible
- Do not allow nested page scrolling

## Document Details drawer

- Use the project’s original mobile drawer or bottom sheet
- Header contains only title and close
- Tabs scroll horizontally
- Body scrolls
- Footer stays visible
- Buttons meet 44px tap-target requirements
- Do not use the current custom wide document drawer on mobile

## Editor workspaces

- Keep one shared editor shell
- Use compact header controls
- Move secondary actions into More
- Toolbars scroll horizontally or open in bottom sheets
- Left and right panels open as overlays
- PDF pages fit mobile width
- Spreadsheet grid handles its own canvas scrolling
- No page-level horizontal overflow
- Preserve comments, versions, and workflow access

# 10. CSS cleanup

Use these files as the main style locations:

- `src/styles/doc-library.css`
- `src/styles/document-editor.css`
- `src/styles/documents.css`
- `src/styles/drawers.css`

Remove or stop using obsolete styles for:

- Separate New Document modal
- Separate Upload Document modal
- Custom PDF page header
- Custom PDF workspace shell
- Custom 580px document drawer
- Document drawer header action strip
- Nine-tab document drawer layout

Do not remove styles still used by working components.

Reuse existing theme tokens.

Do not introduce a new color system.

# 11. Validation checklist

Verify:

- The page displays one Add Document action.
- Add Document supports Blank, Upload, and Template.
- Separate New Document and Upload Document forms no longer exist.
- The form shows only relevant fields.
- Form sections use icons and collapse controls.
- Optional sections are collapsed by default.
- Related Agenda depends on Related Meeting.
- Uploaded file metadata is detected rather than manually entered.
- Existing uploads remain secure.
- The table has only five primary tabs.
- Every remaining tab filters real data.
- Removed tab functions remain available through filters or Add Document.
- Existing URL tab links are migrated safely.
- The Docs editor remains visually unchanged.
- PDF uses the same editor shell.
- Spreadsheet uses the same editor shell.
- Presentation, image, and fallback views use the same editor shell.
- PDF thumbnails appear on the left.
- PDF pages render at a readable size.
- PDF toolbar matches the Docs toolbar.
- Broken PDF tools are fixed or hidden.
- Document Details uses the original 480px drawer.
- Drawer header contains only Document Details and Close.
- Drawer uses six tabs.
- Board Pack, acknowledgement, and related-record functionality remain available.
- Drawer actions appear only in the fixed footer.
- Only one primary footer action appears.
- Workflow buttons update real state.
- Table, drawer, editor, comments, versions, and workflow still work.
- Desktop, tablet, and mobile are fully tested.
- Light theme, dark theme, font scaling, and EN/BN behavior remain stable.
- The project builds without TypeScript errors.
- Existing tests pass.
- Add tests for the consolidated form, reduced tabs, shared editor shell, PDF layout, drawer structure, footer placement, and mobile behavior.

Run:

- `npm run typecheck`
- `npm run test`
- `npm run build`

Fix all failures before completion.

## Golden Rules

- Do not break solved issues.
- Do not change unrelated files.
- Do not remove working document features.
- Do not delete original uploaded files.
- Do not delete versions, comments, approvals, acknowledgements, or audit history.
- Preserve the approved Document Library table.
- Keep only View inside table rows.
- Use one Add Document flow.
- Use one shared editor shell for every format.
- Keep the current Docs editor as the visual reference.
- Use the original detail-drawer component and footer placement.
- Do not place actions in the drawer header.
- Respect existing permissions, workflow, and lock rules.
- Test desktop, tablet, and mobile.
- Keep EN/BN parity.
- Keep the Help icon hidden.
- Do not create User Guide or Help content.