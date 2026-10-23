# Document Management — Phase D2: Complete Details, Viewing, Editing, and Versions

Work only on the journey after a document has been created or selected.

Required journey:

`Document Library → Open Document Details → View or Edit → Save → Create or Restore Version → Return to Library`

Do not rebuild the current drawer, PDF viewer, spreadsheet workspace, rich-text editor, or repository layer.

## Inspect and reuse

Inspect:

* `DocumentDetailsDrawer.tsx`
* `UnifiedDocumentViewer.tsx`
* `DocumentWorkspaceRouter.tsx`
* `DocumentEditorPage.tsx`
* Existing PDF workspace
* Existing spreadsheet workspace
* Existing rich-text editor
* `documentSource.ts`
* `documentFormat.ts`
* `documentContentStore.ts`
* Existing version registry
* Existing comments and access repositories
* Existing permissions
* Existing shared overlay, tabs, buttons, status badges, and confirmation modal

Do not create another viewer, editor, drawer, version system, or format router.

## Document Details default experience

Keep these existing tabs:

* Overview
* Access
* Workflow
* Versions
* Comments
* Activity

Do not remove working tabs.

Make Overview the default and keep it easy to scan.

Show the essential summary first:

* Document name
* Document number
* File format
* Version
* Owner
* Status
* Confidentiality
* Related agenda or meeting
* Last modified date

Move secondary metadata below the summary.

Hide:

* Empty values
* Undefined values
* Raw IDs when names are available
* Empty sections

## Drawer actions

Keep one clear primary action based on the document:

* Open Viewer
* Open Editor
* Continue Editing
* Review Document

Keep frequent secondary actions visible when valid:

* Download
* Submit for Review

Place less-frequent actions in the existing overflow action pattern:

* Manage Access
* Create Version
* Restore Version
* Request Changes
* Approve
* Reject
* Publish
* Archive

Do not remove workflow actions.

Do not display actions that are:

* Unsupported for the format
* Invalid for the current status
* Blocked by permission
* Nonfunctional

Keep permission enforcement in handlers.

## Correct format routing

Fix the existing assumption that every stored document is a PDF.

A stored source must be routed using the canonical document metadata:

* MIME type
* File format
* Content type
* Validated workspace type

Route:

* PDF → PDF workspace
* Spreadsheet → Spreadsheet workspace
* Rich-text or editable document → Rich-text editor
* Image → Existing image viewer
* Presentation → Existing supported presentation behavior
* Unsupported format → Honest unsupported-preview state with Download

Update the existing viewer or its props.

Do not create a second viewer component.

Do not send DOCX, XLSX, images, presentations, CSV, or TXT files into the PDF viewer merely because their source is stored.

## Image and presentation behavior

For images:

* Resolve the real stored file.
* Display it using the existing full-screen viewer.
* Preserve aspect ratio.
* Provide Download when permitted.

For presentations:

* Use the current working presentation behavior if it exists.
* When in-app preview is not genuinely supported, show a clear unsupported-preview message and Download.
* Do not fabricate slides.

## Return context

Opening a viewer or editor from:

* Document Library
* Agenda Builder
* Meeting Creation
* Meeting Details

must preserve its source.

Closing must restore:

* Previous route
* Document Library tab
* Search
* Filters
* Pagination
* Open drawer where appropriate
* Selected agenda or meeting

Do not return every user to the default Document Library state.

## Rich-text editing

Preserve the existing editor tools.

Verify:

* Content loads from IndexedDB.
* Autosave writes only after storage succeeds.
* Saving status is accurate.
* Refresh preserves content.
* Read-only and locked states work.
* Unsupported toolbar buttons are not shown.

Do not replace the editor with a textarea.

## PDF workspace

Preserve:

* Real rendering
* Page navigation
* Thumbnails
* Search
* Zoom
* Rotate
* Annotations
* Comments
* Download
* Print where permitted

Keep annotations separate from the original PDF.

Do not overwrite the original file.

## Spreadsheet workspace

Preserve:

* Workbook import
* Multiple sheets
* Formulas
* Formatting
* Formula bar
* Sheet tabs
* Comments
* Autosave
* Version snapshots
* Macro warning

Do not replace the spreadsheet engine with an HTML table.

## Version journey

Users with permission must be able to:

* View versions
* See version number
* See author
* See date
* See change summary
* Create a named version
* Open an older version
* Restore an older version
* Download an available version

Rules:

* Restoring creates a new current version.
* Never erase older versions.
* Never overwrite the original upload.
* Approved and published versions remain identifiable.
* Board Pack-pinned versions remain unchanged until explicitly updated.

## Missing-content state

For legacy metadata-only records:

Show:

`The original file is not available for this document.`

Valid actions:

* View Metadata
* Upload Replacement as New Version
* Archive

Do not show a fake preview.

## Completion criteria

* The details drawer remains complete but easier to scan.
* One valid primary action is clear.
* Stored documents open the correct workspace.
* Images and unsupported presentations behave honestly.
* Editors and viewers use actual stored content.
* Closing restores the source context.
* Autosave and versions persist.
* Original files remain unchanged.
* Existing access, workflow, comments, and activity features remain functional.

# Golden Rules

* Do not create another drawer, viewer, editor, or router.
* Do not remove existing document tabs or working features.
* Do not send every stored file to the PDF viewer.
* Do not fabricate previews.
* Do not overwrite original files or version history.
* Reuse existing repositories, content store, permissions, tabs, overlays, buttons, and design tokens.
* Preserve desktop, mobile, accessibility, EN/BN, themes, and source context.
