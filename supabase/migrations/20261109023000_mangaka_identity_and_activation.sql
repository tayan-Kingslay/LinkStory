-- Mangaká identity is separate from the account's KX.Mail login.
create table if not exists public.mangaka_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  pen_name text not null check (char_length(btrim(pen_name)) between 2 and 80),
  handle text not null unique check (
    handle = lower(handle)
    and handle ~ '^[a-z0-9]+([._][a-z0-9]+)*[.]kx[.]mangaka$'
  ),
  titles text[] not null default array['leitor','mangaka']::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mangaka_profiles enable row level security;
drop policy if exists mangaka_profiles_public_read on public.mangaka_profiles;
create policy mangaka_profiles_public_read
  on public.mangaka_profiles for select
  to anon, authenticated
  using (true);

revoke all on public.mangaka_profiles from anon, authenticated;
grant select on public.mangaka_profiles to anon, authenticated;

-- Profile rows are created by the auth trigger. Clients may edit only ordinary profile fields;
-- account role, KX identifiers, and verification fields stay server-managed.
revoke insert, update, delete, truncate on table public.profiles from anon, authenticated;
grant update (username, display_name, bio, avatar_url, preferences, updated_at, recovery_email)
  on table public.profiles to authenticated;

-- The role guard permits promotion only after the trusted activation function creates the identity row.
create or replace function public.guard_creator_role_change()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if new.role = 'criador' and (tg_op = 'INSERT' or new.role is distinct from old.role) then
    if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
       and not exists (
         select 1 from public.creator_applications a
         where a.user_id = new.id and a.status = 'approved'
       )
       and not exists (
         select 1 from public.mangaka_profiles m
         where m.user_id = new.id
       ) then
      raise exception 'Sua solicitação para ser mangaká ainda não foi aprovada.';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.activate_my_mangaka_profile(p_pen_name text, p_handle text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user_id uuid := auth.uid();
  v_iat bigint;
  v_pen_name text := btrim(coalesce(p_pen_name, ''));
  v_handle text := lower(btrim(coalesce(p_handle, '')));
begin
  if v_user_id is null then
    raise exception 'Entre na sua conta para ativar o modo Mangaká.';
  end if;

  -- Require a fresh Supabase session; the client reauthenticates with the current password first.
  v_iat := nullif(auth.jwt()->>'iat', '')::bigint;
  if v_iat is null
     or extract(epoch from now())::bigint - v_iat > 300
     or v_iat > extract(epoch from now())::bigint + 30 then
    raise exception 'Confirme sua senha novamente para continuar.';
  end if;

  if char_length(v_pen_name) < 2 or char_length(v_pen_name) > 80 then
    raise exception 'O nome artístico precisa ter entre 2 e 80 caracteres.';
  end if;

  if v_handle !~ '^[a-z0-9]+([._][a-z0-9]+)*[.]kx[.]mangaka$' then
    raise exception 'Identificador inválido. Use o formato nome.kx.mangaka.';
  end if;

  if not exists (select 1 from public.profiles where id = v_user_id) then
    raise exception 'Perfil LinkStory não encontrado.';
  end if;

  if exists (
    select 1 from public.mangaka_profiles
    where handle = v_handle and user_id <> v_user_id
  ) then
    raise exception 'Esse identificador já está em uso. Escolha outro.';
  end if;

  insert into public.mangaka_profiles (user_id, pen_name, handle, titles)
  values (v_user_id, v_pen_name, v_handle, array['leitor','mangaka']::text[])
  on conflict (user_id) do update
    set pen_name = excluded.pen_name,
        handle = excluded.handle,
        titles = array['leitor','mangaka']::text[],
        updated_at = now();

  update public.profiles
    set role = 'criador'::public.account_role,
        updated_at = now()
    where id = v_user_id;

  return jsonb_build_object(
    'user_id', v_user_id,
    'pen_name', v_pen_name,
    'handle', v_handle,
    'role', 'criador',
    'titles', to_jsonb(array['leitor','mangaka']::text[])
  );
exception
  when unique_violation then
    raise exception 'Esse identificador já está em uso. Escolha outro.';
end;
$function$;

revoke all on function public.activate_my_mangaka_profile(text, text) from public, anon;
grant execute on function public.activate_my_mangaka_profile(text, text) to authenticated;
