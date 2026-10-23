# Complete Board Meeting Creation — Correct Participants, Agenda Creation, Draft Persistence, Quorum, and Scheduling

Work only on the existing Board Meeting Creation journey.

Use the current five-step full-screen wizard. Do not rebuild it, replace it, or introduce another Meeting Creation page.

The final journey must be:

Meeting List
→ Add Meeting
→ Meeting Details
→ Participants
→ Agendas and Documents
→ Meeting Mode and Quorum
→ Review and Schedule
→ Save Draft or Schedule Meeting

The participant journey must use only:

1. Quorum Members
2. General Members
3. Division
4. Department
5. Individual

Do not show a participant source called:

- Governance
- Governance Members
- Governance-body Members
- Org Unit
- Branch

The meeting may still belong to an existing board or committee. In the Meeting Creation interface, label this field:

Board / Committee

Continue using the existing governance-body registry behind this field. Do not remove the Governance Body module or modify existing records.

────────────────────────────────────────
1. INSPECT THE CURRENT IMPLEMENTATION
────────────────────────────────────────

Before changing anything, inspect:

src/app/pages/return-register/OnlineReturnRegisterPage.tsx
src/app/pages/boardMeetingFormFields.ts
src/app/components/forms/ParticipantSelectorStep.tsx
src/app/components/forms/AgendaDocumentStep.tsx
src/app/components/forms/QuorumAndAccessPanel.tsx
src/app/components/forms/MeetingReviewPanel.tsx
src/app/components/forms/EntryForm.tsx
src/app/components/pages/GeneratedTablePage.tsx
src/app/components/agenda/AgendaFormModal.tsx
src/app/components/documents/DocumentComposerModal.tsx
src/app/pages/boardMeetingDrawerSchemas.ts
src/app/actions/resolvers/meetingActions.ts
src/app/actions/resolvers/agendaActions.ts
src/app/data/boardMeetingData.ts
src/app/data/governanceMemberships.ts
src/app/data/bmsUsers.ts
src/app/utils/orgHierarchy.ts

Reuse the existing:

- Five-step wizard
- Full-page AppModal
- Meeting registry
- Canonical user registry
- Canonical governance membership registry
- Organization hierarchy
- Agenda registry
- Agenda Builder
- Agenda-document relationships
- Document Library
- Document Composer
- Meeting-agenda relationships
- Meeting-document relationships
- Meeting-participant relationships
- Quorum rules
- Detail drawer
- Centralized permissions
- Buttons
- Form fields
- Status badges
- Confirmation modal
- Responsive behavior
- Themes
- EN/BN system

Do not create another registry, wizard, Agenda Builder, Document Composer, participant database, permission engine, or quorum engine.

────────────────────────────────────────
2. FIX THE MEETING DRAFT LIFECYCLE FIRST
────────────────────────────────────────

The current Save Draft journey is unsafe because every save can generate another meeting ID.

Correct this before changing the participant interface.

Required behavior:

1. Generate one meeting ID when the meeting draft is first saved.
2. Keep that same meeting ID throughout the wizard.
3. Every later Save Draft must update the same meeting.
4. Schedule Meeting must update that Draft meeting to Scheduled.
5. Scheduling must not create a second meeting.
6. Repeated Save Draft clicks must not create duplicates.
7. Repeated Schedule Meeting clicks must be blocked.
8. Reopening Complete Draft must load the same meeting and all relationships.

Save Draft must persist the values currently visible in the open step.

Do not save only the previously completed `stepValues`.

Make the smallest backward-compatible update to `EntryForm` and `GeneratedTablePage` so the Save Draft footer action receives:

- Current form values
- Previous step values
- Current step number
- Existing draft meeting ID
- Current participant selection
- Current agenda selection
- Current document selection

Store the current wizard step on the Draft meeting using a safe field such as:

draft_current_step

When reopening a draft:

- Open the five-step wizard.
- Restore all values.
- Return to the last incomplete step.
- Restore selected participants.
- Restore selected agendas.
- Restore additional documents.
- Restore meeting mode.
- Restore quorum configuration.

Synchronize participant, agenda, and document relationships instead of appending new records after every save.

When a relationship was removed from the draft, remove only that relationship.

Do not delete the source user, agenda, or document.

────────────────────────────────────────
3. SIMPLIFY MEETING DETAILS
────────────────────────────────────────

Keep Step 1 as Meeting Details.

Show only:

Required:

- Meeting Title
- Meeting Type
- Board / Committee
- Meeting Date
- Start Time
- End Time
- Time Zone
- Chairperson
- Meeting Secretary
- Meeting Organizer
- Confidentiality

Optional:

- Meeting Purpose
- Short Description

Remove from the visible creation journey:

- Financial Year
- Priority
- Language
- Meeting Owner
- Scope
- Division Scope
- Region Scope
- RSVP Deadline
- Invitation Date
- Board Pack Publication Date
- Document Review Deadline
- Agenda Template
- Manual Meeting Reference
- Final Remarks
- Scheduling Action dropdown
- Publish Immediately

Generate IDs, references, creator, timestamps, language defaults, and initial status automatically.

Change the visible label:

Governance Body → Board / Committee

Store the selected board or committee using its stable ID.

Preserve its display name for backward compatibility.

Leadership selectors must use canonical user IDs.

Do not construct a rich text label and later recover the user by splitting the name.

Each selector option must have:

- `value = user.id`
- Visible name
- Designation
- Organizational unit

Store:

- chairperson_user_id
- secretary_user_id
- organizer_user_id

Keep readable names only as derived snapshots for existing displays.

Validate that End Time is later than Start Time.

────────────────────────────────────────
4. REBUILD ONLY THE PARTICIPANT SELECTION CONTENT
────────────────────────────────────────

Continue using:

src/app/components/forms/ParticipantSelectorStep.tsx

Do not create another participant selector component.

Replace the current source tabs:

- Governance
- Groups
- Org Unit
- Individual

with exactly:

- Quorum Members
- General Members
- Division
- Department
- Individual

Use compact tabs or segmented controls matching the existing project.

Do not add explanatory paragraphs above every source.

Use short labels, helper text, empty states, and counts.

────────────────────────────────────────
5. QUORUM MEMBERS
────────────────────────────────────────

Use the canonical membership registry from:

src/app/data/governanceMemberships.ts

Use records containing:

- user_id
- gov_body_id
- counts_for_quorum
- is_voting_member
- membership_role
- status

Do not use `member_name` to resolve users.

Quorum Members must include only:

- Active users
- Active memberships
- Memberships connected to the selected Board / Committee
- `counts_for_quorum = true`

Show:

- Member name
- Designation
- Organizational path
- Membership role
- Voting or Non-voting indicator

Show the number of available quorum members.

Support:

- Select All
- Add Selected
- Search
- Selected state
- Already-added state
- Inactive or unavailable disabled state

A participant added from this source must default to:

- Member Category: Quorum Member
- Quorum Eligible: Yes
- Voting Eligible: Use the real membership value
- Required: No, unless the person has an assigned required meeting role

Do not assume every voting member counts toward quorum.

Do not assume every Chairperson counts toward quorum.

Use the actual membership record.

────────────────────────────────────────
6. GENERAL MEMBERS
────────────────────────────────────────

General Members must include active members connected to the selected Board / Committee whose canonical membership has:

counts_for_quorum = false

Show the same compact user information.

Support:

- Select All
- Add Selected
- Search
- Selected state
- Disabled state

A participant added from this source must default to:

- Member Category: General Member
- Quorum Eligible: No
- Voting Eligible: Use the real membership value
- Required: No

Do not call them Governance Members.

Do not combine Quorum Members and General Members into one list.

────────────────────────────────────────
7. DIVISION-WISE PARTICIPANT ADD
────────────────────────────────────────

The Division tab must show only active organization units whose type is Division.

Do not show departments, branches, or every organizational unit in the same dropdown.

For each division, show:

- Division name
- Eligible active-user count
- Full, partial, or unselected state
- Expand control

Expanding a division must show its eligible users before adding them.

Support:

- Add All
- Add Selected
- Search inside the selected division
- Clear selection

Use the existing organization hierarchy and `resolveAllEligibleUsers`.

Users added through a division must default to:

- Member Category: General Member
- Quorum Eligible: No
- Voting Eligible: No
- Required: No
- Selection Source: Division

Do not automatically convert division users into quorum members.

────────────────────────────────────────
8. DEPARTMENT-WISE PARTICIPANT ADD
────────────────────────────────────────

The Department tab must show only active organization units whose type is Department.

Show:

- Department name
- Parent division
- Eligible active-user count
- Full, partial, or unselected state
- Expand control

Support:

- Add All
- Add Selected
- Search
- Clear selection

Users added through a department must default to:

- Member Category: General Member
- Quorum Eligible: No
- Voting Eligible: No
- Required: No
- Selection Source: Department

Do not show one generic Organizational Unit selector.

────────────────────────────────────────
9. INDIVIDUAL PARTICIPANT ADD
────────────────────────────────────────

The Individual tab must search active canonical users by:

- Name
- Email
- Designation
- Division
- Department

Do not display the entire user database before the user searches.

Show a maximum practical number of results and allow continued search.

Users added individually must default to:

- Member Category: General Member
- Quorum Eligible: No
- Voting Eligible: No
- Required: No
- Selection Source: Individual

A user who is a real quorum member may show a small informational badge:

Eligible Quorum Member

Do not automatically change their category without the user selecting them from Quorum Members or applying an authorized change.

────────────────────────────────────────
10. PARTICIPANT CATEGORY AND MEETING ROLE
────────────────────────────────────────

Keep these concepts separate:

1. Member Category
2. Meeting Role
3. Voting Eligibility
4. Required Attendance

Member Category:

- Quorum Member
- General Member

Meeting Role:

- Chairperson
- Meeting Secretary
- Organizer
- Member
- Presenter
- Invitee
- Observer

Do not use Board Member and Committee Member as separate meeting roles.

The selected participant card must show:

- Name
- Designation
- Organizational path
- Quorum Member or General Member badge
- Meeting role
- Required or Optional
- Voting status
- Selection-source chips

Keep advanced editing collapsed.

Do not make every card visually heavy.

Quorum eligibility should normally come from Member Category and canonical membership.

Only users with the existing Manage Quorum permission may override quorum eligibility.

Require a reason when overriding a canonical quorum rule.

Do not show the override control to ordinary meeting creators.

────────────────────────────────────────
11. LEADERSHIP PARTICIPANTS
────────────────────────────────────────

Chairperson, Meeting Secretary, and Organizer selected in Meeting Details must automatically appear once in the selected-participant list.

Use their canonical user IDs.

Do not resolve them by name.

They must be:

- Required
- Assigned their corresponding meeting role
- Protected from accidental removal

Their Member Category must be derived from their real membership:

- If `counts_for_quorum = true`, classify as Quorum Member.
- Otherwise classify as General Member.

Do not automatically make Chairperson quorum eligible simply because the role is Chairperson.

To remove a Chairperson, Secretary, or Organizer:

1. Require selecting a replacement in Meeting Details.
2. Update the participant relationship.
3. Preserve the user if they remain selected through another source or role.

Do not silently remove required leadership.

────────────────────────────────────────
12. DEDUPLICATION AND SOURCE TRACKING
────────────────────────────────────────

One user must appear only once in the selected-participant list.

The same user may be included through:

- Quorum Members
- General Members
- Division
- Department
- Individual
- Meeting Leadership

Preserve every active source.

Extend the existing `MeetingParticipantLink` safely with optional backward-compatible fields such as:

member_category: "quorum" | "general"
selection_sources: Array<{
  type: "quorum" | "general" | "division" | "department" | "individual" | "leadership";
  source_id: string;
  source_label: string;
}>

Keep the existing primary source fields for compatibility:

- selection_source_type
- selection_source_id

Do not create another participant-link registry.

Do not persist only the first source.

The selected card must show compact source chips such as:

- Quorum Members
- Finance Division
- Accounts Department
- Individually Added

Removing one source must:

- Remove only that source.
- Keep the participant when another source still applies.
- Remove the participant only when no source and no required role remain.

────────────────────────────────────────
13. REMOVE THE FALSE PARTICIPANT GROUP BEHAVIOR
────────────────────────────────────────

The current Participant Group record contains group details and a member count but does not contain a reliable list of member user IDs.

Do not populate a Participant Group by:

- Loading all active users
- Loading every member of a board or committee
- Guessing members from the group name

Do not create a new group-membership system inside Meeting Creation.

For this version, do not show a Participant Groups tab in Meeting Creation.

Preserve the Participant Groups module and its records unchanged for later completion.

────────────────────────────────────────
14. PARTICIPANT PERMISSIONS
────────────────────────────────────────

Remove:

canManageParticipants={true}

Use the existing centralized meeting actions and permissions.

Required permissions include:

- View Meeting Participants
- Manage Meeting Participants
- Change Participant Role
- Manage Quorum Eligibility
- Manage Voting Eligibility
- Schedule Meeting

Enforce permissions in event handlers as well as visible controls.

A user without Manage Meeting Participants permission may view participants but cannot:

- Add
- Remove
- Change category
- Change role
- Change eligibility

Do not grant permission by matching names or designation text.

────────────────────────────────────────
15. PARTICIPANT SUMMARY AND QUORUM FEEDBACK
────────────────────────────────────────

Show a compact summary:

- Total Participants
- Quorum Members
- General Members
- Required
- Voting Eligible
- Presenters

Do not show a category called Governance Members.

Recalculate projected quorum immediately when participants change.

Show a small status:

- Expected to Meet
- At Risk
- Not Expected to Meet
- Not Configured

Show the exact reason when at risk, for example:

- 4 quorum members selected; 5 required
- Chairperson is required for quorum
- One required quorum role is missing

Do not use RSVP responses for the initial projected-quorum calculation.

────────────────────────────────────────
16. EXISTING AGENDA SELECTION
────────────────────────────────────────

Continue using:

src/app/components/forms/AgendaDocumentStep.tsx

Preserve:

- Search
- Purpose filter
- Multiple agenda selection
- Parent-child preview
- Reordering
- Duration comparison
- Automatic agenda documents
- Document Library selection
- Upload New Document
- Document version information

Show previously created parent agendas that are:

- Active
- Not archived
- Approved
- Meeting Ready
- Not already connected to the meeting

Use live agenda status from the canonical Agenda registry.

Do not create meeting-only copies of agendas.

Selected agenda cards must show:

- Parent agenda title
- Child count
- Total duration
- Approval status
- Meeting readiness
- Document count

────────────────────────────────────────
17. CREATE NEW AGENDA DURING MEETING CREATION
────────────────────────────────────────

Add one secondary action beside the agenda selector:

Create New Agenda

Show this action only when the user has:

- Permission to edit the meeting
- Permission to create an agenda

Clicking it must open the existing:

src/app/components/agenda/AgendaFormModal.tsx

Do not add inline agenda fields inside Meeting Creation.

Do not create a new agenda modal.

Required journey:

Meeting Creation
→ Agendas and Documents
→ Create New Agenda
→ Existing full-screen Agenda Builder
→ Save Draft or Save Agenda
→ Return to the same Meeting Creation draft
→ Show the new agenda in the selected list

While Agenda Builder is open:

- Keep the Meeting Creation state intact.
- Only Agenda Builder is interactive.
- Preserve focus and stacking correctly.
- Do not close the meeting wizard.
- Do not lose unsaved participants or documents.

Safely extend `AgendaFormModal` with optional props such as:

sourceModule?: "agenda" | "meeting"
onSaved?: (result: {
  agendaId: string;
  status: string;
}) => void

Keep these props optional so existing Agenda Management behavior remains unchanged.

Do not modify the existing Agenda Builder layout or fields.

Fix the duplicate Save Agenda button currently rendered in its footer.

There must be only one Save Agenda action.

────────────────────────────────────────
18. NEW AGENDA STATUS BEHAVIOR
────────────────────────────────────────

A newly created agenda must remain a canonical Agenda Management record.

It must appear in the normal Agenda List.

Do not automatically approve it.

After returning to Meeting Creation:

Draft agenda:

- Show in the selected agenda list.
- Badge: Draft
- Allow Save Meeting Draft.
- Block Schedule Meeting.

Pending Approval agenda:

- Show in the selected agenda list.
- Badge: Pending Approval
- Allow Save Meeting Draft.
- Block Schedule Meeting.

Approved but not Meeting Ready:

- Show its status.
- Allow Save Meeting Draft.
- Block Schedule Meeting.

Approved and Meeting Ready:

- Allow scheduling.

Show a clear inline message:

Agenda created successfully. Approval is required before this meeting can be scheduled.

Do not force users to leave the meeting wizard merely because the new agenda needs approval.

When its status changes in Agenda Management, update the status shown in the meeting draft from the live registry.

Prevent duplicate meeting-agenda links.

────────────────────────────────────────
19. AGENDA DOCUMENTS
────────────────────────────────────────

Continue inheriting documents linked to:

- Selected parent agendas
- Their direct child agendas

Do not copy document files.

Use the existing agenda-document relationship registry.

Pin the version used by the meeting when scheduling.

Additional documents must continue using:

- Choose from Document Library
- Upload New Document through DocumentComposerModal

Do not recreate the basic metadata-only Add Document form.

When uploading from Meeting Creation:

- Preserve the meeting draft.
- Create a real Document Library record.
- Store the actual file.
- Create version 1.0.
- Return to the same wizard step.
- Add the document once.

────────────────────────────────────────
20. SIMPLIFY MEETING MODE AND QUORUM
────────────────────────────────────────

Preserve:

- Physical
- Virtual
- Hybrid

Show only fields relevant to the selected mode.

Physical:

- Venue
- Room or location
- Optional access instructions

Virtual:

- Virtual platform
- Meeting link
- Optional dial-in information

Hybrid:

- Physical and virtual fields

Remove these normal visible fields:

- Minimum Quorum Members
- Quorum Percentage
- Required Roles Present
- Invitation Date
- Board Pack Publication Date
- Document Review Deadline

Read the default quorum rule from the existing Quorum Rule registry for the selected Board / Committee.

Show a compact read-only summary:

- Rule
- Required number or percentage
- Selected quorum members
- Required roles
- Projected status

Only authorized users may open a collapsed:

Meeting-specific Quorum Override

An override must not replace or modify the organization’s original quorum rule.

Do not create another quorum calculation helper.

Use one shared calculation for:

- Participant step summary
- Mode and Quorum step
- Review step
- Meeting Details drawer

────────────────────────────────────────
21. REVIEW AND SCHEDULE
────────────────────────────────────────

Remove the visible Scheduling Action dropdown.

Do not require the user to select Schedule Meeting twice.

The final footer must contain:

Left:

- Back

Right:

- Save Draft
- Schedule Meeting

The Review page must show concise sections:

Meeting:

- Title
- Type
- Board / Committee
- Date and time
- Mode

Leadership:

- Chairperson
- Secretary
- Organizer

Participants:

- Total
- Quorum Members
- General Members
- Required
- Voting Eligible

Agendas:

- Selected parent agendas
- New Draft or Pending agendas
- Child count
- Total agenda duration
- Meeting readiness

Documents:

- Agenda documents
- Additional documents
- Version count
- Access issues

Quorum:

- Rule
- Selected quorum members
- Required count
- Projected result

Readiness:

- Ready to Schedule
- Not Ready to Schedule

Each blocker must include an Edit action that returns to the correct step.

Scheduling blockers must include:

- Missing required meeting details
- Missing Chairperson
- Missing Secretary
- Missing Organizer
- No participants
- No quorum members
- Quorum not projected to be met
- No selected agenda
- Draft agenda
- Pending Approval agenda
- Agenda not Meeting Ready
- Missing physical venue
- Missing virtual link
- Duplicate participant link
- Duplicate agenda link
- Duplicate document link
- Critical unresolved document-access issue

Do not require accepted RSVP responses before scheduling.

────────────────────────────────────────
22. MEETING DETAILS DRAWER
────────────────────────────────────────

Continue using the existing shared DynamicDetailsDrawer.

Do not create another drawer.

Update Meeting Details to show structured sections:

Overview

- Meeting title and reference
- Board / Committee
- Type
- Date and time
- Mode
- Confidentiality
- Status

Leadership

- Chairperson
- Secretary
- Organizer

Participants

Show separate lists:

- Quorum Members
- General Members

Each participant item should show:

- Name
- Meeting role
- Required or Optional
- Voting status
- RSVP status when available

Agendas

- Ordered parent agendas
- Child count
- Duration
- Approval status
- Meeting readiness
- Open Agenda Details

Documents

- Agenda documents
- Additional documents
- Pinned version
- Preview

Quorum

- Rule
- Required count
- Selected quorum members
- Projected result
- Actual result later when available

History and Audit

- Created
- Draft saved
- Scheduled
- Rescheduled
- Cancelled
- Status changes
- Actor
- Date
- Reason

Do not display participants, agendas, or documents as long comma-separated text.

Preserve existing:

- Complete Draft
- Edit
- Reschedule
- Cancel
- Archive
- Start Meeting
- Join Meeting
- Resume Meeting
- View Meeting Record

────────────────────────────────────────
23. MOBILE PARTICIPANT EXPERIENCE
────────────────────────────────────────

On mobile:

- Keep source tabs horizontally scrollable.
- Show one source at a time.
- Open Division and Department member browsing in the existing mobile bottom-sheet or full-height overlay pattern.
- Keep Add Selected sticky at the bottom of the selector.
- Show Selected Participants below the source browser.
- Use compact participant cards.
- Keep category, role, and source information readable.
- Avoid horizontal overflow.
- Keep tap targets accessible.
- Preserve keyboard visibility.
- Keep the wizard footer accessible.

Do not change desktop styling while fixing mobile.

────────────────────────────────────────
24. REQUIRED CLEANUP
────────────────────────────────────────

Remove or correct only these obsolete implementation paths:

- Governance participant tab
- Generic Org Unit participant tab
- Name-based leadership resolution
- Name-based membership resolution
- Automatic Chairperson quorum eligibility
- Voting eligibility automatically copied into quorum eligibility
- False Participant Group population
- Hardcoded `canManageParticipants={true}`
- Draft creation that generates a new meeting every time
- Schedule action that creates a second meeting
- Save Draft that loses current-step values
- Persistence of only one participant source
- Scheduling Action dropdown
- Unnecessary RSVP and key-date creation fields
- Duplicate Save Agenda button

Do not remove historical records or fields required for compatibility.

────────────────────────────────────────
25. REGRESSION TEST
────────────────────────────────────────

Test this complete journey:

1. Open All Meetings.
2. Select Add Meeting.
3. Confirm the five-step full-screen wizard.
4. Enter Meeting Details.
5. Select Board / Committee.
6. Select canonical Chairperson, Secretary, and Organizer.
7. Open Participants.
8. Confirm there is no Governance tab.
9. Confirm Quorum Members and General Members are separate.
10. Add all quorum members.
11. Add selected general members.
12. Add a complete division.
13. Add selected users from a department.
14. Add one individual.
15. Confirm duplicate users appear once.
16. Confirm every source is preserved.
17. Remove one source from a multi-source participant.
18. Confirm the participant remains.
19. Confirm Chairperson cannot be removed without replacement.
20. Confirm quorum projection updates immediately.
21. Save Draft from the Participants step.
22. Reopen the Draft.
23. Confirm all current-step data remains.
24. Confirm no duplicate meeting was created.
25. Select an existing approved Meeting Ready agenda.
26. Select Create New Agenda.
27. Complete the existing Agenda Builder.
28. Return to the same meeting draft.
29. Confirm the new agenda appears.
30. Confirm Draft or Pending agenda blocks scheduling.
31. Approve the agenda through the existing Agenda workflow.
32. Reopen the meeting draft.
33. Confirm the agenda is now eligible.
34. Confirm agenda documents appear automatically.
35. Add an existing document.
36. Upload a new document.
37. Configure Physical mode.
38. Configure Virtual mode.
39. Configure Hybrid mode.
40. Review quorum.
41. Review scheduling blockers.
42. Save Draft again.
43. Confirm the same meeting record updates.
44. Schedule Meeting.
45. Confirm the Draft changes to Scheduled.
46. Confirm no second meeting record appears.
47. Open Meeting Details.
48. Confirm Quorum Members and General Members are shown separately.
49. Confirm agendas, documents, versions, and quorum are correct.
50. Test mobile.
51. Test EN and BN.
52. Test light and dark themes.

Negative tests:

- Duplicate user names
- Inactive user
- Inactive membership
- No Board / Committee selected
- No quorum members configured
- Chairperson who is not quorum eligible
- User selected through multiple sources
- Remove one of multiple sources
- Division with no active users
- Department with no active users
- Draft agenda
- Pending Approval agenda
- Agenda not Meeting Ready
- Duplicate agenda
- Duplicate document
- Save Draft multiple times
- Schedule button double-click
- Close with unsaved changes
- Unauthorized participant management
- Unauthorized quorum override
- Unauthorized agenda creation

────────────────────────────────────────
26. AUTOMATED VALIDATION
────────────────────────────────────────

Add focused tests for:

- Five-step Meeting Creation
- Current-step Draft saving
- Reuse of the same Draft meeting ID
- Draft-to-Scheduled transition
- No duplicate meeting creation
- Canonical leadership user IDs
- Quorum Member filtering
- General Member filtering
- Division selection
- Department selection
- Individual selection
- Multi-source deduplication
- Source-specific removal
- Required leadership protection
- Quorum recalculation
- Existing agenda selection
- Create New Agenda callback
- Draft agenda scheduling blocker
- Agenda readiness update
- Agenda-document inheritance
- Additional document linking
- Document version pinning
- Permission enforcement
- Mobile participant behavior

Run:

npm run typecheck
npm run test
npm run build

Do not delete or weaken existing tests.

────────────────────────────────────────
COMPLETION CRITERIA
────────────────────────────────────────

This task is complete only when:

- The five-step wizard remains intact.
- No Governance Members participant source appears.
- Quorum Members and General Members are separate.
- Division, Department, and Individual selection work.
- Participant relationships use stable user IDs.
- Multiple selection sources persist.
- Meeting role, member category, voting eligibility, and required attendance remain separate.
- Save Draft preserves the current step.
- One meeting draft keeps one meeting ID.
- Scheduling updates the same Draft.
- Existing approved agendas can be selected.
- Create New Agenda opens the existing Agenda Builder.
- New agendas remain canonical Agenda Management records.
- Draft or Pending agendas block scheduling without blocking Draft saving.
- Agenda documents and Document Library integration remain intact.
- Quorum uses the existing rule and selected Quorum Members.
- The final review shows exact blockers.
- Meeting Details displays complete structured data.
- No working Agenda, Document, Meeting List, Live Meeting, Calendar, Start, Join, theme, mobile, or permission behavior is broken.

GOLDEN RULES

- Do not break solved issues.
- Do not rebuild Board Meeting Creation.
- Do not create another participant selector, Agenda Builder, Document Composer, drawer, registry, permission engine, or quorum engine.
- Do not use names as relationship IDs.
- Do not show Governance Members as a participant category.
- Do not treat voting eligibility and quorum eligibility as the same value.
- Do not create duplicate meetings, participants, agendas, documents, versions, or links.
- Do not create fake Participant Group membership.
- Do not automatically approve agendas created from Meeting Creation.
- Do not remove Start Meeting, Join Meeting, Live Meeting, Meeting Calendar, or Meeting Record behavior.
- Do not add unnecessary fields, cards, tabs, actions, or explanatory text.
- Reuse existing components, registries, relationships, permissions, themes, and responsive patterns.
- Preserve desktop, tablet, mobile, accessibility, EN/BN, themes, IDs, persistence, versions, and audit history.