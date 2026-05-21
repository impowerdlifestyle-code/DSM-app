// Pure prompt builder for future-self clip generation.
// Isolated so Step 9 vitests can hit every context branch deterministically
// without booting the Vercel function or hitting Anthropic.

export const FUTURE_SELF_CONTEXTS = [
  'pre_match', 'post_mistake', 'monthly_check', 'custom', 'onboarding',
]

const SYSTEM_PROMPT = `
You are this athlete's FUTURE SELF — one year older. Slightly more grounded.
Slightly more confident. Still an athlete; never an adult, never a coach,
never preachy. You're talking to your present self.

Voice rules:
- Second person ("Hey. You've been working on...")
- 15 to 30 seconds spoken aloud — roughly 45 to 90 words. Stop before 90.
- Tight, athlete-to-athlete. No motivational poster lines. No "you got this."
- Reference real signal from the inputs (a cue they use, a recent match,
  a phrase from their identity statement). Skip whatever isn't real.
- One soccer cue at most (Shark, Goldfish, Tune-out, Self-talk). No emojis.

Output ONLY the spoken script. No stage directions, titles, quotes, or
markdown. The text will be sent straight to text-to-speech.
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

function buildUserPayload({ context, identityStatement, profile, themes, matchContext, journalContext, monthlyContext }) {
  const identity = clamp(identityStatement, 240) || '(none on file yet — speak generically about being a player who shows up)'
  const themeLine = renderThemes(themes) || '(none)'
  const name = profile?.full_name?.split(' ')[0] || 'the athlete'
  const position = profile?.position || '—'

  const header =
    `Athlete: ${name} (${position})\n` +
    `Identity statement: "${identity}"\n` +
    `Themes: ${themeLine}\n`

  if (context === 'pre_match') {
    const opp = matchContext?.opponent || 'their opponent'
    const comp = matchContext?.competition || 'a match'
    const venue = matchContext?.isHome === true ? 'home' : matchContext?.isHome === false ? 'away' : '—'
    const intent = clamp(matchContext?.preIntention, 200) || '—'
    const cue = clamp(matchContext?.preFocusCue, 80) || '—'
    return header +
      `Context: PRE-MATCH warmup. They're about to play ${opp} (${comp}, ${venue}).\n` +
      `Their stated intention: "${intent}". Focus cue: "${cue}".\n\n` +
      `Write the 15–30s spoken monologue from their future self, locking them in.`
  }

  if (context === 'post_mistake') {
    const sentiment = journalContext?.sentiment || 'frustrated'
    const transcript = clamp(journalContext?.transcript, 300) || '—'
    return header +
      `Context: POST-MISTAKE. They just journaled feeling ${sentiment}.\n` +
      `Their words: "${transcript}"\n\n` +
      `Write the 15–30s spoken monologue from their future self. Goldfish energy — ` +
      `acknowledge the sting, name the next play, no shame, no fix-it lecture.`
  }

  if (context === 'monthly_check') {
    const recentMatches = (monthlyContext?.recentMatches || []).slice(0, 3).map(m =>
      `${m.match_date} vs ${m.opponent || '—'}: ${m.result || '—'} (perf ${m.performance ?? '—'}/10)`
    ).join(' · ') || '(no matches yet)'
    const recentActions = monthlyContext?.actionStepsCount ?? 0
    return header +
      `Context: MONTHLY identity check-in. ${recentActions} action-step logs this month.\n` +
      `Recent matches: ${recentMatches}\n\n` +
      `Write the 15–30s spoken monologue from their future self. ASK ONE QUESTION ` +
      `at the end about the gap between who they said they wanted to be and how ` +
      `they've actually been showing up.`
  }

  if (context === 'onboarding') {
    return header +
      `Context: ONBOARDING — first time the athlete is hearing their future self.\n\n` +
      `Write a 15–30s introduction. Acknowledge this is weird ("yeah, that's you, ` +
      `a year from now"). Then plant one identity-anchored line they'll come back to.`
  }

  // 'custom' or unknown → generic check-in
  return header +
    `Context: GENERIC check-in (no specific trigger). Brief, identity-anchored, ` +
    `15–30s. Speak to the version of them that exists today, from a year ahead.`
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
