import { PUBLIC_PAGES, SITE } from './site'

const clean = (u: string) => u.replace(/\/$/, '')

/** Crawl rules: public pages open (including AI answer engines), private screens and the API closed. */
export function buildRobots(siteUrl: string): string {
  const base = clean(siteUrl)
  const disallow = ['/api/', '/home', '/activity', '/analytics', '/goals', '/bills', '/debts', '/plan', '/accounts', '/settings', '/sign-in', '/sign-up']
  const bots = ['*', 'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-User', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended']
  return [
    ...bots.flatMap(b => [`User-agent: ${b}`, 'Allow: /', ...disallow.map(d => `Disallow: ${d}`), '']),
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n')
}

export function buildSitemap(siteUrl: string, lastmod: string): string {
  const base = clean(siteUrl)
  const urls = PUBLIC_PAGES.map(p => `  <url>\n    <loc>${base}${p.path === '/' ? '/' : p.path}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${p.changefreq}</changefreq>\n    <priority>${p.priority}</priority>\n  </url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}

/** llms.txt: a short, plain-language map of the site for AI assistants. */
export function buildLlmsTxt(siteUrl: string, faqs: { q: string; a: string }[]): string {
  const base = clean(siteUrl)
  return [
    `# ${SITE.name}`,
    '',
    `> ${SITE.description}`,
    '',
    `${SITE.name} is made by ${SITE.maker} (${SITE.makerUrl}). It does not connect to bank or mobile money accounts: users enter income, expenses and account balances themselves. Budget data is private to each signed-in account.`,
    '',
    '## Pages',
    ...PUBLIC_PAGES.map(p => `- [${p.title}](${base}${p.path === '/' ? '/' : p.path})`),
    '',
    '## Frequently asked questions',
    ...faqs.flatMap(f => [`### ${f.q}`, f.a, '']),
    '## Private areas (not indexable)',
    '- The signed-in app (dashboard, activity, analytics, goals, bills, debts, settings) requires an account and contains personal financial data.',
    '',
  ].join('\n')
}
