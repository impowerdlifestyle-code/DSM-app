-- squad_members RLS — comprehensive idempotent rebuild
-- Fixes: "new row violates row-level security policy (USING expression)"
-- which fires when INSERT succeeds but the implicit SELECT-back is blocked.

alter table public.squad_members enable row level security;

drop policy if exists "squad_members_select_same"   on public.squad_members;
drop policy if exists "squad_members_select_own"    on public.squad_members;
drop policy if exists "squad_members_select_peers"  on public.squad_members;
drop policy if exists "squad_members_admin_view"   on public.squad_members;
drop policy if exists "squad_members_insert_self"  on public.squad_members;
drop policy if exists "squad_members_delete_self"  on public.squad_members;

-- SELECT: own row OR peer in same squad OR coach/admin
create policy "squad_members_select_own" on public.squad_members
  for select using (user_id = auth.uid());

create policy "squad_members_select_peers" on public.squad_members
  for select using (is_squad_member(squad_id));

create policy "squad_members_admin_view" on public.squad_members
  for select using (is_coach() or is_admin());

-- INSERT: only insert yourself
create policy "squad_members_insert_self" on public.squad_members
  for insert with check (user_id = auth.uid());

-- DELETE: only remove yourself
create policy "squad_members_delete_self" on public.squad_members
  for delete using (user_id = auth.uid());

-- Same defensive rebuild for squads INSERT (so create-squad works too)
drop policy if exists "squads_insert_self" on public.squads;
create policy "squads_insert_self" on public.squads
  for insert with check (created_by = auth.uid());

-- And SELECT for squads creator (so .insert().select() pattern works on create)
drop policy if exists "squads_select_creator" on public.squads;
create policy "squads_select_creator" on public.squads
  for select using (created_by = auth.uid());
