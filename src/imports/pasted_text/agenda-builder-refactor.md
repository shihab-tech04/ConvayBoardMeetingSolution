# Agenda List → Add Agenda → Full-Screen Agenda Builder + Deep Regression Audit

Work only on the Agenda List and the agenda-creation/editing journey in the current Board Meeting Solution project.

The required flow is:

Agenda List → Add Agenda → Full-Screen Agenda Builder → Create Parent Agenda → Add Child Agendas → Add Final-Level Agendas → Attach Documents → Review → Save Draft or Submit for Approval → Return to Agenda List

After implementation, perform a deep regression audit of the complete flow and fix every missing, broken, duplicated, disconnected, or inconsistent item found within this scope.

Do not create new component files. Reuse the project’s existing components, registries, styles, utilities, validation, document system, approval system, and responsive patterns.

## Inspect first

Inspect the actual current implementation before changing anything:

- `src/app/pages/register-stock/Register4ListPage.tsx`
- `src/app/components/agenda/AgendaFormModal.tsx`
- `src/app/components/pages/GeneratedTablePage.tsx`
- `src/app/components/modals/AppModal.tsx`
- `src/app/components/modals/SConfirmModal.tsx`
- `src/app/components/forms/EntryForm.tsx`
- `src/app/components/forms/AppTextField.tsx`
- `src/app/components/forms/AppTextArea.tsx`
- `src/app/components/forms/AppSelectField.tsx`
- `src/app/components/forms/AppNumberField.tsx`
- Existing canonical user selectors
- Existing organization-unit selectors
- Existing tabs and accordions
- Existing buttons and sticky modal footer
- Existing status badges
- Existing empty, loading, and error states
- `src/app/components/documents/UnifiedDocumentViewer.tsx`
- Existing document upload and document picker
- Existing agenda registry
- Existing agenda-document link registry
- Existing approval and audit registries
- Existing agenda validation and hierarchy helpers
- Existing desktop, tablet, and mobile modal styles

Do not rebuild functions that already work.

---

# Part 1 — Agenda List to Full-Screen Agenda Builder

## Agenda List behavior

Keep the existing Agenda Management page, table, filters, drawer, Approval Queue, All Agendas, and Temporary Agenda Review behavior.

Do not remove the current table-based administration view.

Update the primary action:

`Add Agenda`

The following actions must open the same full-screen Agenda Builder:

- Page-header Add Agenda
- Empty-state Add Agenda
- Table or drawer Edit Agenda
- Add Child Agenda from an existing parent
- Add Final-Level Agenda from an existing child

Behavior:

- `Add Agenda` creates a new Level 1 Parent Agenda.
- `Edit Agenda` opens the complete parent hierarchy containing the selected agenda.
- Selecting Edit on a child or final-level agenda must open its parent hierarchy and automatically focus the selected item.
- Do not open the current small or extra-large popup form.
- Do not route the user to a disconnected page.
- Use the existing `AppModal` full-page mode.
- Preserve the Agenda List behind the modal.
- Closing or saving the builder must return users to the same list tab, search, filter, sort, and pagination state.
- After successful creation, update the Agenda List immediately without browser refresh.
- Do not create duplicate agenda rows after reopening or saving the builder.

## Full-screen modal structure

Refactor the existing `AgendaFormModal.tsx` into the full-screen Agenda Builder.

Do not create a new `AgendaBuilder` component file.

Use:

- Existing `AppModal`
- `fullPage`
- Existing modal header
- Scrollable modal body
- Fixed modal footer
- Existing close behavior
- Existing focus trap
- Existing responsive modal behavior

### Modal header

For new agendas:

Title:
`Create Agenda`

Subtitle:
`Create the parent agenda, organize its child items, attach supporting documents, and prepare it for approval.`

For existing agendas:

Title:
`Edit Agenda`

Subtitle:
Show the parent agenda number and title.

Header information may also show:

- Draft or approval status
- Last saved time
- Unsaved-change indicator

Do not place Save, Submit, or approval actions in the header.

## Builder workspace

Use the interaction direction from the supplied Capital Gain interface, but apply the Board Meeting Solution design system.

Desktop layout:

1. Left: Agenda Structure
2. Centre: Agenda Editing Workspace
3. Right: Agenda Summary and Readiness

Do not copy eReturn branding, colors, navigation, typography, tax terminology, or hardcoded CSS.

### Left panel — Agenda Structure

This panel represents the hierarchy currently being created or edited.

Show:

- Parent agenda
- Child agendas
- Final-level agendas
- Automatic numbering
- Current selection
- Status
- Missing-information indicator
- Document count
- Approval state where available

Example:

1. Financial Performance Review
   1.1 Quarterly Financial Results
      1.1.1 Revenue Performance
      1.1.2 Expense Performance
   1.2 Capital Adequacy Review
      1.2.1 Regulatory Capital Position

Interactions:

- Select an agenda item
- Expand or collapse hierarchy
- Add Child Agenda under the parent
- Add Final-Level Agenda under a child
- Reorder items within the same level
- Edit selected item
- Archive or safely remove an item
- Show the selected item using the existing selected-card treatment

Rules:

- The full parent card or hierarchy row is clickable.
- Do not add a separate View Details button.
- Do not allow a fourth level.
- A final-level agenda must not show Add Child.
- Do not allow invalid parent relationships.
- Reordering must update `display_order` and numbering.
- Use existing Move Up and Move Down actions if no solved drag-and-drop pattern exists.
- Do not install a new drag-and-drop library.

### Centre panel — Agenda Editing Workspace

Use the existing tab component.

Tabs:

- Overview
- One tab for each Level 2 Child Agenda

Example:

- Overview
- 1.1 Quarterly Results
- 1.2 Capital Adequacy
- 1.3 Risk Review

When many child agendas exist:

- Allow horizontal tab scrolling.
- Keep titles readable.
- Preserve the selected tab.
- Show an unsaved-change marker.
- Do not compress tabs into unreadable widths.

#### Overview tab

The Overview tab edits the Level 1 Parent Agenda.

Use existing accordion or section-card components for:

- Agenda Details
- Ownership and Presentation
- Governance and Decision Settings
- Supporting Documents
- Approval Information

#### Child agenda tab

Each child tab contains:

1. Child Agenda Details
2. Final-Level Agenda Items
3. Child Documents
4. Child Approval Information

Use the existing accordion component.

#### Final-level agenda items

Show final-level agendas as existing expandable cards or accordions.

Collapsed state:

- Agenda number
- Title
- Status
- Owner or presenter
- Estimated duration
- Document count
- Approval status
- Missing-information warning

Expanded state:

- Agenda-specific form fields
- Documents
- Validation
- Approval information
- Contextual actions

Do not create custom unrelated card styling.

### Right panel — Agenda Summary and Readiness

Use existing cards, information rows, status badges, progress indicators, and accordions.

Update the summary according to the selected parent, child, or final-level agenda.

Show:

- Agenda number
- Title
- Agenda level
- Status
- Owner
- Presenter
- Purpose
- Duration
- Confidentiality
- Voting requirement
- Document count
- Completion progress
- Approval progress
- Meeting readiness

Required-information sections:

- Agenda Details
- Ownership and Presentation
- Governance and Decision Settings
- Supporting Documents
- Approval Preparation

Show progress such as:

- `5 of 6 complete`
- `1 required item missing`
- `2 of 3 descendants approved`

Missing items must be clickable.

Clicking a missing item must:

1. Select the correct hierarchy item.
2. Select the correct child tab.
3. Open the correct accordion.
4. Scroll to the field.
5. Focus the field.
6. Preserve other unsaved values.

## Full-screen modal footer

Use the project’s existing fixed modal footer and button components.

Left side:

- Cancel or Close Builder

Right side for draft/editor state:

- Save Draft
- Preview Full Agenda
- Submit for Approval

For edit mode, use:

- Save Changes
- Preview Full Agenda
- Submit for Approval, only when valid

Do not show approval actions inside the creation footer unless the current user is acting in an approval context.

Footer rules:

- Keep actions in one row on desktop.
- Use the existing responsive wrapping or action-sheet behavior on mobile.
- Do not create duplicate Save buttons inside the form body.
- Show loading and disabled states.
- Prevent double submission.
- Preserve the current draft after validation errors.

## Unsaved changes

Use the existing confirmation modal.

Trigger it when the user attempts to:

- Close the full-screen builder
- Switch to another agenda hierarchy item
- Switch child tabs
- Return to the Agenda List
- Open another record
- Use browser navigation where the project supports blocking

Actions:

- Save and Continue
- Discard Changes
- Stay Here

Do not silently discard agenda data.

---

# Part 2 — Agenda-Specific Form Inputs

Remove generic, meeting-specific, tax-related, or irrelevant inputs from the agenda-creation journey.

Do not use one generic “Add Agenda Item” form for every context.

The form must understand whether the selected item is:

- Parent Agenda
- Child Agenda
- Final-Level Agenda

Use the same shared input components, but change visible fields, labels, defaults, validation, and context according to the agenda level.

## Automatically managed fields

Do not ask users to manually enter:

- Agenda ID
- Agenda reference
- Agenda level
- Parent ID
- Meeting ID
- Meeting title
- Committee
- Submission date
- Created date
- Updated date
- Submitted by
- Display number such as 1, 1.1, or 1.1.1

Behavior:

- Generate IDs through the existing ID utility.
- Derive hierarchy level from the selected parent.
- Derive parent relationship from the builder context.
- Generate visible agenda numbering from hierarchy and display order.
- Use the current logged-in user as creator and submitter.
- Set timestamps automatically.
- Do not attach the agenda to a meeting during agenda creation.
- Meetings must later use meeting-agenda relationship records.

## Parent Agenda fields

### Agenda Details

Required:

- Agenda Title
- Description
- Purpose
- Agenda Category
- Estimated Duration

Optional or conditional:

- Priority
- Expected Outcome
- Proposed Decision or Resolution
- Financial Impact Summary
- Display notes

Use agenda-specific helper text.

Examples:

Agenda Title:
`Use a clear title that describes the subject to be discussed.`

Description:
`Explain the background, scope, and reason this agenda is being raised.`

Purpose options:

- For Information
- For Noting
- For Discussion
- For Review
- For Approval
- For Decision

Agenda Category options should reuse the current registry or supported list:

- Governance
- Financial
- Operational
- Compliance
- Risk Management
- Strategy
- Human Resources
- Technology
- Other

Estimated Duration:

- Use an existing number field.
- Store duration consistently in minutes.
- Do not use unrestricted free text such as “around half an hour.”
- Show a minute suffix or helper text.

### Ownership and Presentation

Required:

- Agenda Owner

Conditional:

- Presenter
- Submitting Organizational Unit
- Internal Sponsor where relevant

Use canonical active users from `bms.users`.

Store:

- `owner_user_id`
- `presenter_user_id`

Do not store a free-text name as the relationship source.

Show:

- User name
- Designation
- Organizational path

Only eligible active users should appear for new assignments.

Preserve inactive users in historical records.

### Governance and Decision Settings

Fields:

- Confidentiality
- Voting Required
- Decision Required
- Quorum Relevant, only if already supported by the current agenda model
- Conflict Declaration Required, keep hidden if the Phase 2 flow is incomplete

Confidentiality options:

- Public
- Internal
- Confidential
- Restricted

When Purpose is `For Approval` or `For Decision`:

- Require Proposed Decision or Resolution.
- Show Voting Required.
- Show Decision Required.

When Voting Required is Yes:

- Show the existing supported voting configuration only.
- Do not create an advanced voting-policy system in this scope.

### Supporting Documents

At parent level, show:

- Upload New Document
- Select from Document Library
- Attached documents
- Document preview
- Required-document warning

Use existing document components and agenda-document relationship records.

## Child Agenda fields

Child agendas must support their own:

- Title
- Description
- Purpose
- Category
- Owner
- Presenter
- Estimated Duration
- Priority
- Confidentiality
- Voting Required
- Decision Required
- Proposed Decision or Resolution
- Supporting Documents

Show the parent path above the form:

`Adding under: 1. Financial Performance Review`

Do not show a free parent dropdown when the child is created from the selected parent.

Allow changing the parent only through an authorized move action, not through ordinary field editing.

## Final-Level Agenda fields

Final-level agenda items must support:

- Title
- Description
- Purpose
- Owner
- Presenter
- Estimated Duration
- Priority
- Confidentiality
- Voting Required
- Decision Required
- Proposed Decision or Resolution
- Supporting Documents

Show the complete path:

`Adding under:`
`1. Financial Performance Review`
`1.2 Capital Adequacy Review`

Do not allow another child below this level.

## Conditional validation

Run shared agenda validation before Save Draft, Submit, and Approve.

Save Draft:

- Require at least a title.
- Allow incomplete supporting details.
- Mark missing sections clearly.

Submit for Approval:

Require:

- Title
- Description
- Purpose
- Active owner
- Presenter when the agenda requires presentation
- Valid duration
- Confidentiality
- Required decision or voting information
- Required documents according to the current policy
- Valid hierarchy
- No fourth level
- No broken user or document relationships

Approval:

Require:

- Selected agenda is ready.
- Required descendants are approved.
- Required documents remain attached.
- No critical validation blockers exist.

Do not rely only on field-level validation.

## Document behavior

Reuse:

- Existing document picker
- Existing upload/composer
- Existing attachment card
- Existing `UnifiedDocumentViewer`
- Existing agenda-document link registry

Requirements:

- Uploading from the builder creates a normal Document Library record.
- Automatically link the uploaded document to the selected agenda.
- Selecting an existing document must not duplicate it.
- Prevent duplicate agenda-document links.
- Allow preview without closing the builder.
- Document viewer must render above the full-screen modal.
- Closing the viewer must restore the selected agenda and scroll state.
- Unlinking must not delete the original document.
- Update document counts immediately throughout the builder.

## Save and persistence behavior

Use the existing agenda registry as the source of truth.

Requirements:

- One stable record per agenda item.
- Stable parent-child relationships.
- Stable agenda-document relationships.
- No duplicate creation after repeated Save Draft.
- Save the parent and descendants without losing hierarchy.
- Persist changes after refresh.
- Keep approval history when editing.
- Recalculate parent readiness and approval state when descendants change.
- Return the created parent agenda to the Agenda List after save.
- Preserve the complete hierarchy for later meeting selection.

---

# Part 3 — Deep Regression Audit, Validation, and Automatic Correction

After implementing Parts 1 and 2, perform a deep audit of the actual code and complete user flow.

Do not only provide an audit report.

For every missing, broken, duplicated, disconnected, hardcoded, or inconsistent item found within this agenda scope:

1. Identify the root cause.
2. Fix it.
3. Retest the affected flow.
4. Confirm no solved issue was broken.

## A. Entry-point audit

Verify:

- Agenda Management loads.
- Add Agenda appears in the correct page header.
- Empty-state Add Agenda works.
- Both actions open the same full-screen builder.
- Edit opens the same builder in edit mode.
- Editing a child focuses the correct child.
- Editing a final-level agenda focuses the correct accordion.
- No old small Add Agenda popup remains accessible.
- No duplicate builder route or modal exists.
- Closing returns to the same list context.

Fix every mismatch.

## B. Full-screen modal audit

Verify:

- Uses existing `AppModal fullPage`.
- Header is fixed.
- Body is scrollable.
- Footer is fixed.
- Close button works.
- Escape behavior follows the existing modal standard.
- Focus is trapped.
- Focus returns to the original Add or Edit control.
- Overlay and z-index are correct.
- Document viewer opens above the builder.
- No modal appears underneath a drawer.
- Desktop, tablet, and mobile modal behavior work.
- No horizontal overflow exists.

Fix every layout or interaction issue.

## C. Hierarchy audit

Create and test:

1. Parent agenda
2. Two child agendas
3. Two final-level agendas under each child

Verify:

- Parent is Level 1.
- Child is Level 2.
- Final item is Level 3.
- A fourth level is blocked.
- Parent IDs are correct.
- Numbering displays as 1, 1.1, and 1.1.1.
- Reordering updates numbering.
- Reordering does not change hierarchy accidentally.
- No duplicate agenda records are created.
- Selection remains stable after reorder.
- Editing one item does not overwrite another.

Fix every hierarchy issue.

## D. Form-input audit

Verify the builder contains only agenda-relevant inputs.

Fail and fix if it shows:

- Meeting ID
- Meeting title
- Committee
- Tax-related fields
- Return-related fields
- Generic irrelevant business fields
- Manually entered agenda IDs
- Manually entered hierarchy levels
- Free-text owner or presenter as the canonical relationship

Verify:

- Labels are agenda-specific.
- Helper text explains agenda creation.
- Owner and presenter use canonical users.
- Organizational unit uses the real hierarchy where shown.
- Duration is validated consistently.
- Conditional fields appear correctly.
- Draft and submission validation differ correctly.
- Required markers and error messages are correct.
- EN and BN versions remain equivalent.

## E. Document audit

Verify at parent, child, and final levels:

- Upload New Document
- Select Existing Document
- Search and filters
- Multi-selection
- Preview
- Attach
- Unlink
- New version
- Correct document count

Confirm:

- Documents are not duplicated.
- Links are not duplicated.
- Unlink does not delete the source document.
- Preview restores builder context.
- Viewer appears above all overlays.
- Document metadata remains correct after refresh.

Fix every document-integration issue.

## F. Save and persistence audit

Test:

- Save parent draft.
- Refresh.
- Reopen.
- Add child.
- Save.
- Refresh.
- Add final-level item.
- Save.
- Refresh.
- Edit each level.
- Refresh again.

Verify:

- No data disappears.
- No duplicate agendas appear.
- No document links disappear.
- Owner and presenter IDs remain valid.
- Display order remains correct.
- The Agenda List updates immediately.
- Approval history is not overwritten.
- Existing agenda records remain backward compatible.

Fix every persistence issue.

## G. Validation and readiness audit

Verify:

- Missing title blocks Save Draft.
- Other incomplete fields may remain in Draft.
- Submission is blocked by required missing information.
- Missing items appear in the summary.
- Clicking a missing item opens and focuses the correct field.
- Readiness and approval status remain separate.
- Meeting Ready appears only when the complete parent hierarchy qualifies.
- Reopening or editing an approved descendant recalculates ancestors.
- Removing a required document removes readiness.

Fix every validation or readiness issue.

## H. Approval regression audit

Confirm the new builder did not break:

- Submit for Approval
- Approve
- Reject
- Request Revision
- Reopen
- Parent approval recalculation
- Child approval recalculation
- Final-level approval
- Approval Queue
- Approval history
- Audit events
- Permission enforcement

Do not update only local component state.

All actions must update the shared agenda registry.

Fix every approval regression.

## I. Agenda List regression audit

Confirm the existing list still supports:

- Search
- Filters
- Sorting
- Pagination
- Status tabs
- Approval Queue
- All Agendas
- Temporary Agenda Review
- View drawer
- Mobile cards
- Edit
- Archive
- Safe Delete
- Existing actions

Do not remove the current table view.

Fix broken actions, counts, links, filters, or drawer data caused by the builder work.

## J. Design-system audit

Confirm the full flow reuses the existing:

- Page container
- Page header
- `AppModal`
- Buttons
- Inputs
- Selects
- Number fields
- Text areas
- Tabs
- Accordions
- Cards
- Status badges
- Confirmation dialogs
- Sticky footer
- Document picker
- Document viewer
- Empty states
- Loading states
- Error states
- Mobile behavior
- Design tokens

Remove:

- Inline one-off button styling
- Duplicate input styling
- Duplicate modal styling
- Capital Gain terminology
- Tax terminology
- Copied eReturn CSS
- New duplicate components
- Hardcoded colors where shared semantic tokens exist

Do not create a new visual style.

## K. Responsive audit

Test:

- Small mobile
- Large mobile
- Tablet
- Laptop
- Desktop

Mobile structure:

1. Agenda Structure selector
2. Child tabs
3. Full-width form sections
4. Final-level accordions
5. Collapsible summary or existing bottom drawer
6. Sticky footer actions

Verify:

- No three-column layout is forced on mobile.
- No horizontal overflow.
- Child tabs remain usable.
- Full cards or rows are tappable.
- No separate View Details button.
- Document viewer uses full-screen mobile behavior.
- Keyboard does not hide important footer actions.
- Desktop remains unchanged while mobile is fixed.

## L. Technical audit

Run:

- Type checking
- Agenda hierarchy tests
- Agenda form validation tests
- Agenda persistence tests
- Agenda-document link tests
- Approval recalculation tests
- Permission tests
- Modal interaction tests
- Unsaved-change tests
- Responsive tests
- Accessibility checks
- EN/BN checks
- Theme checks
- Production build

Fix:

- Wrong registry method signatures
- Invalid model fields
- Broken imports
- Invalid component props
- Duplicate IDs
- Console errors
- Missing keys
- Stale state
- Overlay issues
- Accessibility failures caused by this implementation

## Completion criteria

This task is complete only when:

- Agenda List → Add Agenda opens the full-screen Agenda Builder.
- Edit Agenda opens the same builder.
- The old small Add Agenda popup is no longer used.
- The builder supports one parent, children, and final-level agenda items.
- A fourth level is blocked.
- All visible inputs are specific to agenda creation.
- Owners and presenters use canonical users.
- Documents work at every agenda level.
- Save Draft and Submit for Approval work.
- Unsaved changes are protected.
- Records persist after refresh.
- No duplicate agenda or document records are created.
- Existing approval logic remains functional.
- Existing Agenda List behavior remains functional.
- Desktop, tablet, and mobile work.
- Existing design-system components are reused.
- Type checking passes.
- Tests pass.
- Production build succeeds.
- No new console errors remain.

# Golden Rules

- Do not break solved issues.
- Do not create new component files.
- Do not create another agenda form, registry, document picker, viewer, modal, table, card, tab, accordion, or button system.
- Refactor and extend the existing `AgendaFormModal.tsx`.
- Reuse `AppModal fullPage`.
- Reuse the current agenda, user, document, approval, and audit registries.
- Do not change unrelated modules.
- Do not remove the existing Agenda List.
- Do not duplicate agenda or document records.
- Do not use free-text users when canonical user IDs exist.
- Do not expose unfinished final-20% features.
- Preserve desktop, mobile, themes, accessibility, and EN/BN parity.
- Audit first, fix every issue within scope, and retest before marking the task complete.