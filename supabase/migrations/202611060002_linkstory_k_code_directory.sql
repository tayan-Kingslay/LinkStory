create sequence if not exists public.linkstory_k_code_seq;
alter table public.profiles add column if not exists k_code text;
with numbered as (
 select id,row_number() over(order by created_at asc,id asc) n from public.profiles
 where k_code is null or btrim(k_code)=''
)
update public.profiles p set k_code='K-'||lpad(numbered.n::text,3,'0') from numbered where p.id=numbered.id;
create unique index if not exists profiles_k_code_unique on public.profiles(k_code);
select setval('public.linkstory_k_code_seq',
 greatest(coalesce((select max(regexp_replace(k_code,'^K-','')::bigint) from public.profiles where k_code~'^K-[0-9]+$'),0),1),
 coalesce((select max(regexp_replace(k_code,'^K-','')::bigint) from public.profiles where k_code~'^K-[0-9]+$'),0)>0);
create or replace function public.assign_linkstory_k_code() returns trigger language plpgsql set search_path=public as $$
begin
 if new.k_code is null or btrim(new.k_code)='' then new.k_code:='K-'||lpad(nextval('public.linkstory_k_code_seq')::text,3,'0'); end if;
 return new;
end; $$;
drop trigger if exists profiles_assign_k_code on public.profiles;
create trigger profiles_assign_k_code before insert on public.profiles for each row execute function public.assign_linkstory_k_code();
create or replace function public.search_linkstory_people(p_query text)
returns table(id uuid,username text,display_name text,avatar_url text,k_code text)
language plpgsql stable security definer set search_path=public as $$
declare q text:=lower(trim(coalesce(p_query,'')));
begin
 if auth.uid() is null then raise exception 'Entre na sua conta para procurar pessoas.'; end if;
 if length(q)<2 then return; end if;
 return query select p.id,p.username,p.display_name,p.avatar_url,p.k_code
 from public.profiles p where p.id<>auth.uid() and (
 lower(coalesce(p.k_code,''))=q or lower(coalesce(p.username,''))=q or lower(coalesce(p.display_name,'')) like '%'||q||'%')
 order by case when lower(coalesce(p.k_code,''))=q then 0 when lower(coalesce(p.username,''))=q then 1 else 2 end,p.display_name asc limit 12;
end; $$;
create or replace function public.send_friend_request(p_username text)
returns text language plpgsql security definer set search_path=public as $$
declare v_sender uuid:=auth.uid();v_recipient uuid;v_existing uuid;q text:=lower(trim(coalesce(p_username,'')));v_matches integer;
begin
 if v_sender is null then raise exception 'Entre na sua conta para adicionar amigos.'; end if;
 if q='' then raise exception 'Digite um nome, usuário ou K-Code.'; end if;
 select count(*) into v_matches from public.profiles p where p.id<>v_sender and (
 lower(coalesce(p.k_code,''))=q or lower(coalesce(p.username,''))=q or lower(coalesce(p.kx_mail,''))=q or lower(coalesce(p.display_name,''))=q);
 if v_matches=0 then raise exception 'Não encontramos essa conta.'; end if;
 if v_matches>1 then raise exception 'Encontramos mais de uma conta com esse nome. Use o K-Code para localizar a pessoa certa.'; end if;
 select id into v_recipient from public.profiles p where p.id<>v_sender and (
 lower(coalesce(p.k_code,''))=q or lower(coalesce(p.username,''))=q or lower(coalesce(p.kx_mail,''))=q or lower(coalesce(p.display_name,''))=q) limit 1;
 if exists(select 1 from public.friendships where user_a=least(v_sender,v_recipient) and user_b=greatest(v_sender,v_recipient)) then return 'already_friends'; end if;
 select id into v_existing from public.friend_requests where sender_id=v_recipient and recipient_id=v_sender and status='pending' limit 1;
 if v_existing is not null then
  update public.friend_requests set status='accepted',updated_at=now() where id=v_existing;
  insert into public.friendships(user_a,user_b) values(least(v_sender,v_recipient),greatest(v_sender,v_recipient)) on conflict do nothing;
  return 'accepted_existing_request';
 end if;
 insert into public.friend_requests(sender_id,recipient_id,status) values(v_sender,v_recipient,'pending')
 on conflict(sender_id,recipient_id) do update set status='pending',updated_at=now();
 return 'request_sent';
end; $$;
grant execute on function public.search_linkstory_people(text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
revoke all on function public.search_linkstory_people(text) from public, anon;
revoke all on function public.send_friend_request(text) from public, anon;
grant execute on function public.search_linkstory_people(text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
