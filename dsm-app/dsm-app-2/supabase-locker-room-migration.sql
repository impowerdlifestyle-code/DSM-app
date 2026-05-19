-- DSM — Locker Room + Squads + Proactive Nudges + Memory Themes
-- Idempotent. Run AFTER supabase-full-migration.sql + supabase-phase2-3-migration.sql.

-- =========================================================================
-- ADMIN FLAG ON PROFILES
-- =========================================================================
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- =========================================================================
-- SQUADS — private friend groups with weekly XP leaderboard
-- =========================================================================
create table if not exists public.squads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
create index if not exists squads_invite_idx on public.squads (invite_code);

create table if not exists public.squad_members (
  squad_id  uuid not null references public.squads(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (squad_id, user_id)
);
create index if not exists squad_members_user_idx on public.squad_members (user_id);

alter table public.squads          enable row level security;
alter table public.squad_members   enable row level security;

drop policy if exists "squads_select_member"     on public.squads;
drop policy if exists "squads_insert_self"       on public.squads;
drop policy if exists "squads_admin_view_all"    on public.squads;
create policy "squads_select_member" on public.squads for select using (
  exists (select 1 from public.squad_members sm where sm.squad_id = squads.id and sm.user_id = auth.uid())
);
create policy "squads_insert_self" on public.squads for insert with check (created_by = auth.uid());
create policy "squads_admin_view_all" on public.squads for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
);

drop policy if exists "squad_members_select_same"   on public.squad_members;
drop policy if exists "squad_members_insert_self"   on public.squad_members;
drop policy if exists "squad_members_delete_self"   on public.squad_members;
drop policy if exists "squad_members_admin_view"    on public.squad_members;
create policy "squad_members_select_same" on public.squad_members for select using (
  exists (select 1 from public.squad_members me where me.squad_id = squad_members.squad_id and me.user_id = auth.uid())
);
create policy "squad_members_insert_self" on public.squad_members for insert with check (user_id = auth.uid());
create policy "squad_members_delete_self" on public.squad_members for delete using (user_id = auth.uid());
create policy "squad_members_admin_view" on public.squad_members for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
);

-- =========================================================================
-- COACH NUDGES — proactive Coach V messages
-- =========================================================================
create table if not exists public.coach_nudges (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null,      -- 'missed-workout' | 'low-mood' | 'plateau' | 'streak-risk' | 'win'
  message       text not null,
  signal        text,                -- what triggered it (debug info)
  shown_at      timestamptz,
  dismissed_at  timestamptz,
  acted_on_at   timestamptz,
  created_at    timestamptz not null default now()
);
create index if not exists coach_nudges_user_created_idx on public.coach_nudges (user_id, created_at desc);

alter table public.coach_nudges enable row level security;
drop policy if exists "nudges_select_own"   on public.coach_nudges;
drop policy if exists "nudges_insert_own"   on public.coach_nudges;
drop policy if exists "nudges_update_own"   on public.coach_nudges;
drop policy if exists "nudges_admin_view"   on public.coach_nudges;
create policy "nudges_select_own" on public.coach_nudges for select using (auth.uid() = user_id);
create policy "nudges_insert_own" on public.coach_nudges for insert with check (auth.uid() = user_id);
create policy "nudges_update_own" on public.coach_nudges for update using (auth.uid() = user_id);
create policy "nudges_admin_view" on public.coach_nudges for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
);

-- =========================================================================
-- LOCKER ROOM NOTES — admin/coach-only private notes per athlete
-- =========================================================================
create table if not exists public.locker_room_notes (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references auth.users(id) on delete cascade,
  author_id    uuid not null references auth.users(id) on delete cascade,
  note         text not null,
  pinned       boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists locker_notes_athlete_idx on public.locker_room_notes (athlete_id, created_at desc);

alter table public.locker_room_notes enable row level security;
drop policy if exists "locker_notes_admin_all"  on public.locker_room_notes;
create policy "locker_notes_admin_all" on public.locker_room_notes for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
) with check (
  author_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
);

-- =========================================================================
-- COACH MEMORY — themed structure + voice journal action proposals
-- =========================================================================
alter table public.coach_memory
  add column if not exists themes jsonb not null default '{}'::jsonb;

alter table public.voice_journal
  add column if not exists extracted_actions jsonb not null default '[]'::jsonb;

-- =========================================================================
-- ADMIN RLS EXTENSIONS — coach-row policies already exist for most tables.
-- Add equivalent is_admin policies so admins (Ciaran/Valentino) can view all.
-- =========================================================================

-- profiles
drop policy if exists "Admins view all profiles" on public.profiles;
create policy "Admins view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- generic helper macro: for each per-user table, add admin view-all
do $$
declare
  tbl text;
  tbls text[] := array[
    'action_steps','habits','chat_history','ball_mastery','weekly_checkins',
    'coach_memory','voice_journal','message_feedback',
    'xp_log','badges_earned','daily_quests','workouts_log','workout_sets',
    'food_log','nutrition_targets','body_stats','progress_photos','coach_nudges'
  ];
begin
  foreach tbl in array tbls loop
    execute format('drop policy if exists "Admins view all %1$s" on public.%1$s;', tbl);
    execute format(
      'create policy "Admins view all %1$s" on public.%1$s for select using (' ||
      '  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)' ||
      ');',
      tbl
    );
  end loop;
end$$;
