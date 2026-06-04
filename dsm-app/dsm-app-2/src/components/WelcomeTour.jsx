/**
 * WelcomeTour — 7-step first-time walkthrough.
 *
 * Fires automatically when:
 *   - profile.onboarded_at is set (athlete just finished the wizard)
 *   - dsm_tour_seen_v1 isn't in localStorage
 *
 * Lightweight modal — text + glyph + Next/Back/Skip. Final step jumps the
 * athlete into the app with an inline tip about the 🐛 bug button.
 *
 * Manually re-openable later from More → Tips (BadgeHints).
 */
import { useEffect, useState } from 'react'
import { tokens as t, C } from '../styles.js'

const FLAG_KEY = 'dsm_tour_seen_v1'

const STEPS = [
  {
    glyph: '🦈',
    eyebrow: 'Welcome to DSM',
    title: 'You locked in. Now we run.',
    body: "You just told Coach V who you are. Here's the 60-second tour of how DSM helps you live it every day.",
  },
  {
    glyph: 'A',
    eyebrow: 'Daily wins',
    title: 'Stack your reps',
    body: 'Home shows today\'s tasks: Action Steps after every session, Ball Mastery any time, Weekly Check-in Sundays. Hit them = XP + day streak. Streak is everything.',
  },
  {
    glyph: '⚽',
    eyebrow: 'Match-Day mode',
    title: 'Before, during, after',
    body: 'Train → Match. Pre-match: mood + intention + 4-7-8 breath. Sideline: your cue card. Post: log result + what fired. Coach V reads every match.',
  },
  {
    glyph: 'V',
    eyebrow: 'Coach V',
    title: 'Real coach, in your pocket',
    body: "Tap Coach. Ask anything — match nerves, slump spirals, mistake replays. He remembers you across every chat. The more you talk, the sharper he gets.",
  },
  {
    glyph: '🔒',
    eyebrow: 'Locker Room',
    title: 'Your private record',
    body: 'Top-right "Locker" button. Everything you\'ve logged, plus Coach V\'s read on you (mindset, technique, recovery, goals). You can edit what he believes.',
  },
  {
    glyph: '👤',
    eyebrow: 'Profile + Family',
    title: 'Invite a parent when ready',
    body: 'Tap your logo (top-left) → Family → generate a 6-character invite code. Parents see your streak + recent matches. They never see your Coach V chats.',
  },
  {
    glyph: '🐛',
    eyebrow: 'Something feels off?',
    title: 'Tap the bug button',
    body: 'See the bug icon bottom-right? Tap it any time something looks broken or weird. Coach Ciaran gets it instantly + Claude AI helps fix it fast.',
  },
]

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.94)',
    backdropFilter: 'blur(14px)',
    zIndex: 550,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px 16px',
  },
  shell: {
    width: '100%', maxWidth: 420,
    background: t.color.surface,
    border: `1px solid ${t.color.line2}`,
    borderRadius: t.radius.xl,
    padding: 24,
    boxShadow: t.shadow.raised,
    display: 'flex', flexDirection: 'column',
  },
  topRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
  step: {
    fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
    fontWeight: 600, textTransform: 'uppercase',
  },
  skip: {
    background: 'transparent', border: 'none',
    color: t.color.textDim, fontSize: 10, letterSpacing: 1.6, fontWeight: 600,
    textTransform: 'uppercase', cursor: 'pointer', padding: 4,
    fontFamily: t.font.sans,
  },
  glyph: {
    fontFamily: t.font.athletic, fontSize: 80, lineHeight: 1,
    textAlign: 'center', marginBottom: 14, letterSpacing: 1,
    color: t.color.text,
    textShadow: '0 0 18px rgba(var(--dsm-glow-rgb),0.55), 0 0 36px rgba(var(--dsm-glow-rgb),0.3)',
    animation: 'dsmGlow 3.2s ease-in-out infinite',
  },
  eyebrow: {
    fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
    fontWeight: 600, textTransform: 'uppercase', textAlign: 'center', marginBottom: 6,
  },
  title: {
    fontFamily: t.font.athletic, fontSize: 32, lineHeight: 1.05, letterSpacing: 1,
    textTransform: 'uppercase', color: t.color.text, textAlign: 'center', marginBottom: 12,
  },
  body: {
    fontSize: 14, color: t.color.text, lineHeight: 1.55,
    textAlign: 'center', marginBottom: 22, opacity: 0.88,
  },
  dots: { display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 18 },
  dot: (on) => ({
    width: on ? 22 : 6, height: 6, borderRadius: 999,
    background: on ? t.color.text : t.color.line2,
    transition: 'all 200ms ease',
  }),
  nav: { display: 'flex', gap: 8 },
  back: {
    flex: 1, background: 'transparent',
    border: `1px solid ${t.color.line2}`,
    color: t.color.textDim, borderRadius: t.radius.md, padding: '14px 20px',
    fontSize: 12, fontWeight: 600, letterSpacing: 1.2, cursor: 'pointer',
    textTransform: 'uppercase', fontFamily: t.font.sans,
  },
  next: {
    flex: 2, background: t.color.text, color: t.color.bg,
    border: 'none', borderRadius: t.radius.md, padding: '14px 20px',
    fontSize: 13, fontWeight: 700, letterSpacing: 1.4, cursor: 'pointer',
    textTransform: 'uppercase', fontFamily: t.font.sans,
  },
}

export default function WelcomeTour({ open, onClose }) {
  const [idx, setIdx] = useState(0)
  useEffect(() => { if (open) setIdx(0) }, [open])
  if (!open) return null

  const step = STEPS[idx]
  const isLast = idx === STEPS.length - 1
  const isFirst = idx === 0

  function finish() {
    try { localStorage.setItem(FLAG_KEY, '1') } catch {}
    onClose?.()
  }

  return (
    <div style={s.overlay}>
      <div style={s.shell}>
        <div style={s.topRow}>
          <div style={s.step}>{idx + 1} of {STEPS.length}</div>
          <button style={{ ...C.bghost, width: 'auto', marginBottom: 0, padding: 4, fontSize: 10 }} onClick={finish}>Skip tour</button>
        </div>

        <div style={s.glyph}>{step.glyph}</div>
        <div style={s.eyebrow}>{step.eyebrow}</div>
        <h2 style={s.title}>{step.title}</h2>
        <p style={s.body}>{step.body}</p>

        <div style={s.dots}>
          {STEPS.map((_, i) => <div key={i} style={s.dot(i === idx)} />)}
        </div>

        <div style={s.nav}>
          {!isFirst && (
            <button style={{ ...C.bghost, flex: 1, marginBottom: 0 }} onClick={() => setIdx(i => i - 1)}>Back</button>
          )}
          <button
            style={s.next}
            onClick={() => isLast ? finish() : setIdx(i => i + 1)}
          >
            {isLast ? "Let's go" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function shouldShowTourAutomatically() {
  try { return !localStorage.getItem(FLAG_KEY) } catch { return false }
}
export function markTourSeen() {
  try { localStorage.setItem(FLAG_KEY, '1') } catch {}
}
