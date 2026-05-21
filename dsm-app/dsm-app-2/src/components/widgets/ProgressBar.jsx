import { tokens as t } from '../../styles.js'

let injected = false
function ensureKeyframes() {
  if (typeof document === 'undefined' || injected) return
  injected = true
  const el = document.createElement('style')
  el.setAttribute('data-dsm', 'progressbar')
  el.textContent = `
    @keyframes dsmBarShimmer {
      0%   { transform: translateX(-160%); }
      60%  { transform: translateX(260%); }
      100% { transform: translateX(260%); }
    }
  `
  document.head.appendChild(el)
}

const withAlpha = (hex, alphaHex) => {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return hex
  if (hex.length === 7) return hex + alphaHex
  if (hex.length === 4) {
    const r = hex[1], g = hex[2], b = hex[3]
    return `#${r}${r}${g}${g}${b}${b}${alphaHex}`
  }
  return hex
}

/**
 * ProgressBar — premium glow progress meter for the DSM aesthetic.
 *
 * Inset track for depth, glossy gradient fill with top-edge highlight,
 * color-tinted outer halo (proportional to height), slow shimmer sweep.
 *
 * Props:
 *   pct        — 0..100 fill percentage
 *   height     — track height in px (glow scales with this)
 *   color      — fill color (hex). Halo is auto-tinted from this.
 *   background — track background (defaults to t.color.line)
 *   radius     — corner radius override
 *   glow       — outer halo on/off (default true)
 *   shimmer    — shimmer sweep on/off (default true)
 *   duration   — width transition ms
 *   style      — passthrough wrapper style
 */
export default function ProgressBar({
  pct = 0,
  height = 6,
  color = t.color.text,
  background,
  radius,
  glow = true,
  shimmer = true,
  duration = 600,
  style,
}) {
  ensureKeyframes()
  const clamped = Math.max(0, Math.min(100, pct))
  const r = radius ?? Math.max(2, Math.round(height / 2) + 1)
  const filled = clamped > 0

  const haloNear = withAlpha(color, '66')
  const haloFar  = withAlpha(color, '2e')
  const glowSize1 = Math.max(3, height * 0.7)
  const glowSize2 = Math.max(7, height * 1.8)

  return (
    <div
      style={{
        position: 'relative',
        height,
        borderRadius: r,
        ...(glow && filled
          ? { filter: `drop-shadow(0 0 ${glowSize1}px ${haloNear}) drop-shadow(0 0 ${glowSize2}px ${haloFar})` }
          : null),
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: background || t.color.line,
          borderRadius: r,
          overflow: 'hidden',
          boxShadow: 'inset 0 1px 1.5px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.025)',
        }}
      >
        <div
          style={{
            position: 'relative',
            height: '100%',
            width: `${clamped}%`,
            borderRadius: r,
            background: `linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.04) 48%, rgba(0,0,0,0.18) 100%), ${color}`,
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.22)`,
            transition: `width ${duration}ms cubic-bezier(.2,.7,.2,1)`,
            overflow: 'hidden',
            willChange: 'width',
          }}
        >
          {shimmer && filled && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: 0,
                width: '38%',
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.55) 50%, transparent 100%)',
                animation: 'dsmBarShimmer 3.4s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
