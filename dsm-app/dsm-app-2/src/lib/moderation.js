// Lightweight client-side profanity / objectionable-content filter for the
// group chat (Apple 1.2 expects a content filter on UGC). Not exhaustive —
// the real safety net is Report + Block + coach review. Catches blatant cases.

const BLOCKED = [
  'fuck', 'shit', 'bitch', 'cunt', 'asshole', 'dick', 'pussy', 'fag', 'faggot',
  'nigger', 'nigga', 'retard', 'whore', 'slut', 'kys', 'kill yourself',
]

// Normalize common letter→symbol substitutions so "f u c k" / "sh!t" still hit.
function normalize(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[0@]/g, 'o').replace(/1|!/g, 'i').replace(/3/g, 'e')
    .replace(/4/g, 'a').replace(/5/g, 's').replace(/7/g, 't').replace(/\$/g, 's')
    .replace(/[^a-z ]/g, '')
}

export function isClean(text) {
  const n = normalize(text)
  const collapsed = n.replace(/\s+/g, '')
  return !BLOCKED.some(w => {
    const wc = w.replace(/\s+/g, '')
    return n.includes(w) || collapsed.includes(wc)
  })
}

export const REPORT_REASONS = [
  'Bullying or harassment',
  'Hate speech',
  'Sexual content',
  'Threat or violence',
  'Self-harm',
  'Spam',
  'Other',
]
