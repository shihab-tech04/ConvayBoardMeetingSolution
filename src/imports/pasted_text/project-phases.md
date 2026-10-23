# Phase 1 — Stabilize and clean the visible system

Work only on stabilization and UI cleanup in the current Board Meeting Solution project.

Inspect navigation, routes, dashboard shortcuts, help content, mock data, and visible labels.

Requirements:

* Keep visible navigation only for the seven core journeys:

  * User Management
  * Office Hierarchy
  * Agenda Management
  * Document Library
  * Meeting Management
  * Live Meeting
  * Post-Meeting Review
* Hide incomplete Phase 2 features from menus, dashboards, tabs, shortcuts, and public routes.
* Keep their reusable code if it will support the final 100% system.
* Remove visible NBR, tax, return, TIN, PSR, appeal, tribunal, payment, and special-registration content.
* Hide `/special-registration` unless it is actively required by a completed Phase 1 journey.
* Fix broken navigation paths, especially minutes-management links.
* Do not delete shared permissions, workflow, audit, security, notification, reporting, or integration foundations.
* Do not redesign working pages.

Validate routes, imports, console errors, desktop, mobile, EN/BN, and themes before continuing.

---

# Phase 2 — Create one shared data source

Work only on registry consolidation, migration, and persistence.

Inspect:

* `src/app/hooks/useUserRegistry.ts`
* `src/app/data/bmsUsers.ts`
* `src/app/utils/bmsMigration.ts`
* Existing agenda, document, meeting, participant, quorum, minutes, and interaction registries

Requirements:

* Use `bms.*` registries as the single source of truth.
* Remove permanent dual-writing between `nbr.*` and `bms.*`.
* Run the migration once during application startup.
* Preserve old IDs and data where possible.
* Prevent duplicate migration.
* Update pages to read and write through the same registries.
* Keep compatibility adapters only where old data still needs to be read.
* Persist all permanent actions after refresh.
* Do not keep permanent business records only in component state.
* Fix registry and model TypeScript mismatches.

Do not change page design in this phase.

---

# Phase 3 — Complete office hierarchy and user management

Work only on User Management and Office Hierarchy.

Requirements:

* Support:
  `Head Office or Branch → Division → Department → Users`
* Use stable organizational-unit IDs and parent IDs.
* Prevent circular relationships.
* Show the hierarchy as an expandable tree with an optional table view.
* Show unit head, parent path, child units, and assigned users.
* Add users by valid email.
* Prevent duplicate email and employee ID.
* Assign designation, role, permission summary, branch, division, and department.
* Store role, designation, and organizational assignments by ID.
* Keep historical user activity when a user is deactivated.
* Warn before deactivating a unit containing users or child units.
* Make all create, edit, activate, deactivate, and assignment actions persistent.

Reuse the current forms, tables, drawers, buttons, responsive behavior, and styles.

---

# Phase 4 — Complete agenda and document flow

Work only on Agenda Management and Document Library integration.

Requirements:

* Support exactly three agenda levels:

  * Parent
  * Child
  * Final child level
* Show numbering such as `1`, `1.1`, and `1.1.1`.
* Do not allow a fourth level.
* Each agenda must support description, owner, presenter, duration, purpose, confidentiality, voting requirement, approval status, and documents.
* Allow:

  * Upload New Document
  * Select from Document Library
* Add search, filters, multi-selection, and document preview inside the document picker.
* Use the existing unified document viewer.
* Link documents by relationship records; do not duplicate documents.
* Show Unassigned Documents and Attached to Agenda categories.
* Support approve, reject, revision request, and approval history.
* Automatically approve a parent only when all active descendants are approved.
* Recalculate the parent when a child is reopened, rejected, or revised.
* Persist every agenda and document action through shared registries.

Do not create another document viewer or duplicate document system.

---

# Phase 5 — Complete meeting creation and quorum

Work only on the meeting-creation wizard.

Requirements:

* Keep the existing step-based meeting wizard.
* Select existing approved parent agendas.
* Do not create duplicate agendas during meeting creation.
* Allow more than one parent agenda.
* Show the complete agenda hierarchy and attached-document preview before selection.
* Save meeting-agenda links with order.

Split participant selection into:

* Quorum Participants
* Other Participants

Allow selection by:

* Branch
* Multiple branches
* Division
* Department
* Participant group
* Individual user

Requirements:

* Expand organizational selections into actual users.
* Remove duplicates by user ID.
* Allow individual exclusions after bulk selection.
* Store the source of each participant selection.
* Support voting, quorum, and required-participant eligibility.

Create one shared quorum engine supporting:

* Fixed Number
* Percentage
* Role Based
* Virtual attendance
* Alternates
* Recused members
* Required roles
* Lost-quorum actions

Use the same quorum result in meeting creation, preview, readiness, and live meeting.

---

# Phase 6 — Complete live meeting controls

Work only on standard meeting participation and host controls.

Inspect:

* `LiveMeetingWorkspace.tsx`
* `LiveMeetingPage.tsx`
* `MeetingPreJoinPanel.tsx`
* `live-meeting.css`

Requirements:

* Load participants from the meeting-participant registry.
* Add pre-join device checks and rejoin behavior.
* Add waiting room, approve, reject, and admit-all controls.
* Add:

  * Mute all
  * Mute individual
  * Request unmute
  * Remove participant
  * Lock or unlock meeting
  * Copy meeting link
  * Disable participant screen sharing
  * End meeting for all
* Restrict host controls by role.
* Persist participant join, leave, removal, and host actions.
* Recalculate quorum after every attendance or recusal change.
* Apply the configured lost-quorum action.
* Persist chat and restore it after refresh.

Do not add fake external video-meeting APIs. Keep this as a functional front-end prototype using existing service patterns.

---

# Phase 7 — Complete live agenda, documents, recording, transcription, and minutes

Work only inside the live meeting workspace.

Requirements:

* Load agendas through meeting-agenda links.
* Show the full three-level agenda tree.
* Allow start, complete, skip, defer, and reopen actions.
* Load documents linked to the active agenda.
* Use the unified document viewer.
* Support document comments, new upload, new version, presentation, and full-screen presentation.
* Record document interactions.

Recording must support:

* Start
* Pause
* Resume
* Stop
* Persistent recording history

Transcription must support:

* Start
* Pause
* Resume
* Stop
* Speaker
* Timestamp
* Agenda context
* Persistent transcript segments

Minutes capture must have separate:

* Start
* Pause
* Resume
* Stop

Generate draft minutes from actual attendance, agendas, transcript, motions, votes, decisions, resolutions, actions, and document references.

Support temporary agendas during the meeting with `Pending Approval` status.

Do not make transcription and minutes controls depend on each other.

---

# Phase 8 — Complete post-meeting review

Work only on the final meeting record, minutes, and temporary-agenda approval.

Requirements:

Create one connected meeting record with:

* Overview
* Participants and attendance
* Join and leave history
* Quorum history
* Agenda and documents
* Transcript
* Recording
* Chat and interactions
* Motions and votes
* Decisions, resolutions, and actions
* Minutes
* Temporary agendas
* Audit history

Requirements:

* Read from the original shared registries.
* Do not create duplicate archive-only data.
* Fix all incompatible meeting-record field mappings.
* Support minutes editing, comments, revision request, approval, signing, publishing, version history, and amendment history.
* Update the meeting to `Minutes Approved` after final approval.
* Allow temporary agendas to be approved, rejected, or revised.
* Approved temporary agendas can be placed under a permanent parent agenda.
* Rejected temporary agendas remain only in meeting and audit history.
* Keep completed meeting records read-only except for authorized approval and amendment actions.

---

# Phase 9 — Final Phase 1 cleanup and validation

Do not add new features.

Test this full journey:

`Create office → Add user → Create agenda → Attach and preview documents → Approve agenda → Create meeting → Add mixed participant groups → Configure quorum → Run live meeting → Record interactions → Approve minutes → Archive meeting`

Requirements:

* Remove confirmed-unused legacy UI, routes, data, and components.
* Keep hidden code needed for Phase 2 and the final 100% system.
* Hide unfinished future features from visible navigation.
* Remove duplicate registries and hardcoded fallback datasets.
* Fix broken imports, links, model fields, and console errors.
* Confirm persistence after refresh.
* Confirm no duplicate users, participants, agendas, or documents.
* Run type checking, tests, and production build.
* Preserve existing desktop, mobile, themes, accessibility, and EN/BN support.

# Golden Rules

* Complete one phase before starting the next.
* Do not break solved issues.
* Do not change unrelated files.
* Reuse existing components and styles.
* Connect existing features before creating new ones.
* Keep future foundations in code but hide unfinished features from the UI.
* Do not duplicate permanent records.
* Keep governance bodies separate from office hierarchy.
