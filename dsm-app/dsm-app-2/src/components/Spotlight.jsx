/**
 * Spotlight — Cmd-K / ⌘K style universal jumper.
 *
 * Opens via a floating ⚡ button (next to the 🐛 bug reporter) or the
 * keyboard shortcut Cmd/Ctrl+K. Lists every navigable destination, filtered
 * as you type. Tap or arrow+Enter to jump.
 */
import { useEffect, useRef, useState, useMemo } from 'react'
import { tokens as t } from '../styles.js'

// All navigable destinations — extend this list as new tabs are added
const DESTINATIONS = [
  { id: 'home',      label: 'Home',              keywords: 'dashboard greeting tasks streak quests' },
  { id: 'actions',   label: 'Action Steps',      keywords: 'log shark goldfish self-talk tune-out training' },
  { id: 'ball',      label: 'Ball Mastery',      keywords: 'skills reps drills daily' },
  { id: 'workouts',  label: 'Workouts',          keywords: 'lift gym strength sets' },
  { id: 'match',     label: 'Match-Day Mode',    keywords: 'game pre post sideline cue breath result' },
  { id: 'bot',       label: 'Coach V Chat',      keywords: 'ask question valentino ai chat' },
  { id: 'inbox',     label: 'Inbox',             keywords: 'messages notifications' },
  { id: 'squad',     label: 'Squad',             keywords: 'friends leaderboard private group' },
  { id: 'locker',    label: 'Locker Room',       keywords: 'private record everything data themes' },
  { id: 'player',    label: 'Profile',           keywords: 'overview badges family family invite parent skills' },
  { id: 'more',      label: 'More',              keywords: 'menu overflow settings tips' },
  { id: 'voice',     label: 'Voice Journal',     keywords: 'speak reflection audio xp 60' },
  { id: 'future',    label: 'Future Self',       keywords: 'monthly identity ritual' },
  { id: 'nutrition', label: 'Nutrition',         keywords: 'food log macros calories meals' },
  { id: 'body',      label: 'Body Stats',        keywords: 'weight measurements composition' },
  { id: 'tracker',   label: 'Habit Tracker',     keywords: 'weekly streak daily habits' },
  { id: 'weekly',    label: 'Weekly Check-in',   keywords: 'mental score win struggle sunday' },
  { id: 'course',    label: 'Course',            keywords: 'lessons video modules learn' },
  { id: 'parents',   label: 'Parent Guide',      keywords: 'support family for-parents' },
  { id: 'admin',     label: 'Admin Dashboard',   keywords: 'all athletes coach view manage', adminOnly: true },
  { id: 'dashboard', label: 'Coach Dashboard',   keywords: 'classic coach view athletes', coachOnly: true },
]

export default function Spotlight({ open, onClose, onJump, isAdmin, isCoach }) {
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const inputRef = useRef(null)

  // Global keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (!open) onJump?.('__openSpotlight__')  // signal parent to open
      }
      if (open && e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, onJump])

  useEffect(() => {
    if (open) {
      setQ(''); setSel(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const filtered = useMemo(() => {
    const available = DESTINATIONS.filter(d =>
      (!d.adminOnly || isAdmin) && (!d.coachOnly || isCoach)
    )
    if (!q.trim()) return available
    const needle = q.toLowerCase().trim()
    return available
      .map(d => {
        const hay = `${d.label} ${d.keywords}`.toLowerCase()
        // exact start match scores highest, then substring, then any letter match
        let score = 0
        if (d.label.toLowerCase().startsWith(needle)) score = 100
        else if (hay.includes(needle)) score = 60
        else {
          // soft fuzzy: every char of needle appears in order
          let i = 0
          for (const c of hay) { if (c === needle[i]) i++ }
          if (i === needle.length) score = 20
        }
        return { ...d, _score: score }
      })
      .filter(d => d._score > 0)
      .sort((a, b) => b._score - a._score)
  }, [q, isAdmin, isCoach])

  useEffect(() => { setSel(0) }, [q])

  function jump(id) {
    onJump?.(id)
    onClose?.()
  }

  function onKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(filtered.length - 1, s + 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(0, s - 1)) }
    else if (e.key === 'Enter') { e.preventDefault(); if (filtered[sel]) jump(filtered[sel].id) }
  }

  if (!open) return null

  return (
    <div style={overlay} onClick={onClose}>
      <div style={shell} onClick={e => e.stopPropagation()}>
        <div style={inputRow}>
          <div style={{ fontSize: 17, color: t.color.textDim, paddingLeft: 4 }}>⚡</div>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKey}
            placeholder="Jump to anything…"
            style={input}
          />
          <div style={kbdHint}>⌘K</div>
        </div>
        <div style={list}>
          {filtered.length === 0 && (
            <div style={empty}>Nothing matches "{q}".</div>
          )}
          {filtered.map((d, i) => (
            <button
              key={d.id}
              onClick={() => jump(d.id)}
              onMouseEnter={() => setSel(i)}
              style={row(i === sel)}
            >
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: i === sel ? t.color.bg : t.color.text }}>
                  {d.label}
                </div>
              </div>
              {i === sel && <div style={{ fontSize: 10, letterSpacing: 1, color: t.color.bg, fontWeight: 700 }}>↵</div>}
            </button>
          ))}
        </div>
        <div style={footer}>
          ↑↓ navigate · ↵ open · esc close
        </div>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.78)',
  backdropFilter: 'blur(14px)',
  zIndex: 700,
  display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
  paddingTop: '12vh', padding: '12vh 14px 14px',
}
const shell = {
  width: '100%', maxWidth: 480,
  background: t.color.surface,
  border: `1px solid ${t.color.line2}`,
  borderRadius: t.radius.xl,
  boxShadow: t.shadow.raised,
  overflow: 'hidden',
}
const inputRow = {
  display: 'flex', alignItems: 'center', gap: 10,
  padding: '14px 16px',
  borderBottom: `1px solid ${t.color.line}`,
}
const input = {
  flex: 1, background: 'transparent', border: 'none',
  color: t.color.text, fontSize: 16, outline: 'none',
  fontFamily: t.font.sans,
}
const kbdHint = {
  fontSize: 10, letterSpacing: 1.4, color: t.color.textMute,
  fontWeight: 700, fontFamily: t.font.mono,
  padding: '4px 8px', border: `1px solid ${t.color.line2}`,
  borderRadius: 6, textTransform: 'uppercase',
}
const list = { maxHeight: '60vh', overflowY: 'auto' }
const row = (active) => ({
  display: 'flex', alignItems: 'center', gap: 12,
  width: '100%', padding: '12px 16px',
  background: active ? t.color.text : 'transparent',
  border: 'none', cursor: 'pointer', fontFamily: t.font.sans,
  borderTop: `1px solid ${t.color.line}`,
  transition: 'background 80ms ease',
})
const empty = { padding: '24px 16px', color: t.color.textMute, fontSize: 13, textAlign: 'center' }
const footer = {
  padding: '10px 16px', borderTop: `1px solid ${t.color.line}`,
  fontSize: 10, letterSpacing: 1.4, color: t.color.textMute, fontWeight: 600,
  textTransform: 'uppercase', textAlign: 'center', fontFamily: t.font.sans,
}
