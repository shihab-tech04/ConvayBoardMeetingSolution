-- TEN staging fail-closed guard; preserves all existing null-owned registry rows.
create or replace function convay_private.deny_unactivated_tenant_claim()
returns trigger language plpgsql security invoker set search_path = ''
as $guard$
begin
  if tg_op = 'INSERT' and new.tenant_id is not null then
    raise exception 'Tenant ownership is not yet activated' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and new.tenant_id is distinct from old.tenant_id then
    raise exception 'Tenant ownership cannot be changed before activation' using errcode = '42501';
  end if;
  return new;
end $guard$;
revoke all on function convay_private.deny_unactivated_tenant_claim()
  from public, anon, authenticated;
drop trigger if exists convay_a0_ten_staging_guard on public.convay_entity_records;
create trigger convay_a0_ten_staging_guard before insert or update on public.convay_entity_records
for each row execute function convay_private.deny_unactivated_tenant_claim();