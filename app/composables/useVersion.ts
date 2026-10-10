import { compareVersions } from '#shared/releases'

export const updateAvailable = ref<{ version: string; build: string; sameVersion: boolean } | null>(null)
const DISMISSED = 'bn:update-dismissed'
const LAST_VERSION = 'bn:last-version'
let lastCheck = 0

/**
 * Knows which version is running (baked in at build time) and asks the server which one is deployed now.
 * A different build means a newer deployment, even when the version number was not bumped.
 */
export function useVersion() {
  const cfg = useRuntimeConfig()
  const baseURL = cfg.app.baseURL
  const current = { version: String(cfg.public.appVersion), build: String(cfg.public.buildId) }

  /** 'new' = an update exists, 'latest' = you are on it, 'error' = could not tell (offline, server hiccup). */
  async function check(manual = false): Promise<'new' | 'latest' | 'error'> {
    if (!manual && Date.now() - lastCheck < 60_000) return updateAvailable.value ? 'new' : 'latest'
    lastCheck = Date.now()
    try {
      const res = await fetch(`${baseURL}version.json`, { cache: 'no-store' })
      if (!res.ok) return 'error'
      const j = await res.json()
      if (typeof j?.build !== 'string' || typeof j?.version !== 'string') return 'error'
      if (j.build === current.build) { updateAvailable.value = null; return 'latest' }
      const dismissed = sessionStorage.getItem(DISMISSED) // "Later" hides this build until the next visit, unless you ask
      if (manual || dismissed !== j.build) updateAvailable.value = { version: j.version, build: j.build, sameVersion: j.version === current.version }
      return 'new'
    } catch { return 'error' }
  }

  /** Fetches the new files and reloads into them. */
  async function applyUpdate() {
    try { await (await navigator.serviceWorker?.getRegistration())?.update() } catch { /* the reload still fetches the newest page */ }
    // The app opens from a saved copy of its first page, so drop the saved pages first; otherwise this reload could land on the old one.
    try { for (const k of await caches.keys()) await caches.delete(k) } catch { /* no saved pages to drop */ }
    location.reload()
  }

  function dismissUpdate() {
    if (updateAvailable.value) { try { sessionStorage.setItem(DISMISSED, updateAvailable.value.build) } catch { /* ignore */ } }
    updateAvailable.value = null
  }

  /** The first time the app opens after an update, say so once. A first-ever visit stays quiet. */
  function announceIfUpdated(open: () => void) {
    try {
      const last = localStorage.getItem(LAST_VERSION)
      localStorage.setItem(LAST_VERSION, current.version)
      if (last && compareVersions(current.version, last) > 0) setTimeout(() => showToast(`Updated to version ${current.version}`, undefined, { action: { label: "What's new", run: open }, ms: 9000 }), 2500)
    } catch { /* storage unavailable */ }
  }

  return { current, check, applyUpdate, dismissUpdate, announceIfUpdated }
}
