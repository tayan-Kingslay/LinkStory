-- INSPEX remains a separate project; remove only its unused LinkStory database objects.
-- The submissions table references articles, so remove it first.
drop table public.inspex_submissions;
drop table public.inspex_articles;
