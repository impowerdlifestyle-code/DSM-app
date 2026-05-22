# DSM Supabase migrations

All Postgres + RLS changes ever shipped to the DSM project (`voxsrncpxfuzcspkkzkn`). Numbered in **inferred apply order**, derived from file mtime + dependency reading. Pre-existing files were moved here on 2026-05-21 from the repo root as part of audit Tier 2 finding A5.

## Why this folder exists

Before this commit, 19 raw `supabase-*.sql` files sat at the repo root with no sequencing. Files like `010_rls_bulletproof.sql` (then `supabase-rls-bulletproof.sql`) drop and recreate all `profiles` RLS policies. Applying out of order silently wiped later policies. Future maintainers had no way to know what was applied vs what was an unapplied draft.

## Apply order

Best-guess chronological order. Without DB-side `supabase_migrations.schema_migrations` access this is reconstructed from `stat -f %Sm` mtimes + reading what each file does:

| # | File | Purpose |
|---|---|---|
| 001 | `schema.sql` | Initial profile + core tables |
| 002 | `new_tables.sql` | Early extension tables |
| 003 | `full_migration.sql` | Feature-complete baseline (May 18) |
| 004 | `phase2_3.sql` | Daily quests, nutrition targets |
| 005 | `coach_memory.sql` | `coach_memory` table for Coach V consolidation |
| 006 | `locker_room.sql` | Locker room admin coverage + dismissible recap |
| 007 | `onboarding_matchday_parents.sql` | Onboarding, match_log, parent_links |
| 008 | `fix_recursion_and_columns.sql` | RLS recursion fix on profiles policies |
| 009 | `hotfix_security.sql` | Post-incident RLS tightening |
| 010 | `rls_bulletproof.sql` | **Drops + rebuilds all `profiles` policies + helper functions (`is_coach`, `is_admin`).** Re-applying this after 011+ would wipe later UPDATE/INSERT policies. |
| 011 | `program_track.sql` | Youth vs teen track gating columns |
| 012 | `future_self.sql` | future_self_clips, voice_audit_log, future_self_checkins |
| 013 | `coach_tiers_tasks.sql` | Coach tiers + task assignment + groups + activity log |
| 014 | `trial_paywall.sql` | `trial_ends_at` column + `start_trial_on_profile_insert` trigger; backfills 14d trial |
| 015 | `action_steps_columns_fix.sql` | Column hotfix for action_steps |
| 016 | `squad_members_rls_fix.sql` | Squad member RLS |
| 017 | `squads_insert_fix.sql` | Allow self-insert into squads |
| 018 | `recap_constraint_fix.sql` | Recap table unique constraint |
| 019 | `weekly_checkins_fix.sql` | Weekly checkin schema fix |
| 020 | `coppa_consent.sql` | COPPA pending-consent table (under-13 onboarding) |
| 021 | `block_profile_escalation.sql` | **Tier 2 audit fix:** BEFORE UPDATE trigger blocks users from changing `access_level` / `role` / `is_admin` / `trial_ends_at` on their own profile row. Closes paywall bypass discovered during Tier 2 RLS audit on 2026-05-21. |

## How to apply going forward

The current files are reference-only — most have already been applied to prod. Going forward:

1. New migrations get the **next sequential number** (`022_*`, `023_*`, ...).
2. Make migrations **idempotent**: `create or replace function`, `drop ... if exists`, `create policy ... if not exists` (or wrap in `do $$ ... $$`).
3. Apply via the Supabase dashboard SQL editor or `SUPABASE_BETA_RUN_SQL_QUERY` MCP tool — **never re-run 001–021 unless you know what you're doing.** Running 010_rls_bulletproof out of order will silently kill later policies.
4. The 021 trigger is the canonical reference for how to add per-column write restrictions: use a BEFORE UPDATE trigger with `auth.uid()` and `is_admin` checks.

## What this does NOT do

- It doesn't enforce sequencing — there's no migration runner. Vercel deploys don't apply SQL.
- It doesn't track applied state — that lives in Supabase's internal `supabase_migrations.schema_migrations` table (use `supabase migration list` from the CLI if a project-local Supabase CLI is set up).
- It doesn't deduplicate — files like `008_fix_recursion_and_columns` and `010_rls_bulletproof` overlap significantly. Future cleanup should consolidate.

The longer-term move is to adopt `supabase migration new` / `supabase db push` properly, which would track applied state and generate timestamps automatically. Out of scope for the 2026-05-21 audit Tier 2.
