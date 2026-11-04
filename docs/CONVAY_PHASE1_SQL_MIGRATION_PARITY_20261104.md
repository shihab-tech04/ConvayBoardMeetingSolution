# Convay Phase 1 — SQL migration-history parity

Audit checkpoint: 2026-11-04; production Main prior to this PR: `6e94168f1355a51073eb085819964f6e049b07b6`.

## Verified facts
- Supabase project: `cnrueblhgvdonplirlhv` (Board meeting solution).
- Applied migration history: 27 entries; source repository has 27 SQL migrations.
- Seven source file timestamp prefixes differed from the already-applied Supabase version IDs. Migration **names and effect are not being changed** by this PR.
- Six of these seven migration files matched their corresponding stored Supabase migration SQL byte-for-byte after trim. The authenticated-write-grants migration has equivalent SQL statements with additional source comments.
- These corrections rename the source SQL files to the actual applied version IDs; the repository regression tests referencing filenames are updated.
- No database DDL/DML, business data, Auth user, Storage object, or deployed Edge Function is changed by this PR.
- The public member-directory SECURITY DEFINER function is exposed to signed-in callers by design with active-user and permission checks; maintain this warning as an explicit review item, not an unexamined PASS.

## Applied version -> migration
- `20261104010913`: `convay_authenticated_write_grants` (previous source prefix `20261104005500`)
- `20261104014427`: `convay_protect_status_transitions` (previous source prefix `20261104014000`)
- `20261104034244`: `convay_close_minutes_approval_alias` (previous source prefix `20261104094000`)
- `20261104042801`: `convay_member_directory_least_privilege` (previous source prefix `20261104102000`)
- `20261104045912`: `convay_meeting_interactions_append_only` (previous source prefix `20261104124500`)
- `20261104053441`: `convay_link_reference_integrity` (previous source prefix `20261104130000`)
- `20261104060508`: `convay_vote_reference_integrity` (previous source prefix `20261104162000`)

## Phase 1 gates still open (do **not** mark complete)
- Independently confirm current Main and independently restore a current full-history off-GitHub archive before release.
- Establish tested database schema **and data**, Supabase Auth, Storage object, policies, and Edge Function backups and restore procedure. The existing Drive SQL catalogue redacts profile data and excludes Auth secrets.
- Reconcile live database functions, grants, RLS, triggers, indexes and Edge Function hashes with tracked source across all 27 migrations.
- Validate least-privilege multi-user access with dedicated test identities (not a sole Super Admin).
- Review Supabase security advisors (notably signed-in SECURITY DEFINER member directory and leaked-password protection) and the currently unindexed foreign keys.
- Run full requirements / acceptance evidence against the authorized 353-requirement list and 15 end-to-end scenarios before declaring full eight-phase completion.

## Release policy
Protected PR only; production release and independent backup verification are required before any LIVE claim. Keep the approved UI unchanged.
