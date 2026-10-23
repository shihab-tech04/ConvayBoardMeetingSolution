Work directly inside the latest **NCC Bank Board Meeting Solution** React and TypeScript project.

Fix the meeting-status and dynamic-action system so every active UI uses one authoritative resolver.

Do not rebuild the application. Do not create another action system. Reuse and extend the existing meeting action resolver.

# Main objective

Use one shared source for deciding meeting actions across:

* Dashboard hero
* Upcoming Meetings
* All Meetings table
* Meeting Overview
* Meeting Calendar
* My Tasks
* My Calendar
* Meeting details drawer
* Live Meeting entry
* Meeting archive

The same meeting must show the same valid action everywhere.

# 1. Audit the existing action systems

Inspect:

* `src/app/actions/resolvers/meetingActions.ts`
* Existing `useResolvedActions` hook
* Static meeting action arrays
* Dashboard meeting-action logic
* Calendar meeting-action logic
* `GeneratedTablePage`
* Meeting page configurations
* Meeting drawer footer
* Live Meeting route guards
* Meeting registry
* Participant and invitation registries
* Attendance and connection records
* Permission system

Find and remove active duplication between:

* Main dynamic meeting resolver
* Older meeting CTA resolver
* Dashboard-specific action resolver
* Static `MEETING_ACTIONS`
* Static `MEETING_DRAWER_ACTIONS`
* Static `MEETING_FULL_ACTIONS`

Keep one authoritative resolver.

# 2. Standardize meeting statuses

Use these canonical meeting statuses:

```text
draft
under_preparation
pending_approval
revision_requested
approved
published
invitations_sent
scheduled
ready_to_start
in_progress
paused
on_break
adjourned
postponed
awaiting_minutes
minutes_under_review
awaiting_signature
awaiting_closure
completed
signed
archived
cancelled
rejected
```

Create one normalization helper so existing values such as:

* `Pending Approval`
* `pendingApproval`
* `pending_approval`
* `In Progress`
* `inProgress`

resolve to the same canonical status.

Do not show canonical keys directly in the UI. Display readable labels such as:

* Pending Approval
* In Progress
* Awaiting Minutes

# 3. Standardize action IDs

Use these action IDs everywhere:

```text
view_details
edit_meeting
continue_setup
submit_for_approval
review_meeting
approve_meeting
request_revision
reject_meeting
publish_meeting
send_invitations
manage_rsvp
start_meeting
join_meeting
rejoin_meeting
pause_meeting
resume_meeting
start_break
resume_after_break
adjourn_meeting
resume_adjourned_meeting
reschedule_meeting
postpone_meeting
cancel_meeting
end_meeting
prepare_minutes
review_minutes
request_signature
complete_closure
create_next_meeting
view_meeting_record
view_archive
archive_meeting
delete_draft
```

Remove or migrate conflicting IDs such as:

* `join`
* `join_live`
* `join_meeting`
* `start`
* `start_live`

Do not leave different IDs for the same action.

# 4. Create one action resolver

Use one reusable resolver such as:

```ts
resolveMeetingActions({
  meeting,
  currentUser,
  participantRecord,
  invitation,
  attendance,
  permissions,
  now,
  relatedRecords
})
```

Each resolved action must include:

```ts
{
  id,
  label,
  icon,
  tone,
  visible,
  enabled,
  disabledReason,
  placement,
  priority,
  requiresConfirmation,
  requiresReason,
  handler
}
```

Action results must depend on:

* Meeting status
* Current date and time
* Meeting start and end time
* Entry-window rules
* Current user’s system role
* Current user’s meeting role
* Invitation status
* RSVP status
* Participant membership
* Attendance history
* Current connection state
* Meeting permissions
* Readiness requirements
* Quorum requirements
* Related minutes
* Archive status

# 5. Use one join-window rule

Create one configurable meeting-entry rule.

Default:

* Host may enter 30 minutes before start.
* Invited participants may enter 15 minutes before start.
* Participants may join while the meeting is In Progress, Paused, or On Break.
* Entry remains available until the meeting is formally ended.
* Completed, Cancelled, and Archived meetings cannot be joined.

Do not use separate two-hour and eight-hour rules in different files.

Allow the meeting configuration to override:

* Host early-entry minutes
* Participant early-entry minutes
* Late-entry permission
* Waiting-room requirement

# 6. Status-to-action matrix

## Draft

Authorized organizer or secretary:

* Continue Setup
* Edit Meeting
* Submit for Approval
* Delete Draft

Primary action:

`Continue Setup`

## Under Preparation

Authorized organizer or secretary:

* Continue Setup
* Edit Meeting
* Manage Participants
* Manage Agenda
* Add Documents
* Submit for Approval

Primary action:

`Continue Setup`

## Pending Approval

Authorized approver:

* Review Meeting
* Approve Meeting
* Request Revision
* Reject Meeting

Primary action:

`Review Meeting`

Other users:

* View Details

## Revision Requested

Organizer or secretary:

* Continue Setup
* Edit Meeting
* Resubmit for Approval
* Cancel Meeting

Primary action:

`Continue Setup`

## Approved

Authorized organizer:

* Publish Meeting
* Edit permitted fields
* Reschedule Meeting

Primary action:

`Publish Meeting`

## Published

Organizer or secretary:

* Send Invitations
* Manage RSVP
* Reschedule Meeting
* Cancel Meeting

When the entry window opens:

* Host → Start Meeting
* Invited participant → Join Meeting

## Invitations Sent

Organizer:

* Manage RSVP
* Resend Invitations
* Assign Alternate

Invited participant:

* Respond to Invitation

When the entry window opens:

* Host → Start Meeting
* Confirmed participant → Join Meeting

## Scheduled

Before entry window:

* Host → Start Meeting disabled with start-time explanation
* Participant → Join Meeting disabled with entry-time explanation

Inside entry window:

* Host → Start Meeting
* Invited participant → Join Meeting

## Ready to Start

Host:

* Start Meeting

Invited participant:

* Join Meeting

## In Progress

Host currently connected:

* Continue Meeting
* Pause Meeting
* Start Break
* Adjourn Meeting
* End Meeting

Participant who has never joined:

* Join Meeting

Participant who previously joined and disconnected:

* Rejoin Meeting

Do not show both Join and Rejoin to the same user.

## Paused

Host:

* Resume Meeting
* End Meeting

Participant:

* Rejoin Meeting

## On Break

Host:

* Resume After Break
* End Meeting

Participant:

* Rejoin Meeting

## Adjourned

Authorized host or secretary:

* Resume Adjourned Meeting
* Reschedule Meeting

Participants:

* View resumption details

## Postponed

Authorized organizer:

* Reschedule Meeting
* Edit Schedule
* Cancel Meeting

Others:

* View Details

## Awaiting Minutes

Secretary or minute taker:

* Prepare Minutes

Others:

* View Meeting Record

## Minutes Under Review

Assigned reviewer:

* Review Minutes
* Approve Minutes
* Request Revision

Others:

* View Minutes

## Awaiting Signature

Authorized signer:

* Sign Minutes

Others:

* View Approved Minutes

## Awaiting Closure

Secretary or administrator:

* Complete Closure
* Resolve Outstanding Items

Others:

* View Meeting Record

## Completed

* View Meeting Record
* Create Next Meeting
* Post-Meeting Review

Authorized user:

* Archive Meeting

## Signed

* View Signed Minutes
* Download
* Print
* Archive Meeting

## Archived

* View Archive

No normal Edit, Start, Join, or Delete action.

## Cancelled

* View Meeting Record
* Create New Meeting

## Rejected

Organizer:

* View Rejection Reason
* Duplicate as New Draft

# 7. Connect the resolver to every active UI

## Dashboard hero

Use the resolved highest-priority action.

Examples:

* Continue Setup
* Review Meeting
* Publish Meeting
* Start Meeting
* Join Meeting
* Rejoin Meeting
* Prepare Minutes
* View Meeting Record

Do not maintain separate dashboard action logic.

## Upcoming Meetings

Use the same resolver.

Show one row action only.

When the resolved primary action is:

* Start Meeting
* Join Meeting
* Rejoin Meeting
* Review Meeting
* Continue Setup

show that action instead of generic View.

Otherwise show:

`View Details`

## Meeting tables

Keep one visible action in each row.

Resolve it dynamically:

* Start Meeting
* Join Meeting
* Rejoin Meeting
* Review Meeting
* Continue Setup
* Prepare Minutes
* View Details

Clicking the rest of the row may still open the drawer.

## Meeting drawer

Use the complete resolved action list.

Footer layout:

```text
Close | More Actions | Secondary Action | Primary Action
```

Primary action appears at the far right.

Put lower-priority actions inside More Actions:

* Duplicate
* Reschedule
* Postpone
* Cancel
* Archive
* Delete Draft
* Manage Participants
* Manage RSVP

## My Tasks

Meeting-related tasks must use the same resolver.

Examples:

* Review Meeting
* Approve Meeting
* Respond to Invitation
* Join Meeting
* Prepare Minutes

## My Calendar

Meeting events must use the same resolved action.

Do not independently decide whether to show Start, Join, or View.

# 8. Correct Join versus Rejoin behavior

Use attendance and connection records.

Show `Join Meeting` when:

* User is an invited participant
* User has not joined the current meeting session before
* Meeting is joinable

Show `Rejoin Meeting` when:

* User previously joined
* A join timestamp exists
* User is currently disconnected
* Meeting remains active

Show `Continue Meeting` for a connected host already inside the active session.

Do not infer Rejoin only from meeting status.

# 9. Route and action execution

Start, Join, Rejoin, Resume, and Continue Meeting must open:

```text
/meetings/:meetingId/live
```

Before opening the route, validate:

* Meeting exists
* Status allows entry
* User has permission
* User is an invited participant or authorized host
* Entry window allows access
* Meeting is not Cancelled, Completed, or Archived

Do not rely only on hidden buttons. Add the same validation to the Live Meeting route guard.

Show clear errors:

* `You are not invited to this meeting.`
* `Meeting access opens at 10:45 AM.`
* `This meeting has been cancelled.`
* `This meeting has already ended.`
* `You do not have permission to start this meeting.`

# 10. Persist action results

Every meeting action must update the shared Meeting registry.

Record:

* Previous status
* New status
* Action
* Actor
* Role
* Date and time
* Reason
* Related record
* Session information where supported

Examples:

* Start Meeting → status becomes In Progress and actual start time is saved.
* Pause Meeting → status becomes Paused and pause event is saved.
* Resume Meeting → status becomes In Progress.
* Start Break → status becomes On Break.
* Adjourn Meeting → status becomes Adjourned and reason is required.
* End Meeting → status becomes Awaiting Minutes and actual end time is saved.
* Cancel Meeting → status becomes Cancelled and reason is required.
* Postpone Meeting → status becomes Postponed and reason is required.

Changes must immediately update:

* Dashboard
* Meeting tables
* Meeting drawer
* My Tasks
* My Calendar
* Live Meeting
* Minutes
* Archive
* Reports

# 11. Permissions

Enforce permissions before showing and before executing actions.

Required permissions include:

* Edit Meeting
* Submit Meeting
* Approve Meeting
* Reject Meeting
* Publish Meeting
* Start Meeting
* Join Meeting
* Pause Meeting
* Resume Meeting
* Adjourn Meeting
* End Meeting
* Prepare Minutes
* Review Minutes
* Archive Meeting
* Cancel Meeting
* Delete Draft

Technical administrators must not automatically receive board-member voting or meeting-participant rights.

# 12. Tests

Add tests for the active UI, not only the resolver file.

Test:

* Draft organizer sees Continue Setup.
* Pending Approval approver sees Review Meeting.
* Approved organizer sees Publish Meeting.
* Scheduled host sees Start Meeting within the host window.
* Scheduled participant sees Join Meeting within the participant window.
* Participant outside the window sees a disabled Join action with a reason.
* New participant sees Join, not Rejoin.
* Disconnected previous participant sees Rejoin, not Join.
* Paused host sees Resume Meeting.
* Participant during pause sees Rejoin.
* On Break host sees Resume After Break.
* Awaiting Minutes secretary sees Prepare Minutes.
* Archived meeting shows only View Archive.
* Cancelled meeting cannot be joined.
* Dashboard, table, drawer, tasks, and calendar show the same primary action.
* Route guard blocks unauthorized direct access.
* Status changes survive navigation and refresh.
* Every active Meeting table still has one visible row action.

# Acceptance criteria

The task is complete only when:

* One authoritative meeting-action resolver is active.
* Duplicate meeting-action systems are removed or no longer used.
* Action IDs are consistent.
* All supported meeting statuses are handled.
* Dashboard, table, drawer, tasks, and calendar show consistent actions.
* Start Meeting appears for authorized hosts.
* Join Meeting appears for invited participants.
* Rejoin appears only after a previous connection.
* Entry-window rules are consistent.
* Status changes persist.
* Permissions are enforced in the UI and handlers.
* Live Meeting route access is protected.
* Existing routes, APIs, registries, themes, tables, drawers, and responsive behavior remain intact.
* The project builds without TypeScript errors.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated files.
* Do not create another meeting-action resolver.
* Reuse and extend the existing resolver.
* Do not keep separate dashboard, table, drawer, calendar, or task action logic.
* Keep one visible action in each table row.
* Keep all other actions in the drawer footer.
* Do not show Join and Rejoin together.
* Do not allow direct-route access to bypass permissions.
* Preserve record IDs, history, participants, invitations, attendance, and minutes.
* Do not change existing API contracts.
* Preserve desktop, tablet, and mobile behavior.
* Test every meeting status, role, and entry condition.
