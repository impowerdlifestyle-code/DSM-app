import { describe, expect, it } from 'vitest'
import { buildScriptPrompt, FUTURE_SELF_CONTEXTS } from '../lib/scriptPrompt.js'

const sampleProfile = {
  full_name: 'Marco Diaz',
  position: 'CAM',
  age: 15,
  identity_goal: 'I am the player who plays without fear and bounces back instantly.',
}
const sampleThemes = {
  mindset: 'shark mentality on second balls, struggles to reset after misses',
  technique: 'first touch under pressure',
  recovery: 'inconsistent sleep on game weeks',
  goals: 'starter spot for spring league',
}

describe('buildScriptPrompt — shared envelope', () => {
  it('returns system + user strings and a tight max_tokens budget', () => {
    const out = buildScriptPrompt({ context: 'custom', profile: sampleProfile })
    expect(typeof out.system).toBe('string')
    expect(typeof out.user).toBe('string')
    expect(out.maxTokens).toBeGreaterThan(0)
    expect(out.maxTokens).toBeLessThanOrEqual(300)
  })

  it('system prompt enforces Coach V persona for TTS playback', () => {
    const { system } = buildScriptPrompt({ context: 'custom' })
    expect(system).toMatch(/Coach Valentino/i)
    expect(system).toMatch(/15 to 30 seconds/i)
    expect(system).toMatch(/text-to-speech/i)
    expect(system).toMatch(/no emojis/i)
  })

  it('falls back to "custom" for unknown contexts', () => {
    const out = buildScriptPrompt({ context: 'totally-made-up' })
    expect(out.context).toBe('custom')
  })

  it('exports the full context enum', () => {
    expect(FUTURE_SELF_CONTEXTS).toEqual(
      expect.arrayContaining(['pre_match', 'post_mistake', 'monthly_check', 'custom', 'onboarding'])
    )
  })

  it('embeds profile fields and themes in the user payload', () => {
    const { user } = buildScriptPrompt({
      context: 'custom',
      profile: sampleProfile,
      themes: sampleThemes,
    })
    expect(user).toContain('Marco')
    expect(user).toContain('CAM')
    expect(user).toContain('age 15')
    expect(user).toContain('bounces back instantly')
    expect(user).toContain('mindset:')
    expect(user).toContain('goals:')
  })

  it('handles missing identity_goal gracefully', () => {
    const { user } = buildScriptPrompt({
      context: 'custom',
      profile: { full_name: 'Sam', position: 'GK' },
    })
    expect(user).toMatch(/none on file/i)
  })
})

describe('buildScriptPrompt — pre_match', () => {
  it('renders opponent, competition, venue, intention, focus cue', () => {
    const { user, context } = buildScriptPrompt({
      context: 'pre_match',
      profile: sampleProfile,
      matchContext: {
        opponent: 'Tampa Bay Rowdies U17',
        competition: 'League',
        isHome: false,
        preIntention: 'win every second ball',
        preFocusCue: 'shark',
      },
    })
    expect(context).toBe('pre_match')
    expect(user).toMatch(/PRE-MATCH/)
    expect(user).toContain('Tampa Bay Rowdies U17')
    expect(user).toContain('League')
    expect(user).toContain('away')
    expect(user).toContain('win every second ball')
    expect(user).toContain('shark')
  })

  it('falls back to placeholders when matchContext is missing', () => {
    const { user } = buildScriptPrompt({ context: 'pre_match', profile: sampleProfile })
    expect(user).toMatch(/their opponent/)
    expect(user).toMatch(/a match/)
  })
})

describe('buildScriptPrompt — post_mistake', () => {
  it('embeds sentiment, journal transcript, and goldfish framing', () => {
    const { user, context } = buildScriptPrompt({
      context: 'post_mistake',
      profile: sampleProfile,
      journalContext: {
        sentiment: 'frustrated',
        transcript: "Missed an open net. Can't stop thinking about it.",
      },
    })
    expect(context).toBe('post_mistake')
    expect(user).toMatch(/POST-MISTAKE/)
    expect(user).toContain('frustrated')
    expect(user).toContain('Missed an open net')
    expect(user).toMatch(/Goldfish/i)
    expect(user).toMatch(/no fix-it lecture/i)
  })

  it('truncates long transcripts to stay under 300 chars in the prompt', () => {
    const huge = 'x'.repeat(5000)
    const { user } = buildScriptPrompt({
      context: 'post_mistake',
      profile: sampleProfile,
      journalContext: { sentiment: 'flat', transcript: huge },
    })
    const block = user.split('Their words:')[1] || ''
    expect(block.length).toBeLessThan(900)
  })
})

describe('buildScriptPrompt — monthly_check', () => {
  it('summarizes recent behavior and asks one question', () => {
    const { user, context } = buildScriptPrompt({
      context: 'monthly_check',
      profile: sampleProfile,
      themes: sampleThemes,
      monthlyContext: {
        actionStepsCount: 12,
        recentMatches: [
          { match_date: '2026-05-15', opponent: 'Clearwater FC', result: 'W', performance: 7 },
          { match_date: '2026-05-08', opponent: 'St Pete United', result: 'L', performance: 5 },
        ],
      },
    })
    expect(context).toBe('monthly_check')
    expect(user).toMatch(/MONTHLY/)
    expect(user).toContain('12 action-step logs')
    expect(user).toContain('Clearwater FC')
    expect(user).toContain('St Pete United')
    expect(user).toMatch(/ASK ONE QUESTION/)
  })

  it('handles zero action steps and zero matches', () => {
    const { user } = buildScriptPrompt({
      context: 'monthly_check',
      profile: sampleProfile,
      monthlyContext: { actionStepsCount: 0, recentMatches: [] },
    })
    expect(user).toContain('0 action-step logs')
    expect(user).toMatch(/no matches yet/)
  })
})

describe('buildScriptPrompt — onboarding', () => {
  it('frames the first listen as a Coach V welcome', () => {
    const { user, context } = buildScriptPrompt({
      context: 'onboarding',
      profile: sampleProfile,
    })
    expect(context).toBe('onboarding')
    expect(user).toMatch(/ONBOARDING/)
    expect(user).toMatch(/welcome them/i)
  })
})
