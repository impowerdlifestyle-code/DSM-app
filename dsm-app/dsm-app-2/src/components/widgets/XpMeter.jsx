import { tokens as t } from '../../styles.js'

/**
 * XpMeter — compact level + XP bar for the header.
 * Clickable to open Player tab.
 */
export default function XpMeter({ player, onClick }) {
  const pct = Math.min(100, Math.round((player.xp / player.xpToNext) * 100))
  return (
    <button onClick={onClick} style={{
      display: 'inline-flex', alignItems: 'center', gap: 9,
      padding: '5px 5px 5px 10px',
      background: t.color.surface,
      border: `1px solid ${t.color.line2}`,
      borderRadius: 999,
      cursor: 'pointer',
      fontFamily: t.font.sans,
      transition: `border-color ${t.motion.fast}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: t.font.athletic, fontSize: 18, fontWeight: 400,
          color: t.color.text, lineHeight: 0.9, letterSpacing: 1,
        }}>LV {player.level}</span>
      </div>
      <div style={{
        width: 46, height: 4, background: t.color.line,
        borderRadius: 2, overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`, height: '100%', background: t.color.text,
          borderRadius: 2, transition: 'width 600ms cubic-bezier(.2,.7,.2,1)',
        }} />
      </div>
      <div style={{
        width: 22, height: 22, borderRadius: '50%',
        background: t.color.text, color: t.color.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: t.font.athletic, fontSize: 11, fontWeight: 400, letterSpacing: 0.5,
      }}>{player.level}</div>
    </button>
  )
}
