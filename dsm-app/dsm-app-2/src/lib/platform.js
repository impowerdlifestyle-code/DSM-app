// Runtime platform detection. Safe before Capacitor is even installed —
// window.Capacitor is simply undefined on the plain web build.
//
// Used to hide external-payment links inside the native iOS/Android app
// (Apple Guideline 3.1.1 forbids linking out to buy digital content) while
// keeping them on the web build where they're allowed.

export function isNativeApp() {
  if (typeof window === 'undefined') return false
  const cap = window.Capacitor
  if (!cap) return false
  if (typeof cap.isNativePlatform === 'function') return cap.isNativePlatform()
  return cap.platform === 'ios' || cap.platform === 'android'
}

export function platformName() {
  if (typeof window === 'undefined') return 'web'
  return window.Capacitor?.getPlatform?.() || 'web'
}

// In the native shell the webview origin is capacitor://localhost, so a bare
// `/api/*` fetch 404s. Point native API calls at the deployed backend. On web
// this stays same-origin (''). Update the host when the branded domain lands.
const NATIVE_API_HOST = 'https://dsm-app-2.vercel.app'
export function apiUrl(path) {
  if (typeof path === 'string' && path.startsWith('/api/') && isNativeApp()) {
    return NATIVE_API_HOST + path
  }
  return path
}

// Legal docs are self-hosted as static pages in /public, so they ship with
// the app and need no external domain. Same-origin relative paths work on
// web and in the Capacitor webview.
export const PRIVACY_URL = '/privacy.html'
export const TERMS_URL   = '/terms.html'
export const SUPPORT_EMAIL = 'valentino@dilorenzosoccermindset.com'
