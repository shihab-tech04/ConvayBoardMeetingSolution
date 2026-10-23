Work directly inside the existing NCC Bank Board Meeting Solution React and TypeScript project.

The project already contains the seven-part navigation, dashboard cards, responsive tables, mobile cards, full-page Create/Edit modals, details drawers, file upload, document preview, Board Meeting forms, shared registries, archive pages, reports, and an early Live Meeting workspace.

Your task is to complete the remaining Board Meeting functionality and make three controlled changes:

1. Completely remove the Bangla/English translation system, language switching, and all localization code. The application will use English only.
2. Transform the Live Meeting workspace into a complete virtual meeting experience similar in behavior to modern video-meeting applications, while integrating Board Meeting controls inside the same workspace.
3. Audit every table and reduce it to 5–7 essential columns maximum, including the Actions column. Move all secondary information into the details drawer.

Do not rebuild the application. Do not change the project architecture. Do not break any solved or working feature.

# 1. Protect the existing project

Before changing anything, inspect:

- Current route structure
- Seven master navigation groups
- Existing page configurations
- Shared entity registries
- Full-page modal implementation
- EntryForm and field configuration
- Details drawers
- Responsive tables
- Mobile cards
- Live Meeting route and workspace
- Meeting, participant, agenda, document, vote, decision, resolution, action, and minutes registries
- Existing authentication and permission logic
- Existing file upload and preview system
- Existing theme and dark-mode system
- Existing filters, sorting, pagination, export, and print behavior

Preserve:

- Existing files and folders
- Existing route architecture
- Existing APIs and service contracts
- Existing Redux and registry patterns
- Existing design tokens
- Existing themes
- Existing table and card styling
- Existing form styling
- Existing modal and drawer styling
- Existing upload validation
- Existing document preview
- Existing responsive behavior
- Existing working actions

Do not rename, move, or delete unrelated files.

Only translation-specific files, dependencies, providers, hooks, scripts, and components may be removed as part of the explicit English-only requirement.

# 2. Completely remove language and translation functionality

The application must become English-only.

Do not only hide the language-switching button. Remove the full localization system safely.

## Remove from the UI

Remove:

- EN/BN language switch
- Language dropdown
- Language icon
- Language settings
- Language selection from profile settings
- Language selection from login or public pages
- Language-related loading states
- Any bilingual labels
- Any Bangla text
- Any translation-status or locale-debug UI

Remove the language control from:

- Desktop header
- Mobile header
- Navigation drawer
- User menu
- Settings
- Login
- Public registration
- Help content
- Any footer or utility panel

Do not leave an empty space where the language control existed.

## Remove from the code

Remove safely:

- Translation provider
- i18n initialization
- Locale resource loading
- `useTranslation`
- `Trans`
- `t()` calls
- Locale context
- Language Redux state
- Language local-storage keys
- Language cookies
- Language query parameters
- Locale change events
- Locale validation scripts
- Translation fallback logic
- Bangla font loading used only for localization
- Direction switching used only for localization
- Translation JSON imports
- Unused translation dependencies

Remove `i18next`, `react-i18next`, and related dependencies only after confirming that no imports remain.

Replace every translated string with a clear English string or a centralized English-only constant where reuse is useful.

Do not replace `t()` calls with unreadable inline text everywhere when a shared English label configuration already exists.

## Translation files

After replacing all active translation calls:

- Remove unused locale folders and translation files.
- Remove locale-validation commands that are no longer relevant.
- Remove tests that only test language switching.
- Replace those tests with English-label rendering tests where useful.

Do not delete unrelated test files.

## English-only requirements

Ensure English text exists for:

- Navigation
- Page headings
- Secondary headings
- Dashboard cards
- Table headers
- Filters
- Empty states
- Details drawers
- Forms
- Validation messages
- Actions
- Statuses
- Confirmations
- Success messages
- Error messages
- Notifications
- Accessibility labels
- Browser title
- Print output
- Export headings
- Public pages

Keep the interface left-to-right.

A business-data field such as “Meeting Language” may remain only if it represents the spoken or recorded language of a meeting. It must not control the application interface.

# 3. Complete the shared Create, Edit, and status behavior

The current project already has feature-specific forms and shared registries. Fix all remaining persistence gaps.

Use this interaction pattern everywhere:

Create → Full-page modal  
Details → Details drawer  
Edit → Same full-page modal with existing values

## Create

Every Create or Add flow must:

- Validate the feature-specific form.
- Generate a unique ID.
- Save the record in the correct shared registry.
- Save connected child records.
- Update the current table immediately.
- Update related pages.
- Recalculate dashboard cards.
- Respect active search and filters.
- Add activity history.
- Show a success message.

Do not store important records only in local page state.

## Edit

Every editable drawer must contain a working Edit action.

Required flow:

1. Open the record in the details drawer.
2. Click Edit.
3. Close the drawer.
4. Open the same full-page form in Edit mode.
5. Prefill all editable fields.
6. Preserve the record ID.
7. Preserve creation date and creator.
8. Preserve relationships.
9. Preserve attachments and previous versions.
10. Preserve activity and approval history.
11. Save changes into the shared registry.
12. Update all related pages.
13. Add an update-history entry.

Implement `onRowUpdate` or the equivalent registry update logic for every generated entity page.

Do not update only the local table row.

## Status actions

Make these actions persistent and functional:

- Approve
- Reject
- Request Revision
- Publish
- Postpone
- Cancel
- Archive
- Duplicate
- Delete
- Activate
- Deactivate
- Reopen
- Close

Every status action must:

- Check permission.
- Validate the current status.
- Prevent invalid transitions.
- Update the shared registry.
- Record the actor.
- Record previous and new status.
- Record date and time.
- Require a reason where relevant.
- Update related tables and drawers.
- Add activity history.

Use soft deletion for protected, approved, published, completed, or archived records.

# 4. Save the complete Meeting form structure

The seven-step Create Meeting form must create all connected records, not only the main Meeting row.

When the user submits or saves a meeting, convert the form data into structured records for:

- Meeting
- Meeting participants
- RSVP records
- Agenda sections
- Agenda items
- Meeting documents
- Document access rules
- Board-pack preparation data
- Notification schedule
- Conflict-declaration requirements
- Quorum forecast

Convert repeatable form keys into structured arrays.

Do not leave flattened values such as:

- `participants__0__user`
- `agenda_items__0__agenda_title`
- `documents__0__file`

Implement proper repeatable-group parsing, validation, creation, editing, deletion, and reordering.

Required validation inside repeatable groups must work.

Examples:

- A participant row cannot be saved without a participant and meeting role.
- An agenda row cannot be saved without a title and purpose.
- A document row cannot be saved without a document name and file when a new file is required.
- Empty repeatable rows must not pass validation.
- Editing must rebuild the repeatable rows from stored structured data.

# 5. Transform Live Meeting into a virtual meeting workspace

Keep the Live Meeting inside the Meetings module.

Do not add a new master navigation item.

Use the existing route pattern:

`/meetings/:meetingId/live`

The Live Meeting workspace must combine:

- Virtual video meeting
- Board Meeting agenda control
- Attendance and quorum
- Documents and board packs
- Motions and voting
- Decisions and resolutions
- Action items
- Live minutes

Create a focused, dark, distraction-free meeting workspace inspired by the behavior of modern video-conferencing applications.

Do not copy Zoom, Google Meet, Microsoft Teams, or another product’s branding, icons, exact visual design, or trademarked interface.

Reuse the project’s existing colors, typography, controls, border radius, spacing, themes, icons, modals, drawers, and responsive rules.

# 6. Virtual meeting entry flow

Before entering the meeting, show a pre-join screen.

## Pre-join screen

Include:

- Meeting title
- Governance body
- Meeting date and time
- Participant name
- Participant role
- Camera preview
- Camera on/off
- Microphone on/off
- Microphone input selector
- Speaker output selector
- Camera selector
- Background blur, only if safely supported
- Network and permission status
- Join Meeting button
- Join without camera
- Permission-error guidance
- Meeting access status
- Waiting-room status when required

If browser media access is unavailable or denied:

- Show a clear error.
- Allow joining without camera or microphone when the meeting rules permit it.
- Do not leave the user on a blank screen.

## Waiting room

Support:

- Waiting for admission
- Admit participant
- Admit all
- Deny entry
- Remove from waiting room
- Display participant name and role
- Mark external participants clearly

Only authorized meeting hosts, chairpersons, secretaries, or administrators may admit participants.

# 7. Virtual meeting main layout

Use the following structure.

## Top meeting bar

Show:

- Meeting title
- Governance body
- Current meeting status
- Meeting duration
- Recording indicator
- Quorum status
- Connection-quality indicator
- Security or lock status
- Full-screen control
- Leave Meeting
- End Meeting for authorized roles only

Keep this bar compact.

## Main meeting stage

The main area must support:

- Active speaker view
- Participant grid view
- Screen-share view
- Board-document presentation view
- Pinned participant
- Spotlighted presenter
- Participant name
- Participant role
- Microphone status
- Camera status
- Speaking indicator
- Raised-hand indicator
- Connection-quality indicator
- Host, chairperson, secretary, presenter, observer, and guest indicators

When camera is off, show:

- Existing avatar, or
- User initials with the project’s existing avatar style

Do not show a large empty blank screen.

## Participant filmstrip

When screen sharing or presenting a document:

- Show participant video thumbnails in a side or bottom filmstrip.
- Keep the active presenter visible.
- Allow collapsing the filmstrip.
- Preserve access to Board Meeting controls.

## Bottom control dock

Include:

- Microphone
- Camera
- Share Screen
- Present Board Document
- Participants
- Chat
- Raise Hand
- Reactions
- Captions, only when supported
- More Options
- Leave Meeting

Host-only controls may include:

- Record Meeting
- Lock Meeting
- Mute All
- End Meeting for All

Use tooltips and accessible labels.

Show active, inactive, disabled, loading, and permission-denied states.

# 8. Essential virtual meeting functions

Implement or create a safe integration-ready interface for:

- Join
- Leave
- End for all
- Microphone toggle
- Camera toggle
- Switch microphone
- Switch camera
- Switch speaker
- Screen sharing
- Stop screen sharing
- Participant grid
- Active speaker
- Pin participant
- Spotlight presenter
- Full screen
- Chat
- Raise hand
- Lower hand
- Reactions
- Participant list
- Mute self
- Host mute participant
- Mute all
- Waiting room
- Admit participant
- Remove participant
- Lock meeting
- Recording control
- Recording consent
- Connection-quality indicator
- Device permission handling
- Reconnection handling
- Low-bandwidth state

Do not hardcode a Zoom or Google Meet SDK.

Create a provider abstraction such as a `VirtualMeetingProvider` only if the project does not already have a video-service abstraction.

The provider interface should safely support:

- Join and leave
- Media device state
- Participant events
- Screen sharing
- Chat
- Hand raise
- Reactions
- Recording state
- Connection state

If no real multi-party video provider is connected:

- Use browser media APIs for local device preview where possible.
- Provide a stable demo provider behind the abstraction.
- Do not present mock participants as a production video service.
- Keep future SDK integration possible without rebuilding the UI.

Do not change existing API contracts.

# 9. Integrated Board Meeting panel

Add a collapsible Board Meeting panel inside the virtual meeting workspace.

On desktop, use a right-side panel that can be opened, collapsed, and resized within safe limits.

On mobile, open the panel as a full-height bottom sheet or full-screen internal panel.

Use tabs inside this panel:

1. Agenda
2. Documents
3. Participants & Quorum
4. Motions & Voting
5. Decisions & Actions
6. Minutes

Do not create another sidebar navigation layer.

## Agenda tab

Show:

- Current agenda item
- Agenda progress
- Planned duration
- Actual duration
- Presenter
- Purpose
- Supporting documents
- Voting requirement
- Status

Authorized users can:

- Start discussion
- Pause discussion
- Resume discussion
- Complete item
- Skip item
- Defer item
- Withdraw item
- Reopen item
- Add emergency item
- Extend time
- Change presenter
- Reorder remaining items

Persist every action.

Display warnings when:

- An agenda item exceeds its planned time.
- The meeting is behind schedule.
- Remaining agenda time exceeds remaining meeting time.

## Documents tab

Show:

- Board pack
- Current agenda documents
- Previous minutes
- Related resolutions
- Supporting documents
- Document version
- Confidentiality
- Access status

Support:

- Preview
- Zoom
- Page navigation
- Full-screen view
- Present document to meeting
- Follow presenter
- Independent reading
- Download when permitted
- Print when permitted
- Private annotation when supported

Reuse the existing file preview and security system.

## Participants & Quorum tab

Show:

- Participant list
- Role
- Attendance mode
- Join time
- Current attendance state
- Voting eligibility
- Conflict or recusal state
- Raised hand
- Connection state

Support:

- Present in person
- Present virtually
- Joined late
- Left early
- Temporarily absent
- Approved leave
- Absent
- Represented by alternate
- Recused for agenda item

Persist attendance into the Attendance registry.

Use the configured Quorum Rule.

Do not use a hardcoded percentage.

Calculate quorum from:

- Eligible members
- Current attendance
- Required roles
- Alternates
- Recusals
- Governance-body rule
- Meeting-specific override
- Voting-quorum rule

Save every quorum change into the Quorum Event registry.

When quorum is lost:

- Warn the chairperson and secretary.
- Save the time.
- Block restricted votes and decisions.
- Allow pause or adjournment.
- Restore controls when quorum returns.

## Motions & Voting tab

Support:

- Add motion
- Second motion
- Amend motion
- Withdraw motion
- Put motion to vote
- Create vote
- Open vote
- Pause vote
- Extend vote
- Close vote
- Cancel vote
- Reopen vote with permission and reason
- Cast vote
- Chairman casting vote

Persist motion statuses into the Motion registry.

Persist votes into the Vote registry.

Calculate:

- Eligible voters
- Submitted votes
- Pending votes
- Approval votes
- Rejection votes
- Abstentions
- Invalid votes
- Required threshold
- Final outcome

Support:

- Open ballot
- Secret ballot
- Yes/No/Abstain
- Approve/Reject/Abstain
- Multiple choice
- Unanimous consent
- Chairman casting vote

Secret ballots must hide individual votes from unauthorized users.

Do not allow voting when the configured quorum is not met.

## Decisions & Actions tab

Support:

- Record Decision
- Create Resolution
- Create Action Item
- Link decision to agenda item
- Link resolution to motion and vote
- Assign action owner
- Set due date
- Set priority
- Set evidence requirement

Persist every record.

Created records must immediately appear in:

- Meeting details
- Decisions
- Resolutions
- Action Items
- Registers
- Assigned user’s My Tasks

## Minutes tab

Create a structured live-minute panel.

Capture:

- Attendance
- Quorum confirmation
- Agenda start and end times
- Presenter
- Discussion summary
- Questions
- Responses
- Motions
- Votes
- Decisions
- Resolutions
- Actions
- Conflicts and recusals
- Breaks
- Adjournment
- Closing remarks
- Actual end time

Autosave the live minutes safely.

Do not lose notes after:

- Refresh
- Route change
- Temporary connection loss
- Panel collapse

# 10. Virtual meeting role permissions

Apply role-based controls.

## Chairperson

Can:

- Start meeting
- Pause
- Resume
- Start break
- Adjourn
- End for all
- Control agenda
- Approve speaking requests
- Open or close votes
- Use casting vote when allowed
- Lock meeting
- Remove participants
- Start closed session

## Company Secretary or Meeting Secretary

Can:

- Manage attendance
- Manage quorum records
- Control agenda when authorized
- Record discussions
- Create motions, decisions, resolutions, and actions
- Manage documents
- Capture minutes
- Record corrections

## Board or Committee Member

Can:

- Join meeting
- View permitted documents
- Raise hand
- Ask questions
- Vote when eligible
- Add private notes
- View allowed results

## Presenter

Can:

- Present assigned documents
- Share screen
- Answer questions
- Access assigned agenda items

## Observer or Guest

Can:

- Join when admitted
- View permitted content
- Use chat or speaking request when allowed
- Never vote unless explicitly granted by governance rules

## Administrator

Can manage technical meeting functions but must not receive governance voting rights automatically.

Hide unauthorized controls.

Do not only disable controls visually while leaving their actions executable.

# 11. Breaks, adjournment, closed sessions, and closure

Add functional controls for:

- Start Break
- Set expected return time
- Resume After Break
- Pause Meeting
- Resume Meeting
- Adjourn Meeting
- Record adjournment reason
- Set resumed date and time
- Resume Adjourned Meeting
- Start Closed Session
- End Closed Session
- Remove guests from closed session
- Restore permitted participants

Persist all state changes and timestamps.

## Meeting closure checklist

Before End Meeting for All, validate:

- Required agenda items addressed
- Open votes closed
- Decisions recorded
- Resolutions finalized
- Actions assigned
- Action due dates entered
- Outstanding questions recorded
- Closing remarks captured
- Final attendance state recorded
- Final quorum state recorded

Allow an authorized override only with a required reason.

After ending:

- Set the meeting to Awaiting Minutes.
- Save actual end time.
- Lock voting.
- Lock normal attendance editing.
- Generate the structured draft minutes.
- Preserve corrections through authorized amendment flows.

# 12. Table-column audit

Audit every active desktop table.

Each table must contain:

- Minimum 5 useful columns when enough data exists
- Maximum 7 columns, including Actions
- Only the information needed for scanning, comparison, and immediate action

Move all secondary information into the details drawer.

Do not remove the information from the record.

Do not create horizontal scrolling on normal desktop widths unless technically unavoidable.

Use stacked cells where two closely related values belong together.

Examples:

- Name + reference
- Date + time
- Designation + position
- Meeting + agenda item
- Owner + organization unit
- Status + progress

Keep headers short.

Do not place long descriptions, notes, addresses, document lists, approval history, or multiple dates directly in the table.

# 13. Required table columns

Use these columns as the target structure.

The Actions column counts toward the seven-column maximum.

## Home

### Overview activity

- Activity
- Related Meeting
- Type
- Due Date
- Status
- Last Updated

### My Tasks

- Task
- Type
- Related Meeting
- Due Date
- Priority
- Status
- Actions

### My Calendar

- Event
- Type
- Date & Time
- Mode or Location
- Governance Body
- Status

## Meetings

### Meeting Overview

- Meeting
- Governance Body
- Date & Time
- Readiness
- Quorum
- Status
- Actions

### All Meetings

- Reference & Meeting
- Body & Type
- Date & Time
- Mode
- Participant Count
- Status
- Actions

### Meeting Calendar

- Meeting
- Governance Body
- Date & Time
- Mode & Venue
- Status
- Actions

### Meeting Templates

- Template
- Meeting Type
- Governance Body
- Default Duration
- Last Used
- Status
- Actions

## Agenda & Documents

### Agenda Management

- Agenda No. & Title
- Requested Meeting
- Submitted By & Unit
- Priority
- Submission Date
- Status
- Actions

### Board Packs

- Board Pack & Meeting
- Version
- Meeting Date
- Document Count
- Review Progress
- Status
- Actions

### Document Library

- Document
- Type
- Meeting & Agenda
- Owner
- Version
- Status
- Actions

### Questions & Clarifications

- Question
- Meeting & Agenda
- Submitted By
- Assigned To
- Due Date
- Status
- Actions

### My Notes

- Note
- Meeting & Agenda
- Document & Page
- Last Updated
- Privacy
- Actions

## Decisions & Follow-up

### Decisions

- Decision
- Meeting & Agenda
- Owner
- Effective Date
- Implementation Status
- Actions

### Resolutions

- Resolution
- Meeting
- Voting Result
- Effective Date
- Responsible Owner
- Status
- Actions

### Action Items

- Action
- Source Meeting
- Assignee & Unit
- Due Date
- Progress
- Status
- Actions

### Matters Arising

- Matter
- Source Meeting & Agenda
- Owner
- Due Date
- Target Meeting
- Status
- Actions

### Follow-up Questions

- Question
- Source Meeting
- Assigned To
- Response Deadline
- Response Status
- Actions

## Governance & Organization

### Governance Bodies

- Governance Body
- Type
- Chairperson & Secretary
- Active Members
- Quorum Rule
- Status
- Actions

### Organization Structure

- Unit
- Type
- Parent Unit
- Head
- Active Users
- Status
- Actions

### Users & Assignments

- Employee & Name
- Designation & Position
- Organization Unit
- Reports To
- System Role
- Status
- Actions

### Designations

- Designation & Code
- Grade & Rank
- Management Level
- Active Users
- Status
- Actions

### Positions

- Position
- Type
- Organization Unit
- Current Holder
- Vacancy Status
- Actions

### Participant Groups

- Group
- Type
- Rule Summary
- Members
- Last Used
- Status
- Actions

## Archive & Reports

### Meeting Archive

- Reference & Meeting
- Governance Body
- Meeting Date
- Final Minutes
- Final Board Pack
- Confidentiality
- Status

No Actions column is required when the entire row opens the read-only archive drawer.

### Resolution Register

- Resolution
- Meeting Date
- Voting Result
- Owner
- Implementation Status
- Status

### Decision Register

- Decision
- Meeting
- Owner
- Effective Date
- Implementation Status
- Status

### Action Register

- Action
- Source Meeting
- Assignee
- Due Date
- Progress
- Status

### Attendance Register

- Participant
- Meeting
- Attendance Mode
- Join & Leave
- Duration
- Status

### Conflict Register

- Member
- Meeting & Agenda
- Conflict Type
- Recusal
- Review Status
- Declaration Date

### Reports & Analytics

- Report
- Category
- Date Range
- Last Generated
- Schedule
- Status
- Actions

### Audit Trail

- Date & Time
- User
- Action
- Module & Record
- Risk Level
- Session or Device

## Administration

### Roles

- Role
- Type
- Assigned Users
- Permissions
- Data Scope
- Status
- Actions

### Permissions

- Permission
- Module
- Action
- Access Scope
- Assigned Roles
- Status
- Actions

### Workflow Definitions

- Workflow
- Type
- Applies To
- Stages
- Owner
- Status
- Actions

### Approval Rules

- Rule
- Applies To
- Required Approvers
- Minimum Approvals
- Deadline
- Status
- Actions

### Review & Revision Rules

- Rule
- Applies To
- Reviewers
- Deadline
- Revision Limit
- Status
- Actions

### Meeting Types

- Meeting Type & Code
- Category
- Governance Body
- Quorum & Voting
- Workflow
- Status
- Actions

### Quorum Rules

- Rule
- Governance Body
- Requirement
- Required Roles
- Voting Quorum
- Status
- Actions

### Voting Methods

- Method
- Type
- Threshold
- Ballot
- Tie Rule
- Status
- Actions

### Status Configuration

- Entity
- Status
- Type
- Allowed Next Statuses
- Allowed Roles
- Active
- Actions

### Numbering Configuration

- Entity
- Prefix & Pattern
- Sequence
- Reset Frequency
- Preview
- Status
- Actions

### Templates

- Template
- Type
- Used By
- Version
- Last Updated
- Status
- Actions

Remove the Language column and Language form input because the application is English-only, unless a document’s spoken or legal language is an independent business requirement.

### Notification Rules

- Rule
- Trigger
- Recipients
- Channel
- Timing
- Status
- Actions

### Message Templates

- Template
- Channel
- Trigger & Audience
- Subject
- Status
- Actions

### Delivery Logs

- Notification
- Recipient
- Channel
- Sent At
- Delivery Status
- Failure Reason

### Integrations

- Integration
- Type
- Provider
- Last Sync
- Connection
- Authentication
- Actions

### Security Policies

- Policy
- Type
- Applies To
- Enforcement
- Review Date
- Status
- Actions

### Retention & Legal Holds

- Policy or Hold
- Record Type or Scope
- Retention or Start Date
- Disposal or Hold Rule
- Review Date
- Status
- Actions

# 14. Details-drawer requirements after column reduction

Every piece of data removed from a table must remain available in the details drawer.

Do not lose information to achieve fewer columns.

Use clear drawer sections.

## Common drawer structure

- Record summary
- Primary information
- Related meeting or organization
- Dates and schedule
- Participants or owners
- Access and confidentiality
- Supporting documents
- Status and workflow
- Comments and remarks
- Related records
- Activity history

## Meeting drawer

Include:

- Meeting information
- Governance body and scope
- Participants and RSVP
- Agenda
- Documents and board pack
- Quorum and readiness
- Notifications
- Minutes
- Decisions and actions
- Activity

## User drawer

Include:

- Profile
- Designation and position
- Organization assignments
- Reporting line
- Governance memberships
- System access
- Meeting history
- Activity

## Document drawer

Include:

- Metadata
- Meeting and agenda links
- Access rules
- Versions
- Review status
- Attachments
- Activity

Use the existing wide-drawer pattern for complex records.

# 15. Responsive table behavior

Desktop:

- Show 5–7 columns maximum.
- Keep Actions last.
- Avoid horizontal scrolling.
- Use stacked cells for related values.

Tablet:

- Show 4–5 essential columns.
- Move more information into the drawer.
- Keep Actions accessible.

Mobile:

- Continue using mobile cards.
- Do not render compressed desktop tables.
- Show no more than 3–5 key metadata items.
- Tapping the card opens details.
- Do not add a redundant View Details button.
- Keep status visible.
- Put only essential contextual actions in the card footer.

# 16. Remove remaining NBR and translation remnants

Search the entire active project for:

- Bangla text
- Bengali text
- `bn`
- `en`
- locale
- language switch
- i18n
- translation
- `useTranslation`
- `t(`
- Circle
- Zone
- TIN
- Taxpayer
- Return
- Assessment Year
- PSR
- Certificate
- Litigation
- Tribunal
- Appeal
- Register-4
- Register-5
- Demand
- Refund
- Challan
- Tax Officer
- Tax Administration

Remove visible legacy content.

Internal old identifiers may remain only when changing them would break existing APIs or service contracts. They must not appear in:

- UI labels
- Drawer labels
- Table headers
- Forms
- Permissions
- Notifications
- Exports
- Print views
- Public pages
- Accessibility text

Transform the External Participant Registration flow fully. It must not contain TIN, tax residency, departure seals, tax documents, or NRB tax terminology.

# 17. Testing requirements

Add or update tests for:

- English-only rendering
- No language switch in desktop
- No language switch in mobile
- No active translation provider
- Create Meeting child-record persistence
- Repeatable-group validation
- Meeting Edit persistence
- Drawer action persistence
- Status transition persistence
- Live Meeting join
- Camera and microphone states
- Attendance persistence
- Quorum calculation
- Quorum loss behavior
- Vote creation and persistence
- Vote threshold calculation
- Secret-vote visibility
- Motion status persistence
- Resolution creation
- Action creation
- Live minutes autosave
- Meeting closure checklist
- Draft-minute generation
- Table column-count limits
- Details-drawer information availability
- Mobile-card behavior
- Permission-controlled actions

Run:

- TypeScript check
- Production build
- Existing tests
- New Board Meeting workflow tests
- Lint
- Route validation

Fix:

- Duplicate object keys
- Invalid CSS import ordering
- Dead translation imports
- Unused locale dependencies
- Broken drawer actions
- Registry synchronization issues

# Acceptance criteria

The work is complete only when:

- The application is English-only.
- No Bangla text remains.
- No language switch remains.
- No translation provider remains.
- No active translation dependency remains.
- The project builds after localization removal.
- The seven master navigation groups remain unchanged.
- Create and Edit persist through shared registries.
- Repeatable meeting participants, agendas, and documents save correctly.
- Status actions persist.
- Drawer actions are functional.
- Every active table has no more than seven columns including Actions.
- Removed table data appears in the details drawer.
- Desktop tables avoid unnecessary horizontal scrolling.
- Mobile cards remain clear and consistent.
- The Live Meeting is a real virtual meeting workspace.
- A pre-join device screen exists.
- Microphone and camera controls work.
- Screen sharing has a working integration-ready flow.
- Participants, chat, hand raise, reactions, and meeting controls exist.
- Attendance saves to the Attendance registry.
- Quorum uses configured rules.
- Quorum events persist.
- Quorum loss blocks restricted votes.
- Motions persist.
- Votes persist and calculate results.
- Secret ballots protect individual votes.
- Decisions, resolutions, and actions can be created during the meeting.
- The Board Meeting panel remains available while video or screen sharing is active.
- Live minutes autosave.
- Meeting closure uses a checklist.
- Ending a meeting generates draft minutes.
- Archive and registers receive connected records.
- External Participant Registration contains no tax workflow.
- Existing themes remain intact.
- Existing APIs remain intact.
- Existing routes remain backward-safe.
- Desktop and mobile both work.
- No solved feature is broken.

# Golden Rules

- Do not break solved issues.
- Do not change unrelated files.
- Do not rename, move, or delete unrelated files.
- Do not change the project architecture.
- Do not change existing API contracts.
- Do not remove working features.
- Remove only translation-related code and files within this task’s explicit scope.
- Keep the seven master navigation items unchanged.
- Do not add a separate Virtual Meeting master navigation item.
- Keep the Live Meeting inside Meetings.
- Reuse existing components, styles, modals, drawers, cards, tables, uploads, previews, and confirmations.
- Do not copy Zoom or Google Meet branding.
- Use their interaction principles only as general UX reference.
- Keep Create and Edit in the same full-page modal flow.
- Keep record details in drawers.
- Keep desktop tables within 5–7 columns maximum, including Actions.
- Move secondary information into details drawers.
- Do not delete record data only to shorten a table.
- Preserve responsive behavior.
- Preserve mobile cards.
- Preserve dark mode and all existing themes.
- Preserve document versions and historical records.
- Use soft deletion for protected records.
- Enforce permissions in both UI and action logic.
- Persist Live Meeting state safely.
- Test shared-component changes across every affected page.
- Keep the application stable after every implementation phase.