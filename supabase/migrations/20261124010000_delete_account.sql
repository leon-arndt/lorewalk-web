-- Account deletion. A player can delete the account and every row that keys
-- on it, from inside the app. Google Play requires this for an app with
-- sign-in, and it is the honest counterpart to "sign in to save progress".
--
-- A client cannot delete an auth user: that needs the service role. This
-- function runs as its owner, and auth.uid() limits it to the caller.
--
-- It does not cancel a Play subscription. Google bills that, and only the
-- player can cancel it. If a renewal arrives later, the RevenueCat webhook
-- writes a premium_entitlements row for an id that no longer has a user.

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
  delete from public.player_saves where player_id = v_me;

  delete from auth.users where id = v_me;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
