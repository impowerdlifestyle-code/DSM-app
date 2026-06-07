// Client-side TTS — POSTs to /api/tts which holds ELEVENLABS_API_KEY server-side.
// Falls back to the browser's SpeechSynthesis if the proxy is unavailable.

import { authFetch } from './authFetch.js'

export async function speakText(text, voiceId) {
  try {
    const res = await authFetch('/api/tts', {
      method: 'POST',
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

// Like speakText, but resolves only when playback finishes — for the hands-free
// call loop, which must wait for Coach to stop talking before listening again.
// onStart(audio|null) hands back the Audio element so the caller can pause it on
// hang-up. Always resolves (never rejects); falls back to SpeechSynthesis.
// `audioEl` lets the caller pass a single HTMLAudioElement that was already
// unlocked inside a user gesture (required on iOS — a fresh `new Audio()` played
// from an async continuation is blocked). When given, we swap its src instead of
// creating a new element so playback survives the autoplay policy.
export function speakAndWait(text, voiceId, { onStart, audioEl } = {}) {
  return new Promise((resolve) => {
    const fallback = () => {
      try {
        const u = new SpeechSynthesisUtterance(text)
        u.rate = 1.05
        u.pitch = 0.95
        u.onend = () => resolve(null)
        u.onerror = () => resolve(null)
        onStart?.(null)
        window.speechSynthesis.speak(u)
      } catch { resolve(null) }
    }
    authFetch('/api/tts', {
      method: 'POST',
      body: JSON.stringify(voiceId ? { text, voiceId } : { text }),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`TTS proxy ${res.status}`)
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        const audio = audioEl || new Audio()
        audio.muted = false
        audio.playsInline = true
        audio.src = url
        const done = () => { URL.revokeObjectURL(url); resolve(audio) }
        audio.onended = done
        audio.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
        onStart?.(audio)
        const p = audio.play()
        if (p && p.catch) p.catch(() => { URL.revokeObjectURL(url); fallback() })
      })
      .catch(fallback)
  })
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
