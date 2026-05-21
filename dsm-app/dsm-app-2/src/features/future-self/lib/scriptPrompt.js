// Pure prompt builder for Coach V voice-message generation.
// Isolated so tests can hit every context branch deterministically
// without booting the Vercel function or hitting Anthropic.

export const FUTURE_SELF_CONTEXTS = [
  'pre_match', 'post_mistake', 'monthly_check', 'custom', 'onboarding',
]

// Mirrors the persona in api/coach.js, retuned for spoken delivery via TTS.
const SYSTEM_PROMPT = `
You are Coach Valentino DiLorenzo — founder of the DiLorenzo Soccer Mindset
program. The athlete is about to HEAR this in your actual voice, played
through their phone. Write it the way you would speak it.

Voice rules:
- Direct, athlete-to-athlete. No motivational poster lines.
- 15 to 30 seconds spoken aloud — roughly 45 to 90 words. Stop before 90.
- Reference real signal from the inputs (a cue they use, a recent match,
  their identity goal). Skip whatever isn't real.
- One DSM cue at most when it fits — Shark, Goldfish, Tune-out, Self-talk.
  No emojis. No stage directions.
- Never preachy. Never long-winded. End with weight, not a slogan.

Output ONLY the spoken script. No titles, quotes, markdown, or notes.
The text goes straight to text-to-speech.
`.trim()

function clamp(str, n) {
  if (!str) return ''
  const s = String(str)
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}

function renderThemes(themes) {
  if (!themes || typeof themes !== 'object') return ''
  return ['mindset','technique','recovery','goals']
    .filter(k => themes[k])
    .map(k => `${k}: ${clamp(themes[k], 120)}`)
    .join(' | ')
}

function buildUserPayload({ context, profile, themes, matchContext, journalContext, monthlyContext }) {
  const identityGoal = clamp(profile?.identity_goal, 240) || '(none on file)'
  const themeLine = renderThemes(themes) || '(none)'
  const name = profile?.full_name?.split(' ')[0] || 'the athlete'
  const position = profile?.position || '—'
  const age = profile?.age ? `, age ${profile.age}` : ''

  const header =
    `Athlete: ${name} (${position}${age})\n` +
    `Identity goal: "${identityGoal}"\n` +
    `Themes you remember: ${themeLine}\n`

  if (context === 'pre_match') {
    const opp = matchContext?.opponent || 'their opponent'
    const comp = matchContext?.competition || 'a match'
    const venue = matchContext?.isHome === true ? 'home' : matchContext?.isHome === false ? 'away' : '—'
    const intent = clamp(matchContext?.preIntention, 200) || '—'
    const cue = clamp(matchContext?.preFocusCue, 80) || '—'
    return header +
      `Context: PRE-MATCH warmup. They're about to play ${opp} (${comp}, ${venue}).\n` +
      `Their stated intention: "${intent}". Focus cue: "${cue}".\n\n` +
      `Write the 15–30s spoken message — lock them in. Name the cue. Send them in.`
  }

  if (context === 'post_mistake') {
    const sentiment = journalContext?.sentiment || 'frustrated'
    const transcript = clamp(journalContext?.transcript, 300) || '—'
    return header +
      `Context: POST-MISTAKE. They just journaled feeling ${sentiment}.\n` +
      `Their words: "${transcript}"\n\n` +
      `Write the 15–30s spoken message. Goldfish energy — name the sting honestly, ` +
      `name the next play, no shame, no fix-it lecture. Short. Real.`
  }

  if (context === 'monthly_check') {
    const recentMatches = (monthlyContext?.recentMatches || []).slice(0, 3).map(m =>
      `${m.match_date} vs ${m.opponent || '—'}: ${m.result || '—'} (perf ${m.performance ?? '—'}/10)`
    ).join(' · ') || '(no matches yet)'
    const recentActions = monthlyContext?.actionStepsCount ?? 0
    return header +
      `Context: MONTHLY check-in. ${recentActions} action-step logs this month.\n` +
      `Recent matches: ${recentMatches}\n\n` +
      `Write the 15–30s spoken message. ASK ONE QUESTION at the end about the gap ` +
      `between their identity goal and how they've actually been showing up. Direct, not harsh.`
  }

  if (context === 'onboarding') {
    return header +
      `Context: ONBOARDING — first time the athlete is hearing your voice in the app.\n\n` +
      `Write a 15–30s introduction. Welcome them by name. Plant the identity ` +
      `they wrote down. Tell them you'll be in their ear when it matters.`
  }

  // 'custom' or unknown → generic check-in
  return header +
    `Context: GENERIC check-in (no specific trigger). 15–30s. Direct. ` +
    `Anchor on their identity goal.`
}

export function buildScriptPrompt(args) {
  const context = FUTURE_SELF_CONTEXTS.includes(args?.context) ? args.context : 'custom'
  return {
    system: SYSTEM_PROMPT,
    user: buildUserPayload({ ...args, context }),
    context,
    maxTokens: 220,
  }
}
