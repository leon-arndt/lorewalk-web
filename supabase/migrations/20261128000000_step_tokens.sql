-- ─── Monthly Step Goal and Step Tokens ───────────────────────────────────────
-- A player who walks the Monthly Step Goal in a month with Premium has a goal
-- month. A count of goal months earns a physical token: 1, 3, 6, and 12 months,
-- then every 6 months. The token costs real money, so the server issues the
-- pickup code.
--
-- The server cannot see steps: the client reports that a month reached the
-- goal. The server can see the calendar and the entitlement, so it keeps its
-- own list of goal months. A player who fakes steps still needs as many paid
-- months as a player who walks.
create table if not exists public.step_goal_months (
  player_id  uuid        not null,
  month_key  text        not null check (month_key ~ '^\d{4}-\d{2}$'),
  reached_at timestamptz not null default now(),
  primary key (player_id, month_key)
);

alter table public.step_goal_months enable row level security;

create policy "read own" on public.step_goal_months
  for select to authenticated
  using (player_id = (select auth.uid()));

-- Records a goal month. It takes this month, and the month before it in its
-- first 7 days: a phone gives the steps of the last 7 days, so a goal that the
-- player reached on the last day of a month still counts. openGoalMonths() in
-- src/lib/stepTokens.ts uses the same rule.
create or replace function public.record_step_goal(p_month_key text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me    uuid := auth.uid();
  -- The game runs in Singapore, so the server names the month in that zone.
  v_now   timestamp := now() at time zone 'Asia/Singapore';
  v_month text := to_char(v_now, 'YYYY-MM');
  v_prev  text := to_char(v_now - interval '1 month', 'YYYY-MM');
begin
  if v_me is null then
    raise exception 'not signed in';
  end if;

  if not (p_month_key = v_month or (p_month_key = v_prev and extract(day from v_now) <= 7)) then
    raise exception 'month is closed';
  end if;

  -- expires_at, not is_active: is_active holds what was true when the last
  -- webhook event arrived, and a missed expiration event leaves it stale.
  if not exists (
    select 1 from public.premium_entitlements pe
    where pe.player_id = v_me::text and pe.expires_at > now()
  ) then
    raise exception 'not premium';
  end if;

  insert into public.step_goal_months (player_id, month_key)
  values (v_me, p_month_key)
  on conflict do nothing;
end;
$$;

revoke all on function public.record_step_goal(text) from public, anon;
grant execute on function public.record_step_goal(text) to authenticated;

-- A claim issues the pickup code of one token. Staff redeem a code at the
-- Community Walk through redeem_step_token, which only the service role can call.
create table if not exists public.step_token_claims (
  player_id   uuid        not null,
  milestone   int         not null check (milestone in (1, 3, 6) or (milestone >= 12 and milestone % 6 = 0)),
  month_key   text        not null check (month_key ~ '^\d{4}-\d{2}$'),
  claim_code  text        not null unique default replace(gen_random_uuid()::text, '-', ''),
  claimed_at  timestamptz not null default now(),
  redeemed_at timestamptz,
  primary key (player_id, milestone),
  unique (player_id, month_key)
);

alter table public.step_token_claims enable row level security;

create policy "read own" on public.step_token_claims
  for select to authenticated
  using (player_id = (select auth.uid()));

create or replace function public.claim_step_token(p_milestone int)
returns table (milestone int, month_key text, claim_code text, claimed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me      uuid := auth.uid();
  v_month   text := to_char(now() at time zone 'Asia/Singapore', 'YYYY-MM');
  v_highest int;
  v_next    int;
  v_months  int;
begin
  if v_me is null then
    raise exception 'not signed in';
  end if;

  -- A claim that exists comes back as it is, so a client that lost the answer
  -- can ask again.
  if not exists (
    select 1 from public.step_token_claims c
    where c.player_id = v_me and c.milestone = p_milestone
  ) then
    if not exists (
      select 1 from public.premium_entitlements pe
      where pe.player_id = v_me::text and pe.expires_at > now()
    ) then
      raise exception 'not premium';
    end if;

    -- The tokens go in order: 1, 3, 6, 12, then every 6 months.
    select coalesce(max(c.milestone), 0) into v_highest
    from public.step_token_claims c where c.player_id = v_me;
    v_next := case
      when v_highest < 1 then 1
      when v_highest < 3 then 3
      when v_highest < 6 then 6
      when v_highest < 12 then 12
      else v_highest - (v_highest % 6) + 6
    end;
    if p_milestone <> v_next then
      raise exception 'not the next token';
    end if;

    select count(*) into v_months
    from public.step_goal_months g where g.player_id = v_me;
    if v_months < p_milestone then
      raise exception 'not enough goal months';
    end if;

    if exists (
      select 1 from public.step_token_claims c
      where c.player_id = v_me and c.month_key = v_month
    ) then
      raise exception 'one token each month';
    end if;

    insert into public.step_token_claims (player_id, milestone, month_key)
    values (v_me, p_milestone, v_month)
    on conflict do nothing;
  end if;

  return query
    select c.milestone, c.month_key, c.claim_code, c.claimed_at
    from public.step_token_claims c
    where c.player_id = v_me and c.milestone = p_milestone;
end;
$$;

revoke all on function public.claim_step_token(int) from public, anon;
grant execute on function public.claim_step_token(int) to authenticated;

create or replace function public.redeem_step_token(p_code text)
returns table (player_id uuid, milestone int, redeemed_at timestamptz)
language sql
security definer
set search_path = ''
as $$
  update public.step_token_claims c
  set redeemed_at = now()
  where c.claim_code = p_code and c.redeemed_at is null
  returning c.player_id, c.milestone, c.redeemed_at;
$$;

revoke all on function public.redeem_step_token(text) from public, anon, authenticated;
grant execute on function public.redeem_step_token(text) to service_role;

-- delete_account must clear every table that keys on the player id.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := auth.uid();
begin
  if v_me is null then
    raise exception 'not signed in';
  end if;

  -- These tables carry no foreign key to auth.users, so nothing cascades.
  delete from public.friendships where player_a = v_me or player_b = v_me;
  delete from public.friend_codes where player_id = v_me;
  delete from public.player_public_stats where player_id = v_me::text;
  delete from public.medal_claims where player_id = v_me;
  delete from public.step_goal_months where player_id = v_me;
  delete from public.step_token_claims where player_id = v_me;
  delete from public.premium_entitlements where player_id = v_me::text;
  delete from public.coin_grants where player_id = v_me;
  delete from public.player_saves where player_id = v_me;

  delete from auth.users where id = v_me;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
