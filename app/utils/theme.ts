// Light / dark theme choice. It is remembered on each device and is not synced: a phone and a laptop can differ.

export type ThemeChoice = 'system' | 'light' | 'dark'
export const THEME_KEY = 'bn:theme'
export const THEME_COLORS = { light: '#ef6a3a', dark: '#0e1015' } as const

export const isThemeChoice = (v: unknown): v is ThemeChoice => v === 'system' || v === 'light' || v === 'dark'

/** What is actually shown: the choice itself, or the device's setting when the choice is "system". */
export const resolveTheme = (choice: ThemeChoice, systemDark: boolean): 'light' | 'dark' =>
  choice === 'system' ? (systemDark ? 'dark' : 'light') : choice

/**
 * Runs in the page <head> before anything is painted, so a dark-theme user never sees a white flash.
 * Only an explicit Light or Dark choice sets the attribute; "system" is left to the CSS media query.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})()`

/** Variables for Clerk's sign-in and sign-up forms, which draw their own colours. */
export function clerkVariables(theme: 'light' | 'dark') {
  return theme === 'dark'
    ? { colorPrimary: '#ef6a3a', colorBackground: '#171a21', colorText: '#f2f3f7', colorTextSecondary: '#8b92a5', colorInputBackground: '#1c2029', colorInputText: '#f2f3f7', colorNeutral: '#f2f3f7', colorDanger: '#ff6b70', borderRadius: '0.9rem', fontFamily: 'Inter Variable, Inter, system-ui, sans-serif' }
    : { colorPrimary: '#ef6a3a', colorBackground: '#ffffff', colorText: '#16171c', colorTextSecondary: '#8a8d9a', colorInputBackground: '#ffffff', colorInputText: '#16171c', colorNeutral: '#16171c', colorDanger: '#e5484d', borderRadius: '0.9rem', fontFamily: 'Inter Variable, Inter, system-ui, sans-serif' }
}
