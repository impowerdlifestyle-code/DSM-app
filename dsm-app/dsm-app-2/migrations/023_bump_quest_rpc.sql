-- Atomic increment for daily_quests.progress (M6 from 2026-05-21 audit).
--
-- Old client pattern was read-then-update which lost increments when a
-- single user action handler fired two concurrent bumps. Mirror of
-- bump_messages_since_consolidation from 022.
--
-- Called from src/lib/supabase.js bumpQuest().

create or replace function public.bump_daily_quest(
  p_user_id  uuid,
  p_quest_id text,
  p_date     date,
  p_increment integer default 1
)
returns table (
  id            uuid,
  user_id       uuid,
  quest_id      text,
  date          date,
  progress      integer,
  target        integer,
  completed     boolean,
  just_completed boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_was_completed boolean;
begin
  -- Caller authentication. Service-role bypasses (auth.uid() = NULL).
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'caller is not the target user' using errcode = '42501';
  end if;

  -- Snapshot completion state before the update so we can compute
  -- just_completed reliably even under concurrent bumps.
  update public.daily_quests dq
    set progress  = least(dq.target, dq.progress + p_increment),
        completed = (least(dq.target, dq.progress + p_increment) >= dq.target),
        updated_at = now()
    where dq.user_id = p_user_id
      and dq.quest_id = p_quest_id
      and dq.date     = p_date
      and dq.completed = false
    returning dq.* into v_row;

  if v_row.id is null then
    -- Either no matching row, or quest was already completed.
    select dq.* into v_row from public.daily_quests dq
      where dq.user_id = p_user_id
        and dq.quest_id = p_quest_id
        and dq.date     = p_date;
    if v_row.id is null then
      return; -- empty result set; caller treats as { row: null, justCompleted: false }
    end if;
    return query select v_row.id, v_row.user_id, v_row.quest_id, v_row.date,
                        v_row.progress, v_row.target, v_row.completed, false;
    return;
  end if;

  -- The update bumped a row that wasn't completed before — just_completed
  -- is true iff the new state IS completed.
  return query select v_row.id, v_row.user_id, v_row.quest_id, v_row.date,
                      v_row.progress, v_row.target, v_row.completed, v_row.completed;
end;
$$;

revoke all on function public.bump_daily_quest(uuid, text, date, integer) from public;
grant execute on function public.bump_daily_quest(uuid, text, date, integer) to anon, authenticated, service_role;

comment on function public.bump_daily_quest(uuid, text, date, integer) is
  'Atomic daily-quest progress bump. Replaces the read-then-update pattern that lost increments under concurrent bumps (M6 fix).';
