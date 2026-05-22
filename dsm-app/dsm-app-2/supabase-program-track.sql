-- DSM — split athletes into youth (<13) vs teen (13+) program tracks
-- Younger kids skip workouts / body comp / nutrition / future-self / voice journal.
-- Idempotent. Safe to re-run.

alter table public.profiles
  add column if not exists program_track text
    check (program_track in ('youth','teen'));

comment on column public.profiles.program_track is
  'Age-derived program track. ''youth'' = under 13 (limited surfaces, COPPA-aware). ''teen'' = 13+ (full program). Coach can override via Admin.';

create index if not exists profiles_program_track_idx
  on public.profiles(program_track);

-- Trigger function: derive from age unless explicitly set.
create or replace function public.set_program_track_from_age()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- On INSERT: always derive if not provided.
  -- On UPDATE: only re-derive if age changed AND program_track wasn't explicitly set by the same statement.
  if tg_op = 'INSERT' then
    if new.program_track is null then
      if new.age is not null and new.age >= 13 then
        new.program_track := 'teen';
      else
        new.program_track := 'youth';
      end if;
    end if;
  elsif tg_op = 'UPDATE' then
    if new.age is distinct from old.age and new.program_track is not distinct from old.program_track then
      if new.age is not null and new.age >= 13 then
        new.program_track := 'teen';
      else
        new.program_track := 'youth';
      end if;
    end if;
  end if;
  return new;
end$$;

drop trigger if exists profiles_set_program_track on public.profiles;
create trigger profiles_set_program_track
  before insert or update on public.profiles
  for each row execute function public.set_program_track_from_age();

-- Backfill: existing rows without a track get one based on current age.
update public.profiles
   set program_track = case when age is not null and age >= 13 then 'teen' else 'youth' end
 where program_track is null;
