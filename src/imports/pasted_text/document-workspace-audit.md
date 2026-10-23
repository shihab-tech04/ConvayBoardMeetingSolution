```text
Audit and repair the complete eight-phase Document Workspace implementation in the current Board Meeting Solution.

Work directly in the current project. Inspect the actual code, dependencies, routes, data models, registries, IndexedDB storage, UI behavior, permissions, tests, and runtime output.

Do not trust comments, filenames, archived reports, or documents that claim a phase is complete. A component existing in the project does not mean the feature works.

Your job is to:

1. Audit every requirement from Phases 1–8.
2. Mark each requirement as Pass, Partial, Failed, Broken, or Backend Dependent.
3. Provide exact evidence for every result.
4. Fix every failed, partial, or broken frontend requirement.
5. Retest the complete document workflow.
6. Preserve all solved issues and unrelated modules.

Do not only create an audit report. Complete the missing implementation.

# Current implementation to inspect

Audit all document-related files, including:

- `src/app/pages/agenda-documents/DocumentLibraryPage.tsx`
- `src/app/pages/agenda-documents/DocumentEditorPage.tsx`
- `src/app/pages/register-stock/TaxRegistryPage.tsx`
- `src/app/components/documents/DocumentDetailsDrawer.tsx`
- `src/app/components/documents/DocumentWorkspaceRouter.tsx`
- `src/app/components/documents/editor/DocumentEditorProvider.ts`
- `src/app/components/documents/editor/OnlyOfficeEditorFrame.tsx`
- `src/app/components/documents/pdf/*`
- `src/app/components/documents/spreadsheet/*`
- `src/app/services/types/documents.ts`
- `src/app/services/repositories/documentRepository.ts`
- `src/app/services/repositories/localDocumentRepository.ts`
- `src/app/services/repositories/apiDocumentRepository.ts`
- `src/app/services/repositories/documentContentStore.ts`
- `src/app/services/endpoints/documents.ts`
- `src/app/data/documentWorkspaceData.ts`
- Document types and registries in `boardMeetingData.ts`
- `src/app/utils/normalizeBoardDocument.ts`
- `src/app/utils/documentFormat.ts`
- `src/app/components/forms/AppFileUpload.tsx`
- `src/app/actions/resolvers/documentActions.ts`
- `src/app/data/permissions.ts`
- Document-related My Tasks logic
- Board Pack document integration
- My Notes integration
- Document-related styles and tests
- `package.json`

# Audit method

Before changing code:

1. Install or resolve all declared dependencies.
2. Run:
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
3. Record every failure related to the document workspace.
4. Test the features through the actual interface.
5. Create:

`docs/DOCUMENT_WORKSPACE_PHASE_AUDIT.md`

Use this structure:

| Phase | Requirement | Status | Evidence | Problem | Fix |
|---|---|---|---|---|---|

Do not mark a feature as passed based only on:

- A component file existing
- A button being visible
- A comment saying it is implemented
- A mock success message
- A test that does not exercise the real behavior
- Backend-dependent functionality without a connected backend

After completing the fixes, update the same report with final results and test evidence.

# Known risk areas that must be verified

The current project contains several likely incomplete or conflicting implementations. Verify and fix them rather than ignoring them.

## Dependency and compilation risks

- `SpreadsheetWorkspace.tsx` imports `xlsx`, but `xlsx` is not currently declared in `package.json`.
- Confirm every imported package is installed and compatible with React 18, TypeScript, and Vite.
- Remove imports or code paths that are no longer used.
- Do not suppress TypeScript errors with unsafe casts.
- Fix document-related model and test mismatches rather than excluding tests.

## Document-format field mismatch

The canonical document MIME field is currently:

`mime_type`

Some format utilities and tests refer to:

`file_mime`

Fix this inconsistency.

Requirements:

- Use `mime_type` as the canonical field.
- Support `file_mime` only as a legacy alias inside normalization.
- `getDocumentWorkspaceType` must read the canonical value first.
- Macro detection must use the same canonical value.
- Tests must verify both canonical and legacy records.
- Do not add two competing MIME fields to new records.

## Document Library tab logic

The current `My Documents` and `Shared With Me` tab matchers appear to return all records.

Fix them using real ownership and access data.

- My Documents: documents owned or created by the current user.
- Shared With Me: documents with an explicit access grant for the current user or their allowed group/role, excluding documents already classified as My Documents where appropriate.
- Awaiting My Review: documents where the current user is an assigned reviewer.
- Counts must use live filtered data.
- Tabs must not be decorative.

## Upload-format mismatch

The current Document Library format list and upload `accept` values do not fully include the formats introduced in Phase 8.

Audit and align:

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

A format must not appear in the UI unless it has a real validation rule and a defined workspace behavior.

## Split document data sources

The current library uses `useDocumentRegistry`, while `LocalDocumentRepository` maintains another document list under a separate local-storage key.

Prevent document metadata from splitting across two independent stores.

There must be one authoritative source for current document metadata.

Use:

- Existing document registry for current frontend metadata
- IndexedDB for original files, editor content, workbook state, PDF annotations, and version snapshots
- Repository adapters as an abstraction over those sources

Do not allow a document created through one path to be invisible to another path.

## Permission problems

Do not treat a permission as granted simply because an active permission definition exists in the system.

Permission checks must use:

- Current logged-in user
- Current user role
- Assigned role permissions
- Explicit document access grants
- Document ownership
- Workflow assignment
- Confidentiality
- Lock state

Fix the document action resolver so it uses the actual permission IDs:

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

Remove the obsolete check for:

`document_approve`

Use the current shared action resolver instead of maintaining disconnected action logic inside the drawer.

## Data-schema consistency

Audit all document code against the real interfaces.

Examples that must be consistent:

- `doc_name`, not an undeclared `title`
- `version_number`, not an undeclared `version` on `DocumentVersion`
- `change_summary`, not an undeclared `label`
- `timestamp`, not an undeclared `occurred_at` on `AuditEvent`
- All required audit-event fields must be provided
- `mime_type`, not `file_mime`

Do not hide schema errors with broad `Record<string, unknown>` casts.

# Phase 1 audit — foundation, models, storage, and routes

Verify and fix:

## Canonical document model

`normalizeBoardDocument` must support legacy aliases while returning one canonical model.

Legacy mapping must include:

- `document_name` → `doc_name`
- `document_type` → `doc_type`
- `meeting_id` → `related_meeting`
- `agenda_id` → `related_agenda`
- `ack_required` → `acknowledgement_required`
- `file_mime` → `mime_type`

It must preserve every existing document.

Add and normalize the optional format-specific fields required by later phases:

- `workspace_type`
- `page_count`
- `sheet_count`
- `active_sheet_id`
- `has_annotations`
- `annotation_count`
- `has_macros`
- `has_external_links`
- `conversion_warning`

## Route compatibility

Confirm:

- `/agenda-documents/document-library` opens the dedicated Document Library.
- `TaxRegistryPage.tsx` remains only a compatibility wrapper.
- `/agenda-documents/document-library/:documentId/editor` opens the correct workspace.
- Existing redirects still work.
- Returning from the editor restores the library state.

## Storage

Confirm:

- Metadata remains lightweight.
- Original files are stored in IndexedDB.
- Rich-text content is stored in IndexedDB.
- Spreadsheet workbook state is stored in IndexedDB.
- PDF annotations are stored in IndexedDB.
- Version snapshots are stored in IndexedDB.
- Large content is not stored in localStorage.
- Original files are never overwritten.

## Repository

Confirm the local and API repositories implement the same contract.

The local repository must not create a disconnected duplicate document list.

## API client

Verify:

- Existing JSON calls still work.
- `FormData` uploads work.
- The browser does not manually set `Content-Type` for `FormData`.
- API errors are typed.
- No backend secret is exposed in frontend environment variables.

# Phase 2 audit — Document Library

Verify the Document Library uses the approved system design and working data.

## Table

Use only `UnifiedDataTable` imported through:

`src/app/components/tables/index.ts`

Preserve:

- One continuous table card
- Search
- Filters
- Tabs
- Applied-filter chips
- Pagination
- Row hover
- Mobile cards
- Row click
- One View action
- Detail drawer opening

Do not redesign the approved table.

## Summary cards

Verify the cards use live values:

- Total Documents
- Awaiting My Review
- Under Review
- Published
- Unresolved Comments

Clicking a card must filter the table and show a selected state.

## Functional tabs

Verify all tabs use real filtering and live counts:

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

Search, filters, summary cards, tabs, and pagination must work together.

## URL state

Verify the URL preserves:

- Search
- Active tab
- Filters
- Page
- Page size
- Open drawer record

Opening and closing the drawer must not erase other URL state.

## Create and upload flows

Verify:

- Blank Document creates metadata, content, version 1.0, and an audit event.
- Create from Template produces a new independent document.
- Upload stores the original file and creates version 1.0.
- Related meetings and agenda items use real selectors.
- Unsupported formats do not display an Edit action.
- Uploaded documents remain available after reload.

# Phase 3 audit — Document Details drawer

The Document Library detail drawer must follow the original system drawer design exactly.

Do not keep the current custom document header or header action strip.

Use the same structure and styling as:

- `ResponsiveOverlay`
- `DynamicDetailsDrawer`
- `SpecialRegistrationDrawer`
- The existing `.drawer-summary`
- The existing `.detail-section`
- The existing `.drawer-field-grid`
- The existing `.drawer-action-footer`

## Required drawer shell

Use:

- Standard right-side drawer on desktop
- Existing bottom-sheet behavior on mobile
- Standard desktop width of 480px
- Standard backdrop
- Standard header padding
- Standard close button
- Standard body padding
- Standard fixed footer
- Existing theme tokens

Do not hardcode a separate 580px document drawer.

## Header

The header must contain only:

- `Document Details`
- Standard close button on the top-right

Do not place these in the header:

- Open Editor
- Download
- Save Note
- Workflow actions
- Board Pack actions

## Summary block

Place the document summary inside the drawer body using the existing `.drawer-summary` pattern.

Show:

- File-type icon where appropriate
- Document name
- Document reference
- Version
- Status
- Confidentiality or lock state where relevant

Do not duplicate the summary in multiple locations.

## Drawer tabs

Keep the main drawer tabs focused:

- Overview
- Access
- Workflow
- Versions
- Comments
- Activity

Do not show nine cramped top-level tabs.

Preserve Board Pack, acknowledgement, private note, and related-record functionality by placing them in relevant sections:

- Board Pack and Related Records → Overview or Workflow
- Acknowledgement → Workflow or Overview
- Save to My Notes → contextual action or Overview section

Do not remove these features.

## Drawer body

The body must be the only scrolling region.

Use grouped sections matching the original detail drawer.

Do not show:

- Raw IDs when labels exist
- Undefined values
- Empty sections
- Raw objects
- Duplicate fields
- Long unstructured walls of text

## Footer placement

All document actions must appear in the fixed drawer footer using the existing `drawer-action-footer` layout.

Follow the original segmented pattern:

1. Safe or editing actions in the first row
2. Divider
3. Destructive and primary workflow actions in the final row

Examples, shown only when relevant and permitted:

First row:

- Edit Metadata
- Download
- Save to My Notes
- Add to Board Pack

Final row:

- Request Revision or Reject on the left
- Open Editor, Open PDF, Open Spreadsheet, Request Review, Request Approval, Approve, or Publish as the primary action on the right

Rules:

- Only one primary button at a time.
- The primary action must be the last button.
- Use `destructive-subtle` for Reject or destructive actions.
- Use the current button components and sizes.
- Do not place action buttons above the tabs.
- Do not duplicate actions in the body and footer.
- Hide actions the current user cannot perform.
- Use an overflow menu only for low-priority actions.

## Format-specific primary label

Use the actual workspace type:

- Rich text → Open Editor
- PDF → Open PDF
- Spreadsheet → Open Spreadsheet
- Presentation through configured provider → Open Presentation
- Read-only supported file → View Document
- Unsupported file → Preview File or Download Original

Do not derive the label only from `content_type`.

## Functional fixes

- Download must have a real handler.
- Workflow status actions must update the document.
- Do not keep a no-op `handleStatusChange`.
- Restore must update the document and create a version and audit event.
- Opening a footer action must preserve the selected document and library state.

# Phase 4 audit — local rich-text editor

Verify the local editor is a real Tiptap editor and not a visual mock.

Confirm:

- Blank documents open and edit.
- Existing editor content reloads.
- DOCX conversion works.
- Original DOCX remains unchanged.
- Autosave works.
- Save Version works.
- Toolbar controls change document content.
- Read-only mode blocks editing.
- Locked mode blocks editing.
- Returning to the library restores table state.
- Tablet and mobile layouts remain usable.

Remove obsolete or conflicting format-routing logic from `DocumentEditorPage.tsx`.

There must be one format router.

Do not keep old `preview-pdf` or `preview-office` decision logic if the new workspace router handles those formats.

Every visible editor control must work.

Replace or remove placeholder content such as:

`Section navigation coming soon.`

Do not show unfinished panels as completed features.

# Phase 5 audit — comments, versions, workflow, approval, and audit

## Comments

Verify the drawer and editor use the same comment registry.

Support:

- Anchored comment
- Reply
- Mention
- Assign
- Resolve
- Reopen
- Navigate to anchor

Do not create a separate repository comment system that is invisible to the shared registry.

## Versions

Verify:

- Manual version creation
- Review milestone version
- Approval milestone version
- Publish version
- Restore version
- Named version
- Preview
- Comparison
- Download

Restoring an old version must create a new current version and preserve all newer versions.

Do not display “Comparison unavailable” when local text comparison can be performed.

Clearly state when only text-level comparison is available.

## Workflow

Verify the lifecycle:

1. Draft
2. Under Review
3. Changes Requested
4. Pending Approval
5. Approved
6. Published
7. Superseded
8. Archived

Workflow buttons must produce real state changes.

## Locking

Verify:

- Approval creates and locks a specific version.
- Editing is blocked while locked.
- Editing an approved document follows the approval-reset rule.
- Previous approvals remain in history.
- The locked version ID is preserved.

## Audit history

Use the actual `AuditEvent` schema consistently.

Do not create an event for every keystroke.

Create meaningful events for:

- Create
- Upload
- Open
- Edit session
- Version created
- Version restored
- Comment created
- Comment resolved
- Review requested
- Approval requested
- Approved
- Rejected
- Published
- Archived
- Download
- Board Pack link

# Phase 6 audit — Board Packs, My Tasks, My Notes, templates, and acknowledgements

## Board Packs

Verify:

- A document is linked using a specific version.
- Updating the document does not silently replace the Board Pack version.
- A “New version available” message appears.
- Updating the linked version requires an explicit action.
- Every link update creates an audit event.

## My Tasks

Verify document tasks are generated from real assignments:

- Document review
- Document approval
- Document acknowledgement

Do not assign tasks only from a broad workflow role when an explicit reviewer or approver exists.

Opening a task must follow the approved Task Details drawer-first interaction.

## My Notes

Verify:

- Save to My Notes creates a private note.
- Selected text or document context is preserved.
- Notes remain private to their owner.
- Shared comments and private notes do not mix.

## Templates

Verify:

- Template records use `is_template`.
- Creating from a template creates a new document.
- Source templates remain unchanged.
- Placeholders use current project data.
- No person’s name is permanently hardcoded.

## Acknowledgements

Verify:

- Viewing does not count as acknowledgement.
- Acknowledgement is explicit.
- User, version, date, and time are recorded.
- The action disappears or changes after acknowledgement.
- My Tasks updates correctly.

# Phase 7 audit — ONLYOFFICE, security, responsive behavior, and errors

## ONLYOFFICE

Verify the provider adapter is genuinely connected.

Only mark these as passed when the server and backend callbacks are configured:

- Real-time collaboration
- Live presence
- Tracked changes
- Office-format fidelity
- Provider comments
- Provider version callbacks
- PDF text editing
- PDF forms
- Digital signatures

A configured URL alone does not prove the server is reachable.

If unavailable:

- Show a clear state.
- Provide Retry.
- Provide local viewer where supported.
- Provide Download Original where permitted.
- Never show a blank canvas.

## Security

Verify:

- System permission
- Document ownership
- Explicit access grant
- Workflow assignment
- Confidentiality
- Lock state
- Download restrictions
- Print restrictions
- Access expiry

Do not grant access based only on an active global permission definition.

## Responsive behavior

Test:

- Desktop
- Tablet landscape
- Tablet portrait
- Mobile
- Large font scale
- Light theme
- Dark theme

Do not squeeze the desktop editor into mobile.

## Error states

Verify meaningful recovery for:

- Missing original file
- Unsupported format
- Conversion failure
- Editor unavailable
- Autosave failure
- Offline state
- Reconnection
- Permission denied
- Locked document
- Version conflict
- Archived document
- Corrupt file

# Phase 8 audit — PDF and spreadsheet support

## Format router

Verify one format-aware router handles:

- Rich text
- PDF
- Spreadsheet
- Presentation
- Image
- Unsupported file

Use both extension and `mime_type`.

Do not rely only on the filename.

## PDF workspace

Test with a valid PDF containing searchable text and a scanned PDF.

Verify:

- PDF renders
- Page count is correct
- Page navigation works
- Thumbnails work
- Zoom works
- Fit page works
- Fit width works
- Rotate works
- Search finds real text
- Scanned PDF shows no searchable-text message
- Text selection works
- Highlight works
- Underline works
- Strikeout works
- Sticky note works
- Free text works
- Drawing works
- Rectangle works
- Arrow works
- Undo works
- Annotations reload after refresh
- Comments navigate to the correct page and region
- Locked PDF blocks annotations
- Download restrictions work
- Print restrictions work
- Annotated export creates a new file and preserves the original

Do not treat a generic click that creates a fixed rectangle as complete highlight, underline, drawing, or arrow support.

Each visible tool must implement its actual interaction.

Ensure the SVG annotation layer can receive pointer and keyboard interaction. Do not leave all annotation elements unusable because the parent uses `pointer-events: none`.

## Spreadsheet workspace

First resolve all dependency and compilation issues.

If using SheetJS, declare a compatible `xlsx` dependency.

Verify with real fixtures:

- XLSX
- XLS
- CSV
- TSV
- ODS
- XLSM

Test:

- Workbook import
- Sheet names
- Multiple sheets
- Add sheet
- Rename sheet
- Duplicate sheet
- Reorder sheet
- Delete with confirmation
- Active sheet
- Cell selection
- Cell editing
- Formula editing
- Formula calculation
- Formula bar
- Name box
- Bold
- Italic
- Underline
- Alignment
- Number formatting
- Currency
- Percentage
- Date formatting
- Borders
- Cell background
- Merge and unmerge
- Row and column insertion
- Row and column deletion
- Row height
- Column width
- Freeze
- Sort
- Filter
- Find and navigate to match
- Undo
- Redo
- Cell comments
- Range comments
- Comment navigation
- Autosave
- Reload saved workbook
- Save Version
- Restore Version
- XLSX export
- CSV export for the selected sheet
- Print where permitted

Do not rely on undocumented global functions unless they are confirmed to work with the installed spreadsheet engine.

Every toolbar button must call a supported API and create a visible result.

Do not mark the spreadsheet complete because the grid renders.

## Spreadsheet safety

Verify:

- Macros are never executed.
- External scripts are never executed.
- DDE is disabled.
- External workbook connections are disabled.
- XLSM displays a warning.
- Original XLSM is preserved.
- CSV formula-injection risks are handled safely.
- HTML renamed as CSV is rejected.
- NUL-containing binary files are rejected.
- Executables renamed as spreadsheets are rejected.

## Upload validation

Add real validation rules for every displayed format.

Update both:

- Upload `accept` values
- Format filters and helper text

Do not add only the file extension.

Check MIME, signature, and Office/ODF container markers.

# Test fixtures

Add small, valid test fixtures or generate them during tests for:

- DOCX
- PDF with searchable text
- PDF without searchable text where practical
- XLSX with multiple sheets and formulas
- XLS
- CSV
- TSV
- ODS
- XLSM container
- Corrupt file
- Executable renamed as a supported file
- HTML renamed as CSV

Do not test only empty fake files with renamed extensions.

# Final validation

After all fixes, run:

- `npm run typecheck`
- `npm run test`
- `npm run build`

All must pass.

Then manually verify:

- Existing Document Library records remain visible.
- New documents survive reload.
- Uploaded files survive reload.
- Rich-text documents still work.
- PDF files open the PDF workspace.
- Spreadsheet files open the spreadsheet workspace.
- Unsupported formats show a safe fallback.
- Row click and View open the same document drawer.
- The drawer follows the original design.
- Header actions have been removed.
- Footer actions follow the original placement.
- Tabs are readable and functional.
- Workflow actions update real state.
- Permissions are based on the current user.
- Board Pack links preserve versions.
- My Tasks receives document assignments.
- My Notes remains private.
- Help remains hidden.
- No User Guide content is created.

# Delivery requirements

Deliver:

1. `docs/DOCUMENT_WORKSPACE_PHASE_AUDIT.md`
2. A before-and-after status for every Phase 1–8 requirement
3. Fixed source code
4. Updated data models
5. Updated dependencies
6. Updated upload validation
7. Updated tests
8. A final list of backend-dependent capabilities that cannot be honestly marked complete

Do not claim the eight phases are complete until the implementation, runtime behavior, tests, typecheck, and production build all confirm it.

# Golden Rules

- Do not break solved issues.
- Do not change unrelated modules.
- Do not remove existing document records.
- Do not remove original uploaded files.
- Do not delete version or audit history.
- Do not redesign the approved Document Library table.
- Keep only View inside table rows.
- Use the original detail drawer shell and footer placement.
- Do not place document actions in the drawer header.
- Do not fake editor, PDF, spreadsheet, or collaboration capabilities.
- Do not hide TypeScript errors with unsafe casts.
- Do not grant permissions globally.
- Do not execute macros or external workbook automation.
- Preserve desktop, tablet, and mobile behavior.
- Keep EN/BN parity.
- Keep the Help icon hidden.
- Do not create User Guide or Help content.
```
