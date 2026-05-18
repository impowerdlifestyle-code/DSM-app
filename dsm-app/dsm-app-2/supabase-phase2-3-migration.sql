-- DSM — Phase 2 (Gamification) + Phase 3 (Fitness data) persistence
-- Idempotent. Safe to re-run. Run AFTER supabase-full-migration.sql.

-- =========================================================================
-- PHASE 2 — GAMIFICATION
-- =========================================================================

-- XP log: event-sourced. Sum gives total XP -> derives level + coins.
create table if not exists public.xp_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  source      text not null,             -- 'action_step' | 'ball_mastery' | 'workout' | 'voice_journal' | 'weekly_checkin' | 'quest' | 'pr'
  xp          int  not null,
  ref_id      uuid,                       -- optional pointer to the source row
  note        text,
  created_at  timestamptz not null default now()
);
create index if not exists xp_log_user_created_idx on public.xp_log (user_id, created_at desc);

alter table public.xp_log enable row level security;
drop policy if exists "xp_log_select_own"  on public.xp_log;
drop policy if exists "xp_log_insert_own"  on public.xp_log;
create policy "xp_log_select_own" on public.xp_log for select using (auth.uid() = user_id);
create policy "xp_log_insert_own" on public.xp_log for insert with check (auth.uid() = user_id);

-- Badges earned
create table if not exists public.badges_earned (
  user_id     uuid not null references auth.users(id) on delete cascade,
  badge_id    text not null,
  earned_at   timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table public.badges_earned enable row level security;
drop policy if exists "badges_select_own" on public.badges_earned;
drop policy if exists "badges_insert_own" on public.badges_earned;
create policy "badges_select_own" on public.badges_earned for select using (auth.uid() = user_id);
create policy "badges_insert_own" on public.badges_earned for insert with check (auth.uid() = user_id);

-- Daily quests state — one row per user per quest per date
create table if not exists public.daily_quests (
  user_id     uuid not null references auth.users(id) on delete cascade,
  quest_id    text not null,
  date        date not null default current_date,
  progress    int  not null default 0,
  target      int  not null default 1,
  completed   boolean not null default false,
  claimed     boolean not null default false,
  updated_at  timestamptz not null default now(),
  primary key (user_id, quest_id, date)
);
alter table public.daily_quests enable row level security;
drop policy if exists "quests_select_own" on public.daily_quests;
drop policy if exists "quests_upsert_own" on public.daily_quests;
drop policy if exists "quests_update_own" on public.daily_quests;
create policy "quests_select_own" on public.daily_quests for select using (auth.uid() = user_id);
create policy "quests_upsert_own" on public.daily_quests for insert with check (auth.uid() = user_id);
create policy "quests_update_own" on public.daily_quests for update using (auth.uid() = user_id);

-- =========================================================================
-- PHASE 3 — FITNESS DATA
-- =========================================================================

-- Completed workout sessions
create table if not exists public.workouts_log (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  workout_id      text,                          -- template id (e.g. 'mon-week3')
  name            text not null,
  block           text,
  duration_seconds int,
  total_sets      int default 0,
  done_sets       int default 0,
  notes           text,
  completed_at    timestamptz not null default now()
);
create index if not exists workouts_log_user_completed_idx on public.workouts_log (user_id, completed_at desc);
alter table public.workouts_log enable row level security;
drop policy if exists "workouts_select_own" on public.workouts_log;
drop policy if exists "workouts_insert_own" on public.workouts_log;
create policy "workouts_select_own" on public.workouts_log for select using (auth.uid() = user_id);
create policy "workouts_insert_own" on public.workouts_log for insert with check (auth.uid() = user_id);

-- Individual sets within a workout session
create table if not exists public.workout_sets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  workout_log_id  uuid not null references public.workouts_log(id) on delete cascade,
  exercise_id     text not null,
  exercise_name   text,
  set_index       int  not null,
  weight          text,
  reps            text,
  rpe             text,
  completed       boolean not null default false,
  created_at      timestamptz not null default now()
);
create index if not exists workout_sets_log_idx on public.workout_sets (workout_log_id);
alter table public.workout_sets enable row level security;
drop policy if exists "sets_select_own" on public.workout_sets;
drop policy if exists "sets_insert_own" on public.workout_sets;
create policy "sets_select_own" on public.workout_sets for select using (auth.uid() = user_id);
create policy "sets_insert_own" on public.workout_sets for insert with check (auth.uid() = user_id);

-- Food log
create table if not exists public.food_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  food_id     text,                       -- catalog id if from FOODS, null if custom
  food_name   text not null,
  serving     text,
  cal         int not null,
  protein_g   int not null default 0,
  carbs_g     int not null default 0,
  fat_g       int not null default 0,
  qty         numeric not null default 1,
  meal        text,                        -- 'Breakfast' | 'Snack' | 'Lunch' | 'Dinner'
  logged_at   timestamptz not null default now()
);
create index if not exists food_log_user_logged_idx on public.food_log (user_id, logged_at desc);
alter table public.food_log enable row level security;
drop policy if exists "food_select_own" on public.food_log;
drop policy if exists "food_insert_own" on public.food_log;
drop policy if exists "food_delete_own" on public.food_log;
create policy "food_select_own" on public.food_log for select using (auth.uid() = user_id);
create policy "food_insert_own" on public.food_log for insert with check (auth.uid() = user_id);
create policy "food_delete_own" on public.food_log for delete using (auth.uid() = user_id);

-- Nutrition targets (one row per user)
create table if not exists public.nutrition_targets (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  cal         int not null default 2800,
  protein_g   int not null default 175,
  carbs_g     int not null default 360,
  fat_g       int not null default 80,
  updated_at  timestamptz not null default now()
);
alter table public.nutrition_targets enable row level security;
drop policy if exists "targets_select_own" on public.nutrition_targets;
drop policy if exists "targets_upsert_own" on public.nutrition_targets;
drop policy if exists "targets_update_own" on public.nutrition_targets;
create policy "targets_select_own" on public.nutrition_targets for select using (auth.uid() = user_id);
create policy "targets_upsert_own" on public.nutrition_targets for insert with check (auth.uid() = user_id);
create policy "targets_update_own" on public.nutrition_targets for update using (auth.uid() = user_id);

-- Body stats history
create table if not exists public.body_stats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  weight      numeric,
  body_fat    numeric,
  chest       numeric,
  waist       numeric,
  arm         numeric,
  thigh       numeric,
  resting_hr  int,
  vo2         numeric,
  measured_at timestamptz not null default now()
);
create index if not exists body_stats_user_measured_idx on public.body_stats (user_id, measured_at desc);
alter table public.body_stats enable row level security;
drop policy if exists "body_select_own" on public.body_stats;
drop policy if exists "body_insert_own" on public.body_stats;
create policy "body_select_own" on public.body_stats for select using (auth.uid() = user_id);
create policy "body_insert_own" on public.body_stats for insert with check (auth.uid() = user_id);

-- Progress photos (metadata; binaries live in Storage bucket 'progress-photos')
create table if not exists public.progress_photos (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  angle        text not null,             -- 'Front' | 'Side' | 'Back'
  storage_path text not null,             -- path inside 'progress-photos' bucket
  taken_at     timestamptz not null default now()
);
create index if not exists photos_user_taken_idx on public.progress_photos (user_id, taken_at desc);
alter table public.progress_photos enable row level security;
drop policy if exists "photos_select_own" on public.progress_photos;
drop policy if exists "photos_insert_own" on public.progress_photos;
drop policy if exists "photos_delete_own" on public.progress_photos;
create policy "photos_select_own" on public.progress_photos for select using (auth.uid() = user_id);
create policy "photos_insert_own" on public.progress_photos for insert with check (auth.uid() = user_id);
create policy "photos_delete_own" on public.progress_photos for delete using (auth.uid() = user_id);

-- =========================================================================
-- STORAGE — progress-photos bucket (private, per-user folder)
-- =========================================================================
-- Bucket must be created via Storage UI or via this insert. Idempotent.
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Path convention: <auth.uid()>/<angle>-<timestamp>.jpg
drop policy if exists "photos_storage_select_own"  on storage.objects;
drop policy if exists "photos_storage_insert_own"  on storage.objects;
drop policy if exists "photos_storage_delete_own"  on storage.objects;

create policy "photos_storage_select_own" on storage.objects
  for select using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "photos_storage_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "photos_storage_delete_own" on storage.objects
  for delete using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
