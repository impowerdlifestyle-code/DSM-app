/**
 * Coach V — client-side caller to the /api/coach Vercel serverless proxy.
 * The server holds ANTHROPIC_API_KEY. This file never touches the secret in prod.
 *
 * In development (`import.meta.env.DEV`), if `VITE_ANTHROPIC_API_KEY` is set,
 * we fall back to a direct browser call so you can test without `vercel dev`.
 * This is INSECURE for production — only for local prototyping.
 */

import { authFetch } from './authFetch.js'

const PROXY_URL = '/api/coach'
const CONSOLIDATE_AFTER_N_MESSAGES = 10

const DEV_DIRECT_KEY =
  import.meta.env?.DEV && import.meta.env?.VITE_ANTHROPIC_API_KEY
    ? import.meta.env.VITE_ANTHROPIC_API_KEY
    : null

export const SUGGESTED_QUESTIONS = [
  "I'm nervous about tomorrow's game",
  "I missed a sitter today, can't shake it",
  'How do I deal with my coach yelling?',
  'Help me lock in pre-game',
  "I'm in a slump — what's the move?",
  'Visualization — what do I actually do?',
]

// Curated parenting prompts — the highest-stakes moments soccer parents face.
export const PARENT_PROMPTS = [
  'What do I say after a bad game?',
  'My child cries after mistakes',
  'How do I build confidence without pressure?',
  'My child fears stronger teams',
  'How do I stop sideline coaching?',
  'What to say on the car ride home',
  'How do I respond after a benching?',
]

export async function getCoachVResponse({ messages = [], athleteContext = {}, memorySummary = '', memoryThemes = null } = {}) {
  return callProxy({ action: 'chat', messages, athleteContext, memorySummary, memoryThemes })
}

export async function getParentCoachResponse({ messages = [], parentContext = {} } = {}) {
  return callProxy({ action: 'parent_chat', messages, parentContext })
}

export async function reviewActionSteps({ actionSteps = [], athleteName = '' } = {}) {
  return callProxy({ action: 'review_action_steps', actionSteps, athleteName })
}

export async function consolidateMemory({ messages = [], memorySummary = '', memoryThemes = null, recentFeedback = [] } = {}) {
  const annotated = messages.map(m => {
    const fb = recentFeedback.find(f => f.message_id === m.id)
    return fb ? { ...m, feedback: fb.rating } : m
  })
  return callProxy({ action: 'consolidate', messages: annotated, memorySummary, memoryThemes })
}

export async function analyzeVoiceJournal({ transcript }) {
  return callProxy({ action: 'analyze_journal', transcript })
}

export async function checkForNudge({ nudgeContext }) {
  return callProxy({ action: 'nudge_check', nudgeContext })
}

export async function extractActionsFromText({ transcript }) {
  return callProxy({ action: 'extract_actions', transcript })
}

export function shouldConsolidate(messagesSinceConsolidation) {
  return (messagesSinceConsolidation || 0) >= CONSOLIDATE_AFTER_N_MESSAGES
}

// ─── PROXY CALL ─────────────────────────────────────────────────────────

async function callProxy(payload) {
  if (DEV_DIRECT_KEY) return callAnthropicDirect(payload)

  const res = await authFetch(PROXY_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}))
    throw new Error(errBody.error || `Coach V request failed (${res.status})`)
  }
  return res.json()
}

async function callAnthropicDirect(payload) {
  const { action, messages, athleteContext, memorySummary, memoryThemes, transcript, nudgeContext, parentContext, actionSteps, athleteName } = payload
  const MODEL = 'claude-sonnet-4-6'

  let system = buildCoachPersona({ athleteContext, memorySummary, memoryThemes })
  let body = []
  let maxTokens = 1024

  if (action === 'parent_chat') {
    system = PARENT_DEV_SYSTEM(parentContext)
    body = (messages || []).map(m => ({ role: m.role, content: m.content }))
    maxTokens = 1400
  } else if (action === 'review_action_steps') {
    system = REVIEW_ACTIONS_DEV_SYSTEM
    const digest = (actionSteps || []).slice(0, 14).map(s => {
      const used = ['shark','goldfish','selftalk','tuneout','visualization'].filter(k => s[`${k}_used`]).join(', ') || 'none'
      return `${s.date || '?'} ${s.session_type || ''}: did=${s.did_action_steps}, used=[${used}], mental=${s.mental ?? '—'}/10`
    }).join('\n')
    body = [{ role: 'user', content: `Athlete: ${athleteName || 'Athlete'}\n\nRecent action-step logs:\n${digest || '(none)'}` }]
    maxTokens = 500
  } else if (action === 'consolidate') {
    system = CONSOLIDATION_SYSTEM
    body = [{
      role: 'user',
      content: `Current memory summary:\n${memorySummary || '(empty)'}\n\nCurrent themes:\n${JSON.stringify(memoryThemes || {}, null, 2)}\n\nRecent context:\n${
        (messages || []).map(m => `${m.role}: ${m.content}${m.feedback ? ` [athlete: ${m.feedback}]` : ''}`).join('\n')
      }`,
    }]
    maxTokens = 800
  } else if (action === 'analyze_journal') {
    system = JOURNAL_SYSTEM
    body = [{ role: 'user', content: transcript || '' }]
    maxTokens = 500
  } else if (action === 'nudge_check') {
    system = NUDGE_SYSTEM
    body = [{ role: 'user', content: JSON.stringify(nudgeContext || {}, null, 2) }]
    maxTokens = 300
  } else if (action === 'extract_actions') {
    system = EXTRACT_ACTIONS_SYSTEM
    body = [{ role: 'user', content: transcript || '' }]
    maxTokens = 300
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
  // Anthropic returns content as an array of typed blocks (text, tool_use,
  // image, ...). Pick the first text block — picking [0] blindly returns
  // empty string for non-text leaders. Defensive over guess-correct.
  const text = extractText(data?.content)
  const cleaned = text.trim().replace(/^```json\s*|\s*```$/g, '')

  if (action === 'analyze_journal') {
    const parsed = safeParse(cleaned)
    return {
      cues: toStringArray(parsed?.cues),
      sentiment: toStr(parsed?.sentiment) || 'neutral',
      aiNote: toStr(parsed?.aiNote),
      proposedActions: toStringArray(parsed?.proposedActions),
    }
  }
  if (action === 'consolidate') {
    const parsed = safeParse(cleaned)
    if (!parsed) return { summary: text, themes: { mindset:'', technique:'', recovery:'', goals:'' } }
    return {
      summary: toStr(parsed.summary),
      themes: {
        mindset:   toStr(parsed.mindset),
        technique: toStr(parsed.technique),
        recovery:  toStr(parsed.recovery),
        goals:     toStr(parsed.goals),
      },
    }
  }
  if (action === 'nudge_check') {
    const parsed = safeParse(cleaned)
    return {
      send: !!parsed?.send,
      kind: toStr(parsed?.kind) || 'none',
      message: toStr(parsed?.message),
      signal: toStr(parsed?.signal),
    }
  }
  if (action === 'extract_actions') {
    const parsed = safeParse(cleaned)
    return { proposedActions: toStringArray(parsed?.proposedActions) }
  }
  if (action === 'review_action_steps') {
    const parsed = safeParse(cleaned)
    return {
      summary: toStr(parsed?.summary),
      working: toStr(parsed?.working),
      adjust:  toStr(parsed?.adjust),
      focus:   toStr(parsed?.focus),
    }
  }
  return { content: text, usage: data.usage }
}

// ─── RESPONSE SHAPE GUARDS (H7) ────────────────────────────────────────
// Anthropic SDK shapes drift across versions and tool-use can put non-text
// blocks at content[0]. These helpers prevent malformed responses from
// poisoning coach_memory.themes or VoiceJournal state.
function extractText(content) {
  if (!Array.isArray(content)) return ''
  for (const block of content) {
    if (block?.type === 'text' && typeof block.text === 'string') return block.text
  }
  return ''
}
function safeParse(raw) {
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}
function toStr(v) {
  if (typeof v === 'string') return v
  if (v == null) return ''
  return ''  // discard non-string scalars/objects rather than coerce JSON garbage
}
function toStringArray(v) {
  if (!Array.isArray(v)) return []
  return v.filter(x => typeof x === 'string').slice(0, 20)
}

// ─── DEV-MODE PERSONA (mirror of server prompts) ──────────────────────

function renderThemes(themes) {
  if (!themes || typeof themes !== 'object') return ''
  const order = ['mindset', 'technique', 'recovery', 'goals']
  const lines = order
    .filter(k => themes[k] && String(themes[k]).trim())
    .map(k => `${k.toUpperCase()}: ${themes[k]}`)
  return lines.join('\n')
}

function buildCoachPersona({ athleteContext, memorySummary, memoryThemes }) {
  const ctx = athleteContext || {}
  const memory = (memorySummary || '').trim()
  const themes = renderThemes(memoryThemes)
  let p = COACH_PERSONA_BASE + '\n\n'
  if (themes) p += `─── WHAT YOU REMEMBER (THEMES) ───\n${themes}\n\n`
  else if (memory) p += `─── WHAT YOU REMEMBER ABOUT THIS ATHLETE ───\n${memory}\n\n`
  if (ctx.profile) p += `─── ATHLETE PROFILE ───\nName: ${ctx.profile.full_name || 'Athlete'}\nProgram week: ${ctx.profile.program_week || 1}\nStreak: ${ctx.profile.streak || 0}\n\n`
  if (ctx.recentActionSteps?.length) {
    p += `─── LAST 5 ACTION-STEP LOGS ───\n${ctx.recentActionSteps.slice(0, 5).map(s => {
      const used = ['shark','goldfish','selftalk','tuneout'].filter(k => s[`${k}_used`]).join(', ') || 'none'
      return `${s.date} ${s.session_type}: did=${s.did_action_steps}, used=[${used}], mental=${s.mental}/10`
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
You are Coach Valentino synthesizing what you've learned about this athlete.

Output STRICT JSON with keys: summary (~200 words), mindset, technique, recovery, goals (each ~60 words plain text, no markdown). Adjust based on 👍/👎 feedback. No prose outside the JSON.
`.trim()

const JOURNAL_SYSTEM = `
You are Coach Valentino analyzing an athlete's voice-journal transcript.

Extract: (1) up to 4 mental cues, (2) sentiment from [locked-in, fired-up, neutral, recovering, flat, anxious, frustrated], (3) 2-3 sentence coach note, (4) up to 3 concrete action steps for this week (imperative, ≤12 words each) — empty array if nothing actionable.

Return STRICT JSON: cues (string[]), sentiment (string), aiNote (string), proposedActions (string[]). No prose outside the JSON.
`.trim()

const NUDGE_SYSTEM = `
You are Coach Valentino deciding whether to send a proactive nudge based on athlete state.

Send a nudge if: streak at risk, multi-day inactivity, low mood, plateau, or notable win. Stay quiet otherwise.

Return STRICT JSON: { send (bool), kind (missed-workout|low-mood|plateau|streak-risk|win|none), message (1-2 sentences athlete-voice), signal (1 line trigger) }. No prose outside the JSON.
`.trim()

// Condensed dev-mode mirrors of the server parent + review prompts. Prod uses
// the full personas in api/coach.js — these keep `vercel dev`-free local testing working.
function PARENT_DEV_SYSTEM(parentContext) {
  const ctx = parentContext || {}
  let extra = ''
  if (ctx.athleteName || ctx.position) {
    extra = `\n\nThis parent's athlete: ${[ctx.athleteName, ctx.position, ctx.age && `age ${ctx.age}`, ctx.lastResult && `last match ${ctx.lastResult}`].filter(Boolean).join(', ')}. Use the kid's first name naturally. You do NOT see the athlete's private chats.`
  }
  return `You are Coach Valentino DiLorenzo coaching a soccer PARENT on supporting their competitive youth player — what to say and not say, the car ride home ("I love watching you play"), reacting after games, building confidence without pressure, handling mistakes (goldfish reset), pre-game calm, sideline silence, benchings, fear of stronger teams, crying after mistakes. Give them real words to say, in quotes. Detach love from results. 4-7 sentences. Plain text only — no markdown, lists, or bold. No therapy-bot openers, no "you've got this" closers. End with a concrete line or one move to try this week.${extra}`
}

const REVIEW_ACTIONS_DEV_SYSTEM = `
You are Coach Valentino reviewing an athlete's recent DSM action-step logs. Reward consistency and effort, never talent or results. Be specific to their data (which of the 5 tools — Shark, Goldfish, Self-Talk, Tune-Out, Visualization — they lean on or avoid; where mental scores dip).

Return STRICT JSON: { "summary": "1-2 sentences naming the pattern", "working": "what they do well, specific", "adjust": "the one biggest thing to tighten", "focus": "one concrete 7-day commitment, imperative, ≤18 words" }. Plain text in each value, warm coach voice. No prose outside the JSON.
`.trim()

const EXTRACT_ACTIONS_SYSTEM = `
Extract up to 3 concrete action steps from the input. Each ≤12 words, imperative. Empty array if input is reflective with no clear next step.

Return STRICT JSON: { proposedActions (string[]) }. No prose outside the JSON.
`.trim()
