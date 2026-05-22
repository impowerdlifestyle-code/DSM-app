-- ═══════════════════════════════════════════════════════════════════════
-- DSM — FULL DATABASE MIGRATION (safe on fresh OR existing project)
-- Combines: supabase-schema.sql + supabase-new-tables.sql + supabase-coach-memory.sql
-- All statements use IF NOT EXISTS / OR REPLACE / DROP IF EXISTS so this is idempotent.
-- Paste into Supabase SQL Editor → Run.
-- ═══════════════════════════════════════════════════════════════════════

-- ────────────────────────────────────────────────────────────
-- PART 1 — BASE SCHEMA (profiles, action_steps, habits, chat_history)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'athlete',
  access_level TEXT DEFAULT 'trial',
  program_start_date DATE DEFAULT CURRENT_DATE,
  program_week INT DEFAULT 1,
  assigned_coach TEXT,
  streak INTEGER DEFAULT 0,
  last_logged DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE TABLE IF NOT EXISTS action_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player_name TEXT,
  session_type TEXT,
  date DATE,
  day_of_week TEXT,
  did_steps TEXT,
  shark_used BOOLEAN DEFAULT FALSE,
  shark_occasion TEXT,
  shark_comment TEXT,
  goldfish_used BOOLEAN DEFAULT FALSE,
  goldfish_occasion TEXT,
  goldfish_comment TEXT,
  selftalk_used BOOLEAN DEFAULT FALSE,
  selftalk_occasion TEXT,
  selftalk_comment TEXT,
  tuneout_used BOOLEAN DEFAULT FALSE,
  tuneout_occasion TEXT,
  tuneout_comment TEXT,
  conditioning INT DEFAULT 7,
  strength INT DEFAULT 7,
  technical INT DEFAULT 7,
  mental INT DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  habits JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT,
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_history_user_created_idx
  ON chat_history(user_id, created_at);

-- ────────────────────────────────────────────────────────────
-- PART 2 — EXTENDED TABLES (ball_mastery, weekly_checkins)
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ball_mastery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE,
  skills JSONB,
  total_skills INT DEFAULT 0,
  total_reps INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ball_mastery_user_date_idx
  ON ball_mastery(user_id, date DESC);

CREATE TABLE IF NOT EXISTS weekly_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week TEXT,
  sessions_completed INT,
  did_visualization TEXT,
  did_morning_routine TEXT,
  confidence_level INT,
  mental INT,
  wins TEXT,
  struggles TEXT,
  goal TEXT,
  focus_area TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT weekly_checkins_user_week_unique UNIQUE (user_id, week)
);

CREATE INDEX IF NOT EXISTS weekly_checkins_user_created_idx
  ON weekly_checkins(user_id, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- PART 3 — COACH V MEMORY + VOICE JOURNAL + FEEDBACK
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS coach_memory (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  athlete_summary TEXT DEFAULT '',
  cue_words TEXT[] DEFAULT '{}',
  patterns_observed TEXT[] DEFAULT '{}',
  growth_edges TEXT[] DEFAULT '{}',
  messages_since_consolidation INT DEFAULT 0,
  last_consolidated TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_coach_memory()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO coach_memory (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_coach_memory ON profiles;
CREATE TRIGGER on_profile_created_coach_memory
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_new_coach_memory();

CREATE TABLE IF NOT EXISTS voice_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  transcript TEXT NOT NULL,
  cues TEXT[] DEFAULT '{}',
  sentiment TEXT,
  ai_note TEXT,
  duration_seconds INT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voice_journal_user_recorded_idx
  ON voice_journal(user_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS message_feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_history(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, message_id)
);

CREATE INDEX IF NOT EXISTS message_feedback_user_idx
  ON message_feedback(user_id, created_at DESC);

-- ────────────────────────────────────────────────────────────
-- PART 4 — ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────

ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_steps     ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ball_mastery     ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE coach_memory     ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_journal    ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;

-- Drop-and-recreate every policy so the file is fully idempotent.

DROP POLICY IF EXISTS "Users view own profile"  ON profiles;
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
DROP POLICY IF EXISTS "Coaches view all profiles" ON profiles;
CREATE POLICY "Users view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Coaches view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

DROP POLICY IF EXISTS "Users manage own action steps" ON action_steps;
DROP POLICY IF EXISTS "Coaches view all action steps" ON action_steps;
CREATE POLICY "Users manage own action steps" ON action_steps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches view all action steps" ON action_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

DROP POLICY IF EXISTS "Users manage own habits" ON habits;
CREATE POLICY "Users manage own habits" ON habits FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own chat" ON chat_history;
DROP POLICY IF EXISTS "Coaches view all chat" ON chat_history;
CREATE POLICY "Users manage own chat" ON chat_history FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches view all chat" ON chat_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

DROP POLICY IF EXISTS "Users manage own ball mastery" ON ball_mastery;
DROP POLICY IF EXISTS "Coaches view all ball mastery" ON ball_mastery;
CREATE POLICY "Users manage own ball mastery" ON ball_mastery FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches view all ball mastery" ON ball_mastery FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

DROP POLICY IF EXISTS "Users manage own weekly checkins" ON weekly_checkins;
DROP POLICY IF EXISTS "Coaches view all weekly checkins" ON weekly_checkins;
CREATE POLICY "Users manage own weekly checkins" ON weekly_checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches view all weekly checkins" ON weekly_checkins FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

DROP POLICY IF EXISTS "Users manage own coach memory" ON coach_memory;
DROP POLICY IF EXISTS "Coaches view all coach memory" ON coach_memory;
CREATE POLICY "Users manage own coach memory" ON coach_memory FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches view all coach memory" ON coach_memory FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

DROP POLICY IF EXISTS "Users manage own voice journal" ON voice_journal;
DROP POLICY IF EXISTS "Coaches view all voice journal" ON voice_journal;
CREATE POLICY "Users manage own voice journal" ON voice_journal FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches view all voice journal" ON voice_journal FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

DROP POLICY IF EXISTS "Users manage own message feedback" ON message_feedback;
DROP POLICY IF EXISTS "Coaches view all message feedback" ON message_feedback;
CREATE POLICY "Users manage own message feedback" ON message_feedback FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches view all message feedback" ON message_feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- ────────────────────────────────────────────────────────────
-- PART 5 — BACKFILL
-- ────────────────────────────────────────────────────────────

-- Any existing auth user without a profile gets one
INSERT INTO profiles (id, email, full_name)
SELECT id, email, raw_user_meta_data->>'full_name'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Any existing profile without a coach_memory row gets one
INSERT INTO coach_memory (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;
