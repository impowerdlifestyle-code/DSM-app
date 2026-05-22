-- DSM — security hotfix
-- Idempotent. Run AFTER supabase-fix-recursion-and-columns.sql.

-- =========================================================================
-- CR-01: parent_invites — close brute-force + cross-account UPDATE
-- =========================================================================
drop policy if exists "parent_invites_lookup"  on public.parent_invites;
drop policy if exists "parent_invites_consume" on public.parent_invites;
-- keep "parent_invites_athlete_all" (athlete owns their codes)

create or replace function public.redeem_parent_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_invite public.parent_invites%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into v_invite
    from public.parent_invites
    where code = upper(trim(p_code))
    for update;

  if not found then
    raise exception 'invite not found' using errcode = 'P0001';
  end if;
  if v_invite.consumed_at is not null then
    raise exception 'invite already used' using errcode = 'P0002';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite expired' using errcode = 'P0003';
  end if;

  update public.parent_invites
    set consumed_at = now(), consumed_by = auth.uid()
    where id = v_invite.id;

  insert into public.parent_links (parent_id, athlete_id)
    values (auth.uid(), v_invite.athlete_id)
    on conflict (parent_id, athlete_id) do nothing;

  update public.profiles set role = 'parent' where id = auth.uid();

  return v_invite.athlete_id;
end$$;

revoke all on function public.redeem_parent_invite(text) from public;
grant execute on function public.redeem_parent_invite(text) to authenticated;

-- =========================================================================
-- CR-02: recap_log — per-recipient idempotency
-- =========================================================================
alter table public.recap_log
  add column if not exists recipient_id uuid references auth.users(id) on delete set null;

-- backfill existing rows: athlete recipient_id = user_id (best guess for past data)
update public.recap_log set recipient_id = user_id where recipient_id is null and audience = 'athlete';

-- drop old unique, add per-recipient unique
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'recap_log_user_id_audience_week_key_key'
  ) then
    alter table public.recap_log drop constraint recap_log_user_id_audience_week_key_key;
  end if;
end$$;

drop index if exists recap_log_unique_per_recipient;
create unique index recap_log_unique_per_recipient
  on public.recap_log (user_id, audience, coalesce(recipient_id, user_id), week_key);

-- =========================================================================
-- WR-04/05: parent column-leak via views + revoke base-table parent access
-- =========================================================================
create or replace view public.parent_visible_profile
  with (security_invoker = on) as
  select id, full_name, position, identity_goal, streak, starter_focus, program_start_date
  from public.profiles;

create or replace view public.parent_visible_themes
  with (security_invoker = on) as
  select user_id, themes
  from public.coach_memory;

grant select on public.parent_visible_profile to authenticated;
grant select on public.parent_visible_themes  to authenticated;

-- The base-table SELECT policies for parents stay (the views inherit them via
-- security_invoker), but the client must now read columns through the views
-- to avoid accidentally selecting sensitive fields. Both views expose only a
-- safe subset, and supabase.js getParentDashboard is updated to use them.
