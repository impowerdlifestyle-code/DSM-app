import { useState } from 'react'
import { tokens as t } from '../../styles.js'
import { RANKS, rankFromXp } from '../../data/gamification.js'
import ProgressBar from './ProgressBar.jsx'

// The DSM mindset-rank centerpiece. Pass the athlete's cumulative XP total.
export default function RankCard({ xpTotal = 0, compact = false }) {
  const [open, setOpen] = useState(false)
  const r = rankFromXp(xpTotal)

  if (compact) {
    return (
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', borderRadius: 999,
        background: t.color.surface, border: `1px solid ${t.color.line2}`,
      }}>
        <span style={{ fontSize: 15 }}>{r.rank.icon}</span>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: t.color.text }}>
          {r.rank.name}
        </span>
      </div>
    )
  }

  return (
    <div style={{
      background: `linear-gradient(180deg, ${t.color.surface2}, ${t.color.surface})`,
      border: `1px solid ${t.color.line2}`,
      borderRadius: t.radius.xl, padding: 20, marginBottom: 14,
      boxShadow: t.shadow.raised,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16, flexShrink: 0,
          background: t.color.bg, border: `1px solid ${t.color.line2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
          boxShadow: '0 0 26px rgba(255,255,255,0.08)',
        }}>{r.rank.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 700, textTransform: 'uppercase' }}>
            DSM Mindset Rank
          </div>
          <div style={{
            fontFamily: t.font.athletic, fontSize: 28, color: t.color.text,
            letterSpacing: 1, lineHeight: 1, marginTop: 2, textTransform: 'uppercase',
          }}>{r.rank.name}</div>
        </div>
      </div>

      <p style={{ fontSize: 12.5, color: t.color.textDim, lineHeight: 1.5, marginTop: 12 }}>{r.rank.blurb}</p>

      <div style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
          <span style={{ fontSize: 10, letterSpacing: 1.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
            {r.next ? `Next · ${r.next.name}` : 'Max rank reached'}
          </span>
          <span style={{ fontSize: 11, color: t.color.textDim, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {r.next ? `${r.xpToNext.toLocaleString()} XP to go` : `${xpTotal.toLocaleString()} XP`}
          </span>
        </div>
        <ProgressBar pct={r.pct} height={6} duration={800} />
      </div>

      <button onClick={() => setOpen(o => !o)} style={{
        marginTop: 14, width: '100%', padding: '8px 0',
        background: 'transparent', border: `1px solid ${t.color.line2}`, borderRadius: t.radius.sm,
        color: t.color.textDim, fontSize: 10, fontWeight: 700, letterSpacing: 1.4,
        textTransform: 'uppercase', cursor: 'pointer', fontFamily: t.font.sans,
      }}>{open ? 'Hide ladder' : 'View rank ladder'}</button>

      {open && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {RANKS.map((rank, i) => {
            const reached = xpTotal >= rank.threshold
            const current = i === r.idx
            return (
              <div key={rank.key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: t.radius.md,
                background: current ? 'rgba(74,222,128,0.10)' : reached ? t.color.surface : t.color.bg,
                border: `1px solid ${current ? t.color.pitchEdge : reached ? t.color.line : t.color.line2}`,
                opacity: reached ? 1 : 0.55,
              }}>
                <span style={{ fontSize: 20, filter: reached ? 'none' : 'grayscale(1)' }}>{rank.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: t.color.text, letterSpacing: 0.5 }}>
                    {rank.name}
                  </div>
                  <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1, fontWeight: 600, textTransform: 'uppercase', marginTop: 1 }}>
                    {rank.threshold.toLocaleString()} XP
                  </div>
                </div>
                {current && (
                  <span style={{ fontSize: 9, letterSpacing: 1.4, color: t.color.pitch, fontWeight: 700, textTransform: 'uppercase' }}>
                    You
                  </span>
                )}
                {reached && !current && (
                  <span style={{ fontSize: 13, color: t.color.ok }}>✓</span>
                )}
              </div>
            )
          })}
          <p style={{ fontSize: 11, color: t.color.textMute, lineHeight: 1.5, marginTop: 4 }}>
            Ranks come from consistency — check-ins, routines, reflections, bounce-backs, streaks. Never from goals, wins, or stats.
          </p>
        </div>
      )}
    </div>
  )
}
