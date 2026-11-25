-- Disposable fixture, NOT a restored production database.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema convay_private;
create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
create table public.user_profiles(user_id uuid primary key,display_name text not null,account_status text not null,account_role text not null);
create table convay_private.tenants(id uuid primary key,lifecycle_state text not null);
create table convay_private.tenant_memberships(tenant_id uuid references convay_private.tenants(id),user_id uuid references public.user_profiles(user_id),membership_state text not null,revoked_at timestamptz,primary key(tenant_id,user_id));
create function convay_private.has_permission(permission_code text) returns boolean language sql stable as $$select exists(select 1 from public.user_profiles where user_id=auth.uid() and account_status='active') and permission_code in ('mtg_view','mtg_join','mtg_attendance')$$;
create function convay_private.is_meeting_leader(p_actor uuid,p_meeting jsonb,p_creator uuid) returns boolean language sql stable as $$select coalesce(p_actor=p_creator,false)$$;
create function convay_private.tenant_member_active(p_tenant uuid) returns boolean language sql stable as $$select exists(select 1 from convay_private.tenant_memberships m join convay_private.tenants t on t.id=m.tenant_id where m.tenant_id=p_tenant and m.user_id=auth.uid() and m.membership_state='active' and m.revoked_at is null and t.lifecycle_state='active')$$;
create function convay_private.legacy_unscoped_authorized() returns boolean language sql stable as $$select exists(select 1 from public.user_profiles p where p.user_id=auth.uid() and p.account_status='active' and not exists(select 1 from convay_private.tenant_memberships m where m.user_id=p.user_id and m.membership_state='active' and m.revoked_at is null))$$;
create table public.convay_entity_records(entity_key text not null,record_id text not null,tenant_id uuid,payload jsonb not null,created_by uuid,revision bigint not null default 1,primary key(entity_key,record_id));
create function convay_private.fixture_revision() returns trigger language plpgsql as $$begin new.revision:=old.revision+1;return new;end$$;
create trigger fixture_revision before update on public.convay_entity_records for each row execute function convay_private.fixture_revision();
