import { useState, useEffect, useMemo } from 'react'
import { tokens as t, C } from '../../styles.js'
import { FOODS, NUTRITION_TARGETS as DEFAULT_TARGETS } from '../../data/foods.js'
import {
  getFoodLogToday, logFood, removeFood, getFoodLogRange,
  getNutritionTargets, setNutritionTargets,
} from '../../lib/supabase.js'
import MacroRing from '../widgets/MacroRing.jsx'
import TiltCard from '../widgets/TiltCard.jsx'

const MEAL_ORDER = ['Breakfast', 'Snack', 'Lunch', 'Dinner']

export default function NutritionTab({ user }) {
  const [log, setLog] = useState([])
  const [targets, setTargets] = useState(DEFAULT_TARGETS)
  const [weeklyTrend, setWeeklyTrend] = useState([0, 0, 0, 0, 0, 0, 0])
  const [picking, setPicking] = useState(null)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!user?.id) return
    let alive = true
    ;(async () => {
      const [{ data: today }, { data: tg }, { data: range }] = await Promise.all([
        getFoodLogToday(user.id),
        getNutritionTargets(user.id),
        getFoodLogRange(user.id, 7),
      ])
      if (!alive) return
      setLog((today || []).map(rowToEntry))
      if (tg) setTargets({ cal: tg.cal, p: tg.protein_g, c: tg.carbs_g, f: tg.fat_g })
      setWeeklyTrend(bucketByDay(range || [], 7))
    })()
    return () => { alive = false }
  }, [user?.id])

  const totals = useMemo(() => log.reduce((a, e) => ({
    cal: a.cal + e.cal * e.qty,
    p:   a.p   + e.p   * e.qty,
    c:   a.c   + e.c   * e.qty,
    f:   a.f   + e.f   * e.qty,
  }), { cal: 0, p: 0, c: 0, f: 0 }), [log])

  const filteredFoods = useMemo(() => {
    const ql = q.toLowerCase().trim()
    return FOODS
      .filter(f => !ql || f.name.toLowerCase().includes(ql))
      .sort((a, b) => (a.fav === b.fav ? 0 : a.fav ? -1 : 1))
  }, [q])

  const grouped = useMemo(() => {
    const g = {}
    MEAL_ORDER.forEach(m => g[m] = [])
    log.forEach(e => { (g[e.meal] = g[e.meal] || []).push(e) })
    return g
  }, [log])

  async function addFood(food, meal) {
    if (!user?.id) return
    const newEntry = {
      name: food.name, foodId: food.id, serving: food.serving,
      cal: food.cal, p: food.p, c: food.c, f: food.f,
      qty: 1, meal,
    }
    const { data, error } = await logFood(user.id, newEntry)
    if (error) { alert(`Save failed: ${error.message}`); return }
    setLog(l => [...l, rowToEntry(data)])
    setPicking(null); setQ('')
  }

  async function deleteEntry(entry) {
    if (!user?.id) return
    setLog(l => l.filter(x => x.id !== entry.id))  // optimistic
    const { error } = await removeFood(user.id, entry.id)
    if (error) alert(`Remove failed: ${error.message}`)
  }

  return (
    <div className="fade" style={{ padding: '14px 22px 56px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
          Today · Nutrition
        </div>
        <h2 style={{
          fontFamily: t.font.display, fontSize: 32, fontWeight: 500,
          color: t.color.text, marginTop: 4, letterSpacing: -0.5, lineHeight: 1.05,
        }}>
          {totals.cal >= targets.cal * 0.95 && totals.cal <= targets.cal * 1.05
            ? <>On <span style={{ color: t.color.ember, fontStyle: 'italic' }}>target</span></>
            : totals.cal < targets.cal * 0.7
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
        <MacroRing totals={totals} targets={targets} />
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
              {Math.round(weeklyTrend.reduce((a, b) => a + b, 0) / 7)}
              <span style={{ fontSize: 13, color: t.color.textMute, marginLeft: 6 }}>kcal/day</span>
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 50, marginTop: 12 }}>
          {weeklyTrend.map((v, i) => {
            const max = Math.max(1, ...weeklyTrend)
            const pct = (v / max) * 100
            const isToday = i === weeklyTrend.length - 1
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{
                  width: '100%', height: `${pct}%`,
                  background: isToday ? t.color.ember : t.color.line2,
                  borderRadius: 4,
                  transition: 'height 500ms cubic-bezier(.2,.7,.2,1)',
                }} />
                <span style={{ fontSize: 9, color: t.color.textMute, letterSpacing: 1, fontWeight: 600 }}>
                  {dayLabel(i)}
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
        const mealCal = items.reduce((a, e) => a + e.cal * e.qty, 0)
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
                {items.map(entry => (
                  <div key={entry.id} style={{
                    background: t.color.surface, border: `1px solid ${t.color.line}`,
                    borderRadius: 12, padding: '12px 14px', marginBottom: 6,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: t.color.text, fontWeight: 600 }}>{entry.name}</div>
                      <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 2 }}>
                        {entry.qty > 1 ? `${entry.qty} ×` : ''} {entry.serving} · {entry.time}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{
                        fontFamily: t.font.display, fontSize: 18, color: t.color.text,
                        fontVariantNumeric: 'tabular-nums', fontWeight: 500,
                      }}>{Math.round(entry.cal * entry.qty)}</div>
                      <div style={{ fontSize: 9, color: t.color.textMute, letterSpacing: 1.4, fontWeight: 600 }}>
                        {Math.round(entry.p * entry.qty)}P · {Math.round(entry.c * entry.qty)}C · {Math.round(entry.f * entry.qty)}F
                      </div>
                    </div>
                    <button onClick={() => deleteEntry(entry)}
                      style={{
                        background: 'transparent', border: 'none',
                        color: t.color.textMute, fontSize: 16, cursor: 'pointer',
                        padding: '4px 6px',
                      }}>×</button>
                  </div>
                ))}
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

      <TargetsEditor user={user} targets={targets} onSaved={setTargets} />

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
                ...C.bghost, width: 'auto', marginBottom: 0,
                padding: '8px 14px', fontSize: 13,
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
              <button key={f.id} onClick={() => addFood(f, picking)} style={{
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

/* ─────────────────────────────────────────────────────────────────────── */

function TargetsEditor({ user, targets, onSaved }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(targets)
  const [saving, setSaving] = useState(false)

  useEffect(() => setForm(targets), [targets])

  async function save() {
    if (!user?.id) return
    setSaving(true)
    const numeric = {
      cal: Number(form.cal) || 0,
      p:   Number(form.p)   || 0,
      c:   Number(form.c)   || 0,
      f:   Number(form.f)   || 0,
    }
    const { error } = await setNutritionTargets(user.id, numeric)
    setSaving(false)
    if (error) { alert(`Save failed: ${error.message}`); return }
    onSaved(numeric); setOpen(false)
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} style={{
      width: '100%', padding: '13px 16px', marginTop: 4,
      background: 'transparent', border: `1px solid ${t.color.line2}`,
      borderRadius: 12, color: t.color.textDim,
      fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600,
      cursor: 'pointer', fontFamily: t.font.sans,
    }}>Edit daily targets · {targets.cal} kcal / {targets.p}P / {targets.c}C / {targets.f}F</button>
  )

  return (
    <div style={{
      background: t.color.surface, border: `1px solid ${t.color.line2}`,
      borderRadius: 14, padding: 16, marginTop: 4,
    }}>
      <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase', marginBottom: 10 }}>
        Daily targets
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          ['cal', 'kcal'],
          ['p',   'P'],
          ['c',   'C'],
          ['f',   'F'],
        ].map(([k, label]) => (
          <label key={k}>
            <div style={{ fontSize: 9, letterSpacing: 1.6, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
            <input inputMode="numeric" value={form[k]} onChange={(e) => setForm(p => ({ ...p, [k]: e.target.value }))} style={{
              width: '100%', boxSizing: 'border-box',
              padding: '9px 10px',
              background: t.color.bg, border: `1px solid ${t.color.line2}`,
              borderRadius: 8, color: t.color.text, fontSize: 14,
              fontFamily: t.font.sans, outline: 'none',
              fontVariantNumeric: 'tabular-nums',
            }} />
          </label>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button onClick={() => setOpen(false)} style={{ ...C.bghost, flex: 1, marginBottom: 0 }}>Cancel</button>
        <button onClick={save} disabled={saving} style={{
          flex: 1, padding: '11px 14px',
          background: t.color.text, border: 'none',
          borderRadius: 10, color: t.color.bg,
          fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
          cursor: saving ? 'wait' : 'pointer', fontFamily: t.font.sans,
        }}>{saving ? 'Saving…' : 'Save targets'}</button>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */

function rowToEntry(row) {
  return {
    id: row.id,
    foodId: row.food_id,
    name: row.food_name,
    serving: row.serving,
    cal: row.cal,
    p: row.protein_g,
    c: row.carbs_g,
    f: row.fat_g,
    qty: Number(row.qty) || 1,
    meal: row.meal || 'Snack',
    time: formatTime(new Date(row.logged_at)),
  }
}

function formatTime(d) {
  const h = d.getHours()
  const m = d.getMinutes()
  const am = h < 12 ? 'AM' : 'PM'
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${am}`
}

function bucketByDay(rows, days) {
  const buckets = Array(days).fill(0)
  const todayMid = new Date(); todayMid.setHours(0, 0, 0, 0)
  rows.forEach(r => {
    const d = new Date(r.logged_at); d.setHours(0, 0, 0, 0)
    const diff = Math.round((todayMid - d) / 86400000)
    const idx = days - 1 - diff
    if (idx >= 0 && idx < days) buckets[idx] += r.cal || 0
  })
  return buckets
}

function dayLabel(i) {
  // i ∈ 0..6 maps to (today - 6 + i)
  const d = new Date()
  d.setDate(d.getDate() - (6 - i))
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]
}
