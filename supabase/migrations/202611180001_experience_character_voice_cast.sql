-- Persistent character voice identities for Melhor Experiência.
alter table public.mangas
  add column if not exists experience_voice_cast jsonb not null default '{}'::jsonb;

comment on column public.mangas.experience_voice_cast is
  'Stable AI-selected ElevenLabs voice assignments keyed by normalized character name for Melhor Experiência.';
