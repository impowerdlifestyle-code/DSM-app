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

  // Title/heading glow color (rgb triplet for rgba()). Light glow on dark bg.
  '--dsm-glow-rgb':     '255,255,255',

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

  // Dark ink glow on the light bg — a soft halo, never a wash-out. This is
  // what keeps headers crisp + premium in Daylight instead of disappearing.
  '--dsm-glow-rgb':     '20,20,20',

  '--color-scheme-os':  'light',
  '--color-meta-theme': '#fafafa',
}

// ──────────────────────────────────────────────────────────────
// PITCH — deep grass-green dominant. Soccer-stadium-at-night vibe.
// Pitch + ember stay near-white for max signal contrast.
// ──────────────────────────────────────────────────────────────
const pitch = {
  '--color-bg':         '#04130c',
  '--color-surface':    '#0a2419',
  '--color-surface2':   '#103328',
  '--color-line':       '#1d4636',
  '--color-line2':      '#2c624d',

  '--color-text':       '#f0fdf6',
  '--color-text-dim':   '#8fb5a4',
  '--color-text-mute':  '#4f6e62',

  '--color-ember':      '#ffffff',
  '--color-ember-deep': '#e5e5e5',
  '--color-ember-soft': 'rgba(255,255,255,0.07)',
  '--color-bone':       '#f4f4f4',

  '--color-pitch':      '#86efac',
  '--color-pitch-deep': '#4ade80',
  '--color-pitch-soft': 'rgba(134,239,172,0.18)',
  '--color-pitch-edge': 'rgba(134,239,172,0.65)',

  '--color-ok':         '#86efac',
  '--color-ok-bg':      'rgba(134,239,172,0.10)',
  '--color-err':        '#fca5a5',
  '--color-err-bg':     'rgba(252,165,165,0.08)',
  '--color-coral':      '#fca5a5',

  '--dsm-glow-rgb':     '134,239,172',

  '--color-scheme-os':  'dark',
  '--color-meta-theme': '#04130c',
}

// ──────────────────────────────────────────────────────────────
// CRIMSON — deep wine base + gold accents. Cinematic.
// CTAs stay green-friendly but lean toward gold via emberDeep.
// ──────────────────────────────────────────────────────────────
const crimson = {
  '--color-bg':         '#150506',
  '--color-surface':    '#26090c',
  '--color-surface2':   '#3a0e14',
  '--color-line':       '#4a1820',
  '--color-line2':      '#6b2530',

  '--color-text':       '#fdf2f4',
  '--color-text-dim':   '#c9a5ab',
  '--color-text-mute':  '#7a4a52',

  '--color-ember':      '#fbbf24',
  '--color-ember-deep': '#f59e0b',
  '--color-ember-soft': 'rgba(251,191,36,0.10)',
  '--color-bone':       '#fef3c7',

  '--color-pitch':      '#fbbf24',
  '--color-pitch-deep': '#d97706',
  '--color-pitch-soft': 'rgba(251,191,36,0.16)',
  '--color-pitch-edge': 'rgba(251,191,36,0.6)',

  '--color-ok':         '#86efac',
  '--color-ok-bg':      'rgba(134,239,172,0.08)',
  '--color-err':        '#fca5a5',
  '--color-err-bg':     'rgba(252,165,165,0.10)',
  '--color-coral':      '#fca5a5',

  '--dsm-glow-rgb':     '251,191,36',

  '--color-scheme-os':  'dark',
  '--color-meta-theme': '#150506',
}

// ──────────────────────────────────────────────────────────────
// MIST — cool blue-tinted dark. Calm, focus-first.
// ──────────────────────────────────────────────────────────────
const mist = {
  '--color-bg':         '#070a14',
  '--color-surface':    '#0e1422',
  '--color-surface2':   '#161e32',
  '--color-line':       '#222c44',
  '--color-line2':      '#37436a',

  '--color-text':       '#eef2ff',
  '--color-text-dim':   '#94a3c8',
  '--color-text-mute':  '#535d80',

  '--color-ember':      '#bae6fd',
  '--color-ember-deep': '#7dd3fc',
  '--color-ember-soft': 'rgba(186,230,253,0.08)',
  '--color-bone':       '#e0f2fe',

  '--color-pitch':      '#60a5fa',
  '--color-pitch-deep': '#3b82f6',
  '--color-pitch-soft': 'rgba(96,165,250,0.16)',
  '--color-pitch-edge': 'rgba(96,165,250,0.6)',

  '--color-ok':         '#4ade80',
  '--color-ok-bg':      'rgba(74,222,128,0.10)',
  '--color-err':        '#f87171',
  '--color-err-bg':     'rgba(248,113,113,0.10)',
  '--color-coral':      '#f87171',

  '--dsm-glow-rgb':     '125,211,252',

  '--color-scheme-os':  'dark',
  '--color-meta-theme': '#070a14',
}

export const THEMES = {
  onyx:     { id: 'onyx',     label: 'Onyx',     mode: 'dark',  swatches: ['#000000', '#fafafa', '#4ade80'], vars: onyx },
  daylight: { id: 'daylight', label: 'Daylight', mode: 'light', swatches: ['#fafafa', '#0a0a0a', '#16a34a'], vars: daylight },
  pitch:    { id: 'pitch',    label: 'Pitch',    mode: 'dark',  swatches: ['#04130c', '#f0fdf6', '#86efac'], vars: pitch },
  crimson:  { id: 'crimson',  label: 'Crimson',  mode: 'dark',  swatches: ['#150506', '#fdf2f4', '#fbbf24'], vars: crimson },
  mist:     { id: 'mist',     label: 'Mist',     mode: 'dark',  swatches: ['#070a14', '#eef2ff', '#60a5fa'], vars: mist },
}

export const DEFAULT_THEME = 'onyx'

export function isValidThemeId(id) {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(THEMES, id)
}
