-- DSM — Onboarding + Match-Day + Engagement Loop + Parent Dashboard
-- Idempotent. Run AFTER supabase-locker-room-migration.sql.

-- =========================================================================
-- PROFILES — onboarding state + extended athlete fields + parent role
-- =========================================================================
alter table public.profiles
  add column if not exists onboarded_at        timestamptz,
  add column if not exists position            text,
  add column if not exists age                 int,
  add column if not exists club_team           text,
  add column if not exists identity_goal       text,
  add column if not exists baseline            jsonb not null default '{}'::jsonb,
  add column if not exists obstacles           text[] not null default '{}',
  add column if not exists match_cadence       text,
  add column if not exists starter_focus       jsonb not null default '{}'::jsonb;

-- role values now include 'parent' alongside existing 'athlete' / 'coach'
-- no constraint change needed; role is plain text.

-- =========================================================================
-- MATCH LOG — pre/post match state per game
-- =========================================================================
create table if not exists public.match_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  match_date      date not null,
  opponent        text,
  competition     text,                          -- 'league' | 'cup' | 'friendly' | 'tournament'
  is_home         boolean,

  -- pre-match
  pre_mood        int,                           -- 1-10
  pre_intention   text,                          -- "I am the player who..."
  pre_focus_cue   text,                          -- one mental cue for the game
  pre_tactical    text,                          -- one tactical reminder
  pre_logged_at   timestamptz,

  -- post-match
  result          text,                          -- 'W' | 'L' | 'D'
  score_for       int,
  score_against   int,
  minutes_played  int,
  goals           int default 0,
  assists         int default 0,
  performance     int,                           -- 1-10 self-rated
  went_well       text,
  to_fix          text,
  cues_used       text[] not null default '{}',  -- which mental tools fired
  post_logged_at  timestamptz,

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists match_log_user_date_idx on public.match_log (user_id, match_date desc);

alter table public.match_log enable row level security;
drop policy if exists "match_log_select_own"   on public.match_log;
drop policy if exists "match_log_insert_own"   on public.match_log;
drop policy if exists "match_log_update_own"   on public.match_log;
drop policy if exists "match_log_delete_own"   on public.match_log;
drop policy if exists "match_log_coach_view"   on public.match_log;
drop policy if exists "match_log_admin_view"   on public.match_log;
create policy "match_log_select_own" on public.match_log for select using (auth.uid() = user_id);
create policy "match_log_insert_own" on public.match_log for insert with check (auth.uid() = user_id);
create policy "match_log_update_own" on public.match_log for update using (auth.uid() = user_id);
create policy "match_log_delete_own" on public.match_log for delete using (auth.uid() = user_id);
create policy "match_log_coach_view" on public.match_log for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'coach')
);
create policy "match_log_admin_view" on public.match_log for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_admin = true)
);

-- =========================================================================
-- PARENT LINKS — parent <-> athlete relationship + invite codes
-- =========================================================================
create table if not exists public.parent_invites (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references auth.users(id) on delete cascade,
  code         text not null unique,
  expires_at   timestamptz not null default (now() + interval '14 days'),
  consumed_at  timestamptz,
  consumed_by  uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists parent_invites_code_idx on public.parent_invites (code);

alter table public.parent_invites enable row level security;
drop policy if exists "parent_invites_athlete_all" on public.parent_invites;
drop policy if exists "parent_invites_lookup"      on public.parent_invites;
drop policy if exists "parent_invites_consume"     on public.parent_invites;
-- athlete owns their invites
create policy "parent_invites_athlete_all" on public.parent_invites for all using (auth.uid() = athlete_id) with check (auth.uid() = athlete_id);
-- anyone signed-in can look up a code (needed for redeem flow)
create policy "parent_invites_lookup" on public.parent_invites for select using (auth.role() = 'authenticated');
-- consumer can mark it consumed
create policy "parent_invites_consume" on public.parent_invites for update using (auth.role() = 'authenticated');

create table if not exists public.parent_links (
  id          uuid primary key default gen_random_uuid(),
  parent_id   uuid not null references auth.users(id) on delete cascade,
  athlete_id  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (parent_id, athlete_id)
);
create index if not exists parent_links_parent_idx  on public.parent_links (parent_id);
create index if not exists parent_links_athlete_idx on public.parent_links (athlete_id);

alter table public.parent_links enable row level security;
drop policy if exists "parent_links_self_select"   on public.parent_links;
drop policy if exists "parent_links_self_insert"   on public.parent_links;
drop policy if exists "parent_links_self_delete"   on public.parent_links;
drop policy if exists "parent_links_admin_view"    on public.parent_links;
-- parent or athlete sees their own link rows
create policy "parent_links_self_select" on public.parent_links for select using (
  auth.uid() = parent_id or auth.uid() = athlete_id
);
create policy "parent_links_self_insert" on public.parent_links for insert with check (auth.uid() = parent_id);
create policy "parent_links_self_delete" on public.parent_links for delete using (
  auth.uid() = parent_id or auth.uid() = athlete_id
);
create policy "parent_links_admin_view" on public.parent_links for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
);

-- =========================================================================
-- PARENT READ-ACCESS POLICIES — sanitized view of linked athlete data
-- Parents see: profile, action_steps, weekly_checkins, match_log, xp_log,
--              badges_earned, coach_memory.themes (NOT chat_history, NOT raw memory.summary)
-- =========================================================================
drop policy if exists "Parents view linked athlete profile"        on public.profiles;
drop policy if exists "Parents view linked athlete action_steps"   on public.action_steps;
drop policy if exists "Parents view linked athlete checkins"       on public.weekly_checkins;
drop policy if exists "Parents view linked athlete matches"        on public.match_log;
drop policy if exists "Parents view linked athlete xp"             on public.xp_log;
drop policy if exists "Parents view linked athlete badges"         on public.badges_earned;
drop policy if exists "Parents view linked athlete memory"         on public.coach_memory;

create policy "Parents view linked athlete profile" on public.profiles for select using (
  exists (select 1 from public.parent_links pl where pl.parent_id = auth.uid() and pl.athlete_id = profiles.id)
);
create policy "Parents view linked athlete action_steps" on public.action_steps for select using (
  exists (select 1 from public.parent_links pl where pl.parent_id = auth.uid() and pl.athlete_id = action_steps.user_id)
);
create policy "Parents view linked athlete checkins" on public.weekly_checkins for select using (
  exists (select 1 from public.parent_links pl where pl.parent_id = auth.uid() and pl.athlete_id = weekly_checkins.user_id)
);
create policy "Parents view linked athlete matches" on public.match_log for select using (
  exists (select 1 from public.parent_links pl where pl.parent_id = auth.uid() and pl.athlete_id = match_log.user_id)
);

-- xp_log + badges_earned + coach_memory: only if those tables exist
do $$
begin
  if to_regclass('public.xp_log') is not null then
    execute 'create policy "Parents view linked athlete xp" on public.xp_log for select using (
      exists (select 1 from public.parent_links pl where pl.parent_id = auth.uid() and pl.athlete_id = xp_log.user_id)
    )';
  end if;
  if to_regclass('public.badges_earned') is not null then
    execute 'create policy "Parents view linked athlete badges" on public.badges_earned for select using (
      exists (select 1 from public.parent_links pl where pl.parent_id = auth.uid() and pl.athlete_id = badges_earned.user_id)
    )';
  end if;
  if to_regclass('public.coach_memory') is not null then
    execute 'create policy "Parents view linked athlete memory" on public.coach_memory for select using (
      exists (select 1 from public.parent_links pl where pl.parent_id = auth.uid() and pl.athlete_id = coach_memory.user_id)
    )';
  end if;
end$$;

-- =========================================================================
-- ENGAGEMENT — weekly recap delivery log (idempotency for cron)
-- =========================================================================
create table if not exists public.recap_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  audience      text not null,                  -- 'athlete' | 'parent'
  recipient     text not null,                  -- email at send time
  week_key      text not null,                  -- ISO yyyy-Www, prevents dup sends
  summary       text,
  highlights    jsonb not null default '{}'::jsonb,
  sent_at       timestamptz,
  error         text,
  created_at    timestamptz not null default now(),
  unique (user_id, audience, week_key)
);
create index if not exists recap_log_user_week_idx on public.recap_log (user_id, week_key);

alter table public.recap_log enable row level security;
drop policy if exists "recap_log_select_own"  on public.recap_log;
drop policy if exists "recap_log_admin_view"  on public.recap_log;
create policy "recap_log_select_own" on public.recap_log for select using (auth.uid() = user_id);
create policy "recap_log_admin_view" on public.recap_log for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
);

-- match_log updated_at trigger
create or replace function public.touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;
drop trigger if exists match_log_touch on public.match_log;
create trigger match_log_touch before update on public.match_log
  for each row execute function public.touch_updated_at();
