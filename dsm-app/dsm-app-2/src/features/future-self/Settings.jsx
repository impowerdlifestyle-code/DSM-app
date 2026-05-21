import { useEffect, useState } from 'react'
import { tokens as t } from '../../styles.js'
import { supabase } from '../../lib/supabase.js'
import { getVoiceIdentity } from './lib/voiceIdentity.js'

// Future-self management surface: identity status, every generated clip,
// per-clip delete, full-wipe danger button, and a recent audit trail.
// Mounted from PlayerTab → 'Voice' sub-tab.

export default function Settings({ user }) {
  const [identity, setIdentity] = useState(null)
  const [clips, setClips] = useState([])
  const [audit, setAudit] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [wiping, setWiping] = useState(false)
  const [busyClipId, setBusyClipId] = useState(null)

  async function refresh() {
    if (!user?.id) return
    setLoading(true)
    try {
      const [idRes, clipsRes, auditRes] = await Promise.all([
        getVoiceIdentity(user.id),
        supabase.from('future_self_clips').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('voice_audit_log').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      ])
      setIdentity(idRes.data)
      setClips(clipsRes.data || [])
      setAudit(auditRes.data || [])
    } catch (e) {
      setError(e?.message || 'Could not load Future Self settings')
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

  async function wipeIdentity() {
    setWiping(true); setError('')
    try {
      const res = await fetch('/api/future-self/delete-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Wipe failed (${res.status})`)
      setConfirming(false)
      refresh()
    } catch (e) {
      setError(e?.message || 'Could not wipe voice identity')
    } finally {
      setWiping(false)
    }
  }

  if (loading) return <div style={muted}>Loading Future Self settings…</div>

  return (
    <div style={{ paddingBottom: 30 }}>
      {/* Identity status */}
      <div style={card}>
        <div style={lbl}>Voice identity</div>
        {!identity && (
          <div style={{ ...body, marginTop: 6 }}>
            No voice identity on file. Complete consent and capture to enable Future Self.
          </div>
        )}
        {identity && (
          <>
            <Row k="Status" v={identity.elevenlabs_voice_id ? 'Active' : 'Not cloned yet'} />
            <Row k="Consented" v={identity.consent_given_at ? new Date(identity.consent_given_at).toLocaleDateString() : '—'} />
            <Row k="Identity statement" v={identity.identity_statement || '—'} truncate />
            {identity.elevenlabs_voice_id && (
              <button
                style={dangerBtn}
                onClick={() => setConfirming(true)}
                disabled={wiping}
              >
                Wipe my voice identity
              </button>
            )}
          </>
        )}
        {confirming && (
          <div style={{ marginTop: 12, padding: 12, border: `1px solid ${t.color.line2}`, borderRadius: t.radius.md, background: 'rgba(248,113,113,0.05)' }}>
            <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>
              This deletes your cloned voice from ElevenLabs, removes every clip and recording,
              and you can't undo it. You can record again later — but it'll be a new voice.
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button style={dangerBtnSolid} onClick={wipeIdentity} disabled={wiping}>
                {wiping ? 'Wiping…' : 'Yes — delete everything'}
              </button>
              <button style={ghostBtn} onClick={() => setConfirming(false)} disabled={wiping}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Clips */}
      <div style={card}>
        <div style={lbl}>Clips ({clips.length})</div>
        {clips.length === 0 && (
          <div style={{ ...muted, marginTop: 6 }}>No clips generated yet.</div>
        )}
        {clips.map(clip => (
          <div key={clip.id} style={clipRow}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1.4, fontWeight: 700, textTransform: 'uppercase' }}>
                {clip.context} · {new Date(clip.created_at).toLocaleDateString()}
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

function Row({ k, v, truncate }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '6px 0', borderBottom: `1px solid ${t.color.line}` }}>
      <span style={{ fontSize: 11, color: t.color.textMute, letterSpacing: 1.2, fontWeight: 600, textTransform: 'uppercase', flexShrink: 0 }}>{k}</span>
      <span style={{
        fontSize: 12, color: t.color.text, textAlign: 'right',
        maxWidth: '60%',
        ...(truncate ? { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } : {}),
      }}>{v}</span>
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
const body = { fontSize: 13, color: t.color.text, lineHeight: 1.5 }
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
const dangerBtn = {
  marginTop: 12, padding: '10px 14px',
  background: 'transparent', border: '1px solid rgba(248,113,113,0.4)',
  color: '#f87171', borderRadius: t.radius.md,
  fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
  cursor: 'pointer',
}
const dangerBtnSolid = {
  padding: '10px 14px',
  background: '#f87171', color: t.color.bg, border: 'none',
  borderRadius: t.radius.md,
  fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
  cursor: 'pointer', flex: 1,
}
const dangerBtnSmall = {
  padding: '6px 10px', background: 'transparent',
  border: '1px solid rgba(248,113,113,0.4)', color: '#f87171',
  borderRadius: 8, fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
  cursor: 'pointer', flexShrink: 0,
}
const ghostBtn = {
  padding: '10px 14px',
  background: 'transparent', border: `1px solid ${t.color.line2}`,
  color: t.color.text, borderRadius: t.radius.md,
  fontSize: 11, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase',
  cursor: 'pointer', flex: 1,
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
