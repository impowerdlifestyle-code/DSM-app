// Vercel serverless function — ElevenLabs text-to-speech proxy.
// Holds ELEVENLABS_API_KEY server-side; the client never sees it.
//
// Body: { text: string, voiceId?: string, modelId?: string, voiceSettings?: {...} }
// Returns: audio/mpeg bytes on 200, JSON { error } on failure.

const DEFAULT_MODEL = 'eleven_monolingual_v1'
const DEFAULT_SETTINGS = {
  stability: 0.5,
  similarity_boost: 0.85,
  style: 0.3,
  use_speaker_boost: true,
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
    return res.status(200).end()
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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

  const text = (body?.text || '').toString().trim()
  if (!text) return res.status(400).json({ error: 'text is required' })

  const voiceId = body?.voiceId || process.env.ELEVENLABS_VOICE_ID
  if (!voiceId) {
    return res.status(400).json({ error: 'voiceId required (or set ELEVENLABS_VOICE_ID env)' })
  }

  const modelId = body?.modelId || DEFAULT_MODEL
  const voiceSettings = { ...DEFAULT_SETTINGS, ...(body?.voiceSettings || {}) }

  try {
    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({ text, model_id: modelId, voice_settings: voiceSettings }),
    })
    if (!elevenRes.ok) {
      const detail = await elevenRes.text().catch(() => '')
      return res.status(elevenRes.status).json({
        error: 'ElevenLabs TTS failed',
        detail: detail.slice(0, 400),
      })
    }
    const buf = Buffer.from(await elevenRes.arrayBuffer())
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(buf)
  } catch (err) {
    console.error('[api/tts] error:', err)
    return res.status(500).json({ error: 'TTS proxy error', detail: err?.message })
  }
}

export const config = { runtime: 'nodejs' }
