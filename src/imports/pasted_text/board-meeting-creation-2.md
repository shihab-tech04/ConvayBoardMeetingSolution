# Board Meeting Creation — Phase M4: Review, Schedule, Details Drawer, and Regression Audit

Complete and audit the Board Meeting Creation journey after M1–M3.

Do not add Live Meeting or Post-Meeting features in this phase.

Do not provide only an audit report. Fix safe issues found within this scope and retest them.

## Step 5 — Review and Schedule

Create one clear review page using the existing `MeetingReviewPanel`.

Remove the old review logic that counts free-text repeatable agenda and document rows.

Show these compact sections:

### Meeting

* Title
* Type
* Governance Body
* Date
* Time
* Time Zone
* Confidentiality

### Leadership

* Chairperson
* Secretary
* Organizer

### Participants

* Total
* Required
* Optional
* Voting Eligible
* Quorum Eligible
* Presenters

### Agendas

* Selected parent count
* Total child count
* Total agenda duration
* Voting or decision agendas
* Meeting readiness

### Documents

* Agenda documents
* Additional documents
* Restricted documents
* Missing-access issues

### Mode

* Physical, Virtual, or Hybrid
* Venue
* Virtual platform
* Meeting link

### Quorum

* Rule
* Eligible participants
* Required count
* Projected count
* Risk state

### Readiness

Show:

* Ready to Schedule
* Not Ready to Schedule

Display exact blockers with an Edit action that returns to the correct step.

Avoid long descriptive text and decorative statistics.

## Save Draft

Require only:

* Meeting Title

Persist:

* Meeting record
* Participants
* Agenda links
* Document links
* Mode
* Quorum configuration
* Current step
* Updated time

Reopening Complete Draft must return to the last incomplete step.

Do not create duplicate child relationship records after repeated saves.

## Schedule Meeting validation

Require:

* Valid meeting details
* Active governance body
* Active Chairperson
* Active Secretary
* Active Organizer
* Valid date and time
* Valid mode-specific access
* At least one required participant
* At least one quorum-eligible participant
* At least one approved Meeting Ready parent agenda
* No duplicate participant links
* No duplicate agenda links
* No duplicate document links
* Configured projected quorum
* No unresolved critical document-access blocker

Do not require accepted RSVPs before initial scheduling.

## Scheduling behavior

Replace the old `Publish Immediately` behavior with:

`Schedule Meeting`

After scheduling:

* Set meeting status to Scheduled.
* Persist all relationships.
* Create audit events.
* Create pending invitation or RSVP records only where the existing foundation supports them.
* Do not claim invitations, emails, or calendar events were sent unless real delivery exists.
* Return to Meeting List or open Meeting Details using the existing solved pattern.

## Meeting lifecycle

Use the existing statuses:

* Draft
* Scheduled
* Rescheduled
* Cancelled
* Ready to Start
* In Progress
* Completed
* Archived

Creation controls only:

* Save Draft
* Schedule
* Edit Draft
* Edit Scheduled Meeting when authorized
* Reschedule
* Cancel
* Archive

Do not manually set In Progress or Completed in the wizard.

## Meeting Details drawer

Continue using the shared `DynamicDetailsDrawer`.

Do not create another drawer shell.

Update its derived data and sections to show:

### Overview

* Meeting title and reference
* Type
* Governance Body
* Date and time
* Mode
* Confidentiality
* Purpose
* Status

### Leadership

* Chairperson
* Secretary
* Organizer

### Participants

* Selected participants
* Roles
* Required status
* Voting eligibility
* Quorum eligibility
* RSVP status where available

### Agendas

* Ordered parent agendas
* Child counts
* Duration
* Approval and readiness
* Open Agenda Details

### Documents

* Agenda documents
* Additional documents
* Version used
* Confidentiality
* Preview

### Quorum

* Rule
* Projected result
* Later actual result when available

### History and Audit

* Created
* Scheduled
* Rescheduled
* Cancelled
* Status changes
* Actor
* Date
* Reason

Do not show long comma-separated participant, agenda, or document names in generic information rows when a structured list is available.

## Drawer actions

Show only valid and authorized actions:

* Complete Draft
* Edit Meeting
* Reschedule
* Cancel
* Archive
* Start Meeting
* Join Meeting
* Resume Meeting
* View Meeting Record

Rules:

* Draft shows Complete Draft.
* Scheduled shows Edit, Reschedule, Cancel, and Start when valid.
* Eligible participants see Join when available.
* In Progress may show Resume.
* Completed shows View Meeting Record.
* Do not remove Start or Join actions.
* Do not show Live Meeting actions before the required time and status.

Use centralized meeting actions and permissions.

Do not hardcode permissions by user name or designation.

## Remove obsolete creation logic

After the new journey works, remove or disable only the obsolete creation paths:

* Seven-step Meeting Creation configuration
* Free-text participant repeatable groups
* Manual Agenda Items
* Manual Document entries
* Direct agenda creation inside Meeting Creation
* Direct document metadata creation inside Meeting Creation
* `Publish Immediately`
* Duplicate Governance Body selectors
* Duplicate meeting owner and scope inputs
* RSVP-based initial quorum forecast

Do not remove:

* Existing meetings
* Historical participants
* RSVP records
* Agenda links
* Documents
* Board Packs
* Contextual actions
* Live Meeting
* Meeting Records
* Calendar
* Audit history

## Required regression audit

Test:

1. Open All Meetings.
2. Select Add Meeting.
3. Confirm five steps.
4. Enter meeting details.
5. Select canonical Chairperson, Secretary, and Organizer.
6. Select a Governance Body.
7. Include governance members.
8. Add a group.
9. Add an organizational unit.
10. Add an individual user.
11. Confirm deduplication.
12. Assign participant roles.
13. Select approved Meeting Ready parent agendas.
14. Confirm Draft and rejected agendas are unavailable.
15. Preview agenda hierarchy.
16. Reorder selected parent agendas.
17. Confirm agenda documents appear.
18. Add an existing additional document.
19. Upload a new document through Document Composer.
20. Preview documents.
21. Configure Physical mode.
22. Configure Virtual mode.
23. Configure Hybrid mode.
24. Review projected quorum.
25. Trigger a quorum-risk warning.
26. Trigger a document-access warning.
27. Save Draft.
28. Refresh.
29. Complete Draft.
30. Review exact scheduling blockers.
31. Schedule the meeting.
32. Confirm the Meeting List updates.
33. Open Meeting Details.
34. Confirm participants, agendas, documents, and quorum.
35. Reschedule.
36. Cancel a separate test meeting.
37. Archive a valid meeting.
38. Confirm Start and Join actions remain.
39. Test mobile.
40. Test EN and BN.
41. Test light and dark themes.

## Negative tests

Test:

* Missing title
* Invalid end time
* Inactive governance body
* Inactive Chairperson
* Missing Secretary
* Duplicate participant
* Inactive participant
* Draft agenda
* Rejected agenda
* Not Meeting Ready agenda
* Duplicate agenda link
* Duplicate document link
* Missing physical venue
* Missing virtual link
* Unconfigured quorum
* Unauthorized scheduling
* Double Schedule click
* Refresh during Draft
* Closing with unsaved changes

## Technical validation

Run:

* `npm run typecheck`
* `npm run test`
* `npm run build`

Add focused tests for:

* Five-step wizard
* Canonical leadership IDs
* Participant source resolution
* Participant deduplication
* Agenda eligibility
* Agenda ordering
* Agenda-document inheritance
* Additional document linking
* Document version pinning
* Mode validation
* Projected quorum
* Scheduling blockers
* Draft persistence
* Schedule lifecycle
* Drawer data
* Permission enforcement
* Live Meeting handoff

Do not remove or weaken existing tests.

## Required final report

Report:

* M1 status
* M2 status
* M3 status
* M4 status
* Overall Meeting Creation completion percentage
* Corrected issues
* Remaining limitations
* Type-check result
* Test result
* Build result

## Completion criteria

Board Meeting Creation is complete only when:

* One five-step full-screen wizard exists.
* Inputs are focused and meeting-specific.
* Leadership and participants use stable user IDs.
* Participants come from canonical users, groups, units, and memberships.
* Only approved Meeting Ready parent agendas can be selected.
* Agenda documents are inherited.
* Additional documents use Document Library.
* Upload uses the real Document Composer.
* Document versions remain identifiable.
* Physical, Virtual, and Hybrid modes work.
* Projected quorum uses one shared engine.
* Review shows exact blockers.
* Save Draft and Schedule work.
* Meeting Details shows complete structured data.
* Scheduled meetings remain available to Calendar and Live Meeting.
* Existing Agenda and Document journeys remain intact.
* Desktop, tablet, and mobile work.
* Type checking, tests, and production build pass.

# Golden Rules

* Do not break solved issues.
* Do not change Agenda Builder or Document Management except for small integration adapters.
* Do not create duplicate meetings, users, participants, agendas, documents, versions, or relationship records.
* Do not create another table, drawer, modal, button, tab, form, viewer, uploader, picker, permission engine, or quorum engine.
* Do not remove Start, Join, Live Meeting, Meeting Calendar, or Meeting Record functionality.
* Do not fake email, notification, calendar, or video-conference delivery.
* Reuse existing registries, relationships, shared components, permissions, lifecycle rules, and design tokens.
* Preserve routes, IDs, versions, history, permissions, persistence, desktop, mobile, accessibility, EN/BN, and themes.
* Audit, fix, retest, and report honestly.
