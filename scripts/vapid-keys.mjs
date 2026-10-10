// Prints a fresh pair of VAPID keys for bill reminders (browser push). Run it yourself, on your own machine:
//   node scripts/vapid-keys.mjs
// Then add the values to your hosting settings (see README, "Bill reminders"). The private key is a secret: do not commit it,
// paste it into chat, or put it in a file that is tracked by git.
import { createRequire } from 'node:module'
const webpush = createRequire(import.meta.url)('web-push')
const keys = webpush.generateVAPIDKeys()
console.log(`
Add these in Vercel (Project > Settings > Environment Variables), then redeploy:

  NUXT_PUBLIC_VAPID_PUBLIC_KEY   ${keys.publicKey}
  VAPID_PRIVATE_KEY              ${keys.privateKey}      <- keep secret
  VAPID_SUBJECT                  mailto:you@example.com   <- your contact address
  CRON_SECRET                    (any random string of 16+ characters, for example the output of: openssl rand -hex 24)
`)
