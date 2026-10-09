// Single source of truth for public site facts. The landing page, FAQ markup, llms.txt and sitemap all read from here.
export const SITE = {
  name: 'Weka',
  tagline: 'Split every pay in seconds. Know what is safe to spend.',
  description: 'Weka is a free budgeting app. Enter your pay and it instantly splits the money into Needs, Wants, Savings and Debt, then tracks your spending, debts, goals and recurring bills.',
  maker: 'SharlTech',
  makerUrl: 'https://sharl-tech.co.ke/',
  privacyUpdated: '9 October 2026',
  currencies: ['KES', 'USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'GHS', 'TZS', 'UGX', 'INR', 'CAD', 'AUD', 'JPY', 'AED'],
} as const

export interface Faq { q: string; a: string }

/** Plain-text answers: the same text is shown on the page and in the FAQPage structured data. */
export const FAQS: Faq[] = [
  { q: 'What is Weka?', a: 'Weka is a free budgeting app. You enter your pay, and it instantly splits the money into Needs, Wants, Savings and Debt. You can adjust the split before confirming. It then tracks your expenses, debts, savings goals and recurring bills, and shows how much is safe to spend today.' },
  { q: 'How does Weka split my income?', a: 'It reserves the minimum payments on your debts first, then divides what is left 50% to Needs, 30% to Wants and 20% to Savings. You can drag a slider or type an amount for any category. The other categories rebalance automatically so the total always matches your income, and nothing is saved until you confirm.' },
  { q: 'What is the 50/30/20 rule?', a: 'The 50/30/20 rule is a simple budgeting guideline: spend about 50% of your after-tax income on needs, 30% on wants, and put 20% towards savings or debt repayment. Weka uses it as the starting point and lets you change it to fit your life.' },
  { q: 'What does "safe to spend today" mean?', a: 'It is the amount you can spend today on Needs and Wants without going over this month. Weka takes what is left in those two budgets, sets aside bills that are still due this month, and spreads the rest evenly across the days remaining. If you spend more today, tomorrow\'s allowance adjusts.' },
  { q: 'Does Weka connect to my bank?', a: 'No. You enter your income and expenses yourself, so Weka never asks for your bank login, card number or account details.' },
  { q: 'Is my financial data private?', a: 'Your budget is saved to your own account and is only visible when you are signed in. Sign-in is handled by Clerk, and your data is stored in a managed Postgres database. Weka does not sell your data and does not show ads. The Privacy Policy explains exactly what is collected and why.' },
  { q: 'Does Weka work offline?', a: 'Yes. You can install Weka on your phone or computer like an app. It keeps a copy of your data on your device, so you can keep adding transactions with no connection, and it syncs to your account when you are back online.' },
  { q: 'Which currencies does Weka support?', a: 'Weka uses Kenyan shillings (KSh) by default. You can switch to US dollars, euros, British pounds, South African rand, Nigerian naira, Ghanaian cedis, Tanzanian shillings, Ugandan shillings, Indian rupees, Canadian dollars, Australian dollars, Japanese yen or UAE dirhams in Settings.' },
  { q: 'Can I lock Weka with a PIN?', a: 'Yes. In Settings you can turn on App lock and choose a 4 or 6 digit PIN. The app then asks for it when you open it and after you have been away for the time you choose. The PIN is stored on your device only. On phones and computers that support it you can also unlock with Face ID or a fingerprint. App lock keeps people who pick up your phone out of your budget, but it does not encrypt the data stored on the device.' },
  { q: 'How do I delete my data?', a: 'In Settings you can erase all your budget data, or choose Delete account to permanently remove your account and everything stored with it. You can also export a backup file first.' },
  { q: 'Is Weka free?', a: 'Yes, Weka is free to use.' },
]

/** Public, indexable pages. Used for the sitemap and llms.txt. */
export const PUBLIC_PAGES = [
  { path: '/', title: 'Weka: free budget app that splits your pay instantly', priority: '1.0', changefreq: 'monthly' },
  { path: '/guides/50-30-20-rule', title: 'The 50/30/20 budget rule explained (with a calculator)', priority: '0.8', changefreq: 'monthly' },
  { path: '/privacy', title: 'Privacy Policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', title: 'Terms of Service', priority: '0.3', changefreq: 'yearly' },
] as const
