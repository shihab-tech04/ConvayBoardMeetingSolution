# Master Prompt — Complete the Core 80% of the Board Meeting Solution

Work on the current **Board Meeting Solution** project already available in Figma.

The project already contains most required pages, components, registries, document tools, meeting modules, tables, drawers, modals, themes, responsive behavior, and business functions.

Do not rebuild the project. First inspect the existing code, identify related components, and connect the existing features into one complete user journey.

Create a missing function only when no suitable function already exists.

## Core user journey

Complete this connected flow:

**Office Structure → User Management → Agenda Builder → Document Management → Meeting Creation → Live Meeting → Post-Meeting Review**

All data created in one module must remain available in the next module.

Do not use temporary page-only data for permanent records.

---

# Phase 1 — Shared system foundation

First inspect:

* `src/app/data/boardMeetingData.ts`
* `src/app/data/documentWorkspaceData.ts`
* `src/app/data/mockData.ts`
* `src/app/hooks/`
* Existing registry hooks
* Existing localStorage utilities
* Existing user, role, organizational unit, agenda, document, meeting, attendance, vote, minutes, resolution, and action models

## Requirements

1. Reuse the current registry and persistence pattern.
2. Use stable IDs to connect related records.
3. Do not copy complete entities into other modules.
4. Create relationship records where needed.
5. Preserve existing data and working pages.
6. Keep backward compatibility for existing fields.

Standardize these shared relationships:

* User → Role
* User → Designation
* User → Organizational Unit
* Organizational Unit → Parent Unit
* Agenda → Parent Agenda
* Agenda → Document
* Meeting → Agenda
* Meeting → Participant
* Meeting → Quorum Rule
* Meeting → Live Session
* Meeting → Minutes
* Meeting → Interaction History

Use the `bms.` prefix for new storage keys.

Safely migrate compatible data from old `nbr.*` keys without deleting the old records.

Do not redesign any page during this foundation step.

---

# Phase 2 — User management

Inspect and update the current user, role, permission, designation, invitation, and user detail components.

Important files may include:

* `src/app/hooks/useUserRegistry.ts`
* `src/app/hooks/useRoleRegistry.ts`
* `src/app/components/users/UserFormModal.tsx`
* `src/app/components/users/UserComponents.tsx`
* `src/app/pages/administration-requests/UserManagementPage.tsx`

## Required journey

1. Admin opens User Management.
2. Admin selects Add User.
3. Admin enters a valid email address.
4. Admin enters the user’s name, phone number, employee ID, and other available profile information.
5. Admin selects the user’s designation.
6. Admin selects the user’s role.
7. Show a readable preview of the selected role permissions.
8. Admin assigns the user to the office hierarchy.
9. Admin saves and sends the invitation.
10. The new user appears in the user list and assigned organizational unit.

## User model

Support:

* Email
* Employee ID
* Name
* Phone
* Designation ID
* Role ID
* Primary organizational unit ID
* Branch ID
* Division ID
* Department ID
* Invitation status
* Account status
* Two-factor authentication status

## Rules

* Prevent duplicate email addresses.
* Prevent duplicate employee IDs.
* Do not create duplicate roles or designations.
* Keep current role and permission management.
* Recalculate role user counts when assignments change.
* Support Pending, Active, Inactive, Suspended, and Invited states where already supported.
* Deactivating a user must not remove their historical meeting activity.
* All create, edit, activate, deactivate, and role-assignment actions must persist after refresh.
* Keep the existing table, detail drawer, modal, filters, actions, mobile behavior, and styling.

---

# Phase 3 — Office and organizational hierarchy

Inspect and update the existing organizational-unit pages and related form schemas.

Important files may include:

* `src/app/data/boardMeetingData.ts`
* Existing organization structure pages
* `src/app/pages/boardMeetingFormFields.ts`
* `src/app/pages/boardMeetingDrawerSchemas.ts`
* User form components

Create reusable hierarchy components only if no equivalent already exists.

## Required hierarchy

Support:

* Head Office
* Branch
* Division
* Department
* Users

Allow this structure:

**Head Office or Branch → Division → Department → Users**

The model must remain flexible enough to support child units where required.

## Required journey

1. Admin creates a branch.
2. Admin adds divisions under that branch.
3. Admin adds departments under a branch or division.
4. Admin assigns a unit head.
5. Admin assigns users to the relevant organizational unit.
6. Admin can view the full hierarchy.
7. Admin can open a unit and see its parent, children, unit head, and users.

## Requirements

* Use `parent_unit_id`; do not rely only on parent names.
* Replace free-text parent selection with an organizational-unit picker.
* Prevent circular hierarchy relationships.
* Prevent a unit from becoming its own parent.
* Show the hierarchy as an expandable tree.
* Preserve the current table as an optional list view.
* Show the complete hierarchy path in user and unit details.
* Warn before deactivating a unit that contains users or child units.
* Do not silently remove user assignments.
* Keep office hierarchy separate from boards and committees.
* Do not treat a department as a governance body.

---

# Phase 4 — Agenda builder and management

Inspect and update the current agenda list, agenda forms, drawer schemas, approval actions, registries, and table behavior.

Important files may include:

* `src/app/data/boardMeetingData.ts`
* Current Agenda Management page
* `src/app/pages/boardMeetingFormFields.ts`
* `src/app/pages/boardMeetingDrawerSchemas.ts`
* `src/app/components/pages/GeneratedTablePage.tsx`
* `src/app/pages/modulePageUtils.ts`

Create an agenda tree component only if no reusable hierarchy component exists.

## Agenda hierarchy

Support exactly three levels:

1. Parent agenda
2. Child agenda
3. One final child level

Do not allow a fourth level.

Use numbering such as:

* 1
* 1.1
* 1.1.1

## Agenda fields

Each agenda level must support:

* Title
* Description
* Owner
* Presenter
* Purpose
* Estimated duration
* Display order
* Confidentiality
* Voting requirement
* Approval status
* Approval history
* Attached documents
* Temporary agenda status

## Required journey

1. User creates a parent agenda.
2. User adds child agendas.
3. User may add one final child level under a child agenda.
4. User enters descriptions and other required details.
5. User uploads a new document or selects an existing document.
6. User previews selected documents before attaching them.
7. User submits each agenda for approval.
8. Approvers approve, reject, or request revision.
9. Parent approval is calculated automatically from its descendants.

## Approval logic

* Each agenda has its own approval process.
* A leaf agenda can be submitted and approved independently.
* A parent becomes Approved only when all active descendants are Approved.
* When an approved descendant is reopened, rejected, or sent for revision, recalculate the parent status.
* Show progress such as `4 of 5 child agendas approved`.
* Store every approval action with actor, date, status, and note.
* Approval actions must update the agenda registry.
* Do not update only temporary table state.
* Only approved parent agendas can later be added to a meeting.

## UI behavior

* Use expandable agenda rows or cards.
* Keep one main View action in the list.
* Put Edit, Submit, Approve, Reject, and Request Revision in the detail drawer.
* Reuse existing drawer, form, status chip, button, and table styles.
* Preserve current responsive behavior.

---

# Phase 5 — Document management

Reuse the current document workspace.

Inspect:

* `src/app/data/documentWorkspaceData.ts`
* `src/app/pages/agenda-documents/DocumentLibraryPage.tsx`
* `src/app/components/documents/DocumentComposerModal.tsx`
* `src/app/components/documents/DocumentDetailsDrawer.tsx`
* `src/app/components/documents/UnifiedDocumentViewer.tsx`
* Existing PDF, Word-style, and spreadsheet components

Do not create another document viewer.

## Document library categories

The library must clearly support:

1. Unassigned Documents
2. Attached to Agenda

Keep useful existing filters and document statuses.

## Required document journey

1. User uploads or creates a document.
2. The document appears as Unassigned when it has no agenda link.
3. During agenda creation, the user can:

   * Upload New Document
   * Select from Document Library
4. The document picker supports search and filters.
5. The user can preview a document without closing the picker.
6. The user selects one or multiple documents.
7. The system creates agenda-document links.
8. The original document remains in the document library.
9. Unlinking a document does not delete the document.

## Document relationship rules

Create or standardize an agenda-document link containing:

* Agenda ID
* Document ID
* Document version ID
* Linked by
* Linked date
* Display order
* Primary document status

## Requirements

* Do not duplicate documents when attaching them.
* Allow one document to be linked to multiple agendas when permissions allow.
* Show linked agenda names in document details.
* Show linked version, confidentiality, status, and owner before selection.
* Support document version history.
* Support document comments.
* Support document access control.
* Support document approval where already available.
* Support upload, preview, open, edit, and download through the existing components.
* Keep document preview above detail drawers or modals; do not allow it to appear underneath another overlay.
* Use one consistent file attachment UI across the system.

---

# Phase 6 — Board meeting creation

Inspect and update the existing meeting creation wizard and meeting registries.

Important files may include:

* `src/app/pages/return-register/OnlineReturnRegisterPage.tsx`
* Existing meeting creation pages
* `src/app/pages/boardMeetingFormFields.ts`
* `src/app/components/forms/MeetingReviewPanel.tsx`
* `src/app/pages/meetings/MeetingContextualModals.tsx`
* `src/app/data/boardMeetingData.ts`

Preserve the current step-based meeting creation flow unless a working equivalent already exists.

## Meeting creation steps

The meeting creation flow should cover:

1. Meeting details
2. Date, time, mode, venue, and online meeting details
3. Agenda selection
4. Participant selection
5. Quorum setup
6. Documents and notification review
7. Final preview and publish

## Agenda selection

* Select agendas from the existing approved parent agenda list.
* Allow selecting more than one parent agenda.
* Do not recreate or duplicate agendas inside a meeting.
* Before adding an agenda, show:

  * Full agenda hierarchy
  * Descriptions
  * Owners and presenters
  * Approval statuses
  * Estimated duration
  * Attached documents
* Allow users to expand and navigate the full agenda before selection.
* Store meeting-agenda links with display order.
* Allow agenda reordering inside the meeting.
* Block publishing if any selected agenda is not approved.

## Participant selection

Split participants into:

1. Quorum Participants
2. Other Participants

Allow admins to select any combination of:

* Entire branch
* Multiple branches
* Division
* Department
* Participant group
* Individual user

## Participant behavior

* Expand organizational selections into individual users.
* Remove duplicate users automatically.
* Show the final participant list before saving.
* Allow individual users to be excluded after bulk selection.
* Store how each participant was added.
* Show organizational hierarchy and designation.
* Set voting eligibility.
* Set quorum eligibility.
* Set required-participant status.
* Keep the user only once even when selected through multiple sources.

## Quorum configuration

Use one normalized quorum model.

Support:

* Fixed Number
* Percentage
* Role Based

Support these rules:

* Minimum members
* Minimum percentage
* Required roles
* Virtual attendance
* Alternate participants
* Recused participants
* Lost-quorum behavior

Fix existing inconsistent field names such as:

* `min_members` and `minimum_members`
* `min_percentage` and `quorum_percent`

Use one shared quorum result in:

* Meeting creation
* Meeting preview
* Participant forecast
* Meeting readiness
* Live meeting

## Final review

Before publishing, show:

* Meeting information
* Selected agenda hierarchy
* Documents
* Quorum participants
* Other participants
* Quorum rules
* Expected quorum status
* Meeting mode
* Venue or meeting link
* Chairperson
* Secretary
* Notification plan

Do not remove existing invitation, RSVP, conflict declaration, board pack, or readiness functions where they already exist.

---

# Phase 7 — Live board meeting

Inspect and update:

* `src/app/pages/meetings/LiveMeetingWorkspace.tsx`
* `src/app/pages/meetings/LiveMeetingPage.tsx`
* `src/app/components/meetings/MeetingPreJoinPanel.tsx`
* `src/styles/live-meeting.css`
* Existing meeting, agenda, document, attendance, voting, and minutes registries

Reuse existing live meeting components and controls.

This remains a front-end prototype unless a real meeting provider is already connected. Do not create fake external APIs.

## Joining the meeting

Support:

* Pre-join device check
* Audio selection
* Video selection
* Join request
* Waiting room
* Host approval
* Reject join request
* Admit all
* Participant join and leave tracking

## Standard participant controls

Support:

* Microphone
* Camera
* Screen sharing
* Full-screen sharing
* Participant list
* Chat
* Raise hand
* Reactions where already supported
* Leave meeting
* Connection state
* Rejoin after disconnect

## Host and admin controls

Support:

* Mute all
* Mute one participant
* Request unmute
* Remove participant
* Lock meeting
* Unlock meeting
* Approve join request
* Reject join request
* Copy meeting link
* Share meeting link
* Disable participant screen sharing
* End meeting for all
* Start, pause, resume, and stop recording
* Start, pause, resume, and stop transcription

Only authorized roles should see host controls.

## Live agenda

* Load agendas linked to the meeting.
* Show the complete three-level structure.
* Allow quick navigation between agenda items.
* Show the currently active agenda.
* Allow the host to start, complete, skip, defer, or reopen an agenda item.
* Show agenda description, owner, presenter, duration, documents, comments, voting, motions, and decisions.

## Live documents

* Show only documents linked to the selected agenda.
* Use the existing unified document viewer.
* Allow easy movement between documents.
* Allow document comments.
* Allow new document upload.
* Allow new version upload.
* Allow one document to be presented.
* Allow full-screen document presentation.
* Keep a record of document views, comments, uploads, and presentations.

## Voting and decisions

Reuse existing motion, vote, decision, resolution, and action-item functions.

Support:

* Create motion
* Second motion
* Open vote
* Cast vote
* Abstain where configured
* Close vote
* Show result
* Cancel or reopen vote when authorized
* Create decision
* Create resolution
* Assign action item

Link each action to the correct agenda and meeting.

## Transcription

Support:

* Start
* Pause
* Resume
* Stop
* Speaker name
* Timestamp
* Agenda context
* Persistent transcript segments

Pausing transcription must not automatically pause minutes generation.

## Minutes capture

Support:

* Automatic draft minutes generation
* Pause minutes capture
* Resume minutes capture
* Manual notes
* Agenda-based minutes sections
* Attendance
* Quorum events
* Motions
* Votes
* Decisions
* Resolutions
* Actions
* Document references
* Transcript references

Pausing minutes must not automatically pause transcription.

## Recording

Create a persistent recording record with:

* Start time
* Pause time
* Resume time
* Stop time
* Duration
* Status
* Started by
* Meeting ID

## Temporary agenda

Allow authorized users to create a temporary agenda during the meeting.

A temporary agenda must:

* Be linked to the current meeting
* Support description and documents
* Support discussion, comments, motions, and votes
* Have Pending Approval status
* Remain available during the current meeting
* Not appear in the permanent agenda library until post-meeting approval

## Quorum behavior

Recalculate quorum when:

* A participant joins
* A participant leaves
* A participant is removed
* A participant becomes recused
* A required participant joins or leaves

Apply the configured lost-quorum action.

Do not use one hardcoded response for every meeting.

## Persistence

Persist:

* Attendance
* Join and leave events
* Chat
* Comments
* Agenda activity
* Document activity
* Motions
* Votes
* Decisions
* Resolutions
* Actions
* Quorum changes
* Recording state
* Transcript
* Draft minutes
* Host actions
* Temporary agendas

Do not keep important meeting records only inside component state.

---

# Phase 8 — Post-meeting review

Inspect and update:

* `src/app/pages/archive-reports/MeetingArchivePage.tsx`
* `src/app/pages/archive-reports/MinutesManagementPage.tsx`
* `src/app/pages/archive-reports/RegisterPages.tsx`
* `src/app/pages/archive-reports/AnalyticsPages.tsx`
* Existing attendance, minutes, vote, decision, resolution, action, transcript, and archive registries

Create one complete meeting record page only if no suitable page already exists.

## Required journey

After a meeting ends, an authorized admin or secretary must be able to review the complete meeting.

The record should include:

* Meeting overview
* Participants
* Attendance
* Join and leave times
* Quorum history
* Agenda structure
* Agenda status changes
* Documents
* Document comments
* Document uploads and versions
* Chat
* Transcription
* Recording record
* Motions
* Votes
* Decisions
* Resolutions
* Action items
* Temporary agendas
* Draft minutes
* Approval history
* Audit history

## Meeting record structure

Use tabs or clear collapsible sections:

1. Overview
2. Participants and Attendance
3. Quorum History
4. Agenda and Documents
5. Transcription
6. Recording
7. Chat and Interaction History
8. Motions and Votes
9. Decisions, Resolutions, and Actions
10. Minutes
11. Audit History

## Minutes flow

Support:

* Auto-generated draft minutes
* Secretary review
* Manual editing
* Chairperson review
* Member review where configured
* Comments
* Revision request
* Approval
* Signing
* Final publishing
* Version history
* Amendment history
* Archive

Minutes approval actions must update the minutes registry.

When minutes are finally approved, update the meeting status to `Minutes Approved`.

Do not maintain separate disconnected minutes data.

## Temporary agenda approval

After the meeting:

1. Show temporary agendas created during the meeting.
2. Allow an authorized approver to review each agenda.
3. Allow approval, rejection, or revision request.
4. When approved, allow placement under a selected permanent parent agenda.
5. Convert the agenda into a permanent agenda without losing its meeting history.
6. Rejected temporary agendas must remain in the audit history.
7. Rejected temporary agendas must not appear in the permanent agenda list.

## Archive behavior

* Archived meeting records must use the original linked data.
* Do not create duplicate archive-only copies of decisions, votes, documents, or attendance.
* Archived records should be read-only except for authorized approval, signing, amendment, and archival actions.
* Preserve all historical links even when a user or organizational unit later becomes inactive.

---

# Phase 9 — Core integration and testing

After completing the above phases, test this exact end-to-end journey:

1. Create a branch.
2. Create a division.
3. Create a department.
4. Add a user by email.
5. Assign designation, role, permissions, and department.
6. Create a parent agenda.
7. Create child agendas.
8. Create the final child level.
9. Upload a new document.
10. Select an existing document.
11. Preview and attach documents.
12. Submit and approve all child agendas.
13. Confirm automatic parent approval.
14. Create a board meeting.
15. Select multiple approved parent agendas.
16. Preview their complete hierarchy.
17. Add quorum participants using organizational selections.
18. Add other participants using mixed selections.
19. Remove duplicate participants.
20. Configure quorum rules.
21. Publish the meeting.
22. Join the live meeting.
23. Admit participants.
24. Navigate agendas.
25. View and present documents.
26. Add comments.
27. Upload a document.
28. Create a motion.
29. Run a vote.
30. Create a decision and action item.
31. Record transcript and minutes.
32. Create a temporary agenda.
33. End the meeting.
34. Review attendance and interaction history.
35. Review transcript and recording.
36. Edit and approve minutes.
37. Approve or reject the temporary agenda.
38. Open the final archived meeting record.

## Technical validation

Verify:

* All records persist after refresh.
* No duplicate users are created.
* No duplicate participants are added.
* No duplicate documents are created through agenda attachment.
* Agenda hierarchy stops at three levels.
* Parent approval recalculates correctly.
* Meeting agendas reference existing agendas.
* Organizational bulk selection resolves to real users.
* Quorum uses one shared engine.
* Live meeting activity appears in the post-meeting record.
* Minutes approval updates the meeting status.
* Archive reads from the original records.
* Existing routes still work.
* Existing desktop and mobile layouts remain stable.
* EN and BN content remain consistent.
* Themes remain functional.
* Existing tests pass.
* Type checking passes.
* Production build succeeds.
* No new console errors appear.

# Scope limitations

This phase covers the core 80–85% only.

Do not add the remaining enterprise completion features unless they already exist and are required to keep the core journey working.

Do not expand this phase into:

* Advanced authentication
* Full SSO integration
* Advanced RSVP workflows
* Full conflict-of-interest management
* Advanced board-pack publishing
* Complex recurring meeting templates
* Advanced calendar integration
* Enterprise notification settings
* Legal hold
* Advanced security monitoring
* Full governance analytics
* Advanced delegation and proxy management
* Disaster recovery infrastructure

Keep the data models flexible enough to support these later without rebuilding the current modules.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not remove working features.
* Do not rebuild features that already exist.
* Inspect the existing project before creating anything.
* Reuse existing components, registries, styles, viewers, drawers, modals, and form patterns.
* Connect disconnected functions before creating new functions.
* Use stable IDs and relationship records.
* Do not duplicate users, agendas, documents, participants, votes, or archive data.
* Do not keep permanent records only in temporary page state.
* Preserve desktop and mobile behavior.
* Preserve themes and accessibility.
* Keep EN/BN language parity.
* Keep governance bodies separate from office hierarchy.
* Keep approved historical records intact.
* Complete and test each internal phase before moving to the next.
