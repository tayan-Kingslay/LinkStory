-- LinkStory Guard foundation: private age settings, reports, blocks and manga age gating.
-- Birth dates are stored outside public.profiles and never exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create table if not exists private.user_safety_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  birth_date date,
  profile_visibility text not null default 'public' check (profile_visibility in ('public','private')),
  show_library boolean not null default false,
  adult_content_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_birth_date check (birth_date is null or (birth_date >= date '1900-01-01' and birth_date <= current_date))
);
alter table private.user_safety_settings enable row level security;
drop policy if exists "Users manage own safety settings" on private.user_safety_settings;
create policy "Users manage own safety settings"
  on private.user_safety_settings for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
grant select, insert, update, delete on private.user_safety_settings to authenticated;

create table if not exists public.content_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  target_type text not null check (target_type in ('profile','post','manga','chapter','comment','message')),
  target_id uuid not null,
  reason text not null check (reason in ('harassment','hate','sexual_content','minor_safety','violence','self_harm','copyright','spam','privacy','other')),
  details text not null default '' check (char_length(details) <= 2000),
  status text not null default 'pending' check (status in ('pending','reviewing','actioned','dismissed')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  resolution text
);
create index if not exists content_reports_status_created_idx on public.content_reports(status, created_at desc);
create index if not exists content_reports_target_idx on public.content_reports(target_type, target_id);
alter table public.content_reports enable row level security;
drop policy if exists "Users submit reports" on public.content_reports;
create policy "Users submit reports" on public.content_reports
  for insert to authenticated with check ((select auth.uid()) = reporter_id);
drop policy if exists "Users read own reports" on public.content_reports;
create policy "Users read own reports" on public.content_reports
  for select to authenticated using ((select auth.uid()) = reporter_id);
grant insert, select on public.content_reports to authenticated;

create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint no_self_block check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
drop policy if exists "Users manage their own blocks" on public.user_blocks;
create policy "Users manage their own blocks" on public.user_blocks
  for all to authenticated
  using ((select auth.uid()) = blocker_id)
  with check ((select auth.uid()) = blocker_id);
grant select, insert, delete on public.user_blocks to authenticated;

create table if not exists private.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.content_reports(id) on delete set null,
  target_type text not null,
  target_id uuid not null,
  action text not null check (action in ('warning','content_removed','temporary_suspension','permanent_ban','no_violation')),
  reason text not null,
  moderator_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table private.moderation_actions enable row level security;
revoke all on private.moderation_actions from public, anon, authenticated;

create or replace function private.can_view_manga(p_rating text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, private, public
as $$
  select case
    when upper(coalesce(p_rating, 'L')) in ('L','LIVRE') then true
    when auth.uid() is null then false
    when not exists (
      select 1 from private.user_safety_settings s
      where s.user_id = auth.uid() and s.birth_date is not null
    ) then false
    else (
      select
        extract(year from age(current_date, s.birth_date)) >=
        case upper(coalesce(p_rating,'L'))
          when '10' then 10 when '10+' then 10
          when '12' then 12 when '12+' then 12
          when '14' then 14 when '14+' then 14
          when '16' then 16 when '16+' then 16
          when '18' then 18 when '18+' then 18
          else 99
        end
      from private.user_safety_settings s
      where s.user_id = auth.uid()
    )
  end;
$$;
revoke all on function private.can_view_manga(text) from public;
grant execute on function private.can_view_manga(text) to anon, authenticated;

-- Replace unrestricted manga/page reads with an age-aware database gate.
drop policy if exists "mangas_public_read" on public.mangas;
create policy "mangas_age_gated_read" on public.mangas
  for select to anon, authenticated
  using (status = 'published' and private.can_view_manga(age_rating));

drop policy if exists "manga_chapters_public_read" on public.manga_chapters;
create policy "manga_chapters_age_gated_read" on public.manga_chapters
  for select to anon, authenticated
  using (exists (
    select 1 from public.mangas m
    where m.id = manga_chapters.manga_id
      and m.status = 'published'
      and private.can_view_manga(m.age_rating)
  ));

drop policy if exists "manga_pages_public_read" on public.manga_pages;
create policy "manga_pages_age_gated_read" on public.manga_pages
  for select to anon, authenticated
  using (exists (
    select 1
    from public.manga_chapters c
    join public.mangas m on m.id = c.manga_id
    where c.id = manga_pages.chapter_id
      and m.status = 'published'
      and private.can_view_manga(m.age_rating)
  ));

-- Prevent self-declared settings from being used to grant moderation privileges.
comment on table private.user_safety_settings is 'Private user settings. Birth date is self-declared unless verified by a separate approved process; never treat this alone as identity verification.';
