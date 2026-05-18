import { useState, useMemo } from 'react'
import { tokens as t } from '../../styles.js'
import { FOODS, NUTRITION_TARGETS, SEED_FOOD_LOG, WEEKLY_TREND } from '../../data/foods.js'
import MacroRing from '../widgets/MacroRing.jsx'
import TiltCard from '../widgets/TiltCard.jsx'

const findFood = (id) => FOODS.find(f => f.id === id)
const MEAL_ORDER = ['Breakfast', 'Snack', 'Lunch', 'Dinner']

export default function NutritionTab() {
  const [log, setLog] = useState(SEED_FOOD_LOG)
  const [picking, setPicking] = useState(null) // meal name or null
  const [q, setQ] = useState('')

  const totals = useMemo(() => {
    return log.reduce((a, entry) => {
      const f = findFood(entry.foodId)
      if (!f) return a
      const m = entry.qty || 1
      return {
        cal: a.cal + f.cal * m,
        p: a.p + f.p * m,
        c: a.c + f.c * m,
        f: a.f + f.f * m,
      }
    }, { cal: 0, p: 0, c: 0, f: 0 })
  }, [log])

  const filteredFoods = useMemo(() => {
    const ql = q.toLowerCase().trim()
    return FOODS
      .filter(f => !ql || f.name.toLowerCase().includes(ql))
      .sort((a, b) => (a.fav === b.fav ? 0 : a.fav ? -1 : 1))
  }, [q])

  const grouped = useMemo(() => {
    const g = {}
    MEAL_ORDER.forEach(m => g[m] = [])
    log.forEach(entry => { (g[entry.meal] = g[entry.meal] || []).push(entry) })
    return g
  }, [log])

  return (
    <div className="fade" style={{ padding: '14px 22px 56px' }}>
      {/* Eyebrow + date */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
          Today · Nutrition
        </div>
        <h2 style={{
          fontFamily: t.font.display, fontSize: 32, fontWeight: 500,
          color: t.color.text, marginTop: 4, letterSpacing: -0.5, lineHeight: 1.05,
        }}>
          {totals.cal >= NUTRITION_TARGETS.cal * 0.95 && totals.cal <= NUTRITION_TARGETS.cal * 1.05
            ? <>On <span style={{ color: t.color.ember, fontStyle: 'italic' }}>target</span></>
            : totals.cal < NUTRITION_TARGETS.cal * 0.7
              ? <>Fuel <span style={{ color: t.color.ember, fontStyle: 'italic' }}>up</span></>
              : <>Stay <span style={{ color: t.color.ember, fontStyle: 'italic' }}>locked in</span></>}
        </h2>
      </div>

      {/* Macro ring */}
      <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: t.radius.lg, marginBottom: 14 }}>
      <div style={{
        background: t.color.surface, border: `1px solid ${t.color.line}`,
        borderRadius: t.radius.lg, padding: 20,
      }}>
        <MacroRing totals={totals} targets={NUTRITION_TARGETS} />
      </div>
      </TiltCard>

      {/* Weekly trend */}
      <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: t.radius.lg, marginBottom: 18 }}>
      <div style={{
        background: t.color.surface, border: `1px solid ${t.color.line}`,
        borderRadius: t.radius.lg, padding: 18,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>7-day average</div>
            <div style={{
              fontFamily: t.font.display, fontSize: 26, fontWeight: 500,
              color: t.color.text, marginTop: 2, letterSpacing: -0.4,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {Math.round(WEEKLY_TREND.reduce((a, b) => a + b, 0) / WEEKLY_TREND.length)}
              <span style={{ fontSize: 13, color: t.color.textMute, marginLeft: 6 }}>kcal/day</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#4ade80', fontWeight: 600 }}>+3% vs. last week</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 50, marginTop: 12 }}>
          {WEEKLY_TREND.map((v, i) => {
            const max = Math.max(...WEEKLY_TREND)
            const pct = (v / max) * 100
            const isToday = i === WEEKLY_TREND.length - 1
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: `${pct}%`,
                  background: isToday ? t.color.ember : t.color.line2,
                  borderRadius: 4,
                  transition: 'height 500ms cubic-bezier(.2,.7,.2,1)',
                }} />
                <span style={{ fontSize: 9, color: t.color.textMute, letterSpacing: 1, fontWeight: 600 }}>
                  {['M','T','W','T','F','S','S'][i]}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      </TiltCard>

      {/* Meals */}
      {MEAL_ORDER.map(meal => {
        const items = grouped[meal] || []
        const mealCal = items.reduce((a, e) => a + (findFood(e.foodId)?.cal || 0) * (e.qty || 1), 0)
        return (
          <div key={meal} style={{ marginBottom: 18 }}>
            <div style={{
              display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
              marginBottom: 8,
            }}>
              <div style={{
                fontFamily: t.font.display, fontSize: 20, fontWeight: 500,
                color: t.color.text, letterSpacing: -0.3,
              }}>{meal}</div>
              <div style={{ fontSize: 11, color: t.color.textMute, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                {mealCal} kcal
              </div>
            </div>

            {items.length === 0 ? (
              <button onClick={() => setPicking(meal)} style={{
                width: '100%', padding: '14px 16px',
                background: 'transparent', border: `1px dashed ${t.color.line2}`,
                borderRadius: 12, color: t.color.textMute,
                fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600,
                cursor: 'pointer', fontFamily: t.font.sans,
              }}>+ Add food</button>
            ) : (
              <>
                {items.map(entry => {
                  const f = findFood(entry.foodId)
                  if (!f) return null
                  return (
                    <div key={entry.id} style={{
                      background: t.color.surface, border: `1px solid ${t.color.line}`,
                      borderRadius: 12, padding: '12px 14px', marginBottom: 6,
                      display: 'flex', alignItems: 'center', gap: 12,
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, color: t.color.text, fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 2 }}>
                          {entry.qty > 1 ? `${entry.qty} ×` : ''} {f.serving} · {entry.time}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontFamily: t.font.display, fontSize: 18, color: t.color.text,
                          fontVariantNumeric: 'tabular-nums', fontWeight: 500,
                        }}>{f.cal * entry.qty}</div>
                        <div style={{ fontSize: 9, color: t.color.textMute, letterSpacing: 1.4, fontWeight: 600 }}>
                          {f.p * entry.qty}P · {f.c * entry.qty}C · {f.f * entry.qty}F
                        </div>
                      </div>
                      <button onClick={() => setLog(l => l.filter(x => x.id !== entry.id))}
                        style={{
                          background: 'transparent', border: 'none',
                          color: t.color.textMute, fontSize: 16, cursor: 'pointer',
                          padding: '4px 6px',
                        }}>×</button>
                    </div>
                  )
                })}
                <button onClick={() => setPicking(meal)} style={{
                  width: '100%', padding: '10px 14px', marginTop: 4,
                  background: 'transparent', border: `1px solid ${t.color.line2}`,
                  borderRadius: 12, color: t.color.textDim,
                  fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600,
                  cursor: 'pointer', fontFamily: t.font.sans,
                }}>+ Add to {meal}</button>
              </>
            )}
          </div>
        )
      })}

      {/* Food picker sheet */}
      {picking && (
        <div onClick={() => setPicking(null)} style={{
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
            <div style={{
              width: 36, height: 4, background: t.color.line2, borderRadius: 2,
              margin: '0 auto 16px',
            }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <h3 style={{
                fontFamily: t.font.display, fontSize: 24, fontWeight: 500,
                color: t.color.text, letterSpacing: -0.4,
              }}>Add to {picking}</h3>
              <button onClick={() => setPicking(null)} style={{
                background: 'transparent', border: 'none', color: t.color.textMute,
                fontSize: 13, cursor: 'pointer', fontFamily: t.font.sans, fontWeight: 600,
                letterSpacing: 1.4, textTransform: 'uppercase',
              }}>Done</button>
            </div>

            <input
              placeholder="Search foods…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '13px 16px',
                background: t.color.bg, border: `1px solid ${t.color.line2}`,
                borderRadius: 12, color: t.color.text, fontSize: 14,
                fontFamily: t.font.sans, outline: 'none', marginBottom: 14,
              }}
            />

            {filteredFoods.map(f => (
              <button key={f.id} onClick={() => {
                setLog(l => [...l, { id: String(Date.now()), foodId: f.id, meal: picking, qty: 1, time: nowTime() }])
                setQ('')
                setPicking(null)
              }} style={{
                width: '100%', padding: '12px 14px', marginBottom: 6,
                background: t.color.bg, border: `1px solid ${t.color.line}`,
                borderRadius: 12,
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer', fontFamily: t.font.sans, textAlign: 'left',
              }}>
                {f.fav && (
                  <div style={{
                    width: 4, height: 4, borderRadius: '50%',
                    background: t.color.ember,
                  }} />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: t.color.text, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 2 }}>{f.serving}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontFamily: t.font.display, fontSize: 17, color: t.color.text,
                    fontVariantNumeric: 'tabular-nums', fontWeight: 500,
                  }}>{f.cal}</div>
                  <div style={{ fontSize: 9, color: t.color.textMute, letterSpacing: 1.2, fontWeight: 600 }}>
                    {f.p}P · {f.c}C · {f.f}F
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function nowTime() {
  const d = new Date()
  const h = d.getHours()
  const m = d.getMinutes()
  const am = h < 12 ? 'AM' : 'PM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${am}`
}
