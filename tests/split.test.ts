import { describe, expect, it } from 'vitest'
import { DEFAULT_SPLIT, SPLIT_PRESETS, isValidSplit, sameSplit, splitLabel, suggestSplit } from '../app/utils/split'

const total = (s: Record<string, number>) => Math.round((s.needs! + s.wants! + s.savings! + s.debt!) * 100) / 100

describe('suggestSplit', () => {
  it('matches the original 50/30/20 behaviour by default', () => {
    expect(suggestSplit(3000, 0)).toEqual({ needs: 1500, wants: 900, savings: 600, debt: 0 })
    expect(suggestSplit(3200, 160)).toEqual({ needs: 1520, wants: 912, savings: 608, debt: 160 })
  })
  it('follows a custom rule on what is left after debt minimums', () => {
    expect(suggestSplit(2000, 200, { needs: 60, wants: 20, savings: 20 })).toEqual({ needs: 1080, wants: 360, savings: 360, debt: 200 })
    expect(suggestSplit(1000, 0, { needs: 70, wants: 20, savings: 10 })).toEqual({ needs: 700, wants: 200, savings: 100, debt: 0 })
  })
  it('always adds up to the pay, whatever the rule or rounding', () => {
    for (const p of SPLIT_PRESETS) for (const amount of [0.01, 1, 99.99, 1234.56, 3333.33, 100000]) for (const debt of [0, 17.5, 500]) {
      expect(total(suggestSplit(amount, debt, p.rule)), `${p.label} ${amount} ${debt}`).toBe(Math.round(amount * 100) / 100)
    }
  })
  it('never lets debt minimums exceed the pay, and never goes negative', () => {
    const s = suggestSplit(100, 400)
    expect(s).toEqual({ needs: 0, wants: 0, savings: 0, debt: 100 })
    for (const v of Object.values(suggestSplit(10, 3, { needs: 100, wants: 0, savings: 0 }))) expect(v).toBeGreaterThanOrEqual(0)
  })
  it('handles a rule with zero shares', () => {
    expect(suggestSplit(1000, 0, { needs: 100, wants: 0, savings: 0 })).toEqual({ needs: 1000, wants: 0, savings: 0, debt: 0 })
  })
  it('falls back to the default for an invalid rule instead of mis-splitting money', () => {
    expect(suggestSplit(1000, 0, { needs: 90, wants: 90, savings: 90 } as any)).toEqual(suggestSplit(1000, 0))
  })
})

describe('rule validation', () => {
  it('requires three whole percentages totalling exactly 100', () => {
    expect(isValidSplit({ needs: 50, wants: 30, savings: 20 })).toBe(true)
    expect(isValidSplit({ needs: 100, wants: 0, savings: 0 })).toBe(true)
    for (const bad of [{ needs: 50, wants: 30, savings: 10 }, { needs: 50, wants: 30, savings: 21 }, { needs: -10, wants: 60, savings: 50 }, { needs: 50.5, wants: 29.5, savings: 20 }, { needs: 101, wants: 0, savings: -1 }, { needs: '50', wants: 30, savings: 20 }, {}, null, undefined]) {
      expect(isValidSplit(bad as any)).toBe(false)
    }
  })
  it('every preset is valid and unique', () => {
    expect(SPLIT_PRESETS.every(p => isValidSplit(p.rule))).toBe(true)
    expect(new Set(SPLIT_PRESETS.map(p => splitLabel(p.rule))).size).toBe(SPLIT_PRESETS.length)
    expect(sameSplit(SPLIT_PRESETS[0]!.rule, DEFAULT_SPLIT)).toBe(true)
  })
})
