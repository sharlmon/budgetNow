// Places a person keeps money, and the small calculations the Accounts screen needs.
// Balances are entered by the user. Weka does not connect to any of these providers.

export type AccountKind = 'mobile' | 'bank' | 'paypal' | 'cash' | 'invest' | 'other'
export const ACCOUNT_KINDS: { key: AccountKind; label: string; color: string; icon: string; hint: string }[] = [
  { key: 'mobile', label: 'Mobile money', color: '#2fa05a', icon: 'phone', hint: 'M-Pesa, Airtel Money' },
  { key: 'bank', label: 'Bank', color: '#3b6fe0', icon: 'card', hint: 'Current or savings account' },
  { key: 'paypal', label: 'Online wallet', color: '#1f3a8a', icon: 'wallet', hint: 'PayPal and similar' },
  { key: 'cash', label: 'Cash', color: '#a67c2e', icon: 'coins', hint: 'Money in hand' },
  { key: 'invest', label: 'Investment', color: '#e6a321', icon: 'trend', hint: 'Money market fund, SACCO, fixed deposit' },
  { key: 'other', label: 'Other', color: '#64748b', icon: 'bag', hint: 'Anything else' },
]
export const kindMeta = (k: AccountKind) => ACCOUNT_KINDS.find(x => x.key === k) ?? ACCOUNT_KINDS[ACCOUNT_KINDS.length - 1]!

/** Quick starting points shown when adding an account. */
export const ACCOUNT_PRESETS: { name: string; kind: AccountKind }[] = [
  { name: 'M-Pesa', kind: 'mobile' }, { name: 'Airtel Money', kind: 'mobile' }, { name: 'Bank account', kind: 'bank' },
  { name: 'PayPal', kind: 'paypal' }, { name: 'Cash', kind: 'cash' }, { name: 'Money market fund', kind: 'invest' },
]

export interface Account { id: string; name: string; kind: AccountKind; balance: number; color: string; /** Yearly return the user expects, in percent. */ rate?: number }

const round = (n: number) => Math.round(n * 100) / 100

/** Why a transfer cannot happen, or null when it can. */
export function moveProblem(from: Pick<Account, 'id' | 'name' | 'balance'> | undefined, to: Pick<Account, 'id'> | undefined, amount: number, fee: number): string | null {
  if (!from || !to) return 'Pick both accounts.'
  if (from.id === to.id) return 'Pick two different accounts.'
  if (!(amount > 0)) return 'Enter an amount.'
  if (fee < 0) return 'The fee cannot be negative.'
  const need = round(amount + fee)
  if (need > from.balance) return `${from.name} has ${round(from.balance).toLocaleString('en-US')}. That is ${round(need - from.balance).toLocaleString('en-US')} short.`
  return null
}

/**
 * What a monthly saving grows to at a fixed yearly rate, compounded monthly, with each deposit made at the start of the month.
 * Returns the balance at the end of every month (index 0 is the start) and the total put in.
 */
export function projectGrowth(monthly: number, months: number, ratePct: number, start = 0) {
  const r = Math.max(0, ratePct) / 100 / 12
  const balances = [round(start)]
  let bal = start
  for (let m = 1; m <= months; m++) { bal = (bal + monthly) * (1 + r); balances.push(round(bal)) }
  const end = balances[balances.length - 1]!
  const put = round(start + monthly * months)
  return { balances, end, put, earned: round(end - put) }
}
