You are working inside a duplicated version of the existing NBR Office Management project.

Your task is to transform this project into the **NCC Bank Board Meeting Solution** in controlled phases.

Do not redesign the project yet. First convert the complete product identity, text, content, data, navigation, pages, tables, forms, drawers, modals, roles, permissions, notifications, help content, and visible branding from NBR Office Management into a board-meeting solution.

The final product must not feel like a renamed tax-management system. Every page must have a clear and realistic purpose within an NCC Bank board-meeting workflow.

## Main objective

Transform all user-visible NBR Office Management content into a complete NCC Bank Board Meeting Solution while preserving the existing:

* Layouts
* Components
* Theme system
* Typography
* Responsive behaviour
* Mobile card patterns
* Tables
* Drawers
* Modals
* Forms
* Filters
* Search
* Pagination
* APIs
* Routes
* State management
* Business logic
* Existing working interactions

Do not perform blind word replacement. Understand the purpose of every existing page and carefully repurpose it into a relevant board-meeting page.

Complete the work phase by phase in the exact order below.

---

# Phase 1: Project audit and conversion map

Before editing anything, inspect the full project.

Review:

* File and folder structure
* Navigation configuration
* Route configuration
* Page components
* Shared components
* Dashboard components
* Table configurations
* Mobile card configurations
* Drawers
* Modals
* Forms
* Filters
* Mock data
* Roles
* Permissions
* Notifications
* Help and user-guide content
* English translations
* Bangla translations
* Logos and images
* Local-storage keys
* Tests
* API and service files

Create an internal conversion map for every existing NBR page.

For each page, identify:

* Current NBR purpose
* New board-meeting purpose
* New page title
* New description
* New navigation label
* New table columns
* New filter options
* New mock data
* New drawer information
* New form fields
* Relevant actions
* Relevant permissions
* English and Bangla text requirements

Do not make visual changes during this phase.

Do not remove any page before deciding whether it can be reused for a board-meeting workflow.

---

# Phase 2: Product identity and global text

Change the complete visible product identity to:

**NCC Bank Board Meeting Solution**

Replace all visible references to:

* NBR
* National Board of Revenue
* Office Management
* Tax Office
* Taxpayer
* Tax Return
* e-Return
* TIN
* Tax Circle
* Tax Zone
* Assessment Year
* PSR
* Tax Certificate
* Tax Appeal
* Tax Tribunal
* Litigation
* Tax Registration
* Return Submission
* Income Tax
* Tax-related services
* Tax-related notices
* Tax-related API names

Update:

* Browser title
* Application name
* Login-page heading
* Login-page description
* Header branding
* Sidebar branding
* Mobile header branding
* Footer text
* Breadcrumb labels
* Page titles
* Page subtitles
* Empty-state text
* Loading messages
* Error messages
* Confirmation messages
* Toast messages
* Notification text
* Search placeholders
* Filter labels
* Button labels
* Form helper text
* Validation text

Use professional banking and board-governance language.

Do not change component dimensions, spacing, layout, theme, or interaction behaviour.

Keep internal technical filenames, route paths, function names, API structures, and storage keys unchanged during this phase unless changing them is absolutely required to prevent visible NBR content.

---

# Phase 3: Navigation and information architecture

Transform the existing navigation into a complete board-meeting navigation structure.

Use the current navigation hierarchy and visual behaviour. Do not create a new sidebar design.

Organize the product around these main modules:

## Dashboard

* Board Meeting Dashboard

## Meeting Management

* All Meetings
* Upcoming Meetings
* Previous Meetings
* Meeting Calendar
* Create Meeting
* Meeting Schedule
* Meeting Invitations

## Agenda Management

* Agenda Items
* Draft Agenda
* Agenda Review
* Approved Agenda
* Deferred Agenda Items
* Agenda Templates

## Board Papers and Documents

* Board Papers
* Meeting Documents
* Supporting Documents
* Confidential Documents
* Document Review
* Document Approval
* Document Archive

## Participants

* Board Members
* Committee Members
* Management Participants
* Invited Guests
* External Participants
* Attendance Records

## Meeting Execution

* Meeting Details
* Attendance
* Quorum Status
* Agenda Discussion
* Voting
* Decisions
* Meeting Notes

## Minutes and Resolutions

* Draft Minutes
* Minutes Review
* Approved Minutes
* Resolutions
* Resolution Register
* Decision Register
* Resolution Circulation

## Action Items

* All Action Items
* Assigned Actions
* Pending Actions
* Overdue Actions
* Completed Actions
* Action Follow-up

## Committees

* Board Committees
* Committee Meetings
* Committee Members
* Committee Documents
* Committee Resolutions

## Reports

* Meeting Reports
* Attendance Reports
* Resolution Reports
* Action Item Reports
* Committee Reports
* Document Reports
* Audit Trail

## Administration

* User Management
* Role Management
* Permission Management
* Notification Settings
* Meeting Settings
* Document Settings
* System Settings
* Help and User Guide

Reuse the current menu grouping, expand/collapse behaviour, icons, active states, spacing, and responsive navigation.

Do not add duplicate navigation items.

Every navigation item must open a relevant page.

---

# Phase 4: Dashboard conversion

Convert the existing dashboard into an NCC Bank Board Meeting Dashboard.

Keep the existing dashboard structure, cards, charts, lists, tables, responsiveness, and spacing.

Replace all tax-related dashboard content with board-meeting information.

Use relevant KPI cards such as:

* Upcoming Meetings
* Meetings This Month
* Pending Agenda Items
* Documents Awaiting Review
* Draft Minutes
* Pending Resolutions
* Open Action Items
* Overdue Action Items
* Attendance Rate
* Active Committees

Convert recent activity into realistic entries such as:

* Agenda item submitted
* Board paper uploaded
* Meeting invitation sent
* Document approved
* Minutes sent for review
* Resolution approved
* Action item assigned
* Action deadline updated
* Committee meeting scheduled
* Attendance confirmed

Convert charts into suitable board-meeting data such as:

* Meetings by month
* Action items by status
* Resolutions by status
* Attendance trend
* Documents by approval status
* Committee meeting distribution

Use realistic NCC Bank board-meeting mock data.

Do not change the chart library or chart structure unless the current chart cannot support the new labels.

---

# Phase 5: Meeting-management pages

Repurpose the most suitable existing pages into meeting-management pages.

Every meeting record should support relevant information such as:

* Meeting ID
* Meeting title
* Meeting type
* Meeting number
* Committee or board name
* Meeting date
* Start time
* End time
* Venue
* Meeting mode
* Chairperson
* Secretary
* Participants
* Quorum requirement
* Quorum status
* Agenda status
* Document status
* Meeting status
* Created by
* Last updated

Use meeting statuses such as:

* Draft
* Scheduled
* Invitation Sent
* Confirmed
* In Progress
* Completed
* Postponed
* Cancelled
* Awaiting Minutes
* Closed

Relevant actions may include:

* View
* Edit
* Duplicate
* Send Invitation
* Reschedule
* Start Meeting
* Mark Complete
* Postpone
* Cancel
* Archive

Keep current action-button patterns.

Do not add actions that are unrelated to the page.

The mobile card must display the most important meeting information and open the detail view when the card is clicked, following the existing project pattern.

---

# Phase 6: Agenda-management pages

Convert suitable pages into agenda-management workflows.

Agenda records should contain:

* Agenda ID
* Agenda title
* Meeting
* Agenda category
* Submitted by
* Department
* Presenter
* Estimated duration
* Priority
* Supporting documents
* Submission date
* Review status
* Approval status
* Final sequence
* Remarks

Use agenda statuses such as:

* Draft
* Submitted
* Under Review
* Revision Required
* Approved
* Rejected
* Deferred
* Included in Meeting
* Discussed
* Closed

Relevant actions may include:

* View
* Edit
* Submit
* Review
* Request Revision
* Approve
* Reject
* Defer
* Add to Meeting
* Reorder
* Archive

Agenda pages must clearly distinguish between:

* Draft agenda items
* Submitted items
* Approved items
* Deferred items
* Items already attached to a meeting

Preserve the current table, filter, drawer, and modal patterns.

---

# Phase 7: Board papers and document management

Convert all suitable file-based and attachment-based workflows into board-paper and meeting-document management.

Document records should support:

* Document ID
* Document title
* Document type
* Related meeting
* Related agenda item
* Committee
* Uploaded by
* Version
* Confidentiality level
* Review status
* Approval status
* Uploaded date
* File size
* File type
* Last updated

Document types may include:

* Board Paper
* Agenda Note
* Financial Report
* Committee Report
* Policy Paper
* Approval Note
* Presentation
* Supporting Document
* Draft Minutes
* Approved Minutes
* Resolution Copy

Confidentiality levels may include:

* General
* Internal
* Confidential
* Highly Confidential
* Board Members Only

Relevant actions may include:

* View
* Preview
* Download
* Upload New Version
* Edit Metadata
* Submit for Review
* Approve
* Reject
* Share
* Archive

Preserve all existing file-upload validation, file-preview, attachment, download, and security behaviour.

Do not weaken file validation.

Do not remove MIME-type or disguised-file protection.

---

# Phase 8: Participants, board members, and attendance

Convert suitable user, registration, or taxpayer-related pages into participant-management pages.

Participant types may include:

* Board Member
* Chairman
* Managing Director
* Company Secretary
* Committee Member
* Executive Management
* Meeting Secretary
* Invited Guest
* External Adviser
* Auditor
* Presenter
* Observer

Participant records should support:

* Member ID
* Name
* Designation
* Participant type
* Committee
* Department
* Email
* Phone
* Attendance status
* Voting eligibility
* Active status
* Term start date
* Term end date

Attendance statuses may include:

* Invited
* Confirmed
* Declined
* Present
* Absent
* Joined Remotely
* Left Early
* Excused

Convert the existing public special-registration workflow into an appropriate workflow for:

* External Participant Registration
* Invited Guest Confirmation
* Meeting Attendance Confirmation

Remove Bangladesh from the country dropdown only if this behaviour already exists as a requirement in the current duplicated project. Do not modify country logic unnecessarily.

---

# Phase 9: Minutes, decisions, resolutions, and voting

Convert suitable approval, notice, certificate, appeal, or case-management pages into minutes and resolution workflows.

## Minutes records

Include:

* Minutes ID
* Meeting
* Meeting date
* Prepared by
* Version
* Review status
* Approval status
* Circulation date
* Approved date

Minutes statuses:

* Draft
* Under Review
* Revision Required
* Approved
* Circulated
* Archived

## Resolution records

Include:

* Resolution number
* Resolution title
* Related meeting
* Related agenda item
* Decision date
* Proposed by
* Seconded by
* Voting result
* Approval status
* Effective date
* Responsible department
* Follow-up required

Resolution statuses:

* Draft
* Proposed
* Approved
* Rejected
* Deferred
* In Progress
* Implemented
* Closed

## Voting records

Include:

* Voting topic
* Eligible voters
* Votes in favour
* Votes against
* Abstained
* Not present
* Voting method
* Result
* Recorded by

Relevant actions may include:

* View
* Edit
* Submit for Review
* Approve
* Request Revision
* Circulate
* Record Vote
* Publish Resolution
* Create Action Item
* Archive

Do not create voting actions for users without voting permission.

---

# Phase 10: Action-item management

Convert suitable task, assignment, follow-up, or status-tracking pages into board action-item management.

Action-item records should support:

* Action ID
* Action title
* Related meeting
* Related agenda item
* Related resolution
* Assigned department
* Assigned person
* Created date
* Due date
* Priority
* Progress
* Status
* Latest update
* Completion date
* Evidence or attachment

Use statuses such as:

* Not Started
* In Progress
* Pending Review
* Blocked
* Overdue
* Completed
* Closed
* Cancelled

Use priorities such as:

* Low
* Medium
* High
* Urgent

Relevant actions may include:

* View
* Edit
* Assign
* Reassign
* Update Progress
* Add Comment
* Upload Evidence
* Mark Complete
* Reopen
* Close

Dashboard and reports must use the same action-item statuses and terminology.

---

# Phase 11: Committees

Convert suitable zone, circle, office, or organizational pages into committee-management pages.

Committee records should support:

* Committee ID
* Committee name
* Committee type
* Chairperson
* Secretary
* Number of members
* Meeting frequency
* Active meetings
* Pending actions
* Status
* Created date

Committee types may include:

* Board of Directors
* Executive Committee
* Audit Committee
* Risk Management Committee
* Shariah Supervisory Committee
* Nomination and Remuneration Committee
* Other Board Committee

Relevant actions may include:

* View
* Edit
* Manage Members
* Schedule Meeting
* View Documents
* View Resolutions
* Deactivate
* Archive

Do not create fake organizational structures that do not match a bank board-meeting system.

---

# Phase 12: Roles and permissions

Convert all NBR-specific roles and permissions into board-meeting roles.

Use suitable roles such as:

* System Administrator
* Board Chairman
* Board Member
* Managing Director
* Company Secretary
* Meeting Secretary
* Committee Chairman
* Committee Member
* Agenda Coordinator
* Document Manager
* Reviewer
* Approver
* Action Owner
* Auditor
* Observer
* External Participant

Permission groups should include:

## Meeting permissions

* View meetings
* Create meetings
* Edit meetings
* Reschedule meetings
* Cancel meetings
* Start meetings
* Close meetings
* Send invitations

## Agenda permissions

* View agenda items
* Create agenda items
* Edit agenda items
* Submit agenda items
* Review agenda items
* Approve agenda items
* Reject agenda items
* Defer agenda items
* Reorder agenda items

## Document permissions

* View documents
* Upload documents
* Download documents
* Edit document metadata
* Upload new versions
* Review documents
* Approve documents
* Archive documents
* Access confidential documents

## Minutes and resolution permissions

* View minutes
* Draft minutes
* Review minutes
* Approve minutes
* Circulate minutes
* Create resolutions
* Approve resolutions
* Publish resolutions

## Voting permissions

* View voting records
* Cast vote
* Record vote
* Manage voting session
* View voting result

## Action-item permissions

* View action items
* Create action items
* Assign action items
* Update action items
* Review completion
* Close action items
* Reopen action items

## Administration permissions

* Manage users
* Manage roles
* Manage permissions
* Manage committees
* Manage settings
* View audit logs
* Export reports

Remove all visible tax-service names, tax endpoints, TIN permissions, return permissions, zone permissions, and circle permissions.

Keep the current role and permission UI unchanged unless a small layout adjustment is required for the new text length.

---

# Phase 13: Reports and audit trail

Convert existing reports into board-meeting reports.

Include suitable report pages such as:

* Meeting Summary Report
* Meeting Attendance Report
* Agenda Status Report
* Document Approval Report
* Resolution Status Report
* Action Item Status Report
* Overdue Action Report
* Committee Activity Report
* Member Participation Report
* Audit Trail Report

Report filters may include:

* Date range
* Meeting type
* Meeting status
* Committee
* Participant
* Department
* Agenda status
* Resolution status
* Action status
* Priority
* Confidentiality level

Keep current export, print, pagination, table, and filter behaviour.

Replace all report data with realistic board-meeting information.

---

# Phase 14: Notifications and activities

Convert every notification and activity entry into relevant board-meeting events.

Examples:

* A new meeting has been scheduled.
* Your attendance confirmation is pending.
* A board paper is awaiting your review.
* An agenda item requires revision.
* Meeting documents are now available.
* Draft minutes are ready for review.
* A resolution has been approved.
* An action item has been assigned to you.
* An action item is overdue.
* A committee meeting has been postponed.
* A confidential document was updated.
* The meeting venue has changed.

Ensure notification actions open the correct page or detail view.

Do not leave any tax-related notification text.

---

# Phase 15: Help content and user guide

Rewrite the complete help centre and user-guide content.

Remove all NBR, tax-return, TIN, zone, circle, certificate, and taxpayer instructions.

Create help topics for:

* Dashboard overview
* Creating a meeting
* Scheduling and rescheduling meetings
* Sending invitations
* Confirming attendance
* Managing quorum
* Creating agenda items
* Reviewing and approving agenda items
* Uploading board papers
* Managing document versions
* Reviewing confidential documents
* Conducting a meeting
* Recording attendance
* Recording decisions
* Managing voting
* Preparing minutes
* Reviewing and approving minutes
* Creating resolutions
* Assigning action items
* Updating action progress
* Managing committees
* Managing users and roles
* Generating reports
* Managing notifications
* Language and theme settings

Use the existing FAQ and guide layouts.

Do not create a new help-centre design.

---

# Phase 16: English and Bangla language parity

Update both English and Bangla content.

Requirements:

* Every English label must have a matching Bangla label.
* Every Bangla label must have a matching English label.
* Translation keys must remain synchronized.
* Do not leave tax-related fallback text inside components.
* Do not mix English and Bangla within the same sentence unless it is a proper name or approved technical term.
* Keep dates, times, numbers, statuses, filters, table columns, validation messages, buttons, and notifications consistent in both languages.
* Fix missing or mismatched breadcrumb keys.
* Check text overflow in both languages.
* Preserve the current language-switching method.

Use clear professional Bangla suitable for banking and corporate governance.

---

# Phase 17: Branding assets

Replace all visible NBR branding.

Replace:

* NBR logo
* National Board of Revenue name
* Tax-related login illustrations
* Tax-related public-page images
* Any visible NBR screenshot
* Any visible tax-return illustration

Use:

* NCC Bank Board Meeting Solution branding
* Neutral boardroom imagery
* Meeting-related illustrations
* Document-review imagery
* Committee-meeting imagery
* Secure governance-related imagery

Preserve the current:

* Image containers
* Aspect ratios
* Logo placement
* Header height
* Login layout
* Responsive behaviour
* Theme behaviour

Do not redesign the login page.

If the official NCC Bank logo is not available inside the project, use a temporary text-based brand placeholder and keep the asset replacement isolated so the official logo can be inserted later.

Do not invent a new colour system. Continue using the existing project theme.

---

# Phase 18: Global NBR-remnant cleanup

Run a complete project-wide search for visible or data-level remnants related to:

* NBR
* National Board of Revenue
* Tax
* Taxpayer
* TIN
* e-Return
* Return Submission
* Income Tax
* Assessment Year
* Circle
* Zone
* PSR
* Certificate
* Appeal
* Tribunal
* Litigation
* Tax Office
* Tax Commissioner
* Deputy Commissioner of Taxes
* Tax-related endpoints
* Tax-related mock names
* Tax-related images
* Tax-related help content
* Tax-related notifications
* Tax-related placeholders

Inspect:

* Source files
* Translation files
* Mock data
* Tests
* Comments that appear in the UI
* Image alt text
* Browser metadata
* Public files
* Documentation
* Table exports
* Print views
* Empty states
* Error states
* Mobile-only content
* Desktop-only content
* Hidden drawers and modals

No user-visible trace of NBR Office Management may remain.

Internal technical names may remain temporarily only when renaming them creates unnecessary structural risk and they are never visible to users.

---

# Phase 19: Consistency and responsive verification

After conversion, check every page on desktop and mobile.

Verify:

* Page titles match navigation labels.
* Breadcrumbs match page titles.
* Dashboard terminology matches table terminology.
* Table columns match drawer fields.
* Mobile cards show the same records as desktop tables.
* Filters use the same statuses as the data.
* Drawer actions match table actions.
* Forms use the correct board-meeting fields.
* Empty states describe the correct module.
* Notifications open the correct destination.
* Role permissions control the correct actions.
* English and Bangla versions match.
* Text does not overflow.
* Long meeting and document titles wrap properly.
* Mobile drawers and bottom sheets behave consistently.
* Buttons remain accessible.
* Tap targets remain usable.
* Loading, error, disabled, and validation states remain functional.
* Dark mode remains readable.
* Font-size switching remains functional.
* Existing APIs and business logic are not broken.

Do not redesign inconsistent pages during this phase. Only correct content, mapping, and component-consistency issues.

---

# Phase 20: Build, tests, and final report

Run:

* Production build
* Existing automated tests
* Type checking
* Linting
* Route verification
* Translation-key validation
* Responsive checks
* Search for NBR remnants

The current project baseline has a successful production build and 98 passing tests. The completed conversion must not reduce this stability.

Fix any test failures caused by renamed visible content or changed mock data.

Do not delete tests simply to make the test suite pass.

At completion, provide a concise report containing:

* Pages converted
* Navigation items converted
* Roles converted
* Permissions converted
* Translation files updated
* Branding assets replaced
* Remaining internal technical names
* Build result
* Test result
* Any issue that could not be safely changed

---

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not remove working features.
* Do not redesign the UI during the content-conversion phase.
* Do not perform blind find-and-replace.
* Do not rename routes, APIs, components, or storage keys unless required.
* Preserve all existing layouts and responsive behaviour.
* Preserve desktop and mobile functionality.
* Reuse existing components and styles.
* Preserve theme, font, font-size, and language-switching systems.
* Preserve file-upload and file-security checks.
* Keep tables, mobile cards, drawers, forms, and filters synchronized.
* Use realistic NCC Bank board-meeting content.
* Keep EN/BN language parity.
* Test every phase before continuing.
* Complete phases in the exact order provided.
* Do not leave any user-visible NBR Office Management trace.
