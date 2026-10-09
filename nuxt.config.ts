const base = process.env.NUXT_APP_BASE_URL || '/'
// `DEV_AUTH_BYPASS=1 nuxt dev` runs the app without Clerk keys for local work. It is ignored in production builds.
// Canonical origin used for absolute URLs (canonical links, sitemap, social cards). Set NUXT_PUBLIC_SITE_URL once you have a custom domain.
const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://budget-now-psi.vercel.app')).replace(/\/$/, '')
const devAuth = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === '1'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  // Public pages (landing, legal, guides) are rendered ahead of time as static HTML so search engines and AI crawlers can read them.
  // Everything behind login is client-only (ssr: false) and kept out of search results.
  ssr: true,
  css: ['@fontsource-variable/inter'],
  modules: devAuth ? [] : ['@clerk/nuxt'],
  clerk: { signInUrl: '/sign-in', signUpUrl: '/sign-up', signInFallbackRedirectUrl: '/home', signUpFallbackRedirectUrl: '/home' },
  runtimeConfig: { public: { devAuth, siteUrl } },
  routeRules: {
    '/': { prerender: true },
    '/privacy': { prerender: true },
    '/terms': { prerender: true },
    '/guides/**': { prerender: true },
    ...Object.fromEntries(['/home', '/activity', '/analytics', '/goals', '/bills', '/debts', '/settings', '/sign-in/**', '/sign-up/**']
      .map(r => [r, { ssr: false, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }])),
    '/api/**': { headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'private, no-store' } },
    '/**': { headers: {
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    } },
  },
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    baseURL: base,
    head: {
      htmlAttrs: { lang: 'en' },
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
      ],
    },
  },
  devtools: { enabled: false },
})
