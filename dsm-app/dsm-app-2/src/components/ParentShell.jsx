import ParentDashboardTab from './tabs/ParentDashboardTab.jsx'
import { C, tokens as t } from '../styles.js'
import ThemeToggle from './ThemeToggle.jsx'

export default function ParentShell({ user }) {
  return (
    <div style={C.app}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { background: ${t.color.bg}; min-height: 100vh; }
      `}</style>
      <div style={C.hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/dsm-logo.png" alt="DSM" style={{ width: 30, height: 30, objectFit: 'contain' }} />
          <div style={{ fontFamily: t.font.athletic, fontSize: 20, letterSpacing: 1.5, textTransform: 'uppercase' }}>DSM</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ fontSize: 9, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
            Parent
          </div>
          <ThemeToggle size={30} />
        </div>
      </div>
      <ParentDashboardTab user={user} />
    </div>
  )
}
