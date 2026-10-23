## Audit result

The PDF problem is not a styling issue. The project currently has **two unrelated document-viewing systems**, and the attachment flow bypasses the main document workspace.

### P0 — Two PDF viewers are active

The Document Library uses this flow:

`DocumentComposerModal → documentContentStore → DocumentEditorPage → DocumentWorkspaceRouter → PdfWorkspace`

This is the full PDF.js workspace with the shared document shell.

Attachments uploaded through forms use a different flow:

`AppFileUpload → AttachmentItem → AttachmentList → AttachmentPreviewModal → iframe`

`AttachmentPreviewModal.tsx` still renders PDFs through:

```tsx
<iframe
  src={attachment.objectUrl}
  title="PDF preview"
  className="attachment-preview__frame"
/>
```

That is why the PDF preview still has a separate browser-native UI. It does not use `PdfWorkspace`, `DocumentEditorShell`, the project toolbar, page controls, loading states, or theme.

### P0 — Attachment files are not stored like Document Library files

Document Library uploads are persisted through:

```ts
documentContentStore.putOriginalFile(docId, file)
```

Generic form uploads only create temporary URLs:

```ts
objectUrl: URL.createObjectURL(file)
```

Those URLs:

* Exist only for the current browser session.
* Cannot survive a reload.
* Are revoked when `GeneratedTablePage` unmounts.
* Do not provide a stable document ID.
* Cannot be loaded by `PdfWorkspace`, because `PdfWorkspace` expects a document ID and reads from `documentContentStore`.

This data-model split is the main architectural root cause.

### P1 — The main PDF workspace also contains regressions

Direct source inspection found several issues inside the existing PDF workspace:

1. `PdfWorkspace.tsx` writes `occurred_at` when the `AuditEvent` model requires `timestamp`, `ip_address`, and `approval_status`.
2. The Versions panel reads nonexistent fields:

```ts
v.version
v.label
```

The actual model uses:

```ts
version_number
version_name
change_summary
```

3. `PdfAnnotationLayer` applies `pointerEvents: "none"` both through CSS and inline styling. Its annotations therefore cannot reliably receive the click and keyboard handlers defined on them.
4. Every annotation tool currently creates almost the same fixed rectangle. Highlight, underline, strikeout, sticky note, free text, and freehand are presented as separate tools without separate interaction logic.
5. Redo is visible but permanently disabled and has an empty callback.
6. “Fit page” and “Fit width” use fixed zoom values of `100%` and `125%` rather than calculating the available viewport.
7. Rotation is applied with a CSS transform around the page wrapper, while annotation coordinates and available canvas space are not recalculated consistently.

### P1 — PDF UI bypasses existing components

The iframe preview has its own:

* Modal layout
* Footer
* Open and Download actions
* CSS
* PDF toolbar supplied by the browser

The full PDF workspace also uses many custom 26px toolbar controls instead of the established application button and tap-target rules. The two experiences therefore look and behave differently.

### P2 — Current tests do not verify the real flow

The existing tests mostly verify:

* Format mapping
* File validation helpers
* Annotation data structures
* Registry filtering

They do not test:

`Upload PDF → save file → click View → load the same file in the shared viewer`

The audit documents claim that the PDF workspace passes, but the current source still contains issues those audit documents say were fixed. This indicates version drift or a later regression.

I could not complete a full build because dependencies were not included in the archive and installation exceeded the execution limit. The findings above come from direct inspection of the current source.

---

## Master solution prompt

````text
Deeply inspect the uploaded Board Meeting Solution project and fix the document upload and document-viewing architecture.

The current problem is not limited to CSS. The project has two separate PDF viewing systems:

1. Documents uploaded through Document Library are stored in IndexedDB and opened through:
   DocumentEditorPage → DocumentWorkspaceRouter → PdfWorkspace.

2. Files uploaded through forms and displayed in detail drawers are converted into AttachmentItem objects with temporary object URLs and opened through:
   AttachmentList → AttachmentPreviewModal → browser iframe.

Remove this split. Every PDF View action in the project must use one shared PDF viewer and one shared document workspace UI.

Do not redesign unrelated pages. Do not change meeting, agenda, workflow, approval, voting, form, table, drawer, API, permission, or business logic.

## Root problems that must be fixed

### Separate PDF renderer

`src/app/components/attachments/AttachmentPreviewModal.tsx` still renders PDFs with:

<iframe src={attachment.objectUrl} />

Remove the iframe PDF implementation completely.

A PDF must never use the browser’s native embedded PDF toolbar inside this application.

### Separate file-storage models

Document Library uploads use:

`documentContentStore.putOriginalFile(documentId, file)`

Generic form attachments use:

`URL.createObjectURL(file)`

An object URL is temporary and must not be the source of truth for an uploaded file.

Create one stable file-source model that both the Document Library and generic attachments can use.

### PdfWorkspace is coupled to BoardDocument and IndexedDB

The current `PdfWorkspace` can only receive a `BoardDocument`, derive its ID, and load the file from `documentContentStore`.

Refactor the viewer so its rendering core can receive different file sources without duplicating UI.

## Required architecture

Create a shared document-source contract.

Suggested location:

`src/app/components/documents/documentSource.ts`

Use a discriminated union similar to:

```ts
export type DocumentSource =
  | {
      kind: "stored";
      documentId: string;
      versionId?: string;
    }
  | {
      kind: "file";
      file: File;
    }
  | {
      kind: "blob";
      blob: Blob;
      fileName: string;
      mimeType: string;
    }
  | {
      kind: "url";
      url: string;
      fileName: string;
      mimeType: string;
    };
````

Add one resolver:

```ts
export async function resolveDocumentFile(
  source: DocumentSource
): Promise<File>
```

Rules:

* `stored` retrieves the file from `documentContentStore`.
* `file` returns the supplied File.
* `blob` creates a File with the supplied name and MIME type.
* `url` fetches the content only when the URL is a supported trusted source.
* Return clear errors for missing, inaccessible, or expired files.
* Do not silently fall back to an iframe.

## Create a reusable PDF rendering core

Extract the actual PDF rendering logic from `PdfWorkspace.tsx` into:

`src/app/components/documents/pdf/PdfViewerCore.tsx`

It should accept:

```ts
interface PdfViewerCoreProps {
  source: DocumentSource;
  documentId?: string;
  title: string;
  version?: string;
  permissions: {
    download: boolean;
    print: boolean;
    annotate: boolean;
    comment: boolean;
    versions: boolean;
    workflow: boolean;
  };
  mode?: "workspace" | "preview";
  onClose: () => void;
}
```

`PdfViewerCore` must own:

* PDF.js loading
* Page rendering
* Page navigation
* Actual page count
* Zoom
* Calculated fit-page
* Calculated fit-width
* Rotation
* Search
* Thumbnails
* Loading states
* Missing-file state
* Invalid-file state
* Password-protected state
* Download
* Print
* Annotation rendering when permitted

The viewer must not know whether its file came from Document Library, a meeting form, an agenda attachment, a drawer, or Special Registration.

## Create one unified document viewer

Create:

`src/app/components/documents/UnifiedDocumentViewer.tsx`

Responsibilities:

* Receive a `DocumentSource`
* Detect the document type through the existing format utilities
* Route PDFs to `PdfViewerCore`
* Route spreadsheet files to the existing spreadsheet workspace
* Route supported rich-text documents to the existing document editor flow
* Route images to a shared image workspace
* Show one shared unsupported-file state
* Use the existing full-screen document workspace shell

Do not create another PDF toolbar, modal, or document shell.

## Change attachment viewing

Update:

* `src/app/components/attachments/AttachmentList.tsx`
* `src/app/components/attachments/AttachmentPreviewModal.tsx`
* `src/app/components/attachments/attachmentTypes.ts`
* Attachment creation helpers
* Detail drawer integrations

Extend `AttachmentItem` with stable source information:

```ts
fileRef?: string;
documentId?: string;
source?: DocumentSource;
```

Do not use `objectUrl` as the permanent file reference.

The View action for a PDF must open `UnifiedDocumentViewer` in the same full-screen workspace used by Document Library.

Required behaviour:

1. User opens a detail drawer.
2. User clicks View on a PDF attachment.
3. The shared full-screen document viewer opens above the drawer and application shell.
4. The PDF uses the same header, toolbar, canvas, loading states, controls, and responsive behaviour as a PDF opened from Document Library.
5. Closing the viewer returns the user to the same detail drawer.
6. Preserve the drawer tab, drawer scroll position, page filters, table position, and unsaved parent-form state.

Do not open a PDF inside `AppModal`.

Do not use an iframe, object, embed, or browser-native PDF viewer.

`AttachmentPreviewModal` may be removed if it is no longer required. Images should also use `UnifiedDocumentViewer` where practical.

## Unify upload persistence

Update generic document and attachment upload handling so accepted files are stored through one repository.

Do not create object URLs while creating permanent attachment records.

Create a stable stored-file reference containing:

* File ID
* Parent entity type
* Parent entity ID
* Original file name
* MIME type
* Extension
* File size
* Upload date
* Stored content reference

The frontend storage implementation may continue using IndexedDB, but the interface must be compatible with a future backend file ID.

Object URLs may only be created temporarily inside the viewer or download handler and must be revoked after use.

Do not store object URLs in localStorage or row data.

Do not automatically add every attachment to the Document Library registry. Attachments and library documents may remain separate business records while sharing the same file repository and viewer.

## Preserve upload validation

Reuse the existing extension, MIME, magic-byte, dangerous-signature, and Office-container validation.

Extract the validation logic from `AppFileUpload.tsx` into one reusable utility instead of creating another validation implementation.

Suggested file:

`src/app/utils/documentFileValidation.ts`

Use the same validation from:

* Document Library upload
* Meeting document upload
* Agenda attachments
* Minutes attachments
* Resolution attachments
* Generic generated forms
* Special Registration where its allowed file list applies

Keep each form’s current accepted extensions, maximum file count, maximum size, required state, and error messages.

Do not broaden a form’s accepted formats unless its existing configuration already permits them.

## Fix PdfWorkspace regressions

Correct the current source defects while extracting `PdfViewerCore`.

### Audit event

Replace the incorrect event field:

```ts
occurred_at
```

with a complete valid `AuditEvent` record using:

```ts
timestamp
ip_address
approval_status
```

Do not leave partial audit records.

### Version fields

Replace:

```ts
v.version
v.label
```

with the actual `DocumentVersion` fields:

```ts
v.version_number
v.version_name
v.change_summary
```

Show the version name when present and fall back to the change summary.

### Annotation pointer events

Remove the unconditional `pointer-events: none` behaviour that prevents annotations from receiving interaction.

Use:

* The empty annotation layer should not block PDF canvas interactions.
* Rendered annotation elements must receive pointer and keyboard events.
* Each annotation must have an accessible label.
* Selecting an annotation must work with mouse, touch, Enter, and Space.

### Annotation tools

Do not show tools that only create the same generic rectangle.

Either implement each exposed tool properly or temporarily hide unfinished tools.

Minimum valid behaviour:

* Highlight: visible translucent highlight region
* Underline: line at the bottom of the selected region
* Strikeout: line through the selected region
* Rectangle: outlined rectangle
* Arrow: directional line with arrowhead
* Sticky note: note marker plus text-entry interaction
* Free text: text-entry interaction
* Ink: pointer-drawn path

Undo and redo must both work if both controls are visible. Do not render a permanently disabled fake Redo action.

### Fit calculations

Replace fixed fit values:

* Fit page must calculate scale from available canvas width and height.
* Fit width must calculate scale from available canvas width.
* Recalculate after resize, panel changes, thumbnail changes, and rotation.
* Use `ResizeObserver`.
* Respect minimum and maximum zoom limits.

### Rotation

Rotation must:

* Recalculate rendered dimensions
* Keep the page centred
* Avoid clipping
* Keep annotation geometry aligned
* Keep click coordinates correct

## Shared UI requirements

The PDF opened from an attachment and the PDF opened from Document Library must look identical.

Reuse:

* `FullScreenWorkspaceShell`
* `DocumentEditorShell`
* Existing design tokens
* Existing application button components
* Existing header patterns
* Existing status and error components
* Existing icons
* Existing light and dark themes

Do not maintain a separate `.attachment-preview__frame` PDF UI.

The full-screen viewer header should contain:

* Back button
* File-type icon
* Document/file name
* Version when available
* Read-only or editing state
* Relevant document actions

Toolbar controls must:

* Use the existing button system or a shared toolbar-button component
* Have visible hover, active, disabled, and focus states
* Use at least 36px controls on desktop
* Use at least 44px tap targets on touch/mobile layouts
* Use tooltips and accessible labels

## Mobile behaviour

On mobile:

* Keep the viewer full screen.
* Do not open the PDF as an AppModal bottom sheet.
* Hide the thumbnail rail by default.
* Open thumbnails through a drawer or overlay.
* Open comments, versions, workflow, and activity through one mobile side panel or bottom sheet.
* Keep page navigation, zoom, search, and download accessible.
* Prevent horizontal page clipping.
* Preserve safe-area spacing.
* Do not use the browser-native PDF toolbar.

## Metadata-only files

Some existing rows contain file names without actual stored file content.

For these records:

* Do not show an active View button.
* Show a clear disabled state such as “File content unavailable.”
* Keep Download disabled unless a real file source exists.
* Do not fabricate a PDF or use a placeholder URL.

## Tests

Add integration tests that verify the real user flow.

Required tests:

1. Upload a valid PDF through Document Library.
2. Confirm the file is stored through the shared file repository.
3. Open it from the Document Library drawer.
4. Confirm `UnifiedDocumentViewer` and `PdfViewerCore` render.
5. Upload a PDF through a generic form attachment field.
6. Open the resulting detail drawer.
7. Click View.
8. Confirm the exact same PDF viewer renders.
9. Confirm no iframe, object, or embed element is used for PDFs.
10. Close the viewer and confirm the original drawer remains open.
11. Confirm attachment files can be reopened after remount or reload.
12. Confirm missing file content shows the shared missing-file state.
13. Confirm invalid PDFs show the shared invalid-file state.
14. Confirm password-protected PDFs show the shared protected-file state.
15. Confirm version information uses `version_number`.
16. Confirm valid AuditEvent fields are created.
17. Confirm annotation elements can receive pointer events.
18. Confirm fit-page and fit-width react to container resizing.
19. Confirm desktop, tablet, and mobile use the same viewer architecture.
20. Confirm existing upload validation and Document Library tests still pass.

Run:

* Type checking
* Full test suite
* Production build

Fix all issues caused by this document-viewer change.

## Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not remove working document features.
* Do not change meeting, agenda, workflow, approval, or permission logic.
* Do not use an iframe, object, or embed for PDF viewing.
* Do not keep separate PDF viewer UIs.
* Do not use temporary object URLs as permanent file references.
* Reuse the existing document shell, viewer components, design tokens, and storage services.
* Do not expose unfinished controls as working features.
* Preserve desktop, tablet, and mobile behaviour.
* Preserve light and dark theme consistency.
* Test the complete upload-to-view flow, not only isolated helper functions.

```
```
