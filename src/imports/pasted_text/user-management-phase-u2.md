# User Management — Phase U2: Complete Add, Edit, List, and Detail Journeys

Work only on the visible User Management experience after Phase U1 is stable.

Inspect and update:

* `src/app/components/users/UserFormModal.tsx`
* `src/app/components/users/UserComponents.tsx`
* `src/app/pages/administration-requests/UserManagementPage.tsx`
* Existing role, permission, designation, organization-picker, status, modal, drawer, table, mobile-card, and validation components

Reuse the project’s existing design system. Do not redesign unrelated pages.

## 1. User Management page

Create one clear operational page with:

* Page heading
* User count summary
* Add User button
* Search
* Relevant filters
* Sort
* User table on desktop
* User cards on mobile
* Empty, loading, error, and permission-denied states

## 2. Table columns

Use these primary columns:

1. Employee or External ID
2. User
3. Email
4. User Type
5. Designation
6. Primary Role
7. Organization
8. Account Status
9. Invitation Status
10. Last Active
11. Action

Keep only one View action in each row.

Move secondary actions into the detail drawer.

## 3. Search and filters

Search by:

* Name
* Display name
* Email
* Employee ID
* External reference ID
* Phone
* Role
* Designation
* Organization unit

Filters:

* User type
* Account status
* Invitation status
* Role
* Designation
* Branch
* Division
* Department
* 2FA status
* Access expiry
* Last-active range

Requirements:

* Filters must use canonical registries.
* Branch selection must limit division options.
* Division selection must limit department options.
* Show active filter count.
* Support Clear All.
* Keep search and filter state when opening and closing a drawer.
* On mobile, use the project’s existing bottom-sheet filter pattern.

## 4. Add User flow

Use a step-based full-page modal only if the current project uses steppers for complex forms. Otherwise use the existing structured modal pattern.

Recommended steps:

### Step 1 — User type and identity

Fields:

* User type
* Official email
* Full name
* Display name
* Employee ID or external reference ID
* Phone
* Preferred language
* Time zone

Behavior:

* Check email duplication immediately.
* Check employee ID duplication immediately.
* Change required fields according to user type.
* Do not show internal employment fields for external participants.
* Keep Service Account hidden.

### Step 2 — Organization and designation

For internal employees:

* Branch
* Division
* Department
* Primary organizational unit
* Designation
* Position
* Reporting manager
* Employment type
* Employment start date
* Optional employment end date

Behavior:

* Use the actual organization tree.
* Limit child selectors based on selected parents.
* Show the full organization path.
* Show only active designations and managers.
* Prevent invalid hierarchy combinations.

For governance members:

* Allow an office assignment when they are also employees.
* Keep governance membership separate.

For external participants:

* Organization name
* External designation
* Internal sponsor
* Access expiry date

### Step 3 — Role and permissions

Fields:

* Primary role
* Optional additional roles
* Access start date
* Access expiry date
* Require 2FA

Show:

* Role description
* Permission groups
* Effective permissions
* Sensitive permissions
* Organizational scope
* Permission conflicts

Do not allow inactive roles.

### Step 4 — Governance memberships

When applicable, support:

* Board or committee
* Membership role
* Voting eligibility
* Quorum eligibility
* Membership start date
* Membership end date

Allow skipping this step when no membership is needed.

### Step 5 — Invitation and review

Actions:

* Save as Draft
* Save and Send Invitation
* Create Active User without Invitation, only for authorized administrators

Show a complete summary of:

* Identity
* User type
* Organization
* Designation
* Manager
* Roles
* Effective permissions
* Governance memberships
* Access dates
* Invitation behavior
* 2FA requirement

Require confirmation before saving.

## 5. Add-user result

After creation:

* Persist the user.
* Create organizational and role relationships.
* Recalculate counts.
* Create an audit event.
* Create an invitation record when required.
* Show success feedback.
* Add the user to the list immediately.
* Open the new user’s detail drawer or return to the current filtered list.

Do not duplicate the user in another registry.

## 6. Edit User flow

Allow editing:

* Identity
* Contact information
* Designation
* Position
* Manager
* Organizational assignment
* Roles
* Governance memberships
* Access dates
* 2FA requirement

Before saving sensitive changes:

* Show previous and new values.
* Require a reason for role, organization, account-status, and sensitive-access changes.
* Warn when permissions are added or removed.
* Warn when transferring a user who owns open agenda, meeting, decision, or action records.
* Preserve assignment and role-change history.

Email and employee ID changes should require duplicate validation.

## 7. User detail drawer

Use tabs or clear sections:

### Profile

* Name
* User type
* Employee or external ID
* Email
* Phone
* Preferred language
* Account status
* Invitation status
* Access dates

### Organization

* Full hierarchy path
* Designation
* Position
* Reporting manager
* Employment information
* Additional assignments when available

### Access

* Primary role
* Additional roles
* Effective permissions
* Sensitive permissions
* Governance memberships
* Voting and quorum eligibility

### Security

* 2FA requirement
* 2FA enrollment
* Last login
* Last activity
* Failed-login count
* Lock state
* Active-session summary
* Password-reset state

### Activity

* Invitation activity
* Role changes
* Organization transfers
* Account-status changes
* Meeting participation
* Agenda ownership
* Document ownership
* Assigned actions

### Audit

* Actor
* Action
* Date and time
* Previous value
* New value
* Reason

## 8. Contextual actions

Show actions only when valid for the selected user state and current administrator permission.

Possible drawer actions:

* Edit User
* Assign or Change Role
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

Do not show irrelevant Print or Download actions as primary controls.

Delete is allowed only for a safe Draft user with no history.

## 9. Status-change behavior

Every status change must:

* Show a confirmation modal.
* Explain the impact.
* Require a reason for suspension, deactivation, and archive.
* Persist the change.
* Create an audit event.
* Preserve historical relationships.
* Revoke active access when appropriate.
* Update the table, drawer, role count, and organization count.

## 10. Mobile behavior

* Use user cards instead of compressed tables.
* Tapping the full card opens the detail drawer.
* Do not add a separate View Details button.
* Keep search and filter controls accessible.
* Use the project’s existing bottom-sheet filters.
* Use full-width fields.
* Keep role-permission preview below the role selector.
* Keep actions in the drawer footer or action sheet.
* Prevent horizontal overflow.
* Preserve comfortable tap targets.

## 11. States and feedback

Add complete states for:

* Loading
* Saving
* Sending invitation
* No users
* No search results
* No filter results
* Missing roles
* Missing designations
* Missing organization units
* Duplicate email
* Duplicate employee ID
* Invalid hierarchy
* Failed save
* Failed migration
* Permission denied
* Conflicting edit
* User changed by another administrator

Use clear recovery actions.

## Completion criteria

This phase is complete only when:

* An administrator can create every supported Phase 1 user type.
* Role, designation, organization, manager, invitation, and access data persist.
* The user appears in the correct role and organization counts.
* Editing and transferring the user work after refresh.
* The drawer shows complete operational details.
* Actions appear only when relevant.
* Desktop and mobile flows both work.
* EN and BN remain equivalent.
* No existing user-management feature is removed.
* Type checking, tests, and production build pass.

# Golden Rules

* Do not modify unrelated modules.
* Do not create new visual styles.
* Reuse existing components and responsive patterns.
* Do not keep permanent actions only in component state.
* Do not duplicate user records.
* Do not mix governance membership with office hierarchy.
* Preserve historical records during every change.
