import { useState } from 'react'
import { tokens as t } from '../../styles.js'
import { PLAYER, BADGES, SQUAD, SEASON, SKILL_TREE } from '../../data/gamification.js'
import TiltCard from '../widgets/TiltCard.jsx'
import BadgeTile from '../widgets/BadgeTile.jsx'

export default function PlayerTab({ profile, user }) {
  const [tab, setTab] = useState('overview') // overview | badges | squad | tree
  const xpPct = Math.min(100, Math.round((PLAYER.xp / PLAYER.xpToNext) * 100))
  const name = profile?.full_name || user?.email?.split('@')[0] || 'Athlete'

  return (
    <div className="fade" style={{ padding: '14px 22px 56px' }}>
      {/* Hero */}
      <TiltCard tiltLimit={6} scale={1.01} style={{ borderRadius: 22, marginBottom: 16 }}>
        <div style={{
          position: 'relative',
          background: `linear-gradient(180deg, ${t.color.surface2}, ${t.color.surface})`,
          border: `1px solid ${t.color.line2}`,
          borderRadius: 22, padding: 24,
          overflow: 'hidden',
        }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <div style={{
              width: 78, height: 78, borderRadius: 18,
              background: t.color.bg,
              border: `1px solid ${t.color.text}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: t.font.athletic, fontSize: 46, fontWeight: 400,
              color: t.color.text, letterSpacing: 1, flexShrink: 0,
              boxShadow: '0 0 28px rgba(255,255,255,0.10)',
            }}>{name[0].toUpperCase()}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
                {PLAYER.levelTitle} · Season {romanize(SEASON.number)}
              </div>
              <h1 style={{
                fontFamily: t.font.athletic, fontSize: 38, fontWeight: 400,
                color: t.color.text, marginTop: 4, letterSpacing: 1, lineHeight: 0.95,
                textTransform: 'uppercase',
              }}>
                {name.split(' ')[0]}<span style={{ color: t.color.textMute }}>.</span>
              </h1>
              <div style={{
                fontSize: 11, color: t.color.textDim, marginTop: 6,
                letterSpacing: 1.4, fontWeight: 600, textTransform: 'uppercase',
              }}>Joined {PLAYER.joinDate.slice(0, 7)} · #{PLAYER.seasonRank} of {SEASON.totalAthletes}</div>
            </div>
          </div>

          {/* XP bar + level */}
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 6,
              }}>
                <span style={{
                  fontFamily: t.font.athletic, fontSize: 26, color: t.color.text, letterSpacing: 1,
                }}>LV {PLAYER.level}</span>
                <span style={{ fontSize: 10, letterSpacing: 1.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
                  → LV {PLAYER.level + 1}
                </span>
              </div>
              <span style={{
                fontSize: 11, color: t.color.textDim, letterSpacing: 1, fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {PLAYER.xp.toLocaleString()} / {PLAYER.xpToNext.toLocaleString()} XP
              </span>
            </div>
            <div style={{
              height: 6, background: t.color.line, borderRadius: 3, overflow: 'hidden',
            }}>
              <div style={{
                width: `${xpPct}%`, height: '100%', background: t.color.text,
                borderRadius: 3,
                transition: 'width 800ms cubic-bezier(.2,.7,.2,1)',
              }} />
            </div>
          </div>

          {/* Quick stats row */}
          <div style={{
            marginTop: 22, paddingTop: 18,
            borderTop: `1px solid ${t.color.line}`,
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
          }}>
            {[
              ['Coins',     PLAYER.coins,           '◊'],
              ['Mental',    PLAYER.mentalScore,    '+'],
              ['Streak',    '12d',                  '●'],
              ['Badges',    BADGES.filter(b => b.earned).length, '★'],
            ].map(([label, val, glyph]) => (
              <div key={label} style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 9, letterSpacing: 2, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>{label}</div>
                <div style={{
                  fontFamily: t.font.athletic, fontSize: 28, color: t.color.text,
                  marginTop: 2, lineHeight: 0.9, letterSpacing: 0.5,
                  fontVariantNumeric: 'tabular-nums',
                }}>{val}</div>
              </div>
            ))}
          </div>
        </div>
      </TiltCard>

      {/* Sub-tabs */}
      <div style={{
        display: 'flex', gap: 4, padding: 4,
        background: t.color.surface, border: `1px solid ${t.color.line}`,
        borderRadius: 999, marginBottom: 16,
      }}>
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'badges',   label: 'Badges' },
          { id: 'squad',    label: 'Squad' },
          { id: 'skills',     label: 'Skills' },
        ].map(it => {
          const a = tab === it.id
          return (
            <button key={it.id} onClick={() => setTab(it.id)} style={{
              flex: 1, padding: '9px 0',
              fontSize: 11, fontWeight: 600, letterSpacing: 1.4, textTransform: 'uppercase',
              color: a ? t.color.bg : t.color.textDim,
              background: a ? t.color.text : 'transparent',
              border: 'none', borderRadius: 999,
              cursor: 'pointer', fontFamily: t.font.sans,
              transition: `all ${t.motion.fast}`,
            }}>{it.label}</button>
          )
        })}
      </div>

      {tab === 'overview' && <Overview />}
      {tab === 'badges'   && <BadgesView />}
      {tab === 'squad'    && <SquadView />}
      {tab === 'skills'     && <SkillTreeView />}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */

function Overview() {
  const seasonPct = Math.round(SEASON.weeksElapsed / SEASON.weeksTotal * 100)
  return (
    <>
      {/* Season card */}
      <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: 16, marginBottom: 12 }}>
        <div style={{
          background: t.color.surface, border: `1px solid ${t.color.line}`,
          borderRadius: 16, padding: 18,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
                {SEASON.name}
              </div>
              <h3 style={{
                fontFamily: t.font.athletic, fontSize: 24, color: t.color.text,
                marginTop: 4, letterSpacing: 1, textTransform: 'uppercase',
              }}>
                Week {SEASON.weeksElapsed} of {SEASON.weeksTotal}
              </h3>
            </div>
            <div style={{
              fontFamily: t.font.athletic, fontSize: 32, color: t.color.text,
              lineHeight: 0.9, letterSpacing: 0.5,
            }}>
              #{SEASON.globalRank}
              <span style={{ fontSize: 12, color: t.color.textMute, marginLeft: 4, letterSpacing: 0.5 }}>
                / {SEASON.totalAthletes}
              </span>
            </div>
          </div>

          <div style={{
            marginTop: 12, height: 4, background: t.color.line, borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              width: `${seasonPct}%`, height: '100%', background: t.color.text,
              borderRadius: 2, transition: 'width 600ms cubic-bezier(.2,.7,.2,1)',
            }} />
          </div>

          <div style={{
            marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {SEASON.rewards.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: 6,
                  border: `1px solid ${r.unlocked ? t.color.text : t.color.line2}`,
                  background: r.unlocked ? t.color.text : 'transparent',
                  color: r.unlocked ? t.color.bg : t.color.textMute,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>{r.unlocked ? '✓' : i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 11, letterSpacing: 1.4, color: r.unlocked ? t.color.text : t.color.textDim,
                    fontWeight: 700, textTransform: 'uppercase',
                  }}>{r.tier}</div>
                  <div style={{ fontSize: 11, color: t.color.textMute, marginTop: 2 }}>{r.cosmetic}</div>
                </div>
                {!r.unlocked && r.progress != null && (
                  <div style={{
                    fontSize: 11, color: t.color.textDim, fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{Math.round(r.progress * 100)}%</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </TiltCard>

      {/* Recruiting profile preview */}
      <TiltCard tiltLimit={8} scale={1.015} style={{ borderRadius: 16, marginBottom: 12 }}>
        <div style={{
          background: t.color.surface, border: `1px solid ${t.color.line}`,
          borderRadius: 16, padding: 18,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
                Recruiting Profile
              </div>
              <h3 style={{
                fontFamily: t.font.athletic, fontSize: 24, color: t.color.text,
                marginTop: 4, letterSpacing: 1, textTransform: 'uppercase',
              }}>Public · v.1</h3>
            </div>
            <button style={{
              padding: '8px 14px', background: t.color.text,
              border: 'none', borderRadius: 999,
              fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase',
              color: t.color.bg, cursor: 'pointer', fontFamily: t.font.sans,
            }}>Share</button>
          </div>
          <p style={{ fontSize: 12, color: t.color.textDim, marginTop: 10, lineHeight: 1.5 }}>
            A shareable URL with your stats, PRs, video clips, mental performance score, and badges.
            Send to scouts and coaches in one tap.
          </p>
          <div style={{
            marginTop: 12, padding: '10px 14px',
            background: t.color.bg, border: `1px dashed ${t.color.line2}`,
            borderRadius: 10, fontFamily: 'ui-monospace, Menlo, monospace',
            fontSize: 11, color: t.color.textDim, letterSpacing: 0.5,
          }}>dsm.app/{name.toLowerCase().split(' ')[0]}</div>
        </div>
      </TiltCard>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */

function BadgesView() {
  const earned = BADGES.filter(b => b.earned)
  const locked = BADGES.filter(b => !b.earned)
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
          Earned · {earned.length}
        </span>
        <span style={{ fontSize: 11, color: t.color.textDim, fontWeight: 600, letterSpacing: 1 }}>
          {Math.round(earned.length / BADGES.length * 100)}% complete
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 18 }}>
        {earned.map(b => <BadgeTile key={b.id} badge={b} />)}
      </div>

      <span style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
        Locked · {locked.length}
      </span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
        {locked.map(b => <BadgeTile key={b.id} badge={b} />)}
      </div>
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */

function SquadView() {
  return (
    <>
      <TiltCard tiltLimit={6} scale={1.01} style={{ borderRadius: 16, marginBottom: 14 }}>
        <div style={{
          background: t.color.surface, border: `1px solid ${t.color.line}`,
          borderRadius: 16, padding: 18,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: t.color.bg, border: `1px solid ${t.color.text}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: t.font.athletic, fontSize: 32, color: t.color.text,
              flexShrink: 0, letterSpacing: 1,
            }}>{SQUAD.emblem}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase' }}>
                Squad
              </div>
              <h3 style={{
                fontFamily: t.font.athletic, fontSize: 24, color: t.color.text,
                marginTop: 4, letterSpacing: 1, textTransform: 'uppercase',
              }}>{SQUAD.name}</h3>
              <div style={{ fontSize: 11, color: t.color.textDim, marginTop: 4, letterSpacing: 1, fontWeight: 600 }}>
                Rank #{SQUAD.rank} of {SQUAD.totalSquads} · {SQUAD.weeklyXp.toLocaleString()} XP this week
              </div>
            </div>
          </div>
        </div>
      </TiltCard>

      <span style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
        Weekly leaderboard
      </span>
      {SQUAD.members.map(m => (
        <div key={m.name} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '12px 14px', marginBottom: 6,
          background: m.you ? 'rgba(255,255,255,0.04)' : t.color.surface,
          border: `1px solid ${m.you ? t.color.text : t.color.line}`,
          borderRadius: 12,
        }}>
          <div style={{
            fontFamily: t.font.athletic, fontSize: 22, color: m.you ? t.color.text : t.color.textDim,
            minWidth: 28, letterSpacing: 0.5, lineHeight: 0.9,
            fontVariantNumeric: 'tabular-nums',
          }}>{m.rank}</div>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: t.color.bg, border: `1px solid ${m.you ? t.color.text : t.color.line2}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: t.font.athletic, fontSize: 14, color: t.color.text, letterSpacing: 0.5,
            flexShrink: 0,
          }}>{m.avatar}</div>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: t.color.text,
            }}>{m.name}{m.you && <span style={{ fontSize: 10, marginLeft: 8, letterSpacing: 1.4, color: t.color.textMute, fontWeight: 700, textTransform: 'uppercase' }}>You</span>}</div>
          </div>
          <div style={{
            fontFamily: t.font.athletic, fontSize: 18, color: t.color.text,
            letterSpacing: 0.5, fontVariantNumeric: 'tabular-nums',
          }}>{m.xp.toLocaleString()}</div>
        </div>
      ))}
    </>
  )
}

/* ─────────────────────────────────────────────────────────────────────── */

function SkillTreeView() {
  const branches = {
    mental: SKILL_TREE.filter(s => s.branch === 'mental'),
    physical: SKILL_TREE.filter(s => s.branch === 'physical'),
    social: SKILL_TREE.filter(s => s.branch === 'social'),
  }
  return (
    <>
      {[
        { id: 'mental',   label: 'Mind' },
        { id: 'physical', label: 'Body' },
        { id: 'social',   label: 'Squad' },
      ].map(branch => (
        <div key={branch.id} style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 10, letterSpacing: 2.4, color: t.color.textMute, fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: 10 }}>
            {branch.label}
          </span>
          {branches[branch.id].map(skill => (
            <TiltCard key={skill.id} tiltLimit={6} scale={1.012} style={{ borderRadius: 12, marginBottom: 6 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 14,
                background: skill.unlocked ? t.color.surface : t.color.bg,
                border: `1px solid ${skill.unlocked ? t.color.line : t.color.line2}`,
                borderRadius: 12,
                opacity: skill.unlocked ? 1 : 0.55,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 9,
                  background: skill.unlocked ? t.color.bg : 'transparent',
                  border: `1px solid ${skill.unlocked ? t.color.line2 : t.color.line2}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: t.font.athletic, fontSize: 17, color: t.color.text,
                  flexShrink: 0, letterSpacing: 0.5,
                }}>{skill.unlocked ? skill.level : '◌'}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.color.text }}>{skill.name}</div>
                  <div style={{
                    fontSize: 10, color: t.color.textMute, marginTop: 3,
                    letterSpacing: 1.4, fontWeight: 600, textTransform: 'uppercase',
                  }}>
                    {skill.unlocked ? `Level ${skill.level} / ${skill.maxLevel}` : `Unlocks at LV ${skill.unlockAt}`}
                  </div>
                </div>
                {skill.unlocked && (
                  <div style={{ display: 'flex', gap: 2 }}>
                    {Array.from({ length: skill.maxLevel }).map((_, i) => (
                      <span key={i} style={{
                        width: 5, height: 14, borderRadius: 1,
                        background: i < skill.level ? t.color.text : t.color.line,
                      }} />
                    ))}
                  </div>
                )}
              </div>
            </TiltCard>
          ))}
        </div>
      ))}
    </>
  )
}

function romanize(num) {
  const m = ['', 'I','II','III','IV','V','VI','VII','VIII','IX','X']
  return m[num] || String(num)
}
