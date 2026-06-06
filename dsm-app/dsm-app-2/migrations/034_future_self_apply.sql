-- DSM — Apply the Future Self tables that 012 defined but were never run on
-- voxsrn-. future_self_checkins already exists; voice_identity is intentionally
-- omitted (no longer referenced by api/future-self/*). This creates only what
-- the monthly ritual + Coach V voice clips actually need:
--   • future_self_clips  — every generated Coach V voice clip
--   • voice_audit_log    — append-only audit (best-effort from the API)
--   • storage bucket      — private 'future-self-audio'
-- Idempotent: safe to re-run.

-- =========================================================================
-- 1. FUTURE_SELF_CLIPS
-- =========================================================================
create table if not exists public.future_self_clips (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  context     text not null check (context in ('pre_match','post_mistake','monthly_check','custom','onboarding')),
  script      text not null,
  audio_url   text,
  played_at   timestamptz,
  match_id    uuid references public.match_log(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists future_self_clips_user_created_idx
  on public.future_self_clips (user_id, created_at desc);
create index if not exists future_self_clips_user_context_idx
  on public.future_self_clips (user_id, context);

alter table public.future_self_clips enable row level security;

drop policy if exists "future_self_clips_select_self"   on public.future_self_clips;
drop policy if exists "future_self_clips_select_parent" on public.future_self_clips;
drop policy if exists "future_self_clips_select_coach"  on public.future_self_clips;
drop policy if exists "future_self_clips_insert_self"   on public.future_self_clips;
drop policy if exists "future_self_clips_update_self"   on public.future_self_clips;
drop policy if exists "future_self_clips_delete_self"   on public.future_self_clips;
drop policy if exists "future_self_clips_delete_parent" on public.future_self_clips;

create policy "future_self_clips_select_self"   on public.future_self_clips
  for select using (auth.uid() = user_id);
create policy "future_self_clips_select_parent" on public.future_self_clips
  for select using (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = auth.uid() and pl.athlete_id = future_self_clips.user_id)
  );
create policy "future_self_clips_select_coach"  on public.future_self_clips
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
  );
create policy "future_self_clips_insert_self"   on public.future_self_clips
  for insert with check (auth.uid() = user_id);
create policy "future_self_clips_update_self"   on public.future_self_clips
  for update using (auth.uid() = user_id);
create policy "future_self_clips_delete_self"   on public.future_self_clips
  for delete using (auth.uid() = user_id);
create policy "future_self_clips_delete_parent" on public.future_self_clips
  for delete using (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = auth.uid() and pl.athlete_id = future_self_clips.user_id)
  );

-- =========================================================================
-- 2. VOICE_AUDIT_LOG (append-only)
-- =========================================================================
create table if not exists public.voice_audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  actor_id    uuid references auth.users(id),
  event       text not null check (event in (
    'consent_granted','consent_revoked',
    'voice_cloned','voice_deleted',
    'clip_generated','clip_played','clip_deleted',
    'checkin_completed'
  )),
  ref_id      uuid,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists voice_audit_log_user_created_idx
  on public.voice_audit_log (user_id, created_at desc);
create index if not exists voice_audit_log_event_idx
  on public.voice_audit_log (event, created_at desc);

alter table public.voice_audit_log enable row level security;

drop policy if exists "voice_audit_log_select_self"   on public.voice_audit_log;
drop policy if exists "voice_audit_log_select_parent" on public.voice_audit_log;
drop policy if exists "voice_audit_log_select_coach"  on public.voice_audit_log;
drop policy if exists "voice_audit_log_insert_self"   on public.voice_audit_log;

create policy "voice_audit_log_select_self"   on public.voice_audit_log
  for select using (auth.uid() = user_id);
create policy "voice_audit_log_select_parent" on public.voice_audit_log
  for select using (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = auth.uid() and pl.athlete_id = voice_audit_log.user_id)
  );
create policy "voice_audit_log_select_coach"  on public.voice_audit_log
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
  );
create policy "voice_audit_log_insert_self"   on public.voice_audit_log
  for insert with check (auth.uid() = actor_id or auth.uid() = user_id);

-- =========================================================================
-- 3. STORAGE BUCKET — private 'future-self-audio'
-- =========================================================================
insert into storage.buckets (id, name, public)
values ('future-self-audio', 'future-self-audio', false)
on conflict (id) do nothing;

drop policy if exists "future_self_audio_select_self"   on storage.objects;
drop policy if exists "future_self_audio_select_parent" on storage.objects;
drop policy if exists "future_self_audio_select_coach"  on storage.objects;
drop policy if exists "future_self_audio_insert_self"   on storage.objects;
drop policy if exists "future_self_audio_update_self"   on storage.objects;
drop policy if exists "future_self_audio_delete_self"   on storage.objects;
drop policy if exists "future_self_audio_delete_parent" on storage.objects;

create policy "future_self_audio_select_self" on storage.objects for select using (
  bucket_id = 'future-self-audio' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "future_self_audio_select_parent" on storage.objects for select using (
  bucket_id = 'future-self-audio' and exists (
    select 1 from public.parent_links pl
    where pl.parent_id = auth.uid() and pl.athlete_id::text = (storage.foldername(name))[1]
  )
);
create policy "future_self_audio_select_coach" on storage.objects for select using (
  bucket_id = 'future-self-audio' and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true)
  )
);
create policy "future_self_audio_insert_self" on storage.objects for insert with check (
  bucket_id = 'future-self-audio' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "future_self_audio_update_self" on storage.objects for update using (
  bucket_id = 'future-self-audio' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "future_self_audio_delete_self" on storage.objects for delete using (
  bucket_id = 'future-self-audio' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "future_self_audio_delete_parent" on storage.objects for delete using (
  bucket_id = 'future-self-audio' and exists (
    select 1 from public.parent_links pl
    where pl.parent_id = auth.uid() and pl.athlete_id::text = (storage.foldername(name))[1]
  )
);

notify pgrst, 'reload schema';
