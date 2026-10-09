import { SITE } from '#shared/site'

interface SeoOptions {
  title: string
  description: string
  /** Path starting with "/", e.g. "/privacy" */
  path: string
  type?: 'website' | 'article'
  jsonLd?: Record<string, unknown>[]
}

/** Title, description, canonical URL, social cards and structured data for a public page. */
export function useSeo(o: SeoOptions) {
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const url = site + o.path
  const image = `${site}/og.png`
  useSeoMeta({
    title: o.title,
    description: o.description,
    robots: 'index, follow, max-image-preview:large',
    ogTitle: o.title, ogDescription: o.description, ogType: o.type ?? 'website', ogUrl: url,
    ogImage: image, ogImageWidth: 1200, ogImageHeight: 630, ogImageAlt: 'BudgetNow: split every pay in seconds', ogSiteName: SITE.name, ogLocale: 'en_US',
    twitterCard: 'summary_large_image', twitterTitle: o.title, twitterDescription: o.description, twitterImage: image,
  })
  useHead({
    link: [{ rel: 'canonical', href: url }],
    script: (o.jsonLd ?? []).map(j => ({ type: 'application/ld+json', innerHTML: JSON.stringify(j).replace(/</g, '\\u003c') })),
  })
}

/** Entities shared by every page, so search and answer engines connect BudgetNow with its maker. */
export function siteGraph(siteUrl: string) {
  const site = siteUrl.replace(/\/$/, '')
  return [
    { '@context': 'https://schema.org', '@type': 'Organization', '@id': `${site}/#maker`, name: SITE.maker, url: SITE.makerUrl },
    { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${site}/#website`, name: SITE.name, url: `${site}/`, publisher: { '@id': `${site}/#maker` }, inLanguage: 'en' },
  ]
}
