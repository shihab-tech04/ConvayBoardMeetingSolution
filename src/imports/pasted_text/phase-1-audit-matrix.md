Work directly inside the latest existing React and TypeScript project, **NCC Bank Board Meeting Solution**.

Deeply audit the actual source code and rendered UI, then complete every unfinished requirement from the previous 16 implementation phases.

Do not trust the existing `PROJECT_STATUS.md`, `MASTER_PROMPT_VALIDATION.md`, or other old status documents. They describe an earlier government/NBR project and contain inaccurate “production ready” claims.

Use the current source, active routes, registries, rendered pages, forms, drawers, tables, and workflows as the source of truth.

This is an audit, correction, completion, and regression-fix task. Do not rebuild the project.

# Verified current status

The latest project has made progress, but the previous 16 phases are not fully implemented.

## Implemented or mostly implemented

- Seven master navigation groups
- English strings in most active components
- Translation packages removed from runtime dependencies
- Shared Board Meeting registries for several core entities
- Feature-specific form definitions
- Meeting creation stepper
- Independent drawer schemas for many core entities
- One visible table action in most generated tables
- Role-aware Home overview foundation
- Live Meeting route and workspace
- Participant Groups internal page
- Production Vite build succeeds
- Existing Vitest suite passes

## Partially implemented or disconnected

- Dynamic action resolver exists but is not connected to `GeneratedTablePage`
- Meeting Start, Join, Rejoin, Resume, and Prepare Minutes rules exist in resolver files but are not used by the active Meeting tables and drawers
- Meeting drawers still use static `MEETING_FULL_ACTIONS`
- Many drawer actions update local table state instead of shared registries
- Most pages do not implement persistent Edit
- Some pages still fall back to table columns for drawer content
- Some tables still exceed seven total columns
- Meeting Overview KPIs use incorrect status logic
- Home Overview is role-aware, but My Tasks and My Calendar still use static or repurposed dashboard data
- Live Meeting contains several useful controls, but some state and actions remain incomplete
- English-only conversion removed runtime i18n imports but left compatibility fields, dead hooks, test mocks, and legacy visible content
- Login layout is still 63/37 with a light right panel and floating form card rather than the approved reference direction

## Not implemented correctly

- `Join Meeting` is missing from active Meeting table rows
- Dynamic Meeting row action is missing
- `useResolvedActions` is not used by active generated pages
- Action IDs are inconsistent: some code expects `join_live`, while the resolver emits `join`
- Current-user participant matching relies on exact names and fails for values such as `Rafiqul Islam` versus `Mr. Rafiqul Islam`
- `MEETING_FULL_ACTIONS` contains no Start or Join action
- `GeneratedTablePage` hardcodes Start Meeting but does not handle Join, Rejoin, or Resume actions
- The reusable entity-definition system from the previous prompt was not created
- Many administration and configuration pages still use static arrays from `modulePageUtils`
- Only a small number of pages persist Create operations to registries
- Only one generated page currently defines `onRowUpdate`
- External Participant Registration is still an overseas tax-registration workflow containing TIN, departure date, visa, and overseas-residency logic
- Visible permission labels still contain Return, Tax, Litigation, Appeal, Tribunal, Certificate, and PSR terminology
- Topbar search still says `Search reports, cases, members…`
- Strict TypeScript validation currently fails with multiple errors
- Existing tests validate sample configurations rather than all active page configurations

# Main objective

Complete the previous 16 phases properly and make every required Board Meeting capability visibly reachable in the UI.

The final system must have:

- Fully dynamic records
- Persistent Create, Edit, and status actions
- Dynamic table and drawer actions
- A visible Join Meeting entry point
- Complete details drawers
- A maximum of seven table columns
- Correct role and permission handling
- Correct Board Meeting writing
- No active NBR or tax workflows
- A polished login experience
- A connected before-, during-, and after-meeting lifecycle

# Phase 1 — Run a real audit before editing

Inspect every active route and page.

Create an internal implementation matrix containing:

- Route
- Page
- Entity
- Shared registry
- Table columns
- Drawer schema
- Create form
- Edit form
- Create persistence
- Edit persistence
- KPI source
- Filter source
- Mobile-card mapping
- Static actions
- Dynamic actions
- Status transitions
- Permissions
- Related records
- Remaining legacy content
- Missing visible entry points

Do not rely on sample tests or old documentation.

Verify every active page, including:

- Home
- Meetings
- Agenda & Documents
- Decisions & Follow-up
- Governance & Organization
- Archive & Reports
- Administration
- Login
- External Participant Registration
- Live Meeting

Do not stop after documenting issues. Continue through every phase below.

# Phase 2 — Fix all TypeScript and structural errors first

The Vite build currently succeeds because Vite does not perform a full TypeScript check.

Add or restore a proper project-level type-check command and fix every active-source TypeScript error.

Known errors include:

- Resolver action `tone` values inferred as generic strings instead of `ActionTone`
- `MeetingParticipant` uses `name`, while some code reads `person_name`
- `RSVPRecord` uses `participant_name`, while some code reads `person_name`
- `AvailabilityPollPage` imports a missing `AVAILABILITY_POLL_FORM_FIELDS`
- `SpecialRegistrationForm` references an undefined `t`
- `PrimaryButton` and `SecondaryButton` types do not accept props already used by Live Meeting forms
- `TableRow` does not support activity-history arrays
- Drawer memo return types do not consistently contain attachments
- Several registry records do not conform to `TableRow`
- Live Meeting references fields missing from Agenda records
- Several existing component prop types are inconsistent
- Active source still contains stale service type assumptions

Do not silence these errors using broad `any`, `@ts-ignore`, or disabled type checking.

Exclude non-source pasted reference files from TypeScript compilation rather than trying to compile imported prompt documents stored under `src/imports/pasted_text`.

Add a script such as:

`npm run typecheck`

The phase is complete only when:

- TypeScript check passes
- Production build passes
- Existing tests pass

# Phase 3 — Create one authoritative entity-definition system

The previous entity-definition requirement is not implemented.

Extend the existing page configuration into one reusable entity definition.

Each entity definition must include:

- Entity type
- Singular label
- Plural label
- Registry
- Record ID resolver
- Record title resolver
- Record subtitle resolver
- Status resolver
- Table columns
- Drawer sections
- Form fields
- Optional steps
- Create handler
- Update handler
- Status-transition handler
- Search fields
- Filters
- KPI selectors
- Mobile-card mapping
- Dynamic action resolver
- Permission resolver
- Related-record resolvers
- Empty-state copy
- Success messages
- Error messages

Connect `GeneratedTablePage` to this definition.

Do not continue using unrelated page-specific arrays for the same behavior.

Remove active reusable-component dependence on:

- `CIRCLES`
- `ZONES`
- `AY_OPTS`
- `CIRCLE_TIN_NAME`
- `TIN_NAME`
- PSR builders
- Return builders
- Taxpayer fallback keys
- Litigation fallback keys
- Certificate fallback keys

Internal old filenames may remain where renaming could break routes, but active shared logic must use Board Meeting entities.

# Phase 4 — Connect the existing dynamic action resolver

The project already contains:

- `resolveRecordActions`
- `useResolvedActions`
- Entity-specific action resolvers

These are currently disconnected from the generated pages.

Integrate them properly.

`GeneratedTablePage` must no longer render record actions only from static `cfg.drawerActions`.

For every selected row:

1. Resolve the entity from the page definition.
2. Call `useResolvedActions(entity)`.
3. Resolve actions from the current record, current user, permissions, current time, invitation status, meeting role, and related records.
4. Render direct actions and More Actions in the drawer footer.
5. Execute actions through one centralized handler.
6. Persist changes to the entity registry.
7. Re-resolve actions immediately after the record changes.

Remove duplicate meeting action logic.

There are currently two separate systems:

- `meetingCtaResolver.ts`
- `actions/resolvers/meetingActions.ts`

Keep one authoritative resolver or make one delegate to the other.

Do not maintain two conflicting Meeting status matrices.

Standardize action IDs:

- `view`
- `edit`
- `start`
- `join`
- `rejoin`
- `resume_meeting`
- `resume_break`
- `resume_adjourned`
- `prepare_minutes`
- `publish`
- `approve`
- `reject`
- `request_revision`
- `reschedule`
- `postpone`
- `cancel`
- `archive`
- `create_next_meeting`

Remove inconsistent IDs such as `join_live` unless they are safely redirected to `join`.

# Phase 5 — Add the missing dynamic Meeting table action

Every table must still contain only one visible row action.

For most entities, that action remains:

`View details`

For Meeting tables, the single action must be dynamic.

Apply this to:

- Meeting Overview
- All Meetings
- Meeting Calendar
- Relevant Home meeting tables

## Dynamic Meeting table action

### Draft or setup statuses

Show:

`View details`

### Pending Approval

For an authorized approver:

`Review Meeting`

For other users:

`View details`

### Approved but not published

For an authorized organizer:

`Publish Meeting`

Otherwise:

`View details`

### Published or Scheduled before the allowed entry window

For a host or authorized secretary:

`Start Meeting`

Display it disabled until the allowed start window, with a tooltip explaining:

`You can start this meeting 15 minutes before the scheduled time.`

For an invited participant:

`Join Meeting`

Display it disabled until the allowed join window, with a tooltip showing the scheduled date and time.

Do not hide the Join action completely.

### Published or Scheduled within the entry window

For a host:

`Start Meeting`

For an invited participant:

`Join Meeting`

### In Progress

For a participant who has not entered:

`Join Meeting`

For a participant who disconnected:

`Rejoin Meeting`

For a host:

`Continue Meeting`

### Paused

For a host:

`Resume Meeting`

For a participant:

`Rejoin Meeting`

### On Break

For a host:

`Resume After Break`

For a participant:

`Rejoin Meeting`

### Adjourned

For a host:

`Resume Adjourned Meeting`

For a participant:

`View details` until the meeting is resumed

### Awaiting Minutes

For the assigned secretary:

`Prepare Minutes`

For others:

`View Meeting Record`

### Completed

`View Meeting Record`

### Archived

`View Archive`

## Action appearance

The action column must contain one button only.

Use a contextual icon and label:

- View details
- Review
- Publish
- Start
- Join
- Rejoin
- Resume
- Prepare Minutes

Do not add a second View button beside the dynamic action.

Clicking Start, Join, Rejoin, Continue, or Resume must open:

`/meetings/:meetingId/live`

Prefer a new browser tab from the direct user action. Fall back to the current tab if blocked.

Clicking View or Review must open the Meeting details drawer.

# Phase 6 — Fix Meeting-role and invitation resolution

The current Join action can remain hidden because role resolution depends on exact name matching.

Fix identity resolution.

Match users using this order:

1. Participant ID
2. Employee ID
3. User ID
4. Email
5. Normalized full name

Normalize names by:

- Lowercasing
- Trimming spaces
- Removing repeated whitespace
- Removing honorifics such as Mr., Ms., Mrs., Dr.
- Ignoring punctuation

Do not grant access based only on a similar display name when stronger identifiers exist.

Determine Meeting roles from:

- Meeting participant records
- Governance membership
- Explicit meeting assignment
- Invitation record
- Chairperson assignment
- Secretary assignment
- Organizer assignment

The current mock user is:

- Name: Rafiqul Islam
- Designation: Meeting Secretary
- Employee ID: EMP-2024-1847

Ensure demo data links this user to at least one upcoming or ongoing meeting so Start or Join behavior can be verified visibly.

Do not automatically give every system administrator voting rights.

# Phase 7 — Make drawer actions fully dynamic

All contextual actions must appear in the details drawer footer.

Use:

`Close | More Actions | Secondary Action | Primary Action`

Rules:

- Close on the left
- Primary CTA on the right
- Maximum two or three direct actions
- Remaining actions in More Actions
- Destructive actions in More Actions
- One horizontal footer row
- No vertical stack of full-width actions
- Disabled actions show an explanation
- Permission checks run before execution

Meeting drawer actions must change dynamically based on the same resolver used by the Meeting table.

The Meeting drawer must visibly support:

- Edit Meeting
- Continue Setup
- Submit for Approval
- Approve
- Request Revision
- Reject
- Publish Meeting
- Start Meeting
- Join Meeting
- Rejoin Meeting
- Resume Meeting
- Resume After Break
- Resume Adjourned Meeting
- Manage Participants
- Send Invitations
- Manage RSVP
- Add External Invitee
- Assign Alternate
- Add Conflict Declaration
- Create Availability Poll
- Reschedule Meeting
- Postpone Meeting
- Cancel Meeting
- Review Quorum
- Resolve Readiness Issues
- Add Document
- Create Board Pack
- Publish Board Pack
- Prepare Minutes
- Create Next Meeting
- View Archive

Separate:

- Cancel Meeting
- Postpone Meeting

Do not use `Cancel/Postpone`.

# Phase 8 — Make every action persist to shared registries

`GeneratedTablePage` currently updates local rows for several actions.

Fix this.

Every action must update the authoritative registry.

This includes:

- Create
- Edit
- Delete Draft
- Soft Delete
- Approve
- Reject
- Request Revision
- Publish
- Archive
- Cancel
- Postpone
- Reschedule
- Start
- Pause
- Resume
- Join
- Rejoin
- End Meeting
- Complete Action
- Reopen
- Upload New Version
- Sign Minutes

Do not update local rows and hope the registry later synchronizes.

For registry-backed pages:

- Create directly in registry
- Update directly in registry
- Delete or soft-delete in registry
- Derive displayed rows from registry

Local row state may be used only for temporary UI state.

Every action must create an activity-history entry containing:

- Actor
- Actor role
- Action
- Previous status
- New status
- Timestamp
- Reason or remarks
- Related entity
- Related meeting

# Phase 9 — Finish persistent Create and Edit for every page

The current project has only a small number of explicit registry Create handlers and only one generated-page Update handler.

Audit every page with an Add/Create button.

Every editable entity must have:

- Registry-backed Create
- Registry-backed Edit
- Correct ID generation
- Correct default status
- Correct relationships
- Correct activity history
- Correct table update
- Correct drawer update
- Correct KPI update

Do not allow a Create button to add only a temporary local table row.

Do not allow Edit to disappear after navigation or refresh.

Create and Edit must reuse the same feature-specific form.

Edit must preserve:

- ID
- Created date
- Creator
- Relationships
- Attachments
- Versions
- Approval history
- Activity history

# Phase 10 — Complete independent drawer schemas

Many core drawers now have schemas, but the fallback still exists:

`cfg.drawerCols ?? cfg.cols`

Remove this behavior for active entities.

Every active entity must define a complete drawer schema.

Known pages still requiring complete independent schemas include:

- Follow-up Questions
- Meeting Performance analytics
- Participation analytics
- Governance analytics
- Decisions & Actions analytics
- Financial & Resource Impact
- Meeting Types
- Quorum Rules
- Voting Methods
- Statuses & Numbering Rules
- Meeting & Agenda Templates
- Minutes & Resolution Templates
- Document Templates
- Communication Templates
- Notification Rules
- Message Templates
- Delivery Logs
- Integrations

Do not shorten drawer content when table columns are reduced.

Every drawer must have:

- Entity-specific title
- Summary
- Grouped details
- Related records
- Attachments where relevant
- Status and workflow
- Activity history

Do not use `Record Details`.

# Phase 11 — Finish the table-column audit

Audit actual active configurations, not sample arrays in tests.

Several active pages still exceed the seven-column maximum.

Known failures include:

- Governance Bodies
- Meeting Performance
- Participation Analytics
- Governance Report
- Decisions & Actions
- Financial & Resource Impact
- Meeting & Agenda Templates
- Minutes & Resolution Templates
- Document Templates
- Communication Templates
- Quorum Rules
- Voting Methods
- Workflow History
- Some report configurations

Rules:

- Maximum seven total desktop columns, including Actions
- Read-only registers may have six columns and no Actions column when row click opens the drawer
- One action only for editable tables
- No unnecessary horizontal scrolling
- Move technical and secondary data into drawers

Update the automated test so it imports and checks all active page/entity definitions.

Do not test only sample configurations created inside the test file.

# Phase 12 — Complete dynamic data and KPI implementation

The project still contains static data generators in `modulePageUtils`, `modulePageConfigs`, and several page files.

Replace active static page data with shared registries.

Known static or partially static areas include:

- My Tasks
- My Calendar
- Meeting Templates
- Organization Structure
- Administration workflows
- Meeting Configuration
- Templates
- Notifications
- Integrations
- Security and Retention
- Several report pages

Keep demo data as registry seed data only.

Fix Meeting Overview KPI logic.

Current issues include:

- Upcoming Meetings counts Draft meetings
- Completed counts Approved meetings
- Readiness sometimes reuses quorum data
- Quorum values may be placeholders

Correct rules:

- Upcoming Meetings: future Published or Scheduled meetings
- Draft Meetings: Draft only
- Pending Approval: Pending Approval only
- In Progress: In Progress only
- Completed: Completed only
- Awaiting Minutes: Awaiting Minutes only
- Quorum: calculated from the selected quorum rule
- Readiness: calculated from the readiness checklist

Convert My Tasks into real assigned work:

- Approvals
- Reviews
- Action items
- Minutes reviews
- Signatures
- Conflict declarations
- Questions requiring response

Convert My Calendar into real meeting and deadline data:

- Meetings
- RSVP deadlines
- Board Pack publication
- Document review deadlines
- Action due dates
- Minutes-review deadlines

# Phase 13 — Make all before-meeting requirements visibly reachable

The source contains Availability Poll, RSVP, and Conflict Declaration pages, but they are not consistently reachable from active UI.

Do not add new master navigation items.

Expose them through Meeting drawer sections and actions.

Meeting drawer must visibly include:

## Participants and RSVP

- Manage Participants
- Send Invitations
- RSVP status
- Manage RSVP
- Add External Invitee
- Assign Alternate
- Conflict Declaration status
- Add Conflict Declaration

## Schedule

- Create Availability Poll
- Proposed schedule options
- Reschedule Meeting

## Agenda

- Agenda sections
- Agenda items
- Approval status
- Presenter
- Duration
- Voting requirement

## Documents and Board Pack

- Documents
- Versions
- Board Pack
- Review progress
- Publication status

## Readiness and Quorum

- Readiness checklist
- Quorum rule
- Confirmed eligible voters
- Missing roles
- Warnings

All Create and Manage actions must open working modals or drawers.

Do not leave these capabilities available only through hidden source files.

# Phase 14 — Complete Live Meeting behavior

Keep the existing Live Meeting workspace and route.

Do not rebuild it.

Persist:

- Meeting start
- Join
- Leave
- Rejoin
- Pause
- Resume
- Break
- Adjournment
- End
- Attendance
- Current agenda item
- Agenda progress
- Discussion notes
- Quorum events
- Motions
- Votes
- Decisions
- Resolutions
- Actions
- Live minutes

Use configured quorum rules rather than a default hardcoded percentage.

Complete voting:

- Create vote
- Open vote
- Cast vote
- Abstain
- Pending votes
- Secret ballot
- Threshold calculation
- Casting vote
- Close
- Cancel
- Reopen with permission and reason
- Persist final result

Add and persist Create Resolution during the meeting.

Ensure created decisions, resolutions, and actions immediately appear in:

- Meeting drawer
- Decisions
- Resolutions
- Action Items
- Registers
- Minutes
- Assigned user’s My Tasks

# Phase 15 — Replace remaining tax and NBR workflows

Internal Participant Groups is now partly converted, but External Participant Registration is still a tax workflow.

Replace the public registration form completely.

Remove:

- TIN
- Taxpayer
- Overseas taxpayer
- Departure date
- Visa or residence evidence
- Departure seal
- Tax documents
- NRB references
- Taxpayer section IDs
- Tax-registration validation

Use:

- Invitation code
- Full name
- NID or passport
- Organization
- Designation
- Email
- Phone
- Country
- Related meeting
- Participant type
- Allowed agenda items
- Required meeting documents
- Consent
- Declaration

Update its service, repository, internal review page, samples, tests, and status writing.

Remove visible legacy permission labels from `permissions.ts`.

Replace them with the seven current modules:

- Home
- Meetings
- Agenda & Documents
- Decisions & Follow-up
- Governance & Organization
- Archive & Reports
- Administration

Keep old endpoint IDs internally only when API compatibility requires them. They must not appear as visible labels.

Change Topbar search from:

`Search reports, cases, members…`

to a Board Meeting label such as:

`Search meetings, documents, decisions, and people`

# Phase 16 — Finish the English-only cleanup

Runtime translation dependencies are removed, but cleanup is incomplete.

Remove safely:

- Dead `useLanguage` hook
- Unused translation compatibility properties
- Dead `titleKey`
- Dead `descKey`
- Dead `headerKey`
- Dead `labelKey`
- Old translation mocks in tests
- Translation instructions stored as active source
- Unused locale-related utilities

Do not remove keys that are still required until all callers are migrated.

Keep financial currency values such as BDT/৳ where they are legitimate business data. Do not treat the Bangladesh currency symbol as interface localization.

# Phase 17 — Correct modal and drawer footer behavior

Use exactly two modal types:

## Popup modal

For non-stepper forms.

## Full-page modal

For real multi-step workflows.

Every modal must contain:

- Header
- Scrollable body
- Footer

All footer actions must remain in one horizontal row.

Do not embed form actions in the scrollable body.

Fix button component typings so existing `form`, `type`, `style`, `disabled`, and accessibility props work safely.

Drawer footer actions must also remain in one horizontal row.

# Phase 18 — Complete the approved login design

The current project still uses:

- 63/37 ratio
- Light right panel
- Floating bordered form card
- Duplicated branding
- Large primary-color slider card

Change it to the approved reference direction.

Desktop:

- 60/40 ratio
- 55/45 on medium desktop
- One viewport
- No vertical scrolling
- Flat theme-tinted left workspace
- One centered dark product-preview frame
- Dark theme-aware authentication panel
- No floating white card
- No duplicated logo or title
- One compact brand area
- Existing three Board Meeting slides
- Theme colors used for accents and focus states

Mobile:

- Hide visual panel
- Full-width dark sign-in panel
- Compact brand
- Full-width primary action

Preserve authentication, Remember Me, Forgot Password, Enter submission, loading, and accessibility.

# Phase 19 — Complete role-aware Home pages

Keep the existing role-aware Overview foundation.

Replace static My Tasks and My Calendar implementations.

## My Tasks

Use actual assigned data:

- Pending approvals
- Document reviews
- Action items
- Minutes reviews
- Signatures
- Conflict declarations
- Questions requiring response

## My Calendar

Use actual:

- Meetings
- RSVP deadlines
- Review deadlines
- Action deadlines
- Minutes deadlines

Make the pages respond to the signed-in user and role.

Do not use static PSR-style generated records.

# Phase 20 — Complete UX writing

Audit every visible string.

Fix:

- Generic record wording
- Raw technical statuses
- Incorrect composite table headers
- Inconsistent page titles
- Legacy cases wording
- Old tax terminology
- Generic success messages
- Generic errors
- Generic drawer titles
- Incorrect button labels

Use entity-specific writing.

Examples:

- Meeting Details
- Approve Meeting
- Reject Agenda Item
- Publish Board Pack
- Join Meeting
- Rejoin Meeting
- Prepare Minutes
- Meeting updated.
- Vote opened.
- Resolution recorded.
- Action item assigned.

Do not use:

- Record Details
- Approve Record
- Reject Record
- Entry created successfully
- Operation successful
- Cancel/Postpone

# Phase 21 — Replace superficial tests with real active-configuration tests

The current tests pass, but several validate hardcoded sample data rather than the application’s active configuration.

Add tests that inspect the real project.

Required tests:

- Every active table has seven total columns or fewer
- Every active table has one visible row action
- Meeting table shows Join Meeting for an invited participant
- Meeting table shows Start Meeting for a host
- Meeting table shows disabled Join with a reason outside the entry window
- Meeting table shows Join for an ongoing meeting
- Meeting table shows Rejoin after disconnection
- Meeting drawer uses the same resolved CTA
- Identity matching works with honorific differences
- Dynamic actions persist
- Every editable generated entity has a registry Update handler
- Every Create button persists to a registry
- Every active page has an independent drawer schema
- No visible tax or NBR terms remain
- External Participant Registration contains no TIN or departure workflow
- My Tasks uses assigned registry data
- My Calendar uses meeting and deadline data
- Login uses 60/40 or 55/45 and has no desktop overflow
- Live Meeting state survives refresh
- Configured quorum rules are applied
- Voting persists and calculates results
- TypeScript check passes

# Final acceptance criteria

The work is complete only when:

- The actual source has been audited, not only documentation.
- TypeScript check passes.
- Production build passes.
- All tests pass.
- The dynamic action resolver is connected to active pages.
- Meeting table rows show one dynamic action.
- Join Meeting is visible for invited upcoming or ongoing meetings.
- Join is disabled with an explanation before the allowed entry window.
- Join, Rejoin, Start, Continue, and Resume open the Live Meeting route correctly.
- Meeting drawers show the same correct primary CTA.
- Current-user identity and invitation matching work reliably.
- Create and Edit persist across all active pages.
- Status actions update shared registries.
- Every active table has seven columns or fewer.
- Every active entity has a complete independent drawer.
- All before-meeting capabilities are visibly reachable.
- Live Meeting actions persist.
- Home, My Tasks, and My Calendar use real registry data.
- External Participant Registration is no longer a tax workflow.
- Visible permissions use Board Meeting terminology.
- No active translation compatibility code remains.
- Login follows the approved visual direction.
- No unrelated route, API, theme, upload, form, drawer, or solved feature is broken.

# Golden Rules

- Do not break solved issues.
- Do not change unrelated files.
- Do not reorganize the project structure.
- Do not rename or move unrelated files.
- Do not change existing API contracts.
- Keep the seven master navigation groups unchanged.
- Reuse existing tables, cards, drawers, modals, forms, buttons, badges, uploads, previews, filters, tabs, registries, and themes.
- Do not create a parallel component system.
- Use one authoritative entity definition.
- Use one authoritative dynamic action resolver.
- Keep one visible action in each table.
- Make the Meeting table action dynamic.
- Keep full contextual actions in drawer footers.
- Keep simple forms in popup modals.
- Keep stepper forms in full-page modals.
- Keep footer actions in one row.
- Keep tables within five to seven columns.
- Do not use table columns as drawer schemas.
- Persist all operational changes through shared registries.
- Preserve IDs, relationships, attachments, versions, and history.
- Use soft deletion for protected records.
- Enforce permissions in both UI and action handlers.
- Make every required feature visibly reachable.
- Remove remaining NBR and tax workflows.
- Preserve desktop, tablet, mobile, dark mode, and all theme behavior.
- Fix root causes instead of hiding failures or weakening tests.