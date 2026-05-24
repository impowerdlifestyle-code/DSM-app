-- Stamp nudge timestamps server-side instead of trusting client clock
-- (M10 from 2026-05-21 audit). Calls hit Postgres now() so analytics
-- dashboards / cron windows see consistent times regardless of device
-- clock drift.

create or replace function public.dismiss_nudge(
  p_nudge_id uuid,
  p_acted    boolean default false
)
returns table (
  id uuid,
  dismissed_at timestamptz,
  acted_on_at  timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  update public.coach_nudges
     set dismissed_at = coalesce(dismissed_at, now()),
         acted_on_at  = case when p_acted then coalesce(acted_on_at, now()) else acted_on_at end
   where id = p_nudge_id
     -- service-role bypasses, otherwise must own the nudge
     and (auth.uid() is null or user_id = auth.uid())
  returning id, dismissed_at, acted_on_at into v_row;

  if v_row.id is null then
    raise exception 'nudge not found or not owned by caller' using errcode = '42501';
  end if;

  return query select v_row.id, v_row.dismissed_at, v_row.acted_on_at;
end;
$$;

revoke all on function public.dismiss_nudge(uuid, boolean) from public;
grant execute on function public.dismiss_nudge(uuid, boolean) to anon, authenticated, service_role;

comment on function public.dismiss_nudge(uuid, boolean) is
  'Server-clock timestamps for nudge dismissal/acted-on. Replaces client-clock writes (M10 from 2026-05-21 audit).';
