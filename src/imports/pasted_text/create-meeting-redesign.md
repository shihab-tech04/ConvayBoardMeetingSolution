Redesign the existing “Create Meeting” full-page wizard into a clean, polished, enterprise-grade meeting creation experience.

Work only on the Create Meeting wizard and its shared multi-step form components. Do not redesign unrelated pages, tables, drawers, navigation, or workflows.

Preserve all existing fields, values, conditional logic, validation, APIs, routes, permissions, registry updates, draft behavior, submission behavior, and meeting creation logic. Improve the presentation, grouping, hierarchy, responsiveness, and interaction design without removing any working feature.

## Main goals

1. Replace the current small numbered stepper with a clear card-based progress stepper.
2. Group related fields into meaningful sections.
3. Reduce visual clutter and unnecessary text.
4. Use icons selectively for steps, section headings, important controls, and actions.
5. Remove excessive empty space.
6. Make repeatable participant, agenda, and document rows easier to understand.
7. Keep the header, progress area, body, and footer visually stable while users move between steps.
8. Create a reusable wizard pattern for other full-page multi-step forms.

## Full-page wizard structure

Use this fixed structure:

1. Sticky modal header
2. Sticky progress stepper
3. Scrollable form body
4. Sticky action footer

The modal must fill the available viewport without creating body-level scrolling.

### Header

Keep the header compact.

Left side:

- Meeting icon
- Title: `Create Meeting`
- Small subtitle: `Set up meeting details, participants, agenda, and publication settings.`

Right side:

- Close icon button

Do not add large descriptions, banners, or decorative content.

The close button must preserve the existing unsaved-change confirmation.

## New card-based stepper

Keep all seven existing steps:

1. Meeting Details
2. Governance & Scope
3. Participants
4. Agenda
5. Documents
6. Schedule & Notifications
7. Review & Publish

Use these icons:

- Meeting Details: Calendar
- Governance & Scope: Landmark or Shield
- Participants: Users
- Agenda: List Checks
- Documents: File Text
- Schedule & Notifications: Bell or Calendar Clock
- Review & Publish: Check Circle

### Desktop stepper design

Create a horizontal progress rail using compact step cards.

Each step card must contain:

- Step icon
- Small step number
- Short step title
- State indicator

Use four clear states:

#### Active step

- Soft primary-tinted background
- Primary border
- Primary icon container
- Strong title
- Small label such as `Step 3`
- Slightly wider than the other cards

#### Completed step

- White or neutral surface
- Primary border or subtle primary tint
- Check icon instead of the step number
- Clickable so users can return to the completed step

#### Upcoming step

- Neutral surface
- Muted icon and label
- Disabled until the previous required steps are valid

#### Step with errors

- Error-colored outline or small error indicator
- Do not fill the entire card with red
- Show an accessible error status

Add short connectors between cards. Use a simple line with a subtle directional chevron. Completed connectors use the primary color; future connectors remain neutral.

Do not use tiny circles with long labels floating beside them.

Do not make the stepper look like a plain navigation menu.

Keep all seven steps readable at normal desktop widths. Allow horizontal scrolling at smaller widths instead of shrinking text until it becomes unreadable.

### Tablet and mobile stepper

On tablet and mobile:

- Keep the stepper horizontally scrollable.
- Make the active step automatically scroll into view.
- Use icon-first compact cards.
- Show the active title and `Step X of 7`.
- Keep completed steps clickable.
- Do not hide all step context and show only numbered circles.
- Use a visible progress line or segmented progress indicator.
- Keep the progress area sticky below the header.

## Form body layout

Place the form inside a centered content container with a maximum width of approximately 1200–1280px.

Use:

- 24–32px desktop body padding
- 20–24px spacing between sections
- 16px section radius
- Subtle border
- White or theme surface
- Very light shadow only where already supported by the design system

Do not allow fields to stretch across the entire viewport unnecessarily.

Do not put every field inside its own large visual container.

Each form step must use grouped section cards.

## Section-card pattern

Every section card should contain:

### Section header

- One relevant icon in a subtle icon container
- Short section title
- Optional one-line supporting text only when needed
- Optional status or count on the right

### Section body

- Responsive field grid
- Consistent spacing
- Clear conditional behavior
- No unexplained empty columns or blank areas

Use icons in section headers, not inside every form field.

Avoid long instructional paragraphs.

Do not repeat information already communicated by field labels.

## Step 1: Meeting Details

Organize this step into four sections.

### A. Basic Information

Icon: File Text or Info

Fields:

- Meeting Title
- Meeting Type
- Meeting Reference
- Financial Year

Layout:

- Meeting Title uses the full row.
- Meeting Type and Financial Year share a row.
- Meeting Reference uses the remaining suitable width.
- Keep the auto-generation hint concise.

### B. Date & Time

Icon: Calendar Clock

Fields:

- Meeting Date
- Start Time
- End Time
- Time Zone

Use a balanced responsive grid.

On wide desktop:

- Meeting Date
- Start Time
- End Time
- Time Zone

may appear in one well-spaced row.

Do not make time inputs excessively wide.

Validate that End Time is later than Start Time.

### C. Meeting Access

Icon: Map Pin or Video

Replace the plain Meeting Mode radio row with a compact segmented selection control.

Options:

- Physical, with Map Pin icon
- Virtual, with Video icon
- Hybrid, with Layers or Monitor icon

Each option should be a selectable card or segmented button containing:

- Icon
- Short label
- Clear selected state

Conditional fields:

#### Physical

Show:

- Venue

#### Virtual

Show:

- Virtual Platform
- Meeting Link
- Dial-in Information

#### Hybrid

Show:

- Venue
- Virtual Platform
- Meeting Link
- Dial-in Information

Conditional fields must appear inside the same Meeting Access section without leaving empty gaps.

Use a subtle transition when the mode changes.

Do not reset previously entered conditional values when users switch modes unless the existing business logic already requires it.

### D. Preferences & Purpose

Icon: Sliders

Fields:

- Meeting Language
- Priority
- Confidentiality
- Meeting Purpose
- Description / Notes

Use three compact fields in the first row:

- Meeting Language
- Priority
- Confidentiality

Place Meeting Purpose below them.

Treat Description / Notes as optional secondary information. It may appear in a collapsible `Additional Notes` area to reduce visual clutter.

Keep all current values and validation.

## Step 2: Governance & Scope

Organize this step into three sections.

### A. Governance Structure

Icon: Landmark

Fields:

- Governance Body
- Board / Committee

Place them side by side.

When one field influences the available options of the other, preserve the existing relationship.

### B. Meeting Leadership

Icon: User Cog or Badge

Fields:

- Chairperson
- Meeting Secretary
- Meeting Organizer
- Meeting Owner

Use a two-column grid.

Keep required and optional fields visually clear.

Do not use large empty areas below a small number of fields.

### C. Organizational Scope

Icon: Network

Fields:

- Divisions
- Regions / Branches
- Scope Notes

Keep Divisions and Regions / Branches side by side.

Display selected values as compact removable chips.

Prevent chips from making the input excessively tall. Wrap cleanly when many values are selected.

Place Scope Notes below them as a full-width optional field.

## Step 3: Participants

Organize this step into three areas.

### A. Participant Source

Icon: User Plus

Use the existing `Add Participants From` control.

Present selected sources as clean chips.

Keep this section compact.

### B. Participant List

Icon: Users

Display a section title with a dynamic count:

`Participants · 2`

Render each participant as a structured repeatable card rather than one large unorganized form block.

Each participant card must contain:

- Participant number or small avatar icon
- Name / Email
- Meeting Role
- Attendance
- Voting Eligible toggle
- Remove icon button

Desktop layout:

- Name / Email: wider column
- Meeting Role: standard column
- Attendance: standard column
- Voting Eligible: compact control

Place the remove icon in the top-right corner of the participant card.

Do not show Remove for the only required minimum row.

Use a clear icon-based button:

`+ Add Participant`

Do not use the technical label `Add Row`.

After a participant has meaningful data, allow the card to collapse into a summary showing:

- Name or email
- Role
- Attendance
- Voting status

Keep the active or incomplete card expanded.

### C. Participation Rules

Icon: Shield Check

Fields:

- RSVP Deadline
- Conflict Declaration Required

Place them in one compact section.

Render the conflict declaration setting as a labeled toggle card with a short supporting line only when needed.

## Step 4: Agenda

Organize this step into:

### A. Agenda Setup

Icon: Layout Template

Field:

- Agenda Template

Keep it compact and no wider than necessary.

### B. Agenda Items

Icon: List Checks

Show a dynamic count:

`Agenda Items · 2`

Render every agenda item as a numbered collapsible card.

Collapsed card summary:

- Agenda item number
- Agenda title
- Purpose
- Duration
- Voting indicator
- Confidential indicator

Expanded card fields:

- Agenda Title
- Agenda Owner
- Duration
- Purpose
- Voting Required
- Confidential

Layout:

- Agenda Title uses the full row.
- Agenda Owner and Duration share a row.
- Purpose uses the appropriate width.
- Voting Required and Confidential appear in one compact options row.

Use:

`+ Add Agenda Item`

Do not use `Add Row`.

Use an icon-only delete button with a tooltip and accessible label.

Do not automatically remove the minimum required agenda item.

## Step 5: Documents

Organize this step into two sections.

### A. Document Requirements

Icon: File Stack

Show a dynamic count:

`Documents · 1`

Render document metadata as repeatable collapsible cards.

Each card contains:

- Document Name
- Document Type
- Owner
- Confidentiality
- Acknowledgement Required
- Remove action

Collapsed summary:

- Document name
- Type
- Owner
- Confidentiality
- Acknowledgement status

Use:

`+ Add Document`

Do not use `Add Row`.

When there are no document metadata records, show a compact empty state:

`No document requirements added`

with an `Add Document` action.

### B. File Attachments

Icon: Paperclip or Cloud Arrow

Use one clean drag-and-drop file attachment area.

It should contain:

- Attachment icon
- Primary action text: `Choose files or drag them here`
- Concise allowed-type and size information
- Current file count
- Attached-file list after selection

Do not make this section unnecessarily tall.

Preserve all existing file validation, extension checking, type checking, size restrictions, maximum file count, and attachment behavior.

## Step 6: Schedule & Notifications

Organize this step into four sections.

### A. Key Dates

Icon: Calendar Days

Fields:

- Invitation Date
- Board Pack Publication Date
- Document Review Deadline

Use a three-column grid on wide desktop and a single column on mobile.

### B. Calendar Invitation

Icon: Calendar Plus

Field:

- Send Calendar Invitation

Use a compact setting card with a toggle.

Do not leave the toggle floating beside unrelated fields.

### C. Reminders

Icon: Bell Ring

Fields:

- Reminder Schedule
- Reminder Channels

Place them side by side.

Show selected reminder channels as chips.

### D. Notification Rules

Icon: Megaphone or Bell

Fields:

- Notify on Document Updates
- Notify on Agenda Changes
- Escalation Recipients

Render the two notification toggles as compact option cards in one row.

Place Escalation Recipients below them.

Do not use a large empty form grid.

## Step 7: Review & Publish

Replace placeholder text with a real structured review experience using the values from the previous steps.

At the top, show a compact readiness banner:

### Ready state

- Success icon
- `Ready to create`
- Concise confirmation that required information is complete

### Incomplete state

- Warning icon
- `Some information still needs attention`
- Number of incomplete sections
- Links to return to affected steps

Do not display a success state when required data is missing.

### Review sections

Use collapsible summary cards:

1. Meeting Details
2. Governance & Scope
3. Participants
4. Agenda
5. Documents
6. Schedule & Notifications

Each summary card must contain:

- Section icon
- Section title
- Completion indicator
- Concise key-value summary
- `Edit` icon button that returns to the relevant step

Do not repeat every empty field.

Do not display raw objects, technical keys, internal IDs, `undefined`, or empty placeholders.

Examples of useful summaries:

#### Meeting Details

- Meeting title
- Type
- Date and time
- Mode
- Venue or virtual platform
- Priority
- Confidentiality

#### Governance & Scope

- Governance body
- Committee
- Chairperson
- Secretary
- Divisions
- Regions

#### Participants

- Total participant count
- Voting-eligible count
- Mandatory attendance count
- RSVP deadline

#### Agenda

- Total item count
- Estimated duration
- Voting-item count
- Confidential-item count

#### Documents

- Document count
- Attached-file count
- Acknowledgement-required count

#### Notifications

- Invitation date
- Reminder schedule
- Reminder channels
- Enabled notification rules

### Submission section

Place the following in one final section card:

- Submission Action
- Final Remarks / Notes

Keep the existing submission options and business logic.

## Footer actions

Keep the footer fixed and visually separated from the form body.

Left side:

- Cancel

Right side:

- Back, when not on the first step
- Next, when not on the final step
- Contextual final action on the final step

Use icons selectively:

- Back: Arrow Left
- Next: Arrow Right
- Final action: Check or Send

Button labels:

- `Back`
- `Next`
- `Save as Draft`
- `Submit for Approval`
- `Publish Meeting`

The final primary button label must reflect the selected Submission Action.

Do not show a generic `Save` label when the actual action is Submit or Publish.

Keep buttons in one row on desktop.

On mobile:

- Keep the footer sticky.
- Cancel may use a secondary text treatment.
- Back and Next remain easy to reach.
- Do not let the footer cover form content.

## Field styling

Reuse the existing form components and design tokens.

Standardize:

- Input height
- Border
- Radius
- Label style
- Required indicator
- Placeholder color
- Focus state
- Error state
- Disabled state
- Read-only state
- Dropdown style
- Date and time controls
- Text-area spacing
- Chip styling
- Toggle styling

Do not create a separate form design language.

Inputs must not look disabled in their normal state.

Avoid placing icons inside every input.

Use input icons only when they add meaning, such as:

- Calendar
- Time
- Search
- Attachment
- External meeting link

## Spacing and density

The current wizard contains excessive blank space and overly stretched fields.

Fix this by:

- Using content-driven section heights
- Centering the form content
- Using an intentional responsive grid
- Keeping related fields close together
- Adding spacing between sections rather than between every field
- Avoiding full-width fields when a smaller width is more suitable
- Removing empty grid cells when conditional fields are hidden
- Keeping text areas at practical default heights
- Expanding text areas only when users need more space

Do not make the interface cramped.

The result should feel structured, calm, and efficient.

## Reusable form configuration

Extend the shared multi-step form configuration so each field can support optional metadata such as:

- Step icon
- Step short label
- Section ID
- Section title
- Section icon
- Section description
- Section order
- Collapsible section
- Default expanded state
- Summary renderer
- Responsive field width
- Conditional visibility
- Repeatable item label
- Add-item label
- Empty-state text

Keep existing field configurations backward compatible.

Do not hardcode the Create Meeting section layout directly into a generic modal component.

The shared wizard should render from configuration so future full-page stepped forms can use the same pattern.

## Interaction requirements

- Preserve values when moving forward and backward.
- Validate only the current step when Next is clicked.
- Scroll to and focus the first invalid field.
- Mark the affected step when a completed step contains an error.
- Do not allow navigation to an unvalidated future step.
- Completed steps remain clickable.
- Keep conditional-field values unless the existing workflow requires clearing them.
- Show validation messages directly below the relevant field.
- Do not display a large error summary unless multiple sections fail during final submission.
- Preserve repeatable participant, agenda, and document data across steps.
- Prevent accidental loss when closing the wizard.
- Keep keyboard navigation and visible focus states.
- Announce step changes to assistive technology.

## Responsive behavior

### Desktop

- Centered body container
- Two-column and three-column grids where appropriate
- Horizontal card-based stepper
- Fixed header and footer
- Scrollable body only

### Tablet

- Two-column layout where fields remain readable
- Horizontally scrollable stepper
- Repeatable cards remain structured
- No clipped controls

### Mobile

- Single-column sections
- Compact sticky progress area
- Active step always visible
- Full-width fields
- Full-width repeatable cards
- Toggles and labels aligned cleanly
- Minimum 44px tap targets
- Footer buttons remain usable
- No horizontal page scrolling
- Conditional content must not create blank areas

## Accessibility

Ensure:

- The stepper uses proper navigation and current-step semantics.
- Completed steps are keyboard accessible.
- Future steps expose disabled state.
- Step icons are decorative unless they communicate status.
- Section headings use correct heading hierarchy.
- Required fields are announced correctly.
- Error messages are connected to their fields.
- Add and remove buttons have contextual accessible labels.
- Icon-only actions include tooltips and accessible names.
- Focus moves to the first field when a step opens.
- Focus does not jump unexpectedly when conditional fields appear.
- All controls work with keyboard navigation.
- Color is not the only state indicator.

## Validation checklist

Confirm:

- All seven existing steps remain.
- No existing field has been removed.
- No field value, option, validation, condition, API, route, permission, or business rule has changed.
- The new stepper uses card-based active, completed, future, and error states.
- The seven steps remain readable on desktop.
- Related fields are grouped into clear sections.
- Meeting Mode conditional fields work for Physical, Virtual, and Hybrid.
- Hidden conditional fields do not leave empty layout gaps.
- Participant rows use participant cards and `Add Participant`.
- Agenda rows use numbered collapsible cards and `Add Agenda Item`.
- Document rows use collapsible cards and `Add Document`.
- File attachments preserve all existing validation.
- Schedule and notification settings are grouped logically.
- Review & Publish displays real data from previous steps.
- Edit actions return to the correct step.
- The final button matches the selected submission action.
- Header, stepper, and footer remain fixed.
- Only the body scrolls.
- All content is reachable.
- No footer covers form fields.
- Desktop, tablet, and mobile layouts work.
- Light theme, dark theme, font scaling, and EN/BN support remain stable.
- The User Guide remains hidden.
- No User Guide content is created.

## Golden Rules

- Do not break solved issues.
- Do not change unrelated pages or components.
- Do not remove working fields or features.
- Do not change APIs, routes, permissions, registries, or business logic.
- Reuse existing form components, buttons, tokens, and modal behavior.
- Keep all seven meeting-creation steps.
- Group related fields into clear sections.
- Use icons with restraint.
- Avoid excessive text and empty space.
- Preserve responsive behavior.
- Keep EN/BN language parity.
- Keep the User Guide hidden.
- Do not create User Guide content.