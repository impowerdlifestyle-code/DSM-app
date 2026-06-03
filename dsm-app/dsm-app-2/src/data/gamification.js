// Mock gamification data for UI shells

// Current athlete state (level/XP/coins/season)
export const PLAYER = {
  level: 14,
  levelTitle: 'Captain',
  xp: 8420,
  xpToNext: 10000,
  coins: 380,
  streakFreezes: 2,
  totalXpEarned: 142500,
  joinDate: '2025-08-04',
  mentalScore: 88, // 0-100
  rankTier: 'Captain',  // Rookie · Starter · Captain · MVP · Elite
  seasonRank: 142,      // global rank this season
  seasonProgress: 0.62, // fraction through 8-week season
}

// XP per action (visible to user)
export const XP_TABLE = {
  actionStep: 50,
  ballMastery: 40,
  workoutComplete: 100,
  weeklyCheckin: 200,
  videoFormCheck: 75,
  voiceJournal: 60,
  questComplete: 150,
  matchReflection: 80,   // post-game mental reflection — rewards processing, not the result
  challengeComplete: 250, // weekly mindset challenge completed
  perfectWeek: 500,
}

// Levels — title at every 5
export const LEVELS = [
  { lvl: 1,  title: 'Rookie',   tier: 'Rookie',  threshold: 0 },
  { lvl: 5,  title: 'Reserve',  tier: 'Rookie',  threshold: 2500 },
  { lvl: 10, title: 'Starter',  tier: 'Starter', threshold: 6000 },
  { lvl: 15, title: 'Captain',  tier: 'Captain', threshold: 12000 },
  { lvl: 20, title: 'MVP',      tier: 'MVP',     threshold: 22000 },
  { lvl: 25, title: 'Elite',    tier: 'Elite',   threshold: 40000 },
  { lvl: 30, title: 'Legend',   tier: 'Elite',   threshold: 80000 },
]

// ─── DSM MINDSET RANKS ───────────────────────────────────────────────
// The real progression ladder. Earned by CONSISTENCY XP only — daily
// check-ins, routines, reflections, bounce-backs, streaks. Never by goals
// scored, wins, or stats. A bench player who shows up out-ranks a star who
// doesn't. Thresholds are cumulative lifetime XP from xp_log.
export const RANKS = [
  { key: 'rookie',     name: 'Rookie Mindset',          threshold: 0,     icon: '🌱', blurb: 'Every shark started here. Show up, log your reps, build the base.' },
  { key: 'competitor', name: 'Competitor',              threshold: 1500,  icon: '⚡', blurb: "The habit's forming. You're choosing the work more days than not." },
  { key: 'pressure',   name: 'Pressure Performer',      threshold: 5000,  icon: '🔥', blurb: "You do the reps when it's hard. Pressure's turning into fuel." },
  { key: 'leader',     name: 'Team Leader',             threshold: 12000, icon: '⭐', blurb: 'Your consistency sets the standard. Teammates feel it.' },
  { key: 'elite',      name: 'Elite Mentality',         threshold: 25000, icon: '💎', blurb: 'Locked in. The mental game is your real edge now.' },
  { key: 'shark',      name: 'Shark Mindset Certified', threshold: 50000, icon: '🦈', blurb: 'Relentless. Short memory, big intent. You hunt every rep.' },
]

// Pure: derive current mindset rank + progress from cumulative XP.
export function rankFromXp(totalXp = 0) {
  const sorted = [...RANKS].sort((a, b) => a.threshold - b.threshold)
  let idx = 0
  for (let i = 0; i < sorted.length; i++) {
    if (totalXp >= sorted[i].threshold) idx = i
    else break
  }
  const rank = sorted[idx]
  const next = sorted[idx + 1] || null
  const floor = rank.threshold
  const ceil = next ? next.threshold : rank.threshold
  const xpInto = totalXp - floor
  const xpForNext = next ? ceil - floor : 0
  const pct = next ? Math.min(100, Math.round((xpInto / xpForNext) * 100)) : 100
  return { rank, next, idx, total: sorted.length, xpInto, xpForNext, pct, xpToNext: next ? ceil - totalXp : 0 }
}

// Competitive circuits for the league leaderboards + ECNL/MLS NEXT challenges.
export const LEAGUES = [
  'ECNL', 'ECNL RL', 'MLS NEXT', 'Girls Academy', 'EA', 'NPL', 'DPL',
  'State / Travel', 'High School', 'Rec', 'Other',
]

// ─── WEEKLY MINDSET CHALLENGES ───────────────────────────────────────
// A pool of consistency challenges. Three rotate in each week, picked
// deterministically by week number so every athlete sees the same set.
// Self-attested: athletes tap as they complete each rep. Completion grants
// challengeComplete XP + the named badge. All reward process, not results.
export const WEEKLY_CHALLENGE_POOL = [
  { id: 'pregame-5',    title: 'Pre-game routine ×5',     sub: 'Run your 60-second routine before 5 sessions', target: 5, icon: '🎬', badge: 'challenge-pregame' },
  { id: 'goldfish',     title: 'Goldfish reset',          sub: 'Reset after every mistake, all week',          target: 7, icon: '🐠', badge: 'challenge-goldfish' },
  { id: 'leadership',   title: 'Leadership body language', sub: 'Big, calm body language — 5 moments',          target: 5, icon: '⭐', badge: 'challenge-leadership' },
  { id: 'demand-ball',  title: 'Demand the ball',         sub: 'Call for it under pressure — 10 times',         target: 10, icon: '🦈', badge: 'challenge-demand' },
  { id: 'selftalk',     title: 'Positive self-talk',      sub: 'Swap one inner-critic line for a cue — 7 times', target: 7, icon: '💬', badge: 'challenge-selftalk' },
  { id: 'visualize-3',  title: 'Visualize the game',      sub: 'Mental rehearsal before 3 matches/practices',   target: 3, icon: '🧠', badge: 'challenge-visualize' },
  { id: 'tuneout',      title: 'Tune-out the noise',      sub: 'Filter sideline/crowd noise — 5 moments',        target: 5, icon: '🔇', badge: 'challenge-tuneout' },
  { id: 'breath-reset', title: 'Box-breath reset',        sub: 'Use the breath to settle nerves — 5 times',     target: 5, icon: '🌬', badge: 'challenge-breath' },
]

// ─── PARENT INVOLVEMENT CHALLENGES ───────────────────────────────────
// Self-attested challenges for the parent (Parent Mode). Stored in the same
// challenge_progress table keyed by the parent's own user_id, so no extra
// schema. Makes the whole family participate. Parent XP never touches the
// athlete leaderboards (the RPCs filter role='athlete').
export const PARENT_CHALLENGES = [
  { id: 'parent-positive',    title: 'Positive communication streak', sub: "Lead with 'I love watching you play' — 7 days", target: 7, icon: '💬', badge: 'parent-positive' },
  { id: 'parent-reflection',  title: 'Post-game reflection',          sub: 'Calm debrief, let them lead — after 4 games',  target: 4, icon: '🗣', badge: 'parent-reflection' },
  { id: 'parent-no-sideline', title: 'No sideline coaching',          sub: 'Zero coaching from the sideline — 3 matches',   target: 3, icon: '🤐', badge: 'parent-sideline' },
  { id: 'parent-car-ride',    title: 'The car ride home',             sub: 'Let them lead the conversation — 5 rides',      target: 5, icon: '🚗', badge: 'parent-carride' },
  { id: 'parent-process',     title: 'Praise the process',            sub: 'Praise effort & mindset, not stats — 7 times',  target: 7, icon: '🌱', badge: 'parent-process' },
]

// ISO-style week key, e.g. '2026-W23'. Stable Mon-Sun bucket.
export function isoWeekKey(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  const week = Math.ceil((((d - yearStart) / 86400000) + 1) / 7)
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

// Deterministic 3 challenges for the given week.
export function getActiveChallenges(date = new Date()) {
  const key = isoWeekKey(date)
  const weekNum = parseInt(key.slice(-2), 10) || 0
  const n = WEEKLY_CHALLENGE_POOL.length
  const start = (weekNum * 3) % n
  return [0, 1, 2].map(i => WEEKLY_CHALLENGE_POOL[(start + i) % n])
}

// Daily quests — refresh at midnight
export const DAILY_QUESTS = [
  {
    id: 'quest-action-2',
    icon: 'A',
    title: 'Log 2 action steps',
    sub: 'After practice or game',
    xp: 100,
    progress: 1,
    target: 2,
  },
  {
    id: 'quest-ball',
    icon: 'B',
    title: 'Complete ball mastery',
    sub: 'Any 3 skills',
    xp: 60,
    progress: 3,
    target: 3,  // completed
  },
  {
    id: 'quest-coach',
    icon: 'V',
    title: 'Ask Coach V a question',
    sub: 'Mindset, prep, or technique',
    xp: 40,
    progress: 0,
    target: 1,
  },
  {
    id: 'quest-voice',
    icon: 'J',
    title: 'Record a voice journal',
    sub: '30-second mindset reflection',
    xp: 60,
    progress: 0,
    target: 1,
  },
]

// Badges — earned + locked
export const BADGES = [
  // Earned
  { id: 'first-pr',         name: 'First PR',         tier: 'Bronze', earned: true,  date: '2025-09-12', icon: '◆', desc: 'Set your first personal record.' },
  { id: 'week-streak',      name: '7-Day Streak',     tier: 'Bronze', earned: true,  date: '2025-08-19', icon: '◆', desc: 'Log every day for a week.' },
  { id: 'month-streak',     name: '30-Day Streak',    tier: 'Silver', earned: true,  date: '2025-11-04', icon: '◆◆', desc: 'A full month, no missed days.' },
  { id: 'shark-mentality',  name: 'Shark Mentality',  tier: 'Silver', earned: true,  date: '2026-01-22', icon: '🦈', desc: 'Use Shark Mentality 20 times.' },
  { id: 'triple-crown',     name: 'Triple Crown Week',tier: 'Gold',   earned: true,  date: '2026-03-08', icon: '◆◆◆', desc: 'Action steps + workouts + check-in, every day for a week.' },
  { id: 'voice-of-coach',   name: 'Voice of the Coach', tier: 'Silver', earned: true, date: '2026-02-14', icon: '◊', desc: 'Listen to 25 Coach V voice messages.' },
  { id: 'video-uploader',   name: 'Form Critic',      tier: 'Bronze', earned: true,  date: '2025-12-01', icon: '⊡', desc: 'Submit 5 form-check videos.' },
  { id: 'mental-rep-50',    name: 'Mental Rep · 50',  tier: 'Silver', earned: true,  date: '2026-02-27', icon: '◊◊', desc: 'Complete 50 mental reps.' },

  // Locked
  { id: 'century',          name: 'Century',          tier: 'Gold',   earned: false, icon: '◆◆◆', desc: 'Log 100 consecutive days.' },
  { id: 'pr-streak',        name: 'PR Streak',        tier: 'Gold',   earned: false, icon: '★',    desc: 'Set a PR three weeks in a row.' },
  { id: 'mvp-week',         name: 'MVP Week',         tier: 'Gold',   earned: false, icon: '★',    desc: 'Top of your squad leaderboard for a full week.' },
  { id: 'elite-mind',       name: 'Elite Mind',       tier: 'Elite',  earned: false, icon: '✦',    desc: 'Reach mental performance score of 95+.' },
  { id: 'iron-streak',      name: 'Iron Streak',      tier: 'Elite',  earned: false, icon: '✦',    desc: 'A full year, no missed days.' },
  { id: 'community-leader', name: 'Community Leader', tier: 'Gold',   earned: false, icon: '★',    desc: 'Post 25 wins or insights to the community.' },

  // Weekly-challenge badges
  { id: 'challenge-pregame',    name: 'Routine Locked',    tier: 'Silver', earned: false, icon: '🎬', desc: 'Completed the pre-game routine challenge.' },
  { id: 'challenge-goldfish',   name: 'Short Memory',      tier: 'Silver', earned: false, icon: '🐠', desc: 'Completed the goldfish-reset challenge.' },
  { id: 'challenge-leadership', name: 'Standard Setter',   tier: 'Silver', earned: false, icon: '⭐', desc: 'Completed the leadership body-language challenge.' },
  { id: 'challenge-demand',     name: 'Ball Hunter',       tier: 'Gold',   earned: false, icon: '🦈', desc: 'Completed the demand-the-ball challenge.' },
  { id: 'challenge-selftalk',   name: 'Inner Voice',       tier: 'Silver', earned: false, icon: '💬', desc: 'Completed the positive self-talk challenge.' },
  { id: 'challenge-visualize',  name: 'Mind Rehearsed',    tier: 'Silver', earned: false, icon: '🧠', desc: 'Completed the visualization challenge.' },
  { id: 'challenge-tuneout',    name: 'Noise Filter',      tier: 'Silver', earned: false, icon: '🔇', desc: 'Completed the tune-out challenge.' },
  { id: 'challenge-breath',     name: 'Steady Hand',       tier: 'Silver', earned: false, icon: '🌬', desc: 'Completed the box-breath challenge.' },
]

// Squad
export const SQUAD = {
  id: 'squad-shark',
  name: 'Shark Pod',
  emblem: 'S',
  rank: 4,
  totalSquads: 84,
  weeklyXp: 12480,
  members: [
    { name: 'You',           avatar: 'M', xp: 3240, rank: 1, you: true },
    { name: 'Diego Alvarado', avatar: 'D', xp: 2860, rank: 2 },
    { name: 'Liam Ross',      avatar: 'L', xp: 2410, rank: 3 },
    { name: 'Carter Voss',    avatar: 'C', xp: 2070, rank: 4 },
    { name: 'Will Kapoor',    avatar: 'W', xp: 1900, rank: 5 },
  ],
}

// Season — 8-week competitive cycle
export const SEASON = {
  number: 4,
  name: 'Season IV · Spring',
  weeksTotal: 8,
  weeksElapsed: 5,
  startDate: '2026-04-13',
  endDate:   '2026-06-08',
  globalRank: 142,
  totalAthletes: 1240,
  rewards: [
    { tier: 'Captain (Top 25%)', cosmetic: 'Charcoal monogram + season ribbon', unlocked: true },
    { tier: 'MVP (Top 10%)',    cosmetic: 'White-on-white avatar border',       unlocked: false, progress: 0.74 },
    { tier: 'Elite (Top 1%)',   cosmetic: 'Animated ember-ring border + custom title', unlocked: false, progress: 0.41 },
  ],
}

// Skill tree — visual progression
export const SKILL_TREE = [
  { id: 'action-steps',      name: 'Action Steps',      unlocked: true,  level: 5, maxLevel: 5, branch: 'mental',  unlockAt: 1 },
  { id: 'shark-mentality',   name: 'Shark Mentality',   unlocked: true,  level: 4, maxLevel: 5, branch: 'mental',  unlockAt: 1 },
  { id: 'visualization',     name: 'Visualization',     unlocked: true,  level: 3, maxLevel: 5, branch: 'mental',  unlockAt: 5 },
  { id: 'advanced-breathe',  name: 'Box Breathing',     unlocked: true,  level: 2, maxLevel: 5, branch: 'mental',  unlockAt: 8 },
  { id: 'pre-game-routine',  name: 'Pre-Game Routine',  unlocked: false, level: 0, maxLevel: 5, branch: 'mental',  unlockAt: 18 },

  { id: 'ball-mastery',      name: 'Ball Mastery',      unlocked: true,  level: 4, maxLevel: 5, branch: 'physical', unlockAt: 1 },
  { id: 'speed-work',        name: 'Speed Work',        unlocked: true,  level: 3, maxLevel: 5, branch: 'physical', unlockAt: 3 },
  { id: 'strength',          name: 'Strength Block',    unlocked: true,  level: 2, maxLevel: 5, branch: 'physical', unlockAt: 8 },
  { id: 'plyometrics',       name: 'Plyometrics',       unlocked: false, level: 0, maxLevel: 5, branch: 'physical', unlockAt: 18 },

  { id: 'community',         name: 'Community',         unlocked: true,  level: 3, maxLevel: 5, branch: 'social',   unlockAt: 1 },
  { id: 'squad-captain',     name: 'Squad Captain',     unlocked: false, level: 0, maxLevel: 5, branch: 'social',   unlockAt: 18 },
]

// Voice journal — mock past entries + the "AI analysis" template for fresh ones
export const JOURNAL_HISTORY = [
  {
    id: 'j1',
    date: '2026-05-17',
    time: '7:48 PM',
    duration: '0:42',
    title: 'Post-game · vs Manatee FC',
    transcript: "Felt sluggish in the first 20. Coach pulled me off the wing. Got my touch back after the water break and assisted on the third. Frustrated at the start but proud of the bounce-back.",
    cues:    ['Goldfish Mentality', 'Bounce-back', 'Tune-out'],
    sentiment: 'recovering',
    aiNote: "You named the slow start and the recovery — that's the Goldfish loop working. Next match, try the Shark cue *before* kickoff so you don't have to bounce back from cold.",
  },
  {
    id: 'j2',
    date: '2026-05-15',
    time: '6:12 AM',
    duration: '0:28',
    title: 'Pre-practice intent',
    transcript: "Today I want to lock in on first touch. Three drills, then conditioning. Stay sharp on the small details.",
    cues: ['Intent', 'First touch'],
    sentiment: 'locked-in',
    aiNote: 'Clear, specific intent. Re-read this after practice to score yourself against it.',
  },
]
