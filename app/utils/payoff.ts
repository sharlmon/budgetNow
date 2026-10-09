// Debt payoff simulation. Money is handled in whole cents so rounding never drifts.

export interface PlanDebt { id: string; name: string; balance: number; /** Annual percentage rate, e.g. 19.9 */ apr: number; minPayment: number }
export type Strategy = 'snowball' | 'avalanche' | 'minimums'

export interface PayoffResult {
  strategy: Strategy
  /** Months until every debt is paid (or MAX_MONTHS when they never are). */
  months: number
  totalInterest: number
  totalPaid: number
  /** True when, at this budget, at least one debt is still unpaid after MAX_MONTHS (minimum below the interest). */
  neverPaysOff: boolean
  /** The month each debt reaches zero, in the order they are cleared. */
  order: { id: string; name: string; month: number }[]
}

export const MAX_MONTHS = 600
const cents = (n: number) => Math.round((Number.isFinite(n) ? Math.max(0, n) : 0) * 100)

/**
 * Month by month: interest is added to each debt, every debt gets its minimum, and the rest of the monthly budget
 * (the extra amount plus the minimums of debts already cleared, when `rollover` applies) goes to the target debt first.
 *  - snowball: smallest balance first
 *  - avalanche: highest interest rate first
 *  - minimums: pay only the minimums, no extra and no rollover (the baseline to compare against)
 */
export function simulatePayoff(debts: PlanDebt[], extraPerMonth: number, strategy: Strategy): PayoffResult {
  const live = debts
    .map(d => ({ id: d.id, name: d.name, bal: cents(d.balance), apr: Math.max(0, Number(d.apr) || 0), min: cents(d.minPayment) }))
    .filter(d => d.bal > 0)

  const priority = [...live]
  if (strategy === 'snowball') priority.sort((a, b) => a.bal - b.bal || b.apr - a.apr)
  else if (strategy === 'avalanche') priority.sort((a, b) => b.apr - a.apr || a.bal - b.bal)

  const rollover = strategy !== 'minimums'
  const extra = strategy === 'minimums' ? 0 : cents(extraPerMonth)
  const budget = live.reduce((s, d) => s + d.min, 0) + extra

  let totalInterest = 0, totalPaid = 0, month = 0
  const order: PayoffResult['order'] = []

  while (live.some(d => d.bal > 0) && month < MAX_MONTHS) {
    month++
    for (const d of live) if (d.bal > 0) { const i = Math.round((d.bal * d.apr) / 1200); d.bal += i; totalInterest += i }

    let pool = rollover ? budget : 0
    // Minimums first. Without rollover each debt simply keeps paying its own minimum.
    for (const d of live) {
      if (d.bal <= 0) continue
      const pay = Math.min(d.min, d.bal)
      d.bal -= pay; totalPaid += pay
      if (rollover) pool -= pay
      if (d.bal === 0) order.push({ id: d.id, name: d.name, month })
    }
    // Whatever is left of the budget attacks the target debt, then the next one.
    if (rollover) for (const t of priority) {
      if (pool <= 0) break
      if (t.bal <= 0) continue
      const pay = Math.min(pool, t.bal)
      t.bal -= pay; pool -= pay; totalPaid += pay
      if (t.bal === 0) order.push({ id: t.id, name: t.name, month })
    }
  }

  const neverPaysOff = live.some(d => d.bal > 0)
  return { strategy, months: month, totalInterest: totalInterest / 100, totalPaid: totalPaid / 100, neverPaysOff, order }
}

/** All three plans for the same debts and budget, plus how much the best one saves over minimums only. */
export function comparePlans(debts: PlanDebt[], extraPerMonth: number) {
  const snowball = simulatePayoff(debts, extraPerMonth, 'snowball')
  const avalanche = simulatePayoff(debts, extraPerMonth, 'avalanche')
  const minimums = simulatePayoff(debts, 0, 'minimums')
  return { snowball, avalanche, minimums }
}

/** "Mar 2028": the calendar month `months` from `from`. */
export function monthsFromNow(months: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth() + months, 1)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export const formatDuration = (months: number) => {
  const y = Math.floor(months / 12), m = months % 12
  return [y ? `${y} yr${y > 1 ? 's' : ''}` : '', m ? `${m} mo` : ''].filter(Boolean).join(' ') || '0 mo'
}
