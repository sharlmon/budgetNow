import { describe, expect, it } from 'vitest'
import { MAX_MONTHS, comparePlans, formatDuration, monthsFromNow, simulatePayoff, type PlanDebt } from '../app/utils/payoff'

const d = (id: string, balance: number, apr: number, minPayment: number): PlanDebt => ({ id, name: id, balance, apr, minPayment })

/** Independent, deliberately plain reference: one debt, float math. */
function reference(balance: number, apr: number, pay: number) {
  let b = balance, interest = 0, n = 0
  while (b > 0.005 && n < 1000) { const i = b * apr / 1200; interest += i; b += i; b -= Math.min(pay, b); n++ }
  return { months: n, interest }
}

describe('hand-checkable cases', () => {
  it('0% interest: $300 at $100 a month is 3 months and no interest', () => {
    const r = simulatePayoff([d('a', 300, 0, 100)], 0, 'avalanche')
    expect(r.months).toBe(3)
    expect(r.totalInterest).toBe(0)
    expect(r.totalPaid).toBe(300)
    expect(r.neverPaysOff).toBe(false)
  })
  it('one month of interest is exact: $1,200 at 12% APR earns $12 in month one', () => {
    const r = simulatePayoff([d('a', 1200, 12, 1212)], 0, 'snowball')
    expect(r.months).toBe(1)
    expect(r.totalInterest).toBe(12)
    expect(r.totalPaid).toBe(1212)
  })
  it('extra money shortens a plan by the right amount', () => {
    expect(simulatePayoff([d('a', 300, 0, 100)], 100, 'avalanche').months).toBe(2)
    expect(simulatePayoff([d('a', 300, 0, 100)], 200, 'avalanche').months).toBe(1)
  })
})

describe('matches an independent reference calculation', () => {
  for (const [bal, apr, pay] of [[1000, 12, 100], [5000, 19.9, 150], [12500, 6.5, 300], [800, 29.99, 60], [20000, 4.25, 450]] as const) {
    it(`$${bal} at ${apr}% paying $${pay}`, () => {
      const ref = reference(bal, apr, pay)
      const r = simulatePayoff([d('a', bal, apr, pay)], 0, 'snowball')
      expect(r.months).toBe(ref.months)
      expect(Math.abs(r.totalInterest - ref.interest)).toBeLessThan(0.5)
      expect(Math.abs(r.totalPaid - (bal + r.totalInterest))).toBeLessThan(0.011)
    })
  }
})

describe('strategies', () => {
  const debts = [d('card', 3000, 24.9, 90), d('car', 9000, 7.5, 220), d('phone', 400, 0, 40), d('loan', 6000, 12, 150)]

  it('snowball sends the extra to the smallest balance, avalanche to the highest rate', () => {
    // The strategies disagree here: smallest balance is the 0% phone, highest rate is the big card.
    const split = [d('phone', 400, 0, 40), d('loan', 3000, 8, 80), d('card', 9000, 25, 270)]
    const snow = simulatePayoff(split, 200, 'snowball'), aval = simulatePayoff(split, 200, 'avalanche')
    const month = (r: ReturnType<typeof simulatePayoff>, id: string) => r.order.find(o => o.id === id)!.month
    expect(month(snow, 'phone')).toBeLessThan(month(aval, 'phone')) // snowball attacks the phone first
    expect(month(aval, 'card')).toBeLessThan(month(snow, 'card')) // avalanche attacks the 25% card first
    expect(month(snow, 'loan')).toBeLessThan(month(aval, 'loan'))
    expect(aval.totalInterest).toBeLessThan(snow.totalInterest) // and that is what saves money
    expect(snow.order).toHaveLength(3); expect(aval.order).toHaveLength(3)
  })
  it('both beat paying minimums only, and avalanche pays the least interest', () => {
    const { snowball, avalanche, minimums } = comparePlans(debts, 200)
    expect(avalanche.totalInterest).toBeLessThanOrEqual(snowball.totalInterest)
    expect(snowball.totalInterest).toBeLessThan(minimums.totalInterest)
    expect(avalanche.months).toBeLessThan(minimums.months)
  })
  it('rolls a cleared debt\'s minimum into the next one', () => {
    // Without rollover this would take as long as the slowest debt alone.
    const two = [d('small', 200, 0, 100), d('big', 1000, 0, 100)]
    expect(simulatePayoff(two, 0, 'snowball').months).toBe(6) // 2 months at 200/mo total, then 100 freed -> 200 a month on the rest
    expect(simulatePayoff(two, 0, 'minimums').months).toBe(10)
  })
  it('more extra money never makes things worse', () => {
    let prev = simulatePayoff(debts, 0, 'avalanche')
    for (const extra of [25, 50, 100, 250, 500, 1000]) {
      const next = simulatePayoff(debts, extra, 'avalanche')
      expect(next.months).toBeLessThanOrEqual(prev.months)
      expect(next.totalInterest).toBeLessThanOrEqual(prev.totalInterest + 0.01)
      prev = next
    }
  })
  it('avalanche never costs meaningfully more interest than snowball (300 random portfolios)', () => {
    let seed = 42
    const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296
    for (let t = 0; t < 300; t++) {
      const n = 2 + Math.floor(rnd() * 4)
      const ds = Array.from({ length: n }, (_, i) => { const bal = Math.round(200 + rnd() * 20000); return d('d' + i, bal, Math.round(rnd() * 3000) / 100, Math.round(bal * (0.015 + rnd() * 0.03))) })
      const extra = Math.round(rnd() * 400)
      const s = simulatePayoff(ds, extra, 'snowball'), a = simulatePayoff(ds, extra, 'avalanche')
      expect(a.totalInterest, JSON.stringify({ ds, extra })).toBeLessThanOrEqual(s.totalInterest + 0.05)
      expect(Math.abs(a.totalPaid - (ds.reduce((x, y) => x + y.balance, 0) + a.totalInterest))).toBeLessThan(0.02)
    }
  })
})

describe('edge cases', () => {
  it('a minimum that does not cover the interest never pays off, and says so', () => {
    const r = simulatePayoff([d('a', 10000, 24, 100)], 0, 'avalanche') // interest is $200 a month
    expect(r.neverPaysOff).toBe(true)
    expect(r.months).toBe(MAX_MONTHS)
  })
  it('extra money can rescue a plan whose minimum is too small', () => {
    const r = simulatePayoff([d('a', 10000, 24, 100)], 500, 'avalanche')
    expect(r.neverPaysOff).toBe(false)
  })
  it('no debts, paid-off debts and bad inputs are handled quietly', () => {
    expect(simulatePayoff([], 100, 'snowball')).toMatchObject({ months: 0, totalInterest: 0, neverPaysOff: false })
    expect(simulatePayoff([d('a', 0, 20, 50)], 0, 'avalanche').months).toBe(0)
    const odd = simulatePayoff([d('a', 500, NaN as any, 100), d('b', -50, 10, 10)], -100, 'snowball')
    expect(odd.months).toBe(5)
    expect(Number.isFinite(odd.totalInterest)).toBe(true)
  })
  it('a debt with no minimum is paid by extra money only', () => {
    expect(simulatePayoff([d('a', 500, 0, 0)], 0, 'avalanche').neverPaysOff).toBe(true)
    expect(simulatePayoff([d('a', 500, 0, 0)], 250, 'avalanche').months).toBe(2)
  })
})

describe('display helpers', () => {
  it('formats durations and dates', () => {
    expect(formatDuration(0)).toBe('0 mo'); expect(formatDuration(7)).toBe('7 mo'); expect(formatDuration(12)).toBe('1 yr')
    expect(formatDuration(26)).toBe('2 yrs 2 mo')
    expect(monthsFromNow(3, new Date(2026, 10, 15))).toBe('Feb 2027')
    expect(monthsFromNow(0, new Date(2026, 0, 31))).toBe('Jan 2026')
  })
})
