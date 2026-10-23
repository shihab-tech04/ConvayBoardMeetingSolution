# Live Meeting Stabilization — Phase 4: Motions, Voting, Decisions, Resolutions, and Actions

Work only on formal actions performed during the active Live Meeting.

Phases 1–3 must already be complete.

Do not redesign the Live Meeting layout.

Do not create duplicate motion, vote, decision, resolution, or action-item systems.

────────────────────────────────────────
1. INSPECT EXISTING FORMAL-ACTION RECORDS
────────────────────────────────────────

Inspect current registries and components for:

- Motions
- Voting sessions
- Vote responses
- Decisions
- Resolutions
- Action items
- Meeting audit
- Centralized permissions

Reuse existing records and terminology.

Add only minimal backward-compatible fields when genuinely missing.

────────────────────────────────────────
2. MOTION CREATION
────────────────────────────────────────

Motions must link to:

- Meeting ID
- Parent agenda ID
- Active child agenda ID
- Motion ID
- Created by user ID
- Created time

Use one focused popup modal.

Show:

Required:

- Motion text
- Proposed By

Conditional:

- Seconded By
- Voting method
- Approval threshold

Optional:

- Short note

Proposed By and Seconded By must use canonical present participant IDs.

Seconded By must:

- Exclude the proposer
- Exclude ineligible users
- Show an honest empty state

Do not use free-text names.

Motion statuses:

- Draft
- Open for Voting
- Passed
- Failed
- Tied
- Withdrawn
- Deferred

────────────────────────────────────────
3. ONE ACTIVE VOTE
────────────────────────────────────────

Allow only one active vote at a time unless an existing approved business rule explicitly supports more.

Opening a vote requires:

- Active meeting
- Active agenda
- Valid motion
- Confirmed quorum where required
- Open Vote permission

Do not open voting when quorum is Lost, Not Met, or Not Configured where policy requires quorum.

────────────────────────────────────────
4. ELIGIBLE VOTERS
────────────────────────────────────────

Calculate eligible voters from:

- Canonical meeting participants
- Present attendance
- Canonical voting eligibility
- Agenda-specific recusal
- Participant restrictions
- Current quorum rule
- Existing voting rules

Do not allow voting by:

- General non-voting members
- Observers
- Ineligible presenters
- Excused participants
- Participants who left
- Recused participants

────────────────────────────────────────
5. EACH USER VOTES ONLY FOR THEMSELVES
────────────────────────────────────────

Remove the controller interface that allows one user to click voting choices for other participant rows.

Each eligible participant must cast only their own vote using the authenticated canonical user ID.

Vote choices:

- For
- Against
- Abstain

Do not permit duplicate voting.

Use uniqueness:

vote_session_id + voter_user_id

Do not allow changing a submitted vote unless the existing rules explicitly support it before closing.

Do not expose secret-ballot choices to unauthorized users.

────────────────────────────────────────
6. VOTE CLOSE AND RESULT
────────────────────────────────────────

Only authorized users may close voting.

Before closing show:

- Motion text
- Eligible voter count
- Votes received
- Missing votes
- Current totals
- Quorum status

Calculate results using the configured threshold.

Show:

- For
- Against
- Abstain
- Not Voted
- Passed
- Failed
- Tied

Apply a Chairperson casting vote only when an existing configured rule explicitly allows it.

Do not invent a casting-vote rule.

After closure, results become immutable.

Correction requires an authorized audited action:

- Reopen
- Void

Require a reason.

────────────────────────────────────────
7. AGENDA-SPECIFIC RECUSAL
────────────────────────────────────────

Persist recusal using:

- Meeting ID
- Agenda ID
- User ID
- Start time
- End time
- Reason
- Actor

Recusal must affect:

- Eligible-voter calculation
- Quorum where configured
- Decision participation

Do not permanently change the participant’s meeting category.

────────────────────────────────────────
8. DECISIONS
────────────────────────────────────────

Record Decision must show only:

- Decision text
- Decision type
- Related motion when applicable
- Effective date only when needed

Automatically store:

- Meeting ID
- Parent agenda ID
- Child agenda ID
- Motion ID
- Vote result
- Created by
- Created date

Do not mark a decision Confirmed when its required motion failed.

Use canonical owner IDs where an owner is required.

────────────────────────────────────────
9. RESOLUTIONS
────────────────────────────────────────

Show Record Resolution only when the project already distinguishes resolutions from decisions.

Link the resolution to:

- Meeting
- Active agenda
- Motion
- Vote
- Decision where relevant

Do not ask users to re-enter information already available from the motion or vote.

Use canonical user IDs for responsibility fields.

────────────────────────────────────────
10. ACTION ITEMS
────────────────────────────────────────

Use one simple modal.

Show:

Required:

- Action
- Assigned To
- Due Date

Optional:

- Priority
- Short note

Assigned To must use an active canonical user selector.

Automatically link:

- Meeting ID
- Parent agenda ID
- Child agenda ID
- Decision or resolution ID
- Created by
- Created date

Default status:

Open

Prevent repeated submission from creating duplicates.

────────────────────────────────────────
11. DECISIONS AND ACTIONS PANEL
────────────────────────────────────────

Use one contextual panel:

Decisions and Actions

Sections:

- Motions
- Vote Results
- Decisions
- Resolutions
- Action Items

Keep each section compact.

Do not create five permanent sidebars.

Do not allow silent editing of:

- Closed votes
- Confirmed decisions
- Final resolutions

Use formal audited actions where correction is supported.

────────────────────────────────────────
12. AUDIT EVENTS
────────────────────────────────────────

Audit:

- Motion created
- Motion withdrawn
- Vote opened
- Vote cast
- Vote closed
- Vote reopened
- Vote voided
- Decision recorded
- Resolution recorded
- Action item created

Every event must include:

- Meeting ID
- Agenda ID
- Actor user ID
- Timestamp
- Event type
- Reason where required

Do not write secret vote choices into general audit text.

────────────────────────────────────────
13. PHASE 4 VALIDATION
────────────────────────────────────────

Test:

1. Motion links to the active child agenda.
2. Proposer and seconder use real participant IDs.
3. Seconder cannot equal proposer.
4. Vote cannot open without required quorum.
5. Only eligible present users can vote.
6. Each user votes only for themselves.
7. Duplicate vote is blocked.
8. Recused user cannot vote.
9. Participant who left cannot vote.
10. Vote result uses the configured threshold.
11. Casting vote is unavailable unless configured.
12. Closed vote is immutable.
13. Reopen or Void requires permission and reason.
14. Failed motion cannot create a confirmed decision.
15. Action item uses a canonical assignee.
16. Duplicate action submission is blocked.
17. Refresh restores the active vote and formal records.
18. Mobile voting works.

Add focused tests for:

- Motion relationships
- Eligible-voter calculation
- Own-vote enforcement
- Duplicate-vote prevention
- Secret-vote privacy
- Vote result calculation
- Recusal
- Decision validation
- Resolution links
- Action-item creation
- Formal-action audit events

Run:

npm run typecheck
npm run test
npm run build

Do not start Phase 5 until Phase 4 passes.

GOLDEN RULES

- Do not let users vote for other participants.
- Do not allow duplicate votes.
- Do not expose secret vote choices.
- Do not create formal decisions from failed motions.
- Do not create duplicate formal-action registries.
- Do not edit closed votes silently.
- Use canonical users, meeting IDs, agenda IDs, and permissions.
- Preserve desktop, mobile, accessibility, EN/BN, themes, and audit history.
- Do not break solved issues.