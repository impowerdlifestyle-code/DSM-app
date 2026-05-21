import { useEffect, useState } from 'react'
import { tokens as t } from '../../styles.js'
import { getMyOpenTasks, markCoachTaskDone } from '../../lib/supabase.js'

const PRIORITY_COLOR = {
  high:   '#f87171',
  medium: '#fbbf24',
  low:    '#8e8e8e',
}

export default function CoachTasksCard({ user }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  async function load() {
    if (!user?.id) return
    setLoading(true)
    const { data } = await getMyOpenTasks(user.id)
    setTasks(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [user?.id])

  async function complete(taskId) {
    setBusyId(taskId)
    await markCoachTaskDone(taskId)
    setBusyId(null)
    setTasks(p => p.filter(t => t.id !== taskId))
  }

  if (loading || !tasks.length) return null

  return (
    <div style={{
      margin: '14px 22px 0', padding: 16,
      background: t.color.surface,
      border: `1px solid ${t.color.line2}`,
      borderRadius: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
        <div style={{ fontSize: 10, letterSpacing: 1.8, color: t.color.textMute, fontWeight: 700, textTransform: 'uppercase' }}>
          Coach assignments
        </div>
        <div style={{ fontSize: 10, color: t.color.textDim, letterSpacing: 1 }}>
          {tasks.length} open
        </div>
      </div>
      {tasks.map(task => (
        <div key={task.id} style={{
          display: 'flex', alignItems: 'flex-start', gap: 10,
          padding: '10px 0',
          borderBottom: `1px solid ${t.color.line}`,
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', marginTop: 6,
            background: PRIORITY_COLOR[task.priority] || PRIORITY_COLOR.medium,
            flexShrink: 0,
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: t.color.text, lineHeight: 1.3 }}>
              {task.title}
            </div>
            {task.description && (
              <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 3, lineHeight: 1.4 }}>
                {task.description}
              </div>
            )}
            {task.due_date && (
              <div style={{ fontSize: 9, color: t.color.textMute, letterSpacing: 0.8, marginTop: 4, textTransform: 'uppercase', fontWeight: 600 }}>
                Due {task.due_date}
              </div>
            )}
          </div>
          <button
            onClick={() => complete(task.id)}
            disabled={busyId === task.id}
            style={{
              padding: '6px 10px',
              background: t.color.text, color: t.color.bg,
              border: 'none', borderRadius: 8,
              fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
              cursor: 'pointer', fontFamily: t.font.sans,
              opacity: busyId === task.id ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            {busyId === task.id ? '…' : 'Done'}
          </button>
        </div>
      ))}
    </div>
  )
}
