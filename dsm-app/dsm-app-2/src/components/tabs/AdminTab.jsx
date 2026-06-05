import { useState, useEffect, useMemo } from 'react'
import { tokens as t, C } from '../../styles.js'
import { authFetch } from '../../lib/authFetch.js'
import {
  getAdminAthleteList,
  assignCoachToAthlete,
  unassignAthleteCoach,
  promoteUserToCoach,
  demoteCoach,
  setCoachTier,
  setProgramTrack,
  adminManualGrantConsent,
  buildConsentUrl,
  createCoachTask,
  getAthleteTasks,
  deleteCoachTask,
  listCoachingGroups,
  createCoachingGroup,
  deleteCoachingGroup,
  listGroupMembers,
  addGroupMember,
  removeGroupMember,
  getRecentActivity,
  getGroupActivity,
  assignActivityToGroup,
  getGroupReports,
  resolveReport,
  deleteGroupMessage,
  adminCreateAthlete,
  adminArchiveAthlete,
  adminDeleteAthlete,
} from '../../lib/supabase.js'
import LockerRoomTab from './LockerRoomTab.jsx'
import GroupChat from '../GroupChat.jsx'

const TIER_LABELS = { 1: 'Assistant', 2: 'Coach', 3: 'Mentor' }
const PRIORITY_LABELS = { low: 'Low', medium: 'Medium', high: 'High' }

export default function AdminTab({ user }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [selectedId, setSelectedId] = useState(null)
  const [section, setSection] = useState('athletes')
  const [assignFor, setAssignFor] = useState(null)
  const [taskFor, setTaskFor] = useState(null)
  const [addCoachOpen, setAddCoachOpen] = useState(false)
  const [manualAddOpen, setManualAddOpen] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await getAdminAthleteList()
    setRows(data)
    setLoading(false)
  }

  const athletes = useMemo(() => rows.filter(r => r.role !== 'coach' && r.role !== 'parent'), [rows])
  const coaches  = useMemo(() => rows.filter(r => r.role === 'coach'), [rows])
  const coachLabel = (c) => c.full_name || c.email

  if (selectedId) {
    return (
      <LockerRoomTab
        user={user}
        athleteId={selectedId}
        adminView={true}
        onBack={() => setSelectedId(null)}
      />
    )
  }

  return (
    <div style={{ padding: '18px 22px 32px' }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>Admin</div>
        <h2 style={{
          fontFamily: t.font.athletic, fontSize: 38, fontWeight: 400,
          color: t.color.text, marginTop: 4, letterSpacing: 1.5, lineHeight: 0.95,
          textTransform: 'uppercase',
        }}>{sectionTitle(section)}</h2>
      </div>

      <SectionToggle section={section} setSection={setSection} athleteCount={athletes.length} coachCount={coaches.length} />

      {section === 'athletes' && (
        <AthletesView
          loading={loading}
          athletes={athletes}
          coaches={coaches}
          onReload={load}
          filter={filter} setFilter={setFilter}
          sortBy={sortBy} setSortBy={setSortBy}
          onSelectAthlete={setSelectedId}
          onAssign={(a) => setAssignFor(a)}
          onAssignTask={(a) => setTaskFor(a)}
          onPromote={async (a) => {
            const label = a.full_name || a.email
            if (!confirm(`Promote ${label} to coach?\n\nThey'll gain coach permissions and appear in the Coaches tab.`)) return
            const { error } = await promoteUserToCoach(a.email)
            if (error) { alert(error.message || 'Failed to promote'); return }
            await load()
          }}
          onChangeTrack={async (a, track) => {
            const { error } = await setProgramTrack(a.id, track)
            if (error) { alert(error.message || 'Failed to set track'); return }
            await load()
          }}
          onArchive={async (a, archived) => {
            const { error } = await adminArchiveAthlete(a.id, archived)
            if (error) { alert(error.message || 'Failed'); return }
            await load()
          }}
          onDelete={async (a) => {
            const label = a.full_name || a.email
            if (!confirm(`Permanently delete ${label} and ALL their data?\n\nThis cannot be undone. To keep their data but hide them, use Archive instead.`)) return
            const { error } = await adminDeleteAthlete(a.id)
            if (error) { alert(error.message || 'Failed to delete'); return }
            await load()
          }}
          onManualGrantConsent={async (a) => {
            const label = a.full_name || a.email
            if (!confirm(`Manually grant parental consent for ${label}?\n\nUse only if you've verified consent through another channel (in person, signed form, phone call). This is an audit-loggable admin action.`)) return
            const { error } = await adminManualGrantConsent(a.id)
            if (error) { alert(error.message || 'Failed to grant'); return }
            await load()
          }}
          onCopyConsentLink={async (a) => {
            const url = buildConsentUrl(a.parent_consent_token)
            try { await navigator.clipboard.writeText(url); alert('Consent link copied — text it to the parent.') }
            catch { prompt('Copy this link and send it to the parent:', url) }
          }}
        />
      )}

      {section === 'coaches' && (
        <CoachesView
          loading={loading}
          coaches={coaches}
          athletes={athletes}
          onAddCoach={() => setAddCoachOpen(true)}
          onManualAdd={() => setManualAddOpen(true)}
          onChangeTier={async (coach, tier) => {
            const { error } = await setCoachTier(coach.id, tier)
            if (error) { alert(error.message || 'Failed to set tier'); return }
            await load()
          }}
          onDemote={async (coach) => {
            if (!confirm(`Remove coach role from ${coachLabel(coach)}?`)) return
            const { error } = await demoteCoach(coach.id)
            if (error) { alert(error.message || 'Failed to demote'); return }
            await load()
          }}
        />
      )}

      {section === 'groups' && (
        <GroupsView user={user} coaches={coaches} athletes={athletes} onViewAthlete={setSelectedId} />
      )}

      {section === 'activity' && (
        <ActivityView />
      )}

      {assignFor && (
        <AssignCoachModal
          athlete={assignFor}
          coaches={coaches}
          athletes={athletes}
          onClose={() => setAssignFor(null)}
          onAssigned={async (label) => {
            const { error } = await assignCoachToAthlete(assignFor.id, label)
            if (error) { alert(error.message || 'Failed to assign'); return }
            setAssignFor(null)
            await load()
          }}
          onUnassign={async () => {
            const { error } = await unassignAthleteCoach(assignFor.id)
            if (error) { alert(error.message || 'Failed to unassign'); return }
            setAssignFor(null)
            await load()
          }}
        />
      )}

      {taskFor && (
        <AssignTaskModal
          user={user}
          athlete={taskFor}
          onClose={() => setTaskFor(null)}
          onSaved={() => setTaskFor(null)}
        />
      )}

      {addCoachOpen && (
        <AddCoachModal
          onClose={() => setAddCoachOpen(false)}
          onAdded={async () => {
            setAddCoachOpen(false)
            await load()
          }}
        />
      )}

      {manualAddOpen && (
        <ManualAddAthleteModal
          coaches={coaches}
          onClose={() => setManualAddOpen(false)}
        />
      )}
    </div>
  )
}

function sectionTitle(s) {
  if (s === 'coaches')  return 'Coaches'
  if (s === 'groups')   return 'Groups'
  if (s === 'activity') return 'Activity'
  return 'Athlete dashboard'
}

function SectionToggle({ section, setSection, athleteCount, coachCount }) {
  const tab = (id, label) => ({
    onClick: () => setSection(id),
    style: {
      flex: 1, padding: '10px 8px',
      background: section === id ? t.color.text : t.color.surface,
      color: section === id ? t.color.bg : t.color.text,
      border: `1px solid ${t.color.line}`,
      borderRadius: 10, cursor: 'pointer',
      fontFamily: t.font.sans, fontSize: 10, fontWeight: 700,
      letterSpacing: 1.2, textTransform: 'uppercase',
    },
    children: label,
  })
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
      <button {...tab('athletes', `Athletes · ${athleteCount}`)} />
      <button {...tab('coaches',  `Coaches · ${coachCount}`)} />
      <button {...tab('groups',   'Groups')} />
      <button {...tab('activity', 'Activity')} />
    </div>
  )
}

function AthletesView({ loading, athletes, coaches, onReload, filter, setFilter, sortBy, setSortBy, onSelectAthlete, onAssign, onAssignTask, onPromote, onChangeTrack, onArchive, onDelete, onManualGrantConsent, onCopyConsentLink }) {
  const [addOpen, setAddOpen] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [copied, setCopied] = useState(false)
  const [minting, setMinting] = useState(false)

  async function copyInvite() {
    if (minting) return
    setMinting(true)
    const { url, error } = await mintInviteUrl('Coach Valentino')
    setMinting(false)
    if (error) { alert('Could not generate invite: ' + error); return }
    await copyToClipboard(url)
    setCopied(true); setTimeout(() => setCopied(false), 1800)
  }
  const [trackFilter, setTrackFilter] = useState('all')
  let visible = athletes.filter(a => showArchived ? a.archived_at : !a.archived_at)
  if (trackFilter !== 'all') {
    visible = visible.filter(a => (a.program_track || (a.age >= 13 ? 'teen' : 'youth')) === trackFilter)
  }
  if (filter) {
    const q = filter.toLowerCase()
    visible = visible.filter(a =>
      (a.full_name || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.assigned_coach || '').toLowerCase().includes(q)
    )
  }
  visible = [...visible].sort((a, b) => {
    if (sortBy === 'xp')         return (b.totalXp || 0) - (a.totalXp || 0)
    if (sortBy === 'streak')     return (b.streak || 0) - (a.streak || 0)
    if (sortBy === 'active')     return (a.lastChatAt || '0').localeCompare(b.lastChatAt || '0') * -1
    if (sortBy === 'stale')      return (a.lastChatAt || '9').localeCompare(b.lastChatAt || '9')
    if (sortBy === 'unassigned') return (a.assigned_coach ? 1 : 0) - (b.assigned_coach ? 1 : 0)
    return (b.created_at || '').localeCompare(a.created_at || '')
  })

  const totals = {
    athletes: athletes.length,
    youth:    athletes.filter(a => (a.program_track || (a.age >= 13 ? 'teen' : 'youth')) === 'youth').length,
    teen:     athletes.filter(a => (a.program_track || (a.age >= 13 ? 'teen' : 'youth')) === 'teen').length,
    active7d: athletes.filter(a => {
      if (!a.lastChatAt) return false
      const days = (Date.now() - new Date(a.lastChatAt).getTime()) / 86400000
      return days <= 7
    }).length,
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: t.color.textDim, letterSpacing: 1, fontWeight: 600, textTransform: 'uppercase' }}>Athletes</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={copyInvite} style={addBtn} disabled={minting}>
            {copied ? '✓ Copied' : minting ? 'Generating…' : '🔗 Copy invite link'}
          </button>
          <button onClick={() => setAddOpen(true)} style={addBtn}>+ Add player</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 18 }}>
        <Stat label="Athletes" value={totals.athletes} />
        <Stat label="Youth"    value={totals.youth} />
        <Stat label="Teen"     value={totals.teen} />
        <Stat label="Active 7d" value={totals.active7d} />
      </div>

      {addOpen && (
        <AddPlayerModal
          coaches={coaches}
          onClose={() => setAddOpen(false)}
          onAdded={async () => { await onReload?.() }}
        />
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search name, email, or coach…"
          style={inputStyle()}
        />
        <select value={trackFilter} onChange={e => setTrackFilter(e.target.value)} style={{ ...inputStyle(), width: 130, flex: 'none' }}>
          <option value="all">All tracks</option>
          <option value="youth">Youth (7-12)</option>
          <option value="teen">Teen (13-17)</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inputStyle(), width: 150, flex: 'none' }}>
          <option value="recent">Newest</option>
          <option value="xp">Top XP</option>
          <option value="streak">Top streak</option>
          <option value="active">Most active</option>
          <option value="stale">Most stale</option>
          <option value="unassigned">Unassigned first</option>
        </select>
        <button onClick={() => setShowArchived(s => !s)} style={{ ...(showArchived ? promoteBtn : tinyRemoveBtn), padding: '0 12px', flex: 'none' }}>
          {showArchived ? '← Active' : 'Archived'}
        </button>
      </div>

      {loading && <div style={{ color: t.color.textDim, fontSize: 13 }}>Loading athletes…</div>}

      {!loading && visible.map(a => (
        <div key={a.id} style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <button onClick={() => onSelectAthlete(a.id)} style={rowOpenBtn}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.color.text }}>
                {a.full_name || a.email || 'Athlete'}
              </div>
              <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1, marginTop: 2 }}>
                {a.email}
              </div>
            </button>
            <div style={{ display: 'flex', gap: 14, fontSize: 10, letterSpacing: 1, color: t.color.textDim, textTransform: 'uppercase', fontWeight: 600 }}>
              <span>Streak {a.streak ?? 0}</span>
              <span>{(a.totalXp || 0).toLocaleString()} XP</span>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: t.color.textDim, letterSpacing: 0.6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>{a.actionCount} actions</span>
              <span>·</span>
              <span>{a.voiceCount} voice</span>
              <span>·</span>
              <span>{a.access_level || 'pending'}</span>
              <span>·</span>
              <span>age {a.age ?? '—'}</span>
              <span>·</span>
              <select
                value={a.program_track || (a.age >= 13 ? 'teen' : 'youth')}
                onChange={e => onChangeTrack(a, e.target.value)}
                onClick={e => e.stopPropagation()}
                title="Program track — Youth gates workouts/body/nutrition/voice/future-self"
                style={{
                  background: t.color.bg, border: `1px solid ${t.color.line2}`,
                  borderRadius: 6, color: t.color.text, fontSize: 10, padding: '3px 6px',
                  fontFamily: t.font.sans, letterSpacing: 0.6, textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                <option value="youth">Youth</option>
                <option value="teen">Teen</option>
              </select>
              <span>·</span>
              <span>{a.lastChatAt ? `Last chat ${daysAgo(a.lastChatAt)}` : 'No chat yet'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => onAssign(a)} style={assignBtn(!!a.assigned_coach)}>
                {a.assigned_coach ? `👤 ${a.assigned_coach}` : '+ Coach'}
              </button>
              <button onClick={() => onAssignTask(a)} style={taskBtn}>+ Task</button>
              <button onClick={() => onPromote(a)} style={promoteBtn} title="Make this athlete a coach">⇧ Coach</button>
              <button onClick={() => onArchive(a, !a.archived_at)} style={tinyRemoveBtn} title={a.archived_at ? 'Restore to active roster' : 'Hide from roster, keep data'}>
                {a.archived_at ? '↩ Unarchive' : '🗄 Archive'}
              </button>
              <button onClick={() => onDelete(a)} style={demoteBtn} title="Permanently delete account + data">🗑 Delete</button>
            </div>
          </div>

          {a.parent_consent_required && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.color.line}`, flexWrap: 'wrap' }}>
              <span style={consentBadge(a.parent_consent_status)}>
                COPPA · {(a.parent_consent_status || 'pending').toUpperCase()}
              </span>
              {a.parent_consent_email && (
                <span style={{ fontSize: 10, color: t.color.textDim, letterSpacing: 0.6 }}>{a.parent_consent_email}</span>
              )}
              {a.parent_consent_status !== 'granted' && (
                <>
                  <button onClick={() => onCopyConsentLink(a)} style={copyBtn}>Copy link</button>
                  <button onClick={() => onManualGrantConsent(a)} style={manualGrantBtn}>Manual grant</button>
                </>
              )}
            </div>
          )}
        </div>
      ))}

      {!loading && !visible.length && (
        <div style={emptyBox}>No athletes match this filter.</div>
      )}
    </>
  )
}

// Mint a signed coach-invite link via /api/invite/sign. Returns { url, error }.
// Server enforces coach/admin role + 30d expiry by default.
async function mintInviteUrl(coachLabel, extras = {}) {
  try {
    const res = await authFetch('/api/invite/sign', {
      method: 'POST',
      body: JSON.stringify({ coachLabel, ttlDays: 30 }),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) return { url: null, error: json.error || `HTTP ${res.status}` }
    let url = json.url
    if (extras.email || extras.name) {
      const u = new URL(url)
      if (extras.email) u.searchParams.set('email', extras.email)
      if (extras.name)  u.searchParams.set('name',  extras.name)
      url = u.toString()
    }
    return { url, error: null }
  } catch (e) {
    return { url: null, error: e.message || 'Network error' }
  }
}

async function copyToClipboard(text) {
  try { await navigator.clipboard.writeText(text); return true }
  catch { prompt('Copy this invite link:', text); return false }
}

function CoachesView({ loading, coaches, athletes, onAddCoach, onChangeTier, onDemote, onManualAdd }) {
  const [copied, setCopied] = useState(null)
  const [pending, setPending] = useState(null)
  const counts = useMemo(() => {
    const m = {}
    for (const c of coaches) m[coachKey(c)] = 0
    for (const a of athletes) {
      const k = (a.assigned_coach || '').toLowerCase()
      if (!k) continue
      if (m[k] !== undefined) m[k]++
    }
    return m
  }, [coaches, athletes])

  async function mintAndCopy(coachLabel, id) {
    if (pending) return
    setPending(id)
    const { url, error } = await mintInviteUrl(coachLabel)
    setPending(null)
    if (error) { alert('Could not generate invite: ' + error); return }
    await copyToClipboard(url)
    setCopied(id)
    setTimeout(() => setCopied(null), 1800)
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 11, color: t.color.textDim, letterSpacing: 1, fontWeight: 600, textTransform: 'uppercase' }}>
          {coaches.length} coach{coaches.length === 1 ? '' : 'es'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button onClick={() => mintAndCopy('Coach Valentino', 'generic')} style={addBtn} disabled={pending === 'generic'}>
            {copied === 'generic' ? '✓ Copied' : pending === 'generic' ? 'Generating…' : '🔗 Copy invite link'}
          </button>
          <button onClick={onManualAdd} style={addBtn}>+ Manually add</button>
          <button onClick={onAddCoach} style={addBtn}>+ Add coach</button>
        </div>
      </div>

      <div style={{ fontSize: 10, color: t.color.textMute, marginBottom: 14, lineHeight: 1.4 }}>
        Share the invite link by text or DM — new athletes land on signup with a 14-day trial + the right coach pre-assigned. Each link is signed and expires in 30 days. Use "Manually add" for a fully pre-filled signup URL with the athlete's name and email.
      </div>

      {loading && <div style={{ color: t.color.textDim, fontSize: 13 }}>Loading coaches…</div>}

      {!loading && coaches.map(c => {
        const label = c.full_name || c.email
        const id = `coach-${c.id}`
        return (
          <div key={c.id} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.color.text }}>👤 {label}</div>
                <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1, marginTop: 2 }}>{c.email}</div>
              </div>
              <div style={{ fontSize: 10, letterSpacing: 1.2, color: t.color.textDim, textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>
                {counts[coachKey(c)] || 0} assigned
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, letterSpacing: 1.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>Tier</span>
              <select
                value={c.coach_tier ?? ''}
                onChange={e => onChangeTier(c, e.target.value)}
                style={{ ...inputStyle(), width: 'auto', flex: 'none', padding: '6px 10px', fontSize: 12 }}
              >
                <option value="">— none —</option>
                <option value="1">T1 · Assistant</option>
                <option value="2">T2 · Coach</option>
                <option value="3">T3 · Mentor</option>
              </select>
              <span style={tierBadge(c.coach_tier)}>{c.coach_tier ? `T${c.coach_tier} · ${TIER_LABELS[c.coach_tier]}` : 'No tier'}</span>
              <button onClick={() => onDemote(c)} style={{ ...demoteBtn, marginLeft: 'auto' }}>Remove</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, paddingTop: 8, borderTop: `1px solid ${t.color.line}` }}>
              <div style={{ flex: 1, minWidth: 0, fontSize: 10, color: t.color.textMute, letterSpacing: 0.6 }}>
                Signed invite URL · 30-day expiry
              </div>
              <button onClick={() => mintAndCopy(label, id)} style={copyBtn} disabled={pending === id}>
                {copied === id ? '✓ Copied' : pending === id ? '…' : 'Copy link'}
              </button>
            </div>
          </div>
        )
      })}

      {!loading && !coaches.length && (
        <div style={emptyBox}>No coaches yet. Tap "+ Add coach" to promote a registered user.</div>
      )}
    </>
  )
}

function GroupsView({ user, coaches, athletes, onViewAthlete }) {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  async function load() {
    setLoading(true)
    const { data } = await listCoachingGroups()
    setGroups(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        <div style={{ fontSize: 11, color: t.color.textDim, letterSpacing: 1, fontWeight: 600, textTransform: 'uppercase' }}>
          {groups.length} group{groups.length === 1 ? '' : 's'} · all coaches can view
        </div>
        <button onClick={() => setCreateOpen(true)} style={addBtn}>+ New group</button>
      </div>

      {loading && <div style={{ color: t.color.textDim, fontSize: 13 }}>Loading groups…</div>}

      {!loading && groups.map(g => (
        <GroupRow
          key={g.id}
          group={g}
          user={user}
          isOwner={g.lead_coach_id === user?.id}
          expanded={expandedId === g.id}
          onToggle={() => setExpandedId(expandedId === g.id ? null : g.id)}
          coaches={coaches}
          athletes={athletes}
          onViewAthlete={onViewAthlete}
          onDelete={async () => {
            if (!confirm(`Delete group "${g.name}"? This removes all memberships.`)) return
            await deleteCoachingGroup(g.id)
            await load()
          }}
        />
      ))}

      {!loading && !groups.length && (
        <div style={emptyBox}>No groups yet. Create one to organize coaches and athletes.</div>
      )}

      {createOpen && (
        <CreateGroupModal
          user={user}
          coaches={coaches}
          onClose={() => setCreateOpen(false)}
          onCreated={async () => { setCreateOpen(false); await load() }}
        />
      )}
    </>
  )
}

function GroupRow({ group, user, isOwner, expanded, onToggle, coaches, athletes, onViewAthlete, onDelete }) {
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [assignOpen, setAssignOpen] = useState(false)
  const [view, setView] = useState('members') // members | chat | activity

  async function loadMembers() {
    setLoadingMembers(true)
    const { data } = await listGroupMembers(group.id)
    setMembers(data)
    setLoadingMembers(false)
  }
  useEffect(() => { if (expanded) loadMembers() }, [expanded, group.id])

  const leadLabel = group.lead?.full_name || group.lead?.email || '—'
  const groupAthletes = members.filter(m => m.role_in_group === 'athlete')
  const groupCoaches  = members.filter(m => m.role_in_group === 'coach')

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <button onClick={onToggle} style={rowOpenBtn}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.color.text }}>
            {expanded ? '▾' : '▸'} {group.name}
          </div>
          <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1, marginTop: 2 }}>
            Lead: {leadLabel} {isOwner && <span style={{ color: t.color.text }}>· you</span>}
          </div>
        </button>
        {isOwner && (
          <button onClick={onDelete} style={demoteBtn}>Delete</button>
        )}
      </div>
      {group.description && (
        <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 8, lineHeight: 1.4 }}>{group.description}</div>
      )}

      {expanded && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${t.color.line}` }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            {['members', 'chat', 'activity', 'reports'].map(v => (
              <button key={v} onClick={() => setView(v)} style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                textTransform: 'capitalize', fontFamily: t.font.sans,
                border: `1px solid ${view === v ? t.color.text : t.color.line2}`,
                background: view === v ? t.color.text : 'transparent',
                color: view === v ? t.color.bg : t.color.text,
              }}>{v}</button>
            ))}
          </div>

          {view === 'members' && (
            loadingMembers ? <div style={{ color: t.color.textDim, fontSize: 12 }}>Loading members…</div> : (
              <>
                {group.join_code && (
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '8px 10px', marginBottom: 10, borderRadius: 8,
                    background: t.color.bg, border: `1px solid ${t.color.line}`,
                  }}>
                    <div>
                      <div style={{ fontSize: 9, color: t.color.textMute, letterSpacing: 1 }}>JOIN CODE — share with players</div>
                      <div style={{ fontFamily: t.font.athletic, fontSize: 20, letterSpacing: 3, color: t.color.pitch }}>{group.join_code}</div>
                    </div>
                    <button onClick={() => navigator.clipboard?.writeText(group.join_code)} style={tinyRemoveBtn}>Copy</button>
                  </div>
                )}
                {isOwner && (
                  <button onClick={() => setAssignOpen(true)} style={{ ...addBtn, marginBottom: 10, width: '100%' }}>+ Assign activity to group</button>
                )}
                <div style={subLabel}>Coaches · {groupCoaches.length}</div>
                {groupCoaches.map(m => (
                  <MemberRow key={m.user_id} member={m} canEdit={isOwner} onView={onViewAthlete} onRemove={async () => {
                    await removeGroupMember(group.id, m.user_id); await loadMembers()
                  }} />
                ))}
                <div style={{ ...subLabel, marginTop: 10 }}>Athletes · {groupAthletes.length}</div>
                {groupAthletes.map(m => (
                  <MemberRow key={m.user_id} member={m} canEdit={isOwner} onView={onViewAthlete} onRemove={async () => {
                    await removeGroupMember(group.id, m.user_id); await loadMembers()
                  }} />
                ))}
                {isOwner && (
                  <button onClick={() => setAddOpen(true)} style={{ ...addBtn, marginTop: 10, width: '100%' }}>+ Add member</button>
                )}
                {!isOwner && (
                  <div style={{ fontSize: 10, color: t.color.textMute, marginTop: 10, fontStyle: 'italic' }}>
                    Read-only · only the lead coach can edit
                  </div>
                )}
              </>
            )
          )}

          {view === 'chat' && (
            <GroupChat groupId={group.id} user={user} canModerate={isOwner} height="460px" />
          )}

          {view === 'activity' && (
            <GroupActivityView groupId={group.id} onViewAthlete={onViewAthlete} />
          )}

          {view === 'reports' && (
            <GroupReportsView groupId={group.id} reviewerId={user?.id} />
          )}
        </div>
      )}

      {addOpen && (
        <AddMemberModal
          groupId={group.id}
          coaches={coaches}
          athletes={athletes}
          existingIds={new Set(members.map(m => m.user_id))}
          onClose={() => setAddOpen(false)}
          onAdded={async () => { setAddOpen(false); await loadMembers() }}
        />
      )}

      {assignOpen && (
        <AssignActivityModal
          groupId={group.id}
          assignedBy={user?.id}
          athleteCount={groupAthletes.length}
          onClose={() => setAssignOpen(false)}
        />
      )}
    </div>
  )
}

function AssignActivityModal({ groupId, assignedBy, athleteCount, onClose }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(null)

  async function submit() {
    if (!title.trim() || busy) return
    setBusy(true)
    const { data, error } = await assignActivityToGroup({ groupId, assignedBy, title, description, dueDate, priority })
    setBusy(false)
    if (error) { setDone({ err: error.message }); return }
    setDone({ count: data.count })
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: t.font.athletic, fontSize: 22, color: t.color.text, marginBottom: 4 }}>Assign activity</div>
        <div style={{ fontSize: 11, color: t.color.textDim, marginBottom: 14 }}>Sends a task to all {athleteCount} athlete{athleteCount === 1 ? '' : 's'} in this group.</div>
        {done ? (
          <div>
            <div style={{ fontSize: 13, color: done.err ? t.color.err : t.color.pitch, marginBottom: 14 }}>
              {done.err ? `Failed: ${done.err}` : `✓ Assigned to ${done.count} athlete${done.count === 1 ? '' : 's'}.`}
            </div>
            <button onClick={onClose} style={{ ...addBtn, width: '100%' }}>Done</button>
          </div>
        ) : (
          <>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Activity title (e.g. 50 toe taps)" style={{ ...inputStyle(), marginBottom: 8 }} />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Details (optional)" rows={3} style={{ ...inputStyle(), marginBottom: 8, resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ ...inputStyle(), flex: 1 }} />
              <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle(), flex: 1 }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ ...C.bghost, flex: 1, marginBottom: 0 }}>Cancel</button>
              <button onClick={submit} disabled={!title.trim() || busy} style={{ ...addBtn, flex: 1 }}>{busy ? 'Assigning…' : 'Assign'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MemberRow({ member, canEdit, onView, onRemove }) {
  const u = member.user
  const label = u?.full_name || u?.email || member.user_id.slice(0, 8)
  const clickable = !!onView && member.role_in_group === 'athlete'
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 10px', marginBottom: 4,
      background: t.color.bg, border: `1px solid ${t.color.line}`,
      borderRadius: 8, fontFamily: t.font.sans,
    }}>
      <button
        onClick={clickable ? () => onView(member.user_id) : undefined}
        style={{
          minWidth: 0, flex: 1, textAlign: 'left', background: 'none', border: 'none',
          padding: 0, cursor: clickable ? 'pointer' : 'default', fontFamily: 'inherit',
        }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.color.text }}>
          {label} {clickable && <span style={{ color: t.color.textMute, fontWeight: 400 }}>›</span>}
        </div>
        <div style={{ fontSize: 9, color: t.color.textMute, letterSpacing: 0.8, marginTop: 1 }}>{u?.email}</div>
      </button>
      {canEdit && <button onClick={onRemove} style={tinyRemoveBtn}>✕</button>}
    </div>
  )
}

function AddPlayerModal({ coaches, onClose, onAdded }) {
  const genPass = () => 'DSM-' + Array.from(crypto.getRandomValues(new Uint8Array(6))).map(b => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState(genPass)
  const [age, setAge] = useState('')
  const [coach, setCoach] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [done, setDone] = useState(null)

  async function submit() {
    if (busy) return
    if (!email.trim()) { setErr('Email is required.'); return }
    setBusy(true); setErr('')
    const { error } = await adminCreateAthlete({ email: email.trim(), name: name.trim(), password, age: age || null, assignedCoach: coach || null })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setDone({ email: email.trim(), password })
    onAdded?.()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={{ fontFamily: t.font.athletic, fontSize: 22, color: t.color.text, marginBottom: 4 }}>Add player</div>
        {done ? (
          <>
            <div style={{ fontSize: 12, color: t.color.pitch, marginBottom: 10 }}>✓ Player added. Share these so they can sign in:</div>
            <div style={{ background: t.color.bg, border: `1px solid ${t.color.line}`, borderRadius: 10, padding: 12, marginBottom: 14, fontFamily: t.font.mono, fontSize: 13, lineHeight: 1.6 }}>
              <div>Email: {done.email}</div>
              <div>Password: {done.password}</div>
            </div>
            <button onClick={() => navigator.clipboard?.writeText(`DSM login\nEmail: ${done.email}\nPassword: ${done.password}\nhttps://dsm-app-2.vercel.app`)} style={{ ...C.bghost, marginBottom: 8 }}>Copy login details</button>
            <button onClick={onClose} style={{ ...addBtn, width: '100%' }}>Done</button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 11, color: t.color.textDim, marginBottom: 12 }}>Creates the account now. They sign in with the temp password and can change it later.</div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Full name" style={{ ...inputStyle(), marginBottom: 8 }} />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" type="email" style={{ ...inputStyle(), marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Temp password" style={{ ...inputStyle(), flex: 1 }} />
              <button onClick={() => setPassword(genPass())} title="Regenerate" style={{ ...tinyRemoveBtn, padding: '0 12px' }}>↻</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <input value={age} onChange={e => setAge(e.target.value.replace(/[^0-9]/g, ''))} placeholder="Age (optional)" style={{ ...inputStyle(), flex: 1 }} />
              <select value={coach} onChange={e => setCoach(e.target.value)} style={{ ...inputStyle(), flex: 1 }}>
                <option value="">No coach</option>
                {(coaches || []).map(c => <option key={c.id} value={c.full_name || c.email}>{c.full_name || c.email}</option>)}
              </select>
            </div>
            {err && <div style={{ color: t.color.err, fontSize: 12, marginBottom: 10 }}>{err}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onClose} style={{ ...C.bghost, flex: 1, marginBottom: 0 }}>Cancel</button>
              <button onClick={submit} disabled={busy || !email.trim()} style={{ ...addBtn, flex: 1 }}>{busy ? 'Creating…' : 'Create'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function GroupReportsView({ groupId, reviewerId }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    const { data } = await getGroupReports(groupId)
    setReports(data || []); setLoading(false)
  }
  useEffect(() => { load() }, [groupId])

  async function act(r, action) {
    if (action === 'delete' && r.message_id) await deleteGroupMessage(r.message_id)
    await resolveReport(r.id, action === 'delete' ? 'actioned' : 'dismissed', reviewerId)
    setReports(p => p.filter(x => x.id !== r.id))
  }

  if (loading) return <div style={{ color: t.color.textDim, fontSize: 12 }}>Loading reports…</div>
  if (!reports.length) return <div style={{ color: t.color.textMute, fontSize: 12, fontStyle: 'italic', padding: '8px 0' }}>No open reports. 👍</div>

  return (
    <div>
      {reports.map(r => (
        <div key={r.id} style={{ padding: 10, marginBottom: 8, background: t.color.bg, border: `1px solid ${t.color.err}`, borderRadius: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: 0.8, color: t.color.err, marginBottom: 4 }}>
            {(r.reason || 'REPORTED').toUpperCase()}
          </div>
          <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.4, marginBottom: 4, fontStyle: 'italic' }}>
            "{r.message_text || '(message unavailable)'}"
          </div>
          <div style={{ fontSize: 10, color: t.color.textMute, marginBottom: 8 }}>
            from {r.reported?.full_name || 'member'} · reported by {r.reporter?.full_name || 'member'} · {timeAgo(r.created_at)}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => act(r, 'delete')} style={{ ...demoteBtn, flex: 1 }}>Delete message</button>
            <button onClick={() => act(r, 'dismiss')} style={{ ...tinyRemoveBtn, flex: 1, padding: '8px' }}>Dismiss</button>
          </div>
        </div>
      ))}
    </div>
  )
}

function GroupActivityView({ groupId, onViewAthlete }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let on = true
    const pull = async () => { const { data } = await getGroupActivity(groupId); if (on) { setEvents(data || []); setLoading(false) } }
    pull()
    const iv = setInterval(pull, 10000) // live: refresh as activity comes in
    return () => { on = false; clearInterval(iv) }
  }, [groupId])

  if (loading) return <div style={{ color: t.color.textDim, fontSize: 12 }}>Loading activity…</div>
  if (!events.length) return <div style={{ color: t.color.textMute, fontSize: 12, fontStyle: 'italic', padding: '8px 0' }}>No athlete activity yet.</div>

  const KIND = {
    action_step: ['ACTION', t.color.pitch], checkin: ['CHECK-IN', t.color.ember],
    voice: ['VOICE', t.color.coral], chat: ['CHAT', t.color.textDim], task_done: ['TASK ✓', t.color.pitch],
  }
  return (
    <div>
      {events.map(e => {
        const [badge, color] = KIND[e.kind] || ['EVENT', t.color.textDim]
        const ago = timeAgo(e.at)
        return (
          <button key={e.id} onClick={() => onViewAthlete && onViewAthlete(e.athleteId)} style={{
            width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 10px', marginBottom: 4, background: t.color.bg,
            border: `1px solid ${t.color.line}`, borderRadius: 8, cursor: 'pointer', fontFamily: t.font.sans,
          }}>
            <span style={{ fontSize: 8, fontWeight: 800, letterSpacing: 0.8, color, minWidth: 52 }}>{badge}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.color.text }}>{e.athlete}</div>
              <div style={{ fontSize: 10, color: t.color.textDim, marginTop: 1 }}>{e.summary}</div>
            </div>
            <span style={{ fontSize: 9, color: t.color.textMute, whiteSpace: 'nowrap' }}>{ago}</span>
          </button>
        )
      })}
    </div>
  )
}

function ActivityView() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const { data } = await getRecentActivity({ limit: 80 })
    setEvents(data)
    setLoading(false)
  }
  useEffect(() => { load() }, [])

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        <div style={{ fontSize: 11, color: t.color.textDim, letterSpacing: 1, fontWeight: 600, textTransform: 'uppercase' }}>
          {events.length} recent · coached athletes only
        </div>
        <button onClick={load} style={addBtn}>↻ Refresh</button>
      </div>

      {loading && <div style={{ color: t.color.textDim, fontSize: 13 }}>Loading activity…</div>}

      {!loading && !events.length && (
        <div style={emptyBox}>No activity yet from coached athletes.</div>
      )}

      {!loading && events.map(ev => (
        <div key={ev.id} style={activityRow}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.color.text }}>{ev.athlete}</div>
            <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 0.8, whiteSpace: 'nowrap' }}>{timeAgo(ev.at)}</div>
          </div>
          <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 4 }}>
            <span style={kindBadge(ev.kind)}>{kindLabel(ev.kind)}</span>
            <span style={{ marginLeft: 8 }}>{ev.summary}</span>
          </div>
          {ev.coach && (
            <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 0.8, marginTop: 4 }}>Coach: {ev.coach}</div>
          )}
        </div>
      ))}
    </>
  )
}

// ─── MODALS ───────────────────────────────────────────────────

function AssignCoachModal({ athlete, coaches, athletes = [], onClose, onAssigned, onUnassign }) {
  const [pool, setPool] = useState('coaches')
  const [filter, setFilter] = useState('')

  const sourceList = pool === 'coaches' ? coaches : athletes.filter(a => a.id !== athlete.id)
  const visible = filter
    ? sourceList.filter(p =>
        (p.full_name || '').toLowerCase().includes(filter.toLowerCase()) ||
        (p.email     || '').toLowerCase().includes(filter.toLowerCase()))
    : sourceList

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={modalHead}>
          <div>
            <div style={modalEyebrow}>Assign coach</div>
            <div style={modalTitle}>{athlete.full_name || athlete.email}</div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button onClick={() => setPool('coaches')}  style={miniTab(pool === 'coaches')}>Coaches · {coaches.length}</button>
          <button onClick={() => setPool('athletes')} style={miniTab(pool === 'athletes')}>Athletes · {athletes.length}</button>
        </div>

        {pool === 'athletes' && (
          <div style={{ fontSize: 10, color: t.color.textMute, marginBottom: 8, lineHeight: 1.4 }}>
            Stand-in mode — picks an athlete's name as the assigned coach label. They won't gain coach permissions until you promote them in the Coaches tab.
          </div>
        )}

        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search name or email…"
          style={inputStyle()}
        />

        <div style={{ maxHeight: 360, overflowY: 'auto', marginTop: 8 }}>
          {visible.length === 0 && (
            <div style={emptyBox}>
              {pool === 'coaches'
                ? 'No coaches yet. Use the Coaches tab to add one, or pick from Athletes as a stand-in.'
                : 'No athletes match this filter.'}
            </div>
          )}

          {visible.map(p => {
            const label = p.full_name || p.email
            const active = (athlete.assigned_coach || '').toLowerCase() === label.toLowerCase()
            const tier = pool === 'coaches' && p.coach_tier ? ` · T${p.coach_tier}` : ''
            const tag  = pool === 'athletes' ? ' · athlete' : ''
            return (
              <button key={p.id} onClick={() => onAssigned(label)} style={pickerRow(active)}>
                <span>👤 {label}{tier}{tag}</span>
                {active && <span style={{ fontSize: 10, color: t.color.bg, fontWeight: 700, letterSpacing: 1 }}>CURRENT</span>}
              </button>
            )
          })}
        </div>

        {athlete.assigned_coach && (
          <button onClick={onUnassign} style={C.bghost}>Unassign current coach</button>
        )}
      </div>
    </div>
  )
}

function AssignTaskModal({ user, athlete, onClose, onSaved }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState('medium')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [tasks, setTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(true)

  async function refreshTasks() {
    setLoadingTasks(true)
    const { data } = await getAthleteTasks(athlete.id)
    setTasks(data)
    setLoadingTasks(false)
  }
  useEffect(() => { refreshTasks() }, [athlete.id])

  async function submit() {
    if (!title.trim()) { setErr('Title is required'); return }
    setBusy(true); setErr(null)
    const { error } = await createCoachTask({
      athleteId: athlete.id,
      assignedBy: user?.id,
      title, description, dueDate, priority,
    })
    setBusy(false)
    if (error) { setErr(error.message || 'Failed to create task'); return }
    setTitle(''); setDescription(''); setDueDate(''); setPriority('medium')
    await refreshTasks()
  }

  async function remove(id) {
    await deleteCoachTask(id)
    await refreshTasks()
  }

  return (
    <div style={overlay} onClick={() => !busy && onClose()}>
      <div style={{ ...modal, maxWidth: 480 }} onClick={e => e.stopPropagation()}>
        <div style={modalHead}>
          <div>
            <div style={modalEyebrow}>Assign task</div>
            <div style={modalTitle}>{athlete.full_name || athlete.email}</div>
          </div>
          {!busy && <button onClick={onClose} style={closeBtn}>✕</button>}
        </div>

        <input
          autoFocus
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Task title (e.g. Watch goal-scoring film clip)"
          style={inputStyle()}
        />
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Notes (optional)"
          style={{ ...inputStyle(), marginTop: 8, minHeight: 70, resize: 'vertical' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input
            type="date" value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            style={{ ...inputStyle(), flex: 1 }}
          />
          <select value={priority} onChange={e => setPriority(e.target.value)} style={{ ...inputStyle(), flex: 'none', width: 120 }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        {err && <div style={errBox}>{err}</div>}

        <button onClick={submit} disabled={busy || !title.trim()} style={{ ...sendBtn, opacity: busy || !title.trim() ? 0.5 : 1 }}>
          {busy ? 'Saving…' : '+ Add task'}
        </button>

        <div style={{ ...subLabel, marginTop: 16 }}>Existing tasks · {tasks.length}</div>
        {loadingTasks && <div style={{ color: t.color.textDim, fontSize: 12 }}>Loading…</div>}
        {!loadingTasks && !tasks.length && <div style={{ fontSize: 12, color: t.color.textMute }}>No tasks yet.</div>}
        {!loadingTasks && tasks.map(tk => (
          <div key={tk.id} style={{
            padding: '10px 12px', marginBottom: 6,
            background: t.color.bg, border: `1px solid ${t.color.line}`,
            borderRadius: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.color.text }}>
                  {tk.title}
                  <span style={{ ...statusBadge(tk.status), marginLeft: 8 }}>{tk.status}</span>
                </div>
                {tk.description && <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 4, lineHeight: 1.4 }}>{tk.description}</div>}
                <div style={{ fontSize: 10, color: t.color.textMute, marginTop: 4 }}>
                  {PRIORITY_LABELS[tk.priority]} priority{tk.due_date ? ` · due ${tk.due_date}` : ''}{tk.completed_at ? ` · done ${timeAgo(tk.completed_at)}` : ''}
                </div>
              </div>
              <button onClick={() => remove(tk.id)} style={tinyRemoveBtn}>✕</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AddCoachModal({ onClose, onAdded }) {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  async function submit() {
    setBusy(true); setErr(null)
    const { error } = await promoteUserToCoach(email)
    setBusy(false)
    if (error) { setErr(error.message || 'Failed to promote'); return }
    onAdded()
  }

  return (
    <div style={overlay} onClick={() => !busy && onClose()}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={modalHead}>
          <div>
            <div style={modalEyebrow}>Add coach</div>
            <div style={modalTitle}>Promote a registered user</div>
          </div>
          {!busy && <button onClick={onClose} style={closeBtn}>✕</button>}
        </div>

        <div style={subLabel}>Coach email</div>
        <input autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="coach@example.com" style={inputStyle()} />
        <div style={{ fontSize: 10, color: t.color.textMute, marginTop: 6, lineHeight: 1.4 }}>
          The user must already have an account. This sets their <code>profiles.role</code> to <code>coach</code>.
        </div>

        {err && <div style={errBox}>{err}</div>}

        <button onClick={submit} disabled={busy || !email.trim()} style={{ ...sendBtn, opacity: busy || !email.trim() ? 0.5 : 1 }}>
          {busy ? 'Promoting…' : 'Make coach'}
        </button>
      </div>
    </div>
  )
}

function CreateGroupModal({ user, coaches, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [leadId, setLeadId] = useState(user?.id || '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const userIsCoach = coaches.some(c => c.id === user?.id)
  const availableLeads = userIsCoach ? [{ id: user.id, full_name: 'Me (admin)', email: user.email }, ...coaches.filter(c => c.id !== user.id)]
                                     : coaches

  async function submit() {
    if (!name.trim()) { setErr('Name is required'); return }
    if (!leadId)      { setErr('Pick a lead coach'); return }
    if (leadId !== user?.id) {
      setErr('RLS only lets you create groups you lead. Pick yourself as lead, then transfer later.')
      return
    }
    setBusy(true); setErr(null)
    const { error } = await createCoachingGroup({ name, description, leadCoachId: leadId })
    setBusy(false)
    if (error) { setErr(error.message || 'Failed to create group'); return }
    onCreated()
  }

  return (
    <div style={overlay} onClick={() => !busy && onClose()}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={modalHead}>
          <div>
            <div style={modalEyebrow}>New group</div>
            <div style={modalTitle}>Organize coaches + athletes</div>
          </div>
          {!busy && <button onClick={onClose} style={closeBtn}>✕</button>}
        </div>

        <div style={subLabel}>Group name</div>
        <input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. U16 mental performance" style={inputStyle()} />

        <div style={{ ...subLabel, marginTop: 10 }}>Description (optional)</div>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this group for?" style={{ ...inputStyle(), minHeight: 60, resize: 'vertical' }} />

        <div style={{ ...subLabel, marginTop: 10 }}>Lead coach</div>
        <select value={leadId} onChange={e => setLeadId(e.target.value)} style={inputStyle()}>
          <option value="">— select —</option>
          {availableLeads.map(c => (
            <option key={c.id} value={c.id}>{c.full_name || c.email}</option>
          ))}
        </select>

        {err && <div style={errBox}>{err}</div>}

        <button onClick={submit} disabled={busy || !name.trim() || !leadId} style={{ ...sendBtn, opacity: busy || !name.trim() || !leadId ? 0.5 : 1 }}>
          {busy ? 'Creating…' : 'Create group'}
        </button>
      </div>
    </div>
  )
}

function AddMemberModal({ groupId, coaches, athletes, existingIds, onClose, onAdded }) {
  const [filter, setFilter] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [tab, setTab] = useState('athletes')

  const pool = tab === 'athletes' ? athletes : coaches
  const visible = pool.filter(p => !existingIds.has(p.id) && (
    !filter ||
    (p.full_name || '').toLowerCase().includes(filter.toLowerCase()) ||
    (p.email || '').toLowerCase().includes(filter.toLowerCase())
  ))

  async function add(p) {
    setBusyId(p.id)
    await addGroupMember(groupId, p.id, tab === 'athletes' ? 'athlete' : 'coach')
    setBusyId(null)
    onAdded()
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={modalHead}>
          <div>
            <div style={modalEyebrow}>Add member</div>
            <div style={modalTitle}>Pick someone to add</div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button onClick={() => setTab('athletes')} style={miniTab(tab === 'athletes')}>Athletes</button>
          <button onClick={() => setTab('coaches')}  style={miniTab(tab === 'coaches')}>Coaches</button>
        </div>

        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Search…" style={inputStyle()} />

        <div style={{ maxHeight: 320, overflowY: 'auto', marginTop: 10 }}>
          {visible.map(p => (
            <button key={p.id} onClick={() => add(p)} disabled={busyId === p.id} style={pickerRow(false)}>
              <span>{p.full_name || p.email}</span>
              <span style={{ fontSize: 10, color: t.color.textMute }}>{busyId === p.id ? 'adding…' : '+ add'}</span>
            </button>
          ))}
          {!visible.length && <div style={{ fontSize: 12, color: t.color.textMute, padding: 14, textAlign: 'center' }}>No one to add.</div>}
        </div>
      </div>
    </div>
  )
}

function ManualAddAthleteModal({ coaches, onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [coach, setCoach] = useState(coaches[0]?.full_name || coaches[0]?.email || 'Coach Valentino')
  const [busy, setBusy] = useState(false)
  const [mintedUrl, setMintedUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [err, setErr] = useState('')

  async function mintAndCopy() {
    setErr(''); setBusy(true)
    const { url, error } = await mintInviteUrl(coach, { email: email.trim(), name: name.trim() })
    setBusy(false)
    if (error) { setErr(error); return }
    setMintedUrl(url)
    await copyToClipboard(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2400)
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={modal} onClick={e => e.stopPropagation()}>
        <div style={modalHead}>
          <div>
            <div style={modalEyebrow}>Manually add athlete</div>
            <div style={modalTitle}>Generate a personal signup link</div>
          </div>
          <button onClick={onClose} style={closeBtn}>✕</button>
        </div>

        <div style={{ fontSize: 11, color: t.color.textMute, marginBottom: 10, lineHeight: 1.5 }}>
          Fill in what you know — the athlete clicks the link and lands on signup with everything pre-filled. They pick a password, hit join, get a 14-day trial.
        </div>

        <div style={subLabel}>Athlete name</div>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Marco Rossi" style={inputStyle()} />

        <div style={{ ...subLabel, marginTop: 10 }}>Email (optional)</div>
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="athlete@example.com" style={inputStyle()} />

        <div style={{ ...subLabel, marginTop: 10 }}>Assign to coach</div>
        <select value={coach} onChange={e => setCoach(e.target.value)} style={inputStyle()}>
          {coaches.length === 0 && <option value="Coach Valentino">Coach Valentino (default)</option>}
          {coaches.map(c => {
            const label = c.full_name || c.email
            return <option key={c.id} value={label}>{label}{c.coach_tier ? ` · T${c.coach_tier}` : ''}</option>
          })}
        </select>

        {mintedUrl && (
          <>
            <div style={{ ...subLabel, marginTop: 14 }}>Signed link · 30-day expiry</div>
            <div style={{
              padding: '10px 12px', background: t.color.bg,
              border: `1px solid ${t.color.line2}`, borderRadius: 10,
              fontSize: 11, color: t.color.textDim, fontFamily: t.font.mono,
              wordBreak: 'break-all', lineHeight: 1.4,
            }}>{mintedUrl}</div>
          </>
        )}

        {err && <div style={errBox}>Couldn't generate: {err}</div>}

        <button onClick={mintAndCopy} disabled={busy} style={{
          ...sendBtn,
          background: copied ? t.color.pitch : t.color.text,
          color: copied ? t.color.bg : t.color.bg,
          opacity: busy ? 0.5 : 1,
        }}>
          {busy ? 'Signing…' : copied ? '✓ Copied — share it' : '📋 Generate & copy link'}
        </button>

        <div style={{ fontSize: 10, color: t.color.textMute, marginTop: 8, lineHeight: 1.4, textAlign: 'center' }}>
          Server-signed via HMAC · 30-day expiry · safe to share by SMS, WhatsApp, or DM.
        </div>
      </div>
    </div>
  )
}

// ─── HELPERS ──────────────────────────────────────────────────

function coachKey(c) {
  return ((c.full_name || c.email) || '').toLowerCase()
}

function Stat({ label, value }) {
  return (
    <div style={{
      padding: '12px 10px', background: t.color.surface,
      border: `1px solid ${t.color.line}`, borderRadius: 12, textAlign: 'center',
    }}>
      <div style={{ fontSize: 9, letterSpacing: 1.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontFamily: t.font.athletic, fontSize: 22, color: t.color.text, marginTop: 4, letterSpacing: 1 }}>{value}</div>
    </div>
  )
}

function daysAgo(iso) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.floor(ms / 60000)
  if (min < 1)  return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24)   return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7)    return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}

function kindLabel(k) {
  if (k === 'action_step') return 'ACTION'
  if (k === 'checkin')     return 'CHECK-IN'
  if (k === 'voice')       return 'VOICE'
  if (k === 'chat')        return 'CHAT'
  if (k === 'task_done')   return 'TASK ✓'
  return k.toUpperCase()
}

// ─── STYLES ───────────────────────────────────────────────────

const inputStyle = () => ({
  flex: 1, width: '100%', padding: '10px 12px',
  background: t.color.bg, border: `1px solid ${t.color.line2}`,
  borderRadius: 10, color: t.color.text, fontSize: 13,
  fontFamily: t.font.sans, outline: 'none', boxSizing: 'border-box',
})

const cardStyle = {
  padding: 14, marginBottom: 8,
  background: t.color.surface, border: `1px solid ${t.color.line}`,
  borderRadius: 12, fontFamily: t.font.sans, color: t.color.text,
}

const activityRow = {
  padding: '12px 14px', marginBottom: 6,
  background: t.color.surface, border: `1px solid ${t.color.line}`,
  borderRadius: 10, fontFamily: t.font.sans,
}

const rowOpenBtn = {
  background: 'none', border: 'none', padding: 0, textAlign: 'left',
  cursor: 'pointer', color: 'inherit', fontFamily: 'inherit', minWidth: 0, flex: 1,
}

const assignBtn = (assigned) => ({
  background: assigned ? t.color.surface2 : t.color.text,
  color: assigned ? t.color.text : t.color.bg,
  border: assigned ? `1px solid ${t.color.line2}` : 'none',
  borderRadius: 8, padding: '6px 10px',
  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: t.font.sans,
})

const taskBtn = {
  background: 'transparent', color: t.color.text,
  border: `1px solid ${t.color.line2}`,
  borderRadius: 8, padding: '6px 10px',
  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: t.font.sans,
}

const promoteBtn = {
  background: 'transparent', color: '#a3e635',
  border: '1px solid rgba(163, 230, 53, 0.4)',
  borderRadius: 8, padding: '6px 10px',
  fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: t.font.sans,
}

const addBtn = {
  background: t.color.text, color: t.color.bg, border: 'none',
  borderRadius: 10, padding: '10px 14px',
  fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: t.font.sans,
}

const demoteBtn = {
  background: 'transparent', border: `1px solid ${t.color.line2}`,
  color: t.color.textDim, borderRadius: 8, padding: '6px 10px',
  fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: t.font.sans,
}

const copyBtn = {
  background: t.color.text, color: t.color.bg, border: 'none',
  borderRadius: 8, padding: '6px 10px',
  fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: t.font.sans, flexShrink: 0,
}

const manualGrantBtn = {
  background: 'transparent', color: '#fbbf24',
  border: '1px solid rgba(251,191,36,0.4)',
  borderRadius: 8, padding: '6px 10px',
  fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: t.font.sans, flexShrink: 0,
}

const consentBadge = (status) => {
  const map = {
    granted:  { bg: 'rgba(74,222,128,0.10)',  bd: 'rgba(74,222,128,0.35)',  fg: t.color.pitch },
    pending:  { bg: 'rgba(251,191,36,0.10)',  bd: 'rgba(251,191,36,0.35)',  fg: '#fbbf24' },
    declined: { bg: 'rgba(248,113,113,0.10)', bd: 'rgba(248,113,113,0.35)', fg: t.color.err },
  }
  const c = map[status] || map.pending
  return {
    fontSize: 9, letterSpacing: 1.2, fontWeight: 700, textTransform: 'uppercase',
    padding: '4px 8px', borderRadius: 6,
    background: c.bg, border: `1px solid ${c.bd}`, color: c.fg,
  }
}

const tinyRemoveBtn = {
  background: 'transparent', border: 'none',
  color: t.color.textDim, fontSize: 14, cursor: 'pointer', padding: 4,
}

const tierBadge = (tier) => ({
  fontSize: 9, letterSpacing: 1.2, fontWeight: 700,
  textTransform: 'uppercase',
  padding: '4px 8px',
  borderRadius: 6,
  background: tier ? 'rgba(255,255,255,0.06)' : 'transparent',
  border: `1px solid ${tier ? t.color.line2 : 'transparent'}`,
  color: tier ? t.color.text : t.color.textMute,
})

const kindBadge = (kind) => {
  const color = {
    action_step: '#a3e635',
    checkin:     '#60a5fa',
    voice:       '#f472b6',
    chat:        '#fbbf24',
    task_done:   t.color.pitch,
  }[kind] || t.color.textDim
  return {
    display: 'inline-block',
    fontSize: 9, letterSpacing: 1.4, fontWeight: 700,
    color, textTransform: 'uppercase',
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(255,255,255,0.04)',
  }
}

const statusBadge = (status) => ({
  display: 'inline-block',
  fontSize: 9, letterSpacing: 1.2, fontWeight: 700,
  textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4,
  color: status === 'done' ? t.color.pitch : status === 'skipped' ? t.color.textMute : t.color.text,
  background: 'rgba(255,255,255,0.06)',
})

const subLabel = {
  fontSize: 10, letterSpacing: 1.6, color: t.color.textMute,
  fontWeight: 600, textTransform: 'uppercase', marginBottom: 6,
}

const overlay = {
  position: 'fixed', inset: 0,
  background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
  zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
  padding: 12, overflowY: 'auto',
}

const modal = {
  width: '100%', maxWidth: 440,
  background: t.color.surface,
  border: `1px solid ${t.color.line2}`,
  borderRadius: t.radius.xl,
  padding: 18,
  boxShadow: t.shadow.raised,
  marginBottom: 'env(safe-area-inset-bottom)',
  maxHeight: 'calc(100vh - 40px)', overflowY: 'auto',
}

const modalHead = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
  marginBottom: 14, gap: 10,
}

const modalEyebrow = {
  fontSize: 10, letterSpacing: 2, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase',
}

const modalTitle = {
  fontSize: 16, fontWeight: 700, color: t.color.text, marginTop: 2,
}

const closeBtn = {
  background: 'transparent', border: 'none',
  color: t.color.textDim, fontSize: 16, cursor: 'pointer', padding: 4,
}

const pickerRow = (active) => ({
  width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 14px', marginBottom: 6,
  background: active ? t.color.text : t.color.bg,
  color: active ? t.color.bg : t.color.text,
  border: `1px solid ${t.color.line2}`,
  borderRadius: 10, cursor: 'pointer',
  fontFamily: t.font.sans, fontSize: 13, fontWeight: 700,
  textAlign: 'left',
})

const miniTab = (active) => ({
  flex: 1, padding: '8px 10px',
  background: active ? t.color.text : t.color.bg,
  color: active ? t.color.bg : t.color.text,
  border: `1px solid ${t.color.line2}`,
  borderRadius: 8, cursor: 'pointer',
  fontFamily: t.font.sans, fontSize: 10, fontWeight: 700,
  letterSpacing: 1.2, textTransform: 'uppercase',
})

const sendBtn = {
  width: '100%', marginTop: 12,
  background: t.color.text, color: t.color.bg,
  border: 'none', borderRadius: t.radius.md,
  padding: '13px 18px',
  fontSize: 13, fontWeight: 700,
  letterSpacing: 1.4, textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: t.font.sans,
}

const errBox = {
  marginTop: 10,
  background: t.color.errBg,
  border: '1px solid rgba(248,113,113,0.3)',
  borderRadius: t.radius.md,
  padding: 10, fontSize: 12, color: t.color.text,
  lineHeight: 1.4,
}

const emptyBox = {
  padding: 22, background: t.color.surface,
  border: `1px dashed ${t.color.line2}`, borderRadius: 14,
  color: t.color.textDim, fontSize: 13,
}
