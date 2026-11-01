import { describe, expect, it } from 'vitest'
import { billReserve, proposals, ruleProblem, type SweepRule } from '../app/utils/sweep'

const rule = (o: Partial<SweepRule> = {}): SweepRule => ({ id: 'r1', fromId: 'm', toId: 'f', keep: 5000, billDays: 0, min: 100, auto: false, on: true, ...o })
const accounts = [{ id: 'm', balance: 12_000 }, { id: 'f', balance: 40_000 }]
const rent = { amount: 8000, every: 'month' as const, nextDue: '2026-11-05', anchorDay: 5 }

describe('what bills hold back', () => {
  it('is nothing when bills are ignored', () => expect(billReserve([rent], 'm', '2026-11-01', 0)).toBe(0))
  it('counts a bill due inside the window', () => expect(billReserve([rent], 'm', '2026-11-01', 7)).toBe(8000))
  it('skips a bill due after the window', () => expect(billReserve([rent], 'm', '2026-11-01', 3)).toBe(0))
  it('counts an overdue bill', () => expect(billReserve([{ ...rent, nextDue: '2026-10-28' }], 'm', '2026-11-01', 3)).toBe(8000))
  it('counts a weekly bill every time it falls due', () => expect(billReserve([{ amount: 500, every: 'week', nextDue: '2026-11-02', anchorDay: 2 }], 'm', '2026-11-01', 15)).toBe(1000 + 500))
  it('ignores a bill paid from another account, and counts one with no account', () => {
    expect(billReserve([{ ...rent, accountId: 'bank' }], 'm', '2026-11-01', 7)).toBe(0)
    expect(billReserve([{ ...rent, accountId: 'm' }], 'm', '2026-11-01', 7)).toBe(8000)
  })
})

describe('what a rule would move', () => {
  it('sweeps everything above the amount to keep', () => {
    expect(proposals([rule()], accounts, [], '2026-11-01')).toEqual([{ rule: rule(), amount: 7000, reserve: 0 }])
  })
  it('holds back what upcoming bills need on top of the amount to keep', () => {
    const [p] = proposals([rule({ billDays: 7, keep: 1000 })], accounts, [rent], '2026-11-01')
    expect(p).toMatchObject({ amount: 3000, reserve: 8000 })
  })
  it('does nothing when there is nothing above the line', () => {
    expect(proposals([rule({ keep: 12_000 })], accounts, [], '2026-11-01')).toEqual([])
    expect(proposals([rule({ keep: 20_000 })], accounts, [], '2026-11-01')).toEqual([])
  })
  it('does nothing below the smallest sweep worth making', () => {
    expect(proposals([rule({ keep: 11_950, min: 100 })], accounts, [], '2026-11-01')).toEqual([])
  })
  it('skips a rule that is off or points at a missing account', () => {
    expect(proposals([rule({ on: false }), rule({ toId: 'gone' })], accounts, [], '2026-11-01')).toEqual([])
  })
  it('lets two rules on one account share the money instead of spending it twice', () => {
    const accs = [...accounts, { id: 's', balance: 0 }]
    const out = proposals([rule({ id: 'a', keep: 5000 }), rule({ id: 'b', toId: 's', keep: 5000 })], accs, [], '2026-11-01')
    expect(out.map(p => p.amount)).toEqual([7000])
  })
})

describe('saving a rule', () => {
  const ok = { fromId: 'm', toId: 'f', keep: 5000, min: 100, billDays: 7 }
  it('accepts a good rule', () => expect(ruleProblem(ok)).toBeNull())
  it('needs two different accounts', () => {
    expect(ruleProblem({ ...ok, toId: '' })).toMatch(/both/)
    expect(ruleProblem({ ...ok, toId: 'm' })).toMatch(/different/)
  })
  it('rejects negative amounts and silly day counts', () => {
    expect(ruleProblem({ ...ok, keep: -1 })).toMatch(/keep/)
    expect(ruleProblem({ ...ok, min: -1 })).toMatch(/smallest/)
    expect(ruleProblem({ ...ok, billDays: 90 })).toMatch(/Days/)
    expect(ruleProblem({ ...ok, billDays: 2.5 })).toMatch(/Days/)
  })
})
