# Document Management — Phase D3: Integration and Deep User-Journey Audit

Complete and audit the Document Management journey after D1 and D2.

Do not add unrelated features.

Do not provide only an audit report. Fix every safe issue found inside this scope and retest it.

## Complete journey

The final Document Management journey must be:

`Document Library`
→ `Add or Select Document`
→ `Create or Upload`
→ `Open Details`
→ `View or Edit`
→ `Save or Create Version`
→ `Submit for Review`
→ `Approve and Publish`
→ `Link to Agenda or Meeting`
→ `Open from the Linked Workflow`
→ `Preserve History`

Keep the journey simple.

Do not require users to complete optional governance metadata during every upload.

## Agenda Builder integration

Test the restored simplified Agenda Builder:

1. Create a parent agenda.
2. Create a child agenda.
3. Select Upload New Document.
4. Create the document through the existing composer.
5. Return to the same child.
6. Confirm the new attachment appears immediately.
7. Select Choose from Library.
8. Search and select existing documents.
9. Preview a PDF, spreadsheet, image, and unsupported document.
10. Unlink one document.

Verify:

* Uploading from a child does not require an unnecessary first save step.

Use either:

* A safe automatic child Draft save before opening the composer, or
* Temporary staged relationships committed when the child is saved

Choose the approach that best fits the existing registry without introducing another state system.

Requirements:

* Do not create duplicate child agendas.
* Do not create duplicate documents.
* Do not create duplicate agenda-document links.
* Unlinking must not delete the document.
* Closing preview restores the same child.
* Historical Level 3 agendas remain preserved.
* New Level 3 creation remains blocked.

## Meeting integration

Verify existing meeting workflows can:

* Select eligible documents
* Display documents inherited from selected agendas
* Add additional documents
* Preview documents
* Preserve the selected version
* Prevent duplicate relationships
* Remove only the meeting link

Do not copy document binaries into meetings.

Do not change Meeting Creation beyond the small adapter needed for document selection and context.

## Canonical relationships

Verify new relationships use stable IDs for:

* Owner user
* Governance body
* Agenda
* Meeting
* Document
* Version

Keep names as display labels only.

Migrate new form behavior first.

Do not destructively rewrite historical records without a safe migration.

## Workflow journey

Test:

1. Draft
2. Submit for Review
3. Request Changes
4. Edit
5. Resubmit
6. Pending Approval
7. Approve
8. Publish
9. Archive

Also test Reject.

Verify:

* Workflow state updates in the canonical document record.
* Approval uses a real version.
* Publish is blocked before approval.
* Comments and history remain.
* Editing and locking follow current rules.
* Unauthorized actions are blocked in handlers.
* Library and drawer status update immediately.

Do not invent a second workflow.

## Document Library regression

Verify:

* All Document Library tabs still work.
* Search works.
* Filters work.
* URL state persists.
* Pagination works.
* Summary-card actions work.
* Desktop table works.
* Mobile cards work.
* Full mobile card opens details.
* Closing details preserves state.
* Empty, loading, error, and permission states work.

Do not remove existing views merely to simplify creation.

## Agenda Builder cleanup included in this audit

Correct these remaining issues without redesigning the builder:

* Replace `window.alert` with the existing validation or confirmation UI.
* Replace `window.confirm` with the existing confirmation modal.
* Replace the rich-text link `window.prompt` with the existing small input modal or supported editor link interaction.
* Resolve users by stable IDs rather than matching duplicate names.
* Add focused tests for parent plus multiple children.
* Confirm no new Level 3 item can be created.

Do not change the completed two-level Agenda Builder layout.

## Required regression test

Test:

1. Upload a PDF.
2. Refresh and open it.
3. Download it.
4. Create a blank document.
5. Edit and autosave it.
6. Create a named version.
7. Restore an older version.
8. Upload a spreadsheet.
9. Open and save workbook data.
10. Upload an image.
11. Preview it.
12. Upload a presentation.
13. Confirm honest supported or unsupported behavior.
14. Add a comment.
15. Resolve and reopen the comment.
16. Manage access.
17. Submit, request changes, approve, and publish.
18. Link to an agenda.
19. Open it from Agenda Builder.
20. Link to a meeting.
21. Open it from Meeting Details.
22. Archive it.
23. Refresh after every major stage.

Negative tests:

* Renamed executable
* Empty file
* Corrupt Office file
* MIME mismatch
* HTML renamed to CSV
* Macro-enabled spreadsheet
* Unsupported presentation preview
* Missing original content
* Inactive owner
* Unauthorized approval
* Duplicate upload click
* Duplicate agenda link
* Duplicate meeting link
* Closing with unsaved changes

## Technical validation

Run:

* Type checking
* Existing tests
* Document Library tests
* Upload tests
* Content-store tests
* Viewer-routing tests
* PDF tests
* Spreadsheet tests
* Version tests
* Workflow tests
* Permission tests
* Agenda-link tests
* Meeting-link tests
* Agenda Builder tests
* Responsive checks
* Accessibility checks
* EN/BN checks
* Theme checks
* Production build

Do not delete or weaken tests to obtain a passing result.

## Required final report

Provide:

### Agenda Builder verdict

* Complete
* Mostly Complete
* Partially Complete
* Not Complete

Include a percentage.

### Document Management verdict

* Complete
* Mostly Complete
* Partially Complete
* Not Complete

Include a percentage.

### Journey matrix

Report Pass, Partial Pass, or Fail for:

* Library discovery
* Upload
* Blank document
* Template
* Metadata
* File validation
* Content persistence
* Details
* Viewer routing
* Rich-text editing
* PDF
* Spreadsheet
* Images
* Presentations
* Versions
* Comments
* Access
* Workflow
* Agenda integration
* Meeting integration
* Mobile
* Accessibility
* EN/BN
* Themes
* Persistence

## Completion criteria

Document Management is complete only when:

* Users can find a document easily.
* Add Document is short and clear.
* Uploaded files and editor content persist.
* Documents open in the correct workspace.
* Users can view, edit, version, review, approve, publish, and archive.
* Documents link cleanly to child agendas and meetings.
* Stable IDs are used for relationships.
* No duplicate records or links are created.
* Original files and historical versions remain unchanged.
* Agenda Builder remains functional.
* Desktop, tablet, and mobile work.
* Type checking, tests, and production build pass.

# Golden Rules

* Do not break solved Agenda Builder or Document Management features.
* Do not create unnecessary functions, inputs, tabs, pages, or components.
* Do not create duplicate registries, repositories, viewers, editors, workflows, or relationships.
* Do not rebuild unrelated modules.
* Keep basic actions visible and advanced actions secondary.
* Reuse existing components and design tokens.
* Preserve routes, navigation, themes, tables, drawers, modals, IDs, versions, permissions, links, and audit history.
* Preserve desktop, tablet, mobile, accessibility, EN/BN, and all existing themes.
* Audit, fix, retest, and report honestly.
