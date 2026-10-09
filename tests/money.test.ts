import { describe, expect, it } from 'vitest'
import { DEFAULT_CURRENCY, currencySymbol, formatMoney, keypadSymbol } from '../app/utils/money'

const nbsp = ' '

describe('formatMoney', () => {
  it('shows Kenyan shillings as KSh, never the bare code', () => {
    expect(formatMoney(150000, 'KES')).toBe(`KSh${nbsp}150,000`)
    expect(formatMoney(1234.5, 'KES')).toBe(`KSh${nbsp}1,234.50`)
    expect(formatMoney(0, 'KES')).toBe(`KSh${nbsp}0`)
    expect(formatMoney(-450, 'KES')).toBe(`-KSh${nbsp}450`)
  })
  it('KES is the default currency', () => {
    expect(DEFAULT_CURRENCY).toBe('KES')
    expect(formatMoney(1000)).toBe(`KSh${nbsp}1,000`)
  })
  it('keeps the familiar symbol for other currencies', () => {
    expect(formatMoney(1234.5, 'USD')).toBe('$1,234.50')
    expect(formatMoney(99, 'EUR')).toBe('€99')
    expect(formatMoney(99, 'GBP')).toBe('£99')
    expect(formatMoney(5000, 'NGN')).toBe('₦5,000')
  })
  it('uses local symbols for East African shillings too', () => {
    expect(formatMoney(2500, 'TZS')).toContain('TSh')
    expect(formatMoney(2500, 'UGX')).toContain('USh')
  })
  it('rounds to two decimals and never prints three', () => {
    expect(formatMoney(10.456, 'KES')).toBe(`KSh${nbsp}10.46`)
    expect(formatMoney(0.1 + 0.2, 'USD')).toBe('$0.30')
  })
  it('survives bad input and unknown currencies without throwing', () => {
    expect(formatMoney(NaN, 'USD')).toBe('$0')
    expect(formatMoney(Infinity, 'USD')).toBe('$0')
    expect(() => formatMoney(5, 'NOPE')).not.toThrow()
    expect(formatMoney(5, 'NOPE')).toContain('5')
    expect(() => formatMoney(5, '')).not.toThrow()
  })
})

describe('symbols', () => {
  it('currencySymbol', () => {
    expect(currencySymbol('KES')).toBe('KSh'); expect(currencySymbol('USD')).toBe('$'); expect(currencySymbol('ZZZ')).toBe('ZZZ')
  })
  it('keypadSymbol adds a space after letter symbols only', () => {
    expect(keypadSymbol('KES')).toBe('KSh '); expect(keypadSymbol('USD')).toBe('$'); expect(keypadSymbol('EUR')).toBe('€')
  })
})
