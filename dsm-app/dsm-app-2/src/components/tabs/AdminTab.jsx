import { useState, useEffect, useMemo } from 'react'
import { tokens as t } from '../../styles.js'
import {
  getAdminAthleteList,
  assignCoachToAthlete,
  unassignAthleteCoach,
  promoteUserToCoach,
  demoteCoach,
  setCoachTier,
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
} from '../../lib/supabase.js'
import LockerRoomTab from './LockerRoomTab.jsx'

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
        />
      )}

      {section === 'coaches' && (
        <CoachesView
          loading={loading}
          coaches={coaches}
          athletes={athletes}
          onAddCoach={() => setAddCoachOpen(true)}
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
        <GroupsView user={user} coaches={coaches} athletes={athletes} />
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

function AthletesView({ loading, athletes, filter, setFilter, sortBy, setSortBy, onSelectAthlete, onAssign, onAssignTask, onPromote }) {
  let visible = athletes
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
    paid:     athletes.filter(a => a.access_level === 'paid' || a.access_level === 'mentoring_elite').length,
    active7d: athletes.filter(a => {
      if (!a.lastChatAt) return false
      const days = (Date.now() - new Date(a.lastChatAt).getTime()) / 86400000
      return days <= 7
    }).length,
    unassigned: athletes.filter(a => !a.assigned_coach).length,
  }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 18 }}>
        <Stat label="Athletes" value={totals.athletes} />
        <Stat label="Paid"     value={totals.paid} />
        <Stat label="Active 7d" value={totals.active7d} />
        <Stat label="Unassigned" value={totals.unassigned} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Search name, email, or coach…"
          style={inputStyle()}
        />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ ...inputStyle(), width: 150, flex: 'none' }}>
          <option value="recent">Newest</option>
          <option value="xp">Top XP</option>
          <option value="streak">Top streak</option>
          <option value="active">Most active</option>
          <option value="stale">Most stale</option>
          <option value="unassigned">Unassigned first</option>
        </select>
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
            <div style={{ display: 'flex', gap: 10, fontSize: 10, color: t.color.textDim, letterSpacing: 0.6 }}>
              <span>{a.actionCount} actions</span>
              <span>·</span>
              <span>{a.voiceCount} voice</span>
              <span>·</span>
              <span>{a.access_level || 'pending'}</span>
              <span>·</span>
              <span>{a.lastChatAt ? `Last chat ${daysAgo(a.lastChatAt)}` : 'No chat yet'}</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button onClick={() => onAssign(a)} style={assignBtn(!!a.assigned_coach)}>
                {a.assigned_coach ? `👤 ${a.assigned_coach}` : '+ Coach'}
              </button>
              <button onClick={() => onAssignTask(a)} style={taskBtn}>+ Task</button>
              <button onClick={() => onPromote(a)} style={promoteBtn} title="Make this athlete a coach">⇧ Coach</button>
            </div>
          </div>
        </div>
      ))}

      {!loading && !visible.length && (
        <div style={emptyBox}>No athletes match this filter.</div>
      )}
    </>
  )
}

function CoachesView({ loading, coaches, athletes, onAddCoach, onChangeTier, onDemote }) {
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

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        <div style={{ fontSize: 11, color: t.color.textDim, letterSpacing: 1, fontWeight: 600, textTransform: 'uppercase' }}>
          {coaches.length} coach{coaches.length === 1 ? '' : 'es'}
        </div>
        <button onClick={onAddCoach} style={addBtn}>+ Add coach</button>
      </div>

      {loading && <div style={{ color: t.color.textDim, fontSize: 13 }}>Loading coaches…</div>}

      {!loading && coaches.map(c => {
        const label = c.full_name || c.email
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
          </div>
        )
      })}

      {!loading && !coaches.length && (
        <div style={emptyBox}>No coaches yet. Tap "+ Add coach" to promote a registered user.</div>
      )}
    </>
  )
}

function GroupsView({ user, coaches, athletes }) {
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
          isOwner={g.lead_coach_id === user?.id}
          expanded={expandedId === g.id}
          onToggle={() => setExpandedId(expandedId === g.id ? null : g.id)}
          coaches={coaches}
          athletes={athletes}
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

function GroupRow({ group, isOwner, expanded, onToggle, coaches, athletes, onDelete }) {
  const [members, setMembers] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

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
          {loadingMembers && <div style={{ color: t.color.textDim, fontSize: 12 }}>Loading members…</div>}
          {!loadingMembers && (
            <>
              <div style={subLabel}>Coaches · {groupCoaches.length}</div>
              {groupCoaches.map(m => (
                <MemberRow key={m.user_id} member={m} canEdit={isOwner} onRemove={async () => {
                  await removeGroupMember(group.id, m.user_id); await loadMembers()
                }} />
              ))}
              <div style={{ ...subLabel, marginTop: 10 }}>Athletes · {groupAthletes.length}</div>
              {groupAthletes.map(m => (
                <MemberRow key={m.user_id} member={m} canEdit={isOwner} onRemove={async () => {
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
    </div>
  )
}

function MemberRow({ member, canEdit, onRemove }) {
  const u = member.user
  const label = u?.full_name || u?.email || member.user_id.slice(0, 8)
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 10px', marginBottom: 4,
      background: t.color.bg, border: `1px solid ${t.color.line}`,
      borderRadius: 8, fontFamily: t.font.sans,
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: t.color.text }}>{label}</div>
        <div style={{ fontSize: 9, color: t.color.textMute, letterSpacing: 0.8, marginTop: 1 }}>{u?.email}</div>
      </div>
      {canEdit && <button onClick={onRemove} style={tinyRemoveBtn}>✕</button>}
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
          <button onClick={onUnassign} style={unassignBtn}>Unassign current coach</button>
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
    task_done:   '#4ade80',
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
  color: status === 'done' ? '#4ade80' : status === 'skipped' ? t.color.textMute : t.color.text,
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

const unassignBtn = {
  width: '100%', marginTop: 8,
  background: 'transparent', border: `1px solid ${t.color.line2}`,
  color: t.color.textDim, borderRadius: 10, padding: '10px 12px',
  fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
  cursor: 'pointer', fontFamily: t.font.sans,
}

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
