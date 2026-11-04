# Convay document workspace / Supabase alignment

Baseline: Main `05df0a9824465aa4c87ca5a1530f646bc883b6d8`, 4 November 2026.

Source audit identified five active `createEntityRegistry` hooks without matching SQL keys: `bms.doc.threads`, `bms.doc.access_grants`, `bms.doc.approvals_v2`, `bms.doc.pack_links`, `bms.doc.acknowledgements`. The affected document workspace includes comments, ACL grants, workflow approvals, board-pack links and acknowledgements.

This additive SQL migration adds those keys, preserves all pre-existing SQL policy predicates while adding document-scope gates for each action, supports record-ID / document-number aliases, cleans related rows during document deletion, and binds immutable acknowledgement evidence to the authenticated user.

No legacy seed data is inserted. Public UI and approved design remain unchanged.

Acceptance gates: PR tests + TypeScript + production build; apply SQL migration and reconcile the assigned live migration-version filename; assert 57/57 live registry types and 0 unauthorised broad-table access; off-GitHub full-history recovery with checksum and restore; protected merge; verify the actual deployed commit and browser routes. Independent DB/Auth/Storage disaster recovery and real multi-user authorization remain Phase 1 blockers.
