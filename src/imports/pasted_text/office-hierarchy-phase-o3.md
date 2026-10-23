# Office Hierarchy — Phase O3: Assignments, Transfers, Closure, Integration, and Audit

Work only on completing operational organization management after O1 and O2 pass validation.

## User assignment

Support assigning active canonical users to units.

Requirements:

* Show current assignment.
* Show designation and role.
* Prevent duplicate primary assignment.
* Confirm whether the operation is an assignment or transfer.
* Update the canonical user record.
* Update member counts.
* Create assignment history.
* Create an audit event.
* Persist after refresh.

Keep additional assignments hidden during Phase 1 unless already complete.

## Unit-head management

Support:

* Assign permanent head
* Assign acting head
* Assign deputy
* Replace head
* End assignment
* Schedule future assignment

Requirements:

* Require effective dates.
* Preserve previous leadership history.
* Allow only one active permanent head.
* Validate user eligibility.
* Create audit events.
* Update the unit detail view immediately.

## User transfer

Require:

* User
* Current path
* New path
* Effective date
* Reason
* Optional new designation
* Optional new manager
* Optional handover user

Before saving, show:

* Open agendas
* Meetings
* Documents
* Pending approvals
* Decisions
* Open actions
* Governance memberships

After saving:

* Update the user’s primary unit IDs.
* Preserve old assignment history.
* Update previous and new member counts.
* Keep historical records unchanged.
* Create an audit event.
* Persist after refresh.

## Move organizational unit

Support moving a unit to another valid parent.

Before moving, show:

* Current path
* Proposed path
* Child units
* Affected users
* Leadership
* Open responsibilities
* Permission-scope impact

Requirements:

* Block cycles.
* Validate parent type.
* Require effective date and reason.
* Recalculate all descendant paths.
* Preserve previous paths in history.
* Do not duplicate children or users.
* Create audit events.

## Deactivation and closure

Before deactivation, inspect:

* Assigned users
* Child units
* Unit head
* Upcoming meetings
* Open agendas
* Pending approvals
* Open actions
* Owned documents

Do not complete deactivation until dependencies are resolved.

Provide actions to:

* Transfer users
* Move child units
* Choose replacement unit
* Reassign leadership
* Cancel deactivation

A deactivated unit must:

* Remain in history
* Reject new assignments
* Reject new child units
* Be hidden from new meeting-participant selection
* Remain visible in old records

## Permissions

Enforce separate permissions for:

* View structure
* Create units
* Edit units
* Move units
* Assign unit heads
* Assign users
* Transfer users
* Activate units
* Deactivate units
* Archive units
* View history
* View audit

Enforce permissions in both the interface and handlers.

Use deny-by-default behavior.

## Cross-module integration

Use the organization hierarchy in:

* User Management
* Meeting-participant selection
* Quorum selection
* Agenda ownership
* Document access
* Role organizational scope
* Notification targeting
* Reports
* Audit

Provide reusable functions for resolving:

* Direct unit users
* Descendant-unit users
* Eligible active users
* Deduplicated user lists

## Required end-to-end test

Test:

1. Create Head Office.
2. Create a branch.
3. Create a division.
4. Create a department.
5. Assign a unit head.
6. Assign users.
7. Transfer a user.
8. Replace a unit head.
9. Move a department.
10. Attempt a circular move.
11. Attempt deactivation with unresolved dependencies.
12. Resolve dependencies.
13. Deactivate the unit.
14. Verify historical records.
15. Restore an archived unit.
16. Refresh after every major action.

Also test:

* Duplicate unit code
* Invalid parent type
* Inactive parent
* Inactive user
* Unauthorized administrator
* Draft deletion with dependencies
* Desktop and mobile
* EN and BN

## Final cleanup

* Remove free-text parent assignment.
* Remove static member counts.
* Remove duplicate hierarchy data.
* Remove hardcoded leadership and history.
* Hide unfinished regional-office, section, team, bulk-transfer, and restructuring features.
* Keep their reusable foundations for the final 100% system.
* Fix type errors, broken imports, and console errors.

## Completion criteria

Office and Organizational Hierarchy is complete only when:

* Units use one canonical hierarchy.
* Users and heads use canonical user IDs.
* Transfers preserve history.
* Moves prevent cycles.
* Deactivation resolves dependencies.
* Counts remain correct.
* Cross-module unit-user resolution works.
* Permissions are enforced.
* Desktop and mobile work.
* Type checking, tests, and production build pass.

# Golden Rules

* Do not break User Management.
* Do not modify unrelated journeys.
* Do not mix governance bodies with office hierarchy.
* Do not delete historical relationships.
* Do not expose unfinished final-20% features.
* Reuse existing components, registries, validation, and styles.
