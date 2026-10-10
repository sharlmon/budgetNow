import { describe, expect, it } from 'vitest'
import { buildInsights, categoryChanges, cumulativeSeries, paceSummary, spendByAccount, topSpends, weekdayPattern, type AnExpense } from '../app/utils/insights'

const e = (label: string, amount: number, date: string, o: Partial<AnExpense> = {}): AnExpense => ({ label, amount, category: 'wants', date, ...o })
const fmt = (n: number) => `K${Math.round(n).toLocaleString('en-US')}`

describe('pace', () => {
  it('projects the month from the pace so far, and says under, on or over', () => {
    // day 10 of a 31-day October: 10,000 spent -> 31,000 projected
    expect(paceSummary({ month: '2026-10', today: '2026-10-10', spent: 10000, budget: 40000 })).toMatchObject({ status: 'under', projected: 31000, days: 31, elapsed: 10 })
    expect(paceSummary({ month: '2026-10', today: '2026-10-10', spent: 12000, budget: 40000 }).status).toBe('under') // 37,200 is below 95% of the budget (38,000)
    expect(paceSummary({ month: '2026-10', today: '2026-10-10', spent: 12500, budget: 40000 }).status).toBe('on')    // 38,750 is within 95% to 102%
    expect(paceSummary({ month: '2026-10', today: '2026-10-10', spent: 14000, budget: 40000 }).status).toBe('over')  // 43,400
  })
  it('measures against an even pace', () => {
    const p = paceSummary({ month: '2026-10', today: '2026-10-10', spent: 15500, budget: 31000 })
    expect(p.expected).toBe(10000); expect(p.aheadBy).toBe(5500)
  })
  it('waits a few days before projecting, because the rent lands on the 1st', () => {
    const p = paceSummary({ month: '2026-10', today: '2026-10-02', spent: 25000, budget: 40000 })
    expect(p.projected).toBeNull(); expect(p.status).toBe('early')
    expect(paceSummary({ month: '2026-10', today: '2026-10-02', spent: 45000, budget: 40000 }).status).toBe('over') // already past the budget is not early
    expect(paceSummary({ month: '2026-10', today: '2026-10-05', spent: 100, budget: 40000 }).projected).not.toBeNull()
  })
  it('says what can be spent each remaining day, today included', () => {
    expect(paceSummary({ month: '2026-10', today: '2026-10-22', spent: 20000, budget: 40000 }).perDayLeft).toBe(2000) // 20,000 over 10 days (22nd to 31st)
    expect(paceSummary({ month: '2026-10', today: '2026-10-22', spent: 45000, budget: 40000 }).perDayLeft).toBeNull()
  })
  it('treats a finished month as final, and a future month as not started', () => {
    expect(paceSummary({ month: '2026-09', today: '2026-10-10', spent: 39000, budget: 40000 })).toMatchObject({ status: 'on', projected: 39000, elapsed: 30, perDayLeft: null })
    expect(paceSummary({ month: '2026-09', today: '2026-10-10', spent: 50000, budget: 40000 }).status).toBe('over')
    expect(paceSummary({ month: '2026-11', today: '2026-10-10', spent: 0, budget: 40000 }).status).toBe('idle')
  })
  it('has nothing to compare with when there is no budget', () => expect(paceSummary({ month: '2026-10', today: '2026-10-10', spent: 500, budget: 0 }).status).toBe('nobudget'))
  it('copes with February in a leap year', () => expect(paceSummary({ month: '2028-02', today: '2028-03-05', spent: 100, budget: 290 }).days).toBe(29))
})

describe('the spending line', () => {
  it('adds up day by day and stops at today for the current month', () => {
    const s = cumulativeSeries([e('a', 100, '2026-10-01'), e('b', 50, '2026-10-01'), e('c', 200, '2026-10-03'), e('d', 999, '2026-09-30'), e('later', 7, '2026-10-20')], { month: '2026-10', today: '2026-10-04', budget: 3100 })
    expect(s.actual).toEqual([{ day: 0, value: 0 }, { day: 1, value: 150 }, { day: 2, value: 150 }, { day: 3, value: 350 }, { day: 4, value: 350 }])
    expect(s.ideal).toEqual([{ day: 0, value: 0 }, { day: 31, value: 3100 }]); expect(s.upTo).toBe(4)
  })
  it('covers the whole of a finished month, and none of a future one', () => {
    expect(cumulativeSeries([], { month: '2026-09', today: '2026-10-10', budget: 1 }).actual).toHaveLength(31) // 0 plus 30 days
    expect(cumulativeSeries([], { month: '2026-11', today: '2026-10-10', budget: 1 }).actual).toEqual([{ day: 0, value: 0 }])
  })
})

describe('compared with last month', () => {
  it('gives the change in money and percent per category, and no percent when there was nothing before', () => {
    const c = categoryChanges({ needs: 1200, wants: 300, savings: 50 }, { needs: 1000, wants: 600, savings: 0 }, ['needs', 'wants', 'savings', 'debt'])
    expect(c).toEqual([
      { key: 'needs', now: 1200, before: 1000, delta: 200, pct: 20 }, { key: 'wants', now: 300, before: 600, delta: -300, pct: -50 },
      { key: 'savings', now: 50, before: 0, delta: 50, pct: null }, { key: 'debt', now: 0, before: 0, delta: 0, pct: null },
    ])
  })
})

describe('where it went', () => {
  const list = [e('Lunch', 500, '2026-10-02'), e(' lunch ', 300, '2026-10-05'), e('Rent', 25000, '2026-10-01', { category: 'needs' }), e('', 100, '2026-10-06', { category: 'needs' }), e('Old', 9999, '2026-09-01')]
  it('adds entries with the same name together, ignoring case and spaces, largest first', () => {
    const t = topSpends(list, '2026-10', 5, c => c === 'needs' ? 'Needs' : 'Wants')
    expect(t.map(x => [x.label, x.total, x.count])).toEqual([['Rent', 25000, 1], ['Lunch', 800, 2], ['Needs', 100, 1]])
    expect(t[0]!.share).toBeCloseTo(25000 / 25900, 5)
  })
  it('only counts the month asked for, and honours the limit', () => {
    expect(topSpends(list, '2026-10', 1, () => 'x')).toHaveLength(1)
    expect(topSpends(list, '2026-09', 5, () => 'x').map(x => x.label)).toEqual(['Old'])
  })
  it('splits spending by account, and groups entries with no account (or a deleted one)', () => {
    const accts = [{ id: 'a', name: 'M-Pesa', color: '#2fa05a' }, { id: 'b', name: 'Bank', color: '#3b6fe0' }]
    const r = spendByAccount([e('x', 300, '2026-10-01', { accountId: 'a' }), e('y', 100, '2026-10-02', { accountId: 'b' }), e('z', 100, '2026-10-03'), e('w', 500, '2026-10-04', { accountId: 'deleted' }), e('o', 9, '2026-09-04', { accountId: 'a' })], '2026-10', accts)
    expect(r.map(x => [x.name, x.total])).toEqual([['No account', 600], ['M-Pesa', 300], ['Bank', 100]])
    expect(r.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1, 5)
  })
})

describe('habits', () => {
  // 2026-10-02 is a Friday
  const fridays = Array.from({ length: 8 }, (_, i) => e('f' + i, 100, `2026-10-${String(2 + 7 * (i % 3)).padStart(2, '0')}`))
  it('reports the busiest day of the week once there is enough to go on and one day stands out', () => {
    const w = weekdayPattern([...fridays, e('x', 50, '2026-10-05')], '2026-10')
    expect(w.busiest?.day).toBe(5); expect(w.busiest!.share).toBeGreaterThan(0.9)
  })
  it('stays quiet with too few entries or an even spread', () => {
    expect(weekdayPattern(fridays.slice(0, 3), '2026-10').busiest).toBeNull()
    const even = Array.from({ length: 14 }, (_, i) => e('d' + i, 100, `2026-10-${String(1 + i).padStart(2, '0')}`))
    expect(weekdayPattern(even, '2026-10').busiest).toBeNull()
  })
})

describe('the observations', () => {
  const base = { fmt, income: 100000, pace: paceSummary({ month: '2026-10', today: '2026-10-20', spent: 20000, budget: 80000 }), overCategories: [] as any[], changes: [] as any[], topSpend: null as any, weekday: { byDay: [], busiest: null } as any, savingsRate: 20 }
  const ids = (o: any = {}) => buildInsights({ ...base, ...o }).map(i => i.id)

  it('asks for the money in when there is none', () => expect(buildInsights({ ...base, income: 0 }).map(i => i.id)).toEqual(['no-income']))
  it('puts an over-budget category first, with how far over', () => {
    const r = buildInsights({ ...base, overCategories: [{ label: 'Wants', over: 3200 }] })
    expect(r[0]).toMatchObject({ id: 'over-category', tone: 'warn', title: 'Wants is over budget' }); expect(r[0]!.body).toContain('K3,200')
  })
  it('warns when the pace will overshoot, and congratulates when it will finish under', () => {
    const over = paceSummary({ month: '2026-10', today: '2026-10-10', spent: 14000, budget: 40000 })
    expect(buildInsights({ ...base, pace: over }).find(i => i.id === 'pace-over')!.body).toContain('K3,400 over') // 43,400 projected
    expect(ids({ pace: paceSummary({ month: '2026-10', today: '2026-10-20', spent: 20000, budget: 80000 }) })).toContain('pace-under')
  })
  it('points out the biggest rise and fall since last month, but only big ones', () => {
    const changes = [{ key: 'needs', label: 'Needs', now: 2000, before: 1000, delta: 1000, pct: 100 }, { key: 'wants', label: 'Wants', now: 100, before: 600, delta: -500, pct: -83 }, { key: 'savings', label: 'Savings', now: 105, before: 100, delta: 5, pct: 5 }]
    const r = buildInsights({ ...base, changes })
    expect(r.find(i => i.id === 'rise')).toMatchObject({ title: 'Needs is up 100%' }); expect(r.find(i => i.id === 'fall')).toMatchObject({ title: 'Wants is down 83%' })
    expect(ids({ changes: [changes[2]] })).not.toContain('rise')
  })
  it('notes when one thing is most of the spending', () => {
    expect(ids({ topSpend: { label: 'Rent', total: 25000, count: 1, share: 0.52 } })).toContain('concentration')
    expect(ids({ topSpend: { label: 'Rent', total: 25000, count: 1, share: 0.2 } })).not.toContain('concentration')
  })
  it('mentions a busy day of the week only when one stands out', () => {
    expect(buildInsights({ ...base, weekday: { byDay: [], busiest: { day: 5, share: 0.4 } } }).find(i => i.id === 'weekday')!.title).toBe('Fridays are your big days')
  })
  it('encourages saving below 20%, praises 20% or more, and never nags while something is already wrong', () => {
    expect(ids({ savingsRate: 8 })).toContain('save-more'); expect(ids({ savingsRate: 25 })).toContain('saving-well')
    expect(ids({ savingsRate: 8, overCategories: [{ label: 'Wants', over: 10 }] })).not.toContain('save-more')
  })
  it('never gives more than four', () => {
    const many = buildInsights({ ...base, overCategories: [{ label: 'Wants', over: 1 }], pace: paceSummary({ month: '2026-10', today: '2026-10-10', spent: 14000, budget: 40000 }), changes: [{ key: 'a', label: 'A', now: 2, before: 1, delta: 1000, pct: 100 }, { key: 'b', label: 'B', now: 1, before: 2, delta: -1000, pct: -50 }], topSpend: { label: 'Rent', total: 1, count: 1, share: 0.9 }, weekday: { byDay: [], busiest: { day: 1, share: 0.5 } } })
    expect(many.length).toBeLessThanOrEqual(4)
  })
})
