-- weekly_checkins column drift fix
-- Voxsrn- weekly_checkins (from supabase-full-migration.sql) is missing
-- many columns the code uses. Add them all idempotently.

alter table public.weekly_checkins
  add column if not exists biggest_win           text,
  add column if not exists biggest_challenge     text,
  add column if not exists shark_moment          text,
  add column if not exists goldfish_moment       text,
  add column if not exists self_talk_moment      text,
  add column if not exists energy_level          int default 7,
  add column if not exists goal_next_week        text,
  add column if not exists message_to_coach      text,
  add column if not exists smart_goal            text,
  add column if not exists goal_progress         text,
  add column if not exists visualization_notes   text,
  add column if not exists morning_routine_notes text;
