-- Turns row-level security on for every new table in the public schema.
--
-- The anon key ships in the client, so a table without RLS is open to anyone.
-- A migration still enables RLS itself (see CLAUDE.md), but a table made by
-- hand in the SQL editor used to stay open. This trigger closes that gap.
--
-- The trigger was first made in the Supabase dashboard on 2026-11-24. This
-- file mirrors it, so a new project gets the same guard. It is safe to run
-- against a project that already has the trigger.
--
-- RLS with no policy denies every client. A new table still needs a policy
-- in its own migration.

create or replace function public.rls_auto_enable()
returns event_trigger
language plpgsql
security definer
set search_path to 'pg_catalog'
as $function$
declare
  cmd record;
  tbl name;
begin
  for cmd in
    select *
    from pg_event_trigger_ddl_commands()
    where command_tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      and object_type in ('table', 'partitioned table')
  loop
    if cmd.schema_name is not null and cmd.schema_name in ('public') then
      begin
        select c.relname into tbl from pg_catalog.pg_class c where c.oid = cmd.objid;
        execute format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        raise log 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      exception
        when others then
          raise log 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      end;
    else
      raise log 'rls_auto_enable: skip % (schema % is not enforced)', cmd.object_identity, cmd.schema_name;
    end if;
  end loop;
end;
$function$;

drop event trigger if exists ensure_rls;
create event trigger ensure_rls
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function public.rls_auto_enable();
