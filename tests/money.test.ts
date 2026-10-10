import { describe, expect, it } from 'vitest'
import { DEFAULT_CURRENCY, compactNumber, currencySymbol, formatMoney, keypadSymbol } from '../app/utils/money'

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

describe('compactNumber', () => {
  it('writes thousands, millions and billions briefly', () => {
    expect(compactNumber(38000)).toBe('38K'); expect(compactNumber(1500)).toBe('1.5K'); expect(compactNumber(2400000)).toBe('2.4M'); expect(compactNumber(3e9)).toBe('3B')
  })
  it('leaves small numbers whole and rounds them', () => { expect(compactNumber(850)).toBe('850'); expect(compactNumber(849.6)).toBe('850'); expect(compactNumber(0)).toBe('0') })
  it('drops a trailing .0 and rounds to one decimal', () => { expect(compactNumber(2000)).toBe('2K'); expect(compactNumber(1249)).toBe('1.2K'); expect(compactNumber(1251)).toBe('1.3K') })
  it('handles negatives and bad input', () => { expect(compactNumber(-38000)).toBe('-38K'); expect(compactNumber(NaN)).toBe('0'); expect(compactNumber(Infinity)).toBe('0') })
})
