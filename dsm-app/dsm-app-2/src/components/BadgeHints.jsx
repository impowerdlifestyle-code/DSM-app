/**
 * BadgeHints — friendly popup that teaches kids how to earn badges + XP.
 *
 * Auto-shows once per athlete (localStorage flag) on their 1st-or-2nd app open
 * after onboarding. Re-openable any time via a "Tips" button in the More tab.
 *
 * Two modes:
 *   - "How to earn XP" — concrete actions sorted by XP value, with "Try it" CTAs
 *   - "How to unlock badges" — locked badges with their requirements, ranked by
 *     how close the athlete already is
 */
import { useEffect, useState } from 'react'
import { tokens as t } from '../styles.js'
import { BADGES, XP_TABLE } from '../data/gamification.js'
import { getEarnedBadges } from '../lib/supabase.js'

const FLAG_KEY = 'dsm_badge_hints_seen_v1'

const XP_TIPS = [
  { action: 'Finish a weekly check-in',     xp: XP_TABLE.weeklyCheckin,  tab: 'weekly',    cue: 'Mondays · 5 min · biggest XP per minute' },
  { action: 'Complete a workout',           xp: XP_TABLE.workoutComplete, tab: 'workouts',  cue: 'Any session, any volume — counts when you tap Done' },
  { action: 'Hit your daily quests',        xp: XP_TABLE.questComplete,   tab: 'home',      cue: 'Triple-stack quests = bonus XP every day' },
  { action: 'Post-game reflection',         xp: XP_TABLE.matchReflection, tab: 'matchday',  cue: 'Process every game — win or lose, the reps count' },
  { action: 'Drop a voice journal',         xp: XP_TABLE.voiceJournal,    tab: 'home',      cue: '30 seconds, Coach V reads it' },
  { action: 'Log action steps',             xp: XP_TABLE.actionStep,      tab: 'actions',   cue: 'After every practice or game' },
  { action: 'Daily ball mastery',           xp: XP_TABLE.ballMastery,     tab: 'ball',      cue: '3+ skills, any reps' },
  { action: 'Form-check video',             xp: XP_TABLE.videoFormCheck,  tab: 'workouts',  cue: 'Coach V breaks it down' },
  { action: 'Perfect week (every day logged)', xp: XP_TABLE.perfectWeek, tab: null,        cue: 'The hidden achievement — most kids never hit it' },
]

// M16: tips are computed per-render from the LIVE earned set, not from
// the mock `b.earned` field that gamification.js ships. Old behavior
// listed badges as "still to earn" even after the athlete unlocked them.
function badgeHint(id) {
  return id === 'century'          ? '100 days straight. No skip days. Set a reminder.'
       : id === 'pr-streak'        ? 'New personal record three weeks in a row — keep pushing weight or reps.'
       : id === 'mvp-week'         ? 'Top your squad leaderboard. Stack XP early Monday-Wednesday.'
       : id === 'elite-mind'       ? 'Your mental score has to hit 95+. Stack 👍s on Coach V chats.'
       : id === 'iron-streak'      ? 'A FULL YEAR. The streak badge for the obsessed.'
       : id === 'community-leader' ? 'Post 25 wins or insights. Help your squad, get the badge.'
       : 'Keep going — small daily reps unlock it.'
}

const FAST_TRACK = [
  '🦈 Stack 3 wins by 10am — Action steps (50 XP), Ball mastery (40 XP), Voice journal (60 XP). 150 XP before practice.',
  '🐠 Lose your streak? Don\'t spiral. Log ONE action right now. Day 1 is fine.',
  '💬 Thumbs-up Coach V replies you love. Your mental score climbs and so does your Elite Mind progress.',
  '📅 Sunday night = weekly check-in night. 200 XP, sets you up for the week, your only one-shot every 7 days.',
]

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.92)',
    backdropFilter: 'blur(12px)',
    zIndex: 600,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '24px 14px 80px',
    overflowY: 'auto',
  },
  shell: {
    width: '100%', maxWidth: 440,
    background: t.color.surface,
    border: `1px solid ${t.color.line2}`,
    borderRadius: t.radius.xl,
    padding: 22,
    boxShadow: t.shadow.raised,
  },
  eyebrow: {
    fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
    fontWeight: 600, textTransform: 'uppercase', marginBottom: 6,
  },
  h: {
    fontFamily: t.font.athletic, fontSize: 30, lineHeight: 1, fontWeight: 400,
    letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 14,
    color: t.color.text,
    textShadow: '0 0 14px rgba(255,255,255,0.45), 0 0 28px rgba(255,255,255,0.22)',
  },
  tabRow: {
    display: 'flex', gap: 4, padding: 4,
    background: t.color.bg, border: `1px solid ${t.color.line}`,
    borderRadius: 999, marginBottom: 16,
  },
  tab: (on) => ({
    flex: 1, padding: '9px 0',
    fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
    color: on ? t.color.bg : t.color.textDim,
    background: on ? t.color.text : 'transparent',
    border: 'none', borderRadius: 999,
    cursor: 'pointer', fontFamily: t.font.sans,
  }),
  row: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 14px', marginBottom: 8,
    background: t.color.bg, border: `1px solid ${t.color.line}`,
    borderRadius: t.radius.md,
  },
  xpBadge: {
    background: t.color.text, color: t.color.bg,
    padding: '4px 10px', borderRadius: 999,
    fontFamily: t.font.athletic, fontSize: 14, letterSpacing: 0.6,
    flexShrink: 0,
  },
  rowTitle: { fontSize: 13, fontWeight: 600, color: t.color.text, marginBottom: 3 },
  rowSub:   { fontSize: 11, color: t.color.textDim, lineHeight: 1.4 },
  jumpBtn: {
    background: 'transparent', border: `1px solid ${t.color.line2}`,
    color: t.color.text, fontSize: 9, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', padding: '5px 10px',
    borderRadius: 999, cursor: 'pointer', fontFamily: t.font.sans,
    marginLeft: 'auto',
  },
  closeBtn: {
    width: '100%',
    background: t.color.text, color: t.color.bg,
    border: 'none', borderRadius: t.radius.md,
    padding: '13px 18px',
    fontSize: 13, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase',
    cursor: 'pointer', fontFamily: t.font.sans,
    marginTop: 12,
  },
  tipBox: {
    background: 'rgba(255,255,255,0.04)',
    border: `1px dashed ${t.color.line2}`,
    borderRadius: t.radius.md,
    padding: '10px 12px', marginBottom: 8,
    fontSize: 12, color: t.color.text, lineHeight: 1.45,
  },
}

export default function BadgeHints({ open, onClose, onJumpTo, user }) {
  const [mode, setMode] = useState('xp')
  const [earnedIds, setEarnedIds] = useState(() => new Set())

  useEffect(() => {
    if (!open) return
    setMode('xp')
    if (!user?.id) return
    let live = true
    ;(async () => {
      const { data } = await getEarnedBadges(user.id)
      if (!live) return
      setEarnedIds(new Set((data || []).map(b => b.badge_id)))
    })()
    return () => { live = false }
  }, [open, user?.id])

  if (!open) return null

  const earnedCount  = BADGES.filter(b => earnedIds.has(b.id)).length
  const unearnedTips = BADGES.filter(b => !earnedIds.has(b.id)).map(b => ({ ...b, hint: badgeHint(b.id) }))

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.shell} onClick={e => e.stopPropagation()}>
        <div style={s.eyebrow}>How to level up</div>
        <h2 style={s.h}>XP &amp; Badges</h2>

        <div style={s.tabRow}>
          <button style={s.tab(mode === 'xp')} onClick={() => setMode('xp')}>Earn XP</button>
          <button style={s.tab(mode === 'badges')} onClick={() => setMode('badges')}>Unlock Badges</button>
          <button style={s.tab(mode === 'fast')} onClick={() => setMode('fast')}>Fast Track</button>
        </div>

        {mode === 'xp' && (
          <>
            {XP_TIPS.sort((a, b) => b.xp - a.xp).map((tip, i) => (
              <div key={i} style={s.row}>
                <div style={s.xpBadge}>+{tip.xp}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.rowTitle}>{tip.action}</div>
                  <div style={s.rowSub}>{tip.cue}</div>
                </div>
                {tip.tab && (
                  <button style={s.jumpBtn} onClick={() => { onJumpTo?.(tip.tab); onClose() }}>
                    Try it →
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {mode === 'badges' && (
          <>
            <div style={s.tipBox}>
              You've earned {earnedCount} of {BADGES.length} badges. Here's what's left:
            </div>
            {unearnedTips.map(b => (
              <div key={b.id} style={s.row}>
                <div style={{ ...s.xpBadge, background: t.color.surface2, color: t.color.text, border: `1px solid ${t.color.line2}` }}>
                  {b.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={s.rowTitle}>{b.name} <span style={{ color: t.color.textMute, fontSize: 10, letterSpacing: 1, fontWeight: 700, marginLeft: 6 }}>· {b.tier}</span></div>
                  <div style={s.rowSub}>{b.desc}</div>
                  <div style={{ ...s.rowSub, marginTop: 4, color: t.color.textMute, fontStyle: 'italic' }}>{b.hint}</div>
                </div>
              </div>
            ))}
          </>
        )}

        {mode === 'fast' && (
          <>
            <div style={s.tipBox}>
              Power moves from Coach V — sequences that stack XP and badges fastest:
            </div>
            {FAST_TRACK.map((tip, i) => (
              <div key={i} style={{ ...s.row, alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>{tip}</div>
              </div>
            ))}
          </>
        )}

        <button style={s.closeBtn} onClick={onClose}>Got it — let's go</button>
      </div>
    </div>
  )
}

// Helper: returns true if athlete hasn't seen the hints popup yet
export function shouldShowBadgeHintsAutomatically() {
  try { return !localStorage.getItem(FLAG_KEY) } catch { return false }
}
export function markBadgeHintsSeen() {
  try { localStorage.setItem(FLAG_KEY, '1') } catch {}
}
