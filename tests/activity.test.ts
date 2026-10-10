import { describe, expect, it } from 'vitest'
import { activeFilterCount, dailyBars, defaultFilters, filterTxns, groupByDay, limitGroups, NO_ACCOUNT, summarize, type ActTxn } from '../app/utils/activity'

const names = { account: (id?: string) => ({ a: 'M-Pesa', b: 'Equity Bank' } as Record<string, string>)[id ?? ''] ?? '', category: (k?: string) => ({ needs: 'Needs', wants: 'Wants', debt: 'Debt' } as Record<string, string>)[k ?? ''] ?? '' }
const t = (id: string, title: string, amount: number, date: string, o: Partial<ActTxn> = {}): ActTxn => ({ id, kind: 'expense', title, amount, date, ...o })
const data: ActTxn[] = [
  t('1', 'Salary', 85000, '2026-10-01', { kind: 'income', accountId: 'b' }),
  t('2', 'Rent', 25000, '2026-10-03', { category: 'needs', accountId: 'b' }),
  t('3', 'Lunch with Sam', 450, '2026-10-09', { category: 'wants', accountId: 'a' }),
  t('4', 'Supermarket', 3240.5, '2026-10-09', { category: 'needs' }),
  t('5', 'Payment: Loan', 1200, '2026-10-10', { category: 'debt', accountId: 'a' }),
  t('6', 'Rent', 25000, '2026-09-03', { category: 'needs', accountId: 'b' }),
]
const F = (o: any = {}) => ({ ...defaultFilters('2026-10'), ...o })
const ids = (f: any) => filterTxns(data, F(f), names).map(x => x.id)

describe('filtering', () => {
  it('shows one month, or everything', () => {
    expect(ids({})).toEqual(['1', '2', '3', '4', '5'])
    expect(ids({ month: '2026-09' })).toEqual(['6'])
    expect(ids({ month: 'all' })).toHaveLength(6)
  })
  it('narrows to money in or out', () => {
    expect(ids({ kind: 'income' })).toEqual(['1']); expect(ids({ kind: 'expense' })).toEqual(['2', '3', '4', '5'])
  })
  it('narrows to a category, which only expenses have', () => {
    expect(ids({ category: 'needs' })).toEqual(['2', '4']); expect(ids({ category: 'debt' })).toEqual(['5'])
  })
  it('narrows to an account, or to entries with no account', () => {
    expect(ids({ accountId: 'a' })).toEqual(['3', '5']); expect(ids({ accountId: 'b' })).toEqual(['1', '2'])
    expect(ids({ accountId: NO_ACCOUNT })).toEqual(['4'])
  })
  it('narrows to one day', () => expect(ids({ day: '2026-10-09' })).toEqual(['3', '4']))
  it('combines filters', () => expect(ids({ accountId: 'b', kind: 'expense', category: 'needs' })).toEqual(['2']))
})

describe('searching', () => {
  it('finds text in the title, ignoring case', () => expect(ids({ q: 'lunch' })).toEqual(['3']))
  it('finds a category name, an account name and the word income', () => {
    expect(ids({ q: 'wants' })).toEqual(['3']); expect(ids({ q: 'equity' })).toEqual(['1', '2']); expect(ids({ q: 'income' })).toEqual(['1'])
  })
  it('finds an amount, with or without a comma', () => {
    expect(ids({ q: '25000' })).toEqual(['2']); expect(ids({ q: '25,000' })).toEqual(['2']); expect(ids({ q: '3240.5' })).toEqual(['4'])
  })
  it('needs every word to match, in any order', () => {
    expect(ids({ q: 'rent equity' })).toEqual(['2']); expect(ids({ q: 'equity rent' })).toEqual(['2']); expect(ids({ q: 'rent lunch' })).toEqual([])
  })
  it('ignores extra spaces and an empty search', () => { expect(ids({ q: '   ' })).toHaveLength(5); expect(ids({ q: '  rent   ' })).toEqual(['2']) })
  it('works together with the other filters', () => expect(ids({ q: 'rent', month: 'all', accountId: 'b' })).toEqual(['2', '6']))
})

describe('summaries and groups', () => {
  it('adds up money in, money out and the net, to the cent', () => {
    expect(summarize(data.slice(0, 5))).toEqual({ income: 85000, expense: 29890.5, net: 55109.5, count: 5 })
    expect(summarize([])).toEqual({ income: 0, expense: 0, net: 0, count: 0 })
  })
  it('groups by day, newest first, with each day\'s totals', () => {
    const g = groupByDay(data.slice(0, 5))
    expect(g.map(x => x.date)).toEqual(['2026-10-10', '2026-10-09', '2026-10-03', '2026-10-01'])
    expect(g[1]).toMatchObject({ expense: 3690.5, income: 0, net: -3690.5 }); expect(g[1]!.items.map(i => i.id)).toEqual(['3', '4'])
    expect(g[3]).toMatchObject({ income: 85000, net: 85000 })
  })
  it('counts the active filters, ignoring the month', () => {
    expect(activeFilterCount(F())).toBe(0)
    expect(activeFilterCount(F({ kind: 'income', q: 'x', day: '2026-10-09', accountId: 'a', category: 'needs' }))).toBe(5)
    expect(activeFilterCount(F({ month: 'all' }))).toBe(0)
  })
})

describe('showing a page at a time', () => {
  const many = Array.from({ length: 10 }, (_, i) => t(String(i), 'x' + i, 10, i < 4 ? '2026-10-09' : '2026-10-08'))
  it('keeps the first entries and reports how many there are', () => {
    const r = limitGroups(groupByDay(many), 6)
    expect(r.shown).toBe(6); expect(r.total).toBe(10)
    expect(r.groups.flatMap(g => g.items)).toHaveLength(6)
  })
  it('cuts a day in the middle but keeps that day\'s totals for the whole day', () => {
    const r = limitGroups(groupByDay(many), 6)
    const second = r.groups[1]!
    expect(second.items).toHaveLength(2); expect(second.expense).toBe(60) // all six entries of that day
  })
  it('shows everything when there is room', () => { const r = limitGroups(groupByDay(many), 50); expect(r.shown).toBe(10); expect(r.groups).toHaveLength(2) })
})

describe('the daily bars', () => {
  it('has a bar for every day of the month, with spending and income added up', () => {
    const { bars, max } = dailyBars(data, '2026-10')
    expect(bars).toHaveLength(31); expect(bars[8]).toMatchObject({ date: '2026-10-09', expense: 3690.5 }); expect(bars[0]).toMatchObject({ income: 85000, expense: 0 })
    expect(max).toBe(25000)
  })
  it('handles short months and leap years', () => {
    expect(dailyBars([], '2026-02').bars).toHaveLength(28); expect(dailyBars([], '2028-02').bars).toHaveLength(29); expect(dailyBars([], '2026-04').bars).toHaveLength(30)
  })
  it('ignores other months, and an empty month has a zero maximum', () => {
    expect(dailyBars([t('x', 'y', 5, '2026-09-30')], '2026-10').max).toBe(0)
  })
})
