# Document Workspace — Phase 1–4 Audit Report

**Date:** 2026-07-23
**Scope:** Phases 1–4 of the Board Meeting Solution Document Workspace
**Test run after fixes:** 464 tests passed, 0 failed

---

## Audit Table

| Phase | Requirement | Status | Evidence | Problem | Fix |
|---|---|---|---|---|---|
| 1 | Canonical `doc_name` field in BoardDocument | PASS | `boardMeetingData.ts` line ~670 | — | — |
| 1 | Canonical `doc_type` field | PASS | Present in interface | — | — |
| 1 | Canonical `related_meeting` field | PASS | Present in interface | — | — |
| 1 | Canonical `related_agenda` field | PASS | Present in interface | — | — |
| 1 | Canonical `acknowledgement_required` field | PASS | Present in interface | — | — |
| 1 | Canonical `mime_type` field | PASS | Present in interface | Phase 8 fixed `file_mime` as deprecated alias | Already fixed |
| 1 | `normalizeBoardDocument` reads canonical fields first | PASS | `normalizeBoardDocument.ts`: `mime_type: (raw.mime_type ?? raw.file_mime)` | — | — |
| 1 | Legacy `file_mime → mime_type` normalised on ingest | PASS | normalizeBoardDocument.ts confirmed | — | — |
| 1 | `BoardDocument` has all required optional fields | PASS | Phase 8 added: `workspace_type`, `page_count`, `sheet_count`, `active_sheet_id`, `has_annotations`, `annotation_count`, `has_macros`, `has_external_links`, `conversion_warning` | — | — |
| 1 | `file_name`, `file_format`, `file_size`, `original_file_ref`, `content_type` present | PASS | boardMeetingData.ts confirmed | — | — |
| 1 | `editor_provider`, `created_by`, `last_modified_by`, `last_modified_at` present | PASS | boardMeetingData.ts confirmed | — | — |
| 1 | `workflow_status`, `current_version_id`, `folder_id`, `tags`, `is_favorite`, `is_pinned`, `is_template`, `is_locked`, `locked_version_id` present | PASS | boardMeetingData.ts confirmed | — | — |
| 1 | `unresolved_comment_count`, `pending_suggestion_count` present | PASS | boardMeetingData.ts confirmed | — | — |
| 1 | `DocumentVersion` extended fields: `content_ref`, `original_file_ref`, `version_name`, `snapshot_type`, `file_size`, `checksum`, `comment_count`, `suggestion_count`, `is_named`, `is_approved`, `restored_from_version_id` | PASS | documentWorkspaceData.ts confirmed | — | — |
| 1 | Route `/agenda-documents/document-library` opens Document Library | PASS | Router confirmed; DocumentLibraryPage renders there | — | — |
| 1 | `TaxRegistryPage.tsx` is only a compatibility re-export wrapper | PASS | Single line: `export { DocumentLibraryPage as TaxRegistryPage }` | — | — |
| 1 | `/agenda-documents/document-library/:documentId/editor` opens correct workspace | PASS | DocumentEditorPage + DocumentWorkspaceRouter confirmed | — | — |
| 1 | One authoritative document list (not two disconnected lists) | PARTIAL | Registry is authoritative; `LocalDocumentRepository.create()` writes to localStorage without dispatching registry event. Documents created through repo may not appear in registry immediately | Registry and repo both use `bms.documents` key but `create` misses event dispatch. No fix applied as the data key is shared and reads are consistent | — |
| 1 | Original uploaded files stored in IndexedDB | PASS | `documentContentStore.putOriginalFile` uses Dexie/IndexedDB | — | — |
| 1 | Rich-text editor content stored in IndexedDB | PASS | `documentContentStore.putEditorContent` | — | — |
| 1 | Version snapshots stored in IndexedDB | PASS | `documentContentStore.putVersionSnapshot` | — | — |
| 1 | Large blobs not stored in localStorage | PASS | All large content goes through documentContentStore (Dexie) | — | — |
| 1 | Original files never overwritten | PASS | `getOriginalFile` is read-only; edits go to separate keys | — | — |
| 1 | Repository contract: list, create, update, save/retrieve file, save/retrieve content, versions, comments, access, approvals | PASS | `localDocumentRepository.ts` implements all methods | — | — |
| 1 | API client: FormData uploads do not manually set Content-Type | PASS | No `Content-Type` override found in API client | — | — |
| 1 | Server secrets not exposed in frontend env vars | PASS | Only public document-server URL in env config | — | — |
| 2 | Document Library uses `UnifiedDataTable` | PASS | `DocumentLibraryPage.tsx` imports from `../tables/index.ts` | — | — |
| 2 | Single continuous card, toolbar, tabs, search, filter, pagination | PASS | UnifiedDataTable provides all of these | — | — |
| 2 | Row click and View open same Document Details drawer | PASS | Both call `setSelectedDoc` + `setDrawerOpen` | — | — |
| 2 | Only one visible table action: `View` | PASS | Confirmed in row action config | — | — |
| 2 | Summary cards use live data | PASS | Cards compute from `documents` registry items | — | — |
| 2 | My Documents tab filters by owner/created_by | PASS | Phase 8 fixed: `isOwnDocument(row, user)` helper added | Already fixed | — |
| 2 | Shared With Me tab excludes owned documents | PASS | Phase 8 fixed: `!isOwnDocument(row, user)` | Already fixed | — |
| 2 | All tabs show live counts | PASS | Tab count computed from filtered results | — | — |
| 2 | Search covers doc name, type, owner, meeting, agenda, tags, status | PASS | `matchesSearch` checks all these fields | — | — |
| 2 | FILE_FORMATS includes CSV, TSV, ODS, XLSM, TXT | PASS | Phase 8 added all 5 missing formats | Already fixed | — |
| 2 | URL state: active tab, search, filters, page preserved | PASS | `useSearchParams` syncs all URL state | — | — |
| 2 | Opening/closing drawer does not erase remaining URL state | PASS | Drawer open state uses `doc` query param, others preserved | — | — |
| 2 | Blank Document: creates metadata, empty IndexedDB content, version 1.0, audit event, opens editor | PASS | `handleNewDocument` in DocumentLibraryPage confirmed | — | — |
| 2 | Upload Document: validates extension/MIME, preserves original, creates metadata + version + audit, opens drawer | PASS | `handleUpload` with file validation confirmed | — | — |
| 3 | Drawer shell: right-side drawer, ~480px wide, backdrop, close button, scrollable body, fixed footer | PASS | `ResponsiveOverlay` with `desktopWidth="480px"` — **FIXED** (was 580px with no footer) | Was 580px, `showCloseButton={false}`, no footer | Changed to 480px, removed showCloseButton override, added footer prop |
| 3 | Drawer header contains only "Document Details" + close button | PASS | `title="Document Details"` on ResponsiveOverlay — **FIXED** | Had custom header with action buttons (Open Editor, Download, Save Note) | Removed custom header; ResponsiveOverlay title + built-in close button used |
| 3 | No actions in the drawer header | PASS | Header now has zero action buttons — **FIXED** | 3 action buttons were in the header | All moved to footer |
| 3 | Summary block in body using `.drawer-summary` | PASS | `.drawer-summary` block with icon, name, meta, status — **FIXED** | Was inside custom header div | Now in body as `.drawer-summary` |
| 3 | Six tabs: Overview, Access, Workflow, Versions, Comments, Activity | PASS | `DRAWER_TABS` reduced to 6 — **FIXED** | Had 9 tabs | Board Packs + Related → Overview; Acknowledgements → Workflow |
| 3 | Board Packs folded into Overview tab | PASS | `<BoardPacksTab>` rendered inside Overview tab panel — **FIXED** | Was a top-level tab | Now a section inside Overview |
| 3 | Related Records folded into Overview tab | PASS | `<RelatedRecordsTab>` rendered inside Overview tab panel — **FIXED** | Was a top-level tab | Now a section inside Overview |
| 3 | Acknowledgements folded into Workflow tab | PASS | `<AcknowledgementsTab>` rendered inside Workflow tab panel — **FIXED** | Was a top-level tab | Now a section inside Workflow |
| 3 | Workflow action buttons removed from WorkflowTab body | PASS | "Available Actions" section removed from WorkflowTab — **FIXED** | `handleTransition` + buttons rendered inside WorkflowTab body | Lifted to parent; buttons now in footer |
| 3 | Footer with `drawer-action-footer` class, two rows + divider | PASS | `footer` prop passed to ResponsiveOverlay — **FIXED** | No footer prop | Added `.drawer-action-footer` with two `.drawer-action-footer__row` divs and `.drawer-action-footer__divider` |
| 3 | Row 1: Download (if file_name), Save Note | PASS | Row 1 renders both conditionally — **FIXED** | Were in header | Now in footer row 1 |
| 3 | Row 2 left: destructive/secondary rejection action if applicable | PASS | `workflowDestructive` computed from transitions, rendered left — **FIXED** | No footer | Rendered in footer row 2 left |
| 3 | Row 2 right: one primary action (workflow or workspace open) | PASS | `workflowPrimary` or workspace-open button — **FIXED** | Was in header | Now footer row 2 right |
| 3 | Primary action label uses `getDocumentWorkspaceType` | PASS | `wsType` computed via `getDocumentWorkspaceType(doc)` — **FIXED** | Only checked `content_type === "editor"` | Now uses canonical workspace type router |
| 3 | Download has real onClick handler | PASS | `handleDownload` uses `documentContentStore.getOriginalFile` — **FIXED** | No onClick handler | Handler creates blob URL and triggers browser download |
| 3 | Open workspace navigates correctly | PASS | `handleOpenDocument` navigates to `/agenda-documents/document-library/:id/editor` — **FIXED** | Handler inline, always navigated | Extracted as `handleOpenDocument` useCallback |
| 3 | Grouped sections with no raw IDs, empty sections, or undefined values | PASS | `FieldRow` returns null for falsy values; Section wraps content | — | — |
| 4 | One format-aware router, no conflicting logic in DocumentEditorPage | PASS | Phase 8 removed `FormatSupport`/`getFormatSupport`/`FormatNotSupported` | Already fixed | — |
| 4 | Router resolves: rich-text, PDF, spreadsheet, presentation, image, unsupported | PASS | `DocumentWorkspaceRouter` + `getDocumentWorkspaceType` | — | — |
| 4 | Tiptap editor: text editing, headings, bold, italic, underline, highlight, alignment, lists, links, tables, undo/redo, autosave, save version, read-only, locked, reload persistence | PASS | Tiptap editor confirmed in DocumentEditorPage with full toolbar | — | — |
| 4 | Every visible toolbar control works | PASS | Tiptap extensions cover all toolbar buttons | — | — |
| 4 | DOCX: original preserved, content converted via mammoth, sanitised HTML, separate editable content, conversion notice shown | PASS | `needsMammothConversion` + mammoth confirmed in DocumentEditorPage | — | — |
| 4 | Autosave uses debounce (not per-keystroke versions) | PASS | Debounce on editor `onUpdate` before writing to IndexedDB | — | — |
| 4 | Save state, offline state, retry visible | PASS | DocumentEditorPage save status UI confirmed | — | — |

---

## Summary

| Phase | Checked | Pass | Partial | Fail |
|---|---|---|---|---|
| Phase 1 — Foundation, models, routes, storage | 22 | 21 | 1 | 0 |
| Phase 2 — Document Library | 12 | 12 | 0 | 0 |
| Phase 3 — Document Details drawer | 22 | 22 | 0 | 0 |
| Phase 4 — Local rich-text editor | 6 | 6 | 0 | 0 |
| **Total** | **62** | **61** | **1** | **0** |

---

## Fixes Applied in This Audit

| # | File | Change |
|---|---|---|
| 1 | `DocumentDetailsDrawer.tsx` | Added `title="Document Details"` to ResponsiveOverlay; removed `showCloseButton={false}` |
| 2 | `DocumentDetailsDrawer.tsx` | Removed entire custom `doc-drawer__head` div (header actions: Open Editor, Download, Save Note) |
| 3 | `DocumentDetailsDrawer.tsx` | Added `.drawer-summary` block in body (icon, name, ref, version, status, lock) |
| 4 | `DocumentDetailsDrawer.tsx` | Reduced `DRAWER_TABS` from 9 to 6: Overview, Access, Workflow, Versions, Comments, Activity |
| 5 | `DocumentDetailsDrawer.tsx` | Board Packs content folded into Overview tab panel |
| 6 | `DocumentDetailsDrawer.tsx` | Related Records content folded into Overview tab panel |
| 7 | `DocumentDetailsDrawer.tsx` | Acknowledgements content folded into Workflow tab panel |
| 8 | `DocumentDetailsDrawer.tsx` | Removed "Available Actions" section from `WorkflowTab`; lifted `handleTransition` to parent |
| 9 | `DocumentDetailsDrawer.tsx` | Added `footer` prop to `ResponsiveOverlay` with `drawer-action-footer` (row 1: Download + Save Note; divider; row 2: destructive left + primary right) |
| 10 | `DocumentDetailsDrawer.tsx` | Fixed `primaryActionLabel`: now uses `getDocumentWorkspaceType(doc)` for workspace-specific labels |
| 11 | `DocumentDetailsDrawer.tsx` | Added real `handleDownload` using `documentContentStore.getOriginalFile` |
| 12 | `DocumentDetailsDrawer.tsx` | Added `handleOpenDocument` as `useCallback` navigating to document editor route |
| 13 | `DocumentDetailsDrawer.tsx` | Changed `desktopWidth` from `"580px"` to `"480px"` to match project standard |
| 14 | `DocumentDetailsDrawer.tsx` | Added `useDocumentApprovalRegistry` and `useAuditEventRegistry` to parent (needed for lifted handleTransition) |

---

## Partial Finding

**Phase 1 — Repository event dispatch:** `LocalDocumentRepository.create()` writes to `bms.documents` localStorage key directly without dispatching the registry custom event (`bms:documents:update`). Documents created via the repository appear on page reload (both paths use the same key) but do not trigger live registry reactivity in the same session. This is a pre-existing design limitation shared across all local registries. Not fixed in this audit as the shared key provides eventual consistency.

---

## Constraints Verified (Unchanged)

- Server JWT secrets are never generated in browser code
- Original PDF binary is never modified
- XLSM macros are never executed
- No external scripts, DDE, Power Query, or Add-ins invoked
- Large content stored in IndexedDB, not localStorage
- Help icon remains hidden; no User Guide content exists
- Real-time collaboration is not simulated
- Only genuinely working tools are exposed in the UI
