-- DSM RLS hotfix — block client-side privilege escalation on profiles.
--
-- The "Users update own profile" RLS policy has USING (auth.uid() = id) but
-- WITH CHECK = NULL. That meant any authenticated athlete could update ANY
-- column on their own row — including access_level, role, is_admin,
-- trial_ends_at — directly from devtools. This bypassed the server-side
-- paywall shipped in commit c791661.
--
-- Fix: a BEFORE UPDATE trigger that blocks changes to privileged columns
-- unless the caller is admin or the request is server-side (service_role,
-- which has auth.uid() = NULL because there's no JWT).
--
-- This complements the existing RLS policies — it does NOT replace them.
-- The trigger fires AFTER the RLS check passes, so unauthorized rows still
-- get denied earlier in the stack.

create or replace function public.profiles_block_privilege_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_is_admin boolean;
begin
  -- Service-role / unauthenticated calls have auth.uid() = NULL.
  -- (Service-role calls bypass RLS entirely so they only hit this trigger
  -- when the Vercel functions intentionally write privileged columns.)
  if auth.uid() is null then
    return new;
  end if;

  -- Admins can change anything — needed for manual access_level adjustments
  -- and the admin-promote-athlete flows shipped in commits ae2fee4 / 9fe7e42.
  select is_admin into caller_is_admin
  from public.profiles
  where id = auth.uid();

  if caller_is_admin then
    return new;
  end if;

  -- Otherwise: block writes that change a privileged column.
  if new.access_level is distinct from old.access_level then
    raise exception 'access_level cannot be changed by the row owner' using errcode = '42501';
  end if;
  if new.role is distinct from old.role then
    raise exception 'role cannot be changed by the row owner' using errcode = '42501';
  end if;
  if new.is_admin is distinct from old.is_admin then
    raise exception 'is_admin cannot be changed by the row owner' using errcode = '42501';
  end if;
  if new.trial_ends_at is distinct from old.trial_ends_at then
    raise exception 'trial_ends_at cannot be changed by the row owner' using errcode = '42501';
  end if;
  if new.id is distinct from old.id then
    raise exception 'id cannot be changed' using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_block_privilege_escalation on public.profiles;
create trigger profiles_block_privilege_escalation
  before update on public.profiles
  for each row
  execute function public.profiles_block_privilege_escalation();

comment on function public.profiles_block_privilege_escalation() is
  'Blocks client-side privilege escalation on profiles. Authenticated non-admin users cannot change access_level, role, is_admin, trial_ends_at, or id on their own row. Service-role and admins bypass.';
