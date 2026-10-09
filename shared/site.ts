// Single source of truth for public site facts. The landing page, FAQ markup, llms.txt and sitemap all read from here.
export const SITE = {
  name: 'BudgetNow',
  tagline: 'Split every pay in seconds. Know what is safe to spend.',
  description: 'BudgetNow is a free budgeting app. Enter your pay and it instantly splits the money into Needs, Wants, Savings and Debt, then tracks your spending, debts, goals and recurring bills.',
  maker: 'SharlTech',
  makerUrl: 'https://sharl-tech.co.ke/',
  privacyUpdated: '9 October 2026',
  currencies: ['USD', 'EUR', 'GBP', 'ZAR', 'NGN', 'KES', 'GHS', 'INR', 'CAD', 'AUD', 'JPY', 'AED'],
} as const

export interface Faq { q: string; a: string }

/** Plain-text answers: the same text is shown on the page and in the FAQPage structured data. */
export const FAQS: Faq[] = [
  { q: 'What is BudgetNow?', a: 'BudgetNow is a free budgeting app. You enter your pay, and it instantly splits the money into Needs, Wants, Savings and Debt. You can adjust the split before confirming. It then tracks your expenses, debts, savings goals and recurring bills, and shows how much is safe to spend today.' },
  { q: 'How does BudgetNow split my income?', a: 'It reserves the minimum payments on your debts first, then divides what is left 50% to Needs, 30% to Wants and 20% to Savings. You can drag a slider or type an amount for any category. The other categories rebalance automatically so the total always matches your income, and nothing is saved until you confirm.' },
  { q: 'What is the 50/30/20 rule?', a: 'The 50/30/20 rule is a simple budgeting guideline: spend about 50% of your after-tax income on needs, 30% on wants, and put 20% towards savings or debt repayment. BudgetNow uses it as the starting point and lets you change it to fit your life.' },
  { q: 'What does "safe to spend today" mean?', a: 'It is the amount you can spend today on Needs and Wants without going over this month. BudgetNow takes what is left in those two budgets, sets aside bills that are still due this month, and spreads the rest evenly across the days remaining. If you spend more today, tomorrow\'s allowance adjusts.' },
  { q: 'Does BudgetNow connect to my bank?', a: 'No. You enter your income and expenses yourself, so BudgetNow never asks for your bank login, card number or account details.' },
  { q: 'Is my financial data private?', a: 'Your budget is saved to your own account and is only visible when you are signed in. Sign-in is handled by Clerk, and your data is stored in a managed Postgres database. BudgetNow does not sell your data and does not show ads. The Privacy Policy explains exactly what is collected and why.' },
  { q: 'Does BudgetNow work offline?', a: 'Yes. You can install BudgetNow on your phone or computer like an app. It keeps a copy of your data on your device, so you can keep adding transactions with no connection, and it syncs to your account when you are back online.' },
  { q: 'Which currencies does BudgetNow support?', a: 'BudgetNow supports US dollars, euros, British pounds, South African rand, Nigerian naira, Kenyan shillings, Ghanaian cedis, Indian rupees, Canadian dollars, Australian dollars, Japanese yen and UAE dirhams. Pick yours in Settings.' },
  { q: 'How do I delete my data?', a: 'In Settings you can erase all your budget data, or choose Delete account to permanently remove your account and everything stored with it. You can also export a backup file first.' },
  { q: 'Is BudgetNow free?', a: 'Yes, BudgetNow is free to use.' },
]

/** Public, indexable pages. Used for the sitemap and llms.txt. */
export const PUBLIC_PAGES = [
  { path: '/', title: 'BudgetNow: free budget app that splits your pay instantly', priority: '1.0', changefreq: 'monthly' },
  { path: '/guides/50-30-20-rule', title: 'The 50/30/20 budget rule explained (with a calculator)', priority: '0.8', changefreq: 'monthly' },
  { path: '/privacy', title: 'Privacy Policy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', title: 'Terms of Service', priority: '0.3', changefreq: 'yearly' },
] as const
