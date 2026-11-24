-- Cloud save: one row per signed-in player holds the whole profile as JSON, so
-- a player can move to a new phone or play on two devices.
--
-- The client is the author of the save. The server does not verify gameplay
-- values (see "Auth and row-level security" in CLAUDE.md), so this table only
-- guarantees two things: a player touches only their own row, and a device
-- that worked from an old copy cannot overwrite a newer one without knowing.
--
-- Only an account with a linked identity (Google sign-in) may save. An
-- anonymous session lives on one device, so a save for it protects nothing,
-- and anyone with the anon key could otherwise mint sessions to store blobs.
--
-- Before you apply this: enable the Google provider and "Manual linking" in
-- the Supabase dashboard (Authentication > Sign In / Providers).

create table if not exists public.player_saves (
  player_id  uuid        primary key references auth.users (id) on delete cascade,
  profile    jsonb       not null,
  revision   bigint      not null default 1,
  updated_at timestamptz not null default now()
);

alter table public.player_saves enable row level security;

-- Read-only for clients. save_profile below is the only way to write a row.
create policy "read own" on public.player_saves
  for select to authenticated
  using (player_id = (select auth.uid()));

-- p_base_revision is the revision the device last saw, or 0 when it saw no
-- row. A mismatch means another device saved in between: the function then
-- writes nothing and returns 'conflict' with the current revision, and the
-- client asks the player which save to keep.
create or replace function public.save_profile(p_profile jsonb, p_base_revision bigint)
returns table (status text, revision bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me  uuid := auth.uid();
  v_rev bigint;
begin
  if v_me is null then
    raise exception 'not signed in';
  end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) then
    raise exception 'account not linked';
  end if;
  if jsonb_typeof(p_profile) is distinct from 'object' or octet_length(p_profile::text) > 1048576 then
    raise exception 'invalid profile';
  end if;

  select ps.revision into v_rev
  from public.player_saves ps
  where ps.player_id = v_me
  for update;

  if v_rev is null then
    insert into public.player_saves (player_id, profile)
    values (v_me, p_profile)
    on conflict (player_id) do nothing;

    if found then
      return query select 'saved'::text, 1::bigint;
    else
      -- Two devices raced to make the first save, and the other one won.
      return query
        select 'conflict'::text, ps.revision
        from public.player_saves ps
        where ps.player_id = v_me;
    end if;
    return;
  end if;

  if v_rev <> p_base_revision then
    return query select 'conflict'::text, v_rev;
    return;
  end if;

  update public.player_saves ps
  set profile = p_profile, revision = v_rev + 1, updated_at = now()
  where ps.player_id = v_me;

  return query select 'saved'::text, v_rev + 1;
end;
$$;

revoke all on function public.save_profile(jsonb, bigint) from public, anon;
grant execute on function public.save_profile(jsonb, bigint) to authenticated;
