You are working inside the existing duplicated project named **Board Meeting Solution**.

Your task is to complete a **content and UX-writing-only transformation** from the former NBR Office Management System into the **NCC Bank Board Meeting Solution**.

The current project still contains visible NBR, tax, taxpayer, return, TIN, circle, zone, assessment, appeal, tribunal, litigation, and tax-office language. Remove all such user-visible content and replace it with clear, realistic board-meeting content.

Do not redesign, restructure, or rebuild the application. Work only on visible text, mock content, labels, statuses, descriptions, and UX writing.

## Main objective

After this task, every visible page, table, mobile card, drawer, modal, form, notification, report, help article, and translated label must feel like part of a professional **NCC Bank Board Meeting Solution**.

A user must not see any NBR or tax-related wording anywhere in the interface.

Do not perform blind find-and-replace. Understand the purpose of each page and rewrite its complete content so the title, description, fields, columns, statuses, records, actions, and detail view all describe the same board-meeting workflow.

---

## Strict scope

Change only user-visible content, including:

* Product name
* Browser title and text metadata
* Navigation labels
* Breadcrumbs
* Page titles
* Page subtitles and descriptions
* Dashboard cards
* Dashboard charts and legends
* Recent activity
* Table column labels
* Table row values
* Mobile card text
* Search placeholders
* Filter labels
* Filter options
* Dropdown options
* Form labels
* Form placeholders
* Helper text
* Validation messages
* Drawer headings and fields
* Modal headings and body text
* Confirmation messages
* Button and action labels
* Empty states
* Loading states
* Error states
* Disabled-state messages
* Toast messages
* Notifications
* User names
* User roles
* Designations
* Departments
* Email examples
* Permission names and descriptions
* Report titles, columns, filters, and records
* Help-centre articles
* FAQ content
* User-guide content
* English translations
* Bangla translations
* Mock data shown in the interface
* Accessible labels and image alt text containing tax wording

---

## Do not change

Do not change or redesign:

* Page layouts
* Component structure
* Theme
* Colours
* Typography
* Spacing
* Icons
* Tables
* Mobile cards
* Drawers
* Modals
* Forms
* Navigation behaviour
* Responsive behaviour
* Desktop behaviour
* Mobile behaviour
* Routes
* Route paths
* APIs
* Services
* State-management logic
* Permission logic
* Validation logic
* File-upload logic
* File-security checks
* Pagination
* Search behaviour
* Filter behaviour
* Button functionality
* Existing working interactions
* Logos or image assets
* Component filenames
* Internal function names
* Internal storage keys
* Internal technical identifiers that users cannot see

Internal names may remain temporarily when they are not displayed anywhere in the interface.

---

## Audit before editing

First, inspect the full project and identify all visible content sources.

Pay special attention to:

* `src/app/data/navigation.ts`
* `src/app/data/modulePageConfigs.ts`
* `src/app/data/mockData.ts`
* `src/app/data/permissions.ts`
* `src/app/data/helpContent/index.ts`
* `src/app/store/currentUserSlice.ts`
* Report configurations
* Page-level table configurations
* Form configurations
* Drawer configurations
* Modal content
* Dashboard content
* Notification data
* English locale files
* Bangla locale files
* Public page content
* Login-page written content
* `index.html`
* Hard-coded fallback strings inside components
* Mobile-only labels
* Desktop-only labels
* Hidden modal and drawer content
* Exported table headings
* Print-view text
* Accessibility labels

Do not assume all text is inside translation files. Search for hard-coded content in components and mock-data files.

---

## Required product identity

Use the full product name:

**NCC Bank Board Meeting Solution**

Use shorter forms only where space is limited:

* Board Meeting Solution
* Meeting Management
* Board Portal

Do not use vague replacements such as:

* Office Management
* Management System
* Meeting System Submission
* Board Meeting Tax
* Tax Paid With Meeting
* Meeting ID Certificate

Every replacement must make sense in a real board-meeting workflow.

---

## Required board-meeting content model

Rewrite the existing pages around these board-meeting areas.

### Dashboard

Use content such as:

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

Recent activity examples:

* A new board meeting was scheduled.
* A board paper was uploaded.
* An agenda item was submitted for review.
* A meeting invitation was sent.
* Attendance was confirmed.
* Draft minutes were submitted for approval.
* A resolution was approved.
* An action item was assigned.
* An action deadline was updated.
* A committee meeting was postponed.

### Meetings

Use relevant fields such as:

* Meeting ID
* Meeting Title
* Meeting Number
* Meeting Type
* Board or Committee
* Meeting Date
* Start Time
* End Time
* Venue
* Meeting Mode
* Chairperson
* Meeting Secretary
* Participants
* Quorum Status
* Agenda Status
* Document Status
* Meeting Status
* Created By
* Last Updated

Meeting statuses:

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

### Agenda items

Use relevant fields such as:

* Agenda ID
* Agenda Title
* Related Meeting
* Agenda Category
* Submitted By
* Department
* Presenter
* Estimated Duration
* Priority
* Supporting Documents
* Submission Date
* Review Status
* Approval Status
* Agenda Sequence
* Remarks

Agenda statuses:

* Draft
* Submitted
* Under Review
* Revision Required
* Approved
* Rejected
* Deferred
* Added to Meeting
* Discussed
* Closed

### Board papers and documents

Use fields such as:

* Document ID
* Document Title
* Document Type
* Related Meeting
* Related Agenda Item
* Committee
* Uploaded By
* Version
* Confidentiality Level
* Review Status
* Approval Status
* Upload Date
* File Size
* File Type
* Last Updated

Document types:

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

Confidentiality levels:

* General
* Internal
* Confidential
* Highly Confidential
* Board Members Only

### Participants

Use participant types such as:

* Board Chairman
* Board Member
* Managing Director
* Company Secretary
* Meeting Secretary
* Committee Chairman
* Committee Member
* Executive Management
* Invited Guest
* External Adviser
* Auditor
* Presenter
* Observer

Participant fields:

* Member ID
* Name
* Designation
* Participant Type
* Committee
* Department
* Email
* Phone
* Attendance Status
* Voting Eligibility
* Active Status
* Term Start Date
* Term End Date

Attendance statuses:

* Invited
* Confirmed
* Declined
* Present
* Absent
* Joined Remotely
* Left Early
* Excused

### Minutes and resolutions

Minutes fields:

* Minutes ID
* Meeting
* Meeting Date
* Prepared By
* Version
* Review Status
* Approval Status
* Circulation Date
* Approved Date

Minutes statuses:

* Draft
* Under Review
* Revision Required
* Approved
* Circulated
* Archived

Resolution fields:

* Resolution Number
* Resolution Title
* Related Meeting
* Related Agenda Item
* Decision Date
* Proposed By
* Seconded By
* Voting Result
* Approval Status
* Effective Date
* Responsible Department
* Follow-up Required

Resolution statuses:

* Draft
* Proposed
* Approved
* Rejected
* Deferred
* In Progress
* Implemented
* Closed

### Voting

Use fields such as:

* Voting Topic
* Eligible Voters
* Votes in Favour
* Votes Against
* Abstained
* Not Present
* Voting Method
* Result
* Recorded By

### Action items

Use fields such as:

* Action ID
* Action Title
* Related Meeting
* Related Agenda Item
* Related Resolution
* Assigned Department
* Assigned Person
* Created Date
* Due Date
* Priority
* Progress
* Status
* Latest Update
* Completion Date
* Evidence or Attachment

Action statuses:

* Not Started
* In Progress
* Pending Review
* Blocked
* Overdue
* Completed
* Closed
* Cancelled

Priorities:

* Low
* Medium
* High
* Urgent

### Committees

Use fields such as:

* Committee ID
* Committee Name
* Committee Type
* Chairperson
* Secretary
* Number of Members
* Meeting Frequency
* Active Meetings
* Pending Actions
* Status
* Created Date

Committee types:

* Board of Directors
* Executive Committee
* Audit Committee
* Risk Management Committee
* Shariah Supervisory Committee
* Nomination and Remuneration Committee
* Other Board Committee

### Reports

Use report names such as:

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

Do not leave tax-shaped data structures visible under renamed headings. For example, do not display tax amounts, TDS, AIT, assessment dates, demand numbers, appeal numbers, tribunal numbers, tax years, circles, or zones inside a meeting report.

---

## Navigation writing

Rewrite the visible navigation into board-meeting terminology while preserving the existing hierarchy and navigation components.

Use suitable navigation labels from these areas:

* Dashboard
* Meetings
* Agenda Management
* Board Papers
* Participants
* Meeting Execution
* Minutes and Resolutions
* Action Items
* Committees
* Reports
* User Management
* Role Management
* Permission Management
* Settings
* Help and User Guide

Do not leave labels such as:

* Misfiled Returns
* Return Register
* Online Return
* Offline Return
* Litigation Management
* Appeal
* Tribunal
* Arrear Approval
* Writ Case Approval
* Demand and Payment
* Certificate Requests
* Tax Registry
* Register-4
* Register-5
* Other Circles Entry
* Out of Jurisdiction

Each navigation label, page title, breadcrumb, table, and drawer must refer to the same board-meeting workflow.

---

## User, role, and permission writing

Replace tax-office roles and designations with board-meeting roles.

Remove visible roles such as:

* Tax Commissioner
* Circle Officer
* Senior Commissioner
* Deputy Commissioner of Taxes
* Assistant Commissioner of Taxes
* Income Tax Officer
* Tax Data Entry Operator
* Return Data Entry
* Tax Zone Manager

Use roles such as:

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

Use realistic departments such as:

* Board Secretariat
* Corporate Affairs
* Risk Management
* Internal Control and Compliance
* Finance and Accounts
* Human Resources
* Information Technology
* Legal Affairs
* Credit Risk Management
* Treasury
* Audit and Inspection

Replace all visible `@nbr.gov.bd` addresses with suitable placeholder addresses under NCC Bank’s domain pattern already used by the project.

Do not invent or expose real personal contact information.

Permission names and descriptions must cover:

* Meetings
* Agenda items
* Documents
* Minutes
* Resolutions
* Voting
* Action items
* Committees
* Reports
* Users
* Roles
* Permissions
* Settings
* Audit logs

Remove tax endpoints, TIN permissions, return permissions, zone permissions, circle permissions, assessment permissions, appeal permissions, and tribunal permissions from all visible permission content.

---

## Current user content

Update the visible signed-in user profile content.

Remove:

* Circle Officer
* NBR email address
* Circle assignment
* Tax zone assignment
* Tax-office designation

Use realistic board-meeting content such as:

* Name: Rafiqul Islam
* Designation: Meeting Secretary
* Department: Board Secretariat
* Organization: NCC Bank PLC
* Role: Meeting Administrator

Keep the existing profile structure and logic unchanged.

---

## Special-registration content

Rewrite all visible special-registration content into an appropriate board-meeting workflow.

Use one clear purpose:

**Invited Participant Registration and Attendance Confirmation**

Rewrite:

* Page title
* Instructions
* Participant information
* Identification information
* Meeting information
* Invitation reference
* Contact details
* Confirmation consent
* Attachment labels
* Validation messages
* Success message
* Error message
* Buttons
* English text
* Bangla text

Remove all references to:

* Taxpayer
* TIN
* TIN Certificate
* 12-digit TIN
* NBR authorization
* Tax registration
* e-Return Office
* Return submission
* Taxpayer information

Do not use meaningless replacements such as “Meeting ID Certificate.”

Use realistic fields such as:

* Invitation Reference
* Participant Name
* Organization
* Designation
* Email
* Phone Number
* Country
* Identification Type
* Identification Number
* Related Meeting
* Attendance Mode
* Attendance Confirmation
* Supporting Document

Do not change the form layout or logic in this phase.

---

## Help centre and user guide

Rewrite the complete visible help content.

Do not partially rename tax help articles. Replace their full meaning with board-meeting guidance.

Create relevant topics such as:

* Dashboard overview
* Creating a meeting
* Scheduling or rescheduling a meeting
* Sending invitations
* Confirming attendance
* Managing quorum
* Creating an agenda item
* Reviewing an agenda item
* Approving or deferring an agenda item
* Uploading board papers
* Managing document versions
* Accessing confidential documents
* Recording attendance
* Recording discussions
* Managing voting
* Preparing draft minutes
* Reviewing and approving minutes
* Creating resolutions
* Assigning action items
* Updating action progress
* Managing committees
* Managing users and roles
* Generating reports
* Viewing the audit trail
* Managing notifications
* Changing language, theme, and font size

Remove all help content related to:

* Tax return submission
* e-filing
* Paper returns
* Tax certificates
* Commissioner of Taxes
* Tax assessment
* Tax liability
* Appeals
* Tribunal
* Litigation
* Demand notices
* Refunds
* Tax audits
* Return books
* Assessment years
* Tax jurisdiction
* Tax circles
* Tax zones

---

## English and Bangla parity

Update both English and Bangla content completely.

Requirements:

* Every English key must have a matching Bangla key.
* Every Bangla key must have a matching English key.
* Keep the same translation-key structure.
* Fix corrupted keys caused by earlier blind replacement.
* Do not insert translated words inside technical translation keys.
* Translation keys must remain in clean English camelCase or the project’s existing key format.
* Do not leave English tax fallback text inside Bangla pages.
* Do not leave Bangla tax text inside English pages.
* Keep status meanings consistent across both languages.
* Keep table labels, filters, actions, drawers, forms, notifications, and validation messages aligned.
* Check text length and wrapping without changing layouts.

Fix corrupted keys such as any key containing mixed text similar to:

* `offlinবোর্ড...`
* `onlinবোর্ড...`
* `approvবোর্ড...`

Restore clean and matching technical keys in both locale files.

Use professional Bangla suitable for banking, board governance, and corporate administration.

---

## UX-writing standards

All visible writing must be:

* Clear
* Direct
* Professional
* Consistent
* Suitable for a bank
* Suitable for board members and senior management
* Easy to understand
* Action-oriented where appropriate

Avoid:

* Tax wording disguised with meeting words
* Awkward machine-translated sentences
* Long bureaucratic instructions
* Unclear button labels
* Duplicate status names
* Mixed terminology
* Random title capitalization
* Technical API language in user-facing descriptions
* Placeholder lorem ipsum
* Generic statements that do not explain the action
* Fake financial or governance claims

Use consistent terms throughout the application.

For example:

* Use “Agenda Item” everywhere, not a mix of “Agenda,” “Meeting Subject,” and “Discussion Request.”
* Use “Board Paper” consistently.
* Use “Meeting Secretary” consistently.
* Use “Action Item” consistently.
* Use “Resolution” consistently.
* Use “Attendance Status” consistently.
* Use “Confidentiality Level” consistently.

---

## Mandatory remnant search

After rewriting, search the full project for these visible terms and all spelling or capitalization variations:

### English terms

* NBR
* National Board of Revenue
* Tax
* Taxes
* Taxpayer
* TIN
* e-Return
* Return Submission
* Return Register
* Online Return
* Offline Return
* Income Tax
* Tax Office
* Tax Officer
* Tax Commissioner
* Circle Officer
* Circle
* Zone
* Assessment
* Assessment Year
* PSR
* Tax Certificate
* Appeal
* Tribunal
* Litigation
* Arrear
* Writ Case
* Tax Demand
* Refund
* TDS
* AIT
* 82BB
* 82C2
* `@nbr.gov.bd`

### Bangla terms

* এনবিআর
* জাতীয় রাজস্ব বোর্ড
* কর
* করদাতা
* টিআইএন
* ই-রিটার্ন
* রিটার্ন
* রিটার্ন রেজিস্টার
* কর অফিস
* কর কর্মকর্তা
* কর কমিশনার
* কর অঞ্চল
* কর সার্কেল
* সার্কেল
* অঞ্চল
* মূল্যায়ন
* মূল্যায়ন বছর
* পিএসআর
* কর সনদ
* আপিল
* ট্রাইব্যুনাল
* মামলা
* বকেয়া কর
* কর নির্ধারণ
* কর পরিশোধ
* কর আদায়

Review every match manually.

Ignore a match only when it is an internal technical filename, route, type, function, or storage key that is never visible to users.

Do not ignore matches found in:

* Translations
* Mock data
* Components
* Forms
* Tables
* Drawers
* Modals
* Notifications
* Help content
* Reports
* Accessibility labels
* Public pages
* Browser metadata
* Print views
* Export labels

---

## Consistency verification

Check every converted workflow.

Verify that:

* Navigation label matches page title.
* Page title matches breadcrumb.
* Page description matches the page purpose.
* Table columns match the displayed records.
* Mobile cards match desktop table data.
* Drawer fields match table records.
* Form labels match saved data.
* Filters match available statuses.
* Status badges use the correct terminology.
* Dashboard totals match the module names.
* Notifications refer to existing workflows.
* Reports use board-meeting data rather than tax data.
* Roles and permissions use the same feature names as navigation.
* English and Bangla content have the same meaning.
* Empty states describe the correct content.
* Confirmation messages clearly describe the action.
* Buttons use clear action labels.
* No tax-shaped information remains under renamed headings.

---

## Completion criteria

The task is complete only when:

1. No user-visible NBR or tax-related writing remains.
2. All English and Bangla translation keys are synchronized.
3. No translation key contains mixed Bangla text or accidental replacement.
4. Every visible mock record describes board-meeting activity.
5. Every page has a clear board-meeting purpose.
6. Tables, cards, drawers, forms, filters, and actions use matching terminology.
7. The help centre describes only board-meeting workflows.
8. User roles and designations match the board-meeting solution.
9. Reports contain meeting, agenda, document, resolution, attendance, committee, and action-item data.
10. Existing layouts and functionality remain unchanged.
11. The project builds successfully.
12. Existing tests continue to pass.

At the end, provide a concise report listing:

* Files updated
* English translation files updated
* Bangla translation files updated
* Hard-coded visible strings replaced
* Mock-data areas rewritten
* Help topics rewritten
* Corrupted translation keys fixed
* Remaining tax-related search matches
* Reason for keeping any remaining match
* Build result
* Test result

## Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not remove working features.
* Do not redesign the UI.
* Do not change logos or image assets in this phase.
* Do not change routes, APIs, or business logic.
* Do not change desktop or mobile layouts.
* Do not perform blind find-and-replace.
* Rewrite complete workflows, not isolated words.
* Reuse the existing components and styles.
* Preserve all working interactions.
* Keep tables, mobile cards, drawers, forms, and filters synchronized.
* Keep English and Bangla content fully aligned.
* Do not leave any user-visible NBR or tax-related writing.
