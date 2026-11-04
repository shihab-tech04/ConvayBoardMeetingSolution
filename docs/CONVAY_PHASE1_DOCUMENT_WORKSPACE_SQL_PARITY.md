# Convay document workspace / Supabase alignment

Baseline: Main `05df0a9824465aa4c87ca5a1530f646bc883b6d8`, 4 November 2026.

Source audit identified five active `createEntityRegistry` hooks without matching SQL keys: `bms.doc.threads`, `bms.doc.access_grants`, `bms.doc.approvals_v2`, `bms.doc.pack_links`, `bms.doc.acknowledgements`. The affected document workspace includes comments, ACL grants, workflow approvals, board-pack links and acknowledgements.

This additive SQL migration adds those keys, preserves all pre-existing SQL policy predicates while adding document-scope gates for each action, supports record-ID / document-number aliases, cleans related rows during document deletion, and binds immutable acknowledgement evidence to the authenticated user.

No legacy seed data is inserted. Public UI and approved design remain unchanged.

Acceptance gates: PR tests + TypeScript + production build; apply SQL migration and reconcile the assigned live migration-version filename; assert 57/57 live registry types and 0 unauthorised broad-table access; off-GitHub full-history recovery with checksum and restore; protected merge; verify the actual deployed commit and browser routes. Independent DB/Auth/Storage disaster recovery and real multi-user authorization remain Phase 1 blockers.

## Migration history verification (2026-11-04)

The migration was applied successfully once through the Supabase project connector.
An intermediate read transiently showed two records; subsequent independent
`list_migrations` and direct `supabase_migrations.schema_migrations` queries
both converge on **one** authoritative entry,
`20261104171825_convay_document_workspace_registry_parity`.
Its SQL payload is 16,847 bytes with MD5
`a238cb4749cc0c074bc47d4845fa4455`, matching the source SQL exactly.
The source tracks the single verified entry; no database history edits were made.
