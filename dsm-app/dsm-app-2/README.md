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

## Future Self Voice

Each athlete records a 60-second voice sample once. ElevenLabs clones it. Coach V then plays short messages back to them in **their own voice** — before a match, after a mistake, and once a month for an identity check-in.

### Setup
1. Run `supabase-future-self-migration.sql` in the Supabase SQL Editor. Creates `voice_identity`, `future_self_clips`, `future_self_checkins`, `voice_audit_log`, and the private `future-self-audio` storage bucket with path-prefixed RLS.
2. Confirm `ELEVENLABS_API_KEY` and `ANTHROPIC_API_KEY` are set in Vercel (server-side).
3. Get an ElevenLabs account on **Creator tier or higher** — Instant Voice Cloning is gated behind it.

### Surfaces
- `src/features/future-self/ConsentFlow.jsx` — 3-slide consent gate (minors blocked, 13+ self-consent)
- `src/features/future-self/VoiceCapture.jsx` — 60s capture + clone (Step 5, in progress)
- `src/features/future-self/FutureSelfPlayer.jsx` — generates + plays clips, used at three integration points (HomeView, MatchDayTab, VoiceJournal)
- `src/features/future-self/MonthlyCheckin.jsx` — monthly home-view ritual
- `src/features/future-self/Settings.jsx` — clip list, deletion controls, audit trail (PlayerTab → Voice sub-tab)

### Server endpoints (all under `api/future-self/`)
- `generate-clip.js` — Claude script → ElevenLabs TTS → storage → DB
- `clone-voice.js` — Instant Voice Cloning intake (Step 5)
- `save-checkin.js` — monthly check-in with AI reflection on identity-vs-behavior gap
- `delete-clip.js` — per-clip delete with storage cleanup + audit
- `delete-voice.js` — full wipe (ElevenLabs DELETE + all clips + all storage + soft-delete identity)

### Privacy & consent
- Under 13: parent must consent on parent shell first; athlete is hard-blocked otherwise.
- 13+: explicit checkbox consent before any capture.
- Voice is used only in the athlete's own account — never shared, never used to train models.
- Every clone / generation / playback / deletion writes a row to `voice_audit_log` (append-only by RLS).
- Athlete or linked parent can wipe the entire voice identity from PlayerTab → Voice. Deletion calls ElevenLabs `DELETE /v1/voices/{id}`, removes every clip and storage object, and soft-deletes the identity row.

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
