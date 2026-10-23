# User Management — Phase U1: Canonical Data and Lifecycle Foundation

Work only on the User Management data foundation in the current Board Meeting Solution project.

Do not redesign the User Management page, table, drawer, modal, Role Management page, Permission List page, Organization Structure page, or Designation page in this phase.

## Inspect first

Inspect and reuse:

* `src/app/data/bmsUsers.ts`
* `src/app/hooks/useUserRegistry.ts`
* `src/app/hooks/useRoleRegistry.ts`
* `src/app/hooks/usePermissionRegistry.ts`
* `src/app/utils/bmsMigration.ts`
* `src/app/data/mockData.ts`
* `src/app/data/boardMeetingData.ts`
* `src/app/components/users/UserFormModal.tsx`
* `src/app/pages/administration-requests/UserManagementPage.tsx`
* Existing designation, organization-unit, governance-membership, and audit registries

## Goal

Create one canonical user source that can support any bank or organization and prepare the remaining User Management phases without changing the current UI.

## Requirements

1. Make `bms.users` the only source of truth for permanent user records.
2. Remove permanent dual-writing between `nbr.userRegistry.customUsers` and `bms.users`.
3. Keep `useUserRegistry` only as a temporary compatibility adapter if existing pages still require the legacy `SystemUser` shape.
4. The compatibility adapter must read from and write to `bms.users`; it must not maintain a second user dataset.
5. Run the existing BMS migration once during application startup.
6. Preserve existing user IDs and historical references.
7. Prevent duplicate migration and duplicate users.

## Canonical user model

Support:

* `id`
* `user_type`
* `name`
* `display_name`
* `employee_id`
* `external_reference_id`
* `email`
* `phone`
* `preferred_language`
* `timezone`
* `designation_id`
* `position`
* `primary_org_unit_id`
* `branch_id`
* `division_id`
* `department_id`
* `manager_user_id`
* `role_ids`
* `primary_role_id`
* `governance_membership_ids`
* `account_status`
* `invitation_status`
* `two_factor_required`
* `access_start_at`
* `access_expires_at`
* `last_login_at`
* `last_active_at`
* `failed_login_count`
* `locked_at`
* `suspended_at`
* `suspension_reason`
* `deactivated_at`
* `deactivation_reason`
* `created_at`
* `created_by`
* `updated_at`
* `updated_by`
* `archived_at`
* `archived_by`

Supported user types:

* Internal Employee
* Governance Member
* External Participant
* Service Account

Keep Service Account hidden from the normal Phase 1 Add User UI.

Supported account states:

* Draft
* Invited
* Invitation Expired
* Pending Activation
* Active
* Suspended
* Locked
* Inactive
* Deactivated
* Archived

## Relationship rules

* Role, designation, organization, manager, and governance membership must use stable IDs.
* Keep readable names only as derived compatibility values.
* Keep governance membership separate from office hierarchy.
* A user may have one primary organizational unit.
* Prepare support for additional assignments without exposing unfinished UI.
* A user may have one primary role and optional additional roles.
* Effective permissions must be derived from active assigned roles.
* Deactivating or archiving a user must not remove historical meeting, agenda, document, vote, minutes, action, or audit relationships.

## Registry operations

The canonical registry must support:

* Add
* Update
* Archive
* Restore
* Change account status
* Assign roles
* Assign organization
* Assign designation
* Record invitation state
* Record security state
* Query by email
* Query by employee ID
* Query by organization unit
* Query by role

Permanent delete must only be allowed for a Draft user with no related history.

## Validation

Create shared validation for:

* Unique normalized email
* Unique normalized employee ID
* Valid user type
* Active role
* Active designation
* Active organization unit
* Valid organization hierarchy
* Valid access dates
* Existing manager
* No self-manager assignment
* No duplicate role IDs

Do not place these rules only inside `UserFormModal`.

## Invitation foundation

Create or standardize a persistent user-invitation record containing:

* `id`
* `user_id`
* `email`
* `status`
* `sent_at`
* `sent_by`
* `expires_at`
* `resend_count`
* `last_resent_at`
* `activated_at`
* `cancelled_at`
* `delivery_status`

This remains a local functional prototype. Do not add a fake external email API.

## Audit foundation

Every user create, update, role change, organization transfer, status change, invitation action, 2FA change, archive, and restore action must create an event through the existing audit registry.

Store actor, timestamp, previous values, new values, and reason.

## Role and permission cleanup

* Preserve existing role and permission pages.
* Add safe `bms.*` migration for role and permission storage.
* Hide or migrate visible tax, return, TIN, PSR, appeal, tribunal, payment, and taxpayer permissions.
* Do not remove permission structures needed for later meeting, agenda, document, approval, audit, notification, and security features.
* Recalculate role-user counts from canonical user-role relationships.

## Completion checks

This phase is complete only when:

* One user exists once across the entire project.
* User changes persist after refresh.
* Existing User Management UI still loads.
* Existing meeting, document, and action-owner selectors still receive users.
* Migration runs safely.
* Role counts remain correct.
* No historical relationships are removed.
* Type checking passes.
* Relevant tests pass.
* Production build succeeds.
* No new console errors appear.

# Golden Rules

* Do not redesign the UI.
* Do not start the next User Management phase.
* Do not create another user registry.
* Do not remove working roles, permissions, organization units, designations, or historical records.
* Keep desktop, mobile, themes, accessibility, and EN/BN behavior unchanged.
* Change only files required for the canonical user foundation.
