import { describe, expect, it } from 'vitest'
import { addDays, addPeriod, anchorOf, daysBetween, endOfMonth, monthlyEquivalent, occurrencesUntil } from '../app/utils/bills'

describe('addPeriod', () => {
  it('clamps month-end bills and restores the anchor day afterwards', () => {
    expect(addPeriod('2026-01-31', 'month')).toBe('2026-02-28')
    expect(addPeriod('2026-02-28', 'month', 31)).toBe('2026-03-31')
    expect(addPeriod('2028-01-31', 'month')).toBe('2028-02-29')
  })
  it('rolls December into the next year', () => expect(addPeriod('2026-12-15', 'month')).toBe('2027-01-15'))
  it('handles Feb 29 yearly bills', () => {
    expect(addPeriod('2028-02-29', 'year')).toBe('2029-02-28')
    expect(addPeriod('2029-02-28', 'year', 29)).toBe('2030-02-28')
  })
  it('adds exactly 7 days weekly, across month, year and DST boundaries', () => {
    expect(addPeriod('2026-10-28', 'week')).toBe('2026-11-04')
    expect(addPeriod('2026-03-25', 'week')).toBe('2026-04-01')
    expect(addPeriod('2026-12-28', 'week')).toBe('2027-01-04')
  })
})

describe('occurrencesUntil', () => {
  it('lists weekly occurrences inside a month', () => expect(occurrencesUntil('2026-10-01', 'week', 1, '2026-10-31')).toHaveLength(5))
  it('catches up missed monthly bills', () => expect(occurrencesUntil('2026-09-30', 'month', 30, '2026-12-31')).toEqual(['2026-09-30', '2026-10-30', '2026-11-30', '2026-12-30']))
  it('returns nothing for a future bill, and caps runaway catch-up', () => {
    expect(occurrencesUntil('2026-11-01', 'month', 1, '2026-10-31')).toEqual([])
    expect(occurrencesUntil('2020-01-01', 'week', 1, '2026-10-31', 5)).toHaveLength(5)
  })
})

describe('helpers', () => {
  it('daysBetween is signed and DST safe', () => {
    expect(daysBetween('2026-10-09', '2026-10-12')).toBe(3)
    expect(daysBetween('2026-10-09', '2026-10-05')).toBe(-4)
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
  })
  it('monthlyEquivalent', () => {
    expect(Math.round(monthlyEquivalent(100, 'week'))).toBe(433)
    expect(monthlyEquivalent(120, 'year')).toBe(10)
  })
  it('date utilities', () => {
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29')
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02')
    expect(anchorOf('2026-10-31')).toBe(31)
  })
})
