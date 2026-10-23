# Live Meeting Stabilization — Phase 5: Permissions, End Meeting, Handoff, and Final Regression

Complete the Live Board Meeting journey.

Phases 1–4 must already be complete.

Do not build the full Post-Meeting Review workflow in this phase.

Do not redesign unrelated modules.

────────────────────────────────────────
1. REMOVE HARDCODED LIVE PERMISSIONS
────────────────────────────────────────

Remove local role-based functions such as:

canControl(role)
canRecord(role)
canVote(role)
isObserver(role)

Do not grant behavior because a label contains:

- Chairperson
- Secretary
- Administrator
- Board Member
- Observer

Use the existing centralized permission system and current meeting relationship.

Required capabilities include:

- Start Meeting
- Join Meeting
- Resume Meeting
- Manage Attendance
- Override Readiness
- Control Agenda
- View Confidential Documents
- Manage Meeting Documents
- Record Meeting Notes
- Create Motion
- Open Vote
- Cast Vote
- Close Vote
- Reopen or Void Vote
- Record Decision
- Record Resolution
- Create Action Item
- End Meeting
- View Meeting Audit

Enforce permissions in:

- Visible controls
- Disabled states
- Event handlers
- Registry write operations

────────────────────────────────────────
2. SIMPLIFY THE LIVE WORKSPACE
────────────────────────────────────────

Preserve the current full-screen Live Meeting layout.

Do not add more permanent panels.

Use:

- Fixed top header
- Collapsible agenda rail
- Main agenda workspace
- Contextual Participants panel
- Contextual Documents panel
- Contextual Decisions and Actions panel

Remove unsupported or fake controls.

Keep the interface focused on:

- Attendance
- Quorum
- Agenda progress
- Documents
- Notes
- Motions
- Voting
- Decisions
- Actions
- End Meeting

────────────────────────────────────────
3. END MEETING PRECHECK
────────────────────────────────────────

End Meeting must be available only to authorized users.

Open a confirmation modal showing:

- Actual duration
- Completed agendas
- Deferred agendas
- Skipped agendas
- Current quorum
- Motions and vote status
- Decisions and resolutions
- Open action items
- Unsaved notes
- Active vote

Critical blockers:

- Active vote
- Critical save in progress
- Unresolved persistence conflict

Deferred or incomplete agendas may remain only after:

- Clear warning
- Confirmation
- Required reason

Footer:

Left:
Continue Meeting

Right:
End Meeting

────────────────────────────────────────
4. COMPLETE THE CORRECT LIFECYCLE
────────────────────────────────────────

After confirmation:

1. Save outstanding permitted records.
2. Close the active agenda state.
3. Store actual meeting end time.
4. Store ended-by user ID.
5. Mark the canonical Live Session Ended.
6. Set the meeting status to Completed.
7. Store the final attendance snapshot.
8. Store final quorum result and history.
9. Preserve agenda progress and timing.
10. Preserve pinned document versions.
11. Preserve meeting notes.
12. Preserve motions and votes.
13. Preserve decisions and resolutions.
14. Preserve action items.
15. Create one audit event.
16. Open the Meeting Record handoff.

Do not leave the meeting in Awaiting Minutes as a substitute for Completed unless the existing lifecycle explicitly requires a separate post-meeting substatus.

If an Awaiting Minutes state must remain for compatibility:

- Keep Meeting lifecycle status as Completed.
- Store post-meeting review status separately.

Do not automatically approve or publish minutes.

────────────────────────────────────────
5. MEETING RECORD HANDOFF
────────────────────────────────────────

Ensure Meeting Record can read canonical:

- Scheduled start and end
- Actual start and end
- Attendance
- Attendance corrections
- Quorum history
- Agenda progress
- Agenda timing
- Meeting notes
- Documents
- Pinned versions
- Motions
- Vote results
- Decisions
- Resolutions
- Action items
- Audit history

Do not duplicate these records into another temporary record system.

Create only one draft Meeting Record reference when the existing project requires it.

Do not complete Minutes approval or publication in this phase.

────────────────────────────────────────
6. COMPLETED MEETING BEHAVIOR
────────────────────────────────────────

After completion:

- Start Meeting must disappear.
- Join Meeting must disappear.
- Resume Meeting must disappear.
- View Meeting Record must appear for authorized users.
- Live routes must not reopen the meeting as active.
- Refresh must remain on the completed state.
- Historical Live Session data must remain read-only.

Do not allow a completed meeting to create another active session.

────────────────────────────────────────
7. FINAL STRUCTURE PROTECTION
────────────────────────────────────────

Do not perform a broad project rewrite.

However, stop adding unrelated logic to LiveMeetingWorkspace.tsx.

Extract only narrowly scoped components or hooks when necessary, such as:

- Live session lifecycle hook
- Attendance panel
- Agenda rail
- Live quorum summary
- Motion modal
- Voting panel
- Decisions and Actions panel
- End Meeting modal

Reuse existing design-system components.

Do not move routes or rename large legacy file groups in this phase.

Provide a final structure report listing:

- Canonical Live Session source
- Canonical attendance source
- Canonical agenda-progress source
- Canonical vote source
- Canonical decisions and actions sources
- Remaining legacy compatibility state
- Large files still requiring future cleanup
- Items intentionally preserved

────────────────────────────────────────
8. COMPLETE INTEGRATION REGRESSION
────────────────────────────────────────

Test the complete journey:

1. Create and schedule a meeting.
2. Open Meeting Details.
3. Start Meeting.
4. Confirm readiness blockers.
5. Check in participants.
6. Confirm actual quorum.
7. Start the meeting.
8. Join as another participant.
9. Refresh both contexts.
10. Confirm one Live Session.
11. Start the first child agenda.
12. Open a pinned document.
13. Add notes.
14. Change attendance.
15. Trigger quorum loss.
16. Confirm formal actions are blocked.
17. Restore quorum.
18. Create a motion.
19. Cast each user’s own vote.
20. Close voting.
21. Record a decision.
22. Create an action item.
23. Complete the agenda.
24. Defer another agenda.
25. Leave and rejoin.
26. Confirm session restoration.
27. End the meeting.
28. Confirm Completed status.
29. Confirm the Live Session is Ended.
30. Open Meeting Record.
31. Confirm all canonical records appear.
32. Confirm Start, Join, and Resume are unavailable.
33. Test unauthorized users.
34. Test desktop.
35. Test tablet.
36. Test mobile.
37. Test keyboard navigation.
38. Test EN/BN.
39. Test light and dark themes.
40. Refresh after completion.

────────────────────────────────────────
9. FINAL AUTOMATED TESTS
────────────────────────────────────────

Add production-level integration tests for:

- Start readiness
- One Live Session
- Join participant validation
- Refresh restore
- Attendance deduplication
- Actual quorum
- Quorum loss and restoration
- Direct-child agenda navigation
- Pinned documents
- Note persistence
- Motion creation
- Own-vote enforcement
- Duplicate-vote prevention
- Vote close
- Decision and action links
- Permission enforcement
- End Meeting blockers
- Completed lifecycle
- Meeting Record handoff
- Completed-meeting route protection
- Mobile behavior
- Accessibility
- EN/BN
- Theme parity

Tests must invoke actual production components, hooks, helpers, and registries.

Do not recreate simplified logic only inside test files.

Run:

npm run typecheck
npm run test
npm run build

Do not remove or weaken tests.

────────────────────────────────────────
COMPLETION CRITERIA
────────────────────────────────────────

Live Board Meeting is complete only when:

- All required dropdowns use canonical data.
- Fake participants and agendas are removed.
- One Live Session exists per meeting.
- Start, Join, Resume, Leave, Refresh, and End use the same session.
- Current user identity is canonical.
- Attendance is canonical and deduplicated.
- Quorum Members and General Members remain separate.
- Actual quorum is calculated once and used everywhere.
- Only direct child agendas are live discussion items.
- Agenda progress and timing persist.
- Documents use pinned versions.
- Notes persist canonically.
- Each voter casts only their own vote.
- Motions, votes, decisions, resolutions, and actions are canonical and audited.
- Centralized permissions control every action.
- End Meeting sets the meeting to Completed.
- The canonical Live Session is ended.
- Meeting Record receives the complete handoff.
- Completed meetings cannot reopen as active.
- Desktop, tablet, mobile, accessibility, EN/BN, and themes work.
- Type checking, tests, and production build pass.

GOLDEN RULES

- Do not break solved issues.
- Do not create duplicate sessions, attendance, agendas, documents, votes, decisions, actions, or records.
- Do not use names or role labels as permission or relationship IDs.
- Do not fake participants, agendas, video, recording, transcription, or real-time behavior.
- Do not let ordinary users control or end meetings.
- Do not let users vote for others.
- Do not reopen completed meetings as active.
- Do not automatically approve minutes.
- Do not rebuild Agenda Management, Document Management, Meeting Creation, Calendar, or Meeting Records.
- Reuse existing registries, permissions, components, viewers, editors, themes, routes, and design tokens.
- Preserve IDs, versions, history, desktop, tablet, mobile, accessibility, EN/BN, and backward compatibility.