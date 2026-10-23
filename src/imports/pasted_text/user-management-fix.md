# User Management — Correction and Completion Prompt

Fix the current User Management implementation in the existing Board Meeting Solution project.

Work only on the issues found in the latest User Management audit. Do not redesign the interface, add unrelated features, or modify other user journeys unless a user relationship must be corrected.

## Goal

Make User Management fully functional and connected by fixing:

1. Registry operations
2. Account lifecycle enforcement
3. Permissions
4. Invitations
5. Roles and organization transfers
6. Governance memberships
7. Security controls
8. Cross-module user relationships
9. Audit history
10. Type errors and build failures

---

## 1. Fix the canonical user registry

Inspect:

* `src/app/data/bmsUsers.ts`
* `src/app/hooks/useUserRegistry.ts`
* `src/app/utils/bmsMigration.ts`
* `src/app/pages/administration-requests/UserManagementPage.tsx`
* `src/app/components/users/UserComponents.tsx`
* `src/app/components/users/UserFormModal.tsx`

Requirements:

* Keep `bms.users` as the only permanent user source.
* Do not maintain a second user dataset under `nbr.*`.
* Keep legacy hooks only as adapters over `bms.users`.
* Fix every registry update call to use the actual registry signature:

```ts
update(userId, patch)
```

Do not pass a single object when the registry expects an ID and patch separately.

Audit and fix all user update calls in:

* Invitation manager
* Security controls
* Role change
* Organization transfer
* Status changes
* User edit
* Archive and restore
* 2FA actions
* Lock and unlock
* Session revocation

After every action, confirm the canonical user record is updated and remains correct after refresh.

---

## 2. Connect the account lifecycle engine

Inspect:

* `src/app/data/userLifecycle.ts`
* User status actions
* Status confirmation modals
* User drawer action handlers

All account-status changes must use one lifecycle service.

Support these states:

* Draft
* Invited
* Pending Activation
* Active
* Suspended
* Locked
* Inactive
* Deactivated
* Archived

Requirements:

* Validate every transition before applying it.
* Block invalid transitions.
* Require a reason for suspension, deactivation, reactivation, archive, and restore.
* Record previous status, new status, actor, timestamp, and reason.
* Update both user status and lifecycle history.
* Revoke active access when a user is suspended, locked, deactivated, or archived.
* Do not allow page components to update status directly.

Use the lifecycle rules in both the visible UI and the action handler.

---

## 3. Fix permission enforcement

Inspect:

* Current logged-in user resolution
* Role and permission utilities
* User Management page access
* Drawer actions
* Action handlers

Requirements:

* Resolve the current session user against `bms.users`.
* Never grant full permissions when the current user cannot be resolved.
* Use deny-by-default permission behavior.
* Enforce permissions in both:

  * Visible controls
  * Action handlers
* Do not rely only on hiding buttons.

Control these permissions independently:

* View users
* Create users
* Edit users
* Assign roles
* Transfer users
* Manage invitations
* Suspend users
* Deactivate users
* Manage 2FA and security
* View audit history
* Archive and restore users

Add test users with restricted roles and verify unauthorized operations are blocked.

---

## 4. Complete the invitation lifecycle

Inspect:

* `src/app/hooks/useInvitationManager.ts`
* Add User submission
* User detail drawer invitation section
* Invitation registry
* Invitation-expiry utilities

When the administrator selects **Save and Send Invitation**, create:

1. Canonical user record
2. Persistent invitation record
3. Audit event

Invitation record must include:

* Invitation ID
* User ID
* Email
* Status
* Delivery status
* Sent by
* Sent date
* Expiry date
* Resend count
* Last resend date
* Opened date
* Activation date
* Cancellation date

Support:

* Send
* Resend
* Cancel
* Copy prototype activation link
* Mark opened
* Activate
* Delivery failed
* Automatic expiry

Rules:

* Resending must not create another user.
* Cancelling must prevent activation.
* Activation must update invitation and account status.
* Expiry checks must run automatically during application startup and when User Management loads.
* Every invitation action must create an audit event.
* Show clear partial-success feedback if the user is created but invitation creation fails.

Do not add a fake external email provider.

---

## 5. Complete role changes

Keep one role-change interface. Remove or hide duplicate older role-change controls after confirming they are unused.

Before saving, show:

* Current roles
* Proposed roles
* Added permissions
* Removed permissions
* Sensitive permissions
* Organizational-scope changes

Requirements:

* Require a reason.
* Confirm sensitive access changes.
* Update primary and additional role IDs.
* Recalculate effective permissions.
* Recalculate role-user counts.
* Refresh the user’s permission state.
* Create an audit event containing previous and new roles.
* Persist after refresh.

Fix type mismatches related to `SystemRole` and use the canonical exported role type.

---

## 6. Complete organization transfers

Inspect the organization-transfer modal and related handlers.

Requirements:

* Show current organization path.
* Select the new path from active organization units.
* Require effective date.
* Require transfer reason.
* Validate branch, division, and department relationships.
* Update:

  * `primary_org_unit_id`
  * `branch_id`
  * `division_id`
  * `department_id`
* Create an assignment-history record.
* Recalculate previous and new unit member counts.
* Warn when the user owns open agendas, meetings, documents, decisions, resolutions, or actions.
* Do not remove historical organization information from old records.
* Create an audit event.
* Persist after refresh.

Do not allow transfer to inactive units.

---

## 7. Complete governance memberships

Use a proper governance-membership registry.

Each membership must contain:

* ID
* User ID
* Governance body ID
* Membership role
* Voting eligibility
* Quorum eligibility
* Start date
* End date
* Status
* Appointed by
* Created and updated metadata

Requirements:

* Store membership-record IDs on the user.
* Do not store governance-body IDs as if they were membership IDs.
* Prevent duplicate active membership for the same user, body, and role.
* Keep governance membership separate from office hierarchy.
* Preserve expired memberships.
* Remove voting and quorum eligibility after expiry.
* Create audit events for add, update, expire, and remove actions.

---

## 8. Complete security controls

Inspect:

* `src/app/hooks/useSecurityControls.ts`
* Security section in the user drawer
* Account lock and 2FA actions

Support persistent states for:

* 2FA required
* 2FA enrolled
* Reset 2FA
* Failed login count
* Last failed login
* Last successful login
* Locked date
* Unlock
* Password-reset pending
* Session revocation
* Active-session summary
* Access expiry

Requirements:

* “Require 2FA” must update the requirement field, not the enrollment field.
* Resetting or disabling 2FA for privileged users requires confirmation and reason.
* Unlocking must safely clear failed-login state.
* Password reset must create a persistent request state.
* Session revocation must update session records and create an audit event.
* Expired external-user access must prevent active access.
* Never display or store passwords.

Keep real SSO, directory integration, passkeys, and external identity providers hidden.

---

## 9. Connect users across the system

Replace free-text and hardcoded user ownership fields with canonical user selectors where relevant.

Connect `bms.users` to:

* Organization unit heads
* Reporting managers
* Agenda owners
* Agenda presenters
* Document owners
* Document access controls
* Meeting chairperson
* Meeting secretary
* Meeting participants
* Quorum participants
* Minutes reviewers
* Decision owners
* Resolution owners
* Action owners
* Audit actors

Store user IDs as the relationship source.

Show readable names and historical snapshots for display.

Rules:

* New assignments show only eligible active users.
* Inactive, deactivated, or archived users remain visible in historical records.
* Do not remove historical relationships when a user status changes.

---

## 10. Fix counts and derived information

Do not depend on static mock counts.

Derive or recalculate:

* Role user counts
* Organizational-unit member counts
* Active user counts
* Invited user counts
* Suspended user counts
* 2FA-required user counts

Update counts after:

* User creation
* Role change
* Organization transfer
* Activation
* Suspension
* Deactivation
* Archive
* Restore

Use one shared count service or derived selector.

---

## 11. Complete user detail data

Use real registry records in the drawer.

Ensure these sections are complete:

### Profile

* Identity
* Contact details
* User type
* Status
* Invitation state
* Access dates

### Organization

* Full path
* Designation
* Position
* Reporting manager name
* Assignment history

### Access

* Primary and additional roles
* Effective permissions
* Sensitive permissions
* Governance memberships

### Security

* 2FA
* Login history
* Failed login state
* Lock state
* Password-reset state
* Session summary
* Access expiry

### Activity

* Invitations
* Role changes
* Transfers
* Status changes
* Meeting participation
* Agenda ownership
* Document ownership
* Assigned actions

### Audit

* Actor
* Action
* Timestamp
* Previous value
* New value
* Reason

Remove hardcoded timeline and activity items.

---

## 12. Fix contextual actions

Show actions only when they are valid for the user’s current status and the administrator’s permissions.

Supported actions:

* Edit User
* Change Role
* Transfer Organization
* Add Governance Membership
* Send Invitation
* Resend Invitation
* Cancel Invitation
* Activate
* Suspend
* Unsuspend
* Lock
* Unlock
* Require 2FA
* Reset 2FA
* Send Password Reset
* Revoke Sessions
* Deactivate
* Archive
* Restore

Requirements:

* Remove irrelevant Print and Export actions.
* Do not show actions without working handlers.
* Permanent Delete is available only for Draft users with no related history.
* Before deletion, check agenda, document, meeting, action, governance, invitation, and audit relationships.
* Otherwise allow Archive only.

---

## 13. Apply all shared validation

Before every create or update operation, validate:

* Unique normalized email
* Unique employee ID
* Active role
* Active designation
* Active organizational unit
* Valid hierarchy
* Valid manager
* No self-manager relationship
* No duplicate role IDs
* Valid employment dates
* Valid access dates
* Required expiry for external users
* Required organization for internal users

Field-level validation is not enough. Run complete validation again before saving.

---

## 14. Mobile and responsive validation

Do not redesign the desktop interface.

Verify mobile behavior:

* User cards instead of compressed tables
* Full card opens details
* No separate View Details button
* Search and filters remain usable
* Filters use the existing bottom-sheet pattern
* Form fields use full width
* Permission preview remains readable
* Actions remain available in the drawer footer or action sheet
* No horizontal overflow
* Comfortable tap targets

Keep EN/BN behavior and themes unchanged.

---

## 15. Required end-to-end test

Test this exact journey:

1. Create an internal employee.
2. Assign designation, manager, role, branch, division, and department.
3. Save as Draft.
4. Send invitation.
5. Open and activate the invitation.
6. Confirm Active status.
7. Change the user’s role.
8. Verify permission differences.
9. Transfer the user to another department.
10. Add governance membership.
11. Require 2FA.
12. Lock and unlock the account.
13. Revoke sessions.
14. Suspend and reactivate the user.
15. Select the user as an agenda owner.
16. Select the user as a meeting participant.
17. Select the user as an action owner.
18. Deactivate the user.
19. Confirm historical relationships remain.
20. Archive and restore the user.
21. Refresh after every important action.

Also test:

* Duplicate email
* Duplicate employee ID
* Invalid hierarchy
* Inactive role
* Inactive designation
* Expired invitation
* Cancelled invitation
* Unauthorized administrator
* External-user access expiry
* Draft user with related history
* Desktop and mobile

---

## 16. Technical completion

Run:

* Type checking
* User registry tests
* Migration tests
* Lifecycle tests
* Invitation tests
* Permission tests
* Role-change tests
* Organization-transfer tests
* Security tests
* Cross-module relationship tests
* Production build

Fix:

* Wrong registry method signatures
* Missing or incorrect type exports
* Invalid component props
* Table action type mismatches
* Broken imports
* Console errors
* Hardcoded activity data
* Duplicate user data
* Legacy permission storage

User Management is complete only when all tests and the production build pass.

# Golden Rules

* Do not break solved issues.
* Do not redesign working UI.
* Do not change unrelated modules.
* Do not create another user, role, or permission registry.
* Use canonical IDs for relationships.
* Preserve historical records.
* Enforce permissions in both UI and handlers.
* Keep unfinished SSO, SCIM, bulk import, and maker-checker features hidden.
* Preserve desktop, mobile, themes, accessibility, and EN/BN support.
