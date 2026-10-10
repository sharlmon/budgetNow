import { DEFAULT_REMINDER, type ReminderDetail } from '#shared/reminders'
import { API_MARKER } from '#shared/security'
import { isAppleMobile, urlBase64ToBytes } from '../utils/push'

/** What this device can do about bill reminders right now. */
export type ReminderState =
  | 'checking'
  | 'needs-install' // iPhone or iPad, and Weka is not on the Home Screen yet
  | 'unsupported' // this browser cannot show push notifications
  | 'unavailable' // the app is not ready for it (server not set up, or no service worker)
  | 'denied' // the person blocked notifications for Weka
  | 'off'
  | 'on'

const HINT = 'bn:reminders' // what this device last knew, so Settings can show a summary without waiting for the browser
export const reminderState = ref<ReminderState>('checking')
export const reminderPrefs = ref<{ daysBefore: number; detail: ReminderDetail }>({ ...DEFAULT_REMINDER })

const headers = { [API_MARKER.name]: API_MARKER.value }
const post = <T>(url: string, body: unknown) => $fetch<T>(url, { method: 'POST', headers, body })

/** Cheap, synchronous facts about this browser. */
export function reminderSupport() {
  if (!import.meta.client) return { supported: false, appleNeedsInstall: false }
  const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
  const apple = isAppleMobile(navigator.userAgent, navigator.maxTouchPoints)
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  return { supported, appleNeedsInstall: apple && !standalone }
}

/** What a previous visit saved: used for the one-line summary in Settings and to decide whether to suggest reminders. */
export function reminderHint(): { on: boolean; daysBefore: number } | null {
  try { const v = JSON.parse(localStorage.getItem(HINT) ?? 'null'); return v && typeof v.on === 'boolean' ? { on: v.on, daysBefore: Number(v.daysBefore) || 0 } : null } catch { return null }
}
const saveHint = () => { try { localStorage.setItem(HINT, JSON.stringify({ on: reminderState.value === 'on', daysBefore: reminderPrefs.value.daysBefore })) } catch { /* it just will not be remembered */ } }

export function useReminders() {
  const configured = computed(() => !!useRuntimeConfig().public.vapidPublicKey)

  /** The service worker registration, waiting a few seconds for it on a first visit. */
  async function registration(): Promise<ServiceWorkerRegistration | null> {
    const existing = await navigator.serviceWorker.getRegistration()
    if (existing) return existing
    return Promise.race([navigator.serviceWorker.ready, new Promise<null>(r => setTimeout(() => r(null), 4000))])
  }

  const body = (sub: PushSubscription) => {
    const j = sub.toJSON()
    return { endpoint: sub.endpoint, keys: { p256dh: j.keys?.p256dh ?? '', auth: j.keys?.auth ?? '' }, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, daysBefore: reminderPrefs.value.daysBefore, detail: reminderPrefs.value.detail }
  }

  /** Works out the state from the browser and the server, and heals the case where only one of them remembers this device. */
  async function refresh() {
    const { supported, appleNeedsInstall } = reminderSupport()
    if (appleNeedsInstall) { reminderState.value = 'needs-install'; return }
    if (!supported) { reminderState.value = 'unsupported'; return }
    if (!configured.value) { reminderState.value = 'unavailable'; return }
    if (Notification.permission === 'denied') { reminderState.value = 'denied'; saveHint(); return }
    const reg = await registration()
    if (!reg) { reminderState.value = 'unavailable'; return }
    const sub = await reg.pushManager.getSubscription()
    if (!sub) { reminderState.value = 'off'; saveHint(); return }
    try {
      const saved = await $fetch<{ daysBefore: number; detail: ReminderDetail }>('/api/push/subscription', { query: { endpoint: sub.endpoint } })
      reminderPrefs.value = { daysBefore: saved.daysBefore, detail: saved.detail }
    } catch (e: any) {
      if (e?.statusCode === 404 || e?.status === 404) { try { await post('/api/push/subscribe', body(sub)) } catch { /* try again next visit */ } }
      // any other error (for example offline): keep going with what this device last knew
    }
    reminderState.value = 'on'
    saveHint()
  }

  /** Asks for permission, subscribes this device and tells the server. Returns a message when it could not. */
  async function enable(): Promise<string | null> {
    try {
      if (Notification.permission !== 'granted') {
        const answer = await Notification.requestPermission()
        if (answer !== 'granted') { reminderState.value = answer === 'denied' ? 'denied' : 'off'; saveHint(); return answer === 'denied' ? null : 'Reminders need your permission to show notifications.' }
      }
      const reg = await registration()
      if (!reg) return "Weka isn't ready for reminders yet. Reload the app and try again."
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToBytes(String(useRuntimeConfig().public.vapidPublicKey)) })
      try { await post('/api/push/subscribe', body(sub)) } catch (e: any) {
        await sub.unsubscribe().catch(() => {})
        return e?.data?.statusMessage || e?.statusMessage || "Couldn't turn reminders on. Check your connection and try again."
      }
      reminderState.value = 'on'; saveHint()
      return null
    } catch { return "Couldn't turn reminders on in this browser." }
  }

  async function disable(): Promise<string | null> {
    try {
      const reg = await registration()
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        try { await post('/api/push/unsubscribe', { endpoint: sub.endpoint }) } catch { /* the server will drop the address when the browser says it is gone */ }
        await sub.unsubscribe()
      }
      reminderState.value = 'off'; saveHint()
      return null
    } catch { return "Couldn't turn reminders off. Try again." }
  }

  /** Saves new choices for this device. */
  async function savePrefs(next: Partial<{ daysBefore: number; detail: ReminderDetail }>): Promise<string | null> {
    const before = { ...reminderPrefs.value }
    reminderPrefs.value = { ...before, ...next }
    try {
      const sub = await (await registration())?.pushManager.getSubscription()
      if (!sub) throw new Error('no subscription')
      await post('/api/push/subscribe', body(sub))
      saveHint()
      return null
    } catch { reminderPrefs.value = before; return "Couldn't save that. Check your connection and try again." }
  }

  async function sendTest(): Promise<string> {
    try {
      const r = await post<{ sent: number; removed: number; failed: number }>('/api/push/test', {})
      return r.sent > 0 ? 'Sent. It should arrive in a few seconds.' : r.removed > 0 ? 'This device was no longer registered. Turn reminders off and on again.' : "The test couldn't be delivered. Try again in a minute."
    } catch (e: any) { return e?.data?.statusMessage || e?.statusMessage || "Couldn't send a test. Check your connection and try again." }
  }

  return { configured, refresh, enable, disable, savePrefs, sendTest }
}
