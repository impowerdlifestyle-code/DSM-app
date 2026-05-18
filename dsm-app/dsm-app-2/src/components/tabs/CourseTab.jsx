import { tokens as t } from '../../styles.js'
import TiltCard from '../widgets/TiltCard.jsx'

const COURSE_MODULES = [
  {
    id: 'foundation',
    weekRange: 'Weeks 1-2',
    title: 'Foundation · The Athlete Mindset',
    duration: '4 lessons · 1 hr 12 min',
    progress: 1.0,
    lessons: [
      { n: 1, title: 'The Mindset Behind Mastery', duration: '14 min', watched: true },
      { n: 2, title: 'Shark vs Goldfish', duration: '18 min', watched: true },
      { n: 3, title: 'Self-Talk Mechanics', duration: '21 min', watched: true },
      { n: 4, title: 'Tune Out Routine', duration: '19 min', watched: true },
    ],
  },
  {
    id: 'preparation',
    weekRange: 'Weeks 3-4',
    title: 'Preparation · Pre-Game Architecture',
    duration: '5 lessons · 1 hr 38 min',
    progress: 0.6,
    lessons: [
      { n: 1, title: 'The 24-Hour Reset',          duration: '16 min', watched: true },
      { n: 2, title: 'Visualization Walkthrough',   duration: '22 min', watched: true },
      { n: 3, title: 'Match-Day Cue Words',         duration: '18 min', watched: true },
      { n: 4, title: 'Locker Room Protocol',        duration: '20 min', watched: false },
      { n: 5, title: 'First-Whistle Reset',         duration: '22 min', watched: false },
    ],
  },
  {
    id: 'pressure',
    weekRange: 'Weeks 5-6',
    title: 'Pressure · Performing Under the Lights',
    duration: '5 lessons · 1 hr 51 min',
    progress: 0.0,
    locked: false,
    lessons: [
      { n: 1, title: 'The Pressure Reframe',        duration: '17 min', watched: false },
      { n: 2, title: 'Box Breathing in Real-Time',  duration: '20 min', watched: false },
      { n: 3, title: 'Tunnel Vision Recovery',      duration: '24 min', watched: false },
      { n: 4, title: 'After the Mistake',           duration: '25 min', watched: false },
      { n: 5, title: 'The Captain&rsquo;s Mind',    duration: '25 min', watched: false },
    ],
  },
  {
    id: 'elite',
    weekRange: 'Weeks 7-8',
    title: 'Elite · Sustained High Performance',
    duration: '6 lessons · 2 hr 12 min',
    progress: 0.0,
    locked: true,
    unlockAt: 'Week 6',
    lessons: [],
  },
]

export default function CourseTab() {
  const totalLessons = COURSE_MODULES.reduce((a, m) => a + m.lessons.length, 0)
  const totalWatched = COURSE_MODULES.reduce((a, m) => a + m.lessons.filter(l => l.watched).length, 0)
  const overallPct = Math.round((totalWatched / totalLessons) * 100)

  return (
    <div className="fade" style={{ padding: '14px 22px 56px' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
          Course · DSM Program
        </div>
        <h2 style={{
          fontFamily: t.font.athletic, fontSize: 36, fontWeight: 400,
          color: t.color.text, marginTop: 6, letterSpacing: 1, lineHeight: 0.95,
          textTransform: 'uppercase',
        }}>
          The full <span style={{ color: t.color.textDim }}>method.</span>
        </h2>
      </div>

      {/* Progress card */}
      <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: t.radius.lg, marginBottom: 18 }}>
        <div style={{
          background: t.color.surface, border: `1px solid ${t.color.line}`,
          borderRadius: t.radius.lg, padding: 20,
          display: 'flex', alignItems: 'center', gap: 18,
        }}>
          <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
            <svg width="64" height="64" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="32" cy="32" r="27" fill="none" stroke={t.color.line2} strokeWidth="3" />
              <circle cx="32" cy="32" r="27" fill="none" stroke={t.color.text} strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 27}`}
                strokeDashoffset={`${2 * Math.PI * 27 * (1 - overallPct / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div style={{
              position: 'absolute', inset: 0, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              fontFamily: t.font.athletic, fontSize: 22, color: t.color.text,
              fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5,
            }}>{overallPct}<span style={{ fontSize: 10, color: t.color.textMute }}>%</span></div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
              Progress
            </div>
            <div style={{
              fontFamily: t.font.athletic, fontSize: 30, fontWeight: 400,
              color: t.color.text, marginTop: 4, lineHeight: 0.95, letterSpacing: 0.5,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {totalWatched}<span style={{ fontSize: 15, color: t.color.textMute }}> / {totalLessons}</span>
            </div>
            <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 4, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>
              Lessons watched
            </div>
          </div>
        </div>
      </TiltCard>

      {/* Modules */}
      {COURSE_MODULES.map((mod) => (
        <CourseModule key={mod.id} mod={mod} />
      ))}
    </div>
  )
}

function CourseModule({ mod }) {
  const pct = Math.round(mod.progress * 100)
  return (
    <TiltCard tiltLimit={6} scale={1.01} style={{ borderRadius: t.radius.lg, marginBottom: 12 }}>
      <div style={{
        background: t.color.surface,
        border: `1px solid ${mod.locked ? t.color.line : t.color.line2}`,
        borderRadius: t.radius.lg,
        opacity: mod.locked ? 0.5 : 1,
      }}>
        <div style={{ padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
                {mod.weekRange}
              </div>
              <h3 style={{
                fontFamily: t.font.athletic, fontSize: 20, fontWeight: 400,
                color: t.color.text, marginTop: 4, letterSpacing: 0.8, lineHeight: 1.05,
                textTransform: 'uppercase',
              }}>{mod.title}</h3>
              <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 4 }}>{mod.duration}</div>
            </div>
            {mod.locked ? (
              <div style={{
                padding: '4px 10px', background: t.color.bg,
                border: `1px solid ${t.color.line2}`, borderRadius: 999,
                fontSize: 9, fontWeight: 700, letterSpacing: 1.4,
                color: t.color.textMute, textTransform: 'uppercase',
              }}>Unlocks {mod.unlockAt}</div>
            ) : (
              <div style={{
                fontFamily: t.font.athletic, fontSize: 22,
                color: pct === 100 ? '#4ade80' : t.color.text,
                letterSpacing: 0.5, lineHeight: 0.95,
                fontVariantNumeric: 'tabular-nums',
              }}>{pct}%</div>
            )}
          </div>

          {!mod.locked && (
            <div style={{ marginTop: 10, height: 3, background: t.color.line, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: pct === 100 ? '#4ade80' : t.color.text,
                borderRadius: 2,
                transition: 'width 500ms cubic-bezier(.2,.7,.2,1)',
              }} />
            </div>
          )}
        </div>

        {!mod.locked && mod.lessons.length > 0 && (
          <div style={{ borderTop: `1px solid ${t.color.line}` }}>
            {mod.lessons.map((lesson, i) => (
              <button key={lesson.n} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', padding: '12px 18px',
                background: 'transparent',
                border: 'none',
                borderTop: i > 0 ? `1px solid ${t.color.line}` : 'none',
                cursor: 'pointer', fontFamily: t.font.sans, textAlign: 'left',
              }}>
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: lesson.watched ? t.color.text : t.color.bg,
                  border: `1px solid ${lesson.watched ? t.color.text : t.color.line2}`,
                  color: lesson.watched ? t.color.bg : t.color.textDim,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{lesson.watched ? '✓' : '▶'}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    color: lesson.watched ? t.color.textDim : t.color.text,
                  }} dangerouslySetInnerHTML={{ __html: lesson.title }} />
                </div>
                <div style={{
                  fontSize: 10, letterSpacing: 1.4, color: t.color.textMute,
                  fontWeight: 600, textTransform: 'uppercase',
                  fontVariantNumeric: 'tabular-nums',
                }}>{lesson.duration}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </TiltCard>
  )
}
