/**
 * DSM Design Tokens — High-End Athletic · Black & White
 * True black base, near-white text, tight grayscale tonal scale.
 * Bebas Neue for athletic display, Cormorant Garamond for italic flourishes,
 * Inter Tight for everything else. Semantic green/red kept for state.
 */

export const tokens = {
  color: {
    bg:        '#000000',   // page (true black for max athletic punch)
    surface:   '#0a0a0a',   // cards
    surface2:  '#141414',   // raised
    line:      '#252528',   // hairline (silver-tinted)
    line2:     '#36363c',   // emphasized hairline (brighter silver)
    text:      '#fafafa',   // primary (near-white, slightly warm)
    textDim:   '#8e8e8e',   // secondary
    textMute:  '#4a4a4a',   // tertiary / micro labels

    // ACCENT — pure white (no color). Aliased through the old `ember*` names
    // so every file already wired to tokens.color.ember inherits without edits.
    ember:     '#ffffff',
    emberDeep: '#e5e5e5',
    emberSoft: 'rgba(255,255,255,0.06)',
    bone:      '#f4f4f4',

    // CTA — soccer-pitch grass green for primary action buttons.
    // Bright FIFA-marketing green; high-contrast on black, energetic.
    pitch:     '#4ade80',
    pitchDeep: '#22c55e',
    pitchSoft: 'rgba(74,222,128,0.14)',
    pitchEdge: 'rgba(74,222,128,0.55)',

    // Semantic only — kept for state signaling (workout set done, errors)
    ok:        '#4ade80',
    okBg:      'rgba(74,222,128,0.08)',
    err:       '#f87171',
    errBg:     'rgba(248,113,113,0.08)',
    coral:     '#f87171',  // alias for warning-state (body-fat increase)
  },
  font: {
    athletic: "'Bebas Neue', 'Oswald', 'Arial Narrow', sans-serif",
    display:  "'Cormorant Garamond', 'Times New Roman', Georgia, serif",
    sans:     "'Inter Tight', 'Inter', system-ui, sans-serif",
    mono:     "ui-monospace, 'SF Mono', Menlo, monospace",
  },
  radius: { sm: 8, md: 12, lg: 16, xl: 22, full: 999 },
  space:  { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 },
  shadow: {
    card:  '0 1px 0 rgba(255,255,255,0.025) inset, 0 8px 24px -12px rgba(0,0,0,0.6)',
    raised:'0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -20px rgba(0,0,0,0.7)',
    ember: '0 10px 30px -10px rgba(255,255,255,0.18)',  // soft white halo
    // Pitch-green button halo — paired with linear gradient fill for depth.
    pitch: '0 1px 0 rgba(255,255,255,0.3) inset, 0 -1px 0 rgba(0,0,0,0.25) inset, 0 6px 16px -6px rgba(74,222,128,0.6), 0 14px 36px -14px rgba(74,222,128,0.45)',
  },
  motion: {
    fast: '120ms cubic-bezier(.2,.7,.2,1)',
    base: '220ms cubic-bezier(.2,.7,.2,1)',
    slow: '420ms cubic-bezier(.2,.7,.2,1)',
  },
}

const t = tokens

/**
 * Legacy alias map — every key wired to the new B&W tokens so the look
 * propagates everywhere existing code uses `C.*`.
 */
export const C = {
  app: {
    fontFamily: t.font.sans,
    background: t.color.bg,
    minHeight: '100vh',
    color: t.color.text,
    maxWidth: 440,
    margin: '0 auto',
    paddingBottom: 96,
    position: 'relative',
  },
  hdr: {
    paddingTop: 'max(18px, env(safe-area-inset-top))',
    paddingRight: 22,
    paddingBottom: 14,
    paddingLeft: 22,
    borderBottom: `1px solid ${t.color.line}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(16px) saturate(140%)',
    WebkitBackdropFilter: 'blur(16px) saturate(140%)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  scroll: { padding: '20px 22px 56px' },

  card: {
    background: t.color.surface,
    borderRadius: t.radius.lg,
    padding: 18,
    marginBottom: 12,
    border: `1px solid ${t.color.line}`,
    boxShadow: t.shadow.card,
  },

  // Hero callout (previously the ember tint) — now a flat raised surface
  orange: {
    position: 'relative',
    background: t.color.surface2,
    borderRadius: t.radius.lg,
    padding: '22px 20px',
    marginBottom: 14,
    border: `1px solid ${t.color.line2}`,
    overflow: 'hidden',
  },

  lbl: {
    fontSize: 10,
    letterSpacing: 2.4,
    color: t.color.textMute,
    fontWeight: 600,
    marginBottom: 9,
    display: 'block',
    textTransform: 'uppercase',
  },
  olbl: {
    fontSize: 10,
    letterSpacing: 2.4,
    color: t.color.text,
    fontWeight: 600,
    marginBottom: 9,
    display: 'block',
    textTransform: 'uppercase',
  },

  // Page title — athletic condensed with cinematic glow
  title: {
    fontFamily: t.font.athletic,
    fontSize: 42,
    fontWeight: 400,
    letterSpacing: 1,
    lineHeight: 0.95,
    marginBottom: 4,
    textTransform: 'uppercase',
    color: t.color.text,
    textShadow: '0 0 14px rgba(255,255,255,0.55), 0 0 28px rgba(255,255,255,0.3), 0 0 56px rgba(255,255,255,0.15)',
    animation: 'dsmGlow 3.2s ease-in-out infinite',
  },
  sub: {
    fontSize: 10,
    color: t.color.textMute,
    letterSpacing: 2.4,
    fontWeight: 600,
    marginBottom: 16,
    textTransform: 'uppercase',
  },

  // CTA — pitch-green pill on black, with subtle top-edge highlight + green halo.
  btn: {
    background: `linear-gradient(180deg, ${t.color.pitch} 0%, ${t.color.pitchDeep} 100%)`,
    border: `1px solid ${t.color.pitchEdge}`,
    borderRadius: t.radius.md,
    padding: '15px 20px',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1.4,
    color: '#ffffff',
    cursor: 'pointer',
    width: '100%',
    fontFamily: t.font.sans,
    marginBottom: 8,
    textTransform: 'uppercase',
    boxShadow: t.shadow.pitch,
    transition: `transform ${t.motion.fast}, filter ${t.motion.fast}`,
  },
  bsm: {
    background: `linear-gradient(180deg, ${t.color.pitch} 0%, ${t.color.pitchDeep} 100%)`,
    border: `1px solid ${t.color.pitchEdge}`,
    borderRadius: t.radius.sm,
    padding: '7px 13px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    color: '#ffffff',
    cursor: 'pointer',
    fontFamily: t.font.sans,
    textTransform: 'uppercase',
    boxShadow: '0 1px 0 rgba(255,255,255,0.25) inset, 0 4px 10px -4px rgba(58,165,68,0.5)',
  },

  inp: {
    width: '100%',
    background: t.color.bg,
    border: `1px solid ${t.color.line2}`,
    borderRadius: t.radius.md,
    padding: '13px 14px',
    fontSize: 14,
    color: t.color.text,
    fontFamily: t.font.sans,
    outline: 'none',
    boxSizing: 'border-box',
    transition: `border-color ${t.motion.fast}`,
  },
  ta: {
    width: '100%',
    background: t.color.bg,
    border: `1px solid ${t.color.line2}`,
    borderRadius: t.radius.md,
    padding: '13px 14px',
    fontSize: 13,
    color: t.color.text,
    fontFamily: t.font.sans,
    outline: 'none',
    resize: 'none',
    boxSizing: 'border-box',
  },

  nav: {
    position: 'fixed',
    bottom: 'max(14px, env(safe-area-inset-bottom))',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 28px)',
    maxWidth: 412,
    background: 'rgba(10,10,10,0.88)',
    backdropFilter: 'blur(20px) saturate(160%)',
    WebkitBackdropFilter: 'blur(20px) saturate(160%)',
    border: `1px solid ${t.color.line2}`,
    borderRadius: t.radius.full,
    display: 'flex',
    padding: 6,
    zIndex: 200,
    boxShadow: t.shadow.raised,
  },
  nb: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '12px 0',  // bump from 8 → 12 for ≥44px touch target
    minHeight: 44,
    borderRadius: t.radius.full,
    transition: `background ${t.motion.fast}`,
  },
}
