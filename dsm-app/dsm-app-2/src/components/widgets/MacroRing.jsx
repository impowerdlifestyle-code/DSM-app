import { tokens as t } from '../../styles.js'
import ProgressBar from './ProgressBar.jsx'

/**
 * MacroRing — donut showing macro split with calories in the center.
 * Pass current totals (p/c/f grams) and the daily target for percentages.
 */
export default function MacroRing({ totals = { p: 0, c: 0, f: 0 }, targets = { cal: 0 }, size = 160, stroke = 14 }) {
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
  const calPctOfTarget = targets.cal ? Math.round((calsTotal / targets.cal) * 100) : 0

  const seg = (pct) => c * pct
  let offset = 0
  const segments = [
    { color: t.color.ember,         len: seg(pPct), label: 'Protein' },
    { color: t.color.bone,             len: seg(cPct), label: 'Carbs' },
    { color: t.color.textDim,             len: seg(fPct), label: 'Fat' },
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
          { key: 'c', label: 'Carbs',   val: totals.c, tgt: targets.c, color: t.color.bone,       unit: 'g' },
          { key: 'f', label: 'Fat',     val: totals.f, tgt: targets.f, color: t.color.textDim,       unit: 'g' },
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
              <ProgressBar pct={pct} height={5} color={m.color} duration={500} />
            </div>
          )
        })}
      </div>
    </div>
  )
}
