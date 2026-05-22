import { tokens as t } from '../styles.js'
import { useTheme } from '../lib/theme.jsx'

export default function ThemePicker({ onClose }) {
  const { themeId, setTheme, themes } = useTheme()

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={head}>
          <div>
            <div style={eyebrow}>Theme</div>
            <div style={title}>Pick your look</div>
          </div>
          <button onClick={onClose} style={closeBtn} aria-label="Close">✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 6 }}>
          {Object.values(themes).map(th => {
            const active = th.id === themeId
            return (
              <button
                key={th.id}
                onClick={() => setTheme(th.id)}
                style={tile(active, th.vars['--color-bg'], th.vars['--color-line2'])}
              >
                <div style={swatchRow}>
                  {th.swatches.map((c, i) => (
                    <span key={i} style={swatch(c, i === th.swatches.length - 1)} />
                  ))}
                </div>
                <div style={tileLabel}>
                  <span style={{ fontFamily: t.font.athletic, fontSize: 18, letterSpacing: 1.2, color: th.vars['--color-text'], textTransform: 'uppercase' }}>
                    {th.label}
                  </span>
                  {active && (
                    <span style={{ fontSize: 9, letterSpacing: 1.4, color: th.vars['--color-pitch'], fontWeight: 700, textTransform: 'uppercase' }}>
                      ✓ Active
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 10, letterSpacing: 1, color: th.vars['--color-text-dim'], textTransform: 'uppercase', fontWeight: 600 }}>
                  {th.mode === 'dark' ? 'Dark' : 'Light'}
                </div>
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 0.6, lineHeight: 1.5, marginTop: 14, textAlign: 'center' }}>
          Your pick syncs across this device. Switches happen instantly — no reload.
        </div>
      </div>
    </div>
  )
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
  zIndex: 600,
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 12,
}
const modal = {
  width: '100%', maxWidth: 440,
  background: t.color.surface,
  border: `1px solid ${t.color.line2}`,
  borderRadius: t.radius.xl,
  padding: 18,
  boxShadow: t.shadow.raised,
  marginBottom: 'env(safe-area-inset-bottom)',
}
const head = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  marginBottom: 16, gap: 10,
}
const eyebrow = {
  fontSize: 10, letterSpacing: 2.4, color: t.color.textMute,
  fontWeight: 700, textTransform: 'uppercase',
}
const title = {
  fontFamily: t.font.athletic, fontSize: 28, letterSpacing: 1.2,
  color: t.color.text, textTransform: 'uppercase', lineHeight: 1, marginTop: 4,
}
const closeBtn = {
  background: 'transparent', border: 'none',
  color: t.color.textDim, fontSize: 18, cursor: 'pointer', padding: 4,
}
const tile = (active, bg, border) => ({
  display: 'flex', flexDirection: 'column', gap: 10,
  padding: 14, borderRadius: 14,
  background: bg,
  border: `1.5px solid ${active ? 'var(--color-pitch-edge)' : border}`,
  boxShadow: active
    ? '0 1px 0 rgba(255,255,255,0.10) inset, 0 6px 18px -6px var(--color-pitch-soft), 0 14px 32px -16px rgba(0,0,0,0.65)'
    : '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 22px -12px rgba(0,0,0,0.5)',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: t.font.sans,
  transition: 'transform 120ms cubic-bezier(.2,.7,.2,1), box-shadow 220ms ease',
})
const swatchRow = { display: 'flex', gap: 4 }
const swatch = (c, ringed) => ({
  width: 18, height: 18, borderRadius: 6,
  background: c,
  border: ringed ? '1.5px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
})
const tileLabel = {
  display: 'flex', flexDirection: 'column', gap: 2,
}
