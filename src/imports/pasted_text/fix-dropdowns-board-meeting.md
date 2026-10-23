# Fix Empty Dropdowns and Stabilize Board Meeting Data Sources

Work inside the current Board Meeting Solution project.

Fix all empty, unreadable, stale, or incorrectly populated dropdowns without redesigning the existing pages or breaking working features.

This task must also correct the minimum structural issues responsible for the missing dropdown data.

Do not rebuild Board Meeting Creation.

Do not redesign Live Meeting.

Do not rename or move large groups of files.

Do not perform a broad refactor of the application.

────────────────────────────────────────
1. INSPECT THE EXISTING IMPLEMENTATION
────────────────────────────────────────

Inspect these existing files and their current equivalents:

src/app/components/forms/EntryForm.tsx
src/app/components/forms/AppSelectField.tsx
src/app/utils/patchFormOptions.ts

src/app/pages/boardMeetingFormFields.ts
src/app/pages/return-register/OnlineReturnRegisterPage.tsx
src/app/pages/return-register/ReturnViewApprovalPage.tsx
src/app/pages/return-register/OfflineReturnRegisterPage.tsx

src/app/components/forms/ParticipantSelectorStep.tsx
src/app/data/bmsUsers.ts
src/app/data/governanceMemberships.ts
src/app/data/boardMeetingData.ts
src/app/utils/orgHierarchy.ts

src/app/pages/meetings/LiveMeetingPage.tsx
src/app/pages/meetings/LiveMeetingWorkspace.tsx
src/app/components/meetings/MeetingPreJoinPanel.tsx

Also inspect every visible field using:

- select
- searchable-select
- multiselect
- radio options generated from registries

Do not create a second form system, user registry, governance registry, organization registry, membership registry, or dropdown component.

────────────────────────────────────────
2. FIX THE SHARED OPTION VALUE-LABEL CONTRACT
────────────────────────────────────────

The shared form currently removes labels from structured options.

Correct EntryForm so select fields pass the original option objects directly to AppSelectField.

Incorrect:

options={(f.options ?? []).map(optionValue)}

Correct behavior:

options={f.options ?? []}

AppSelectField already supports:

Array<string | { value: string; label: string }>

Preserve that contract.

For an option such as:

{
  value: "u1",
  label: "Aminul Islam — Board Chairman — Board Secretariat"
}

the dropdown must:

- Display the complete human-readable label.
- Store only `u1`.
- Restore the selected value correctly during editing.
- Continue supporting existing string-only options.

Apply the same stable value-label behavior to searchable-select and multiselect fields.

Searchable selectors must not store the display label as the relationship value.

They must store the option value and display its label.

Do not break static string options used elsewhere.

────────────────────────────────────────
3. ADD SAFE DROPDOWN STATES
────────────────────────────────────────

Every registry-driven dropdown must support:

- Loading
- Available options
- No matching records
- No configured records
- Disabled
- Error

A required dropdown must never appear as an active empty control.

When there are no valid options:

- Disable the field.
- Show a short helper message.
- Show the appropriate existing navigation or management action when useful.
- Block progression with a clear field-level error.

Examples:

No active users are available. Add or activate users in User Management.

No Board or Committee is available. Configure one in Governance Bodies.

No quorum memberships are configured for this Board or Committee.

Do not silently show a blank menu.

Do not add fake options such as “Sample User” or “User 1.”

────────────────────────────────────────
4. USE ONE CANONICAL MEETING CREATION ENTRY
────────────────────────────────────────

All Meetings must remain the canonical place for Board Meeting Creation.

Keep the existing five-step full-screen wizard there.

Meeting Overview and Meeting Calendar must not maintain separate incomplete copies of the wizard configuration.

For their Add Meeting or Create Meeting actions:

- Navigate to All Meetings with a safe create intent, such as `?create=1`.
- Open the existing canonical Meeting Creation wizard.
- Preserve the source route so Cancel can return users to the original page when appropriate.

Remove only the duplicate local Meeting Creation configuration from:

- Meeting Overview
- Meeting Calendar

Do not remove their tables, KPIs, filters, drawers, Calendar behavior, Start action, Join action, or other working features.

There must be one source of truth for:

- Meeting form fields
- Dynamic options
- Step renderers
- Save Draft
- Schedule Meeting
- Validation
- Relationship persistence

────────────────────────────────────────
5. FIX BOARD AND COMMITTEE OPTIONS
────────────────────────────────────────

Populate Board / Committee from the active Governance Body registry.

Each option must use:

value:
- Stable Governance Body ID

label:
- Governance Body name

Example:

{
  value: "GB-001",
  label: "Board of Directors"
}

Do not store the body name as the primary relationship value for new meetings.

Preserve the readable body name as derived compatibility data where current tables or drawers require it.

Support older meetings that stored only a name:

- Resolve the old name to an exact matching Governance Body.
- Use the resolved ID during the next valid save.
- Do not destructively rewrite unrelated historical records.

Do not use the static GOVERNANCE_BODIES array as the primary source for Meeting Creation when the live Governance Body registry exists.

────────────────────────────────────────
6. FIX LEADERSHIP DROPDOWNS
────────────────────────────────────────

Populate these required fields from active canonical users:

- Chairperson
- Meeting Secretary
- Meeting Organizer

Each option must use:

value:
- Canonical user ID

label:
- User name
- Designation
- Organizational path

Example display:

Aminul Islam — Board Chairman — Board Secretariat

Do not resolve users later by splitting a display label.

Do not store names as the relationship source.

Filter out:

- Inactive users
- Suspended users
- Archived users
- Deactivated users

The three selectors must work consistently from every valid Meeting Creation entry point.

When editing an older meeting with name-only leadership fields:

- Resolve an exact canonical user where possible.
- Preserve the original name when no safe exact match exists.
- Show a clear unresolved-user warning.
- Do not guess between duplicate names.

────────────────────────────────────────
7. CONSOLIDATE GOVERNANCE MEMBERSHIP READS
────────────────────────────────────────

The project currently has two Governance Membership registries:

Legacy:

src/app/data/boardMeetingData.ts
Storage: bms.memberships

Canonical:

src/app/data/governanceMemberships.ts
Storage: bms.governance_memberships

Use the canonical registry from:

src/app/data/governanceMemberships.ts

as the source of truth for all new membership reads and writes.

Canonical membership fields must include:

- User ID
- Governance Body ID
- Membership role
- Voting eligibility
- Quorum eligibility
- Status
- Start date
- End date

Update these areas to use the canonical registry:

- User Governance Membership modal
- Governance member management
- Board Meeting participant selection
- Quorum Members
- General Members
- Quorum calculation
- Voting eligibility

Do not delete the legacy registry or its stored records in this task.

Add one non-destructive compatibility migration.

Migrate a legacy membership only when:

- The Governance Body resolves exactly.
- The canonical user resolves exactly by stable ID, email, or one unique exact name.
- No equivalent canonical membership already exists.

Do not guess unresolved users.

Do not create duplicate memberships.

Keep unresolved legacy records unchanged and report their count.

After migration, all new writes must go to the canonical registry only.

────────────────────────────────────────
8. FIX QUORUM AND GENERAL MEMBER CONTENT
────────────────────────────────────────

After selecting Board / Committee:

Quorum Members must show canonical active memberships where:

counts_for_quorum = true

General Members must show canonical active memberships where:

counts_for_quorum = false

Resolve every membership through its canonical `user_id`.

Do not match users by display name.

Each member must show:

- Name
- Designation
- Organizational path
- Membership role
- Voting or Non-voting status

When no memberships exist:

Show:

No quorum members are configured for this Board / Committee.

or:

No general members are configured for this Board / Committee.

Provide an existing permission-controlled action:

Manage Memberships

Do not show a blank area.

Do not fall back to unrelated Participant Groups.

Do not load all users as Board or Committee members.

────────────────────────────────────────
9. FIX DIVISION AND DEPARTMENT CONTENT
────────────────────────────────────────

Division and Department selection must use actual Organization Structure records.

Division source:

- Show active units with `unit_type = Division`.

Department source:

- Show active units with `unit_type = Department`.

Users must be resolved through stable fields such as:

- primary_org_unit_id
- division_id
- department_id

Do not assign users to units by guessing from role, designation, or unrelated committee names.

For older users, migrate organization links only when an exact Organization Unit label match exists.

Do not invent a Division or Department assignment.

When a unit has no assigned active users:

- Keep the unit visible.
- Show `0 active users`.
- Disable Add All.
- Show a short message directing administrators to User Management.

Individual Add must continue showing all searchable active canonical users even when they have no Organization Unit assignment.

────────────────────────────────────────
10. IMPROVE patchFormOptions SAFELY
────────────────────────────────────────

Keep `patchFormOptions`, but make its behavior explicit.

It must support structured options:

string[]

and:

Array<{
  value: string;
  label: string;
}>

Do not silently retain stale static options when a dynamic override is intentionally empty.

Allow the caller to explicitly set:

options: []

so the field can display its disabled empty state.

Do not mutate the original field definition array.

Add focused unit tests for:

- String options
- Structured options
- Empty override
- Unknown field key
- Original-array immutability

────────────────────────────────────────
11. AUDIT EVERY EMPTY OPTIONS ARRAY
────────────────────────────────────────

Search the entire project for:

options: []

For every occurrence, classify it as:

1. Dynamically populated
2. Intentionally empty and hidden
3. Broken
4. Obsolete

Current known fields include:

- Chairperson
- Meeting Secretary
- Meeting Organizer
- Related Meeting in Document forms
- Related Meeting in Availability Poll forms

Fix every visible dynamic field.

Related Meeting options must come from the canonical Meeting registry.

Each option must use:

value:
- Meeting ID

label:
- Meeting title
- Meeting date where useful

Do not leave a visible Related Meeting dropdown empty.

Do not add options to fields that are permanently hidden or obsolete; remove only the obsolete field from the visible form when safe.

────────────────────────────────────────
12. FIX LIVE MEETING ACTOR FIELDS
────────────────────────────────────────

Do not redesign the Live Meeting workspace in this task.

Only correct the dropdown data and canonical relationships used by its forms.

## Motion

Change:

- Proposed By
- Seconded By

from free-text inputs to participant selectors.

Proposed By options must contain present participants allowed to propose a motion.

Seconded By options must contain valid present participants other than the proposer.

Store canonical user IDs.

Display participant names and roles.

## Voting

Related Motion must:

- Store Motion ID.
- Display motion title or shortened motion text.
- Never show only an unreadable motion ID.

Voting Method and Threshold must continue using valid configured options.

Hide unsupported voting methods.

## Decisions and Resolutions

Change:

- Responsible Owner
- Resolution Owner

to canonical active-user or meeting-participant selectors.

Use the existing business rule to decide the eligible source.

Store stable user IDs.

## Action Items

Change Assigned To from free text to the canonical active-user selector.

Show:

- Name
- Designation
- Organizational path

Store user ID.

## Minutes

Change Minute Taker from free text to a selector containing:

- Meeting Secretary
- Authorized minute takers
- Other permitted meeting participants

Store canonical user ID.

Do not create a new user from these forms.

When there are no eligible people:

- Disable the field.
- Explain why.
- Block submission.

────────────────────────────────────────
13. CORRECT START AND JOIN ROUTING
────────────────────────────────────────

Do not implement the full Live Meeting redesign yet.

Fix the current route intent.

Start Meeting must navigate with:

entryAction = start_meeting

Join Meeting must navigate with:

entryAction = join_meeting

Resume Meeting must navigate with:

entryAction = resume_meeting

Do not route all three actions as Join Meeting.

LiveMeetingPage must read or receive the correct entry action.

Do not hardcode:

entryAction="join_meeting"

for every route entry.

Preserve the existing Live Meeting URL and working back behavior.

────────────────────────────────────────
14. PROJECT STRUCTURE PROTECTION
────────────────────────────────────────

Do not broadly refactor these large files during this task:

- boardMeetingData.ts
- LiveMeetingWorkspace.tsx
- DocumentDetailsDrawer.tsx
- GeneratedTablePage.tsx
- AgendaFormModal.tsx

Do not rename legacy page files yet.

Do not move routes.

Do not replace registries.

This task may add only small, necessary shared adapters such as:

- A canonical form-option hook
- A governance-membership compatibility migration
- A user-option builder
- A meeting-option builder

Before adding a new helper, search for an existing equivalent and reuse it.

Keep all new helpers pure, typed, and narrowly scoped.

At the end, provide a structure report listing:

- Canonical registries
- Legacy compatibility registries
- Remaining duplicate models
- Large files that should be split later
- Legacy filenames that should be renamed later
- Items intentionally not refactored to protect current functionality

Do not perform those later refactors now.

────────────────────────────────────────
15. REQUIRED REGRESSION TESTS
────────────────────────────────────────

Test these exact journeys:

1. Open All Meetings.
2. Select Add Meeting.
3. Open Board / Committee.
4. Confirm active bodies are visible with readable labels.
5. Select a body.
6. Open Chairperson.
7. Confirm active users are visible by name.
8. Select Chairperson, Secretary, and Organizer.
9. Continue to Participants.
10. Confirm Quorum Members load from canonical memberships.
11. Confirm General Members load separately.
12. Open Division.
13. Confirm active divisions appear.
14. Expand a division.
15. Confirm assigned users appear.
16. Open Department.
17. Confirm active departments appear.
18. Expand a department.
19. Confirm assigned users appear.
20. Search Individual users.
21. Save Draft.
22. Reopen the meeting.
23. Confirm every selected value restores.
24. Open Meeting Overview.
25. Select Add Meeting.
26. Confirm it opens the same canonical wizard.
27. Repeat from Meeting Calendar.
28. Confirm no separate incomplete wizard appears.
29. Open Live Meeting motion creation.
30. Confirm Proposed By has eligible participants.
31. Confirm Seconded By has eligible participants.
32. Open a vote.
33. Confirm Related Motion shows readable titles.
34. Create an action item.
35. Confirm Assigned To shows active users.
36. Save draft minutes.
37. Confirm Minute Taker contains eligible users.
38. Test empty governance memberships.
39. Test a Division with no users.
40. Test a Department with no users.
41. Test no active users.
42. Test a legacy name-based meeting.
43. Test duplicate user names.
44. Test mobile.
45. Test EN and BN.
46. Test light and dark themes.

────────────────────────────────────────
16. AUTOMATED TESTS
────────────────────────────────────────

Add focused tests for:

- Structured select option rendering
- Stable value and readable label
- Meeting leadership options
- One canonical Meeting Creation entry
- Governance Body ID persistence
- Canonical membership migration
- Duplicate membership prevention
- Quorum Member filtering
- General Member filtering
- Division user resolution
- Department user resolution
- Empty required-field state
- Related Meeting options
- Live Motion participant options
- Related Motion labels
- Action assignee options
- Minute-taker options
- Start, Join, and Resume route intent
- Legacy-value restoration
- Mobile dropdown behavior
- Keyboard operation
- Screen-reader labels

Run:

npm run typecheck
npm run test
npm run build

Do not remove or weaken existing tests.

Do not use:

- any
- @ts-ignore
- Disabled strict mode
- Hardcoded fake dropdown records
- Commented-out validation

────────────────────────────────────────
COMPLETION CRITERIA
────────────────────────────────────────

This task is complete only when:

- No visible required dropdown opens with zero unexplained options.
- User dropdowns show readable names while storing stable IDs.
- Board / Committee stores a stable canonical ID.
- All Meeting Creation entry points open the same wizard.
- Chairperson, Secretary, and Organizer are populated consistently.
- Quorum Members and General Members use one canonical membership registry.
- Division and Department use real Organization Structure IDs.
- Empty data states are clear and actionable.
- Related Meeting dropdowns are populated.
- Live Meeting actor fields use canonical selectors.
- Start, Join, and Resume preserve their correct intent.
- Existing Meeting Creation, Agenda, Document, Calendar, Meeting List, drawers, themes, mobile views, routes, and business logic remain intact.
- Type checking, tests, and production build pass.

GOLDEN RULES

- Do not break solved issues.
- Do not rebuild Meeting Creation or Live Meeting.
- Do not create duplicate registries or dropdown components.
- Do not use names as relationship identifiers.
- Do not populate dropdowns with fake records.
- Do not guess governance memberships or Organization Unit assignments.
- Do not keep multiple independent Meeting Creation forms.
- Do not change unrelated pages or APIs.
- Do not rename or move large file groups in this task.
- Reuse existing users, governance bodies, organization units, memberships, meetings, forms, modals, and design tokens.
- Preserve desktop, tablet, mobile, accessibility, EN/BN, themes, IDs, persistence, and backward compatibility.