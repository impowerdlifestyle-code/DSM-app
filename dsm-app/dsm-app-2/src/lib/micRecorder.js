// Mic capture for the hands-free Coach call. Uses getUserMedia + MediaRecorder,
// which work in iOS Safari (and most in-app browsers) where the Web Speech API
// (webkitSpeechRecognition) is a no-op or missing entirely. Audio is recorded to
// a Blob and transcribed server-side via /api/stt.
//
//   const rec = await recordUtterance({ onError, onLevel })
//   const result = await rec.promise   // { blob, mimeType } | null
//   rec.stop()                          // manual stop (returned blob still resolves)

// iOS Safari records audio/mp4; Chromium prefers audio/webm;opus.
const MIME_CANDIDATES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

export function micSupported() {
  return typeof navigator !== 'undefined'
    && !!navigator.mediaDevices?.getUserMedia
    && typeof window !== 'undefined'
    && typeof window.MediaRecorder !== 'undefined'
}

function pickMime() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return ''
  for (const m of MIME_CANDIDATES) if (MediaRecorder.isTypeSupported(m)) return m
  return ''
}

// Records one spoken turn. Auto-stops when the speaker pauses (RMS below the
// gate for `silenceMs` once speech has been detected) or after `maxMs`. Resolves
// to { blob, mimeType } or null (permission denied / empty / error).
export async function recordUtterance({
  onError,
  onLevel,
  silenceMs = 1400,
  maxMs = 20000,
  speakThreshold = 0.04,
} = {}) {
  let stream
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    })
  } catch (e) {
    const denied = e?.name === 'NotAllowedError' || e?.name === 'SecurityError'
    onError?.(denied ? 'not-allowed' : 'audio-capture')
    return { promise: Promise.resolve(null), stop() {} }
  }

  const mimeType = pickMime()
  let mr
  try {
    mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
  } catch {
    onError?.('unsupported')
    stream.getTracks().forEach(t => t.stop())
    return { promise: Promise.resolve(null), stop() {} }
  }

  const chunks = []
  mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }

  let audioCtx, analyser, levelTimer
  let stopped = false
  let heardSpeech = false
  let silenceStart = 0
  const startedAt = Date.now()

  const cleanup = () => {
    if (levelTimer) clearInterval(levelTimer)
    try { audioCtx?.close() } catch { /* ignore */ }
    stream.getTracks().forEach(t => t.stop())
  }

  const stop = () => {
    if (stopped) return
    stopped = true
    try { if (mr.state !== 'inactive') mr.stop() } catch { /* ignore */ }
  }

  // Volume-gated auto-stop (lightweight VAD). Falls back to maxMs-only if the
  // AudioContext can't be created.
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    audioCtx = new Ctx()
    // iOS can hand back a suspended context on turns after the first; without a
    // resume the analyser reads silence and the auto-stop never fires.
    if (audioCtx.state === 'suspended') { audioCtx.resume().catch(() => {}) }
    const src = audioCtx.createMediaStreamSource(stream)
    analyser = audioCtx.createAnalyser()
    analyser.fftSize = 512
    src.connect(analyser)
    const buf = new Uint8Array(analyser.frequencyBinCount)
    levelTimer = setInterval(() => {
      if (stopped) return
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v }
      const rms = Math.sqrt(sum / buf.length)
      onLevel?.(rms)
      const now = Date.now()
      if (rms > speakThreshold) { heardSpeech = true; silenceStart = 0 }
      else if (heardSpeech) {
        if (!silenceStart) silenceStart = now
        else if (now - silenceStart > silenceMs) { stop(); return }
      }
      if (now - startedAt > maxMs) stop()
    }, 100)
  } catch {
    setTimeout(stop, maxMs)
  }

  const promise = new Promise((resolve) => {
    mr.onstop = () => {
      cleanup()
      if (!chunks.length) { resolve(null); return }
      const type = mimeType || chunks[0].type || 'audio/webm'
      const blob = new Blob(chunks, { type })
      resolve(blob.size > 800 ? { blob, mimeType: blob.type || type } : null)
    }
    mr.onerror = () => { cleanup(); resolve(null) }
  })

  try {
    mr.start()
  } catch {
    onError?.('start-failed')
    cleanup()
    return { promise: Promise.resolve(null), stop() {} }
  }

  return { promise, stop }
}
