// The rules for editing an entry that already moved money: how account balances change, and how an income's split scales.

const round = (n: number) => Math.round(n * 100) / 100

export interface Linked { accountId?: string; amount: number }
export type AccountBalance = { id: string; name: string; balance: number }
export type ChangePlan = { deltas: Record<string, number> } | { error: { account: string; short: number } }

/**
 * How account balances change when an entry goes from `old` to `next`. An expense takes its amount out of its account and an
 * income puts it in, so editing means undoing the old effect and applying the new one (an edit that keeps the same account
 * only moves the difference). Returns the change per account, or the first account that would end up below zero and by how much.
 * An entry whose account no longer exists has no effect to undo or apply.
 */
export function planAccountChange(kind: 'expense' | 'income', old: Linked, next: Linked, accounts: AccountBalance[]): ChangePlan {
  const sign = kind === 'expense' ? -1 : 1 // what the entry does to its account
  const byId = new Map(accounts.map(a => [a.id, a]))
  const deltas: Record<string, number> = {}
  const add = (id: string | undefined, d: number) => { if (id && byId.has(id)) deltas[id] = round((deltas[id] ?? 0) + d) }
  add(old.accountId, -sign * old.amount)
  add(next.accountId, sign * next.amount)
  for (const [id, d] of Object.entries(deltas)) {
    if (d === 0) { delete deltas[id]; continue }
    const a = byId.get(id)!
    if (round(a.balance + d) < 0) return { error: { account: a.name, short: round(-(a.balance + d)) } }
  }
  return { deltas }
}

/** Scales an income's four-way split to a new total, keeping the same proportions and making the parts add up to exactly the new total. */
export function scaleSplit<T extends Record<string, number>>(split: T, oldTotal: number, newTotal: number): T {
  const keys = Object.keys(split) as (keyof T)[]
  if (!(oldTotal > 0)) { const out = { ...split }; for (const k of keys) out[k] = 0 as T[keyof T]; if (keys.length) out[keys[0]!] = round(newTotal) as T[keyof T]; return out }
  const out = { ...split }
  let sum = 0, largest = keys[0]!
  for (const k of keys) { out[k] = round((split[k] as number) * newTotal / oldTotal) as T[keyof T]; sum = round(sum + (out[k] as number)); if ((out[k] as number) > (out[largest] as number)) largest = k }
  const drift = round(newTotal - sum)
  if (drift !== 0) out[largest] = round((out[largest] as number) + drift) as T[keyof T]
  return out
}
