-- Owner-scoped access. Before this migration every table trusted a
-- client-chosen player id, and the friend tables had RLS off, so anyone with
-- the public anon key could read and rewrite other players' rows.
--
-- The client now signs in with Supabase anonymous auth (see ensureSession in
-- src/lib/supabase.ts). The player id is auth.uid(), which the server sets
-- from a signed token, so a policy can compare a row against it.
--
-- Before you apply this: enable "Allow anonymous sign-ins" in the Supabase
-- dashboard (Authentication > Sign In / Providers). Without it no client can
-- get a session, and every policy below denies access.

-- ─── Premium entitlement ─────────────────────────────────────────────────────
-- Was "public read" using (true): anyone could list every paying player id.
drop policy if exists "public read" on public.premium_entitlements;
create policy "read own" on public.premium_entitlements
  for select to authenticated
  using (player_id = (select auth.uid())::text);

-- ─── Friend codes ────────────────────────────────────────────────────────────
alter table public.friend_codes enable row level security;

create policy "manage own" on public.friend_codes
  for all to authenticated
  using (player_id = (select auth.uid()))
  with check (player_id = (select auth.uid()) and char_length(display_name) <= 40);

-- ─── Friendships ─────────────────────────────────────────────────────────────
-- Read-only for clients. add_friend_by_code below is the only way to write a
-- row, so a player cannot befriend someone whose code they do not hold.
alter table public.friendships enable row level security;

create policy "read own" on public.friendships
  for select to authenticated
  using ((select auth.uid()) in (player_a, player_b));

-- The old lookup returned the code owner's player id to any caller, and the
-- client then inserted the friendship row itself.
drop function if exists public.lookup_friend_code(text);

create or replace function public.add_friend_by_code(p_code text, p_display_name text)
returns table (status text, friend_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me     uuid := auth.uid();
  v_friend uuid;
  v_name   text;
  v_mine   text := left(coalesce(nullif(trim(p_display_name), ''), 'Explorer'), 40);
begin
  if v_me is null then
    raise exception 'not signed in';
  end if;

  select fc.player_id, fc.display_name into v_friend, v_name
  from public.friend_codes fc
  where fc.code = p_code and fc.expires_at > now()
  limit 1;

  if v_friend is null then
    return query select 'not_found'::text, null::text;
    return;
  end if;
  if v_friend = v_me then
    return query select 'own_code'::text, null::text;
    return;
  end if;

  insert into public.friendships (player_a, player_b, name_a, name_b)
  values (
    least(v_me, v_friend),
    greatest(v_me, v_friend),
    case when v_me < v_friend then v_mine else v_name end,
    case when v_me < v_friend then v_name else v_mine end
  )
  on conflict (player_a, player_b) do nothing;

  if not found then
    return query select 'already'::text, v_name;
    return;
  end if;
  return query select 'added'::text, v_name;
end;
$$;

revoke all on function public.add_friend_by_code(text, text) from public, anon;
grant execute on function public.add_friend_by_code(text, text) to authenticated;

-- ─── Public stats ────────────────────────────────────────────────────────────
-- A player writes only their own row. A player reads their own row and the
-- rows of their friends. The values are still self-reported by the client.
create table if not exists public.player_public_stats (
  player_id       text        primary key,
  display_name    text        not null,
  level           int         not null default 1,
  total_steps     bigint      not null default 0,
  achievement_ids text[]      not null default '{}',
  updated_at      timestamptz not null default now()
);

alter table public.player_public_stats enable row level security;

drop policy if exists "public read"       on public.player_public_stats;
drop policy if exists "anyone can upsert" on public.player_public_stats;
drop policy if exists "anyone can update" on public.player_public_stats;

create policy "read own and friends" on public.player_public_stats
  for select to authenticated
  using (
    player_id = (select auth.uid())::text
    or exists (
      select 1 from public.friendships f
      where (f.player_a = (select auth.uid()) and f.player_b::text = player_public_stats.player_id)
         or (f.player_b = (select auth.uid()) and f.player_a::text = player_public_stats.player_id)
    )
  );

create policy "insert own" on public.player_public_stats
  for insert to authenticated
  with check (
    player_id = (select auth.uid())::text
    and char_length(display_name) <= 40
    and cardinality(achievement_ids) <= 200
  );

create policy "update own" on public.player_public_stats
  for update to authenticated
  using (player_id = (select auth.uid())::text)
  with check (
    player_id = (select auth.uid())::text
    and char_length(display_name) <= 40
    and cardinality(achievement_ids) <= 200
  );

-- ─── Monthly medal claims ────────────────────────────────────────────────────
-- The physical medal costs real money, so the server issues the pickup code.
-- claim_medal checks the verified entitlement and allows one claim per player
-- per month. The step count is still reported by the client: the server
-- cannot see it. Staff redeem a code at the meetup through redeem_medal,
-- which only the service role can call.
create table if not exists public.medal_claims (
  player_id   uuid        not null,
  month_key   text        not null check (month_key ~ '^\d{4}-\d{2}$'),
  claim_code  text        not null unique default replace(gen_random_uuid()::text, '-', ''),
  claimed_at  timestamptz not null default now(),
  redeemed_at timestamptz,
  primary key (player_id, month_key)
);

alter table public.medal_claims enable row level security;

create policy "read own" on public.medal_claims
  for select to authenticated
  using (player_id = (select auth.uid()));

create or replace function public.claim_medal()
returns table (month_key text, claim_code text, claimed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me    uuid := auth.uid();
  -- The event runs in Singapore, so the server names the month in that zone.
  v_month text := to_char(now() at time zone 'Asia/Singapore', 'YYYY-MM');
begin
  if v_me is null then
    raise exception 'not signed in';
  end if;

  -- expires_at, not is_active: is_active holds what was true when the last
  -- webhook event arrived, and a missed expiration event leaves it stale.
  if not exists (
    select 1 from public.premium_entitlements pe
    where pe.player_id = v_me::text and pe.expires_at > now()
  ) then
    raise exception 'not premium';
  end if;

  insert into public.medal_claims (player_id, month_key)
  values (v_me, v_month)
  on conflict do nothing;

  return query
    select mc.month_key, mc.claim_code, mc.claimed_at
    from public.medal_claims mc
    where mc.player_id = v_me and mc.month_key = v_month;
end;
$$;

revoke all on function public.claim_medal() from public, anon;
grant execute on function public.claim_medal() to authenticated;

create or replace function public.redeem_medal(p_code text)
returns table (player_id uuid, month_key text, redeemed_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  update public.medal_claims mc
  set redeemed_at = now()
  where mc.claim_code = p_code and mc.redeemed_at is null
  returning mc.player_id, mc.month_key, mc.redeemed_at;
$$;

revoke all on function public.redeem_medal(text) from public, anon, authenticated;
grant execute on function public.redeem_medal(text) to service_role;
