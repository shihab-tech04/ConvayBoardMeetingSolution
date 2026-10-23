# Live Meeting Stabilization — Phase 1: Canonical Data and Dropdown Foundations

Work only on the data foundations required by Board Meeting Creation and Live Board Meeting.

Do not redesign Live Meeting yet.

Do not modify Agenda Builder, Agenda Management, Document Library, Meeting List, Meeting Calendar, Meeting Records, navigation, themes, or unrelated modules.

The goal of this phase is to ensure every required selector reads real canonical data and never displays a blank active dropdown.

────────────────────────────────────────
1. INSPECT THE CURRENT FOUNDATIONS
────────────────────────────────────────

Inspect:

src/app/App.tsx
src/app/AppRoot.tsx
src/app/components/forms/EntryForm.tsx
src/app/components/forms/AppSelectField.tsx
src/app/utils/patchFormOptions.ts
src/app/utils/migrateGovernanceMemberships.ts
src/app/data/governanceMemberships.ts
src/app/data/boardMeetingData.ts
src/app/data/bmsUsers.ts
src/app/utils/orgHierarchy.ts
src/app/components/forms/ParticipantSelectorStep.tsx
src/app/pages/meetings/LiveMeetingWorkspace.tsx
src/app/components/meetings/MeetingPreJoinPanel.tsx

Also inspect the existing registries for:

- Users
- Governance bodies
- Governance memberships
- Organization units
- Meeting participants
- Quorum rules
- Meetings
- Agendas
- Documents

Do not create duplicate registries.

────────────────────────────────────────
2. RUN THE GOVERNANCE MEMBERSHIP MIGRATION
────────────────────────────────────────

The project currently contains:

Legacy membership storage:
bms.memberships

Canonical membership storage:
bms.governance_memberships

Use the canonical registry as the source of truth for all new reads and writes.

Run the existing non-destructive migration once during application initialization.

Use the same safe pattern as the existing Board Meeting migration utilities.

The migration must be:

- Idempotent
- Versioned
- Safe to run repeatedly
- Non-destructive
- Auditable

Migrate a legacy membership only when:

- The governance body resolves exactly.
- The user resolves by stable ID, exact email, or one unique exact name.
- No equivalent canonical membership exists.

Do not guess between duplicate names.

Do not delete unresolved legacy records.

Store a migration completion marker.

Report:

- Migrated records
- Skipped duplicates
- Unresolved records

After migration, all new governance-membership writes must use the canonical registry only.

────────────────────────────────────────
3. COMPLETE THE CANONICAL MEMBERSHIP MODEL
────────────────────────────────────────

Every canonical membership must contain stable values for:

- Membership ID
- User ID
- Governance Body ID
- Membership role
- Counts for quorum
- Voting eligibility
- Status
- Start date
- End date when applicable

Do not store the user name or body name as the relationship source.

Names may remain as derived display snapshots only.

Update all new membership reads used by:

- Quorum Members
- General Members
- Quorum calculation
- Voting eligibility
- Live Meeting participant display
- Meeting Details
- Meeting Creation

Do not read new participant eligibility from the legacy membership registry.

────────────────────────────────────────
4. FIX USER TO ORGANIZATION RELATIONSHIPS
────────────────────────────────────────

Division and Department participant selectors must use stable Organization Unit IDs.

For existing users, add a one-time non-destructive compatibility migration.

Migrate only when an exact Organization Unit label match exists.

Supported user fields may include:

- primary_org_unit_id
- division_id
- department_id

Do not infer organization membership from:

- Designation
- User role
- Committee name
- Permission role
- Similar text
- Partial name matching

When no exact match exists:

- Keep the user unchanged.
- Keep the user available through Individual Add.
- Report the unresolved organization assignment.
- Do not invent a Division or Department.

────────────────────────────────────────
5. FIX THE SHARED SELECT OPTION CONTRACT
────────────────────────────────────────

Preserve this option structure throughout the form system:

{
  value: "stable-id",
  label: "Readable label"
}

The UI must display the label and store the value.

Apply this consistently to:

- Select
- Searchable select
- Multiselect
- Repeatable select fields
- Live Meeting participant selectors
- Motion selectors
- Document selectors
- Meeting selectors

Do not flatten structured options into plain strings.

Continue supporting existing string-only static options.

────────────────────────────────────────
6. ADD HONEST EMPTY AND DISABLED STATES
────────────────────────────────────────

Every registry-driven selector must support:

- Loading
- Available
- No configured records
- No eligible records
- No search results
- Disabled
- Error

A required selector with no options must:

- Be disabled
- Show a short helper message
- Show a field-level validation state
- Block Continue or Submit
- Provide an existing management action only when the user has permission

Examples:

No active users are available.

No Board or Committee is configured.

No quorum members are configured for this Board / Committee.

No general members are configured for this Board / Committee.

No active users are assigned to this Division.

Do not show fake placeholder records.

Do not silently show an empty menu.

────────────────────────────────────────
7. FIX QUORUM MEMBER OPTIONS
────────────────────────────────────────

After selecting Board / Committee, Quorum Members must load canonical memberships where:

- Membership status is Active
- User status is Active
- Membership belongs to the selected Board / Committee
- counts_for_quorum = true

Show:

- Name
- Designation
- Organizational path
- Membership role
- Voting or Non-voting status

Store the canonical user ID.

Do not match users by name.

Do not treat every Chairperson as a quorum member.

────────────────────────────────────────
8. FIX GENERAL MEMBER OPTIONS
────────────────────────────────────────

General Members must load canonical memberships where:

- Membership status is Active
- User status is Active
- Membership belongs to the selected Board / Committee
- counts_for_quorum = false

Keep Quorum Members and General Members separate.

Do not call them Governance Members.

Do not load every active user as a Board or Committee member.

────────────────────────────────────────
9. FIX DIVISION AND DEPARTMENT OPTIONS
────────────────────────────────────────

Division must show only active Organization Units where:

unit_type = Division

Department must show only active Organization Units where:

unit_type = Department

For every source show:

- Unit name
- Parent unit where useful
- Active-user count
- Full, partial, or unselected state

Expanding a source must show real users linked through stable organization IDs.

When a unit has no active users:

- Keep the source visible
- Show 0 active users
- Disable Add All
- Show a short corrective message

Do not use a generic Org Unit selector.

────────────────────────────────────────
10. FIX LIVE MEETING ACTOR SELECTORS
────────────────────────────────────────

Do not redesign the Live Meeting workspace in this phase.

Only fix the canonical options for:

- Motion Proposed By
- Motion Seconded By
- Decision Owner
- Resolution Owner
- Action Assigned To
- Minute Taker
- Related Motion

Use stable IDs.

Display readable names and roles.

Seconded By must exclude the selected proposer.

Related Motion must display a readable shortened motion text while storing the motion ID.

When no eligible options exist:

- Disable the field
- Explain why
- Block submission

────────────────────────────────────────
11. REMOVE FAKE FALLBACK RECORDS
────────────────────────────────────────

Remove runtime use of:

DEFAULT_PARTICIPANTS
DEFAULT_AGENDA

Do not delete harmless development fixtures used only by isolated tests.

A live meeting with missing canonical participants must show:

No meeting participants are configured.

A live meeting with no linked agendas must show:

No agendas are linked to this meeting.

Do not display invented participants or agendas.

────────────────────────────────────────
12. PHASE 1 VALIDATION
────────────────────────────────────────

Test:

1. Legacy membership migration runs once.
2. Migration does not duplicate records.
3. Unresolved duplicate names are not guessed.
4. Quorum Members load from canonical memberships.
5. General Members load separately.
6. Division uses real Division IDs.
7. Department uses real Department IDs.
8. Individual Add still shows active users without organization links.
9. Structured options display readable labels.
10. Stable IDs persist after refresh.
11. Required empty selectors are disabled.
12. Fake participants and agendas never appear.
13. Motion and action selectors use canonical users.
14. Related Motion shows readable content.
15. Mobile dropdowns work.
16. EN/BN works.
17. Light and dark themes work.

Add focused tests for:

- Migration idempotency
- Duplicate prevention
- Exact user resolution
- Quorum-member filtering
- General-member filtering
- Division resolution
- Department resolution
- Structured select rendering
- Empty required selector
- Fake fallback removal

Run:

npm run typecheck
npm run test
npm run build

Do not start Phase 2 until Phase 1 passes.

GOLDEN RULES

- Do not break solved issues.
- Do not redesign Live Meeting.
- Do not create duplicate registries or form systems.
- Do not use names as relationship IDs.
- Do not guess memberships or Organization Unit assignments.
- Do not add fake dropdown options.
- Do not delete unresolved historical data.
- Preserve navigation, themes, routes, mobile, accessibility, EN/BN, IDs, and backward compatibility.