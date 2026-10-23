````text
Work directly inside the existing NCC Bank Board Meeting Solution React and TypeScript project.

Do not rebuild the project. Apply the following UI and interaction changes to the existing components, routes, forms, tables, drawers, login page, and Live Meeting workspace.

The current project already contains:

- Popup and full-page modal support through `AppModal`
- Feature-specific forms through `EntryForm`
- Responsive desktop tables and mobile cards
- Details drawers
- A Live Meeting route at `/meetings/:meetingId/live`
- An existing login slider and sign-in form
- The seven approved master navigation sections
- Existing themes, accent colors, typography, spacing, forms, buttons, drawers, and responsive patterns

Reuse these systems. Do not introduce another design system or UI library.

# 1. Create exactly two modal types

The project must have only these two modal behaviors.

## Modal type 1: popup form modal

Use a normal popup modal for simple forms that do not contain a stepper.

Examples:

- Add Question
- Add Note
- Add Decision
- Add Resolution
- Add Action Item
- Add Designation
- Add Position
- Add Participant Group
- Add Governance Body
- Add Organization Unit
- Add Role
- Add Permission
- Add Quorum Rule
- Add Voting Method
- Add Notification Rule
- Add Message Template
- Add Security Policy
- Approve
- Reject
- Request Revision
- Cancel
- Postpone
- Add Progress Update
- Request Extension
- Submit Completion

Popup modal sizing:

- Small: confirmation, approval, rejection, and short forms
- Medium: standard forms with approximately 3–8 inputs
- Large: longer single-page forms that still do not require steps
- Maximum desktop height: 85–90vh
- Body must scroll without moving the header or footer
- Preserve the current mobile bottom-sheet behavior for simple popup modals

Do not use full-page mode only because a form has many fields. When a form becomes too long or contains several logical stages, convert it into a stepper and use modal type 2.

## Modal type 2: full-page stepper modal

Use a full-page modal only when the form has a real multi-step workflow.

Examples:

- Create or Edit Meeting
- Create or Edit Workflow when it uses multiple stages
- Create a complex Board Pack when it has multiple steps
- Create Minutes when the editor uses structured steps
- Any other form that has an approved stepper

Rules:

- If `formSteps` contains more than one step, use full-page mode automatically.
- If there is no stepper, use popup mode.
- Remove incorrect `fullPageModal: true` settings from simple single-page forms.
- Do not allow page files to force a simple form into full-page mode without a stepper.
- Preserve the current full-screen behavior on mobile.

Update the modal decision logic so it follows:

`has multiple form steps → full-page modal`

`has no form steps → popup modal`

# 2. Use one shared modal structure

Every popup and full-page modal must use the same structural pattern:

```text
Header
Scrollable body
Footer
````

## Header

Every modal header must contain:

* Contextual modal title
* Optional short supporting description
* Optional relevant icon
* Close button on the right
* A bottom divider

Examples:

* Create Meeting
* Edit Meeting
* Add Question
* Edit Action Item
* Request Revision
* Approve Agenda Item

Do not use vague titles such as:

* Add Record
* Edit Record
* Record Form
* Entry Form

The close button must:

* Use the existing cross icon
* Have an accessible label
* Restore focus to the original trigger
* Warn about unsaved changes when needed

## Body

The body must:

* Be the only vertically scrollable part
* Keep horizontal overflow hidden
* Contain only form content
* Not contain another modal footer
* Preserve validation, helper text, file upload, and responsive form layout

## Footer

All modal actions must be rendered inside the `AppModal` footer slot.

Do not render `entry-form__footer` inside the scrollable modal body.

Refactor `EntryForm` so it can expose or support its actions through the parent modal footer while keeping the form submission functional.

Use a form ID and the HTML `form` attribute, a safe callback API, or another reusable existing React pattern. Do not duplicate form-submit logic.

Footer layout:

* All buttons remain in one horizontal row.
* Cancel and Back appear on the left side of the footer group.
* Save Draft, Next, Submit, Update, Approve, or Confirm appear toward the right.
* The primary action is the rightmost button.
* Destructive actions use the existing danger style.
* Do not stack buttons vertically on desktop.
* Do not create multiple footer rows.
* On narrow mobile screens, keep one horizontal row using compact buttons or safe horizontal scrolling rather than stacking actions.

Examples:

```text
Cancel | Back                              Save Draft | Next
Cancel                                           Save Changes
Cancel                                                Approve
Cancel                                                 Reject
```

Update all existing status modals, including Approve, Reject, Request Revision, Cancel, and Postpone, so their buttons use `AppModal.footer` instead of a footer placed inside the body.

# 3. Preserve one Create/Edit form per feature

Create and Edit must continue using the same feature-specific form.

Create:

* Opens the correct popup or full-page stepper modal
* Uses empty or default values
* Generates a new ID
* Saves into the correct shared registry

Edit:

* Starts from the details drawer
* Closes the drawer
* Opens the same form
* Prefills all editable information
* Preserves the ID, relationships, attachments, versions, and history
* Uses `Save Changes` as the primary action

Do not create separate Edit pages or separate Edit-only form components.

# 4. Limit every table to one action button

Each desktop table row must show exactly one action button in the Actions column.

Use:

* An eye or details icon
* Tooltip: `View details`
* Accessible label containing the entity name when available

Clicking it must open the details drawer.

The table row itself may also open the drawer, but the single action button must remain available for discoverability.

Remove these actions from all table rows:

* Edit
* Approve
* Reject
* Request Revision
* Publish
* Start Meeting
* Duplicate
* Cancel
* Postpone
* Archive
* Delete
* Download
* Print

Do not use a row-level three-dot menu containing these actions.

All contextual record actions must move into the details drawer.

Update:

* `GeneratedTablePage`
* `ResponsiveTable`
* `CardTable`
* `RowMoreMenu`
* Page action configurations
* Any custom tables that render several row actions

The table action configuration should resolve to one shared `View details` action regardless of how many old row actions are still defined in a page configuration.

## Mobile cards

* Do not show a separate View Details button.
* Tapping the card opens the details drawer.
* Do not render Edit, Approve, Start Meeting, or other action buttons directly on the card.
* Keep status and the most important metadata visible.

# 5. Put all record actions in the details drawer

The details drawer is the only place for contextual record actions.

The current generated drawer only exposes Edit in many places even when `drawerActions` contains more actions. Fix this.

Render and connect every permitted `drawerAction` inside the drawer footer.

Examples:

## Meeting drawer

* Edit
* Duplicate
* Publish
* Reschedule
* Postpone
* Cancel Meeting
* Create Board Pack
* Start Meeting

`Start Meeting` must be the primary action and appear at the far right when the meeting can start.

Do not show Start Meeting in the table.

## Agenda drawer

* Edit
* Submit
* Approve
* Request Revision
* Reject
* Assign to Meeting
* Defer
* Withdraw

## Document drawer

* Edit Metadata
* Preview
* Upload New Version
* Download
* Print
* Archive

## Decision drawer

* Edit
* Create Resolution
* Create Action Item
* Mark Implemented
* Close

## Resolution drawer

* Edit
* Create Action Item
* Publish
* Supersede

## Action Item drawer

* Edit
* Add Progress Update
* Request Extension
* Submit Completion
* Reassign
* Cancel

## User drawer

* Edit
* Add Assignment
* Add Acting Assignment
* Add Delegation
* Activate or Deactivate

## Drawer footer behavior

* Keep all footer controls in one row.
* Keep the main primary action on the right.
* Keep Close as a secondary action.
* Place destructive actions on the left or inside a `More actions` menu within the drawer footer.
* When there are too many actions to fit safely, show the most important two or three actions as buttons and place the rest inside a `More actions` menu in the same footer.
* Do not move drawer actions into the drawer body.
* Do not add another floating action area.

Use contextual drawer titles instead of the current generic `Record Details`.

Examples:

* Meeting Details
* Agenda Item Details
* Board Pack Details
* Document Details
* Decision Details
* Resolution Details
* Action Item Details
* Governance Body Details
* User Details

# 6. Open the virtual meeting as a separate full-screen workspace

Do not show the virtual meeting inside a normal details drawer or popup modal.

Keep the existing route:

`/meetings/:meetingId/live`

The `Start Meeting` button in the Meeting details drawer must open this route as a dedicated full-screen workspace.

Preferred behavior:

* Open the Live Meeting workspace in a new browser tab from the direct user click.
* If the browser blocks a new tab, open it in the current tab as a full-screen route.
* Preserve a clear `Return to meeting details` or `Leave meeting` route.
* Do not add Virtual Meeting as a new master or child navigation item.

The full-screen workspace must contain the previously required virtual-meeting functions and the integrated Board Meeting panel:

* Pre-join device check
* Camera
* Microphone
* Screen sharing
* Participants
* Chat
* Raise hand
* Reactions
* Connection state
* Waiting room
* Meeting controls
* Agenda
* Documents
* Attendance
* Quorum
* Motions
* Voting
* Decisions
* Resolutions
* Action Items
* Live Minutes

Use a focused meeting layout inspired by modern video-conferencing interaction patterns, but do not copy another product’s branding or exact interface.

The virtual meeting must use the existing project theme and Board Meeting visual identity.

# 7. Redesign the login page

Replace the current centered two-card login layout with a full-height split-screen experience inspired by the structure and visual balance of the three supplied onboarding screenshots.

Do not copy Figma branding, text, logos, graphics, or exact UI.

Use the supplied screenshots only as layout and interaction references.

## Desktop layout

Use a full viewport split:

* Left visual area: approximately 62–65%
* Right login area: approximately 35–38%
* No floating white form card in the middle of the page
* No large empty gap between the two sections
* Both sections fill the viewport height

## Left visual area

Create a soft, theme-aware brand area.

It should contain:

* A large dark product-preview frame centered inside the area
* A realistic preview of the NCC Board Meeting Solution
* The preview can show:

  * A board-meeting dashboard
  * A meeting agenda
  * A secure board pack
  * A virtual meeting with the Board Meeting side panel
* NCC Bank Board Meeting Solution branding
* A short slide headline
* One supporting sentence
* A compact slider progress indicator near the bottom
* Existing pause/play accessibility behavior

Do not use the old tax-related illustrations.

Reuse or update the existing `LoginSlider`, `LoginSlide`, and `LoginBrandPanel` rather than creating an unrelated second slider implementation.

Recommended slide copy:

### Slide 1

Heading: `Prepare meetings with confidence`

Text: `Create agendas, invite participants, and publish secure board packs from one workspace.`

### Slide 2

Heading: `Run focused board meetings`

Text: `Manage attendance, quorum, documents, voting, and decisions during the meeting.`

### Slide 3

Heading: `Track every decision`

Text: `Turn resolutions into accountable actions and monitor progress after the meeting.`

The product preview must look like the current Board Meeting Solution, not a generic illustration.

## Right login area

Use a dedicated login panel that fills the right side.

Content should be vertically centered within a maximum readable width of approximately 440–480px.

Top area:

* NCC Bank Board Meeting Solution logo
* Optional compact appearance or theme toggle in the top-right
* Do not add a language switch

Login copy:

Application name:

`NCC Bank Board Meeting Solution`

Application description:

`Secure board and committee meeting management`

Form heading:

`Welcome back`

Supporting text:

`Sign in to manage meetings, agendas, board packs, decisions, and follow-up actions.`

Fields:

* `User ID or email`
* `Password`

Options:

* `Remember me`
* `Forgot password?`

Primary button:

* `Sign in`
* Loading state: `Signing in…`

Support text:

`Need help signing in? Contact the Board Secretariat or IT support.`

Keep the existing forgot-password flow and authentication behavior.

Do not show unresolved translation keys such as:

* `appTitle`
* `appSubtitle`
* `title`
* `subtitle`
* `userId`
* `password`
* `signIn`

All text must render as final English UI copy.

## Login color behavior

The new login page must respond correctly to the existing theme and accent-color system.

Do not hardcode one blue background for every theme.

### Light mode

* Left area: soft primary-tinted background
* Product-preview frame: dark neutral surface
* Right area: light surface
* Inputs: clear white or surface background
* Primary action: active theme primary color

### Dark mode

* Left area: deeper primary-tinted background
* Product-preview frame: dark elevated surface
* Right area: dark surface
* Inputs: dark elevated fields with visible borders
* Text and logo must maintain accessible contrast

### Other existing themes

* Use current theme tokens
* Accent color must update buttons, active progress, links, focus rings, and selected states
* Do not override the project theme system with fixed screenshot colors

## Mobile login

Below the desktop breakpoint:

* Hide the large product-preview panel
* Show the NCC Bank logo and product name above the form
* Use a full-width sign-in experience
* Preserve the same writing and form behavior
* Keep the appearance control accessible
* Do not show the desktop slider
* Avoid a tiny version of the split-screen layout

# 8. Correct navigation writing

Keep the seven master navigation items unchanged:

```text
1. Home
2. Meetings
3. Agenda & Documents
4. Decisions & Follow-up
5. Governance & Organization
6. Archive & Reports
7. Administration
```

Use these child navigation labels:

## Home

* Overview
* My Tasks
* My Calendar

## Meetings

Change:

* `Meeting Overview` → `Overview`
* `Meeting Calendar` → `Calendar`
* `Meeting Templates` → `Templates`

Final labels:

* Overview
* All Meetings
* Calendar
* Templates

The parent navigation already says Meetings, so repeating “Meeting” in every child label is unnecessary.

## Agenda & Documents

Use:

* Agenda Management
* Board Packs
* Document Library
* Questions & Responses
* My Notes

Change:

* `Questions & Clarifications` → `Questions & Responses`

This better reflects that the page contains both submitted questions and assigned responses.

## Decisions & Follow-up

Keep:

* Decisions
* Resolutions
* Action Items
* Matters Arising
* Follow-up Questions

## Governance & Organization

Keep:

* Governance Bodies
* Organization Structure
* Users & Assignments
* Designations & Positions
* Participant Groups

## Archive & Reports

Keep:

* Meeting Archive
* Minutes
* Registers
* Reports & Analytics
* Audit Trail

## Administration

Keep:

* Roles & Permissions
* Workflows
* Meeting Configuration
* Templates
* Notifications
* Integrations
* Security & Retention

For the Meeting Configuration tab, change:

* `Statuses & Numbering` → `Statuses & Numbering Rules`

Do not change route IDs or file names only to match these improved labels.

Update visible navigation text, breadcrumbs, page headings, tabs, tooltips, help content, and browser titles without breaking routes.

# 9. Audit and improve all UX writing

Review all active visible text across the project.

Fix:

* Generic labels
* Repeated words
* Old office-management terminology
* Unresolved translation keys
* Grammatically incorrect headings
* Vague button names
* Inconsistent capitalization
* Incorrect singular and plural labels
* Labels that do not match the action
* Long table headings
* Technical internal names shown to users

## Page headings

Use a clear noun or task.

Examples:

* All Meetings
* Agenda Management
* Board Packs
* Action Items
* Governance Bodies
* Meeting Archive

## Secondary headings

Explain the page purpose in one direct sentence.

Examples:

* `Create, schedule, and manage board and committee meetings.`
* `Submit, review, and schedule agenda items for upcoming meetings.`
* `Compile, publish, and track secure board packs.`
* `Track responsibilities created from meeting decisions.`
* `Manage boards, committees, memberships, and governance rules.`

Avoid repeatedly beginning every description with `Manage`.

## Buttons

Use contextual action labels.

Good:

* Create Meeting
* Add Agenda Item
* Publish Board Pack
* Start Meeting
* Save Changes
* Request Revision
* Submit Completion

Avoid:

* Add Record
* New Entry
* Submit Data
* Process
* Action
* Click Here

## Empty states

Use a useful heading and one next step.

Example:

Heading: `No meetings found`

Text: `Create a meeting or adjust the current filters.`

## Success messages

Mention the affected entity.

Examples:

* `Meeting created successfully.`
* `Agenda item updated.`
* `Board pack published.`
* `Action item assigned.`
* `Meeting started.`

Do not use only:

* Record saved
* Entry updated
* Operation successful

## Errors

State what happened and what the user should do.

Example:

`The meeting could not be started because the agenda has not been approved.`

Do not expose internal field names, route IDs, registry keys, or component names.

# 10. Files and systems to inspect carefully

Update the relevant existing files rather than building parallel replacements.

Likely affected files include:

* `src/app/components/modals/AppModal.tsx`
* `src/styles/modals.css`
* `src/app/components/forms/EntryForm.tsx`
* Entry form styles
* `src/app/components/pages/GeneratedTablePage.tsx`
* `src/app/components/drawers/DynamicDetailsDrawer.tsx`
* `src/app/components/tables/ResponsiveTable.tsx`
* `src/app/components/tables/CardTable.tsx`
* `src/app/components/tables/UnifiedMobileCard.tsx`
* `src/app/components/shared/RowMoreMenu.tsx`
* `src/app/pages/modulePageUtils.ts`
* Page-level action configurations
* `src/app/pages/meetings/LiveMeetingPage.tsx`
* `src/app/routes.tsx`
* `src/app/pages/auth/LoginPage.tsx`
* `src/app/components/auth/LoginForm.tsx`
* `src/app/components/auth/LoginBrandPanel.tsx`
* `src/app/components/auth/LoginSlider.tsx`
* `src/app/components/auth/LoginSlide.tsx`
* Login styles in `src/styles/globals.css`
* `src/app/data/navigation.ts`
* Breadcrumbs and route-label logic
* Page configuration titles and descriptions
* Help and accessibility text

Do not rename or move these files.

# 11. Acceptance criteria

The task is complete only when:

* Simple forms open in popup modals.
* Forms with steppers open in full-page modals.
* No simple form incorrectly opens full-page.
* Every modal has one header, one scrollable body, and one footer.
* No form footer remains inside the scrollable body.
* Every modal button appears in one footer row.
* All close buttons work and preserve unsaved-change protection.
* Desktop tables contain exactly one row action.
* The single table action opens the details drawer.
* Mobile cards open the details drawer when tapped.
* No mobile card has a redundant View Details button.
* Edit, Approve, Reject, Publish, Start Meeting, and other actions are removed from table rows.
* All contextual actions appear in the details drawer footer.
* Drawer actions are functional, not only configured.
* Start Meeting appears only in the Meeting details drawer.
* Start Meeting opens the dedicated full-screen Live Meeting workspace.
* The virtual meeting is not shown inside a normal popup or details drawer.
* The login page uses the new full-height split layout.
* The login page follows existing theme and accent colors.
* The login page works in light and dark modes.
* The login page contains proper Board Meeting visuals and writing.
* No unresolved UI keys are visible.
* The seven master navigation items remain unchanged.
* The approved child navigation writing is applied.
* Routes, registries, APIs, themes, tables, drawers, and responsive behavior continue working.
* Desktop and mobile views are tested.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not rename, move, or delete existing files.
* Do not change the project architecture.
* Do not change existing API contracts.
* Do not remove working features.
* Reuse the existing design system.
* Reuse existing forms, buttons, modals, drawers, tables, cards, themes, and icons.
* Do not introduce a second modal system.
* Do not introduce another UI library.
* Simple form means popup modal.
* Stepper form means full-page modal.
* Every modal must have a header, scrollable body, and footer.
* Keep all modal footer buttons in one row.
* Keep only one action button in every desktop table.
* Keep all contextual actions inside the details drawer.
* Keep Start Meeting inside the Meeting drawer footer.
* Keep the Live Meeting inside the Meetings module.
* Do not add a new navigation item for the virtual meeting.
* Do not copy Figma, Zoom, Google Meet, or another product’s branding.
* Use the supplied screenshots only as interaction and layout references.
* Preserve desktop behavior.
* Preserve mobile behavior.
* Preserve all existing themes and accent colors.
* Preserve Create/Edit data, attachments, versions, and history.
* Do not reintroduce language switching or translation functionality.
* Test every shared-component change across all affected pages.

```
```
