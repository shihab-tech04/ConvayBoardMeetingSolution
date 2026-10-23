# Document Management — Phase D1: Simplify Document Creation and Context

Work only on the Document Library → Add Document → Create Document journey in the current restored Board Meeting Solution.

Do not redesign the Document Library, drawer, viewer, editor, navigation, theme, table, or other modules.

## Inspect and reuse

Inspect:

* `src/app/pages/agenda-documents/DocumentLibraryPage.tsx`
* `src/app/components/documents/DocumentComposerModal.tsx`
* `src/app/components/forms/AppFileUpload.tsx`
* `src/app/services/repositories/documentContentStore.ts`
* Existing document and version registries
* Existing audit registry
* Canonical user registry
* Governance-body registry
* Meeting registry
* Agenda registry
* Agenda-document relationship registry
* Existing shared modal, buttons, fields, selectors, and confirmation patterns

Do not create another composer, uploader, content store, document registry, modal, or form system.

## Required user journey

`Document Library → Add Document → Choose Source → Enter Essential Details → Create → Open Document Details or Editor`

Keep the journey short and clear.

## Add Document entry

Keep one primary page action:

`Add Document`

It must open the existing `DocumentComposerModal`.

Preserve the current Document Library:

* Tabs
* Search
* Filters
* Sorting
* Pagination
* URL state
* Table
* Mobile cards
* Detail drawer

Closing the composer must return users to the same Library state.

## Document sources

Support:

1. Upload File
2. Blank Document
3. Use Template, only when real templates exist

Recommended source order:

* Upload File
* Blank Document
* Use Template

Do not show Use Template when the template registry contains no eligible templates.

Do not show an active template flow that cannot create a real document.

## Simplified Upload File form

For a normal upload, show only:

### Document File

Required.

Use the existing `AppFileUpload`.

Preserve:

* Current supported formats
* File-size validation
* MIME validation
* File-signature validation
* Office-container validation
* Dangerous-file detection
* Macro warning

### Document Name

Required.

Automatically suggest the original filename without the extension.

Allow users to edit it.

### Document Type

Required.

Automatically suggest a type when it can be safely inferred.

Do not require users to understand file extensions and document types as the same concept.

### Document Owner

Required.

Replace the free-text Owner input with the existing canonical active-user selector.

Default to the current user.

Show:

* Name
* Designation
* Organizational unit

Store the stable user ID as the relationship source.

Preserve a readable owner name only as derived or compatibility data.

### Confidentiality

Required.

Default to:

`Internal`

### Description

Optional.

Keep it short.

Do not show the following by default during an ordinary upload:

* Governance Body
* Related Meeting
* Related Agenda
* Tags
* Acknowledgement Required
* Effective Date
* Expiry Date
* Chairperson
* Meeting Secretary
* Agenda Reference
* Resolution Reference

Place supported optional metadata inside one collapsed section:

`More Details`

Do not create multiple open accordions for a basic upload.

## Blank Document form

Show:

* Document Name
* Document Type
* Document Owner
* Confidentiality
* Optional Description

After creation:

1. Create one canonical document.
2. Create empty editor content in IndexedDB.
3. Create version 1.0.
4. Create an audit event.
5. Open the existing rich-text editor.

Do not open a PDF or upload workspace for a blank document.

## Template form

Show this source only when eligible templates exist.

Require:

* Template
* Document Name
* Owner
* Confidentiality

Keep meeting-specific replacement values inside one optional collapsed section.

Do not modify the source template.

Create an independent document and version.

## Context-aware creation

Extend the existing composer props safely to support optional context:

* Initial agenda ID
* Initial meeting ID
* Initial governance-body ID
* Source module
* Return callback

When opened from Agenda Builder:

* Preselect the agenda internally.
* Show a compact context summary.
* Do not force users to select the same agenda again.
* Create the document normally in Document Library.
* Create the agenda-document relationship after successful storage.
* Return to the same child agenda.

When opened from a meeting:

* Preselect the meeting.
* Preserve the meeting context.
* Do not create a duplicate document.

## Persistence order

For uploaded files, use this order:

1. Validate the file.
2. Generate document and version IDs.
3. Store the original file in IndexedDB.
4. Create document metadata.
5. Create version 1.0.
6. Create the audit event.
7. Create agenda or meeting relationships.
8. Notify the calling workflow.
9. Open Document Details.

If file storage fails:

* Do not create metadata.
* Do not create a version.
* Do not create relationships.
* Keep the composer open.
* Preserve entered values.
* Show a clear error.

## Unsaved changes

Use the existing confirmation modal when users attempt to close after:

* Selecting a file
* Entering metadata
* Selecting a template
* Changing context

Actions:

* Continue Editing
* Discard

Do not use `window.confirm`.

## Completion criteria

* Add Document opens one simple composer.
* Ordinary upload requires only essential information.
* Owner uses a canonical user ID.
* Template appears only when usable.
* Original files remain in IndexedDB.
* Blank documents open the editor.
* Context from Agenda Builder and meetings is preserved.
* Failed storage creates no orphan data.
* Repeated submission creates no duplicate records.
* Existing Library behavior remains unchanged.

# Golden Rules

* Do not break solved Document Management features.
* Do not redesign the Document Library.
* Do not create another composer, uploader, registry, repository, or content store.
* Do not store files or large content in localStorage.
* Do not overwrite original uploads.
* Do not expose unnecessary fields by default.
* Reuse canonical users, agendas, meetings, governance bodies, fields, buttons, modals, and design tokens.
* Preserve desktop, mobile, themes, accessibility, EN/BN, IDs, versions, relationships, and audit history.
