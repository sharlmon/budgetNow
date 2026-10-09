import { THEME_COLORS, THEME_KEY, isThemeChoice, resolveTheme, type ThemeChoice } from '../utils/theme'

export const themeChoice = ref<ThemeChoice>('system')
const systemDark = ref(false)
let started = false

/** The theme currently on screen ('light' or 'dark'). */
export const activeTheme = computed(() => resolveTheme(themeChoice.value, systemDark.value))

function apply() {
  if (!import.meta.client) return
  const root = document.documentElement
  if (themeChoice.value === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', themeChoice.value)
  // Colours the browser draws itself (phone status bar, address bar).
  const meta = document.querySelector('meta[name="theme-color"]:not([media])') ?? document.querySelector('meta[name="theme-color"]')
  meta?.setAttribute('content', THEME_COLORS[activeTheme.value])
}

/** Call once on the client. Reads the saved choice and follows the device setting while the choice is "system". */
export function startTheme() {
  if (!import.meta.client || started) return
  started = true
  try { const saved = localStorage.getItem(THEME_KEY); if (isThemeChoice(saved)) themeChoice.value = saved } catch { /* storage unavailable */ }
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  systemDark.value = mq.matches
  mq.addEventListener('change', (e) => { systemDark.value = e.matches; apply() })
  apply()
}

export function setTheme(choice: ThemeChoice) {
  themeChoice.value = choice
  try { localStorage.setItem(THEME_KEY, choice) } catch { /* ignore */ }
  apply()
}
