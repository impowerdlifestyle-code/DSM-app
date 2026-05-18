import { tokens as t } from '../../styles.js'

export default function ActionsSubNav({ active, setTab }) {
  const items = [
    { id: 'steps',    label: 'Steps',    target: 'actions' },
    { id: 'ball',     label: 'Ball',     target: 'ball' },
    { id: 'workouts', label: 'Workouts', target: 'workouts' },
  ]
  return (
    <div style={{ padding: '8px 22px 0' }}>
      <div style={{
        display: 'flex',
        gap: 4,
        padding: 4,
        background: t.color.surface,
        border: `1px solid ${t.color.line}`,
        borderRadius: t.radius.full,
      }}>
        {items.map(item => {
          const isActive = item.id === active
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.target)}
              style={{
                flex: 1,
                minHeight: 44,
                padding: '12px 0',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: 1.4,
                textTransform: 'uppercase',
                color: isActive ? t.color.bg : t.color.textDim,
                background: isActive ? t.color.text : 'transparent',
                border: 'none',
                borderRadius: t.radius.full,
                cursor: 'pointer',
                fontFamily: t.font.sans,
                transition: `all ${t.motion.fast}`,
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
