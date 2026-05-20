// Vercel serverless function — Coach V Claude proxy
// Holds ANTHROPIC_API_KEY server-side. Client never sees the key.
//
// Body shape:
//   { action: 'chat' | 'consolidate' | 'analyze_journal' | 'nudge_check' | 'extract_actions',
//     messages: [{role, content}],
//     athleteContext: { ... digest ... },
//     memorySummary: '...',
//     memoryThemes: { mindset, technique, recovery, goals },
//     transcript: '...' }

import Anthropic from '@anthropic-ai/sdk'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 1024

const COACH_PERSONA = `
You are Coach Valentino DiLorenzo — the founder of the DiLorenzo Soccer Mindset (DSM) program. You coach competitive soccer players (ages 13–22) on the mental side of the game: Shark Mentality (aggression, risk-taking), Goldfish Mentality (short memory for mistakes), Positive Self-Talk, Tune-Out (focus under pressure), and Visualization.

Your voice:
- Tight, direct, athlete-to-athlete. No motivational poster fluff.
- Specific over generic. Reference their actual data when you have it.
- Encouraging but honest. If they messed up, name it. If they grew, name that too.
- Soccer-fluent. You know the difference between a hold-up forward and a #10.
- Never preachy. Never long-winded. 2–4 sentences max unless they explicitly ask for more.
- No emoji spam. One per message is fine if it serves the cue (🦈 for Shark, 🐠 for Goldfish, 🔇 for Tune-Out).

You are continuous — you remember this athlete across sessions and improve every conversation. When state context is provided, treat it as ground truth about their current habits, mental score, and recent activity. When memory themes are provided, treat them as your accumulated understanding of who they are across MINDSET, TECHNIQUE, RECOVERY, and GOALS.
`.trim()

function renderThemes(themes) {
  if (!themes || typeof themes !== 'object') return ''
  const order = ['mindset', 'technique', 'recovery', 'goals']
  const lines = order
    .filter(k => themes[k] && String(themes[k]).trim())
    .map(k => `${k.toUpperCase()}: ${themes[k]}`)
  return lines.join('\n')
}

function buildSystemPrompt({ athleteContext, memorySummary, memoryThemes }) {
  const ctx = athleteContext || {}
  const memory = (memorySummary || '').trim()
  const themesBlock = renderThemes(memoryThemes)

  let prompt = COACH_PERSONA + '\n\n'

  if (themesBlock) {
    prompt += `─── WHAT YOU REMEMBER (THEMES) ───\n${themesBlock}\n\n`
  } else if (memory) {
    prompt += `─── WHAT YOU REMEMBER ABOUT THIS ATHLETE ───\n${memory}\n\n`
  }

  if (ctx.profile) {
    prompt += `─── ATHLETE PROFILE ───\nName: ${ctx.profile.full_name || 'Athlete'}\nProgram week: ${ctx.profile.program_week || 1}\nStreak: ${ctx.profile.streak || 0} day(s)\nAccess: ${ctx.profile.access_level || 'trial'}\n\n`
  }

  if (ctx.recentActionSteps?.length) {
    prompt += `─── LAST 5 ACTION-STEP LOGS ───\n${ctx.recentActionSteps.slice(0, 5).map(s => {
      const used = ['shark', 'goldfish', 'selftalk', 'tuneout'].filter(k => s[`${k}_used`]).join(', ') || 'none'
      return `${s.date} ${s.session_type}: did=${s.did_steps}, used=[${used}], mental=${s.mental}/10`
    }).join('\n')}\n\n`
  }

  if (ctx.recentBallMastery?.length) {
    prompt += `─── LAST 5 BALL-MASTERY SESSIONS ───\n${ctx.recentBallMastery.slice(0, 5).map(b =>
      `${b.date}: ${b.total_skills} skills, ${b.total_reps} reps`
    ).join('\n')}\n\n`
  }

  if (ctx.lastCheckin) {
    prompt += `─── MOST RECENT WEEKLY CHECK-IN ───\nWeek: ${ctx.lastCheckin.week}\nMental score: ${ctx.lastCheckin.mental || '—'}/10\nWins: ${ctx.lastCheckin.wins || '—'}\nStruggles: ${ctx.lastCheckin.struggles || '—'}\n\n`
  }

  if (ctx.recentJournal?.length) {
    prompt += `─── LAST 3 VOICE-JOURNAL ENTRIES ───\n${ctx.recentJournal.slice(0, 3).map(j =>
      `${j.recorded_at?.slice(0, 10)} [${j.sentiment}]: "${(j.transcript || '').slice(0, 200)}"`
    ).join('\n')}\n\n`
  }

  if (ctx.recentMatches?.length) {
    prompt += `─── LAST 5 MATCHES ───\n${ctx.recentMatches.slice(0, 5).map(m =>
      `${m.match_date} vs ${m.opponent || '—'} (${m.competition || '—'}): ${m.result || '—'} ${m.score_for ?? '?'}-${m.score_against ?? '?'} | perf ${m.performance || '—'}/10 | cues=[${(m.cues_used || []).join(',')}] | well: ${(m.went_well || '').slice(0,80)} | fix: ${(m.to_fix || '').slice(0,80)}`
    ).join('\n')}\n\n`
  }

  prompt += `─── INSTRUCTION ───\nRespond in 2–4 sentences max. Reference their data when relevant. Match their energy.`

  return prompt
}

const MEMORY_CONSOLIDATION_PROMPT = `
You are Coach Valentino synthesizing what you've learned about this athlete from recent conversations + feedback.

Output STRICT JSON with these keys (each value a single concise paragraph, max ~60 words, plain text — no markdown):
{
  "summary":  "...",   // 200-word athlete summary (your overall mental model of them)
  "mindset":  "...",   // mental-game patterns, cue words, what works/doesn't
  "technique":"...",   // technical/soccer specifics — first touch, shooting, decision-making
  "recovery": "...",   // sleep, fatigue, body state, mood swings, recovery patterns
  "goals":    "..."    // what they're explicitly working toward, current focus areas
}

Adjust based on feedback: messages marked 👎 mean shift style; 👍 means double down. Concrete over generic. Write like a private note to yourself. No prose outside the JSON.
`.trim()

const JOURNAL_ANALYSIS_PROMPT = `
You are Coach Valentino analyzing an athlete's voice-journal entry.

Given the transcript, extract:
1. Up to 4 mental cues mentioned or implied (e.g., "Shark Mentality", "Tune-out", "First touch", "Bounce-back")
2. A single sentiment tag from: locked-in, fired-up, neutral, recovering, flat, anxious, frustrated
3. A short (2-3 sentence) coach note responding to what they said
4. Up to 3 concrete action steps the athlete should take this week (each ≤12 words, imperative voice). Only suggest actions if the transcript surfaces something actionable — empty array if not.

Return STRICT JSON with keys: cues (string[]), sentiment (string), aiNote (string), proposedActions (string[]). No prose outside the JSON.
`.trim()

const NUDGE_PROMPT = `
You are Coach Valentino scanning an athlete's recent state to decide whether they need a proactive nudge right now.

Inputs include: streak, days since last action-step log, days since last ball-mastery session, days since last voice journal, last weekly check-in mood, last journal sentiment.

Decide ONE of:
- Send a nudge — if there's a real signal (streak at risk, multi-day slip, mood low, plateau, or a notable win to celebrate).
- Stay quiet — if nothing's surfaced or you already nudged today.

Return STRICT JSON: { "send": boolean, "kind": "missed-workout"|"low-mood"|"plateau"|"streak-risk"|"win"|"none", "message": "...", "signal": "..." }

Message rules: 1-2 sentences, athlete voice, no preaching, name what you noticed (specific). Signal: 1 line describing the trigger. No prose outside the JSON.
`.trim()

const STARTER_PLAN_PROMPT = `
You are Coach Valentino DiLorenzo building a 4-week mental-game starter plan for a new athlete.

Inputs include their identity goal, position, age, baseline scores (1-10 across shark/goldfish/selftalk/tuneout/confidence), top obstacles, and match cadence.

Output STRICT JSON: { "weeks": [ { "focus": "...", "cue": "...", "action": "..." }, ... ] }

Rules:
- Exactly 4 weeks.
- "focus" = short title (3-6 words, athletic, no fluff).
- "cue" = a short trigger phrase the athlete can say to themselves (≤8 words). Use 🦈 🐠 🔇 sparingly when it fits.
- "action" = one concrete weekly action (≤25 words, imperative voice).
- Week 1 targets the lowest baseline score. Week 2-3 stack on obstacles. Week 4 integrates into match-day.
- Personalize using their position and identity goal. No generic motivational filler.
- No prose outside the JSON.
`.trim()

const EXTRACT_ACTIONS_PROMPT = `
You are Coach Valentino. Given a chat transcript or journal entry, extract up to 3 concrete action steps for this athlete this week.

Each step: imperative, specific, ≤12 words. Only include genuinely actionable items — return empty array if the input is reflective without a clear next step.

Return STRICT JSON: { "proposedActions": string[] }. No prose outside the JSON.
`.trim()

function parseJsonOrEmpty(raw, fallback) {
  if (!raw) return fallback
  const cleaned = String(raw).trim().replace(/^```json\s*|\s*```$/g, '')
  try { return JSON.parse(cleaned) } catch { return fallback }
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

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured on the server' })
  }

  let body
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' })
  }

  const {
    action = 'chat',
    messages = [],
    athleteContext,
    memorySummary,
    memoryThemes,
    transcript,
    nudgeContext,
  } = body || {}

  const client = new Anthropic({ apiKey })

  try {
    if (action === 'consolidate') {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 800,
        system: MEMORY_CONSOLIDATION_PROMPT,
        messages: [{
          role: 'user',
          content: `Current memory summary:\n${memorySummary || '(empty)'}\n\nCurrent themes:\n${JSON.stringify(memoryThemes || {}, null, 2)}\n\nRecent context:\n${
            messages.map(m => `${m.role}: ${m.content}${m.feedback ? ` [athlete: ${m.feedback}]` : ''}`).join('\n')
          }`,
        }],
      })
      const raw = resp.content?.[0]?.text || '{}'
      const parsed = parseJsonOrEmpty(raw, { summary: '', mindset: '', technique: '', recovery: '', goals: '' })
      return res.status(200).json({
        summary: parsed.summary || '',
        themes: {
          mindset:   parsed.mindset   || '',
          technique: parsed.technique || '',
          recovery:  parsed.recovery  || '',
          goals:     parsed.goals     || '',
        },
        usage: resp.usage,
      })
    }

    if (action === 'analyze_journal') {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 500,
        system: JOURNAL_ANALYSIS_PROMPT,
        messages: [{ role: 'user', content: transcript || '' }],
      })
      const raw = resp.content?.[0]?.text || '{}'
      const parsed = parseJsonOrEmpty(raw, { cues: [], sentiment: 'neutral', aiNote: '', proposedActions: [] })
      return res.status(200).json({ ...parsed, usage: resp.usage })
    }

    if (action === 'nudge_check') {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: NUDGE_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(nudgeContext || {}, null, 2) }],
      })
      const raw = resp.content?.[0]?.text || '{}'
      const parsed = parseJsonOrEmpty(raw, { send: false, kind: 'none', message: '', signal: '' })
      return res.status(200).json({ ...parsed, usage: resp.usage })
    }

    if (action === 'starter_plan') {
      const onboarding = body.onboarding || {}
      const profile = body.profile || {}
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 700,
        system: STARTER_PLAN_PROMPT,
        messages: [{
          role: 'user',
          content: JSON.stringify({
            name: profile.full_name,
            identityGoal: onboarding.identityGoal,
            position: onboarding.position,
            age: onboarding.age,
            clubTeam: onboarding.clubTeam,
            baseline: onboarding.baseline,
            obstacles: onboarding.obstacles,
            matchCadence: onboarding.matchCadence,
          }, null, 2),
        }],
      })
      const raw = resp.content?.[0]?.text || '{}'
      const parsed = parseJsonOrEmpty(raw, { weeks: [] })
      return res.status(200).json({ ...parsed, usage: resp.usage })
    }

    if (action === 'extract_actions') {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 300,
        system: EXTRACT_ACTIONS_PROMPT,
        messages: [{ role: 'user', content: transcript || '' }],
      })
      const raw = resp.content?.[0]?.text || '{}'
      const parsed = parseJsonOrEmpty(raw, { proposedActions: [] })
      return res.status(200).json({ ...parsed, usage: resp.usage })
    }

    // default action: 'chat'
    const systemPrompt = buildSystemPrompt({ athleteContext, memorySummary, memoryThemes })
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    })
    return res.status(200).json({
      content: resp.content?.[0]?.text || '',
      usage: resp.usage,
    })
  } catch (err) {
    console.error('[api/coach] error:', err)
    return res.status(500).json({
      error: 'Coach V is offline right now. Try again in a moment.',
      detail: err?.message,
    })
  }
}

export const config = { runtime: 'nodejs' }
