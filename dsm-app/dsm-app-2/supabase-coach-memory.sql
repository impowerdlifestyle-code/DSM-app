-- ═══════════════════════════════════════════════════════════════════════
-- DSM — Coach V Memory + Voice Journal + Message Feedback
-- Run this in Supabase SQL Editor after the base schema is applied.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── COACH_MEMORY ─────────────────────────────────────────────────────
-- One row per athlete. The "what Coach V has learned about you" doc.
-- Updated periodically by a consolidation call after every N messages.
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

-- Auto-create empty memory row on profile creation
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

ALTER TABLE coach_memory ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own coach memory" ON coach_memory;
CREATE POLICY "Users manage own coach memory" ON coach_memory FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coaches view all coach memory" ON coach_memory;
CREATE POLICY "Coaches view all coach memory" ON coach_memory FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- ─── VOICE_JOURNAL ────────────────────────────────────────────────────
-- Per-athlete voice journal entries with transcription + AI analysis.
CREATE TABLE IF NOT EXISTS voice_journal (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  transcript TEXT NOT NULL,
  cues TEXT[] DEFAULT '{}',
  sentiment TEXT,           -- 'locked-in' | 'recovering' | 'flat' | 'fired-up' | etc
  ai_note TEXT,             -- Coach V's response to the entry
  duration_seconds INT,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS voice_journal_user_recorded_idx
  ON voice_journal(user_id, recorded_at DESC);

ALTER TABLE voice_journal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own voice journal" ON voice_journal;
CREATE POLICY "Users manage own voice journal" ON voice_journal FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coaches view all voice journal" ON voice_journal;
CREATE POLICY "Coaches view all voice journal" ON voice_journal FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- ─── MESSAGE_FEEDBACK ─────────────────────────────────────────────────
-- 👍 / 👎 ratings on Coach V responses. Feeds back into memory consolidation.
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

ALTER TABLE message_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own message feedback" ON message_feedback;
CREATE POLICY "Users manage own message feedback" ON message_feedback FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Coaches view all message feedback" ON message_feedback;
CREATE POLICY "Coaches view all message feedback" ON message_feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- ─── BACKFILL ─────────────────────────────────────────────────────────
-- For any existing profile without a coach_memory row, create one.
INSERT INTO coach_memory (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;
