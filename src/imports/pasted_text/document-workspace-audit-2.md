Audit and repair Phases 5–8 of the Document Workspace implementation in the current Board Meeting Solution.

Part 1 must already be complete. Preserve its corrected models, routes, Document Library table, original detail-drawer design, repository architecture, and working rich-text editor.

Work directly in the real project.

Your responsibilities:

1. Audit every Phase 5–8 requirement.
2. Mark each item as Pass, Partial, Failed, Broken, or Backend Dependent.
3. Record exact evidence.
4. Fix every failed, partial, or broken frontend requirement.
5. Test real PDF and spreadsheet files.
6. Clearly separate working local features from backend-dependent provider features.
7. Preserve all solved issues and unrelated modules.

Create:

`docs/DOCUMENT_WORKSPACE_PHASE_5_TO_8_AUDIT.md`

Use:

| Phase | Requirement | Status | Evidence | Problem | Fix |
|---|---|---|---|---|---|

Before editing, run:

- `npm run typecheck`
- `npm run test`
- `npm run build`

Record all failures, fix them, and rerun all commands.

# Phase 5 — Comments, versions, workflow, approval, locking, and audit

## 1. One shared comment system

Verify the Document Details drawer and every editor workspace use the same comment registry and data model.

Do not keep disconnected comments inside:

- Drawer-only state
- Editor-only state
- PDF-only state
- Spreadsheet-only state
- Repository-only state invisible to registries

Support:

- Add comment
- Anchored comment
- Reply
- Edit own comment
- Resolve
- Reopen
- Mention
- Assign
- Due date
- Navigate to anchor

Use current users from `useUserRegistry`.

## 2. Comment anchors

Support:

- Rich-text text range
- PDF selected text
- PDF region
- PDF page
- Spreadsheet cell
- Spreadsheet range
- Spreadsheet sheet

Keep legacy anchor fields for compatibility.

Selecting a comment must navigate to the correct:

- Rich-text position
- PDF page and region
- Spreadsheet sheet and cell range

## 3. Versions

Use one existing version registry.

Verify:

- Initial version
- Manual named version
- Review milestone
- Approval milestone
- Publish milestone
- Restore version
- Preview
- Compare
- Download

Restoring a version must:

1. Preserve the current version
2. Create a new version
3. Set `restored_from_version_id`
4. Update the current document version
5. Create an audit event

Never delete newer history.

## 4. Version comparison

Local rich-text comparison should support at least:

- Added text
- Removed text
- Changed text

Clearly label it as text-level comparison.

Spreadsheet comparison may show:

- Changed cells
- Added sheets
- Removed sheets
- Renamed sheets
- Formula or value changes

PDF annotation comparison may show:

- Added annotations
- Removed annotations
- Changed annotations

Do not claim formatting-level or binary-level comparison unless implemented.

## 5. Workflow lifecycle

Verify the real lifecycle:

1. Draft
2. Under Review
3. Changes Requested
4. Pending Approval
5. Approved
6. Published
7. Superseded
8. Archived

Workflow actions must update real document state.

Support:

- Assign reviewer
- Request review
- Request revision
- Submit for approval
- Approve
- Reject
- Publish
- Supersede
- Archive
- Restore

Use existing workflow and approval-rule registries.

## 6. Locking and approval reset

When approval starts:

- Create a version snapshot
- Lock the reviewed version
- Preserve the locked version ID

When a locked or approved document is edited:

- Follow the configured reset rule
- Preserve previous approvals
- Create a new version where required
- Create an audit event
- Return the document to the correct workflow state

Do not silently modify approved content.

## 7. Audit events

Use the real `AuditEvent` schema.

Create meaningful events for:

- Create
- Upload
- Open
- Edit session
- Version created
- Version restored
- Comment created
- Comment resolved
- Shared
- Access changed
- Review requested
- Revision requested
- Approval requested
- Approved
- Rejected
- Published
- Archived
- Download
- Print
- Board Pack link
- Acknowledgement
- PDF annotation
- Spreadsheet workbook change

Do not create an audit event for every keystroke or cell edit.

Batch normal autosave activity into meaningful events.

# Phase 6 — Board Packs, My Tasks, My Notes, templates, and acknowledgements

## 8. Board Pack integration

Verify each Board Pack link stores:

- Board Pack ID
- Document ID
- Document version ID
- Order
- Added by
- Added at
- Link status

Requirements:

- Add a specific document version.
- Preserve that version.
- Do not silently replace it after document updates.
- Show `New version available`.
- Updating the linked version requires an explicit action.
- Every version-link update creates an audit event.

Do not redesign the Board Packs page.

## 9. My Tasks integration

Generate document tasks from real assignments:

- Document review
- Document approval
- Document acknowledgement

Task ownership must use:

- Explicit reviewer
- Explicit approver
- Explicit acknowledgement recipient
- Valid workflow assignment

Do not assign tasks only because a user has a broad role.

Opening a task must follow the approved drawer-first interaction:

1. Open Task Details
2. Show the document task
3. Provide the contextual action
4. Open the document drawer or workspace only after user action

Do not navigate directly from the task table row.

## 10. My Notes integration

Verify Save to My Notes:

- Creates a private note
- Stores document context
- Stores selected text or annotation when available
- Associates the correct owner
- Remains private

Do not mix private notes with shared comments.

## 11. Templates

Verify:

- Templates use `is_template: true`.
- Templates appear in the Templates tab.
- Creating from a template creates a new document.
- The source template remains unchanged.
- Supported placeholders use current meeting, agenda, governance, and user data.
- Names are not permanently hardcoded.

## 12. Acknowledgements

Verify:

- Viewing does not count as acknowledgement.
- Acknowledgement is an explicit action.
- User, document, version, date, and time are recorded.
- Duplicate acknowledgement is prevented.
- The drawer updates immediately.
- My Tasks updates immediately.
- Audit history records the acknowledgement.

# Phase 7 — ONLYOFFICE, permissions, security, responsive behavior, and errors

## 13. Provider architecture

Verify the editor provider abstraction is genuinely used.

The workspace must choose between:

- Local rich-text editor
- Local PDF workspace
- Local spreadsheet workspace
- ONLYOFFICE provider
- Safe unsupported fallback

Do not leave `OnlyOfficeEditorFrame.tsx` disconnected.

## 14. ONLYOFFICE validation

Only mark these as Pass when a real document server and backend callbacks work:

- Real-time collaboration
- Live presence
- Tracked changes
- Office-format fidelity
- Provider comments
- Provider version callbacks
- PDF text editing
- PDF forms
- Digital signatures

A configured URL alone is not proof.

If unavailable:

- Show a clear error
- Provide Retry
- Provide local viewer where available
- Provide Download Original where allowed
- Never show a blank workspace

Do not expose JWT secrets in browser code.

## 15. Permissions

Permission checks must combine:

- Logged-in user
- Assigned role permissions
- Document ownership
- Explicit document access grant
- Workflow assignment
- Confidentiality
- Lock state
- Access expiry

Use these real permission IDs:

- `doc_view`
- `doc_upload`
- `doc_download`
- `doc_edit`
- `doc_comment`
- `doc_review`
- `doc_approve`
- `doc_publish`
- `doc_share`
- `doc_manage_versions`
- `doc_archive`

Remove obsolete permission checks such as:

`document_approve`

Do not treat an active permission definition as automatically granted.

## 16. Restrictions

Enforce:

- Download restrictions
- Print restrictions
- Read-only mode
- Locked approval mode
- Access expiry
- External-user restriction
- Confidential-document access
- Sharing restrictions

Do not only hide buttons. Actions and provider configuration must enforce the restriction.

## 17. Responsive behavior

Test:

- Desktop
- Tablet landscape
- Tablet portrait
- Mobile
- Large font scale
- Light theme
- Dark theme

Do not squeeze desktop sidebars and toolbars into mobile.

Use:

- Collapsible panels on desktop
- Overlay panels on tablet
- Bottom sheets or compact toolbars on mobile

## 18. Error states

Provide working recovery for:

- Missing source file
- Unsupported format
- Conversion failure
- Provider unavailable
- Autosave failure
- Offline
- Reconnecting
- Permission denied
- Locked document
- Version conflict
- Archived document
- Corrupt file
- Session expired

Every state must provide a useful action.

Do not display a blank editor area.

# Phase 8 — PDF and spreadsheet support

## 19. Dependency and compilation audit

Verify all imported packages are declared and compatible with:

- React 18
- TypeScript
- Vite

Known risk:

`SpreadsheetWorkspace.tsx` may import `xlsx` without a declared dependency.

Fix missing or incompatible packages.

Do not suppress compilation errors.

## 20. Format router

Verify one router handles:

- Rich text
- PDF
- Spreadsheet
- Presentation
- Image
- Unsupported

Use:

- Canonical `mime_type`
- File extension fallback

Test canonical and legacy records.

Mapping must include:

### Rich text

- DOC
- DOCX
- ODT
- RTF
- TXT

### PDF

- PDF

### Spreadsheet

- XLS
- XLSX
- XLSM
- CSV
- TSV
- ODS

### Presentation

- PPT
- PPTX
- ODP

Do not keep duplicate old routing logic.

# PDF workspace

## 21. PDF rendering

Use the configured local PDF library properly.

Test with:

- Searchable-text PDF
- Scanned PDF
- Multi-page PDF
- Large PDF
- Corrupt PDF

Verify:

- Rendering
- Correct page count
- Thumbnail rail
- Previous and next page
- Page input
- Zoom in and out
- Fit page
- Fit width
- Rotate
- Smooth page scrolling
- Lazy rendering
- Cancelled obsolete render tasks

Do not render every page at maximum resolution.

## 22. PDF search

Verify:

- Search text across pages
- Result count
- Previous result
- Next result
- Current-result highlight
- Jump to page
- Clear search

For scanned PDFs:

`No searchable text was found in this PDF.`

Do not pretend OCR exists.

## 23. PDF annotations

Every visible annotation tool must implement its real behavior:

- Highlight
- Underline
- Strikeout
- Sticky note
- Free text
- Freehand drawing
- Rectangle
- Arrow
- Undo
- Redo

Do not treat a fixed rectangle created by a generic click as complete annotation support.

Verify pointer interaction works.

Do not leave the annotation layer disabled through incorrect `pointer-events`.

## 24. PDF annotation storage

Store annotations separately from the original PDF.

Verify annotations include:

- Document ID
- Version ID
- Page number
- Type
- Geometry
- Text where relevant
- Created by
- Created date
- Updated date
- Status

Reloading must restore annotations.

Original PDF must remain unchanged.

## 25. PDF comments

Use the shared document comment registry.

Support:

- Text-anchor comment
- Region-anchor comment
- Page comment
- Reply
- Mention
- Assign
- Resolve
- Reopen
- Navigate to page and region

Selecting a comment must highlight the correct location.

## 26. Annotated PDF export

Verify:

- Export creates a new annotated copy
- Original PDF remains unchanged
- Download permission is respected
- Progress is visible
- Failure state is clear
- Audit event is created

Do not claim app discussion threads are embedded as native PDF comments unless they actually are.

## 27. PDF locking

When locked or approved:

- Block annotations where policy requires
- Block edits
- Allow comments only where permitted
- Review the exact locked version

Adding annotations to approved content must either:

- Create a new draft version, or
- Be blocked

Do not silently alter approved PDFs.

# Spreadsheet workspace

## 28. Real spreadsheet engine

Use a genuine spreadsheet engine.

Do not render the workbook as a manually built React table.

Verify the grid is virtualized and supports large workbooks reasonably.

Every visible toolbar button must call a supported API.

Do not use undocumented global functions.

## 29. Import

Test real fixtures:

- XLSX
- XLS
- CSV
- TSV
- ODS
- XLSM

Verify:

- Workbook loads
- Sheet names load
- Multiple sheets load
- Values load
- Supported formulas load
- Basic formatting loads
- Merged cells load
- Row heights load where supported
- Column widths load where supported
- Original file remains preserved

Show conversion warnings when unsupported features exist.

## 30. Sheet operations

Verify:

- Add sheet
- Rename sheet
- Duplicate sheet
- Reorder sheet
- Delete sheet with confirmation
- Switch active sheet
- Preserve active sheet after reload

## 31. Cell editing

Verify:

- Cell selection
- Range selection
- Cell editing
- Formula editing
- Formula calculation
- Formula bar
- Name box
- Copy
- Paste
- Undo
- Redo
- Find
- Navigate to match

## 32. Formatting

Verify working controls:

- Bold
- Italic
- Underline
- Font
- Font size
- Text color
- Cell background
- Borders
- Horizontal alignment
- Vertical alignment
- Wrap text
- Number format
- Currency
- Percentage
- Date format
- Merge
- Unmerge

Do not display controls that do nothing.

## 33. Rows and columns

Verify:

- Insert row
- Delete row
- Insert column
- Delete column
- Row height
- Column width
- Freeze row
- Freeze column
- Sort
- Filter

## 34. Spreadsheet comments

Use the shared document comment registry.

Support:

- Cell comment
- Range comment
- Sheet comment
- Reply
- Mention
- Assign
- Resolve
- Reopen
- Jump to cell or range

Selecting a comment must:

- Open the correct sheet
- Select the correct range
- Scroll it into view

## 35. Autosave and versions

Verify:

- Workbook state saves to IndexedDB
- Autosave is debounced
- Reload restores the workbook
- Autosave does not create a version for every cell
- Save Version creates a snapshot
- Review creates a milestone version
- Approval creates a milestone version
- Restore creates a new version
- Version metadata includes sheet count and change summary

## 36. Export and print

Verify:

- Download Original
- Export current workbook as XLSX
- Export selected sheet as CSV
- Download historical version
- Print current sheet
- Print selected range where supported

Respect:

- Download permission
- Print permission
- Lock state
- Confidentiality

Warn when local export cannot preserve unsupported workbook features.

Do not claim pixel-perfect Excel round-tripping.

## 37. Spreadsheet safety

Never execute:

- VBA
- Macros
- Add-ins
- DDE
- External scripts
- Power Query
- External data connections

XLSM requirements:

- Preserve original file
- Show macro warning
- Never run macros

CSV and TSV requirements:

- Reject executable signatures
- Reject binary files with unexpected NUL bytes
- Reject HTML renamed as CSV
- Handle formula-injection risks
- Treat dangerous external formulas as text unless explicitly trusted

## 38. Upload validation

Audit accepted formats, helper text, filters, and validation rules.

A format must have:

- Extension validation
- MIME validation
- Signature or container validation
- Workspace behavior
- Safe fallback

Align support for:

- PDF
- DOC
- DOCX
- ODT
- RTF
- TXT
- XLS
- XLSX
- XLSM
- CSV
- TSV
- ODS
- PPT
- PPTX
- ODP where supported

Do not show unsupported formats in the UI.

# Test fixtures

Use small valid fixtures for:

- DOCX
- Searchable PDF
- Scanned PDF where practical
- Multi-sheet XLSX with formulas
- XLS
- CSV
- TSV
- ODS
- XLSM
- Corrupt file
- Executable renamed as a supported file
- HTML renamed as CSV

Do not test only empty files with changed extensions.

# Final system validation

After all fixes, run:

- `npm run typecheck`
- `npm run test`
- `npm run build`

All must pass.

Manually verify:

- Existing document records remain intact.
- Uploaded files survive reload.
- Rich-text editing still works.
- PDF opens the PDF workspace.
- Spreadsheet opens the spreadsheet workspace.
- Presentations use the provider or safe preview.
- Unsupported files show a safe fallback.
- The Document Library table remains unchanged visually.
- Row click and View open the same drawer.
- The drawer still follows the original design from Part 1.
- No actions appear in the drawer header.
- Footer button placement remains correct.
- Comments are shared between drawer and workspaces.
- Versions are preserved.
- Workflow actions update real state.
- Permissions use the logged-in user.
- Board Pack links preserve versions.
- My Tasks receives real document assignments.
- My Notes remains private.
- Help remains hidden.
- No User Guide content exists.

# Delivery requirements

Deliver:

1. `docs/DOCUMENT_WORKSPACE_PHASE_5_TO_8_AUDIT.md`
2. Before-and-after status for every Phase 5–8 requirement
3. Fixed implementation
4. Updated dependencies
5. Updated upload validation
6. Real test fixtures
7. Updated tests
8. A final list of backend-dependent capabilities that cannot honestly be marked complete

Do not claim the complete eight-phase system is finished until:

- Runtime behavior works
- Typecheck passes
- Tests pass
- Production build passes
- Real PDF fixtures work
- Real spreadsheet fixtures work
- Permissions and workflows work
- Backend-dependent items are clearly identified

## Golden Rules

- Do not break Part 1.
- Do not change unrelated modules.
- Do not remove document records.
- Do not overwrite original files.
- Do not delete version or audit history.
- Do not redesign the Document Library table.
- Keep only View inside table rows.
- Preserve the original detail-drawer design and footer placement.
- Do not place actions in the drawer header.
- Do not fake collaboration capabilities.
- Do not fake PDF tools.
- Do not fake spreadsheet toolbar actions.
- Do not execute macros or external workbook automation.
- Do not grant permissions globally.
- Do not hide TypeScript errors with unsafe casts.
- Test desktop, tablet, and mobile.
- Keep EN/BN parity.
- Keep the Help icon hidden.
- Do not create User Guide or Help content.