-- Fix #18 and #19: creating a coaching group raises
--   infinite recursion detected in policy for relation "coaching_groups"
--
-- What create does (src/lib/supabase.js createCoachingGroup):
--   1. SELECT coaching_groups WHERE join_code = ?     (collision pre-check)
--   2. INSERT INTO coaching_groups ... RETURNING *    (.insert().select())
-- Postgres applies every permissive SELECT policy to both statements.
-- Policies on the same command are OR'd, and a recursive policy aborts the
-- whole statement even when another policy would have allowed the row.
--
-- How the cycle was built:
--   013 groups_select_member          SELECT coaching_group_members
--   031 members_select_lead_admin     SELECT coaching_groups
--   013 members_write_lead / _delete  SELECT coaching_groups   (still invoker-side)
--   028 group_messages_delete         SELECT coaching_groups
--   032 message_reports select/update SELECT coaching_groups
-- Reading either table re-enters the other table's RLS. Postgres then errors
-- with 42P17. The join-code pre-check and INSERT ... RETURNING both hit it,
-- so "create group" fails before a row is returned.
--
-- 035 sent the two SELECT policies through SECURITY DEFINER helpers. That
-- stops the cycle only while those helpers stay uninlined and owned by a
-- BYPASSRLS role. groups_select_member still called is_group_member(), and
-- that helper SELECTs coaching_groups — the same self-reference, one function
-- call deeper. Member INSERT/DELETE and the chat/report policies still
-- subquery coaching_groups as the invoker.
--
-- This migration replaces that with a set that cannot recurse:
--   * Drop every policy on coaching_groups and coaching_group_members first,
--     so a leftover or dashboard policy under another name cannot keep the
--     cycle alive. 035 only replaced two named policies.
--   * Helpers are LANGUAGE plpgsql SECURITY DEFINER. A SQL helper is only
--     kept out of the policy expression because SECURITY DEFINER blocks
--     inlining; plpgsql is never inlined, so dropping DEFINER later cannot
--     paste the body back into the policy.
--   * The helper used by coaching_groups policies (is_roster_member) reads
--     only coaching_group_members. Lead visibility is the column check
--     lead_coach_id = auth.uid(). A policy on coaching_groups never queries
--     coaching_groups.
--   * Every remaining cross-table check goes through is_group_lead() /
--     is_group_member(), which read with RLS bypassed.
--
-- Access rules preserved from 013 + 031 (the join-code tightening):
--   coaching_groups
--     SELECT  lead of that row, or admin, or a roster member
--     INSERT  caller is a coach or admin, AND lead_coach_id = caller
--     UPDATE  lead or admin
--     DELETE  lead or admin
--   coaching_group_members
--     SELECT  own row, or admin, or the lead of that group
--     INSERT  admin or the lead of that group
--     DELETE  admin or the lead of that group
--     (no UPDATE policy — member-row updates stay denied)
--   group_messages DELETE and message_reports SELECT/UPDATE keep the same
--   rule (author / reporter / admin / lead); only the lead check changes
--   from an invoker subquery to is_group_lead().
--
-- Run as one script. Do not apply ad hoc against production from a branch;
-- review, then run in the Supabase SQL editor.

begin;

-- ---------------------------------------------------------------------------
-- Helpers. plpgsql so the planner cannot inline them into a policy.
-- SECURITY DEFINER + a BYPASSRLS owner (the migration role) reads the
-- underlying table without re-entering its RLS.
-- ---------------------------------------------------------------------------

-- Roster check only. Safe to call from a coaching_groups policy: it never
-- touches coaching_groups, so that policy cannot recurse into itself.
create or replace function public.is_roster_member(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1
    from public.coaching_group_members m
    where m.group_id = p_group_id
      and m.user_id = auth.uid()
  );
end;
$$;

-- Lead check only. Safe to call from coaching_group_members / chat / report
-- policies. Do not call it from a coaching_groups policy; use the
-- lead_coach_id column there instead.
create or replace function public.is_group_lead(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return exists (
    select 1
    from public.coaching_groups g
    where g.id = p_group_id
      and g.lead_coach_id = auth.uid()
  );
end;
$$;

-- Chat / report membership: roster member OR lead. Not used by
-- coaching_groups policies (see groups_select_member below).
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
stable
as $$
begin
  return public.is_roster_member(p_group_id)
      or public.is_group_lead(p_group_id);
end;
$$;

revoke all on function public.is_roster_member(uuid) from public;
revoke all on function public.is_group_lead(uuid)    from public;
revoke all on function public.is_group_member(uuid)  from public;

grant execute on function public.is_roster_member(uuid) to authenticated, service_role;
grant execute on function public.is_group_lead(uuid)    to authenticated, service_role;
grant execute on function public.is_group_member(uuid)  to authenticated, service_role;

comment on function public.is_roster_member(uuid) is
  'True when auth.uid() is on the coaching_group_members roster. SECURITY DEFINER; reads members only so coaching_groups policies can call it without recursing.';
comment on function public.is_group_lead(uuid) is
  'True when auth.uid() is lead_coach_id of the group. SECURITY DEFINER. Do not use inside a coaching_groups policy; compare lead_coach_id directly there.';
comment on function public.is_group_member(uuid) is
  'True when auth.uid() is a roster member or the lead. For group_messages and message_reports. Do not use inside a coaching_groups policy.';

-- ---------------------------------------------------------------------------
-- coaching_groups + coaching_group_members: replace the full policy set.
-- Name-agnostic drop so a recursive policy saved under another name (or a
-- re-applied 013/031 policy) cannot survive next to the new ones.
-- ---------------------------------------------------------------------------

alter table public.coaching_groups        enable row level security;
alter table public.coaching_group_members enable row level security;

do $$
declare
  pol record;
begin
  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'coaching_groups'
  loop
    execute format('drop policy if exists %I on public.coaching_groups', pol.policyname);
  end loop;

  for pol in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'coaching_group_members'
  loop
    execute format('drop policy if exists %I on public.coaching_group_members', pol.policyname);
  end loop;
end$$;

-- SELECT: lead sees their groups via a column compare (no subquery).
-- Admin sees all. Roster members see groups they belong to via a helper
-- that does not read coaching_groups.
create policy "groups_select_lead_admin" on public.coaching_groups
  for select
  using (lead_coach_id = auth.uid() or public.is_admin());

create policy "groups_select_member" on public.coaching_groups
  for select
  using (public.is_roster_member(coaching_groups.id));

-- INSERT: the create-group write check. Column compares and is_coach()/
-- is_admin() only — nothing reads coaching_groups. RETURNING is covered by
-- the SELECT policies above, which also do not read coaching_groups.
create policy "groups_insert_coach" on public.coaching_groups
  for insert
  with check (
    (public.is_coach() or public.is_admin())
    and lead_coach_id = auth.uid()
  );

create policy "groups_update_lead" on public.coaching_groups
  for update
  using (lead_coach_id = auth.uid() or public.is_admin());

create policy "groups_delete_lead" on public.coaching_groups
  for delete
  using (lead_coach_id = auth.uid() or public.is_admin());

create policy "members_select_self" on public.coaching_group_members
  for select
  using (user_id = auth.uid());

create policy "members_select_lead_admin" on public.coaching_group_members
  for select
  using (
    public.is_admin()
    or public.is_group_lead(coaching_group_members.group_id)
  );

create policy "members_write_lead" on public.coaching_group_members
  for insert
  with check (
    public.is_admin()
    or public.is_group_lead(coaching_group_members.group_id)
  );

create policy "members_delete_lead" on public.coaching_group_members
  for delete
  using (
    public.is_admin()
    or public.is_group_lead(coaching_group_members.group_id)
  );

-- ---------------------------------------------------------------------------
-- Policies on other tables that still subquery coaching_groups as the
-- invoker. Same lead rule, but the read bypasses coaching_groups RLS.
-- ---------------------------------------------------------------------------

drop policy if exists "group_messages_delete" on public.group_messages;
create policy "group_messages_delete" on public.group_messages
  for delete
  using (
    user_id = auth.uid()
    or public.is_admin()
    or public.is_group_lead(group_messages.group_id)
  );

drop policy if exists "reports_select_lead_admin" on public.message_reports;
create policy "reports_select_lead_admin" on public.message_reports
  for select
  using (
    public.is_admin()
    or reporter_id = auth.uid()
    or public.is_group_lead(message_reports.group_id)
  );

drop policy if exists "reports_update_lead_admin" on public.message_reports;
create policy "reports_update_lead_admin" on public.message_reports
  for update
  using (
    public.is_admin()
    or public.is_group_lead(message_reports.group_id)
  );

notify pgrst, 'reload schema';

commit;
