/**
 * Coach V — client-side caller to the /api/coach Vercel serverless proxy.
 * The server holds ANTHROPIC_API_KEY. This file never touches the secret in prod.
 *
 * In development (`import.meta.env.DEV`), if `VITE_ANTHROPIC_API_KEY` is set,
 * we fall back to a direct browser call so you can test without `vercel dev`.
 * This is INSECURE for production — only for local prototyping.
 */

const PROXY_URL = '/api/coach'
const CONSOLIDATE_AFTER_N_MESSAGES = 10

const DEV_DIRECT_KEY =
  import.meta.env?.DEV && import.meta.env?.VITE_ANTHROPIC_API_KEY
    ? import.meta.env.VITE_ANTHROPIC_API_KEY
    : null

/**
 * Surfaced when the chat is empty. Imported by BotTab.
 */
export const SUGGESTED_QUESTIONS = [
  "I'm nervous about tomorrow's game",
  "I missed a sitter today, can't shake it",
  'How do I deal with my coach yelling?',
  'Help me lock in pre-game',
  "I'm in a slump — what's the move?",
  'Visualization — what do I actually do?',
]

/**
 * Talk to Coach V.
 * @param {Object} params
 * @param {Array<{role:'user'|'assistant', content:string}>} params.messages
 * @param {Object} params.athleteContext — from getAthleteStateDigest()
 * @param {string} params.memorySummary — coach_memory.athlete_summary
 * @returns {Promise<{content: string, usage?: object}>}
 */
export async function getCoachVResponse({ messages = [], athleteContext = {}, memorySummary = '' } = {}) {
  return callProxy({ action: 'chat', messages, athleteContext, memorySummary })
}

/**
 * Memory consolidation — Claude synthesizes a fresh summary from prior memory +
 * recent messages + feedback ratings.
 */
export async function consolidateMemory({ messages = [], memorySummary = '', recentFeedback = [] } = {}) {
  const annotated = messages.map(m => {
    const fb = recentFeedback.find(f => f.message_id === m.id)
    return fb ? { ...m, feedback: fb.rating } : m
  })
  return callProxy({ action: 'consolidate', messages: annotated, memorySummary })
}

/**
 * Voice-journal analysis — extract cues, sentiment, coach note.
 */
export async function analyzeVoiceJournal({ transcript }) {
  return callProxy({ action: 'analyze_journal', transcript })
}

export function shouldConsolidate(messagesSinceConsolidation) {
  return (messagesSinceConsolidation || 0) >= CONSOLIDATE_AFTER_N_MESSAGES
}

// ─── PROXY CALL ─────────────────────────────────────────────────────────

async function callProxy(payload) {
  if (DEV_DIRECT_KEY) return callAnthropicDirect(payload)

  const res = await fetch(PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `Coach V request failed (${res.status})`)
  }
  return res.json()
}

// Dev-only direct browser→Anthropic call.
async function callAnthropicDirect(payload) {
  const { action, messages, athleteContext, memorySummary, transcript } = payload
  const MODEL = 'claude-sonnet-4-6'

  let system = buildCoachPersona({ athleteContext, memorySummary })
  let body = []
  let maxTokens = 1024

  if (action === 'consolidate') {
    system = CONSOLIDATION_SYSTEM
    body = [{
      role: 'user',
      content: `Current memory:\n${memorySummary || '(empty)'}\n\nRecent context:\n${
        (messages || []).map(m => `${m.role}: ${m.content}${m.feedback ? ` [athlete: ${m.feedback}]` : ''}`).join('\n')
      }`,
    }]
    maxTokens = 600
  } else if (action === 'analyze_journal') {
    system = JOURNAL_SYSTEM
    body = [{ role: 'user', content: transcript || '' }]
    maxTokens = 400
  } else {
    body = (messages || []).map(m => ({ role: m.role, content: m.content }))
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': DEV_DIRECT_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: body }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Direct Anthropic call failed (${res.status}): ${errText.slice(0, 200)}`)
  }
  const data = await res.json()
  const text = data.content?.[0]?.text || ''

  if (action === 'analyze_journal') {
    try { return JSON.parse(text) }
    catch { return { cues: [], sentiment: 'neutral', aiNote: '' } }
  }
  if (action === 'consolidate') return { summary: text }
  return { content: text, usage: data.usage }
}

// ─── DEV-MODE PERSONA (mirror of server prompts) ──────────────────────

function buildCoachPersona({ athleteContext, memorySummary }) {
  const ctx = athleteContext || {}
  const memory = (memorySummary || '').trim()
  let p = COACH_PERSONA_BASE + '\n\n'
  if (memory) p += `─── WHAT YOU REMEMBER ABOUT THIS ATHLETE ───\n${memory}\n\n`
  if (ctx.profile) p += `─── ATHLETE PROFILE ───\nName: ${ctx.profile.full_name || 'Athlete'}\nProgram week: ${ctx.profile.program_week || 1}\nStreak: ${ctx.profile.streak || 0}\n\n`
  if (ctx.recentActionSteps?.length) {
    p += `─── LAST 5 ACTION-STEP LOGS ───\n${ctx.recentActionSteps.slice(0, 5).map(s => {
      const used = ['shark','goldfish','selftalk','tuneout'].filter(k => s[`${k}_used`]).join(', ') || 'none'
      return `${s.date} ${s.session_type}: did=${s.did_steps}, used=[${used}], mental=${s.mental}/10`
    }).join('\n')}\n\n`
  }
  if (ctx.lastCheckin) {
    p += `─── LAST WEEKLY CHECK-IN ───\nWeek ${ctx.lastCheckin.week}, mental=${ctx.lastCheckin.mental}/10\nWins: ${ctx.lastCheckin.wins || '—'}\nStruggles: ${ctx.lastCheckin.struggles || '—'}\n\n`
  }
  if (ctx.recentJournal?.length) {
    p += `─── RECENT VOICE-JOURNAL ENTRIES ───\n${ctx.recentJournal.slice(0, 3).map(j =>
      `${j.recorded_at?.slice(0,10)} [${j.sentiment}]: "${(j.transcript||'').slice(0,160)}"`
    ).join('\n')}\n\n`
  }
  p += `─── INSTRUCTION ───\nRespond in 2–4 sentences max. Reference their data when relevant. Match their energy.`
  return p
}

const COACH_PERSONA_BASE = `
You are Coach Valentino DiLorenzo — the founder of the DiLorenzo Soccer Mindset (DSM) program. You coach competitive soccer players (ages 13–22) on the mental side: Shark Mentality (aggression, risk-taking), Goldfish Mentality (short memory for mistakes), Positive Self-Talk, Tune-Out (focus under pressure), and Visualization.

Voice: tight, direct, athlete-to-athlete. No motivational poster fluff. Specific over generic. Encouraging but honest. Soccer-fluent. 2–4 sentences max. You remember this athlete across sessions.
`.trim()

const CONSOLIDATION_SYSTEM = `
You are Coach Valentino synthesizing what you've learned about this athlete from recent conversations + their feedback.

Output a fresh "athlete summary" (max 200 words) for long-term memory. Include cue words they respond to, recurring patterns, growth edges, their voice/tone, and adjustments based on 👍/👎 feedback. Concrete. No generic fluff.
`.trim()

const JOURNAL_SYSTEM = `
You are Coach Valentino analyzing an athlete's voice-journal transcript.

Extract: (1) up to 4 mental cues, (2) sentiment from [locked-in, fired-up, neutral, recovering, flat, anxious, frustrated], (3) a short (2-3 sentence) coach note responding to what they said.

Return STRICT JSON with keys: cues (string[]), sentiment (string), aiNote (string). No prose outside the JSON.
`.trim()
