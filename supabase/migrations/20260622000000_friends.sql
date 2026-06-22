-- Friend codes: each player has at most one active code at a time.
-- Codes are multi-use within the 72-hour window; expiry is the spam guard.
create table if not exists public.friend_codes (
  id           uuid        primary key default gen_random_uuid(),
  player_id    uuid        not null,
  display_name text        not null default 'Explorer',
  code         text        not null unique,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null default (now() + interval '72 hours')
);

create index if not exists friend_codes_player_id on public.friend_codes (player_id);
create index if not exists friend_codes_code      on public.friend_codes (code);

-- Friendships: one row per pair, canonical ordering (player_a < player_b)
-- prevents duplicates. Display names are snapshotted at add-time.
create table if not exists public.friendships (
  id         uuid        primary key default gen_random_uuid(),
  player_a   uuid        not null,
  player_b   uuid        not null,
  name_a     text        not null default 'Explorer',
  name_b     text        not null default 'Explorer',
  created_at timestamptz not null default now(),
  unique (player_a, player_b),
  check (player_a < player_b)
);

create index if not exists friendships_player_a on public.friendships (player_a);
create index if not exists friendships_player_b on public.friendships (player_b);

-- RLS: disabled for now (no Supabase Auth wired yet).
-- Re-enable and scope to auth.uid() once authentication is added.
alter table public.friend_codes disable row level security;
alter table public.friendships  disable row level security;
