import { tokens as t } from '../../styles.js'

/**
 * Lightweight SVG line chart for body stats / weekly trends.
 * Pass `data` as an array of numbers (or {x,y} if you want labels).
 */
export default function LineChart({ data, height = 110, accent = t.color.ember, fillFade = true, showDots = true }) {
  if (!data || data.length === 0) return null

  const points = data.map((d) => (typeof d === 'number' ? d : d.y))
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const padY = 12
  const W = 320
  const H = height
  const innerH = H - padY * 2
  const stepX = W / (points.length - 1 || 1)

  const coords = points.map((v, i) => {
    const x = i * stepX
    const y = padY + (1 - (v - min) / range) * innerH
    return { x, y }
  })

  const linePath = coords.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const fillPath = `${linePath} L ${W} ${H} L 0 ${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.32" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Horizontal grid */}
      {[0.25, 0.5, 0.75].map((r) => (
        <line key={r} x1="0" x2={W} y1={padY + innerH * r} y2={padY + innerH * r}
          stroke={t.color.line} strokeWidth="1" strokeDasharray="2 4" />
      ))}

      {fillFade && <path d={fillPath} fill="url(#chartFill)" />}
      <path d={linePath} fill="none" stroke={accent} strokeWidth="2"
        strokeLinejoin="round" strokeLinecap="round"
        vectorEffect="non-scaling-stroke" />

      {showDots && coords.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === coords.length - 1 ? 4 : 2.4}
          fill={i === coords.length - 1 ? accent : t.color.bg}
          stroke={accent} strokeWidth={i === coords.length - 1 ? 0 : 1.5}
          vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  )
}
