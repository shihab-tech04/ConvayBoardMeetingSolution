# Live Meeting Stabilization — Phase 3: Attendance, Quorum, Agenda Progress, Documents, and Notes

Work only on the active Live Meeting workspace.

Phases 1 and 2 must already be complete.

Do not work on motions, voting, decisions, resolutions, or action items in this phase.

────────────────────────────────────────
1. CANONICAL ATTENDANCE
────────────────────────────────────────

Use one attendance record per:

meeting_id + user_id

Attendance states:

- Not Joined
- Present
- Temporarily Away
- Left
- Excused
- Recused

Attendance modes:

- Physical
- Virtual
- Hybrid

Do not use RSVP as attendance.

Prevent duplicate attendance when:

- A virtual participant joins.
- The same person is checked in manually.
- A Hybrid participant changes attendance mode.
- The page refreshes.

Authorized users may correct attendance.

Every correction must store:

- Previous state
- New state
- Actor user ID
- Timestamp
- Reason

────────────────────────────────────────
2. QUORUM AND GENERAL MEMBERS
────────────────────────────────────────

Keep separate participant sections:

- Quorum Members
- General Members

Do not show Governance Members.

Do not determine category from local role labels.

Use:

- Canonical meeting-participant relationship
- Canonical governance membership
- Meeting-specific audited overrides

Show each participant’s:

- Name
- Meeting role
- Category
- Voting eligibility
- Required or Optional
- Attendance state
- Attendance mode
- Recusal state

────────────────────────────────────────
3. ONE ACTUAL QUORUM CALCULATION
────────────────────────────────────────

Use the same shared quorum calculator created for Board Meeting Creation.

Extend its mode safely to support actual live attendance.

Use:

- Present active Quorum Members
- Canonical membership
- Required roles
- Attendance mode
- Virtual-attendance rules
- Alternate rules
- Recusal rules
- Meeting-specific audited overrides

Do not count:

- General Members
- Observers
- Presenters
- Invitees
- Excused participants
- Participants who left
- Excluded recused participants

Actual quorum states:

- Met
- At Risk
- Lost
- Not Met
- Not Configured

Only Met counts as confirmed quorum.

Do not treat At Risk as Met.

Use this one result in:

- Pre-Meeting Readiness
- Live header
- Participants panel
- Agenda controls
- Voting eligibility
- End summary
- Meeting Details
- Meeting Record

────────────────────────────────────────
4. READINESS BLOCKERS
────────────────────────────────────────

Pre-Meeting Readiness must treat these as critical:

- Quorum Not Met
- Quorum Not Configured
- Missing required Chairperson
- Missing required Secretary
- No linked agenda
- Missing critical meeting access

Start Meeting must remain disabled for critical blockers.

An authorized override may proceed only when:

- The user has the existing override permission.
- A reason is entered.
- The override is audited.
- The canonical organization quorum rule remains unchanged.

────────────────────────────────────────
5. QUORUM LOSS
────────────────────────────────────────

When quorum changes from Met to Lost or Not Met:

- Show a persistent warning.
- Show the exact reason.
- Store loss time.
- Create an audit event.
- Block new formal votes where required.
- Block confirmation of formal decisions where required.
- Allow ordinary discussion only when policy permits.

When quorum returns:

- Store restoration time.
- Create an audit event.
- Update all relevant controls immediately.

Do not automatically end the meeting.

────────────────────────────────────────
6. USE ONLY DIRECT CHILD AGENDAS
────────────────────────────────────────

Live Meeting must use:

Parent Agenda
└── Direct Level 2 Child Agendas

Parent agendas are section headings.

Direct children are live discussion items.

Historical Level 3 records must remain stored but must not appear as active discussion items.

Remove recursive descendant loading from the live agenda list.

Do not delete historical records.

────────────────────────────────────────
7. AGENDA STATES
────────────────────────────────────────

Use:

- Not Started
- In Discussion
- Completed
- Deferred
- Skipped

Only one child agenda may be In Discussion at a time.

Authorized users may:

- Start Agenda
- Complete Agenda
- Move to Next Agenda
- Return to Previous Agenda
- Defer
- Skip
- Reopen

Require a reason for:

- Defer
- Skip
- Reopen

Persist:

- Actual start time
- Actual completion time
- Planned duration
- Actual duration
- State
- Actor
- Reason

Do not keep agenda progress only inside component state.

────────────────────────────────────────
8. AGENDA TIME UX
────────────────────────────────────────

Show:

- Planned time
- Elapsed time
- Remaining time
- Overrun state

Use a subtle warning when over time.

Do not automatically stop the agenda when planned time expires.

Preserve timing after refresh.

────────────────────────────────────────
9. PINNED DOCUMENT VERSIONS
────────────────────────────────────────

Live Meeting must open the exact document version pinned when the meeting was scheduled.

Use the canonical meeting-document relationship.

Do not silently open the latest Document Library version.

Show:

- Document name
- Pinned version
- Source agenda
- Confidentiality
- Preview status

Use the existing Document Workspace Router and Unified Document Viewer.

Do not create another viewer.

Correctly route:

- PDF
- Spreadsheet
- Image
- Rich text
- Unsupported files

Opening and closing a document must preserve:

- Session
- Active agenda
- Attendance
- Quorum
- Notes
- Open panels

────────────────────────────────────────
10. OFFICIAL MEETING NOTES
────────────────────────────────────────

Replace the plain textarea with the existing compact rich-text editor configuration.

Use only:

- Bold
- Italic
- Underline
- Bulleted list
- Numbered list
- Link
- Undo
- Redo

Notes must be linked to:

- Meeting ID
- Active child agenda ID
- Author user ID
- Updated time

Autosave only after canonical storage succeeds.

Do not overwrite the original agenda description.

Do not automatically create approved minutes.

────────────────────────────────────────
11. PHASE 3 VALIDATION
────────────────────────────────────────

Test:

1. Virtual participant joins once.
2. Manual check-in does not duplicate attendance.
3. Quorum Members and General Members remain separate.
4. At Risk is not treated as Met.
5. Quorum Not Configured blocks Start.
6. Authorized override requires a reason.
7. Quorum loss blocks formal actions.
8. Quorum restoration updates controls.
9. Only direct child agendas appear.
10. Level 3 records remain stored but hidden from Live Meeting.
11. Only one agenda is active.
12. Agenda timing persists after refresh.
13. Pinned document version opens.
14. Newer Library versions do not replace the pinned version.
15. Notes autosave canonically.
16. Document close returns to the same agenda.
17. Mobile agenda navigation works.

Add focused tests for:

- Attendance deduplication
- Actual quorum
- Quorum states
- Readiness blockers
- Quorum loss and restoration
- Direct-child agenda collection
- Agenda state transitions
- Agenda timing
- Pinned version resolution
- Note persistence
- Viewer return context

Run:

npm run typecheck
npm run test
npm run build

Do not start Phase 4 until Phase 3 passes.

GOLDEN RULES

- Do not treat RSVP as attendance.
- Do not treat At Risk as quorum Met.
- Do not count General Members toward quorum.
- Do not activate Level 3 agendas.
- Do not overwrite pinned document versions.
- Do not overwrite agenda descriptions with meeting notes.
- Do not create another viewer, editor, attendance store, quorum engine, or agenda registry.
- Preserve desktop, mobile, accessibility, EN/BN, themes, IDs, and history.
- Do not break solved issues.