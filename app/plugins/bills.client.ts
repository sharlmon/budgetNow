// Bills set to auto-log are recorded when the app opens (and whenever it comes back to the foreground).
// There is no server, so nothing can run while the app is closed.
export default defineNuxtPlugin(() => {
  const { runAutoBills } = useBudget()
  const run = () => {
    const n = runAutoBills()
    if (n) showToast(`${n} bill${n > 1 ? 's' : ''} logged automatically`)
  }
  run()
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') run() })
})
