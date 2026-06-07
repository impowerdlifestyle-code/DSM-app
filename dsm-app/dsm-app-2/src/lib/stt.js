// Client-side speech-to-text — posts recorded mic audio to /api/stt, which holds
// ELEVENLABS_API_KEY server-side. Used by the hands-free Coach call instead of
// webkitSpeechRecognition (broken on iOS / in-app browsers).

import { authFetch } from './authFetch.js'

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = () => reject(r.error || new Error('read failed'))
    r.readAsDataURL(blob)
  })
}

export async function transcribe(blob, mimeType) {
  const audio = await blobToBase64(blob)
  const res = await authFetch('/api/stt', {
    method: 'POST',
    body: JSON.stringify({ audio, mimeType: mimeType || blob.type || 'audio/webm' }),
  })
  if (!res.ok) throw new Error(`STT proxy ${res.status}`)
  const data = await res.json().catch(() => ({}))
  return (data?.text || '').trim()
}
