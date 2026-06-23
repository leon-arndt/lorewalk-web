-- Friend-code expiry must not depend on the client clock. Previously the web
-- client both stamped expires_at (Date.now() + 72h) and filtered live codes with
-- a client-supplied timestamp, so a skewed device clock could make codes look
-- expired or valid incorrectly. These RPCs compare against the server's now(),
-- and inserts now rely on the table's now()-based default for expires_at.

create or replace function public.get_active_friend_code(p_player_id uuid)
returns table (code text, expires_at timestamptz)
language sql stable as $$
  select code, expires_at
  from public.friend_codes
  where player_id = p_player_id
    and expires_at > now()
  order by created_at desc
  limit 1;
$$;

create or replace function public.lookup_friend_code(p_code text)
returns table (player_id uuid, display_name text)
language sql stable as $$
  select player_id, display_name
  from public.friend_codes
  where code = p_code
    and expires_at > now()
  limit 1;
$$;

-- NOTE: RLS on friend_codes / friendships stays disabled — scoping reads to the
-- owning player requires auth.uid(), which needs Supabase Auth wired first. Until
-- then the anon client can still enumerate the tables; re-enable per the original
-- migration's TODO once authentication lands. (Tracked separately, not fixable here.)
