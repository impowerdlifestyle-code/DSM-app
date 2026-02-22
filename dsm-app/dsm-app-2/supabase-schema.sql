-- DSM App Database Schema
-- Run this in your Supabase SQL Editor

-- ─── PROFILES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'athlete', -- 'athlete' or 'coach'
  access_level TEXT DEFAULT 'trial', -- 'trial', 'mentoring', 'paid', 'locked'
  program_start_date DATE DEFAULT CURRENT_DATE,
  streak INTEGER DEFAULT 0,
  last_logged DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── ACTION STEPS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS action_steps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player_name TEXT,
  session_type TEXT, -- 'Practice' or 'Game'
  date DATE,
  day_of_week TEXT,
  did_action_steps TEXT,
  shark_used BOOLEAN DEFAULT FALSE,
  shark_occasion TEXT,
  shark_comments TEXT,
  goldfish_used BOOLEAN DEFAULT FALSE,
  goldfish_occasion TEXT,
  goldfish_comments TEXT,
  selftalk_used BOOLEAN DEFAULT FALSE,
  selftalk_occasion TEXT,
  selftalk_comments TEXT,
  tuneout_used BOOLEAN DEFAULT FALSE,
  tuneout_occasion TEXT,
  tuneout_comments TEXT,
  visualization_used BOOLEAN DEFAULT FALSE,
  visualization_occasion TEXT,
  visualization_comments TEXT,
  conditioning INTEGER DEFAULT 5,
  strength INTEGER DEFAULT 5,
  technical INTEGER DEFAULT 5,
  mental INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── HABITS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week TEXT, -- e.g. '2026-W8'
  habits JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week)
);

-- ─── CHAT HISTORY ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT, -- 'user' or 'assistant'
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Profiles: users see own, coaches see all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Coaches can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- Action steps: users manage own, coaches see all
CREATE POLICY "Users manage own action steps" ON action_steps FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches can view all action steps" ON action_steps FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);

-- Habits: users manage own
CREATE POLICY "Users manage own habits" ON habits FOR ALL USING (auth.uid() = user_id);

-- Chat: users manage own
CREATE POLICY "Users manage own chat" ON chat_history FOR ALL USING (auth.uid() = user_id);
