You are working directly inside the existing React and TypeScript project named **Board Meeting Solution**.

This project was originally an NBR Office Management System and has already been partially transformed into an NCC Bank Board Meeting Solution. The current navigation and visible content are mostly converted, but the creation and editing functions are still incomplete.

Your task is to add all required Board Meeting creation features, make every form feature-specific and fully functional, and connect editing to the existing details drawers.

Do not rebuild the project. Do not change the project structure. Do not break any working feature.

# Main objective

Create one reusable and configuration-driven Create/Edit system that supports all Board Meeting modules while preserving the existing:

* File and folder structure
* Routes
* Navigation hierarchy
* Redux and state architecture
* API contracts
* Service and repository structure
* Design system
* Theme system
* EN/BN language switching
* Desktop tables
* Mobile cards
* Details drawers
* Existing modals
* Search
* Filters
* Sorting
* Pagination
* Export
* Print
* Attachments
* File preview
* File validation
* Roles and permissions
* Responsive behavior

Do not create separate standalone creation or edit pages.

Use this interaction model everywhere:

```text
Create → Full-page modal
Details → Details drawer
Edit → Same full-page modal with existing values
```

# 1. First inspect the existing implementation

Before making changes, inspect:

* All files that render pages with Add or Create buttons
* `GeneratedTablePage`
* `EntryForm`
* `AppModal`
* `DynamicDetailsDrawer`
* `ResponsiveTable`
* `UnifiedMobileCard`
* Existing User Create/Edit flow
* Existing Role Create/Edit flow
* Existing Permission Create/Edit flow
* Existing confirmation modals
* Existing attachment uploader and preview
* Existing registries or local persistence systems
* Existing page configurations
* Existing EN and BN translation namespaces

Reuse existing patterns wherever possible.

Do not replace working custom flows unless required to remove remaining NBR fields.

# 2. Critical current problems to solve

The current generated pages still have these problems:

* Many Add buttons open the same generic form.
* Forms are not specific to the selected feature.
* Generated-page Edit actions do not open prefilled forms.
* Table actions often open the same details drawer instead of performing their intended action.
* Drawer footer actions are not fully connected.
* Created records are stored only inside individual pages.
* Related pages do not always share the same data.
* Created records may disappear after navigation or refresh.
* Applied filter values are not always included in the actual filtering logic.
* The current form system supports too few input types.
* Unsaved-change protection exists but is not properly connected.
* User and external-registration forms still contain old NBR concepts.
* Existing attachments are not fully handled during editing.
* Some generated pages still rely on tax-era form assumptions.

Fix these issues at the reusable component and configuration level.

Do not solve them with isolated one-off code for every page.

# 3. Required creation locations

Add or complete creation functions in these places.

## Meetings

* Meeting Overview → `+ Create Meeting`
* All Meetings → `+ Create Meeting`
* Meeting Calendar → `+ Create Meeting`
* Meeting Templates → `+ Add Meeting Template`

All three meeting creation buttons must open the same Meeting form and save into the same Meeting registry.

## Agenda & Documents

* Agenda Management → `+ Add Agenda Submission`
* Board Packs → `+ Create Board Pack`
* Document Library → `+ Add Document`
* Questions & Clarifications → `+ Add Question`
* My Notes → `+ Add Note`

## Decisions & Follow-up

* Decisions → `+ Add Decision`
* Resolutions → `+ Add Resolution`
* Action Items → `+ Add Action Item`
* Matters Arising → `+ Add Matter`
* Follow-up Questions → `+ Add Follow-up Question`

## Governance & Organization

* Governance Bodies → `+ Add Governance Body`
* Organization Structure → `+ Add Organization Unit`
* Users & Assignments → `+ Add User`
* Designations tab → `+ Add Designation`
* Positions tab → `+ Add Position`
* Participant Groups → `+ Add Participant Group`

## Archive & Reports

* Reports & Analytics → `+ Create Custom Report`

Do not add creation buttons to:

* Meeting Archive
* Resolution Register
* Decision Register
* Action Register
* Attendance Register
* Conflict Register
* Audit Trail

These pages must receive records from their source modules.

## Administration

* Roles → `+ Add Role`
* Permissions → `+ Add Permission`
* Workflow Definitions → `+ Add Workflow`
* Approval Rules → `+ Add Approval Rule`
* Review & Revision Rules → `+ Add Review Rule`
* Meeting Types → `+ Add Meeting Type`
* Quorum Rules → `+ Add Quorum Rule`
* Voting Methods → `+ Add Voting Method`
* Status configuration → contextual Add button
* Numbering configuration → contextual Add button
* Meeting & Agenda Templates → `+ Add Template`
* Minutes & Resolution Templates → `+ Add Template`
* Document Templates → `+ Add Template`
* Communication Templates → `+ Add Template`
* Notification Rules → `+ Add Notification Rule`
* Message Templates → `+ Add Message Template`
* Integrations → `+ Add Integration`
* Security Policies → `+ Add Security Policy`
* Retention Policies → `+ Add Retention Policy`
* Legal Holds → `+ Add Legal Hold`

Do not add creation buttons to:

* Workflow History
* Notification Delivery Logs

# 4. Contextual creation inside details drawers

Support contextual creation without adding new navigation pages.

## Meeting drawer

Participants section:

* Add Participant
* Add External Invitee
* Add Alternate or Delegate
* Add Conflict Declaration
* Create Availability Poll

Agenda section:

* Add Agenda Section
* Add Agenda Item

Documents section:

* Add Meeting Document
* Upload New Document Version
* Create Board Pack
* Create New Board Pack Version

Live Meeting section:

* Add Emergency Agenda Item
* Correct Attendance
* Add Motion
* Create Vote
* Record Decision
* Create Resolution
* Create Action Item

Minutes section:

* Create Draft Minutes
* Generate Draft Minutes
* Add Minutes Amendment

Activity section:

* Add Administrative Note

## Other drawers

Question:

* Add Response
* Add Follow-up Question

Action Item:

* Add Progress Update
* Request Deadline Extension
* Submit Completion Evidence
* Reassign Action

Decision:

* Create Resolution
* Create Action Item

Resolution:

* Create Action Item

Matter Arising:

* Add Progress Update
* Carry Forward to Meeting

Governance Body:

* Add Member
* Add Permanent Invitee

User:

* Add Assignment
* Add Acting Assignment
* Add Delegation

# 5. Reusable form-system requirements

Extend the existing `EntryForm` and related configuration instead of creating a new visual form library.

Support these input types:

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
* Read-only generated field
* Repeatable field group
* Conditional field group

Use existing MUI and project form components.

Do not introduce a second design language.

## Each form field configuration must support

* Field name
* Label
* Placeholder
* Input type
* Required state
* Default value
* Edit value
* Helper text
* Validation rules
* Options
* Searchable options
* Multi-select behavior
* Conditional visibility
* Conditional required state
* Disabled state
* Read-only state
* Character limit
* Minimum and maximum value
* Minimum and maximum file count
* Allowed file types
* Allowed MIME types
* Maximum file size
* Section or step
* Grid width
* Dependency source
* Dependency mapping

# 6. Full-page modal behavior

Extend the existing `AppModal`.

Do not create a separate full-page modal component unless technically unavoidable.

The full-page modal must have:

* Full available width and height
* Existing application theme
* Sticky modal header
* Scrollable body
* Sticky footer
* Close button
* Clear title
* Optional secondary description
* Optional stepper
* Cancel
* Back
* Next
* Save Draft
* Submit
* Update
* Save Changes
* Publish, when permitted
* Loading state
* Disabled state
* Validation state
* Unsaved-change warning
* Focus restoration after closing

On mobile:

* The modal must fill the screen.
* The footer actions must remain reachable.
* Long step labels must not overflow.
* Form fields must remain single-column unless a safe existing mobile pattern already supports otherwise.

# 7. Create and Edit must use the same form

Every entity must use one shared form configuration for both Create and Edit.

Create mode:

* Empty or default values
* Create title
* Create button label
* New ID generation
* New activity-history entry

Edit mode:

* Existing values prefilled
* Edit title
* Save Changes or Update button
* Preserve record ID
* Preserve created date
* Preserve creator
* Preserve old activity history
* Preserve old file versions
* Preserve related-record links
* Add a new update-history entry

Do not create separate Edit forms.

# 8. Details-drawer Edit behavior

Every editable details drawer must contain an Edit action.

Required flow:

```text
Open row or mobile card
→ Open details drawer
→ Click Edit
→ Close drawer
→ Open the same full-page modal in Edit mode
→ Prefill all editable values
→ Save changes
→ Update shared registry
→ Update table, cards, drawer and related pages
→ Add activity-history entry
→ Show success message
```

Do not open Edit inside the drawer.

Do not route to a separate Edit page.

# 9. Functional row and drawer actions

Update generated-page action handling.

## View

* Open details drawer.

## Edit

* Open full-page modal in Edit mode.

## Approve

* Open confirmation.
* Allow optional approval remarks.
* Update status.
* Add approval history.
* Add activity history.
* Update related pages.

## Reject

* Require rejection reason.
* Update status.
* Add rejection history.
* Add activity history.

## Request Revision

* Require revision instructions.
* Change status to Revision Requested.
* Notify the assigned user.

## Delete

* Use existing `SConfirmModal`.
* Respect role permissions.
* Do not permanently delete protected or historical records.
* Use inactive, archived or soft-delete status where appropriate.

## Publish

* Show confirmation.
* Validate required fields before publishing.
* Update publication status and date.
* Add history entry.

## Duplicate

* Open the same Create modal.
* Copy editable values.
* Clear ID, status, activity history and approval history.
* Add “Copy” only when needed to avoid duplicate title confusion.

## Cancel

* Require a reason.
* Update status.
* Preserve the record.

## Archive

* Confirm the action.
* Set archive date.
* Keep the record accessible in Archive.

# 10. Shared data registries

Do not keep important records only in local page component state.

Create or extend shared registries using the same project pattern already used by User, Role and Permission management.

Use stable prototype persistence without changing API contracts.

At minimum, create shared entity registries for:

* Meetings
* Meeting Templates
* Availability Polls
* Meeting Participants
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
* Motions
* Votes
* Decisions
* Resolutions
* Action Items
* Action Updates
* Action Extension Requests
* Matters Arising
* Minutes
* Minutes Amendments
* Governance Bodies
* Governance Memberships
* Organization Units
* User Assignments
* Designations
* Positions
* Participant Groups
* Custom Reports
* Workflows
* Approval Rules
* Review Rules
* Meeting Types
* Quorum Rules
* Voting Methods
* Status Configurations
* Numbering Configurations
* Templates
* Notification Rules
* Message Templates
* Integrations
* Security Policies
* Retention Policies
* Legal Holds

## Related pages must share data

```text
Meeting Overview
All Meetings
Meeting Calendar
Meeting Archive
Meeting details
→ Same meeting registry
```

```text
Decisions
Decision Register
Meeting details
→ Same decision registry
```

```text
Resolutions
Resolution Register
Meeting details
→ Same resolution registry
```

```text
Action Items
Action Register
Matters Arising
Meeting details
→ Same action registry
```

```text
Agenda Management
Meeting agenda
Board Pack
→ Connected agenda records
```

# 11. ID and numbering generation

Create reusable ID generation based on entity configuration.

Examples:

```text
Meeting: MTG-2026-0344
Agenda: AGD-2026-0344-01
Board Pack: BPK-2026-0344-V2
Document: DOC-2026-0118
Decision: DEC-2026-0044
Resolution: RES-2026-0044
Action: ACT-2026-0071
Question: QST-2026-0018
```

Do not hardcode one exact number.

Use current numbering configuration when available.

Generated IDs must:

* Be unique
* Remain read-only after creation
* Be preserved during Edit
* Be searchable
* Appear in drawers and related records

# 12. Form validation requirements

Every form must validate before submission.

Support:

* Required fields
* Minimum and maximum text length
* Valid email
* Valid phone
* Unique code
* Unique reference
* Date comparison
* Time comparison
* Numeric limits
* Conditional required fields
* Repeatable-group validation
* File extension
* MIME type
* File size
* File count
* Duplicate file detection
* Cross-field rules
* Step-level validation

Validation errors must:

* Appear beside the affected field
* Use EN and BN translations
* Clear after correction
* Prevent submission
* Move focus to the first invalid field
* Identify the invalid step in a stepper

# 13. Functional dependencies

Implement real field dependencies.

Examples:

* Meeting mode controls venue and virtual-link fields.
* Physical meeting requires venue.
* Virtual meeting requires meeting link.
* Hybrid meeting requires both.
* End time must be later than start time.
* Meeting duration calculates automatically.
* Governance body loads members, chairperson, secretary, quorum rule and voting method.
* Division selection filters departments.
* Region selection filters branches.
* Organization unit filters positions.
* Meeting selection filters agenda items.
* Agenda selection filters meeting documents.
* Decision selection filters related actions.
* Secret vote hides individual vote visibility.
* Written resolution reveals circulation and signature fields.
* Static participant group shows selected members.
* Dynamic participant group shows rule builder.
* Legal hold disables normal disposal rules.
* Auto-generated numbering hides manual reference editing.
* New document version requires a replacement file and change reason.

# 14. Meeting creation form

Use one seven-step full-page modal.

## Step 1: Meeting Details

Fields:

* Meeting title
* Meeting type
* Meeting reference
* Auto-generate reference
* Financial year
* Meeting date
* Start time
* End time
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

## Step 2: Governance Body and Scope

Fields:

* Governance body
* Board or committee
* Chairperson
* Meeting secretary
* Meeting organizer
* Meeting owner
* Organization scope
* Divisions
* Departments
* Regions
* Branches
* Scope notes

## Step 3: Participants

Use repeatable participant rows.

Fields:

* Participant source
* User or external participant
* Meeting role
* Attendance requirement
* Voting eligibility
* Document access
* Agenda access
* Alternate or delegate
* RSVP deadline
* Conflict declaration required
* Notes

Allow:

* Governance-body members
* Participant groups
* Organization-based rules
* Manual users
* External invitees

## Step 4: Agenda

Use repeatable sections and items.

Fields:

* Agenda template
* Section title
* Agenda number
* Agenda title
* Purpose
* Agenda owner
* Presenter
* Estimated duration
* Proposed decision
* Voting required
* Confidentiality
* Supporting documents

Allow:

* Add
* Remove
* Reorder
* Duplicate
* Move between sections

## Step 5: Documents

Use repeatable document rows.

Fields:

* Document type
* Document name
* Related agenda item
* File
* Version
* Owner
* Confidentiality
* View access
* Download permission
* Print permission
* Annotation permission
* Acknowledgement required
* Description

## Step 6: Schedule and Notifications

Fields:

* Invitation date
* Calendar invitation
* RSVP deadline
* Board-pack publication date
* Document-review deadline
* Reminder schedule
* Reminder channels
* Escalation recipients
* Notify on document updates
* Notify on agenda changes

## Step 7: Review and Publish

Display:

* Meeting summary
* Governance body
* Scope
* Participant count
* Voting-member count
* Agenda
* Documents
* Quorum forecast
* Notification schedule
* Validation warnings

Actions:

* Back
* Save Draft
* Submit for Approval
* Publish, when permitted

# 15. Meeting Template form

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
* Default participant rules
* Default quorum rule
* Default voting method
* Default confidentiality
* Default reminder schedule
* Default approval workflow
* Status

# 16. Availability Poll form

Fields:

* Poll title
* Related meeting
* Proposed date-and-time options
* Time zone
* Participants
* Response deadline
* Allow multiple preferences
* Allow comments
* Reminder schedule
* Notes

Proposed date-and-time options must support repeatable rows.

# 17. Agenda Submission form

Fields:

* Agenda title
* Agenda reference
* Requested meeting
* Requested meeting type
* Submitting division
* Submitting department
* Submitted by
* Agenda category
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

# 18. Agenda Item form

Fields:

* Related meeting
* Item type
* Parent section
* Sequence number
* Title
* Description
* Purpose
* Agenda owner
* Presenter
* Duration
* Proposed motion
* Proposed resolution
* Voting required
* Voting method
* Eligible voters
* Decision threshold
* Confidentiality
* Supporting documents
* Status

# 19. Board Pack form

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
* Document order
* Cover-page title
* Table of contents
* Show agenda times
* Show presenters
* Show actions
* Page-number format
* Watermark
* Access policy
* Publication date
* Review deadline
* Acknowledgement required
* Change summary
* Status

## New Board Pack Version

Fields:

* Current version
* New version
* Changed documents
* Removed documents
* Added documents
* Change summary
* Notify affected users
* Require acknowledgement again
* Publication date and time
* Status

Do not overwrite the old version.

# 20. Document form

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

## New Document Version

Prefill existing metadata.

Require:

* New file
* New version number
* Replacement reason
* Change summary
* Notify users
* Require acknowledgement again

# 21. Question form

Fields:

* Question
* Related meeting
* Agenda item
* Document
* Document page
* Directed to
* Visibility
* Priority
* Written response required
* Response deadline
* Attachments
* Additional context

## Question Response form

Fields:

* Question summary, read-only
* Response
* Responded by
* Response date
* Attachments
* Visibility
* Mark resolved
* Allow follow-up

# 22. Private Note form

Fields:

* Note title
* Related meeting
* Agenda item
* Document
* Page reference
* Note content
* Tags
* Bookmark page
* Private by default
* Share deliberately

Private notes must never become official meeting records automatically.

# 23. Conflict Declaration form

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

# 24. Attendance Correction form

Fields:

* Meeting
* Participant
* Attendance status
* Attendance mode
* Join time
* Leave time
* Rejoin time
* Agenda-specific absence
* Correction reason
* Recorded by
* Remarks

# 25. Motion form

Fields:

* Meeting
* Agenda item
* Motion title
* Motion text
* Proposed by
* Seconded by
* Amendments
* Voting required
* Notes

# 26. Vote form

Fields:

* Meeting
* Agenda item
* Related motion
* Related resolution
* Voting question
* Voting method
* Voting options
* Eligible voters
* Excluded or recused members
* Approval threshold
* Quorum requirement
* Open or secret ballot
* Voting duration
* Allow vote changes
* Show live results
* Result visibility
* Chairman casting vote
* Proxy voting allowed
* Notes

# 27. Decision form

Fields:

* Decision title
* Decision reference
* Source meeting
* Agenda item
* Decision summary
* Outcome type
* Decision owner
* Effective date
* Review date
* Related motion
* Related vote
* Related resolution
* Conditions
* Follow-up required
* Confidentiality
* Publication status
* Remarks

# 28. Resolution form

Fields:

* Resolution title
* Resolution number
* Auto-generate number
* Meeting
* Agenda item
* Resolution text
* Proposed by
* Seconded by
* Effective date
* Conditions
* Responsible owner
* Responsible organization unit
* Voting method
* Approval threshold
* Voting result
* Supporting document
* Resolution type
* Status

For written resolutions, also show:

* Circulation date
* Response deadline
* Required signatories
* Signature sequence

# 29. Action Item form

Fields:

* Action title
* Action reference
* Source meeting
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

## Action Progress Update

Fields:

* Action item, read-only
* Progress percentage
* Current status
* Update summary
* Blocker
* Forecast completion date
* Evidence
* Updated by
* Update date

## Extension Request

Fields:

* Action item
* Current due date
* Requested due date
* Reason
* Impact of delay
* Supporting document
* Approver

## Completion Submission

Fields:

* Action item
* Completion date
* Completion summary
* Outcome
* Evidence files
* Final remarks
* Submit for review

# 30. Matter Arising form

Fields:

* Matter title
* Source meeting
* Source agenda item
* Source decision
* Source action
* Current owner
* Current status
* Due date
* Next review date
* Target meeting
* Delay reason
* Carry-forward summary
* Supporting documents

# 31. Follow-up Question form

Fields:

* Question
* Source meeting
* Agenda item
* Assigned respondent
* Response deadline
* Priority
* Context
* Attachments

# 32. Draft Minutes form

Use a structured full-page modal or existing full-page editor pattern.

Fields:

* Meeting
* Minutes template
* Minute taker
* Co-authors
* Attendance source
* Quorum statement
* Agenda-based sections
* Discussion summary per agenda item
* Motions
* Votes
* Decisions
* Resolutions
* Action items
* Conflicts and recusals
* Breaks and adjournments
* Next meeting date
* Closing time
* Version
* Review workflow

Generate available information automatically from the meeting record.

## Minutes Amendment form

Fields:

* Minutes record
* Amendment type
* Affected section
* Original wording
* Proposed wording
* Amendment reason
* Requested by
* Request date
* Supporting attachment
* Approval workflow

# 33. Governance Body form

Fields:

* Body name
* Body code
* Body type
* Parent body
* Purpose
* Charter summary
* Chairperson
* Secretary
* Effective start date
* Effective end date
* Meeting frequency
* Quorum rule
* Voting method
* Default confidentiality
* Status
* Charter attachment

## Governance Membership form

Fields:

* Governance body
* User or external member
* Membership role
* Voting right
* Term start date
* Term end date
* Appointment reference
* Alternate member
* Permanent invitee
* Access level
* Status

# 34. Organization Unit form

Fields:

* Unit name
* Unit code
* Unit type
* Parent unit
* Reporting unit
* Head of unit
* Acting head
* Physical location
* Region
* Contact email
* Contact phone
* Meeting contact person
* Approval authority
* Effective date
* End date
* Status

# 35. User form

Remove visible NBR fields such as Circle, Zone and Tax Level.

Use:

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

Keep these concepts separate:

* Designation
* Position
* System role
* Committee role
* Meeting role

## User Assignment form

Fields:

* User
* Assignment type
* Position
* Organization unit
* Reports to
* Primary or secondary
* Permanent or acting
* Delegated authority
* Start date
* End date
* Status
* Remarks

# 36. Designation form

Fields:

* Designation name
* Designation code
* Grade
* Rank
* Seniority order
* Management level
* Description
* Status

# 37. Position form

Fields:

* Position title
* Position code
* Position type
* Organization level
* Organization unit
* Reports-to position
* Current holder
* Vacancy status
* Description
* Status

# 38. Participant Group form

Fields:

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
* Manually selected members
* Excluded members
* Default meeting role
* Default attendance requirement
* Default document access
* Status

# 39. External Participant Registration

Transform the existing public registration form.

Fields:

* Invitation code
* Full name
* NID or passport number
* Organization
* Designation
* Email
* Phone
* Country
* Related meeting
* Participant type
* Allowed agenda items
* Required documents
* Consent
* Declaration

This public page may remain a standalone public form because it is outside the authenticated application shell.

# 40. Custom Report form

Fields:

* Report name
* Report category
* Data source
* Metrics
* Dimensions
* Date range
* Filters
* Grouping
* Sorting
* Included columns
* Output format
* Schedule
* Recipients
* Visibility
* Status

# 41. Workflow form

Fields:

* Workflow name
* Workflow type
* Applies to
* Trigger
* Workflow owner
* Version
* Effective date
* Status

Repeatable workflow steps:

* Step name
* Sequence
* Approver source
* Approver user or role
* Sequential or parallel
* Minimum approvals
* Deadline
* Escalation recipient
* Delegation allowed
* Rejection outcome
* Revision route

# 42. Approval Rule form

Fields:

* Rule name
* Applies to
* Governance body
* Meeting type
* Approval mode
* Required approvers
* Minimum approvals
* Conditions
* Deadline
* Escalation
* Effective dates
* Status

# 43. Review and Revision Rule form

Fields:

* Rule name
* Applies to
* Required reviewers
* Review mode
* Review deadline
* Maximum revision cycles
* Mandatory comments
* Escalation
* Effective dates
* Status

# 44. Meeting Type form

Fields:

* Meeting type name
* Type code
* Category
* Governance body
* Default duration
* Default mode
* Default quorum rule
* Default voting method
* Approval workflow
* Numbering scheme
* Default agenda template
* Default confidentiality
* Recurrence allowed
* Status

# 45. Quorum Rule form

Fields:

* Rule name
* Governance body
* Rule type
* Minimum members
* Minimum percentage
* Required roles
* Include virtual attendance
* Include alternate members
* Exclude recused members
* Separate voting quorum
* Lost-quorum behavior
* Effective dates
* Status

# 46. Voting Method form

Fields:

* Method name
* Method code
* Voting type
* Voting options
* Eligible-voter rule
* Threshold
* Abstention treatment
* Tie handling
* Chairman casting vote
* Secret or open
* Proxy allowed
* Vote change allowed
* Result visibility
* Audit required
* Status

# 47. Status Configuration form

Fields:

* Entity type
* Status name
* Status code
* Badge tone
* Initial status
* Final status
* Allowed next statuses
* Roles allowed to transition
* Reason required
* Status order
* Status

# 48. Numbering Configuration form

Fields:

* Entity type
* Prefix
* Format pattern
* Included tokens
* Sequence length
* Starting number
* Reset frequency
* Sample preview
* Status

# 49. Template forms

## Meeting and Agenda Template

* Template name
* Template type
* Governance body
* Meeting type
* Agenda sections
* Agenda items
* Participant rules
* Duration
* Quorum
* Voting
* Notifications
* Language
* Status

## Minutes and Resolution Template

* Template name
* Template type
* Governance body
* Language
* Standard sections
* Numbering format
* Clauses
* Placeholders
* Approval workflow
* Signature requirements
* Status

## Document Template

* Template name
* Document category
* Template file
* Template fields
* Language
* Version
* Confidentiality
* Status

## Communication Template

* Template name
* Channel
* Trigger
* Audience
* Language
* Subject
* Message body
* Available placeholders
* Status

# 50. Notification Rule form

Fields:

* Rule name
* Trigger
* Related entity
* Related status
* Recipient logic
* Channels
* Timing
* Repeat frequency
* Escalation
* Message template
* Quiet-hours behavior
* Status

# 51. Message Template form

Fields:

* Template name
* Channel
* Language
* Subject
* Message body
* Available placeholders
* Preview data
* Status

# 52. Integration form

Fields:

* Integration name
* Integration type
* Provider
* Base URL
* Tenant or organization ID
* Authentication method
* Credential fields
* Synchronization direction
* Synchronization frequency
* Field mapping
* Test connection
* Status

Mask credential values after saving.

# 53. Security Policy form

Fields:

* Policy name
* Policy type
* Applies to
* MFA requirement
* Session timeout
* Password rules
* Device restrictions
* IP restrictions
* Failed-login threshold
* Document restrictions
* Download restrictions
* Print restrictions
* Review date
* Owner
* Status

# 54. Retention Policy form

Fields:

* Policy name
* Record type
* Retention period
* Retention start event
* Archive rule
* Disposal rule
* Legal-hold override
* Expiry notification
* Required approver
* Status

# 55. Legal Hold form

Fields:

* Hold title
* Reference
* Related legal matter
* Record scope
* Reason
* Owner or custodian
* Start date
* Review date
* Release date
* Notification recipients
* Supporting attachment
* Status

# 56. Attachment behavior

Creation:

* Allow valid file upload.
* Show selected file list.
* Allow removal before submission.
* Validate extension, MIME type, size and count.
* Prevent disguised invalid files using the existing validation system.

Edit:

* Preserve existing files.
* Show existing and newly selected files separately.
* Allow preview.
* Allow adding files.
* Allow removing permitted files.
* Allow replacing files.
* Do not remove old files when the user cancels.
* Preserve document versions and activity history.

# 57. Search, filters and KPI updates

After creation or edit:

* Add or update the record in the shared registry.
* Update the current table immediately.
* Recalculate dashboard cards.
* Keep the record searchable.
* Apply the current search query.
* Apply all active filters.
* Apply sorting.
* Preserve pagination where possible.
* Show the new record even when the current filter permits it.
* Explain when the created record is hidden by the active filter.

Fix generated-page filtering so applied filter values are used in the actual filtered-record calculation.

# 58. Activity and status history

Every important action must create a history entry containing:

* User
* User role
* Action
* Previous status
* New status
* Date and time
* Remarks or reason
* Related record
* Device or session data when already supported

Do not overwrite old history entries.

# 59. Permissions

Every creation, edit and action button must respect existing role permissions.

Examples:

* View
* Create
* Edit
* Approve
* Reject
* Publish
* Delete
* Archive
* Download
* Print
* Manage members
* Manage permissions
* Start meeting
* Record vote
* Close meeting

Hide unauthorized actions.

Do not only disable them visually while leaving the function executable.

# 60. EN and BN parity

Add or update translation keys for:

* Form titles
* Step titles
* Field labels
* Placeholders
* Helper text
* Validation errors
* Action buttons
* Confirmation messages
* Success messages
* Failure messages
* Drawer actions
* Status actions
* Empty states
* Unsaved-change warnings

Do not leave English Board Meeting fields connected to old Bangla tax-related labels.

Run the existing locale validation.

# 61. Files likely requiring changes

Inspect and update the relevant existing files, including:

* `src/app/pages/modulePageUtils.ts`
* `src/app/data/modulePageConfigs.ts`
* `src/app/components/pages/GeneratedTablePage.tsx`
* `src/app/components/forms/EntryForm.tsx`
* `src/app/components/modals/AppModal.tsx`
* `src/app/components/drawers/DynamicDetailsDrawer.tsx`
* `src/app/components/tables/ResponsiveTable.tsx`
* `src/app/components/tables/UnifiedMobileCard.tsx`
* Existing form-field components
* Existing attachment components
* Existing confirmation components
* Existing page files with `entryBtn`
* Existing User form and registry
* Existing Role form and registry
* Existing Permission form and registry
* Existing external registration files
* Existing report configuration
* Existing status configuration
* Existing notification configuration
* EN and BN translation files

Do not rename, move or delete these files.

# 62. Acceptance checklist

The implementation is complete only when:

* Every required page has the correct contextual Create/Add button.
* Read-only pages have no Add button.
* Every creation flow opens a full-page modal.
* Every feature uses its own form fields.
* Long forms use safe step-based flows.
* Simple forms do not use unnecessary steppers.
* Every form supports required validation.
* Field dependencies work.
* Repeatable groups work.
* File validation works.
* Creation saves a real record.
* Created records remain after navigation.
* Related pages share the same data.
* Tables update immediately.
* KPI cards update immediately.
* Search and filters work with created records.
* Details open in a drawer.
* Edit opens the same creation form with existing data.
* Edit preserves IDs, history and relationships.
* Drawer actions work.
* Approve works.
* Reject requires a reason.
* Request Revision works.
* Publish works.
* Duplicate works.
* Delete uses confirmation.
* Attachments remain safe during Edit and Cancel.
* Permissions control all actions.
* EN and BN labels match.
* Mobile full-page forms work.
* Mobile cards still open drawers.
* Desktop action columns remain last.
* No separate Create or Edit navigation pages are added.
* No existing API contract is changed.
* No project file or folder is moved.
* No existing theme or component style is replaced.
* The application builds without TypeScript errors.
* Existing tests continue to pass.
* Desktop and mobile regressions are checked.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not rename, move or delete existing files.
* Do not change the project architecture.
* Do not change APIs or service contracts.
* Do not remove working features.
* Reuse existing components and styles.
* Reuse existing confirmation, attachment and drawer patterns.
* Use one shared Create/Edit flow per entity.
* Keep all internal creation inside full-page modals.
* Keep all details inside drawers.
* Keep Edit connected to the details drawer.
* Do not create separate Create, View or Edit navigation pages.
* Do not use one generic form for unrelated entities.
* Do not use blind text replacement.
* Preserve existing responsive behavior.
* Preserve all themes.
* Preserve EN/BN parity.
* Preserve search, filters, sorting and pagination.
* Preserve historical records and versions.
* Test desktop and mobile after every shared-component change.
* Make shared-component changes carefully because they affect many pages.
* Finish one reusable foundation before applying it to all feature configurations.
