import { useState } from 'react'
import { tokens as t, C } from '../../styles.js'
import { getLockerRoomData, deleteAccount } from '../../lib/supabase.js'
import { PRIVACY_URL, TERMS_URL, SUPPORT_EMAIL } from '../../lib/platform.js'

export default function SettingsTab({ user, profile }) {
  const [exporting, setExporting] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  async function exportData() {
    setErr(''); setExporting(true)
    try {
      const data = await getLockerRoomData(user.id, { isAdmin: false })
      const { exportLockerPdf } = await import('../../lib/lockerPdf.js')
      exportLockerPdf(data)
    } catch (e) {
      setErr('Could not build your export. Try again in a moment.')
    } finally {
      setExporting(false)
    }
  }

  async function runDelete() {
    if (confirmText.trim().toUpperCase() !== 'DELETE') return
    setErr(''); setDeleting(true)
    const { error } = await deleteAccount()
    if (error) {
      setDeleting(false)
      setErr(error.message || 'Could not delete account. Email support.')
      return
    }
    // Auth state listener in App.jsx will route back to the sign-in screen.
  }

  const linkRow = (label, href, sub) => (
    <a href={href} target="_blank" rel="noreferrer" style={{
      display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none',
      padding: 16, marginBottom: 10, background: t.color.surface,
      border: `1px solid ${t.color.line}`, borderRadius: 14, color: t.color.text,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: t.font.athletic, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 3, letterSpacing: 0.6 }}>{sub}</div>
      </div>
      <div style={{ fontSize: 16, color: t.color.textMute }}>↗</div>
    </a>
  )

  return (
    <div className="fade" style={C.scroll}>
      <div style={C.title}>Settings</div>
      <div style={C.sub}>Account · privacy · data</div>

      {/* Account */}
      <div style={{ ...C.card }}>
        <div style={C.lbl}>Account</div>
        <div style={{ fontSize: 13, color: t.color.text, marginTop: 4 }}>{profile?.full_name || user?.email}</div>
        <div style={{ fontSize: 12, color: t.color.textMute, marginTop: 2 }}>{user?.email}</div>
      </div>

      {/* Legal */}
      <div style={{ marginTop: 6 }}>
        {linkRow('Privacy Policy', PRIVACY_URL, 'What we collect, how it’s used, your rights')}
        {linkRow('Terms of Service', TERMS_URL, 'The rules of using DSM')}
      </div>

      {/* Data export */}
      <button onClick={exportData} disabled={exporting} style={{
        width: '100%', textAlign: 'left', padding: 16, marginBottom: 10,
        background: t.color.surface, border: `1px solid ${t.color.line}`,
        borderRadius: 14, cursor: 'pointer', fontFamily: 'inherit', color: t.color.text,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: t.font.athletic, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase' }}>
            {exporting ? 'Building…' : 'Download my data'}
          </div>
          <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 3, letterSpacing: 0.6 }}>
            Export everything DSM has on you as a PDF
          </div>
        </div>
        <div style={{ fontSize: 16, color: t.color.textMute }}>↓</div>
      </button>

      {/* Danger zone */}
      <div style={{ marginTop: 18 }}>
        <div style={{ ...C.lbl, color: t.color.err }}>Danger zone</div>
        {!confirm ? (
          <button onClick={() => setConfirm(true)} style={{
            width: '100%', padding: 14, background: 'transparent',
            border: `1px solid ${t.color.err}`, borderRadius: 12,
            color: t.color.err, fontSize: 12, fontWeight: 700, letterSpacing: 1.2,
            textTransform: 'uppercase', cursor: 'pointer', fontFamily: t.font.sans,
          }}>Delete my account</button>
        ) : (
          <div style={{ ...C.card, border: `1px solid ${t.color.err}` }}>
            <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5, marginBottom: 10 }}>
              This permanently deletes your account and <b>all</b> your data — action steps, journals,
              matches, chats with Coach V, badges. This can’t be undone.
            </div>
            <div style={{ ...C.lbl, marginBottom: 6 }}>Type DELETE to confirm</div>
            <input
              style={{ ...C.inp, marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' }}
              value={confirmText}
              onChange={e => setConfirmText(e.target.value)}
              placeholder="DELETE"
            />
            <button onClick={runDelete} disabled={confirmText.trim().toUpperCase() !== 'DELETE' || deleting}
              style={{
                width: '100%', padding: 14, marginBottom: 8,
                background: confirmText.trim().toUpperCase() === 'DELETE' ? t.color.err : t.color.surface2,
                border: 'none', borderRadius: 12,
                color: confirmText.trim().toUpperCase() === 'DELETE' ? '#fff' : t.color.textMute,
                fontSize: 12, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
                cursor: confirmText.trim().toUpperCase() === 'DELETE' ? 'pointer' : 'not-allowed', fontFamily: t.font.sans,
              }}>{deleting ? 'Deleting…' : 'Permanently delete'}</button>
            <button onClick={() => { setConfirm(false); setConfirmText('') }} style={{
              width: '100%', padding: 12, background: 'transparent',
              border: `1px solid ${t.color.line2}`, borderRadius: 12,
              color: t.color.textDim, fontSize: 12, fontWeight: 700, letterSpacing: 1.2,
              textTransform: 'uppercase', cursor: 'pointer', fontFamily: t.font.sans,
            }}>Cancel</button>
          </div>
        )}
      </div>

      {err && <div style={{ color: t.color.err, fontSize: 12, marginTop: 12 }}>{err}</div>}

      <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 18, lineHeight: 1.5, textAlign: 'center' }}>
        Need help? <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: t.color.textDim }}>{SUPPORT_EMAIL}</a>
      </div>
    </div>
  )
}
