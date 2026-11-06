-- Quick Meetings are intentionally separate from governed BMS meeting records.
-- No browser role receives direct table access; the Edge Function validates
-- host identity or the one-time guest-link capability before using service_role.
create table public.convay_quick_meetings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null default 'Quick Meeting' check (length(btrim(title)) between 2 and 120),
  meeting_kind text not null default 'quick' check (meeting_kind = 'quick'),
  access_mode text not null default 'link' check (access_mode = 'link'),
  status text not null default 'active' check (status in ('active', 'ended')),
  room_name text not null unique check (length(room_name) between 12 and 80),
  admission_locked boolean not null default false,
  max_participants integer not null default 4 check (max_participants between 2 and 4),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  check ((status = 'active' and ended_at is null) or (status = 'ended' and ended_at is not null))
);

create index convay_quick_meetings_owner_created_idx
  on public.convay_quick_meetings(owner_id, created_at desc);
create index convay_quick_meetings_active_expiry_idx
  on public.convay_quick_meetings(expires_at) where status = 'active';

create table public.convay_quick_meeting_sessions (
  meeting_id uuid primary key references public.convay_quick_meetings(id) on delete cascade,
  session_status text not null default 'active' check (session_status in ('active', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  check ((session_status = 'active' and ended_at is null) or (session_status = 'ended' and ended_at is not null))
);

create table public.convay_quick_meeting_links (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references public.convay_quick_meetings(id) on delete cascade,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz
);

create unique index convay_quick_meeting_links_one_active_idx
  on public.convay_quick_meeting_links(meeting_id) where revoked_at is null;
create index convay_quick_meeting_links_expiry_idx
  on public.convay_quick_meeting_links(expires_at);

create table public.convay_quick_meeting_attendance (
  meeting_id uuid not null references public.convay_quick_meetings(id) on delete cascade,
  livekit_identity text not null check (livekit_identity ~ '^(qh|qg)-[0-9a-f]{48}$'),
  participant_kind text not null check (participant_kind in ('host', 'guest')),
  user_id uuid references auth.users(id) on delete set null,
  share_link_id uuid references public.convay_quick_meeting_links(id) on delete set null,
  display_name text not null check (length(btrim(display_name)) between 2 and 80),
  first_joined_at timestamptz not null default now(),
  last_joined_at timestamptz not null default now(),
  left_at timestamptz,
  join_count integer not null default 1 check (join_count > 0),
  primary key (meeting_id, livekit_identity),
  check (
    (participant_kind = 'host' and livekit_identity like 'qh-%')
    or (participant_kind = 'guest' and livekit_identity like 'qg-%')
  )
);

create index convay_quick_meeting_attendance_user_idx
  on public.convay_quick_meeting_attendance(user_id, last_joined_at desc) where user_id is not null;

alter table public.convay_quick_meetings enable row level security;
alter table public.convay_quick_meeting_sessions enable row level security;
alter table public.convay_quick_meeting_links enable row level security;
alter table public.convay_quick_meeting_attendance enable row level security;

-- Explicitly deny browser roles at the row-policy layer as a second boundary.
create policy convay_quick_meetings_browser_deny on public.convay_quick_meetings
  for all to anon, authenticated using (false) with check (false);
create policy convay_quick_sessions_browser_deny on public.convay_quick_meeting_sessions
  for all to anon, authenticated using (false) with check (false);
create policy convay_quick_links_browser_deny on public.convay_quick_meeting_links
  for all to anon, authenticated using (false) with check (false);
create policy convay_quick_attendance_browser_deny on public.convay_quick_meeting_attendance
  for all to anon, authenticated using (false) with check (false);

revoke all on public.convay_quick_meetings, public.convay_quick_meeting_sessions,
  public.convay_quick_meeting_links, public.convay_quick_meeting_attendance
  from public, anon, authenticated;
grant all on public.convay_quick_meetings, public.convay_quick_meeting_sessions,
  public.convay_quick_meeting_links, public.convay_quick_meeting_attendance
  to service_role;

-- Create the quick meeting, its active session and its first link atomically.
create function public.convay_create_quick_meeting(
  p_owner_id uuid,
  p_room_name text,
  p_token_hash text,
  p_expires_at timestamptz,
  p_max_participants integer,
  p_title text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if p_owner_id is null
     or p_room_name !~ '^qmr-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Invalid quick meeting request';
  end if;
  if p_token_hash !~ '^[0-9a-f]{64}$' or p_expires_at <= now()
     or p_expires_at > now() + interval '4 hours 1 minute'
     or p_max_participants not between 2 and 4 then
    raise exception 'Invalid quick meeting settings';
  end if;
  if length(btrim(coalesce(p_title, ''))) not between 2 and 120 then
    raise exception 'Meeting title must contain 2-120 characters';
  end if;
  insert into public.convay_quick_meetings(owner_id,title,room_name,max_participants,expires_at)
    values (p_owner_id,btrim(p_title),p_room_name,p_max_participants,p_expires_at)
    returning id into v_id;
  insert into public.convay_quick_meeting_sessions(meeting_id) values (v_id);
  insert into public.convay_quick_meeting_links(meeting_id,token_hash,created_by,expires_at)
    values (v_id,p_token_hash,p_owner_id,p_expires_at);
  return v_id;
end $$;
revoke all on function public.convay_create_quick_meeting(uuid,text,text,timestamptz,integer,text)
  from public, anon, authenticated;
grant execute on function public.convay_create_quick_meeting(uuid,text,text,timestamptz,integer,text)
  to service_role;

-- Link rotation is atomic so concurrent hosts cannot leave multiple links active.
create function public.convay_rotate_quick_meeting_link(
  p_meeting_id uuid,
  p_owner_id uuid,
  p_token_hash text
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_expires_at timestamptz; v_old_link_id uuid;
begin
  if p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid quick meeting link'; end if;
  select expires_at into v_expires_at from public.convay_quick_meetings
   where id = p_meeting_id and owner_id = p_owner_id and status = 'active'
     and expires_at > now() for update;
  if v_expires_at is null then raise exception 'Quick meeting is unavailable'; end if;
  update public.convay_quick_meeting_links set revoked_at = now()
   where meeting_id = p_meeting_id and revoked_at is null
   returning id into v_old_link_id;
  insert into public.convay_quick_meeting_links(meeting_id,token_hash,created_by,expires_at)
    values (p_meeting_id,p_token_hash,p_owner_id,v_expires_at);
  return v_old_link_id;
end $$;
revoke all on function public.convay_rotate_quick_meeting_link(uuid,uuid,text)
  from public, anon, authenticated;
grant execute on function public.convay_rotate_quick_meeting_link(uuid,uuid,text)
  to service_role;

-- Closing a quick meeting invalidates every link/session before LiveKit cleanup.
create function public.convay_end_quick_meeting(p_meeting_id uuid, p_owner_id uuid)
returns text
language plpgsql security definer set search_path = '' as $$
declare v_room_name text;
begin
  update public.convay_quick_meetings set status = 'ended', ended_at = now(), admission_locked = true
   where id = p_meeting_id and owner_id = p_owner_id and status = 'active'
   returning room_name into v_room_name;
  if v_room_name is null then
    select room_name into v_room_name from public.convay_quick_meetings
     where id = p_meeting_id and owner_id = p_owner_id and status = 'ended';
    if v_room_name is null then raise exception 'Quick meeting is unavailable'; end if;
  end if;
  update public.convay_quick_meeting_sessions
     set session_status = 'ended', ended_at = coalesce(ended_at, now())
   where meeting_id = p_meeting_id;
  update public.convay_quick_meeting_links set revoked_at = coalesce(revoked_at, now())
   where meeting_id = p_meeting_id;
  return v_room_name;
end $$;
revoke all on function public.convay_end_quick_meeting(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.convay_end_quick_meeting(uuid,uuid) to service_role;

create function public.convay_revoke_quick_meeting_link(p_meeting_id uuid, p_owner_id uuid)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_link_id uuid;
begin
  if not exists(select 1 from public.convay_quick_meetings
    where id = p_meeting_id and owner_id = p_owner_id and status = 'active') then
    raise exception 'Quick meeting is unavailable';
  end if;
  update public.convay_quick_meeting_links set revoked_at = now()
   where meeting_id = p_meeting_id and revoked_at is null
   returning id into v_link_id;
  return v_link_id;
end $$;
revoke all on function public.convay_revoke_quick_meeting_link(uuid,uuid)
  from public, anon, authenticated;
grant execute on function public.convay_revoke_quick_meeting_link(uuid,uuid) to service_role;

-- Attendance is written only after RoomService confirms that identity is live.
create function public.convay_record_quick_attendance(
  p_meeting_id uuid,
  p_livekit_identity text,
  p_participant_kind text,
  p_user_id uuid,
  p_display_name text,
  p_share_link_id uuid
) returns public.convay_quick_meeting_attendance
language plpgsql security definer set search_path = '' as $$
declare v_row public.convay_quick_meeting_attendance;
begin
  if p_participant_kind not in ('host','guest') or p_livekit_identity !~ '^(qh|qg)-[0-9a-f]{48}$'
     or length(btrim(p_display_name)) not between 2 and 80 then
    raise exception 'Invalid attendance record';
  end if;
  if p_participant_kind = 'host' and (p_user_id is null or p_share_link_id is not null or p_livekit_identity not like 'qh-%') then
    raise exception 'Invalid host attendance';
  end if;
  if p_participant_kind = 'guest' and (p_user_id is not null or p_share_link_id is null or p_livekit_identity not like 'qg-%') then
    raise exception 'Invalid guest attendance';
  end if;
  if not exists(select 1 from public.convay_quick_meetings m
    where m.id = p_meeting_id and m.status = 'active' and m.expires_at > now()
      and (p_participant_kind <> 'host' or m.owner_id = p_user_id)) then
    raise exception 'Quick meeting is unavailable';
  end if;
  if p_participant_kind = 'guest' and not exists(select 1 from public.convay_quick_meeting_links l
    where l.id = p_share_link_id and l.meeting_id = p_meeting_id
      and l.revoked_at is null and l.expires_at > now()) then
    raise exception 'Quick meeting link is unavailable';
  end if;
  insert into public.convay_quick_meeting_attendance(
    meeting_id,livekit_identity,participant_kind,user_id,display_name,share_link_id
  ) values (
    p_meeting_id,p_livekit_identity,p_participant_kind,p_user_id,btrim(p_display_name),p_share_link_id
  ) on conflict(meeting_id,livekit_identity) do update set
    participant_kind = excluded.participant_kind,
    user_id = coalesce(excluded.user_id,public.convay_quick_meeting_attendance.user_id),
    display_name = excluded.display_name,
    share_link_id = coalesce(excluded.share_link_id,public.convay_quick_meeting_attendance.share_link_id),
    last_joined_at = now(),
    left_at = null,
    join_count = public.convay_quick_meeting_attendance.join_count + 1
  returning * into v_row;
  return v_row;
end $$;
revoke all on function public.convay_record_quick_attendance(uuid,text,text,uuid,text,uuid)
  from public, anon, authenticated;
grant execute on function public.convay_record_quick_attendance(uuid,text,text,uuid,text,uuid)
  to service_role;

create function public.convay_mark_quick_attendance_left(
  p_meeting_id uuid,
  p_livekit_identity text
) returns void
language sql security definer set search_path = '' as $$
  update public.convay_quick_meeting_attendance set left_at = now()
   where meeting_id = p_meeting_id and livekit_identity = p_livekit_identity and left_at is null
$$;
revoke all on function public.convay_mark_quick_attendance_left(uuid,text)
  from public, anon, authenticated;
grant execute on function public.convay_mark_quick_attendance_left(uuid,text)
  to service_role;
