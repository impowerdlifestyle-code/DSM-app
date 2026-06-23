import React from 'react'
import { C, tokens as t } from '../styles.js'
import TiltCard from '../components/widgets/TiltCard.jsx'
import QuestCard from '../components/widgets/QuestCard.jsx'
import WeeklyRecapCard from '../components/widgets/WeeklyRecapCard.jsx'
import CoachTasksCard from '../components/widgets/CoachTasksCard.jsx'
import TrialBanner from '../components/widgets/TrialBanner.jsx'
import WeeklyChallengesCard from '../components/widgets/WeeklyChallengesCard.jsx'

export default function HomeView({
  user, profile, access, streak, quests, activeNudge, badgeNotice,
  setTab, onQuestClick, onDismissNudge, onActOnNudge,
  quote, currentWeek, checkinDone, pct, completedHabits, totalHabits,
  todayBMLogged, todayActionLogged, isCoach, onLogDay, onCallCoach,
}) {
  const todayTasks = [
    { glyph: 'B', label: 'Ball Mastery', sub: 'Daily skills log', done: todayBMLogged, tab: 'ball' },
    { glyph: 'A', label: 'Action Steps', sub: 'After practice or game', done: todayActionLogged, tab: 'actions' },
    { glyph: 'W', label: 'Weekly Check-In', sub: currentWeek, done: checkinDone, tab: 'weekly' },
  ]
  const doneCount = todayTasks.filter(t => t.done).length
  const allDone = doneCount === todayTasks.length
  const nextTask = todayTasks.find(t => !t.done)
  const streakLabel = pct >= 70 ? 'Elite cadence' : pct >= 40 ? 'Building rhythm' : 'Get going'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  // Progressive disclosure (#4): keep the first days dead-simple — Coach + today's
  // steps only. The rest of the app unlocks after the athlete has settled in.
  const daysSince = profile?.onboarded_at
    ? Math.floor((Date.now() - new Date(profile.onboarded_at).getTime()) / 86400000)
    : 99
  const isNew = !isCoach && daysSince < 3

  return (
    <>
      {activeNudge && (
        <div style={{
          margin: '14px 22px 0', padding: 14,
          background: t.color.surface,
          border: `1px solid ${t.color.line}`,
          borderRadius: 14,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: t.color.bg, border: `1px solid ${t.color.line}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: "'Cormorant Garamond', serif", fontSize: 17,
            fontStyle: 'italic', color: t.color.text, fontWeight: 500, flexShrink: 0,
          }}>V</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: 1.6, color: t.color.textMute, fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>
              Coach V · {activeNudge.kind}
            </div>
            <div style={{ fontSize: 13, color: t.color.text, lineHeight: 1.45, marginBottom: 10 }}>
              {activeNudge.message}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={onActOnNudge} style={{
                padding: '6px 12px', background: t.color.text, color: t.color.bg,
                border: 'none', borderRadius: 8,
                fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Reply</button>
              <button onClick={onDismissNudge} style={{
                padding: '6px 12px', background: 'transparent', color: t.color.textDim,
                border: `1px solid ${t.color.line}`, borderRadius: 8,
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
          <div style={{ fontSize: 11, letterSpacing: 2.4, color: t.color.textDim, fontWeight: 600, textTransform: 'uppercase' }}>
            {greeting}
          </div>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 56, fontWeight: 400, letterSpacing: 1.5,
            color: t.color.text, lineHeight: 0.95, marginTop: 6,
            textTransform: 'uppercase',
          }}>
            {profile?.full_name?.split(' ')[0] || 'Athlete'}<span style={{ color: t.color.textMute }}>.</span>
          </div>
        </div>

        <TrialBanner access={access} />

        {/* ── VOICE-FIRST HERO (#5) — the one big, obvious action (#3) ── */}
        {onCallCoach && (
          <TiltCard tiltLimit={8} scale={1.02} style={{ borderRadius: 18, marginBottom: 14 }}>
            <button onClick={onCallCoach} style={{
              width: '100%', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
              background: t.color.text, color: t.color.bg,
              border: 'none', borderRadius: 18, padding: '20px 22px',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: t.color.bg, color: t.color.text,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
              }}>🎙️</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, letterSpacing: 1, lineHeight: 0.95, textTransform: 'uppercase' }}>
                  Talk to Coach V
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, letterSpacing: 0.4 }}>
                  Tap to call — or type a message
                </div>
              </div>
              <div style={{ fontSize: 22, opacity: 0.7 }}>→</div>
            </button>
          </TiltCard>
        )}
        <button onClick={() => setTab('bot')} style={{
          width: '100%', background: 'transparent', color: t.color.textDim,
          border: `1px solid ${t.color.line}`, borderRadius: 12, padding: '11px 14px',
          fontSize: 11, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
          cursor: 'pointer', fontFamily: 'inherit', marginBottom: 18,
        }}>Type to Coach V instead</button>

        {/* ── TODAY — the daily focus (#1), with done/empty states (#6) ── */}
        <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: 16, marginBottom: 14 }}>
        <div style={{ ...C.card, padding: 18, marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={C.lbl}>Today</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: t.color.text, letterSpacing: 1.4, textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
              {doneCount}/{todayTasks.length} complete
            </span>
          </div>

          {allDone ? (
            <div style={{ textAlign: 'center', padding: '14px 8px' }}>
              <div style={{ fontSize: 30, marginBottom: 6 }}>💪</div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: 1, textTransform: 'uppercase', color: t.color.text, lineHeight: 1 }}>
                You crushed today
              </div>
              <div style={{ fontSize: 12, color: t.color.textDim, marginTop: 6 }}>
                Everything's logged. Come back tomorrow — or call Coach V.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {todayTasks.map((task, i) => (
                <button key={task.tab}
                  onClick={() => setTab(task.tab)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 8px',
                    background: task === nextTask ? 'rgba(var(--dsm-glow-rgb),0.06)' : 'transparent',
                    border: 'none', borderRadius: 10,
                    borderBottom: i < todayTasks.length - 1 ? `1px solid ${t.color.line}` : 'none',
                    cursor: 'pointer', width: '100%', textAlign: 'left',
                  }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    border: task.done ? '1px solid rgba(74,222,128,0.4)' : `1px solid ${t.color.line}`,
                    background: task.done ? 'rgba(74,222,128,0.10)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: "'Cormorant Garamond', serif",
                    fontSize: 15, fontStyle: 'italic', fontWeight: 600,
                    color: task.done ? t.color.pitch : t.color.textDim,
                    flexShrink: 0,
                  }}>
                    {task.done ? '✓' : task.glyph}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: t.color.text, letterSpacing: -0.1 }}>{task.label}</div>
                    <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 2 }}>{task.done ? 'Done' : task.sub}</div>
                  </div>
                  <div style={{ fontSize: 18, color: task.done ? t.color.pitch : t.color.line2 }}>{task.done ? '' : '→'}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        </TiltCard>

        {/* Single primary action (#3) */}
        <button style={C.btn} onClick={onLogDay}>Log today</button>

        {/* ── EVERYTHING ELSE — unlocks after the first days (#4) ── */}
        {!isNew && (
          <>
            <div style={{ height: 18 }} />
            <CoachTasksCard user={user} />
            <WeeklyRecapCard user={user} />
            <WeeklyChallengesCard user={user} />

            {/* Mindset fuel — athletic pull quote */}
            <TiltCard tiltLimit={10} scale={1.02} style={{ borderRadius: 16, marginBottom: 14 }}>
            <div style={{ ...C.orange, marginBottom: 0 }}>
              <div style={{
                position: 'absolute', top: 16, right: 18,
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 76, lineHeight: 0.75,
                color: t.color.surface, letterSpacing: 0,
              }}>&ldquo;</div>
              <span style={C.olbl}>Today&rsquo;s fuel</span>
              <div style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 28, fontWeight: 400, lineHeight: 1.05,
                letterSpacing: 0.5, color: t.color.text,
                marginTop: 6, marginBottom: 14, paddingRight: 50,
                textTransform: 'uppercase',
              }}>{quote}</div>
              <div style={{
                fontSize: 10, color: t.color.textDim, fontWeight: 600,
                letterSpacing: 2.4, textTransform: 'uppercase',
              }}>— Coach Valentino</div>
            </div>
            </TiltCard>

            {/* Daily quests */}
            {quests.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <span style={C.lbl}>Daily quests</span>
                  <span style={{ fontSize: 10, letterSpacing: 1.4, color: t.color.text, fontWeight: 600, textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
                    {quests.filter(q => q.progress >= q.target).length}/{quests.length} done
                  </span>
                </div>
                {quests.map(q => (
                  <QuestCard key={q.id} quest={q} onClick={() => onQuestClick(q)} />
                ))}
              </div>
            )}

            {/* Weekly habits stat card */}
            <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: 16, marginBottom: 12 }}>
            <div style={{ ...C.card, padding: 20, marginBottom: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
                <div style={{ position: 'relative', width: 72, height: 72, flexShrink: 0 }}>
                  <svg width="72" height="72" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="36" cy="36" r="30" fill="none" stroke={t.color.line} strokeWidth="3" />
                    <circle cx="36" cy="36" r="30" fill="none" stroke={t.color.text} strokeWidth="3"
                      strokeDasharray={`${2*Math.PI*30}`} strokeDashoffset={`${2*Math.PI*30*(1-pct/100)}`}
                      strokeLinecap="round" style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(.2,.7,.2,1)' }} />
                  </svg>
                  <div style={{
                    position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                    fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, fontWeight: 400, color: t.color.text,
                    fontVariantNumeric: 'tabular-nums', letterSpacing: 1,
                  }}>{pct}<span style={{ fontSize: 11, color: t.color.textDim, marginLeft: 2 }}>%</span></div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>Week habits</div>
                  <div style={{
                    fontFamily: "'Bebas Neue', sans-serif",
                    fontSize: 40, fontWeight: 400, color: t.color.text,
                    marginTop: 4, lineHeight: 0.9, fontVariantNumeric: 'tabular-nums', letterSpacing: 1,
                  }}>
                    {completedHabits}<span style={{ fontSize: 22, color: t.color.textMute }}> / {totalHabits}</span>
                  </div>
                  <div style={{ fontSize: 11, color: t.color.text, fontWeight: 600, marginTop: 6, letterSpacing: 1.4, textTransform: 'uppercase' }}>{streakLabel}</div>
                </div>
              </div>
            </div>
            </TiltCard>

            {/* Explore — everything else lives behind the Menu button too */}
            <div style={{ marginTop: 18, marginBottom: 14 }}>
              <span style={C.lbl}>Explore</span>
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
                    background: t.color.surface, border: `1px solid ${t.color.line}`,
                    borderRadius: 14, padding: '14px 14px', textAlign: 'left',
                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    fontFamily: 'inherit', color: 'inherit',
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.color.text, letterSpacing: -0.1 }}>{label}</div>
                    <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 3 }}>{sub}</div>
                    <div style={{
                      position: 'absolute', bottom: 12, right: 12,
                      fontSize: 12, color: t.color.line2,
                    }}>→</div>
                  </button>
                  </TiltCard>
                ))}
              </div>
            </div>
          </>
        )}

        {profile && (
          <div style={{
            textAlign: 'center', marginTop: 18,
            padding: '14px 0',
            fontSize: 11, color: t.color.line2,
            letterSpacing: 1.4, textTransform: 'uppercase', fontWeight: 600,
          }}>
            {profile.full_name || user.email}
            {isCoach && <span style={{ color: t.color.text, marginLeft: 8 }}>· Coach</span>}
            {profile.assigned_coach && !isCoach && (
              <div style={{ marginTop: 6, color: t.color.textDim }}>
                Mentor — <span style={{ color: t.color.text }}>{profile.assigned_coach}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
