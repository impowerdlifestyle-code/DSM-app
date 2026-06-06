// Vercel serverless — bug report intake
// Receives client-side error reports, optionally runs Claude triage,
// files a GitHub issue with full context.
//
// Required env vars:
//   GITHUB_TOKEN      — PAT with `repo` scope (issues:write)
//   GITHUB_REPO       — "impowerdlifestyle-code/DSM-app"
// Optional:
//   ANTHROPIC_API_KEY — enables Claude triage (Tier B)
//   SLACK_WEBHOOK_URL — also pings Slack
//
// Body shape:
//   { url, userAgent, profile: {id, email, full_name, role},
//     screenshotDataUrl, consoleTail: [...], lastAction, userMessage,
//     stack, errorMessage, timestamp }

import Anthropic from '@anthropic-ai/sdk'
import { authGuard } from './_auth.js'

const TRIAGE_PROMPT = `
You are a senior engineer triaging a bug report from a user of a React + Vite + Supabase app called DSM (DiLorenzo Soccer Mindset). The repo is at impowerdlifestyle-code/DSM-app, source lives in dsm-app/dsm-app-2/. Stack: React 18, Supabase, Vercel functions, Anthropic SDK for AI features (Coach V).

Given the bug report, produce STRICT JSON:
{
  "severity":      "critical|high|medium|low",
  "likelyCause":   "one short sentence — what's actually broken",
  "likelyFiles":   ["src/components/Foo.jsx", "..."],  // best guesses
  "suggestedFix":  "specific change to make, with file:line if you can infer it",
  "needsMoreInfo": "if you need more data (network response body, db row, etc), describe what — else empty string"
}

Be concrete. Say "the action_steps insert is using did_steps but the column is did_action_steps" — not "investigate the action_steps query." If the bug is server-side (no client stack), focus on what API endpoint the URL would have called.

No prose outside the JSON.
`.trim()

function parseJson(raw, fallback) {
  if (!raw) return fallback
  const cleaned = String(raw).trim().replace(/^```json\s*|\s*```$/g, '')
  try { return JSON.parse(cleaned) } catch { return fallback }
}

async function triageWithClaude(payload) {
  if (!process.env.ANTHROPIC_API_KEY) return null
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const userBlob = JSON.stringify({
      url: payload.url,
      errorMessage: payload.errorMessage,
      stack: payload.stack?.slice(0, 2000),
      consoleTail: payload.consoleTail?.slice(-15),
      lastAction: payload.lastAction,
      userMessage: payload.userMessage,
      profileRole: payload.profile?.role,
    }, null, 2)
    const resp = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: TRIAGE_PROMPT,
      messages: [{ role: 'user', content: userBlob }],
    })
    const raw = resp.content?.[0]?.text || '{}'
    return parseJson(raw, null)
  } catch (err) {
    console.error('[bug-report] triage failed', err)
    return null
  }
}

async function createGithubIssue({ payload, triage }) {
  const token = process.env.GITHUB_TOKEN
  const repo  = process.env.GITHUB_REPO
  if (!token || !repo) return { error: 'GitHub not configured (set GITHUB_TOKEN + GITHUB_REPO)' }

  const sev = triage?.severity || 'medium'
  const sevEmoji = { critical: '🔥', high: '🚨', medium: '🐛', low: '🪱' }[sev] || '🐛'
  const titleSrc = triage?.likelyCause
    || payload.userMessage
    || payload.errorMessage
    || `Bug on ${payload.url}`
  const title = `${sevEmoji} ${titleSrc.slice(0, 110)}`

  const lines = []
  lines.push(`## Reporter`)
  lines.push(`- **User:** ${payload.profile?.full_name || 'unknown'} (${payload.profile?.email || '—'}) · role: ${payload.profile?.role || '—'}`)
  lines.push(`- **URL:** ${payload.url}`)
  lines.push(`- **When:** ${payload.timestamp || new Date().toISOString()}`)
  lines.push(`- **UA:** \`${payload.userAgent?.slice(0, 200)}\``)
  if (payload.lastAction) lines.push(`- **Last action:** ${payload.lastAction}`)
  lines.push('')

  if (payload.userMessage) {
    lines.push(`## What the user said`)
    lines.push(`> ${payload.userMessage}`)
    lines.push('')
  }

  if (payload.errorMessage) {
    lines.push(`## Error`)
    lines.push('```')
    lines.push(payload.errorMessage.slice(0, 1500))
    lines.push('```')
  }
  if (payload.stack) {
    lines.push(`<details><summary>Stack trace</summary>\n\n\`\`\`\n${payload.stack.slice(0, 4000)}\n\`\`\`\n</details>`)
    lines.push('')
  }

  if (payload.consoleTail?.length) {
    lines.push(`<details><summary>Last ${payload.consoleTail.length} console messages</summary>\n\n\`\`\`\n${payload.consoleTail.map(l => `${l.level || 'log'}: ${l.message}`).join('\n').slice(0, 3000)}\n\`\`\`\n</details>`)
    lines.push('')
  }

  if (triage) {
    lines.push(`## 🤖 Claude triage`)
    lines.push(`**Severity:** \`${triage.severity}\``)
    lines.push(`**Likely cause:** ${triage.likelyCause}`)
    if (triage.likelyFiles?.length) {
      lines.push(`**Likely files:**`)
      triage.likelyFiles.forEach(f => lines.push(`  - \`${f}\``))
    }
    lines.push(``)
    lines.push(`**Suggested fix:**`)
    lines.push(triage.suggestedFix || '_no concrete fix proposed_')
    if (triage.needsMoreInfo) {
      lines.push(``)
      lines.push(`**Needs:** ${triage.needsMoreInfo}`)
    }
    lines.push('')
  }

  if (payload.screenshotDataUrl) {
    // upload as gist OR inline in issue? Inline base64 images don't render in GitHub.
    // Workaround: comment with image upload via GitHub API. For V1 just note that a screenshot was captured.
    lines.push(`## Screenshot`)
    lines.push(`_Screenshot captured at client (${Math.round((payload.screenshotDataUrl.length || 0) / 1024)} KB). Stored separately — ping Ciaran to pull from /tmp._`)
  }

  const labels = ['bug-report', `severity:${sev}`]

  const res = await fetch(`https://api.github.com/repos/${repo}/issues`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify({ title, body: lines.join('\n'), labels }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    return { error: `GitHub ${res.status}: ${text.slice(0, 200)}` }
  }
  const issue = await res.json()
  return { url: issue.html_url, number: issue.number }
}

async function pingSlack(payload, triage, issueUrl) {
  if (!process.env.SLACK_WEBHOOK_URL) return
  try {
    const sev = triage?.severity || 'medium'
    const sevEmoji = { critical: '🔥', high: '🚨', medium: '🐛', low: '🪱' }[sev] || '🐛'
    const text = `${sevEmoji} *DSM bug* by ${payload.profile?.full_name || 'anon'} on ${payload.url}\n${triage?.likelyCause || payload.userMessage || payload.errorMessage || ''}\n${issueUrl ? `<${issueUrl}|view issue>` : ''}`
    await fetch(process.env.SLACK_WEBHOOK_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  } catch (err) {
    console.error('[bug-report] slack ping failed', err)
  }
}

export default async function handler(req, res) {
  // JWT-gated: only authenticated users can file reports — closes the open
  // spam/cost vector (every POST ran a Claude triage + opened a GitHub issue).
  // Tradeoff: a crash that breaks auth itself won't auto-report; acceptable.
  const auth = await authGuard(req, res, {})
  if (!auth.ok) return

  let payload
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  } catch { return res.status(400).json({ error: 'invalid json' }) }

  if (!payload?.url) return res.status(400).json({ error: 'url required' })

  // Require actual report content before spending a Claude triage call + filing
  // a GitHub issue. Blocks empty/junk submissions.
  const hasContent = !!(payload.userMessage || payload.errorMessage || payload.stack)
  if (!hasContent) return res.status(400).json({ error: 'empty report', code: 'empty_report' })

  // Tier B — Claude triage (parallel with issue creation skipped; we want triage IN the issue)
  const triage = await triageWithClaude(payload)

  const ghResult = await createGithubIssue({ payload, triage })

  await pingSlack(payload, triage, ghResult?.url)

  return res.status(200).json({
    ok: true,
    issue: ghResult?.url ? { url: ghResult.url, number: ghResult.number } : null,
    triage,
    githubError: ghResult?.error,
  })
}

export const config = { runtime: 'nodejs' }
