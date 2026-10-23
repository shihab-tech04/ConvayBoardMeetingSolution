# User Management Implementation Audit Prompt

Deeply audit the current Board Meeting Solution project and verify whether **User Management Phases U1, U2, and U3** were implemented correctly.

Do not modify the project during this audit. First inspect the actual code, UI, registries, persistence, actions, responsive behavior, and cross-module relationships. Do not judge implementation only by visible screens.

## Audit scope

Check:

* Canonical user data
* Roles and permissions
* Designations
* Organization assignments
* Add User flow
* Edit User flow
* User list and filters
* User detail drawer
* Invitation lifecycle
* Account lifecycle
* Security controls
* Governance memberships
* Audit history
* Permission enforcement
* Cross-module user usage
* Mobile behavior
* Persistence
* Type safety and build health

## 1. Canonical user source

Verify:

* `bms.users` is the single source of truth.
* No separate user dataset is still maintained under `nbr.*`.
* `useUserRegistry` is either removed or works only as an adapter over `bms.users`.
* Add, edit, status change, archive, and restore actions update the same registry.
* Users are not duplicated during migration or form submission.
* Migration runs once during application startup.
* Existing IDs and historical relationships are preserved.
* User data remains after refresh.

Fail this section if two independent user registries still exist.

## 2. User model

Verify the canonical model supports:

* User type
* Name and display name
* Employee or external ID
* Email and phone
* Language and time zone
* Designation
* Position
* Branch, division, department, and primary unit
* Manager
* Primary and additional roles
* Governance memberships
* Employment dates
* Access dates
* Account status
* Invitation status
* 2FA state
* Login and activity data
* Suspension, deactivation, and archive data
* Created and updated metadata

Confirm relationships use stable IDs rather than names as the source of truth.

## 3. Roles and permissions

Verify:

* Roles use permission IDs.
* Effective permissions are derived from active assigned roles.
* Role user counts come from canonical user relationships.
* Inactive roles cannot be assigned.
* Sensitive permissions are identified.
* Old tax, TIN, return, PSR, appeal, tribunal, payment, and taxpayer permissions are removed or hidden.
* Board-meeting permissions remain available.
* Permission enforcement exists in both visible controls and action handlers.
* Unauthorized users cannot perform restricted actions through direct function calls.

## 4. Designations and organization

Verify:

* Designations come from the designation registry.
* Hardcoded designation lists are not used as permanent data.
* Inactive designations cannot be assigned.
* Branch, division, and department selections come from the real organization hierarchy.
* Child selectors respond to parent selection.
* Invalid hierarchy combinations are blocked.
* Users cannot be assigned to inactive units.
* Self-manager assignment is blocked.
* Unit member counts update correctly.
* Governance membership remains separate from office hierarchy.

## 5. Add User journey

Test the full Add User flow.

Verify:

1. User type is selected.
2. Email is checked for duplication.
3. Employee ID is checked for duplication.
4. Fields change correctly by user type.
5. Internal users receive organization and designation fields.
6. External users receive sponsor and expiry fields.
7. Service Account is hidden.
8. Roles and effective permissions can be reviewed.
9. Sensitive permissions are visible.
10. Governance membership can be added when relevant.
11. The final review shows all selected data.
12. Save as Draft works.
13. Save and Send Invitation works.
14. Authorized direct activation works only where permitted.
15. The created user appears once in the list.
16. Role and organization counts update.
17. An audit event is created.
18. Data remains after refresh.

## 6. Edit and transfer journey

Verify:

* Identity and contact information can be edited.
* Email and employee ID are revalidated.
* Role changes show added and removed permissions.
* Sensitive changes require confirmation and reason.
* Organization transfer shows current and new hierarchy.
* Transfer history is preserved.
* Manager changes persist.
* Governance memberships can be added, edited, expired, or removed safely.
* Historical meeting, agenda, document, vote, minutes, and action records remain linked.

## 7. User list

Verify desktop table columns include:

* User ID
* User
* Email
* User type
* Designation
* Primary role
* Organization
* Account status
* Invitation status
* Last active
* One View action

Verify search supports:

* Name
* Email
* Employee ID
* Phone
* Role
* Designation
* Organization

Verify filters support:

* User type
* Account status
* Invitation status
* Role
* Designation
* Branch
* Division
* Department
* 2FA
* Access expiry
* Last activity

Check Clear All, active-filter count, empty results, and filter-state preservation.

## 8. User detail drawer

Verify the drawer shows real registry data under:

* Profile
* Organization
* Access
* Security
* Activity
* Audit

Confirm it includes:

* Full organization path
* Manager
* Roles and effective permissions
* Governance memberships
* Invitation history
* 2FA and lock state
* Login and activity data
* Role-change history
* Organization-transfer history
* Meeting, agenda, document, and action relationships
* Read-only audit records

Fail this section if timeline or history content is hardcoded.

## 9. Invitation lifecycle

Verify these states work and persist:

* Not Sent
* Sent
* Opened
* Expired
* Activated
* Cancelled
* Delivery Failed

Test:

* Send
* Resend
* Cancel
* Copy prototype link
* Open
* Activate
* Automatic expiry

Confirm:

* Resending does not create another user.
* Cancelled invitations cannot activate.
* Activation updates the invitation and account status.
* Resend count and timestamps update.
* External users require access expiry.
* Every action creates an audit event.

## 10. Account lifecycle

Verify valid transitions between:

* Draft
* Invited
* Pending Activation
* Active
* Suspended
* Locked
* Inactive
* Deactivated
* Archived

Check:

* Invalid transitions are blocked.
* Suspension and deactivation require reasons.
* Archive does not remove history.
* Restore works only for authorized users.
* Deactivated users cannot sign in.
* Archived users remain available in historical records.
* Status changes update the table, drawer, role count, and organization count.

## 11. Security controls

Verify persistent controls for:

* Require 2FA
* 2FA enrolled
* Reset 2FA
* Failed-login count
* Lock
* Unlock
* Last successful login
* Last failed login
* Password-reset state
* Session revocation
* Access expiry

Confirm:

* Passwords are never displayed or stored in user records.
* Privileged 2FA changes require confirmation and reason.
* Unlocking updates failed-login data safely.
* Session revocation creates an audit event.
* Expired external access blocks active use.

## 12. User actions

Verify contextual actions appear only when valid:

* Edit
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
* Require or Reset 2FA
* Send Password Reset
* Revoke Sessions
* Deactivate
* Archive
* Restore

Confirm:

* Irrelevant Print and Download actions are removed.
* Permanent Delete appears only for Draft users with no history.
* Hidden actions cannot still run through unprotected handlers.

## 13. Audit history

Verify every important action creates an immutable event with:

* Actor
* Target user
* Action
* Timestamp
* Previous values
* New values
* Reason
* Source

Test user creation, editing, invitation, role change, transfer, security change, suspension, deactivation, archive, and restore.

## 14. Cross-module integration

Verify canonical users are used by:

* Organization member lists
* Unit-head selectors
* Manager selectors
* Agenda owners
* Agenda presenters
* Document owners
* Document-access controls
* Meeting participants
* Quorum participants
* Chairperson and secretary selectors
* Minutes reviewers
* Decision owners
* Resolution owners
* Action owners
* Audit actors

Confirm inactive users are hidden from new assignments but remain visible in historical records.

## 15. Mobile and responsive behavior

Verify:

* Mobile uses user cards.
* Tapping the full card opens details.
* There is no separate View Details button.
* Search and filters remain usable.
* Filters use the project’s bottom-sheet pattern.
* Forms use full-width fields.
* Permission previews remain readable.
* Actions appear in the drawer footer or action sheet.
* No horizontal overflow exists.
* Tap targets remain accessible.
* Desktop remains unchanged and functional.

## 16. Required states

Verify complete handling for:

* Loading
* Saving
* Sending invitation
* No users
* No search results
* No filter results
* No roles
* No designations
* No organization units
* Duplicate email
* Duplicate employee ID
* Invalid hierarchy
* Failed save
* Migration failure
* Permission denied
* Conflicting edits
* Expired invitation
* Cancelled invitation

## 17. Technical validation

Run:

* Type checking
* Relevant unit tests
* User lifecycle tests
* Migration tests
* Permission tests
* Responsive checks
* Production build

Check:

* No broken imports
* No model-field mismatch
* No duplicate registry
* No console errors
* No temporary-only permanent actions
* No hardcoded activity data
* No broken routes
* No EN/BN mismatch
* No theme regression

## Required audit output

Provide a structured report containing:

### Overall verdict

Choose one:

* Fully Implemented
* Mostly Implemented
* Partially Implemented
* Not Implemented

Include an estimated completion percentage.

### Phase verdicts

Report separately for:

* U1 — Canonical Foundation
* U2 — Visible User Experience
* U3 — Lifecycle, Security, and Integration

### Issue list

For every issue, include:

* Priority: P0, P1, or P2
* Requirement
* Current implementation
* Exact file or component
* Root cause
* Required correction
* Risk of leaving it unresolved

### Journey test result

Show Pass or Fail for every step of the complete user lifecycle.

### Final recommendation

State clearly whether User Management is ready to be marked complete or whether another correction phase is required.

Do not modify code during this audit. Do not provide a new implementation prompt until the audit is finished.

# Golden Rules

* Inspect real code and behavior.
* Do not judge only by visible UI.
* Do not assume a button works because it exists.
* Verify persistence after refresh.
* Verify permissions inside handlers.
* Verify desktop and mobile.
* Verify shared relationships across modules.
* Report missing, broken, duplicated, hardcoded, and disconnected functions honestly.
