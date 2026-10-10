// Sending a browser push message. The real sender uses web-push with this server's VAPID keys; in `nuxt dev` with PUSH_DRY_RUN=1
// a stand-in answers without touching the network, so the whole flow can be tested.
export type SendResult = 'ok' | 'gone' | 'failed'
export interface PushTarget { endpoint: string; keys: { p256dh: string; auth: string } }
export type Sender = (target: PushTarget, payload: string) => Promise<SendResult>

const dryRun = () => import.meta.dev && process.env.PUSH_DRY_RUN === '1'

/** Whether the server has what it needs to send: the public and private VAPID keys and a contact address. */
export function pushReady(): boolean {
  if (dryRun()) return true
  return !!(useRuntimeConfig().public.vapidPublicKey && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT)
}

export function createSender(): Sender {
  if (dryRun()) {
    // An address containing "gone" behaves like a device that unsubscribed; "fail" like a push service having a bad day.
    return async (t) => (t.endpoint.includes('gone') ? 'gone' : t.endpoint.includes('fail') ? 'failed' : 'ok')
  }
  let ready: Promise<any> | undefined
  const lib = () => (ready ??= import('web-push').then((m: any) => {
    const wp = m.default ?? m
    wp.setVapidDetails(process.env.VAPID_SUBJECT!, String(useRuntimeConfig().public.vapidPublicKey), process.env.VAPID_PRIVATE_KEY!)
    return wp
  }))
  return async (target, payload) => {
    try {
      await (await lib()).sendNotification(target, payload, { TTL: 60 * 60 * 12, urgency: 'normal' })
      return 'ok'
    } catch (e: any) {
      // 404 and 410 mean the browser says this subscription no longer exists.
      return e?.statusCode === 404 || e?.statusCode === 410 ? 'gone' : 'failed'
    }
  }
}
