# Simplified Agenda Creation Journey — Agenda List to Full-Screen Agenda Builder

Work only on the Agenda Creation journey in the current Board Meeting Solution project.

The required journey is:

`Agenda List → Add Agenda → Parent Agenda Details → Agenda Builder → Add Multiple Child Agendas → Attach Documents → Save Agenda → Return to Agenda List`

This task must simplify the existing agenda experience.

Do not redesign or rebuild Agenda Management from scratch.

Do not change navigation, themes, colors, page layouts, tables, drawers, approvals, permissions, document engines, or unrelated modules.

---

## 1. Inspect the current implementation first

Open and inspect:

```text
src/app/pages/register-stock/Register4ListPage.tsx
src/app/components/agenda/AgendaFormModal.tsx
src/app/components/modals/AppModal.tsx
src/app/components/documents/DocumentComposerModal.tsx
src/app/components/documents/UnifiedDocumentViewer.tsx
src/app/pages/agenda-documents/DocumentEditorPage.tsx
src/app/data/boardMeetingData.ts
src/app/data/bmsUsers.ts
```

Also inspect and reuse the existing:

* Agenda registry
* Agenda-document link registry
* Document registry
* Canonical user registry
* Full-page modal
* Buttons
* Form fields
* Number field
* User selectors
* Attachment cards
* Document uploader
* Document picker
* Document viewer
* Confirmation modal
* Status badge
* Empty state
* Loading state
* Rich-text editor configuration
* Responsive layout rules

Do not create a new agenda registry, document registry, modal system, editor system, viewer, uploader, or design system.

Do not create new visual component files.

---

# 2. Make Agenda List the starting point

Agenda Management must open with the existing agenda list as the primary view.

The user journey must start from:

```text
Agenda Management
→ Agenda List
→ Add Agenda
```

Preserve:

* Existing agenda table
* Search
* Filters
* Sorting
* Pagination
* Approval Queue
* Temporary Agenda Review
* Detail drawer
* Existing agenda actions
* Existing mobile cards

Do not delete the current agenda list.

## Primary page action

Change the page-header action to:

```text
Add Agenda
```

Do not use:

```text
Add Parent Agenda
```

The user does not need to understand hierarchy terminology before beginning.

The following entry points must open the same full-screen Agenda Builder:

* Page-header Add Agenda
* Empty-state Add Agenda
* Edit Agenda
* Complete Draft

Editing a child agenda must open its parent agenda and focus that child.

Closing the builder must return users to the same:

* Agenda List tab
* Search
* Filters
* Sorting
* Pagination position

Do not reset the list after closing.

---

# 3. Use one full-screen Agenda Builder

Refactor the existing `AgendaFormModal.tsx`.

Use:

```tsx
<AppModal fullPage />
```

Do not create another Agenda Builder component or page.

Do not use the current `xl` popup.

Do not use a separate inline three-panel builder on the Agenda Management page.

Move or reuse the necessary builder behavior inside the existing full-screen `AgendaFormModal`.

## Full-screen structure

Use:

1. Fixed header
2. Scrollable body
3. Fixed footer
4. Unsaved-change protection
5. Existing modal focus management
6. Existing responsive behavior

### Header

For a new agenda:

```text
Create Agenda
```

Supporting text:

```text
Add the main agenda details, then organize the discussion into child agenda items.
```

For an existing agenda:

```text
Edit Agenda
```

Show:

* Parent agenda title
* Draft or current status
* Unsaved indicator when needed

Avoid long descriptions or unnecessary statistics.

---

# 4. Use only two agenda levels

The new creation journey must support:

```text
Parent Agenda
└── Multiple Child Agendas
```

Do not allow another child below a child agenda.

New agenda records must use:

* Parent agenda: Level 1
* Child agenda: Level 2

Remove or hide from the new creation journey:

* Final-Level Agenda
* Level 3 creation
* Add Final-Level Agenda
* Final-level accordion
* Third-level tabs
* Third-level readiness information
* Third-level controls

Do not delete existing historical Level 3 records from storage.

If older records already contain Level 3 items:

* Preserve the data.
* Keep them available in historical details.
* Do not silently flatten or delete them.
* Prevent creation of new Level 3 records through this builder.

---

# 5. Parent Agenda Details — first screen

When Add Agenda opens, show a simple Parent Agenda Details screen first.

Do not show the complete builder before the parent has a title.

Use a clean centred form with a comfortable maximum width.

## Parent fields

Show only:

### Agenda Title

Required text input.

Helper text:

```text
Enter the main subject that will contain the related discussion items.
```

### Purpose

Required select.

Options:

* For Information
* For Discussion
* For Review
* For Approval
* For Decision

### Background or Summary

Optional textarea.

Keep it concise.

Do not use a large rich-text editor for the parent summary.

### Agenda Owner

Required canonical-user selector.

Show:

* User name
* Designation
* Organizational unit

Store the canonical user ID.

Do not use free-text owner names.

### Confidentiality

Required select.

Options:

* Public
* Internal
* Confidential
* Restricted

Default:

```text
Internal
```

Do not show these parent fields:

* Parent Agenda selector
* Agenda hierarchy level
* Submitted By
* Display Order
* Meeting ID
* Meeting Title
* Committee
* Submission Date
* Manual Agenda ID
* Priority
* Presenter
* Voting Required
* Financial Impact
* Proposed Decision
* Agenda Reference
* Final-level settings

Generate IDs, creator, timestamps, level, status, and order automatically.

## Parent-screen footer

Left:

```text
Cancel
```

Right:

```text
Save Draft
Continue to Agenda Builder
```

Continue must:

1. Validate the required parent fields.
2. Create or update one Level 1 Draft agenda.
3. Keep the full-screen modal open.
4. Move to the Agenda Builder stage.
5. Preserve the same parent record during all later saves.

Do not create another parent record when users move between stages.

---

# 6. Agenda Builder stage

After the parent details are saved, show a simple two-column builder.

Do not use the previous complex three-panel interface.

## Desktop layout

### Left column — Child Agenda List

Use a compact fixed-width panel.

Show:

* Parent agenda title
* Child agenda count
* Add Child Agenda button
* Child agenda cards

Each child card should show only:

* Automatic number
* Child title
* Duration
* Document count
* Draft or current status
* Unsaved indicator when applicable

Example:

```text
1.1 Quarterly Financial Performance
20 min · 2 documents
Draft
```

The full card must be clickable.

Do not add a separate View Details button.

Selected child uses the existing selected-card treatment.

Child actions:

* Edit
* Move Up
* Move Down
* Remove

Keep secondary actions inside one existing contextual menu.

Do not install a drag-and-drop library.

### Main area — Builder content

When no child exists, show a focused empty state:

```text
No child agendas added

Break the parent agenda into the individual topics that will be discussed.
```

Primary action:

```text
Add Child Agenda
```

When a child is selected, show its clean editing form.

Do not show a permanent right-side summary panel.

Do not show approval statistics, detailed readiness matrices, long checklists, or excessive metadata during creation.

---

# 7. Child Agenda creation

Selecting Add Child Agenda must open child-creation mode inside the same full-screen modal.

Do not open another nested modal over the Agenda Builder.

The entire full-screen workspace may switch to the child form while preserving:

* Parent agenda
* Existing child agendas
* Unsaved parent data
* Selected child
* Scroll context

Show a simple breadcrumb:

```text
Create Agenda
› Parent Agenda Title
› Add Child Agenda
```

## Child Agenda fields

Show only these inputs:

### Child Agenda Title

Required text input.

Helper text:

```text
Enter the specific topic that will be discussed.
```

### Agenda Details

Required rich-text field.

Label:

```text
Discussion Details
```

Placeholder:

```text
Describe the background, key discussion points, proposal, or information the board should review.
```

Reuse the existing Tiptap rich-text editor configuration from the document editor.

Do not install another editor library.

Use a compact toolbar containing only:

* Bold
* Italic
* Underline
* Bulleted list
* Numbered list
* Link
* Undo
* Redo

Do not show:

* Images
* Tables
* Headings menu
* Text alignment
* Highlight
* Advanced document-editor tools
* Comments
* Track changes
* Document outline

Store the rich-text value through the existing agenda `description` field.

Use sanitized HTML or the same stable serialized format already supported by the project.

Do not create a second agenda-description field.

### Purpose

Required select.

Use:

* For Information
* For Discussion
* For Review
* For Approval
* For Decision

### Presenter

Optional canonical-user selector.

Show name, designation, and organizational unit.

Store the user ID.

### Estimated Duration

Required number field.

Store duration consistently in minutes.

Show:

```text
minutes
```

Do not allow free-text values such as:

```text
Around half an hour
```

### Document Attachments

Show a dedicated attachment section.

Do not show extra category, priority, voting, confidentiality, owner, display-order, submitted-by, or hierarchy fields inside every child agenda.

The child inherits the parent owner and confidentiality unless the current data model already requires a safe explicit value.

---

# 8. Child document attachments

Every child agenda must support:

1. Upload New Document
2. Choose from Document Library

Use two clear existing buttons:

```text
Upload New Document
Choose from Library
```

Do not create a new uploader or document picker.

## Upload New Document

Open the existing `DocumentComposerModal`.

Open it in Upload mode.

Preselect or pass the current child agenda context.

After a successful upload:

* Create one normal Document Library record.
* Store the real file using the existing document system.
* Create the agenda-document relationship.
* Link the document to the current child agenda.
* Return to the same child form.
* Display the attachment immediately.
* Preserve all unsaved child fields.

Do not create an agenda-only document.

Do not close the full Agenda Builder unexpectedly.

Do not duplicate the document.

## Choose from Document Library

Use the existing canonical document picker behavior.

Support:

* Search
* Relevant filters
* Multi-selection
* Document title
* File format
* Version
* Owner
* Status
* Confidentiality
* Preview

Use `UnifiedDocumentViewer` for preview.

Prevent duplicate agenda-document links.

Do not copy the source document.

## Attached document list

Use the existing attachment-card or attachment-list pattern.

Show:

* Document name
* File type
* Version
* Status
* Owner

Actions:

* Preview
* Open
* Unlink

Unlinking must only remove the agenda relationship.

It must not delete the document from Document Library.

---

# 9. Child actions and footer

While creating or editing a child, use the full-screen modal footer.

Left:

```text
Back to Agenda Builder
```

Right:

```text
Save Child
Save and Add Another
```

Behavior:

### Save Child

* Validate required child fields.
* Create or update one Level 2 agenda.
* Return to the child list.
* Select the saved child.

### Save and Add Another

* Validate and save the current child.
* Return to a clean child form.
* Keep the same parent agenda.
* Do not create duplicate records.

Prevent double submission.

Show loading and disabled states.

Do not put duplicate Save buttons inside the form body.

---

# 10. Builder completion

The main Agenda Builder footer must contain:

Left:

```text
Close
```

Right:

```text
Save Draft
Save Agenda
```

## Save Draft

Require:

* Parent agenda title

Allow incomplete child agendas.

Clearly mark incomplete children.

## Save Agenda

Require:

* Valid parent agenda
* At least one child agenda
* Every child has a title
* Every child has Discussion Details
* Every child has a valid duration
* All user and document relationships are valid

Do not require approval during agenda creation.

Keep the existing Submit for Review, Approve, Reject, Revision, and approval-history actions available through the existing Agenda List or detail-drawer workflow.

Do not remove or rewrite approval logic.

After successful Save Agenda:

1. Persist the parent.
2. Persist every child.
3. Persist child order.
4. Persist agenda-document links.
5. Update the Agenda List immediately.
6. Close the full-screen builder.
7. Return to the previous Agenda List state.
8. Open the created parent’s detail drawer only if this matches the existing solved pattern.

---

# 11. Reordering and numbering

Number agendas automatically.

Example:

```text
1. Parent Agenda
1.1 First Child
1.2 Second Child
1.3 Third Child
```

Users must not manually enter agenda numbers or display order.

Support Move Up and Move Down for child agendas.

When reordered:

* Update display order.
* Recalculate visible numbering.
* Preserve child IDs.
* Preserve document links.
* Preserve selected child.
* Do not duplicate records.

---

# 12. Unsaved-change protection

Use the existing unsaved-change confirmation.

Trigger it when users attempt to:

* Close the full-screen builder
* Return to the Agenda List
* Switch from an unsaved child
* Select another child
* Remove a child
* Navigate away

Actions:

```text
Save and Continue
Discard Changes
Stay Here
```

Do not silently discard rich-text content or attachment selections.

---

# 13. Responsive behavior

## Desktop

Use:

* Child list on the left
* Child form on the right
* Fixed full-screen header
* Scrollable body
* Fixed footer

## Tablet

Allow the child list to collapse into a selector.

Keep the selected child visible.

## Mobile

Use this order:

1. Parent agenda summary
2. Child agenda selector
3. Add Child Agenda
4. Selected child form
5. Documents
6. Sticky footer

Requirements:

* Do not force two columns.
* Do not create horizontal overflow.
* Child cards use full width.
* The full child card is tappable.
* Rich-text toolbar may scroll horizontally.
* Document picker and viewer use existing mobile behavior.
* Keyboard must not hide footer actions.
* Preserve comfortable tap targets.

Do not change solved desktop behavior while correcting mobile.

---

# 14. Remove the old duplicate creation experience

After the new journey works, remove or disable only the obsolete agenda-creation entry points that duplicate it:

* Old `xl` Add Agenda Item popup
* Free parent dropdown during normal creation
* Inline Level 3 creation controls
* Final-level creation buttons
* Duplicate Save controls
* Generic Submitted By input
* Manual Display Order input
* Manual hierarchy-level display
* Free-text Owner and Presenter fields

Do not remove:

* Agenda List
* Approval Queue
* Temporary Agenda Review
* Existing detail drawer
* Existing approvals
* Historical Level 3 data
* Agenda-document registry
* Document Library
* Document viewer
* Existing permissions
* Audit history

---

# 15. Regression testing

Test this exact journey:

1. Open Agenda Management.
2. Confirm Agenda List is shown.
3. Select Add Agenda.
4. Confirm a full-screen modal opens.
5. Enter parent title, purpose, summary, owner, and confidentiality.
6. Save Draft.
7. Continue to Agenda Builder.
8. Add the first child.
9. Enter child title.
10. Add rich-text discussion details.
11. Select purpose.
12. Select presenter.
13. Enter duration.
14. Upload a new document.
15. Confirm it appears in Document Library.
16. Confirm it links to the child.
17. Choose an existing document from the library.
18. Preview the document.
19. Save the child.
20. Add a second child.
21. Use Save and Add Another.
22. Reorder children.
23. Confirm numbering updates.
24. Save Agenda.
25. Return to Agenda List.
26. Refresh.
27. Reopen the parent.
28. Confirm all children, rich text, order, users, and documents remain.
29. Edit one child.
30. Unlink a document and confirm the source document remains.
31. Confirm a third child level cannot be created.
32. Confirm approval actions still work from the existing workflow.
33. Test mobile.
34. Test EN and BN.
35. Test light and dark themes.

Also test:

* Missing parent title
* Missing child title
* Missing rich-text details
* Invalid duration
* Inactive user
* Duplicate document
* Repeated Save click
* Closing with unsaved changes
* Refresh after Draft
* Editing an existing parent
* Editing an existing child
* Existing historical Level 3 agenda

Run:

```text
npm run typecheck
npm run test
npm run build
```

Add focused tests for:

* Parent creation
* Multiple child creation
* Maximum Level 2 for new records
* Rich-text persistence
* Child ordering
* Document upload link
* Library document link
* Duplicate-link prevention
* Unsaved changes
* Draft persistence
* Agenda List return state

Do not remove or weaken existing tests.

---

# Completion criteria

This task is complete only when:

* Agenda Management starts from Agenda List.
* Add Agenda opens one full-screen Agenda Builder.
* Parent details are entered first.
* The builder supports one parent with multiple children.
* New Level 3 creation is blocked.
* Child agendas have a title, compact rich-text details, purpose, presenter, duration, and documents.
* Child documents support Upload New and Choose from Library.
* Documents use the canonical Document Library.
* The interface is simple and uncluttered.
* Buttons are placed consistently.
* Drafts persist after refresh.
* No duplicate agenda or document links are created.
* Existing approvals and historical data remain intact.
* Desktop, tablet, and mobile work.
* EN/BN and themes remain intact.
* Type checking, tests, and production build pass.

# Golden Rules

* Do not break solved issues.
* Do not rebuild Agenda Management.
* Do not create a new Agenda Builder component.
* Refactor the existing `AgendaFormModal.tsx`.
* Reuse the existing `AppModal` full-page mode.
* Reuse existing buttons, forms, users, documents, uploader, picker, viewer, registry, confirmations, and design tokens.
* Do not create new visual component files.
* Do not create a new rich-text editor system.
* Reuse the existing Tiptap configuration.
* Do not create Level 3 agendas in the new flow.
* Do not delete historical Level 3 records.
* Do not duplicate agenda or document records.
* Do not delete documents when unlinking.
* Do not change navigation, themes, page layouts, tables, drawers, approvals, permissions, or unrelated modules.
* Preserve desktop, mobile, accessibility, EN/BN, themes, persistence, IDs, links, and audit history.
