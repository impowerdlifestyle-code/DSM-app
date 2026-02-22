# DSM — DiLorenzo Soccer Mindset App

A full-stack web app for the DiLorenzo Soccer Mindset program. Built with React + Vite, Supabase database, and deployed on Vercel.

## Features
- 🔐 Auth (login/signup via Supabase)
- ✅ Action Steps form (Shark, Goldfish, Self Talk, Tune Out) — saved to Supabase
- 📊 Weekly habit tracker — synced to database
- 🔥 Day streak tracking
- 🤖 Coach V AI bot — powered by Claude AI with ElevenLabs voice clone
- 👨‍👩‍👧 Parent best practices guide
- 🎥 Course links (ClientClub + Google Docs)
- 🏆 Coach dashboard — view all athletes, submissions, grant access
- 🔒 Elite program paywall (unlocks after 3 months)

---

## Setup Instructions

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/dsm-app.git
cd dsm-app
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and open your project
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase-schema.sql` and run it
4. That creates all tables, triggers, and security policies

### 3. Set environment variables
Copy `.env.example` to `.env` and fill in your keys:
```
VITE_SUPABASE_URL=https://pmpeftibdgcfxofdrtry.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ELEVENLABS_API_KEY=your_elevenlabs_key
VITE_ELEVENLABS_VOICE_ID=your_voice_id
```

### 4. Run locally
```bash
npm run dev
```

---

## Deploy to Vercel

### Option A — GitHub + Vercel (recommended)
1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → Import from GitHub
3. Add your environment variables in Vercel project settings
4. Click **Deploy** — done! 🚀

### Option B — Vercel CLI
```bash
npm install -g vercel
vercel
```

---

## Make yourself a Coach
After signing up, go to Supabase → Table Editor → profiles → find your row → change `role` to `coach`. You'll then see the Coach Dashboard tab in the app.

## Grant athlete access
From the Coach Dashboard, click any athlete and tap the access level buttons:
- **trial** — default, limited access
- **mentoring** — 3 months free (your mentoring program athletes)
- **paid** — full access (standalone subscribers)
- **locked** — payment lapsed, app locked

---

## Tech Stack
- **Frontend**: React + Vite
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **AI**: Claude API (Anthropic)
- **Voice**: ElevenLabs (your cloned voice)
- **Hosting**: Vercel
