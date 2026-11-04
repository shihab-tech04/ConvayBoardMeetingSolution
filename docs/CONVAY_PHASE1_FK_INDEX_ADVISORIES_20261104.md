# Supabase FK indexing — Convay Phase 1

Source baseline: `8fade305c04655171c46f9b28a553c4988f3a738`.
Target: exactly 10 missing foreign-key lookup indexes reported by Supabase performance advisors.
SQL change: `supabase/migrations/20261104081645_convay_foreign_key_lookup_indexes.sql`.

The migration is intentionally additive, idempotent and touches only indexes. It does not alter data, Auth, RLS, permissions, storage or UI.

## Validation before declaring completion
- PR checks and full test suite pass.
- Independently verify a full-Git-history pre-release archive off GitHub and restore/checksum.
- Apply the approved migration through Supabase migration history and rename the SQL file to the assigned version ID, if necessary, before merge.
- Confirm all 10 indexes exist, all 10 missing-FK advisor findings disappear and version/name/source SQL parity holds.
- Merge through protected PR and verify live Pages release commit, bundle, routes and browser reloads.
- **Do not mark Phase 1 100%** until Auth/Storage/DB restore, user-permission integration acceptance, and requirements evidence are complete.
