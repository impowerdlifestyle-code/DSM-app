-- Group chat for coaching groups (Trainerize-style group interaction).
--
-- Every member of a coaching group (athletes + coach-members) plus the lead
-- coach can read and post in that group's chat. Lead coach / admin can delete
-- any message (moderation); members can delete their own.
--
-- is_group_member() is SECURITY DEFINER so the group_messages RLS policies can
-- check membership without recursing into coaching_group_members' own RLS.

create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select
    exists (
      select 1 from public.coaching_group_members m
      where m.group_id = p_group_id and m.user_id = auth.uid()
    )
    or exists (
      select 1 from public.coaching_groups g
      where g.id = p_group_id and g.lead_coach_id = auth.uid()
    );
$$;

revoke all on function public.is_group_member(uuid) from public;
grant execute on function public.is_group_member(uuid) to authenticated, service_role;

create table if not exists public.group_messages (
  id         uuid primary key default gen_random_uuid(),
  group_id   uuid not null references public.coaching_groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists group_messages_group_idx on public.group_messages (group_id, created_at);

alter table public.group_messages enable row level security;

drop policy if exists "group_messages_select" on public.group_messages;
drop policy if exists "group_messages_insert" on public.group_messages;
drop policy if exists "group_messages_delete" on public.group_messages;

create policy "group_messages_select" on public.group_messages for select
  using (public.is_group_member(group_id) or public.is_admin());

create policy "group_messages_insert" on public.group_messages for insert
  with check (
    user_id = auth.uid()
    and (public.is_group_member(group_id) or public.is_admin())
  );

create policy "group_messages_delete" on public.group_messages for delete
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.coaching_groups g
      where g.id = group_messages.group_id and g.lead_coach_id = auth.uid()
    )
  );

notify pgrst, 'reload schema';
