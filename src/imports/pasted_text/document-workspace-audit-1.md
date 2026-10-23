Audit and repair Phases 1–4 of the Document Workspace implementation in the current Board Meeting Solution.

Work directly in the current project. Inspect the real code, dependencies, routes, models, registries, IndexedDB storage, permissions, runtime behavior, and tests.

Do not trust comments, documentation, filenames, visible buttons, or placeholder UI as proof that a feature works.

Your responsibilities:

1. Audit every Phase 1–4 requirement.
2. Mark each item as Pass, Partial, Failed, Broken, or Backend Dependent.
3. Record exact evidence.
4. Fix every failed, partial, or broken frontend requirement.
5. Preserve all solved issues and unrelated modules.
6. Make the Document Details drawer follow the project’s original detail-drawer design exactly.

Create:

`docs/DOCUMENT_WORKSPACE_PHASE_1_TO_4_AUDIT.md`

Use this structure:

| Phase | Requirement | Status | Evidence | Problem | Fix |
|---|---|---|---|---|---|

Do not mark a requirement as passed because:

- A component file exists
- A button is visible
- A comment says it is implemented
- A mock success message appears
- A test does not exercise real behavior
- A backend-dependent feature has no working backend

Before editing, run:

- `npm run typecheck`
- `npm run test`
- `npm run build`

Record all document-related failures, fix them, and rerun all commands.

# Files and areas to inspect

Inspect all relevant files, including:

- `src/app/pages/agenda-documents/DocumentLibraryPage.tsx`
- `src/app/pages/agenda-documents/DocumentEditorPage.tsx`
- `src/app/pages/register-stock/TaxRegistryPage.tsx`
- `src/app/components/documents/DocumentDetailsDrawer.tsx`
- `src/app/components/documents/DocumentWorkspaceRouter.tsx`
- `src/app/components/documents/editor/DocumentEditorProvider.ts`
- Local rich-text editor components
- `src/app/services/types/documents.ts`
- `src/app/services/repositories/documentRepository.ts`
- `src/app/services/repositories/localDocumentRepository.ts`
- `src/app/services/repositories/apiDocumentRepository.ts`
- `src/app/services/repositories/documentContentStore.ts`
- `src/app/services/endpoints/documents.ts`
- `src/app/data/documentWorkspaceData.ts`
- Document models and registries
- `src/app/utils/normalizeBoardDocument.ts`
- `src/app/utils/documentFormat.ts`
- `src/app/components/forms/AppFileUpload.tsx`
- `src/app/actions/resolvers/documentActions.ts`
- `src/app/data/permissions.ts`
- Document-related styles
- Document-related tests
- `package.json`

# Phase 1 — Foundation, models, routes, storage, and repository

## 1. Canonical document model

Use one canonical document schema.

Canonical fields must include:

- `doc_name`
- `doc_type`
- `related_meeting`
- `related_agenda`
- `acknowledgement_required`
- `mime_type`

Support legacy aliases only through normalization:

- `document_name` → `doc_name`
- `document_type` → `doc_type`
- `meeting_id` → `related_meeting`
- `agenda_id` → `related_agenda`
- `ack_required` → `acknowledgement_required`
- `file_mime` → `mime_type`

Update:

`normalizeBoardDocument(record)`

Requirements:

- Read canonical fields first
- Support legacy records
- Preserve existing document data
- Fill safe optional defaults
- Never create two competing fields in new records

Audit every document-related file for inconsistent schema usage.

Examples to fix:

- `title` instead of `doc_name`
- `file_mime` instead of `mime_type`
- `version` instead of `version_number`
- `label` instead of `change_summary`
- `occurred_at` instead of the real audit timestamp field

Do not hide model errors with broad casts such as:

`Record<string, unknown>`

## 2. Extend models safely

Verify `BoardDocument` supports the required optional fields:

- `file_name`
- `file_format`
- `mime_type`
- `file_size`
- `original_file_ref`
- `content_type`
- `workspace_type`
- `editor_provider`
- `created_by`
- `last_modified_by`
- `last_modified_at`
- `workflow_status`
- `current_version_id`
- `folder_id`
- `tags`
- `is_favorite`
- `is_pinned`
- `is_template`
- `is_locked`
- `locked_version_id`
- `unresolved_comment_count`
- `pending_suggestion_count`
- `page_count`
- `sheet_count`
- `active_sheet_id`
- `has_annotations`
- `annotation_count`
- `has_macros`
- `has_external_links`
- `conversion_warning`

Extend the existing `DocumentVersion` model rather than creating a second version model.

Verify support for:

- `content_ref`
- `original_file_ref`
- `version_name`
- `snapshot_type`
- `file_size`
- `checksum`
- `comment_count`
- `suggestion_count`
- `is_named`
- `is_approved`
- `restored_from_version_id`

Preserve all old records.

## 3. Route compatibility

Verify:

- `/agenda-documents/document-library` opens the new Document Library.
- `TaxRegistryPage.tsx` remains only a compatibility wrapper.
- `/agenda-documents/document-library/:documentId/editor` opens the correct workspace.
- Existing redirects still work.
- Returning from the editor restores the Document Library state.

Do not remove the legacy wrapper or route compatibility.

## 4. One authoritative metadata source

The project must not maintain two disconnected document lists.

Use:

- Existing document registry for current document metadata
- IndexedDB for original files
- IndexedDB for editor content
- IndexedDB for converted content
- IndexedDB for workbook state
- IndexedDB for PDF annotations
- IndexedDB for version snapshots
- Repository adapters as the abstraction layer

A document created through one path must appear everywhere.

Do not create a separate local-storage document list inside `LocalDocumentRepository`.

## 5. Storage validation

Verify:

- Original uploaded files are stored in IndexedDB.
- Rich-text editor content is stored in IndexedDB.
- Version snapshots are stored in IndexedDB.
- Large blobs and complete document bodies are not stored in localStorage.
- Original files are never overwritten.
- Reloading the application restores metadata and content.
- Deleting or restoring a version does not delete the original upload.

## 6. Repository contract

Verify local and API repositories use one consistent contract.

The local repository must correctly support:

- Get document
- Create document
- Update document
- Save original file
- Retrieve original file
- Save content
- Retrieve content
- Create version
- Restore version
- List versions
- List comments
- Manage access
- Manage approvals

Repository calls must not be scattered directly through page components.

## 7. API client

Verify:

- Existing JSON requests still work.
- `FormData` uploads work.
- The browser does not manually set `Content-Type` for `FormData`.
- Authorization behavior remains unchanged.
- API errors remain typed.
- Server secrets are not exposed in frontend environment variables.

# Phase 2 — Document Library

## 8. Approved table system

The Document Library must use:

`UnifiedDataTable`

Import only through:

`src/app/components/tables/index.ts`

Preserve the approved My Tasks table design:

- One continuous card
- Toolbar
- Functional tabs
- Search
- Filter
- Applied-filter chips
- Table header
- Rows
- Pagination
- Shared hover
- Shared mobile cards
- One View action

Do not redesign the table.

Do not use:

- Raw page-level `<table>`
- Direct `ResponsiveTable`
- Direct `CardTable`
- Custom table pagination
- A duplicate table toolbar

## 9. Table interaction

All triggers must open the same Document Details drawer:

- Desktop row click
- View action
- Enter
- Space
- Mobile-card tap
- Deep-link query parameter

The View action must not trigger the row handler twice.

Keep only one visible table action:

`View`

## 10. Summary cards

Verify live summary cards:

- Total Documents
- Awaiting My Review
- Under Review
- Published
- Unresolved Comments

Requirements:

- Use live data
- Use the shared interactive-card hover
- Apply a real table filter when selected
- Show a selected state
- Update counts after document changes
- Work with tabs, search, and filters

Do not hardcode counts.

## 11. Functional tabs

Verify these tabs:

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

Fix incorrect placeholder matchers.

Rules:

### My Documents

Include documents:

- Owned by the current user
- Created by the current user where appropriate

### Shared With Me

Include documents with:

- Explicit user access
- Valid role or group access
- Access that has not expired

Exclude documents already classified as My Documents where appropriate.

### Awaiting My Review

Include documents where the current user is an assigned reviewer.

Every tab must:

- Filter real records
- Show a live count
- Work with Search
- Work with Filters
- Work with summary-card filters
- Reset pagination
- Preserve state after closing the drawer
- Show a contextual empty state

Do not keep decorative tabs.

## 12. Search and filters

Search must support:

- Document name
- Document number
- Original file name
- Document type
- Owner
- Related meeting
- Related agenda
- Tags
- Version
- Workflow status
- Approval status
- Sheet names where available

Filters must support the actual accepted formats and metadata.

Do not show a format filter unless the file type has:

- Upload validation
- A known workspace behavior
- A safe fallback

## 13. URL state

Preserve through query parameters where practical:

- Active tab
- Search
- Filters
- Page
- Page size
- Open document drawer

Opening and closing the drawer must not erase the remaining URL state.

Returning from the editor must restore:

- Search
- Filters
- Active tab
- Page
- Scroll position

## 14. New Document and Upload Document

Verify Blank Document:

1. Creates document metadata
2. Creates empty IndexedDB content
3. Creates version 1.0
4. Creates an audit event
5. Opens the editor

Verify Create from Template:

- Creates a new independent document
- Does not edit the template
- Resolves supported placeholders
- Creates version 1.0
- Preserves the source template

Verify Upload Document:

1. Validates extension
2. Validates MIME type
3. Validates signature or container
4. Preserves original file
5. Creates metadata
6. Creates version 1.0
7. Creates an audit event
8. Opens the drawer or correct workspace

Uploaded documents must survive reload.

# Phase 3 — Document Details drawer

The Document Details drawer must follow the project’s original detail-drawer design.

Do not keep a separate custom document drawer style.

Use the existing patterns from:

- `ResponsiveOverlay`
- `DynamicDetailsDrawer`
- `SpecialRegistrationDrawer`
- `.drawer-summary`
- `.detail-section`
- `.drawer-field-grid`
- `.drawer-action-footer`

## 15. Drawer shell

Desktop:

- Right-side drawer
- Standard width around 480px
- Existing backdrop
- Existing header height and padding
- Existing close button
- Scrollable body
- Fixed footer

Mobile:

- Existing responsive bottom-sheet or full-width overlay behavior
- Accessible close control
- Same information and actions as desktop

Do not use a separate oversized document drawer.

## 16. Drawer header

The header must contain only:

- `Document Details`
- Standard close button

Do not place actions in the header.

Remove header actions such as:

- Open Editor
- Download
- Save Note
- Add to Board Pack
- Approve
- Publish

## 17. Summary block

Place the summary inside the drawer body using `.drawer-summary`.

Show:

- File-type icon where appropriate
- Document name
- Document reference
- Current version
- Status
- Confidentiality
- Lock state where relevant

Do not repeat the same summary in multiple areas.

## 18. Drawer tabs

Use these main tabs:

- Overview
- Access
- Workflow
- Versions
- Comments
- Activity

Do not create crowded top-level tabs for every feature.

Place related functionality inside existing tabs:

- Board Pack links → Overview or Workflow
- Related records → Overview
- Acknowledgement → Workflow or Overview
- Save to My Notes → contextual footer action
- Format information → Overview

## 19. Drawer content

Use grouped sections.

Do not show:

- Raw IDs where readable labels exist
- Empty sections
- `undefined`
- Raw objects
- Duplicate data
- Large unstructured text blocks

### Overview

Include relevant sections:

- Document summary
- Board context
- Classification
- Format information
- Collaboration summary

### Access

Use real users and access grants.

### Workflow

Use real workflow, approval, review, and acknowledgement data.

### Versions

Use the existing version registry.

### Comments

Use the same comments as the editor.

### Activity

Use the existing audit registry.

## 20. Footer action placement

All actions must appear in the fixed footer.

Follow the original segmented footer structure:

### First row

Safe or supporting actions, where permitted:

- Edit Metadata
- Download
- Save to My Notes
- Add to Board Pack

### Divider

Use the existing drawer footer divider.

### Final row

Workflow actions:

- Reject or Request Revision on the left where relevant
- One primary action on the right

Possible primary actions:

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

- Only one primary button at a time.
- The primary action must be the final button.
- Use the existing destructive-subtle style for Reject.
- Hide unavailable actions.
- Do not duplicate actions in the body.
- Do not place actions above tabs.
- Use an overflow menu only for low-priority actions.

## 21. Format-specific primary action

Determine the label from the actual workspace type:

- Rich text → Open Editor
- PDF → Open PDF
- Spreadsheet → Open Spreadsheet
- Presentation with provider → Open Presentation
- Supported read-only file → View Document
- Unsupported file → Preview File or Download Original

Do not determine this only from `content_type`.

## 22. Functional drawer actions

Verify every visible action has a real handler.

Fix:

- Download
- Edit Metadata
- Open workspace
- Request Review
- Request Approval
- Approve
- Reject
- Publish
- Archive
- Restore version
- Add to Board Pack
- Save to My Notes
- Acknowledge Document

Do not keep no-op handlers or placeholder alerts.

# Phase 4 — Local rich-text editor

## 23. Format router

There must be one format-aware router.

Do not keep conflicting routing logic inside `DocumentEditorPage.tsx`.

The router must resolve:

- Rich text
- PDF
- Spreadsheet
- Presentation
- Image
- Unsupported

Use:

- Canonical `mime_type`
- File extension as fallback

## 24. Tiptap editor

Verify the local document editor is a working Tiptap editor.

Test:

- Blank document creation
- Existing document loading
- Text editing
- Headings
- Bold
- Italic
- Underline
- Highlight
- Alignment
- Lists
- Links
- Tables
- Undo
- Redo
- Autosave
- Save Version
- Read-only mode
- Locked mode
- Reload persistence

Every visible toolbar control must work.

Remove or hide unfinished controls.

Do not show placeholder content such as:

`Coming soon`

inside a feature presented as complete.

## 25. DOCX behavior

Without ONLYOFFICE:

- Preserve the original DOCX
- Convert supported content through the configured converter
- Sanitize imported HTML
- Store editable content separately
- Show a conversion notice
- Do not claim pixel-perfect Word fidelity

Legacy DOC files must remain read-only unless real conversion exists.

## 26. Editor state

Verify:

- Autosave uses debounce.
- Autosave does not create a version for every keystroke.
- Save state is visible.
- Offline state is visible.
- Save failure provides Retry.
- Returning to the library restores previous state.
- Tablet and mobile layouts remain usable.
- The application scroll lock is restored after closing the editor.

# Part 1 final validation

After fixing Phase 1–4, rerun:

- `npm run typecheck`
- `npm run test`
- `npm run build`

All must pass.

Manually verify:

- Existing documents remain visible.
- New documents survive reload.
- Uploaded files survive reload.
- The Document Library table remains unchanged visually.
- Functional tabs use real filtering.
- Row click and View open the same drawer.
- The drawer uses the original shell.
- The drawer header contains no actions.
- Footer actions use the original placement.
- Rich-text documents open the current editor.
- DOCX editing still works.
- Original files remain preserved.
- Permissions use the logged-in user.
- Help remains hidden.
- No User Guide content is created.

## Golden Rules

- Do not break solved issues.
- Do not change unrelated modules.
- Do not remove document records.
- Do not remove original uploaded files.
- Do not redesign the approved Document Library table.
- Use the original detail-drawer shell.
- Do not place document actions in the drawer header.
- Keep only View inside table rows.
- Do not hide TypeScript errors with unsafe casts.
- Do not grant permissions globally.
- Do not store document bodies or files in localStorage.
- Preserve desktop, tablet, and mobile behavior.
- Keep EN/BN parity.
- Keep the Help icon hidden.
- Do not create User Guide or Help content.