import { tokens as t } from '../../styles.js'

/**
 * MacroRing — donut showing macro split with calories in the center.
 * Pass current totals (p/c/f grams) and the daily target for percentages.
 */
export default function MacroRing({ totals, targets, size = 160, stroke = 14 }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pCals = totals.p * 4
  const cCals = totals.c * 4
  const fCals = totals.f * 9
  const total = pCals + cCals + fCals || 1
  const pPct = pCals / total
  const cPct = cCals / total
  const fPct = fCals / total
  const calsTotal = pCals + cCals + fCals
  const calPctOfTarget = Math.round((calsTotal / targets.cal) * 100)

  const seg = (pct) => c * pct
  let offset = 0
  const segments = [
    { color: t.color.ember,         len: seg(pPct), label: 'Protein' },
    { color: '#e8e3d5',             len: seg(cPct), label: 'Carbs' },
    { color: '#8a8b8f',             len: seg(fPct), label: 'Fat' },
  ]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={t.color.line} strokeWidth={stroke} />
          {segments.map((s, i) => {
            const dash = `${s.len} ${c - s.len}`
            const dashoffset = -offset
            offset += s.len
            return s.len > 0 ? (
              <circle key={i} cx={size/2} cy={size/2} r={r}
                fill="none" stroke={s.color} strokeWidth={stroke}
                strokeDasharray={dash} strokeDashoffset={dashoffset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-dasharray 600ms cubic-bezier(.2,.7,.2,1)' }}
              />
            ) : null
          })}
        </svg>
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontFamily: t.font.display, fontSize: 30, fontWeight: 500,
            color: t.color.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
          }}>{Math.round(calsTotal)}</div>
          <div style={{
            fontSize: 9, letterSpacing: 2, color: t.color.textMute,
            textTransform: 'uppercase', fontWeight: 600, marginTop: 4,
          }}>/ {targets.cal} kcal</div>
          <div style={{
            fontSize: 10, color: t.color.ember, fontWeight: 600,
            marginTop: 4, letterSpacing: 0.4,
          }}>{calPctOfTarget}%</div>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[
          { key: 'p', label: 'Protein', val: totals.p, tgt: targets.p, color: t.color.ember,  unit: 'g' },
          { key: 'c', label: 'Carbs',   val: totals.c, tgt: targets.c, color: '#e8e3d5',       unit: 'g' },
          { key: 'f', label: 'Fat',     val: totals.f, tgt: targets.f, color: '#8a8b8f',       unit: 'g' },
        ].map(m => {
          const pct = Math.min(100, Math.round((m.val / m.tgt) * 100))
          return (
            <div key={m.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{
                  fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
                  fontWeight: 600, textTransform: 'uppercase',
                }}>{m.label}</span>
                <span style={{
                  fontSize: 11, color: t.color.text, fontWeight: 600,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {Math.round(m.val)}<span style={{ color: t.color.textMute }}> / {m.tgt}{m.unit}</span>
                </span>
              </div>
              <div style={{ height: 5, background: t.color.line, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  width: `${pct}%`, height: '100%', background: m.color, borderRadius: 3,
                  transition: 'width 500ms cubic-bezier(.2,.7,.2,1)',
                }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
