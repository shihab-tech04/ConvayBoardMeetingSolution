-- Private live-meeting notes must never be readable or editable by other
-- meeting participants merely because they have mtg_view / mtg_join.
drop policy if exists convay_records_read on public.convay_entity_records;
create policy convay_records_read on public.convay_entity_records
for select to authenticated using (
 convay_private.registry_authorized(entity_key,'read')
 and (
   entity_key <> 'bms.notes'
   or created_by=(select auth.uid())
   or exists(select 1 from public.user_profiles p
     where p.user_id=(select auth.uid()) and p.account_role='super_admin'
     and p.account_status='active')
 )
);
drop policy if exists convay_records_update on public.convay_entity_records;
create policy convay_records_update on public.convay_entity_records
for update to authenticated
using (
 convay_private.registry_authorized(entity_key,'update')
 and (
  entity_key <> 'bms.notes' or created_by=(select auth.uid())
  or exists(select 1 from public.user_profiles p
   where p.user_id=(select auth.uid()) and p.account_role='super_admin' and p.account_status='active')
 )
)
with check (
 convay_private.registry_authorized(entity_key,'update')
 and (
  entity_key <> 'bms.notes' or created_by=(select auth.uid())
  or exists(select 1 from public.user_profiles p
   where p.user_id=(select auth.uid()) and p.account_role='super_admin' and p.account_status='active')
 )
);
drop policy if exists convay_records_delete on public.convay_entity_records;
create policy convay_records_delete on public.convay_entity_records
for delete to authenticated using (
 convay_private.registry_authorized(entity_key,'delete')
 and (
  entity_key <> 'bms.notes' or created_by=(select auth.uid())
  or exists(select 1 from public.user_profiles p
   where p.user_id=(select auth.uid()) and p.account_role='super_admin' and p.account_status='active')
 )
);
