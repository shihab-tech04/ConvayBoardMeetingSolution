# Phase 1.1 — Shared Data Foundation

Work only on the shared data structure, relationships, registries, and persistence of the current **Board Meeting Solution** project.

Do not redesign any page. Do not build new user journeys yet. This phase must prepare the existing system for User Management, Office Hierarchy, Agenda Management, Document Management, Meeting Creation, Live Meeting, and Post-Meeting Review.

## First inspect the existing project

Review the current types, mock data, registry hooks, localStorage utilities, routes, and entity relationships before changing anything.

Inspect these areas first:

* `src/app/data/boardMeetingData.ts`
* `src/app/data/documentWorkspaceData.ts`
* `src/app/data/mockData.ts`
* `src/app/hooks/`
* Existing user, role, meeting, agenda, document, minutes, attendance, vote, and organizational-unit registries
* Existing localStorage keys and migration utilities

Reuse existing entity types, hooks, ID generators, timestamps, and persistence patterns. Do not create duplicate registries for entities that already have one.

## Goal

Create one reliable source of truth for the seven main journeys:

1. User management
2. Office hierarchy
3. Agenda builder
4. Document library
5. Board meeting creation
6. Live board meeting
7. Post-meeting review

All later phases must use shared IDs and relationship records instead of copying data between pages.

## 1. Standardize shared entity fields

Every major entity should consistently support:

* `id`
* `created_at`
* `created_by`
* `updated_at`
* `updated_by`
* `status`
* Optional `archived_at`
* Optional `archived_by`

Preserve existing display fields and legacy data while adding stable IDs.

Do not rename existing fields when that may break working pages. Add compatibility mapping where required.

## 2. Standardize user relationships

Update the existing user model to support:

* `email`
* `employee_id`
* `designation_id`
* `role_id`
* `primary_org_unit_id`
* Optional `branch_id`
* Optional `division_id`
* Optional `department_id`
* `invitation_status`
* `account_status`
* `two_factor_enabled`

Keep current readable values such as role name, designation name, branch name, division name, and department name for backward compatibility.

The IDs must become the reliable relationship source.

Do not build or redesign the user form in this phase.

## 3. Standardize office hierarchy

Use one flexible organizational-unit model.

Required fields:

* `id`
* `name`
* `code`
* `unit_type`
* `parent_unit_id`
* `head_user_id`
* `status`

Supported initial unit types:

* Head Office
* Branch
* Division
* Department

The structure must support:

`Head Office or Branch → Division → Department → Users`

Do not mix office hierarchy with boards, committees, or governance bodies. They must remain separate entity types.

## 4. Standardize agenda hierarchy

Update the existing agenda model to support:

* `parent_agenda_id`
* `agenda_level`
* `display_order`
* `description`
* `owner_user_id`
* `approval_status`
* `approval_history`
* `is_temporary`

The future system will support only three levels:

* Level 1: Parent agenda
* Level 2: Child agenda
* Level 3: Final child agenda

Do not build the agenda tree interface yet.

Keep existing agenda data readable and treat current agendas without a parent as Level 1 agendas.

## 5. Create relationship records

Do not copy full entities into meetings, agendas, or documents.

Create or standardize the following relationship models.

### Agenda document link

* `id`
* `agenda_id`
* `document_id`
* `document_version_id`
* `linked_at`
* `linked_by`
* `is_primary`
* `display_order`

### Meeting agenda link

* `id`
* `meeting_id`
* `agenda_id`
* `display_order`
* `added_at`
* `added_by`

### Meeting participant link

* `id`
* `meeting_id`
* `user_id`
* `participant_type`
* `selection_source_type`
* `selection_source_id`
* `quorum_eligible`
* `voting_eligible`
* `is_required`
* `invitation_status`

`selection_source_type` must support:

* Individual User
* Branch
* Division
* Department
* Participant Group

These relationship records must support future bulk selection without creating duplicate users.

## 6. Standardize quorum rules

Find the current quorum data fields and remove naming conflicts through compatibility mapping.

Use one normalized quorum-rule model:

* `id`
* `meeting_id`
* `rule_type`
* `minimum_members`
* `minimum_percentage`
* `required_role_ids`
* `count_virtual_attendance`
* `count_alternate_members`
* `exclude_recused_members`
* `lost_quorum_action`
* `status`

Supported rule types:

* Fixed Number
* Percentage
* Role Based

Do not build the full quorum interface or calculation engine yet. Only prepare the correct shared data model.

## 7. Prepare live-meeting records

Create these registries only if they do not already exist.

### Live meeting session

* `id`
* `meeting_id`
* `started_at`
* `started_by`
* `ended_at`
* `ended_by`
* `session_status`
* `recording_status`
* `transcription_status`
* `minutes_capture_status`

### Meeting interaction record

* `id`
* `meeting_id`
* `agenda_id`
* `user_id`
* `interaction_type`
* `content`
* `metadata`
* `created_at`

The interaction model must later support:

* Join
* Leave
* Chat
* Comment
* Vote
* Motion
* Decision
* Document View
* Document Upload
* Agenda Change
* Host Action
* Quorum Change

Do not create the live-meeting UI in this phase.

## 8. Preserve minutes and post-meeting relationships

Ensure minutes, attendance, votes, decisions, resolutions, actions, transcripts, recordings, and interaction history reference the original `meeting_id`.

Do not duplicate completed meeting data into separate archive-only mock objects.

The archive must later read from the same shared records.

## 9. Registry and persistence rules

Use the project’s existing registry-hook pattern.

Each registry must support the relevant operations:

* Create
* Read
* Update
* Archive
* Restore where applicable
* Delete only when safe

All registry actions must update localStorage immediately.

Avoid page-only state for permanent business records.

Where a page currently maintains its own copied dataset, do not refactor its UI yet. Prepare compatible registry functions that later phases can connect to it.

## 10. Storage-key migration

New board-meeting storage keys must use a consistent `bms.` prefix.

Examples:

* `bms.users`
* `bms.roles`
* `bms.orgUnits`
* `bms.agendas`
* `bms.documents`
* `bms.agendaDocumentLinks`
* `bms.meetings`
* `bms.meetingAgendaLinks`
* `bms.meetingParticipants`
* `bms.quorumRules`
* `bms.liveSessions`
* `bms.meetingInteractions`
* `bms.minutes`

Do not delete existing `nbr.*` stored data.

Add a safe one-time migration that:

1. Reads existing data.
2. Converts compatible fields.
3. Preserves IDs where possible.
4. Creates missing IDs where necessary.
5. Writes the converted data to `bms.*`.
6. Prevents duplicate migration.
7. Keeps a migration-version value.
8. Falls back safely if old data is incomplete.

## 11. Validation utilities

Create small shared validation utilities where missing:

* Unique email validation
* Unique employee ID validation
* Valid organizational parent relationship
* Agenda-level limit
* Duplicate agenda-document link prevention
* Duplicate meeting-agenda link prevention
* Duplicate meeting-participant prevention
* Relationship existence validation

Do not place these rules inside individual page components.

## 12. Testing and verification

Add focused tests for:

* Existing data migration
* Missing ID generation
* Duplicate relationship prevention
* User-to-role relationship
* User-to-organizational-unit relationship
* Three-level agenda validation
* Document relationship integrity
* Meeting-agenda relationship integrity
* Meeting-participant deduplication
* Quorum-field compatibility mapping

Run:

* Type checking
* Existing tests
* New foundation tests
* Production build

Fix only errors related to this phase.

## Completion criteria

This phase is complete only when:

* Existing screens still load.
* Existing data is not lost.
* All major entities use stable IDs.
* Office units can support parent-child relationships.
* Agendas can support three levels.
* Documents can be linked without duplication.
* Meetings can reference existing agendas.
* Participants can be connected to meetings from multiple selection sources.
* Quorum fields use one normalized structure.
* Live and post-meeting records can reference the same meeting.
* Refreshing the browser does not remove registry changes.
* No unrelated UI or business flow has changed.

# Golden Rules

* Do not break solved issues.
* Do not redesign any page in this phase.
* Do not change unrelated files.
* Do not remove working features.
* Do not create duplicate registries.
* Preserve all existing data.
* Reuse existing types, hooks, utilities, and patterns.
* Keep governance bodies separate from office hierarchy.
* Use relationship records instead of copying entities.
* Keep desktop, mobile, themes, EN/BN, routes, and accessibility unchanged.
* Do not start Phase 1.2 until this foundation passes type checking, tests, and build.
