-- Coin packs. A coin pack costs real money, so the server records the
-- purchase. The revenuecat-webhook Edge Function writes one row for each
-- verified Google Play purchase. The client reads the rows of its own player
-- and adds the coins to the profile (see src/lib/coinGrants.ts).
--
-- This table does not make the coin balance server-side. The balance stays in
-- the profile, which is client data. The table only makes sure that a paid
-- pack arrives one time, on every device of the player.

create table if not exists public.coin_grants (
  -- The store transaction id. RevenueCat sends an event again after a failed
  -- delivery, and the key makes the second insert a no-op.
  id         text        primary key,
  player_id  uuid        not null,
  coins      int         not null check (coins > 0),
  product_id text        not null,
  created_at timestamptz not null default now()
);

create index if not exists coin_grants_player_id on public.coin_grants (player_id);

alter table public.coin_grants enable row level security;

-- Read-only for clients. No insert, update, or delete policy on purpose: only
-- the service role (the webhook) writes.
create policy "read own" on public.coin_grants
  for select to authenticated
  using (player_id = (select auth.uid()));

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
  delete from public.premium_entitlements where player_id = v_me::text;
  delete from public.coin_grants where player_id = v_me;
  delete from public.player_saves where player_id = v_me;

  delete from auth.users where id = v_me;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
