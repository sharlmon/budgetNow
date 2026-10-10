import { describe, expect, it } from 'vitest'
import { planAccountChange, scaleSplit } from '../app/utils/edit'

const accts = [{ id: 'm', name: 'M-Pesa', balance: 1000 }, { id: 'b', name: 'Bank', balance: 5000 }]

describe('editing an expense that came out of an account', () => {
  it('a bigger amount on the same account takes only the difference', () => {
    expect(planAccountChange('expense', { accountId: 'm', amount: 200 }, { accountId: 'm', amount: 500 }, accts)).toEqual({ deltas: { m: -300 } })
  })
  it('a smaller amount gives the difference back', () => {
    expect(planAccountChange('expense', { accountId: 'm', amount: 500 }, { accountId: 'm', amount: 200 }, accts)).toEqual({ deltas: { m: 300 } })
  })
  it('an unchanged entry changes nothing', () => {
    expect(planAccountChange('expense', { accountId: 'm', amount: 200 }, { accountId: 'm', amount: 200 }, accts)).toEqual({ deltas: {} })
  })
  it('moving it to another account returns the money and takes it from the new one', () => {
    expect(planAccountChange('expense', { accountId: 'm', amount: 200 }, { accountId: 'b', amount: 200 }, accts)).toEqual({ deltas: { m: 200, b: -200 } })
  })
  it('taking it off an account returns the money; putting it on one takes it', () => {
    expect(planAccountChange('expense', { accountId: 'm', amount: 200 }, { amount: 200 }, accts)).toEqual({ deltas: { m: 200 } })
    expect(planAccountChange('expense', { amount: 200 }, { accountId: 'b', amount: 200 }, accts)).toEqual({ deltas: { b: -200 } })
  })
  it('refuses a new amount the account cannot cover, saying by how much', () => {
    expect(planAccountChange('expense', { accountId: 'm', amount: 200 }, { accountId: 'm', amount: 1500 }, accts)).toEqual({ error: { account: 'M-Pesa', short: 300 } })
  })
  it('counts the money being given back when judging the new amount', () => {
    // M-Pesa has 1,000 and 800 of the old 900 came from it: the entry can grow to 1,900 in total
    const a = [{ id: 'm', name: 'M-Pesa', balance: 1000 }]
    expect(planAccountChange('expense', { accountId: 'm', amount: 900 }, { accountId: 'm', amount: 1900 }, a)).toEqual({ deltas: { m: -1000 } })
    expect(planAccountChange('expense', { accountId: 'm', amount: 900 }, { accountId: 'm', amount: 1901 }, a)).toEqual({ error: { account: 'M-Pesa', short: 1 } })
  })
})

describe('editing an income that went into an account', () => {
  it('a bigger amount adds the difference', () => expect(planAccountChange('income', { accountId: 'b', amount: 1000 }, { accountId: 'b', amount: 1500 }, accts)).toEqual({ deltas: { b: 500 } }))
  it('a smaller amount takes the difference back out', () => expect(planAccountChange('income', { accountId: 'b', amount: 1000 }, { accountId: 'b', amount: 400 }, accts)).toEqual({ deltas: { b: -600 } }))
  it('refuses to take back money the account no longer has', () => {
    expect(planAccountChange('income', { accountId: 'm', amount: 5000 }, { accountId: 'm', amount: 100 }, accts)).toEqual({ error: { account: 'M-Pesa', short: 3900 } })
  })
  it('moving it to another account takes it from the old one and adds it to the new one', () => {
    expect(planAccountChange('income', { accountId: 'b', amount: 1000 }, { accountId: 'm', amount: 1000 }, accts)).toEqual({ deltas: { b: -1000, m: 1000 } })
  })
})

describe('entries whose account was deleted', () => {
  it('has no effect to undo and none to apply', () => {
    expect(planAccountChange('expense', { accountId: 'gone', amount: 200 }, { accountId: 'gone', amount: 300 }, accts)).toEqual({ deltas: {} })
    expect(planAccountChange('expense', { accountId: 'gone', amount: 200 }, { accountId: 'b', amount: 300 }, accts)).toEqual({ deltas: { b: -300 } })
  })
})

describe('scaling an income split to a new amount', () => {
  const split = { needs: 500, wants: 300, savings: 200, debt: 0 }
  it('keeps the proportions', () => expect(scaleSplit(split, 1000, 2000)).toEqual({ needs: 1000, wants: 600, savings: 400, debt: 0 }))
  it('always adds up to exactly the new total, even when rounding would leave a cent over or under', () => {
    const odd = scaleSplit({ needs: 333.33, wants: 333.33, savings: 333.34, debt: 0 }, 1000, 100)
    expect(Math.round((odd.needs + odd.wants + odd.savings + odd.debt) * 100) / 100).toBe(100)
    for (const total of [1, 7, 99.99, 12345.67]) {
      const s = scaleSplit({ needs: 123.45, wants: 67.89, savings: 10.01, debt: 5 }, 206.35, total)
      expect(Math.round((s.needs + s.wants + s.savings + s.debt) * 100) / 100, String(total)).toBe(total)
    }
  })
  it('never makes a part negative', () => { for (const v of Object.values(scaleSplit(split, 1000, 0.01))) expect(v).toBeGreaterThanOrEqual(0) })
  it('puts everything in the first part when the old total was zero', () => expect(scaleSplit({ needs: 0, wants: 0, savings: 0, debt: 0 }, 0, 50)).toEqual({ needs: 50, wants: 0, savings: 0, debt: 0 }))
})
