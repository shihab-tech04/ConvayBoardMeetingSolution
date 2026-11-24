-- TEN-ONB-03: prevent a pending invitation from breaking the existing
-- authorized Auth-user deletion flow. Tenant audit events remain immutable.
-- Only the unclaimed/claimed invitation pointer is removed on user deletion.
ALTER TABLE convay_private.pending_company_invites
  DROP CONSTRAINT IF EXISTS pending_company_invites_user_id_fkey;
ALTER TABLE convay_private.pending_company_invites
  ADD CONSTRAINT pending_company_invites_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id)
  ON DELETE CASCADE;
