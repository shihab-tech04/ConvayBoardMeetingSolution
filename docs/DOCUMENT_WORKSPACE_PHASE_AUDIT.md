# Document Workspace — Phase Audit Report

**Date:** 2026-07-23  
**Scope:** Phases 1–8 of the Board Meeting Solution Document Workspace implementation  
**Final test run:** 464 tests passed, 0 failed

---

## Summary

| Category | Total | Pass | Partial | Fail |
|---|---|---|---|---|
| Format detection & routing | 8 | 8 | 0 | 0 |
| PDF workspace | 7 | 7 | 0 | 0 |
| Spreadsheet workspace | 7 | 7 | 0 | 0 |
| Rich-text editor | 6 | 6 | 0 | 0 |
| Document library | 5 | 5 | 0 | 0 |
| Audit & security rules | 9 | 9 | 0 | 0 |
| Data model & normalisation | 5 | 5 | 0 | 0 |
| Tests | 3 | 3 | 0 | 0 |
| **Total** | **50** | **50** | **0** | **0** |

---

## Detailed Findings

### Format Detection & Routing

| Requirement | Status | Notes |
|---|---|---|
| `getDocumentWorkspaceType` routes by canonical `mime_type` field | ✅ PASS | Fixed: was reading only legacy `file_mime` |
| `file_mime` legacy alias still resolves correctly as fallback | ✅ PASS | Both fields checked via `mime_type ?? file_mime` |
| `mime_type` takes priority over `file_mime` when both present | ✅ PASS | Canonical field wins |
| Extension fallback when no MIME | ✅ PASS | EXT_MAP covers all required formats |
| `content_type === "editor"` always routes to rich-text | ✅ PASS | |
| All spreadsheet extensions (xlsx, xls, xlsm, xlsb, csv, tsv, ods) | ✅ PASS | `xlsb` added to EXT_MAP |
| All image MIME types (jpeg, png, gif, webp, svg+xml, bmp) | ✅ PASS | Added to MIME_MAP |
| `isMacroEnabledWorkbook` reads canonical `mime_type` first | ✅ PASS | Fixed: was casting to `file_mime` only |

### PDF Workspace

| Requirement | Status | Notes |
|---|---|---|
| pdfjs-dist renders pages via canvas (no CDN fallback) | ✅ PASS | Worker via `new URL(…, import.meta.url)` |
| PDF.js worker resolves without "Setting up fake worker" warning | ✅ PASS | `optimizeDeps.exclude: ['pdfjs-dist']` in vite.config |
| Annotations stored in IndexedDB (original never modified) | ✅ PASS | `documentContentStore.putPdfAnnotations` |
| Annotated export creates new PDF via pdf-lib | ✅ PASS | Original bytes read-only |
| `pdfInstance.cleanup()` called correctly (not `destroy`) | ✅ PASS | Fixed: `destroy` is not a function on PDFDocumentProxy |
| No infinite render loop on PdfPageCanvas | ✅ PASS | Fixed: ref pattern decouples `onDimensions` from deps |
| AuditEvent uses `timestamp` field (not `occurred_at`) | ✅ PASS | Fixed all 5 occurrences in PdfWorkspace.tsx + PdfCommentsPanel.tsx |

### Spreadsheet Workspace

| Requirement | Status | Notes |
|---|---|---|
| Reads XLSX/XLS/ODS/CSV/TSV via SheetJS (`xlsx` package) | ✅ PASS | `pnpm add xlsx` resolved |
| CSV/TSV safety gate rejects formula injection, NUL, HTML-as-CSV | ✅ PASS | `isCsvSafe()` function |
| File size guard: >50 MB → "too-large" status | ✅ PASS | |
| XLSM macro warning shown; macros never executed | ✅ PASS | |
| Autosave to IndexedDB every 1500ms debounce | ✅ PASS | |
| AuditEvent uses `timestamp` field (not `occurred_at`) | ✅ PASS | Fixed 2 occurrences in SpreadsheetWorkspace.tsx + SpreadsheetCommentsPanel.tsx |
| ONLYOFFICE delegation when provider configured | ✅ PASS | |

### Rich-Text Editor (Tiptap)

| Requirement | Status | Notes |
|---|---|---|
| Non-rich-text formats delegated to `DocumentWorkspaceRouter` | ✅ PASS | `wsType !== "rich-text"` guard |
| Obsolete `FormatSupport` type removed | ✅ PASS | Removed in this audit |
| Obsolete `getFormatSupport` function removed | ✅ PASS | Replaced with `needsMammothConversion` helper |
| Obsolete `FormatNotSupported` component removed | ✅ PASS | |
| DOCX/ODT/RTF conversion via mammoth | ✅ PASS | `needsMammothConversion` triggers it |
| Autosave to IndexedDB + version snapshots | ✅ PASS | |

### Document Library

| Requirement | Status | Notes |
|---|---|---|
| My Documents tab filters by owner/created_by (not all records) | ✅ PASS | Fixed: was returning all records |
| Shared With Me tab filters to documents not owned by current user | ✅ PASS | Fixed: was returning all records |
| FILE_FORMATS includes CSV, TSV, ODS, XLSM, TXT | ✅ PASS | Added all 5 missing formats |
| Tab counts reflect actual filtered counts | ✅ PASS | Fixed: my-documents and shared counts now correct |
| `matchesTab` accepts `currentUser` parameter for ownership check | ✅ PASS | Refactored signature |

### Audit & Security Rules

| Requirement | Status | Notes |
|---|---|---|
| `doc_approve` permission ID used in documentActions.ts | ✅ PASS | Fixed: was `document_approve` |
| No JWT secrets generated in the browser | ✅ PASS | Enforced by ONLYOFFICE provider server-side |
| No VBA/macros executed — XLSM preserved, macros disabled | ✅ PASS | `isMacroEnabledWorkbook` + warning banner |
| Original uploaded file never overwritten | ✅ PASS | `getOriginalFile` is read-only; edits go to separate keys |
| Annotations stored separately from original PDF binary | ✅ PASS | `putPdfAnnotations` vs `getOriginalFile` |
| Large annotation snapshots not in localStorage (uses IndexedDB) | ✅ PASS | `documentContentStore` is Dexie/IndexedDB |
| AuditEvent `timestamp` field used throughout (not `occurred_at`) | ✅ PASS | All 9 occurrences corrected |
| Help icon hidden, no User Guide or Help content | ✅ PASS | |
| No fake real-time collaboration | ✅ PASS | |

### Data Model & Normalisation

| Requirement | Status | Notes |
|---|---|---|
| `BoardDocument` interface has canonical `mime_type` field | ✅ PASS | Present since Phase 4 |
| `BoardDocument` interface has `file_mime` as deprecated legacy alias | ✅ PASS | Added with `@deprecated` JSDoc |
| `BoardDocument` interface has format-specific optional fields | ✅ PASS | Added: `workspace_type`, `page_count`, `sheet_count`, `active_sheet_id`, `has_annotations`, `annotation_count`, `has_macros`, `has_external_links`, `conversion_warning` |
| `normalizeBoardDocument` promotes `file_mime → mime_type` | ✅ PASS | `mime_type ?? file_mime` on ingest |
| `normalizeBoardDocument` passes through all format-specific fields | ✅ PASS | All 9 new fields forwarded |

### Tests

| Test File | Tests | Status |
|---|---|---|
| `document-format.test.ts` | 33 | ✅ PASS — updated with canonical + legacy alias coverage |
| `document-workspace-router.test.ts` | 20 | ✅ PASS — updated with mime_type priority tests |
| `document-spreadsheet.test.ts` | 28 | ✅ PASS |
| `document-pdf-annotations.test.ts` | 19 | ✅ PASS |

---

## Fixes Applied During This Audit

| # | File | Change |
|---|---|---|
| 1 | `PdfWorkspace.tsx` | 5× `occurred_at` → `timestamp` |
| 2 | `PdfCommentsPanel.tsx` | 1× `occurred_at` → `timestamp` |
| 3 | `SpreadsheetWorkspace.tsx` | 2× `occurred_at` → `timestamp` |
| 4 | `SpreadsheetCommentsPanel.tsx` | 1× `occurred_at` → `timestamp` |
| 5 | `documentActions.ts` | `"document_approve"` → `"doc_approve"` |
| 6 | `documentFormat.ts` | MIME read: `mime_type ?? file_mime` (both locations) |
| 7 | `boardMeetingData.ts` | Added `file_mime` (deprecated), 9 format-specific optional fields |
| 8 | `normalizeBoardDocument.ts` | `file_mime → mime_type` normalisation + 9 format fields forwarded |
| 9 | `DocumentLibraryPage.tsx` | `matchesTab` fixed for `my-documents`/`shared`; FILE_FORMATS expanded |
| 10 | `DocumentEditorPage.tsx` | Removed `FormatSupport`, `getFormatSupport`, `FormatNotSupported`; simplified `isEditable` |
| 11 | `document-format.test.ts` | Added canonical `mime_type` + legacy alias test suite |
| 12 | `document-workspace-router.test.ts` | Added `mime_type`/`file_mime` priority tests |

---

## Constraints Verified (Unchanged Throughout)

- Server JWT secrets are never generated in browser code
- Original PDF binary is never modified — annotations written to separate IndexedDB key
- XLSM macros are never executed — warning shown, original preserved
- No external scripts, DDE, Power Query, or Add-ins are invoked
- Large annotation arrays are stored in IndexedDB, not localStorage
- Help icon remains hidden; no User Guide content exists
- Real-time collaboration is not simulated or faked
- Only tools that genuinely work are exposed in the UI
