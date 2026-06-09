import { useState, useRef, useEffect } from 'react'
import { C, tokens as t } from '../../styles.js'
import { SUGGESTED_QUESTIONS } from '../../lib/coachV.js'

export default function BotTab({
  messages, chatLoading, chatEnd, chatInputRef,
  voiceMode, setVoiceMode, sendChat, onStartCall,
  rateCoachMessage,
}) {
  // Word-by-word reveal of the newest assistant reply, animated here (local
  // state) so it doesn't re-render all of Main ~35×/sec. Only a freshly
  // appended assistant message animates — history loads / tab switches don't.
  const seenRef = useRef(null)
  const prevLenRef = useRef(0)
  const [anim, setAnim] = useState({ key: null, words: 0, total: 0 })

  useEffect(() => {
    const prevLen = prevLenRef.current
    prevLenRef.current = messages.length
    const keyOf = (m, i) => m.id || `idx-${i}`

    if (seenRef.current === null) { seenRef.current = new Set(messages.map(keyOf)); return }
    // Bulk change (history load, tab remount) — show instantly, never replay.
    if (messages.length - prevLen !== 1) { seenRef.current = new Set(messages.map(keyOf)); return }

    const last = messages[messages.length - 1]
    if (!last || last.role !== 'assistant') return
    const key = keyOf(last, messages.length - 1)
    if (seenRef.current.has(key)) return
    seenRef.current.add(key)

    const total = (last.content || '').split(' ').length
    setAnim({ key, words: 0, total })
    let i = 0
    const iv = setInterval(() => {
      i++
      setAnim({ key, words: i, total })
      if (i >= total) clearInterval(iv)
    }, 28)
    return () => clearInterval(iv)
  }, [messages])

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100dvh - 168px)', minHeight:'calc(100vh - 168px)' }} className="fade">
      <div style={{ padding:'12px 20px 10px', borderBottom:`1px solid ${t.color.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={C.title}>Coach Valentino</div>
          <div style={C.sub}>Your AI mindset coach</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => setVoiceMode(p => !p)}
            title="Read Coach's replies aloud"
            style={{ background: voiceMode?t.color.text:t.color.surface, border:`1px solid ${voiceMode?t.color.text:t.color.line2}`, borderRadius:20, padding:'7px 12px', fontSize:10, fontWeight:700, letterSpacing:1.4, textTransform:'uppercase', color:voiceMode?t.color.bg:t.color.textDim, cursor:'pointer', fontFamily:'inherit' }}>
            {voiceMode ? '🔊 Aloud' : '🔇 Aloud'}
          </button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'12px 20px' }}>
        {messages.length === 1 && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 2.4, fontWeight: 600, marginBottom: 10, textTransform: 'uppercase' }}>Ask Coach Valentino</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendChat(q)}
                  style={{ background: t.color.surface, border: `1px solid ${t.color.line2}`, borderRadius: 20, padding: '7px 13px', fontSize: 12, color: t.color.text, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user'
          const key = msg.id || `idx-${i}`
          const isAnimating = !isUser && key === anim.key && anim.words < anim.total
          const shown = isAnimating ? (msg.content || '').split(' ').slice(0, anim.words).join(' ') : msg.content
          const canRate = !isUser && msg.id && rateCoachMessage && !isAnimating
          return (
            <div key={msg.id || i} style={{ display:'flex', justifyContent: isUser?'flex-end':'flex-start', marginBottom:10, alignItems:'flex-end', gap:7 }}>
              {!isUser && (
                <div style={{ width:28, height:28, borderRadius:'50%', background:t.color.surface, border:`1px solid ${t.color.line2}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontFamily: t.font.display, fontSize:13, fontStyle:'italic', color:t.color.text, fontWeight:500 }}>V</div>
              )}
              <div style={{ display:'flex', flexDirection:'column', alignItems: isUser?'flex-end':'flex-start', maxWidth:'76%' }}>
                <div style={{
                  padding:'10px 14px', borderRadius:16,
                  background: isUser?t.color.text:t.color.surface,
                  color: isUser?t.color.bg:t.color.text,
                  border: isUser?'none':`1px solid ${t.color.line}`,
                  fontSize:14, lineHeight:1.5,
                  borderBottomRightRadius: isUser?4:16,
                  borderBottomLeftRadius: isUser?16:4,
                }}>
                  {shown}
                  {isAnimating && <span style={{ display:'inline-block', width:8, height:14, background:t.color.text, marginLeft:3, borderRadius:2, verticalAlign:'text-bottom', animation:'blink 0.7s infinite' }}>|</span>}
                </div>
                {!isUser && msg.savedFailed && (
                  <div style={{
                    marginTop: 4, paddingLeft: 4,
                    fontSize: 10, color: t.color.err,
                    letterSpacing: 0.3,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }} title="This reply wasn't saved to history — feedback/rating isn't available">
                    <span aria-hidden="true">⚠</span>
                    <span>Not saved — feedback unavailable</span>
                  </div>
                )}
                {canRate && (
                  <div style={{ display:'flex', gap:4, marginTop:6, paddingLeft:4 }}>
                    <button
                      onClick={() => rateCoachMessage(msg.id, 'positive')}
                      title="Helpful"
                      aria-label="Mark message as helpful"
                      style={{
                        background: msg.rating==='positive' ? 'rgba(74,222,128,0.15)' : 'transparent',
                        border: `1px solid ${msg.rating==='positive' ? 'rgba(74,222,128,0.4)' : t.color.line2}`,
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 11,
                        color: msg.rating==='positive' ? t.color.pitch : t.color.textMute,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}>👍</button>
                    <button
                      onClick={() => rateCoachMessage(msg.id, 'negative')}
                      title="Not helpful"
                      aria-label="Mark message as not helpful"
                      style={{
                        background: msg.rating==='negative' ? 'rgba(248,113,113,0.15)' : 'transparent',
                        border: `1px solid ${msg.rating==='negative' ? 'rgba(248,113,113,0.4)' : t.color.line2}`,
                        borderRadius: 999,
                        padding: '4px 10px',
                        fontSize: 11,
                        color: msg.rating==='negative' ? t.color.err : t.color.textMute,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}>👎</button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {chatLoading && (
          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:t.color.surface, border:`1px solid ${t.color.line2}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:t.font.display, fontSize:13, fontStyle:'italic', color:t.color.text, fontWeight:500 }}>V</div>
            <div style={{ background:t.color.surface, border:`1px solid ${t.color.line}`, padding:'10px 14px', borderRadius:14, fontSize:13, color:t.color.textDim }}>Thinking…</div>
          </div>
        )}
        <div ref={chatEnd} />
      </div>
      <div style={{ padding:'10px 20px 12px', borderTop:`1px solid ${t.color.line}` }}>
        <div style={{ display:'flex', gap:8 }}>
          <input style={{ ...C.inp, flex:1 }} placeholder="Ask Coach Valentino…"
            defaultValue=""
            autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
            ref={el => { if (el) chatInputRef.current = el }}
            onKeyDown={e => { if (e.key === 'Enter') { const v = e.target.value; e.target.value = ''; sendChat(v) } }} />
          <button onClick={() => { const v = chatInputRef.current?.value || ''; if (chatInputRef.current) chatInputRef.current.value = ''; sendChat(v) }}
            style={{ background:t.color.text, border:'none', borderRadius:10, padding:'0 17px', fontSize:17, fontWeight:700, color:t.color.bg, cursor:'pointer' }}>→</button>
        </div>
        <button onClick={onStartCall}
          style={{ width:'100%', marginTop:8, background:t.color.pitch, border:'none', borderRadius:12, padding:'12px 16px', fontSize:13, fontWeight:800, letterSpacing:0.8, textTransform:'uppercase', color:'#fff', cursor:'pointer', fontFamily:'inherit', boxShadow:t.shadow?.pitch }}>
          🎙️ Talk to Coach Valentino
        </button>
      </div>
    </div>
  )
}
