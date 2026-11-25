-- SUB-03: auditable SQL readback for platform subscription proposals/invoices.
-- Reads only real immutable audit events; never enables charges, refunds or tenants.
create or replace function public.convay_subscription_audit_read(p_quote_id uuid)
returns jsonb
language plpgsql stable security definer set search_path=''
as $fn$
declare v_actor uuid:=auth.uid();v_quote convay_private.subscription_quotes%rowtype;
begin
 if v_actor is null or not exists (
  select 1 from public.user_profiles u where u.user_id=v_actor
   and u.account_role='super_admin' and u.account_status='active'
 ) then
  raise exception 'Platform Super Admin required' using errcode='42501';
 end if;
 if p_quote_id is null then
  raise exception 'Quote ID required' using errcode='22023';
 end if;
 select * into v_quote from convay_private.subscription_quotes q
  where q.id=p_quote_id;
 if not found then raise exception 'Quote not found' using errcode='P0002';end if;
 return pg_catalog.jsonb_build_object(
  'quote_id',v_quote.id,'quote_revision',v_quote.revision,
  'events',coalesce((
   select pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
     'id',a.id,'quote_id',a.quote_id,'invoice_id',a.invoice_id,
     'actor_id',a.actor_id,'operation',a.operation,
     'details',a.details,'created_at',a.created_at
    ) order by a.id desc
   ) from convay_private.subscription_audit a where a.quote_id=p_quote_id
  ),'[]'::jsonb)
 );
end $fn$;
revoke all on function public.convay_subscription_audit_read(uuid) from public,anon,authenticated;
grant execute on function public.convay_subscription_audit_read(uuid) to authenticated;
comment on function public.convay_subscription_audit_read(uuid) is
'Platform Super Admin-only immutable subscription quote/invoice audit readback. No billing state mutations.';