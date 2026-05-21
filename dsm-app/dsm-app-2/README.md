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
Copy `.env.example` to `.env` and fill in your keys.

**Client-side (Vite — shipped to browser):**
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
# Dev only — direct browser→Anthropic, skip when running `vercel dev`
VITE_ANTHROPIC_API_KEY=
```

**Server-side only (Vercel functions — never expose to client):**
```
ANTHROPIC_API_KEY=
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=        # default Coach V voice
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=  # bypasses RLS for cron + future-self APIs
RESEND_API_KEY=             # weekly recap email
RECAP_FROM_EMAIL=           # e.g. "Coach Valentino <coach@voreli.ai>"
CRON_SECRET=                # checked against Authorization for the recap cron
```

Set the server-side keys in **Vercel → Settings → Environment Variables**, not in `.env`. The TTS proxy (`/api/tts`), Coach V (`/api/coach`), and Future Self pipeline all read them server-side.

### 4. Run locally
```bash
npm run dev        # client only — Coach V uses the dev-fallback key
npm run dev:vercel # full stack: serverless functions + client
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

## Coach V Voice Messages

Coach Valentino's actual voice — cloned once via ElevenLabs — speaking personalized 15-30s messages to each athlete. Surfaces in three places: before a match, after a frustrated/anxious voice journal entry, and once a month for a check-in.

### Setup (one-time admin)
1. Run `supabase-future-self-migration.sql` in the Supabase SQL Editor. Creates `future_self_clips`, `future_self_checkins`, `voice_audit_log`, and the private `future-self-audio` storage bucket with path-prefixed RLS. (`voice_identity` is also created but currently unused — kept for forward-compat.)
2. ElevenLabs: account on **Creator tier or higher**, then clone Valentino's voice in the dashboard from a 60s recording. Copy the resulting voice ID.
3. Vercel → Settings → Environment Variables:
   - `ELEVENLABS_API_KEY` — server-side key
   - `ELEVENLABS_VOICE_ID` — Valentino's cloned voice ID from step 2
   - `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — already required by Coach V chat
4. Redeploy.

### Surfaces
- `src/features/future-self/FutureSelfPlayer.jsx` — generates + plays a clip on demand. Wired into `MatchDayTab` (pre-match) and `VoiceJournal` (post-mistake autoGenerate when sentiment ∈ {frustrated, anxious, flat}).
- `src/features/future-self/MonthlyCheckin.jsx` — once-per-month ritual; Coach V poses a question, kid responds via SpeechRecognition, Claude reflects on the gap between their identity goal and recent behavior.
- `src/features/future-self/Settings.jsx` — clip list + per-clip play/delete + audit trail (PlayerTab → Voice sub-tab).

### Server endpoints (all under `api/future-self/`)
- `generate-clip.js` — athlete digest → Claude script (Coach V persona) → ElevenLabs TTS using `ELEVENLABS_VOICE_ID` → storage → DB row → signed URL
- `save-checkin.js` — monthly check-in: row insert → 30-day behavior digest → Claude AI reflection → XP award → audit
- `delete-clip.js` — single-clip delete with storage cleanup + audit

### Privacy
- Only Coach V's voice is cloned, once, by you. Athletes never record their own voice for cloning.
- Personalized scripts are generated from each athlete's own data (action steps, matches, voice journal, themes). That data stays in their account.
- Athletes can delete any clip from PlayerTab → Voice.
- Every clip generation / playback / deletion writes to `voice_audit_log` (append-only by RLS, self / linked parent / coach can read).
- If `ELEVENLABS_VOICE_ID` is unset, every player surface returns `voice_not_configured` and shows a clean "admin task pending" gate.

---

## Testing
```bash
npm test           # vitest
npm test -- --run  # one-shot, no watch
```

Current suite: `src/features/future-self/__tests__/script-prompt.test.js` — exercises the pure prompt builder across every context (pre_match, post_mistake, monthly_check, onboarding, custom).

---

## Tech Stack
- **Frontend**: React + Vite
- **Database**: Supabase (PostgreSQL) + private Storage buckets
- **Auth**: Supabase Auth
- **AI**: Claude API (Anthropic) via server-side Vercel functions
- **Voice**: ElevenLabs TTS + Instant Voice Cloning, proxied through `/api/tts` and `/api/future-self/*`
- **Email**: Resend (weekly recap cron)
- **Hosting**: Vercel
