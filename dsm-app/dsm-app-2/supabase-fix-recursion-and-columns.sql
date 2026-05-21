-- DSM — fix RLS recursion + column name mismatches
-- Idempotent. Run AFTER the bundled migrations.

-- =========================================================================
-- 1. SCHEMA: rename did_steps → did_action_steps so code matches table
-- =========================================================================
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='action_steps' and column_name='did_steps'
  ) and not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='action_steps' and column_name='did_action_steps'
  ) then
    alter table public.action_steps rename column did_steps to did_action_steps;
  end if;
end$$;

-- =========================================================================
-- 2. HELPER FUNCTIONS — bypass RLS to break self-referential policies
-- =========================================================================
create or replace function public.is_coach()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and role = 'coach')
$$;

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists(select 1 from public.profiles where id = auth.uid() and is_admin = true)
$$;

create or replace function public.is_squad_member(_squad_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public, auth
as $$
  select exists(
    select 1 from public.squad_members where squad_id = _squad_id and user_id = auth.uid()
  )
$$;

grant execute on function public.is_coach()                 to anon, authenticated;
grant execute on function public.is_admin()                 to anon, authenticated;
grant execute on function public.is_squad_member(uuid)      to anon, authenticated;

-- =========================================================================
-- 3. PROFILES — replace recursive policies with function-based ones
-- =========================================================================
drop policy if exists "Coaches can view all profiles" on public.profiles;
drop policy if exists "Admins view all profiles"     on public.profiles;

create policy "Coaches can view all profiles" on public.profiles
  for select using (is_coach());
create policy "Admins view all profiles" on public.profiles
  for select using (is_admin());

-- =========================================================================
-- 4. SQUAD_MEMBERS — replace recursive policies
-- =========================================================================
drop policy if exists "squad_members_select_same"   on public.squad_members;
drop policy if exists "squad_members_admin_view"    on public.squad_members;

-- A member can see their own row(s)
create policy "squad_members_select_own" on public.squad_members
  for select using (user_id = auth.uid());

-- A member can see other members of squads they belong to
create policy "squad_members_select_peers" on public.squad_members
  for select using (is_squad_member(squad_id));

create policy "squad_members_admin_view" on public.squad_members
  for select using (is_coach() or is_admin());

-- =========================================================================
-- 5. SQUADS — replace any recursive-style policy with function-based
-- =========================================================================
drop policy if exists "squads_select_member"     on public.squads;
drop policy if exists "squads_admin_view_all"    on public.squads;

create policy "squads_select_member" on public.squads
  for select using (is_squad_member(squads.id));
create policy "squads_admin_view_all" on public.squads
  for select using (is_coach() or is_admin());

-- =========================================================================
-- 6. COACH/ADMIN view-all on per-user tables — convert to function-based
-- =========================================================================
do $$
declare
  tbl text;
  tbls text[] := array[
    'action_steps','habits','chat_history','ball_mastery','weekly_checkins',
    'coach_memory','voice_journal','message_feedback',
    'xp_log','badges_earned','daily_quests','workouts_log','workout_sets',
    'food_log','nutrition_targets','body_stats','progress_photos','coach_nudges',
    'match_log'
  ];
begin
  foreach tbl in array tbls loop
    if to_regclass('public.' || tbl) is not null then
      execute format('drop policy if exists "Coaches can view all %1$s" on public.%1$s;', tbl);
      execute format('drop policy if exists "Admins view all %1$s"     on public.%1$s;', tbl);
      execute format(
        'create policy "Coaches can view all %1$s" on public.%1$s for select using (is_coach());',
        tbl
      );
      execute format(
        'create policy "Admins view all %1$s" on public.%1$s for select using (is_admin());',
        tbl
      );
    end if;
  end loop;
end$$;

-- match_log specifically had coach/admin policies with different names
drop policy if exists "match_log_coach_view" on public.match_log;
drop policy if exists "match_log_admin_view" on public.match_log;
create policy "match_log_coach_view" on public.match_log
  for select using (is_coach());
create policy "match_log_admin_view" on public.match_log
  for select using (is_admin());

-- parent_links admin view
drop policy if exists "parent_links_admin_view" on public.parent_links;
create policy "parent_links_admin_view" on public.parent_links
  for select using (is_coach() or is_admin());

-- locker_room_notes — coach/admin only
drop policy if exists "locker_notes_admin_all" on public.locker_room_notes;
create policy "locker_notes_admin_all" on public.locker_room_notes
  for all using (is_coach() or is_admin())
       with check (author_id = auth.uid() and (is_coach() or is_admin()));

-- coach_nudges admin view
drop policy if exists "nudges_admin_view" on public.coach_nudges;
create policy "nudges_admin_view" on public.coach_nudges
  for select using (is_coach() or is_admin());

-- recap_log admin view
drop policy if exists "recap_log_admin_view" on public.recap_log;
create policy "recap_log_admin_view" on public.recap_log
  for select using (is_coach() or is_admin());
