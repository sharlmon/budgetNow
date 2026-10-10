// "Can I cover what is coming?" Lines up the bills due in the next few weeks against the money you hold, and finds the first
// date the money would run short. Pure functions, so the screen and the tests share one answer.
import { addDays, daysBetween, occurrencesUntil, type Every } from './bills'
import type { AccountKind } from './accounts'

export interface RunwayAccount { kind: AccountKind; balance: number }
export interface RunwayBill { id: string; name: string; amount: number; every: Every; nextDue: string; anchorDay: number; category: string }
export interface RunwayGoal { id: string; name: string; target: number; saved: number; deadline?: string }

export type RunwayStatus = 'unknown' | 'clear' | 'covered' | 'tight' | 'short'
export interface BillItem { kind: 'bill'; id: string; name: string; amount: number; category: string; /** The real due date (may be in the past). */ date: string; overdue: boolean; /** Money left in cash accounts after this one is paid, or null when no account is set up. */ after: number | null; short: boolean }
export interface GoalItem { kind: 'goal'; id: string; name: string; date: string; left: number }
export type RunwayItem = BillItem | GoalItem

export interface Runway {
  today: string; until: string; days: number
  /** Money in accounts that can pay bills (everything except investments), or null when no such account exists. */
  available: number | null
  /** Total of the bills in the window, overdue ones included. */
  due: number
  endBalance: number | null
  lowest: { date: string; balance: number } | null
  /** The first bill the money does not cover, and by how much the balance is below zero after it. */
  firstShort: { date: string; name: string; below: number } | null
  status: RunwayStatus
  items: RunwayItem[]
  /** Balance after each bill, from today, for the chart. day is whole days from today. */
  series: { day: number; balance: number }[]
}

const round = (n: number) => Math.round(n * 100) / 100
/** A balance within this share of what is available counts as "tight". */
export const TIGHT_SHARE = 0.15

/** Money that can pay a bill: every account except investments (which are saved, not spent). */
export function spendable(accounts: RunwayAccount[]): number | null {
  const cash = accounts.filter(a => a.kind !== 'invest')
  return cash.length ? round(cash.reduce((s, a) => s + a.balance, 0)) : null
}

export function buildRunway(o: { today: string; days: number; accounts: RunwayAccount[]; bills: RunwayBill[]; goals?: RunwayGoal[] }): Runway {
  const until = addDays(o.today, o.days)
  const available = spendable(o.accounts)

  // Every bill occurrence in the window. A bill that is already late counts as due today for the running balance.
  const dues: { b: RunwayBill; date: string }[] = []
  for (const b of o.bills) for (const date of occurrencesUntil(b.nextDue, b.every, b.anchorDay, until)) dues.push({ b, date })
  const effective = (d: string) => (d < o.today ? o.today : d)
  dues.sort((x, y) => effective(x.date).localeCompare(effective(y.date)) || y.b.amount - x.b.amount || x.b.name.localeCompare(y.b.name))

  const items: RunwayItem[] = []
  const series: { day: number; balance: number }[] = []
  let running = available
  let lowest: Runway['lowest'] = null
  let firstShort: Runway['firstShort'] = null
  if (running !== null) { series.push({ day: 0, balance: running }); lowest = { date: o.today, balance: running } }
  let due = 0
  for (const { b, date } of dues) {
    due = round(due + b.amount)
    if (running !== null) {
      running = round(running - b.amount)
      series.push({ day: Math.max(0, daysBetween(o.today, date)), balance: running })
      if (!lowest || running < lowest.balance) lowest = { date: effective(date), balance: running }
      if (running < 0 && !firstShort) firstShort = { date: effective(date), name: b.name, below: round(-running) }
    }
    items.push({ kind: 'bill', id: b.id, name: b.name, amount: b.amount, category: b.category, date, overdue: date < o.today, after: running, short: running !== null && running < 0 })
  }
  if (firstShort) firstShort.below = round(-Math.min(...series.map(s => s.balance))) // how far below zero it gets at the worst point

  for (const g of o.goals ?? []) {
    if (!g.deadline || g.deadline < o.today || g.deadline > until || g.saved >= g.target) continue
    items.push({ kind: 'goal', id: g.id, name: g.name, date: g.deadline, left: round(g.target - g.saved) })
  }
  // Late bills first, then by date; on the same day bills before goal deadlines.
  items.sort((x, y) => effective(x.date).localeCompare(effective(y.date)) || (x.kind === y.kind ? 0 : x.kind === 'bill' ? -1 : 1))

  const endBalance = running
  let status: RunwayStatus
  if (!dues.length) status = 'clear'
  else if (available === null) status = 'unknown'
  else if (firstShort) status = 'short'
  else if (available > 0 && lowest && lowest.balance < available * TIGHT_SHARE) status = 'tight'
  else status = 'covered'

  return { today: o.today, until, days: o.days, available, due: round(due), endBalance, lowest, firstShort, status, items, series }
}
