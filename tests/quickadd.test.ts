import { describe, expect, it } from 'vitest'
import { ADD_THEMES, contrastWithWhite, expenseImpact, habitsFrom, themeFor, type PastEntry } from '../app/utils/quickadd'

const TODAY = '2026-10-10'
const e = (label: string, amount: number, date: string, o: Partial<PastEntry> = {}): PastEntry => ({ label, amount, date, ...o })

describe('quick picks from your own history', () => {
  it('treats the same name as one habit however it was written, and counts it', () => {
    const h = habitsFrom([e('Lunch', 500, '2026-10-01'), e(' lunch ', 300, '2026-10-02'), e('LUNCH', 400, '2026-10-03')], TODAY)
    expect(h).toHaveLength(1); expect(h[0]).toMatchObject({ key: 'lunch', count: 3 })
  })
  it('shows the name as it was last written', () => expect(habitsFrom([e('lunch', 5, '2026-10-01'), e('Lunch ', 5, '2026-10-05')], TODAY)[0]!.label).toBe('Lunch'))
  it('suggests the usual amount: the middle of the last few, so one odd amount does not skew it', () => {
    const h = habitsFrom([e('Lunch', 450, '2026-10-01'), e('Lunch', 500, '2026-10-02'), e('Lunch', 9000, '2026-10-03'), e('Lunch', 480, '2026-10-04'), e('Lunch', 520, '2026-10-05')], TODAY)
    expect(h[0]!.amount).toBe(500)
  })
  it('only looks at the latest five entries for the usual amount', () => {
    const old = Array.from({ length: 10 }, (_, i) => e('Fare', 100, `2026-09-${String(i + 1).padStart(2, '0')}`))
    expect(habitsFrom([...old, e('Fare', 200, '2026-10-01'), e('Fare', 200, '2026-10-02'), e('Fare', 200, '2026-10-03')], TODAY)[0]!.amount).toBe(200)
  })
  it('remembers the category you usually give it and the account you last used', () => {
    const h = habitsFrom([e('Lunch', 1, '2026-10-01', { category: 'wants', accountId: 'a' }), e('Lunch', 1, '2026-10-02', { category: 'needs', accountId: 'b' }), e('Lunch', 1, '2026-10-03', { category: 'wants' })], TODAY)
    expect(h[0]).toMatchObject({ category: 'wants', accountId: 'b' }) // wants twice; the latest entry that had an account used b
  })
  it('puts what you do often, and lately, first', () => {
    const list = [
      e('Rare', 1, '2026-10-09'), e('Often', 1, '2026-09-01'), e('Often', 1, '2026-09-02'), e('Often', 1, '2026-09-03'), e('Often', 1, '2026-09-04'), e('Often', 1, '2026-09-05'),
      e('Recent often', 1, '2026-10-08'), e('Recent often', 1, '2026-10-07'), e('Recent often', 1, '2026-10-06'),
    ]
    // 'Recent often' scores 3 + 2 (recent) = 5 and 'Often' scores 5, so the tie goes to the more recent one; 'Rare' scores 1 + 2 = 3
    expect(habitsFrom(list, TODAY).map(h => h.label)).toEqual(['Recent often', 'Often', 'Rare'])
  })
  it('limits how many it offers', () => {
    const many = Array.from({ length: 20 }, (_, i) => e('Thing ' + i, 1, '2026-10-01'))
    expect(habitsFrom(many, TODAY, 6)).toHaveLength(6)
  })
  it('ignores entries with no name or no amount', () => expect(habitsFrom([e('', 5, '2026-10-01'), e('   ', 5, '2026-10-01'), e('Zero', 0, '2026-10-01')], TODAY)).toEqual([]))
  it('has nothing to suggest with no history', () => expect(habitsFrom([], TODAY)).toEqual([]))
})

describe('what an expense does to its budget', () => {
  it('shows how much is used before and after, and what is left', () => {
    expect(expenseImpact({ budgeted: 1000, spent: 300, amount: 200 })).toEqual({ before: 0.3, after: 0.5, left: 500, over: 0, hasBudget: true })
  })
  it('says how far over it goes, and caps the picture a little past full', () => {
    expect(expenseImpact({ budgeted: 1000, spent: 900, amount: 400 })).toEqual({ before: 0.9, after: 1.25, left: 0, over: 300, hasBudget: true })
  })
  it('is exactly full with no overage when it just fits', () => expect(expenseImpact({ budgeted: 1000, spent: 800, amount: 200 })).toMatchObject({ after: 1, left: 0, over: 0 }))
  it('has no meter when there is no budget for the category', () => expect(expenseImpact({ budgeted: 0, spent: 0, amount: 50 })).toEqual({ before: 0, after: 0, left: 0, over: 0, hasBudget: false }))
  it('keeps cents exact', () => expect(expenseImpact({ budgeted: 100.1, spent: 0.2, amount: 0.1 }).left).toBe(99.8))
})

describe('the add screen colours', () => {
  it('picks green for money in, and the category colour for an expense', () => {
    expect(themeFor('income', 'wants')).toBe('income'); expect(themeFor('expense', 'wants')).toBe('wants'); expect(themeFor('expense', 'debt')).toBe('debt')
  })
  it('falls back to the brand colour for an unknown category', () => expect(themeFor('expense', 'mystery')).toBe('needs'))
  it('keeps white text readable (at least 3:1, the minimum for large text) on every stop of every theme', () => {
    for (const [name, stops] of Object.entries(ADD_THEMES)) for (const hex of stops) expect(contrastWithWhite(hex), `${name} ${hex}`).toBeGreaterThanOrEqual(3)
  })
  it('measures contrast correctly', () => { expect(contrastWithWhite('#000000')).toBeGreaterThan(20); expect(contrastWithWhite('#ffffff')).toBeLessThan(1.1) })
})
