# Live Meeting Stabilization — Phase 2: Canonical Session Lifecycle

Work only on the Live Meeting session lifecycle.

Phase 1 must already be complete.

Do not redesign Agenda Management, Document Management, Board Meeting Creation, Meeting List, Meeting Calendar, or Meeting Records.

The required lifecycle is:

Scheduled Meeting
→ Start Meeting
→ One Canonical Live Session
→ Join or Resume the Same Session
→ Refresh and Restore
→ Leave Without Ending
→ End the Same Session

────────────────────────────────────────
1. INSPECT THE CURRENT SESSION IMPLEMENTATION
────────────────────────────────────────

Inspect:

src/app/pages/meetings/LiveMeetingPage.tsx
src/app/pages/meetings/LiveMeetingWorkspace.tsx
src/app/components/meetings/MeetingPreJoinPanel.tsx
src/app/actions/resolvers/meetingActions.ts
src/app/data/boardMeetingData.ts
src/app/hooks/*
src/app/context/*
src/app/store/*

Find all current sources of live-session state, including:

- LiveMeetingSession registry
- LocalStorage live-session objects
- Component-local session state
- Meeting status
- Attendance state
- Active agenda state
- Active vote state

Do not create a second live-session registry.

────────────────────────────────────────
2. USE THE AUTHENTICATED CANONICAL USER
────────────────────────────────────────

Remove runtime identity values such as:

- current-user
- host
- You
- Default Board Member
- Hardcoded role labels

Resolve the current user through the existing authenticated-user or current-user system.

Use:

- Canonical user ID
- Meeting participant relationship
- Participant category
- Meeting role
- Centralized permissions

Do not grant permissions from a locally selected demo role.

If the current user cannot be resolved:

- Block Start and Join
- Show an honest access error
- Do not create a temporary fake participant

────────────────────────────────────────
3. MAKE ONE SESSION RECORD THE SOURCE OF TRUTH
────────────────────────────────────────

Use one canonical Live Session record per meeting.

The stable uniqueness rule is:

meeting_id → one active session

The session should reference:

- Session ID
- Meeting ID
- Status
- Started at
- Started by user ID
- Ended at
- Ended by user ID
- Current agenda item ID
- Active vote ID
- Quorum state
- Last activity time
- Revision number or updated time

Use existing fields where available.

Extend the current record minimally when required.

Do not copy full meeting, participant, agenda, or document records into the session.

────────────────────────────────────────
4. REMOVE DUAL SESSION OWNERSHIP
────────────────────────────────────────

The Live Session registry must become the canonical source of truth.

LocalStorage may be used only as a temporary cache for the current browser.

LocalStorage must not contain an independent authoritative copy of:

- Agenda states
- Attendance
- Motions
- Votes
- Decisions
- Action items
- Notes
- Recusals

Canonical records must be persisted in their existing registries.

After a successful canonical save:

- The local cache may update.
- The local cache must not overwrite newer canonical data.
- Refresh must reconstruct the workspace from canonical records.

Do not remove LocalStorage caching when it is still needed for safe offline recovery, but make it subordinate to canonical data.

────────────────────────────────────────
5. START MEETING
────────────────────────────────────────

Start Meeting must:

1. Validate the current meeting.
2. Validate the current user.
3. Validate Start Meeting permission.
4. Validate Scheduled status.
5. Open Pre-Meeting Readiness.
6. Confirm critical blockers.
7. Create one Live Session only when none exists.
8. Reuse an existing active session when one already exists.
9. Set actual start time.
10. Set meeting status to In Progress.
11. Create one audit event.
12. Open the Live Meeting workspace.

Prevent repeated Start clicks.

Do not create another session after refresh or repeated Start.

────────────────────────────────────────
6. JOIN MEETING
────────────────────────────────────────

Join Meeting must:

- Validate that an active canonical session exists.
- Validate that the meeting is In Progress or in an allowed join state.
- Validate the current user’s participant relationship.
- Validate Join Meeting permission.
- Create or update one canonical attendance record.
- Restore the current agenda and active vote.
- Open the existing session.

Do not allow Join Meeting to create a new session.

Do not allow an uninvited user to join unless an explicit authorized support permission exists.

────────────────────────────────────────
7. RESUME MEETING
────────────────────────────────────────

Resume Meeting must:

- Resolve the existing active session.
- Restore session state.
- Restore attendance.
- Restore active agenda.
- Restore quorum.
- Restore an active vote.
- Restore notes and agenda progress.

Do not create another session.

Do not reset the meeting to its first agenda.

────────────────────────────────────────
8. REFRESH AND RECOVERY
────────────────────────────────────────

After refresh:

1. Resolve the meeting ID.
2. Resolve the active Live Session.
3. Resolve the current user.
4. Resolve the participant relationship.
5. Load canonical attendance.
6. Load agenda progress.
7. Load current agenda.
8. Load notes.
9. Load active motion and vote.
10. Load decisions and action items.
11. Recalculate actual quorum.
12. Restore the workspace.

Do not append duplicate events or records during restoration.

Use idempotent operations.

────────────────────────────────────────
9. LEAVE MEETING
────────────────────────────────────────

Leave Meeting must not end the live session.

Behavior:

- Update only the current participant’s attendance state.
- Store left time.
- Recalculate quorum.
- Create an audit event.
- Return to Meeting Details or Meeting List.
- Allow rejoining while the meeting remains In Progress.

Warn the user when leaving may cause quorum loss.

Do not display End Meeting to ordinary participants.

────────────────────────────────────────
10. CORRECT ROUTE INTENT
────────────────────────────────────────

Preserve separate entry actions:

start_meeting
join_meeting
resume_meeting

LiveMeetingPage must read and pass the correct intent.

Do not hardcode every entry as Join Meeting.

Preserve browser Back behavior and source route.

────────────────────────────────────────
11. HONEST INTEGRATION STATES
────────────────────────────────────────

Do not simulate:

- Real video conferencing
- Recording
- Transcription
- Active speaker detection
- Cross-device real-time synchronization

When a real integration is not available:

- Disable the control, or
- Show Integration not configured

Remove simulated active-speaker changes.

Do not present local state changes as real recording or transcription.

────────────────────────────────────────
12. PHASE 2 VALIDATION
────────────────────────────────────────

Test:

1. Start creates one session.
2. Start twice does not create two sessions.
3. Join uses the existing session.
4. Resume uses the existing session.
5. Refresh restores the same session.
6. Current user is canonical.
7. Uninvited users are blocked.
8. A participant joins only once.
9. Leave does not end the session.
10. Rejoin restores the same attendance record.
11. Meeting status becomes In Progress only after Start.
12. Start, Join, and Resume route intents remain separate.
13. Fake active-speaker behavior is removed.
14. Unsupported integrations are honest.
15. Mobile refresh and restore work.

Add focused tests for:

- One session per meeting
- Start idempotency
- Join validation
- Resume restoration
- Current-user resolution
- Participant relationship validation
- Refresh recovery
- Leave and rejoin
- Route intent
- Audit events

Run:

npm run typecheck
npm run test
npm run build

Do not start Phase 3 until Phase 2 passes.

GOLDEN RULES

- Do not create duplicate Live Sessions.
- Do not use fake current users.
- Do not let LocalStorage become the source of truth.
- Do not let Join create a session.
- Do not let Leave end the meeting.
- Do not fake video, recording, transcription, or real-time behavior.
- Preserve existing routes, actions, themes, mobile, accessibility, EN/BN, and meeting records.
- Do not break solved issues.