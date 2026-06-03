import { useEffect, useRef, useState, useCallback } from 'react'
import { tokens as t, C } from '../styles.js'
import { getGroupMessages, sendGroupMessage, deleteGroupMessage } from '../lib/supabase.js'

// Shared group chat panel. Used in the athlete Team tab and the coach Admin
// group view. Polls every 5s while mounted (no realtime dependency).
// canModerate=true lets the viewer delete any message (lead coach / admin).
export default function GroupChat({ groupId, user, canModerate = false, height = 'calc(100dvh - 220px)' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef(null)
  const atBottomRef = useRef(true)

  const load = useCallback(async (scroll = false) => {
    const { data } = await getGroupMessages(groupId)
    setMessages(data || [])
    setLoading(false)
    if (scroll || atBottomRef.current) {
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
    }
  }, [groupId])

  useEffect(() => {
    setLoading(true)
    load(true)
    const iv = setInterval(() => load(false), 5000)
    return () => clearInterval(iv)
  }, [load])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  async function send() {
    const body = input.trim()
    if (!body || sending) return
    setInput('')
    setSending(true)
    const optimistic = { id: `tmp-${Date.now()}`, user_id: user.id, body, created_at: new Date().toISOString(), sender: { full_name: 'You' }, _pending: true }
    setMessages(p => [...p, optimistic])
    atBottomRef.current = true
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
    const { error } = await sendGroupMessage(groupId, user.id, body)
    setSending(false)
    if (error) {
      setMessages(p => p.map(m => m.id === optimistic.id ? { ...m, _failed: true, _pending: false } : m))
    } else {
      load(true)
    }
  }

  async function remove(id) {
    setMessages(p => p.filter(m => m.id !== id))
    await deleteGroupMessage(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height }}>
      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '4px 2px' }}>
        {loading && <div style={{ color: t.color.textDim, fontSize: 12, padding: 8 }}>Loading chat…</div>}
        {!loading && !messages.length && (
          <div style={{ color: t.color.textMute, fontSize: 13, textAlign: 'center', padding: '32px 16px', lineHeight: 1.5 }}>
            No messages yet. Say hey to the group 👋
          </div>
        )}
        {messages.map(m => {
          const mine = m.user_id === user.id
          const isCoach = m.sender?.role === 'coach'
          const canDelete = mine || canModerate
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: mine ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
              {!mine && (
                <div style={{ fontSize: 10, color: isCoach ? t.color.pitch : t.color.textMute, fontWeight: 700, letterSpacing: 0.4, marginBottom: 3, paddingLeft: 4 }}>
                  {m.sender?.full_name || 'Member'}{isCoach ? ' · COACH' : ''}
                </div>
              )}
              <div style={{
                maxWidth: '82%',
                background: mine ? t.color.text : t.color.surface,
                color: mine ? t.color.bg : t.color.text,
                border: mine ? 'none' : `1px solid ${t.color.line}`,
                borderRadius: 16, padding: '10px 13px', fontSize: 14, lineHeight: 1.5,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                opacity: m._pending ? 0.6 : 1,
              }}>
                {m.body}
                {m._failed && <span style={{ color: t.color.err, fontSize: 11, display: 'block', marginTop: 4 }}>Failed to send</span>}
              </div>
              {canDelete && !m._pending && !String(m.id).startsWith('tmp-') && (
                <button onClick={() => remove(m.id)} style={{ background: 'none', border: 'none', color: t.color.textMute, fontSize: 10, cursor: 'pointer', marginTop: 2, padding: '2px 4px' }}>
                  Delete
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', gap: 8, paddingTop: 8, borderTop: `1px solid ${t.color.line}`, background: t.color.bg }}>
        <input
          style={{ ...C.inp, flex: 1 }}
          placeholder="Message the group…"
          value={input}
          maxLength={2000}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        />
        <button style={{ ...C.bsm, padding: '0 18px', borderRadius: t.radius.md }} disabled={!input.trim() || sending} onClick={send}>
          Send
        </button>
      </div>
    </div>
  )
}
