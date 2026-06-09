/**
 * DSM Design Tokens — High-End Athletic · Black & White
 * True black base, near-white text, tight grayscale tonal scale.
 * Bebas Neue for athletic display, Cormorant Garamond for italic flourishes,
 * Inter Tight for everything else. Semantic green/red kept for state.
 */

export const tokens = {
  // Color tokens are CSS variable references — their actual values are
  // defined per-theme in src/themes/index.js and injected at runtime by
  // src/lib/theme.js. This lets `document.documentElement.dataset.theme`
  // swap the whole palette without re-rendering React components.
  color: {
    bg:        'var(--color-bg)',
    surface:   'var(--color-surface)',
    surface2:  'var(--color-surface2)',
    line:      'var(--color-line)',
    line2:     'var(--color-line2)',
    text:      'var(--color-text)',
    textDim:   'var(--color-text-dim)',
    textMute: 'var(--color-text-mute)',

    ember:     'var(--color-ember)',
    emberDeep: 'var(--color-ember-deep)',
    emberSoft: 'var(--color-ember-soft)',
    bone:      'var(--color-bone)',

    pitch:     'var(--color-pitch)',
    pitchDeep: 'var(--color-pitch-deep)',
    pitchSoft: 'var(--color-pitch-soft)',
    pitchEdge: 'var(--color-pitch-edge)',

    ok:        'var(--color-ok)',
    okBg:      'var(--color-ok-bg)',
    err:       'var(--color-err)',
    errBg:     'var(--color-err-bg)',
    coral:     'var(--color-coral)',
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
    // Pitch-green primary button — multi-layer 3D: top inset highlight,
    // bottom inset shadow, dual outer halo for material depth.
    pitch: '0 1px 0 rgba(255,255,255,0.45) inset, 0 -1.5px 0 rgba(0,0,0,0.35) inset, 0 1px 0 rgba(255,255,255,0.10), 0 6px 16px -6px rgba(74,222,128,0.65), 0 18px 38px -16px rgba(74,222,128,0.5), 0 2px 0 rgba(0,0,0,0.4)',
    // Floating glass toolbar at the bottom — heavier float feel.
    toolbar: '0 1px 0 rgba(255,255,255,0.08) inset, 0 -1px 0 rgba(0,0,0,0.4) inset, 0 1px 0 rgba(255,255,255,0.04), 0 18px 44px -16px rgba(0,0,0,0.85), 0 32px 80px -32px rgba(0,0,0,0.65)',
    // Active tab pill inside the toolbar — pressed-in glassy look.
    pill: '0 1.5px 0 rgba(255,255,255,0.22) inset, 0 -1px 0 rgba(0,0,0,0.3) inset, 0 6px 18px -8px rgba(255,255,255,0.18), 0 1px 0 rgba(0,0,0,0.4)',
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
    paddingRight: 16,
    paddingBottom: 14,
    paddingLeft: 16,
    borderBottom: `1px solid ${t.color.line}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    // Themed sticky bar — was hardcoded rgba(0,0,0,0.85) (top bar showed
    // dark even in Daylight theme). t.color.surface flips correctly.
    background: t.color.surface,
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
    border: '1px solid rgba(var(--dsm-glow-rgb),0.16)',
    boxShadow: 'inset 0 1px 0 rgba(var(--dsm-glow-rgb),0.08), 0 6px 22px -10px rgba(var(--dsm-glow-rgb),0.22), 0 0 14px -5px rgba(var(--dsm-glow-rgb),0.16)',
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
    color: t.color.pitch,
    textShadow: '0 0 14px rgba(74,222,128,0.5), 0 0 30px rgba(74,222,128,0.28), 0 0 60px rgba(74,222,128,0.14)',
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
  // Primary CTA — premium 3D pitch-green button. Multi-layer inset highlight
  // + bottom shadow + dual halo. Hover/press handled via :hover/:active CSS
  // injected at module scope, so this remains a plain style object.
  btn: {
    background: `linear-gradient(180deg, #5eea8f 0%, ${t.color.pitch} 45%, ${t.color.pitchDeep} 100%)`,
    border: '1px solid rgba(255,255,255,0.26)',
    borderRadius: t.radius.md,
    padding: '15px 20px',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1.4,
    color: '#ffffff',
    textShadow: '0 1px 0 rgba(0,0,0,0.25)',
    cursor: 'pointer',
    width: '100%',
    fontFamily: t.font.sans,
    marginBottom: 8,
    textTransform: 'uppercase',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    boxShadow: 'inset 2px 2px 1.5px -2px rgba(255,255,255,0.95), inset -2px -2px 1.5px -2px rgba(255,255,255,0.6), inset 0 1px 1px -0.5px rgba(255,255,255,0.65), inset 0 0 10px 4px rgba(255,255,255,0.10), 0 6px 18px -8px rgba(74,222,128,0.7), 0 0 18px -4px rgba(74,222,128,0.5), 0 2px 0 rgba(0,0,0,0.35)',
    transition: `transform ${t.motion.fast}, filter ${t.motion.fast}, box-shadow ${t.motion.fast}`,
    position: 'relative',
  },
  bsm: {
    background: `linear-gradient(180deg, #5eea8f 0%, ${t.color.pitch} 45%, ${t.color.pitchDeep} 100%)`,
    border: '1px solid rgba(255,255,255,0.26)',
    borderRadius: t.radius.sm,
    padding: '7px 13px',
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 1,
    color: '#ffffff',
    textShadow: '0 1px 0 rgba(0,0,0,0.2)',
    cursor: 'pointer',
    fontFamily: t.font.sans,
    textTransform: 'uppercase',
    backdropFilter: 'blur(5px)',
    WebkitBackdropFilter: 'blur(5px)',
    transition: `transform ${t.motion.fast}, filter ${t.motion.fast}, box-shadow ${t.motion.fast}`,
    boxShadow: 'inset 1.5px 1.5px 1px -1.5px rgba(255,255,255,0.95), inset -1.5px -1.5px 1px -1.5px rgba(255,255,255,0.55), inset 0 1px 1px -0.5px rgba(255,255,255,0.6), inset 0 0 6px 3px rgba(255,255,255,0.10), 0 4px 12px -5px rgba(74,222,128,0.6), 0 0 12px -3px rgba(74,222,128,0.45), 0 1px 0 rgba(0,0,0,0.3)',
  },

  // Secondary / ghost CTA — neutral liquid glass (theme-aware via glow var).
  // Same glass-edge rim as the primary, no green halo. For Cancel/Dismiss/
  // secondary actions. Drop-in: style={C.bghost}.
  bghost: {
    background: 'rgba(var(--dsm-glow-rgb),0.06)',
    border: '1px solid rgba(var(--dsm-glow-rgb),0.20)',
    borderRadius: t.radius.md,
    padding: '15px 20px',
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1.4,
    color: t.color.text,
    cursor: 'pointer',
    width: '100%',
    fontFamily: t.font.sans,
    marginBottom: 8,
    textTransform: 'uppercase',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    boxShadow: 'inset 1.5px 1.5px 1px -1.5px rgba(var(--dsm-glow-rgb),0.6), inset -1.5px -1.5px 1px -1.5px rgba(var(--dsm-glow-rgb),0.4), inset 0 1px 1px -0.5px rgba(var(--dsm-glow-rgb),0.4), inset 0 0 7px 3px rgba(var(--dsm-glow-rgb),0.04), 0 4px 14px -8px rgba(0,0,0,0.45)',
    transition: `transform ${t.motion.fast}, filter ${t.motion.fast}, box-shadow ${t.motion.fast}`,
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

  // Floating glass toolbar — premium 3D float over the page.
  // Top inset highlight + bottom inset shadow give a true bevel; outer
  // dual drop-shadow lifts it off the canvas. Backdrop-saturate boosts
  // any color underneath for that "real glass" feel.
  nav: {
    position: 'fixed',
    bottom: 'max(14px, env(safe-area-inset-bottom))',
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 28px)',
    maxWidth: 412,
    background: 'linear-gradient(180deg, rgba(22,22,24,0.85) 0%, rgba(8,8,10,0.92) 100%)',
    backdropFilter: 'blur(28px) saturate(180%)',
    WebkitBackdropFilter: 'blur(28px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderTop: '1px solid rgba(255,255,255,0.16)',
    borderBottom: '1px solid rgba(0,0,0,0.5)',
    borderRadius: t.radius.full,
    display: 'flex',
    padding: 5,
    gap: 2,
    zIndex: 200,
    boxShadow: t.shadow.toolbar,
  },
  // Inactive tab — minimal, no chrome.
  // Active state is composed via inline style at the callsite (see Main.jsx
  // navTabs.map) to layer the pressed-pill background + pill shadow.
  nb: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    background: 'none',
    border: '1px solid transparent',
    cursor: 'pointer',
    padding: '12px 0',  // bump from 8 → 12 for ≥44px touch target
    minHeight: 44,
    borderRadius: t.radius.full,
    transition: `background ${t.motion.fast}, box-shadow ${t.motion.fast}, border-color ${t.motion.fast}, transform ${t.motion.fast}`,
    fontFamily: t.font.sans,
  },
  // Active state for the nav button — applied via spread at callsite.
  nbActive: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 100%)',
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: t.shadow.pill,
  },
}
