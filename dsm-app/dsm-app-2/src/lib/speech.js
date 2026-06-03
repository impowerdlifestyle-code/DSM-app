// Unified speech-to-text. The Web Speech API (webkitSpeechRecognition) works
// in Safari/Chrome but NOT inside the iOS Capacitor WKWebView — so on native
// we use @capacitor-community/speech-recognition instead. Same callback shape
// either way.
//
//   const handle = await startDictation({ onText, onError, onEnd, continuous })
//   handle.stop()
//
// onText(fullText)   — latest transcript (interim on continuous, final otherwise)
// onError(code)      — 'unsupported' | 'not-allowed' | 'no-speech' | 'audio-capture'
//                      | 'network' | 'aborted' | 'restart-failed' | 'start-failed' | string
// onEnd()            — recognition ended (natural stop or after .stop())

import { isNativeApp } from './platform.js'

export function speechSupported() {
  if (isNativeApp()) return true // plugin present in native build
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export async function startDictation({ onText, onError, onEnd, continuous = true, lang = 'en-US' } = {}) {
  if (isNativeApp()) return startNative({ onText, onError, onEnd, continuous, lang })
  return startWeb({ onText, onError, onEnd, continuous, lang })
}

function startWeb({ onText, onError, onEnd, continuous, lang }) {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SR) { onError?.('unsupported'); return { stop() {}, unsupported: true } }

  const rec = new SR()
  rec.lang = lang
  rec.continuous = continuous
  rec.interimResults = continuous
  let stopped = false

  rec.onresult = (e) => {
    let full = ''
    for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript + ' '
    onText?.(full.trim())
  }
  rec.onerror = (e) => onError?.(e.error || 'unknown')
  rec.onend = () => {
    // Browsers auto-stop continuous recognition after a pause — restart unless
    // the caller explicitly stopped. iOS Safari throws if start() runs too soon.
    if (continuous && !stopped) {
      try { rec.start() } catch { onError?.('restart-failed'); onEnd?.() }
    } else {
      onEnd?.()
    }
  }
  try { rec.start() } catch { onError?.('start-failed'); return { stop() {} } }
  return { stop() { stopped = true; try { rec.stop() } catch { /* ignore */ } } }
}

async function startNative({ onText, onError, onEnd, continuous, lang }) {
  let SpeechRecognition
  try {
    ({ SpeechRecognition } = await import('@capacitor-community/speech-recognition'))
  } catch {
    onError?.('unsupported'); return { stop() {} }
  }
  try {
    const perm = await SpeechRecognition.requestPermissions()
    if (perm?.speechRecognition && perm.speechRecognition !== 'granted') {
      onError?.('not-allowed'); return { stop() {} }
    }
    await SpeechRecognition.removeAllListeners()

    if (continuous) {
      await SpeechRecognition.addListener('partialResults', (data) => {
        const m = data?.matches?.[0]
        if (m) onText?.(m)
      })
      await SpeechRecognition.addListener('listeningState', (data) => {
        if (data?.status === 'stopped') onEnd?.()
      })
      await SpeechRecognition.start({ language: lang, partialResults: true, popup: false })
      return {
        async stop() {
          try { await SpeechRecognition.stop() } catch { /* ignore */ }
          try { await SpeechRecognition.removeAllListeners() } catch { /* ignore */ }
          onEnd?.()
        },
      }
    }

    // One-shot: start() resolves with the final matches.
    const res = await SpeechRecognition.start({ language: lang, partialResults: false, popup: false })
    const m = res?.matches?.[0]
    if (m) onText?.(m)
    onEnd?.()
    return { stop() { try { SpeechRecognition.stop() } catch { /* ignore */ } } }
  } catch (err) {
    onError?.(err?.message || 'native-failed')
    return { stop() {} }
  }
}
