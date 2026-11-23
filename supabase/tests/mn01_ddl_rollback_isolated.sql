-- MN-01 additive trigger rollback smoke test (DISPOSABLE DATABASE ONLY).
-- This is NOT a Supabase production migration-history rollback procedure.
-- Production reversal additionally requires reviewed Supabase migration history
-- reconciliation, a verified pre-release recovery point, and authorization.
begin;
do $check$
declare v_count integer;
begin
  select count(*) into v_count from pg_trigger
   where tgrelid='public.convay_entity_records'::regclass
     and not tgisinternal
     and tgname in ('convay_a0_minutes_before_insert',
                    'convay_a0_minutes_before_update',
                    'convay_a0_minutes_before_delete');
  if v_count <> 3 then raise exception 'MN-01 trigger installation incomplete'; end if;
  if to_regprocedure('convay_private.enforce_minutes_source_integrity()') is null then
    raise exception 'MN-01 private trigger function missing before rollback';
  end if;
end $check$;
drop trigger convay_a0_minutes_before_insert on public.convay_entity_records;
drop trigger convay_a0_minutes_before_update on public.convay_entity_records;
drop trigger convay_a0_minutes_before_delete on public.convay_entity_records;
drop function convay_private.enforce_minutes_source_integrity();
do $check$
declare v_count integer;
begin
  select count(*) into v_count from pg_trigger
   where tgrelid='public.convay_entity_records'::regclass
     and not tgisinternal
     and tgname in ('convay_a0_minutes_before_insert',
                    'convay_a0_minutes_before_update',
                    'convay_a0_minutes_before_delete');
  if v_count <> 0 then raise exception 'MN-01 rollback left a trigger'; end if;
  if to_regprocedure('convay_private.enforce_minutes_source_integrity()') is not null then
    raise exception 'MN-01 rollback left its function';
  end if;
  if exists(select 1 from public.convay_entity_records) then
    raise exception 'MN-01 rollback touched data';
  end if;
end $check$;
commit;
select 'MN-01 ISOLATED DDL ROLLBACK PASS' as result;
