Work directly inside the existing **NCC Bank Board Meeting Solution** React and TypeScript project.

The project already has:

* Seven master navigation groups
* Reusable page headers
* Dashboard cards
* Responsive tables
* Mobile cards
* Search and filters
* Details drawers
* Full-page modal support
* File upload and preview
* EN/BN language switching
* Role and permission management
* Theme support
* Responsive desktop and mobile layouts

The visible UI has already been converted from the old NBR Office Management System into a Board Meeting Solution.

Your task is to complete the missing functional Board Meeting workflows across:

1. Before the meeting
2. During the meeting
3. After the meeting

Do not perform another text-only conversion. Build the missing relationships, forms, status actions, record creation, editing, shared data, and meeting operations while preserving the existing application.

# Main objective

Transform the current collection of renamed pages into one connected Board Meeting lifecycle:

```text
Organization Setup
→ Meeting Planning
→ Meeting Creation
→ Participant Selection
→ Agenda Preparation
→ Document and Board Pack Preparation
→ Approval and Publication
→ Live Meeting
→ Attendance and Quorum
→ Discussion, Motion and Voting
→ Decisions, Resolutions and Actions
→ Minutes
→ Follow-up
→ Archive and Reports
```

Complete the work in controlled internal phases. Keep the application stable and usable after each phase.

Do not stop after creating only the page shells. All actions, forms, relationships, tables, drawers, statuses, and shared data must work.

# Existing structure that must remain unchanged

Keep the current seven master navigation groups:

```text
1. Home
2. Meetings
3. Agenda & Documents
4. Decisions & Follow-up
5. Governance & Organization
6. Archive & Reports
7. Administration
```

Do not add an eighth master navigation item.

Do not reorganize the project’s folders or technical architecture.

Do not:

* Rename or move existing files.
* Delete working components.
* Replace the application shell.
* Replace the router.
* Replace Redux or the current state-management approach.
* Change existing API contracts.
* Change service endpoints.
* Remove current tables, cards, drawers, filters, modals, or mobile views.
* Replace the design system.
* Introduce a new UI library.
* Change existing theme tokens.
* Break EN/BN language switching.
* Break desktop while fixing mobile.
* Break mobile while fixing desktop.
* Remove working upload, preview, print, export, search, pagination, or filtering features.

Adding small reusable components, configuration files, registries, hooks, or routes inside the existing folder structure is allowed only when the required behavior cannot be implemented safely through an existing component.

# Universal UX behavior

Use one consistent interaction model:

```text
Create → Full-page modal
Details → Details drawer
Edit → Same full-page modal with prefilled data
```

Do not add standalone Create, View, or Edit pages to the sidebar.

## Create behavior

Every internal Add or Create action must:

* Open the existing full-page modal pattern.
* Use feature-specific form fields.
* Validate all required data.
* Save a real record.
* Generate a unique record ID.
* Update the current table immediately.
* Update related pages.
* Recalculate dashboard cards.
* Add activity history.
* Show a success message.

## Details behavior

* Clicking a desktop table row opens the details drawer.
* Clicking a mobile card opens the same drawer.
* Do not add a redundant View Details button to every mobile card.
* Keep the desktop Actions column at the end.
* Show contextual actions in the drawer footer.
* Use sections, tabs, or collapsible groups inside complex drawers.

## Edit behavior

* Edit starts from the details drawer or table action.
* Close the drawer.
* Open the same full-page Create modal in Edit mode.
* Prefill all editable fields.
* Preserve the original ID.
* Preserve created date and creator.
* Preserve attachments and versions.
* Preserve relationships and activity history.
* Use Save Changes or Update as the primary action.
* Update every related page after saving.

# Phase 1: shared functional foundation

Complete this phase before building advanced meeting workflows.

## 1.1 Extend the reusable form system

Upgrade the existing form configuration and `EntryForm` system to support:

* Text
* Email
* Phone
* Number
* Date
* Time
* Date and time
* Textarea
* Single select
* Multi-select
* Searchable select
* Radio group
* Checkbox
* Toggle
* File upload
* Read-only generated value
* Repeatable field groups
* Conditional fields
* Conditional sections
* Step-based forms

Each field configuration must support:

* Field name
* Label
* Placeholder
* Helper text
* Required state
* Default value
* Existing edit value
* Validation rules
* Options
* Multi-select behavior
* Conditional visibility
* Conditional required state
* Disabled state
* Read-only state
* Character limits
* Numeric limits
* Date limits
* File type
* MIME type
* File count
* File size
* Grid width
* Step or section
* Dependency source
* Dependency logic

Reuse existing MUI and project input styling.

## 1.2 Upgrade the full-page modal

Extend the existing `AppModal`.

It must support:

* Full available viewport
* Sticky header
* Scrollable content
* Sticky footer
* Close button
* Optional description
* Optional stepper
* Cancel
* Back
* Next
* Save Draft
* Submit
* Update
* Publish
* Loading state
* Disabled state
* Unsaved-change protection
* Focus restoration

Connect the form dirty state to the existing unsaved-change warning.

On mobile:

* Use full-screen mode.
* Keep footer actions visible.
* Use single-column fields.
* Prevent step labels from overflowing.
* Keep touch targets accessible.

## 1.3 Shared entity registries

Do not keep records only inside individual page component state.

Create or extend shared registries using the same stable pattern already used for Users, Roles, and Permissions.

Use shared registries for:

* Meetings
* Meeting Templates
* Availability Polls
* Meeting Participants
* RSVP Records
* Agenda Submissions
* Agenda Sections
* Agenda Items
* Documents
* Document Versions
* Board Packs
* Board Pack Versions
* Questions
* Question Responses
* Private Notes
* Conflict Declarations
* Attendance Records
* Quorum Events
* Motions
* Votes
* Decisions
* Resolutions
* Action Items
* Action Updates
* Extension Requests
* Matters Arising
* Minutes
* Minutes Versions
* Minutes Amendments
* Governance Bodies
* Governance Memberships
* Organization Units
* User Assignments
* Designations
* Positions
* Participant Groups
* Workflows
* Approval Rules
* Review Rules
* Meeting Types
* Quorum Rules
* Voting Methods
* Status Configurations
* Numbering Configurations
* Notification Rules
* Message Templates
* Security Policies
* Retention Policies
* Legal Holds

Use stable prototype persistence without changing existing API contracts.

## 1.4 Shared-data relationships

Related views must use the same source.

```text
Meeting Overview
All Meetings
Meeting Calendar
Meeting Archive
Meeting details
Live Meeting
→ Same meeting registry
```

```text
Agenda Management
Meeting agenda
Board Pack
Minutes
→ Connected agenda records
```

```text
Decisions
Decision Register
Meeting details
Minutes
→ Same decision registry
```

```text
Resolutions
Resolution Register
Meeting details
Minutes
→ Same resolution registry
```

```text
Action Items
Action Register
Matters Arising
Meeting details
Minutes
→ Same action registry
```

## 1.5 Functional table and drawer actions

Fix generated-page action handling.

### View

Open details drawer.

### Edit

Open the shared Create/Edit modal with the selected record prefilled.

### Approve

* Open confirmation.
* Allow approval remarks.
* Change status.
* Add approval history.
* Add activity history.

### Reject

* Require a rejection reason.
* Change status.
* Add rejection history.
* Add activity history.

### Request Revision

* Require revision instructions.
* Set status to Revision Requested.
* Add history.
* Trigger the relevant notification record.

### Publish

* Validate publication requirements.
* Confirm publication.
* Set publication date and status.
* Add history.

### Duplicate

* Open the Create modal.
* Copy editable values.
* Clear ID, status, approvals, activity, and version history.

### Cancel or Postpone

* Require reason.
* Preserve the record.
* Update status and schedule.
* Add history.

### Delete

* Use the existing `SConfirmModal`.
* Use soft deletion or inactive status for protected records.
* Do not permanently delete approved, published, completed, archived, or audited records.

## 1.6 Fix filters

Applied filters must participate in the actual record filtering calculation.

Search, filters, sorting, and pagination must work together.

After creation or editing:

* Apply current search.
* Apply active filters.
* Preserve sorting.
* Preserve pagination where possible.
* Explain when a created record is hidden by the active filter.

## 1.7 History and audit foundation

Every important action must store:

* User
* Role
* Action
* Previous value
* New value
* Previous status
* New status
* Date and time
* Reason or remarks
* Related record
* Related meeting
* Session or device information when already supported

Do not overwrite previous history.

# Phase 2: before-meeting workflows

## 2.1 Complete Meeting creation

All Create Meeting buttons in:

* Meeting Overview
* All Meetings
* Meeting Calendar

must open one shared seven-step Meeting form and save to one Meeting registry.

### Step 1: Meeting Details

Fields:

* Meeting title
* Meeting type
* Meeting reference
* Auto-generate reference
* Financial year
* Meeting date
* Start time
* End time
* Calculated duration
* Time zone
* Meeting mode
* Venue
* Virtual platform
* Virtual meeting link
* Dial-in information
* Meeting language
* Priority
* Confidentiality
* Meeting purpose
* Description

Dependencies:

* Physical requires venue.
* Virtual requires virtual link.
* Hybrid requires both.
* End time must be later than start time.
* Duration updates automatically.

### Step 2: Governance Body and Scope

Fields:

* Governance body
* Board or committee
* Chairperson
* Meeting secretary
* Organizer
* Meeting owner
* Organization scope
* Divisions
* Departments
* Regions
* Branches
* Scope notes

When governance body changes, load:

* Active members
* Default chairperson
* Default secretary
* Quorum rule
* Voting method
* Meeting template

Division selection must filter departments.

Region selection must filter branches.

### Step 3: Participants

Use repeatable participant rows.

Support:

* Governance-body members
* Saved participant groups
* Organization-based selection
* Designation-based selection
* Position-based selection
* Manual users
* External invitees
* Alternates
* Delegates

Participant fields:

* Participant
* Participant source
* Meeting role
* Mandatory or optional attendance
* Voting eligibility
* Document access
* Agenda access
* RSVP deadline
* Conflict declaration required
* Alternate or delegate
* Notes

Show why every automatically added participant was selected.

Do not give invitees voting rights automatically.

### Step 4: Agenda

Support repeatable sections and agenda items.

Fields:

* Agenda template
* Section title
* Agenda number
* Agenda title
* Agenda purpose
* Agenda owner
* Presenter
* Estimated duration
* Proposed decision
* Proposed resolution
* Voting required
* Confidentiality
* Supporting documents

Allow:

* Add
* Remove
* Duplicate
* Reorder
* Move between sections

Calculate:

* Total planned agenda time
* Remaining meeting time
* Over-allocation warning

### Step 5: Documents

Use repeatable document rows.

Fields:

* Document type
* Document name
* Related agenda item
* File
* Version
* Document owner
* Confidentiality
* View permission
* Download permission
* Print permission
* Annotation permission
* Acknowledgement required
* Description

Reuse the existing file validation and preview system.

### Step 6: Schedule and Notifications

Fields:

* Invitation date
* Calendar invitation
* RSVP deadline
* Board-pack publication date
* Document-review deadline
* Reminder schedule
* Reminder channels
* Escalation recipients
* Notify on agenda changes
* Notify on document changes

### Step 7: Review and Publish

Show:

* Meeting details
* Governance body
* Organization scope
* Participant count
* Eligible voter count
* Agenda summary
* Document summary
* Quorum forecast
* Notification schedule
* Missing information
* Warnings

Actions:

* Back
* Save Draft
* Submit for Approval
* Publish, when permitted

## 2.2 Meeting workflow

Implement the meeting lifecycle:

```text
Draft
→ Under Preparation
→ Pending Approval
→ Revision Requested
→ Approved
→ Published
→ Invitation Sent
→ Scheduled
→ In Progress
→ Paused or Adjourned
→ Awaiting Minutes
→ Awaiting Closure
→ Completed
→ Archived
```

Also support:

* Postponed
* Cancelled

Define role-controlled transitions.

Do not allow invalid transitions.

Examples:

* A Draft meeting cannot start.
* A Published meeting cannot silently return to Draft.
* A Completed meeting cannot be deleted.
* An Archived meeting is read-only except for formal amendment actions.

## 2.3 Meeting Templates

Create a functional Meeting Template form.

Fields:

* Template name
* Description
* Meeting type
* Governance body
* Default duration
* Default mode
* Default venue
* Standard agenda sections
* Standard agenda items
* Participant-selection rules
* Quorum rule
* Voting method
* Confidentiality
* Reminder schedule
* Approval workflow
* Status

Applying a template during meeting creation must prefill relevant values without preventing later edits.

## 2.4 Availability Poll

Add Create Availability Poll from the meeting drawer.

Fields:

* Poll title
* Related draft meeting
* Proposed date and time options
* Time zone
* Participants
* Response deadline
* Multiple preference selection
* Comment permission
* Reminder schedule
* Notes

Support participant responses:

* Available
* Preferred
* Unavailable
* Tentative

Show:

* Best-supported time
* Required-member conflicts
* Quorum forecast for each option

## 2.5 RSVP and invitations

Each meeting participant must support:

* Invited
* Confirmed
* Tentative
* Declined
* No Response
* Leave Requested
* Leave Approved
* Replaced by Alternate

Add participant actions:

* Send invitation
* Resend invitation
* Record manual response
* Approve leave
* Assign alternate
* Remove participant

Update the expected quorum forecast when RSVP changes.

## 2.6 Agenda Management

Complete Agenda Submission creation.

Fields:

* Agenda title
* Agenda reference
* Requested meeting
* Meeting type
* Submitting division
* Submitting department
* Submitted by
* Category
* Purpose
* Background
* Business justification
* Proposed decision
* Proposed resolution
* Presenter
* Required attendees
* Estimated duration
* Priority
* Confidentiality
* Preferred meeting date
* Voting required
* Financial impact
* Legal impact
* Risk impact
* Regulatory impact
* Supporting documents
* Remarks

Implement statuses:

```text
Draft
→ Submitted
→ Under Review
→ Revision Requested
→ Approved
→ Scheduled
→ Completed
```

Also support:

* Rejected
* Deferred
* Withdrawn

Implement:

* Submit
* Review
* Request Revision
* Approve
* Reject
* Assign to Meeting
* Defer
* Withdraw

## 2.7 Board Pack workflow

Create a functional Board Pack builder.

Fields:

* Board-pack title
* Related meeting
* Version
* Auto-generate version
* Source agenda
* Include meeting notice
* Include previous minutes
* Include matters arising
* Included documents
* Document ordering
* Cover-page title
* Table of contents
* Agenda times
* Presenters
* Actions
* Page-number format
* Watermark
* Access policy
* Publication date
* Review deadline
* Acknowledgement required
* Change summary
* Status

Support:

* Draft
* Pending Approval
* Approved
* Published
* Superseded
* Archived

Add New Board Pack Version:

* Preserve old version.
* Compare changed, removed, and added documents.
* Require change summary.
* Allow notifying affected users.
* Allow requiring acknowledgement again.

## 2.8 Document management

Create a feature-specific Document form.

Fields:

* Document name
* Document number
* Document type
* Related meeting
* Related agenda item
* Owner
* Description
* File
* Version
* Tags
* Confidentiality
* Allowed participants
* Allowed groups
* Download permission
* Print permission
* Annotation permission
* Effective date
* Expiry date
* Acknowledgement required
* Status

Support:

* View
* Preview
* Edit metadata
* Upload new version
* Archive
* Download, when permitted
* Print, when permitted

Never overwrite the old version.

## 2.9 Document review

Track:

* Unread
* Opened
* Partially Reviewed
* Reviewed
* Acknowledged

Show review progress by:

* Participant
* Document
* Agenda item
* Board pack

Add:

* Mandatory acknowledgement
* Review deadline
* Reminder
* Outstanding-review warning

## 2.10 Questions and clarifications

Create Question form:

* Question
* Related meeting
* Agenda item
* Document
* Page
* Directed to
* Visibility
* Priority
* Written response required
* Deadline
* Attachments
* Context

Add Question Response:

* Response
* Responded by
* Response date
* Attachments
* Visibility
* Resolve
* Allow follow-up

Support:

* Open
* Assigned
* Awaiting Response
* Response Submitted
* Under Review
* Resolved
* Reopened

## 2.11 Private Notes

Create Private Note form:

* Note title
* Meeting
* Agenda item
* Document
* Page reference
* Note content
* Tags
* Bookmark
* Private by default
* Share deliberately

Private notes must never become official minutes automatically.

## 2.12 Conflict declarations

Add Conflict Declaration from the Meeting participant area.

Fields:

* Member
* Meeting
* Agenda item
* Conflict type
* Conflict details
* Related organization
* Related person
* Financial or non-financial
* Declaration date
* Proposed recusal
* Supporting attachment
* Acknowledgement

Implement:

* Secretariat review
* Chairperson review
* Recusal decision
* Agenda access restriction
* Document access restriction
* Voting restriction
* Conflict Register entry
* Minutes entry

## 2.13 Quorum forecast and readiness

Calculate expected quorum using:

* Eligible members
* Confirmed participants
* Approved leave
* Alternates
* Recusals
* Governance-body quorum rule
* Meeting-specific override

Meeting Overview and Meeting drawer must show:

* Quorum requirement
* Confirmed eligible members
* Expected quorum
* Quorum at risk
* Missing required roles
* Additional attendance needed

Add a readiness checklist:

* Governance body selected
* Chairperson assigned
* Secretary assigned
* Participants invited
* Quorum forecast met
* Agenda approved
* Required documents uploaded
* Board pack approved
* Board pack published
* Required reviews completed
* Conflict declarations completed
* Notifications scheduled

Do not allow Start Meeting until required readiness conditions are met, unless an authorized override is recorded with a reason.

# Phase 3: during-meeting workspace

This is a required functional module.

Do not add a new master navigation item.

Add a contextual `Start Meeting` action from the Meeting drawer and All Meetings table.

Open a dedicated full-page Live Meeting workspace using the existing application shell and route architecture.

A route such as `/meetings/:meetingId/live` is acceptable within the existing Meetings module. Do not reorganize folders or navigation.

## 3.1 Live Meeting layout

Create a role-aware workspace with:

### Header

* Meeting title
* Governance body
* Meeting date
* Actual start time
* Live duration
* Meeting status
* Quorum status
* Connection status
* Meeting controls

### Left or primary navigation area

* Agenda items
* Agenda progress
* Item status
* Planned duration
* Actual duration
* Current presenter
* Voting requirement

### Main workspace

* Current agenda item
* Supporting document or presentation
* Discussion notes
* Questions
* Motions
* Vote
* Decision
* Resolution
* Action creation

### Supporting panel

* Participants
* Attendance
* Speaking queue
* Quorum
* Meeting activity

Make the layout responsive.

On mobile:

* Use tabs or segmented sections.
* Keep critical meeting controls sticky.
* Avoid desktop-width side panels.
* Preserve all actions.

## 3.2 Meeting controls

Authorized users must be able to:

* Start Meeting
* Pause Meeting
* Resume Meeting
* Start Break
* Resume After Break
* Adjourn Meeting
* Resume Adjourned Meeting
* End Meeting

Record:

* Actual start time
* Pause times
* Resume times
* Break duration
* Adjournment reason
* Actual end time
* Actor

## 3.3 Live attendance

Support:

* Present in Person
* Present Virtually
* Joined Late
* Left Early
* Temporarily Absent
* Approved Leave
* Absent
* Represented by Alternate
* Recused for Agenda Item

Record:

* Join time
* Leave time
* Rejoin time
* Attendance mode
* Total duration
* Agenda-specific presence
* Corrections
* Correction reason

Automatically populate the Attendance Register.

## 3.4 Live quorum

Continuously recalculate quorum when:

* A participant joins
* A participant leaves
* A participant becomes temporarily absent
* A participant returns
* A participant is recused
* An alternate joins
* Voting eligibility changes

Show:

* Quorum Met
* Quorum at Risk
* Quorum Lost
* Eligible members present
* Minimum required

When quorum is lost:

* Warn the Chairperson and Secretary.
* Record the time.
* Prevent restricted votes and decisions.
* Allow pause or adjournment.
* Restore controls when quorum returns.
* Preserve quorum history.

## 3.5 Live agenda control

Authorized users can:

* Open agenda item
* Start discussion
* Pause discussion
* Resume discussion
* Complete item
* Skip item
* Defer item
* Withdraw item
* Reopen item
* Reorder remaining items
* Add emergency item
* Extend discussion time
* Change presenter

Show:

* Planned duration
* Actual duration
* Time remaining
* Total meeting delay
* Remaining agenda time

Warn when:

* An agenda item exceeds its time.
* The meeting runs behind schedule.
* Remaining agenda duration exceeds remaining meeting time.

## 3.6 Presentation and document access

Support:

* Current agenda document
* Board pack
* Previous minutes
* Supporting files
* Zoom
* Page navigation
* Full-screen viewing
* Presenter mode
* Independent participant viewing
* Follow-presenter mode
* Version indicator
* Confidentiality
* Permission controls

Reuse the existing attachment preview and file-security system.

## 3.7 Speaking queue and questions

Participants can:

* Raise hand
* Request to speak
* Submit question
* Direct question to presenter
* Withdraw question
* Add follow-up

Chairperson or moderator can:

* Approve request
* Reorder queue
* Mark question answered
* Defer question
* Assign written response
* Move unanswered question to Follow-up Questions

## 3.8 Motions

Add Motion form:

* Meeting
* Agenda item
* Motion title
* Motion text
* Proposed by
* Seconded by
* Amendments
* Voting required
* Notes

Statuses:

* Proposed
* Seconded
* Under Discussion
* Amended
* Withdrawn
* Put to Vote
* Approved
* Rejected
* Deferred

## 3.9 Voting

Add Create Vote form:

* Meeting
* Agenda item
* Motion or resolution
* Voting question
* Voting method
* Voting options
* Eligible voters
* Excluded or recused voters
* Threshold
* Quorum requirement
* Open or secret ballot
* Voting duration
* Allow vote changes before close
* Live-result visibility
* Final-result visibility
* Chairman casting vote
* Proxy voting
* Notes

Support:

* Open Vote
* Pause Vote
* Extend Vote
* Close Vote
* Cancel Vote
* Reopen Vote, only with permission and reason
* Manual vote recording, when permitted
* Casting vote

Calculate:

* Eligible voters
* Votes submitted
* Votes pending
* Approvals
* Rejections
* Abstentions
* Invalid votes
* Threshold result
* Final outcome

Secret votes must hide individual selections from unauthorized users.

Preserve a tamper-evident vote history.

## 3.10 Decisions

Add Record Decision form:

* Decision title
* Reference
* Meeting
* Agenda item
* Summary
* Outcome type
* Owner
* Effective date
* Review date
* Motion
* Vote
* Resolution
* Conditions
* Follow-up required
* Confidentiality
* Publication status
* Remarks

Decision outcomes:

* Approved
* Rejected
* Deferred
* Noted
* Discussed
* Referred Back
* Withdrawn
* No Decision
* More Information Required

## 3.11 Resolutions

Add Create Resolution form:

* Resolution title
* Resolution number
* Auto-generated number
* Meeting
* Agenda item
* Resolution text
* Proposed by
* Seconded by
* Effective date
* Conditions
* Responsible owner
* Responsible unit
* Voting method
* Approval threshold
* Voting result
* Supporting document
* Resolution type
* Status

Allow wording edits before vote.

Lock approved wording after vote.

Preserve version history.

## 3.12 Action Items

Add Create Action Item form:

* Action title
* Reference
* Meeting
* Agenda item
* Decision
* Resolution
* Description
* Assigned users
* Assigned department
* Supporting owner
* Priority
* Start date
* Due date
* Expected outcome
* Evidence required
* Dependencies
* Reminder schedule
* Escalation rule
* Confidentiality
* Status

The created action must immediately appear in:

* Live Meeting
* Meeting details
* Action Items
* Action Register
* Assigned user’s My Tasks

## 3.13 Live minute-taking

Create a structured live minutes panel.

Capture:

* Attendance
* Quorum confirmation
* Agenda start and end times
* Presenter
* Discussion summary
* Questions
* Responses
* Motions
* Votes
* Decisions
* Resolutions
* Actions
* Conflicts and recusals
* Breaks
* Adjournment
* Closing remarks
* Actual end time

Use the meeting agenda as the structure.

Autosave safely.

Do not lose live notes during navigation or temporary connection loss.

## 3.14 Meeting closure

Before End Meeting, show a closure checklist:

* Agenda items addressed
* Voting sessions closed
* Decisions recorded
* Resolutions finalized
* Actions assigned
* Due dates present
* Outstanding questions recorded
* Next meeting date recorded, when applicable
* Closing remarks captured
* Quorum status recorded

After closing:

* Set status to Awaiting Minutes.
* Lock live voting.
* Lock attendance except authorized corrections.
* Generate the initial minutes draft.

# Phase 4: after-meeting workflows

## 4.1 Draft Minutes

Add Create or Generate Draft Minutes from the Meeting drawer and Live Meeting closure.

Use:

* Meeting information
* Attendance
* Quorum history
* Agenda
* Discussion notes
* Motions
* Votes
* Decisions
* Resolutions
* Actions
* Conflicts and recusals
* Breaks and adjournments
* Start and end times

Create a structured minutes editor with:

* Meeting
* Minutes template
* Minute taker
* Co-authors
* Attendance section
* Quorum statement
* Agenda sections
* Discussion summaries
* Motions
* Voting results
* Decisions
* Resolutions
* Action items
* Conflicts
* Breaks
* Next meeting date
* Closing time
* Version
* Review workflow

Support:

* Autosave
* Draft preview
* Version history
* Compare versions
* Restore previous draft
* Attachments
* Print preview
* PDF preview using existing document tools

## 4.2 Minutes review workflow

Statuses:

```text
Draft
→ Under Secretary Review
→ Under Chairperson Review
→ Member Review
→ Revision Requested
→ Approved
→ Signed
→ Archived
```

Support:

* Reviewer assignment
* Due date
* Inline comments
* Section comments
* Suggested changes
* Accept change
* Reject change
* Request revision
* Approve
* Reject with reason
* Approval history
* Unresolved comment count

After approval:

* Lock the approved version.
* Require formal amendment for later changes.

## 4.3 Minutes Amendment

Fields:

* Minutes record
* Amendment type
* Affected section
* Original wording
* Proposed wording
* Reason
* Requested by
* Request date
* Attachment
* Approval workflow

Preserve the original approved minutes.

Create a new amended version after approval.

## 4.4 Decision and Resolution follow-up

Connect decisions and resolutions to:

* Source meeting
* Agenda item
* Motion
* Vote
* Responsible owner
* Actions
* Effective date
* Review date
* Implementation status
* Amendments
* History

Automatically populate:

* Decision Register
* Resolution Register

## 4.5 Action progress

Add contextual forms.

### Progress Update

* Progress percentage
* Current status
* Update summary
* Blocker
* Forecast completion date
* Evidence
* Updated by
* Update date

### Extension Request

* Current due date
* Requested due date
* Reason
* Delay impact
* Supporting document
* Approver

### Completion Submission

* Completion date
* Completion summary
* Outcome
* Evidence
* Final remarks
* Submit for review

Support:

* Assigned
* Acknowledged
* In Progress
* Blocked
* Pending Review
* Completed
* Overdue
* Cancelled

Allow authorized reviewers to:

* Approve completion
* Reject completion
* Reopen action
* Reassign action

## 4.6 Matters Arising

Automatically create or update Matters Arising from:

* Unfinished decisions
* Overdue actions
* Deferred agenda items
* Unanswered questions

Each matter includes:

* Source meeting
* Agenda item
* Decision
* Action
* Owner
* Due date
* Current status
* Progress
* Delay reason
* Next review date
* Target meeting
* Supporting documents

Allow Carry Forward to Meeting.

This must create a connected agenda item for the target meeting.

## 4.7 Follow-up Questions

Support:

* Assigned respondent
* Response deadline
* Written response
* Attachment
* Review
* Follow-up
* Resolve
* Reopen
* Add to official record

## 4.8 Meeting Archive

Do not keep the Meeting Archive as a renamed generic report.

Create a real read-only archive using the meeting registry.

Archive records must include:

* Meeting details
* Final agenda
* Final board pack
* Attendance
* Quorum history
* Conflicts
* Motions
* Votes
* Decisions
* Resolutions
* Actions
* Approved minutes
* Signed minutes
* Attachments
* Audit history

Allow:

* Search
* Filters
* Preview
* Controlled download
* Controlled print
* Retention status
* Legal-hold status

## 4.9 Registers

Automatically populate:

* Resolution Register
* Decision Register
* Action Register
* Attendance Register
* Conflict Register

Registers are read-only source views by default.

Do not allow direct creation from register pages.

## 4.10 Reports and Analytics

Calculate reports from the shared data rather than renamed static tax-era records.

Support:

### Meeting Performance

* Meetings held
* Meetings cancelled
* Meetings postponed
* Average duration
* Agenda completion
* Preparation time
* Minutes approval time

### Participation

* Attendance rate
* RSVP rate
* Review completion
* Voting participation
* Member participation

### Governance

* Quorum compliance
* Conflict declarations
* Recusals
* Approval turnaround
* Resolution approval rate

### Decisions and Actions

* Open decisions
* Implementation status
* Open actions
* Overdue actions
* Completion rate
* Matters arising

### Financial and Resource Impact

Use only when a decision or agenda item contains valid financial or resource-impact data.

Do not reintroduce NBR or tax metrics.

## 4.11 Meeting effectiveness review

Add a post-meeting evaluation accessible to participants.

Fields:

* Meeting preparation rating
* Board-pack quality
* Agenda relevance
* Time management
* Discussion quality
* Decision clarity
* Technology performance
* Overall rating
* Comments
* Anonymous or named response

Use results in Reports & Analytics.

## 4.12 Next Meeting preparation

From a completed meeting allow:

* Create Next Meeting
* Reuse governance body
* Reuse participants
* Carry forward deferred agenda
* Carry forward matters arising
* Include overdue actions
* Include unresolved questions
* Include previous minutes for confirmation
* Reuse meeting settings

Open the normal Create Meeting form with appropriate prefilled values.

# Phase 5: organization, roles, security, and notifications

## 5.1 Fix User and Organization forms

Remove visible NBR fields such as:

* Circle
* Zone
* Tax Level
* Tax Administration Zone
* Tax Officer hierarchy

Use:

### User

* Employee ID
* Full name
* Email
* Phone
* Designation
* Position
* Organization unit
* Reports to
* System role
* Committee memberships
* Employment status
* Account status
* Send invitation
* Require two-factor authentication

Keep separate:

* Designation
* Position
* System role
* Governance role
* Meeting role

### Organization Unit

* Unit name
* Unit code
* Unit type
* Parent unit
* Reporting unit
* Head
* Acting head
* Location
* Region
* Contact information
* Meeting contact
* Approval authority
* Effective dates
* Status

### Governance Body

* Body name
* Code
* Type
* Parent body
* Purpose
* Charter
* Chairperson
* Secretary
* Effective dates
* Meeting frequency
* Quorum rule
* Voting method
* Confidentiality
* Status

### Governance Membership

* Body
* Member
* Membership role
* Voting right
* Term
* Appointment reference
* Alternate
* Permanent invitee
* Access level
* Status

### Participant Group

* Group name
* Group type
* Static or dynamic
* Governance-body rule
* Organization-unit rule
* Designation rule
* Position rule
* Region rule
* Branch rule
* Manual members
* Excluded members
* Default meeting role
* Default attendance rule
* Default document access
* Status

## 5.2 Permissions

Every button and operation must respect existing permissions.

Permissions must cover:

* View
* Create
* Edit
* Submit
* Approve
* Reject
* Request Revision
* Publish
* Cancel
* Delete
* Archive
* Download
* Print
* Manage Participants
* Manage Agenda
* Manage Documents
* Start Meeting
* Control Meeting
* Record Attendance
* Manage Quorum
* Create Vote
* Cast Vote
* View Individual Votes
* Record Decision
* Create Resolution
* Create Action
* Edit Minutes
* Approve Minutes
* Sign Minutes
* Manage Organization
* Manage Roles
* Manage Security

Hide unauthorized actions.

Do not leave executable actions available through direct function calls or routes.

## 5.3 Notifications

Connect Notification Rules to real triggers.

Examples:

* Meeting created
* Approval requested
* Meeting approved
* Meeting published
* Invitation sent
* RSVP pending
* Board pack published
* Document changed
* Review deadline approaching
* Agenda changed
* Quorum at risk
* Meeting starting soon
* Minutes review assigned
* Action assigned
* Action due soon
* Action overdue
* Completion submitted
* Extension requested
* Question assigned
* Response overdue

Support:

* In-app
* Email
* SMS
* Push, when already supported

Use message templates with EN/BN parity.

## 5.4 Security and document access

Apply security rules to actual records.

Support:

* MFA requirements
* Session timeout
* Device restrictions
* Download restriction
* Print restriction
* Document watermark
* Confidential agenda access
* Conflict-related restrictions
* External participant restrictions
* Audit logging
* Retention
* Legal hold

# Status and ID standards

Use consistent IDs such as:

```text
Meeting: MTG-2026-0344
Agenda: AGD-2026-0344-01
Board Pack: BPK-2026-0344-V2
Document: DOC-2026-0118
Question: QST-2026-0018
Decision: DEC-2026-0044
Resolution: RES-2026-0044
Action: ACT-2026-0071
Minutes: MIN-2026-0344-V1
```

Use configurable numbering rules.

IDs must:

* Be unique
* Be read-only after creation
* Remain unchanged during editing
* Be searchable
* Appear in drawers and related records

# Attachment requirements

Preserve the existing file-security system.

Creation must support:

* File selection
* File list
* File removal
* MIME validation
* File-signature validation
* File-size validation
* File-count validation
* Duplicate detection
* Preview

Edit must support:

* Existing files
* New files
* Preview
* Remove, when permitted
* Replace
* New version
* Cancel without losing original files
* Version history

# Responsive requirements

Desktop:

* Preserve tables.
* Keep Actions column last.
* Use wide drawers for complex entities.
* Use the dedicated Live Meeting workspace.

Mobile:

* Preserve unified mobile cards.
* Card tap opens details.
* Do not add redundant View Details buttons.
* Use full-screen Create/Edit forms.
* Use horizontal tabs or segmented sections in Live Meeting.
* Keep critical meeting controls sticky.
* Use bottom sheets for filters where already supported.
* Keep tap targets accessible.

# EN/BN requirements

Update every affected translation namespace.

Include translations for:

* Navigation
* Page headings
* Secondary headings
* Card labels
* Table headings
* Drawer sections
* Form titles
* Form steps
* Field labels
* Placeholders
* Helper text
* Validation messages
* Statuses
* Actions
* Confirmations
* Success messages
* Error messages
* Notifications
* Empty states
* Accessibility labels

Do not leave Bangla tax-management terms behind English Board Meeting labels.

Run the existing locale validation.

# Acceptance criteria

The task is complete only when:

* Before-meeting workflows are connected and functional.
* Meeting creation uses the seven-step feature-specific form.
* Meeting participants, RSVP, agenda, documents, board packs, and readiness work.
* Quorum forecast is calculated.
* Meeting status transitions work.
* A dedicated Live Meeting workspace exists.
* Start, pause, resume, adjourn, and close work.
* Live attendance works.
* Live quorum works.
* Agenda control works.
* Speaking queue and questions work.
* Motions work.
* Voting works.
* Decisions, resolutions, and actions can be created during the meeting.
* Live minutes are captured.
* Closing the meeting creates draft minutes.
* Minutes editing, review, approval, amendment, and locking work.
* Decisions and resolutions populate their registers.
* Actions support progress, extension, completion, review, and escalation.
* Matters Arising is generated from unfinished records.
* Meeting Archive contains complete meeting records.
* Reports use actual Board Meeting data.
* Create and Edit use the same forms.
* Details remain in drawers.
* All contextual actions work.
* Shared records remain after navigation.
* Related pages show the same records.
* Search and filters work.
* Dashboard cards update.
* Activity and status history are preserved.
* Permissions control actions.
* Attachments and versions remain safe.
* EN/BN content remains aligned.
* Desktop and mobile both work.
* Existing themes remain unchanged.
* Existing APIs and services remain unchanged.
* The project builds without TypeScript errors.
* Existing working features continue to work.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not rename, move, or delete existing files.
* Do not reorganize the project structure.
* Do not change existing API contracts.
* Do not remove working features.
* Do not replace the existing design system.
* Do not introduce another UI library.
* Reuse existing components, styles, drawers, modals, tables, cards, uploads, and confirmations.
* Keep the seven master navigation items unchanged.
* Do not create new master navigation items.
* Keep all creation and editing inside full-page modals.
* Keep all record details inside drawers.
* Use a dedicated Live Meeting workspace only for active meeting operations.
* Use one shared Create/Edit flow for each entity.
* Do not use one generic form for unrelated records.
* Do not perform blind text replacement.
* Preserve desktop behavior.
* Preserve mobile behavior.
* Preserve responsive tables and mobile cards.
* Preserve theme switching.
* Preserve EN/BN parity.
* Preserve search, filters, sorting, pagination, print, and export.
* Preserve old document and board-pack versions.
* Preserve approved and archived records.
* Use soft deletion for protected records.
* Test shared-component changes across every affected page.
* Complete the reusable foundation before applying changes to all modules.
* Keep the application stable after each internal implementation phase.
