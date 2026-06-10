-- Hotfix (2026-06-10): "infinite recursion detected in policy for relation
-- coaching_groups". 031 made coaching_group_members.SELECT reference
-- coaching_groups, but coaching_groups.SELECT (groups_select_member, from 013)
-- already references coaching_group_members — a mutual RLS cycle that Postgres
-- aborts. Every coaching_groups read then fails (Teams tab, group chat, and any
-- query that joins through it).
--
-- Fix: route both cross-table checks through SECURITY DEFINER helpers that read
-- the tables directly (RLS bypassed inside the function), exactly like
-- is_group_member() already does for group_messages in 028. No policy on one
-- table evaluates a policy on the other, so the cycle is broken.

create or replace function public.is_group_lead(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.coaching_groups g
    where g.id = p_group_id and g.lead_coach_id = auth.uid()
  );
$$;

revoke all on function public.is_group_lead(uuid) from public;
grant execute on function public.is_group_lead(uuid) to authenticated, service_role;

-- coaching_groups: members (and the lead) can see groups they belong to.
-- is_group_member() is SECURITY DEFINER → reads coaching_group_members without
-- re-entering its RLS. (groups_select_lead_admin from 031 still covers lead+admin.)
drop policy if exists "groups_select_member" on public.coaching_groups;
create policy "groups_select_member" on public.coaching_groups for select
  using (public.is_group_member(coaching_groups.id));

-- coaching_group_members: lead coach + admin can see the roster.
-- is_group_lead() is SECURITY DEFINER → reads coaching_groups without
-- re-entering its RLS. (members_select_self from 013 still covers own membership.)
drop policy if exists "members_select_lead_admin" on public.coaching_group_members;
create policy "members_select_lead_admin" on public.coaching_group_members for select
  using (
    public.is_admin()
    or public.is_group_lead(coaching_group_members.group_id)
  );

notify pgrst, 'reload schema';
