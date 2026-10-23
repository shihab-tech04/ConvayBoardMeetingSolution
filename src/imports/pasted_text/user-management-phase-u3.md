# User Management — Phase U3: Invitations, Security, Lifecycle, Audit, and Final Integration

Work only on completing the operational lifecycle of User Management after U1 and U2 pass validation.

Do not add real SSO, directory synchronization, SCIM, passkeys, or external email providers in this phase. Keep their code foundations hidden for the final 100% system.

## 1. Invitation lifecycle

Complete the persistent invitation flow.

Supported states:

* Not Sent
* Sent
* Opened
* Expired
* Activated
* Cancelled
* Delivery Failed

Required actions:

* Send invitation
* Resend invitation
* Cancel invitation
* Copy prototype activation link
* Mark delivery failed
* Open simulated activation
* Complete simulated activation
* Automatically mark expired invitations based on expiry date

Show:

* Sent date
* Sent by
* Expiry date
* Delivery status
* Resend count
* Last resend date
* Activation date

Rules:

* Resending must not create another user.
* Cancelling an invitation must prevent activation.
* Activation must update both invitation and account status.
* Invitation actions must create audit events.
* External users must have an access-expiry date.

## 2. Account lifecycle

Implement valid transitions between:

* Draft
* Invited
* Pending Activation
* Active
* Suspended
* Locked
* Inactive
* Deactivated
* Archived

Prevent invalid transitions.

Examples:

* Draft can become Invited or Archived.
* Invited can become Pending Activation, Active, Expired, Cancelled, or Archived.
* Active can become Suspended, Locked, Inactive, Deactivated, or Archived.
* Deactivated users cannot return to Active without an authorized Restore or Reactivate action.
* Archived users remain searchable in historical views.

Every transition must include:

* Acting administrator
* Date and time
* Reason when required
* Previous status
* New status
* Impact description
* Audit event

## 3. Security controls

Complete persistent front-end security states for:

* Require 2FA
* 2FA enrolled
* Reset 2FA
* Failed-login count
* Account lock
* Account unlock
* Last successful login
* Last failed login
* Send password-reset instruction
* Password-reset pending
* Revoke all sessions
* Active-session summary
* Access expiry

Rules:

* Never display or store passwords in user records.
* Disabling or resetting 2FA for a privileged user must require confirmation and a reason.
* Unlocking an account must clear or safely update the failed-login state.
* Revoking sessions must create an audit event.
* Expired external access must block active access without deleting the user.

Keep real identity-provider integration hidden for Phase 2.

## 4. Sensitive access changes

Mark these actions as sensitive:

* Assigning Super Admin
* Granting User Management permission
* Granting Role or Permission Management access
* Granting confidential-document access
* Granting Meeting Host access
* Granting Minutes Approval access
* Disabling 2FA
* Reactivating a privileged user
* Changing governance voting or quorum rights

For Phase 1:

* Require confirmation.
* Require a reason.
* Record previous and new access.
* Create an audit event.
* Add approval-ready metadata.
* Do not expose an unfinished maker-checker interface.

## 5. Role-change comparison

Before applying a role change, show:

* Current roles
* Proposed roles
* Added permissions
* Removed permissions
* Sensitive permissions
* Organizational-scope changes
* Access-expiry changes

After confirmation:

* Update canonical relationships.
* Recalculate effective permissions.
* Recalculate role-user counts.
* Refresh active permission state.
* Record the reason.
* Create an audit event.

## 6. Organization transfer history

When transferring a user:

* Show current hierarchy.
* Show new hierarchy.
* Validate the new path.
* Require an effective date.
* Require a reason.
* Warn about owned agendas, meetings, documents, decisions, and open actions.
* Preserve previous assignment history.
* Update organization member counts.
* Keep historical records showing the user’s organization at the time of the action.

## 7. Governance memberships

Support persistent governance membership records with:

* User ID
* Governance body ID
* Membership role
* Voting eligibility
* Quorum eligibility
* Start date
* End date
* Status
* Appointed by
* Created and updated information

Requirements:

* Keep membership separate from office assignment.
* Prevent duplicate active membership in the same role and body.
* Preserve expired memberships.
* Remove voting and quorum eligibility when membership expires.
* Keep historical meeting participation intact.

## 8. User activity and audit history

Connect the user detail drawer to actual records for:

* Invitations
* Role changes
* Organization transfers
* Status changes
* Security changes
* Governance memberships
* Meeting participation
* Agenda ownership and presentation
* Document ownership and access
* Decision and action ownership
* Administrative actions

Do not use hardcoded timeline items.

Audit records must be read-only.

## 9. Bulk-operation foundation

Prepare reusable data and validation support for:

* CSV user import
* Bulk invitation
* Bulk activation or deactivation
* Bulk role assignment
* Bulk organization transfer
* Bulk 2FA requirement

Keep unfinished bulk controls hidden from the visible Phase 1 interface.

Do not create fake import success without row-level validation.

## 10. Cross-module integration

Verify canonical users are used by:

* Organization-unit member lists
* Unit-head selectors
* Reporting-manager selectors
* Agenda owners
* Agenda presenters
* Document owners
* Document access controls
* Meeting participants
* Quorum participants
* Meeting chairperson
* Meeting secretary
* Minutes reviewers
* Decision owners
* Resolution owners
* Action owners
* Audit actors

Deactivating or archiving a user must not break these historical relationships.

New assignments must show only eligible active users unless the workflow explicitly supports inactive users.

## 11. Permission enforcement

Use existing role and permission utilities to control:

* Viewing users
* Creating users
* Editing users
* Assigning roles
* Viewing effective permissions
* Suspending users
* Deactivating users
* Managing security state
* Viewing audit history
* Restoring archived users

Hide unauthorized actions rather than showing controls that always fail.

Also enforce permissions inside action handlers.

## 12. Final end-to-end validation

Test this complete journey:

1. Create or select a branch, division, and department.
2. Create or select a designation.
3. Create or select a system role.
4. Add an internal employee using a unique email.
5. Assign designation, manager, role, and department.
6. Preview effective permissions.
7. Save as Draft.
8. Send an invitation.
9. Open and complete simulated activation.
10. Confirm Active status.
11. Transfer the user to another department.
12. Change the role and review permission differences.
13. Require 2FA.
14. Suspend and restore the user.
15. Lock and unlock the account.
16. Revoke sessions.
17. Add governance membership.
18. Select the user as an agenda owner.
19. Select the user as a meeting participant.
20. Select the user as an action owner.
21. Deactivate the user.
22. Confirm historical records remain available.
23. Archive and restore the user.
24. Refresh after every major action and confirm persistence.

Also test:

* Duplicate email
* Duplicate employee ID
* Invalid organization path
* Inactive role
* Inactive designation
* Expired invitation
* Cancelled invitation
* External-user access expiry
* Unauthorized administrator
* Conflicting edit
* Missing registry data
* Empty and loading states
* Desktop and mobile

## 13. Final cleanup

After all tests pass:

* Remove confirmed-unused duplicate user data.
* Remove obsolete tax-related user roles and permissions from visible UI.
* Remove irrelevant Print and Download actions.
* Remove hardcoded user activity.
* Remove broken or duplicate invitation controls.
* Keep future SSO, SCIM, directory, maker-checker, and bulk-import foundations hidden.
* Fix broken imports, type mismatches, and console errors.
* Update user-management documentation.

## Completion criteria

User Management is complete only when:

* One canonical user record drives the entire project.
* User creation, editing, invitation, activation, transfer, role change, security state, suspension, deactivation, archive, and restore work.
* Every permanent action persists after refresh.
* Every sensitive change creates an audit event.
* Roles and organization counts stay correct.
* Permissions control both UI and action handlers.
* Mobile and desktop journeys are complete.
* EN and BN remain equivalent.
* Type checking passes.
* Tests pass.
* Production build succeeds.
* No new console errors remain.

# Golden Rules

* Do not break solved issues.
* Do not change unrelated modules.
* Do not create another identity system.
* Do not expose unfinished Phase 2 features.
* Keep future foundations in code but hidden from the UI.
* Preserve historical accountability.
* Reuse existing components, registries, styles, and validation patterns.
* Test the full user lifecycle before marking User Management complete.
