// Registers the service worker (production only) and captures the browser's install prompt.
export default defineNuxtPlugin(() => {
  const base = useRuntimeConfig().app.baseURL
  const deferred = useState<any>('pwa-deferred', () => null)
  const installed = useState('pwa-installed', () => false)

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred.value = e
  })
  window.addEventListener('appinstalled', () => { installed.value = true; deferred.value = null })

  if (!import.meta.dev && 'serviceWorker' in navigator) {
    const register = () => navigator.serviceWorker.register(`${base}sw.js`, { scope: base })
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const urls = performance.getEntriesByType('resource').map(r => r.name).filter(u => u.startsWith(location.origin))
        reg.active?.postMessage({ type: 'cache-urls', urls })
      })
      .catch(() => { /* offline support is optional */ })
    // The SPA usually mounts after `load` has already fired, so don't rely on the event alone.
    if (document.readyState === 'complete') register(); else window.addEventListener('load', register, { once: true })
  }
})
