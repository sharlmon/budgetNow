<template>
  <div>
    <section class="hero">
      <div class="wrap grid">
        <div class="copy">
          <p class="eyebrow">Free money app for Kenya</p>
          <h1>Bills on autopilot. Know what's safe to spend.</h1>
          <p class="lead">Add your bills once and Weka keeps track of what is due. Then enter your pay and it instantly divides it into <strong>Needs, Wants, Savings and Debt</strong>, so you always know what is left after the bills.</p>
          <div class="actions">
            <NuxtLink to="/sign-up" class="btn">Get started free</NuxtLink>
            <NuxtLink to="/#how" class="btn soft">See how it works</NuxtLink>
          </div>
          <p class="fine">No bank login needed · Works offline · Installs like an app</p>
        </div>
        <div class="visual" aria-hidden="true">
          <div class="phone">
            <div class="ph-top">
              <small>Safe to spend today</small>
              <div class="ph-amt">KSh 1,850</div>
              <small>of KSh 2,000 a day · 14 days left</small>
            </div>
            <div class="ph-row" v-for="r in demo" :key="r.n">
              <span class="dot" :style="{ background: r.c }" />
              <div class="grow"><b>{{ r.n }}</b><div class="bar"><i :style="{ width: r.p + '%', background: r.c }" /></div></div>
              <span class="ph-v">{{ r.v }}</span>
            </div>
            <p class="ph-note">Example for illustration</p>
          </div>
        </div>
      </div>
    </section>

    <section class="wrap answer" aria-labelledby="what">
      <h2 id="what">What is Weka?</h2>
      <p>Weka (Swahili for "put aside") is a free money app for Kenya. It tracks your recurring bills and logs them on their due dates, splits each pay into Needs, Wants, Savings and Debt, and shows how much is safe to spend today. It works offline and never asks for your bank login.</p>
    </section>

    <section class="wrap" aria-labelledby="features">
      <h2 id="features" class="sh">Everything you need to stay on top of your money</h2>
      <div class="cards">
        <article v-for="f in features" :key="f.t" class="fc">
          <span class="fi"><Icon :name="f.i" :size="22" /></span>
          <h3>{{ f.t }}</h3>
          <p>{{ f.d }}</p>
        </article>
      </div>
    </section>

    <section id="how" class="wrap" aria-labelledby="how-h">
      <h2 id="how-h" class="sh">How it works</h2>
      <ol class="steps">
        <li><span class="n">1</span><div><h3>Add your bills and your pay</h3><p>Save your recurring bills once, then type in your salary or any money that came in, using a simple keypad.</p></div></li>
        <li><span class="n">2</span><div><h3>See the instant split</h3><p>Debt minimums come first, then 50% Needs, 30% Wants and 20% Savings of the rest. Drag any slider to change it. The others rebalance for you.</p></div></li>
        <li><span class="n">3</span><div><h3>Confirm and track</h3><p>Log expenses, pay debts and bills, and add to goals. The home screen shows what is left and what is safe to spend today.</p></div></li>
      </ol>
    </section>

    <section id="faq" class="wrap faq" aria-labelledby="faq-h">
      <h2 id="faq-h" class="sh">Frequently asked questions</h2>
      <details v-for="(f, i) in FAQS" :key="f.q" :open="i === 0">
        <summary>{{ f.q }}</summary>
        <p>{{ f.a }}</p>
      </details>
      <p class="more">New to budgeting? Read <NuxtLink to="/guides/50-30-20-rule">the 50/30/20 rule explained</NuxtLink>.</p>
    </section>

    <section class="wrap">
      <div class="final">
        <h2>Ready to know where your money goes?</h2>
        <p>Create a free account and split your next pay in under a minute.</p>
        <NuxtLink to="/sign-up" class="btn light">Get started free</NuxtLink>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { FAQS, SITE } from '#shared/site'

definePageMeta({ layout: 'public' })

const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
useSeo({
  title: 'Weka: bills on autopilot and a budget that splits your pay',
  description: 'Weka is a free money app for Kenya. Track recurring bills and log them on their due dates, split every pay into Needs, Wants, Savings and Debt, and see what is safe to spend today. Works offline.',
  path: '/',
  jsonLd: [
    ...siteGraph(site),
    {
      '@context': 'https://schema.org', '@type': 'WebApplication', '@id': `${site}/#app`, name: SITE.name, url: `${site}/`,
      description: SITE.description, applicationCategory: 'FinanceApplication', operatingSystem: 'Any (web browser, installable)',
      browserRequirements: 'Requires JavaScript', inLanguage: 'en', isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'KES' },
      creator: { '@id': `${site}/#maker` }, publisher: { '@id': `${site}/#maker` },
      featureList: ['Recurring bills tracked and logged on their due dates', 'All your accounts in one wallet', 'Instant income split into Needs, Wants, Savings and Debt', 'Safe to spend today', 'Debt tracking', 'Savings goals', 'Recurring bills', 'Offline use', 'Backup and restore'],
    },
    { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) },
  ],
})

const demo = [
  { n: 'Needs', c: '#ef6a3a', p: 62, v: 'KSh 57,500' },
  { n: 'Wants', c: '#f5c242', p: 38, v: 'KSh 21,000' },
  { n: 'Savings', c: '#2fb67c', p: 20, v: 'KSh 16,000' },
  { n: 'Debt', c: '#5b8def', p: 100, v: 'KSh 8,000' },
]
const features = [
  { i: 'bill', t: 'Bills on autopilot', d: 'Add rent, subscriptions and loan payments once. Weka tracks what is due, lets you mark one paid with a tap, and can log each bill automatically on its due date.' },
  { i: 'wallet', t: 'Instant income split', d: 'Your pay is divided into Needs, Wants, Savings and Debt the moment you enter it, with sliders to adjust before you confirm.' },
  { i: 'wallet', t: 'All your accounts in one wallet', d: 'Add M-Pesa, your bank, PayPal, cash and investments, see the total at a glance, and record money moving between them.' },
  { i: 'shield', t: 'Safe to spend today', d: 'One daily number worked out from what is left in your budget and the bills still due this month.' },
  { i: 'card', t: 'Debt tracking', d: 'Add what you owe, reserve the minimum from every pay, record payments and watch the balance fall.' },
  { i: 'target', t: 'Savings goals', d: 'Set a target and a date, assign savings to it, and see how much to put aside each month.' },
  { i: 'phone', t: 'Works offline, installs like an app', d: 'Add it to your home screen. Keep logging with no connection and it syncs when you are back online.' },
]
</script>

<style scoped>
.hero { background:linear-gradient(180deg,var(--tint-accent-soft) 0%, var(--bg) 100%); padding:40px 0 24px; overflow:hidden; }
.grid { display:grid; gap:36px; align-items:center; }
.eyebrow { display:inline-block; margin:0 0 14px; padding:5px 12px; border-radius:99px; background:var(--surface); border:1px solid var(--tint-accent-line); color:var(--accent); font-weight:600; font-size:.8rem; }
h1 { font-size:clamp(2.1rem,7vw,3.6rem); line-height:1.05; letter-spacing:-.04em; margin:0 0 18px; }
.lead { font-size:1.08rem; line-height:1.65; color:var(--ink2); margin:0 0 24px; max-width:56ch; }
.actions { display:flex; gap:12px; flex-wrap:wrap; }
.actions .btn { width:auto; padding:15px 24px; text-decoration:none; }
.fine { margin:16px 0 0; color:var(--muted); font-size:.85rem; }
.visual { display:flex; justify-content:center; }
.phone { width:min(310px,100%); background:var(--surface); border:1px solid var(--line); border-radius:34px; padding:18px; box-shadow:0 40px 70px -30px rgba(239,106,58,.45), 0 8px 24px -12px rgba(20,20,40,.18); transform:rotate(2deg); }
.ph-top { background:var(--grad); color:#fff; border-radius:22px; padding:18px; margin-bottom:14px; }
.ph-top small { opacity:.9; display:block; }
.ph-amt { font-size:2.3rem; font-weight:700; letter-spacing:-.03em; line-height:1.15; }
.ph-row { display:flex; align-items:center; gap:10px; padding:9px 4px; font-size:.9rem; }
.dot { width:10px; height:10px; border-radius:4px; flex:none; }
.grow { flex:1; } .grow b { display:block; margin-bottom:5px; font-weight:600; }
.bar { height:6px; background:var(--track); border-radius:99px; overflow:hidden; } .bar i { display:block; height:100%; border-radius:99px; }
.ph-v { font-weight:600; font-variant-numeric:tabular-nums; }
.ph-note { margin:8px 0 0; text-align:center; font-size:.7rem; color:var(--muted); }
.answer { margin-top:48px; }
.answer h2 { font-size:1.4rem; margin:0 0 8px; letter-spacing:-.02em; }
.answer p { font-size:1.12rem; line-height:1.7; color:var(--ink2); max-width:70ch; margin:0; padding:20px 22px; background:var(--card); border:1px solid var(--line); border-radius:20px; }
.sh { font-size:clamp(1.5rem,4vw,2rem); letter-spacing:-.03em; margin:64px 0 22px; }
.cards { display:grid; gap:14px; grid-template-columns:1fr; }
.fc { background:var(--surface); border:1px solid var(--line); border-radius:22px; padding:20px; box-shadow:0 1px 2px rgba(20,20,40,.04); }
.fi { width:44px; height:44px; border-radius:14px; display:grid; place-items:center; background:linear-gradient(145deg,var(--tint-accent),var(--tint-accent2)); color:var(--accent); margin-bottom:12px; }
.fc h3 { margin:0 0 6px; font-size:1.05rem; } .fc p { margin:0; color:var(--ink3); line-height:1.6; font-size:.95rem; }
.steps { list-style:none; padding:0; margin:0; display:grid; gap:14px; counter-reset:s; }
.steps li { display:flex; gap:16px; background:var(--card); border:1px solid var(--line); border-radius:22px; padding:18px 20px; }
.n { width:36px; height:36px; border-radius:50%; background:var(--btn); color:#fff; display:grid; place-items:center; font-weight:700; flex:none; }
.steps h3 { margin:2px 0 4px; font-size:1.05rem; } .steps p { margin:0; color:var(--ink3); line-height:1.6; }
.faq details { background:var(--surface); border:1px solid var(--line); border-radius:18px; margin-bottom:10px; padding:0 18px; }
.faq summary { cursor:pointer; padding:16px 0; font-weight:600; list-style:none; display:flex; justify-content:space-between; gap:12px; }
.faq summary::-webkit-details-marker { display:none; }
.faq summary::after { content:'+'; color:var(--accent); font-size:1.4rem; line-height:1; transition:transform .25s; }
.faq details[open] summary::after { transform:rotate(45deg); }
.faq details p { margin:0 0 16px; color:var(--ink2); line-height:1.7; }
.more { color:var(--muted); } .more a { color:var(--accent); font-weight:600; }
.final { margin-top:64px; background:var(--grad); color:#fff; border-radius:28px; padding:36px 24px; text-align:center; box-shadow:0 24px 50px -24px rgba(239,106,58,.8); }
.final h2 { margin:0 0 8px; font-size:clamp(1.4rem,4vw,2rem); letter-spacing:-.03em; } .final p { margin:0 0 20px; opacity:.92; }
.btn.light { background:var(--surface); color:var(--accent); width:auto; display:inline-flex; padding:15px 26px; text-decoration:none; box-shadow:0 10px 24px -10px rgba(0,0,0,.35); }
@media (min-width:820px) { .grid { grid-template-columns:1.15fr .85fr; } .hero { padding:64px 0 40px; } .cards { grid-template-columns:repeat(3,1fr); } .steps { grid-template-columns:repeat(3,1fr); } .steps li { flex-direction:column; } }
</style>
