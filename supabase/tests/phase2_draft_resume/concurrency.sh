#!/usr/bin/env bash
set -euo pipefail
# Only the disposable fixture retained by journey.psql. Never use hosted credentials.
p() { docker exec -i convay-phase2-resume psql -X -v ON_ERROR_STOP=1 -U postgres -d convay_phase2 "$@"; }
wait_holder() {
  for n in $(seq 1 100); do
    if [[ "$(p -Atc "select count(*) from pg_stat_activity where application_name='phase2-authority-holder' and wait_event='PgSleep'")" == 1 ]]; then return; fi
    sleep 0.1
  done
  echo "fixture holder did not reach sleep" >&2; exit 1
}
check_draft() {
  local expected="$1"
  p -v expected="$expected" <<'SQL'
BEGIN;
SELECT set_config('convay.test_expected', :'expected',true);
SELECT set_config('convay.test_draft',d.draft_id,true),
 set_config('convay.test_create',jsonb_build_object('request_id',r.request_id,'template_id',d.template_id,'template_revision',d.template_revision,'meeting_title',d.title,'values',d.values_json,'wizard_step_id',d.wizard_step_id,'partial_save',true)::text,true)
FROM convay_private.company_meeting_draft_staging d
JOIN convay_private.tenant_meeting_draft_receipts r ON r.receipt->>'draft_id'=d.draft_id AND r.intent ? 'partial_save'
WHERE d.title='Retained partial draft';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
DO $$
DECLARE a uuid:='11111111-1111-4111-8111-111111111111';
 id text:=current_setting('convay.test_draft');
 payload jsonb:=current_setting('convay.test_create')::jsonb;
 action text;
 expected text:=current_setting('convay.test_expected');
BEGIN
 IF id IS NULL OR payload IS NULL THEN RAISE EXCEPTION 'Missing fixture'; END IF;
 BEGIN
  PERFORM public.convay_company_meeting_drafts('create',a,payload);
  RAISE EXCEPTION 'Unauthorized create receipt replay';
 EXCEPTION WHEN lock_not_available OR insufficient_privilege THEN
  IF SQLSTATE<>expected THEN RAISE; END IF;
 END;
 FOREACH action IN ARRAY ARRAY['read','update','discard'] LOOP
  BEGIN
   PERFORM public.convay_company_draft_lifecycle(action,a,jsonb_build_object('draft_id',id,'request_id','44444444-4444-4444-8444-444444444444','expected_revision',1,'meeting_title','Denied update','values','{}'::jsonb,'wizard_step_id','details','partial_save',true));
   RAISE EXCEPTION 'Unauthorized lifecycle action %',action;
  EXCEPTION WHEN lock_not_available OR insufficient_privilege THEN
   IF SQLSTATE<>expected THEN RAISE; END IF;
  END;
 END LOOP;
END $$;
ROLLBACK;
SQL
}
membership_revoke="update convay_private.tenant_memberships set membership_state='revoked',revoked_at=now() where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and tenant_id='11111111-1111-4111-8111-111111111111'"
membership_restore="update convay_private.tenant_memberships set membership_state='active',revoked_at=null where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and tenant_id='11111111-1111-4111-8111-111111111111'"
tenant_suspend="update convay_private.tenants set lifecycle_state='suspended' where id='11111111-1111-4111-8111-111111111111'"
tenant_restore="update convay_private.tenants set lifecycle_state='active' where id='11111111-1111-4111-8111-111111111111'"
profile_suspend="update public.user_profiles set account_status='suspended' where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'"
profile_restore="update public.user_profiles set account_status='active' where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'"
for pair in membership tenant profile; do
  case "$pair" in membership) writer="$membership_revoke"; restore="$membership_restore";; tenant) writer="$tenant_suspend"; restore="$tenant_restore";; profile) writer="$profile_suspend"; restore="$profile_restore";; esac
  p -c "set application_name='phase2-authority-holder'; begin; $writer; select pg_sleep(8); commit;" >"/tmp/phase2-$pair-holder.log" 2>&1 &
  holder=$!
  wait_holder
  check_draft 55P03
  wait "$holder"
  check_draft 42501
  p -c "$restore"
done
# Verify rejected writes did not mutate the staged row or create a receipt.
p <<'SQL'
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM convay_private.company_meeting_draft_staging WHERE title='Retained partial draft' AND edit_revision=1 AND wizard_step_id='details' AND values_json='{}'::jsonb)
 OR EXISTS(SELECT 1 FROM convay_private.tenant_meeting_draft_receipts WHERE request_id='44444444-4444-4444-8444-444444444444') THEN
  RAISE EXCEPTION 'Denied action changed draft or receipt';
 END IF;
END $$;
SQL
# Update first: genuine authorized lifecycle update holds all three authority rows.
p <<'SQL' >/tmp/phase2-update-holder.log 2>&1 &
SET application_name='phase2-authority-holder';
BEGIN;
SELECT set_config('convay.test_draft',draft_id,true) FROM convay_private.company_meeting_draft_staging WHERE title='Retained partial draft';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
SELECT public.convay_company_draft_lifecycle('update','11111111-1111-4111-8111-111111111111',jsonb_build_object('draft_id',current_setting('convay.test_draft'),'request_id','55555555-5555-4555-8555-555555555555','expected_revision',1,'meeting_title','Authorized updated draft','values',jsonb_build_object('purpose','Confirmed'),'wizard_step_id','details','partial_save',true));
SELECT pg_sleep(8);
COMMIT;
SQL
holder=$!
wait_holder
for writer in "$membership_revoke" "$tenant_suspend" "$profile_suspend"; do
  p -v writer="$writer" <<'SQL'
BEGIN;
SET LOCAL lock_timeout='250ms';
SELECT set_config('convay.test_writer', :'writer',true);
DO $$ BEGIN
 BEGIN EXECUTE current_setting('convay.test_writer'); RAISE EXCEPTION 'Authority writer crossed draft lock';
 EXCEPTION WHEN lock_not_available THEN NULL; END;
END $$;
ROLLBACK;
SQL
done
wait "$holder"
p <<'SQL'
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM convay_private.company_meeting_draft_staging WHERE title='Authorized updated draft' AND edit_revision=2 AND wizard_step_id='details' AND values_json=jsonb_build_object('purpose','Confirmed'))
 OR (SELECT count(*) FROM convay_private.tenant_meeting_draft_receipts WHERE request_id='55555555-5555-4555-8555-555555555555')<>1
 OR (SELECT count(*) FROM convay_private.tenant_control_events WHERE request_id='55555555-5555-4555-8555-555555555555')<>1 THEN
  RAISE EXCEPTION 'Committed draft, receipt or audit readback failed';
 END IF;
END $$;
SQL
echo 'PASS: membership, company and actor status-first denials; authorized update-first writer exclusion and exact durable readback (disposable synthetic)'
