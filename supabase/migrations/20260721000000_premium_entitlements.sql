-- Server-verified Premium entitlement. Replaces trusting the client's local
-- isPremium flag for anything real: this table is only ever written by the
-- revenuecat-webhook Edge Function (service role, bypasses RLS), driven by
-- RevenueCat's server-to-server webhook after a Google Play purchase is
-- verified. The client only ever reads its own row.
--
-- player_id is text, not uuid, matching player_public_stats (see CLAUDE.md) -
-- profile ids are client-generated strings like `guest_<timestamp>`, not UUIDs.
create table if not exists public.premium_entitlements (
  player_id              text        primary key,
  is_active               boolean     not null default false,
  product_id              text,
  interval                text        check (interval in ('monthly', 'yearly')),
  expires_at              timestamptz,
  revenuecat_app_user_id  text,
  updated_at              timestamptz not null default now()
);

alter table public.premium_entitlements enable row level security;

-- Read-only for clients. No insert/update policy on purpose - only the
-- service-role key (Edge Function) can write, since this table is the
-- server-verified source of truth that gates real Premium features.
create policy "public read" on public.premium_entitlements for select using (true);
