# Live Board Meeting — Complete Full-Screen Meeting Session Journey

Work only on the existing **Live Board Meeting** journey in the current Board Meeting Solution.

The required journey is:

`Scheduled Meeting → Open Meeting Details → Pre-Meeting Readiness → Start or Join Meeting → Confirm Attendance and Quorum → Discuss Agenda Items → View Documents → Record Motions and Votes → Record Decisions and Actions → End Meeting → Open Meeting Record`

Do not rebuild Board Meeting Creation, Agenda Management, Document Management, Meeting Calendar, or Post-Meeting Review.

Do not redesign the entire system.

Do not create duplicate meetings, participants, agendas, documents, votes, decisions, resolutions, action items, attendance records, or audit records.

Keep the interface simple, focused, and suitable for use during an active board meeting.

---

## 1. Inspect the existing project first

Before modifying anything, search the current project for the existing implementations related to:

* Live Meeting
* Meeting Workspace
* Virtual Meeting
* Meeting Details
* Start Meeting
* Join Meeting
* Resume Meeting
* Meeting Attendance
* Meeting Quorum
* Agenda Navigation
* Agenda Documents
* Motions
* Voting
* Decisions
* Resolutions
* Action Items
* Meeting Notes
* Minutes
* Meeting Records
* Meeting Audit
* Virtual-session handling

Inspect likely files and their current equivalents, including:

```text
src/app/pages/live-meeting/*
src/app/pages/meetings/*
src/app/components/live-meeting/*
src/app/components/meeting/*
src/app/components/documents/*
src/app/components/drawers/DynamicDetailsDrawer.tsx
src/app/components/modals/AppModal.tsx
src/app/components/ResponsiveOverlay.tsx
src/app/actions/resolvers/meetingActions.ts
src/app/data/boardMeetingData.ts
src/app/data/governanceMemberships.ts
src/app/data/bmsUsers.ts
src/app/utils/*
```

Reuse the existing:

* Meeting registry
* Meeting participant links
* Meeting agenda links
* Meeting document links
* Agenda registry
* Agenda-document links
* Document Library
* Unified Document Viewer
* Document version records
* Governance memberships
* Quorum rules
* Voting records
* Decision records
* Resolution records
* Action-item records
* Audit registry
* Centralized permissions
* Shared buttons
* Tabs
* Cards
* Drawers
* Modals
* Confirmation dialogs
* Status badges
* Rich-text editor
* Responsive behavior
* EN/BN language system
* Theme system

Do not create another application shell, viewer, editor, meeting registry, participant registry, quorum engine, permission engine, or design system.

If a required live-meeting record does not exist, add only the smallest backward-compatible record or relationship needed inside the existing Board Meeting data system.

---

# 2. Preserve the Meeting List and Meeting Details journey

Keep the existing Meeting List unchanged.

The meeting table must continue using the project’s existing shared table.

Keep only one table-row action:

`View`

Do not add separate Start, Join, Resume, Cancel, or End buttons inside the table row.

All contextual actions must appear inside the existing Meeting Details drawer.

## Meeting Details actions

Show actions based on the meeting status, time, participant relationship, and centralized permissions.

### Draft

* Complete Draft
* Edit Meeting

### Scheduled

For authorized meeting controllers:

* Edit Meeting
* Reschedule
* Cancel
* Start Meeting

For invited participants:

* Join Meeting

### In Progress

For authorized controllers:

* Resume Meeting

For eligible participants:

* Join Meeting

### Completed

* View Meeting Record

### Cancelled or Archived

* View Details
* View History

Do not remove the working Start Meeting or Join Meeting actions.

Do not show actions that are invalid for the current status.

Do not hardcode permissions using names or designation text.

---

# 3. Start and Join availability

## Start Meeting

Show Start Meeting only when:

* Meeting status is Scheduled.
* Current user has Start Meeting permission.
* Current user is an authorized Chairperson, Meeting Secretary, Organizer, or other explicitly permitted controller.
* Required meeting data exists.
* The configured start window has opened or an authorized override is used.

If the user attempts to start too early, show a clear confirmation with the scheduled time.

Do not silently change the scheduled time.

## Join Meeting

Show Join Meeting only when:

* Current user is linked to the meeting as a participant or has an authorized support role.
* Meeting status is Scheduled or In Progress.
* The join window is open.
* The participant has permission to access the meeting.

Joining must not automatically grant:

* Voting permission
* Quorum eligibility
* Meeting-control permission
* Confidential-document access

## Resume Meeting

Resume Meeting must open the same active live session.

Do not create a second live session.

---

# 4. Create one live session per meeting

A meeting may have only one active live-session record.

Use one stable session ID throughout the live meeting.

Required lifecycle:

```text
Scheduled Meeting
→ Start Meeting creates or activates one Live Session
→ Join and Resume use the same Live Session
→ Refresh restores the same Live Session
→ End Meeting closes the same Live Session
```

Do not create another session every time someone joins or refreshes.

The live-session record should reference:

* Session ID
* Meeting ID
* Status
* Actual start time
* Actual end time
* Started by
* Current agenda item ID
* Active vote ID, when applicable
* Quorum state
* Last activity time

Use existing fields when available.

Do not duplicate complete meeting, agenda, participant, or document data inside the session.

---

# 5. Pre-Meeting Readiness screen

Selecting Start Meeting must first open a focused full-screen readiness view.

Do not immediately mark the meeting In Progress before the authorized user confirms readiness.

Use:

* Fixed header
* Scrollable body
* Fixed footer
* Existing full-screen modal or full-screen meeting route

## Header

Show:

* Meeting title
* Meeting reference
* Scheduled date and time
* Meeting mode
* Current meeting status

## Readiness sections

Show only these sections:

### Meeting Setup

* Board / Committee
* Chairperson
* Meeting Secretary
* Organizer
* Physical, Virtual, or Hybrid mode
* Venue or virtual access status

### Participants

Show:

* Total invited
* Checked in
* Quorum Members present
* General Members present
* Required leadership present
* Not joined

### Quorum

Show:

* Quorum rule
* Required count or percentage
* Present eligible count
* Required roles
* Met
* Not Met
* At Risk
* Not Configured

Use the same shared quorum calculator introduced for Board Meeting Creation.

For pre-meeting and live-meeting calculations, use actual attendance rather than RSVP.

### Agendas

Show:

* Parent agenda count
* Child agenda count
* Total agenda duration
* Agenda readiness
* Agenda-document availability

### Documents

Show:

* Total pinned meeting documents
* Missing source files
* Restricted-access issues
* Unsupported-preview warnings

Keep the information compact.

Do not display large decorative KPI sections.

## Footer

Left:

* Close

Right:

* Save Attendance
* Start Meeting

Start Meeting must be disabled while critical blockers exist.

Allow authorized users to proceed with a noncritical warning only through the existing confirmation pattern and a required reason.

---

# 6. Attendance and check-in

Attendance must use canonical meeting-participant relationships and stable user IDs.

Do not create free-text attendees.

## Attendance states

Use only necessary states:

* Not Joined
* Present
* Temporarily Away
* Left
* Excused
* Recused

Do not treat RSVP as attendance.

## Check-in behavior

Virtual participants may be marked Present when they successfully join the live session.

Physical and Hybrid meetings must allow authorized users to check participants in manually.

The system must prevent duplicate attendance records when:

* A participant joins virtually.
* The same participant is manually checked in.
* A Hybrid participant switches between physical and virtual attendance.

Use one participant attendance record with an attendance mode such as:

* Physical
* Virtual
* Hybrid

## Participant categories

Keep separate:

* Quorum Members
* General Members

Each participant item should show:

* Name
* Meeting role
* Participant category
* Required or Optional
* Voting eligibility
* Attendance state
* Attendance mode

## Attendance permissions

Only authorized users may:

* Manually check in a participant
* Mark temporarily away
* Mark left
* Mark excused
* Correct attendance
* Mark recusal

Participants may update only their own permitted join or leave state.

Log every manual attendance correction with:

* Previous state
* New state
* Actor
* Date and time
* Reason

---

# 7. Actual quorum calculation

Use one shared quorum engine for:

* Pre-Meeting Readiness
* Live Meeting header
* Participant panel
* Voting eligibility
* Meeting summary
* Meeting Details drawer
* Meeting Record

Do not create another calculation inside Live Meeting.

## Actual quorum inputs

Use:

* Present active Quorum Members
* Canonical governance memberships
* Meeting-specific authorized overrides
* Required roles
* Attendance mode
* Whether virtual participation counts
* Recusal status
* Alternate-member rules
* Existing configured quorum rule

Do not count:

* General Members
* Observers
* Presenters
* Invitees
* Excused participants
* Participants who have left
* Recused participants when the rule excludes them

## Quorum states

Show:

* Met
* At Risk
* Lost
* Not Met
* Not Configured

When quorum changes, update every live-meeting surface immediately.

## Quorum-loss behavior

When quorum is lost:

* Show a persistent warning in the live header.
* Explain the exact reason.
* Block starting a new vote when the governing rule requires quorum.
* Block recording a formal approval or resolution when required.
* Allow discussion to continue only when policy permits.
* Do not silently end the meeting.
* Log when quorum was lost and restored.

Do not change the organization’s canonical quorum rule from the live workspace.

---

# 8. Full-screen Live Meeting workspace

After Start Meeting is confirmed, open a dedicated full-screen Live Meeting workspace.

Do not display Live Meeting inside a normal popup modal.

Do not place it underneath the Meeting Details drawer.

The Live Meeting must appear above all normal page content.

For Virtual and Hybrid meetings, the virtual-session experience must be:

* A separate full-screen Live Meeting route, or
* A full-screen meeting view

Do not embed a small video-call panel inside the normal Meeting List page.

Do not build a fake video-conferencing platform.

Reuse the existing virtual-session foundation and show only integrations that genuinely exist.

---

# 9. Live Meeting layout

Keep the workspace clean.

## Fixed top header

Show:

* Meeting title
* Meeting reference
* In Progress status
* Actual elapsed time
* Meeting mode
* Quorum status
* Present participant count
* Current user role

Header actions:

* Participants
* Documents
* Decisions and Actions
* More
* Leave Meeting
* End Meeting, only when authorized

Do not overcrowd the header with every possible action.

## Desktop body

Use a two-column structure:

### Left: Agenda navigation

Use a compact agenda rail.

### Main: Active agenda workspace

Show the active child agenda and its relevant controls.

Use contextual drawers or panels for:

* Participants
* Documents
* Voting
* Decisions and Actions

Do not use three permanently wide columns that leave insufficient space for the agenda content.

## Tablet

Allow the Agenda rail to collapse.

Open supporting panels through the existing responsive overlay.

## Mobile

Use this order:

1. Compact meeting header
2. Current agenda selector
3. Active agenda content
4. Agenda actions
5. Contextual bottom sheets
6. Sticky meeting controls

Do not force the desktop layout onto mobile.

Do not create horizontal overflow.

---

# 10. Live agenda navigation

Use the canonical parent-child agenda hierarchy.

The live meeting must show:

```text
Parent Agenda
└── Multiple Child Agendas
```

Do not create new Level 3 agendas.

## Parent agendas

Use parent agendas as section headings.

Show:

* Parent title
* Child count
* Total duration
* Completion progress

The parent itself does not need a separate discussion state unless an existing business rule requires it.

## Child agendas

Each direct child is a live discussion item.

Show:

* Automatic agenda number
* Child title
* Purpose
* Presenter
* Planned duration
* Document count
* Status

Use these live states:

* Not Started
* In Discussion
* Completed
* Deferred
* Skipped

Only one child agenda may be In Discussion at a time.

## Agenda controls

Authorized Chairperson or Secretary may:

* Start Agenda Item
* Complete Agenda Item
* Move to Next Item
* Return to Previous Item
* Defer
* Skip
* Reopen Completed Item

Require a reason for:

* Defer
* Skip
* Reopen

Do not allow ordinary participants to change agenda states.

## Time tracking

Show:

* Planned duration
* Actual elapsed duration
* Remaining time
* Overrun state

Use a subtle warning when the item exceeds its planned duration.

Do not block discussion solely because the duration has expired.

Persist the actual start and completion time for each agenda item.

---

# 11. Active agenda workspace

When a child agenda is active, show:

## Agenda summary

* Agenda title
* Parent agenda
* Purpose
* Presenter
* Planned duration
* Actual elapsed duration
* Status

## Discussion details

Render the existing child agenda’s rich-text discussion details safely.

Do not display raw HTML.

Do not edit the original agenda content during the meeting.

## Documents

Show only documents linked to:

* The active child agenda
* Its parent agenda
* The meeting as additional documents

Clearly show each document’s source.

## Meeting notes

Authorized Meeting Secretary users may record concise official discussion notes.

Reuse the existing rich-text editor configuration with a compact toolbar.

Keep only:

* Bold
* Italic
* Underline
* Bulleted list
* Numbered list
* Link
* Undo
* Redo

Autosave notes to the existing meeting-minutes or meeting-notes data layer.

Do not create a second rich-text editor system.

Do not overwrite agenda descriptions.

---

# 12. Document experience during Live Meeting

Use the existing Unified Document Viewer and document workspaces.

Do not create another viewer.

## Document version

Use the document version pinned when the meeting was scheduled.

Do not automatically replace it with a newer Document Library version during the meeting.

Show:

* Document name
* Pinned version
* Confidentiality
* Source agenda
* Preview availability

## Viewer behavior

Opening a document must:

* Preserve the live session
* Preserve the active agenda
* Open above the live workspace
* Return to the same meeting state after closing

Route formats correctly:

* PDF → PDF workspace
* Spreadsheet → Spreadsheet workspace
* Image → Existing image viewer
* Rich text → Read-only editor view
* Unsupported presentation or file → Honest unsupported-preview state with Download

Do not send every document to the PDF viewer.

## Editing restrictions

Do not allow ordinary editing of meeting documents during the live session.

Show Open Editor only when:

* Existing business rules allow live editing
* User has permission
* The document is not pinned as an immutable approved version

Never overwrite the pinned meeting version.

Any permitted edit must create a new document version.

---

# 13. Participant panel

Open Participants using the existing contextual panel or responsive overlay.

Show separate groups:

### Quorum Members

### General Members

Each participant displays:

* Name
* Meeting role
* Required or Optional
* Voting eligibility
* Attendance state
* Attendance mode
* Recusal state where relevant

Provide compact filters:

* All
* Present
* Not Joined
* Temporarily Away
* Left
* Excused

Do not add unnecessary participant statistics.

Authorized controls may:

* Update attendance
* Correct attendance
* Mark recused
* Restore from recusal
* Assign or update Presenter role when valid

Do not edit permanent governance membership from Live Meeting.

---

# 14. Agenda-specific recusal

Allow authorized users to mark a participant recused from the active agenda item.

A recusal must be linked to:

* Meeting ID
* Agenda ID
* Participant user ID
* Start time
* End time, where applicable
* Reason
* Actor

Recusal may affect:

* Quorum
* Voting eligibility
* Decision participation

Use the shared quorum rule to determine whether recusal changes quorum.

Do not permanently change the participant’s meeting category.

When the meeting moves to another agenda, prompt authorized users to end the agenda-specific recusal when appropriate.

---

# 15. Motion creation

Motions must be connected to the active child agenda.

Do not create motions without a meeting and agenda relationship.

Use the existing motion or resolution registry where available.

## Create Motion

Show a focused popup modal because this is a simple form.

The modal must use:

* Fixed header
* Scrollable body when necessary
* Footer with all buttons in one row

Show only:

### Required

* Motion text
* Proposed by

### Conditional

* Seconded by, only when required by the configured rules
* Voting method
* Approval threshold

### Optional

* Short note

Use canonical participant user IDs.

Do not use free-text proposer or seconder names.

Do not show unnecessary legal or administrative fields during live creation.

## Motion status

Use only relevant statuses:

* Draft
* Open for Voting
* Passed
* Failed
* Tied
* Withdrawn
* Deferred

Only authorized users may create, edit, withdraw, or open a motion for voting.

---

# 16. Voting experience

Use the existing voting system where available.

Do not create a duplicate voting registry.

Only one vote may be active at a time unless the existing approved business rules support parallel votes.

## Eligible voters

Calculate eligible voters from:

* Selected meeting participants
* Present attendance state
* Canonical voting eligibility
* Agenda-specific recusal
* Participant role restrictions
* Existing voting rules

Do not allow:

* General non-voting participants to vote
* Excused participants to vote
* Participants who left to vote
* Recused participants to vote
* The same user to vote twice

## Vote options

Use:

* For
* Against
* Abstain

Use another set only when the existing project already requires it.

## Voting methods

Support only methods already supported by the current system, such as:

* Open Vote
* Secret Vote
* Unanimous Consent

Do not show nonfunctional methods.

## Open vote state

Show:

* Motion text
* Eligible voter count
* Votes received
* Remaining votes
* Time opened
* Quorum state

Each eligible participant sees one clear Vote action.

## Close vote

Only authorized Chairperson or Secretary users may close voting.

Before closing, show:

* Eligible voters
* Votes received
* Missing votes
* Current totals
* Quorum status

## Results

Calculate the result using the configured threshold.

Show:

* For
* Against
* Abstain
* Not Voted
* Passed
* Failed
* Tied

Apply an existing Chairperson casting-vote rule only when configured.

Do not invent a casting vote.

Once closed, a vote result must become immutable.

A correction must use an authorized Reopen or Void action with:

* Reason
* Actor
* Date
* Audit history

Do not silently edit vote totals.

---

# 17. Decisions and resolutions

After discussion or voting, authorized users may create a Decision or Resolution linked to the active child agenda.

Use existing records and terminology.

Do not create duplicate decision systems.

## Record Decision

Show only:

* Decision text
* Decision type
* Related motion, when applicable
* Effective date, only when needed

Automatically store:

* Meeting ID
* Parent agenda ID
* Child agenda ID
* Motion ID
* Vote result
* Created by
* Created date

## Record Resolution

Show only when the existing workflow distinguishes resolutions from decisions.

Link it to the active agenda and vote.

Do not require users to re-enter information already available from the motion or vote.

## Decision state

Use existing statuses such as:

* Draft
* Confirmed
* Superseded
* Withdrawn

Do not mark a decision confirmed if the required vote did not pass.

---

# 18. Action items

Allow authorized users to create an action item from the active agenda, decision, or resolution.

Use a simple popup form.

Show only:

### Required

* Action
* Assigned To
* Due Date

### Optional

* Priority
* Short note

Use a canonical active-user selector for Assigned To.

Automatically link:

* Meeting ID
* Parent agenda ID
* Child agenda ID
* Decision or resolution ID
* Created by
* Created date

Default status:

`Open`

Do not show unnecessary workflow inputs during creation.

Do not create duplicate action items after repeated submission.

---

# 19. Decisions and Actions panel

Provide one contextual panel named:

`Decisions and Actions`

Show compact sections:

* Motions
* Vote Results
* Decisions
* Resolutions
* Action Items

Each item must show only its essential summary and status.

Do not create separate permanent sidebars for each item type.

Allow authorized users to open details or edit valid Draft records.

Do not allow editing finalized votes or confirmed decisions without an audited formal action.

---

# 20. Meeting controller permissions

Use the centralized permission system.

Do not hardcode controls by user name or designation text.

Required capabilities include:

* Start Meeting
* Join Meeting
* Resume Meeting
* Manage Attendance
* Control Agenda
* View Confidential Documents
* Manage Meeting Documents
* Record Meeting Notes
* Create Motion
* Open Vote
* Cast Vote
* Close Vote
* Reopen or Void Vote
* Record Decision
* Record Resolution
* Create Action Item
* End Meeting
* View Meeting Audit

## Typical behavior

### Chairperson

May control the meeting, agenda, motions, votes, and end the meeting when granted by permissions.

### Meeting Secretary

May manage attendance, agenda progress, notes, motions, decisions, actions, and meeting records when granted.

### Organizer

May manage technical meeting access and participant check-in when granted.

### Quorum Member

May participate and vote only when voting eligible and present.

### General Member

May participate and view permitted content but does not count toward quorum.

### Presenter

May view and present assigned agenda content.

### Observer

May view permitted content but cannot vote or control the meeting.

These behaviors must still come from permissions and relationships, not hardcoded role labels alone.

Enforce permissions in handlers as well as the UI.

---

# 21. Live Meeting audit trail

Record meaningful live events using the existing audit system.

Include:

* Meeting started
* Participant joined
* Attendance corrected
* Quorum met
* Quorum lost
* Quorum restored
* Agenda item started
* Agenda item completed
* Agenda item deferred
* Agenda item skipped
* Document opened
* Recusal started
* Recusal ended
* Motion created
* Vote opened
* Vote cast
* Vote closed
* Vote reopened or voided
* Decision recorded
* Resolution recorded
* Action item created
* Meeting ended

Each event must include:

* Meeting ID
* Agenda ID when applicable
* Actor user ID
* Timestamp
* Event type
* Relevant before and after values
* Reason when required

Do not record passwords, confidential tokens, or private vote choices in general audit text.

---

# 22. Refresh, reconnect, and recovery

The live meeting must survive page refresh and temporary disconnection.

After refresh:

* Restore the active session.
* Restore the active agenda item.
* Restore attendance.
* Restore quorum.
* Restore agenda progress.
* Restore meeting notes.
* Restore the active vote.
* Restore votes already cast.
* Restore decisions and action items.
* Restore open document context when safely possible.

Do not create duplicate records during recovery.

Use idempotent action handling for:

* Start Meeting
* Join Meeting
* Save Attendance
* Start Agenda
* Complete Agenda
* Create Motion
* Cast Vote
* Close Vote
* Record Decision
* Create Action Item
* End Meeting

Do not claim real cross-device synchronization or WebSocket delivery unless the current project genuinely supports it.

Use the current persistence architecture and prepare clean adapter boundaries for future API integration.

---

# 23. Leave Meeting behavior

Participants may leave the workspace without ending the meeting.

Show:

`Leave Meeting`

Behavior:

* Update the participant’s attendance state when appropriate.
* Recalculate quorum.
* Keep the meeting In Progress.
* Return the participant to Meeting Details or Meeting List.
* Allow rejoining while the meeting remains active and permissions remain valid.

Do not show End Meeting to ordinary participants.

Warn the user when leaving may cause quorum loss.

---

# 24. End Meeting journey

Only authorized users may end the meeting.

Selecting End Meeting must open a confirmation modal.

## Pre-end summary

Show:

* Actual meeting duration
* Agenda items completed
* Agenda items deferred
* Agenda items skipped
* Current quorum state
* Motions and votes
* Decisions and resolutions
* Open action items
* Unsaved meeting notes
* Active vote, when one exists

## Critical blockers

Do not end the meeting while:

* A vote is still open
* Required live records are currently saving
* A critical data conflict exists

Allow ending with deferred or incomplete agendas only after:

* Showing them clearly
* Requiring confirmation
* Requiring a reason

## End actions

Footer:

Left:

* Continue Meeting

Right:

* End Meeting

After confirmation:

1. Save outstanding permitted data.
2. Close the active agenda state.
3. Record actual end time.
4. Set the session status to Ended.
5. Set the meeting status to Completed.
6. Store the final attendance snapshot.
7. Store the final quorum result.
8. Preserve agenda progress.
9. Preserve pinned document versions.
10. Preserve motions and votes.
11. Preserve decisions and action items.
12. Create an audit event.
13. Open the Meeting Record or Post-Meeting Review entry point.

Do not automatically approve minutes.

Do not fake email, notification, calendar, or document delivery.

---

# 25. Meeting Record handoff

Do not build the complete Post-Meeting Review module in this task.

After the meeting ends, ensure the existing Meeting Record can receive:

* Scheduled and actual times
* Attendance
* Quorum history
* Agenda progress
* Meeting notes
* Documents and pinned versions
* Motions
* Vote results
* Decisions
* Resolutions
* Action items
* Audit history

The next module will complete minutes, review, approval, publication, and follow-up.

Do not duplicate these records just for the handoff.

---

# 26. Empty, loading, error, and disabled states

Implement clear states for:

* Meeting not found
* Meeting cancelled
* Meeting already completed
* Live session unavailable
* User not invited
* Access denied
* Quorum rule missing
* No agendas
* No documents
* Document content unavailable
* No participants checked in
* No active motion
* No decisions
* No action items
* Saving
* Reconnecting
* Save failed
* Permission denied

Keep messages short and actionable.

Do not use `window.alert`, `window.confirm`, or `window.prompt`.

Use the existing modal, toast, validation, and confirmation systems.

---

# 27. Responsive behavior

## Desktop

* Fixed live header
* Collapsible agenda rail
* Main active-agenda workspace
* Contextual right overlay
* Stable meeting controls

## Tablet

* Collapsible agenda rail
* Supporting content in responsive drawers
* Fixed key actions

## Mobile

* Compact meeting header
* Current agenda dropdown or selector
* Active agenda content
* Sticky contextual actions
* Bottom-sheet participants, documents, voting, and decisions
* Sticky Leave or End action based on permission

Requirements:

* No horizontal overflow
* No hidden critical controls
* Comfortable tap targets
* Keyboard-safe note editing
* Viewer opens above the live workspace
* Modal footer remains accessible
* Back actions preserve live state

Do not break desktop while fixing mobile.

---

# 28. Required regression journey

Test this complete journey:

1. Create and schedule a valid meeting.
2. Open Meeting Details.
3. Confirm Start and Join actions appear correctly.
4. Open Pre-Meeting Readiness.
5. Check in physical participants.
6. Join as a virtual participant.
7. Confirm duplicate attendance is prevented.
8. Confirm Quorum Members and General Members remain separate.
9. Confirm actual quorum calculates correctly.
10. Start the meeting.
11. Confirm one live session is created.
12. Refresh.
13. Confirm the same session returns.
14. Start the first child agenda.
15. Open its pinned document.
16. Close the viewer.
17. Confirm the active agenda remains.
18. Add official meeting notes.
19. Mark one participant temporarily away.
20. Confirm quorum recalculates.
21. Restore the participant.
22. Mark one participant recused from the active agenda.
23. Confirm vote eligibility updates.
24. Create a motion.
25. Open voting.
26. Cast votes as eligible participants.
27. Confirm duplicate voting is blocked.
28. Close voting.
29. Confirm the result.
30. Record a decision.
31. Create an action item.
32. Complete the agenda item.
33. Move to the next agenda.
34. Defer one agenda with a reason.
35. Open Participants.
36. Open Documents.
37. Open Decisions and Actions.
38. Leave as a normal participant.
39. Rejoin.
40. Confirm the same session returns.
41. Trigger quorum loss.
42. Confirm the warning and blocked formal actions.
43. Restore quorum.
44. Confirm formal actions become available.
45. Select End Meeting.
46. Confirm an active vote blocks ending.
47. Close the vote.
48. End the meeting.
49. Confirm meeting status becomes Completed.
50. Open Meeting Record.
51. Confirm attendance, quorum, agendas, votes, decisions, and actions remain.
52. Test desktop.
53. Test tablet.
54. Test mobile.
55. Test EN and BN.
56. Test light and dark themes.

---

# 29. Negative tests

Test:

* Unauthorized Start Meeting
* Unauthorized Join Meeting
* User not linked to the meeting
* Meeting started twice
* Session duplicated after refresh
* Participant checked in twice
* Inactive participant
* Quorum member marked General incorrectly
* Chairperson not quorum eligible
* Missing quorum rule
* Quorum loss during active discussion
* Quorum loss during voting
* General Member attempting to vote
* Recused participant attempting to vote
* Participant who left attempting to vote
* Duplicate vote submission
* Vote closed twice
* Decision recorded for a failed motion
* Duplicate action-item submission
* Unsupported document preview
* Missing pinned document content
* Agenda started twice
* Two agenda items active at once
* Unauthorized agenda control
* Unauthorized attendance correction
* Unauthorized vote closure
* Unauthorized End Meeting
* End Meeting during an active vote
* Refresh during an open vote
* Refresh during note autosave
* Leave Meeting causing quorum loss
* Network or persistence failure
* Cancelled meeting opened as Live
* Completed meeting reopened as Live

---

# 30. Focused automated tests

Add focused tests for:

* Start and Join action visibility
* One live session per meeting
* Session restore after refresh
* Attendance deduplication
* Physical and virtual attendance
* Quorum Member and General Member separation
* Actual quorum calculation
* Required-role quorum
* Quorum loss and restoration
* Agenda state transitions
* Only one active agenda
* Agenda elapsed time persistence
* Pinned document version
* Viewer return context
* Meeting-note autosave
* Participant recusal
* Motion creation
* Eligible voter calculation
* Duplicate vote prevention
* Vote closing and result calculation
* Secret-vote privacy where supported
* Decision creation
* Resolution creation
* Action-item creation
* Centralized permissions
* Audit-event creation
* Leave and rejoin
* End Meeting blockers
* Completed meeting handoff
* Desktop, tablet, and mobile behavior
* Accessibility
* EN/BN parity
* Theme parity

Run:

```text
npm run typecheck
npm run test
npm run build
```

Do not remove or weaken existing tests.

Do not silence errors with:

* `any`
* `@ts-ignore`
* Disabled strict mode
* Commented-out features
* Removed tests

---

# Completion criteria

Live Board Meeting is complete only when:

* Scheduled meetings expose valid Start and Join actions.
* Start Meeting opens a readiness check.
* One active session exists per meeting.
* Attendance uses canonical participants.
* Quorum Members and General Members remain separate.
* Actual quorum uses attendance and one shared engine.
* Quorum loss is visible and correctly restricts formal actions.
* The meeting runs in a dedicated full-screen workspace.
* Parent agendas organize direct child discussion items.
* Only one child agenda is active at a time.
* Agenda timing and states persist.
* Documents use pinned versions and the existing viewer.
* Meeting notes autosave without modifying the agenda.
* Motions, voting, decisions, resolutions, and actions link to the active agenda.
* Voting eligibility uses canonical attendance, voting rights, and recusal.
* Votes cannot be duplicated or silently edited.
* Centralized permissions control every live action.
* Refresh restores the active meeting state.
* Leave does not end the meeting.
* End Meeting creates a complete, auditable handoff to Meeting Records.
* Meeting List, Meeting Details, Agenda Management, Document Management, Meeting Calendar, Board Meeting Creation, themes, mobile behavior, and permissions remain intact.
* Type checking, tests, and production build pass.

# Golden Rules

* Do not break solved issues.
* Do not rebuild the application shell.
* Do not create another meeting, session, participant, agenda, document, viewer, quorum engine, permission engine, voting engine, decision system, or audit system.
* Do not modify Board Meeting Creation, Agenda Management, or Document Management except for small backward-compatible Live Meeting adapters.
* Do not create new Level 3 agendas.
* Do not duplicate live sessions after Start, Join, Resume, or refresh.
* Do not treat RSVP as attendance.
* Do not treat General Members as Quorum Members.
* Do not treat voting eligibility and quorum eligibility as the same value.
* Do not automatically count the Chairperson toward quorum.
* Do not allow unauthorized attendance, agenda, vote, decision, or End Meeting actions.
* Do not overwrite original agenda content or pinned document versions.
* Do not fake video conferencing, email, notifications, or real-time synchronization.
* Do not add unnecessary fields, panels, cards, tabs, or explanatory text.
* Reuse existing routes, registries, relationships, drawers, modals, viewers, editors, permissions, themes, design tokens, and responsive patterns.
* Preserve desktop, tablet, mobile, accessibility, EN/BN, themes, IDs, versions, history, and backward compatibility.
