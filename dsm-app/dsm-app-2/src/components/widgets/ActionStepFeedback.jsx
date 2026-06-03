import { useState } from 'react'
import { reviewActionSteps } from '../../lib/coachV.js'
import { tokens as t, C } from '../../styles.js'

export default function ActionStepFeedback({ submissions = [], athleteName = '' }) {
  const [loading, setLoading] = useState(false)
  const [fb, setFb] = useState(null)
  const [err, setErr] = useState('')

  const count = submissions.length

  async function run() {
    setErr(''); setLoading(true); setFb(null)
    try {
      const res = await reviewActionSteps({ actionSteps: submissions, athleteName })
      setFb(res)
    } catch (e) {
      setErr(e.message || "Coach V couldn't review right now. Try again in a moment.")
    } finally {
      setLoading(false)
    }
  }

  if (!count) return null

  return (
    <div style={{ ...C.card, background: t.color.surface2, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <div>
          <div style={{ ...C.lbl, marginBottom: 2 }}>Coach V · Action-step review</div>
          <div style={{ fontSize: 12, color: t.color.textMute }}>
            {count} log{count === 1 ? '' : 's'} · get clear feedback on your reps
          </div>
        </div>
        {!fb && (
          <button style={{ ...C.bsm, whiteSpace: 'nowrap' }} disabled={loading} onClick={run}>
            {loading ? 'Reading…' : 'Review my reps'}
          </button>
        )}
      </div>

      {err && <div style={{ color: t.color.err, fontSize: 12, marginTop: 10 }}>{err}</div>}

      {fb && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fb.summary && (
            <div style={{ fontSize: 14, lineHeight: 1.55, color: t.color.text }}>{fb.summary}</div>
          )}
          {fb.working && (
            <Row label="Working" color={t.color.ok} text={fb.working} />
          )}
          {fb.adjust && (
            <Row label="Tighten up" color={t.color.coral} text={fb.adjust} />
          )}
          {fb.focus && (
            <div style={{
              background: 'rgba(74,222,128,0.10)', border: `1px solid ${t.color.pitchEdge}`,
              borderRadius: t.radius.md, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 9, letterSpacing: 2, color: t.color.pitch, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
                This week
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.color.text, lineHeight: 1.4 }}>{fb.focus}</div>
            </div>
          )}
          <button style={{ ...C.bsm, background: 'transparent', color: t.color.textDim, border: `1px solid ${t.color.line2}`, boxShadow: 'none', alignSelf: 'flex-start' }}
            onClick={run} disabled={loading}>
            {loading ? 'Reading…' : 'Re-review'}
          </button>
        </div>
      )}
    </div>
  )
}

function Row({ label, color, text }) {
  return (
    <div>
      <div style={{ fontSize: 9, letterSpacing: 2, color, fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13.5, lineHeight: 1.5, color: t.color.textDim }}>{text}</div>
    </div>
  )
}
