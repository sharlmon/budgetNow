# BudgetNow

A personal budget tracker. Enter your pay and it's split instantly across **Needs / Wants / Savings / Debt** (you can adjust before confirming), then track expenses, debts, savings goals and recurring bills. A "safe to spend today" number tells you what's left for the day.

**Stack:** Nuxt 4 (client-rendered) · Nuxt server routes on Vercel · Neon Postgres via Drizzle ORM · Clerk authentication · installable PWA.

## How it works

- Every account's data lives in Postgres tables (`incomes`, `expenses`, `debts`, `goals`, `goal_contributions`, `bills`, `profiles`), each keyed by `(user_id, id)`.
- The app keeps a local copy so it's instant and works offline. When something changes it sends only the changed rows to `POST /api/sync`; on start and whenever you come back to the app it pushes pending changes first, then pulls the latest from `GET /api/state`. Edits made offline are kept and uploaded when you reconnect.
- Two devices editing the *same row* resolve last-write-wins; everything else merges naturally.
- `user_id` is always taken from the verified Clerk session on the server, never from the request.

## Deploy (Vercel + Clerk + Neon)

1. **Clerk** – create an application at <https://dashboard.clerk.com> (enable the sign-in methods you want). On *API keys*, pick **Nuxt** and copy the two keys.
2. **Vercel** – *Add New → Project → import this GitHub repo*. Framework is detected as Nuxt.
3. **Database** – in the Vercel project, *Storage → Create → Neon (Postgres)* and connect it to the project. This sets `DATABASE_URL` for you.
4. **Environment variables** – add in *Project → Settings → Environment Variables*:
   - `NUXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `NUXT_CLERK_SECRET_KEY`
5. **Deploy.** The build runs `scripts/migrate.mjs` first, so the database schema is always up to date.

Clerk *development* instances work on any `*.vercel.app` URL. For a *production* Clerk instance you'll add your own domain in Clerk.

See `.env.example` for every variable.

## Develop locally

```bash
npm install
npm run dev:local     # no Clerk keys or database needed
```

`dev:local` sets `DEV_AUTH_BYPASS=1`: you're signed in as a fake user and data goes to an in-process Postgres in `.data/pglite`. The bypass only exists in `nuxt dev` and is ignored by every production build.

To run against real Clerk and Neon instead, copy `.env.example` to `.env`, fill it in, and run `npm run dev`.

## Security

See [SECURITY.md](SECURITY.md) for how to report a vulnerability and what is protected. In short: every API route needs a verified Clerk session and is scoped to that user; writes must come from the app's own pages (CSRF checks + marker header); inputs are validated and queries parameterised; per-IP rate limits and size limits; CSP and other security headers; and CI attacks the dev server and the production build on every pull request.

## Tests

```bash
npm test              # unit tests: bill dates, backup parsing, sync diffing, PIN/biometric checks, security helpers
npm run dev:local     # in one terminal...
npm run test:api      # ...and these in another: API tests (isolation, validation, atomicity)
npm run test:security # attack tests: CSRF, injection, oversized bodies, rate limits, error leaks
```

## Dependency notes

- `unplugin` is listed as a direct dependency on purpose: it pins one consistent copy at the top of the tree. Without it npm 10.9 (used in CI) writes a lockfile that fails `npm ci` ("lock file's unplugin@2.3.11 does not satisfy unplugin@3.4.0"). If you change dependencies, regenerate the lockfile in a clean folder with CI's npm (`npx npm@10.9.2 install --package-lock-only --ignore-scripts`), because a lockfile created on one OS can omit the native binaries other platforms need.
- `overrides` in `package.json` force a patched `simple-git`.

## Database changes

Edit `server/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`. It's applied on the next deploy.

## SEO, answer engines and legal pages

- Public pages (`/`, `/guides/50-30-20-rule`, `/privacy`, `/terms`) are pre-rendered to static HTML with titles, descriptions, canonical URLs, Open Graph/Twitter cards and JSON-LD (Organization, WebSite, WebApplication, FAQPage, Article, BreadcrumbList).
- `/robots.txt`, `/sitemap.xml` and `/llms.txt` are generated from `shared/site.ts` and `shared/seo.ts`; the FAQ text there is the single source for the page, the structured data and `llms.txt`.
- The signed-in app is client-only and sent `X-Robots-Tag: noindex`.
- Set `NUXT_PUBLIC_SITE_URL` when you add a custom domain so every absolute URL follows it.
- Settings has **Delete account**, which removes all of a user's rows and then their Clerk user (`DELETE /api/account`).

## App lock

Optional PIN lock (Settings → App lock). The PIN is hashed with PBKDF2 (150k iterations, random salt) and stored in this browser only, so it never syncs and each device sets its own. Wrong guesses are throttled (30s after the fifth, doubling to 15 min). It locks on open and after a chosen time away, and "Forgot PIN" signs out so Clerk re-verifies the user. Optionally, Face ID / fingerprint unlock uses a WebAuthn platform credential bound to the site's hostname (`app/utils/webauthn.ts`); the app only accepts an assertion that is fresh, for this site, and carries the user-verified flag. If the domain changes, turn it off and on again. It is a screen lock, not encryption of on-device data.

## Roadmap
See GitHub Issues.
