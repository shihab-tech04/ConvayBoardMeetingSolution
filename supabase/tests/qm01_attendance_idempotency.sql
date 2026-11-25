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

-- Exercise company attribution, current host revalidation and SQL privilege denial.
BEGIN;
DO $scope_test$
DECLARE
  u uuid := '11111111-1111-4111-8111-111111111111';
  a uuid := 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  b uuid := 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  m uuid; l uuid; s jsonb;
BEGIN
  s:=public.convay_quick_host_scope(u);
  IF s IS DISTINCT FROM '{"allowed":true,"tenant_id":null}'::jsonb THEN RAISE EXCEPTION 'Legacy host scope failed'; END IF;
  INSERT INTO convay_private.tenants VALUES (a,'active'),(b,'active');
  INSERT INTO convay_private.tenant_memberships(tenant_id,user_id) VALUES(a,u);
  m:=public.convay_create_quick_meeting(u,'qmr-'||gen_random_uuid(),repeat('a',64),now()+interval '2 hours',4,'Scoped QM');
  IF (SELECT tenant_id FROM public.convay_quick_meetings WHERE id=m) IS DISTINCT FROM a THEN RAISE EXCEPTION 'Company scope not persisted'; END IF;
  IF NOT public.convay_quick_meeting_scope_valid(m) THEN RAISE EXCEPTION 'Active company scope denied'; END IF;
  SELECT id INTO l FROM public.convay_quick_meeting_links WHERE meeting_id=m;
  BEGIN
    UPDATE public.convay_quick_meetings SET tenant_id=b WHERE id=m;
    RAISE EXCEPTION 'Company reassignment unexpectedly permitted';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  INSERT INTO convay_private.tenant_memberships(tenant_id,user_id) VALUES(b,u);
  IF public.convay_quick_meeting_scope_valid(m) THEN RAISE EXCEPTION 'Ambiguous scope accepted'; END IF;
  DELETE FROM convay_private.tenant_memberships WHERE tenant_id=b;
  UPDATE convay_private.tenants SET lifecycle_state='suspended' WHERE id=a;
  IF public.convay_quick_meeting_scope_valid(m) THEN RAISE EXCEPTION 'Suspended company accepted'; END IF;
  BEGIN
    PERFORM public.convay_record_quick_attendance(m,'qg-'||repeat('b',48),'guest',NULL,'Guest',l);
    RAISE EXCEPTION 'Suspended host accepted guest attendance';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE convay_private.tenants SET lifecycle_state='active' WHERE id=a;
  UPDATE public.user_profiles SET can_create=false WHERE user_id=u;
  IF public.convay_quick_meeting_scope_valid(m) THEN RAISE EXCEPTION 'Revoked create permission accepted'; END IF;
  UPDATE public.user_profiles SET can_create=true WHERE user_id=u;
  INSERT INTO public.convay_quick_meeting_removed_guests(meeting_id,livekit_identity,removed_by) VALUES(m,'qg-'||repeat('b',48),u);
  BEGIN
    PERFORM public.convay_record_quick_attendance(m,'qg-'||repeat('b',48),'guest',NULL,'Guest',l);
    RAISE EXCEPTION 'Removed guest accepted by SQL';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  UPDATE convay_private.tenant_memberships SET membership_state='revoked',revoked_at=now() WHERE tenant_id=a;
  IF public.convay_quick_meeting_scope_valid(m) THEN RAISE EXCEPTION 'Revoked company membership accepted'; END IF;
  IF has_function_privilege('anon','public.convay_quick_host_scope(uuid)','EXECUTE') OR has_function_privilege('authenticated','public.convay_quick_meeting_scope_valid(uuid)','EXECUTE') THEN RAISE EXCEPTION 'Browser scope RPC access'; END IF;
END $scope_test$;
ROLLBACK;
