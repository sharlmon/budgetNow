# BudgetNow

A small personal budget tracker. Enter your salary (or any money in) and get an instant breakdown across **Needs / Wants / Savings / Debt**, adjust it if you like, then log expenses and track debts.

- Stack: Nuxt 4 (static SPA), no backend. Data is stored in your browser's `localStorage`.
- Default split: minimum debt payments first, then 50/30/20 of what's left.

## Develop
```bash
npm install
npm run dev
```

## Deploy
Pushing to `main` builds with `nuxt generate` and publishes to GitHub Pages (see `.github/workflows/deploy.yml`).

## Roadmap
See GitHub Issues.
