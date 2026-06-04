-- Audit hardening (2026-06-04): two RLS tightenings found in the groups review.

-- 1) coach_tasks insert: the old policy allowed ANY coach/admin to insert with
--    any assigned_by. Require assigned_by = the caller so a coach can't write
--    tasks attributed to another coach. (Admins still operate via is_admin().)
drop policy if exists "coach/admin writes tasks" on public.coach_tasks;
create policy "coach/admin writes tasks"
  on public.coach_tasks for insert
  with check (
    public.is_admin()
    or (public.is_coach() and assigned_by = auth.uid())
  );

-- 2) coaching_groups / coaching_group_members SELECT: the old "any coach can
--    view every group" policy leaked every group's join_code + full roster to
--    any coach account. Restrict to the lead coach, admins, and the group's own
--    members. (group_messages RLS is unaffected — is_group_member() is SECURITY
--    DEFINER and reads these tables directly.)
drop policy if exists "groups_select_any_coach" on public.coaching_groups;
create policy "groups_select_lead_admin" on public.coaching_groups for select
  using (lead_coach_id = auth.uid() or public.is_admin());
-- (existing "groups_select_member" stays: members can see groups they're in.)

drop policy if exists "members_select_any_coach" on public.coaching_group_members;
create policy "members_select_lead_admin" on public.coaching_group_members for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.coaching_groups g
      where g.id = coaching_group_members.group_id and g.lead_coach_id = auth.uid()
    )
  );
-- (existing "members_select_self" stays: a user can see their own membership.)

notify pgrst, 'reload schema';
