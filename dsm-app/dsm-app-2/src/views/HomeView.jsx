import React from 'react'
import { C } from '../styles.js'
import TiltCard from '../components/widgets/TiltCard.jsx'
import QuestCard from '../components/widgets/QuestCard.jsx'
import VoiceJournal from '../components/widgets/VoiceJournal.jsx'
import WeeklyRecapCard from '../components/widgets/WeeklyRecapCard.jsx'
import FutureSelfPlayer from '../features/future-self/FutureSelfPlayer.jsx'

export default function HomeView({
  user, profile, streak, quests, activeNudge, badgeNotice,
  setTab, onQuestClick, onDismissNudge, onActOnNudge,
  quote, currentWeek, checkinDone, pct, completedHabits, totalHabits,
  todayBMLogged, todayActionLogged, isCoach, onLogDay,
}) {
  const todayTasks = [
    { glyph: 'B', label: 'Ball Mastery', sub: 'Daily skills log', done: todayBMLogged, tab: 'ball' },
    { glyph: 'A', label: 'Action Steps', sub: 'After practice or game', done: todayActionLogged, tab: 'actions' },
    { glyph: 'W', label: 'Weekly Check-In', sub: currentWeek, done: checkinDone, tab: 'weekly' },
  ]
  const doneCount = todayTasks.filter(t => t.done).length
  const streakLabel = pct >= 70 ? 'Elite cadence' : pct >= 40 ? 'Building rhythm' : 'Get going'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <>
      {activeNudge && (
        <div style={{
          margin: '14px 22px 0', padding: 14,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid #36363c',
          borderRadius: 14,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: '#000', border: '1px solid #36363c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Cormorant Garamond', serif", fontSize: 17,
            fontStyle: 'italic', color: '#fafafa', fontWeight: 500, flexShrink: 0,
          }}>V</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: 1.6, color: '#4a4a4a', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
              Coach V · {activeNudge.kind}
            </div>
            <div style={{ fontSize: 13, color: '#fafafa', lineHeight: 1.45, marginBottom: 10 }}>
              {activeNudge.message}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onActOnNudge} style={{
                padding: '6px 12px', background: '#fafafa', color: '#000',
                border: 'none', borderRadius: 8,
                fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Reply</button>
              <button onClick={onDismissNudge} style={{
                padding: '6px 12px', background: 'transparent', color: '#8e8e8e',
                border: '1px solid #36363c', borderRadius: 8,
                fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Dismiss</button>
            </div>
          </div>
        </div>
      )}

      <div style={C.scroll} className="fade">
        {/* Greeting + name */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, letterSpacing: 2.4, color: '#8e8e8e', fontWeight: 600, textTransform: 'uppercase' }}>
            {greeting}
          </div>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 56, fontWeight: 400, letterSpacing: 1.5,
            color: '#fafafa', lineHeight: 0.95, marginTop: 6,
            textTransform: 'uppercase',
          }}>
            {profile?.full_name?.split(' ')[0] || 'Athlete'}<span style={{ color: '#4a4a4a' }}>.</span>
          </div>
        </div>

        <WeeklyRecapCard user={user} />

        {/* Mindset fuel — athletic pull quote */}
        <TiltCard tiltLimit={10} scale={1.02} style={{ borderRadius: 16, marginBottom: 14 }}>
        <div style={{ ...C.orange, marginBottom: 0 }}>
          <div style={{
            position: 'absolute', top: 16, right: 18,
            fontFamily: "'Bebas Neue', sans-serif", fontSize: 76, lineHeight: 0.75,
            color: '#1c1c1c', letterSpacing: 0,
          }}>&ldquo;</div>
          <span style={C.olbl}>Today&rsquo;s fuel</span>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 28, fontWeight: 400, lineHeight: 1.05,
            letterSpacing: 0.5, color: '#fafafa',
            marginTop: 6, marginBottom: 14, paddingRight: 50,
            textTransform: 'uppercase',
          }}>{quote}</div>
          <div style={{
            fontSize: 10, color: '#8e8e8e', fontWeight: 600,
            letterSpacing: 2.4, textTransform: 'uppercase',
          }}>— Coach Valentino</div>
        </div>
        </TiltCard>

        {/* Daily quests */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
            <span style={C.lbl}>Daily quests</span>
            <span style={{ fontSize: 10, letterSpacing: 1.4, color: '#fafafa', fontWeight: 600, textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
              {quests.filter(q => q.progress >= q.target).length}/{quests.length} done
            </span>
          </div>
          {quests.map(q => (
            <QuestCard key={q.id} quest={q} onClick={() => onQuestClick(q)} />
          ))}
        </div>

        {/* Voice journal */}
        <div style={{ marginBottom: 16 }}>
          <VoiceJournal user={user} />
        </div>

        {/* Future self — monthly identity ritual */}
        <FutureSelfPlayer user={user} context="monthly_check" />

        {/* Today progress strip */}
        <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: 16, marginBottom: 12 }}>
        <div style={{ ...C.card, padding: 18, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={C.lbl}>Today</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#fafafa', letterSpacing: 1.4, textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
              {doneCount}/{todayTasks.length} complete
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {todayTasks.map((task, i) => (
              <button key={task.tab}
                onClick={() => setTab(task.tab)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '12px 4px',
                  background: 'transparent', border: 'none',
                  borderBottom: i < todayTasks.length - 1 ? '1px solid #1f2128' : 'none',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7,
                  border: task.done ? '1px solid rgba(74,222,128,0.4)' : '1px solid #2a2d36',
                  background: task.done ? 'rgba(74,222,128,0.10)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: 14, fontStyle: 'italic', fontWeight: 600,
                  color: task.done ? '#4ade80' : '#8a8b8f',
                  flexShrink: 0,
                }}>
                  {task.done ? '✓' : task.glyph}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f4f3ef', letterSpacing: -0.1 }}>{task.label}</div>
                  <div style={{ fontSize: 11, color: '#8a8b8f', marginTop: 2 }}>{task.sub}</div>
                </div>
                <div style={{ fontSize: 16, color: task.done ? '#4ade80' : '#54565c' }}>{task.done ? '' : '→'}</div>
              </button>
            ))}
          </div>
        </div>
        </TiltCard>

        {/* Weekly habits stat card */}
        <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: 16, marginBottom: 12 }}>
        <div style={{ ...C.card, padding: 20, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
              <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="36" cy="36" r="30" fill="none" stroke="#1c1c1c" strokeWidth="3" />
                <circle cx="36" cy="36" r="30" fill="none" stroke="#fafafa" strokeWidth="3"
                  strokeDasharray={`${2*Math.PI*30}`} strokeDashoffset={`${2*Math.PI*30*(1-pct/100)}`}
                  strokeLinecap="round" style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.2,.7,.2,1)' }} />
              </svg>
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, fontWeight: 400, color: '#fafafa',
                fontVariantNumeric: 'tabular-nums', letterSpacing: 1,
              }}>{pct}<span style={{ fontSize: 11, color: '#8e8e8e', marginLeft: 2 }}>%</span></div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: 2.4, color: '#4a4a4a', fontWeight: 600, textTransform: 'uppercase' }}>Week habits</div>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 40, fontWeight: 400, color: '#fafafa',
                marginTop: 4, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums', letterSpacing: 1,
              }}>
                {completedHabits}<span style={{ fontSize: 22, color: '#4a4a4a' }}> / {totalHabits}</span>
              </div>
              <div style={{ fontSize: 11, color: '#fafafa', fontWeight: 600, marginTop: 6, letterSpacing: 1.4, textTransform: 'uppercase' }}>{streakLabel}</div>
            </div>
          </div>
        </div>
        </TiltCard>

        {/* Explore — reference items only. Nav-bar tabs surface everything else. */}
        <div style={{ marginTop: 18, marginBottom: 14 }}>
          <span style={C.lbl}>More</span>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              ['Calendar',        'Workouts & games',      'calendar'],
              ['Mental Tools',    'Train your mind',        'mental'],
              ['Habit Tracker',   'Deep streak history',    'tracker'],
              ['Weekly Check-In', 'Sunday reflection',      'weekly'],
              ['Course',          'Video lessons',          'course'],
              ['For Parents',     'Best-practices guide',   'parents'],
            ].map(([label, sub, target]) => (
              <TiltCard key={target} tiltLimit={14} scale={1.04} style={{ borderRadius: 14 }}>
              <button onClick={() => setTab(target)} style={{
                width: '100%',
                background: '#0a0a0a', border: '1px solid #1c1c1c',
                borderRadius: 14, padding: '14px 14px', textAlign: 'left',
                cursor: 'pointer', position: 'relative', overflow: 'hidden',
                fontFamily: 'inherit', color: 'inherit',
              }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fafafa', letterSpacing: -0.1 }}>{label}</div>
                <div style={{ fontSize: 11, color: '#8e8e8e', marginTop: 3 }}>{sub}</div>
                <div style={{
                  position: 'absolute', bottom: 12, right: 12,
                  fontSize: 12, color: '#54565c',
                }}>→</div>
              </button>
              </TiltCard>
            ))}
          </div>
        </div>

        <button style={C.btn} onClick={onLogDay}>Log today</button>

        {profile && (
          <div style={{
            textAlign: 'center', marginTop: 18,
            padding: '14px 0',
            fontSize: 11, color: '#54565c',
            letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600,
          }}>
            {profile.full_name || user.email}
            {isCoach && <span style={{ color: '#fafafa', marginLeft: 8 }}>· Coach</span>}
            {profile.assigned_coach && !isCoach && (
              <div style={{ marginTop: 6, color: '#8a8b8f' }}>
                Mentor — <span style={{ color: '#fafafa' }}>{profile.assigned_coach}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
