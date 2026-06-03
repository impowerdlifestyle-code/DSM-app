import { useState } from 'react'
import ParentDashboardTab from './tabs/ParentDashboardTab.jsx'
import ParentCoachTab from './tabs/ParentCoachTab.jsx'
import { C, tokens as t } from '../styles.js'
import ThemeToggle from './ThemeToggle.jsx'

const TABS = [
  { id: 'dash',  label: 'Dashboard' },
  { id: 'coach', label: 'Parent Coach' },
]

export default function ParentShell({ user }) {
  const [tab, setTab] = useState('dash')
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

      <div style={{
        display: 'flex', gap: 4, padding: 4, margin: '14px 22px 0',
        background: t.color.surface, border: `1px solid ${t.color.line}`, borderRadius: t.radius.full,
      }}>
        {TABS.map(x => {
          const active = tab === x.id
          return (
            <button key={x.id} onClick={() => setTab(x.id)}
              style={{
                flex: 1, padding: '9px 0', borderRadius: t.radius.full, cursor: 'pointer',
                border: 'none',
                background: active ? t.color.text : 'transparent',
                color: active ? t.color.bg : t.color.textMute,
                fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
                fontFamily: t.font.sans, transition: `all ${t.motion.fast}`,
              }}>
              {x.label}
            </button>
          )
        })}
      </div>

      {tab === 'dash' ? <ParentDashboardTab user={user} /> : <ParentCoachTab user={user} />}
    </div>
  )
}
