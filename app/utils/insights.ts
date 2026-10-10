// What the numbers mean: are you on pace this month, what changed since last month, where did it go, and a few plain-language
// observations. Pure functions (money is formatted by a function passed in), shared with the tests.

export interface AnExpense { label: string; amount: number; category: string; date: string; accountId?: string }

const round = (n: number) => Math.round(n * 100) / 100
const dim = (month: string) => { const [y = 0, m = 1] = month.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate() }
const inMonth = (e: { date: string }, month: string) => e.date.startsWith(month)

// ---- Pace ----
export type PaceStatus = 'nobudget' | 'idle' | 'early' | 'under' | 'on' | 'over'
export interface Pace {
  status: PaceStatus
  budget: number; spent: number; days: number; elapsed: number
  /** What an even pace would have spent by now. */
  expected: number
  /** Where the month would end at the current pace, or null when it is too early in the month to say. */
  projected: number | null
  /** Positive when spending is ahead of an even pace. */
  aheadBy: number
  /** What can be spent each remaining day (today included) to stay inside the budget, or null when none are left or it is already used up. */
  perDayLeft: number | null
}
/** Projecting from the first few days is misleading (the rent lands on the 1st), so it waits until this many days have passed. */
export const MIN_DAYS_TO_PROJECT = 5

export function paceSummary(o: { month: string; today: string; spent: number; budget: number }): Pace {
  const days = dim(o.month), thisMonth = o.today.slice(0, 7)
  const current = o.month === thisMonth, future = o.month > thisMonth
  const elapsed = future ? 0 : current ? Number(o.today.slice(8, 10)) : days
  const expected = round(o.budget * elapsed / days)
  const base = { budget: round(o.budget), spent: round(o.spent), days, elapsed, expected, aheadBy: round(o.spent - expected) }
  if (o.budget <= 0) return { ...base, status: 'nobudget', projected: null, perDayLeft: null }
  if (elapsed === 0) return { ...base, status: 'idle', projected: null, perDayLeft: null }
  const left = days - elapsed + 1
  const perDayLeft = current && o.budget > o.spent && left > 0 ? round((o.budget - o.spent) / left) : null
  if (current && elapsed < MIN_DAYS_TO_PROJECT) return { ...base, status: o.spent > o.budget ? 'over' : 'early', projected: null, perDayLeft }
  const projected = round(current ? (o.spent / elapsed) * days : o.spent)
  const status: PaceStatus = projected <= o.budget * 0.95 ? 'under' : projected <= o.budget * 1.02 ? 'on' : 'over'
  return { ...base, status, projected, perDayLeft }
}

/** Running total of spending day by day (up to today for the current month), and the straight line an even pace would follow. */
export function cumulativeSeries(expenses: AnExpense[], o: { month: string; today: string; budget: number }) {
  const days = dim(o.month), thisMonth = o.today.slice(0, 7)
  const upTo = o.month > thisMonth ? 0 : o.month === thisMonth ? Number(o.today.slice(8, 10)) : days
  const perDay = new Array<number>(days).fill(0)
  for (const e of expenses) if (inMonth(e, o.month)) perDay[Number(e.date.slice(8, 10)) - 1]! += e.amount
  let run = 0
  const actual: { day: number; value: number }[] = [{ day: 0, value: 0 }]
  for (let d = 1; d <= upTo; d++) { run = round(run + perDay[d - 1]!); actual.push({ day: d, value: run }) }
  const ideal = [{ day: 0, value: 0 }, { day: days, value: round(o.budget) }]
  return { actual, ideal, days, upTo }
}

// ---- Compared with last month ----
export interface Change { key: string; now: number; before: number; delta: number; /** Percent change, or null when there was nothing last month to compare with. */ pct: number | null }
export function categoryChanges(now: Record<string, number>, before: Record<string, number>, keys: string[]): Change[] {
  return keys.map((key) => {
    const n = round(now[key] ?? 0), b = round(before[key] ?? 0)
    return { key, now: n, before: b, delta: round(n - b), pct: b > 0 ? Math.round(((n - b) / b) * 100) : null }
  })
}

// ---- Where it went ----
export interface Spend { label: string; total: number; count: number; share: number }
const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
/** The biggest places the money went: entries with the same name are added together ("Lunch", " lunch "), largest first. */
export function topSpends(expenses: AnExpense[], month: string, n: number, fallback: (category: string) => string): Spend[] {
  const groups = new Map<string, { label: string; biggest: number; total: number; count: number }>()
  let all = 0
  for (const e of expenses) {
    if (!inMonth(e, month)) continue
    const label = e.label.trim() || fallback(e.category)
    const key = norm(label)
    const g = groups.get(key) ?? { label, biggest: 0, total: 0, count: 0 }
    g.total += e.amount; g.count++; all += e.amount
    if (e.amount > g.biggest) { g.biggest = e.amount; g.label = label } // show the name as written on the biggest one
    groups.set(key, g)
  }
  return [...groups.values()].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)).slice(0, n).map(g => ({ label: g.label, total: round(g.total), count: g.count, share: all > 0 ? g.total / all : 0 }))
}

export interface AccountShare { id: string; name: string; color: string; total: number; share: number }
export const NO_ACCOUNT_ID = 'none'
/** Spending by the account it was paid from, with entries that used no account together under one line. */
export function spendByAccount(expenses: AnExpense[], month: string, accounts: { id: string; name: string; color: string }[]): AccountShare[] {
  const known = new Map(accounts.map(a => [a.id, a]))
  const totals = new Map<string, number>()
  let all = 0
  for (const e of expenses) {
    if (!inMonth(e, month)) continue
    const id = e.accountId && known.has(e.accountId) ? e.accountId : NO_ACCOUNT_ID
    totals.set(id, (totals.get(id) ?? 0) + e.amount); all += e.amount
  }
  return [...totals.entries()].sort((a, b) => b[1] - a[1]).map(([id, total]) => {
    const a = known.get(id)
    return { id, name: a?.name ?? 'No account', color: a?.color ?? '#94a3b8', total: round(total), share: all > 0 ? total / all : 0 }
  })
}

// ---- Habits ----
export interface Weekday { byDay: number[]; busiest: { day: number; share: number } | null }
export const MIN_ENTRIES_FOR_HABITS = 8
/** Which day of the week takes the most spending (0 is Sunday). Only reported when there is enough to go on and one day clearly stands out. */
export function weekdayPattern(expenses: AnExpense[], month: string): Weekday {
  const byDay = new Array<number>(7).fill(0)
  let count = 0, all = 0
  for (const e of expenses) {
    if (!inMonth(e, month)) continue
    const [y = 0, m = 1, d = 1] = e.date.split('-').map(Number)
    byDay[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]! += e.amount; count++; all += e.amount
  }
  const max = Math.max(...byDay), day = byDay.indexOf(max)
  const share = all > 0 ? max / all : 0
  return { byDay: byDay.map(round), busiest: count >= MIN_ENTRIES_FOR_HABITS && share >= 0.3 ? { day, share } : null }
}
export const WEEKDAYS = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

// ---- Plain-language observations ----
export type Tone = 'good' | 'warn' | 'info'
export interface Insight { id: string; tone: Tone; title: string; body: string }

/** Up to four things worth knowing, most important first. */
export function buildInsights(c: {
  fmt: (n: number) => string
  income: number
  pace: Pace
  overCategories: { label: string; over: number }[]
  changes: (Change & { label: string })[]
  topSpend: Spend | null
  weekday: Weekday
  savingsRate: number
}): Insight[] {
  const out: Insight[] = []
  const f = c.fmt
  if (!c.income) return [{ id: 'no-income', tone: 'info', title: 'No money in this month', body: 'Add what came in to see where it should go.' }]

  const over = c.overCategories[0]
  if (over) out.push({ id: 'over-category', tone: 'warn', title: `${over.label} is over budget`, body: `You are ${f(over.over)} past what you planned for it.` })
  if (c.pace.status === 'over' && c.pace.projected !== null) out.push({ id: 'pace-over', tone: 'warn', title: 'Heading over budget', body: `At this pace you will spend ${f(c.pace.projected)}, which is ${f(c.pace.projected - c.pace.budget)} over.` })
  if (c.pace.status === 'under' && c.pace.projected !== null) out.push({ id: 'pace-under', tone: 'good', title: 'Spending is under control', body: `At this pace you will finish ${f(c.pace.budget - c.pace.projected)} under budget.` })

  const rise = [...c.changes].filter(x => x.pct !== null && x.pct >= 25 && x.delta >= 1).sort((a, b) => b.delta - a.delta)[0]
  if (rise) out.push({ id: 'rise', tone: 'info', title: `${rise.label} is up ${rise.pct}%`, body: `${f(rise.delta)} more than last month.` })
  const fall = [...c.changes].filter(x => x.pct !== null && x.pct <= -25 && x.delta <= -1).sort((a, b) => a.delta - b.delta)[0]
  if (fall) out.push({ id: 'fall', tone: 'good', title: `${fall.label} is down ${-fall.pct!}%`, body: `${f(-fall.delta)} less than last month.` })

  if (c.topSpend && c.topSpend.share >= 0.4 && c.topSpend.count >= 1) out.push({ id: 'concentration', tone: 'info', title: `${c.topSpend.label} is ${Math.round(c.topSpend.share * 100)}% of your spending`, body: `${f(c.topSpend.total)} across ${c.topSpend.count} entr${c.topSpend.count === 1 ? 'y' : 'ies'}.` })
  if (c.weekday.busiest) out.push({ id: 'weekday', tone: 'info', title: `${WEEKDAYS[c.weekday.busiest.day]} are your big days`, body: `${Math.round(c.weekday.busiest.share * 100)}% of what you spend lands on a ${WEEKDAYS[c.weekday.busiest.day]!.slice(0, -1)}.` })
  if (c.savingsRate < 20 && !out.some(o => o.tone === 'warn')) out.push({ id: 'save-more', tone: 'info', title: 'Try saving 20%', body: `You are setting aside ${Math.round(c.savingsRate)}% this month.` })
  if (c.savingsRate >= 20) out.push({ id: 'saving-well', tone: 'good', title: 'A healthy savings rate', body: `You are setting aside ${Math.round(c.savingsRate)}% of what came in.` })
  return out.slice(0, 4)
}
