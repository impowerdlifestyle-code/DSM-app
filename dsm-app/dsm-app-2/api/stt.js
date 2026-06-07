// Vercel serverless function — ElevenLabs speech-to-text proxy.
// Holds ELEVENLABS_API_KEY server-side; the client never sees it.
//
// Why this exists: the hands-free Coach call can't use the browser's
// webkitSpeechRecognition — it's a no-op in iOS Safari and entirely absent in
// in-app browsers (Instagram, the Google app, etc.). So the client captures mic
// audio with MediaRecorder and posts it here for transcription instead.
//
// Body: { audio: base64-string, mimeType?: string }
// Returns: { text } on 200, JSON { error } on failure.
//
// Auth: requires Supabase JWT + active access — gated by authGuard requirePaidAccess.

import { authGuard } from './_auth.js'

const STT_MODEL = 'scribe_v1'
const MAX_BYTES = 8 * 1024 * 1024

export default async function handler(req, res) {
  const auth = await authGuard(req, res, { requirePaidAccess: true })
  if (!auth.ok) return

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured on the server' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const b64 = body?.audio
  if (!b64 || typeof b64 !== 'string') {
    return res.status(400).json({ error: 'audio (base64) is required' })
  }
  const mimeType = (body?.mimeType || 'audio/webm').toString()

  let buf
  try {
    buf = Buffer.from(b64, 'base64')
  } catch {
    return res.status(400).json({ error: 'bad audio encoding' })
  }
  if (!buf.length) return res.status(400).json({ error: 'empty audio' })
  if (buf.length > MAX_BYTES) return res.status(413).json({ error: 'audio too large' })

  try {
    const form = new FormData()
    form.append('file', new Blob([buf], { type: mimeType }), 'utterance')
    form.append('model_id', STT_MODEL)

    const elevenRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    })
    if (!elevenRes.ok) {
      const detail = await elevenRes.text().catch(() => '')
      return res.status(elevenRes.status).json({
        error: 'ElevenLabs STT failed',
        detail: detail.slice(0, 400),
      })
    }
    const data = await elevenRes.json().catch(() => ({}))
    return res.status(200).json({ text: (data?.text || '').toString().trim() })
  } catch (err) {
    console.error('[api/stt] error:', err)
    return res.status(500).json({ error: 'STT proxy error', detail: err?.message })
  }
}

export const config = { runtime: 'nodejs' }
