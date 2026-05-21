# DSM App — Demo & Handoff (Valentino)

**Live URL:** https://dsm-app-2.vercel.app

A 30-minute walkthrough. Try every step yourself, then text Ciaran what felt off, what surprised you, and what you wish was different. The app is built — this is the polish pass before you hand it to your first 2-3 pilot athletes.

---

## Part 1 — Sign up as an athlete (10 min)

Sign up first like an athlete would. You'll feel the experience your players get.

1. Open https://dsm-app-2.vercel.app
2. Tap **Join** → enter your name, email, password → **Create account**
3. Confirm the email Supabase sends you
4. Sign in
5. **Onboarding wizard fires automatically** (6 steps):
   - Step 1: Identity goal — finish "I am the player who…"
   - Step 2: Position + age (+ optional club)
   - Step 3: 5 baseline questions, 1-10 each (shark / goldfish / self-talk / tune-out / confidence)
   - Step 4: Top 3 obstacles
   - Step 5: Match cadence
   - Step 6: **Generate my plan** → Claude writes you a 4-week starter focus → **Lock it in**
6. Land on Home — greeting, today's tasks, mindset quote

**Test the athlete daily-use loop:**
- **Home** → tap "Action Steps" → log a session (Yes/No on the 5 mental tools)
- **Train → Match** → tap "Pre-Match Lock-In" → fill in mood/intention/cue → start 4-7-8 breath timer → Lock it in → tap "Final whistle → log it" → fill result + cues used + wins + fixes → Save
- **Coach** tab → ask "How did my last match go?" — Coach V should reference the opponent + score + what you wrote
- **Profile** (tap logo top-left) → Family → Generate parent invite code

**What to flag back:**
- Anything that felt slow, broken, or off-brand
- Coach V responses — does that sound like *you*? Save the URL of any chat that felt wrong.
- Onboarding copy — is the identity question clear? Are the obstacles the right list?
- The 4-week starter focus Claude generated — is it real coaching or generic?

---

## Part 2 — God mode (10 min)

When you're done with athlete testing, text Ciaran. He'll flip your account to coach + admin. Refresh the app and you'll see:

- **Admin** tab in the bottom nav → cross-athlete dashboard (athletes / paid / active 7d / total XP)
- Search any athlete + sort by XP / streak / activity
- Tap any athlete → **Locker Room** view: every action step, ball mastery log, voice journal, chat with Coach V, body stats, badges, squads, and your **private coach notes** (RLS-locked to you)
- Coach memory themes per athlete (mindset / technique / recovery / goals) — **editable**. You can rewrite what Coach V believes about an athlete and the next chat picks it up.

**Test the coach loop:**
- Click into your own athlete profile (you'll see yourself in the list)
- Look at the data you logged in Part 1
- Edit the coach memory themes
- Add a private note about the athlete

---

## Part 3 — Parent dashboard (5 min, optional)

From your athlete account (use a different browser / incognito):
1. Profile → Family → Generate code
2. Sign out
3. Auth → **Parent** tab → use a *different email* + paste the code
4. Land in the parent shell — they see streak, identity, last check-in, 5 matches, coach themes
5. They never see chat history. Enforced server-side.

---

## Known limitations (deferred to next session)

- **Weekly recap emails:** code is shipped + cron is scheduled, but the Resend API key needs rotation (a separate fix Ciaran is doing). First real Monday cron will fire May 25.
- **Email sender:** currently `coach@voreli.ai`. Will swap to `valentino@dilorenzosoccermindset.com` once that domain is verified in Resend (Ciaran needs your DNS access to add records).
- **Mobile audit:** tested in browser on Mac. Phone-specific QA pending — please open the URL on your iPhone Safari and tap through Part 1 with phone-eyes.
- **Push notifications:** not built. Engagement loop is email-only for now.
- **Squads:** create/join works, but the leaderboard ranking math has not had a real-data test yet.

---

## What's *fully* working right now

| | feature |
|---|---|
| ✅ | Auth (sign in / sign up / parent mode / forgot password) |
| ✅ | 6-step onboarding wizard with Claude-generated plan |
| ✅ | Action steps log with 5 mental tools |
| ✅ | Match-Day pre/sideline/post flow with breath timer |
| ✅ | Coach V chat (Claude Sonnet 4.6) with athlete state + match context |
| ✅ | Voice journal → Claude extracts action steps |
| ✅ | Habit tracker + streak |
| ✅ | Workouts / Ball mastery / Body stats logs |
| ✅ | Weekly check-in |
| ✅ | Squads (create + join + leaderboard) |
| ✅ | Coach memory themes (editable per athlete) |
| ✅ | Admin dashboard with full athlete drilldown + private notes |
| ✅ | Parent dashboard with invite codes (RLS-locked to safe columns) |
| ✅ | Weekly recap card on Home (lights up when first recap arrives) |
| ✅ | 3D soccer ball loading screen with your name on it |

---

## How to send feedback

Just text Ciaran. Screenshots > prose. Tell him:
- **The exact URL** where it broke
- **What you tapped**
- **What you expected** vs. what happened
- For Coach V issues — paste the chat (or screenshot it)

Anything that affects the demo we'll fix tomorrow. Anything cosmetic gets queued for the polish pass.

When you're ready for pilot athletes (2-3 of your most invested kids first), Ciaran will hand them a sign-up link and you walk them through the same Part 1 above.
