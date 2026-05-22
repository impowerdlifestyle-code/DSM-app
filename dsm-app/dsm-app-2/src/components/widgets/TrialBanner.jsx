import { tokens as t } from '../../styles.js'

const UPGRADE_URL = import.meta.env.VITE_UPGRADE_URL || 'https://www.fanbasis.com'

export default function TrialBanner({ access }) {
  if (!access || access.reason !== 'trial') return null
  const days = access.trialDaysLeft
  if (days == null) return null

  const urgent = days <= 3
  const label  = days <= 0 ? 'Trial ends today' : days === 1 ? '1 day left' : `${days} days left`

  return (
    <div style={{
      margin: '14px 22px 0',
      padding: '14px 16px',
      background: urgent ? 'rgba(248,113,113,0.08)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${urgent ? 'rgba(248,113,113,0.3)' : t.color.line2}`,
      borderRadius: 14,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: urgent ? t.color.err : t.color.text,
        color: urgent ? t.color.text : t.color.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: t.font.athletic, fontSize: 14, fontWeight: 700,
        flexShrink: 0,
      }}>
        {Math.max(days, 0)}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.6, color: t.color.textMute, fontWeight: 700, textTransform: 'uppercase' }}>
          Trial · {label}
        </div>
        <div style={{ fontSize: 12, color: t.color.text, marginTop: 2, lineHeight: 1.4 }}>
          {urgent
            ? 'Lock in the full DSM program before your trial ends.'
            : 'Full access to Coach V, voice journal, and the program.'}
        </div>
      </div>
      <a href={UPGRADE_URL} target="_blank" rel="noreferrer" style={{
        padding: '8px 14px',
        background: urgent ? t.color.err : t.color.text,
        color: urgent ? t.color.text : t.color.bg,
        borderRadius: 10, textDecoration: 'none',
        fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: 'uppercase',
        fontFamily: t.font.sans, flexShrink: 0,
      }}>
        Upgrade
      </a>
    </div>
  )
}
