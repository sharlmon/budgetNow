import { readFileSync } from 'node:fs'
import { buildCsp, clerkHostFromKey } from './shared/security'
import { THEME_BOOT_SCRIPT } from './app/utils/theme'
import { ENTRY_BOOT_SCRIPT } from './app/utils/entry'

const base = process.env.NUXT_APP_BASE_URL || '/'
// The version people see (package.json) and the exact build, so a redeploy is noticed even without a version bump.
const appVersion: string = JSON.parse(readFileSync('./package.json', 'utf8')).version
const buildId = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || new Date().toISOString().slice(0, 16).replace(/\D/g, '')
// `DEV_AUTH_BYPASS=1 nuxt dev` runs the app without Clerk keys for local work. It is ignored in production builds.
// Canonical origin used for absolute URLs (canonical links, sitemap, social cards). Set NUXT_PUBLIC_SITE_URL once you have a custom domain.
const siteUrl = (process.env.NUXT_PUBLIC_SITE_URL
  || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://budget-now-psi.vercel.app')).replace(/\/$/, '')
const isProd = process.env.NODE_ENV === 'production'
// A strict CSP would break `nuxt dev` (hot reload uses inline scripts and websockets), so it is applied to builds only.
// Start connecting to Clerk's servers as soon as the page loads, instead of when its script asks for them.
const clerkHost = clerkHostFromKey(process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
const csp = isProd ? { 'Content-Security-Policy': buildCsp(clerkHostFromKey(process.env.NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY)) } : {}
const devAuth = process.env.NODE_ENV !== 'production' && process.env.DEV_AUTH_BYPASS === '1'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  // Public pages (landing, legal, guides) are rendered ahead of time as static HTML so search engines and AI crawlers can read them.
  // Everything behind login is client-only (ssr: false) and kept out of search results.
  ssr: true,
  // Test output and test files must never make the dev server reload (browser tests write traces here while the server runs).
  ignore: ['**/test-results/**', '**/playwright-report/**', 'tests/**'],
  css: ['@fontsource-variable/inter'],
  modules: devAuth ? [] : ['@clerk/nuxt'],
  clerk: { signInUrl: '/sign-in', signUpUrl: '/sign-up', signInFallbackRedirectUrl: '/home', signUpFallbackRedirectUrl: '/home' },
  runtimeConfig: { public: { devAuth, siteUrl, appVersion, buildId, updateCheckDelayMs: Number(process.env.NUXT_PUBLIC_UPDATE_CHECK_DELAY_MS) || 20_000 } },
  routeRules: {
    '/': { prerender: true },
    '/privacy': { prerender: true },
    '/terms': { prerender: true },
    '/guides/**': { prerender: true },
    ...Object.fromEntries(['/home', '/activity', '/analytics', '/goals', '/bills', '/debts', '/accounts', '/settings', '/sign-in/**', '/sign-up/**']
      .map(r => [r, { ssr: false, headers: { 'X-Robots-Tag': 'noindex, nofollow' } }])),
    '/api/**': { headers: { 'X-Robots-Tag': 'noindex', 'Cache-Control': 'private, no-store' } },
    '/**': { headers: {
      ...csp,
      'Strict-Transport-Security': 'max-age=63072000; includeSubDomains',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-Frame-Options': 'SAMEORIGIN',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    } },
  },
  // Shown from the very first byte while the app loads on the private (client-rendered) screens.
  spaLoadingTemplate: true,
  app: {
    pageTransition: { name: 'page', mode: 'out-in' },
    baseURL: base,
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'Weka',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'theme-color', content: '#ef6a3a' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'Weka' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
      script: [{ innerHTML: THEME_BOOT_SCRIPT, tagPosition: 'head' }, { innerHTML: ENTRY_BOOT_SCRIPT, tagPosition: 'head' }],
      link: [
        { rel: 'manifest', href: `${base}manifest.webmanifest` },
        ...(clerkHost ? [{ rel: 'preconnect', href: `https://${clerkHost}`, crossorigin: '' as const }] : []),
        // Browser tab icon: a circle (SVG scales crisply; PNGs are the fallback). The home-screen icons below stay square, because phones round those themselves.
        { rel: 'icon', type: 'image/svg+xml', href: `${base}icons/favicon.svg` },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${base}icons/favicon-32.png` },
        { rel: 'icon', type: 'image/x-icon', sizes: '48x48', href: `${base}favicon.ico` },
        { rel: 'apple-touch-icon', href: `${base}icons/icon-180.png` },
      ],
    },
  },
  devtools: { enabled: false },
})
