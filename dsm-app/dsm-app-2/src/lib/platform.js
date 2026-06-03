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

// Legal docs are self-hosted as static pages in /public, so they ship with
// the app and need no external domain. Same-origin relative paths work on
// web and in the Capacitor webview.
export const PRIVACY_URL = '/privacy.html'
export const TERMS_URL   = '/terms.html'
export const SUPPORT_EMAIL = 'valentino@dilorenzosoccermindset.com'
