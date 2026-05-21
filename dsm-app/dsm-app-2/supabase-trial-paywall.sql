-- DSM — auto-trial on signup so new athletes land with 14d full access
-- Idempotent. Safe to re-run.

alter table public.profiles
  add column if not exists trial_ends_at timestamptz;

comment on column public.profiles.trial_ends_at is
  'When access_level=trial: timestamp the trial window closes. NULL when not on trial.';

create index if not exists profiles_trial_ends_at_idx
  on public.profiles(trial_ends_at)
  where access_level = 'trial';

-- Backfill: any athlete sitting at NULL access_level today gets a fresh 14d trial.
update public.profiles
   set access_level   = 'trial',
       trial_ends_at  = now() + interval '14 days'
 where access_level is null
   and (role is null or role = 'athlete');

-- Trigger: every new profile row starts in trial unless explicitly set otherwise.
create or replace function public.start_trial_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.access_level is null then
    new.access_level  := 'trial';
    new.trial_ends_at := now() + interval '14 days';
  end if;
  return new;
end$$;

drop trigger if exists profiles_start_trial on public.profiles;
create trigger profiles_start_trial
  before insert on public.profiles
  for each row execute function public.start_trial_on_profile_insert();
