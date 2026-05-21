-- DSM — coach tiers + coach-assigned tasks
-- Idempotent: safe to re-run.

-- 1. profiles.coach_tier (1=Assistant, 2=Coach, 3=Mentor)
alter table public.profiles
  add column if not exists coach_tier smallint;

comment on column public.profiles.coach_tier is
  'Coach tier when role=coach. 1=Assistant, 2=Coach, 3=Mentor. NULL for non-coaches.';

-- 2. coach_tasks
create table if not exists public.coach_tasks (
  id           uuid primary key default gen_random_uuid(),
  athlete_id   uuid not null references public.profiles(id) on delete cascade,
  assigned_by  uuid          references public.profiles(id) on delete set null,
  title        text not null,
  description  text,
  due_date     date,
  priority     text not null default 'medium' check (priority in ('low','medium','high')),
  status       text not null default 'open'   check (status in ('open','done','skipped')),
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists coach_tasks_athlete_idx     on public.coach_tasks(athlete_id, status);
create index if not exists coach_tasks_assigned_by_idx on public.coach_tasks(assigned_by);
create index if not exists coach_tasks_created_idx     on public.coach_tasks(created_at desc);

alter table public.coach_tasks enable row level security;

drop policy if exists "athlete sees own tasks"        on public.coach_tasks;
drop policy if exists "athlete updates own task done" on public.coach_tasks;
drop policy if exists "coach/admin sees all tasks"    on public.coach_tasks;
drop policy if exists "coach/admin writes tasks"      on public.coach_tasks;
drop policy if exists "coach/admin updates tasks"     on public.coach_tasks;
drop policy if exists "coach/admin deletes tasks"     on public.coach_tasks;

create policy "athlete sees own tasks"
  on public.coach_tasks for select
  using (athlete_id = auth.uid() or public.is_coach() or public.is_admin());

create policy "athlete updates own task done"
  on public.coach_tasks for update
  using (athlete_id = auth.uid())
  with check (athlete_id = auth.uid());

create policy "coach/admin writes tasks"
  on public.coach_tasks for insert
  with check (public.is_coach() or public.is_admin());

create policy "coach/admin updates tasks"
  on public.coach_tasks for update
  using (public.is_coach() or public.is_admin());

create policy "coach/admin deletes tasks"
  on public.coach_tasks for delete
  using (public.is_coach() or public.is_admin());

-- 3. coaching_groups — coach-led cohorts
create table if not exists public.coaching_groups (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  description   text,
  lead_coach_id uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now()
);

create index if not exists coaching_groups_lead_idx on public.coaching_groups(lead_coach_id);

create table if not exists public.coaching_group_members (
  group_id      uuid not null references public.coaching_groups(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  role_in_group text not null default 'athlete' check (role_in_group in ('athlete','coach')),
  added_at      timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists coaching_group_members_user_idx on public.coaching_group_members(user_id);

alter table public.coaching_groups        enable row level security;
alter table public.coaching_group_members enable row level security;

drop policy if exists "groups_select_any_coach"     on public.coaching_groups;
drop policy if exists "groups_select_member"        on public.coaching_groups;
drop policy if exists "groups_insert_coach"         on public.coaching_groups;
drop policy if exists "groups_update_lead"          on public.coaching_groups;
drop policy if exists "groups_delete_lead"          on public.coaching_groups;

create policy "groups_select_any_coach" on public.coaching_groups for select
  using (public.is_coach() or public.is_admin());

create policy "groups_select_member" on public.coaching_groups for select
  using (exists (
    select 1 from public.coaching_group_members m
    where m.group_id = coaching_groups.id and m.user_id = auth.uid()
  ));

create policy "groups_insert_coach" on public.coaching_groups for insert
  with check ((public.is_coach() or public.is_admin()) and lead_coach_id = auth.uid());

create policy "groups_update_lead" on public.coaching_groups for update
  using (lead_coach_id = auth.uid() or public.is_admin());

create policy "groups_delete_lead" on public.coaching_groups for delete
  using (lead_coach_id = auth.uid() or public.is_admin());

drop policy if exists "members_select_any_coach"  on public.coaching_group_members;
drop policy if exists "members_select_self"       on public.coaching_group_members;
drop policy if exists "members_write_lead"        on public.coaching_group_members;
drop policy if exists "members_delete_lead"       on public.coaching_group_members;

create policy "members_select_any_coach" on public.coaching_group_members for select
  using (public.is_coach() or public.is_admin());

create policy "members_select_self" on public.coaching_group_members for select
  using (user_id = auth.uid());

create policy "members_write_lead" on public.coaching_group_members for insert
  with check (
    public.is_admin() or exists (
      select 1 from public.coaching_groups g
      where g.id = coaching_group_members.group_id and g.lead_coach_id = auth.uid()
    )
  );

create policy "members_delete_lead" on public.coaching_group_members for delete
  using (
    public.is_admin() or exists (
      select 1 from public.coaching_groups g
      where g.id = coaching_group_members.group_id and g.lead_coach_id = auth.uid()
    )
  );
