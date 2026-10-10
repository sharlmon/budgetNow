// What a bill reminder says and who gets one. Pure functions, so the app, the server job and the tests all agree.
import { formatMoney } from './money'

/** The scheduled job runs once a day at this UTC hour (see vercel.json). 05:00 UTC is 08:00 in Kenya. */
export const REMINDER_HOUR_UTC = 5
export const DAYS_BEFORE_OPTIONS = [0, 1, 2, 3] as const
export const DETAIL_OPTIONS = ['basic', 'names', 'full'] as const
export type ReminderDetail = typeof DETAIL_OPTIONS[number]
export const DEFAULT_REMINDER = { daysBefore: 1, detail: 'names' as ReminderDetail }
/** A bill that is still unpaid this many days after its due date keeps being mentioned, then stops. */
export const OVERDUE_GRACE_DAYS = 3

export interface ReminderBill { name: string; amount: number; nextDue: string }
export interface DueBill extends ReminderBill { days: number }
export interface DueGroups { overdue: DueBill[]; today: DueBill[]; soon: DueBill[] }
export interface Reminder { title: string; body: string; url: string; tag: string }

const DATE = /^\d{4}-\d{2}-\d{2}$/
const dayNumber = (d: string) => { const [y = 0, m = 1, dd = 1] = d.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, dd) / 86_400_000) }
/** Whole days from `from` to `to` (negative when `to` is earlier). Both are YYYY-MM-DD. */
export const dayDiff = (from: string, to: string) => dayNumber(to) - dayNumber(from)

export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== 'string' || !tz || tz.length > 64) return false
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}
/** The calendar date it is right now in `tz`, as YYYY-MM-DD. */
export function localDate(now: Date, tz: string): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (t: string) => p.find(x => x.type === t)!.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

/** Sorts bills into overdue (recently), due today, and due within the next `daysBefore` days. Anything else is left out. */
export function billsToRemind(bills: ReminderBill[], today: string, daysBefore: number): DueGroups {
  const g: DueGroups = { overdue: [], today: [], soon: [] }
  for (const b of bills) {
    if (!DATE.test(b.nextDue)) continue
    const days = dayDiff(today, b.nextDue)
    const due = { ...b, days }
    if (days < 0 && days >= -OVERDUE_GRACE_DAYS) g.overdue.push(due)
    else if (days === 0) g.today.push(due)
    else if (days > 0 && days <= daysBefore) g.soon.push(due)
  }
  g.overdue.sort((a, b) => a.days - b.days); g.soon.sort((a, b) => a.days - b.days)
  return g
}

const when = (days: number) => (days < 0 ? `overdue by ${-days} day${days === -1 ? '' : 's'}` : days === 0 ? 'due today' : days === 1 ? 'due tomorrow' : `due in ${days} days`)

/**
 * The notification for one person's bills, or null when nothing needs a reminder.
 * `detail` is how much the lock screen may show: just a count, the bill names, or names with amounts.
 */
export function buildReminder(g: DueGroups, detail: ReminderDetail, currency: string): Reminder | null {
  const all = [...g.overdue, ...g.today, ...g.soon]
  if (!all.length) return null
  const base = { url: '/bills', tag: 'bill-reminders' }
  const label = (b: DueBill) => (detail === 'full' ? `${b.name} (${formatMoney(b.amount, currency)})` : b.name)

  if (detail === 'basic') {
    const n = all.length
    const urgent = g.overdue.length + g.today.length
    return { ...base, title: n === 1 ? 'A bill needs your attention' : `${n} bills need your attention`, body: urgent ? `${urgent === 1 ? 'One is' : `${urgent} are`} ${g.overdue.length ? 'due or overdue' : 'due today'}. Open Weka to see which.` : 'Open Weka to see which.' }
  }
  if (all.length === 1) {
    const b = all[0]!
    return { ...base, title: `${b.name} is ${when(b.days)}`, body: detail === 'full' ? `${formatMoney(b.amount, currency)}. Tap to mark it paid.` : 'Tap to mark it paid.' }
  }
  const lines = all.slice(0, 3).map(b => `${label(b)} ${when(b.days)}`)
  const more = all.length - lines.length
  return { ...base, title: `${all.length} bills need your attention`, body: lines.join('. ') + (more > 0 ? `. +${more} more` : '.') }
}

/**
 * Push addresses the server is willing to send to. A device chooses its own address, so without a check someone could point the
 * server at an internal address. Only the browser vendors' push services are allowed, over https on the default port.
 */
const PUSH_HOSTS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'push.services.mozilla.com', 'web.push.apple.com', 'push.apple.com', 'notify.windows.com']
export function isAllowedPushEndpoint(endpoint: unknown): endpoint is string {
  if (typeof endpoint !== 'string' || endpoint.length > 1000) return false
  let u: URL
  try { u = new URL(endpoint) } catch { return false }
  if (u.protocol !== 'https:' || u.port !== '' || u.username || u.password) return false
  const host = u.hostname.toLowerCase()
  return PUSH_HOSTS.some(h => host === h || host.endsWith('.' + h))
}
