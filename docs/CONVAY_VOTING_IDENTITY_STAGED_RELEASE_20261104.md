# Convay live voting identity and SQL-enforcement rollout

Baseline: deployed Main `cb910ac30453d870cb3b30ea7e7bb71be8ff4bac`.
Scope: meeting participant identity, role-scoped voting controls and canonical voter evidence.
The approved visual design and navigation remain unchanged.

## Stage A — frontend first (this pull request)

- Prefer SQL-backed meeting-participant user IDs; never grant votes from a display-only fallback participant.
- Require present, voting-eligible, non-recused membership before casting or closing a ballot.
- Gate voting management, meeting control, attendance, temporary agenda and minutes drafting on the corresponding effective SQL permission codes.
- Persist both `voter_id` and `ballot_session_id` in each named vote record.
- Reject the historical shared `"self"` alias; use the signed-in user's canonical ID.
- Keep existing SQL contract compatible; **do not apply the new eligibility trigger yet**.

## Stage B — SQL verification and enforcement (separate protected release)

Once Stage A has merged, passed CI and been verified at the actual public production URL:
1. Recheck that no open user session depends on obsolete vote payloads; on 4 November 2026 the database had **0 meeting rows and 0 vote rows**.
2. Add a unique per-voter, per-session ballot index and an append-only, Auth-linked eligibility trigger.
3. Test server-side rejected anonymous, ineligible, duplicate and unauthorized proxy ballots; retain authorized Chair/Secretary summaries.
4. Reconcile the live Supabase migration-generated version to Git source; verify every migration, RLS policy, function, trigger and index.
5. Independently archive and restore full pre-merge Git history outside GitHub, use protected PR review, deploy and verify the exact public release SHA.

## Remaining acceptance limits

A static role/UI test, zero-data SQL audit and successful Pages browser smoke test do **not** establish multi-user voting, secret-ballot governance sign-off or full disaster recovery. The project still has one real Auth user and no production meeting activity. Real maker/checker/voter UAT, complete database/Auth/Storage restore, organization-specific voting policy approvals, and the 353 requirement / 15 E2E acceptance matrix remain open.
