import { buildSitemap } from '../../shared/seo'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'application/xml; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  return buildSitemap(useRuntimeConfig(event).public.siteUrl, new Date().toISOString().slice(0, 10))
})
