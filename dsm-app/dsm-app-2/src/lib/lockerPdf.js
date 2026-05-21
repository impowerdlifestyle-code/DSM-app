/**
 * lockerPdf — generate a multi-page structured PDF of an athlete's full
 * Locker Room data. Pure jsPDF text (searchable + small file size, no
 * raster screenshots).
 *
 * Pages:
 *   - Cover (name, email, role, generated date)
 *   - Coach memory themes (mindset/technique/recovery/goals/techniques_landed/watch_for)
 *   - Action steps (table)
 *   - Match log (table)
 *   - Weekly check-ins (table)
 *   - Voice journal entries
 *   - Recent Coach V chat
 *   - Badges + Squads
 *   - Coach notes (admin-only)
 */
import jsPDF from 'jspdf'

const M = 14   // page margin (mm)

export function exportLockerPdf(locker, opts = {}) {
  const { profile = {}, memory, actionSteps = [], ballMastery = [], checkins = [],
          voiceJournal = [], chat = [], workouts = [], body = [], food = [],
          badges = [], nudges = [], squads = [], notes = [], totalXp = 0,
          dailyQuests = [], matches = [] } = locker

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  let y = M

  function ensureSpace(needed = 10) {
    if (y + needed > H - M) { doc.addPage(); y = M }
  }
  function h1(text) {
    ensureSpace(14)
    doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(0)
    doc.text(text.toUpperCase(), M, y)
    y += 9
    doc.setDrawColor(160).setLineWidth(0.3)
    doc.line(M, y, W - M, y)
    y += 6
  }
  function h2(text) {
    ensureSpace(10)
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(40)
    doc.text(text, M, y); y += 6
  }
  function p(text, size = 10) {
    if (!text) return
    doc.setFont('helvetica', 'normal').setFontSize(size).setTextColor(50)
    const lines = doc.splitTextToSize(String(text), W - M * 2)
    lines.forEach(line => { ensureSpace(5); doc.text(line, M, y); y += 5 })
    y += 2
  }
  function kv(k, v) {
    if (v == null || v === '') return
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(0)
    doc.text(`${k}:`, M, y)
    doc.setFont('helvetica', 'normal').setTextColor(50)
    const wrapped = doc.splitTextToSize(String(v), W - M * 2 - 30)
    wrapped.forEach((line, i) => {
      if (i > 0) { y += 5; ensureSpace(5) }
      doc.text(line, M + 30, y)
    })
    y += 6
  }
  function table(rows, headers) {
    if (!rows.length) { p('—', 9); return }
    const colCount = headers.length
    const colW = (W - M * 2) / colCount
    doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(0)
    ensureSpace(7)
    headers.forEach((h, i) => doc.text(String(h), M + colW * i + 1, y))
    y += 4
    doc.setDrawColor(180).setLineWidth(0.2).line(M, y, W - M, y); y += 3
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(60)
    rows.forEach(row => {
      ensureSpace(6)
      row.forEach((cell, i) => {
        const text = String(cell ?? '—').slice(0, 38)
        doc.text(text, M + colW * i + 1, y)
      })
      y += 5
    })
    y += 4
  }

  // ── COVER ────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold').setFontSize(36).setTextColor(0)
  doc.text('DSM LOCKER ROOM', M, 28)
  doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(100)
  doc.text('DiLorenzo Soccer Mindset · Athlete Report', M, 36)
  doc.setDrawColor(200).line(M, 40, W - M, 40)

  y = 50
  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(0)
  doc.text(profile.full_name || profile.email || 'Athlete', M, y); y += 10
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(80)
  if (profile.email)    doc.text(`Email: ${profile.email}`, M, y), y += 5
  if (profile.role)     doc.text(`Role: ${profile.role}`, M, y), y += 5
  if (profile.position) doc.text(`Position: ${profile.position}`, M, y), y += 5
  if (profile.age)      doc.text(`Age: ${profile.age}`, M, y), y += 5
  if (profile.club_team) doc.text(`Club: ${profile.club_team}`, M, y), y += 5
  doc.text(`Generated: ${new Date().toLocaleString()}`, M, y); y += 5
  if (profile.identity_goal) {
    y += 6
    doc.setFont('helvetica', 'italic').setFontSize(12).setTextColor(40)
    doc.text('Identity Goal', M, y); y += 6
    doc.setFont('helvetica', 'normal').setFontSize(11).setTextColor(50)
    const lines = doc.splitTextToSize(`"${profile.identity_goal}"`, W - M * 2)
    lines.forEach(line => { doc.text(line, M, y); y += 6 })
  }

  // headline stats
  y += 6
  const stats = [
    ['Streak',      `${profile.streak || 0} days`],
    ['Total XP',    totalXp.toLocaleString()],
    ['Action logs', actionSteps.length],
    ['Matches',     matches.length],
    ['Check-ins',   checkins.length],
    ['Voice',       voiceJournal.length],
    ['Workouts',    workouts.length],
    ['Badges',      badges.length],
  ]
  doc.setDrawColor(220).setLineWidth(0.2)
  doc.rect(M, y, W - M * 2, 32)
  const cellW = (W - M * 2) / 4
  stats.forEach((s, i) => {
    const col = i % 4, row = Math.floor(i / 4)
    const x = M + col * cellW + 4
    const yy = y + 8 + row * 14
    doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(120)
    doc.text(String(s[0]).toUpperCase(), x, yy)
    doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(0)
    doc.text(String(s[1]), x, yy + 6)
  })
  y += 38

  // ── COACH MEMORY ─────────────────────────────────────────
  doc.addPage(); y = M
  h1("Coach V's read")
  const themes = memory?.themes || {}
  kv('Mindset',            themes.mindset)
  kv('Technique',          themes.technique)
  kv('Recovery',           themes.recovery)
  kv('Goals',              themes.goals)
  kv('Techniques landed',  themes.techniques_landed)
  kv('Watch for',          themes.watch_for)
  if (memory?.athlete_summary) {
    h2('Long-form summary')
    p(memory.athlete_summary)
  }

  // ── ACTION STEPS ─────────────────────────────────────────
  doc.addPage(); y = M
  h1('Action steps')
  table(
    actionSteps.slice(0, 40).map(s => [
      s.date, s.session_type || '—', s.did_action_steps || '—',
      `${s.mental ?? '—'}/10`,
      ['shark','goldfish','selftalk','tuneout'].filter(k => s[`${k}_used`]).join(', ') || 'none',
    ]),
    ['Date', 'Session', 'Did steps', 'Mental', 'Tools used']
  )

  // ── MATCH LOG ────────────────────────────────────────────
  if (matches.length) {
    doc.addPage(); y = M
    h1('Match log')
    table(
      matches.slice(0, 30).map(m => [
        m.match_date, m.opponent || '—',
        `${m.result || '—'} ${m.score_for ?? '?'}-${m.score_against ?? '?'}`,
        `${m.performance ?? '—'}/10`,
        (m.cues_used || []).join(', ') || 'none',
      ]),
      ['Date', 'Opponent', 'Result', 'Perf', 'Cues']
    )
    matches.slice(0, 10).forEach(m => {
      if (m.went_well || m.to_fix) {
        ensureSpace(14)
        doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(60)
        doc.text(`${m.match_date} vs ${m.opponent || '—'}`, M, y); y += 4
        if (m.went_well) { doc.setFont('helvetica', 'normal').setTextColor(40); p(`+ ${m.went_well}`, 9) }
        if (m.to_fix)    { doc.setFont('helvetica', 'normal').setTextColor(120); p(`→ ${m.to_fix}`, 9) }
      }
    })
  }

  // ── WEEKLY CHECK-INS ─────────────────────────────────────
  if (checkins.length) {
    doc.addPage(); y = M
    h1('Weekly check-ins')
    checkins.slice(0, 15).forEach(c => {
      h2(`Week ${c.week} — Mental ${c.mental || '—'}/10 · Confidence ${c.confidence_level || '—'}/10`)
      if (c.wins)       kv('Win',       c.wins)
      if (c.struggles)  kv('Struggle',  c.struggles)
      if (c.biggest_challenge) kv('Biggest challenge', c.biggest_challenge)
      if (c.goal || c.goal_next_week) kv('Goal',  c.goal || c.goal_next_week)
      y += 2
    })
  }

  // ── VOICE JOURNAL ────────────────────────────────────────
  if (voiceJournal.length) {
    doc.addPage(); y = M
    h1('Voice journal')
    voiceJournal.slice(0, 20).forEach(j => {
      ensureSpace(12)
      doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(60)
      doc.text(`${new Date(j.recorded_at).toLocaleDateString()} · ${j.sentiment || 'neutral'}`, M, y); y += 5
      doc.setFont('helvetica', 'italic').setFontSize(10).setTextColor(60)
      p(`"${(j.transcript || '').slice(0, 600)}"`)
      if (j.cues?.length) {
        doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(120)
        p(`cues: ${j.cues.join(', ')}`, 9)
      }
    })
  }

  // ── COACH V CHAT ─────────────────────────────────────────
  if (chat.length) {
    doc.addPage(); y = M
    h1('Recent Coach V chat')
    chat.slice(-30).forEach(m => {
      ensureSpace(8)
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(m.role === 'user' ? 0 : 80)
      doc.text(`${m.role === 'user' ? (profile.full_name || 'Athlete') : 'Coach V'} · ${new Date(m.created_at).toLocaleDateString()}`, M, y)
      y += 4
      doc.setFont('helvetica', 'normal').setTextColor(50)
      p((m.content || '').slice(0, 800), 10)
    })
  }

  // ── BADGES + SQUADS ──────────────────────────────────────
  if (badges.length || squads.length) {
    doc.addPage(); y = M
    h1('Badges & Squads')
    if (badges.length) {
      h2(`Badges earned (${badges.length})`)
      badges.forEach(b => p(`◆ ${b.badge_id} — ${new Date(b.earned_at).toLocaleDateString()}`, 10))
    }
    if (squads.length) {
      h2('Squads')
      squads.forEach(s => p(`${s.name} · code ${s.invite_code}`, 10))
    }
  }

  // ── COACH NOTES (admin only) ─────────────────────────────
  if (notes.length) {
    doc.addPage(); y = M
    h1('Private coach notes')
    notes.forEach(n => {
      ensureSpace(10)
      doc.setFont('helvetica', 'bold').setFontSize(9).setTextColor(40)
      const author = n.profiles?.full_name || 'Coach'
      doc.text(`${author} · ${new Date(n.created_at).toLocaleDateString()}${n.pinned ? ' · PINNED' : ''}`, M, y); y += 5
      doc.setFont('helvetica', 'normal').setTextColor(60)
      p(n.note, 10)
    })
  }

  // ── PAGE NUMBERS ─────────────────────────────────────────
  const total = doc.internal.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(140)
    doc.text(`${i} / ${total}`, W - M, H - 6, { align: 'right' })
    doc.text('DSM · Locker Room Export', M, H - 6)
  }

  const fname = `dsm-locker-${(profile.full_name || profile.email || 'athlete').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`
  doc.save(fname)
  return fname
}
