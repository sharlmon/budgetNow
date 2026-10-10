import { describe, expect, it } from 'vitest'
import { buildRunway, spendable, type RunwayBill } from '../app/utils/runway'

const TODAY = '2026-10-10'
const bill = (id: string, name: string, amount: number, nextDue: string, every: RunwayBill['every'] = 'month'): RunwayBill =>
  ({ id, name, amount, every, nextDue, anchorDay: Number(nextDue.slice(8)), category: 'needs' })
const cash = (balance: number) => ({ kind: 'mobile' as const, balance })
const run = (over: any = {}) => buildRunway({ today: TODAY, days: 30, accounts: [cash(10000)], bills: [], ...over })

describe('what counts as money you can spend', () => {
  it('adds up every account except investments', () => {
    expect(spendable([{ kind: 'mobile', balance: 100 }, { kind: 'bank', balance: 200 }, { kind: 'cash', balance: 50 }, { kind: 'invest', balance: 99999 }])).toBe(350)
  })
  it('is unknown (not zero) when there is no spendable account at all', () => {
    expect(spendable([])).toBeNull(); expect(spendable([{ kind: 'invest', balance: 5 }])).toBeNull()
  })
})

describe('the runway', () => {
  it('is clear when nothing is due in the window', () => {
    const r = run({ bills: [bill('a', 'Rent', 5000, '2026-12-01')] })
    expect(r.status).toBe('clear'); expect(r.items).toEqual([]); expect(r.due).toBe(0)
  })
  it('is covered when the money outlasts the bills, and says what is left', () => {
    const r = run({ bills: [bill('a', 'Rent', 3000, '2026-10-12'), bill('b', 'Internet', 1000, '2026-10-20')] })
    expect(r.status).toBe('covered'); expect(r.due).toBe(4000); expect(r.endBalance).toBe(6000)
    expect(r.items.map(i => i.kind === 'bill' && i.after)).toEqual([7000, 6000])
    expect(r.firstShort).toBeNull(); expect(r.lowest).toEqual({ date: '2026-10-20', balance: 6000 })
  })
  it('is tight when it is covered but the lowest point is under 15% of what you have', () => {
    const r = run({ bills: [bill('a', 'Rent', 9000, '2026-10-12')] }) // 1,000 left of 10,000
    expect(r.status).toBe('tight'); expect(r.endBalance).toBe(1000)
    expect(run({ bills: [bill('a', 'Rent', 8400, '2026-10-12')] }).status).toBe('covered') // 1,600 left is 16%
  })
  it('is short, and names the first bill it cannot pay and how far below zero it gets', () => {
    const r = run({ bills: [bill('a', 'Rent', 8000, '2026-10-12'), bill('b', 'Electricity', 4000, '2026-10-18'), bill('c', 'Water', 1000, '2026-10-25')] })
    expect(r.status).toBe('short')
    expect(r.firstShort).toEqual({ date: '2026-10-18', name: 'Electricity', below: 3000 }) // 10,000 - 8,000 - 4,000 - 1,000 = -3,000 at worst
    const flags = r.items.map(i => i.kind === 'bill' && i.short)
    expect(flags).toEqual([false, true, true])
  })
  it('counts a late bill as due now, and keeps its real date for display', () => {
    const r = run({ bills: [bill('a', 'Rent', 2000, '2026-10-07'), bill('b', 'Internet', 500, '2026-10-11')] })
    const first = r.items[0]!
    expect(first).toMatchObject({ kind: 'bill', name: 'Rent', overdue: true, date: '2026-10-07', after: 8000 })
    expect(r.series[1]).toEqual({ day: 0, balance: 8000 }) // a late bill takes its money today
  })
  it('lists a repeating bill every time it falls in the window', () => {
    const r = run({ days: 30, bills: [bill('w', 'Gym', 100, '2026-10-12', 'week')] })
    expect(r.items.filter(i => i.kind === 'bill')).toHaveLength(5) // 12, 19, 26 Oct, 2, 9 Nov
    expect(r.due).toBe(500)
  })
  it('respects the window length', () => {
    const bills = [bill('a', 'Rent', 100, '2026-10-20'), bill('b', 'Late', 100, '2026-11-05')]
    expect(run({ days: 14, bills }).items).toHaveLength(1)
    expect(run({ days: 30, bills }).items).toHaveLength(2)
  })
  it('does not use investments to cover bills', () => {
    const r = buildRunway({ today: TODAY, days: 30, accounts: [{ kind: 'invest', balance: 999999 }, cash(1000)], bills: [bill('a', 'Rent', 5000, '2026-10-12')] })
    expect(r.available).toBe(1000); expect(r.status).toBe('short')
  })
  it('is unknown, but still lists the bills, when there is no spendable account', () => {
    const r = buildRunway({ today: TODAY, days: 30, accounts: [], bills: [bill('a', 'Rent', 5000, '2026-10-12')] })
    expect(r.status).toBe('unknown'); expect(r.available).toBeNull(); expect(r.due).toBe(5000)
    expect(r.items[0]).toMatchObject({ after: null, short: false }); expect(r.series).toEqual([])
  })
  it('puts bills in date order, bigger first on the same day', () => {
    const r = run({ bills: [bill('a', 'B small', 100, '2026-10-15'), bill('b', 'A big', 900, '2026-10-15'), bill('c', 'Early', 50, '2026-10-12')] })
    expect(r.items.map(i => i.name)).toEqual(['Early', 'A big', 'B small'])
  })
  it('adds goal deadlines in the window, after bills on the same day, and ignores finished or distant ones', () => {
    const goals = [
      { id: 'g1', name: 'Laptop', target: 1000, saved: 400, deadline: '2026-10-15' },
      { id: 'g2', name: 'Done', target: 100, saved: 100, deadline: '2026-10-15' },
      { id: 'g3', name: 'Far', target: 100, saved: 0, deadline: '2027-06-01' },
      { id: 'g4', name: 'Past', target: 100, saved: 0, deadline: '2026-10-01' },
      { id: 'g5', name: 'None', target: 100, saved: 0 },
    ]
    const r = run({ goals, bills: [bill('a', 'Rent', 100, '2026-10-15')] })
    expect(r.items.map(i => `${i.kind}:${i.name}`)).toEqual(['bill:Rent', 'goal:Laptop'])
    expect(r.items[1]).toMatchObject({ left: 600 })
    expect(r.due).toBe(100) // goal deadlines do not take money by themselves
  })
  it('gives the chart a starting point and one point per bill', () => {
    const r = run({ bills: [bill('a', 'Rent', 3000, '2026-10-12'), bill('b', 'Internet', 1000, '2026-10-20')] })
    expect(r.series).toEqual([{ day: 0, balance: 10000 }, { day: 2, balance: 7000 }, { day: 10, balance: 6000 }])
  })
  it('keeps cents exact', () => {
    const r = run({ accounts: [cash(100.1)], bills: [bill('a', 'X', 0.2, '2026-10-12'), bill('b', 'Y', 0.1, '2026-10-13')] })
    expect(r.endBalance).toBe(99.8); expect(r.due).toBe(0.3)
  })
})
