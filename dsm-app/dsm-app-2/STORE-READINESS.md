# DSM — App Store / Play Store Readiness Punch List

**Status:** web app shipped. PWA install works today. Native store submission is a 5-10 day project — this doc is the punch list to get there.

**Estimated total cost:** $124 in fees + ~30-40 hours of work split across legal, design, and engineering.

---

## Stage 1 — Foundation (today, free) ✅

What's already done as of 2026-05-21:

- [x] `public/manifest.json` — name, short_name, theme, icons, categories
- [x] `index.html` — Apple touch icons, status bar style, theme-color, viewport-fit cover for notch
- [x] `public/sw.js` — minimal service worker registered in main.jsx (PWA install gate)
- [x] Responsive — works at 375px through 1440px+ (mobile-first design)
- [x] Bug reporter — Valentino can flag issues without leaving the app
- [x] HTTPS — Vercel serves the entire app over TLS

**What this gets you:** Athletes can **"Add to Home Screen"** from iOS Safari today, and Chrome Android shows an "Install app" prompt. Looks/feels ~80% native. **No store approval required.**

To test now: open `https://dsm-app-2.vercel.app` on iPhone Safari → tap share button → "Add to Home Screen". The icon shows up on the home screen, taps open the app full-screen with no Safari chrome.

---

## Stage 2 — Native wrappers (1-2 days, free)

To submit to either store, the web app needs a native shell.

**Recommended: Capacitor** (not React Native). Keep all your React code; Capacitor wraps it in a real iOS + Android app with one config per platform.

```bash
npm install @capacitor/core @capacitor/cli
npx cap init "DSM" "com.dilorenzosoccermindset.dsm" --web-dir=dist
npm install @capacitor/ios @capacitor/android
npx cap add ios
npx cap add android
# After every web build:
npm run build && npx cap sync
```

**iOS specifics:**
- [ ] Need a Mac with Xcode 15+ (you have one)
- [ ] iOS deployment target: 15.0+ (covers ~98% of iPhones)
- [ ] `Info.plist` permissions for: Microphone (voice journal — already used), Camera (form-check videos future), Notifications
- [ ] Splash screen (Capacitor handles, but needs assets)

**Android specifics:**
- [ ] `android/app/build.gradle` minSdk 24 (Android 7+), targetSdk 34 (Play Store requirement May 2024+)
- [ ] App icon adaptive — split into foreground/background layers
- [ ] Permissions: `RECORD_AUDIO`, `POST_NOTIFICATIONS`

**Capacitor plugins to install:**
- [ ] `@capacitor/push-notifications` — for the engagement loop (instead of email-only)
- [ ] `@capacitor/share` — native share sheet for parent invite codes
- [ ] `@capacitor/haptics` — vibration feedback on match-day breath timer + key actions
- [ ] `@capacitor/status-bar` — match status bar to app theme

---

## Stage 3 — Developer accounts ($124, 2-3 days wait)

- [ ] **Apple Developer Program** — https://developer.apple.com/programs/ — $99/year. Requires Apple ID, two-factor auth. Account approval is usually instant for individuals, can take 48h for orgs.
- [ ] **Google Play Console** — https://play.google.com/console/ — $25 one-time. Requires Google account + a real-name verification (passport/license).
- [ ] **D-U-N-S number** (Apple only, if registering as a business) — https://developer.apple.com/enrollment/duns-lookup/ — free, takes 24-48h. If you register as an individual, skip this.

**Pro tip:** start the DUNS lookup TODAY. It's the slowest gate.

---

## Stage 4 — Assets (3-4 hours)

You have a logo and a soccer ball. You need:

### App icons (use a generator like https://icon.kitchen)
- [ ] iOS: 1024×1024 (master), system generates the rest from it
- [ ] Android: 512×512 master + 432×432 foreground layer for adaptive icon

**Important:** the icon needs a SAFE ZONE — logo lives in inner 80% so Android can mask it round/square/squircle without cropping. Your current `dsm-logo.png` likely fills the whole image edge-to-edge — Android will crop it.

### Splash screen
- [ ] 2732×2732 PNG, logo centered, true black background
- [ ] Capacitor auto-generates per-device sizes

### Screenshots (per store)

**Apple iOS:** 5-10 screenshots PER device class, all must show real app content
- [ ] iPhone 6.7" (1290×2796) — Pro Max sizes
- [ ] iPhone 6.5" (1242×2688) — legacy required
- [ ] iPad 13" (2048×2732) — only if shipping iPad version

**Google Play:** 2-8 screenshots, 1080×1920 minimum

Suggested screen list (8 shots cover both stores):
1. Loading screen with stamped DSM ball
2. Onboarding wizard (identity goal step)
3. Home with quests + streak
4. Match-Day pre-match (intention + breath)
5. Coach V chat
6. Locker Room overview
7. Course / video lessons
8. Parent dashboard

### Marketing copy
- [ ] App name (≤30 chars): `DSM — Soccer Mindset`
- [ ] Subtitle (≤30 chars, iOS only): `Train the mind behind the game`
- [ ] Promotional text (≤170 chars, iOS): `Action steps, match-day rituals, Coach Valentino AI, and a private Locker Room — for elite youth soccer players.`
- [ ] Description (≤4000 chars) — draft below
- [ ] Keywords (iOS, ≤100 chars): `soccer,mindset,football,training,athlete,sports,psychology,coach,youth,mental`
- [ ] Support URL: `https://dilorenzosoccermindset.com/support`
- [ ] Marketing URL: `https://dilorenzosoccermindset.com`
- [ ] Privacy policy URL: **required** — see Stage 5

---

## Stage 5 — Privacy + legal (1-2 days)

**This is the gate most apps fail on first review.** For a kids' app, it's stricter.

### Privacy policy (required by both stores)

Must disclose:
- [ ] What data you collect: email, name, age, position, identity goal, action steps, match logs, voice transcripts, chat history with Coach V
- [ ] Why: app functionality + sending the recap email
- [ ] Where it's stored: Supabase (Postgres, US region)
- [ ] Who can see it: the athlete, their linked parent (sanitized), Valentino (coach), Ciaran (admin)
- [ ] How to delete: in-app account deletion + email request
- [ ] Third-party processors: Supabase, Anthropic (Claude API), Resend (email), Vercel (hosting), Google Drive (video hosting)
- [ ] Children's data clause (COPPA/GDPR-K)

**Quickest path:** use https://www.termly.io or https://app.iubenda.com — generate, drop in URL.
Host at `https://dilorenzosoccermindset.com/privacy` (Valentino's domain).

### Terms of service
- [ ] Mostly boilerplate. Same generators work.

### COPPA compliance (CRITICAL for kids' app)

Targeted at athletes age 13-22 per current copy. If you allow under-13 signups, you trigger COPPA:
- [ ] Verifiable parental consent before any data collection from under-13
- [ ] Parental review/deletion rights
- [ ] Limit data collection to what's strictly needed

**Recommendation:** set minimum signup age to **13** in the onboarding wizard (`age` field already exists in profiles — add `>= 13` validation). Or build a parent-consent gate for under-13. **Set age min = 13 for the V1 store launch.** It dodges 90% of COPPA work and you can add the parent-gate flow in v2.

Apple's "Kids" category requires even stricter rules — DON'T submit to that category. Submit under "Sports" or "Health & Fitness".

### Account deletion (Apple requires in-app)

Apple now requires a way to delete your account from within the app (not just email request).
- [ ] Add "Delete Account" button in Profile/Settings
- [ ] Calls a Supabase function that deletes the user's auth row + cascade-deletes their profile (RLS already does this via FK cascade)
- [ ] Confirmation modal: "Type DELETE to confirm — this can't be undone"

### Data export (GDPR + Apple "data subject rights")
- [ ] User can request a JSON or CSV export of their data
- [ ] Quickest impl: reuse the PDF export I just built but make it self-serve (currently admin-only)

---

## Stage 6 — Store submission

**Apple App Store Connect:**
1. Create app record in App Store Connect
2. Upload build via Xcode "Distribute App" or `xcodebuild` + `Transporter`
3. Fill metadata + assets
4. Submit for review
5. **Review time:** 24-48h typical, can be a week if rejected

**Google Play Console:**
1. Create app in Play Console
2. Internal Testing track first (lets you side-load with testers before public)
3. Upload signed `.aab` (Android App Bundle) via `bundletool` or Gradle
4. Fill content rating questionnaire honestly (this drives age rating)
5. Submit to Production track
6. **Review time:** hours to 1 day

---

## Stage 7 — Pre-empting rejection (read before submitting)

Common rejection reasons and how to dodge them:

### Apple Review Guideline 4.2 — Minimum Functionality
**Rejection:** "Your app appears to be primarily a web wrapper."
**Fix:** Use Capacitor (not just WKWebView wrapping the live URL). Build offline-capable — service worker already there. Add native gestures: haptics on button press, swipe gestures (already have edge-swipe-back).

### Apple Guideline 5.1.1 — Privacy
**Rejection:** "No in-app data deletion / privacy policy doesn't match data collected."
**Fix:** Stage 5 above.

### Apple Guideline 1.1.6 — Inaccurate Metadata
**Rejection:** "Screenshots show features not in app."
**Fix:** Screenshot the actual app, no marketing comps.

### Apple Guideline 5.1.2 — Permission Strings
**Rejection:** "Microphone permission usage description not clear."
**Fix:** `NSMicrophoneUsageDescription = "DSM uses the microphone for voice journal entries — your spoken reflections are transcribed for Coach V to analyze."`

### Google Play — Designed for Families
**Rejection:** Auto-rejection if you mark as kids' app but third-party SDKs aren't certified
**Fix:** Don't mark as kids' app. Target audience: "13+".

### Google Play — Sensitive Permissions
**Rejection:** Microphone or SMS without justification
**Fix:** Justify in submission notes: voice journal feature.

### Both stores — App must work without sign-in for review
**Rejection:** Reviewer can't test the app because it requires a real Supabase account.
**Fix:** Create a "demo account" in Supabase with seeded data. Document login in App Store Connect's "App Review Information" → "Sign-In Info":
```
Email: reviewer@dsm-demo.com
Password: ReviewerAccess2026
```
The reviewer signs in with that. After acceptance, you can delete it.

---

## Suggested Order of Operations

Two-week sprint to get both apps live:

### Week 1
- **Day 1:** DUNS lookup started + Apple/Google account signups (kicks off the slowest external waits)
- **Day 1:** Pick a privacy policy generator, draft + host at dilorenzosoccermindset.com/privacy
- **Day 1:** Add age-min validation (13+) to onboarding
- **Day 2:** Add in-app account deletion button + Supabase delete RPC
- **Day 3-4:** Capacitor install + iOS build first run on Xcode simulator
- **Day 4-5:** Generate proper icons (icon.kitchen) + capture real-app screenshots

### Week 2
- **Day 6:** Android build + emulator test
- **Day 7:** Capacitor plugins wired (haptics, share, push)
- **Day 8:** Demo account seeded; first TestFlight build uploaded to Apple
- **Day 9:** Submit to Apple review + Google Play Internal Testing
- **Day 10:** Apple feedback (usually arrives by here); iterate
- **Day 11-12:** Resubmit if rejected; Google Play production push
- **Day 13-14:** Both apps live

---

## What to skip in V1

- Push notifications — email recap is enough for v1, add push in v1.1
- In-app purchases / subscriptions — current paywall is external (Fanbasis); keep that until you need recurring billing
- iPad-specific layouts — phone-only launch is fine
- Watch app, widgets, App Clips
- Localization beyond English

---

## Costs summary

| Item | Cost | Recurring? |
|---|---|---|
| Apple Developer Program | $99 | yearly |
| Google Play Console | $25 | one-time |
| Privacy policy generator (Termly) | $0–$15/mo | optional, free tier works |
| Icon generator (icon.kitchen) | $0 | one-time |
| Screenshot capture (real devices or simulators) | $0 | one-time |
| **TOTAL year 1** | **~$130** | |

---

## Open questions for Valentino

Before you submit, get answers:
1. Does he own `dilorenzosoccermindset.com`? (privacy policy needs to live there)
2. Bundle ID — `com.dilorenzosoccermindset.dsm`?
3. Does he have an Apple Developer account or do you register under yours? (matters for legal ownership)
4. Pricing — free with paywall (current) or $X.99 paid up front?
5. In-app purchase / subscription path needed for v1 or stay on Fanbasis?
