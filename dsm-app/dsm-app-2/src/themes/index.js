// DSM Theme System — Phase 1
// Each theme is a flat map of CSS variables matching the existing tokens.color
// keys. The provider in src/lib/theme.js injects these into the DOM as
// :root[data-theme="<id>"] blocks, then components consume them via the
// tokens object in src/styles.js (which exports 'var(--color-bg)' style strings).
//
// Add a new theme by appending to THEMES — both the menu picker and the CSS
// generator pick it up automatically.

const COMMON_FONT_TOKENS = {
  // Fonts/radii/shadows live on the JS side; they don't need theming.
}

// ──────────────────────────────────────────────────────────────
// ONYX — current dark. True black base, near-white text.
// ──────────────────────────────────────────────────────────────
const onyx = {
  '--color-bg':         '#000000',
  '--color-surface':    '#0a0a0a',
  '--color-surface2':   '#141414',
  '--color-line':       '#252528',
  '--color-line2':      '#36363c',

  '--color-text':       '#fafafa',
  '--color-text-dim':   '#8e8e8e',
  '--color-text-mute':  '#4a4a4a',

  '--color-ember':      '#ffffff',
  '--color-ember-deep': '#e5e5e5',
  '--color-ember-soft': 'rgba(255,255,255,0.06)',
  '--color-bone':       '#f4f4f4',

  '--color-pitch':      '#4ade80',
  '--color-pitch-deep': '#22c55e',
  '--color-pitch-soft': 'rgba(74,222,128,0.14)',
  '--color-pitch-edge': 'rgba(74,222,128,0.55)',

  '--color-ok':         '#4ade80',
  '--color-ok-bg':      'rgba(74,222,128,0.08)',
  '--color-err':        '#f87171',
  '--color-err-bg':     'rgba(248,113,113,0.08)',
  '--color-coral':      '#f87171',

  // The OS chrome (Safari address bar, Android status bar)
  '--color-scheme-os':  'dark',
  '--color-meta-theme': '#000000',
}

// ──────────────────────────────────────────────────────────────
// DAYLIGHT — light invert. Soft white base, near-black text.
// Pitch green darkened for contrast on bright background.
// ──────────────────────────────────────────────────────────────
const daylight = {
  '--color-bg':         '#fafafa',
  '--color-surface':    '#ffffff',
  '--color-surface2':   '#f0f0f2',
  '--color-line':       '#e2e2e6',
  '--color-line2':      '#c8c9cf',

  '--color-text':       '#0a0a0a',
  '--color-text-dim':   '#525258',
  '--color-text-mute':  '#8a8b8f',

  '--color-ember':      '#0a0a0a',
  '--color-ember-deep': '#1f1f24',
  '--color-ember-soft': 'rgba(0,0,0,0.06)',
  '--color-bone':       '#1a1a1f',

  '--color-pitch':      '#16a34a',
  '--color-pitch-deep': '#15803d',
  '--color-pitch-soft': 'rgba(22,163,74,0.12)',
  '--color-pitch-edge': 'rgba(22,163,74,0.55)',

  '--color-ok':         '#16a34a',
  '--color-ok-bg':      'rgba(22,163,74,0.10)',
  '--color-err':        '#dc2626',
  '--color-err-bg':     'rgba(220,38,38,0.08)',
  '--color-coral':      '#dc2626',

  '--color-scheme-os':  'light',
  '--color-meta-theme': '#fafafa',
}

export const THEMES = {
  onyx:     { id: 'onyx',     label: 'Onyx',     mode: 'dark',  swatches: ['#000000', '#fafafa', '#4ade80'], vars: onyx },
  daylight: { id: 'daylight', label: 'Daylight', mode: 'light', swatches: ['#fafafa', '#0a0a0a', '#16a34a'], vars: daylight },
}

export const DEFAULT_THEME = 'onyx'

export function isValidThemeId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(THEMES, id)
}
