import { useState } from 'react'
import { tokens as t, C } from '../../styles.js'
import { recordConsent, isMinor } from './lib/voiceIdentity.js'

const SLIDES = ['what', 'privacy', 'consent']

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
  hint: { fontSize: 13, color: t.color.textDim, marginBottom: 14, lineHeight: 1.5 },
  body: { fontSize: 13, color: t.color.text, marginBottom: 12, lineHeight: 1.55 },
  bullet: {
    fontSize: 13, color: t.color.text, lineHeight: 1.55,
    paddingLeft: 18, marginBottom: 8, position: 'relative',
  },
  dot: {
    position: 'absolute', left: 0, top: 8,
    width: 5, height: 5, borderRadius: 999, background: t.color.text,
  },
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
  block: {
    border: `1px solid ${t.color.line2}`,
    borderRadius: t.radius.md,
    padding: 16, marginBottom: 14,
    background: 'rgba(255,255,255,0.02)',
  },
  blockLbl: {
    fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 700,
    textTransform: 'uppercase', marginBottom: 6,
  },
  check: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    padding: 12, borderRadius: t.radius.md,
    border: `1px solid ${t.color.line2}`,
    cursor: 'pointer', marginBottom: 12,
  },
  checkBox: (on) => ({
    width: 18, height: 18, borderRadius: 4, flexShrink: 0, marginTop: 1,
    border: `1px solid ${on ? t.color.text : t.color.line2}`,
    background: on ? t.color.text : 'transparent',
    color: t.color.bg, fontSize: 12, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }),
}

export default function ConsentFlow({ user, profile, onComplete, onCancel }) {
  const [step, setStep] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const minor = isMinor(profile)
  const pct = ((step + 1) / SLIDES.length) * 100
  const firstName = profile?.full_name?.split(' ')[0] || 'Athlete'

  async function submit() {
    setErr(''); setSaving(true)
    const { error } = await recordConsent({ userId: user.id, consentingActorId: user.id })
    setSaving(false)
    if (error) { setErr(error.message || 'Could not save consent'); return }
    onComplete?.()
  }

  return (
    <div style={s.overlay}>
      <div style={s.shell}>
        <div style={s.step}>Future Self · Step {step + 1} of {SLIDES.length}</div>
        <div style={s.bar}><div style={s.barFill(pct)} /></div>

        {step === 0 && (
          <>
            <h2 style={s.h}>Hear your<br/>future self.</h2>
            <p style={s.hint}>One recording. One voice — yours, a year from now.</p>
            <p style={s.body}>
              You'll record yourself once. After that, Coach V can play short messages back
              to you in <strong>your own voice</strong> — before a match, after a mistake,
              and once a month for a check-in.
            </p>
            <p style={s.body}>
              It's a reminder of who you said you wanted to be, spoken by the only person
              who can actually make it true.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <h2 style={s.h}>Privacy<br/>first.</h2>
            <p style={s.hint}>This is the most important screen. Read it.</p>
            <div style={s.bullet}><span style={s.dot} />Your voice is used <strong>only in your account</strong>. It is never shared with other athletes, parents you haven't linked, or the public.</div>
            <div style={s.bullet}><span style={s.dot} />It is <strong>never used to train AI models</strong>. ElevenLabs holds your voice clone solely so we can play it back to you.</div>
            <div style={s.bullet}><span style={s.dot} />You can <strong>delete the voice and every clip</strong> at any time from Settings. Deletion is permanent and immediate.</div>
            <div style={s.bullet}><span style={s.dot} />Clips are stored privately in DSM and only you (and a linked parent or coach) can hear them.</div>
          </>
        )}

        {step === 2 && minor && (
          <>
            <h2 style={s.h}>Parent<br/>needed.</h2>
            <p style={s.hint}>You're under 13. Cloning your voice needs a grown-up's sign-off.</p>
            <div style={s.block}>
              <div style={s.blockLbl}>What to do</div>
              <p style={{ ...s.body, marginBottom: 0 }}>
                Ask the parent linked to your DSM account to log in on their device,
                open the Future Self panel, and consent on your behalf. Once they do,
                this screen will unlock for you automatically.
              </p>
            </div>
            <p style={{ ...s.hint, marginBottom: 0 }}>
              If no parent is linked yet, you can send them an invite from the Player tab → Parents.
            </p>
          </>
        )}

        {step === 2 && !minor && (
          <>
            <h2 style={s.h}>Your call,<br/>{firstName}.</h2>
            <p style={s.hint}>You're 13 or older. You can consent for yourself.</p>
            <button style={s.check} onClick={() => setAgreed(a => !a)}>
              <div style={s.checkBox(agreed)}>{agreed ? '✓' : ''}</div>
              <div style={{ flex: 1, textAlign: 'left', fontSize: 13, color: t.color.text, lineHeight: 1.5 }}>
                I understand my voice will be cloned for use in my own DSM account,
                won't be shared or used to train models, and I can delete it any time.
              </div>
            </button>
            {err && <div style={s.err}>{err}</div>}
          </>
        )}

        <div style={s.nav}>
          {step > 0 && (
            <button style={s.back} onClick={() => setStep(step - 1)} disabled={saving}>Back</button>
          )}
          {step < SLIDES.length - 1 && (
            <button style={s.next} onClick={() => setStep(step + 1)}>Continue</button>
          )}
          {step === SLIDES.length - 1 && minor && (
            <button style={s.back} onClick={() => onCancel?.()}>Close</button>
          )}
          {step === SLIDES.length - 1 && !minor && (
            <button style={s.next} onClick={submit} disabled={!agreed || saving}>
              {saving ? 'Saving…' : 'Agree & continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
