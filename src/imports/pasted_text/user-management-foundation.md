# User Management — Phase U1: Canonical Data, Roles, and Organization Foundation

Work only on the User Management data foundation in the current Board Meeting Solution project.

Do not redesign the visible User Management, Role Management, Permission List, Designation, or Organization Structure pages in this phase.

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
* `src/app/components/users/UserComponents.tsx`
* `src/app/pages/administration-requests/UserManagementPage.tsx`
* Existing role, permission, designation, organization-unit, governance-membership, invitation, and audit registries

Reuse existing registries and utilities. Do not create duplicate user, role, permission, designation, or organization stores.

## 1. Create one canonical user source

Make `bms.users` the single source of truth for permanent users.

* Remove permanent dual-writing between `nbr.userRegistry.customUsers` and `bms.users`.
* Convert `useUserRegistry` into a compatibility adapter if legacy components still require its current data shape.
* The adapter must read and write through `bms.users`.
* Do not keep a second independent user dataset.
* Run the existing BMS migration once during application startup.
* Preserve existing IDs and historical relationships.
* Add migration versioning and duplicate-migration protection.

## 2. Canonical user model

Support:

* `id`
* `user_type`
* `name`
* `display_name`
* `employee_id`
* `external_reference_id`
* `email`
* `secondary_email`
* `phone`
* `profile_image`
* `preferred_language`
* `timezone`
* `designation_id`
* `position`
* `primary_org_unit_id`
* `branch_id`
* `division_id`
* `department_id`
* `manager_user_id`
* `primary_role_id`
* `role_ids`
* `governance_membership_ids`
* `employment_type`
* `employment_start_at`
* `employment_end_at`
* `access_start_at`
* `access_expires_at`
* `account_status`
* `invitation_status`
* `two_factor_required`
* `two_factor_enrolled`
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

Keep Service Account hidden from the normal Add User interface.

Supported account statuses:

* Draft
* Invited
* Pending Activation
* Active
* Suspended
* Locked
* Inactive
* Deactivated
* Archived

Keep Invitation Expired as an invitation status, not a duplicate account record.

## 3. Relationship rules

* Use stable IDs for roles, permissions, designations, organizational units, managers, and governance memberships.
* Derive readable names from the related registries.
* Keep governance membership separate from office hierarchy.
* Support one primary organizational unit.
* Prepare support for additional organizational assignments without exposing unfinished UI.
* Support one primary role and optional additional roles.
* Derive effective permissions from active assigned roles.
* Do not copy full role, designation, or organizational-unit objects into user records.
* Deactivating a user must not remove historical meeting, agenda, document, vote, minutes, approval, action, or audit relationships.

## 4. Role and permission foundation

Standardize roles with:

* `id`
* `name`
* `description`
* `category`
* `permission_ids`
* `organizational_scope`
* `is_sensitive`
* `is_system_role`
* `status`
* `created_at`
* `updated_at`

Standardize permissions with:

* `id`
* `module`
* `resource`
* `action`
* `code`
* `description`
* `is_sensitive`
* `status`

Remove visible tax, TIN, return, PSR, appeal, tribunal, payment, and taxpayer permissions.

Preserve permission structures required for:

* User management
* Organization management
* Agenda management
* Document management
* Meeting management
* Live meeting
* Voting
* Minutes
* Approvals
* Audit
* Notifications
* Security
* Reporting
* Integrations

Recalculate role-user counts from canonical user-role relationships.

## 5. Designation foundation

* Use the designation registry as the source of truth.
* Stop using hardcoded designation lists for permanent records.
* Store `designation_id` on users.
* Show only active designations for new assignments.
* Preserve old designation names in historical records.
* Prevent permanent deletion of a designation assigned to users.
* Allow designation deactivation.

Keep designation, position, and system role separate.

## 6. Organization assignment foundation

Use the real organizational hierarchy:

`Head Office or Branch → Division → Department → Users`

Requirements:

* Store organizational assignments by ID.
* Validate the branch, division, and department relationship.
* Prevent assignment to inactive units.
* Prevent self-manager assignment.
* Ensure selected managers are active users.
* Derive the complete organization path.
* Recalculate organizational-unit member counts from canonical user assignments.
* Prepare assignment-history records for later transfer tracking.

## 7. Registry operations

The user registry must support:

* Add user
* Update user
* Archive user
* Restore user
* Change account status
* Assign roles
* Remove roles
* Assign designation
* Assign organization
* Transfer organization
* Assign manager
* Record invitation state
* Record security state
* Query by email
* Query by employee ID
* Query by role
* Query by designation
* Query by organization unit
* Query by account status

Permanent deletion is allowed only for a Draft user with no historical relationships.

## 8. Shared validation

Create reusable validation utilities for:

* Unique normalized email
* Unique normalized employee ID
* Valid email
* Valid phone
* Active role
* Active designation
* Active organizational unit
* Valid hierarchy relationship
* Valid manager
* No self-manager assignment
* No duplicate role IDs
* Valid access dates
* External-user expiry date
* Required internal-employee organization assignment

Do not keep these rules only inside the form component.

## 9. Invitation foundation

Create or standardize a persistent invitation model:

* `id`
* `user_id`
* `email`
* `status`
* `delivery_status`
* `sent_at`
* `sent_by`
* `expires_at`
* `resend_count`
* `last_resent_at`
* `opened_at`
* `activated_at`
* `cancelled_at`

Supported invitation statuses:

* Not Sent
* Sent
* Opened
* Expired
* Activated
* Cancelled
* Delivery Failed

Do not add a fake external email API. Use a persistent local prototype and existing service abstractions.

## 10. Audit foundation

Create an audit event for:

* User created
* User updated
* Role assigned or removed
* Designation changed
* Organization transferred
* Manager changed
* Invitation sent, resent, expired, or cancelled
* Account activated
* Account suspended or restored
* Account locked or unlocked
* 2FA required or reset
* Sessions revoked
* User deactivated
* User archived or restored

Store:

* Actor
* Target user
* Timestamp
* Previous values
* New values
* Reason
* Source
* Optional session metadata

## Completion criteria

This phase is complete only when:

* One user exists once across the project.
* All user pages read the same canonical data.
* User changes persist after refresh.
* Migration runs automatically and safely.
* Roles, designations, and organizational relationships use stable IDs.
* Role and unit member counts remain correct.
* Meeting, agenda, document, and action-owner selectors still receive users.
* Historical relationships remain intact.
* Type checking passes.
* Relevant tests pass.
* Production build succeeds.
* No new console errors appear.

# Golden Rules

* Do not redesign visible UI.
* Do not start Phase U2.
* Do not create another registry.
* Do not remove working roles, permissions, designations, organization units, or historical records.
* Preserve desktop, mobile, themes, accessibility, and EN/BN behavior.
* Change only files required for this foundation.
