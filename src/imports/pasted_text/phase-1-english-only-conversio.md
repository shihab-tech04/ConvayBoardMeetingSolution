```text
Work directly inside the latest existing React and TypeScript project, **NCC Bank Board Meeting Solution**.

The current project already contains the approved navigation, Board Meeting modules, reusable tables, KPI cards, forms, popup and full-page modals, details drawers, registries, responsive mobile cards, login components, and a Live Meeting workspace.

Your task is to complete and refine the current project through the controlled phases below.

Execute every phase in order inside the same project. Do not stop after one phase. Keep the application stable after each phase.

The final product must have:

- A polished, professional Board Meeting UI
- Correct use of existing reusable components
- Dynamic actions based on record content, status, role, permission, date, and related records
- Fully dynamic tables, cards, drawers, forms, KPIs, filters, and workflows
- Persistent Create, Edit, status, and relationship changes
- Clear and consistent English UX writing
- No remaining NBR, tax, translation, or Bangla functionality

# Verified issues in the current project

The latest source still contains several issues that must be corrected:

- `GeneratedTablePage` still passes page-level `cfg.actions` into tables instead of enforcing one shared View Details action.
- Drawer actions are mostly static and are not resolved from record status, role, permission, or meeting timing.
- Meeting Start and Join actions are not controlled through one reliable Meeting action resolver.
- Most pages do not have independent drawer schemas.
- Many drawers fall back to table columns and therefore show incomplete details.
- Several table configurations still contain more than seven columns.
- Some creation and editing flows update local table state without reliably updating shared registries.
- Legacy generic helpers such as `CIRCLES`, `ZONES`, `AY_OPTS`, PSR row builders, and tax-era configuration structures remain.
- The localization system and `react-i18next` dependencies remain active.
- Old Bangla and NBR-related login illustrations are still imported.
- The login page currently stacks a dark product preview and a second illustration vertically, causing excessive height and desktop scrolling.
- Product branding is repeated in the login panel.
- The login illustration still contains Bangla content.
- Some drawer and success messages remain generic.
- Several KPIs and table values are static or calculated from incorrect statuses.
- Live Meeting controls and record updates are not fully registry-backed.

# Approved project structure

Keep exactly these seven master navigation items:

1. Home
2. Meetings
3. Agenda & Documents
4. Decisions & Follow-up
5. Governance & Organization
6. Archive & Reports
7. Administration

Do not add an eighth master navigation item.

Use these approved child labels:

## Home

- Overview
- My Tasks
- My Calendar

## Meetings

- Overview
- All Meetings
- Calendar
- Templates

## Agenda & Documents

- Agenda Management
- Board Packs
- Document Library
- Questions & Responses
- My Notes

## Decisions & Follow-up

- Decisions
- Resolutions
- Action Items
- Matters Arising
- Follow-up Questions

## Governance & Organization

- Governance Bodies
- Organization Structure
- Users & Assignments
- Designations & Positions
- Participant Groups

## Archive & Reports

- Meeting Archive
- Minutes
- Registers
- Reports & Analytics
- Audit Trail

## Administration

- Roles & Permissions
- Workflows
- Meeting Configuration
- Templates
- Notifications
- Integrations
- Security & Retention

# Phase 0 — Protect and map the current project

Before modifying shared components, inspect and document internally:

- Every active route
- Every active navigation item
- Every page configuration
- Every table configuration
- Every drawer configuration
- Every form configuration
- Every entity registry
- Every page-level Create and Edit handler
- Every row and drawer action
- Every status value
- Every permission used by Board Meeting features
- Every remaining translation call
- Every remaining NBR or tax-era field
- Every component duplicated instead of reused

Create an internal page-to-entity map.

Each page must identify:

- Entity type
- Shared registry
- Table schema
- Drawer schema
- Form schema
- KPI selector
- Filter schema
- Search fields
- Mobile-card mapping
- Action resolver
- Status transition rules
- Permission rules
- Related entities

Do not begin visual redesign by duplicating components.

## Phase 0 acceptance

- Every active page is connected to a defined entity.
- Every entity has one authoritative data source.
- No existing route, API, or working feature is removed.
- A safe implementation path is established before shared components are modified.

# Phase 1 — Finish the English-only conversion

The application must use English only.

Do not hide or stub the translation system. Remove it completely and safely.

Remove:

- `i18next`
- `react-i18next`
- Browser language detection
- Translation providers
- Translation contexts
- Translation hooks
- Translation resources
- Bangla locale files
- Locale validation scripts
- Language state
- Language storage keys
- Language cookies
- Language controls
- Language-related UI
- Translation fallback stubs
- `t()` calls
- `useTranslation`
- Unused Bangla fonts loaded only for localization

Replace every active translation call with final English writing or a reusable English constant.

No unresolved keys may appear, including:

- `appTitle`
- `appSubtitle`
- `pageTitle`
- `pageDesc`
- `title`
- `subtitle`
- `userId`
- `password`
- `signIn`
- `searchPlaceholder`
- `totalUsers`
- `createRole`

Remove language-related dependencies from `package.json` only after no active import remains.

Keep the application left-to-right.

A `Meeting Language` field may remain only when it represents the spoken or recorded language of a meeting. It must not control the interface.

## Phase 1 acceptance

- No Bangla interface text remains.
- No Bangla illustration remains.
- No language switch remains.
- No translation hook remains.
- No translation provider remains.
- No unresolved UI key renders.
- The application builds successfully after dependency removal.

# Phase 2 — Create one reusable entity-definition system

Do not continue defining unrelated behavior independently inside every page.

Extend the existing page configuration model into one reusable entity-definition system.

Each entity definition should support:

- Entity ID
- Singular label
- Plural label
- Record-title resolver
- Record-subtitle resolver
- ID field
- Status field
- Shared registry
- Table columns
- Drawer sections
- Create form
- Edit form
- Form steps
- Searchable fields
- Filters
- KPI selectors
- Mobile-card mapping
- Action resolver
- Status transitions
- Permission resolver
- Empty-state writing
- Success and error writing
- Related-record resolvers

Use the existing:

- `GeneratedTablePage`
- `ResponsiveTable`
- `UnifiedMobileCard`
- `DynamicDetailsDrawer`
- `AppModal`
- `EntryForm`
- `StatusBadge`
- `CollapsibleKpiSection`
- `FilterPanel`
- `SConfirmModal`
- Existing button components
- Existing attachment components
- Existing theme tokens

Do not create a parallel table, drawer, modal, form, badge, or button system.

Remove active dependence on legacy generic assumptions such as:

- `CIRCLES`
- `ZONES`
- `AY_OPTS`
- PSR-specific row builders
- Return-specific row builders
- Taxpayer field detection
- Litigation field detection
- Certificate field detection

Replace them with Board Meeting entity configuration.

## Phase 2 acceptance

- One reusable entity definition controls every generated page.
- Shared components do not contain NBR-specific business assumptions.
- Entity-specific behavior comes from configuration and registries.
- Custom pages reuse the same interaction principles even when they require specialized layouts.

# Phase 3 — Make all data fully dynamic

All visible information must derive from shared data.

Do not hardcode operational values directly inside page components.

Use shared registries for:

- Meetings
- Meeting templates
- Governance bodies
- Governance memberships
- Organization units
- Designations
- Positions
- User assignments
- Participant groups
- Meeting participants
- Invitations and RSVP
- Availability polls
- Agenda sections
- Agenda items
- Documents
- Document versions
- Board packs
- Board-pack versions
- Questions
- Responses
- Notes
- Conflict declarations
- Attendance records
- Quorum events
- Motions
- Votes
- Decisions
- Resolutions
- Action items
- Action updates
- Extension requests
- Completion reviews
- Matters arising
- Minutes
- Minutes versions
- Minutes amendments
- Workflows
- Approval rules
- Quorum rules
- Voting methods
- Notification rules
- Delivery records
- Audit events

Demo data may remain only as seed data loaded into the same registries used by created records.

Do not maintain separate static arrays for the same entity on different pages.

## Required cross-page relationships

### Meetings

The same Meeting record must appear in:

- Home
- Meeting Overview
- All Meetings
- Calendar
- Meeting details
- Live Meeting
- Minutes
- Meeting Archive

### Decisions

The same Decision record must appear in:

- Meeting details
- Live Meeting
- Decisions
- Decision Register
- Minutes
- Reports

### Resolutions

The same Resolution record must appear in:

- Meeting details
- Live Meeting
- Resolutions
- Resolution Register
- Minutes
- Reports

### Actions

The same Action record must appear in:

- Meeting details
- Live Meeting
- Action Items
- My Tasks
- Action Register
- Matters Arising
- Reports

### Documents

The same Document and version records must appear in:

- Meeting details
- Agenda item
- Document Library
- Board Pack
- Live Meeting
- Archive

## Dynamic dependent options

Form options must derive from registries.

Examples:

- Governance-body options come from Governance Bodies.
- Selecting a governance body loads its active members.
- Division options come from Organization Structure.
- Department options filter by selected division.
- Region options filter branches.
- Position options filter by organization unit.
- Meeting selection filters agenda items.
- Agenda-item selection filters related documents.
- Decision selection filters available actions and resolutions.
- Participant groups resolve their current membership dynamically.

## Dynamic KPI rules

KPIs must derive from selectors over shared records.

Examples:

- Upcoming Meetings must include future scheduled meetings only.
- Draft Meetings must include Draft only.
- Completed Meetings must include Completed only.
- Pending Invitations must use invitation and RSVP records.
- Overdue Actions must compare due date, current date, and final status.
- Review Progress must use actual document-review records.
- Quorum must use the selected quorum rule and current attendance.
- Readiness must use the readiness checklist.

Do not show fabricated values.

Hide a KPI or display an honest empty state when its calculation is unavailable.

## Phase 3 acceptance

- Create, Edit, status changes, and related-record changes survive navigation and refresh.
- Related pages always show the same record state.
- KPIs update automatically.
- Filters and search work on newly created and edited records.
- No page relies on a disconnected copy of another page’s data.

# Phase 4 — Standardize every table

Audit every active table carefully.

Each desktop table must contain:

- At least five useful columns when enough data exists
- No more than seven columns, including Actions
- One visible action only
- No unnecessary horizontal scrolling at normal desktop widths
- Short and accurate headers
- Proper stacked cells only when the label describes both values

The single row action must be:

- Eye or details icon
- Tooltip: `View details`
- Accessible label: `View details for [record name]`

Do not show these actions in table rows:

- Edit
- Start Meeting
- Join Meeting
- Approve
- Reject
- Publish
- Duplicate
- Cancel
- Postpone
- Archive
- Delete
- Download
- Print

Do not show a row-level More menu.

## Mobile cards

- Card tap opens the details drawer.
- Do not show a View Details button.
- Do not show Edit, Start, Join, or approval actions.
- Show status and no more than five useful metadata items.
- Use the entity’s explicit mobile-card mapping.
- Do not rely only on fallback key detection.

## Essential table-column rules

Use these patterns as the approved targets.

### Meetings

- Meeting
- Governance Body & Type
- Date & Time
- Mode
- Participants
- Status
- Actions

### Agenda

- Agenda Item
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
- Documents
- Review Progress
- Status
- Actions

### Documents

- Document
- Type
- Meeting & Agenda
- Owner
- Version
- Status
- Actions

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
- Owner
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

### Users

- Employee & Name
- Designation & Position
- Organization Unit
- Reports To
- System Role
- Status
- Actions

### Governance Bodies

- Governance Body
- Type
- Chairperson & Secretary
- Members
- Quorum Rule
- Status
- Actions

### Administration pages

Keep only:

- Record name
- Type or module
- Primary rule or scope
- Owner or assignee
- Last updated or effective date
- Status
- Actions

Move technical metadata such as endpoint, HTTP method, internal ID, service name, raw rule JSON, and audit payload into the drawer.

## Phase 4 acceptance

- Every active table has seven columns or fewer.
- Every row has exactly one visible action.
- Every mobile card opens details by tapping the card.
- No record information is deleted to shorten a table.
- Normal desktop pages do not require horizontal table scrolling.

# Phase 5 — Give every entity a complete details drawer

The drawer must not use table columns as its information schema.

Replace:

`drawer columns = table columns when no drawer columns exist`

with an explicit entity-level drawer definition.

Every entity must have:

- Contextual drawer title
- Summary
- Grouped information
- Related records
- Attachments where relevant
- Activity history
- Dynamic footer actions

Do not use `Record Details`.

Use titles such as:

- Meeting Details
- Agenda Item Details
- Board Pack Details
- Document Details
- Question Details
- Decision Details
- Resolution Details
- Action Item Details
- Governance Body Details
- Organization Unit Details
- User Details
- Workflow Details
- Approval Rule Details
- Notification Rule Details
- Security Policy Details

## Meeting drawer sections

### Summary

- Reference
- Title
- Meeting type
- Status
- Priority
- Confidentiality
- Purpose
- Description

### Schedule and Access

- Date
- Start time
- End time
- Duration
- Time zone
- Mode
- Venue
- Virtual platform
- Meeting link
- Dial-in information
- Allowed join time

### Governance and Scope

- Governance body
- Chairperson
- Secretary
- Organizer
- Owner
- Divisions
- Departments
- Regions
- Branches

### Participants and RSVP

- Participant
- Meeting role
- Attendance requirement
- Voting eligibility
- Invitation status
- RSVP status
- Alternate
- Access level
- Conflict status

### Agenda

- Sections
- Items
- Presenter
- Duration
- Voting requirement
- Status

### Documents and Board Pack

- Documents
- Versions
- Access
- Board Pack
- Publication status
- Review progress

### Readiness and Quorum

- Readiness checklist
- Quorum rule
- Expected quorum
- Confirmed voters
- Missing requirements
- Warnings

### Outcomes

- Motions
- Votes
- Decisions
- Resolutions
- Action items
- Minutes

### Activity

- Creation
- Updates
- Approvals
- Status transitions
- Access history

Use similarly complete drawer schemas for every other entity.

## Drawer footer layout

Use one horizontal footer row.

Recommended structure:

`Close | More Actions | Secondary action | Primary action`

Rules:

- Close stays on the left.
- The primary contextual action stays on the far right.
- Show no more than two or three direct actions.
- Put lower-priority and destructive actions inside More Actions.
- Never render a long vertical stack of buttons.
- Never place drawer actions inside the scrollable body.
- Use existing button components.
- Use `SConfirmModal` for destructive and major status actions.

## Phase 5 acceptance

- Every drawer contains information not shown in its table.
- Every drawer has an entity-specific title.
- Actions appear in one footer row.
- Actions update the correct shared registry.
- Drawer content updates immediately after Edit or status change.

# Phase 6 — Build one dynamic action resolver

Do not hardcode action arrays independently in every page.

Create a reusable action resolver such as:

`resolveRecordActions({ entity, record, currentUser, permissions, now, relationships })`

Each resolved action must include:

- ID
- Label
- Icon
- Tone
- Visibility
- Enabled state
- Disabled reason
- Confirmation requirement
- Reason requirement
- Handler
- Placement: direct or More Actions
- Priority order

Action visibility must depend on:

- Entity type
- Record status
- Record content
- Current user
- System role
- Meeting role
- Permission
- Assignment
- Invitation status
- Date and time
- Related-record state
- Workflow state

Do not only hide unauthorized buttons. Block unauthorized execution in the handler and route.

## Meeting action matrix

### Draft

Authorized organizer:

- Edit Meeting
- Continue Setup
- Submit for Approval
- Delete Draft

### Under Preparation

- Edit Meeting
- Continue Setup
- Submit for Approval

### Pending Approval

Authorized approver:

- Review Meeting
- Approve
- Request Revision
- Reject

### Approved

Authorized organizer:

- Publish Meeting
- Edit permitted fields
- Reschedule

### Published or Scheduled before entry window

Host:

- Start Meeting when allowed

Invited participant:

- Join Meeting disabled until the allowed join time
- Show the reason and meeting start time

### Scheduled within entry window

Host:

- Start Meeting

Invited participant:

- Join Meeting

### In Progress

- Join Meeting
- Rejoin Meeting when previously disconnected

Host:

- Pause Meeting
- Start Break
- Adjourn Meeting
- End Meeting

### Paused

Host:

- Resume Meeting

Participant:

- Rejoin Meeting

### On Break

Host:

- Resume After Break

Participant:

- Rejoin Meeting

### Adjourned

Host:

- Resume Adjourned Meeting
- Reschedule Meeting

### Awaiting Minutes

Secretary:

- Prepare Minutes

Others:

- View Meeting Record

### Completed

- View Meeting Record
- Create Next Meeting
- Post-Meeting Review

### Archived

- View Archive

Separate:

- Cancel Meeting
- Postpone Meeting

Do not use `Cancel/Postpone`.

## Agenda action matrix

### Draft

- Edit
- Submit
- Delete Draft

### Submitted or Under Review

Reviewer:

- Approve
- Request Revision
- Reject

### Revision Requested

Submitter:

- Edit
- Resubmit

### Approved

- Assign to Meeting
- Defer
- Withdraw where permitted

### Scheduled

- View Meeting
- Defer
- Withdraw where permitted

### Completed

- View Outcome
- Carry Forward when required

## Document action matrix

### Draft

- Edit Metadata
- Preview
- Submit for Review
- Delete Draft

### Pending Review

- Preview
- Approve
- Request Revision
- Reject

### Approved

- Publish
- Upload New Version

### Published

- Preview
- Download when permitted
- Print when permitted
- Upload New Version
- Archive

### Superseded or Archived

- Preview
- View Version History
- Restore when permitted

## Action-item matrix

### Assigned

Assignee:

- Acknowledge
- Start Work

Authorized manager:

- Edit
- Reassign
- Cancel

### In Progress

- Add Progress Update
- Mark Blocked
- Request Extension
- Submit Completion

### Blocked

- Add Update
- Resolve Blocker
- Request Extension

### Pending Review

Reviewer:

- Approve Completion
- Reject Completion
- Reopen

### Completed

- View Evidence
- Reopen when permitted

### Overdue

- Add Progress Update
- Request Extension
- Escalate
- Submit Completion

## Minutes action matrix

### Draft

- Edit
- Submit for Review

### Under Review

Reviewer:

- Add Comment
- Approve
- Request Revision
- Reject

### Approved

- Request Signature
- Download
- Print

### Signed

- Archive
- View Signature Record

### Archived

- View
- Request Formal Amendment

## Phase 6 acceptance

- Buttons change when record status or content changes.
- Host and participant meeting actions differ correctly.
- Disabled actions explain why they are unavailable.
- Every action persists.
- Invalid status transitions are blocked.
- Direct route access cannot bypass permissions.

# Phase 7 — Complete the Meeting lifecycle and Live Meeting

Keep Live Meeting inside the Meetings module.

Use:

`/meetings/:meetingId/live`

Open it from the dynamic Meeting drawer CTA.

## Meeting entry

Support:

- Start Meeting
- Join Meeting
- Rejoin Meeting
- Resume Meeting
- Resume After Break
- Resume Adjourned Meeting

## Persist live state

Persist:

- Actual start time
- Join times
- Leave times
- Pause
- Resume
- Breaks
- Adjournment
- End time
- Current agenda item
- Agenda item status
- Discussion notes
- Attendance
- Quorum events
- Motions
- Votes
- Decisions
- Resolutions
- Action items
- Live minutes
- Chat history where permitted

Critical state must survive refresh and temporary connection loss.

## Quorum

Remove hardcoded percentage calculations.

Use:

- Governance-body quorum rule
- Meeting-specific override
- Current eligible participants
- Required roles
- Attendance
- Alternates
- Recusals
- Voting quorum

Block voting and restricted decisions when quorum is lost.

## Voting

Create real Vote records.

Support:

- Open vote
- Cast vote
- Pending votes
- Abstain
- Secret ballot
- Threshold calculation
- Casting vote
- Close vote
- Cancel vote
- Reopen with permission and reason
- Result history

## Resolutions

Add Create Resolution inside Live Meeting.

Connect the resolution to:

- Meeting
- Agenda item
- Motion
- Vote
- Decision
- Responsible owner
- Action items
- Resolution Register
- Minutes

## Phase 7 acceptance

- Meeting entry is reachable from the drawer.
- All live state persists.
- Configured quorum rules are used.
- Voting produces real results.
- Resolutions can be recorded.
- Live records immediately update related pages.

# Phase 8 — Redesign the login page properly

Use the latest supplied login direction, but correct the current implementation.

The current desktop login is too tall because the left area stacks:

- A dark product-preview frame
- A second large illustrated slide

Do not stack two large visual panels.

Use one full-height split layout with no desktop page scrolling.

## Desktop structure

- Viewport height: 100vh
- Left visual area: approximately 62–65%
- Right sign-in area: approximately 35–38%
- No large outside margins
- No vertically stacked visual cards
- No duplicated product branding
- No Bangla illustration
- No old tax or office-management illustration

## Left visual area

Use one active product presentation frame.

The slider must change the content inside this single frame.

Each slide should contain:

- One realistic Board Meeting product preview
- One heading
- One short supporting sentence
- Compact progress controls

Do not render the product preview above the slider and another image inside the slider.

Use current Board Meeting UI previews:

### Slide 1

Heading:

`Prepare meetings with confidence`

Text:

`Create agendas, invite participants, and publish secure board packs from one workspace.`

Preview:

- Meeting dashboard
- Agenda readiness
- Board Pack status

### Slide 2

Heading:

`Run focused board meetings`

Text:

`Manage attendance, quorum, documents, voting, and decisions during the meeting.`

Preview:

- Virtual meeting
- Participant tiles
- Agenda panel
- Quorum state

### Slide 3

Heading:

`Track every decision`

Text:

`Turn resolutions into accountable actions and monitor progress after the meeting.`

Preview:

- Decisions
- Resolutions
- Action progress

Use the existing `LoginSlider` state and controls.

Replace the imported old Bangla images with current product-preview compositions or approved project screenshots.

## Right sign-in area

Show the brand once.

Do not show:

- Product title on the left and another full product title inside the logo component
- Truncated `Board Meeting So`

Use one clear brand row containing:

- NCC Bank logo
- `NCC Bank Board Meeting Solution`
- `Secure board and committee meeting management`

Form:

- Welcome back
- Sign in to manage meetings, agendas, board packs, decisions, and follow-up actions.
- User ID or email
- Password
- Remember me
- Forgot password?
- Sign in
- Signing in…
- Need help signing in? Contact the Board Secretariat or IT support.

Use existing form components and authentication behavior.

## Visual quality

Use theme tokens rather than hardcoded colors.

Improve:

- Alignment
- Balance
- White space
- Contrast
- Form width
- Brand hierarchy
- Product-preview proportions
- Shadow softness
- Border subtlety
- Focus states

Do not make the right panel feel like a small card floating inside a large empty area.

The form surface may use a subtle container, but it must feel integrated into the right panel.

## Mobile login

- Hide the large visual panel.
- Show one compact logo and product title.
- Use a full-width sign-in form.
- Preserve theme controls.
- Do not create a compressed desktop split layout.

## Phase 8 acceptance

- Desktop login fits within one viewport without vertical scrolling.
- Only one product-preview area is visible.
- No Bangla illustration remains.
- Brand information is not duplicated.
- Light and dark modes both look correct.
- Mobile uses a clean single-column layout.

# Phase 9 — Improve Home and page-level visual quality

Make Home role-aware and task-focused.

## Board or committee member Home

Prioritize:

- Next Meeting
- Join Meeting
- Board Pack review progress
- Pending vote or approval
- Conflict declaration
- Assigned action
- Minutes awaiting review

## Company Secretary Home

Prioritize:

- Meetings requiring preparation
- Readiness issues
- Pending agenda approvals
- Unpublished Board Packs
- RSVP gaps
- Quorum risks
- Minutes awaiting preparation
- Overdue actions

## Chairperson Home

Prioritize:

- Next meeting
- Readiness
- Quorum
- Pending approval
- Agenda overview
- Decisions requiring attention

Use the same reusable card system.

Do not create unique one-off cards for every role.

Improve all pages through:

- Clear heading hierarchy
- Consistent spacing
- Balanced KPI cards
- Short table headers
- Strong status hierarchy
- Useful empty states
- Contextual search
- Clean drawers
- Consistent action placement
- Theme-aware surfaces
- Accessible contrast

Do not use visual decoration that does not support understanding.

# Phase 10 — Complete UX writing

Audit every active string.

Use consistent terms:

- Governance Body as the broad term
- Board or Committee only when the body type is known
- Participant rather than Member when the user may be an invitee
- In Person rather than mixing Physical and In-Person
- Present Virtually rather than mixing Virtual and Online

## Contextual search

Use:

- Search meetings
- Search agenda items
- Search Board Packs
- Search documents
- Search questions
- Search decisions
- Search resolutions
- Search action items
- Search users
- Search audit events

Do not use only `Search...`.

## Entity-specific success messages

Use:

- Meeting created.
- Meeting updated.
- Agenda item submitted.
- Board Pack published.
- Document version uploaded.
- Question assigned.
- Decision recorded.
- Resolution approved.
- Action item assigned.
- Minutes draft saved.

Do not use:

- Record saved.
- Entry created.
- Operation successful.

## Entity-specific drawer and confirmation titles

Use:

- Approve Meeting
- Reject Agenda Item
- Publish Board Pack
- Cancel Meeting
- Delete Participant Group
- Archive Document

Do not use:

- Approve Record
- Reject Record
- Delete Record

## Errors

State what happened and what the user needs to do.

Example:

`The meeting cannot be started because the agenda has not been approved.`

Do not expose:

- Component names
- Registry keys
- Route IDs
- API endpoints
- Internal field names

## Phase 10 acceptance

- Navigation, page headings, table headers, drawers, buttons, messages, and empty states use consistent English.
- No generic record wording remains where the entity is known.
- No legacy “cases,” tax, return, circle, zone, TIN, or certificate wording remains.

# Phase 11 — Responsive, accessibility, and testing

## Desktop

- Tables use seven columns or fewer.
- Drawers use appropriate widths.
- Modal footer buttons stay in one row.
- Login uses one viewport.
- Live Meeting uses a focused full-screen workspace.

## Tablet

- Reduce visible table columns when required.
- Preserve one row action.
- Keep drawers usable.
- Keep modal actions reachable.

## Mobile

- Tables become cards.
- Cards open drawers.
- Popup forms use the approved mobile overlay or bottom-sheet behavior.
- Stepper forms use full screen.
- Drawer footer actions remain reachable.
- Live Meeting uses tabs or full-height internal panels.
- Login uses a single-column layout.

## Accessibility

Verify:

- Keyboard navigation
- Focus trapping
- Focus return
- Accessible button labels
- Status text beyond color
- Form error announcements
- Table headers
- Dialog titles
- Drawer titles
- Minimum tap targets
- Color contrast
- Reduced-motion support

## Required tests

Add or update tests for:

- English-only rendering
- No translation imports
- No unresolved keys
- Login desktop and mobile layouts
- Login has no desktop vertical overflow
- Every table has seven columns or fewer
- Every table has exactly one visible row action
- Card tap opens details
- Drawer schemas are independent from table schemas
- Dynamic Meeting Start and Join actions
- Role- and status-based action visibility
- Disabled-action reasons
- Create persistence
- Edit persistence
- Status transition persistence
- KPI recalculation
- Cross-page record synchronization
- Quorum calculation
- Vote persistence and result calculation
- Resolution creation
- Live Meeting persistence
- Permission enforcement

Run:

- TypeScript check
- Production build
- Lint
- Existing tests
- New lifecycle tests
- Route validation
- Dead-import check
- Search for remaining NBR and translation terms

# Final acceptance criteria

The task is complete only when:

- The interface looks polished and consistent.
- Existing reusable components are used instead of duplicated.
- Every entity uses one dynamic configuration.
- Every operational item derives from shared data.
- Create, Edit, and status actions persist.
- KPIs and filters update automatically.
- Buttons change dynamically based on record content, status, user role, permission, date, and relationships.
- Every desktop table has no more than seven columns.
- Every table has one visible View Details action.
- Every drawer has complete independent content.
- Every drawer has dynamic contextual footer actions.
- Start, Join, Rejoin, Resume, and Prepare Minutes appear correctly.
- Live Meeting state persists.
- Quorum and voting use real configuration and data.
- The login page is visually balanced, theme-aware, and contained within one desktop viewport.
- No duplicate login visuals or branding remain.
- No Bangla, translation, NBR, or tax-era content remains.
- Home is role-aware.
- Navigation and UX writing are consistent.
- Desktop, tablet, and mobile views work.
- Existing routes, APIs, themes, attachments, forms, and historical records remain intact.
- The project builds without errors.

# Golden Rules

- Do not break solved issues.
- Do not change unrelated files.
- Do not rename, move, or delete unrelated files.
- Do not reorganize the project architecture.
- Do not change existing API contracts.
- Do not remove working features.
- Keep the seven master navigation items unchanged.
- Do not create a parallel component system.
- Reuse the existing tables, cards, drawers, modals, forms, buttons, badges, uploads, previews, filters, tabs, and themes.
- Do not hardcode page behavior that can be resolved through entity configuration.
- Do not hardcode actions that depend on status, permission, role, date, or related records.
- Keep one visible action in every table.
- Keep contextual actions in drawer footers.
- Keep simple forms in popup modals.
- Keep multi-step forms in full-page modals.
- Keep all modal and drawer footer buttons in one row.
- Keep tables within five to seven columns.
- Move secondary information into drawers without deleting it.
- Do not use table columns as drawer schemas.
- Keep all data connected through shared registries.
- Preserve IDs, relationships, attachments, versions, and history during Edit.
- Use soft deletion for protected records.
- Enforce permissions in both UI and action logic.
- Remove the translation system completely; do not replace it with a stub.
- Remove all remaining NBR and tax-related workflows.
- Preserve desktop behavior.
- Preserve mobile behavior.
- Preserve dark mode and every existing theme.
- Test shared-component changes across every affected page.
- Keep the application functional after every phase.
```
