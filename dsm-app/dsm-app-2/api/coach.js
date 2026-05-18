// Vercel serverless function — Coach V Claude proxy
// Holds ANTHROPIC_API_KEY server-side. Client never sees the key.
//
// Body shape:
//   { action: 'chat' | 'consolidate' | 'analyze_journal',
//     messages: [{role, content}],
//     athleteContext: { ... digest ... },
//     memorySummary: '...' }

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

You are continuous — you remember this athlete across sessions and improve every conversation. When state context is provided, treat it as ground truth about their current habits, mental score, and recent activity. When a long-term memory summary is provided, treat it as your accumulated understanding of who they are.
`.trim()

function buildSystemPrompt({ athleteContext, memorySummary }) {
  const ctx = athleteContext || {}
  const memory = (memorySummary || '').trim()

  let prompt = COACH_PERSONA + '\n\n'

  if (memory) {
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

  prompt += `─── INSTRUCTION ───\nRespond in 2–4 sentences max. Reference their data when relevant. Match their energy.`

  return prompt
}

const MEMORY_CONSOLIDATION_PROMPT = `
You are Coach Valentino synthesizing what you've learned about this athlete from your recent conversations + any feedback they gave you.

Output a fresh "athlete summary" (max 200 words) that you'll use as your long-term memory of them. Include:
- Cue words they respond to (or don't)
- Recurring patterns you've noticed (mental, physical, situational)
- Their growth edges (what they're working on, where they're stuck)
- Their voice / tone (how they talk to you)
- Any feedback from the athlete: messages they marked 👎 mean adjust your style; 👍 means double down.

Be concrete. No generic fluff. This is YOUR memory of THIS athlete — write like a private note to yourself.
`.trim()

const JOURNAL_ANALYSIS_PROMPT = `
You are Coach Valentino analyzing an athlete's voice-journal entry.

Given the transcript, extract:
1. Up to 4 mental cues mentioned or implied (e.g., "Shark Mentality", "Tune-out", "First touch", "Bounce-back")
2. A single sentiment tag from: locked-in, fired-up, neutral, recovering, flat, anxious, frustrated
3. A short (2-3 sentence) coach note responding to what they said

Return STRICT JSON with keys: cues (string[]), sentiment (string), aiNote (string). No prose outside the JSON.
`.trim()

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

  const { action = 'chat', messages = [], athleteContext, memorySummary, transcript } = body || {}

  const client = new Anthropic({ apiKey })

  try {
    if (action === 'consolidate') {
      // Build a summary doc from current memory + recent messages + feedback
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 600,
        system: MEMORY_CONSOLIDATION_PROMPT,
        messages: [{
          role: 'user',
          content: `Current memory:\n${memorySummary || '(empty)'}\n\nRecent context:\n${
            messages.map(m => `${m.role}: ${m.content}${m.feedback ? ` [athlete: ${m.feedback}]` : ''}`).join('\n')
          }`,
        }],
      })
      return res.status(200).json({
        summary: resp.content?.[0]?.text || '',
        usage: resp.usage,
      })
    }

    if (action === 'analyze_journal') {
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: 400,
        system: JOURNAL_ANALYSIS_PROMPT,
        messages: [{ role: 'user', content: transcript || '' }],
      })
      const raw = resp.content?.[0]?.text || '{}'
      let parsed = { cues: [], sentiment: 'neutral', aiNote: '' }
      try { parsed = JSON.parse(raw) } catch { /* keep defaults */ }
      return res.status(200).json({ ...parsed, usage: resp.usage })
    }

    // default action: 'chat'
    const systemPrompt = buildSystemPrompt({ athleteContext, memorySummary })
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
