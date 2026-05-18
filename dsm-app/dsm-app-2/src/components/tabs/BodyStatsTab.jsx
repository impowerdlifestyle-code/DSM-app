import { useState } from 'react'
import { tokens as t } from '../../styles.js'
import { BODY_STATS_HISTORY, CURRENT_MEASUREMENTS } from '../../data/foods.js'
import LineChart from '../widgets/LineChart.jsx'
import TiltCard from '../widgets/TiltCard.jsx'

export default function BodyStatsTab() {
  const [metric, setMetric] = useState('weight') // weight | bodyFat
  const series = BODY_STATS_HISTORY.map(s => s[metric])
  const latest = series[series.length - 1]
  const earliest = series[0]
  const delta = (latest - earliest).toFixed(1)
  const positive = delta >= 0

  return (
    <div className="fade" style={{ padding: '14px 22px 56px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
          Body · 8-week trend
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
              {latest}
              <span style={{ fontSize: 16, color: t.color.textMute, marginLeft: 6 }}>
                {metric === 'weight' ? 'lb' : '%'}
              </span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
              8-wk change
            </div>
            <div style={{
              fontSize: 16, fontWeight: 700, marginTop: 6,
              color: positive ? (metric === 'weight' ? '#4ade80' : t.color.coral) : (metric === 'bodyFat' ? '#4ade80' : t.color.ember),
              fontVariantNumeric: 'tabular-nums',
            }}>
              {positive ? '+' : ''}{delta} {metric === 'weight' ? 'lb' : '%'}
            </div>
          </div>
        </div>
        <LineChart data={series} height={120} />
      </div>
      </TiltCard>

      {/* Snapshot grid */}
      <span style={{
        fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600,
        textTransform: 'uppercase', display: 'block', marginBottom: 10,
      }}>Snapshot</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
        {[
          ['Chest',      CURRENT_MEASUREMENTS.chest,  'in'],
          ['Waist',      CURRENT_MEASUREMENTS.waist,  'in'],
          ['Arm',        CURRENT_MEASUREMENTS.arm,    'in'],
          ['Thigh',      CURRENT_MEASUREMENTS.thigh,  'in'],
          ['Resting HR', CURRENT_MEASUREMENTS.resting_hr, 'bpm'],
          ['VO₂ max',    CURRENT_MEASUREMENTS.vo2,    'ml/kg'],
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
              {val}
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
        {['Front', 'Side', 'Back'].map(angle => (
          <TiltCard key={angle} tiltLimit={14} scale={1.04} style={{ borderRadius: 12 }}>
          <div style={{
            aspectRatio: '3/4',
            background: t.color.surface, border: `1px dashed ${t.color.line2}`,
            borderRadius: 12,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 6, cursor: 'pointer',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `1px solid ${t.color.line2}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, color: t.color.textDim,
            }}>+</div>
            <div style={{
              fontSize: 9, letterSpacing: 1.6, color: t.color.textMute,
              fontWeight: 600, textTransform: 'uppercase',
            }}>{angle}</div>
          </div>
          </TiltCard>
        ))}
      </div>
      <div style={{ fontSize: 11, color: t.color.textMute, textAlign: 'center', marginBottom: 18 }}>
        Take weekly. Same time, same lighting, same pose.
      </div>

      <button style={{
        width: '100%', padding: '14px 20px',
        background: t.color.ember, color: t.color.bg,
        border: 'none', borderRadius: 12,
        fontSize: 12, fontWeight: 600, letterSpacing: 1.6, textTransform: 'uppercase',
        cursor: 'pointer', fontFamily: t.font.sans,
        boxShadow: t.shadow.ember,
      }}>Log today&rsquo;s measurements</button>
    </div>
  )
}
