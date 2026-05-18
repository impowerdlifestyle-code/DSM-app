# DSM — Vercel Deploy Checklist

Repo: `impowerdlifestyle-code/DSM-app`
Source root inside repo: `dsm-app/dsm-app-2`

## 1. Apply migrations (Supabase SQL Editor)

Run in order, each from the repo root:

1. `supabase-full-migration.sql` — base + Coach V tables (already applied ✓)
2. `supabase-phase2-3-migration.sql` — gamification + fitness data + Storage bucket
   - On clipboard right now. Paste in Supabase SQL editor → Run.

After migration #2 succeeds, also confirm in **Storage**:
- Bucket `progress-photos` exists (private). The migration creates it idempotently.

## 2. Import project on Vercel

Open: <https://vercel.com/new/import?s=https%3A%2F%2Fgithub.com%2Fimpowerdlifestyle-code%2FDSM-app>

| Setting | Value |
| --- | --- |
| **Root Directory** | `dsm-app/dsm-app-2` *(must override — repo is nested two folders deep)* |
| **Framework Preset** | Vite *(auto-detected)* |
| **Build Command** | `npm run build` *(default)* |
| **Output Directory** | `dist` *(default)* |
| **Install Command** | `npm install` *(default)* |

## 3. Environment variables

Add these in **Settings → Environment Variables** (all envs: Production, Preview, Development):

| Name | Source / Value |
| --- | --- |
| `ANTHROPIC_API_KEY` | Server-side, **no** `VITE_` prefix. Use the same key from `.env.local`'s `VITE_ANTHROPIC_API_KEY`. |
| `VITE_SUPABASE_URL` | `https://pmpeftibdgcfxofdrtry.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | The `eyJ…` JWT from `.env.local`. |

Do **not** set `VITE_ANTHROPIC_API_KEY` in production — it would ship the key to every browser. The Vercel function `api/coach.js` reads the un-prefixed `ANTHROPIC_API_KEY` server-side.

## 4. Deploy

Click **Deploy**. First build takes ~90s. The serverless function `api/coach.js` is auto-detected; no extra config needed (vercel.json already in repo).

## 5. Post-deploy sanity check

1. Sign in with the same Supabase account you used locally.
2. Tap **Coach** in bottom nav → send a message. Should respond via real Claude.
3. Tap **Train** → log a body measurement, finish a workout, log a food. Refresh the page — data persists.
4. Tap **Player** → XP total reflects everything you logged (50/action, 40/ball mastery, 100/workout, 60/voice journal, 200/weekly check-in).

## 6. Rotate the Anthropic key

The key was pasted in chat history during development. After deploy works, generate a fresh one at <https://console.anthropic.com/settings/keys>, replace it in both Vercel env vars **and** `.env.local`, then revoke the old key.
