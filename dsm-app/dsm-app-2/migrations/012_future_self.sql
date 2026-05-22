-- DSM — FUTURE SELF VOICE
-- Schema + RLS + storage bucket for the Future Self feature:
--   • voice_identity       — one row per athlete (cloned ElevenLabs voice_id + consent)
--   • future_self_clips    — every generated playback (pre-match / post-mistake / monthly / etc.)
--   • future_self_checkins — once-per-month identity check-in ritual
--   • voice_audit_log      — append-only audit of clone/generate/delete events
--   • storage bucket       — private 'future-self-audio'
--
-- RLS model (consistent with existing tables):
--   self  : auth.uid() = user_id
--   parent: linked via public.parent_links
--   coach : profiles.role = 'coach' OR profiles.is_admin = true
-- Service role bypasses RLS (used by api/future-self/*.js).

-- =========================================================================
-- 1. VOICE IDENTITY — one per athlete
-- =========================================================================
create table if not exists public.voice_identity (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  elevenlabs_voice_id  text,
  consent_given_at     timestamptz,
  consent_given_by     uuid references auth.users(id),   -- parent for minors, self for 13+
  source_sample_url    text,                              -- storage path of the original 60s recording
  identity_statement   text,                              -- transcribed combined script
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz                        -- soft delete; hard-deletes ElevenLabs voice on flip
);
create index if not exists voice_identity_active_idx
  on public.voice_identity (user_id) where deleted_at is null;

alter table public.voice_identity enable row level security;

drop policy if exists "voice_identity_select_self"   on public.voice_identity;
drop policy if exists "voice_identity_select_parent" on public.voice_identity;
drop policy if exists "voice_identity_select_coach"  on public.voice_identity;
drop policy if exists "voice_identity_insert_self"   on public.voice_identity;
drop policy if exists "voice_identity_insert_parent" on public.voice_identity;
drop policy if exists "voice_identity_update_self"   on public.voice_identity;
drop policy if exists "voice_identity_update_parent" on public.voice_identity;
drop policy if exists "voice_identity_delete_self"   on public.voice_identity;
drop policy if exists "voice_identity_delete_parent" on public.voice_identity;

create policy "voice_identity_select_self"   on public.voice_identity
  for select using (auth.uid() = user_id);
create policy "voice_identity_select_parent" on public.voice_identity
  for select using (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = auth.uid() and pl.athlete_id = voice_identity.user_id)
  );
create policy "voice_identity_select_coach"  on public.voice_identity
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
  );
create policy "voice_identity_insert_self"   on public.voice_identity
  for insert with check (auth.uid() = user_id);
-- Parent consents for a minor on behalf of their linked athlete
create policy "voice_identity_insert_parent" on public.voice_identity
  for insert with check (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = auth.uid() and pl.athlete_id = voice_identity.user_id)
  );
create policy "voice_identity_update_self"   on public.voice_identity
  for update using (auth.uid() = user_id);
create policy "voice_identity_update_parent" on public.voice_identity
  for update using (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = auth.uid() and pl.athlete_id = voice_identity.user_id)
  );
create policy "voice_identity_delete_self"   on public.voice_identity
  for delete using (auth.uid() = user_id);
create policy "voice_identity_delete_parent" on public.voice_identity
  for delete using (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = auth.uid() and pl.athlete_id = voice_identity.user_id)
  );

-- touch updated_at on UPDATE (reuses existing trigger function from onboarding migration)
drop trigger if exists voice_identity_touch on public.voice_identity;
create trigger voice_identity_touch before update on public.voice_identity
  for each row execute function public.touch_updated_at();

-- =========================================================================
-- 2. FUTURE_SELF_CLIPS — every generated future-self playback
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
-- Inserts happen server-side via service role (api/future-self/generate-clip.js).
-- Self-insert kept open for edge cases (e.g. saving a custom playback locally).
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
-- 3. FUTURE_SELF_CHECKINS — monthly identity reflection (1 per user per month)
-- =========================================================================
create table if not exists public.future_self_checkins (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  month                 text not null,                            -- 'YYYY-MM'
  prompt                text not null,
  response_transcript   text,
  response_audio_url    text,
  ai_reflection         text,                                     -- Claude analysis: identity_statement vs recent behavior
  created_at            timestamptz not null default now(),
  unique (user_id, month)
);
create index if not exists future_self_checkins_user_month_idx
  on public.future_self_checkins (user_id, month desc);

alter table public.future_self_checkins enable row level security;

drop policy if exists "future_self_checkins_select_self"   on public.future_self_checkins;
drop policy if exists "future_self_checkins_select_parent" on public.future_self_checkins;
drop policy if exists "future_self_checkins_select_coach"  on public.future_self_checkins;
drop policy if exists "future_self_checkins_insert_self"   on public.future_self_checkins;
drop policy if exists "future_self_checkins_update_self"   on public.future_self_checkins;
drop policy if exists "future_self_checkins_delete_self"   on public.future_self_checkins;

create policy "future_self_checkins_select_self"   on public.future_self_checkins
  for select using (auth.uid() = user_id);
create policy "future_self_checkins_select_parent" on public.future_self_checkins
  for select using (
    exists (select 1 from public.parent_links pl
            where pl.parent_id = auth.uid() and pl.athlete_id = future_self_checkins.user_id)
  );
create policy "future_self_checkins_select_coach"  on public.future_self_checkins
  for select using (
    exists (select 1 from public.profiles p
            where p.id = auth.uid() and (p.role = 'coach' or p.is_admin = true))
  );
create policy "future_self_checkins_insert_self" on public.future_self_checkins
  for insert with check (auth.uid() = user_id);
create policy "future_self_checkins_update_self" on public.future_self_checkins
  for update using (auth.uid() = user_id);
create policy "future_self_checkins_delete_self" on public.future_self_checkins
  for delete using (auth.uid() = user_id);

-- =========================================================================
-- 4. VOICE_AUDIT_LOG — append-only audit trail (Step 8)
-- Dedicated table chosen over reusing coach_nudges/xp_log because audit
-- semantics (immutable, security-relevant) don't fit either pattern.
-- =========================================================================
create table if not exists public.voice_audit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  actor_id    uuid references auth.users(id),               -- who triggered the event (self, parent, coach, or null=system)
  event       text not null check (event in (
    'consent_granted','consent_revoked',
    'voice_cloned','voice_deleted',
    'clip_generated','clip_played','clip_deleted',
    'checkin_completed'
  )),
  ref_id      uuid,                                          -- clip / checkin / voice row id, when relevant
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
-- Most inserts come from service role (API). Self-insert allowed for client-side
-- 'clip_played' marks. No UPDATE / DELETE policies — log is append-only.
create policy "voice_audit_log_insert_self"   on public.voice_audit_log
  for insert with check (auth.uid() = actor_id or auth.uid() = user_id);

-- =========================================================================
-- 5. STORAGE BUCKET — private 'future-self-audio'
-- Path convention: {userId}/identity-source.webm  |  {userId}/{clipId}.mp3
--                  {userId}/checkin/{month}.webm
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

-- Path's first segment is the owning user's id (matches our convention above)
create policy "future_self_audio_select_self" on storage.objects for select using (
  bucket_id = 'future-self-audio' and (storage.foldername(name))[1] = auth.uid()::text
);
create policy "future_self_audio_select_parent" on storage.objects for select using (
  bucket_id = 'future-self-audio' and exists (
    select 1 from public.parent_links pl
    where pl.parent_id = auth.uid()
      and pl.athlete_id::text = (storage.foldername(name))[1]
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
    where pl.parent_id = auth.uid()
      and pl.athlete_id::text = (storage.foldername(name))[1]
  )
);
