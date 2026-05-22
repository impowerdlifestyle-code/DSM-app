-- DSM — bulletproof RLS reset
-- Drops and recreates every policy that could cause recursion on profiles,
-- using SECURITY DEFINER helpers exclusively. Safe to run any time.

-- 1. Ensure helper functions exist (idempotent)
create or replace function public.is_coach()
returns boolean language sql security definer stable
set search_path = public, auth
as $$ select exists(select 1 from public.profiles where id = auth.uid() and role = 'coach') $$;

create or replace function public.is_admin()
returns boolean language sql security definer stable
set search_path = public, auth
as $$ select exists(select 1 from public.profiles where id = auth.uid() and is_admin = true) $$;

create or replace function public.is_squad_member(_squad_id uuid)
returns boolean language sql security definer stable
set search_path = public, auth
as $$ select exists(select 1 from public.squad_members where squad_id = _squad_id and user_id = auth.uid()) $$;

grant execute on function public.is_coach()             to anon, authenticated;
grant execute on function public.is_admin()             to anon, authenticated;
grant execute on function public.is_squad_member(uuid)  to anon, authenticated;

-- 2. Wipe and rebuild every profile SELECT policy
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end$$;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Coaches can view all profiles" on public.profiles
  for select using (is_coach());

create policy "Admins view all profiles" on public.profiles
  for select using (is_admin());

create policy "Parents view linked athlete profile" on public.profiles
  for select using (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = auth.uid() and pl.athlete_id = profiles.id)
  );

-- 3. parent_links — drop all policies, recreate without profiles refs
do $$
declare pol record;
begin
  if to_regclass('public.parent_links') is not null then
    for pol in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = 'parent_links'
    loop
      execute format('drop policy if exists %I on public.parent_links', pol.policyname);
    end loop;
  end if;
end$$;

create policy "parent_links_self_select" on public.parent_links
  for select using (auth.uid() = parent_id or auth.uid() = athlete_id);
create policy "parent_links_self_insert" on public.parent_links
  for insert with check (auth.uid() = parent_id);
create policy "parent_links_self_delete" on public.parent_links
  for delete using (auth.uid() = parent_id or auth.uid() = athlete_id);
create policy "parent_links_admin_view" on public.parent_links
  for select using (is_coach() or is_admin());

-- 4. squads + squad_members — full rebuild via helper fns
do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'squad_members'
  loop
    execute format('drop policy if exists %I on public.squad_members', pol.policyname);
  end loop;
end$$;
create policy "squad_members_select_own"   on public.squad_members for select using (user_id = auth.uid());
create policy "squad_members_select_peers" on public.squad_members for select using (is_squad_member(squad_id));
create policy "squad_members_admin_view"   on public.squad_members for select using (is_coach() or is_admin());
create policy "squad_members_insert_self"  on public.squad_members for insert with check (user_id = auth.uid());
create policy "squad_members_delete_self"  on public.squad_members for delete using (user_id = auth.uid());

do $$
declare pol record;
begin
  for pol in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'squads'
  loop
    execute format('drop policy if exists %I on public.squads', pol.policyname);
  end loop;
end$$;
create policy "squads_select_member"    on public.squads for select using (is_squad_member(squads.id));
create policy "squads_select_creator"   on public.squads for select using (created_by = auth.uid());
create policy "squads_admin_view_all"   on public.squads for select using (is_coach() or is_admin());
create policy "squads_insert_self"      on public.squads for insert with check (created_by = auth.uid());

-- 5. Per-user table coach/admin view-all policies (bulk rebuild)
do $$
declare
  tbl text;
  tbls text[] := array[
    'action_steps','habits','chat_history','ball_mastery','weekly_checkins',
    'coach_memory','voice_journal','message_feedback',
    'xp_log','badges_earned','daily_quests','workouts_log','workout_sets',
    'food_log','nutrition_targets','body_stats','progress_photos','coach_nudges',
    'match_log','recap_log','locker_room_notes'
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
