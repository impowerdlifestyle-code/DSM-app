-- Atomic increment for coach_memory.messages_since_consolidation (H1 fix).
--
-- Old client pattern was read-then-upsert which lost increments under
-- concurrent Coach V message saves. This RPC does INSERT ... ON CONFLICT
-- DO UPDATE in one statement, eliminating the race.
--
-- Called from src/lib/supabase.js bumpMessagesSinceConsolidation().

create or replace function public.bump_messages_since_consolidation(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_count integer;
begin
  -- Verify caller. Service-role calls have auth.uid() = NULL and bypass.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'caller is not the target user' using errcode = '42501';
  end if;

  insert into public.coach_memory (user_id, messages_since_consolidation, updated_at)
    values (p_user_id, 1, now())
  on conflict (user_id) do update
    set messages_since_consolidation = public.coach_memory.messages_since_consolidation + 1,
        updated_at = now()
  returning messages_since_consolidation into v_new_count;

  return v_new_count;
end;
$$;

revoke all on function public.bump_messages_since_consolidation(uuid) from public;
grant execute on function public.bump_messages_since_consolidation(uuid) to anon, authenticated, service_role;

comment on function public.bump_messages_since_consolidation(uuid) is
  'Atomic increment of coach_memory.messages_since_consolidation for the given user. Replaces the read-then-upsert pattern that lost increments under concurrent writes (H1 fix from 2026-05-21 audit).';
