-- LinkStory core schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (username ~ '^[A-Za-z0-9._-]{3,24}$'),
  display_name text not null default 'LinkStory',
  bio text not null default '',
  avatar_url text,
  role text not null default 'reader' check (role in ('reader','creator')),
  created_at timestamptz not null default now()
);

create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null default 'image' check (kind in ('image','video','text')),
  media_url text,
  caption text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  caption text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours')
);

create table if not exists public.manga_series (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text not null default '',
  cover_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.manga_chapters (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.manga_series(id) on delete cascade,
  chapter_number integer not null check (chapter_number > 0),
  title text not null,
  pages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique(series_id, chapter_number)
);

create index if not exists stories_expires_idx on public.stories(expires_at);
create index if not exists posts_created_idx on public.posts(created_at desc);
create index if not exists posts_author_idx on public.posts(author_id);

alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.posts enable row level security;
alter table public.stories enable row level security;
alter table public.manga_series enable row level security;
alter table public.manga_chapters enable row level security;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists follows_read on public.follows;
create policy follows_read on public.follows for select using (auth.uid() is not null);

drop policy if exists follows_own_insert on public.follows;
create policy follows_own_insert on public.follows for insert with check (auth.uid() = follower_id);

drop policy if exists follows_own_delete on public.follows;
create policy follows_own_delete on public.follows for delete using (auth.uid() = follower_id);

drop policy if exists posts_read on public.posts;
create policy posts_read on public.posts for select using (true);

drop policy if exists posts_insert_creator on public.posts;
create policy posts_insert_creator on public.posts for insert with check (
  auth.uid() = author_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'creator')
);

drop policy if exists posts_update_creator on public.posts;
create policy posts_update_creator on public.posts for update using (auth.uid() = author_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'creator')) with check (auth.uid() = author_id);

drop policy if exists posts_delete_owner on public.posts;
create policy posts_delete_owner on public.posts for delete using (auth.uid() = author_id);

drop policy if exists stories_read on public.stories;
create policy stories_read on public.stories for select using (expires_at > now());

drop policy if exists stories_insert_creator on public.stories;
create policy stories_insert_creator on public.stories for insert with check (
  auth.uid() = author_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'creator')
);

drop policy if exists stories_delete_owner on public.stories;
create policy stories_delete_owner on public.stories for delete using (auth.uid() = author_id);

drop policy if exists series_read on public.manga_series;
create policy series_read on public.manga_series for select using (true);

drop policy if exists series_insert_creator on public.manga_series;
create policy series_insert_creator on public.manga_series for insert with check (
  auth.uid() = creator_id and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'creator')
);

drop policy if exists series_update_creator on public.manga_series;
create policy series_update_creator on public.manga_series for update using (auth.uid() = creator_id);

drop policy if exists series_delete_creator on public.manga_series;
create policy series_delete_creator on public.manga_series for delete using (auth.uid() = creator_id);

drop policy if exists chapters_read on public.manga_chapters;
create policy chapters_read on public.manga_chapters for select using (true);

drop policy if exists chapters_insert_creator on public.manga_chapters;
create policy chapters_insert_creator on public.manga_chapters for insert with check (
  exists (
    select 1 from public.manga_series s
    join public.profiles p on p.id = s.creator_id
    where s.id = series_id and s.creator_id = auth.uid() and p.role = 'creator'
  )
);

drop policy if exists chapters_update_creator on public.manga_chapters;
create policy chapters_update_creator on public.manga_chapters for update using (
  exists (select 1 from public.manga_series s where s.id = series_id and s.creator_id = auth.uid())
);

drop policy if exists chapters_delete_creator on public.manga_chapters;
create policy chapters_delete_creator on public.manga_chapters for delete using (
  exists (select 1 from public.manga_series s where s.id = series_id and s.creator_id = auth.uid())
);

-- Keep profiles in sync with auth users. The client can only choose the role during signup;
-- database policies prevent readers from publishing even if the UI is bypassed.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(replace(new.id::text,'-',''),1,8)),
    coalesce(new.raw_user_meta_data->>'display_name', 'LinkStory'),
    case when new.raw_user_meta_data->>'role' = 'creator' then 'creator' else 'reader' end
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();
