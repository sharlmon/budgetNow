# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

- Use GitHub's private reporting: **Security → Report a vulnerability** on this repository, or
- Contact SharlTech through https://sharl-tech.co.ke/.

Include what you found, how to reproduce it, and the impact. We will acknowledge your report, keep you updated, and credit you if you wish once it is fixed. Please give us reasonable time to fix an issue before disclosing it, and do not access or modify other people's data while testing.

## What is in scope

The deployed BudgetNow app and this repository's code: authentication and session handling, the `/api` routes, data isolation between accounts, injection and cross-site scripting, and the CSRF protections.

## How the app is protected

- Sign-in is handled by Clerk. Every API route requires a verified session, and `user_id` always comes from that session, never from the request.
- Every table is keyed by `(user_id, id)` and every query is parameterised (Drizzle). Payloads are validated with zod and applied in a single transaction.
- State-changing API calls must come from the app's own pages: browser site checks (`Sec-Fetch-Site`, `Origin`), a marker header, and JSON-only bodies. Account deletion needs an explicit confirmation header.
- The Clerk webhook (`/api/webhooks/clerk`) is the only write route without a browser session. It is authenticated by a Svix signature with replay protection and refuses everything if the secret is not set.
- Rate limits at two levels: per client IP in memory (cheap, applied before anything else), and per signed-in user in the database, shared by every serverless instance (240 writes/min, 60 state reads/min, 5 account deletions/hour). The database counter runs only after authentication, so anonymous traffic cannot cause database writes. Plus request size limits and generic error responses with no stack traces in production.
- Content-Security-Policy, HSTS, `X-Frame-Options`, `nosniff`, a restrictive `Referrer-Policy` and `Permissions-Policy`.
- The private app is `noindex`; the dev-only auth bypass is compiled out of production builds (checked in CI).
- CI runs unit tests, an attack test suite against both the dev server and the production build, CodeQL, and a dependency audit. GitHub Actions are pinned to commit SHAs and Dependabot keeps dependencies current.

## Known limits

- The PIN / biometric app lock is a screen lock for this device, not encryption of data stored in the browser.
- Per-IP limiting is in memory per serverless instance, so a large anonymous flood is best stopped at the edge: add a Vercel Firewall rate-limit rule.
- A few advisories remain in development-only tooling with no upstream fix (`braces`, `node-forge`, the `esbuild` dev server). They do not run in the deployed app.
