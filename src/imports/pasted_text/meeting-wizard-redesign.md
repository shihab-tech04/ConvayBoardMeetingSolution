Redesign the complete Create Meeting wizard into a clean, structured, modern full-page workflow.

The screenshots show the current Create Meeting flow across all seven steps. The current UI is too flat, ungrouped, text-heavy, and visually difficult to scan. The stepper is small and weak, related fields are not grouped, repeatable rows look like empty form boxes, and sparse steps leave large areas of unstructured whitespace.

Use the attached stepper image only as a UX reference. Do not copy its tax-related content, colors, typography, or visual identity. Keep the existing Board Meeting Solution design system, theme tokens, typography, buttons, inputs, dark mode, and responsive behavior.

## Exact scope

Apply this redesign only to the meeting wizard that uses:

- `MEETING_FORM_FIELDS`
- `MEETING_FORM_STEPS`

The updated design must apply consistently to:

- Create Meeting
- Edit Meeting
- Create Next Meeting
- Every page that currently uses the shared meeting form configuration

Main files to inspect and update include:

- `src/app/components/modals/AppModal.tsx`
- `src/app/components/forms/EntryForm.tsx`
- `src/app/components/pages/GeneratedTablePage.tsx`
- `src/app/pages/boardMeetingFormFields.ts`
- `src/app/pages/modulePageUtils.ts`
- `src/styles/modals.css`
- `src/styles/forms.css`

Do not redesign unrelated forms or modals. Add the new behavior as an opt-in meeting-wizard configuration so existing simple forms remain unchanged.

## Preserve all existing functionality

Do not change or remove:

- The seven existing steps
- Field keys
- Field values
- Select options
- Required-field rules
- Conditional-field rules
- Meeting-mode behavior
- Repeatable participants
- Repeatable agenda items
- Repeatable documents
- File validation
- Maximum row limits
- Form submission
- Create and edit behavior
- Create Next Meeting behavior
- Draft and publish options
- Registry updates
- APIs
- Routes
- Permissions
- Existing data
- Previous-step navigation
- Unsaved-change protection
- EN/BN support
- Light and dark themes

The redesign must improve structure and presentation without changing business logic.

# 1. Replace the current stepper

The current thin number-and-label stepper is too small and does not provide enough visual hierarchy.

Replace it with a polished wizard progress rail inspired by the attached reference.

## Desktop stepper

Create seven connected step cards or icon tabs.

Use these shorter visible labels:

1. Details
2. Governance
3. Participants
4. Agenda
5. Documents
6. Schedule
7. Review

Keep the full original step names available as accessible labels:

- Meeting Details
- Governance & Scope
- Participants
- Agenda
- Documents
- Schedule & Notifications
- Review & Publish

Use these icons or the nearest matching existing Lucide icons:

- Details: `CalendarDays`
- Governance: `Landmark` or `ShieldCheck`
- Participants: `Users`
- Agenda: `ListChecks`
- Documents: `Files`
- Schedule: `BellRing` or `CalendarClock`
- Review: `ClipboardCheck`

Each step item should contain:

- One icon
- Step number or completed check
- Short label
- Clear active, completed, and future states

### Active step

The active step should:

- Use a subtle primary-tinted background
- Use a primary border
- Show the step icon clearly
- Show `Step X`
- Show the short step label
- Have stronger typography than other steps

### Completed step

A completed step should:

- Show a check icon
- Use the existing primary color
- Remain clickable so users can return to it
- Use a clear completed connector

### Future step

A future step should:

- Use a neutral background
- Use muted text and icon colors
- Remain disabled until the user reaches it
- Still be readable

Use small chevron connectors or clean progress lines between steps. Do not use oversized arrows.

The stepper must remain sticky below the modal header while the form body scrolls.

Add a compact progress indicator such as:

`Step 3 of 7`

Do not add long descriptions inside every step tab.

## Tablet behavior

At medium widths:

- Keep the step rail horizontally scrollable
- Automatically bring the active step into view
- Do not create page-level horizontal scrolling
- Keep labels visible where space allows

## Mobile behavior

On mobile, do not force all seven full labels into one row.

Show:

- Current step icon
- `Step X of 7`
- Current step title
- A compact progress bar
- A horizontally scrollable row of small numbered or icon-based step controls

Completed mobile steps may be tapped to return.

Future steps remain disabled.

Do not hide the current step name.

# 2. Improve the full-page modal layout

Keep the meeting wizard as a full-page modal.

Use this structure:

1. Fixed modal header
2. Sticky stepper
3. Scrollable form body
4. Fixed modal footer

The header should contain:

- Meeting-related icon
- `Create Meeting`, `Edit Meeting`, or `Create Next Meeting`
- One short subtitle such as:
  `Enter the meeting information and prepare it for review.`
- Close button

Do not add multiple paragraphs.

## Form body width

The current fields stretch too far across large screens.

Place the form content inside a centered container:

- Maximum width around 1200–1280px
- 24–32px desktop side padding
- 20–24px spacing between sections
- Full width on smaller screens

Do not allow input fields to stretch from one edge of a large monitor to the other.

## Scrolling

The modal body must be the only vertical scrolling region.

Ensure:

- Header remains visible
- Stepper remains visible
- Footer remains visible
- Mouse wheel works
- Trackpad works
- Touch scrolling works
- The first and final fields are reachable
- The footer does not cover form content
- Opening and closing the wizard restores page scrolling correctly

Do not add a separate scrollbar to individual form sections.

# 3. Add structured form sections

The current `EntryForm` renders every visible field in one flat grid.

Add an opt-in section configuration for the meeting wizard.

Create a reusable section model such as:

- Section ID
- Step index
- Title
- Optional short description
- Icon
- Field keys
- Grid layout
- Optional visual variant

Add meeting-specific section metadata in `boardMeetingFormFields.ts`.

Forms without section metadata must continue using the existing flat form behavior.

## Section card design

Each section should use:

- Subtle surface background
- One shared border
- Existing medium or large radius
- 16–20px internal padding
- Compact section header
- One section icon
- Clear title
- Optional one-line helper text
- Consistent field grid

Do not make every section heavily colored.

Use a subtle primary tint only behind the section icon or small header accent.

Do not add an icon to every input field.

Use icons only for:

- Step navigation
- Section headers
- Meeting Mode choices
- Add and remove actions
- File upload
- Important summary states
- Footer navigation buttons

# 4. Step 1: Details

Group the existing fields into these sections.

## A. Meeting identity

Icon: `FileText` or `BadgeInfo`

Fields:

- Meeting Title
- Meeting Type
- Meeting Reference
- Financial Year

Layout:

- Meeting Title spans the full row
- Meeting Type and Meeting Reference share a row
- Financial Year uses an appropriate compact width
- Do not leave an awkward empty cell beside Financial Year

Use the existing helper text for auto-generated Meeting Reference, but keep it short.

## B. Date and time

Icon: `CalendarClock`

Fields:

- Meeting Date
- Start Time
- End Time
- Time Zone

Use a balanced four-column desktop layout where space allows.

At smaller widths, use two columns and then one column.

Keep date and time fields visually aligned.

## C. Location and access

Icon: `MapPin` or `Video`

Fields:

- Meeting Mode
- Venue
- Virtual Platform
- Meeting Link
- Dial-in Information

Replace the basic radio buttons for Meeting Mode with a compact segmented choice control.

Choices:

- Physical with `MapPin`
- Virtual with `Video`
- Hybrid with `Laptop` or `Radio`

Each option should have:

- Icon
- Short label
- Selected state
- Keyboard support
- Existing radio semantics

Do not turn them into oversized cards.

Conditional fields must appear inside this same section.

Behavior:

- Physical: show Venue
- Virtual: show Virtual Platform, Meeting Link, and Dial-in Information
- Hybrid: show Venue, Virtual Platform, Meeting Link, and Dial-in Information

When the selected mode changes:

- Do not leave empty grid gaps
- Use a subtle transition
- Preserve current values where the existing form already preserves them
- Preserve all required validation

## D. Meeting preferences

Icon: `Settings2`

Fields:

- Meeting Language
- Priority
- Confidentiality

Use a clean three-column desktop row.

## E. Purpose and notes

Icon: `AlignLeft`

Fields:

- Meeting Purpose
- Description / Notes

Use two clearly labelled text areas.

Do not make either textarea unnecessarily tall by default.

# 5. Step 2: Governance

Group the fields into these sections.

## A. Governance structure

Icon: `Landmark`

Fields:

- Governance Body
- Board / Committee

Place them in one row.

When the existing data allows it, preserve the current dependency or matching relationship between Governance Body and Board / Committee.

Do not add new business rules.

## B. Meeting leadership

Icon: `UserRoundCog` or `UsersRound`

Fields:

- Chairperson
- Meeting Secretary
- Meeting Organizer
- Meeting Owner

Use a two-column grid.

Required fields must remain clearly marked.

## C. Organizational scope

Icon: `Network`

Fields:

- Divisions
- Regions / Branches
- Scope Notes

Use compact multiselect chips.

Do not allow selected chips to make the input excessively tall. Wrap cleanly and keep remove controls accessible.

Scope Notes should span the full section width.

# 6. Step 3: Participants

The current participant UI looks like a large empty container with disconnected fields.

Divide this step into three sections.

## A. Participant source

Icon: `UserPlus`

Field:

- Add Participants From

Display the source choices as a compact multi-select control.

Selected sources should use compact removable chips.

Do not create large selection cards.

## B. Participant list

Icon: `Users`

Replace the current generic repeatable-group appearance with structured participant cards.

Each participant card should have:

- Small header: `Participant 1`, `Participant 2`, etc.
- Optional participant icon
- Delete icon in the top-right when deletion is allowed
- Name / Email
- Meeting Role
- Attendance
- Voting Eligible

Desktop layout:

- Name / Email and Meeting Role on the first row
- Attendance and Voting Eligible on the second row

Keep the Voting Eligible switch aligned with its label.

Do not leave large empty areas inside participant cards.

Use a proper outlined button:

`+ Add Participant`

Do not use the current full-width dashed “Add Row” bar.

When only the minimum required row exists, do not show a delete button that would violate `minRows`.

When a new participant is added:

- Keep entered data in existing rows
- Scroll the new row into view only when necessary
- Focus the first field of the new row where practical

Do not add drag-and-drop reordering unless it already exists.

## C. Participation rules

Icon: `ShieldCheck`

Fields:

- RSVP Deadline
- Conflict Declaration Required

Use one compact row or small preference card.

Do not leave the switch floating in empty space.

# 7. Step 4: Agenda

Divide the Agenda step into two sections.

## A. Agenda setup

Icon: `LayoutTemplate`

Field:

- Agenda Template

Keep this control compact. It does not need to fill the entire screen width.

Show the `(optional)` text as subtle helper text, not as part of a large label.

## B. Agenda items

Icon: `ListChecks`

Render each agenda item as a structured repeatable card.

Each card should have:

- Header: `Agenda Item 1`, `Agenda Item 2`, etc.
- Delete icon in the top-right when allowed
- Agenda Title
- Agenda Owner
- Duration
- Purpose
- Voting Required
- Confidential

Recommended layout:

- Agenda Title spans the full row
- Agenda Owner, Duration, and Purpose share the next row
- Voting Required and Confidential appear as compact toggle options below

Use:

`+ Add Agenda Item`

Do not use `+ Add Row`.

Do not make the toggles appear disconnected from the agenda item card.

# 8. Step 5: Documents

Divide the Documents step into two sections.

## A. Document list

Icon: `Files`

Render every document entry as a structured document card.

Each card should contain:

- Header: `Document 1`, `Document 2`, etc.
- Delete icon
- Document Name
- Document Type
- Owner
- Confidentiality
- Acknowledgement Required

Recommended layout:

- Document Name spans the full row
- Document Type and Owner share a row
- Confidentiality and Acknowledgement Required share the final row

Use:

`+ Add Document`

When there are no document rows, show a compact empty state:

`No document details added yet.`

Display the Add Document action directly below it.

Do not show a large blank area.

## B. Upload files

Icon: `CloudUpload`

Keep the existing upload validation and allowed file types.

Improve the uploader presentation:

- Moderate height
- Clear upload icon
- One main line: `Click to upload or drag and drop`
- One compact helper line for allowed types, size, and maximum files
- Uploaded files appear in a clean file list
- Keep View, Open, Download, and Remove behavior where currently supported

Do not duplicate the document details and uploaded-file information.

# 9. Step 6: Schedule

Divide this step into four clear sections.

## A. Important dates

Icon: `CalendarDays`

Fields:

- Invitation Date
- Board Pack Publication Date
- Document Review Deadline

Use a three-column desktop row.

## B. Calendar invitation

Icon: `CalendarPlus`

Field:

- Send Calendar Invitation

Display this as a compact preference row with:

- Icon
- Label
- Optional short supporting text
- Switch aligned on the right

Do not leave the toggle floating beside an unrelated date input.

## C. Reminders and notifications

Icon: `BellRing`

Fields:

- Reminder Schedule
- Reminder Channels
- Notify on Document Updates
- Notify on Agenda Changes

Use two columns for Reminder Schedule and Reminder Channels.

Place the two notification switches in compact preference rows underneath.

Do not repeat unnecessary descriptions.

## D. Escalation

Icon: `UserRoundCheck`

Field:

- Escalation Recipients

Use the existing input behavior.

Keep the section compact.

# 10. Step 7: Review and publish

The current review screen contains placeholder text and does not help the user verify the meeting.

Replace it with a real review workspace generated from the values entered in the previous steps.

Do not hardcode sample data.

## A. Readiness summary

Show a compact status banner at the top:

- Ready for submission
- Missing required information
- Draft incomplete

Use actual form validation state.

The status must not rely on color alone.

## B. Meeting summary cards

Create compact summary sections for:

- Meeting details
- Governance
- Participants
- Agenda
- Documents
- Schedule

Each summary card should include:

- Section icon
- Section name
- Important entered values
- Count where appropriate
- Small Edit action

Examples:

- Participants: total participant count
- Agenda: total agenda-item count and estimated total duration
- Documents: document count and uploaded-file count
- Schedule: invitation and review dates

Clicking Edit should return the user to the correct completed step without clearing any data.

Do not display every field when the value is empty.

Do not display raw `undefined`, empty arrays, or object values.

## C. Quorum forecast

Use the existing quorum logic when available.

If the project does not currently contain a valid quorum calculation rule, do not invent one.

Show a neutral state such as:

`Quorum forecast is unavailable until the required participant rules are configured.`

Do not display placeholder text such as:

`Will be calculated from participants`

## D. Submission action

Icon: `Send`

Keep the existing options:

- Save as Draft
- Submit for Approval
- Publish Immediately

Present them as compact selectable option cards or a clean segmented choice control.

Each option may use one icon and one short description.

Do not show options the user is not permitted to use.

Preserve the current selected value and submission logic.

## E. Final remarks

Keep Final Remarks / Notes in a separate