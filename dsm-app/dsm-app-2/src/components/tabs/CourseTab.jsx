import { useState } from 'react'
import { tokens as t } from '../../styles.js'
import TiltCard from '../widgets/TiltCard.jsx'

const driveEmbed = (id) => `https://drive.google.com/file/d/${id}/preview`

// REAL VIDEO LESSONS — uploaded to Valentino's Google Drive.
// Replace title/duration when you confirm them.
const LIVE_LESSONS = [
  { n: 1, title: 'Growth vs Fixed',                       driveId: '1TRqtHt6E6se9WIJXZ8R5mqOxlRrPyw28' },
  { n: 2, title: 'Beliefs of Champions',                  driveId: '14ZNnHrc6KuVfDb0ZIuRERcuuXr1MCuEe' },
  { n: 3, title: 'Positive Self-Talk',                    driveId: '1VX874igEAyjoZh1R3M97ztGdtxHSSDIf' },
  { n: 4, title: 'Goal Setting',                          driveId: '1cdpJav9nFdBG6KWvRrtXPRFWZ5oZoFON' },
  { n: 5, title: 'How We Help Players in the First Call', driveId: '1iB8nNHpkwadEjUp7zNm961aXzVQFRQqF' },
  { n: 6, title: 'Full Webinar — Learn the Mentalities',  driveId: '17NgcLx_cU1VjodTGGF1vDt7e5HNPIf3S' },
]

const PLACEHOLDER_MODULES = [
  {
    id: 'preparation', weekRange: 'Weeks 3-4', comingSoon: true,
    title: 'Preparation · Pre-Game Architecture', duration: '5 lessons',
  },
  {
    id: 'pressure', weekRange: 'Weeks 5-6', comingSoon: true,
    title: 'Pressure · Performing Under the Lights', duration: '5 lessons',
  },
  {
    id: 'elite', weekRange: 'Weeks 7-8', comingSoon: true, locked: true,
    title: 'Elite · Sustained High Performance', duration: '6 lessons',
  },
]

export default function CourseTab() {
  const [playing, setPlaying] = useState(null)  // { driveId, title }

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
          textShadow: '0 0 14px rgba(255,255,255,0.55), 0 0 28px rgba(255,255,255,0.3), 0 0 56px rgba(255,255,255,0.15)',
        }}>
          The full <span style={{ color: t.color.textDim }}>method.</span>
        </h2>
      </div>

      {/* LIVE LESSONS — Coach V himself */}
      <TiltCard tiltLimit={6} scale={1.01} style={{ borderRadius: t.radius.lg, marginBottom: 14 }}>
        <div style={{
          background: t.color.surface, border: `1px solid ${t.color.line2}`,
          borderRadius: t.radius.lg, padding: '16px 18px',
        }}>
          <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
            Foundation · Weeks 1-2
          </div>
          <h3 style={{
            fontFamily: t.font.athletic, fontSize: 22, fontWeight: 400,
            color: t.color.text, marginTop: 4, letterSpacing: 1, lineHeight: 1.05,
            textTransform: 'uppercase',
          }}>Coach V · Live Lessons</h3>
          <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 4 }}>
            {LIVE_LESSONS.length} lessons · taught by Coach Valentino
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${t.color.line}` }}>
          {LIVE_LESSONS.map((lesson, i) => (
            <button
              key={lesson.n}
              onClick={() => setPlaying(lesson)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                width: '100%', padding: '14px 18px',
                background: 'transparent', border: 'none',
                borderTop: i > 0 ? `1px solid ${t.color.line}` : 'none',
                cursor: 'pointer', fontFamily: t.font.sans, textAlign: 'left',
              }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: t.color.bg,
                border: `1px solid ${t.color.text}`,
                color: t.color.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
                boxShadow: '0 0 12px rgba(255,255,255,0.18)',
              }}>▶</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.color.text }}>
                  {lesson.title}
                </div>
                <div style={{ fontSize: 10, color: t.color.textMute, letterSpacing: 1, marginTop: 2, textTransform: 'uppercase', fontWeight: 600 }}>
                  Lesson {lesson.n}
                </div>
              </div>
              <div style={{ fontSize: 16, color: t.color.textMute }}>→</div>
            </button>
          ))}
        </div>
      </TiltCard>

      {/* PLACEHOLDER MODULES — coming soon */}
      {PLACEHOLDER_MODULES.map((mod) => (
        <TiltCard key={mod.id} tiltLimit={6} scale={1.01} style={{ borderRadius: t.radius.lg, marginBottom: 12 }}>
          <div style={{
            background: t.color.surface,
            border: `1px solid ${t.color.line}`,
            borderRadius: t.radius.lg,
            padding: '16px 18px',
            opacity: 0.55,
          }}>
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
              <div style={{
                padding: '4px 10px', background: t.color.bg,
                border: `1px solid ${t.color.line2}`, borderRadius: 999,
                fontSize: 9, fontWeight: 700, letterSpacing: 1.4,
                color: t.color.textMute, textTransform: 'uppercase',
              }}>{mod.locked ? 'Locked' : 'Coming soon'}</div>
            </div>
          </div>
        </TiltCard>
      ))}

      {/* MODAL — Drive video preview */}
      {playing && <VideoModal lesson={playing} onClose={() => setPlaying(null)} />}
    </div>
  )
}

function VideoModal({ lesson, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(12px)',
        zIndex: 1000,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 920,
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
              Lesson {lesson.n}
            </div>
            <div style={{ fontFamily: t.font.athletic, fontSize: 22, color: t.color.text, letterSpacing: 1, textTransform: 'uppercase' }}>
              {lesson.title}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: `1px solid ${t.color.line2}`,
            borderRadius: 999, padding: '8px 14px',
            color: t.color.text, fontSize: 11, fontWeight: 700,
            letterSpacing: 1.6, textTransform: 'uppercase',
            cursor: 'pointer', fontFamily: t.font.sans,
          }}>Close ✕</button>
        </div>

        <div style={{
          position: 'relative', width: '100%',
          paddingTop: '56.25%',  // 16:9
          background: t.color.bg, borderRadius: t.radius.lg, overflow: 'hidden',
          border: `1px solid ${t.color.line2}`,
        }}>
          <iframe
            src={driveEmbed(lesson.driveId)}
            title={lesson.title}
            allow="autoplay; encrypted-media"
            allowFullScreen
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none',
            }}
          />
        </div>

        <div style={{ fontSize: 11, color: t.color.textMute, letterSpacing: 1, textAlign: 'center', textTransform: 'uppercase' }}>
          Tap outside to close · video hosted on Google Drive
        </div>
      </div>
    </div>
  )
}
