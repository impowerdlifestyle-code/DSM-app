import { useTheme } from '../lib/theme.jsx'
import { tokens as t } from '../styles.js'

// Inline sun/moon icon toggle. One tap flips between Onyx (dark) and
// Daylight (light). Shown in the app header so users can switch without
// digging into the More menu. The icon shown is the destination state —
// sun when you're on Onyx (tap to go to Daylight), moon when on Daylight.
export default function ThemeToggle({ size = 32, ariaLabel = 'Toggle theme' }) {
  const { themeId, setTheme } = useTheme()
  const isDark = themeId === 'onyx'
  const next = isDark ? 'daylight' : 'onyx'

  return (
    <button
      onClick={() => setTheme(next)}
      aria-label={`${ariaLabel} — switch to ${next}`}
      title={`Switch to ${isDark ? 'Daylight' : 'Onyx'}`}
      style={{
        width: size, height: size, minWidth: size,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent',
        border: `1px solid ${t.color.line2}`,
        borderRadius: '50%',
        color: t.color.text,
        cursor: 'pointer', fontFamily: 'inherit',
        transition: 'transform 120ms ease, background 120ms ease',
        padding: 0,
      }}
    >
      {isDark ? (
        // Sun — currently dark, tap to switch to light
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon — currently light, tap to switch to dark
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
