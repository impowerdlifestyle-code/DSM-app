import { tokens as t } from '../../styles.js'
import TiltCard from './TiltCard.jsx'

const TIER_META = {
  Bronze: { color: '#b08964', accent: 'rgba(176,137,100,0.18)' },
  Silver: { color: '#d1d5db', accent: 'rgba(209,213,219,0.16)' },
  Gold:   { color: '#facc15', accent: 'rgba(250,204,21,0.16)' },
  Elite:  { color: t.color.text, accent: 'rgba(255,255,255,0.20)' },
}

export default function BadgeTile({ badge }) {
  const meta = TIER_META[badge.tier] || TIER_META.Bronze
  const earned = badge.earned

  return (
    <TiltCard tiltLimit={14} scale={1.05} style={{ borderRadius: 14 }}>
      <div style={{
        position: 'relative',
        aspectRatio: '1 / 1',
        background: earned
          ? `linear-gradient(180deg, ${meta.accent}, transparent 70%), ${t.color.surface}`
          : t.color.surface,
        border: `1px solid ${earned ? meta.color : t.color.line}`,
        borderRadius: 14,
        padding: 14,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        opacity: earned ? 1 : 0.45,
        overflow: 'hidden',
      }}>
        {/* tier glyph in corner */}
        <div style={{
          position: 'absolute', top: 6, right: 8,
          fontSize: 9, letterSpacing: 1.4, color: earned ? meta.color : t.color.textMute,
          fontWeight: 700, textTransform: 'uppercase',
        }}>{badge.tier}</div>

        {/* icon */}
        <div style={{
          fontFamily: t.font.athletic, fontSize: 38, color: earned ? meta.color : t.color.textMute,
          lineHeight: 1, marginBottom: 8, letterSpacing: 2,
          filter: earned ? 'drop-shadow(0 0 12px rgba(255,255,255,0.08))' : 'none',
        }}>{badge.icon}</div>

        {/* name */}
        <div style={{
          fontSize: 11, fontWeight: 700, letterSpacing: 1.2,
          color: earned ? t.color.text : t.color.textDim,
          textTransform: 'uppercase', lineHeight: 1.15,
        }}>{badge.name}</div>

        {/* lock indicator or date */}
        {!earned ? (
          <div style={{
            marginTop: 6, fontSize: 9, letterSpacing: 1.4,
            color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase',
          }}>Locked</div>
        ) : (
          <div style={{
            marginTop: 4, fontSize: 9, letterSpacing: 1, color: t.color.textMute,
            fontWeight: 500, fontVariantNumeric: 'tabular-nums',
          }}>{badge.date}</div>
        )}
      </div>
    </TiltCard>
  )
}
