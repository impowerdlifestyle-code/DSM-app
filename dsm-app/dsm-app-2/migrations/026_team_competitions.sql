-- Team-based competitions. Leaderboards need to read OTHER athletes'
-- aggregated XP, which per-user RLS blocks. The safe pattern is a
-- SECURITY DEFINER RPC that returns ONLY non-sensitive aggregates —
-- first name, team/league/country, summed XP. No email, no private data.

-- 1. Competition scope fields on profiles (self-editable; not privileged).
alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists league  text;
-- club_team already exists from 007_onboarding_matchday_parents and is the
-- "academy/team" identity for academy-vs-academy standings.

-- 2. Individual leaderboard, scoped + windowed.
--    scope: 'global' | 'team' | 'league' | 'country'
--    since: null = all-time; first-of-month = the monthly mindset cup.
create or replace function public.dsm_leaderboard(
  p_scope text default 'global',
  p_value text default null,
  p_since timestamptz default null
)
returns table (
  user_id      uuid,
  display_name text,
  club_team    text,
  league       text,
  country      text,
  xp           bigint
)
language sql
security definer
set search_path = public
as $$
  select p.id,
         coalesce(nullif(split_part(coalesce(p.full_name,''), ' ', 1), ''), 'Athlete') as display_name,
         p.club_team, p.league, p.country,
         coalesce(sum(x.xp), 0)::bigint as xp
  from public.profiles p
  left join public.xp_log x
    on x.user_id = p.id
   and (p_since is null or x.created_at >= p_since)
  where p.role = 'athlete'
    and (p_scope <> 'team'    or p.club_team = p_value)
    and (p_scope <> 'league'  or p.league   = p_value)
    and (p_scope <> 'country' or p.country  = p_value)
  group by p.id, p.full_name, p.club_team, p.league, p.country
  having coalesce(sum(x.xp), 0) > 0
  order by xp desc
  limit 100;
$$;

-- 3. Academy-vs-academy team standings (sum XP by club_team).
create or replace function public.dsm_team_standings(
  p_since timestamptz default null
)
returns table (
  club_team text,
  league    text,
  athletes  bigint,
  xp        bigint
)
language sql
security definer
set search_path = public
as $$
  select p.club_team,
         max(p.league) as league,
         count(distinct p.id) as athletes,
         coalesce(sum(x.xp), 0)::bigint as xp
  from public.profiles p
  left join public.xp_log x
    on x.user_id = p.id
   and (p_since is null or x.created_at >= p_since)
  where p.role = 'athlete' and p.club_team is not null and p.club_team <> ''
  group by p.club_team
  having coalesce(sum(x.xp), 0) > 0
  order by xp desc
  limit 100;
$$;

revoke all on function public.dsm_leaderboard(text, text, timestamptz)   from public;
revoke all on function public.dsm_team_standings(timestamptz)            from public;
grant execute on function public.dsm_leaderboard(text, text, timestamptz)  to authenticated, service_role;
grant execute on function public.dsm_team_standings(timestamptz)           to authenticated, service_role;

notify pgrst, 'reload schema';
