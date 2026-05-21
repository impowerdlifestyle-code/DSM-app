import { tokens as t } from '../../styles.js'
import TiltCard from './TiltCard.jsx'
import ProgressBar from './ProgressBar.jsx'

/**
 * QuestCard — single daily quest row with progress + XP reward.
 */
export default function QuestCard({ quest, onClick }) {
  const done = quest.progress >= quest.target
  const pct = Math.min(100, Math.round((quest.progress / quest.target) * 100))

  return (
    <TiltCard tiltLimit={8} scale={1.02} style={{ borderRadius: 14, marginBottom: 8 }}>
      <button
        onClick={onClick}
        style={{
          width: '100%',
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 16px',
          background: done ? 'rgba(74,222,128,0.06)' : t.color.surface,
          border: `1px solid ${done ? 'rgba(74,222,128,0.3)' : t.color.line}`,
          borderRadius: 14,
          fontFamily: t.font.sans, textAlign: 'left',
          cursor: 'pointer', color: 'inherit',
        }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 9,
          background: done ? 'rgba(74,222,128,0.18)' : t.color.bg,
          border: `1px solid ${done ? 'rgba(74,222,128,0.4)' : t.color.line2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: t.font.athletic, fontSize: 18, fontWeight: 400,
          color: done ? '#4ade80' : t.color.text, flexShrink: 0, letterSpacing: 0,
        }}>{done ? '✓' : quest.icon}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: t.color.text, letterSpacing: -0.1 }}>
            {quest.title}
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginTop: 6,
          }}>
            <ProgressBar
              pct={pct}
              height={4}
              color={done ? '#4ade80' : t.color.text}
              style={{ flex: 1 }}
              duration={500}
            />
            <span style={{
              fontSize: 10, letterSpacing: 1, color: t.color.textMute,
              fontWeight: 600, fontVariantNumeric: 'tabular-nums', flexShrink: 0,
            }}>{quest.progress}/{quest.target}</span>
          </div>
        </div>

        <div style={{
          fontFamily: t.font.athletic, fontSize: 18, fontWeight: 400, letterSpacing: 1,
          color: done ? '#4ade80' : t.color.text,
          flexShrink: 0,
        }}>
          +{quest.xp}
          <span style={{ fontSize: 10, marginLeft: 2, color: t.color.textMute, letterSpacing: 0.5 }}>XP</span>
        </div>
      </button>
    </TiltCard>
  )
}
