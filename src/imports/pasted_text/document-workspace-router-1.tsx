````text
Phase 8 — Add full PDF and spreadsheet support to the existing Document Workspace.

The current document editor is working well. Preserve it exactly. Do not redesign or rebuild the current Tiptap document editor, Document Library, Document Details drawer, comments, versions, workflows, permissions, Board Pack integration, My Tasks integration, or table behavior.

Extend the same workspace so PDF and spreadsheet files have proper, format-specific experiences instead of the current download-only screen.

## Current project status

The project already contains:

- `DocumentLibraryPage.tsx`
- `DocumentDetailsDrawer.tsx`
- `DocumentEditorPage.tsx`
- `DocumentEditorProvider.ts`
- `OnlyOfficeEditorFrame.tsx`
- `documentContentStore.ts`
- `DocumentCommentThread`
- `useDocumentVersionRegistry`
- `useDocumentCommentRegistry`
- `useAuditEventRegistry`
- Secure file validation
- IndexedDB document-content storage
- Local Tiptap document editing
- ONLYOFFICE provider configuration
- Version history
- Comments
- Review and approval workflows
- Access management
- Board Pack integration
- Unified document table
- Full-screen editor workspace

The current `DocumentEditorPage.tsx` detects:

- PDF as `preview-pdf`
- XLS and XLSX as `preview-office`
- PPT and PPTX as `preview-office`

However, these formats currently display an unsupported/download-only screen.

`OnlyOfficeEditorFrame.tsx` also exists but is not connected to the actual editor route.

Fix these gaps without breaking the working document editor.

# 1. Main objective

Support these additional document workspaces:

## PDF

Supported locally:

- PDF viewing
- Page thumbnails
- Page navigation
- Search
- Zoom
- Rotate
- Fit page
- Fit width
- Text selection
- Highlight annotations
- Underline annotations
- Strikeout annotations
- Sticky notes
- Free-text annotations
- Ink or freehand drawing
- Rectangle and arrow annotations
- Page-anchored comments
- Region-anchored comments
- Version history
- Download
- Print where permitted
- Export annotated copy where implemented

Supported through ONLYOFFICE when configured:

- Real PDF editing
- Provider-supported annotations
- PDF form filling
- Provider-supported signatures
- Collaboration
- Comments
- Version callbacks
- Other capabilities genuinely returned by the provider

Do not claim that local mode can directly edit the original PDF text.

## Spreadsheets

Support:

- XLSX
- XLS
- CSV
- TSV
- ODS

Handle XLSM safely:

- Preserve the original file.
- Never execute macros in the browser.
- Display a visible warning.
- Open through ONLYOFFICE when supported and configured.
- In local mode, import workbook data without executing macros.

Local spreadsheet features:

- Multiple sheets
- Add sheet
- Rename sheet
- Duplicate sheet
- Reorder sheet
- Delete sheet with confirmation
- Cell editing
- Formula bar
- Name box
- Formulas supported by the spreadsheet engine
- Number formats
- Date formats
- Currency formats
- Percentage formats
- Font and text formatting
- Text alignment
- Cell background
- Borders
- Row and column insertion
- Row and column deletion
- Row height and column width
- Freeze rows and columns
- Merge and unmerge cells
- Sort
- Filter
- Find
- Copy and paste
- Fill handle where supported
- Undo and redo
- Sheet tabs
- Cell and range selection
- Cell comments
- Range comments
- Version history
- XLSX export
- CSV export for the selected sheet
- Print where permitted

True real-time co-editing and high-fidelity Office round-tripping must remain provider-dependent.

# 2. Preserve the current text-document editor

Do not alter the current Tiptap document editing experience except where shared routing or provider architecture must be extended.

Preserve:

- Current toolbar
- Current document canvas
- Current left panel
- Current comments panel
- Current versions panel
- Current workflow panel
- Current activity panel
- Autosave
- Save Version
- DOCX conversion
- Original-file preservation
- Existing styles
- Current route
- Current responsive behavior

A DOCX file must continue opening in the same editor it uses now.

# 3. Add a format-aware workspace router

Refactor `DocumentEditorPage.tsx` so it does not contain every file-type implementation in one large component.

Create:

`src/app/components/documents/editor/DocumentWorkspaceRouter.tsx`

Create a shared utility:

`src/app/utils/documentFormat.ts`

Add:

```ts
type DocumentWorkspaceType =
  | "rich-text"
  | "pdf"
  | "spreadsheet"
  | "presentation"
  | "image"
  | "unsupported";
````

Create:

```ts
function getDocumentWorkspaceType(document: BoardDocument): DocumentWorkspaceType
```

Resolve formats using both:

* MIME type
* File extension

Do not rely only on the file name.

Mapping:

### Rich text

* DOCX
* ODT
* RTF
* TXT
* Blank in-system documents

### PDF

* PDF

### Spreadsheet

* XLSX
* XLS
* XLSM
* CSV
* TSV
* ODS

### Presentation

* PPT
* PPTX
* ODP

Presentations may remain preview-only locally for this phase, but they must open in ONLYOFFICE when configured and supported.

The route must remain:

`/agenda-documents/document-library/:documentId/editor`

The workspace router should render:

* Existing rich-text editor
* New PDF workspace
* New spreadsheet workspace
* ONLYOFFICE frame
* Existing unsupported-format state

Do not create separate routes for every file format.

# 4. Extend the editor-provider architecture

Update:

`src/app/components/documents/editor/DocumentEditorProvider.ts`

The current capabilities are too general.

Add format-aware capabilities:

```ts
interface EditorCapabilities {
  editing: boolean;
  comments: boolean;
  anchoredComments: boolean;
  versioning: boolean;
  trackedChanges: boolean;
  realTimeCollaboration: boolean;
  docxFidelity: boolean;
  versionComparison: boolean;

  pdfViewing: boolean;
  pdfAnnotations: boolean;
  pdfTextEditing: boolean;
  pdfForms: boolean;
  pdfSignatures: boolean;

  spreadsheetEditing: boolean;
  spreadsheetFormulas: boolean;
  spreadsheetComments: boolean;
  spreadsheetImport: boolean;
  spreadsheetExport: boolean;
}
```

Add:

```ts
function getCapabilitiesForDocument(
  provider: IEditorProvider,
  document: BoardDocument
): EditorCapabilities
```

Do not show tools that the selected provider cannot perform.

Examples:

* Local PDF mode must not display Edit PDF Text.
* Local spreadsheet mode may display cell editing and formulas.
* Local mode must not display real-time collaborators.
* Provider mode may display collaboration only when the provider is configured and available.
* PDF signatures must remain hidden unless an actual provider or backend signature workflow supports them.

# 5. Connect the existing ONLYOFFICE frame

`OnlyOfficeEditorFrame.tsx` currently exists but is not mounted by `DocumentEditorPage.tsx`.

Connect it properly.

When:

`VITE_DOCUMENT_EDITOR_PROVIDER=onlyoffice`

and the document server is available, use ONLYOFFICE for supported:

* Text documents
* Spreadsheets
* Presentations
* PDFs

Update:

`src/app/services/onlyoffice/onlyofficeContracts.ts`

The backend editor configuration must receive the correct document type:

* Text document → word
* Spreadsheet → cell
* Presentation → slide
* PDF → pdf

Pass:

* Document ID
* File name
* File type
* Document type
* Document URL
* Logged-in user
* Access permissions
* Editing mode
* Language
* Callback URL
* Version key
* JWT from the backend
* Download permission
* Print permission
* Review permission

Do not generate JWT secrets in the browser.

If ONLYOFFICE fails:

* Show a clear error state.
* Offer Retry.
* Offer Open in Local Viewer where local support exists.
* Offer Download Original where permitted.
* Never show a blank editor canvas.

# 6. Build the local PDF workspace

Use `pdfjs-dist` for local PDF rendering.

Do not load the PDF.js worker from an uncontrolled public CDN. Configure it through the Vite build.

Create:

* `src/app/components/documents/pdf/PdfWorkspace.tsx`
* `src/app/components/documents/pdf/PdfToolbar.tsx`
* `src/app/components/documents/pdf/PdfThumbnailRail.tsx`
* `src/app/components/documents/pdf/PdfPageCanvas.tsx`
* `src/app/components/documents/pdf/PdfAnnotationLayer.tsx`
* `src/app/components/documents/pdf/PdfCommentsPanel.tsx`
* `src/app/components/documents/pdf/PdfSearchPanel.tsx`

Reuse the existing full-screen document workspace shell.

## PDF header

Keep the same visual structure as the document editor:

Left:

* Back
* PDF icon
* File title
* Version

Center:

* Page position
* Save or annotation state
* Read-only or annotation mode

Right:

* Search
* Comments
* Versions
* Workflow
* Download
* Print
* More actions

Do not create a visually unrelated PDF application.

## PDF toolbar

Include:

* Previous page
* Next page
* Current page input
* Total page count
* Zoom out
* Zoom level
* Zoom in
* Fit width
* Fit page
* Rotate clockwise
* Select text
* Pan
* Highlight
* Underline
* Strikeout
* Sticky note
* Free text
* Draw
* Rectangle
* Arrow
* Undo
* Redo

Show annotation tools only when:

* The user has `doc_comment` or `doc_edit`.
* The PDF is not locked.
* The document is not read-only.

## PDF layout

Desktop:

* Left thumbnail rail
* Center PDF pages
* Optional right comments panel

Tablet:

* Thumbnail rail becomes an overlay.
* Comments become an overlay.
* Toolbar may scroll horizontally.

Mobile:

* One page at a time or a readable vertical page stream
* Swipe or buttons for page navigation
* Pinch or button zoom
* Compact annotation toolbar
* Comments in a bottom sheet
* Do not squeeze the full desktop layout into mobile

## PDF search

Support:

* Search text across pages
* Result count
* Previous result
* Next result
* Highlight current result
* Jump to result page
* Clear search

For scanned PDFs without a text layer:

* Show `No searchable text was found in this PDF.`
* Do not pretend OCR exists.
* Do not add OCR unless a real OCR service is configured later.

# 7. PDF annotations and comments

Extend the existing shared comment model.

Do not create a second disconnected PDF comment system.

Update `DocumentCommentThread` with optional fields:

```ts
anchor_type?:
  | "text-range"
  | "pdf-text"
  | "pdf-region"
  | "spreadsheet-cell"
  | "spreadsheet-range";

anchor_data?: {
  page?: number;
  rect?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  selectedText?: string;

  sheetId?: string;
  sheetName?: string;
  startCell?: string;
  endCell?: string;
};
```

Keep the existing legacy `anchor` and `selected_text` fields for compatibility.

PDF comments must support:

* Comment on selected text
* Comment on a selected region
* Comment on a page
* Reply
* Resolve
* Reopen
* Mention
* Assign
* Due date
* Navigate back to the PDF location

When a comment is selected:

* Open the correct page.
* Scroll to the annotation.
* Highlight the related region.

## Annotation storage

Add a lightweight PDF annotation model.

Store annotation metadata separately from the original PDF.

Suggested fields:

* Annotation ID
* Document ID
* Version ID
* Page number
* Type
* Geometry
* Color token
* Text
* Created by
* Created at
* Updated at
* Status

Do not modify or overwrite the original PDF binary.

Store large annotation snapshots in IndexedDB.

Use the existing registry pattern only for lightweight metadata.

## Annotated export

Use a tested PDF-writing library such as `pdf-lib` for exporting visual annotations into a new PDF copy.

Requirements:

* Keep the original PDF unchanged.
* Create a new downloadable annotated copy.
* Respect download permission.
* Show progress.
* Show a clear failure state.
* Do not claim that app comment threads are embedded as native PDF comments unless they genuinely are.

# 8. Build the local spreadsheet workspace

Use a real spreadsheet engine.

Preferred local implementation:

* Univer spreadsheet preset for the editing surface
* SheetJS `xlsx` for compatible local import and export where required

Install versions compatible with the existing:

* React 18
* TypeScript
* Vite 6

Create:

* `src/app/components/documents/spreadsheet/SpreadsheetWorkspace.tsx`
* `src/app/components/documents/spreadsheet/SpreadsheetToolbar.tsx`
* `src/app/components/documents/spreadsheet/SpreadsheetFormulaBar.tsx`
* `src/app/components/documents/spreadsheet/SpreadsheetSheetTabs.tsx`
* `src/app/components/documents/spreadsheet/SpreadsheetCommentsPanel.tsx`
* `src/app/components/documents/spreadsheet/SpreadsheetImportStatus.tsx`

Do not build a spreadsheet with a manually created HTML table.

## Spreadsheet header

Use the same editor-shell structure:

Left:

* Back
* Spreadsheet icon
* Workbook name
* Version

Center:

* Saving state
* Editing or viewing mode
* Selected sheet

Right:

* Share
* Comments
* Versions
* Workflow
* Download
* More actions

## Spreadsheet toolbar

Support:

* Undo
* Redo
* Font
* Font size
* Bold
* Italic
* Underline
* Text color
* Cell background
* Borders
* Horizontal alignment
* Vertical alignment
* Wrap text
* Number format
* Currency
* Percentage
* Date
* Merge
* Sort
* Filter
* Freeze
* Find

Do not create toolbar buttons that have no working handler.

## Spreadsheet structure

Include:

* Name box
* Formula bar
* Column headers
* Row headers
* Cell grid
* Sheet tabs
* Add-sheet button
* Zoom control
* Status bar

Status bar may show:

* Selected cell range
* Sum
* Average
* Count
* Zoom
* Online or offline state
* Active provider

# 9. Spreadsheet import behavior

## XLSX

Local mode should:

* Read workbook sheets
* Preserve cell values
* Preserve supported formulas
* Preserve basic formatting
* Preserve merged cells
* Preserve row heights and column widths where possible
* Preserve sheet names
* Preserve hidden-sheet state where supported
* Preserve the original file unchanged

Show a conversion notice when unsupported workbook features are detected.

## XLS

Import through the local spreadsheet parser.

Preserve the original XLS file.

Show:

`This legacy spreadsheet was converted for in-app editing. The original file is preserved.`

## CSV and TSV

Import into a single worksheet.

Provide import options when required:

* Delimiter
* Text encoding
* Header row
* Data preview

Prevent unsafe automatic execution of imported formulas.

Default cells starting with dangerous external formula patterns to text unless the user has explicit permission to trust them.

## ODS

Import supported values, formulas, formatting, and sheets where the local parser allows.

Preserve the original ODS file.

Clearly report unsupported content instead of silently deleting it.

## XLSM

Do not execute:

* VBA
* Macros
* Add-ins
* External scripts
* DDE links
* Power Query
* External data connections

Show:

`Macros and external workbook automation are disabled in the browser. The original XLSM file is preserved.`

Do not silently remove the original macro-enabled file.

# 10. Spreadsheet comments

Use the existing `DocumentCommentThread` source.

Support comments anchored to:

* One cell
* A cell range
* A complete sheet

Comment data should include:

* Sheet ID
* Sheet name
* Start cell
* End cell
* Selected value preview
* Formula preview where permitted

Support:

* Add comment
* Reply
* Resolve
* Reopen
* Mention
* Assign
* Due date
* Jump to cell

Selecting a comment must:

* Activate the correct sheet.
* Select the correct cell or range.
* Scroll it into view.

Do not create comments that exist only inside the spreadsheet component.

# 11. Spreadsheet autosave and versions

Extend `documentContentStore.ts`.

Add content types such as:

```ts
content_type:
  | "editor_json"
  | "original_file"
  | "converted_html"
  | "version_snapshot"
  | "spreadsheet_workbook"
  | "spreadsheet_snapshot"
  | "pdf_annotations"
  | "pdf_annotation_snapshot";
```

Add repository methods:

* `putSpreadsheetWorkbook`
* `getSpreadsheetWorkbook`
* `putSpreadsheetSnapshot`
* `getSpreadsheetSnapshot`
* `putPdfAnnotations`
* `getPdfAnnotations`
* `putPdfAnnotationSnapshot`
* `getPdfAnnotationSnapshot`

Spreadsheet autosave must:

* Use debounce
* Save workbook state to IndexedDB
* Update the visible save state
* Avoid creating a version for every cell change
* Preserve unsaved work after reload

Create spreadsheet versions when:

* Spreadsheet is first uploaded
* User selects Save Version
* Review is requested
* Approval is requested
* Approval is completed
* Version is restored
* Spreadsheet is published

A spreadsheet version must include:

* Workbook snapshot reference
* Version number
* Author
* Timestamp
* Change summary
* File size
* Sheet count
* Workflow state
* Approval state

Restoring a spreadsheet version must create a new current version.

# 12. Spreadsheet export

Support:

* Download Original
* Export Current Workbook as XLSX
* Export Selected Sheet as CSV
* Download Historical Version
* Print current sheet
* Print selected range where supported

Do not overwrite the original uploaded file.

Before export:

* Validate the workbook.
* Warn when unsupported features cannot be preserved.
* Respect download and print permissions.
* Record the event in audit history.

Do not claim pixel-perfect Excel round-tripping in local mode.

# 13. Update the document model

Keep all current fields.

Add optional fields:

```ts
workspace_type?:
  | "rich-text"
  | "pdf"
  | "spreadsheet"
  | "presentation"
  | "image"
  | "unsupported";

sheet_count?: number;
active_sheet_id?: string;
page_count?: number;
has_annotations?: boolean;
annotation_count?: number;
has_macros?: boolean;
has_external_links?: boolean;
conversion_warning?: string;
```

Do not replace the existing `content_type`.

Normalize old records safely.

Derive missing `workspace_type` from MIME and extension.

# 14. Update file upload support

Update `AppFileUpload.tsx` and Document Library accepted formats.

Add secure validation for:

* CSV
* TSV
* ODS
* XLSM

Keep:

* PDF
* DOC
* DOCX
* XLS
* XLSX
* PPT
* PPTX
* ODT
* RTF

Add CSV and TSV MIME support carefully.

CSV and TSV validation must:

* Reject executable signatures
* Reject binary files containing unexpected NUL bytes
* Reject HTML renamed as CSV
* Enforce file-size limits
* Validate readable text encoding where practical

ODS validation must check the correct ZIP container markers.

XLSM validation must confirm an Office spreadsheet container.

Do not accept a file extension unless it has a real validation rule.

Update:

`FILE_FORMATS`

to include:

* PDF
* DOCX
* DOC
* XLSX
* XLS
* XLSM
* CSV
* TSV
* ODS
* PPTX
* PPT
* ODT
* RTF

Update the upload helper text to match the actual supported formats and size limits.

# 15. Update Document Library presentation

Preserve the approved `UnifiedDataTable`.

Do not redesign the library.

Improve file-type recognition:

* PDF icon for PDF
* Spreadsheet icon for XLS, XLSX, XLSM, CSV, TSV, and ODS
* Presentation icon for PPT, PPTX, and ODP
* Document icon for DOC, DOCX, ODT, RTF, and TXT

Update the Document cell without changing its hierarchy.

Keep:

* Row click → Document Details drawer
* View → same drawer
* Mobile-card click → same drawer
* One visible row action
* Existing tabs
* Existing filters
* Existing search
* Existing pagination

Search must include sheet names where available.

Filters must include all supported file formats.

# 16. Update Document Details drawer

Preserve the current drawer tabs and content.

Update the primary action:

### Rich-text document

* Open Editor

### PDF

* Open PDF

### Spreadsheet

* Open Spreadsheet

### Presentation with ONLYOFFICE

* Open Presentation

### Unsupported local format

* Preview File or Download Original

Add format-specific information to Overview.

## PDF information

* Page count
* Annotation count
* Open comment count
* File size
* PDF version where available
* Password-protected state
* Searchable-text availability

## Spreadsheet information

* Sheet count
* Active sheet
* Formula count where available
* Named ranges where available
* Macro warning
* External-link warning
* File size

Do not show raw technical objects.

## Versions tab

For PDF versions, show:

* PDF file version
* Annotation snapshot
* Comment count
* Page count

For spreadsheet versions, show:

* Sheet count
* Workbook snapshot
* Comment count
* Change summary

Use the existing version timeline style.

# 17. Workflow and locking

Apply existing document workflow rules to PDFs and spreadsheets.

When a PDF or spreadsheet is locked for approval:

* Disable editing.
* Disable annotations where policy requires.
* Allow permitted comments only.
* Review the exact locked version.
* Preserve the locked version ID.

Editing a locked or approved spreadsheet must follow the existing approval-reset rule.

Adding an annotation to an approved PDF must follow the configured governance rule:

* Treat as a new draft version, or
* Block the annotation

Do not silently alter approved content.

# 18. Audit events

Use `useAuditEventRegistry`.

Add events for:

## PDF

* PDF opened
* Annotation added
* Annotation updated
* Annotation removed
* PDF comment added
* Annotated copy exported
* PDF printed
* PDF version created

## Spreadsheet

* Spreadsheet opened
* Cell content changed
* Sheet added
* Sheet renamed
* Sheet removed
* Workbook imported
* Workbook exported
* Comment added
* Version created
* Version restored
* Spreadsheet printed

Do not create an audit event for every keystroke.

Batch normal autosave activity into meaningful events.

# 19. Permissions

Reuse current document permissions:

* `doc_view`
* `doc_edit`
* `doc_comment`
* `doc_download`
* `doc_share`
* `doc_manage_versions`
* `doc_review`
* `doc_approve`
* `doc_publish`

Rules:

* `doc_view` allows viewing.
* `doc_comment` allows PDF and spreadsheet comments.
* `doc_edit` allows spreadsheet editing.
* PDF text editing remains provider-dependent.
* `doc_download` controls original and exported downloads.
* Print must respect document restrictions.
* Locked documents must override normal edit permission.
* Explicit document access grants must still apply.

Do not add duplicate spreadsheet-specific permission systems unless genuinely required.

# 20. Responsive behavior

## PDF mobile

Support:

* View pages
* Search
* Zoom
* Page navigation
* Basic highlights
* Sticky-note comments
* Comment replies
* Download where permitted

## Spreadsheet mobile

Support:

* View workbook
* Switch sheets
* Select cells
* Edit cell value
* Edit formula
* Add comments
* View comments
* Basic formatting
* Download where permitted

Use compact bottom sheets for secondary tools.

Do not render the entire desktop spreadsheet toolbar at mobile width.

Do not create page-level horizontal scrolling outside the spreadsheet canvas.

# 21. Error states

Add format-specific states:

## PDF

* PDF loading failed
* Password required
* Invalid PDF
* Missing original file
* PDF has no searchable text
* Annotation save failed
* Annotated export failed

## Spreadsheet

* Workbook loading failed
* Unsupported workbook feature
* Import failed
* Formula calculation failed
* Workbook is too large
* Corrupt workbook
* Macro-enabled workbook
* External links disabled
* Export failed

Every state must provide a useful action such as:

* Retry
* Download Original
* Open Read Only
* Use Local Viewer
* Return to Library

Do not display blank workspaces.

# 22. Performance

PDF:

* Render only visible or nearby pages.
* Cancel obsolete render tasks.
* Do not render every large page at maximum resolution.
* Lazy-load thumbnails.
* Keep page scrolling smooth.

Spreadsheet:

* Use the spreadsheet engine’s virtualized grid.
* Do not render cells as individual React components.
* Debounce autosave.
* Avoid serializing the whole workbook on every keypress.
* Show a warning before opening an excessively large workbook.
* Keep the UI responsive while importing.

# 23. Accessibility

Ensure:

* PDF toolbar has accessible labels.
* PDF pages expose page numbers.
* Search results are announced.
* Annotation tools expose selected state.
* Spreadsheet toolbar has accessible labels.
* Cell selection has an accessible name.
* Formula bar is keyboard accessible.
* Sheet tabs use proper tab semantics.
* Comments can be opened by keyboard.
* Focus returns after closing panels.
* Status is not communicated only by color.
* Save-state updates use polite live announcements.
* Mobile controls use at least 44px targets.
* Reduced-motion preference is respected.

# 24. Tests

Add tests for:

## Format routing

* PDF opens PDF workspace.
* XLSX opens spreadsheet workspace.
* DOCX still opens the current rich-text editor.
* ONLYOFFICE provider opens the provider frame.
* Unsupported files show the correct fallback.

## PDF

* Valid PDF renders.
* Page navigation works.
* Zoom works.
* Search works.
* Highlight is stored.
* Region comment is stored.
* Comment navigation opens the correct page.
* Annotation reload works.
* Locked PDF blocks annotation.
* Download permission is respected.
* Annotated export preserves the original.

## Spreadsheet

* XLSX imports.
* XLS imports.
* CSV imports.
* TSV imports.
* ODS imports.
* Workbook reload restores saved content.
* Sheet switching works.
* Cell editing works.
* Formula entry works.
* Add and rename sheet works.
* Cell comment is anchored correctly.
* Save Version creates a snapshot.
* Restore creates a new version.
* Export respects permissions.
* Macros are never executed.

## Upload security

* Valid CSV accepted.
* HTML renamed as CSV rejected.
* Executable renamed as XLSX rejected.
* Invalid ODS container rejected.
* Invalid XLSM container rejected.
* Macro warning appears for XLSM.

## Regression

* Current document editor still works.
* DOCX conversion still works.
* Existing comments still work.
* Existing versions still work.
* Existing workflow still works.
* Document Library table remains unchanged.
* Row click still opens the drawer.
* Board Pack integration still works.
* My Tasks document actions still work.

Run:

* `pnpm run typecheck`
* `pnpm run test`
* `pnpm run build`

Fix all errors before completion.

# 25. Required delivery

Deliver:

* Format-aware workspace router
* Local PDF viewer
* PDF annotation layer
* PDF comments
* PDF search
* Annotated PDF export
* Local spreadsheet editor
* Spreadsheet import
* Spreadsheet export
* Multiple sheet support
* Spreadsheet comments
* Spreadsheet autosave
* Spreadsheet versions
* Connected ONLYOFFICE frame
* Format-specific provider capabilities
* Updated upload validation
* Updated Document Details drawer
* Updated file icons and filters
* Responsive PDF and spreadsheet workspaces
* Error states
* Tests

## Golden Rules

* Do not break the working document editor.
* Do not redesign the Document Library.
* Do not replace `UnifiedDataTable`.
* Keep only View inside table rows.
* Do not overwrite original uploaded files.
* Do not store large files or workbook snapshots in localStorage.
* Do not execute spreadsheet macros.
* Do not enable external spreadsheet scripts or data connections.
* Do not claim that local PDF mode edits original PDF text.
* Do not fake real-time collaboration.
* Do not fake Office-format fidelity.
* Show only tools that genuinely work.
* Preserve comments, versions, workflow, permissions, and audit history.
* Reuse the existing full-screen editor shell and design tokens.
* Test desktop, tablet, and mobile.
* Keep EN/BN behavior unchanged.
* Keep the Help icon hidden.
* Do not create User Guide or Help content.

```
```
