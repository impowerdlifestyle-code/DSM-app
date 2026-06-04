-- UGC moderation for group chat (Apple Guideline 1.2 / Google UGC policy):
-- report objectionable messages, block abusive users, and record EULA accept.

-- 1) Terms / EULA acceptance timestamp (set at signup).
alter table public.profiles add column if not exists terms_accepted_at timestamptz;

-- 2) Message reports — any group member flags a message; the lead coach/admin
--    reviews and acts (delete the message or dismiss) within 24h.
create table if not exists public.message_reports (
  id               uuid primary key default gen_random_uuid(),
  message_id       uuid references public.group_messages(id) on delete cascade,
  group_id         uuid not null references public.coaching_groups(id) on delete cascade,
  reporter_id      uuid not null references public.profiles(id) on delete cascade,
  reported_user_id uuid references public.profiles(id) on delete set null,
  message_text     text,
  reason           text,
  status           text not null default 'open' check (status in ('open','actioned','dismissed')),
  reviewed_by      uuid references public.profiles(id) on delete set null,
  reviewed_at      timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists message_reports_group_idx on public.message_reports(group_id, status);
alter table public.message_reports enable row level security;

drop policy if exists "reports_insert_member"     on public.message_reports;
drop policy if exists "reports_select_lead_admin"  on public.message_reports;
drop policy if exists "reports_update_lead_admin"  on public.message_reports;

create policy "reports_insert_member" on public.message_reports for insert
  with check (reporter_id = auth.uid() and (public.is_group_member(group_id) or public.is_admin()));

create policy "reports_select_lead_admin" on public.message_reports for select
  using (
    public.is_admin()
    or reporter_id = auth.uid()
    or exists (select 1 from public.coaching_groups g where g.id = message_reports.group_id and g.lead_coach_id = auth.uid())
  );

create policy "reports_update_lead_admin" on public.message_reports for update
  using (
    public.is_admin()
    or exists (select 1 from public.coaching_groups g where g.id = message_reports.group_id and g.lead_coach_id = auth.uid())
  );

-- 3) User blocks — a user hides another user's content for themselves.
create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.user_blocks enable row level security;

drop policy if exists "blocks_select_own" on public.user_blocks;
drop policy if exists "blocks_insert_own" on public.user_blocks;
drop policy if exists "blocks_delete_own" on public.user_blocks;

create policy "blocks_select_own" on public.user_blocks for select using (blocker_id = auth.uid());
create policy "blocks_insert_own" on public.user_blocks for insert with check (blocker_id = auth.uid());
create policy "blocks_delete_own" on public.user_blocks for delete using (blocker_id = auth.uid());

notify pgrst, 'reload schema';
