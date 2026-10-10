import { describe, expect, it } from 'vitest'
import { buildBackup, parseBackup } from '../app/utils/backup'

const state: any = {
  incomes: [{ id: 'a', label: 'Salary', amount: 3200, date: '2026-10-01', split: { needs: 1500, wants: 900, savings: 640, debt: 160 } }],
  expenses: [
    { id: 'e', label: 'Rent', amount: 1200, category: 'needs', date: '2026-10-02' },
    { id: 'p', label: 'Pay', amount: 160, category: 'debt', date: '2026-10-03', debtId: 'z', billId: 'b2' },
  ],
  debts: [{ id: 'z', name: 'Loan', balance: 2400, original: 3000, minPayment: 160 }],
  bills: [
    { id: 'b1', name: 'Rent', amount: 1200, category: 'needs', every: 'month', nextDue: '2026-11-01', anchorDay: 1, auto: true },
    { id: 'b2', name: 'Loan', amount: 160, category: 'debt', every: 'month', nextDue: '2026-10-30', anchorDay: 30, auto: false, debtId: 'z' },
  ],
  accounts: [{ id: 'm', name: 'M-Pesa', kind: 'mobile', balance: 4200.5, color: '#2fa05a' }, { id: 'f', name: 'Money market fund', kind: 'invest', balance: 85000, color: '#e6a321', rate: 14.1 }],
  goals: [{ id: 'g', name: 'Deposit', target: 1500, icon: 'house', color: '#5b8def', deadline: '2027-01-15', contributions: [{ id: 'c', amount: 600, date: '2026-10-04' }] }],
}
const canon = (v: any): any => Array.isArray(v) ? v.map(canon) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canon(v[k])])) : v
const wrap = (data: any, extra: any = {}) => JSON.stringify({ app: 'budgetnow', version: 1, data, ...extra })

describe('backup file parsing', () => {
  it('round-trips everything, including currency and name', () => {
    const r: any = parseBackup(JSON.stringify(buildBackup(state, 'ZAR', 'Sharl')))
    expect(r.ok).toBe(true)
    expect(r.skipped).toBe(0)
    expect(canon(r.data)).toEqual(canon(state))
    expect(r.currency).toBe('ZAR')
    expect(r.name).toBe('Sharl')
  })

  it('carries the split rule and drops an invalid one', () => {
    const good: any = parseBackup(JSON.stringify(buildBackup(state, 'USD', '', { needs: 60, wants: 20, savings: 20 })))
    expect(good.split).toEqual({ needs: 60, wants: 20, savings: 20 })
    const noSplit: any = parseBackup(JSON.stringify(buildBackup(state, 'USD', '')))
    expect(noSplit.split).toBeUndefined()
    for (const bad of [{ needs: 60, wants: 60, savings: 60 }, { needs: 'a', wants: 1, savings: 1 }, { needs: 50.5, wants: 29.5, savings: 20 }]) {
      expect(parseBackup(wrap(state, { split: bad }) ).ok && (parseBackup(wrap(state, { split: bad })) as any).split).toBeUndefined()
    }
  })

  it('keeps a debt interest rate and drops an invalid one', () => {
    const withRate: any = { ...state, debts: [{ id: 'z', name: 'Card', balance: 100, minPayment: 5, apr: 19.9 }, { id: 'y', name: 'Bad', balance: 100, minPayment: 5, apr: 250 }, { id: 'x', name: 'Text', balance: 100, minPayment: 5, apr: '9' }] }
    const r: any = parseBackup(JSON.stringify(buildBackup(withRate, 'USD', '')))
    expect(r.data.debts.map((d: any) => d.apr)).toEqual([19.9, undefined, undefined])
    expect(r.skipped).toBe(0) // an unreadable rate does not discard the whole debt
  })

  it('rejects files that are not a Weka backup', () => {
    expect(parseBackup('not json').ok).toBe(false)
    expect(parseBackup('{"hello":1}').ok).toBe(false)
    expect(parseBackup('[1,2]').ok).toBe(false)
    expect(parseBackup(wrap(state, { version: 99 })).ok).toBe(false)
  })

  it('skips and counts bad records instead of trusting them', () => {
    const r: any = parseBackup(wrap({
      incomes: [{ amount: 'x' }, { id: 'a', amount: -5, date: '2026-10-01', split: {} }],
      expenses: [{ id: 'e', amount: 5, date: '2026-13-45', category: 'needs' }, { id: 'e2', amount: 5, date: '2026-10-05', category: 'hax', label: 'x' }, { id: 'e3', amount: 5, date: '2026-10-05', category: 'wants', debtId: 'ghost' }],
      debts: [{ name: '', balance: 1 }],
      goals: [{ name: 'g', target: 0 }],
    }, { currency: 'XXQ' }))
    expect(r.ok).toBe(true)
    expect(r.skipped).toBe(6)
    expect(r.data.expenses).toHaveLength(1)
    expect(r.data.expenses[0].debtId).toBeUndefined() // dangling reference dropped
    expect(r.currency).toBeUndefined() // not a real currency
  })

  it('de-duplicates ids and accepts an unwrapped state', () => {
    const split = { needs: 1, wants: 0, savings: 0, debt: 0 }
    const r: any = parseBackup(JSON.stringify({ incomes: [{ id: 'x', amount: 1, date: '2026-10-01', split }, { id: 'x', amount: 2, date: '2026-10-01', split }] }))
    expect(r.ok).toBe(true)
    expect(r.data.incomes[0].id).not.toBe(r.data.incomes[1].id)
  })

  it('validates bills: category, frequency, anchor, auto default, dangling links', () => {
    const r: any = parseBackup(wrap({
      debts: [],
      bills: [
        { id: 'q', name: 'x', amount: 5, category: 'savings', every: 'month', nextDue: '2026-10-01' },
        { id: 'r', name: 'y', amount: 5, category: 'debt', every: 'day', nextDue: '2026-10-01' },
        { id: 's', name: 'ok', amount: 5, category: 'debt', every: 'month', nextDue: '2026-10-31', debtId: 'ghost' },
      ],
      expenses: [{ id: 'e', amount: 1, date: '2026-10-01', category: 'needs', billId: 'nope' }],
    }))
    expect(r.skipped).toBe(2)
    expect(r.data.bills).toHaveLength(1)
    expect(r.data.bills[0]).toMatchObject({ anchorDay: 31, auto: false })
    expect(r.data.bills[0].debtId).toBeUndefined()
    expect(r.data.expenses[0].billId).toBeUndefined()
  })
})

describe('backup files and linked accounts', () => {
  it('restores a backup from before accounts existed, with no accounts', () => {
    const { accounts: _a, ...old } = state
    const r: any = parseBackup(wrap(old))
    expect(r.ok).toBe(true)
    expect(r.data.accounts).toEqual([])
  })
  it('skips accounts with a bad kind, a negative balance or no name, and keeps the good ones', () => {
    const bad = [{ id: '1', name: 'Ok', kind: 'bank', balance: 10 }, { id: '2', name: 'X', kind: 'crypto', balance: 1 }, { id: '3', name: 'Neg', kind: 'cash', balance: -5 }, { id: '4', name: '  ', kind: 'cash', balance: 1 }]
    const r: any = parseBackup(wrap({ ...state, accounts: bad }))
    expect(r.data.accounts.map((a: any) => a.name)).toEqual(['Ok'])
    expect(r.skipped).toBe(3)
  })
  it('gives a missing colour its kind colour and drops an impossible rate', () => {
    const r: any = parseBackup(wrap({ ...state, accounts: [{ id: '1', name: 'Fund', kind: 'invest', balance: 5, rate: 500 }] }))
    expect(r.data.accounts[0]).toMatchObject({ color: '#e6a321', rate: undefined })
  })
})
