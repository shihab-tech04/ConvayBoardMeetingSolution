-- QM-01 isolated restored PostgreSQL acceptance. NEVER run on production.
-- Requires QM migration applied and at least one existing Auth user.
-- All temporary test meeting/link/attendance changes are rolled back.
BEGIN;
DO $qm_test$
DECLARE
  v_owner uuid;
  v_meeting uuid;
  v_link uuid;
  v_host_identity text := 'qh-' || repeat('a', 48);
  v_guest_identity text := 'qg-' || repeat('b', 48);
  v_row public.convay_quick_meeting_attendance;
BEGIN
  SELECT id INTO v_owner FROM auth.users ORDER BY id LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'QM-01 isolated test requires a restored Auth user; do not seed production';
  END IF;

  v_meeting := public.convay_create_quick_meeting(
    v_owner,
    'qmr-' || gen_random_uuid()::text,
    md5(gen_random_uuid()::text) || md5(gen_random_uuid()::text),
    now() + interval '2 hours',
    4,
    'QM-01 attendance test'
  );
  SELECT id INTO STRICT v_link
    FROM public.convay_quick_meeting_links
   WHERE meeting_id = v_meeting AND revoked_at IS NULL;

  v_row := public.convay_record_quick_attendance(v_meeting, v_host_identity, 'host', v_owner, 'Test Host', NULL);
  IF v_row.join_count <> 1 THEN RAISE EXCEPTION 'First host join should count once'; END IF;
  v_row := public.convay_record_quick_attendance(v_meeting, v_host_identity, 'host', v_owner, 'Test Host', NULL);
  IF v_row.join_count <> 1 THEN RAISE EXCEPTION 'Repeated host confirmation inflated count'; END IF;

  v_row := public.convay_record_quick_attendance(v_meeting, v_guest_identity, 'guest', NULL, 'Test Guest', v_link);
  IF v_row.join_count <> 1 THEN RAISE EXCEPTION 'First guest join should count once'; END IF;
  v_row := public.convay_record_quick_attendance(v_meeting, v_guest_identity, 'guest', NULL, 'Test Guest', v_link);
  IF v_row.join_count <> 1 THEN RAISE EXCEPTION 'Repeated guest confirmation inflated count'; END IF;

  PERFORM public.convay_mark_quick_attendance_left(v_meeting, v_guest_identity);
  v_row := public.convay_record_quick_attendance(v_meeting, v_guest_identity, 'guest', NULL, 'Test Guest', v_link);
  IF v_row.join_count <> 2 OR v_row.left_at IS NOT NULL THEN
    RAISE EXCEPTION 'Real guest leave/rejoin did not increment exactly once and clear left_at';
  END IF;

  IF has_table_privilege('anon', 'public.convay_quick_meeting_attendance', 'SELECT')
     OR has_table_privilege('authenticated', 'public.convay_quick_meeting_attendance', 'INSERT')
     OR has_function_privilege('anon', 'public.convay_record_quick_attendance(uuid,text,text,uuid,text,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.convay_record_quick_attendance(uuid,text,text,uuid,text,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Browser role unexpectedly retains direct QM attendance privileges';
  END IF;
END;
$qm_test$;
ROLLBACK;
