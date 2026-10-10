// Finding things in your history: filtering, searching, grouping by day, and the daily bars. Pure functions, shared with the tests.

export interface ActTxn { id: string; kind: 'income' | 'expense'; title: string; amount: number; date: string; category?: string; accountId?: string }

export const NO_ACCOUNT = 'none'
export interface ActFilters {
  /** YYYY-MM, or 'all' for everything. */
  month: string
  kind: 'all' | 'income' | 'expense'
  /** A category key, or 'all'. Only expenses have a category, so choosing one hides income. */
  category: string
  /** An account id, NO_ACCOUNT for entries that used none, or 'all'. */
  accountId: string
  /** One day (YYYY-MM-DD) picked from the bars, or ''. */
  day: string
  q: string
}
export const defaultFilters = (month: string): ActFilters => ({ month, kind: 'all', category: 'all', accountId: 'all', day: '', q: '' })
/** How many filters narrow the list beyond the month (used for the Clear filters button). */
export const activeFilterCount = (f: ActFilters) => [f.kind !== 'all', f.category !== 'all', f.accountId !== 'all', !!f.day, !!f.q.trim()].filter(Boolean).length

export interface Names { account: (id?: string) => string; category: (key?: string) => string }
const round = (n: number) => Math.round(n * 100) / 100

/**
 * Does an entry match what was asked for? A search is split into words and every word must appear somewhere: in the title,
 * the category, the account name or the amount (a typed "1,200" matches 1200).
 */
export function matches(t: ActTxn, f: ActFilters, names: Names): boolean {
  if (f.month !== 'all' && !t.date.startsWith(f.month)) return false
  if (f.kind !== 'all' && t.kind !== f.kind) return false
  if (f.category !== 'all' && t.category !== f.category) return false
  if (f.accountId !== 'all' && (f.accountId === NO_ACCOUNT ? !!t.accountId : t.accountId !== f.accountId)) return false
  if (f.day && t.date !== f.day) return false
  const words = f.q.toLowerCase().split(/\s+/).map(w => w.replace(/,/g, '')).filter(Boolean)
  if (words.length) {
    const hay = [t.title, names.category(t.category), names.account(t.accountId), String(t.amount), t.kind === 'income' ? 'income money in' : ''].join(' ').toLowerCase()
    if (!words.every(w => hay.includes(w))) return false
  }
  return true
}
export const filterTxns = (txns: ActTxn[], f: ActFilters, names: Names) => txns.filter(t => matches(t, f, names))

export interface Summary { income: number; expense: number; net: number; count: number }
export function summarize(txns: ActTxn[]): Summary {
  let income = 0, expense = 0
  for (const t of txns) { if (t.kind === 'income') income += t.amount; else expense += t.amount }
  return { income: round(income), expense: round(expense), net: round(income - expense), count: txns.length }
}

export interface DayGroup { date: string; items: ActTxn[]; income: number; expense: number; net: number }
/** Newest day first. Entries keep their order within a day. */
export function groupByDay(txns: ActTxn[]): DayGroup[] {
  const by = new Map<string, ActTxn[]>()
  for (const t of txns) (by.get(t.date) ?? by.set(t.date, []).get(t.date)!).push(t)
  return [...by.entries()].sort((a, b) => b[0].localeCompare(a[0])).map(([date, items]) => { const s = summarize(items); return { date, items, income: s.income, expense: s.expense, net: s.net } })
}

/** Keeps the first `max` entries across the groups (cutting a day in the middle if needed), so a long history is shown a page at a time. */
export function limitGroups(groups: DayGroup[], max: number): { groups: DayGroup[]; shown: number; total: number } {
  const total = groups.reduce((s, g) => s + g.items.length, 0)
  const out: DayGroup[] = []
  let left = max
  for (const g of groups) {
    if (left <= 0) break
    const items = g.items.slice(0, left)
    left -= items.length
    out.push(items.length === g.items.length ? g : { ...g, items, ...(() => { const s = summarize(g.items); return { income: s.income, expense: s.expense, net: s.net } })() }) // a day's totals always cover the whole day
  }
  return { groups: out, shown: Math.min(max, total), total }
}

export interface Bar { date: string; day: number; expense: number; income: number }
/** One bar per day of a month, for the spending strip. `month` is YYYY-MM. */
export function dailyBars(txns: ActTxn[], month: string): { bars: Bar[]; max: number } {
  const [y = 0, m = 1] = month.split('-').map(Number)
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const bars: Bar[] = Array.from({ length: days }, (_, i) => ({ date: `${month}-${String(i + 1).padStart(2, '0')}`, day: i + 1, expense: 0, income: 0 }))
  for (const t of txns) {
    if (!t.date.startsWith(month)) continue
    const b = bars[Number(t.date.slice(8, 10)) - 1]
    if (b) { if (t.kind === 'income') b.income = round(b.income + t.amount); else b.expense = round(b.expense + t.amount) }
  }
  return { bars, max: Math.max(0, ...bars.map(b => b.expense)) }
}
