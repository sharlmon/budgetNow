// Tells people when a newer version of the app has been deployed, and what changed after they update.
export default defineNuxtPlugin(() => {
  const { check, announceIfUpdated } = useVersion()
  const delay = Number(useRuntimeConfig().public.updateCheckDelayMs) || 20_000

  announceIfUpdated(() => navigateTo('/settings#about'))
  // Not at start-up (it should stay fast), then whenever the person comes back to the app, and every 15 minutes while it is open.
  setTimeout(() => check(), delay)
  setInterval(() => check(), 15 * 60_000)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') check() })
  window.addEventListener('online', () => check())
})
