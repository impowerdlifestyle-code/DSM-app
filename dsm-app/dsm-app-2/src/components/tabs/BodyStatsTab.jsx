import { useState, useEffect, useMemo } from 'react'
import { tokens as t } from '../../styles.js'
import { CURRENT_MEASUREMENTS } from '../../data/foods.js'
import { getBodyStatsHistory, logBodyStats, getProgressPhotos, uploadProgressPhoto } from '../../lib/supabase.js'
import LineChart from '../widgets/LineChart.jsx'
import TiltCard from '../widgets/TiltCard.jsx'

export default function BodyStatsTab({ user }) {
  const [metric, setMetric] = useState('weight') // weight | bodyFat
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [showLog, setShowLog] = useState(false)
  const [photos, setPhotos] = useState([])

  useEffect(() => {
    if (!user?.id) return
    let alive = true
    ;(async () => {
      setLoading(true)
      const [{ data: hist }, { data: ph }] = await Promise.all([
        getBodyStatsHistory(user.id, 24),
        getProgressPhotos(user.id, 12),
      ])
      if (!alive) return
      setHistory(hist || [])
      setPhotos(ph || [])
      setLoading(false)
    })()
    return () => { alive = false }
  }, [user?.id])

  // Map DB rows -> chart-friendly { date, weight, bodyFat }
  const mapped = useMemo(() => history.map(r => ({
    date: r.measured_at,
    weight: r.weight != null ? Number(r.weight) : null,
    bodyFat: r.body_fat != null ? Number(r.body_fat) : null,
  })).filter(r => r[metric] != null), [history, metric])

  const series = mapped.map(r => r[metric])
  const latestRow = history[history.length - 1]
  const latest = series.length ? series[series.length - 1] : null
  const earliest = series.length ? series[0] : null
  const delta = (series.length && earliest != null) ? (latest - earliest).toFixed(1) : null
  const positive = delta != null && delta >= 0

  // Snapshot: prefer latest DB row, else fall back to mock CURRENT_MEASUREMENTS
  const snap = latestRow ? {
    weight:     latestRow.weight,
    bodyFat:    latestRow.body_fat,
    chest:      latestRow.chest,
    waist:      latestRow.waist,
    arm:        latestRow.arm,
    thigh:      latestRow.thigh,
    resting_hr: latestRow.resting_hr,
    vo2:        latestRow.vo2,
  } : CURRENT_MEASUREMENTS

  const empty = !loading && history.length === 0

  return (
    <div className="fade" style={{ padding: '14px 22px 56px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
          Body · {history.length ? `${history.length}-entry trend` : 'No data yet'}
        </div>
        <h2 style={{
          fontFamily: t.font.display, fontSize: 32, fontWeight: 500,
          color: t.color.text, marginTop: 4, letterSpacing: -0.5, lineHeight: 1.05,
        }}>
          Track the <span style={{ color: t.color.ember, fontStyle: 'italic' }}>shape</span> of progress.
        </h2>
      </div>

      {/* Metric toggle */}
      <div style={{
        display: 'flex', gap: 4, padding: 4,
        background: t.color.surface, border: `1px solid ${t.color.line}`,
        borderRadius: t.radius.full, marginBottom: 14,
      }}>
        {[
          { id: 'weight',  label: 'Weight',    unit: 'lb' },
          { id: 'bodyFat', label: 'Body fat',  unit: '%' },
        ].map(m => {
          const a = metric === m.id
          return (
            <button key={m.id} onClick={() => setMetric(m.id)} style={{
              flex: 1, padding: '9px 0',
              fontSize: 11, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase',
              color: a ? t.color.bg : t.color.textDim,
              background: a ? t.color.text : 'transparent',
              border: 'none', borderRadius: t.radius.full,
              cursor: 'pointer', fontFamily: t.font.sans,
              transition: `all ${t.motion.fast}`,
            }}>{m.label}</button>
          )
        })}
      </div>

      {/* Chart card */}
      <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: t.radius.lg, marginBottom: 18 }}>
      <div style={{
        background: t.color.surface, border: `1px solid ${t.color.line}`,
        borderRadius: t.radius.lg, padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
              Current
            </div>
            <div style={{
              fontFamily: t.font.display, fontSize: 40, fontWeight: 500,
              color: t.color.text, marginTop: 2, letterSpacing: -0.8, lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {latest != null ? latest : '—'}
              <span style={{ fontSize: 16, color: t.color.textMute, marginLeft: 6 }}>
                {metric === 'weight' ? 'lb' : '%'}
              </span>
            </div>
          </div>
          {delta != null && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
                Δ since first
              </div>
              <div style={{
                fontSize: 16, fontWeight: 700, marginTop: 6,
                color: positive ? (metric === 'weight' ? t.color.pitch : t.color.coral) : (metric === 'bodyFat' ? t.color.pitch : t.color.ember),
                fontVariantNumeric: 'tabular-nums',
              }}>
                {positive ? '+' : ''}{delta} {metric === 'weight' ? 'lb' : '%'}
              </div>
            </div>
          )}
        </div>
        {series.length > 1 ? (
          <LineChart data={series} height={120} />
        ) : (
          <div style={{
            height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: t.color.textMute, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600,
          }}>
            Log at least 2 measurements to see a trend.
          </div>
        )}
      </div>
      </TiltCard>

      {/* Snapshot grid */}
      <span style={{
        fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600,
        textTransform: 'uppercase', display: 'block', marginBottom: 10,
      }}>Snapshot{empty && ' · sample'}</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
        {[
          ['Chest',      snap.chest,  'in'],
          ['Waist',      snap.waist,  'in'],
          ['Arm',        snap.arm,    'in'],
          ['Thigh',      snap.thigh,  'in'],
          ['Resting HR', snap.resting_hr, 'bpm'],
          ['VO₂ max',    snap.vo2,    'ml/kg'],
        ].map(([label, val, unit]) => (
          <TiltCard key={label} tiltLimit={12} scale={1.04} style={{ borderRadius: 12 }}>
          <div style={{
            background: t.color.surface, border: `1px solid ${t.color.line}`,
            borderRadius: 12, padding: 14,
          }}>
            <div style={{
              fontSize: 9, letterSpacing: 2, color: t.color.textMute,
              fontWeight: 600, textTransform: 'uppercase',
            }}>{label}</div>
            <div style={{
              fontFamily: t.font.athletic, fontSize: 32, fontWeight: 400,
              color: t.color.text, marginTop: 4, lineHeight: 0.9, letterSpacing: 0.5,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {val != null ? val : '—'}
              <span style={{ fontSize: 12, color: t.color.textMute, marginLeft: 4, letterSpacing: 0 }}>{unit}</span>
            </div>
          </div>
          </TiltCard>
        ))}
      </div>

      {/* Progress photos */}
      <span style={{
        fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600,
        textTransform: 'uppercase', display: 'block', marginBottom: 10,
      }}>Progress photos</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
        {['Front', 'Side', 'Back'].map(angle => {
          const latest = photos.find(p => p.angle === angle)
          return <PhotoSlot key={angle} angle={angle} photo={latest} userId={user?.id} onUploaded={(p) => setPhotos(prev => [p, ...prev])} />
        })}
      </div>
      <div style={{ fontSize: 11, color: t.color.textMute, textAlign: 'center', marginBottom: 18 }}>
        Take weekly. Same time, same lighting, same pose.
      </div>

      <button onClick={() => setShowLog(true)} style={{
        width: '100%', padding: '14px 20px',
        background: t.color.ember, color: t.color.bg,
        border: 'none', borderRadius: 12,
        fontSize: 12, fontWeight: 600, letterSpacing: 1.6, textTransform: 'uppercase',
        cursor: 'pointer', fontFamily: t.font.sans,
        boxShadow: t.shadow.ember,
      }}>Log today&rsquo;s measurements</button>

      {showLog && (
        <LogSheet
          user={user}
          previous={snap}
          onClose={() => setShowLog(false)}
          onSaved={(row) => {
            setHistory(h => [...h, row])
            setShowLog(false)
          }}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */

function PhotoSlot({ angle, photo, userId, onUploaded }) {
  const [busy, setBusy] = useState(false)
  async function onChange(e) {
    const file = e.target.files?.[0]
    if (!file || !userId) return
    setBusy(true)
    const { data, error } = await uploadProgressPhoto(userId, angle, file)
    setBusy(false)
    if (!error && data) {
      // re-create signed URL for instant preview
      onUploaded({ ...data, url: URL.createObjectURL(file) })
    } else if (error) {
      alert(`Upload failed: ${error.message}`)
    }
  }
  return (
    <TiltCard tiltLimit={14} scale={1.04} style={{ borderRadius: 12 }}>
      <label style={{
        display: 'block', aspectRatio: '3/4',
        background: photo?.url ? `url(${photo.url}) center/cover` : t.color.surface,
        border: `1px ${photo?.url ? 'solid' : 'dashed'} ${photo?.url ? t.color.line2 : t.color.line2}`,
        borderRadius: 12, cursor: 'pointer', position: 'relative', overflow: 'hidden',
      }}>
        <input type="file" accept="image/*" capture="user" onChange={onChange}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
        {!photo?.url && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `1px solid ${t.color.line2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: t.color.textDim,
            }}>{busy ? '⋯' : '+'}</div>
            <div style={{
              fontSize: 9, letterSpacing: 1.6, color: t.color.textMute,
              fontWeight: 600, textTransform: 'uppercase',
            }}>{angle}</div>
          </div>
        )}
        {photo?.url && (
          <div style={{
            position: 'absolute', left: 8, bottom: 8,
            padding: '4px 8px', background: 'rgba(0,0,0,0.7)',
            fontSize: 9, letterSpacing: 1.6, color: t.color.text, fontWeight: 700,
            textTransform: 'uppercase', borderRadius: 4,
          }}>{angle}</div>
        )}
      </label>
    </TiltCard>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */

function LogSheet({ user, previous, onClose, onSaved }) {
  const [form, setForm] = useState({
    weight: previous.weight ?? '',
    bodyFat: previous.bodyFat ?? '',
    chest: previous.chest ?? '',
    waist: previous.waist ?? '',
    arm: previous.arm ?? '',
    thigh: previous.thigh ?? '',
    resting_hr: previous.resting_hr ?? '',
    vo2: previous.vo2 ?? '',
  })
  const [saving, setSaving] = useState(false)

  function set(k, v) { setForm(prev => ({ ...prev, [k]: v })) }

  async function save() {
    if (!user?.id) return
    setSaving(true)
    const numeric = Object.fromEntries(Object.entries(form).map(([k, v]) => {
      if (v === '' || v == null) return [k, null]
      const n = Number(v)
      return [k, Number.isFinite(n) ? n : null]
    }))
    const { data, error } = await logBodyStats(user.id, numeric)
    setSaving(false)
    if (error) { alert(`Save failed: ${error.message}`); return }
    onSaved(data)
  }

  const fields = [
    ['weight',     'Weight',     'lb'],
    ['bodyFat',    'Body fat',   '%'],
    ['chest',      'Chest',      'in'],
    ['waist',      'Waist',      'in'],
    ['arm',        'Arm',        'in'],
    ['thigh',      'Thigh',      'in'],
    ['resting_hr', 'Resting HR', 'bpm'],
    ['vo2',        'VO₂ max',    'ml/kg'],
  ]

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: t.color.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22,
        width: '100%', maxWidth: 440, maxHeight: '85vh', overflowY: 'auto',
        padding: 22, borderTop: `1px solid ${t.color.line2}`,
        boxShadow: t.shadow.raised,
      }}>
        <div style={{ width: 36, height: 4, background: t.color.line2, borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
          <h3 style={{ fontFamily: t.font.display, fontSize: 22, fontWeight: 500, color: t.color.text, letterSpacing: -0.4 }}>
            Today&rsquo;s measurements
          </h3>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: t.color.textMute,
            fontSize: 13, cursor: 'pointer', fontFamily: t.font.sans, fontWeight: 600,
            letterSpacing: 1.4, textTransform: 'uppercase',
          }}>Cancel</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {fields.map(([k, label, unit]) => (
            <label key={k} style={{ display: 'block' }}>
              <div style={{ fontSize: 9, letterSpacing: 1.6, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>
                {label} <span style={{ color: t.color.line2 }}>· {unit}</span>
              </div>
              <input
                inputMode="decimal"
                value={form[k]}
                onChange={(e) => set(k, e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '11px 12px',
                  background: t.color.bg, border: `1px solid ${t.color.line2}`,
                  borderRadius: 10, color: t.color.text, fontSize: 15,
                  fontFamily: t.font.sans, outline: 'none',
                  fontVariantNumeric: 'tabular-nums',
                }}
              />
            </label>
          ))}
        </div>

        <button onClick={save} disabled={saving} style={{
          marginTop: 16, width: '100%', padding: '14px 20px',
          background: t.color.text, color: t.color.bg,
          border: 'none', borderRadius: 12,
          fontSize: 12, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase',
          cursor: saving ? 'wait' : 'pointer', fontFamily: t.font.sans,
          opacity: saving ? 0.7 : 1,
        }}>{saving ? 'Saving…' : 'Save measurements'}</button>
      </div>
    </div>
  )
}
