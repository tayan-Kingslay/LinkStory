-- Monthly reading badges: one record per user, chapter and calendar month.
create table if not exists public.reading_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  chapter_id uuid not null references public.manga_chapters(id) on delete cascade,
  manga_id uuid not null references public.mangas(id) on delete cascade,
  month_start date not null,
  last_read_at timestamptz not null default now(),
  primary key (user_id, chapter_id, month_start)
);
alter table public.reading_activity enable row level security;
revoke all on table public.reading_activity from anon, authenticated;

create or replace function public.capture_monthly_reading_activity()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or auth.uid() <> new.user_id then return new; end if;
  insert into public.reading_activity(user_id, chapter_id, manga_id, month_start, last_read_at)
  values (new.user_id, new.chapter_id, new.manga_id, date_trunc('month', now())::date, now())
  on conflict (user_id, chapter_id, month_start) do update set last_read_at = excluded.last_read_at;
  return new;
end;
$$;
revoke all on function public.capture_monthly_reading_activity() from public, anon, authenticated;
drop trigger if exists trg_capture_monthly_reading_activity on public.reading_progress;
create trigger trg_capture_monthly_reading_activity after insert or update of chapter_id on public.reading_progress
for each row execute function public.capture_monthly_reading_activity();

create or replace function public.get_monthly_reader_leaderboard(p_month date default null)
returns table (reader_id uuid, display_name text, username text, avatar_url text, chapters_read bigint, rank_position bigint)
language plpgsql stable security definer set search_path = public as $$
declare target_month date := date_trunc('month', coalesce(p_month, current_date)::timestamp)::date;
begin
  if auth.uid() is null then raise exception 'Entre na sua conta para consultar os emblemas.'; end if;
  return query
  with ranked as (
    select a.user_id, count(distinct a.chapter_id)::bigint as chapter_count,
           row_number() over (order by count(distinct a.chapter_id) desc, max(a.last_read_at) desc, a.user_id) as place
    from public.reading_activity a where a.month_start = target_month group by a.user_id
  )
  select r.user_id, coalesce(p.display_name, p.username, 'Leitor')::text,
         p.username::text, p.avatar_url::text, r.chapter_count, r.place
  from ranked r join public.profiles p on p.id = r.user_id
  where r.place <= 10 order by r.place;
end;
$$;
revoke all on function public.get_monthly_reader_leaderboard(date) from public, anon;
grant execute on function public.get_monthly_reader_leaderboard(date) to authenticated;
