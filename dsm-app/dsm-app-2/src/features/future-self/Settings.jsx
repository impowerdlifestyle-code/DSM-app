import { useEffect, useState } from 'react'
import { tokens as t } from '../../styles.js'
import { supabase } from '../../lib/supabase.js'

// Coach V voice — clip management. Lists every personalized message the
// athlete has been sent, lets them play it back (signed URL) or delete it,
// and shows recent activity from the audit log.
// Mounted from PlayerTab → 'Voice' sub-tab.

export default function Settings({ user }) {
  const [clips, setClips] = useState([])
  const [audit, setAudit] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyClipId, setBusyClipId] = useState(null)

  async function refresh() {
    if (!user?.id) return
    setLoading(true)
    try {
      const [clipsRes, auditRes] = await Promise.all([
        supabase.from('future_self_clips').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('voice_audit_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])
      setClips(clipsRes.data || [])
      setAudit(auditRes.data || [])
    } catch (e) {
      setError(e?.message || 'Could not load Coach V settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function playClip(clip) {
    if (!clip.audio_url) return
    const { data: signed } = await supabase.storage.from('future-self-audio').createSignedUrl(clip.audio_url, 3600)
    if (!signed?.signedUrl) return
    new Audio(signed.signedUrl).play().catch(() => { /* gesture required */ })
  }

  async function deleteClip(clip) {
    setBusyClipId(clip.id); setError('')
    try {
      const res = await fetch('/api/future-self/delete-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, clipId: clip.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Delete failed (${res.status})`)
      setClips(prev => prev.filter(c => c.id !== clip.id))
      refresh()
    } catch (e) {
      setError(e?.message || 'Could not delete clip')
    } finally {
      setBusyClipId(null)
    }
  }

  if (loading) return <div style={muted}>Loading Coach V messages…</div>

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* Clips */}
      <div style={card}>
        <div style={lbl}>Coach V messages ({clips.length})</div>
        <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 6, lineHeight: 1.5 }}>
          Every personalized message Coach V has recorded for you. Play any of them again, or delete what you don't want kept.
        </div>
        {clips.length === 0 && (
          <div style={{ ...muted, marginTop: 12 }}>No messages yet. Pre-match, post-mistake, and monthly check-ins will land here.</div>
        )}
        {clips.map(clip => (
          <div key={clip.id} style={clipRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1.4, fontWeight: 700, textTransform: 'uppercase' }}>
                {clip.context.replace(/_/g, ' ')} · {new Date(clip.created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize: 13, color: t.color.text, marginTop: 4, lineHeight: 1.4,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {clip.script}
              </div>
            </div>
            <button style={ghostBtnSmall} onClick={() => playClip(clip)}>Play</button>
            <button
              style={dangerBtnSmall}
              onClick={() => deleteClip(clip)}
              disabled={busyClipId === clip.id}
            >
              {busyClipId === clip.id ? '…' : 'Delete'}
            </button>
          </div>
        ))}
      </div>

      {/* Audit log */}
      <div style={card}>
        <div style={lbl}>Recent activity</div>
        {audit.length === 0 && <div style={{ ...muted, marginTop: 6 }}>No activity yet.</div>}
        {audit.map(row => (
          <div key={row.id} style={auditRow}>
            <span style={{ fontSize: 11, color: t.color.textMute, letterSpacing: 1.2, fontWeight: 600, textTransform: 'uppercase' }}>
              {row.event.replace(/_/g, ' ')}
            </span>
            <span style={{ fontSize: 11, color: t.color.textDim }}>
              {new Date(row.created_at).toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      {error && <div style={errStyle}>{error}</div>}
    </div>
  )
}

const card = {
  background: t.color.surface,
  border: `1px solid ${t.color.line2}`,
  borderRadius: t.radius.lg,
  padding: 16, marginBottom: 14,
}
const lbl = {
  fontSize: 9, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 700,
  textTransform: 'uppercase',
}
const muted = { fontSize: 12, color: t.color.textDim, lineHeight: 1.5 }
const clipRow = {
  display: 'flex', alignItems: 'center', gap: 8,
  padding: '10px 0',
  borderBottom: `1px solid ${t.color.line}`,
}
const auditRow = {
  display: 'flex', justifyContent: 'space-between', gap: 10,
  padding: '6px 0', borderBottom: `1px solid ${t.color.line}`,
}
const dangerBtnSmall = {
  padding: '6px 10px', background: 'transparent',
  border: '1px solid rgba(248,113,113,0.4)', color: '#f87171',
  borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
  cursor: 'pointer', flexShrink: 0,
}
const ghostBtnSmall = {
  padding: '6px 10px',
  background: 'transparent', border: `1px solid ${t.color.line2}`,
  color: t.color.text, borderRadius: 8,
  fontSize: 10, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase',
  cursor: 'pointer', flexShrink: 0,
}
const errStyle = {
  marginTop: 10, padding: '8px 10px',
  background: 'rgba(248,113,113,0.08)',
  border: '1px solid rgba(248,113,113,0.3)',
  borderRadius: 8, fontSize: 12, color: '#f87171',
}
