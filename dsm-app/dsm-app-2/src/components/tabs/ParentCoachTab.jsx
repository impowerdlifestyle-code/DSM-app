import { useEffect, useRef, useState } from 'react'
import { getLinkedAthletes, getParentDashboard } from '../../lib/supabase.js'
import { getParentCoachResponse, PARENT_PROMPTS } from '../../lib/coachV.js'
import { tokens as t, C } from '../../styles.js'

const GREETING =
  "I'm Coach V — but right now I'm in your corner, not just your kid's. Ask me anything about supporting your player: what to say after a rough game, the car ride home, building confidence without piling on pressure. Real words, real moves. What's on your mind?"

export default function ParentCoachTab({ user }) {
  const [athletes, setAthletes] = useState([])
  const [selected, setSelected] = useState(null)
  const [ctx, setCtx] = useState({})
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [err, setErr] = useState('')
  const scrollRef = useRef(null)

  useEffect(() => { load() }, [user?.id])
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending])

  async function load() {
    const { data } = await getLinkedAthletes(user.id)
    const list = data || []
    setAthletes(list)
    if (list.length) buildContext(list[0])
  }

  async function buildContext(a) {
    setSelected(a)
    const base = {
      athleteName: a.full_name?.split(' ')[0] || '',
      position: a.position || '',
      age: a.age || '',
      streak: a.streak ?? null,
    }
    setCtx(base)
    // Enrich with last match result (best-effort)
    const d = await getParentDashboard(user.id, a.id)
    const m = d?.matches?.[0]
    if (m) {
      setCtx({
        ...base,
        lastResult: `${m.result || '—'} vs ${m.opponent || 'opponent'} (${m.match_date || ''})`,
      })
    }
  }

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || sending) return
    setErr('')
    setInput('')
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setSending(true)
    try {
      const res = await getParentCoachResponse({
        messages: next.map(m => ({ role: m.role, content: m.content })),
        parentContext: ctx,
      })
      setMessages([...next, { role: 'assistant', content: res.content || '…' }])
    } catch (e) {
      setErr(e.message || 'Coach V is offline right now. Try again in a moment.')
      setMessages(next)
    } finally {
      setSending(false)
    }
  }

  const empty = messages.length === 0

  return (
    <div style={{ ...C.scroll, display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 132px)', paddingTop: 14, paddingBottom: 0 }}>
      <div style={C.title}>PARENT COACH</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.color.pitch, letterSpacing: 0.2, lineHeight: 1.35, marginTop: -2, marginBottom: 3 }}>
        The operating system for elite soccer parenting.
      </div>
      <div style={C.sub}>
        {selected ? `Supporting ${selected.full_name?.split(' ')[0] || 'your athlete'}` : 'Your corner'}
      </div>

      {athletes.length > 1 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {athletes.map(a => (
            <button key={a.id} onClick={() => { setMessages([]); buildContext(a) }}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${selected?.id === a.id ? t.color.text : t.color.line2}`,
                background: selected?.id === a.id ? t.color.text : 'transparent',
                color: selected?.id === a.id ? t.color.bg : t.color.text,
              }}>{a.full_name?.split(' ')[0] || 'Athlete'}</button>
          ))}
        </div>
      )}

      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', marginBottom: 12, paddingRight: 2 }}>
        <div style={{ ...C.card, background: t.color.surface2, lineHeight: 1.55, fontSize: 14, color: t.color.textDim }}>
          {GREETING}
        </div>

        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
            <div style={{
              maxWidth: '85%',
              background: m.role === 'user' ? t.color.text : t.color.surface,
              color: m.role === 'user' ? t.color.bg : t.color.text,
              border: m.role === 'user' ? 'none' : `1px solid ${t.color.line}`,
              borderRadius: 16,
              padding: '12px 14px',
              fontSize: 14,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}>{m.content}</div>
          </div>
        ))}

        {sending && (
          <div style={{ fontSize: 12, color: t.color.textMute, letterSpacing: 1, padding: '4px 2px' }}>
            Coach V is thinking…
          </div>
        )}

        {empty && (
          <div style={{ marginTop: 6 }}>
            <div style={{ ...C.lbl, marginBottom: 8 }}>Common moments</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {PARENT_PROMPTS.map(q => (
                <button key={q} onClick={() => send(q)}
                  style={{
                    padding: '9px 13px', borderRadius: 14, fontSize: 12.5, cursor: 'pointer',
                    border: `1px solid ${t.color.line2}`, background: t.color.surface,
                    color: t.color.text, textAlign: 'left', lineHeight: 1.3,
                  }}>{q}</button>
              ))}
            </div>
          </div>
        )}

        {err && <div style={{ color: t.color.err, fontSize: 12, marginTop: 8 }}>{err}</div>}
      </div>

      <div style={{
        display: 'flex', gap: 8, paddingBottom: 'max(14px, env(safe-area-inset-bottom))',
        paddingTop: 8, borderTop: `1px solid ${t.color.line}`, background: t.color.bg,
      }}>
        <input
          style={{ ...C.inp, flex: 1 }}
          placeholder="Ask Coach V…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        />
        <button style={{ ...C.bsm, padding: '0 18px', borderRadius: t.radius.md }}
          disabled={!input.trim() || sending} onClick={() => send()}>
          Send
        </button>
      </div>
    </div>
  )
}
