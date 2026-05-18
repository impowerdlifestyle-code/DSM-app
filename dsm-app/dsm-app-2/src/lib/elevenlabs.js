const ELEVEN_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY
const ELEVEN_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID

export async function speakText(text) {
  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE_ID}`, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVEN_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
        voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.3, use_speaker_boost: true },
      }),
    })
    if (!res.ok) throw new Error()
    new Audio(URL.createObjectURL(await res.blob())).play()
  } catch {
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.1
    u.pitch = 0.9
    window.speechSynthesis.speak(u)
  }
}
