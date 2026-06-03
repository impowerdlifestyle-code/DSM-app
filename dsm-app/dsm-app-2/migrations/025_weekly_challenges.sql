-- Weekly mindset challenges. Mirrors daily_quests but keyed by an ISO
-- week_key (e.g. '2026-W23') instead of a date, so a challenge persists
-- across the whole week. Self-attested progress (athlete taps as they do
-- the rep) — honor system, standard for youth mindset work. Completion
-- grants XP + a badge client-side. Rewards consistency, never results.

create table if not exists public.challenge_progress (
  user_id      uuid not null references auth.users(id) on delete cascade,
  challenge_id text not null,
  week_key     text not null,
  progress     int  not null default 0,
  target       int  not null default 1,
  completed    boolean not null default false,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, challenge_id, week_key)
);

alter table public.challenge_progress enable row level security;

drop policy if exists "challenge_select_own"  on public.challenge_progress;
drop policy if exists "challenge_insert_own"  on public.challenge_progress;
drop policy if exists "challenge_update_own"  on public.challenge_progress;
drop policy if exists "challenge_select_admin" on public.challenge_progress;

create policy "challenge_select_own"  on public.challenge_progress for select using (auth.uid() = user_id);
create policy "challenge_insert_own"  on public.challenge_progress for insert with check (auth.uid() = user_id);
create policy "challenge_update_own"  on public.challenge_progress for update using (auth.uid() = user_id);

-- Coaches/admins can see challenge activity for the coach activity feed.
do $$
begin
  if exists (select 1 from pg_proc where proname = 'is_admin') then
    execute 'create policy "challenge_select_admin" on public.challenge_progress for select using (public.is_admin())';
  end if;
end $$;

notify pgrst, 'reload schema';
