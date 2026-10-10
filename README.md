# Weka

A personal budget tracker. Enter your pay and it's split instantly across **Needs / Wants / Savings / Debt** (you can adjust before confirming), then track expenses, debts, savings goals, recurring bills and the accounts where you keep your money (M-Pesa, banks, cash, investments, with balances you enter yourself). Income, expenses, bills and debt payments can be tied to an account, which Weka then keeps up to date. A "safe to spend today" number tells you what's left for the day.

**Stack:** Nuxt 4 (client-rendered) · Nuxt server routes on Vercel · Neon Postgres via Drizzle ORM · Clerk authentication · installable PWA.

## How it works

- Every account's data lives in Postgres tables (`incomes`, `expenses`, `debts`, `goals`, `goal_contributions`, `bills`, `accounts`, `profiles`), each keyed by `(user_id, id)`.
- The app keeps a local copy so it's instant and works offline. When something changes it sends only the changed rows to `POST /api/sync`; on start and whenever you come back to the app it pushes pending changes first, then pulls the latest from `GET /api/state`. Edits made offline are kept and uploaded when you reconnect.
- Every record has a revision. An edit says which revision it was based on; the server refuses to overwrite a newer one. When two devices edit the same record the app first merges automatically (different fields both kept, debt payments added together, goal contributions combined). Only when both changed the same field differently does it ask on **Home → Review**.
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

## Clerk webhook (delete data when an account is deleted)

The in-app **Delete account** removes a user's data and then their Clerk user. If someone deletes their Clerk account some other way (for example from Clerk's own profile screen), a webhook removes their data too:

1. Clerk dashboard → **Webhooks** → **Add endpoint**: `https://<your-domain>/api/webhooks/clerk`, subscribe to **user.deleted**.
2. Copy the endpoint's **signing secret** into the `NUXT_CLERK_WEBHOOK_SIGNING_SECRET` environment variable on Vercel and redeploy.

Requests are verified with the Svix signature (HMAC over id, timestamp and body, with a 5 minute window against replays). Without the secret the endpoint refuses everything.

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

## Versions and updates

The version lives in `package.json` ([Semantic Versioning](https://semver.org)): patch for fixes, minor for new features, major for breaking changes. To release:

1. Bump `version` in `package.json`.
2. Add an entry at the top of `shared/releases.ts` (shown in Settings → About → What's new) and a matching heading in `CHANGELOG.md`. A test fails if these three disagree.
3. Merge, then tag it: `git tag v1.1.0 && git push --tags` (optionally publish a GitHub release).

Open copies of the app learn about a new deployment from `/version.json` (never cached; it reports the version and the build). They check a little after opening, whenever you return to the app, and every 15 minutes. A different build shows **"Version X is available"** with **Update** and **Later**; after updating, the first open says **"Updated to version X"** once, with a link to what's new. A redeploy without a version bump still shows "An update is available".

## Roadmap
See GitHub Issues.
