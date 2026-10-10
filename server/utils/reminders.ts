import { and, eq, inArray } from 'drizzle-orm'
import { billsToRemind, buildReminder, isValidTimeZone, localDate, type ReminderDetail } from '../../shared/reminders'
import { bills, profiles, pushSubscriptions } from '../db/schema'
import type { Sender } from './push'

export interface RunStats { checked: number; sent: number; skipped: number; removed: number; failed: number }

const CHUNK = 200
const POOL = 8

/**
 * Sends today's bill reminders. Each device gets at most one a day (its own local date decides what "today" is), and only when
 * something is due. A device the browser says is gone is removed; a failed send is left to try again on the next run.
 */
export async function runReminders(db: any, opts: { send: Sender; now?: Date; userId?: string }): Promise<RunStats> {
  const now = opts.now ?? new Date()
  const stats: RunStats = { checked: 0, sent: 0, skipped: 0, removed: 0, failed: 0 }
  const subs: any[] = await db.select().from(pushSubscriptions).where(opts.userId ? eq(pushSubscriptions.userId, opts.userId) : undefined)
  if (!subs.length) return stats

  const userIds = [...new Set(subs.map(s => s.userId as string))]
  const billsBy = new Map<string, any[]>(), currencyBy = new Map<string, string>()
  for (let i = 0; i < userIds.length; i += CHUNK) {
    const part = userIds.slice(i, i + CHUNK)
    for (const b of await db.select().from(bills).where(inArray(bills.userId, part))) (billsBy.get(b.userId) ?? billsBy.set(b.userId, []).get(b.userId)!).push(b)
    for (const p of await db.select().from(profiles).where(inArray(profiles.userId, part))) currencyBy.set(p.userId, p.currency)
  }

  const one = async (s: any) => {
    stats.checked++
    if (!isValidTimeZone(s.timeZone)) { stats.skipped++; return }
    const today = localDate(now, s.timeZone)
    if (s.lastSentOn === today) { stats.skipped++; return }
    const groups = billsToRemind((billsBy.get(s.userId) ?? []).map(b => ({ name: b.name, amount: b.amount, nextDue: b.nextDue })), today, s.daysBefore)
    const reminder = buildReminder(groups, s.detail as ReminderDetail, currencyBy.get(s.userId) ?? 'KES')
    if (!reminder) { stats.skipped++; return }
    const result = await opts.send({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(reminder))
    const mine = and(eq(pushSubscriptions.userId, s.userId), eq(pushSubscriptions.endpoint, s.endpoint))
    if (result === 'ok') { await db.update(pushSubscriptions).set({ lastSentOn: today, updatedAt: now }).where(mine); stats.sent++ }
    else if (result === 'gone') { await db.delete(pushSubscriptions).where(mine); stats.removed++ }
    else stats.failed++
  }

  // A few at a time, so a thousand devices do not wait for each other one by one.
  let next = 0
  await Promise.all(Array.from({ length: Math.min(POOL, subs.length) }, async () => { while (next < subs.length) await one(subs[next++]) }))
  return stats
}
