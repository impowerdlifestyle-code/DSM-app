import { useEffect, useRef, useState, useCallback } from 'react'
import { tokens as t, C } from '../styles.js'
import { supabase, getGroupMessages, sendGroupMessage, deleteGroupMessage, reportMessage, blockUser, getMyBlocks } from '../lib/supabase.js'
import { isClean, REPORT_REASONS } from '../lib/moderation.js'

// Shared group chat panel. Realtime via Supabase + 20s poll fallback.
// UGC moderation (Apple 1.2): word filter on send, per-message Report, and
// per-user Block (hides that user's messages for the blocker). canModerate
// (lead coach / admin) can delete any message.
export default function GroupChat({ groupId, user, canModerate = false, height = 'calc(100dvh - 220px)' }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sendErr, setSendErr] = useState('')
  const [blocked, setBlocked] = useState(new Set())
  const [reportFor, setReportFor] = useState(null) // message object being reported
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

  useEffect(() => { getMyBlocks(user.id).then(setBlocked) }, [user.id])

  useEffect(() => {
    setLoading(true)
    load(true)
    const ch = supabase
      .channel(`group-${groupId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` }, () => load(false))
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'group_messages', filter: `group_id=eq.${groupId}` }, () => load(false))
      .subscribe()
    const iv = setInterval(() => load(false), 20000)
    return () => { clearInterval(iv); supabase.removeChannel(ch) }
  }, [load, groupId])

  function onScroll() {
    const el = scrollRef.current
    if (!el) return
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
  }

  async function send() {
    const body = input.trim()
    if (!body || sending) return
    if (!isClean(body)) { setSendErr("Keep it clean — that message wasn't sent."); return }
    setInput(''); setSendErr('')
    setSending(true)
    const optimistic = { id: `tmp-${Date.now()}`, user_id: user.id, body, created_at: new Date().toISOString(), sender: { full_name: 'You' }, _pending: true }
    setMessages(p => [...p, optimistic])
    atBottomRef.current = true
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }))
    const { error } = await sendGroupMessage(groupId, user.id, body)
    setSending(false)
    if (error) setMessages(p => p.map(m => m.id === optimistic.id ? { ...m, _failed: true, _pending: false } : m))
    else load(true)
  }

  async function remove(id) {
    const prev = messages
    setMessages(p => p.filter(m => m.id !== id))
    const { error } = await deleteGroupMessage(id)
    if (error) setMessages(prev)
  }

  async function block(uid) {
    setBlocked(p => new Set(p).add(uid))
    await blockUser(user.id, uid)
  }

  async function submitReport(reason) {
    const m = reportFor
    setReportFor(null)
    if (!m) return
    await reportMessage(user.id, { messageId: String(m.id).startsWith('tmp-') ? null : m.id, groupId, reportedUserId: m.user_id, messageText: m.body, reason })
  }

  const visible = messages.filter(m => !blocked.has(m.user_id) || m.user_id === user.id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height }}>
      <div ref={scrollRef} onScroll={onScroll} style={{ flex: 1, overflowY: 'auto', padding: '4px 2px' }}>
        {loading && <div style={{ color: t.color.textDim, fontSize: 12, padding: 8 }}>Loading chat…</div>}
        {!loading && !visible.length && (
          <div style={{ color: t.color.textMute, fontSize: 13, textAlign: 'center', padding: '32px 16px', lineHeight: 1.5 }}>
            No messages yet. Say hey to the group 👋
          </div>
        )}
        {visible.map(m => {
          const mine = m.user_id === user.id
          const isCoach = m.sender?.role === 'coach'
          const canDelete = mine || canModerate
          const isReal = !m._pending && !String(m.id).startsWith('tmp-')
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
              <div style={{ display: 'flex', gap: 10, marginTop: 2 }}>
                {!mine && isReal && (
                  <>
                    <button onClick={() => setReportFor(m)} style={modAction}>Report</button>
                    <button onClick={() => block(m.user_id)} style={modAction}>Block</button>
                  </>
                )}
                {canDelete && isReal && (
                  <button onClick={() => remove(m.id)} style={modAction}>Delete</button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {reportFor && (
        <div style={overlay} onClick={() => setReportFor(null)}>
          <div style={sheet} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: t.font.athletic, fontSize: 20, color: t.color.text, marginBottom: 2 }}>Report message</div>
            <div style={{ fontSize: 11, color: t.color.textDim, marginBottom: 12 }}>A coach reviews reports and can remove the message. Pick a reason:</div>
            {REPORT_REASONS.map(r => (
              <button key={r} onClick={() => submitReport(r)} style={{ ...C.bghost, width: '100%', marginBottom: 6, textTransform: 'none', letterSpacing: 0.2, fontSize: 13, padding: '12px 14px' }}>{r}</button>
            ))}
            <button onClick={() => setReportFor(null)} style={{ background: 'none', border: 'none', color: t.color.textMute, fontSize: 12, cursor: 'pointer', marginTop: 6, width: '100%' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ paddingTop: 8, borderTop: `1px solid ${t.color.line}`, background: t.color.bg }}>
        {sendErr && <div style={{ color: t.color.err, fontSize: 11, marginBottom: 6 }}>{sendErr}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...C.inp, flex: 1 }}
            placeholder="Message the group…"
            value={input}
            maxLength={2000}
            onChange={e => { setInput(e.target.value); if (sendErr) setSendErr('') }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
          />
          <button style={{ ...C.bsm, padding: '0 18px', borderRadius: t.radius.md }} disabled={!input.trim() || sending} onClick={send}>Send</button>
        </div>
      </div>
    </div>
  )
}

const modAction = { background: 'none', border: 'none', color: 'var(--color-text-mute)', fontSize: 10, cursor: 'pointer', padding: '2px 2px', letterSpacing: 0.3 }
const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 300, padding: 16 }
const sheet = { background: 'var(--color-surface)', border: '1px solid var(--color-line)', borderRadius: 18, padding: 18, width: '100%', maxWidth: 420, marginBottom: 'max(16px, env(safe-area-inset-bottom))' }
