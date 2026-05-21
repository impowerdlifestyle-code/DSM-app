// Client-side TTS — POSTs to /api/tts which holds ELEVENLABS_API_KEY server-side.
// Falls back to the browser's SpeechSynthesis if the proxy is unavailable.

export async function speakText(text, voiceId) {
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(voiceId ? { text, voiceId } : { text }),
    })
    if (!res.ok) throw new Error(`TTS proxy ${res.status}`)
    const blob = await res.blob()
    const audio = new Audio(URL.createObjectURL(blob))
    await audio.play()
    return audio
  } catch (err) {
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.1
    u.pitch = 0.9
    window.speechSynthesis.speak(u)
    return null
  }
}

export async function fetchTtsBlob(text, voiceId) {
  const res = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(voiceId ? { text, voiceId } : { text }),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `TTS request failed (${res.status})`)
  }
  return res.blob()
}
