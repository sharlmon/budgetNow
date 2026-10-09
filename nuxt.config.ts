export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  ssr: false, // data lives in the browser (localStorage), so ship as a static SPA
  app: {
    baseURL: process.env.NUXT_APP_BASE_URL || '/',
    head: {
      title: 'BudgetNow',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },
  devtools: { enabled: false },
})
