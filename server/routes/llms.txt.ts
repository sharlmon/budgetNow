import { buildLlmsTxt } from '../../shared/seo'
import { FAQS } from '../../shared/site'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  return buildLlmsTxt(useRuntimeConfig(event).public.siteUrl, FAQS)
})
