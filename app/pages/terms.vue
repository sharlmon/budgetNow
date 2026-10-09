<template>
  <article class="prose">
    <h1>Terms of Service</h1>
    <p class="meta">Last updated {{ SITE.privacyUpdated }}</p>

    <p>These terms apply when you use BudgetNow, a budgeting web app made by <a :href="SITE.makerUrl" target="_blank" rel="noopener">{{ SITE.maker }}</a> ("we", "us"). By creating an account or using the app you agree to them. If you do not agree, please do not use BudgetNow.</p>

    <h2>1. The service</h2>
    <p>BudgetNow helps you plan and track your own money: it splits income across budget categories, and records expenses, debts, goals and bills that you enter. It does not connect to your bank, move money, or hold funds.</p>

    <h2>2. Not financial advice</h2>
    <p class="note">BudgetNow is a tool, not a financial adviser. Suggested splits (such as 50/30/20), the "safe to spend" figure and other calculations are general guidance based on the numbers you enter. They are not personal financial, tax, legal or investment advice. You are responsible for your own financial decisions and for checking that the numbers are right.</p>

    <h2>3. Your account</h2>
    <p>You must be at least 18. Keep your sign-in details secure and tell us if you think someone else has accessed your account. You are responsible for activity under your account. Provide accurate information and do not create accounts for anyone else without permission.</p>

    <h2>4. Acceptable use</h2>
    <p>Do not misuse the service. This includes trying to access other people's data, disrupting or overloading the service, probing for vulnerabilities without permission, using automated tools to scrape or flood it, or using it for unlawful purposes.</p>

    <h2>5. Your data</h2>
    <p>You own the information you put into BudgetNow. You give us permission to store and process it only to run the service for you, as described in our <NuxtLink to="/privacy">Privacy Policy</NuxtLink>. You can export your data, erase it, or delete your account at any time in Settings.</p>

    <h2>6. Our rights</h2>
    <p>The BudgetNow app, its design, code and branding belong to {{ SITE.maker }} and are protected by intellectual property laws. These terms do not give you ownership of them. You may use the app for your own personal budgeting.</p>

    <h2>7. Availability and changes</h2>
    <p>We work to keep BudgetNow available and accurate, but we do not promise it will be uninterrupted or error-free. Features may change, and we may update, suspend or discontinue the service. Because the app keeps a copy on your device and lets you export a backup file, we recommend exporting your data from time to time.</p>

    <h2>8. Disclaimer</h2>
    <p>The service is provided "as is" and "as available", without warranties of any kind, to the extent permitted by law.</p>

    <h2>9. Limit of liability</h2>
    <p>To the extent permitted by law, {{ SITE.maker }} is not liable for indirect or consequential losses, or for loss of data, income or profit arising from your use of BudgetNow, including decisions made using its figures. Nothing in these terms limits liability that cannot be limited by law.</p>

    <h2>10. Ending your use</h2>
    <p>You can stop using BudgetNow and delete your account at any time. We may suspend or end access if these terms are broken or to protect the service or other users.</p>

    <h2>11. Governing law</h2>
    <p>These terms are governed by the laws of Kenya, and the courts of Kenya have jurisdiction, unless consumer protection law where you live says otherwise.</p>

    <h2>12. Changes and contact</h2>
    <p>We may update these terms and will change the date above when we do. Continuing to use BudgetNow after a change means you accept it. Questions? Contact {{ SITE.maker }} at <a :href="SITE.makerUrl" target="_blank" rel="noopener">{{ SITE.makerUrl }}</a>.</p>
  </article>
</template>

<script setup lang="ts">
import { SITE } from '#shared/site'
definePageMeta({ layout: 'public' })
const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
useSeo({
  title: 'Terms of Service | BudgetNow',
  description: 'The terms for using BudgetNow: what the service is, that it is not financial advice, your account and data, acceptable use, and our liability.',
  path: '/terms',
  jsonLd: [...siteGraph(site), { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Terms of Service', url: `${site}/terms`, dateModified: '2026-10-09', isPartOf: { '@id': `${site}/#website` } }],
})
</script>
