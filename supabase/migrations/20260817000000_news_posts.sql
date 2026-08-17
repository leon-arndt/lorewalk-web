-- Player-facing news, authored in Supabase rather than bundled into the client.
-- Two readers depend on this table: the in-app News overlay, and (later) the
-- public website that lists landmarks and news. Bundling the copy into the PWA
-- would mean a redeploy of both to publish one post.
--
-- title/body are jsonb keyed by locale code ('en', 'de', 'ja', 'ko', 'zh',
-- 'ms', 'id', 'ta') because news copy is authored after ship and so cannot
-- live in the compile-time dictionaries under src/i18n/. 'en' is required and
-- is the fallback whenever a locale is missing.
create table if not exists public.news_posts (
  id           text        primary key,
  published_at timestamptz not null default now(),
  category     text        not null check (category in ('update', 'event', 'community')),
  hero_url     text,
  title        jsonb       not null,
  body         jsonb       not null,
  is_published boolean     not null default false,

  constraint news_posts_title_has_en check (title ? 'en'),
  constraint news_posts_body_has_en  check (body ? 'en')
);

create index if not exists news_posts_published_idx
  on public.news_posts (published_at desc)
  where is_published;

alter table public.news_posts enable row level security;

-- Read-only for clients, and only for posts that are actually published. No
-- insert/update policy on purpose: posts are authored through the Supabase
-- dashboard or the service-role key, never by a player.
create policy "public read published" on public.news_posts for select
  using (is_published);
