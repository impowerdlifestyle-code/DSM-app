import { useState } from 'react'
import { saveOnboarding, savePendingConsent } from '../lib/supabase.js'
import { authFetch } from '../lib/authFetch.js'
import { isNativeApp } from '../lib/platform.js'
import { tokens as t, C } from '../styles.js'
import ProgressBar from './widgets/ProgressBar.jsx'

const POSITIONS = ['GK', 'CB', 'FB', 'CDM', 'CM', 'CAM', 'W', 'ST']
const CADENCES  = [
  { v: 'weekend',       label: 'Weekend games' },
  { v: 'midweek',       label: 'Midweek + weekend' },
  { v: 'tournament',    label: 'Tournament weeks' },
  { v: 'offseason',     label: 'Offseason / preseason' },
]
const OBSTACLES = [
  'Nerves before games', 'Bouncing back from mistakes', 'Losing focus mid-game',
  'Coach pressure', 'Parent pressure', 'Confidence after a slump',
  'Aggression / risk-taking', 'Sleep + recovery', 'Diet + nutrition',
]
const BASELINE_QUESTIONS = [
  { k: 'shark',     q: 'How aggressive / decisive do you play?' },
  { k: 'goldfish',  q: 'How quickly do you bounce back from mistakes?' },
  { k: 'selftalk',  q: 'How positive is your inner voice during games?' },
  { k: 'tuneout',   q: 'How well do you tune out crowd/coach/parent noise?' },
  { k: 'confidence',q: 'How confident do you walk into a game right now?' },
]

const s = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.92)',
    backdropFilter: 'blur(14px)',
    zIndex: 500,
    display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
    padding: '24px 16px 80px',
    overflowY: 'auto',
  },
  shell: {
    width: '100%', maxWidth: 440,
    background: t.color.surface,
    border: `1px solid ${t.color.line2}`,
    borderRadius: t.radius.xl,
    padding: 24,
    boxShadow: t.shadow.raised,
  },
  step: {
    fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600,
    textTransform: 'uppercase', marginBottom: 8,
  },
  bar: {
    height: 3, background: t.color.line, borderRadius: 999, overflow: 'hidden',
    marginBottom: 22,
  },
  barFill: (p) => ({
    height: '100%', width: `${p}%`,
    background: t.color.text,
    transition: 'width 240ms ease',
  }),
  h: {
    fontFamily: t.font.athletic, fontSize: 34, lineHeight: 1, fontWeight: 400,
    textTransform: 'uppercase', letterSpacing: 1.2,
    marginBottom: 8, color: t.color.text,
  },
  hint: { fontSize: 13, color: t.color.textDim, marginBottom: 18, lineHeight: 1.5 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: (on) => ({
    padding: '10px 14px',
    border: `1px solid ${on ? t.color.text : t.color.line2}`,
    background: on ? t.color.text : 'transparent',
    color: on ? t.color.bg : t.color.text,
    borderRadius: 999, fontSize: 12, fontWeight: 600, letterSpacing: 1,
    cursor: 'pointer', textTransform: 'uppercase',
  }),
  scaleRow: { display: 'flex', gap: 6, marginBottom: 10 },
  scaleBtn: (on) => ({
    flex: 1, minHeight: 38, borderRadius: 10,
    border: `1px solid ${on ? t.color.text : t.color.line2}`,
    background: on ? t.color.text : 'transparent',
    color: on ? t.color.bg : t.color.text,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
  }),
  qBlock: { marginBottom: 14 },
  qLabel: { fontSize: 12, color: t.color.textDim, marginBottom: 6 },
  nav: { display: 'flex', gap: 8, marginTop: 18 },
  next: { ...C.btn, marginBottom: 0, flex: 2 },
  back: {
    flex: 1, background: 'transparent',
    border: `1px solid ${t.color.line2}`,
    color: t.color.textDim, borderRadius: t.radius.md, padding: '15px 20px',
    fontSize: 12, fontWeight: 600, letterSpacing: 1.2, cursor: 'pointer',
    textTransform: 'uppercase',
  },
  err: { fontSize: 12, color: t.color.err, marginTop: 8 },
}

const STEPS_DEFAULT = ['identity', 'position', 'baseline', 'obstacles', 'cadence', 'plan']
const STEPS_YOUTH   = ['identity', 'position', 'consent', 'baseline', 'obstacles', 'cadence', 'plan']

export default function Onboarding({ user, profile, onDone }) {
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [data, setData] = useState({
    identityGoal: '',
    position: '',
    age: '',
    clubTeam: '',
    parentEmail: '',
    baseline: { shark: 5, goldfish: 5, selftalk: 5, tuneout: 5, confidence: 5 },
    obstacles: [],
    matchCadence: '',
  })
  const [planLoading, setPlanLoading] = useState(false)
  const [plan, setPlan] = useState(null)

  const update = (patch) => setData(d => ({ ...d, ...patch }))
  const needsConsent = typeof data.age === 'number' && data.age < 13
  // App Store builds are gated to 13+ to keep COPPA out of review scope; the
  // under-13 parental-consent flow stays available on the web.
  const under13Native = isNativeApp() && needsConsent
  const STEPS = needsConsent ? STEPS_YOUTH : STEPS_DEFAULT
  const currentKey = STEPS[step]
  const pct = ((step + 1) / STEPS.length) * 100

  function canAdvance() {
    if (currentKey === 'identity') return data.identityGoal.trim().length >= 5
    if (currentKey === 'position') return data.position && typeof data.age === 'number' && !under13Native
    if (currentKey === 'consent')  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.parentEmail.trim())
    if (currentKey === 'cadence')  return !!data.matchCadence
    return true
  }

  async function generatePlan() {
    setPlanLoading(true); setErr('')
    try {
      const res = await authFetch('/api/coach', {
        method: 'POST',
        body: JSON.stringify({
          action: 'starter_plan',
          onboarding: data,
          profile: { full_name: profile?.full_name || 'Athlete' },
        }),
      })
      if (!res.ok) throw new Error(`Plan request failed (${res.status})`)
      const json = await res.json()
      if (!json?.weeks?.length) throw new Error('empty plan')
      setPlan(json)
    } catch (e) {
      // M15: graceful fallback — but mark it explicitly as fallback so the
      // UI can distinguish from a real Coach V plan. Was rendering a hard-
      // coded plan identical-looking to the real one; only the red err
      // text hinted at the failure.
      setPlan({
        _fallback: true,
        weeks: [
          { focus: 'Identity reps', cue: data.identityGoal, action: 'State identity out loud before every session.' },
          { focus: 'Bounce-back drill', cue: 'Goldfish 🐠', action: 'After every mistake in training: 3-breath reset, name the next play.' },
          { focus: 'Tune-out reps', cue: 'Tune-out 🔇', action: 'Pick one external noise per session, practice not reacting.' },
          { focus: 'Match-day stack', cue: 'Lock in', action: 'Run pre-match warmup (mood → intention → breath) for every game.' },
        ],
      })
      setErr("Couldn't reach Coach V — showing a starter plan from the playbook. It'll be replaced next time the app reaches the server.")
    } finally {
      setPlanLoading(false)
    }
  }

  async function finish() {
    setSaving(true); setErr('')
    const { error } = await saveOnboarding(user.id, { ...data, starterFocus: plan || {} })
    if (error) { setSaving(false); setErr(error.message || 'Failed to save'); return }
    if (needsConsent && data.parentEmail) {
      const { data: consentData, error: consentErr } = await savePendingConsent(user.id, data.parentEmail)
      if (consentErr) { setSaving(false); setErr(consentErr.message || 'Saved profile but consent state failed.'); return }
      // Best-effort email send — Main.jsx WaitingForParent screen lets them resend if this fails silently.
      if (consentData?.parent_consent_token) {
        fetch('/api/send-consent-email', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: consentData.parent_consent_token }),
        }).catch(() => {})
      }
    }
    setSaving(false)
    onDone?.()
  }

  return (
    <div style={s.overlay}>
      <div style={s.shell}>
        <div style={s.step}>Step {step + 1} of {STEPS.length}</div>
        <ProgressBar pct={pct} height={4} style={{ marginBottom: 22 }} duration={240} />

        {currentKey === 'identity' && (
          <>
            <h2 style={s.h}>Set your<br/>identity.</h2>
            <p style={s.hint}>Finish this sentence — Coach V will hold you to it.</p>
            <div style={s.qLabel}>I am the player who…</div>
            <textarea
              style={{ ...C.ta, minHeight: 110 }}
              placeholder="…plays without fear, runs through contact, and bounces back instantly."
              value={data.identityGoal}
              onChange={e => update({ identityGoal: e.target.value })}
            />
          </>
        )}

        {currentKey === 'position' && (
          <>
            <h2 style={s.h}>The basics.</h2>
            <p style={s.hint}>Your position shapes how Coach V talks about the game.</p>
            <div style={s.qLabel}>Position</div>
            <div style={s.chipRow}>
              {POSITIONS.map(p => (
                <button key={p} style={s.chip(data.position === p)} onClick={() => update({ position: p })}>{p}</button>
              ))}
            </div>
            <div style={s.qLabel}>Age</div>
            <input
              style={{ ...C.inp, marginBottom: 14 }}
              type="number" min="8" max="25" placeholder="16"
              value={data.age}
              onChange={e => update({ age: e.target.value ? parseInt(e.target.value) : '' })}
            />
            <div style={s.qLabel}>Club / team (optional)</div>
            <input
              style={C.inp}
              placeholder="Tampa Bay United U17"
              value={data.clubTeam}
              onChange={e => update({ clubTeam: e.target.value })}
            />
            {under13Native && (
              <div style={{ marginTop: 14, padding: '12px 14px', background: t.color.errBg, border: `1px solid ${t.color.err}`, borderRadius: 12, fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>
                DSM in the app is for ages 13+. If you're under 13, ask a parent to set you up at <b>dsm-app-2.vercel.app</b> in a browser — it has a parent-approval step.
              </div>
            )}
          </>
        )}

        {currentKey === 'consent' && (
          <>
            <h2 style={s.h}>One quick<br/>thing.</h2>
            <p style={s.hint}>
              You're under 13, so we need a parent's permission before Coach V can start. Drop their email below — we'll send them a link to approve.
            </p>
            <div style={s.qLabel}>Parent or guardian email</div>
            <input
              style={C.inp}
              type="email"
              placeholder="parent@example.com"
              value={data.parentEmail}
              onChange={e => update({ parentEmail: e.target.value })}
              autoFocus
            />
            <div style={{
              marginTop: 14, padding: 12,
              background: 'rgba(96,165,250,0.08)',
              border: '1px solid rgba(96,165,250,0.3)',
              borderRadius: 12,
              fontSize: 11, color: t.color.textDim, lineHeight: 1.5,
            }}>
              Why? COPPA — the U.S. law for under-13 apps. Your parent has to OK what we collect (action steps, mood, chats with Coach V) before you can start. Until then, your account stays paused. Takes them one tap.
            </div>
          </>
        )}

        {currentKey === 'baseline' && (
          <>
            <h2 style={s.h}>Baseline scan.</h2>
            <p style={s.hint}>Honest scores. We'll measure progress against this in 4 weeks.</p>
            {BASELINE_QUESTIONS.map(q => (
              <div key={q.k} style={s.qBlock}>
                <div style={s.qLabel}>{q.q}</div>
                <div style={s.scaleRow}>
                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                    <button
                      key={n}
                      style={s.scaleBtn(data.baseline[q.k] === n)}
                      onClick={() => update({ baseline: { ...data.baseline, [q.k]: n } })}
                    >{n}</button>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {currentKey === 'obstacles' && (
          <>
            <h2 style={s.h}>Top obstacles.</h2>
            <p style={s.hint}>Pick up to 3. Coach V will steer toward these.</p>
            <div style={s.chipRow}>
              {OBSTACLES.map(o => {
                const on = data.obstacles.includes(o)
                const max3 = data.obstacles.length >= 3 && !on
                return (
                  <button
                    key={o}
                    disabled={max3}
                    style={{ ...s.chip(on), opacity: max3 ? 0.35 : 1, cursor: max3 ? 'not-allowed' : 'pointer' }}
                    onClick={() => update({
                      obstacles: on
                        ? data.obstacles.filter(x => x !== o)
                        : [...data.obstacles, o],
                    })}
                  >{o}</button>
                )
              })}
            </div>
          </>
        )}

        {currentKey === 'cadence' && (
          <>
            <h2 style={s.h}>Game cadence.</h2>
            <p style={s.hint}>When do most of your matches happen right now?</p>
            <div style={s.chipRow}>
              {CADENCES.map(c => (
                <button key={c.v} style={s.chip(data.matchCadence === c.v)} onClick={() => update({ matchCadence: c.v })}>
                  {c.label}
                </button>
              ))}
            </div>
          </>
        )}

        {currentKey === 'plan' && (
          <>
            <h2 style={s.h}>Your 4-week<br/>starter focus.</h2>
            <p style={s.hint}>Coach V drafted this from your answers. You can rework it any time.</p>
            {!plan && !planLoading && (
              <button style={{ ...C.btn, marginBottom: 8 }} onClick={generatePlan}>
                Generate my plan
              </button>
            )}
            {planLoading && <p style={s.hint}>Drafting your plan…</p>}
            {plan?.weeks?.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                {plan.weeks.map((w, i) => (
                  <div key={i} style={{
                    padding: 14, marginBottom: 8,
                    background: t.color.bg, borderRadius: t.radius.md,
                    border: `1px solid ${t.color.line}`,
                  }}>
                    <div style={{ fontSize: 10, letterSpacing: 2, color: t.color.textMute, marginBottom: 4 }}>WEEK {i+1}</div>
                    <div style={{ fontFamily: t.font.athletic, fontSize: 18, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{w.focus}</div>
                    {w.cue && <div style={{ fontSize: 12, color: t.color.textDim, marginBottom: 4 }}>Cue: {w.cue}</div>}
                    {w.action && <div style={{ fontSize: 13, color: t.color.text }}>{w.action}</div>}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {err && <div style={s.err}>{err}</div>}

        <div style={s.nav}>
          {step > 0 && (
            <button style={{ ...C.bghost, flex: 1, marginBottom: 0 }} onClick={() => setStep(s => s - 1)}>Back</button>
          )}
          {step < STEPS.length - 1 && (
            <button
              style={{ ...s.next, opacity: canAdvance() ? 1 : 0.4 }}
              disabled={!canAdvance()}
              onClick={() => setStep(s => s + 1)}
            >Continue →</button>
          )}
          {step === STEPS.length - 1 && (
            <button
              style={{ ...s.next, opacity: saving || !plan?.weeks?.length ? 0.4 : 1 }}
              disabled={saving || !plan?.weeks?.length}
              onClick={finish}
            >{saving ? 'Saving…' : (needsConsent ? 'Send to parent →' : 'Lock it in')}</button>
          )}
        </div>
      </div>
    </div>
  )
}
