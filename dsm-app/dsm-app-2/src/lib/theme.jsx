// DSM Theme runtime — applies a theme via data-theme attribute on <html>,
// persists choice to localStorage, exposes a React context + hook for the
// picker UI. All theme CSS is generated from themes/index.js so adding a
// new theme is a one-file change.

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { THEMES, DEFAULT_THEME, isValidThemeId } from '../themes/index.js'

const STORAGE_KEY = 'dsm_theme'

// ─── Apply ──────────────────────────────────────────────────
export function applyTheme(id) {
  const safeId = isValidThemeId(id) ? id : DEFAULT_THEME
  const theme = THEMES[safeId]
  if (typeof document === 'undefined') return safeId
  const root = document.documentElement
  root.setAttribute('data-theme', safeId)
  // Some browsers honor color-scheme for native form controls + scrollbars.
  root.style.colorScheme = theme.mode
  // Update <meta name="theme-color"> for OS chrome (Safari address bar etc.)
  let meta = document.querySelector('meta[name="theme-color"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.appendChild(meta)
  }
  meta.content = theme.vars['--color-meta-theme'] || theme.vars['--color-bg']
  return safeId
}

export function readStoredTheme() {
  if (typeof localStorage === 'undefined') return DEFAULT_THEME
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isValidThemeId(stored) ? stored : DEFAULT_THEME
  } catch { return DEFAULT_THEME }
}

export function writeStoredTheme(id) {
  if (typeof localStorage === 'undefined') return
  try { localStorage.setItem(STORAGE_KEY, id) } catch { /* private mode */ }
}

// ─── CSS injection ──────────────────────────────────────────
// Generate a single <style> block holding every theme's CSS variable map.
// :root[data-theme="<id>"] { --color-bg: ...; } — one block per theme.
export function generateThemeCss() {
  return Object.values(THEMES).map(theme => {
    const lines = Object.entries(theme.vars).map(([k, v]) => `  ${k}: ${v};`).join('\n')
    return `:root[data-theme="${theme.id}"] {\n${lines}\n}`
  }).join('\n\n')
}

const STYLE_ELEMENT_ID = 'dsm-theme-vars'

export function injectThemeCss() {
  if (typeof document === 'undefined') return
  if (document.getElementById(STYLE_ELEMENT_ID)) return
  const el = document.createElement('style')
  el.id = STYLE_ELEMENT_ID
  el.textContent = generateThemeCss()
  // Insert at the top of <head> so component styles can override if needed.
  document.head.insertBefore(el, document.head.firstChild)
}

// ─── Boot (run before React renders so the first paint is themed) ───
export function bootTheme() {
  injectThemeCss()
  return applyTheme(readStoredTheme())
}

// ─── React provider + hook ──────────────────────────────────
const ThemeContext = createContext({ themeId: DEFAULT_THEME, setTheme: () => {}, themes: THEMES })

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => readStoredTheme())

  useEffect(() => {
    injectThemeCss()
    applyTheme(themeId)
  }, [themeId])

  const setTheme = useCallback((id) => {
    if (!isValidThemeId(id)) return
    writeStoredTheme(id)
    setThemeId(id)
  }, [])

  return (
    <ThemeContext.Provider value={{ themeId, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
