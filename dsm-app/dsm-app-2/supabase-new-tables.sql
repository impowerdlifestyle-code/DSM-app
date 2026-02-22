-- Run this in Supabase SQL Editor to add new tables

-- BALL MASTERY TABLE
CREATE TABLE IF NOT EXISTS ball_mastery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  date DATE,
  skills JSONB,
  total_skills INTEGER DEFAULT 0,
  total_reps INTEGER DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- WEEKLY CHECK-INS TABLE
CREATE TABLE IF NOT EXISTS weekly_checkins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week TEXT,
  biggest_win TEXT,
  biggest_challenge TEXT,
  shark_moment TEXT,
  goldfish_moment TEXT,
  self_talk_moment TEXT,
  energy_level INTEGER DEFAULT 7,
  confidence_level INTEGER DEFAULT 7,
  sessions_completed INTEGER DEFAULT 0,
  goal_next_week TEXT,
  message_to_coach TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, week)
);

-- ROW LEVEL SECURITY
ALTER TABLE ball_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users manage own ball mastery" ON ball_mastery FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches view all ball mastery" ON ball_mastery FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);
CREATE POLICY "Users manage own checkins" ON weekly_checkins FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Coaches view all checkins" ON weekly_checkins FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
);
