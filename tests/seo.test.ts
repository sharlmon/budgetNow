import { describe, expect, it } from 'vitest'
import { buildLlmsTxt, buildRobots, buildSitemap } from '../shared/seo'
import { FAQS, PUBLIC_PAGES, SITE } from '../shared/site'

const base = 'https://example.com/'

describe('robots.txt', () => {
  const txt = buildRobots(base)
  it('allows public pages and AI answer engines', () => {
    expect(txt).toContain('User-agent: *\nAllow: /')
    for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'OAI-SearchBot']) expect(txt).toContain(`User-agent: ${bot}`)
  })
  it('blocks the API and every private screen', () => {
    for (const p of ['/api/', '/home', '/activity', '/analytics', '/goals', '/bills', '/debts', '/settings', '/sign-in', '/sign-up']) expect(txt).toContain(`Disallow: ${p}`)
  })
  it('points at the sitemap with no double slash', () => expect(txt).toContain('Sitemap: https://example.com/sitemap.xml'))
  it('never blocks a page that is in the sitemap', () => {
    for (const page of PUBLIC_PAGES) {
      const blocked = txt.split('\n').filter(l => l.startsWith('Disallow: ')).map(l => l.slice(10)).some(d => page.path !== '/' && page.path.startsWith(d))
      expect(blocked, page.path).toBe(false)
    }
  })
})

describe('sitemap.xml', () => {
  const xml = buildSitemap(base, '2026-10-09')
  it('lists every public page with an absolute URL', () => {
    for (const p of PUBLIC_PAGES) expect(xml).toContain(`<loc>https://example.com${p.path === '/' ? '/' : p.path}</loc>`)
  })
  it('is well-formed and contains no private routes', () => {
    expect(xml.startsWith('<?xml')).toBe(true)
    expect((xml.match(/<url>/g) ?? []).length).toBe(PUBLIC_PAGES.length)
    for (const p of ['/home', '/settings', '/sign-in', '/api']) expect(xml).not.toContain(p)
  })
})

describe('llms.txt and site facts', () => {
  const txt = buildLlmsTxt(base, FAQS)
  it('names the product and its maker with the link', () => {
    expect(txt).toContain('# Weka')
    expect(txt).toContain(`${SITE.maker} (${SITE.makerUrl})`)
  })
  it('includes every FAQ answer verbatim', () => { for (const f of FAQS) { expect(txt).toContain(f.q); expect(txt).toContain(f.a) } })
  it('has unique, non-empty FAQs', () => {
    expect(new Set(FAQS.map(f => f.q)).size).toBe(FAQS.length)
    for (const f of FAQS) { expect(f.q.trim().length).toBeGreaterThan(5); expect(f.a.trim().length).toBeGreaterThan(20) }
  })
  it('links to the maker over https', () => expect(SITE.makerUrl).toBe('https://sharl-tech.co.ke/'))
})
