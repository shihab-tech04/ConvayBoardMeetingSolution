Work directly inside the existing **NCC Bank Board Meeting Solution** React and TypeScript project.

The project has already been transformed from an NBR Office Management UI into a Board Meeting Solution, but the latest audit found several incomplete, missing, or incorrectly connected UX requirements.

Your task is to complete those missing requirements without rebuilding the project, changing its structure, or breaking any working feature.

This is a correction and completion task. Do not create a new project or redesign unrelated areas.

# Main goals

Complete these areas:

1. Fix Meeting details actions, including Start, Join, Resume, and Rejoin Meeting.
2. Reduce every active table to a maximum of 5–7 essential columns.
3. Give every page a complete feature-specific details drawer.
4. Move all contextual actions from tables into drawer footers.
5. Finish the English-only conversion and remove unresolved translation keys.
6. Complete the approved split-screen login redesign.
7. Fix incomplete Live Meeting actions, voting, resolutions, attendance, quorum, and persistence.
8. Replace remaining NBR and tax-related workflows.
9. Correct inconsistent navigation, page, table, drawer, button, status, empty-state, success, and error writing.
10. Preserve all working APIs, registries, routes, responsive behavior, themes, uploads, forms, tables, drawers, and permissions.

# 1. Protect the existing project

Before changing anything, inspect:

* Existing routes
* Navigation configuration
* Page configurations
* Shared registries
* `GeneratedTablePage`
* `ResponsiveTable`
* `UnifiedMobileCard`
* `DynamicDetailsDrawer`
* `AppModal`
* `EntryForm`
* Login components
* Live Meeting page
* Meeting status logic
* Permission logic
* Existing Create/Edit flows
* Existing table column configurations
* Existing drawer action configurations
* Remaining translation and legacy NBR code

Do not:

* Rename, move, or delete unrelated files.
* Change the project folder structure.
* Replace the router.
* Replace Redux or the current registry pattern.
* Change existing API contracts or service endpoints.
* Replace the design system.
* Introduce another UI library.
* Remove working themes.
* Remove working upload, preview, print, export, search, filtering, sorting, pagination, drawer, modal, or mobile-card behavior.
* Recreate working components in parallel.

Only remove translation-related files, dependencies, providers, and hooks after all active references are safely replaced.

# 2. Preserve the approved navigation structure

Keep exactly these seven master navigation items:

```text
1. Home
2. Meetings
3. Agenda & Documents
4. Decisions & Follow-up
5. Governance & Organization
6. Archive & Reports
7. Administration
```

Use these child labels:

## Home

* Overview
* My Tasks
* My Calendar

## Meetings

* Overview
* All Meetings
* Calendar
* Templates

## Agenda & Documents

* Agenda Management
* Board Packs
* Document Library
* Questions & Responses
* My Notes

## Decisions & Follow-up

* Decisions
* Resolutions
* Action Items
* Matters Arising
* Follow-up Questions

## Governance & Organization

* Governance Bodies
* Organization Structure
* Users & Assignments
* Designations & Positions
* Participant Groups

## Archive & Reports

* Meeting Archive
* Minutes
* Registers
* Reports & Analytics
* Audit Trail

## Administration

* Roles & Permissions
* Workflows
* Meeting Configuration
* Templates
* Notifications
* Integrations
* Security & Retention

Inside Meeting Configuration, use:

* Meeting Types
* Quorum Rules
* Voting Methods
* Statuses & Numbering Rules

Update:

* Visible navigation labels
* Breadcrumbs
* Page headings
* Browser titles
* Help content
* Empty states
* Tooltips

Do not rename route IDs or component files only to match the visible wording.

# 3. Fix Meeting Start and Join actions

The current Meeting drawer does not correctly expose Start or Join Meeting.

Create one centralized Meeting CTA resolver based on:

* Meeting status
* Current user
* Current user’s meeting role
* Invitation status
* Permission
* Meeting start time
* Meeting access rules
* Quorum and readiness restrictions

Do not hardcode Start Meeting directly into every page.

## Required action logic

### Draft

Chairperson, secretary, or authorized organizer:

* Edit Meeting
* Submit for Approval

Other participants:

* No entry action

### Under Preparation

Authorized organizer:

* Edit Meeting
* Continue Setup
* Submit for Approval

### Pending Approval

Authorized approver:

* Review Meeting
* Approve
* Request Revision
* Reject

### Approved

Authorized organizer:

* Publish Meeting

### Published or Scheduled before allowed join time

Chairperson or secretary:

* Start Meeting

Invited participant:

* Show `Join Meeting` only when early-entry rules allow it.
* Otherwise show the meeting start time and disabled access explanation.

### In Progress

All invited and permitted participants:

* Join Meeting

Previously disconnected participant:

* Rejoin Meeting

### Paused

Chairperson or secretary:

* Resume Meeting

Participant:

* Rejoin Meeting

### On Break

Chairperson or secretary:

* Resume After Break

Participant:

* Rejoin Meeting

### Adjourned

Authorized organizer:

* Resume Adjourned Meeting
* Reschedule Meeting

Participant:

* Show resumed date and time.
* Join only when the meeting is resumed.

### Awaiting Minutes

Authorized secretary:

* Prepare Minutes

Others:

* View Meeting Record

### Completed

* View Meeting Record

### Archived

* View Archive

## Meeting drawer footer

All Meeting actions must appear in the drawer footer.

Recommended visible actions:

* Close
* Edit
* More Actions
* Primary contextual CTA

The primary CTA must appear on the far right.

Examples:

```text
Close | More Actions | Edit                         Start Meeting
Close | More Actions                                Join Meeting
Close | More Actions                                Rejoin Meeting
Close | More Actions                             Prepare Minutes
```

Use the drawer’s `More Actions` menu for:

* Duplicate
* Reschedule
* Postpone
* Cancel
* Publish
* Create Board Pack
* Archive

Do not show Start, Join, Edit, Publish, Approve, Reject, Cancel, or other contextual actions directly in Meeting tables.

# 4. Keep only one action in every table

Every desktop table row must contain exactly one action button.

Use:

* Eye or details icon
* Tooltip: `View details`
* Accessible label: `View details for [record name]`

Clicking the icon must open the details drawer.

The table row may also open the drawer.

Remove all other table actions:

* Edit
* Start
* Join
* Approve
* Reject
* Request Revision
* Publish
* Duplicate
* Reschedule
* Postpone
* Cancel
* Archive
* Delete
* Download
* Print

Do not use a row-level three-dot menu for these actions.

## Mobile cards

* Tapping the card opens the details drawer.
* Do not show a separate View Details button.
* Do not show Edit, Approve, Start, Join, Delete, or other contextual actions in the card.
* Keep status and the most important metadata visible.

# 5. Reduce all tables to 5–7 columns maximum

Audit every active table.

Rules:

* Maximum seven columns, including Actions.
* Use five or six columns where seven are unnecessary.
* Keep only information needed for scanning, comparison, status, and immediate identification.
* Move all other information into the details drawer.
* Do not delete the underlying data.
* Avoid horizontal scrolling on normal desktop widths.
* Use stacked cells only when two closely related values belong together.
* Stacked-cell labels must accurately describe what is rendered.

Do not use composite labels such as `Reference & Meeting` if the cell contains only a reference.

# 6. Required table structures

## Home

### Overview activity

* Activity
* Related Meeting
* Type
* Due Date
* Status
* Last Updated

### My Tasks

* Task
* Type
* Related Meeting
* Due Date
* Priority
* Status
* Actions

### My Calendar

* Event
* Type
* Date & Time
* Mode or Location
* Governance Body
* Status

## Meetings

### Overview

* Meeting
* Governance Body
* Date & Time
* Readiness
* Quorum
* Status
* Actions

### All Meetings

* Meeting
* Governance Body & Type
* Date & Time
* Mode
* Participants
* Status
* Actions

### Calendar

* Meeting
* Governance Body
* Date & Time
* Mode & Venue
* Status
* Actions

### Templates

* Template
* Meeting Type
* Governance Body
* Default Duration
* Last Used
* Status
* Actions

## Agenda & Documents

### Agenda Management

* Agenda Item
* Requested Meeting
* Submitted By & Unit
* Priority
* Submission Date
* Status
* Actions

### Board Packs

* Board Pack & Meeting
* Version
* Meeting Date
* Documents
* Review Progress
* Status
* Actions

### Document Library

* Document
* Type
* Meeting & Agenda
* Owner
* Version
* Status
* Actions

### Questions & Responses

* Question
* Meeting & Agenda
* Submitted By
* Assigned To
* Due Date
* Status
* Actions

### My Notes

* Note
* Meeting & Agenda
* Document & Page
* Last Updated
* Privacy
* Actions

## Decisions & Follow-up

### Decisions

* Decision
* Meeting & Agenda
* Owner
* Effective Date
* Implementation Status
* Actions

### Resolutions

* Resolution
* Meeting
* Voting Result
* Effective Date
* Owner
* Status
* Actions

### Action Items

* Action
* Source Meeting
* Assignee & Unit
* Due Date
* Progress
* Status
* Actions

### Matters Arising

* Matter
* Source Meeting & Agenda
* Owner
* Due Date
* Target Meeting
* Status
* Actions

### Follow-up Questions

* Question
* Source Meeting
* Assigned To
* Response Deadline
* Response Status
* Actions

## Governance & Organization

### Governance Bodies

* Governance Body
* Type
* Chairperson & Secretary
* Members
* Quorum Rule
* Status
* Actions

### Organization Structure

* Unit
* Type
* Parent Unit
* Head
* Active Users
* Status
* Actions

### Users & Assignments

* Employee & Name
* Designation & Position
* Organization Unit
* Reports To
* System Role
* Status
* Actions

### Designations

* Designation & Code
* Grade & Rank
* Management Level
* Active Users
* Status
* Actions

### Positions

* Position
* Type
* Organization Unit
* Current Holder
* Vacancy Status
* Actions

### Participant Groups

* Group
* Type
* Rule Summary
* Members
* Last Used
* Status
* Actions

## Archive & Reports

### Meeting Archive

* Meeting
* Governance Body
* Meeting Date
* Final Minutes
* Final Board Pack
* Confidentiality
* Status

No Actions column is required if the entire row opens the read-only drawer.

### Minutes

* Minutes
* Meeting
* Version
* Review Stage
* Last Updated
* Status
* Actions

### Resolution Register

* Resolution
* Meeting Date
* Voting Result
* Owner
* Implementation Status
* Status

### Decision Register

* Decision
* Meeting
* Owner
* Effective Date
* Implementation Status
* Status

### Action Register

* Action
* Meeting
* Assignee
* Due Date
* Progress
* Status

### Attendance Register

* Participant
* Meeting
* Attendance Mode
* Join & Leave
* Duration
* Status

### Conflict Register

* Member
* Meeting & Agenda
* Conflict Type
* Recusal
* Review Status
* Declaration Date

### Reports & Analytics

* Report
* Category
* Date Range
* Last Generated
* Schedule
* Status
* Actions

### Audit Trail

* Date & Time
* User
* Action
* Module & Record
* Risk Level
* Session or Device

## Administration

### Roles

* Role
* Type
* Assigned Users
* Permissions
* Data Scope
* Status
* Actions

### Permissions

* Permission
* Module
* Action
* Access Scope
* Assigned Roles
* Status
* Actions

Move endpoint, HTTP method, service, and internal identifiers into the drawer.

### Workflow Definitions

* Workflow
* Type
* Applies To
* Stages
* Owner
* Status
* Actions

### Approval Rules

* Rule
* Applies To
* Required Approvers
* Minimum Approvals
* Deadline
* Status
* Actions

### Review & Revision Rules

* Rule
* Applies To
* Reviewers
* Deadline
* Revision Limit
* Status
* Actions

### Workflow History

* Workflow
* Entity
* Current Stage
* Started By
* Last Updated
* Status
* Actions

### Meeting Types

* Meeting Type
* Category
* Governance Body
* Quorum & Voting
* Workflow
* Status
* Actions

### Quorum Rules

* Rule
* Governance Body
* Requirement
* Required Roles
* Voting Quorum
* Status
* Actions

### Voting Methods

* Method
* Type
* Threshold
* Ballot
* Tie Rule
* Status
* Actions

### Statuses & Numbering Rules

* Entity
* Status or Pattern
* Type
* Transition or Sequence
* Allowed Roles
* Status
* Actions

### Templates

* Template
* Type
* Used By
* Version
* Last Updated
* Status
* Actions

### Notification Rules

* Rule
* Trigger
* Recipients
* Channel
* Timing
* Status
* Actions

### Message Templates

* Template
* Channel
* Trigger & Audience
* Subject
* Status
* Actions

### Delivery Logs

* Notification
* Recipient
* Channel
* Sent At
* Delivery Status
* Failure Reason

### Integrations

* Integration
* Type
* Provider
* Last Sync
* Connection
* Authentication
* Actions

### Security Policies

* Policy
* Type
* Applies To
* Enforcement
* Review Date
* Status
* Actions

### Retention & Legal Holds

* Policy or Hold
* Record Type or Scope
* Retention or Start Date
* Disposal or Hold Rule
* Review Date
* Status
* Actions

# 7. Create dedicated drawer schemas for every page

Do not let the drawer use `cfg.cols` as its default content source.

Every entity must define a separate drawer schema.

The table and drawer must be independent.

## Common drawer structure

* Summary
* Primary information
* Related records
* Dates and schedule
* Ownership and participants
* Access and confidentiality
* Supporting documents
* Status and workflow
* Comments and remarks
* Activity history

## Meeting drawer

Use these sections:

### Meeting Summary

* Meeting reference
* Meeting title
* Type
* Status
* Priority
* Confidentiality
* Purpose
* Description

### Schedule and Access

* Date
* Start time
* End time
* Duration
* Time zone
* Mode
* Venue
* Virtual platform
* Meeting link
* Dial-in information

### Governance and Scope

* Governance body
* Chairperson
* Secretary
* Organizer
* Owner
* Divisions
* Departments
* Regions
* Branches

### Participants and RSVP

* Participant list
* Meeting role
* Attendance requirement
* Voting eligibility
* RSVP status
* Alternate or delegate
* Access level
* Conflict-declaration status

### Agenda

* Sections
* Agenda items
* Presenters
* Duration
* Voting requirement
* Item status

### Documents and Board Pack

* Documents
* Versions
* Access
* Board Pack
* Review progress
* Publication status

### Readiness and Quorum

* Readiness checklist
* Quorum rule
* Expected quorum
* Confirmed voters
* Missing required roles
* Warnings

### Notifications

* Invitation status
* RSVP deadline
* Review deadline
* Reminder schedule
* Delivery status

### Meeting Outcomes

* Motions
* Votes
* Decisions
* Resolutions
* Action Items
* Minutes

### Activity

* Creation history
* Updates
* Approval history
* Status transitions
* Access events

## Document drawer

* Document metadata
* Meeting and agenda relationship
* Access and confidentiality
* File and preview
* Versions
* Review status
* Acknowledgements
* Activity

## User drawer

* Profile
* Employment information
* Designation
* Position
* Organization assignments
* Reporting line
* Governance memberships
* System role and access
* Meeting history
* Activity

## Governance Body drawer

* Overview
* Charter
* Chairperson and secretary
* Members
* Voting rights
* Quorum rule
* Meeting rule
* Term history
* Activity

## Action Item drawer

* Summary
* Source meeting and decision
* Owner and unit
* Due date and priority
* Progress
* Dependencies
* Evidence
* Extension requests
* Completion review
* Status history
* Activity

# 8. Put all contextual actions in drawer footers

Render every permitted `drawerAction`.

Do not only render Edit.

## Footer behavior

* Keep actions in one horizontal row.
* Keep Close on the left.
* Keep the primary action on the right.
* Show two or three important actions directly.
* Put lower-priority actions inside a `More actions` menu.
* Use the existing confirmation modal for destructive and status-changing actions.
* Enforce permissions in action logic, not only visually.

## Examples

### Agenda

Direct actions:

* Close
* Edit
* Submit or Approve

More Actions:

* Request Revision
* Reject
* Assign to Meeting
* Defer
* Withdraw

### Action Item

Direct actions:

* Close
* Edit
* Add Progress Update

More Actions:

* Request Extension
* Submit Completion
* Reassign
* Cancel

### Document

Direct actions:

* Close
* Preview
* Edit Metadata

More Actions:

* Upload New Version
* Download
* Print
* Archive

# 9. Fix modal behavior

Use exactly two modal types.

## Popup modal

Use for forms without a stepper:

* Question
* Note
* Decision
* Resolution
* Action Item
* Motion
* Vote
* Progress Update
* Extension Request
* Completion Submission
* Designation
* Position
* Governance Body
* Organization Unit
* Role
* Permission
* Quorum Rule
* Voting Method
* Notification Rule
* Message Template
* Status actions

## Full-page modal

Use only when the form has multiple approved steps:

* Create or Edit Meeting
* Complex Workflow
* Complex Board Pack
* Structured Minutes workflow

Logic:

```text
multiple form steps → full-page modal
no form steps → popup modal
```

Remove incorrect full-page modal settings from:

* Add Motion
* Create Vote
* Record Decision
* Create Action Item
* Save Draft Minutes
* Participant Groups, unless it is redesigned as a real stepper

## Modal structure

Every modal must have:

* Header
* Scrollable body
* Footer

Header:

* Contextual title
* Optional short description
* Close button
* Divider

Body:

* Only scrollable region
* No embedded footer

Footer:

* One horizontal row
* Cancel or Back on the left
* Primary action on the right
* No vertical button stacking
* Use horizontal overflow or compact buttons on small screens if required

Remove `flex-wrap: wrap` when it causes multiple button rows.

# 10. Finish the Live Meeting feature

Keep the Live Meeting route:

```text
/meetings/:meetingId/live
```

Open it from the Meeting drawer’s contextual CTA.

## Required persistence

Persist:

* Meeting start time
* Pause time
* Resume time
* Break time
* Adjournment
* Meeting end time
* Participant attendance
* Agenda status
* Current agenda item
* Discussion notes
* Motions
* Votes
* Decisions
* Resolutions
* Actions
* Live minutes
* Quorum events

Do not store critical meeting state only in local component state.

## Use configured quorum rules

Remove hardcoded `60%` quorum logic.

Read the selected rule from:

* Governance body
* Meeting configuration
* Meeting-specific override

Calculate from:

* Eligible members
* Current attendance
* Required roles
* Alternate members
* Recusals
* Voting quorum

When quorum is lost:

* Save a Quorum Event.
* Warn the chairperson and secretary.
* Block restricted voting and decisions.
* Allow pause or adjournment.
* Restore controls when quorum returns.

## Complete voting

The Create Vote form must create a real Vote record.

Support:

* Voting question
* Voting options
* Eligible voters
* Recused voters
* Threshold
* Ballot type
* Voting duration
* Open vote
* Cast vote
* Pending votes
* Close vote
* Reopen with permission and reason
* Cancel vote
* Abstention
* Secret ballot
* Casting vote
* Result calculation
* Audit history

Secret votes must not expose individual votes to unauthorized users.

## Add Create Resolution

Add a working Create Resolution action to the Live Meeting panel.

Connect it to:

* Meeting
* Agenda item
* Motion
* Vote
* Resolution Register
* Decisions
* Action Items

## Complete agenda control

Support:

* Start discussion
* Pause discussion
* Resume discussion
* Complete
* Skip
* Defer
* Withdraw
* Reopen
* Reorder remaining items
* Add emergency item
* Extend time
* Change presenter

Persist all changes.

## Complete attendance

Use the Attendance registry.

Record:

* Attendance mode
* Join time
* Leave time
* Rejoin time
* Late arrival
* Early departure
* Temporary absence
* Alternate
* Recusal
* Correction
* Correction reason

## Role-based controls

Enforce separate permissions for:

* Chairperson
* Secretary
* Board member
* Presenter
* Observer
* Guest
* Administrator

Technical administrators must not receive governance voting rights automatically.

# 11. Expose missing contextual features

These features exist in source but are not reachable:

* Availability Polls
* RSVP and Invitations
* Conflict Declarations

Do not add new master navigation items.

Add them contextually inside the Meeting drawer.

## Meeting drawer contextual actions

### Participants section

* Manage Participants
* Send Invitations
* Manage RSVP
* Create Availability Poll
* Add Conflict Declaration
* Assign Alternate
* Add External Invitee

### Schedule section

* Reschedule
* Create Availability Poll

### Readiness section

* Review Quorum
* Resolve Readiness Issues

# 12. Replace Participant Groups legacy workflow

The Participant Groups page must not reuse the old tax Special Registration experience.

Remove visible and functional dependencies on:

* TIN
* Taxpayer
* NID-based taxpayer registration
* Overseas taxpayer
* Departure date
* Visa or residence documents
* Departure seal
* Tax documents
* NRB reference formats

Create a proper Participant Group feature.

## Participant Group form

* Group name
* Group type
* Description
* Static or dynamic membership
* Governance-body rule
* Organization-unit rule
* Designation rule
* Position rule
* Region rule
* Branch rule
* Manual members
* Excluded members
* Default meeting role
* Attendance requirement
* Voting eligibility
* Document access
* Status

## External Participant Registration

Use:

* Invitation code
* Full name
* NID or passport
* Organization
* Designation
* Email
* Phone
* Country
* Meeting
* Participant type
* Allowed agenda items
* Required documents
* Consent
* Declaration

# 13. Finish the English-only conversion

Remove the localization system completely.

Do not only use an i18n stub.

Remove:

* `i18next`
* `react-i18next`
* Language detector
* Translation provider
* Locale context
* Language hooks
* Language option components
* Language state
* Language local storage
* Language cookies
* Locale validation scripts
* Bangla resources
* Translation calls
* Translation fallback logic

Replace all active labels with final English text.

No unresolved keys may appear, including:

* `appTitle`
* `appSubtitle`
* `title`
* `subtitle`
* `userId`
* `password`
* `signIn`
* `userManual`

Keep the application left-to-right.

A business field named Meeting Language may remain only when it represents the meeting’s spoken language.

# 14. Complete the login redesign

Replace the current centered login design with the approved split-screen layout.

## Desktop

* Full viewport height
* Left visual area: approximately 62–65%
* Right sign-in area: approximately 35–38%
* No floating central white card
* No large outside margins
* No unresolved keys

## Left side

Show a Board Meeting product preview inside a dark framed surface.

Use realistic current-product previews such as:

* Dashboard
* Agenda
* Board Pack
* Virtual Meeting
* Decisions and Actions

Use three slides.

### Slide 1

Heading:

`Prepare meetings with confidence`

Text:

`Create agendas, invite participants, and publish secure board packs from one workspace.`

### Slide 2

Heading:

`Run focused board meetings`

Text:

`Manage attendance, quorum, documents, voting, and decisions during the meeting.`

### Slide 3

Heading:

`Track every decision`

Text:

`Turn resolutions into accountable actions and monitor progress after the meeting.`

Keep:

* Slider indicator
* Pause or play behavior
* Accessible controls

Remove old office and tax illustrations.

## Right side

Show:

Application name:

`NCC Bank Board Meeting Solution`

Application description:

`Secure board and committee meeting management`

Heading:

`Welcome back`

Supporting text:

`Sign in to manage meetings, agendas, board packs, decisions, and follow-up actions.`

Fields:

* User ID or email
* Password

Options:

* Remember me
* Forgot password?

Primary action:

* Sign in
* Signing in…

Support text:

`Need help signing in? Contact the Board Secretariat or IT support.`

Preserve the existing authentication and forgot-password behavior.

## Theme behavior

Use existing theme tokens.

Light mode:

* Soft primary-tinted left area
* Light right panel
* Dark product preview

Dark mode:

* Deeper tinted left area
* Dark right panel
* Accessible input borders and text

Do not hardcode screenshot colors.

## Mobile

* Hide the large preview panel.
* Show product logo and name above the form.
* Use a full-width login layout.
* Keep appearance controls available.
* Do not show a compressed desktop split-screen layout.

# 15. Fix UX writing throughout the project

Review every active visible string.

## Navigation and headings

Use consistent terms.

Use `Governance Body` as the broad term.

Use `Board` or `Committee` only when the body type is known.

## Page descriptions

Use direct descriptions.

Examples:

### All Meetings

`Create, schedule, and review board and committee meetings.`

### Agenda Management

`Submit, review, approve, and schedule agenda items.`

### Board Packs

`Compile, publish, and track secure meeting materials.`

### Action Items

`Track responsibilities created from meeting decisions.`

### Governance Bodies

`Manage boards, committees, memberships, and governance rules.`

Avoid:

* `Manage notification rules cases`
* `Manage integrations cases`
* Other legacy “cases” phrasing

## Entity-specific drawer titles

Use:

* Meeting Details
* Agenda Item Details
* Board Pack Details
* Document Details
* Question Details
* Decision Details
* Resolution Details
* Action Item Details
* Governance Body Details
* User Details

Do not use `Record Details`.

## Entity-specific confirmations

Use:

* Approve Meeting
* Reject Agenda Item
* Publish Board Pack
* Cancel Meeting
* Delete Participant Group

Do not use:

* Approve Record
* Reject Record
* Delete Record

## Separate Cancel and Postpone

Do not use `Cancel/Postpone`.

Use separate actions:

* Cancel Meeting
* Postpone Meeting

Each requires its own reason and confirmation copy.

## Success messages

Use:

* Meeting created.
* Meeting updated.
* Agenda item approved.
* Board Pack published.
* Vote opened.
* Resolution recorded.
* Action item assigned.
* Minutes draft saved.

Do not use:

* Entry created successfully.
* Record saved.
* Operation successful.

## Search placeholders

Use contextual text:

* Search meetings
* Search agenda items
* Search Board Packs
* Search documents
* Search action items
* Search users
* Search audit events

Do not use only `Search...`.

## Empty states

Example:

Heading:

`No meetings found`

Text:

`Create a meeting or adjust the current filters.`

## Error messages

State the cause and next action.

Example:

`The meeting cannot be started because the agenda has not been approved.`

Do not expose:

* Internal field names
* Registry keys
* Route IDs
* Component names
* API endpoints

# 16. Fix KPI logic and labels

Ensure card values match their labels.

Examples:

* Upcoming Meetings must not count Draft meetings.
* Completed must count only Completed meetings.
* Approved must not be counted as Completed.
* Quorum and Readiness must not show fabricated values.
* Review Progress must come from document-review records.
* Overdue Actions must use due date and status.
* Pending Invitations must use RSVP records.

Hide or label unavailable metrics honestly until their calculation exists.

# 17. Enforce permissions

Every contextual action must check permissions before rendering and before executing.

Cover:

* View
* Create
* Edit
* Approve
* Reject
* Request Revision
* Publish
* Start Meeting
* Join Meeting
* Resume Meeting
* Manage Participants
* Manage Attendance
* Manage Quorum
* Create Vote
* Cast Vote
* View Individual Votes
* Create Resolution
* Record Decision
* Create Action Item
* Edit Minutes
* Approve Minutes
* Archive
* Delete
* Download
* Print

Do not rely only on hidden buttons.

Prevent unauthorized direct route and function access.

# 18. Testing requirements

Add or update tests for:

* Start Meeting appears for permitted statuses and roles.
* Join Meeting appears for invited participants.
* Rejoin appears after disconnection.
* Start and Join do not appear in table rows.
* Every table has one row action.
* Every active table has no more than seven columns.
* Every drawer shows information removed from its table.
* Every configured drawer action renders and works.
* Simple forms use popup modals.
* Stepper forms use full-page modals.
* Modal footer actions remain in one row.
* English-only login renders final text.
* No unresolved translation keys render.
* No active translation provider remains.
* Participant Groups contains no tax fields.
* Live Vote persists.
* Resolution creation works.
* Attendance persists.
* Configured quorum rules are applied.
* Meeting state survives refresh.
* Role permissions are enforced.
* Login works in light, dark, desktop, and mobile views.

Run:

* TypeScript check
* Production build
* Lint
* Existing tests
* New Board Meeting tests
* Route validation
* Dead-import check

# Acceptance criteria

The task is complete only when:

* Start Meeting appears correctly in the Meeting drawer.
* Join Meeting appears correctly for invited participants.
* Resume and Rejoin actions work.
* No Meeting table contains Start or Join buttons.
* Every desktop table has one action only.
* Every table has a maximum of seven columns.
* All removed table data remains in dedicated drawer sections.
* Drawer actions are complete and functional.
* Edit persists to shared registries.
* Status actions persist.
* Simple forms use popup modals.
* Multi-step forms use full-page modals.
* Modal buttons remain in one footer row.
* Live Meeting uses configured quorum rules.
* Attendance persists.
* Voting is functional.
* Create Resolution works during the meeting.
* Live Meeting state persists.
* Availability Polls, RSVP, and Conflict Declarations are reachable contextually.
* Participant Groups is a real participant-group feature.
* External Registration contains no tax workflow.
* The English-only conversion is complete.
* No unresolved translation keys are visible.
* The login page matches the approved split-screen direction.
* KPI labels match their actual calculations.
* Navigation and page writing are consistent.
* Permissions protect all actions.
* Existing APIs, routes, themes, uploads, forms, drawers, and responsive behavior remain intact.
* The project builds without errors.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not rename, move, or delete unrelated files.
* Do not change the project architecture.
* Do not change existing API contracts.
* Do not remove working features.
* Keep the seven master navigation items unchanged.
* Do not add a new master navigation item.
* Reuse existing components, styles, tables, cards, drawers, modals, forms, uploads, previews, confirmations, and themes.
* Keep only one action in each desktop table.
* Keep contextual actions inside details drawers.
* Keep Start and Join Meeting inside the Meeting drawer.
* Keep the Live Meeting inside the Meetings module.
* Keep simple forms in popup modals.
* Keep stepper forms in full-page modals.
* Keep modal footer buttons in one row.
* Keep every active table within five to seven columns.
* Move secondary information into drawers without deleting data.
* Do not use the table configuration as the drawer schema.
* Finish the English-only conversion completely.
* Do not leave translation stubs or unresolved keys.
* Remove remaining NBR and tax workflows.
* Preserve historical records and versions.
* Use soft deletion for protected records.
* Enforce permissions in both UI and action logic.
* Preserve desktop behavior.
* Preserve mobile behavior.
* Preserve dark mode and all existing themes.
* Test shared-component changes across every affected page.
