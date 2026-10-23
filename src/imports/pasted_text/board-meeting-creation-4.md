# Board Meeting Creation Stabilization — Draft Lifecycle, Participants, Quorum, Agenda Eligibility, Permissions, Drawer, and Tests

Work only on the existing **Board Meeting Creation** journey in the current Board Meeting Solution.

The current five-step full-screen wizard already exists:

1. Meeting Details
2. Participants
3. Agendas and Documents
4. Meeting Mode and Quorum
5. Review and Schedule

Do not rebuild this wizard.

Do not redesign the current interface.

Do not change Agenda Builder, Agenda Management, Document Library, Live Meeting, Meeting Calendar, Meeting Records, navigation, themes, tables, or unrelated modules.

The goal is to fix the remaining data, permission, persistence, quorum, eligibility, drawer, and regression issues without breaking the working UI.

---

## 1. Inspect the existing implementation first

Inspect and reuse the current implementation around:

```text
src/app/pages/return-register/OnlineReturnRegisterPage.tsx
src/app/pages/boardMeetingFormFields.ts
src/app/components/forms/EntryForm.tsx
src/app/components/forms/ParticipantSelectorStep.tsx
src/app/components/forms/AgendaDocumentStep.tsx
src/app/components/forms/QuorumAndAccessPanel.tsx
src/app/components/forms/MeetingReviewPanel.tsx
src/app/components/pages/GeneratedTablePage.tsx
src/app/pages/boardMeetingDrawerSchemas.ts
src/app/actions/resolvers/meetingActions.ts
src/app/actions/resolvers/agendaActions.ts
src/app/data/boardMeetingData.ts
src/app/data/governanceMemberships.ts
src/app/data/bmsUsers.ts
src/app/utils/orgHierarchy.ts
src/app/components/agenda/AgendaFormModal.tsx
src/app/components/documents/DocumentComposerModal.tsx
```

Also inspect the existing registries and repositories for:

* Meetings
* Meeting participants
* Meeting agendas
* Meeting documents
* Agenda-document links
* Documents and versions
* Governance memberships
* Quorum rules
* Audit history
* Roles and permissions

Do not create duplicate registries, repositories, relationship stores, permission engines, or quorum engines.

---

# 2. Fix the meeting Draft lifecycle

The complete meeting wizard must use one meeting record from the first Draft save until scheduling.

## Required lifecycle

```text
New Meeting
→ First Save Draft creates one Draft meeting ID
→ Later Save Draft updates the same meeting
→ Complete Draft opens the same meeting
→ Schedule Meeting updates the same Draft to Scheduled
```

Do not create a second meeting when scheduling.

Do not generate a new meeting ID after the first successful Draft save.

## Required implementation

Maintain one wizard-level value:

```text
draftMeetingId
```

Behavior:

* New wizard starts with no Draft ID.
* First successful Save Draft creates the meeting and returns its ID.
* Store that ID in the wizard state.
* Every later save sends the same ID.
* Edit Meeting and Complete Draft load the existing meeting ID.
* Schedule Meeting must update that record instead of calling the new-meeting creation path.

Remove any dependency on a removed form field such as:

```text
publish_action
```

The footer action must pass an explicit intent:

```text
save_draft
schedule_meeting
```

Do not infer the action from hidden or removed form inputs.

## Duplicate protection

While Save Draft or Schedule Meeting is running:

* Disable both actions.
* Show the existing loading state.
* Prevent repeated submissions.
* Ignore double clicks.
* Do not append duplicate relationship records.

---

# 3. Persist the current step and restore the full wizard

Store the current wizard step on the Draft meeting using a backward-compatible field such as:

```text
draft_current_step
```

Use the existing naming convention where one already exists.

Save Draft must include values from:

* The currently open step
* Previously completed steps
* Current leadership selections
* Current participant selections
* Current agenda selections
* Current agenda ordering
* Current document selections
* Current meeting mode
* Current quorum configuration

Do not save only previously completed `stepValues`.

## Reopening a Draft

When the user selects Complete Draft or Edit Draft:

1. Load the existing meeting.
2. Load its participant relationships.
3. Load its agenda relationships.
4. Load its document relationships.
5. Restore the meeting mode and quorum configuration.
6. Restore the last incomplete wizard step.
7. Open the five-step wizard.
8. Preserve the same meeting ID.

Reconstruct the wizard state from canonical registries and relationships.

Do not create duplicate JSON copies of complete relationship data when the relationship registries already contain the source of truth.

Small compatibility snapshots may be kept only when the current project already requires them.

---

# 4. Synchronize relationships instead of appending

Every Draft save must synchronize the meeting’s relationships.

For each relationship type:

* Add newly selected relationships.
* Update changed relationships.
* Preserve unchanged relationships.
* Remove relationships no longer selected.
* Never delete the source user, agenda, document, or version.

Use stable relationship keys.

Recommended uniqueness:

```text
Meeting participant: meeting_id + user_id
Meeting agenda: meeting_id + agenda_id
Meeting document: meeting_id + document_id + version_id
```

Do not use names as relationship keys.

Do not append a new relationship on every Draft save.

---

# 5. Persist additional meeting documents in Drafts

The existing Additional Documents selection must persist before scheduling.

## Required behavior

Save Draft must persist:

* Documents inherited from selected agendas
* Additional documents selected from Document Library
* Documents uploaded through Document Composer
* Selected document version
* Source type
* Display order where supported

Use the existing meeting-document relationship registry.

If the existing relationship does not contain enough information, extend it minimally and backward-compatibly with:

```text
meeting_id
document_id
version_id
source_type: "agenda" | "additional"
source_agenda_id
display_order
added_by
added_at
```

Do not create another document registry.

Do not copy document files.

## Upload New Document

When the user selects Upload New Document and the meeting has no Draft ID:

1. Validate at least the Meeting Title.
2. Create the first Draft meeting.
3. Store the returned meeting ID.
4. Open the existing Document Composer with that meeting context.

After upload:

* Create one normal Document Library record.
* Store the real file.
* Create version 1.0.
* Create one meeting-document relationship.
* Return to the same wizard step.
* Show the document immediately.
* Preserve all other wizard data.

If storage fails, do not create document metadata or a meeting-document relationship.

---

# 6. Persist multiple participant selection sources

One participant may be included through multiple sources:

* Quorum Members
* General Members
* Division
* Department
* Individual
* Leadership

One user must still appear only once in the selected-participant list.

Extend the existing meeting-participant relationship safely with optional fields such as:

```ts
member_category: "quorum" | "general";

selection_sources: Array<{
  type:
    | "quorum"
    | "general"
    | "division"
    | "department"
    | "individual"
    | "leadership";
  source_id: string;
  source_label: string;
}>;
```

Preserve the existing primary source fields for backward compatibility.

Do not persist only `selection_sources[0]`.

## Source removal behavior

Removing one source must:

* Remove only that source.
* Keep the participant when another source remains.
* Keep the participant when a required leadership role remains.
* Remove the participant only when no source and no required role remain.

Do not create duplicate participant records for multiple sources.

---

# 7. Store real Division and Department IDs

The current implementation must not store generic values such as:

```text
source_id: "division"
source_label: "Division"
```

or:

```text
source_id: "department"
source_label: "Department"
```

For Division selection, store:

* Real Division ID
* Real Division name

For Department selection, store:

* Real Department ID
* Real Department name
* Parent Division ID where already supported

Use the current organization hierarchy.

Do not create a second organization structure.

## Selection behavior

When users are added through a Division or Department:

* Keep the actual source record.
* Preserve full, partial, and unselected states.
* Preserve member selection after Draft save and reopen.
* Allow source-specific removal.
* Prevent inactive users from being added.
* Prevent duplicate users.

---

# 8. Protect Chairperson, Secretary, and Organizer

Chairperson, Meeting Secretary, and Organizer selected in Meeting Details must automatically appear once in the participant list.

Use stable canonical user IDs.

They must be:

* Required
* Assigned the correct meeting role
* Protected from accidental removal

Do not show a normal Remove action for required leadership.

To replace a leadership participant:

1. Return to Meeting Details.
2. Select a replacement.
3. Update the meeting leadership field.
4. Update the participant relationship.
5. Remove the previous leadership source.
6. Keep the previous person when another participant source still applies.

Do not silently remove a Chairperson, Secretary, or Organizer.

Do not create two participant records when a leadership user is also selected through another source.

---

# 9. Use canonical quorum and voting rules

Quorum eligibility and voting eligibility are separate concepts.

Do not derive quorum eligibility from:

* Chairperson role
* Voting eligibility
* Required attendance
* Participant category alone
* User designation text

For users who are members of the selected Board or Committee, use the canonical governance membership record:

```text
user_id
gov_body_id
counts_for_quorum
is_voting_member
membership_role
status
```

Required behavior:

* `counts_for_quorum` controls default quorum eligibility.
* `is_voting_member` controls default voting eligibility.
* A Chairperson is not automatically quorum eligible.
* A voting member is not automatically quorum eligible.
* A quorum member is not automatically voting eligible.
* Division, Department, and Individual additions default to General Member, non-quorum, and non-voting unless a canonical membership proves otherwise.

## Overrides

Only users with the existing Manage Quorum permission may override quorum eligibility.

Only users with the existing Manage Voting Eligibility permission may override voting eligibility.

Require an override reason.

Persist:

* Previous value
* New value
* Actor
* Reason
* Date

Do not modify the organization’s original governance membership rule.

---

# 10. Create one shared quorum calculation

There must be one shared quorum calculation used by:

* Participant step
* Meeting Mode and Quorum step
* Review step
* Meeting List enrichment
* Meeting Details drawer
* Pre-meeting readiness later

Inspect the current calculations and extract the correct behavior into one existing utility location.

Create only one minimal pure helper when no shared helper already exists.

Suggested contract:

```ts
calculateMeetingQuorum({
  meetingId,
  boardCommitteeId,
  participantLinks,
  governanceMemberships,
  quorumRule,
  meetingMode,
  overrides,
})
```

Return a structured result such as:

```ts
{
  status:
    | "expected"
    | "at_risk"
    | "not_expected"
    | "not_configured";
  eligibleCount: number;
  requiredCount: number;
  selectedEligibleCount: number;
  requiredRoles: string[];
  missingRoles: string[];
  reasons: string[];
}
```

## Rules

Use:

* Active governance membership
* Selected quorum-eligible participants
* Existing quorum rule
* Required quorum roles
* Whether virtual attendance counts
* Whether alternates count
* Whether recused members are excluded

Do not use RSVP responses for initial Meeting Creation forecasting.

Do not use General Members, Presenters, Invitees, or Observers in the denominator unless the configured quorum rule explicitly includes them.

Remove obsolete separate calculations from individual components.

All screens must display the same result.

Persist the actual calculated forecast instead of:

```text
Pending
```

---

# 11. Connect centralized permissions

Remove hardcoded permission shortcuts such as:

```tsx
canManage={true}
canManageParticipants={true}
```

Do not grant permissions using user names, designation strings, or local role text.

Use the existing centralized action and permission system.

Reuse:

```text
useResolvedActions
resolveMeetingActions
resolveAgendaActions
existing role registry
existing permission registry
```

Required meeting capabilities:

* View Meeting
* Create Meeting
* Edit Meeting
* Manage Meeting Participants
* Change Participant Role
* Manage Quorum Eligibility
* Manage Voting Eligibility
* Select Meeting Agendas
* Create Agenda
* Manage Meeting Documents
* Schedule Meeting
* Reschedule Meeting
* Cancel Meeting
* Archive Meeting
* Start Meeting
* Join Meeting

## Enforce permissions in two places

1. Hide or disable unavailable controls.
2. Block unauthorized event handlers.

Do not rely only on hidden buttons.

## Agenda creation permission

Show Create New Agenda only when the user has both:

* Permission to edit the meeting
* Permission to create an agenda

## Schedule permission

Schedule Meeting must be blocked unless the user has the centralized scheduling permission.

---

# 12. Correct existing-agenda eligibility

The normal agenda selector must show only canonical Level 1 parent agendas that are:

* Active
* Not archived
* Approved
* Meeting Ready
* Not already linked to the meeting

Do not show every non-archived parent agenda as normally eligible.

## Shared readiness logic

Use the Agenda Management readiness rules.

Do not create another agenda-readiness calculation.

If the current logic exists in the Agenda page, extract or reuse one shared helper.

Meeting Ready must consider:

* Parent approval
* Active direct-child approval
* Required child details
* Required documents where applicable
* Archived-child exclusion
* Existing readiness rules already implemented in Agenda Management

## Provisionally linked agendas

An agenda created through Create New Agenda may be linked to the meeting Draft even when it is:

* Draft
* Pending Approval
* Approved but not Meeting Ready

Show it in the selected-agenda list with its real status.

Allow Save Draft.

Block Schedule Meeting until it becomes Approved and Meeting Ready.

When the agenda status changes in Agenda Management, refresh its status from the canonical registry when reopening or reviewing the meeting.

Do not duplicate the agenda.

Do not create meeting-only agenda copies.

## Duplicate prevention

Before adding an agenda:

* Check existing selected agenda IDs.
* Check existing meeting-agenda relationships.
* Do not add the same agenda twice.

Preserve selected agenda order through `display_order`.

---

# 13. Fix final scheduling validation

Schedule Meeting must update the existing Draft only when all blockers pass.

Required blockers include:

* Missing Meeting Title
* Missing Meeting Type
* Missing Board or Committee
* Missing Meeting Date
* Missing Start Time
* Missing End Time
* End Time not later than Start Time
* Missing Chairperson
* Missing Meeting Secretary
* Missing Organizer
* Inactive leadership user
* No participants
* No quorum members
* Quorum not configured
* Quorum not projected to be met
* No selected parent agenda
* Draft agenda
* Pending Approval agenda
* Agenda not Meeting Ready
* Missing physical venue
* Missing virtual meeting link
* Duplicate participant relationship
* Duplicate agenda relationship
* Duplicate document relationship
* Unresolved critical document-access issue
* Unauthorized scheduling action

Do not require accepted RSVP responses before initial scheduling.

The final footer must remain:

Left:

* Back

Right:

* Save Draft
* Schedule Meeting

Do not add another Scheduling Action dropdown.

---

# 14. Build a structured Meeting Details drawer

Continue using the existing:

```text
DynamicDetailsDrawer
ResponsiveOverlay
```

Do not create another drawer shell.

Do not change drawers used by other modules.

Use optional backward-compatible sections or derived data.

## Header

Show:

* Meeting title
* Meeting reference
* Status
* Date and time
* Meeting mode

## Overview

Show only:

* Board / Committee
* Meeting Type
* Purpose
* Confidentiality
* Venue or virtual access summary
* Created by
* Created date
* Last updated

Hide empty values.

Do not show raw IDs when names are available.

## Leadership

Show structured items for:

* Chairperson
* Meeting Secretary
* Organizer

Each item should show:

* Name
* Designation
* Organizational unit

## Participants

Show separate sections:

### Quorum Members

Each participant shows:

* Name
* Meeting role
* Required or Optional
* Voting eligibility
* Selection sources
* RSVP status when available

### General Members

Show the same compact participant information.

Do not display participants as a long comma-separated string.

## Agendas

Show selected parent agendas in meeting order.

Each agenda item shows:

* Order
* Parent agenda title
* Child count
* Total duration
* Approval status
* Meeting readiness
* Document count

Actions:

* Open Agenda Details
* Preview agenda documents where permitted

Do not flatten child agendas into unrelated top-level items.

## Documents

Separate:

* Agenda Documents
* Additional Documents

Each item shows:

* Document name
* Version pinned to the meeting
* Confidentiality
* Source agenda where applicable
* Status

Actions:

* Preview
* Open
* Download when permitted

Use the existing document viewer.

Do not create another viewer.

## Quorum

Show:

* Rule
* Eligible participants
* Required count or percentage
* Selected quorum members
* Required roles
* Projected status
* Reasons or missing roles

Use the same shared quorum result.

## History and Audit

Show real events:

* Created
* Draft saved
* Scheduled
* Rescheduled
* Cancelled
* Archived
* Status changes
* Actor
* Date
* Reason

Do not create hardcoded history.

## Drawer actions

Preserve valid centralized actions:

* Complete Draft
* Edit Meeting
* Reschedule
* Cancel
* Archive
* Start Meeting
* Join Meeting
* Resume Meeting
* View Meeting Record

Do not remove Start or Join Meeting.

Show actions only when valid for the current status and permission.

Remove obsolete visual fields such as:

* RSVP Deadline
* Invitation Date
* Board Pack Publication Date

only from the drawer display.

Do not destructively remove historical stored values.

---

# 15. Preserve source context

When the user opens Agenda Builder, Document Composer, Document Viewer, or Agenda Details from Meeting Creation:

* Preserve the meeting Draft ID.
* Preserve the current wizard step.
* Preserve participant selections.
* Preserve agenda selections and order.
* Preserve document selections.
* Preserve meeting mode and quorum state.

Closing the secondary experience must return to the same Meeting Creation step.

Do not restart the wizard.

Do not return to an empty Meeting List.

Do not create another meeting.

---

# 16. Required regression tests

Add focused tests without removing or weakening existing tests.

## Draft lifecycle

Test:

* First Save Draft creates one meeting.
* Second Save Draft updates the same meeting.
* Save Draft from every wizard step.
* Current-step values persist.
* `draft_current_step` persists.
* Complete Draft restores the correct step.
* Schedule Meeting updates the Draft.
* Schedule Meeting does not create a second meeting.
* Double Save and double Schedule are blocked.

## Relationship restoration

Test:

* Participant links restore.
* Participant categories restore.
* Multiple participant sources restore.
* Agenda links restore.
* Agenda order restores.
* Additional documents restore.
* Document versions restore.
* Removed relationships stay removed.
* No duplicate links are created.

## Participant sources

Test:

* Quorum Member selection.
* General Member selection.
* Division selection.
* Department selection.
* Individual selection.
* Real Division ID persistence.
* Real Department ID persistence.
* One user selected through multiple sources.
* Removing one source preserves the user.
* Removing the final source removes the user.
* Leadership source preserves the user.
* Inactive users cannot be added.

## Leadership

Test:

* Chairperson is automatically included.
* Secretary is automatically included.
* Organizer is automatically included.
* Leadership users appear once.
* Leadership cannot be removed directly.
* Replacing leadership updates the correct relationship.
* Previous leadership remains when another source applies.

## Quorum and voting

Test:

* Canonical quorum eligibility.
* Canonical voting eligibility.
* Chairperson does not automatically count.
* Voting and quorum remain separate.
* General participants do not affect the denominator.
* Required roles are detected.
* Permission-controlled override.
* Override reason and audit event.
* Every screen receives the same quorum result.

## Agenda eligibility

Test:

* Approved and Meeting Ready parent appears.
* Draft parent does not appear in the normal eligible list.
* Pending parent does not appear in the normal eligible list.
* Approved but not ready parent does not appear.
* Archived parent does not appear.
* Provisionally linked new Draft agenda remains visible in the meeting Draft.
* Draft agenda blocks scheduling.
* Agenda status refreshes from the canonical registry.
* Duplicate agenda selection is blocked.
* Agenda order persists.

## Documents

Test:

* Additional document persists in Draft.
* Uploaded document persists in Draft.
* Meeting context is passed to Document Composer.
* Version ID is preserved.
* Duplicate document link is blocked.
* Removing a link does not delete the document.

## Permissions

Test unauthorized users attempting to:

* Manage participants
* Change roles
* Change quorum eligibility
* Change voting eligibility
* Select agendas
* Create an agenda
* Add documents
* Schedule a meeting
* Reschedule
* Cancel
* Start or Join

Handlers must block unauthorized actions.

## Drawer

Test:

* Structured leadership section.
* Separate Quorum and General participant sections.
* Ordered agenda list.
* Child counts.
* Agenda readiness.
* Agenda and additional document sections.
* Pinned versions.
* Quorum summary.
* Audit history.
* Correct contextual actions.

## Responsive and accessibility

Test:

* Desktop
* Tablet
* Mobile
* Keyboard step navigation
* Keyboard drawer navigation
* Focus restoration
* Loading states
* Empty states
* Error states
* Disabled states
* EN/BN parity
* Light and dark themes

Run:

```text
npm run typecheck
npm run test
npm run build
```

Do not silence errors with:

* `any`
* `@ts-ignore`
* Disabled strict mode
* Removed tests
* Commented-out features

---

# Completion criteria

This task is complete only when:

* One Draft meeting keeps one stable ID.
* Every Save Draft updates the same meeting.
* Schedule Meeting updates that Draft to Scheduled.
* Current step and all relationships restore correctly.
* Additional documents persist in Drafts.
* Participant multiple-source data persists.
* Real Division and Department IDs persist.
* Required leadership cannot be removed accidentally.
* Quorum and voting use canonical governance membership rules.
* Centralized permissions control all Meeting Creation actions.
* One shared quorum calculation is used everywhere.
* Only approved and Meeting Ready parent agendas appear as normally eligible.
* Provisionally linked Draft or Pending agendas remain visible but block scheduling.
* Meeting Details uses structured sections instead of generic text lists.
* Focused regression tests exist.
* Existing Agenda Builder, Agenda Management, Document Library, Meeting List, Calendar, Start Meeting, Join Meeting, Live Meeting, themes, mobile behavior, and permissions remain unchanged.

# Golden Rules

* Do not break solved issues.
* Do not rebuild Board Meeting Creation.
* Do not create another wizard, participant selector, agenda selector, document composer, drawer, permission engine, quorum engine, registry, or relationship store.
* Do not create a new meeting on every save.
* Do not create a second meeting when scheduling.
* Do not use names as relationship identifiers.
* Do not lose participant source information.
* Do not use generic Division or Department source IDs.
* Do not treat voting and quorum eligibility as the same value.
* Do not automatically count the Chairperson toward quorum.
* Do not allow required leadership to be removed without replacement.
* Do not show ineligible agendas as normally selectable.
* Do not duplicate meetings, participants, agendas, documents, versions, or links.
* Do not remove Start Meeting, Join Meeting, Live Meeting, Calendar, or Meeting Records.
* Do not add unnecessary fields, cards, tabs, actions, or explanatory text.
* Reuse existing components, registries, repositories, relationships, permissions, themes, responsive patterns, and design tokens.
* Preserve desktop, tablet, mobile, accessibility, EN/BN, themes, IDs, versions, audit history, and backward compatibility.
