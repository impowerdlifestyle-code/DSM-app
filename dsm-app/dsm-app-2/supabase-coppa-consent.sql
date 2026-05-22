-- DSM — COPPA parental consent for under-13 athletes
-- When a profile.age < 13:
--   * parent_consent_required = true
--   * parent_consent_status defaults to 'pending'
--   * access_level forced to 'locked' (no trial countdown) until consent granted
--   * a unique parent_consent_token is generated for the approval URL
-- Idempotent. Safe to re-run.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists parent_consent_required   boolean default false,
  add column if not exists parent_consent_email      text,
  add column if not exists parent_consent_status     text
    check (parent_consent_status in ('pending','granted','declined')),
  add column if not exists parent_consent_token      uuid default gen_random_uuid(),
  add column if not exists parent_consent_granted_at timestamptz,
  add column if not exists parent_consent_granted_ip inet,
  add column if not exists parent_consent_sent_at    timestamptz;

comment on column public.profiles.parent_consent_required is
  'True when athlete age < 13. Gates the app behind COPPA-compliant parental consent.';
comment on column public.profiles.parent_consent_token is
  'Opaque UUID used in approval URLs. Server-side API looks the profile up by this token and updates status without exposing user IDs.';

create unique index if not exists profiles_parent_consent_token_uidx
  on public.profiles(parent_consent_token);

create index if not exists profiles_consent_status_idx
  on public.profiles(parent_consent_status)
  where parent_consent_required = true;

-- Replace the start_trial trigger so under-13s land 'locked' (consent required)
-- instead of jumping straight to 'trial'. Teens still auto-trial.
create or replace function public.start_trial_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.access_level is null then
    if new.age is not null and new.age < 13 then
      new.access_level                := 'locked';
      new.trial_ends_at               := null;
      new.parent_consent_required     := true;
      if new.parent_consent_status is null then
        new.parent_consent_status     := 'pending';
      end if;
    else
      new.access_level  := 'trial';
      new.trial_ends_at := now() + interval '14 days';
    end if;
  end if;
  if new.parent_consent_token is null then
    new.parent_consent_token := gen_random_uuid();
  end if;
  return new;
end$$;

-- Mirror the rule on UPDATE: if age is being lowered into the under-13 band,
-- flip them into consent-required mode. Don't auto-unlock if age goes >=13;
-- that's an admin decision.
create or replace function public.sync_consent_on_age_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.age is distinct from old.age
     and new.age is not null and new.age < 13
     and coalesce(new.parent_consent_required, false) = false then
    new.parent_consent_required := true;
    new.parent_consent_status   := coalesce(new.parent_consent_status, 'pending');
    if new.parent_consent_status <> 'granted' then
      new.access_level    := 'locked';
      new.trial_ends_at   := null;
    end if;
  end if;
  return new;
end$$;

drop trigger if exists profiles_sync_consent_on_age on public.profiles;
create trigger profiles_sync_consent_on_age
  before update on public.profiles
  for each row execute function public.sync_consent_on_age_change();

-- Backfill: any existing rows with age < 13 retroactively need consent.
-- Mark them pending + lock the account. Admin can manually grant if they've
-- already verified consent another way.
update public.profiles
   set parent_consent_required = true,
       parent_consent_status   = coalesce(parent_consent_status, 'pending'),
       access_level            = case when access_level = 'trial' then 'locked' else access_level end,
       trial_ends_at           = null,
       parent_consent_token    = coalesce(parent_consent_token, gen_random_uuid())
 where age is not null and age < 13
   and coalesce(parent_consent_required, false) = false;
