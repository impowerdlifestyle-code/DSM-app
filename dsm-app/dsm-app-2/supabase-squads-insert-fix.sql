-- Squads INSERT + member-join policies (defensive re-create)
-- Run if "new row violates row-level security policy for table squads"

-- squads INSERT — creator must be the auth user
drop policy if exists "squads_insert_self" on public.squads;
create policy "squads_insert_self" on public.squads
  for insert with check (created_by = auth.uid());

-- squad_members INSERT — user must add themselves
drop policy if exists "squad_members_insert_self" on public.squad_members;
create policy "squad_members_insert_self" on public.squad_members
  for insert with check (user_id = auth.uid());

-- squad_members DELETE — only delete your own row
drop policy if exists "squad_members_delete_self" on public.squad_members;
create policy "squad_members_delete_self" on public.squad_members
  for delete using (user_id = auth.uid());
