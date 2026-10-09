const base = process.env.NUXT_APP_BASE_URL || '/'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  ssr: false, // data lives in the browser (localStorage), so ship as a static SPA
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    baseURL: base,
    head: {
      title: 'BudgetNow',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#ef6a3a' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'BudgetNow' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      link: [
        { rel: 'manifest', href: `${base}manifest.webmanifest` },
        { rel: 'icon', type: 'image/png', href: `${base}icons/icon-192.png` },
        { rel: 'apple-touch-icon', href: `${base}icons/icon-180.png` },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap' },
      ],
    },
  },
  devtools: { enabled: false },
})
