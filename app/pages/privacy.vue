<template>
  <article class="prose">
    <h1>Privacy Policy</h1>
    <p class="meta">Last updated {{ SITE.privacyUpdated }}</p>

    <p>This policy explains what personal information Weka collects, why, who handles it, and the choices you have. We have written it in plain language, and we only describe things the app actually does.</p>

    <h2>1. Who we are</h2>
    <p>Weka is a budgeting web app made and operated by <a :href="SITE.makerUrl" target="_blank" rel="noopener">{{ SITE.maker }}</a> ("we", "us"). For any privacy question or request, contact us through <a :href="SITE.makerUrl" target="_blank" rel="noopener">{{ SITE.makerUrl.replace('https://', '').replace(/\/$/, '') }}</a>.</p>

    <h2>2. What we collect</h2>
    <h3>Account information</h3>
    <p>When you sign up we receive your name, email address and profile photo, plus the sign-in method you use. If you choose "Continue with Google", Google shares your name, email address and profile photo with our sign-in provider. Passwords, where used, are handled by our sign-in provider, not stored by us.</p>
    <h3>Budget data you enter</h3>
    <p>Income entries (amount, label, date and how it was split), expenses, debts, savings goals and contributions, recurring bills, your chosen currency, and a display name. This is the core of the service and it is stored against your account.</p>
    <h3>Technical data</h3>
    <p>Like any website, our hosting and sign-in providers process your IP address, browser and device type, and request logs. This is used to deliver the service, keep it secure and prevent abuse.</p>
    <h3>What we do not collect</h3>
    <p>Weka does not ask for bank logins, card numbers or account numbers, does not connect to your bank, does not use advertising trackers, and does not currently use analytics tools.</p>

    <h2>3. How we use your information</h2>
    <ul>
      <li>To create your account, sign you in, and show you your budget.</li>
      <li>To save your data and keep it in sync across your devices.</li>
      <li>To protect the service, investigate abuse and fix problems.</li>
      <li>To meet legal obligations.</li>
    </ul>
    <p>We do not sell your personal information, share it for advertising, or use your financial data to profile you.</p>

    <h2>4. Legal bases (where GDPR or similar laws apply)</h2>
    <p>We process your information to perform our contract with you (providing the app), for our legitimate interests in securing and improving the service, and to comply with legal obligations. We handle personal data in line with applicable laws, including Kenya's Data Protection Act, 2019.</p>

    <h2>5. Who handles your data</h2>
    <p>We use a small number of service providers who process data on our behalf:</p>
    <table>
      <thead><tr><th>Provider</th><th>Purpose</th></tr></thead>
      <tbody>
        <tr><td>Clerk</td><td>Sign-up, sign-in and account management</td></tr>
        <tr><td>Vercel</td><td>Hosting and delivery of the app</td></tr>
        <tr><td>Neon</td><td>Managed Postgres database where your budget data is stored</td></tr>
        <tr><td>Google</td><td>Only if you choose "Continue with Google" to sign in</td></tr>
      </tbody>
    </table>
    <p>Each provider handles data under its own terms and privacy policy. We may also disclose information if required by law or to protect rights and safety.</p>

    <h2>6. Cookies and on-device storage</h2>
    <p>We only use what is needed for the app to work:</p>
    <ul>
      <li><strong>Sign-in cookies</strong> set by our sign-in provider to keep you signed in and secure.</li>
      <li><strong>Local storage</strong> in your browser to keep a copy of your own budget so the app is fast and works offline, and to remember small preferences.</li>
      <li><strong>An offline cache</strong> of the app's files, so it can open without a connection.</li>
    </ul>
    <p>We do not use advertising or tracking cookies. The app's font is served from our own site, so visitors' browsers do not contact Google Fonts. Signing out removes your budget copy from that device.</p>

    <h2>7. International transfers</h2>
    <p>Our providers may process data in countries other than your own, including the United States and the European Union. Where required, transfers rely on safeguards such as standard contractual clauses used by those providers.</p>

    <h2>8. How long we keep your data</h2>
    <p>We keep your information while your account is open. Use <strong>Settings → Delete account</strong> to permanently delete your account and all your budget data, which is removed from our database straight away. <strong>Settings → Erase all data</strong> removes your budget data but keeps your account. Our providers may keep limited technical logs and database backups for a short period under their own retention schedules before they are purged.</p>

    <h2>9. Your rights</h2>
    <p>Depending on where you live, you may have the right to access, correct, delete, restrict or object to the use of your personal data, to receive it in a portable format, and to withdraw consent. In the app you can:</p>
    <ul>
      <li><strong>Access and port</strong> your data with <strong>Settings → Export</strong>, which gives you a file of your budget.</li>
      <li><strong>Correct</strong> anything by editing it in the app.</li>
      <li><strong>Delete</strong> your data or your whole account in Settings.</li>
    </ul>
    <p>For anything else, contact us using the details above. You also have the right to complain to your data protection authority, for example the Office of the Data Protection Commissioner in Kenya, or your local EU or UK authority.</p>

    <h2>10. Security</h2>
    <p>Traffic between your device and Weka is encrypted in transit. Every request is tied to your signed-in account, and the server only ever reads and writes the data belonging to that account. Your data is held by managed infrastructure providers. No online service can be guaranteed completely secure, so please protect your sign-in. Note that a backup file you export is plain text, so store it somewhere private.</p>

    <h2>11. Children</h2>
    <p>Weka is intended for people aged 18 and over and is not directed at children. If you believe a child has given us personal information, contact us and we will delete it.</p>

    <h2>12. Changes to this policy</h2>
    <p>If we make material changes we will update the date above and, where appropriate, tell you in the app.</p>

    <h2>13. Contact</h2>
    <p>Questions or requests about your privacy: contact {{ SITE.maker }} at <a :href="SITE.makerUrl" target="_blank" rel="noopener">{{ SITE.makerUrl }}</a>.</p>
  </article>
</template>

<script setup lang="ts">
import { SITE } from '#shared/site'
definePageMeta({ layout: 'public' })
const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
useSeo({
  title: 'Privacy Policy | Weka',
  description: 'What personal information Weka collects, why, who handles it, how long it is kept, and how to export or delete your data.',
  path: '/privacy',
  jsonLd: [...siteGraph(site), { '@context': 'https://schema.org', '@type': 'WebPage', name: 'Privacy Policy', url: `${site}/privacy`, dateModified: '2026-10-09', isPartOf: { '@id': `${site}/#website` } }],
})
</script>
