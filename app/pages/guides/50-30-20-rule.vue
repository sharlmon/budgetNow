<template>
  <article class="prose">
    <nav aria-label="Breadcrumb" class="crumbs"><NuxtLink to="/">BudgetNow</NuxtLink> / Guides / 50/30/20 rule</nav>
    <h1>The 50/30/20 budget rule explained</h1>
    <p class="meta">By {{ SITE.maker }} · Updated {{ updated }}</p>

    <p class="answer"><strong>The 50/30/20 rule is a simple budgeting guideline: spend about 50% of your after-tax income on needs, 30% on wants, and use the remaining 20% for savings and debt repayment.</strong> It was popularised by Senator Elizabeth Warren and Amelia Warren Tyagi in their book <em>All Your Worth</em> (2005).</p>

    <h2>The three buckets</h2>
    <table>
      <thead><tr><th>Bucket</th><th>Share</th><th>What goes in it</th></tr></thead>
      <tbody>
        <tr><td>Needs</td><td>50%</td><td>Rent or mortgage, groceries, utilities, transport to work, insurance, minimum debt payments</td></tr>
        <tr><td>Wants</td><td>30%</td><td>Eating out, entertainment, subscriptions, hobbies, shopping you could live without</td></tr>
        <tr><td>Savings and debt</td><td>20%</td><td>Emergency fund, goals, investments, and paying debt down faster than the minimum</td></tr>
      </tbody>
    </table>
    <p>Use your <strong>after-tax</strong> income, meaning what actually lands in your account.</p>

    <h2>Try it with your own pay</h2>
    <div class="calc card">
      <div class="row2">
        <label>Monthly income<input v-model.number="income" type="number" min="0" inputmode="decimal" class="field" aria-label="Monthly after-tax income" /></label>
        <label>Currency<select v-model="cur" class="field"><option v-for="c in SITE.currencies" :key="c" :value="c">{{ c }}</option></select></label>
      </div>
      <div class="out">
        <div v-for="r in rows" :key="r.n" class="o"><span class="sw" :style="{ background: r.c }" /><span class="on">{{ r.n }} <small>{{ r.p }}%</small></span><strong>{{ fmt(income * r.p / 100) }}</strong></div>
      </div>
      <p class="muted sm" style="margin:12px 0 0">Want this applied to every pay automatically? <NuxtLink to="/sign-up">BudgetNow does it for you</NuxtLink>.</p>
    </div>

    <h2>Example: a {{ fmtKes(100000) }} monthly income</h2>
    <p>With {{ fmtKes(100000) }} after tax, the rule gives you {{ fmtKes(50000) }} for needs, {{ fmtKes(30000) }} for wants, and {{ fmtKes(20000) }} for savings and debt.</p>

    <h2>How to apply it in four steps</h2>
    <ol>
      <li><strong>Find your take-home pay</strong> for a typical month.</li>
      <li><strong>List your fixed needs</strong> first. If they already come to more than 50%, you are in the next section.</li>
      <li><strong>Set aside the 20% first</strong> when you are paid, so saving does not depend on what is left.</li>
      <li><strong>Spend the 30% freely</strong>, and stop when it runs out.</li>
    </ol>

    <h2>When the rule does not fit</h2>
    <p>The percentages are a starting point, not a law. Adjust them when:</p>
    <ul>
      <li><strong>Rent is high or income is low.</strong> Needs may be 60% or 70%. Try 60/20/20 or 70/20/10 and keep saving something.</li>
      <li><strong>You are paying off expensive debt.</strong> Try 50/20/30 and send the larger share to the debt with the highest interest.</li>
      <li><strong>Your income is high.</strong> Your needs are likely well under 50%, so move the difference to savings rather than wants.</li>
      <li><strong>Your income is irregular.</strong> Base it on your lowest typical month, and split any extra when it arrives.</li>
    </ul>

    <h2>How BudgetNow uses the rule</h2>
    <p>When you enter a pay, BudgetNow first reserves the minimum payments on your debts, then divides what is left 50/30/20. You can drag any slider or type an amount, and the other categories rebalance so the total always matches. Nothing is saved until you confirm.</p>

    <h2>Common questions</h2>
    <details v-for="f in faqs" :key="f.q"><summary>{{ f.q }}</summary><p>{{ f.a }}</p></details>

    <div class="cta card"><h2 style="margin:0 0 6px">Split your next pay in under a minute</h2><p style="margin:0 0 14px">Free, no bank login, works offline.</p><NuxtLink to="/sign-up" class="btn" style="text-decoration:none;display:inline-flex;width:auto;padding:14px 24px">Get started free</NuxtLink></div>
  </article>
</template>

<script setup lang="ts">
import { SITE } from '#shared/site'
import { formatMoney } from '../../utils/money'

definePageMeta({ layout: 'public' })

const updated = '9 October 2026'
const faqs = [
  { q: 'Is the 50/30/20 rule based on gross or net income?', a: 'Net income, the money you actually receive after tax and deductions. Using gross income would overstate what you can spend.' },
  { q: 'Where do debt payments go in the 50/30/20 rule?', a: 'Minimum payments are a need, so they sit in the 50%. Any extra you pay beyond the minimum counts towards the 20% for savings and debt repayment.' },
  { q: 'What if my needs are more than 50% of my income?', a: 'Adjust the split, for example 60/20/20 or 70/20/10. The goal is to keep wants in check and still save something every month, even if it is less than 20%.' },
]

const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
const url = `${site}/guides/50-30-20-rule`
useSeo({
  title: 'The 50/30/20 budget rule explained (with a calculator) | BudgetNow',
  description: 'The 50/30/20 rule: 50% of after-tax income to needs, 30% to wants, 20% to savings and debt. See examples, a free calculator, and when to change the percentages.',
  path: '/guides/50-30-20-rule',
  type: 'article',
  jsonLd: [
    ...siteGraph(site),
    { '@context': 'https://schema.org', '@type': 'Article', headline: 'The 50/30/20 budget rule explained', description: 'How the 50/30/20 budgeting rule works, with examples and a calculator.',
      author: { '@id': `${site}/#maker` }, publisher: { '@id': `${site}/#maker` }, datePublished: '2026-10-09', dateModified: '2026-10-09', mainEntityOfPage: url, image: `${site}/og.png`, inLanguage: 'en' },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BudgetNow', item: `${site}/` }, { '@type': 'ListItem', position: 2, name: 'The 50/30/20 rule', item: url } ] },
  ],
})

const income = ref(100000)
const cur = ref('KES')
const rows = [{ n: 'Needs', p: 50, c: '#ef6a3a' }, { n: 'Wants', p: 30, c: '#f5c242' }, { n: 'Savings and debt', p: 20, c: '#2fb67c' }]
const fmt = (n: number) => formatMoney(Math.round(Number.isFinite(n) ? n : 0), cur.value)
const fmtKes = (n: number) => formatMoney(n, 'KES')
</script>

<style scoped>
.crumbs { font-size:.85rem; color:var(--muted); margin-bottom:14px; } .crumbs a { color:var(--muted); font-weight:500; }
.answer { font-size:1.1rem; background:var(--card); border:1px solid var(--line); border-radius:18px; padding:16px 18px; }
.calc { padding:18px; }
.row2 { display:grid; grid-template-columns:2fr 1fr; gap:12px; } .row2 label { font-size:.85rem; color:var(--muted); display:flex; flex-direction:column; gap:6px; }
.out { margin-top:14px; display:grid; gap:2px; }
.o { display:flex; align-items:center; gap:10px; padding:10px 0; border-top:1px solid var(--line); }
.sw { width:10px; height:10px; border-radius:4px; } .on { flex:1; } .on small { color:var(--muted); margin-left:4px; }
details { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:0 16px; margin-bottom:10px; }
summary { cursor:pointer; padding:14px 0; font-weight:600; } details p { margin:0 0 14px; }
.cta { margin:40px 0 0; text-align:center; background:linear-gradient(95deg,var(--tint-accent-soft),var(--tint-accent-soft)); border-color:var(--tint-accent-line); padding:26px 20px; }
</style>
