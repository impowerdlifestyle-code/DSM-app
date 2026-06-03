-- Enable Supabase Realtime for group_messages (instant group-chat delivery).
-- Requires 028_group_chat.sql to have run first. Idempotent.
--
-- REPLICA IDENTITY FULL so DELETE events carry group_id in the payload
-- (otherwise the client's group_id realtime filter can't match deletes).

alter table public.group_messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'group_messages'
  ) then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end $$;
