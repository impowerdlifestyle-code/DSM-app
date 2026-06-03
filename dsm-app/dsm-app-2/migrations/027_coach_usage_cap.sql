-- Per-user daily Coach V message cap (cost guardrail).
--
-- /api/coach has no per-user rate limit, so a single account can drain
-- unbounded Anthropic spend. This adds an atomic daily counter that the
-- coach endpoint checks-and-increments before each billable chat call.
--
-- Only conversational actions (chat, parent_chat) count toward the cap.
-- Auxiliary calls (consolidate, journal analysis, nudges) are bounded
-- proportionally by chat volume, so capping chat caps everything.
--
-- Called from api/coach.js via the service-role client:
--   admin.rpc('bump_coach_usage', { p_user_id, p_limit })
-- Returns one row { allowed, used, lim }. Fails open in the endpoint if
-- this RPC is ever unavailable (chat is never blocked by a counter outage).

create table if not exists public.coach_usage (
  user_id    uuid    not null references auth.users (id) on delete cascade,
  usage_date date    not null default current_date,
  calls      integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

alter table public.coach_usage enable row level security;

drop policy if exists "coach_usage_select_own" on public.coach_usage;
create policy "coach_usage_select_own" on public.coach_usage
  for select using (auth.uid() = user_id);
-- No client INSERT/UPDATE policy: all writes go through the SECURITY DEFINER RPC.

create or replace function public.bump_coach_usage(p_user_id uuid, p_limit integer)
returns table (allowed boolean, used integer, lim integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used integer;
begin
  -- Verify caller. Service-role calls have auth.uid() = NULL and bypass.
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'caller is not the target user' using errcode = '42501';
  end if;

  insert into public.coach_usage (user_id, usage_date, calls, updated_at)
    values (p_user_id, current_date, 1, now())
  on conflict (user_id, usage_date) do update
    set calls = public.coach_usage.calls + 1,
        updated_at = now()
    where public.coach_usage.calls < p_limit
  returning public.coach_usage.calls into v_used;

  if v_used is null then
    -- ON CONFLICT update was skipped because the cap is already reached.
    select c.calls into v_used
      from public.coach_usage c
      where c.user_id = p_user_id and c.usage_date = current_date;
    return query select false, coalesce(v_used, p_limit), p_limit;
  else
    return query select true, v_used, p_limit;
  end if;
end;
$$;

revoke all on function public.bump_coach_usage(uuid, integer) from public;
grant execute on function public.bump_coach_usage(uuid, integer) to anon, authenticated, service_role;

comment on function public.bump_coach_usage(uuid, integer) is
  'Atomic check-and-increment of a per-user daily Coach V message counter. Returns (allowed, used, lim). Used must stay below lim to be allowed. Service-role bypasses the caller check (api/coach.js cost guardrail).';
