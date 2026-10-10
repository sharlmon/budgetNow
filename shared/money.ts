// One place that decides how an amount of money is shown.

export const DEFAULT_CURRENCY = 'KES'

/** Browsers print the bare code for these currencies ("KES 1,200"); show the usual local symbol instead. */
const SYMBOLS: Record<string, string> = { KES: 'KSh', TZS: 'TSh', UGX: 'USh', RWF: 'RF' }

export function currencySymbol(code: string, locale = 'en-US'): string {
  if (SYMBOLS[code]) return SYMBOLS[code]!
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol' }).formatToParts(1).find(p => p.type === 'currency')?.value ?? code
  } catch { return code }
}

/** "KSh 1,200", "$1,234.50", "-KSh 450". Whole amounts drop the decimals; anything else shows two. */
export function formatMoney(n: number, currency: string = DEFAULT_CURRENCY, locale = 'en-US'): string {
  const value = Number.isFinite(n) ? n : 0
  const opts = { style: 'currency' as const, currency, currencyDisplay: 'narrowSymbol' as const, minimumFractionDigits: Number.isInteger(value) ? 0 : 2, maximumFractionDigits: 2 }
  try {
    return new Intl.NumberFormat(locale, opts).formatToParts(value).map(p => (p.type === 'currency' ? currencySymbol(currency, locale) : p.value)).join('')
  } catch {
    return `${currency} ${value.toFixed(2)}` // an unknown currency code must never break a screen
  }
}

/** The symbol typed in front of an amount on the keypad ("KSh " keeps a space; "$" does not). */
export function keypadSymbol(currency: string): string {
  const s = currencySymbol(currency)
  return /[A-Za-z]$/.test(s) ? `${s} ` : s
}

/** A short form for tight places: 850, 38K, 1.5K, 2.4M. Rounds; never shows a currency. */
export function compactNumber(n: number): string {
  const v = Number.isFinite(n) ? Math.abs(n) : 0
  const sign = n < 0 ? '-' : ''
  const trim = (x: number) => String(Math.round(x * 10) / 10).replace(/\.0$/, '')
  if (v >= 1e9) return `${sign}${trim(v / 1e9)}B`
  if (v >= 1e6) return `${sign}${trim(v / 1e6)}M`
  if (v >= 1e3) return `${sign}${trim(v / 1e3)}K`
  return `${sign}${Math.round(v)}`
}
