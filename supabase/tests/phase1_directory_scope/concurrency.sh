#!/usr/bin/env bash
set -euo pipefail
# Only disposable fixture. The container must have completed rehearsal with
# keep_concurrency_fixture=1. Never connect to a hosted database.
p() { docker exec -i convay-phase1-scope psql -X -v ON_ERROR_STOP=1 -U postgres -d fixture "$@"; }
wait_holder() {
  local name="$1"
  for n in $(seq 1 80); do
    if [[ "$(p -Atc "select count(*) from pg_stat_activity where application_name='$name' and wait_event='PgSleep'")" == 1 ]]; then return; fi
    sleep 0.1
  done
  echo "holder never reached sleep: $name" >&2; exit 1
}
# Membership first: assignment must fail while an invisible insert is open.
p -c "set application_name='phase1-membership-holder'; begin; insert into convay_private.tenant_memberships values ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','active',null); select pg_sleep(12); commit;" >/tmp/phase1-membership-holder.log 2>&1 &
holder=$!
wait_holder phase1-membership-holder
p <<'SQL'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 BEGIN PERFORM public.convay_assign_org_member('00000000-0000-4000-8000-000000000002','department-global','branch-global','transfer','30000000-0000-4000-8000-000000000010','Concurrent membership'); RAISE EXCEPTION 'Concurrent membership allowed assignment'; EXCEPTION WHEN lock_not_available THEN NULL; END;
END $$;
ROLLBACK;
SQL
wait "$holder"
p <<'SQL'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 BEGIN PERFORM public.convay_assign_org_member('00000000-0000-4000-8000-000000000002','department-global','branch-global','transfer','30000000-0000-4000-8000-000000000010','Concurrent membership'); RAISE EXCEPTION 'Committed membership allowed assignment'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
BEGIN ISOLATION LEVEL REPEATABLE READ;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 BEGIN PERFORM public.convay_assign_org_member('00000000-0000-4000-8000-000000000005',NULL,'branch-global','assign','30000000-0000-4000-8000-000000000011'); RAISE EXCEPTION 'Stale transaction accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
END $$;
ROLLBACK;
SQL
# Assignment first: real membership insert must wait, then time out without write.
p <<'SQL' >/tmp/phase1-assignment-holder.log 2>&1 &
SET application_name='phase1-assignment-holder';
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT public.convay_assign_org_member('00000000-0000-4000-8000-000000000005',NULL,'branch-global','assign','30000000-0000-4000-8000-000000000012');
SELECT pg_sleep(12);
COMMIT;
SQL
holder=$!
wait_holder phase1-assignment-holder
p <<'SQL'
BEGIN;
SET LOCAL lock_timeout='250ms';
DO $$ BEGIN
 BEGIN INSERT INTO convay_private.tenant_memberships VALUES ('20000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000005','active',null); RAISE EXCEPTION 'Membership insert crossed assignment lock'; EXCEPTION WHEN lock_not_available THEN NULL; END;
END $$;
ROLLBACK;
SQL
wait "$holder"
p <<'SQL'
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM convay_private.tenant_memberships WHERE user_id='00000000-0000-4000-8000-000000000005') OR (SELECT count(*) FROM convay_private.org_member_assignment_events)<>3 OR (SELECT count(*) FROM convay_private.org_member_assignment_receipts)<>3 OR (SELECT profile_data->>'primary_org_unit_id' FROM public.user_profiles WHERE user_id='00000000-0000-4000-8000-000000000005') IS DISTINCT FROM 'branch-global' THEN RAISE EXCEPTION 'Concurrency audit, profile or membership invariant violated'; END IF;
END $$;
SQL
echo 'PASS: membership-first denial, committed membership denial, stale isolation rejection, assignment-first writer exclusion and durable audit (disposable synthetic)'

# Actor status first: even an existing receipt must not bypass concurrent status changes.
p -c "set application_name='phase1-actor-holder'; begin; update public.user_profiles set account_status='suspended' where user_id='00000000-0000-4000-8000-000000000001'; select pg_sleep(12); commit;" >/tmp/phase1-actor-holder.log 2>&1 &
holder=$!
wait_holder phase1-actor-holder
p <<'SQL'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 BEGIN PERFORM public.convay_assign_org_member('00000000-0000-4000-8000-000000000005',NULL,'branch-global','assign','30000000-0000-4000-8000-000000000012'); RAISE EXCEPTION 'Concurrent actor suspension allowed receipt replay'; EXCEPTION WHEN lock_not_available THEN NULL; END;
END $$;
ROLLBACK;
SQL
wait "$holder"
p <<'SQL'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 BEGIN PERFORM public.convay_assign_org_member('00000000-0000-4000-8000-000000000005',NULL,'branch-global','assign','30000000-0000-4000-8000-000000000012'); RAISE EXCEPTION 'Suspended actor allowed receipt replay'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
ROLLBACK;
UPDATE public.user_profiles SET account_status='active' WHERE user_id='00000000-0000-4000-8000-000000000001';
INSERT INTO public.user_profiles(user_id,display_name,email,phone,employee_id,user_type,account_role,account_status) VALUES ('00000000-0000-4000-8000-000000000007','Handover','handover@example.invalid','','H','staff','user','active');
SQL
# Handover status first: a transfer may not use an identity being suspended.
p -c "set application_name='phase1-handover-holder'; begin; update public.user_profiles set account_status='suspended' where user_id='00000000-0000-4000-8000-000000000007'; select pg_sleep(12); commit;" >/tmp/phase1-handover-holder.log 2>&1 &
holder=$!
wait_holder phase1-handover-holder
p <<'SQL'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 BEGIN PERFORM public.convay_assign_org_member('00000000-0000-4000-8000-000000000005','branch-global','department-global','transfer','30000000-0000-4000-8000-000000000013','Approved handover',NULL,CURRENT_DATE,'00000000-0000-4000-8000-000000000007'); RAISE EXCEPTION 'Concurrent handover suspension allowed transfer'; EXCEPTION WHEN lock_not_available THEN NULL; END;
END $$;
ROLLBACK;
SQL
wait "$holder"
p <<'SQL'
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
DO $$ BEGIN
 BEGIN PERFORM public.convay_assign_org_member('00000000-0000-4000-8000-000000000005','branch-global','department-global','transfer','30000000-0000-4000-8000-000000000013','Approved handover',NULL,CURRENT_DATE,'00000000-0000-4000-8000-000000000007'); RAISE EXCEPTION 'Suspended handover accepted'; EXCEPTION WHEN check_violation THEN NULL; END;
END $$;
ROLLBACK;
UPDATE public.user_profiles SET account_status='active' WHERE user_id='00000000-0000-4000-8000-000000000007';
SQL
# Transfer first: all involved profiles are protected through commit.
p <<'SQL' >/tmp/phase1-profile-transfer-holder.log 2>&1 &
SET application_name='phase1-profile-transfer-holder';
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
SELECT public.convay_assign_org_member('00000000-0000-4000-8000-000000000005','branch-global','department-global','transfer','30000000-0000-4000-8000-000000000013','Approved handover',NULL,CURRENT_DATE,'00000000-0000-4000-8000-000000000007');
SELECT pg_sleep(12);
COMMIT;
SQL
holder=$!
wait_holder phase1-profile-transfer-holder
p <<'SQL'
BEGIN;
SET LOCAL lock_timeout='250ms';
DO $$ DECLARE u uuid; BEGIN
 FOREACH u IN ARRAY ARRAY['00000000-0000-4000-8000-000000000001'::uuid,'00000000-0000-4000-8000-000000000005'::uuid,'00000000-0000-4000-8000-000000000007'::uuid] LOOP
  BEGIN UPDATE public.user_profiles SET account_status='suspended' WHERE user_id=u; RAISE EXCEPTION 'Profile status write crossed transfer lock'; EXCEPTION WHEN lock_not_available THEN NULL; END;
 END LOOP;
END $$;
ROLLBACK;
SQL
wait "$holder"
p <<'SQL'
DO $$ BEGIN
 IF (SELECT count(*) FROM convay_private.org_member_assignment_events)<>4 OR (SELECT count(*) FROM convay_private.org_member_assignment_receipts)<>4 OR (SELECT profile_data->>'primary_org_unit_id' FROM public.user_profiles WHERE user_id='00000000-0000-4000-8000-000000000005') IS DISTINCT FROM 'department-global' OR (SELECT count(*) FROM public.user_profiles WHERE user_id IN ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-000000000007') AND account_status='active')<>3 THEN RAISE EXCEPTION 'Profile concurrency or audit invariant violated'; END IF;
END $$;
SQL
echo 'PASS: actor status-first replay denial, handover status-first denial, transfer-first profile writer exclusion, retry and exact audit readback (disposable synthetic)'
