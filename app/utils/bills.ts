export type Every = 'week' | 'month' | 'year'

const pad = (n: number) => String(n).padStart(2, '0')
const parts = (d: string) => d.split('-').map(Number) as [number, number, number]
const dim = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate() // days in month m (1-12)
const utc = (d: string) => { const [y, m, dd] = parts(d); return Date.UTC(y, m - 1, dd) }

/** Day of month a monthly/yearly bill is anchored to (so a bill due on the 31st returns to the 31st after short months). */
export const anchorOf = (d: string) => parts(d)[2]

/** The due date one period after `due`. Months/years clamp to the month's last day, weeks add exactly 7 days. */
export function addPeriod(due: string, every: Every, anchor = anchorOf(due)): string {
  const [y, m, d] = parts(due)
  if (every === 'week') return new Date(Date.UTC(y, m - 1, d + 7)).toISOString().slice(0, 10)
  if (every === 'month') {
    const ny = m === 12 ? y + 1 : y, nm = m === 12 ? 1 : m + 1
    return `${ny}-${pad(nm)}-${pad(Math.min(anchor, dim(ny, nm)))}`
  }
  const ny = y + 1
  return `${ny}-${pad(m)}-${pad(Math.min(anchor, dim(ny, m)))}`
}

/** Every due date from `due` up to and including `until` (capped so a stale bill can't flood). */
export function occurrencesUntil(due: string, every: Every, anchor: number, until: string, cap = 60): string[] {
  const out: string[] = []
  let cur = due
  while (cur <= until && out.length < cap) { out.push(cur); cur = addPeriod(cur, every, anchor) }
  return out
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export const daysBetween = (from: string, to: string) => Math.round((utc(to) - utc(from)) / 86400000)

/** What a bill costs per month on average. */
export const monthlyEquivalent = (amount: number, every: Every) => (every === 'week' ? (amount * 52) / 12 : every === 'year' ? amount / 12 : amount)

export const endOfMonth = (d: string) => { const [y, m] = parts(d); return `${y}-${pad(m)}-${pad(dim(y, m))}` }
export const addDays = (d: string, n: number) => { const [y, m, dd] = parts(d); return new Date(Date.UTC(y, m - 1, dd + n)).toISOString().slice(0, 10) }
