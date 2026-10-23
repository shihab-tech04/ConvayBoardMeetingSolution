You are working directly inside the existing React and TypeScript project named **Board Meeting Solution**.

The project was originally an NBR Office Management System. Its visible content has been partially converted into NCC Bank board-meeting language, but the underlying navigation, page purposes, table structures, generic forms, mobile-card logic, drawer grouping, permissions, and mock data still follow the old NBR model.

Your task is to complete the structural UX transformation into a proper **NCC Bank Board Meeting Solution** without changing the project’s file structure, design system, technical architecture, APIs, or working behavior.

This is not another text-replacement task. Reorganize the existing navigation, routes, pages, dashboard cards, tables, filters, forms, details drawers, mock records, roles, permissions, and translations so the product works as one connected board-meeting system.

# 1. Audit conclusion

The existing project is suitable for this transformation.

It already contains:

* Three-level navigation support
* Reusable dashboard cards
* Reusable table pages
* Responsive desktop tables
* Unified mobile cards
* Search, filters, pagination, export, and print controls
* Reusable details drawers
* Reusable modal and form components
* File upload and attachment preview
* Role and permission management
* User management
* EN/BN localization
* Theme and font settings
* Responsive desktop and mobile layouts
* Existing page and route components that can be repurposed

Do not rebuild the application. Reuse these existing systems.

The main problems to solve are:

* There are currently eight legacy master navigation groups instead of seven.
* Navigation labels and route grouping still follow NBR modules.
* Many pages were renamed without changing their real information structure.
* Generic creation forms still hardcode TIN, taxpayer, assessment year, circle, zone, and tax amount fields.
* Generic drawers still detect and group tax, litigation, appeal, tribunal, certificate, and financial fields.
* Mobile cards still prioritize taxpayer and tax-record keys.
* Dashboard data still contains tax-era labels and metrics.
* Roles, permissions, notifications, help content, mock data, and translations remain inconsistent.
* Some English content has been converted while Bangla content still contains legacy concepts.
* Related records do not yet form a connected meeting → agenda → document → decision → action workflow.

# 2. Non-negotiable scope protection

Do not:

* Rename, move, delete, or reorganize existing files or folders.
* Replace the current application shell.
* Create a new design system.
* Change the theme system, color tokens, typography, spacing, or existing visual language.
* Remove or redesign working tables, cards, drawers, modals, forms, filters, navigation, or mobile cards.
* Change Redux architecture.
* Change authentication behavior.
* Change existing API contracts, service endpoints, repository structure, or mapper structure.
* Break file upload, MIME validation, attachment preview, pagination, search, filters, export, print, themes, language switching, or responsive behavior.
* Remove existing working actions only because their internal names are old.
* expose technical legacy names in the UI.
* perform blind word replacement.
* create separate Create, View, or Edit pages in the sidebar.

Internal filenames, route component names, variable names, permission IDs, storage keys, and service endpoint names may remain unchanged when changing them would risk breaking the project, but they must never appear as visible UI text.

Updating `src/app/routes.tsx`, navigation IDs, route declarations, redirects, and component-to-route mapping is allowed because navigation restructuring is part of this task. Do not change the router architecture or component file locations.

# 3. Required navigation model

The first navigation layer must contain exactly seven master items:

```text
1. Home
2. Meetings
3. Agenda & Documents
4. Decisions & Follow-up
5. Governance & Organization
6. Archive & Reports
7. Administration
```

Use the existing primary and secondary sidebar designs.

## Third-layer behavior

The project currently supports third-level items inside the secondary sidebar. Change this behavior:

* The primary sidebar shows only the seven master items.
* The secondary sidebar shows only second-level child pages.
* Third-level items must appear as horizontal content tabs using the existing `TabBar` component.
* Do not display a third nested sidebar or nested accordion list.
* Clicking a second-level item with tabs opens its first tab.
* The active tab must remain route-based and refresh-safe.
* On mobile, tabs must scroll horizontally when necessary.
* Do not add more than three navigation layers.

Update:

* `src/app/data/navigation.ts`
* `src/app/routes.tsx`
* `src/app/hooks/useNavigation.ts`
* `src/app/hooks/useRouteNav.ts`
* `src/app/components/navigation/PrimarySidebar.tsx`
* `src/app/components/navigation/SecondarySidebar.tsx`
* `src/app/components/navigation/MobileNavigationDrawer.tsx`
* `src/app/components/navigation/Breadcrumbs.tsx`
* `src/app/layouts/MainContentArea.tsx` only if needed
* Navigation translations in EN and BN
* Notification route destinations
* Logo and root redirects

The root route and logo click must open:

```text
/home/overview
```

Keep backward redirects from old routes where practical so bookmarks and existing internal links do not break.

# 4. Final navigation tree

```text
1. Home
   ├── Overview
   ├── My Tasks
   └── My Calendar

2. Meetings
   ├── Meeting Overview
   ├── All Meetings
   ├── Meeting Calendar
   └── Meeting Templates

3. Agenda & Documents
   ├── Agenda Management
   ├── Board Packs
   ├── Document Library
   ├── Questions & Clarifications
   └── My Notes

4. Decisions & Follow-up
   ├── Decisions
   ├── Resolutions
   ├── Action Items
   ├── Matters Arising
   └── Follow-up Questions

5. Governance & Organization
   ├── Governance Bodies
   ├── Organization Structure
   ├── Users & Assignments
   ├── Designations & Positions
   └── Participant Groups

6. Archive & Reports
   ├── Meeting Archive
   ├── Registers
   │   ├── Resolution Register
   │   ├── Decision Register
   │   ├── Action Register
   │   ├── Attendance Register
   │   └── Conflict Register
   ├── Reports & Analytics
   │   ├── Meeting Performance
   │   ├── Participation
   │   ├── Governance
   │   ├── Decisions & Actions
   │   └── Financial & Resource Impact
   └── Audit Trail

7. Administration
   ├── Roles & Permissions
   │   ├── Roles
   │   └── Permissions
   ├── Workflows
   │   ├── Workflow Definitions
   │   ├── Approval Rules
   │   ├── Review & Revision Rules
   │   └── Workflow History
   ├── Meeting Configuration
   │   ├── Meeting Types
   │   ├── Quorum Rules
   │   ├── Voting Methods
   │   └── Statuses & Numbering
   ├── Templates
   │   ├── Meeting & Agenda Templates
   │   ├── Minutes & Resolution Templates
   │   ├── Document Templates
   │   └── Communication Templates
   ├── Notifications
   │   ├── Notification Rules
   │   ├── Message Templates
   │   └── Delivery Logs
   ├── Integrations
   └── Security & Retention
       ├── Security Policies
       └── Retention & Legal Holds
```

# 5. Reuse the existing page files

Do not create replacement page files. Repurpose the existing files as follows.

## Home

* `DashboardPage.tsx` → Overview
* `PSRDashboardPage.tsx` → My Tasks
* `CombinedDashboardPage.tsx` → My Calendar

## Meetings

* `ReturnViewApprovalPage.tsx` → Meeting Overview
* `OnlineReturnRegisterPage.tsx` → All Meetings
* `OfflineReturnRegisterPage.tsx` → Meeting Calendar
* `OnlineArchivePage.tsx` → Meeting Templates

## Agenda & Documents

* `Register4ListPage.tsx` → Agenda Management
* `StockRegisterPage.tsx` → Board Packs
* `TaxRegistryPage.tsx` → Document Library
* `Register5Page.tsx`, non-approval state → Questions & Clarifications
* `Register5Page.tsx`, approval state → My Notes

## Decisions & Follow-up

* `PSRApprovalPage.tsx` → Decisions
* `PSREditRequestPage.tsx` → Resolutions
* `DoubleEntryStatusPage.tsx` → Action Items
* `DoubleEntryVerificationPage.tsx` → Matters Arising
* `PSRDormantPage.tsx` → Follow-up Questions

## Governance & Organization

* `InvalidListPage.tsx` → Governance Bodies
* `ApprovalListPage.tsx` → Organization Structure
* `UserManagementPage.tsx` → Users & Assignments
* `TransferHistoryPage.tsx` → Designations & Positions
* `SpecialRegistrationPage.tsx` → Participant Groups
* `SpecialRegistrationPublicPage.tsx` → External Participant Registration

## Archive & Reports

Reuse `ReportViewPage.tsx`, `modulePageConfigs.ts`, and the existing report configuration IDs:

* `express-cert-disposal` → Meeting Archive
* `register-5-report` → Resolution Register
* `litigation-dept-case` → Decision Register
* `litigation-arrear` → Action Register
* `tax-category-report` → Attendance Register
* `litigation-taxpayer-case` → Conflict Register
* `offline-return-report` → Meeting Performance
* `appeal-report` → Participation
* `tribunal-report` → Governance
* `litigation-writ-case` → Decisions & Actions
* `payment-demand-report` → Financial & Resource Impact
* `user-activity-report` → Audit Trail

## Administration

### Roles & Permissions

* `RoleManagementPage.tsx` → Roles
* `PermissionListPage.tsx` → Permissions

### Workflows

* `CertificateDataEntryPage.tsx` → Workflow Definitions
* `CertificateApprovalRequestPage.tsx` → Approval Rules
* `CertificateEditRequestPage.tsx` → Review & Revision Rules
* `CertificateDisposalHistoryPage.tsx` → Workflow History

### Meeting Configuration

* `DemandRegisterPage.tsx` → Meeting Types
* `DemandApprovalPage.tsx` → Quorum Rules
* `TaxpayerLedgerPage.tsx` → Voting Methods
* `RefundAdjustmentPage.tsx` → Statuses & Numbering

### Templates

* `AppealPage.tsx`, non-approval state → Meeting & Agenda Templates
* `AppealPage.tsx`, approval state → Minutes & Resolution Templates
* `TribunalPage.tsx`, non-approval state → Document Templates
* `TribunalPage.tsx`, approval state → Communication Templates

### Notifications

Reuse the existing `LitigationCasePage.tsx` variations:

* Current arrear variation → Notification Rules
* Current writ variation → Message Templates
* Current department variation → Delivery Logs
* Current taxpayer/member variation → Integrations

### Security & Retention

* `AuditSelectionPage.tsx` → Security Policies
* `TimeExtensionPage.tsx` → Retention & Legal Holds

All old components must remain in their current file locations.

# 6. Standard page structure

Every management/list page must use this order:

```text
Page heading
Secondary heading
Contextual +Add or +Create button, where relevant
Dashboard summary cards
Tabs, when the page has third-level sections
Search, filters, sorting, and available utilities
Table
Pagination
```

Do not add an Add button to read-only pages.

Use specific labels instead of a generic “+ Add”:

* * Create Meeting
* * Add Meeting Template
* * Add Agenda Submission
* * Create Board Pack
* * Add Document
* * Add Question
* * Add Note
* * Add Decision
* * Add Resolution
* * Add Action Item
* * Add Governance Body
* * Add Organization Unit
* * Add User
* * Add Designation
* * Add Position
* * Add Participant Group
* * Create Custom Report
* * Add Role
* * Add Permission
* * Add Workflow
* * Add Template
* * Add Notification Rule
* * Add Integration
* * Add Security Policy

Dashboard cards must show useful page-level totals. Do not add cards only to fill space.

# 7. Creation, details, and edit behavior

## Creation

All internal creation flows must open in a full-page modal.

Do not create standalone creation routes.

Extend the existing `AppModal` rather than creating a separate modal component.

Add a reusable full-page mode to `AppModal`:

* Occupies the available viewport.
* Uses the current theme and modal design.
* Sticky header.
* Scrollable body.
* Sticky footer.
* Close button in the header.
* Cancel and primary action in the footer.
* Supports Back, Next, Save Draft, Submit, and Update when required.
* Full-screen on mobile.
* Warns before closing when there are unsaved changes.
* Returns focus to the triggering button after closing.

Use steppers only for long forms. Do not turn every simple form into a stepper.

## Details

All record details must open in the existing details drawer.

* Clicking a desktop table row opens the drawer.
* Clicking a mobile card opens the drawer.
* Do not create separate details pages.
* Do not add a visible “View Details” button to every mobile card.
* Keep the Actions column at the end of desktop tables.
* Use a wider drawer for meetings, board packs, users, governance bodies, and complex records.
* Use sections, collapsible groups, or existing tabs when information is long.
* Display attachments through the existing attachment list and preview system.

## Edit

Editing must reuse the same full-page modal as creation.

* Open the creation form with existing values prefilled.
* Change the modal heading from Create/Add to Edit.
* Use the same fields, validation, step order, and file controls.
* Use Update or Save Changes as the primary action.
* Preserve the original record ID, relationships, creation date, and activity history.

## Row actions

Update `GeneratedTablePage` so actions behave correctly:

* View → open details drawer
* Edit → open the full-page creation modal in edit mode
* Approve → use the existing confirmation pattern and update status
* Reject → request a reason and update status
* Delete → use `SConfirmModal`
* Publish → confirm before publishing
* Duplicate → open the creation modal with copied editable values
* Download or Print → display only when relevant

Do not route every action to the same drawer.

# 8. Make the generic page system board-meeting aware

Update:

* `src/app/pages/modulePageUtils.ts`
* `src/app/components/pages/GeneratedTablePage.tsx`
* `src/app/components/drawers/DynamicDetailsDrawer.tsx`
* `src/app/components/tables/UnifiedMobileCard.tsx`
* `src/app/components/tables/ResponsiveTable.tsx`
* `src/app/components/forms/EntryForm.tsx`
* `src/app/components/modals/AppModal.tsx`
* `src/app/data/modulePageConfigs.ts`

## Extend `PageCfg`

Extend the existing page configuration model with optional configuration for:

* Table title
* Add/Create button label
* Create modal title
* Edit modal title
* Full-page modal mode
* Form fields
* Optional form steps
* Initial edit values
* Row creation mapping
* Details drawer title
* Details drawer sections or grouped columns
* Contextual drawer actions
* Read-only mode
* Page tabs
* Explicit mobile-card mapping
* Empty-state text

Do not hardcode one shared tax-style form into all generated pages.

Each page must provide its own board-meeting fields through configuration.

## Remove generic tax form assumptions

Remove visible and functional dependency on these default fields:

* TIN
* Taxpayer name
* Assessment year
* Circle
* Zone
* Tax amount
* PSR number
* Challan
* Return type

Replace them with page-specific forms.

Examples:

### Meeting form

* Meeting title
* Meeting type
* Meeting number
* Governance body
* Date
* Start time
* End time
* Time zone
* Meeting mode
* Venue or virtual link
* Chairperson
* Meeting secretary
* Organization scope
* Selected divisions
* Selected departments
* Selected regions
* Selected branches
* Participant rules
* Confidentiality
* Description
* Notification schedule

For long meeting forms use:

```text
1. Meeting Details
2. Governance Body & Scope
3. Participants
4. Agenda
5. Documents
6. Schedule & Notifications
7. Review & Publish
```

### Agenda form

* Agenda title
* Related meeting
* Agenda category
* Purpose
* Submitted by
* Department
* Presenter
* Estimated duration
* Priority
* Background
* Proposed decision
* Supporting documents
* Confidentiality

### Action form

* Action title
* Source meeting
* Related decision
* Assigned person
* Assigned department
* Priority
* Start date
* Due date
* Expected result
* Supporting evidence
* Status

### User form

Keep these concepts separate:

* Employee ID
* Name
* Email
* Phone
* Designation
* Position
* Organization unit
* Reports to
* System role
* Committee memberships
* Acting assignment
* Employment status
* Two-factor authentication
* Account status

Do not use designation, system role, meeting role, and position as if they are the same field.

# 9. Fix details-drawer intelligence

`DynamicDetailsDrawer.tsx` still detects tax and litigation keys. Replace its visible grouping logic with board-meeting groups.

## Identifier keys

Support:

* meeting_id
* meeting_ref
* meeting_number
* agenda_id
* agenda_no
* document_id
* document_no
* board_pack_id
* decision_id
* resolution_no
* action_id
* question_id
* body_id
* unit_id
* employee_id
* role_id
* workflow_id
* template_id
* integration_id

## Primary name/title keys

Support:

* meeting_title
* agenda_title
* document_name
* board_pack_title
* decision_title
* resolution_title
* action_title
* question
* body_name
* unit_name
* user_name
* name
* group_name
* workflow_name
* template_name
* rule_name
* integration_name

## Date keys

Support:

* meeting_date
* scheduled_date
* start_date
* end_date
* due_date
* submission_date
* review_date
* approval_date
* publication_date
* archive_date
* created_at
* updated_at

## Drawer groups

Use relevant groups such as:

* Meeting Information
* Governance Body & Scope
* Participants & Access
* Agenda & Documents
* Decision & Follow-up
* Organization Assignment
* Review & Approval
* Dates & Activity
* Security & Access
* Attached Files
* Other Information

Remove visible drawer group names such as:

* Tax Information
* Case Details
* Litigation Details
* Certificate Information
* Assessment Information
* Taxpayer Information

Do not show generic Print and Export actions in every drawer.

Use `PageCfg.drawerActions` or equivalent contextual configuration.

# 10. Fix mobile-card intelligence

`UnifiedMobileCard.tsx` still searches for taxpayer, TIN, PSR, certificate, appeal, tribunal, demand, and tax fields.

Replace its fallback priorities with board-meeting keys.

Primary title examples:

* meeting_title
* agenda_title
* document_name
* resolution_title
* decision_title
* action_title
* body_name
* unit_name
* user_name
* template_name
* workflow_name

Identifier examples:

* meeting_id
* agenda_no
* document_no
* resolution_no
* decision_id
* action_id
* employee_id
* body_id

Context examples:

* governance_body
* committee
* meeting_type
* organization_unit
* department
* branch
* owner
* assigned_to
* presenter
* priority
* confidentiality

Date examples:

* meeting_date
* due_date
* submission_date
* updated_at
* publication_date

Provide an explicit `mobileCardMapping` for every page rather than relying only on fallback detection.

Mobile cards must:

* Open details when the card is tapped.
* Keep relevant status in the footer.
* Show no redundant View Details button.
* Show a maximum of the most useful metadata.
* Keep other actions in the card action footer only when required.
* Preserve the current card design and responsive behavior.

# 11. Page content and table requirements

## Home

### Overview

Heading: Overview
Secondary heading: Review upcoming meetings, pending work, and recent governance activity.

Cards:

* Upcoming Meetings
* Pending Invitations
* Documents to Review
* Pending Approvals
* Open Action Items
* Overdue Actions

Table:

* Activity
* Related Meeting
* Assigned By
* Due Date
* Status
* Last Updated

No Add button.

### My Tasks

Cards:

* Total Open Tasks
* Due Today
* Due This Week
* Overdue
* Completed This Month

Tabs:

* All
* Approvals
* Reviews
* Actions
* Signatures
* Declarations

Table:

* Task
* Task Type
* Related Meeting
* Assigned Date
* Due Date
* Priority
* Status

No Add button.

### My Calendar

Cards:

* Meetings This Week
* Meetings This Month
* Pending Confirmations
* Upcoming Deadlines

Table:

* Event
* Event Type
* Date
* Time
* Location or Meeting Mode
* Governance Body
* Status

No Add button.

Use the existing dashboard and table components. A list-based calendar is acceptable in this phase. Do not add a new calendar library.

## Meetings

### Meeting Overview

Button: + Create Meeting

Cards:

* Upcoming Meetings
* Draft Meetings
* Pending Approval
* In Progress
* Awaiting Minutes
* Completed

Main table:

* Meeting ID
* Meeting Title
* Governance Body
* Date and Time
* Organizer
* Readiness
* Quorum Forecast
* Status

### All Meetings

Button: + Create Meeting

Tabs:

* All
* Upcoming
* Draft & Pending
* In Progress
* Awaiting Closure
* Completed
* Cancelled

Table:

* Meeting ID
* Meeting Title
* Meeting Type
* Governance Body
* Date and Time
* Meeting Mode
* Organizer
* Participant Count
* Readiness
* Status
* Actions

Meeting drawer sections:

* Overview
* Participants
* Agenda
* Documents
* Minutes
* Decisions & Actions
* Activity

Drawer actions may include:

* Edit
* Duplicate
* Publish
* Reschedule
* Cancel
* Start Meeting
* View Board Pack

### Meeting Calendar

Button: + Create Meeting

Cards:

* Meetings Today
* Meetings This Week
* Meetings This Month
* Schedule Conflicts

Table:

* Meeting
* Governance Body
* Date
* Start Time
* Duration
* Mode
* Venue
* Status

### Meeting Templates

Button: + Add Meeting Template

Table:

* Template Name
* Meeting Type
* Governance Body
* Default Agenda Items
* Default Duration
* Last Used
* Status
* Actions

## Agenda & Documents

### Agenda Management

Button: + Add Agenda Submission

Cards:

* Draft
* Pending Review
* Revision Requested
* Approved
* Unscheduled
* Deferred

Tabs:

* All
* My Submissions
* Pending Review
* Revision Requested
* Approved
* Scheduled
* Deferred
* Rejected

Table:

* Agenda No.
* Agenda Title
* Submitted By
* Organization Unit
* Requested Meeting
* Purpose
* Priority
* Submission Date
* Status
* Actions

Drawer sections:

* Overview
* Supporting Documents
* Review & Approval
* Meeting Assignment
* Activity

### Board Packs

Button: + Create Board Pack, only for authorized users or when automatic generation is unavailable.

Cards:

* Draft Board Packs
* Pending Approval
* Published
* Updated After Publication
* Review Pending

Table:

* Board Pack
* Meeting
* Meeting Date
* Version
* Document Count
* Review Completion
* Publication Date
* Status
* Actions

Drawer sections:

* Contents
* Versions
* Review Status
* Access
* Activity

### Document Library

Button: + Add Document

Cards:

* Total Documents
* Recently Added
* Restricted Documents
* Pending Review
* Expiring Documents

Table:

* Document Name
* Document Type
* Related Meeting
* Agenda Item
* Owner
* Version
* Confidentiality
* Updated Date
* Status
* Actions

### Questions & Clarifications

Button: + Add Question

Cards:

* Open Questions
* Awaiting Response
* Response Submitted
* Overdue Responses
* Resolved

Table:

* Question
* Related Meeting
* Agenda Item
* Submitted By
* Assigned To
* Due Date
* Priority
* Status
* Actions

### My Notes

Button: + Add Note

Cards:

* Total Notes
* Recent Notes
* Bookmarked Documents
* Meetings With Notes

Table:

* Note Title
* Related Meeting
* Agenda Item
* Document
* Page Reference
* Last Updated
* Status
* Actions

Private notes must be clearly marked as private and must not become official minutes automatically.

## Decisions & Follow-up

### Decisions

Button: + Add Decision, only for authorized users.

Table:

* Decision ID
* Decision Title
* Source Meeting
* Agenda Item
* Decision Owner
* Effective Date
* Implementation Status
* Actions

### Resolutions

Button: + Add Resolution

Table:

* Resolution No.
* Resolution Title
* Meeting
* Meeting Date
* Voting Result
* Effective Date
* Responsible Owner
* Status
* Actions

### Action Items

Button: + Add Action Item

Cards:

* My Open Actions
* Due This Week
* Overdue
* Blocked
* Pending Review
* Completed

Tabs:

* My Actions
* Team Actions
* All Actions
* Pending Review
* Overdue
* Completed

Table:

* Action ID
* Action
* Source Meeting
* Assigned To
* Organization Unit
* Priority
* Due Date
* Progress
* Status
* Actions

### Matters Arising

Button: + Add Matter only when manual creation is permitted.

Table:

* Matter ID
* Source Meeting
* Original Agenda Item
* Responsible Owner
* Due Date
* Target Meeting
* Progress
* Status
* Actions

### Follow-up Questions

Button: + Add Follow-up Question

Table:

* Question
* Source Meeting
* Agenda Item
* Assigned To
* Response Deadline
* Response Status
* Status
* Actions

## Governance & Organization

### Governance Bodies

Button: + Add Governance Body

Tabs:

* All
* Board
* Board Committees
* Management Committees
* Task Forces
* Inactive

Table:

* Governance Body
* Type
* Chairman
* Secretary
* Active Members
* Quorum Rule
* Effective Period
* Status
* Actions

Drawer sections:

* Overview
* Members
* Roles
* Quorum Rules
* Meeting Rules
* History

### Organization Structure

Button: + Add Organization Unit

Tabs:

* Divisions & Departments
* Regions & Branches
* Units, Cells & Teams
* Subsidiaries & Other Entities
* Organization Chart

Table:

* Unit Name
* Unit Code
* Unit Type
* Parent Unit
* Head
* Active Users
* Child Units
* Status
* Actions

Reuse existing table and hierarchy patterns. Do not install a new organization-chart library.

### Users & Assignments

Button: + Add User

Cards:

* Active Users
* Inactive Users
* Acting Assignments
* Delegations
* Vacant Positions
* Users Without Assignments

Tabs:

* Active Users
* Inactive Users
* Acting Assignments
* Delegations
* Import History

Table:

* Employee ID
* Name
* Designation
* Position
* Organization Unit
* Reports To
* System Role
* Assignment Type
* Status
* Actions

User drawer sections:

* Profile
* Assignments
* Committee Memberships
* Meeting History
* Access
* Activity

Replace visible Circle, Zone, Level, Deputy Commissioner, Assistant Commissioner, Inspector, Data Entry Operator, and similar NBR hierarchy terms.

Use realistic banking designations and positions.

### Designations & Positions

Tabs:

* Designations
* Positions

Contextual buttons:

* * Add Designation
* * Add Position

Designation table:

* Designation
* Code
* Rank
* Management Level
* Active Users
* Status
* Actions

Position table:

* Position
* Position Type
* Organization Level
* Current Holder
* Organization Unit
* Status
* Actions

### Participant Groups

Button: + Add Participant Group

Table:

* Group Name
* Group Type
* Selection Rule
* Number of Members
* Last Used
* Status
* Actions

Examples:

* Board Members
* Senior Management Team
* Division Heads
* Regional Heads
* Branch Managers
* Board Secretariat
* Technology Steering Committee

Transform the public special-registration page into External Participant Registration.

Use fields such as:

* Invitation Code
* Full Name
* NID or Passport
* Organization
* Designation
* Email
* Phone
* Country
* Meeting
* Participant Type
* Required Documents
* Consent

## Archive & Reports

### Meeting Archive

No Add button.

Table:

* Meeting ID
* Meeting Title
* Governance Body
* Meeting Date
* Final Minutes
* Board Pack Version
* Archive Date
* Confidentiality
* Status

Open records in a read-only drawer.

### Registers

No Add button.

Use the required third-level tabs.

Each register must use relevant columns and open a read-only drawer unless the user has amendment permission.

### Reports & Analytics

Button: + Create Custom Report

Cards:

* Meetings Held
* Attendance Rate
* Quorum Compliance
* Action Completion Rate
* Overdue Actions
* Average Minutes Approval Time

Use the required report tabs.

Saved-report table:

* Report Name
* Category
* Date Range
* Created By
* Last Generated
* Schedule
* Status
* Actions

### Audit Trail

No Add button.

Cards:

* Activities Today
* Security Events
* Failed Access Attempts
* Permission Changes
* High-Risk Activities

Table:

* Date and Time
* User
* Role
* Action
* Module
* Record
* Previous Value
* New Value
* Device or Session
* Risk Level

Audit drawer must be read-only.

## Administration

### Roles

Button: + Add Role

Table:

* Role Name
* Role Type
* Users Assigned
* Permission Count
* Data Scope
* Last Updated
* Status
* Actions

### Permissions

Button: + Add Permission

Keep the existing endpoint, method, service, access label, and custom-permission functionality.

Change visible permission groups to:

* Home
* Meetings
* Agenda & Documents
* Decisions & Follow-up
* Governance & Organization
* Archive & Reports
* Administration

Internal permission IDs and endpoints may remain unchanged where required.

### Workflows

Button: + Add Workflow

Table:

* Workflow Name
* Workflow Type
* Number of Stages
* Applied To
* Last Updated
* Status
* Actions

Use the workflow tabs defined in navigation.

### Meeting Configuration

Use contextual Add buttons by tab.

Configuration tables must cover:

* Meeting types
* Meeting statuses
* Numbering formats
* Quorum rules
* Voting methods
* Decision types
* Action statuses
* Confidentiality levels

### Templates

Button: + Add Template

Table:

* Template Name
* Template Type
* Language
* Used By
* Last Updated
* Status
* Actions

### Notifications

Button: + Add Notification Rule

Table:

* Rule Name
* Trigger
* Recipient
* Channel
* Schedule
* Status
* Actions

Delivery log table:

* Notification
* Recipient
* Channel
* Sent At
* Delivery Status
* Failure Reason

### Integrations

Button: + Add Integration

Table:

* Integration
* Type
* Provider
* Last Synchronization
* Connection Status
* Authentication Status
* Actions

Use realistic integrations such as HR system, identity provider, calendar, email, SMS, digital signature, video conferencing, and document storage.

### Security & Retention

Use contextual Add buttons.

Security table examples:

* Policy Name
* Policy Type
* Applies To
* Enforcement
* Last Updated
* Status

Retention table examples:

* Policy Name
* Record Type
* Retention Period
* Disposal Rule
* Legal Hold
* Status

# 12. Organization and bank hierarchy

Use this organization model in mock data and forms:

```text
NCC Bank PLC
├── Governance
│   ├── Board of Directors
│   ├── Executive Committee
│   ├── Audit Committee
│   ├── Risk Management Committee
│   └── Nomination and Remuneration Committee
├── Executive Management
│   ├── Managing Director & CEO
│   ├── Additional Managing Directors
│   └── Deputy Managing Directors
├── Head Office
│   ├── Divisions
│   ├── Departments
│   ├── Units
│   ├── Cells
│   └── Teams
└── Branch Network
    ├── Regions
    ├── Regional Offices
    ├── Branches
    └── Upa-Shakhas
```

Use banking designations such as:

* Managing Director & CEO
* Additional Managing Director
* Deputy Managing Director
* SEVP
* EVP
* SVP
* VP
* FVP
* SAVP
* AVP
* FAVP
* Principal Officer
* Senior Officer
* Officer

Use positions such as:

* Company Secretary
* Division Head
* Department Head
* Regional Head
* Branch Manager
* Committee Secretary
* Chief Financial Officer
* Head of Credit Risk Management
* Head of Internal Control and Compliance

Designation, position, system role, and meeting role must remain separate concepts.

# 13. Connected mock data

Do not create random records that have no relationship.

Use connected example IDs:

```text
Meeting: MTG-2026-0344
Agenda: AGD-2026-0344-01
Board Pack: BPK-2026-0344-V2
Document: DOC-2026-118
Decision: DEC-2026-044
Resolution: RES-2026-044
Action: ACT-2026-071
Question: QST-2026-018
```

A related agenda, board pack, document, decision, resolution, action, and follow-up question should reference the same meeting where appropriate.

Use fictional people. Do not present fictional names as real NCC Bank officeholders.

# 14. Status system

Use consistent statuses.

## Meetings

* Draft
* Under Preparation
* Pending Approval
* Revision Requested
* Approved
* Published
* Scheduled
* Invitation Sent
* In Progress
* Paused
* Adjourned
* Awaiting Minutes
* Awaiting Closure
* Completed
* Postponed
* Cancelled
* Archived

## Agenda items

* Draft
* Submitted
* Under Review
* Revision Requested
* Approved
* Scheduled
* Deferred
* Withdrawn
* Rejected
* Completed

## Documents

* Draft
* Pending Review
* Approved
* Published
* Superseded
* Restricted
* Archived

## Minutes

* Draft
* Under Review
* Revision Requested
* Approved
* Signed
* Archived

## Decisions

* Open
* Implementing
* Partially Implemented
* Implemented
* Deferred
* Superseded
* Closed

## Actions

* Assigned
* Acknowledged
* In Progress
* Blocked
* Pending Review
* Completed
* Overdue
* Cancelled

Update `StatusBadge` mappings so these statuses use consistent existing success, warning, error, primary, and neutral tones. Do not introduce new badge styling.

# 15. EN/BN parity

Update every relevant English and Bangla namespace.

Pay special attention to:

* navigation.json
* pages.json
* dashboard.json
* kpi.json
* tables.json
* drawers.json
* forms.json
* filters.json
* actions.json
* status.json
* user.json
* role.json
* permissions.json
* notifications.json
* help.json
* breadcrumbs.json
* emptyStates.json
* errors.json
* modals.json
* report.json
* specialRegistration.json

Do not leave an English board-meeting label mapped to a Bangla tax-management phrase.

Run the existing locale validation after the changes.

# 16. Remove all visible legacy content

Search the active application for visible references to:

* NBR
* National Board of Revenue
* Tax
* Taxpayer
* TIN
* Return
* e-Return
* Assessment Year
* Circle
* Zone
* PSR
* Certificate
* Litigation
* Appeal
* Tribunal
* Arrear
* Demand
* Refund
* Challan
* Register-4
* Register-5
* Misfiled Return
* Double Entry
* Dormant Taxpayer
* Out of Jurisdiction
* Deputy Commissioner
* Assistant Commissioner
* Tax Inspector
* Tax Office
* Tax Category
* Tax Collected
* Revenue Collected

Financial terms such as amount, debit, credit, balance, and budget may remain only where they make sense for a financial agenda, approved budget, or resource-impact report.

Search:

* Hardcoded strings in components
* Mock data
* Config files
* Drawer fallbacks
* Mobile-card fallbacks
* Form fallbacks
* Toasts
* Notifications
* Help content
* Accessible labels
* Browser title
* Login content
* Public pages
* Print output
* Export headings
* English locale
* Bangla locale

Internal technical names may remain when they are not rendered.

# 17. Preserve existing UX quality

Keep:

* Existing table appearance
* Existing card appearance
* Existing responsive breakpoints
* Existing mobile filter bottom sheet
* Existing mobile card style
* Existing drawer behavior
* Existing attachment preview
* Existing form styling
* Existing buttons
* Existing icons where they still match the new meaning
* Existing theme switching
* Existing dark mode
* Existing EN/BN language switching
* Existing keyboard navigation
* Existing focus management
* Existing loading, empty, error, and disabled states
* Existing search, filtering, sorting, pagination, print, and export behavior

Replace an icon only when its old tax meaning is clearly inappropriate. Use existing Lucide icons already installed.

# 18. Acceptance checklist

The work is complete only when:

* Exactly seven master navigation items are visible.
* Third-level navigation appears as content tabs, not nested sidebar navigation.
* Every child page has a clear board-meeting purpose.
* Every management page has a heading, secondary heading, relevant action button, useful cards, and a table.
* Every Add/Create action opens a full-page modal.
* Every Edit action reuses the same modal with prefilled information.
* Every record row or mobile card opens a details drawer.
* Mobile cards do not contain a redundant View Details button.
* Desktop action columns appear last.
* Tables use board-meeting fields rather than relabeled tax fields.
* Drawers use board-meeting groups rather than tax/case groups.
* Forms are page-specific and configuration-driven.
* Meetings, agendas, documents, decisions, resolutions, and actions use connected mock records.
* Organization data supports governance bodies, divisions, departments, regions, branches, designations, positions, assignments, and participant groups.
* Role and permission labels match the seven new modules.
* Notifications point to valid new routes.
* Old routes redirect safely where needed.
* No active UI contains NBR or tax-management wording.
* English and Bangla content remain aligned.
* Desktop and mobile behavior remain intact.
* All existing themes remain intact.
* Existing tests continue to pass.
* The project builds without TypeScript or route errors.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not rename, move, or delete existing component files.
* Do not remove working features.
* Do not alter APIs or service contracts.
* Reuse existing components and styles.
* Do not create a new design system.
* Do not use blind text replacement.
* Keep the first navigation layer limited to seven items.
* Use third-level navigation only as content tabs.
* Keep all creation and editing inside the same full-page modal flow.
* Keep all details inside drawers.
* Preserve desktop and mobile behavior.
* Test every modified page in desktop and mobile views.
* Keep EN/BN language parity.
* Finish the full transformation before stopping; do not leave partially renamed NBR pages visible anywhere.
