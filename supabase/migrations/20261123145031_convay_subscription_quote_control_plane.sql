-- SUB-01/SUB-02: safe root-managed SaaS quote and invoice-draft control plane.
-- No real payment collection, tenant activation, or LiveKit metering is claimed.
-- Currency values are integer minor units; no client price is authoritative.
create table if not exists convay_private.subscription_quotes (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete restrict,
  request_id uuid not null,
  organization_name text not null check (length(organization_name) between 3 and 160),
  contact_email text not null check (length(contact_email) <= 254),
  currency text not null check (currency in ('BDT','USD')),
  billing_cycle text not null check (billing_cycle in ('monthly','annually')),
  quota_policy text not null check (quota_policy in ('soft','hard')),
  quote_input jsonb not null,
  quote_breakdown jsonb not null,
  subtotal_minor bigint not null check (subtotal_minor >= 0),
  discount_minor bigint not null check (discount_minor >= 0),
  tax_minor bigint not null check (tax_minor >= 0),
  total_minor bigint not null check (total_minor >= 0),
  status text not null default 'draft' check (status in ('draft','issued','void')),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  issued_at timestamptz,
  unique(created_by,request_id)
);
alter table convay_private.subscription_quotes enable row level security;
revoke all on convay_private.subscription_quotes from public,anon,authenticated;

create table if not exists convay_private.subscription_invoices (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null unique references convay_private.subscription_quotes(id) on delete restrict,
  created_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'draft' check (status in ('draft','issued','void')),
  currency text not null check (currency in ('BDT','USD')),
  total_minor bigint not null check (total_minor >= 0),
  amount_paid_minor bigint not null default 0 check (amount_paid_minor = 0),
  issued_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table convay_private.subscription_invoices enable row level security;
revoke all on convay_private.subscription_invoices from public,anon,authenticated;

create table if not exists convay_private.subscription_audit (
  id bigint generated always as identity primary key,
  quote_id uuid not null references convay_private.subscription_quotes(id) on delete restrict,
  invoice_id uuid references convay_private.subscription_invoices(id) on delete restrict,
  actor_id uuid not null references auth.users(id) on delete restrict,
  operation text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table convay_private.subscription_audit enable row level security;
revoke all on convay_private.subscription_audit from public,anon,authenticated;
revoke all on sequence convay_private.subscription_audit_id_seq from public,anon,authenticated;

create or replace function convay_private.prevent_subscription_audit_mutation()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 raise exception 'Subscription audit history is immutable' using errcode='42501';
end $fn$;
revoke all on function convay_private.prevent_subscription_audit_mutation()
 from public,anon,authenticated;
drop trigger if exists convay_subscription_audit_immutable on convay_private.subscription_audit;
create trigger convay_subscription_audit_immutable
 before update or delete on convay_private.subscription_audit
 for each row execute function convay_private.prevent_subscription_audit_mutation();

-- This function is deliberately pure: exact math and validation can be checked
-- independently, without creating users, subscriptions, invoices or payments.
create or replace function convay_private.subscription_calculate(p_input jsonb)
returns jsonb language plpgsql immutable security invoker set search_path='' as $fn$
declare
  v_key text;v_q_text text;v_r_text text;v_base_text text;
  v_quantity numeric;v_rate numeric;v_line numeric;
  v_subtotal numeric:=0;v_discount numeric;v_tax numeric;
  v_discount_bps integer;v_tax_bps integer;
  v_total numeric;v_lines jsonb:='[]'::jsonb;
begin
 if pg_catalog.jsonb_typeof(p_input) <> 'object'
   or pg_catalog.jsonb_typeof(p_input->'quantities') <> 'object'
   or pg_catalog.jsonb_typeof(p_input->'rates_minor') <> 'object' then
  raise exception 'Quote requires quantities and rates' using errcode='22023';
 end if;
 foreach v_key in array array['users','meeting_minutes','recording_minutes',
                                  'storage_gb','participant_minutes'] loop
   v_q_text:=p_input->'quantities'->>v_key;
   v_r_text:=p_input->'rates_minor'->>v_key;
   if v_q_text is null or v_q_text !~ '^[0-9]{1,7}$'
     or v_r_text is null or v_r_text !~ '^[0-9]{1,9}$' then
    raise exception 'Invalid quantity or rate for %',v_key using errcode='22023';
   end if;
   v_quantity:=v_q_text::numeric;v_rate:=v_r_text::numeric;
   if v_quantity>1000000 or v_rate>100000000 then
     raise exception 'Quote limits exceeded' using errcode='22023';
   end if;
   v_line:=v_quantity*v_rate;
   v_subtotal:=v_subtotal+v_line;
   v_lines:=v_lines||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
     'key',v_key,'quantity',v_quantity::bigint,'rate_minor',v_rate::bigint,
     'total_minor',v_line::bigint));
 end loop;
 v_base_text:=p_input->>'base_minor';
 if v_base_text is null or v_base_text !~ '^[0-9]{1,10}$'
   or v_base_text::numeric>1000000000 then
  raise exception 'Invalid base subscription price' using errcode='22023';
 end if;
 v_subtotal:=v_subtotal+v_base_text::numeric;
 if coalesce(p_input->>'discount_bps','') !~ '^[0-9]{1,5}$'
   or coalesce(p_input->>'tax_bps','') !~ '^[0-9]{1,5}$' then
  raise exception 'Invalid discount or tax percentage' using errcode='22023';
 end if;
 v_discount_bps:=(p_input->>'discount_bps')::integer;
 v_tax_bps:=(p_input->>'tax_bps')::integer;
 if v_discount_bps>10000 or v_tax_bps>10000 then
  raise exception 'Percentage exceeds 100 percent' using errcode='22023';
 end if;
 v_discount:=pg_catalog.round(v_subtotal*v_discount_bps/10000);
 v_tax:=pg_catalog.round((v_subtotal-v_discount)*v_tax_bps/10000);
 v_total:=v_subtotal-v_discount+v_tax;
 if v_total>9000000000000000 then
  raise exception 'Quote total too large' using errcode='22003';
 end if;
 return pg_catalog.jsonb_build_object(
   'lines',v_lines,'base_minor',v_base_text::bigint,
   'subtotal_minor',v_subtotal::bigint,'discount_minor',v_discount::bigint,
   'tax_minor',v_tax::bigint,'total_minor',v_total::bigint);
end $fn$;
revoke all on function convay_private.subscription_calculate(jsonb)
 from public,anon,authenticated;

-- The only exposed subscription interface is an authenticated, root-verified
-- RPC. Tables remain private. Every state transition is server-calculated,
-- revision-controlled, audited and confirmed in one SQL transaction.
create or replace function public.convay_subscription_manage(
 p_action text,p_payload jsonb default '{}'::jsonb
) returns jsonb language plpgsql security definer set search_path='' as $fn$
declare
 v_actor uuid:=auth.uid();v_quote convay_private.subscription_quotes%rowtype;
 v_invoice convay_private.subscription_invoices%rowtype;
 v_result jsonb;v_calc jsonb;v_id uuid;v_request uuid;
 v_expected int;v_company text;v_email text;v_cycle text;
 v_currency text;v_policy text;v_existing convay_private.subscription_quotes%rowtype;
begin
 if v_actor is null or not exists (
   select 1 from public.user_profiles u where u.user_id=v_actor
   and u.account_role='super_admin' and u.account_status='active') then
  raise exception 'Platform Super Admin access required' using errcode='42501';
 end if;
 if pg_catalog.jsonb_typeof(p_payload)<>'object' then
  raise exception 'Invalid subscription payload' using errcode='22023';
 end if;
 if p_action='preview_quote' then
  return pg_catalog.jsonb_build_object('preview',convay_private.subscription_calculate(p_payload));
 elsif p_action='list' then
  return pg_catalog.jsonb_build_object(
   'quotes',coalesce((
     select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(x) order by x.created_at desc)
     from (select * from convay_private.subscription_quotes
       order by created_at desc limit 100) x),'[]'::jsonb),
   'invoices',coalesce((
     select pg_catalog.jsonb_agg(pg_catalog.to_jsonb(x) order by x.created_at desc)
     from (select * from convay_private.subscription_invoices
       order by created_at desc limit 100) x),'[]'::jsonb),
   'payment_provider_connected',false,'usage_metering_activated',false,
   'tenant_isolation_certified',false);
 elsif p_action='create_quote' then
  v_company:=pg_catalog.btrim(p_payload->>'organization_name');
  v_email:=pg_catalog.lower(pg_catalog.btrim(p_payload->>'contact_email'));
  v_cycle:=p_payload->>'billing_cycle';
  v_currency:=p_payload->>'currency';
  v_policy:=p_payload->>'quota_policy';
  if v_company is null or pg_catalog.length(v_company) not between 3 and 160
    or v_email is null or pg_catalog.length(v_email)>254
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or v_cycle not in ('monthly','annually') or v_currency not in ('BDT','USD')
    or v_policy not in ('soft','hard') then
    raise exception 'Valid organization, email, currency, cycle and limit policy required' using errcode='22023';
  end if;
  if coalesce(p_payload->>'request_id','') !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    raise exception 'A unique quote request ID is required' using errcode='22023';
  end if;
  v_request:=(p_payload->>'request_id')::uuid;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('convay-quote:'||v_actor::text));
  select * into v_existing from convay_private.subscription_quotes
   where created_by=v_actor and request_id=v_request;
  if found then
    if v_existing.quote_input is distinct from (p_payload-'request_id') then
      raise exception 'Request ID reused with different quote details' using errcode='23505';
    end if;
    return pg_catalog.jsonb_build_object('quote',pg_catalog.to_jsonb(v_existing),'replayed',true);
  end if;
  v_calc:=convay_private.subscription_calculate(p_payload);
  insert into convay_private.subscription_quotes
   (created_by,request_id,organization_name,contact_email,currency,billing_cycle,
    quota_policy,quote_input,quote_breakdown,subtotal_minor,discount_minor,tax_minor,total_minor)
  values
   (v_actor,v_request,v_company,v_email,v_currency,v_cycle,v_policy,
    p_payload-'request_id',v_calc,(v_calc->>'subtotal_minor')::bigint,
    (v_calc->>'discount_minor')::bigint,(v_calc->>'tax_minor')::bigint,
    (v_calc->>'total_minor')::bigint)
   returning * into v_quote;
  insert into convay_private.subscription_audit(quote_id,actor_id,operation,details)
   values(v_quote.id,v_actor,'quote_created',
     pg_catalog.jsonb_build_object('revision',1,'total_minor',v_quote.total_minor));
  return pg_catalog.jsonb_build_object('quote',pg_catalog.to_jsonb(v_quote),'replayed',false);
 elsif p_action in ('issue_quote','void_quote','create_invoice','issue_invoice') then
   if coalesce(p_payload->>'quote_id','') !~
    '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
    raise exception 'Valid quote ID required' using errcode='22023';
   end if;
   v_id:=(p_payload->>'quote_id')::uuid;
   select * into v_quote from convay_private.subscription_quotes
    where id=v_id for update;
   if not found then raise exception 'Quote not found' using errcode='P0002';end if;
   if p_action in ('issue_quote','void_quote') then
     if coalesce(p_payload->>'expected_revision','') !~ '^[0-9]{1,8}$' then
       raise exception 'Expected quote revision required' using errcode='22023';
     end if;
     v_expected:=(p_payload->>'expected_revision')::integer;
     if v_quote.revision<>v_expected then
       raise exception 'Quote changed. Reload before retrying' using errcode='40001';
     end if;
     if p_action='issue_quote' and v_quote.status<>'draft' then
       raise exception 'Only a draft quote may be issued' using errcode='23514';end if;
     if p_action='void_quote' and v_quote.status='void' then
       raise exception 'Quote already voided' using errcode='23514';end if;
     update convay_private.subscription_quotes
       set status=case when p_action='issue_quote' then 'issued' else 'void' end,
           revision=revision+1,updated_at=now(),
           issued_at=case when p_action='issue_quote' then now() else issued_at end
       where id=v_id returning * into v_quote;
     insert into convay_private.subscription_audit(quote_id,actor_id,operation,details)
       values(v_id,v_actor,p_action,pg_catalog.jsonb_build_object('revision',v_quote.revision));
     return pg_catalog.jsonb_build_object('quote',pg_catalog.to_jsonb(v_quote));
   elsif p_action='create_invoice' then
     if v_quote.status<>'issued' then
       raise exception 'Only an issued quote may generate an invoice draft' using errcode='23514';end if;
     select * into v_invoice from convay_private.subscription_invoices
       where quote_id=v_id;
     if found then
       return pg_catalog.jsonb_build_object('invoice',pg_catalog.to_jsonb(v_invoice),'replayed',true);
     end if;
     insert into convay_private.subscription_invoices
       (quote_id,created_by,currency,total_minor)
       values(v_id,v_actor,v_quote.currency,v_quote.total_minor)
       returning * into v_invoice;
     insert into convay_private.subscription_audit(quote_id,invoice_id,actor_id,operation)
       values(v_id,v_invoice.id,v_actor,'invoice_draft_created');
     return pg_catalog.jsonb_build_object('invoice',pg_catalog.to_jsonb(v_invoice),'replayed',false);
   else
     select * into v_invoice from convay_private.subscription_invoices
       where quote_id=v_id for update;
     if not found or v_invoice.status<>'draft' then
       raise exception 'A draft invoice is required to issue' using errcode='23514';end if;
     update convay_private.subscription_invoices
       set status='issued',issued_at=now(),updated_at=now()
       where id=v_invoice.id returning * into v_invoice;
     insert into convay_private.subscription_audit(quote_id,invoice_id,actor_id,operation)
       values(v_id,v_invoice.id,v_actor,'invoice_issued');
     return pg_catalog.jsonb_build_object('invoice',pg_catalog.to_jsonb(v_invoice));
   end if;
 end if;
 raise exception 'Unsupported subscription action' using errcode='22023';
end $fn$;
revoke all on function public.convay_subscription_manage(text,jsonb)
 from public,anon,authenticated;
grant execute on function public.convay_subscription_manage(text,jsonb)
 to authenticated;
